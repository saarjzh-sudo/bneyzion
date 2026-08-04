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
  /** Set only by reserveCoupon() — the webhook consumes or releases it. */
  reservationId?: string;
}

/**
 * Atomically reserve one use of a coupon (audit M10).
 *
 * validateCoupon() below is a READ. Between that read at create-payment time
 * and the used_count increment in the webhook there are minutes of the buyer
 * typing card details into Grow — so a max_uses=1 coupon could be redeemed in
 * 20 parallel tabs, every one of them reading used_count=0 and passing.
 *
 * This takes a row lock on the coupon and counts open reservations alongside
 * used_count, so concurrent callers queue instead of racing. Reservations
 * expire on their own after 30 minutes, which is why an abandoned checkout
 * still doesn't burn a single-use coupon — the property the webhook-only
 * counting was there to preserve.
 *
 * Use this at payment time. validateCoupon stays for the read-only preview at
 * /api/store/validate-coupon, where reserving would be wrong.
 */
export async function reserveCoupon(
  supabase: SupabaseClient,
  rawCode: string | undefined | null,
  orderId?: string | null
): Promise<CouponCheck> {
  const code = (rawCode || "").toUpperCase().trim();
  if (!code) return { valid: false, reason: "לא הוזן קוד קופון" };

  const { data, error } = await supabase.rpc("reserve_coupon", {
    p_code: code,
    p_order_id: orderId ?? null,
  });

  if (error) {
    console.error("reserveCoupon RPC error:", error);
    // Fail closed. A coupon that cannot be reserved must not be honoured —
    // silently continuing at full price would be wrong too, so the caller
    // surfaces this as a retryable error.
    return { valid: false, reason: "שגיאה בבדיקת הקופון — נסו שוב" };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.valid) {
    return { valid: false, reason: row?.reason || "קוד הקופון אינו תקף" };
  }

  return {
    valid: true,
    code: row.code,
    discountType: row.discount_type === "amount" ? "amount" : "percent",
    discountValue: Number(row.discount_value) || 0,
    reservationId: row.reservation_id,
  };
}

/** Mark a reservation used and increment used_count. Idempotent per reservation. */
export async function consumeCouponReservation(
  supabase: SupabaseClient,
  reservationId: string | null | undefined
): Promise<boolean> {
  if (!reservationId) return false;
  const { data, error } = await supabase.rpc("consume_coupon_reservation", {
    p_reservation_id: reservationId,
  });
  if (error) {
    console.error("consumeCouponReservation RPC error:", error);
    return false;
  }
  return data === true;
}

/** Release a reservation after a failed payment so the use returns immediately. */
export async function releaseCouponReservation(
  supabase: SupabaseClient,
  reservationId: string | null | undefined
): Promise<boolean> {
  if (!reservationId) return false;
  const { error } = await supabase.rpc("release_coupon_reservation", {
    p_reservation_id: reservationId,
  });
  if (error) {
    console.error("releaseCouponReservation RPC error:", error);
    return false;
  }
  return true;
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
