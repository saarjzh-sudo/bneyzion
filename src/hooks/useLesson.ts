import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLesson(id: string | undefined) {
  return useQuery({
    queryKey: ["lesson", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, rabbis!lessons_rabbi_id_fkey(id, name, image_url, title), series(id, title), audience_tags")
        .eq("id", id!)
        .eq("status", "published")
        .maybeSingle();
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
      // §5 R-LES2: order §0.1 (sort_order NULLS LAST, bible_chapter NULLS LAST, title) instead of published_at
      let query = supabase
        .from("lessons")
        .select("id, title, duration, thumbnail_url, published_at, audience_tags, rabbis!lessons_rabbi_id_fkey(name)")
        .eq("series_id", seriesId!)
        .eq("status", "published")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("bible_chapter", { ascending: true, nullsFirst: false })
        .order("title", { ascending: true })
        .limit(20);
      if (excludeId) query = query.neq("id", excludeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

