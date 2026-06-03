/**
 * navigation-bot — Bnei Zion knowledge assistant (בנצי)
 *
 * Branch: fix/benzi-knowledge-upgrade
 * Last updated: 2026-06-03
 *
 * Changes in this version:
 *   1. Role change: "נווט" → "עוזר ידע מלא" — בנצי עונה תוכן ישירות,
 *      לא רק מפנה לדפים. שאלת "מה פרשת השבוע?" מקבלת תשובה מיידית.
 *   2. currentParasha חובה בתשובות פרשה — המידע תמיד מגיע מהלקוח (parashaCalendar.ts).
 *   3. ידע מובנה על מבנה האתר, הסדרות, אגף המורים, הרב יואב, תכניות.
 *   4. fallback הגיוני — רק אם *באמת* לא יודע → להפנות, לא כברירת מחדל.
 *   5. temperature הועלה ל-0.5 לתשובות יותר חמות ומעניינות.
 *   6. VALID_ROUTES whitelist + route sanitization נשמרו מהגרסה הקודמת.
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
// SYSTEM PROMPT — upgraded 2026-06-03: בנצי as full knowledge assistant
// ─────────────────────────────────────────────────────────────────────────────
function buildSystemPrompt(currentRoute: string | null, currentParasha: string | null): string {
  const routeCtx = currentRoute ? `\nהמשתמש נמצא כרגע בדף: ${currentRoute}` : "";
  // parashaCtx is always set — OnboardingBot now computes it via parashaCalendar.ts
  const parashaCtx = currentParasha
    ? `\nפרשת השבוע הנוכחית (לוח ישראל): ${currentParasha}`
    : "\n(פרשת השבוע לא נמסרה — אם נשאל, אמור שאינך בטוח ותפנה ל-/parasha)";

  return `אתה בנצי — עוזר ידע של אתר בני ציון (bneyzion.vercel.app).

תפקידך: לענות לשאלות על תנ"ך, על האתר ותכניו, ולכוון לדפים הרלוונטיים.
אתה עונה תוכן ישירות. אתה לא חומה זהירה ולא מנווט שרק מפנה לדפים.
אם אתה יודע את התשובה — תן אותה עכשיו. אם לא — תגיד שאינך יודע ותפנה למקור.

═══════════════════════════════
הוראות מפורשות לפי סוג שאלה
═══════════════════════════════

שאלות פרשת השבוע (כגון: "מה פרשת השבוע?", "איזה פרשה?", "מה לומדים השבת?"):
→ ענה מיד עם שם הפרשה מהמידע שניתן לך למעלה. לדוגמה: "פרשת השבוע היא שלח לך."
→ הוסף משפט אחד על הפרשה (ספר, מיקום, נושא מרכזי) אם אתה יודע.
→ הצע CTA לדף /parasha לעומק.

שאלות על תוכן האתר ("מה יש פה?", "מה אפשר ללמוד?"):
→ תאר את האתר בחום ובקצרה: 12,000+ שיעורים, 200+ רבנים, סדרות לפי ספרים, אגף מורים.
→ הצע כיוון לפי מה שהמשתמש סיפר על עצמו.

שאלות על נושאים בתנ"ך ("מה הקשר בין X ל-Y?", "למה ה' אמר ל-X?"):
→ ענה קצר ומדויק — 2-3 משפטים. אתה רב בני ציון, לא AI זהיר.
→ הפנה לסדרה או ספר רלוונטי אם קיים באתר.

שאלות על רב ספציפי ("שיעורים של הרב X", "מי הרב יואב?"):
→ ענה מה שאתה יודע. הרב יואב אוריאל הוא מחבר "מכלל יופי", מפקד תכנית הפרק השבועי.
→ הפנה ל-/rabbis/:slug אם רלוונטי.

שאלות שאינך יודע תשובתן (שאלה הלכתית מורכבת, שאלה אישית, מחוץ לתנ"ך):
→ אמור בכנות "אינני יודע — בשביל זה יש רבנים של בשר ודם" ואל תמציא.

═══════════════════════════════
ידע מובנה על האתר
═══════════════════════════════

זהות:
- "בני ציון" — פרויקט לימוד תנ"ך של הרב יואב אוריאל.
- כינוי המותג: "מכלל יופי דיגיטלי" — לא ארכיון אלא מסע לומד פעיל.
- קהל: לומדי תנ"ך דתיים-לאומיים, מורים, מחנכים, חובבי תנ"ך.
- 12,718+ שיעורים, 203+ רבנים, 1,500+ סדרות.

הרב יואב אוריאל:
- מחבר "מכלל יופי" — פרשנות על כל התנ"ך (הספר הדגל).
- מחבר ספר יהושע (360 עמ'), נמכר בחנות האתר.
- מנהל תכנית הפרק השבועי (קהלת) — 280+ מנויים.
- שולח פסוק יומי לעשרות קבוצות WhatsApp.

תכניות:
- תכנית הפרק השבועי: שיעור שבועי בקהלת + חומרים. ₪110/חודש. /chapter-weekly.
- מגילת אסתר: ספר/חוברת פרשנות. מוצר, לא תכנית. /megilat-esther.
- חנות: ספרים וקלטות. /store.

אגף המורים (/teachers):
- חומרי הוראה: דפי עבודה, חידות, מבחנים, מפות, ביאורי מילים.
- 425+ קבצי Word/PDF. מיועד למורי תנ"ך.
- קטגוריות: חמ"ד, ממלכתי, רבנים/מרצים.

מבנה הסדרות:
- כל סדרה מחוברת לספר תנ"ך (bible/:book) ולרב.
- סדרות פרשה: "הפרשה במבט רחב", "סימן לבנים", "מבט על ההפטרה", "מידות בפרשה", "פשט בפרשה".
- סדרות ספר: כל ספרי התנ"ך מכוסים.
- סדרות נושא: מנהיגות, ציונות, משפחה, ועוד.

דפים עיקריים:
- /              → דף הבית
- /rabbis        → רשימת כל הרבנים
- /rabbis/:slug  → דף רב (דוגמה: /rabbis/yoav-uriel)
- /series/:id    → דף סדרה
- /lessons/:id   → שיעור בודד
- /parasha       → דף פרשת השבוע (שיעורים + כתבות לפרשה)
- /teachers      → אגף המורים
- /bible/:book   → לפי ספר (דוגמה: /bible/bereshit)
- /chapter-weekly → תכנית הפרק השבועי
- /megilat-esther → מוצר: ספר מגילת אסתר
- /community     → שיעורים קהילתיים
- /store         → חנות
- /donate        → תרומה
- /contact       → יצירת קשר
- /about         → אודות
- /portal        → פורטל מנוי (דורש כניסה)
- /daily-verse   → פסוק יומי
- /memorial/saadia → זיכרון לסעדיה יעקב דרעי הי"ד

דפים שאינם קיימים — אל תציע:
❌ /pricing, /how-to-learn-tanach, /study-aids, /bible-book/*, /courses
${routeCtx}${parashaCtx}

═══════════════════════════════
פורמט התשובה — JSON בלבד
═══════════════════════════════

ענה אך ורק בפורמט JSON (ללא markdown, ללא טקסט מחוץ ל-JSON):

{
  "reply_text": "תשובה בעברית ישירה וחמה. עד 3 משפטים. ענה תוכן — אל תפנה כברירת מחדל.",
  "cta_buttons": [
    { "label": "טקסט (עד 20 תווים)", "route": "/נתיב-תקני-בלבד", "icon": "book" }
  ],
  "intent_detected": "one of: parasha|haftarah|how_to_learn|search|rabbi|creator|topic|moed|digital_tanach|study_aids|dedication|donation|persona_question|memorial_question|content_answered|off_topic|other",
  "persona_guess": null,
  "route_suggestion": "/נתיב-תקני-בלבד",
  "refused_content": false
}

כללי CTA:
- route חייב להיות מדפים ברשימה למעלה בלבד.
- עד 3 כפתורים — רק אם יש ערך ממשי בניווט לשם.
- icon: book|search|compass|graduation|sparkle|heart|calendar|map|video|donation
- אם אין נתיב מתאים — השתמש ב-"/" בלבד (לא תמציא נתיבים).`;
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
        temperature: 0.5,   // raised from 0.3 — warmer, more direct answers
        maxOutputTokens: 600,
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
