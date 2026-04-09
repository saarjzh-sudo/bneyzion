import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRabbi(id: string | undefined) {
  return useQuery({
    queryKey: ["rabbi", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rabbis")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useRabbiSeries(rabbiId: string | undefined) {
  return useQuery({
    queryKey: ["rabbi-series", rabbiId],
    enabled: !!rabbiId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("*")
        .eq("rabbi_id", rabbiId!)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRabbiLessons(rabbiId: string | undefined) {
  return useQuery({
    queryKey: ["rabbi-lessons", rabbiId],
    enabled: !!rabbiId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, duration, thumbnail_url, published_at, series(id, title)")
        .eq("rabbi_id", rabbiId!)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}
