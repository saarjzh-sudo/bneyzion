import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSeriesDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["series-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("*, rabbis(id, name, image_url)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useSeriesLessonsList(seriesId: string | undefined) {
  return useQuery({
    queryKey: ["series-lessons-list", seriesId],
    enabled: !!seriesId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, duration, published_at, thumbnail_url, video_url, audio_url, rabbi_id, rabbis(name)")
        .eq("series_id", seriesId!)
        .eq("status", "published")
        .order("published_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
