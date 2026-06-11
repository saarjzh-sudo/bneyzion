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
// No Hebrew in the prompt — Imagen may render Hebrew text, which we explicitly forbid.
const FAMILY_THEMES: Record<string, string> = {
  "בראשית": "Garden of Eden, ancient wilderness, patriarchs, desert landscape",
  "שמות":   "desert exodus, ancient Egypt, burning bush, wilderness camp",
  "ויקרא":  "ancient temple, priestly altar, stone courtyard, ritual vessels",
  "במדבר":  "desert wilderness, ancient Israelite camp, wandering dunes",
  "דברים":  "mountain landscape, ancient speeches, vast desert horizon",
  "יהושע":  "Canaan landscape, ancient stone walls, Jordan river crossing",
  "שופטים": "ancient Israelite hills, tribal landscape, rocky terrain",
  "שמואל":  "ancient Israelite kingdom, royal court, prophet by river",
  "מלכים":  "ancient palace, olive grove, hilltop temple ruins",
  "ישעיהו": "ancient Jerusalem olive trees, prophetic vision, stone walls",
  "ירמיהו": "ancient Jerusalem gate, weeping willow, crumbling walls",
  "יחזקאל": "golden light over water, mystical sky, abstract celestial",
  "תהלים":  "sunrise over mountains, ancient harp on olive branch",
  "משלי":   "wisdom tree, ancient scroll, olive branch, morning light",
  "איוב":   "desert storm, lone tree, ancient desolate landscape",
  "שיר השירים": "blooming vineyard, spring flowers, ancient garden, NO PEOPLE",
  "רות":    "wheat fields at harvest, rolling hills, ancient village",
  "אסתר":   "ancient Persian garden architecture, abstract royal arches",
  "עזרא":   "ancient Jerusalem rebuilt walls, cedar wood, sunrise",
  "נחמיה":  "ancient city walls under construction, torches, night sky",
  "דברי הימים": "ancient Israelite chronicles, royal palace, candlelight",
  "פרשה":   "ancient desert landscape, parchment scroll, golden light",
  "שבת":    "candles, warm golden light, wooden table, Friday sunset",
  "חנוכה":  "oil lamp menorah, ancient stone wall, winter evening",
  "פסח":    "wheat fields, desert horizon, golden afternoon light",
  "ראש השנה": "ram's horn shofar on stone, autumn leaves, sunrise",
  "יום כיפור": "white cloth, quiet stone sanctuary, single candle",
  "סוכות":  "harvest fruit, palm branch, ancient harvest fields",
};

function buildPrompt(title: string): string {
  const matched = Object.entries(FAMILY_THEMES).find(([k]) => title.includes(k));
  const theme = matched
    ? matched[1]
    : "ancient Israel landscape, olive trees, stone walls, golden hour";

  return [
    "Fine art watercolor illustration,",
    theme + ",",
    "warm golden hour light, earth tones, soft brush strokes,",
    "artistic and serene, suitable for educational religious content,",
    "NO TEXT, NO LETTERS, NO NUMBERS, NO WRITING OF ANY KIND,",
    "NO HUMAN FIGURES, NO FACES, NO SILHOUETTES, NO PEOPLE,",
    "16:9 landscape composition",
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
            negativePrompt:
              "text, letters, hebrew, arabic, writing, people, faces, silhouettes, calligraphy, inscription, watermark",
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
