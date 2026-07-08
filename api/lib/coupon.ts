// Shared coupon validation — used by /api/store/validate-coupon (checkout UX)
// and /api/grow/create-payment (server-side authority at payment time).
// Discount applies to the products subtotal only — never to shipping.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface CouponCheck {
  valid: boolean;
  reason?: string;
  code?: string;
  discountType?: "percent" | "amount";
  discountValue?: number;
}

export async function validateCoupon(
  supabase: SupabaseClient,
  rawCode: string | undefined | null
): Promise<CouponCheck> {
  const code = (rawCode || "").toUpperCase().trim();
  if (!code) return { valid: false, reason: "לא הוזן קוד קופון" };

  const { data: c, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("validateCoupon query error:", error);
    return { valid: false, reason: "שגיאה בבדיקת הקופון — נסו שוב" };
  }
  if (!c) return { valid: false, reason: "קוד הקופון לא נמצא" };
  if (c.status !== "active") return { valid: false, reason: "הקופון אינו פעיל" };

  const now = new Date();
  if (c.valid_from && new Date(c.valid_from) > now)
    return { valid: false, reason: "הקופון עדיין לא בתוקף" };
  if (c.valid_until && new Date(c.valid_until) < now)
    return { valid: false, reason: "תוקף הקופון פג" };
  if (c.max_uses != null && (c.used_count ?? 0) >= c.max_uses)
    return { valid: false, reason: "הקופון מוצה — נוצלו כל השימושים" };

  // discount_type/discount_amount are new columns (level 13). Rows created
  // before the migration have neither → treated as percent (legacy behavior).
  const discountType: "percent" | "amount" =
    (c as any).discount_type === "amount" ? "amount" : "percent";
  const discountValue =
    discountType === "amount"
      ? Number((c as any).discount_amount) || 0
      : Number(c.discount_percent) || 0;

  if (discountValue <= 0) return { valid: false, reason: "הקופון אינו מוגדר כראוי" };

  return { valid: true, code, discountType, discountValue };
}

/** Discount in ₪ for a given products-subtotal (never exceeds the subtotal). */
export function computeCouponDiscount(check: CouponCheck, subtotal: number): number {
  if (!check.valid || !check.discountValue || subtotal <= 0) return 0;
  const raw =
    check.discountType === "amount"
      ? check.discountValue
      : (subtotal * check.discountValue) / 100;
  return Math.min(Math.round(raw), subtotal);
}

export function couponLabel(check: CouponCheck): string {
  if (!check.valid) return "";
  return check.discountType === "amount"
    ? `₪${check.discountValue} הנחה`
    : `${check.discountValue}% הנחה`;
}
