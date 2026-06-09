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
        // Order: biblical chapter first (tanakh series → 1,2,3…; the "whole book"
        // lesson with null chapter floats to the top), then alphabetical by title
        // (article series with no chapter → clean א-ב order). Replaces the previous
        // created_at order which reflected random migration-insert order.
        .order("bible_chapter", { ascending: true, nullsFirst: true })
        .order("title", { ascending: true });
      if (error) throw error;
      // Collapse duplicate rows within a series (the migration cross-listed/duplicated the
      // same lesson). Dedup by normalized title + rabbi, keeping the first (richest content
      // wins on tie via the sort). Different rabbis on the same title stay separate.
      const seen = new Set<string>();
      const deduped = (data || []).filter((l: any) => {
        const key = (l.title || "").trim().replace(/[״"'׳`|]/g, "").replace(/\s+/g, " ")
          + "::" + (l.rabbi_id || "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return deduped;
    },
    enabled: !!seriesId,
    staleTime: 1000 * 60 * 5,
  });
}
