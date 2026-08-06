/**
 * send-admin-email — שליחת מייל בודד (1:1) מהאדמין של בני ציון.
 *
 * אומת 1.7.2026: ל-Smoove אין endpoint transactional (רק Campaigns המוניים),
 * לכן שליחת-מייל בודד עוברת דרך Resend — ספק transactional תקני.
 *
 * גוף: { to, subject, html, replyTo? }
 * צריך secrets:
 *   RESEND_API_KEY   — מפתח Resend (חינם עד 3,000 מיילים/חודש: resend.com)
 *   RESEND_FROM      — כתובת מאומתת, למשל "בני ציון <office@bneyzion.co.il>"
 *                      (דורש אימות דומיין ב-Resend; עד אז אפשר onboarding@resend.dev לבדיקה)
 *
 * ── אבטחה (אודיט H3, תוקן 2.8.2026) ──────────────────────────────────────
 * הפונקציה הזו הייתה **open relay**. לא הייתה בה ולו שורת-אימות אחת: to,
 * subject, html ו-replyTo עברו מגוף-הבקשה ישירות ל-Resend, עם שולח
 * מאומת-דומיין (office@bneyzion.co.il). כלומר כל אחד באינטרנט יכול היה לשלוח
 * פישינג שעובר DKIM/SPF מהדומיין של העמותה, בכל כמות, ולשרוף את מוניטין-
 * השליחה של הדומיין.
 *
 * שני תיקונים:
 *   1. בדיקת אדמין אמיתית (_shared/admin-auth.ts) לפני כל שליחה.
 *   2. `from` נקבע בשרת בלבד. גם `replyTo` מוגבל לדומיין שלנו — אחרת אדמין
 *      (או תוקף שהשיג טוקן) עדיין יכול היה להפנות תשובות לכתובת זרה.
 *
 * Deploy:  supabase functions deploy send-admin-email
 */

import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/admin-auth.ts";

/** דומיינים ש-replyTo מותר להצביע אליהם. */
const ALLOWED_REPLY_DOMAINS = ["bneyzion.co.il", "bneyzion.org.il"];

function isAllowedReplyTo(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const email = (value.match(/<([^>]+)>/)?.[1] ?? value).trim().toLowerCase();
  const domain = email.split("@")[1];
  return !!domain && ALLOWED_REPLY_DOMAINS.includes(domain);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = jsonResponse;

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const key = Deno.env.get("RESEND_API_KEY");
    // `from` הוא ערך-שרת בלבד. לעולם לא מגוף-הבקשה.
    const from = Deno.env.get("RESEND_FROM") || "בני ציון <onboarding@resend.dev>";
    if (!key) return json({ ok: false, error: "RESEND_API_KEY not configured", needs: "RESEND_API_KEY + RESEND_FROM" }, 503);

    const { to, subject, html, replyTo } = await req.json();
    if (!to || !subject || !html) throw new Error("חסר to / subject / html");

    // replyTo זר מושמט בשקט (עם לוג) — לא מפיל את השליחה עצמה.
    const safeReplyTo = isAllowedReplyTo(replyTo) ? replyTo : undefined;
    if (replyTo && !safeReplyTo) {
      console.warn(`[send-admin-email] dropped off-domain replyTo="${replyTo}" (admin=${auth.email})`);
    }

    console.log(`[send-admin-email] admin=${auth.email} → to=${Array.isArray(to) ? to.join(",") : to}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, ...(safeReplyTo ? { reply_to: safeReplyTo } : {}) }),
    });
    const body = await res.text();
    if (!res.ok) return json({ ok: false, status: res.status, error: body.slice(0, 500) }, 502);
    return json({ ok: true, provider: "resend", result: JSON.parse(body || "{}") });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
