/**
 * send-smoove-email — שליחת מייל בודד מהאדמין דרך חשבון ה-Smoove של בני ציון.
 *
 * משתמש ב-`SMOOVE_API_KEY` (כבר קיים ב-Supabase secrets, אותו מפתח של import-smoove).
 * גוף הבקשה: { to: string, subject: string, html: string, fromName?: string }
 *
 * ⚠️ הערת-פריסה: יש לאמת מול Smoove את נתיב ה-transactional המדויק. Smoove הוא
 * פלטפורמת-קמפיינים; לשליחת מייל בודד ייתכן שצריך יצירת-קמפיין+send או endpoint
 * ייעודי. הפונקציה בנויה מסביב ל-`/v1/Emails/Transactional` (נפוץ) — אם מחזיר 404,
 * החלף ל-Resend/SES או לזרימת קמפיין. עד לאימות — הכפתור באדמין קורא לכאן ומדווח שגיאה ברורה.
 *
 * Deploy:  supabase functions deploy send-smoove-email
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const key = Deno.env.get("SMOOVE_API_KEY");
    if (!key) throw new Error("SMOOVE_API_KEY not configured");

    const { to, subject, html, fromName } = await req.json();
    if (!to || !subject || !html) throw new Error("חסר to / subject / html");

    const res = await fetch("https://rest.smoove.io/v1/Emails/Transactional", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        subject,
        body: html,
        fromName: fromName || "בני ציון",
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      return json({ ok: false, status: res.status, error: text.slice(0, 500),
        hint: "אמת את נתיב ה-transactional של Smoove (או עבור ל-Resend/SES)." }, 502);
    }
    return json({ ok: true, provider: "smoove", result: text.slice(0, 500) });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
