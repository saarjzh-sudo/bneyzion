// POST /api/store/validate-coupon  { code: string, subtotal: number }
// → { valid, reason?, code?, discount?, label? }
//
// Coupons are admin-only under RLS, so the storefront cannot read them with
// the anon key — this endpoint validates with service_role and returns only
// the computed discount (never the coupon list). Final authority remains in
// create-payment.ts, which re-validates at payment time.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
// ".js" extension required under "type":"module" (see create-payment.ts)
import { validateCoupon, computeCouponDiscount, couponLabel } from "../lib/coupon.js";

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

    // הנתיב עונה valid/invalid על כל קוד בלי שום אימות, ולכן הוא אורקל לסריקת
    // קודי-קופון. 20 ניסיונות לדקה לכל IP מספיקים בהרבה לשימוש אנושי אמיתי
    // וחונקים סריקה. המונה יושב ב-DB כי serverless לא שומר מצב בין מופעים.
    const fwd = String(req.headers["x-forwarded-for"] || "");
    const ip = (fwd.split(",")[0] || "").trim() || "unknown";
    const { data: allowed, error: rlErr } = await supabase.rpc("rate_limit_check", {
      p_bucket: `validate-coupon:${ip}`,
      p_limit: 20,
      p_window_seconds: 60,
    });
    if (rlErr) {
      // המיגרציה 20260809_security_rate_limit לא הורצה, או שה-RPC נכשל.
      // לא חוסמים מכירות בגלל תקלת-תשתית — מתעדים ורואים בלוג.
      console.error("validate-coupon: rate_limit_check failed", rlErr.message);
    } else if (allowed === false) {
      console.warn("validate-coupon: rate limit exceeded", { ip });
      return res.status(429).json({ valid: false, reason: "יותר מדי ניסיונות. נסו שוב בעוד דקה." });
    }

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
