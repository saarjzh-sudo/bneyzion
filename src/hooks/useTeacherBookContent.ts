/**
 * useTeacherBookContent — data hook for the Teachers Wing book-category pages.
 *
 * Fetches teacher content filtered by bible_book:
 *   - series: series?bible_book=eq.<book>&audience_tags=cs.{teachers}
 *   - standalone lessons: lessons?bible_book=eq.<book>&audience_tags=cs.{teachers}&status=published
 *     (lessons that have no series, or lessons we want to show flat)
 *
 * Per Saar (2026-06-02): NO dedup, NO series_id=null filter.
 * "Duplicate" content is real (teachers within teachers). All rows are real.
 *
 * PostgREST cap = 1000 rows per response → paginate with Range header for lessons.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL_RUNTIME } from "@/integrations/supabase/client";

function getAnonKey(): string {
  return atob(
    "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CNmRtMTNabVY0WldseWRXVnNkMmwxYW5odUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpVMU5UTTFOelVzSW1WNGNDSTZNakE1TVRFeU9UVTNOWDAuVTVhZ0xrZjZqZkxVZzdVamZkblRKZmF2VXN4LWR5enhzMmZ4SmdXQXA4bw=="
  );
}

export interface TeacherBookSeries {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  lesson_count: number;
  rabbiName: string | null;
}

export interface TeacherBookLesson {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  audioUrl: string | null;
  videoUrl: string | null;
  attachmentUrl: string | null;
  thumbnailUrl: string | null;
  contentType: string | null;
  rabbiName: string | null;
  seriesId: string | null;
}

export interface TeacherBookContentResult {
  series: TeacherBookSeries[];
  lessons: TeacherBookLesson[];
  isLoading: boolean;
  total: number;
}

export function useTeacherBookContent(book: string): TeacherBookContentResult {
  const q = useQuery({
    queryKey: ["teacher-book-content-v1", book],
    enabled: !!book,
    queryFn: async () => {
      const anonKey = getAnonKey();
      const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

      // ── 1. Series for this book (via raw fetch — bible_book not in series TS types) ──
      // Strategy: get distinct series_ids from teacher lessons with this bible_book,
      // then fetch those series. This matches the verified query in the brief.
      const anonKeyS = getAnonKey();
      const headersS = { apikey: anonKeyS, Authorization: `Bearer ${anonKeyS}` };
      const lessonsForBookBase = `${SUPABASE_URL_RUNTIME}/rest/v1/lessons?select=series_id&bible_book=eq.${encodeURIComponent(book)}&audience_tags=cs.%7Bteachers%7D&status=eq.published&series_id=not.is.null`;
      const seriesIdRows: Array<{ series_id: string }> = [];
      const PAGE_S = 1000;
      for (let start = 0; ; start += PAGE_S) {
        const resp = await fetch(lessonsForBookBase, {
          headers: { ...headersS, Range: `${start}-${start + PAGE_S - 1}` },
        });
        if (!resp.ok) break;
        const rows = await resp.json();
        seriesIdRows.push(...rows);
        if (rows.length < PAGE_S) break;
      }
      const uniqueSeriesIds = [...new Set(seriesIdRows.map((r) => r.series_id).filter(Boolean))];

      let seriesList: Array<{ id: string; title: string; description: string | null; image_url: string | null; lesson_count: number; rabbi_id: string | null }> = [];
      if (uniqueSeriesIds.length > 0) {
        // Chunk into batches of 400 (PostgREST IN limit)
        for (let i = 0; i < uniqueSeriesIds.length; i += 400) {
          const chunk = uniqueSeriesIds.slice(i, i + 400);
          const { data } = await supabase
            .from("series")
            .select("id, title, description, image_url, lesson_count, rabbi_id")
            .in("id", chunk)
            .gt("lesson_count", 0)
            .order("title");
          seriesList.push(...(data || []));
        }
      }

      // Enrich with rabbi names
      const rabbiIds = [...new Set(seriesList.filter((s) => s.rabbi_id).map((s) => s.rabbi_id!))];
      let seriesRabbiMap = new Map<string, string>();
      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase
          .from("rabbis")
          .select("id, name")
          .in("id", rabbiIds);
        seriesRabbiMap = new Map((rabbis || []).map((r) => [r.id, r.name]));
      }

      const series: TeacherBookSeries[] = seriesList.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        image_url: s.image_url,
        lesson_count: s.lesson_count,
        rabbiName: s.rabbi_id ? seriesRabbiMap.get(s.rabbi_id) || null : null,
      }));

      // ── 2. Standalone lessons (bible_book + teachers tag) — paginated ────
      const base = `${SUPABASE_URL_RUNTIME}/rest/v1/lessons?select=id,title,description,duration,audio_url,video_url,attachment_url,thumbnail_url,content_type,rabbi_id,series_id&bible_book=eq.${encodeURIComponent(book)}&audience_tags=cs.%7Bteachers%7D&status=eq.published&order=title`;
      const allLessonsRaw: any[] = [];
      const PAGE = 1000;
      for (let start = 0; ; start += PAGE) {
        const resp = await fetch(base, {
          headers: { ...headers, Range: `${start}-${start + PAGE - 1}` },
        });
        if (!resp.ok) break;
        const rows = await resp.json();
        allLessonsRaw.push(...rows);
        if (rows.length < PAGE) break;
      }

      // Enrich with rabbi names
      const lessonRabbiIds = [
        ...new Set(allLessonsRaw.filter((l) => l.rabbi_id).map((l) => l.rabbi_id as string)),
      ];
      let lessonRabbiMap = new Map<string, string>();
      if (lessonRabbiIds.length > 0) {
        const { data: lessonRabbis } = await supabase
          .from("rabbis")
          .select("id, name")
          .in("id", lessonRabbiIds);
        lessonRabbiMap = new Map((lessonRabbis || []).map((r) => [r.id, r.name]));
      }

      const lessons: TeacherBookLesson[] = allLessonsRaw.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        duration: l.duration,
        audioUrl: l.audio_url,
        videoUrl: l.video_url,
        attachmentUrl: l.attachment_url,
        thumbnailUrl: l.thumbnail_url,
        contentType: l.content_type,
        rabbiName: l.rabbi_id ? lessonRabbiMap.get(l.rabbi_id) || null : null,
        seriesId: l.series_id,
      }));

      return { series, lessons };
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    series: q.data?.series || [],
    lessons: q.data?.lessons || [],
    isLoading: q.isLoading,
    total: (q.data?.series.length || 0) + (q.data?.lessons.length || 0),
  };
}

// ── useTeacherContentTypeContent ──────────────────────────────────────────────
export interface TeacherContentTypeLesson {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  audioUrl: string | null;
  videoUrl: string | null;
  attachmentUrl: string | null;
  thumbnailUrl: string | null;
  rabbiName: string | null;
  seriesId: string | null;
  seriesTitle: string | null;
}

export interface TeacherContentTypeResult {
  lessons: TeacherContentTypeLesson[];
  isLoading: boolean;
}

export function useTeacherContentTypeContent(contentType: string): TeacherContentTypeResult {
  const q = useQuery({
    queryKey: ["teacher-content-type-v1", contentType],
    enabled: !!contentType,
    queryFn: async () => {
      const anonKey = getAnonKey();
      const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

      // Paginated fetch of teacher lessons by content_type
      const base = `${SUPABASE_URL_RUNTIME}/rest/v1/lessons?select=id,title,description,duration,audio_url,video_url,attachment_url,thumbnail_url,rabbi_id,series_id&content_type=eq.${encodeURIComponent(contentType)}&audience_tags=cs.%7Bteachers%7D&status=eq.published&order=title`;
      const allRaw: any[] = [];
      const PAGE = 1000;
      for (let start = 0; ; start += PAGE) {
        const resp = await fetch(base, {
          headers: { ...headers, Range: `${start}-${start + PAGE - 1}` },
        });
        if (!resp.ok) break;
        const rows = await resp.json();
        allRaw.push(...rows);
        if (rows.length < PAGE) break;
      }

      // Collect unique rabbi IDs + series IDs for enrichment
      const rabbiIds = [...new Set(allRaw.filter((l) => l.rabbi_id).map((l) => l.rabbi_id as string))];
      const seriesIds = [...new Set(allRaw.filter((l) => l.series_id).map((l) => l.series_id as string))];

      let rabbiMap = new Map<string, string>();
      let seriesMap = new Map<string, string>();

      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase.from("rabbis").select("id, name").in("id", rabbiIds);
        rabbiMap = new Map((rabbis || []).map((r) => [r.id, r.name]));
      }
      if (seriesIds.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < seriesIds.length; i += 400) chunks.push(seriesIds.slice(i, i + 400));
        for (const chunk of chunks) {
          const { data: ss } = await supabase.from("series").select("id, title").in("id", chunk);
          for (const s of ss || []) seriesMap.set(s.id, s.title);
        }
      }

      const lessons: TeacherContentTypeLesson[] = allRaw.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        duration: l.duration,
        audioUrl: l.audio_url,
        videoUrl: l.video_url,
        attachmentUrl: l.attachment_url,
        thumbnailUrl: l.thumbnail_url,
        rabbiName: l.rabbi_id ? rabbiMap.get(l.rabbi_id) || null : null,
        seriesId: l.series_id,
        seriesTitle: l.series_id ? seriesMap.get(l.series_id) || null : null,
      }));

      return lessons;
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    lessons: q.data || [],
    isLoading: q.isLoading,
  };
}

// ── useTeacherCreatorContent ──────────────────────────────────────────────────
export interface TeacherCreatorLesson {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  audioUrl: string | null;
  videoUrl: string | null;
  attachmentUrl: string | null;
  thumbnailUrl: string | null;
  seriesId: string | null;
  seriesTitle: string | null;
  contentType: string | null;
}

export interface TeacherCreatorMeta {
  id: string;
  name: string;
  bio: string | null;
}

export interface TeacherCreatorResult {
  rabbi: TeacherCreatorMeta | null;
  lessons: TeacherCreatorLesson[];
  isLoading: boolean;
}

export function useTeacherCreatorContent(rabbiId: string): TeacherCreatorResult {
  const q = useQuery({
    queryKey: ["teacher-creator-v1", rabbiId],
    enabled: !!rabbiId,
    queryFn: async () => {
      // Rabbi meta
      const { data: rabbiRaw } = await supabase
        .from("rabbis")
        .select("id, name, bio")
        .eq("id", rabbiId)
        .single();

      // Teacher lessons for this rabbi (paginated)
      const anonKey = getAnonKey();
      const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
      const base = `${SUPABASE_URL_RUNTIME}/rest/v1/lessons?select=id,title,description,duration,audio_url,video_url,attachment_url,thumbnail_url,series_id,content_type&rabbi_id=eq.${encodeURIComponent(rabbiId)}&audience_tags=cs.%7Bteachers%7D&status=eq.published&order=title`;
      const allRaw: any[] = [];
      const PAGE = 1000;
      for (let start = 0; ; start += PAGE) {
        const resp = await fetch(base, {
          headers: { ...headers, Range: `${start}-${start + PAGE - 1}` },
        });
        if (!resp.ok) break;
        const rows = await resp.json();
        allRaw.push(...rows);
        if (rows.length < PAGE) break;
      }

      // Enrich with series titles
      const seriesIds = [...new Set(allRaw.filter((l) => l.series_id).map((l) => l.series_id as string))];
      let seriesMap = new Map<string, string>();
      if (seriesIds.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < seriesIds.length; i += 400) chunks.push(seriesIds.slice(i, i + 400));
        for (const chunk of chunks) {
          const { data: ss } = await supabase.from("series").select("id, title").in("id", chunk);
          for (const s of ss || []) seriesMap.set(s.id, s.title);
        }
      }

      const lessons: TeacherCreatorLesson[] = allRaw.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        duration: l.duration,
        audioUrl: l.audio_url,
        videoUrl: l.video_url,
        attachmentUrl: l.attachment_url,
        thumbnailUrl: l.thumbnail_url,
        seriesId: l.series_id,
        seriesTitle: l.series_id ? seriesMap.get(l.series_id) || null : null,
        contentType: l.content_type,
      }));

      return {
        rabbi: rabbiRaw
          ? { id: rabbiRaw.id, name: rabbiRaw.name, bio: rabbiRaw.bio }
          : null,
        lessons,
      };
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    rabbi: q.data?.rabbi || null,
    lessons: q.data?.lessons || [],
    isLoading: q.isLoading,
  };
}
