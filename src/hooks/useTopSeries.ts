/**
 * useTopSeries — fetches active series sorted by lesson_count DESCENDING.
 *
 * Why this exists: the default `useSeries` hook orders by created_at desc,
 * and PostgREST caps results at 1000 rows. That means series with the
 * highest lesson_count (often older) get truncated. This hook explicitly
 * sorts by lesson_count on the server so the top series come back regardless
 * of when they were created.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTopSeries(limit = 50) {
  return useQuery({
    queryKey: ["top-series", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("*, rabbis!series_rabbi_id_fkey(name)")
        .in("status", ["active", "published"])   // R-LIB1: include 'published' series
        .gt("lesson_count", 0)
        .not("audience_tags", "cs", '{"teachers"}')
        .order("lesson_count", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}
