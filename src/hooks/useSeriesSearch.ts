import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useDeferredValue } from "react";

export interface SeriesSearchResult {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  lesson_count: number;
  status: string;
  rabbis: { name: string } | null;
  parent_title: string | null;
}

export interface LessonSearchResult {
  id: string;
  title: string;
  duration: number | null;
  video_url: string | null;
  audio_url: string | null;
  series: { id: string; title: string } | null;
  rabbis: { name: string } | null;
}

function useSeriesSearchQuery(query: string) {
  return useQuery({
    queryKey: ["series-search", query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const pattern = `%${query}%`;

      const [seriesRes, lessonsRes] = await Promise.all([
        supabase
          .from("series")
          .select("id, title, description, image_url, lesson_count, status, rabbis(name), parent:series!series_parent_id_fkey(title)")
          .ilike("title", pattern)
          .limit(12),
        supabase
          .from("lessons")
          .select("id, title, duration, video_url, audio_url, series:series!lessons_series_id_fkey(id, title), rabbis(name)")
          .eq("status", "published")
          .ilike("title", pattern)
          .limit(12),
      ]);

      if (seriesRes.error) throw seriesRes.error;
      if (lessonsRes.error) throw lessonsRes.error;

      const series: SeriesSearchResult[] = (seriesRes.data || []).map((s: any) => ({
        ...s,
        parent_title: s.parent?.title || null,
      }));

      return {
        series,
        lessons: (lessonsRes.data || []) as LessonSearchResult[],
      };
    },
  });
}

export function useSeriesSearch() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const { data, isLoading } = useSeriesSearchQuery(deferredQuery);

  return {
    query,
    setQuery,
    results: data,
    isSearching: deferredQuery.length >= 2,
    isLoading,
  };
}
