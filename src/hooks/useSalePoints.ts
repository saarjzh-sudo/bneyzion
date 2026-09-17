import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// יואב 13.7: נקודות-מכירה / איסוף-עצמי — מנוהלות מהאדמין, הרוכשים רואים רק פעילות.
// טבלת sale_points (RLS: public רואה is_active=true, אדמין רואה/עורך הכל).
export interface SalePoint {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  contact: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

/** ציבורי — רק נקודות פעילות, לבחירה בסליקה (איסוף עצמי). */
export function usePublicSalePoints() {
  return useQuery({
    queryKey: ["sale-points-public"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sale_points")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as SalePoint[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

/** אדמין — כל הנקודות (כולל לא-פעילות). */
export function useSalePoints() {
  return useQuery({
    queryKey: ["sale-points-admin"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sale_points")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as SalePoint[];
    },
  });
}

/**
 * החלפת סדר בין שתי נקודות (17.9.2026, בקשת הרב יואב): הוא מסדר את הנקודות
 * לפי אזורים, וכל נקודה חדשה נחתה בסוף הרשימה. מחליפים sort_order בין שתי
 * שורות שכנות — שתי כתיבות, בלי לגעת בשאר הרשימה.
 */
export function useSwapSalePointOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ a, b }: { a: SalePoint; b: SalePoint }) => {
      // sort_order שווה (או 0 על שתיהן) — החלפה לא תזיז כלום; נותנים ערכים מובחנים.
      const aOrder = a.sort_order === b.sort_order ? a.sort_order + 1 : b.sort_order;
      const bOrder = a.sort_order === b.sort_order ? b.sort_order : a.sort_order;
      const now = new Date().toISOString();
      const first = await (supabase as any).from("sale_points").update({ sort_order: aOrder, updated_at: now }).eq("id", a.id).select("id");
      if (first.error) throw first.error;
      if (!first.data?.length) throw new Error("הסדר לא נשמר — אין הרשאת עריכה (RLS). פנה לסער.");
      const second = await (supabase as any).from("sale_points").update({ sort_order: bOrder, updated_at: now }).eq("id", b.id).select("id");
      if (second.error) throw second.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sale-points-admin"] });
      qc.invalidateQueries({ queryKey: ["sale-points-public"] });
    },
  });
}

export function useCreateSalePoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sp: Partial<SalePoint>) => {
      // בלי sort_order מפורש הנקודה נכנסת לסוף הרשימה (ברירת המחדל 0 הקפיצה
      // אותה לראש) — משם אפשר להזיז אותה למעלה עם החיצים.
      let row = sp;
      if (sp.sort_order === undefined || sp.sort_order === null) {
        const { data: last } = await (supabase as any)
          .from("sale_points").select("sort_order").order("sort_order", { ascending: false }).limit(1);
        row = { ...sp, sort_order: Number(last?.[0]?.sort_order ?? 0) + 1 };
      }
      const { data, error } = await (supabase as any).from("sale_points").insert(row).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("הנקודה לא נוצרה — אין הרשאת עריכה (RLS). פנה לסער.");
      return data[0].id as string;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sale-points-admin"] }); qc.invalidateQueries({ queryKey: ["sale-points-public"] }); },
  });
}

/**
 * אדמין — אנשי הקשר של הנקודות (15.9.2026). יושבים בטבלה הפרטית
 * sale_point_contacts (RLS אדמין בלבד) כדי שלא ייחשפו לציבור בבחירת נקודה.
 */
export function useSalePointContacts() {
  return useQuery({
    queryKey: ["sale-point-contacts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sale_point_contacts")
        .select("sale_point_id, contact");
      if (error) throw error;
      return Object.fromEntries(((data ?? []) as any[]).map((r) => [r.sale_point_id, r.contact as string | null])) as Record<string, string | null>;
    },
  });
}

export async function saveSalePointContact(salePointId: string, contact: string | null) {
  const { error } = await (supabase as any)
    .from("sale_point_contacts")
    .upsert({ sale_point_id: salePointId, contact, updated_at: new Date().toISOString() }, { onConflict: "sale_point_id" });
  if (error) throw error;
}

export function useUpdateSalePoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalePoint> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("sale_points")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("העדכון לא נשמר — אין הרשאת עריכה (RLS). פנה לסער.");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sale-points-admin"] }); qc.invalidateQueries({ queryKey: ["sale-points-public"] }); },
  });
}

export function useDeleteSalePoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).from("sale_points").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("המחיקה לא בוצעה — אין הרשאת מחיקה (RLS). פנה לסער.");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sale-points-admin"] }); qc.invalidateQueries({ queryKey: ["sale-points-public"] }); },
  });
}
