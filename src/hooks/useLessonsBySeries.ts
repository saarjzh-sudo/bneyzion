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
      // §0.1 order: sort_order NULLS LAST, bible_chapter NULLS LAST, title ASC
      // §4: explicit limit(2000) — PostgREST silently caps at 1000 without it (R-SER6).
      //     Series with >1000 lessons (e.g. large Nevi'im books) would be silently truncated.
      // Two pages of 1000: fetch 1-1000 then 1001-2000 to beat the PostgREST cap.
      const fetchPage = async (from: number, to: number) => {
        const { data, error } = await supabase
          .from("lessons")
          .select("*, rabbis!lessons_rabbi_id_fkey(name)")
          .eq("series_id", seriesId)
          .eq("status", "published")
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("bible_chapter", { ascending: true, nullsFirst: false })
          .order("title", { ascending: true })
          .range(from, to);
        if (error) throw error;
        return data || [];
      };
      const page1 = await fetchPage(0, 999);
      const page2 = page1.length === 1000 ? await fetchPage(1000, 1999) : [];
      const allRows = [...page1, ...page2];

      // §0.2 dedup by physical id only — the curated sort_order plan produces exact row sets;
      // same-title multi-part shiurim are legitimate and must NOT be collapsed.
      // We only deduplicate rows that are physically identical (same DB id) to handle the
      // migration COPY-duplicate case where the same id was inserted twice.
      const seen = new Set<string>();
      return allRows.filter((l: any) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });
    },
    enabled: !!seriesId,
    staleTime: 1000 * 60 * 5,
  });
}
