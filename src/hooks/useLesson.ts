import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLesson(id: string | undefined) {
  return useQuery({
    queryKey: ["lesson", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, rabbis(id, name, image_url, title), series(id, title)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useSeriesLessons(seriesId: string | undefined | null, excludeId?: string) {
  return useQuery({
    queryKey: ["series-lessons", seriesId, excludeId],
    enabled: !!seriesId,
    queryFn: async () => {
      let query = supabase
        .from("lessons")
        .select("id, title, duration, thumbnail_url, published_at, rabbis(name)")
        .eq("series_id", seriesId!)
        .eq("status", "published")
        .order("published_at", { ascending: true })
        .limit(20);
      if (excludeId) query = query.neq("id", excludeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

