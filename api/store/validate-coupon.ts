// POST /api/store/validate-coupon  { code: string, subtotal: number }
// → { valid, reason?, code?, discount?, label? }
//
// Coupons are admin-only under RLS, so the storefront cannot read them with
// the anon key — this endpoint validates with service_role and returns only
// the computed discount (never the coupon list). Final authority remains in
// create-payment.ts, which re-validates at payment time.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateCoupon, computeCouponDiscount, couponLabel } from "../lib/coupon";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, subtotal } = (req.body ?? {}) as { code?: string; subtotal?: number };
    const safeSubtotal = Number(subtotal) || 0;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const check = await validateCoupon(supabase, code);

    if (!check.valid) {
      return res.status(200).json({ valid: false, reason: check.reason });
    }

    return res.status(200).json({
      valid: true,
      code: check.code,
      discount: computeCouponDiscount(check, safeSubtotal),
      label: couponLabel(check),
    });
  } catch (e: any) {
    console.error("validate-coupon error:", e);
    return res.status(500).json({ valid: false, reason: "שגיאה בבדיקת הקופון" });
  }
}
