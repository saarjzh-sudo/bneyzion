/**
 * useLessonsBySeries — fetch all published lessons of a given series_id.
 * Used by sandbox preview pages (DesignPreviewSeriesPage, DesignPreviewLessonPopup)
 * and will become the canonical hook for the live SeriesPagePublic page once
 * the redesign is rolled out.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLessonsBySeries(seriesId: string | undefined) {
  return useQuery({
    queryKey: ["lessons-by-series", seriesId],
    queryFn: async () => {
      if (!seriesId) return [];
      const { data, error } = await supabase
        .from("lessons")
        .select("*, rabbis(name)")
        .eq("series_id", seriesId)
        .eq("status", "published")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!seriesId,
    staleTime: 1000 * 60 * 5,
  });
}
