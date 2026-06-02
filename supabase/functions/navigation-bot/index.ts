/**
 * navigation-bot — Bnei Zion site navigator (בנצי)
 *
 * Branch: fix/benzi-valid-links
 * Last updated: 2026-06-02
 *
 * Changes vs. the previously-deployed version (not in git):
 *   1. VALID_ROUTES whitelist — every route that appears in App.tsx as of 2026-06-02.
 *      All CTA routes returned by Gemini are validated against this set before
 *      reaching the client. Invalid routes are replaced with "/" (fallback).
 *   2. Corrected system prompt — removed invented pages (/how-to-learn-tanach,
 *      /study-aids, /pricing), corrected site identity and subscription info,
 *      corrected megilat-esther vs chapter-weekly distinction, added contact page.
 *   3. Hardened JSON extraction — strips markdown fences before JSON.parse.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─────────────────────────────────────────────────────────────────────────────
// VALID ROUTES WHITELIST — derived from src/App.tsx (2026-06-02 audit)
//
// Iron rule: add to this list only when the corresponding <Route> exists in
// App.tsx. The bot MUST NOT suggest a route that is not in this list.
// Dynamic-segment routes use a prefix pattern (e.g. "/rabbis/") — the validator
// checks prefix membership for those.
// ─────────────────────────────────────────────────────────────────────────────
const STATIC_ROUTES = new Set([
  "/",
  "/teachers",
  "/chapter-weekly",
  "/megilat-esther",
  "/proposal",
  "/thank-you",
  "/portal",
  "/courses",
  "/portal-old",
  "/roadmap",
  "/auth",
  "/portal-login",
  "/design-my-courses",
  "/rabbis",
  "/parasha",
  "/profile",
  "/favorites",
  "/history",
  "/memorial",
  "/memorial/saadia",
  "/contact",
  "/donate",
  "/checkout",
  "/kenes",
  "/kenes-2026-05",
  "/kenes-archive",
  "/dor-haplaot",
  "/daily-verse",
  "/daily-video",
  "/community",
  "/store",
  "/about",
  "/terms",
  "/privacy-policy",
]);

// Prefix-based: bot may suggest these with any valid suffix
const PREFIX_ROUTES = [
  "/lessons/",
  "/rabbis/",
  "/teachers/series/",
  "/teachers/lesson/",
  "/bible/",
  "/series/",
  "/store/",
  "/community/",
  "/course/",
];

function isValidRoute(route: string): boolean {
  if (!route || typeof route !== "string") return false;
  const clean = route.split("?")[0].split("#")[0]; // strip query + hash
  if (STATIC_ROUTES.has(clean)) return true;
  for (const prefix of PREFIX_ROUTES) {
    if (clean.startsWith(prefix) && clean.length > prefix.length) return true;
  }
  return false;
}

function sanitizeRoute(route: string): string {
  return isValidRoute(route) ? route : "/";
}

function sanitizeCtas(
  ctas: Array<{ label: string; route: string; icon?: string }>
): Array<{ label: string; route: string; icon?: string }> {
  if (!Array.isArray(ctas)) return [];
  return ctas
    .filter((c) => c && typeof c.label === "string" && c.label.trim())
    .map((c) => ({ ...c, route: sanitizeRoute(c.route) }))
    .filter((c) => c.route !== "/")     // drop invalid CTAs entirely
    .slice(0, 3);                        // max 3 buttons
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — corrected 2026-06-02
// ─────────────────────────────────────────────────────────────────────────────
function buildSystemPrompt(currentRoute: string | null, currentParasha: string | null): string {
  const routeCtx = currentRoute ? `\nהמשתמש נמצא כרגע בדף: ${currentRoute}` : "";
  const parashaCtx = currentParasha ? `\nפרשת השבוע הנוכחית: ${currentParasha}` : "";

  return `אתה בנצי — הסוכן המנווט של אתר בני ציון (bneyzion.vercel.app).
תפקידך: להבין מה המשתמש מחפש ולהפנות אותו לדף הנכון באתר. תשובות קצרות (עד 2 פסקאות), עברית ישירה ונוחה.

═══════════════════════════════
מידע עובדתי מדויק על האתר
═══════════════════════════════

זהות האתר:
- "בני ציון" הוא פרויקט לימוד תנ"ך של הרב יואב אוריאל (yoavoriel@gmail.com).
- כינוי המותג: "מכלל יופי דיגיטלי" — לא ארכיון אלא מסע לומד פעיל.
- הקהל: לומדי תנ"ך דתיים-לאומיים, מורים, מחנכים, חובבי תנ"ך.
- שיעורים: 12,718+ שיעורים, 203+ רבנים, 1,500+ סדרות.
- הרב יואב אוריאל: מחבר "מכלל יופי" (פרשנות כל התנ"ך), מפקד תכנית הפרק השבועי.

תכניות בתשלום (תיאור מדויק):
- תכנית הפרק השבועי: לימוד קהלת. דף: /chapter-weekly.
  המנויים מקבלים שיעור שבועי + חומרים. תשלום דרך הדף עצמו.
- מגילת אסתר: /megilat-esther — דף מוצר (ספר/חוברת פרשנות), לא תכנית מנויים.
- חנות: /store — ספרים, קלטות, ומוצרים נוספים.

דפים עיקריים שקיימים (ואפשר להפנות):
- /              → דף הבית
- /rabbis        → רשימת כל הרבנים (203 רבנים)
- /rabbis/:slug  → דף רב ספציפי (דוגמה: /rabbis/yoav-uriel)
- /series/:id    → דף סדרה ספציפית
- /lessons/:id   → שיעור בודד
- /parasha       → פרשת השבוע
- /teachers      → אגף המורים (כלים, חידות, דפי עבודה)
- /teachers/series/:id → סדרה ספציפית בתוך אגף המורים
- /bible/:book   → לפי ספר תנ"ך (דוגמה: /bible/bereshit)
- /chapter-weekly → תכנית הפרק השבועי + הצטרפות
- /megilat-esther → מוצר: ספר מגילת אסתר
- /community     → קהילה ושיעורים קהילתיים
- /store         → חנות
- /store/:slug   → מוצר ספציפי
- /donate        → תרומה לאתר
- /contact       → יצירת קשר
- /about         → אודות האתר
- /memorial      → זיכרון (אנדרטאות)
- /memorial/saadia → זיכרון לסעדיה יעקב דרעי הי"ד
- /portal        → האזור האישי של המנוי (דורש כניסה)
- /daily-verse   → פסוק יומי
- /kenes         → כנס

דפים שאינם קיימים (אל תמציא מסלולים אלה):
❌ /pricing — הוסר מהאתר
❌ /how-to-learn-tanach — לא קיים
❌ /study-aids — לא קיים
❌ /bible-book/* — פורמט שגוי. הנכון: /bible/:book
❌ /courses — קיים אך לא ציבורי עדיין. אל תציע.
❌ כל נתיב אחר שלא מופיע ברשימה למעלה.
${routeCtx}${parashaCtx}

═══════════════════════════════
פורמט התשובה — JSON בלבד
═══════════════════════════════

ענה אך ורק בפורמט JSON הבא (ללא markdown, ללא הסברים מחוץ ל-JSON):

{
  "reply_text": "תשובה קצרה בעברית (עד 2 פסקאות)",
  "cta_buttons": [
    { "label": "טקסט הכפתור (עד 20 תווים)", "route": "/נתיב-תקני-בלבד", "icon": "book" }
  ],
  "intent_detected": "one of: parasha|haftarah|how_to_learn|search|rabbi|creator|topic|moed|digital_tanach|study_aids|dedication|donation|persona_question|memorial_question|content_question_redirected|off_topic|other",
  "persona_guess": null,
  "route_suggestion": "/נתיב-תקני-בלבד",
  "refused_content": false
}

כללי CTA:
- לכל כפתור: route חייב להיות מדפים שקיימים ברשימה למעלה בלבד.
- עד 3 כפתורים.
- icon: book|search|compass|graduation|sparkle|heart|calendar|map|video|donation

אם אין נתיב מתאים מהרשימה, השתמש ב-"/" (דף הבית).`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Strip markdown code fences from a string before JSON.parse
// ─────────────────────────────────────────────────────────────────────────────
function stripMarkdownFences(s: string): string {
  return s
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback response (used when Gemini fails or returns bad JSON)
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_RESPONSE = {
  reply_text: "משהו השתבש. אפשר לנסות שוב?",
  cta_buttons: [{ label: "דף הבית", route: "/", icon: "compass" }],
  intent_detected: "other",
  persona_guess: null,
  route_suggestion: "/",
  refused_content: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      message,
      session_id: _sessionId,
      user_id: _userId,
      persona = null,
      history = [],
      current_route = null,
      current_parasha = null,
    } = body;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("[navigation-bot] GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify(FALLBACK_RESPONSE),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build conversation messages for Gemini
    const systemPrompt = buildSystemPrompt(current_route, current_parasha);

    // Append persona context to system prompt if known
    const personaNote = persona
      ? `\nהמשתמש זוהה כ: ${persona}. התאם את הצעותיך בהתאם.`
      : "";

    const fullSystemPrompt = systemPrompt + personaNote;

    // Convert history (last 6 turns) to Gemini format
    const historyMessages = Array.isArray(history)
      ? history.slice(-6).flatMap((m: { role: string; content: unknown }) => {
          if (m.role === "user" && typeof m.content === "string") {
            return [{ role: "user", parts: [{ text: m.content }] }];
          }
          if (m.role === "model") {
            const text = typeof m.content === "string"
              ? m.content
              : (m.content as { reply_text?: string })?.reply_text ?? "";
            return text ? [{ role: "model", parts: [{ text }] }] : [];
          }
          return [];
        })
      : [];

    const geminiPayload = {
      system_instruction: { parts: [{ text: fullSystemPrompt }] },
      contents: [
        ...historyMessages,
        { role: "user", parts: [{ text: message }] },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 512,
        responseMimeType: "application/json",
      },
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("[navigation-bot] Gemini error:", geminiRes.status, errText.slice(0, 500));
      return new Response(
        JSON.stringify(FALLBACK_RESPONSE),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!rawText) {
      console.error("[navigation-bot] Empty Gemini response");
      return new Response(
        JSON.stringify(FALLBACK_RESPONSE),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON (strip fences defensively)
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(stripMarkdownFences(rawText));
    } catch (e) {
      console.error("[navigation-bot] JSON parse error:", e, "raw:", rawText.slice(0, 300));
      // Attempt to extract JSON from inside the text
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          return new Response(
            JSON.stringify(FALLBACK_RESPONSE),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify(FALLBACK_RESPONSE),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── VALIDATE + SANITIZE ROUTES ────────────────────────────────────────
    const safeResponse = {
      reply_text: typeof parsed.reply_text === "string" ? parsed.reply_text : FALLBACK_RESPONSE.reply_text,
      cta_buttons: sanitizeCtas(
        parsed.cta_buttons as Array<{ label: string; route: string; icon?: string }> ?? []
      ),
      intent_detected: parsed.intent_detected ?? "other",
      persona_guess: parsed.persona_guess ?? null,
      route_suggestion: sanitizeRoute(parsed.route_suggestion as string ?? "/"),
      refused_content: parsed.refused_content === true,
    };

    // Log any route violations for debugging
    const origCtaRoutes = ((parsed.cta_buttons as Array<{ route?: string }>) ?? []).map((c) => c?.route ?? "");
    const safeCtaRoutes = safeResponse.cta_buttons.map((c) => c.route);
    const violations = origCtaRoutes.filter((r) => r && !isValidRoute(r));
    if (violations.length > 0) {
      console.warn("[navigation-bot] Invalid routes blocked:", violations.join(", "));
    }

    // Ensure at least 1 CTA (fallback to home if all were invalid)
    if (safeResponse.cta_buttons.length === 0) {
      safeResponse.cta_buttons = [{ label: "דף הבית", route: "/", icon: "compass" }];
    }

    return new Response(JSON.stringify(safeResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[navigation-bot] Unhandled error:", e);
    return new Response(JSON.stringify(FALLBACK_RESPONSE), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
