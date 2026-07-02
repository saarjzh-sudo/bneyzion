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
 * Deploy:  supabase functions deploy send-admin-email
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const key = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM") || "בני ציון <onboarding@resend.dev>";
    if (!key) return json({ ok: false, error: "RESEND_API_KEY not configured", needs: "RESEND_API_KEY + RESEND_FROM" }, 503);

    const { to, subject, html, replyTo } = await req.json();
    if (!to || !subject || !html) throw new Error("חסר to / subject / html");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    const body = await res.text();
    if (!res.ok) return json({ ok: false, status: res.status, error: body.slice(0, 500) }, 502);
    return json({ ok: true, provider: "resend", result: JSON.parse(body || "{}") });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
