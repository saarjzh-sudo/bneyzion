/**
 * api/yehoshua/donations — donor list for the campaign admin dashboard.
 *
 * WHY server-side:
 *   The `donations` table holds PII (name, email, phone, shipping address).
 *   RLS on that table is fail-closed: anon has NO SELECT policy. Reading it
 *   here with the service-role key, after an authorization check, keeps the
 *   REST API closed to anon while still letting the dashboard render.
 *
 * SECURITY (audit H4, fixed 2.8.2026):
 *   This endpoint used to be gated by a shared password that defaulted to
 *   "123456" when YEHOSHUA_ADMIN_PASSWORD was unset. The full exploit was
 *   `POST {"password":"123456"}` — returning every donor's name, email, phone,
 *   amount, asmachta, card suffix and home address. Two things changed:
 *     1. The gate is now a verified Supabase JWT + the `admin` role, the same
 *        check /admin/campaigns already uses (see CampaignDetail.tsx).
 *     2. There is no default credential and no fallback path. A missing env
 *        var can no longer become a working password.
 *
 *   TREAT THE HISTORICAL DATA AS ALREADY LEAKED — the password was in the repo
 *   and documented in DesignPreviewYehoshuaAdmin.tsx. Donors should be assumed
 *   exposed for the period this endpoint was live.
 *
 * Contract:
 *   POST  (Authorization: Bearer <supabase access token>)
 *     200 → { stats: {supporters, raised}, donations: [...] }
 *     401 → not signed in / invalid token
 *     403 → signed in but not an admin
 *     500 → server misconfigured / DB error
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin, getServiceClient } from "../lib/admin-auth.js";

const PRODUCT = "yehoshua-campaign";

const DONATION_COLUMNS =
  "id, created_at, donor_name, donor_email, phone, amount, asmachta, payment_id, payment_status, product, payment_method, card_suffix, tier_id, description, shipping_street, shipping_house_number, shipping_city, shipping_zip, shipping_notes";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const supabase = getServiceClient();

  // KPIs from the aggregate view (matches the public campaign page).
  const { data: statsData, error: statsErr } = await supabase
    .from("yehoshua_campaign_stats")
    .select("*")
    .single();
  if (statsErr) {
    return res.status(500).json({ error: "stats: " + statsErr.message });
  }

  // Full donor rows (service-role bypasses RLS — the admin check above is what
  // authorizes this, and it is the only thing that does).
  const { data: donations, error: donErr } = await supabase
    .from("donations")
    .select(DONATION_COLUMNS)
    .eq("product", PRODUCT)
    .order("created_at", { ascending: false });
  if (donErr) {
    return res.status(500).json({ error: "donations: " + donErr.message });
  }

  const s = statsData as { supporters?: number | string; raised?: number | string } | null;

  console.log(`[yehoshua/donations] PII read by admin ${auth.email || auth.userId}`);

  // Never cache a PII response at the edge/CDN.
  res.setHeader("Cache-Control", "no-store, max-age=0");
  return res.status(200).json({
    stats: {
      supporters: Number(s?.supporters) || 0,
      raised: Number(s?.raised) || 0,
    },
    donations: donations || [],
  });
}
