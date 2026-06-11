/**
 * useRabbiMultiSelect — mutations for lesson_rabbis / series_rabbis join tables.
 * Created: Batch B, Feature 3.
 * The primary rabbi (lessons.rabbi_id / series.rabbi_id) is set directly by
 * ContentUpload — these hooks manage the join-table rows that track ALL rabbis.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── types ────────────────────────────────────────────────────────────────────
interface LessonRabbiRow {
  lesson_id: string;
  rabbi_id:  string;
  role:      "primary" | "guest";
  sort_order: number;
}

interface SeriesRabbiRow {
  series_id: string;
  rabbi_id:  string;
  role:      "primary" | "guest";
  sort_order: number;
}

// ─── useLessonRabbis ──────────────────────────────────────────────────────────
/**
 * After a lesson INSERT succeeds, call insertLessonRabbis to populate the
 * lesson_rabbis join table.
 * Index 0 = primary, rest = guest.
 */
export function useLessonRabbis() {
  const qc = useQueryClient();

  const insertLessonRabbis = useMutation({
    mutationFn: async ({
      lessonId,
      rabbiIds,
    }: {
      lessonId: string;
      rabbiIds: string[];
    }) => {
      if (!rabbiIds.length) return;
      const rows: LessonRabbiRow[] = rabbiIds.map((rId, i) => ({
        lesson_id:  lessonId,
        rabbi_id:   rId,
        role:       i === 0 ? "primary" : "guest",
        sort_order: i,
      }));
      // Cast to any — lesson_rabbis is a new table, not yet in generated types.
      const { error } = await (supabase as any).from("lesson_rabbis").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lessons"] }),
  });

  return { insertLessonRabbis };
}

// ─── useSeriesRabbis ──────────────────────────────────────────────────────────
/**
 * After a series INSERT/UPDATE, call insertSeriesRabbis to populate the
 * series_rabbis join table (replaces existing rows for that series).
 */
export function useSeriesRabbis() {
  const qc = useQueryClient();

  const insertSeriesRabbis = useMutation({
    mutationFn: async ({
      seriesId,
      rabbiIds,
    }: {
      seriesId: string;
      rabbiIds: string[];
    }) => {
      if (!rabbiIds.length) return;
      const rows: SeriesRabbiRow[] = rabbiIds.map((rId, i) => ({
        series_id:  seriesId,
        rabbi_id:   rId,
        role:       i === 0 ? "primary" : "guest",
        sort_order: i,
      }));
      const { error } = await (supabase as any).from("series_rabbis").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["series"] }),
  });

  return { insertSeriesRabbis };
}
