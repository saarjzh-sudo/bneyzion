/**
 * notify-question-answered — עותק תשובת "שאל את הרב" למייל השואל.
 *
 * גוף: { question_id }
 * זרימה: טוען את השאלה מ-site_questions עם service role →
 *   אם אין asker_email → מדלג (ok, skipped: "no-email")
 *   אם email_sent_at כבר קיים → מדלג (ok, skipped: "already-sent") — אידמפוטנטי
 *   אם אין answer → מדלג (ok:false, skipped: "not-answered")
 *   אחרת שולח מייל RTL נקי עם השאלה והתשובה, ומחתים email_sent_at.
 *
 * תעבורת מייל: Resend — בדיוק כמו send-admin-email (אומת 1.7.2026: ל-Smoove
 * אין endpoint transactional). צריך את אותם secrets:
 *   RESEND_API_KEY   — מפתח Resend
 *   RESEND_FROM      — כתובת מאומתת, למשל "בני ציון <office@bneyzion.co.il>"
 * (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY מוזרקים אוטומטית ע"י הפלטפורמה.)
 *
 * תמיד מחזיר 200 (חוץ מ-OPTIONS) עם { ok, sent?, skipped?, error? } — כישלון
 * מייל לעולם לא אמור לשבור את זרימת המענה בצד האדמין.
 *
 * Deploy:  supabase functions deploy notify-question-answered
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** בריחת HTML לתוכן שהגיע מגולשים — השאלה/השם נכנסים למייל כטקסט, לא כתגיות. */
function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** טקסט רב-שורות → HTML עם שבירות שורה, אחרי בריחה. */
function nl2br(s: string): string {
  return esc(s).replaceAll("\n", "<br>");
}

function buildEmailHtml(askerName: string, question: string, answer: string, answeredBy: string | null): string {
  return `
<div dir="rtl" style="margin:0;padding:24px 12px;background:#FAF6F0;font-family:Arial,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E8D5A0;border-radius:12px;overflow:hidden;">
    <div style="height:4px;background:linear-gradient(90deg,#1A2744,#C4A265,#1A2744);"></div>
    <div style="padding:28px 24px;">
      <h1 style="margin:0 0 6px;font-size:20px;color:#1A2744;">שלום ${esc(askerName)},</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#3D2A14;">
        שאלתם אותנו באתר, והתשובה מוכנה. שמחים שאתם לומדים איתנו.
      </p>

      <div style="margin:0 0 16px;padding:14px 16px;background:#FAF6F0;border-right:3px solid #C4A265;border-radius:8px;">
        <div style="font-size:12px;font-weight:bold;color:#8B6F47;margin-bottom:6px;">השאלה שלכם</div>
        <div style="font-size:14px;line-height:1.8;color:#3D2A14;">${nl2br(question)}</div>
      </div>

      <div style="margin:0 0 20px;padding:14px 16px;background:#f6fdf8;border-right:3px solid #8B6F47;border-radius:8px;">
        <div style="font-size:12px;font-weight:bold;color:#8B6F47;margin-bottom:6px;">התשובה</div>
        <div style="font-size:15px;line-height:1.8;color:#2D1F0E;">${nl2br(answer)}</div>
        ${answeredBy ? `<div style="margin-top:12px;font-size:13px;font-weight:bold;color:#8B6F47;">${esc(answeredBy)}</div>` : ""}
      </div>

      <p style="margin:0;font-size:14px;line-height:1.7;color:#6B5C4A;">
        התשובה מתפרסמת גם בעמוד "שאל את הרב" באתר, לתועלת כל הלומדים.
        מוזמנים לשאול עוד בכל עת.
      </p>
      <p style="margin:18px 0 0;font-size:15px;color:#1A2744;font-weight:bold;">
        בברכה,<br>בית המדרש בני ציון
      </p>
    </div>
  </div>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown) =>
    new Response(JSON.stringify(b), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { question_id } = await req.json().catch(() => ({}));
    if (!question_id || typeof question_id !== "string") {
      return json({ ok: false, error: "חסר question_id" });
    }

    // אימות שהקורא אדמין (התבנית של broadcast-notification) — verify_jwt מוודא
    // רק JWT תקף, לא role; בלי הבדיקה הזו כל משתמש מחובר היה יכול לשלוח מיילים.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, error: "Missing authorization" });

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) return json({ ok: false, error: "Unauthorized" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json({ ok: false, error: "Admin access required" });

    const { data: q, error: loadError } = await supabase
      .from("site_questions")
      .select("id, asker_name, asker_email, question, answer, answered_by, email_sent_at")
      .eq("id", question_id)
      .maybeSingle();
    if (loadError) return json({ ok: false, error: loadError.message });
    if (!q) return json({ ok: false, error: "שאלה לא נמצאה" });

    // שערי דילוג — הפונקציה אידמפוטנטית ובטוחה לקריאה חוזרת.
    if (!q.asker_email) return json({ ok: true, sent: false, skipped: "no-email" });
    if (q.email_sent_at) return json({ ok: true, sent: false, skipped: "already-sent" });
    if (!q.answer) return json({ ok: false, sent: false, skipped: "not-answered" });

    // תעבורת Resend — זהה ל-send-admin-email (אותו ספק, אותם env names).
    const key = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM") || "בני ציון <onboarding@resend.dev>";
    if (!key) return json({ ok: false, error: "RESEND_API_KEY not configured", needs: "RESEND_API_KEY + RESEND_FROM" });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: q.asker_email,
        subject: "התשובה לשאלה ששאלתם באתר בני ציון",
        html: buildEmailHtml(q.asker_name, q.question, q.answer, q.answered_by),
      }),
    });
    const body = await res.text();
    if (!res.ok) return json({ ok: false, status: res.status, error: body.slice(0, 500) });

    // חותמת אידמפוטנטיות — רק אחרי שליחה מוצלחת.
    const { error: stampError } = await supabase
      .from("site_questions")
      .update({ email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", question_id);
    if (stampError) {
      // המייל יצא אבל החותמת נכשלה — מדווחים כדי שקריאה חוזרת לא תשלח כפול בלי ידיעה.
      return json({ ok: true, sent: true, warning: `email sent but stamp failed: ${stampError.message}` });
    }

    return json({ ok: true, sent: true, provider: "resend", result: JSON.parse(body || "{}") });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
