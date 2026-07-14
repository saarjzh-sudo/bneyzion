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

export function useCreateSalePoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sp: Partial<SalePoint>) => {
      const { data, error } = await (supabase as any).from("sale_points").insert(sp).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("הנקודה לא נוצרה — אין הרשאת עריכה (RLS). פנה לסער.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sale-points-admin"] }),
  });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sale-points-admin"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sale-points-admin"] }),
  });
}
