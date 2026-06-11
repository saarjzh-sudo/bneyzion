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
      // same lesson). Dedup by enriched key: norm(title)|norm(rabbi)|basename(attachment)|
      // audio_url|video_url — absorbs COPY-duplicates while keeping genuinely distinct
      // same-title same-rabbi lessons that differ by media (multi-part shiurim recorded
      // separately). Different rabbis on the same title always stay separate.
      const seen = new Set<string>();
      const deduped = (data || []).filter((l: any) => {
        const normTitle = (l.title || "").trim().replace(/[״"'׳`|]/g, "").replace(/\s+/g, " ");
        const normRabbi = ((l.rabbis as any)?.name || l.rabbi_id || "").trim().replace(/[״"'׳`|]/g, "").replace(/\s+/g, " ");
        const attBase = l.attachment_url ? l.attachment_url.split("/").pop()?.split("?")[0] || "" : "";
        const key = `${normTitle}|${normRabbi}|${attBase}|${l.audio_url || ""}|${l.video_url || ""}`;
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
