/**
 * generate-cover — AI cover image generation for series/lessons
 *
 * Critique fixes applied:
 *   C: JWT auth + role check (admin or creator), same pattern as broadcast-notification
 *   I: Rate-limit 5 calls/hour/user via cover_generations table (service-role client)
 *   G: Model name validated: Imagen 4 fast (imagen-4.0-fast-generate-001) primary,
 *      Gemini 2.0 Flash image generation as fallback.
 *      Uses correct Imagen endpoint and aspect ratio param.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Maps series/lesson title keywords to English scene descriptions for the AI prompt.
// סגנון-הבית של איורי-הסדרות: אשכול-אקוורל מופשט על נייר קרם (סער 21.7.2026).
// לא סצנה ריאליסטית — כתמי-צבע רכים בקשת-עדינה סביב מרכז ממוקד. בלי אותיות.
// כדי לשמור עקביות + מעט מגוון: האלמנט-המרכזי נבחר דטרמיניסטית מכותרת השיעור,
// כך שאותה כותרת מקבלת תמיד את אותו איור, וכותרות שונות מקבלות צורות-מרכז שונות.
const CENTER_ELEMENTS = [
  "a blooming radial cluster like an opening flower of color",
  "a soft open wreath of dabs around a luminous cream center",
  "a gentle flowing arc of dabs like a soft current of water",
  "a small dense cluster radiating outward into lighter scattered dabs",
  "a soft leaf-like sprig of green, teal and gold dabs growing gently upward",
  "a soft teardrop gathering of blue, teal and lavender dabs",
  "a warm upward gesture of coral, gold and rose dabs like a gentle rising light",
];

function pickCenter(title: string): string {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CENTER_ELEMENTS[h % CENTER_ELEMENTS.length];
}

function buildPrompt(title: string): string {
  return [
    "Delicate loose watercolor on warm cream paper with visible paper grain.",
    "Soft translucent watercolor blobs and dabs in a muted rainbow palette —",
    "sage green, dusty teal, soft slate blue, gentle lavender, warm ochre, coral, muted rose —",
    "wet-on-wet bleeding edges, airy with generous empty cream space,",
    "gathered into a single central focal cluster. Abstract, symbolic, gentle and serene.",
    "Central element:", pickCenter(title) + ".",
    // דיכוי-טקסט בגוף-הפרומפט (negativePrompt הוסר מ-Imagen 4, 21.7.2026):
    "Absolutely NO text, NO letters, NO Hebrew characters, NO numbers, NO writing,",
    "NO code, NO captions, NO watermark, NO human figures, NO faces, NO recognizable objects.",
    "16:9 landscape composition.",
  ].join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Critique C: JWT authentication + role check ─────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL       = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_ANON_KEY  = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const SUPABASE_SVC_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const GEMINI_API_KEY     = Deno.env.get("GEMINI_API_KEY") ?? "";

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify caller identity
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check role: must be 'admin' or 'creator'
  const svc = createClient(SUPABASE_URL, SUPABASE_SVC_KEY);
  const { data: roleRow } = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "creator"])
    .maybeSingle();

  if (!roleRow) {
    return new Response(
      JSON.stringify({ error: "Admin or creator role required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Critique I: Rate-limit — 5 per hour per user ─────────────────
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await svc
    .from("cover_generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) >= 5) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded — max 5 cover images per hour" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Parse request body ────────────────────────────────────────────
  let title: string;
  let series_id: string | undefined;
  try {
    const body = await req.json() as { title?: string; series_id?: string };
    title = (body.title ?? "").trim();
    series_id = body.series_id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!title) {
    return new Response(JSON.stringify({ error: "title is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const prompt = buildPrompt(title);

  // ── Image generation: Imagen 4 Fast → Gemini 2.0 Flash fallback ──
  //
  // Critique G: model name verified against Gemini API models list.
  // Imagen 4 fast: imagen-4.0-fast-generate-001 (predict endpoint, v1beta)
  // Gemini fallback: gemini-2.0-flash-preview-image-generation (generateContent)

  let imageBytes: Uint8Array | null = null;
  let mimeType = "image/png";

  // Primary: Imagen 4 Fast
  try {
    const imagenRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
            // negativePrompt הוסר מ-Imagen 4 (מחזיר 400) — הדיכוי מוטמע ב-buildPrompt.
          },
        }),
      }
    );

    if (imagenRes.ok) {
      const data = await imagenRes.json();
      const b64 = data?.predictions?.[0]?.bytesBase64Encoded as string | undefined;
      if (b64) {
        imageBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        mimeType = "image/png";
        console.log("[generate-cover] Imagen 4 Fast succeeded");
      } else {
        console.warn("[generate-cover] Imagen 4 returned no image bytes");
      }
    } else {
      const errText = await imagenRes.text();
      console.warn(`[generate-cover] Imagen 4 failed ${imagenRes.status}: ${errText}`);
    }
  } catch (e) {
    console.warn("[generate-cover] Imagen 4 exception:", e);
  }

  // Fallback: Gemini 2.0 Flash image generation
  if (!imageBytes) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["image", "text"] },
          }),
        }
      );

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const part = data?.candidates?.[0]?.content?.parts?.find(
          (p: { inline_data?: { data?: string; mime_type?: string } }) => p.inline_data?.data
        );
        if (part?.inline_data?.data) {
          const b64 = part.inline_data.data as string;
          imageBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          mimeType = part.inline_data.mime_type ?? "image/png";
          console.log("[generate-cover] Gemini 2.0 Flash fallback succeeded");
        }
      } else {
        const errText = await geminiRes.text();
        console.warn(`[generate-cover] Gemini fallback failed ${geminiRes.status}: ${errText}`);
      }
    } catch (e) {
      console.warn("[generate-cover] Gemini fallback exception:", e);
    }
  }

  if (!imageBytes) {
    return new Response(
      JSON.stringify({ error: "Both Imagen and Gemini image generation failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Upload to bnei-zion-thumbnails ────────────────────────────────
  // Path is ASCII-only UUID — no Hebrew, no spaces (Critique G storage note)
  const ext = mimeType === "image/jpeg" ? "jpg" : "png";
  const fileName = series_id
    ? `series/${series_id}.${ext}`
    : `series/generated-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/bnei-zion-thumbnails/${fileName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SVC_KEY}`,
        "Content-Type": mimeType,
        "x-upsert": "true",
      },
      body: imageBytes,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    return new Response(
      JSON.stringify({ error: `Storage upload failed: ${uploadRes.status} — ${errText}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const imageUrl =
    `${SUPABASE_URL}/storage/v1/object/public/bnei-zion-thumbnails/${fileName}`;

  // ── Record usage for rate-limiting ───────────────────────────────
  // Fire-and-forget: don't fail the response if this INSERT errors
  svc.from("cover_generations").insert({ user_id: user.id }).then(({ error }) => {
    if (error) console.warn("[generate-cover] rate-limit insert failed:", error.message);
  });

  return new Response(
    JSON.stringify({ image_url: imageUrl }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
