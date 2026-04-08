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
