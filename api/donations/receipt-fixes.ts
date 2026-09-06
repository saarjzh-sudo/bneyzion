/**
 * api/donations/receipt-fixes — תור תיקון הקבלות באדמין (/admin/receipt-fixes).
 *
 * POST { action: "list" }            → כל תרומות-האתר שהושלמו, עם ת"ז ומצב-תיקון
 * POST { action: "mark", id, fixed } → סימון "הקבלה הופקה מחדש בגרואו" (או ביטול הסימון)
 *
 * שער: requireAdmin (JWT + role admin) — כמו api/yehoshua/donations. PII לא נשמר ב-cache.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin, getServiceClient } from "../lib/admin-auth.js";

const SITE_SOURCES = ["yehoshua-campaign", "saadia", "donate-page"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const auth = await requireAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  const supabase = getServiceClient();
  const body = (req.body || {}) as { action?: string; id?: string; fixed?: boolean };
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (body.action === "mark") {
    if (!body.id) return res.status(400).json({ error: "missing id" });
    const fixed = body.fixed !== false;
    const { error } = await supabase
      .from("donations")
      .update({
        receipt_fixed_at: fixed ? new Date().toISOString() : null,
        receipt_fixed_by: fixed ? auth.email || auth.userId || "admin" : null,
      })
      .eq("id", body.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  const { data, error } = await supabase
    .from("donations")
    .select(
      "id, created_at, donor_name, donor_email, phone, amount, source, asmachta, payment_id, invoice_number, donor_tax_id, tax_id_submitted_at, receipt_fixed_at, receipt_fixed_by"
    )
    .eq("payment_status", "completed")
    .in("source", SITE_SOURCES)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  console.log(`[donations/receipt-fixes] PII read by admin ${auth.email || auth.userId}`);
  return res.status(200).json({ donations: data || [] });
}
