/**
 * useTeacherRecommendations — "שיעורים מומלצים באותו נושא" for the Teachers Wing.
 *
 * UNLIKE the public useRecommendations (which is auth-gated and EXCLUDES teacher
 * content), this hook:
 *   - works for anonymous visitors (no user history needed)
 *   - returns ONLY teacher-tagged content (audience_tags @> {teachers})
 *   - ranks by topical proximity to the current lesson
 *
 * Context (series / book / content_type / rabbi) can be passed in by the caller,
 * but any missing field is self-derived from the lesson row — so every surface
 * (modal, full page) gets good recommendations with just the lessonId.
 *
 * Tiers (merged in priority order until `limit` reached):
 *   1. same series          — other lessons in the same סדרה
 *   2. same book + same type — e.g. "ביאור הפסוקים" of the same חומש
 *   3. same creator (rabbi)
 *   4. same book (any type)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeacherRecLesson {
  id: string;
  title: string;
  contentType: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  audioUrl: string | null;
  videoUrl: string | null;
  attachmentUrl: string | null;
  seriesId: string | null;
  seriesTitle: string | null;
  rabbiName: string | null;
}

const SEL =
  "id, title, content_type, thumbnail_url, duration, audio_url, video_url, attachment_url, series_id, rabbi_id";

export interface TeacherRecOpts {
  lessonId: string;
  seriesId?: string | null;
  bibleBook?: string | null;
  contentType?: string | null;
  rabbiId?: string | null;
  limit?: number;
}

export function useTeacherRecommendations(opts: TeacherRecOpts) {
  const { lessonId, seriesId, bibleBook, contentType, rabbiId, limit = 6 } = opts;

  return useQuery<TeacherRecLesson[]>({
    queryKey: [
      "teacher-recommendations-v1",
      lessonId,
      seriesId ?? null,
      bibleBook ?? null,
      contentType ?? null,
      rabbiId ?? null,
      limit,
    ],
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      // ── Derive any missing context from the lesson itself ─────────────────────
      let ctxSeries = seriesId ?? null;
      let ctxBook = bibleBook ?? null;
      let ctxType = contentType ?? null;
      let ctxRabbi = rabbiId ?? null;

      if (!ctxSeries || !ctxBook || !ctxType || !ctxRabbi) {
        const { data: self } = await supabase
          .from("lessons")
          .select("series_id, bible_book, content_type, rabbi_id")
          .eq("id", lessonId)
          .maybeSingle();
        if (self) {
          ctxSeries = ctxSeries ?? (self as any).series_id ?? null;
          ctxBook = ctxBook ?? (self as any).bible_book ?? null;
          ctxType = ctxType ?? (self as any).content_type ?? null;
          ctxRabbi = ctxRabbi ?? (self as any).rabbi_id ?? null;
        }
      }

      const pool = new Map<string, any>();
      const want = limit + 2; // small buffer before enrichment/slice
      const addRows = (rows: any[] | null | undefined) => {
        for (const r of rows || []) {
          if (r.id === lessonId) continue;
          if (!pool.has(r.id)) pool.set(r.id, r);
        }
      };
      const base = () =>
        supabase
          .from("lessons")
          .select(SEL)
          .eq("status", "published")
          .contains("audience_tags", ["teachers"])
          .neq("id", lessonId);

      // Tier 1 — same series
      if (ctxSeries && pool.size < want) {
        const { data } = await base().eq("series_id", ctxSeries).limit(8);
        addRows(data);
      }
      // Tier 2 — same book + same content type
      if (ctxBook && ctxType && pool.size < want) {
        const { data } = await base().eq("bible_book", ctxBook).eq("content_type", ctxType).limit(8);
        addRows(data);
      }
      // Tier 3 — same creator
      if (ctxRabbi && pool.size < want) {
        const { data } = await base().eq("rabbi_id", ctxRabbi).limit(8);
        addRows(data);
      }
      // Tier 4 — same book, any type
      if (ctxBook && pool.size < want) {
        const { data } = await base().eq("bible_book", ctxBook).limit(10);
        addRows(data);
      }

      const rows = [...pool.values()].slice(0, limit);
      if (rows.length === 0) return [];

      // ── Enrich rabbi + series names ───────────────────────────────────────────
      const rabbiIds = [...new Set(rows.filter((r) => r.rabbi_id).map((r) => r.rabbi_id as string))];
      const seriesIds = [...new Set(rows.filter((r) => r.series_id).map((r) => r.series_id as string))];
      let rabbiMap = new Map<string, string>();
      let seriesMap = new Map<string, string>();
      if (rabbiIds.length) {
        const { data } = await supabase.from("rabbis").select("id, name").in("id", rabbiIds);
        rabbiMap = new Map((data || []).map((r) => [r.id, r.name]));
      }
      if (seriesIds.length) {
        const { data } = await supabase.from("series").select("id, title").in("id", seriesIds);
        seriesMap = new Map((data || []).map((s) => [s.id, s.title]));
      }

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        contentType: r.content_type ?? null,
        thumbnailUrl: r.thumbnail_url ?? null,
        duration: r.duration ?? null,
        audioUrl: r.audio_url ?? null,
        videoUrl: r.video_url ?? null,
        attachmentUrl: r.attachment_url ?? null,
        seriesId: r.series_id ?? null,
        seriesTitle: r.series_id ? seriesMap.get(r.series_id) ?? null : null,
        rabbiName: r.rabbi_id ? rabbiMap.get(r.rabbi_id) ?? null : null,
      }));
    },
  });
}
