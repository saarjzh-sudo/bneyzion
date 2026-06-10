/**
 * navigation-bot — Bnei Zion knowledge assistant (בנצי)
 *
 * Branch: fix/benzi-knowledge-upgrade
 * Last updated: 2026-06-03
 *
 * Changes in this version (v3 — continuous training):
 *   1. ידע עובדתי הוצא מהקוד לטבלת `benzi_knowledge` ב-Supabase.
 *      עריכה = שינוי טקסט ב-/admin/benzi, נכנס לתוקף מיד, בלי deploy.
 *   2. תיקון: מגילת אסתר = ספר/מוצר, לא תכנית.
 *      תכנית הפרק השבועי היא התכנית היחידה.
 *   3. הרב יואב אוריאל — ביוגרפיה מלאה ומדויקת מדף /chapter-weekly.
 *   4. "מידע קשיח" (routes, פורמט JSON, הוראות) נשאר בקוד.
 *      רק הידע העובדתי שמשתנה חי ב-DB.
 *   5. fallback: אם DB לא זמין — מוצג ידע מינימלי מהקוד (graceful).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
// Dynamic-segment routes use a prefix pattern — the validator checks prefix.
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
  const clean = route.split("?")[0].split("#")[0];
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
    .filter((c) => c.route !== "/")
    .slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK KNOWLEDGE — מינימום קשוח אם DB לא זמין
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_KNOWLEDGE = `
זהות האתר:
אתר בני ציון — פרויקט לימוד תנ"ך שייסד הרב יואב אוריאל.
12,718+ שיעורים, 203+ רבנים, 1,500+ סדרות.

הרב יואב אוריאל — המייסד:
ראש ומייסד תנועת "בני ציון". מחבר "מכלל יופי". מרצה 15+ שנה.
מנהל תכנית הפרק השבועי (/chapter-weekly).

תכנית הפרק השבועי:
שיעור זום שבועי בהנחיית הרב יואב, 110 ₪/חודש, ללא התחייבות.
ספר נוכחי: חגי, זכריה ומלאכי. 250+ לומדים.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// LOAD KNOWLEDGE FROM DB — טוען את כל הרשומות הפעילות ומחבר לבלוק טקסט
// ─────────────────────────────────────────────────────────────────────────────
async function loadKnowledgeFromDB(supabaseUrl: string, supabaseKey: string): Promise<string> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("benzi_knowledge")
      .select("title, content")
      .eq("is_active", true)
      .order("id");

    if (error || !data || data.length === 0) {
      console.warn("[navigation-bot] benzi_knowledge query issue:", error?.message ?? "empty");
      return FALLBACK_KNOWLEDGE;
    }

    // מחבר כל הרשומות לבלוק אחד: כותרת + תוכן
    return data
      .map((row: { title: string; content: string }) => `${row.title}:\n${row.content.trim()}`)
      .join("\n\n");
  } catch (e) {
    console.error("[navigation-bot] loadKnowledgeFromDB error:", e);
    return FALLBACK_KNOWLEDGE;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — ידע עובדתי מוזרק מבחוץ (dynamicKnowledge)
// קוד זה מכיל רק:
//   1. הוראות הגהה (מה לענות, מה לא, פורמט)
//   2. רשימת דפים (routes)
//   3. הזרקת dynamicKnowledge מה-DB
// ─────────────────────────────────────────────────────────────────────────────
function buildSystemPrompt(
  currentRoute: string | null,
  currentParasha: string | null,
  dynamicKnowledge: string
): string {
  const routeCtx = currentRoute ? `\nהמשתמש נמצא כרגע בדף: ${currentRoute}` : "";
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
→ תאר את האתר בחום ובקצרה לפי הידע שניתן לך.
→ הצע כיוון לפי מה שהמשתמש סיפר על עצמו.

שאלות על נושאים בתנ"ך ("מה הקשר בין X ל-Y?", "למה ה' אמר ל-X?"):
→ ענה קצר ומדויק — 2-3 משפטים. אתה רב בני ציון, לא AI זהיר.
→ הפנה לסדרה או ספר רלוונטי אם קיים באתר.

שאלות על רב ספציפי ("שיעורים של הרב X", "מי הרב יואב?"):
→ ענה מה שאתה יודע לפי הידע שניתן לך.
→ הפנה ל-/rabbis/:slug אם רלוונטי.

שאלות על התכנית השבועית:
→ "תכנית הפרק השבועי" = שיעור זום שבועי בהנחיית הרב יואב אוריאל. זו התכנית היחידה.
→ מגילת אסתר, קהלת, חגי וכו' — אלו ספרים שנלמדו/נלמדים בתוך התכנית, לא תכניות נפרדות.
→ מגילת אסתר היא גם ספר/מוצר נמכר בחנות — אבל אינה תכנית לימוד עצמאית.

שאלות שאינך יודע תשובתן (שאלה הלכתית מורכבת, שאלה אישית, מחוץ לתנ"ך):
→ אמור בכנות "אינני יודע — בשביל זה יש רבנים של בשר ודם" ואל תמציא.

═══════════════════════════════
ידע על האתר (מתעדכן)
═══════════════════════════════

${dynamicKnowledge}

═══════════════════════════════
דפים עיקריים (routes תקניים בלבד)
═══════════════════════════════

- /              → דף הבית
- /rabbis        → רשימת כל הרבנים
- /rabbis/:slug  → דף רב (דוגמה: /rabbis/yoav-uriel)
- /series/:id    → דף סדרה
- /lessons/:id   → שיעור בודד
- /parasha       → דף פרשת השבוע
- /teachers      → אגף המורים
- /bible/:book   → לפי ספר (דוגמה: /bible/bereshit)
- /chapter-weekly → תכנית הפרק השבועי
- /megilat-esther → ספר מגילת אסתר (מוצר)
- /community     → שיעורים קהילתיים
- /store         → חנות
- /donate        → תרומה
- /contact       → יצירת קשר
- /about         → אודות
- /portal        → פורטל מנוי (דורש כניסה)
- /daily-verse   → פסוק יומי
- /memorial/saadia → זיכרון לסעדיה יעקב דרעי הי"ד

דפים שאינם קיימים — אל תציע:
❌ /pricing, /how-to-learn-tanach, /study-aids, /bible-book/*
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
// Strip markdown code fences
// ─────────────────────────────────────────────────────────────────────────────
function stripMarkdownFences(s: string): string {
  return s
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback response
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

    // ── טעינת ידע מ-DB ──────────────────────────────────────────────────────
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    let dynamicKnowledge = FALLBACK_KNOWLEDGE;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      dynamicKnowledge = await loadKnowledgeFromDB(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } else {
      console.warn("[navigation-bot] Supabase env vars missing — using fallback knowledge");
    }

    // ── בניית הפרומפט ────────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(current_route, current_parasha, dynamicKnowledge);
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
        temperature: 0.5,
        maxOutputTokens: 600,
        responseMimeType: "application/json",
      },
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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

    // Parse JSON
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(stripMarkdownFences(rawText));
    } catch (e) {
      console.error("[navigation-bot] JSON parse error:", e, "raw:", rawText.slice(0, 300));
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

    const origCtaRoutes = ((parsed.cta_buttons as Array<{ route?: string }>) ?? []).map((c) => c?.route ?? "");
    const violations = origCtaRoutes.filter((r) => r && !isValidRoute(r));
    if (violations.length > 0) {
      console.warn("[navigation-bot] Invalid routes blocked:", violations.join(", "));
    }

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
