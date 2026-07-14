/**
 * useUnifiedUsers — רמה 17: עמוד "משתמשים" מאוחד (email-centric).
 *
 * קורא את admin_unified_users() — RPC admin-only (SECURITY DEFINER, שער
 * has_role fail-closed). רשומת-אדם אחת לכל email עם דגלים: חשבון / מנוי-פעיל /
 * תורם / קונה, ומקור-אמת = charge אחרון של הו"ק ב-Grow (חלון 35 יום).
 *
 * ה-RPC מוגדר ב-supabase/migrations/20260714_admin_unified_users.sql.
 * כל עוד לא נוצר ב-DB (ממתין לאישור סער) — ה-hook מחזיר שגיאה מסודרת
 * והעמוד מציג מצב "ה-RPC טרם הופעל".
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** חלון "מנוי חי": חויב ב-Grow ב-35 הימים האחרונים (מחיר-הו"ק +35 יום). */
export const LIVE_CHARGE_WINDOW_DAYS = 35;

export interface UnifiedUserTag {
  tag: string;
  source: string | null;
  granted_at: string | null;
  valid_until: string | null;
  cancelled_at: string | null;
  active: boolean;
}

export interface UnifiedUser {
  email: string;
  full_name: string | null;
  phone: string | null;
  user_id: string | null;
  has_account: boolean;
  tags: UnifiedUserTag[];
  is_subscriber_active: boolean;
  was_subscriber: boolean;
  donation_total: number;
  donation_count: number;
  last_donation_date: string | null;
  has_monthly_donation: boolean;
  purchase_count: number;
  purchase_total: number;
  purchased_products: string[];
  last_sub_charge: string | null;
  last_any_charge: string | null;
  first_seen: string | null;
}

/** אינדיקטור מקור-אמת: ירוק=חויב ב-Grow בחלון · אמבר=tag פעיל בלי חיוב · אפור=ללא הו"ק. */
export type TruthStatus = "live" | "stale" | "none";

export function truthStatus(u: UnifiedUser): TruthStatus {
  if (u.last_sub_charge) {
    const ageDays = (Date.now() - new Date(u.last_sub_charge).getTime()) / 86_400_000;
    if (ageDays <= LIVE_CHARGE_WINDOW_DAYS) return "live";
  }
  if (u.is_subscriber_active) return "stale";
  return "none";
}

export type UserFlag = "sub" | "don" | "buyer" | "account" | "inactive" | "free";

export function userFlags(u: UnifiedUser): UserFlag[] {
  const flags: UserFlag[] = [];
  if (u.is_subscriber_active) flags.push("sub");
  if (u.donation_count > 0) flags.push("don");
  if (u.purchase_count > 0 && !onlySubscriptionCharges(u)) flags.push("buyer");
  if (u.has_account) flags.push("account");
  if (u.was_subscriber && !u.is_subscriber_active) flags.push("inactive");
  if (flags.length === 0 || (flags.length === 1 && flags[0] === "account")) flags.push("free");
  return flags;
}

/** קונה "אמיתי" = יש לו רכישה שאינה חיוב-הו"ק של המנוי. */
function onlySubscriptionCharges(u: UnifiedUser): boolean {
  const products = u.purchased_products || [];
  return products.length > 0 && products.every((p) => p === "weekly-chapter-subscription");
}

export interface UserDetail {
  email: string;
  orders: Array<{
    date: string | null;
    product: string | null;
    description: string | null;
    total: number | null;
    status: string | null;
    payment_label: string | null;
    asmachta: string | null;
  }>;
  donations: Array<{
    date: string | null;
    amount: number | null;
    is_monthly: boolean | null;
    status: string | null;
    description: string | null;
  }>;
  tags: Array<UnifiedUserTag & { notes: string | null }>;
}

export function useUnifiedUsers(enabled = true) {
  return useQuery<UnifiedUser[], Error>({
    queryKey: ["admin-unified-users"],
    enabled,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("admin_unified_users");
      if (error) throw new Error(error.message);
      return (data ?? []) as UnifiedUser[];
    },
  });
}

export function useUserDetail(email: string | null) {
  return useQuery<UserDetail, Error>({
    queryKey: ["admin-user-detail", email],
    enabled: !!email,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("admin_user_detail", {
        p_email: email,
      });
      if (error) throw new Error(error.message);
      return data as UserDetail;
    },
  });
}
