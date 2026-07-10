import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSiteSetting(key: string) {
  return useQuery({
    queryKey: ["site-setting", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings" as any)
        .select("value")
        .eq("key", key)
        .single();
      if (error) throw error;
      return (data as any)?.value as string;
    },
  });
}

export function useAllSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings" as any)
        .select("*")
        .order("key");
      if (error) throw error;
      return data as unknown as { key: string; value: string; updated_at: string }[];
    },
  });
}

export function useUpdateSiteSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("site_settings" as any)
        .upsert({ key, value, updated_at: new Date().toISOString() } as any, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site-setting", key] });
    },
  });
}

/** רמה 13 (מרכז שליטה): מחיקת override — הקומפוננטה חוזרת לנוסח המקודד */
export function useDeleteSiteSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from("site_settings" as any)
        .delete()
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: (_, key) => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site-setting", key] });
    },
  });
}

/**
 * רמה 13 (מרכז שליטה): מפת כל הנוסחים בשאילתה אחת (הטבלה קטנה), ואז
 * `copy(key, fallback)` בקומפוננטות החיות. עד שעורכים באדמין מוחזר ה-fallback
 * המקודד — אפס שינוי ויזואלי, והרנדור הראשון לא תלוי ברשת.
 */
export function useSiteCopy() {
  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings" as any)
        .select("*")
        .order("key");
      if (error) throw error;
      return data as unknown as { key: string; value: string; updated_at: string }[];
    },
    staleTime: 1000 * 60 * 5,
  });
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  return (key: string, fallback: string) => {
    const v = map.get(key);
    return v == null || v === "" ? fallback : v;
  };
}
