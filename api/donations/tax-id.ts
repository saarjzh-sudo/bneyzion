/**
 * api/donations/tax-id — התורם מוסר ת"ז אחרי התרומה (תיקון קבלות, 6.9.2026).
 *
 * רקע: עד 6.9.2026 תרומות דרך האתר יצאו ל-Grow בלי ת"ז, ולכן הקבלות של 368 תורמים
 * (יהושע/סעדיה/דף-תרומה) אינן מוכרות לזיכוי מס (סעיף 46). אין API ב-Grow לתיקון קבלה
 * שיצאה — התיקון נעשה ידנית בממשק Grow. העמוד /receipt אוסף את הת"ז, וה-API הזה
 * מצמיד אותו לתרומות של אותו תורם (לפי טלפון או מייל) ומכניס אותן לתור התיקונים
 * באדמין (/admin/receipt-fixes).
 *
 * אבטחה: ה-API כותב רק donor_tax_id + tax_id_submitted_at על שורות שתואמות את
 * פרט-הקשר שנמסר, ומחזיר לתורם רק תאריך+סכום של התרומות שלו (לא שם/כתובת).
 * הת"ז עובר ספרת-ביקורת לפני שמירה (Grow דוחה ת"ז לא תקין).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getServiceClient } from "../lib/admin-auth";

const SITE_SOURCES = ["yehoshua-campaign", "saadia", "donate-page"];

function normalizeIsraeliId(raw: string): string | null {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length < 5 || digits.length > 9) return null;
  const id = digits.padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(id[i]) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  return sum % 10 === 0 ? id : null;
}

/** טלפון → 9 הספרות האחרונות (בלי 0/972 מוביל) להשוואה סלחנית. */
function phoneKey(raw: string | null | undefined): string {
  const d = String(raw || "").replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const body = (req.body || {}) as { phone?: string; email?: string; taxId?: string };
  const taxId = normalizeIsraeliId(body.taxId || "");
  if (!taxId) {
    return res.status(400).json({ error: "מספר תעודת הזהות לא תקין. בדקו את הספרות." });
  }
  const pKey = phoneKey(body.phone);
  const email = String(body.email || "").trim().toLowerCase();
  if (!pKey && !email) {
    return res.status(400).json({ error: "יש להזין טלפון או כתובת מייל." });
  }

  const supabase = getServiceClient();
  const { data: rows, error } = await supabase
    .from("donations")
    .select("id, phone, donor_email, amount, created_at, donor_tax_id, source")
    .eq("payment_status", "completed")
    .in("source", SITE_SOURCES);
  if (error) {
    console.error("tax-id: donations read failed", error);
    return res.status(500).json({ error: "שגיאה זמנית, נסו שוב בעוד רגע." });
  }

  const matched = (rows || []).filter(
    (r) =>
      (pKey && phoneKey(r.phone) === pKey) ||
      (email && String(r.donor_email || "").trim().toLowerCase() === email)
  );
  if (matched.length === 0) {
    return res.status(404).json({
      error: "לא מצאנו תרומה דרך האתר עם הפרטים האלה. נסו טלפון או מייל אחרים, או כתבו לנו.",
    });
  }

  const ids = matched.map((r) => r.id);
  const { error: updErr } = await supabase
    .from("donations")
    .update({ donor_tax_id: taxId, tax_id_submitted_at: new Date().toISOString() })
    .in("id", ids);
  if (updErr) {
    console.error("tax-id: update failed", updErr);
    return res.status(500).json({ error: "שגיאה זמנית, נסו שוב בעוד רגע." });
  }
  console.log(`[donations/tax-id] ${matched.length} donations tagged (contact=${pKey ? "phone" : "email"})`);
  res.setHeader("Cache-Control", "no-store, max-age=0");
  return res.status(200).json({
    matched: matched.length,
    donations: matched
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((r) => ({ date: r.created_at, amount: Number(r.amount) || 0 })),
  });
}
