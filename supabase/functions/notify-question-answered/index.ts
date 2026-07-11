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
 * תעבורת מייל: Smoove (הוחלף מ-Resend 11.7.2026 — RESEND_API_KEY מעולם לא הוגדר).
 * מתכון מייל-לנמען-בודד המאומת של Smoove:
 *   1. upsert איש קשר: POST /Contacts?updateIfExists=true&restoreIfDeleted=true
 *      ⚠️ בלי lists_ToSubscribe — אסור לגעת ברשימות (רשימה = שיגור המוני / אוטומציות).
 *   2. POST /Campaigns?sendnow=true עם:
 *      { subject, fromName, body(html), toMembersByEmail:[email], customUnsubscribeMode:"None" }
 *      ⚠️ fromName חובה בנמען בודד (בלעדיו Smoove מחזירה ErrNotExists).
 *      ⚠️ לעולם לא toListsById — Smoove שולחת ל-UNION של הרשימה והבודד.
 * Secret נדרש:
 *   SMOOVE_API_KEY — מפתח ה-API של חשבון Smoove של בני ציון (Supabase secrets, לא בקוד)
 * (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ANON_KEY מוזרקים אוטומטית ע"י הפלטפורמה.)
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

const SMOOVE_BASE = "https://rest.smoove.io/v1";
const FROM_NAME = "בית המדרש בני ציון";
// Cloudflare של Smoove חוסם User-Agent לא-דפדפני (403 error 1010) — מזדהים כדפדפן.
const SMOOVE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

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

/**
 * שליחת מייל טרנזקציוני לנמען יחיד דרך Smoove.
 * מחזיר { ok, campaignId?, error? }. לעולם לא נוגע ברשימות.
 */
async function sendSingleEmailViaSmoove(
  apiKey: string,
  toEmail: string,
  toName: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; campaignId?: number; error?: string }> {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": SMOOVE_UA,
  };

  // שלב 1 — upsert איש קשר (בלי שום רשימה!) כדי שהקמפיין לנמען-בודד ימצא אותו.
  const contactRes = await fetch(`${SMOOVE_BASE}/Contacts?updateIfExists=true&restoreIfDeleted=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: toEmail, firstName: toName }),
  });
  if (!contactRes.ok) {
    const t = await contactRes.text();
    return { ok: false, error: `smoove contact upsert failed (${contactRes.status}): ${t.slice(0, 300)}` };
  }

  // שלב 2 — קמפיין sendnow לנמען הבודד בלבד.
  // ⚠️ אסור להוסיף toListsById בשום תנאי — זה משגר לרשימה שלמה.
  const campaignRes = await fetch(`${SMOOVE_BASE}/Campaigns?sendnow=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      subject,
      fromName: FROM_NAME,
      body: html,
      toMembersByEmail: [toEmail],
      customUnsubscribeMode: "None",
    }),
  });
  const bodyText = await campaignRes.text();
  if (!campaignRes.ok) {
    return { ok: false, error: `smoove campaign failed (${campaignRes.status}): ${bodyText.slice(0, 300)}` };
  }
  let campaignId: number | undefined;
  try {
    campaignId = JSON.parse(bodyText || "{}")?.id;
  } catch {
    /* גוף לא-JSON — נשאיר undefined */
  }
  if (!campaignId) {
    return { ok: false, error: `smoove returned 200 without campaign id: ${bodyText.slice(0, 300)}` };
  }
  return { ok: true, campaignId };
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

    // תעבורת Smoove — מייל טרנזקציוני לנמען יחיד. המפתח מגיע מ-secret, לא מהקוד.
    const smooveKey = Deno.env.get("SMOOVE_API_KEY");
    if (!smooveKey) return json({ ok: false, error: "SMOOVE_API_KEY not configured", needs: "SMOOVE_API_KEY" });

    // בלי אמוג'י בכותרת מייל — כלל ברזל.
    const subject = "התשובה לשאלה ששאלתם באתר בני ציון";
    const result = await sendSingleEmailViaSmoove(
      smooveKey,
      q.asker_email,
      q.asker_name,
      subject,
      buildEmailHtml(q.asker_name, q.question, q.answer, q.answered_by),
    );
    if (!result.ok) return json({ ok: false, error: result.error });

    // חותמת אידמפוטנטיות — רק אחרי שליחה מוצלחת.
    const { error: stampError } = await supabase
      .from("site_questions")
      .update({ email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", question_id);
    if (stampError) {
      // המייל יצא אבל החותמת נכשלה — מדווחים כדי שקריאה חוזרת לא תשלח כפול בלי ידיעה.
      return json({ ok: true, sent: true, warning: `email sent but stamp failed: ${stampError.message}` });
    }

    return json({ ok: true, sent: true, provider: "smoove", campaign_id: result.campaignId });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
