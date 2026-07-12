/**
 * api/yehoshua/donations — password-gated donor list for the admin dashboard.
 *
 * WHY server-side:
 *   The `donations` table holds PII (name, email, phone, shipping address).
 *   RLS on that table is fail-closed: anon has NO SELECT policy, only an
 *   authenticated admin could read it. When we replaced the Google-OAuth gate
 *   on /design-yehoshua-admin with a simple password, the browser client is
 *   anonymous — so it can no longer read the donor rows. Rather than open the
 *   RLS to anon (which would leak every donor's PII to anyone hitting the REST
 *   API), the read is done here with the service-role key AFTER the password
 *   check. The password never unlocks the DB directly — only this endpoint does.
 *
 * Contract:
 *   POST { password }
 *     200 → { stats: {supporters, raised}, donations: [...] }
 *     401 → wrong password
 *     500 → server misconfigured / DB error
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
// Gate password. Overridable via env for rotation; defaults to the value Saar set.
const ADMIN_PASSWORD = (process.env.YEHOSHUA_ADMIN_PASSWORD || "123456").trim();
const PRODUCT = "yehoshua-campaign";

const DONATION_COLUMNS =
  "id, created_at, donor_name, donor_email, phone, amount, asmachta, payment_id, payment_status, product, payment_method, card_suffix, tier_id, description, shipping_street, shipping_house_number, shipping_city, shipping_zip, shipping_notes";

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body =
    typeof req.body === "string" ? safeParse(req.body) : ((req.body as Record<string, unknown>) || {});
  const password = (body?.password ?? "").toString();

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "server not configured" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // KPIs from the aggregate view (matches the public campaign page).
  const { data: statsData, error: statsErr } = await supabase
    .from("yehoshua_campaign_stats")
    .select("*")
    .single();
  if (statsErr) {
    return res.status(500).json({ error: "stats: " + statsErr.message });
  }

  // Full donor rows (service-role bypasses RLS — safe, we already checked the password).
  const { data: donations, error: donErr } = await supabase
    .from("donations")
    .select(DONATION_COLUMNS)
    .eq("product", PRODUCT)
    .order("created_at", { ascending: false });
  if (donErr) {
    return res.status(500).json({ error: "donations: " + donErr.message });
  }

  const s = statsData as { supporters?: number | string; raised?: number | string } | null;

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
