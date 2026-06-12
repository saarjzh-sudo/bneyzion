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
  content: string | null;
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
      // content is included so TeacherLessonModal can render the full text without a second fetch
      const base = `${SUPABASE_URL_RUNTIME}/rest/v1/lessons?select=id,title,description,content,duration,audio_url,video_url,attachment_url,thumbnail_url,rabbi_id,series_id&content_type=eq.${encodeURIComponent(contentType)}&audience_tags=cs.%7Bteachers%7D&status=eq.published&order=title`;
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
        content: l.content ?? null,
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
  content: string | null;
  duration: number | null;
  audioUrl: string | null;
  videoUrl: string | null;
  attachmentUrl: string | null;
  thumbnailUrl: string | null;
  seriesId: string | null;
  seriesTitle: string | null;
  seriesImageUrl: string | null;
  contentType: string | null;
}

export interface TeacherCreatorSeries {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  lessonCount: number;
}

export interface TeacherCreatorMeta {
  id: string;
  name: string;
  bio: string | null;
}

export interface TeacherCreatorResult {
  rabbi: TeacherCreatorMeta | null;
  /** Flat list ordered by rabbi_page_items.sort_order (when rpi rows exist).
   *  When no rpi rows → fallback: all teacher-tagged lessons for this rabbi, order=title. */
  items: Array<
    | { type: "series"; series: TeacherCreatorSeries; sortOrder: number }
    | { type: "lesson"; lesson: TeacherCreatorLesson; sortOrder: number }
  >;
  /** True when rpi rows drove the list; false when fallback was used */
  isRpiDriven: boolean;
  isLoading: boolean;
  // Legacy flat-lesson list for backward-compat consumers that haven't migrated yet
  lessons: TeacherCreatorLesson[];
}

export function useTeacherCreatorContent(rabbiId: string): TeacherCreatorResult {
  const q = useQuery({
    queryKey: ["teacher-creator-v2", rabbiId],
    enabled: !!rabbiId,
    queryFn: async () => {
      // ── 1. Rabbi meta ────────────────────────────────────────────────────────
      const { data: rabbiRaw } = await supabase
        .from("rabbis")
        .select("id, name, bio")
        .eq("id", rabbiId)
        .single();

      // ── 2. rabbi_page_items — curated order (CODE-SPEC §11 CA7) ─────────────
      // Embed series.image_url + lesson content in one pass; gracefully tolerate
      // the 42P01 error if the table somehow vanishes.
      const { data: rpiRaw, error: rpiErr } = await (supabase as any)
        .from("rabbi_page_items")
        .select([
          "id",
          "kind",
          "sort_order",
          "series_id",
          "lesson_id",
          "series(id,title,description,image_url,lesson_count)",
          "lessons(id,title,description,content,duration,audio_url,video_url,attachment_url,thumbnail_url,series_id,content_type)",
        ].join(","))
        .eq("rabbi_id", rabbiId)
        .lt("sort_order", 9000) // 9000+ = parked rows (old-page extras kept for audit, not rendered)
        .order("sort_order", { ascending: true });

      if (!rpiErr && rpiRaw && (rpiRaw as any[]).length > 0) {
        // RPI-DRIVEN PATH
        const rows = rpiRaw as any[];

        // Collect series_ids from lesson rows so we can fetch seriesTitle for them
        const lessonSeriesIds = [
          ...new Set(
            rows
              .filter((r) => r.kind === "lesson" && r.lessons?.series_id)
              .map((r) => r.lessons.series_id as string)
          ),
        ];
        let seriesMap = new Map<string, { title: string; imageUrl: string | null }>();
        if (lessonSeriesIds.length > 0) {
          const { data: ss } = await supabase
            .from("series")
            .select("id, title, image_url")
            .in("id", lessonSeriesIds);
          for (const s of ss || []) seriesMap.set(s.id, { title: s.title, imageUrl: (s as any).image_url ?? null });
        }

        const items: TeacherCreatorResult["items"] = [];
        const lessons: TeacherCreatorLesson[] = [];

        for (const r of rows) {
          if (r.kind === "series" && r.series) {
            const s = r.series;
            items.push({
              type: "series",
              sortOrder: r.sort_order,
              series: {
                id: s.id,
                title: s.title,
                description: s.description ?? null,
                imageUrl: (s as any).image_url ?? null,
                lessonCount: s.lesson_count ?? 0,
              },
            });
          } else if (r.kind === "lesson" && r.lessons) {
            const l = r.lessons;
            const seriesInfo = l.series_id ? seriesMap.get(l.series_id) : undefined;
            const lesson: TeacherCreatorLesson = {
              id: l.id,
              title: l.title,
              description: l.description ?? null,
              content: l.content ?? null,
              duration: l.duration ?? null,
              audioUrl: l.audio_url ?? null,
              videoUrl: l.video_url ?? null,
              attachmentUrl: l.attachment_url ?? null,
              thumbnailUrl: l.thumbnail_url ?? null,
              seriesId: l.series_id ?? null,
              seriesTitle: seriesInfo?.title ?? null,
              seriesImageUrl: seriesInfo?.imageUrl ?? null,
              contentType: l.content_type ?? null,
            };
            items.push({ type: "lesson", sortOrder: r.sort_order, lesson });
            lessons.push(lesson);
          }
        }

        return {
          rabbi: rabbiRaw ? { id: rabbiRaw.id, name: rabbiRaw.name, bio: rabbiRaw.bio } : null,
          items,
          isRpiDriven: true,
          lessons,
        };
      }

      // ── 3. FALLBACK: no rpi rows → fetch teacher-tagged lessons for this rabbi ─
      // Only הרב יהודה בשושה hits this path (old CMS bug — empty page on old site).
      // Per CODE-SPEC CA7 policy: render his actual teacher-tagged content as sane default.
      const anonKey = getAnonKey();
      const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
      const base = `${SUPABASE_URL_RUNTIME}/rest/v1/lessons?select=id,title,description,content,duration,audio_url,video_url,attachment_url,thumbnail_url,series_id,content_type&rabbi_id=eq.${encodeURIComponent(rabbiId)}&audience_tags=cs.%7Bteachers%7D&status=eq.published&order=title`;
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

      const seriesIds = [...new Set(allRaw.filter((l) => l.series_id).map((l) => l.series_id as string))];
      let seriesMapFallback = new Map<string, { title: string; imageUrl: string | null }>();
      if (seriesIds.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < seriesIds.length; i += 400) chunks.push(seriesIds.slice(i, i + 400));
        for (const chunk of chunks) {
          const { data: ss } = await supabase.from("series").select("id, title, image_url").in("id", chunk);
          for (const s of ss || []) seriesMapFallback.set(s.id, { title: s.title, imageUrl: (s as any).image_url ?? null });
        }
      }

      const lessons: TeacherCreatorLesson[] = allRaw.map((l, idx) => ({
        id: l.id,
        title: l.title,
        description: l.description ?? null,
        content: l.content ?? null,
        duration: l.duration ?? null,
        audioUrl: l.audio_url ?? null,
        videoUrl: l.video_url ?? null,
        attachmentUrl: l.attachment_url ?? null,
        thumbnailUrl: l.thumbnail_url ?? null,
        seriesId: l.series_id ?? null,
        seriesTitle: l.series_id ? seriesMapFallback.get(l.series_id)?.title ?? null : null,
        seriesImageUrl: l.series_id ? seriesMapFallback.get(l.series_id)?.imageUrl ?? null : null,
        contentType: l.content_type ?? null,
      }));

      return {
        rabbi: rabbiRaw ? { id: rabbiRaw.id, name: rabbiRaw.name, bio: rabbiRaw.bio } : null,
        items: lessons.map((lesson, idx) => ({ type: "lesson" as const, sortOrder: idx, lesson })),
        isRpiDriven: false,
        lessons,
      };
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    rabbi: q.data?.rabbi || null,
    items: q.data?.items || [],
    isRpiDriven: q.data?.isRpiDriven ?? false,
    lessons: q.data?.lessons || [],
    isLoading: q.isLoading,
  };
}

// ── useTeacherListingItems ────────────────────────────────────────────────────
/**
 * Reads teacher_listing_items for a given scope+key, ordered by sort_order.
 * Drives /teachers/content-type/:type (CODE-SPEC §11 CA3/CA4).
 *
 * Each row has kind='series'|'lesson', series_id, lesson_id, sort_order.
 * We embed series and lesson data in a single RPC-free join via supabase-js.
 */

export interface TeacherListingSeriesRow {
  type: "series";
  sortOrder: number;
  series: {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    lessonCount: number;
  };
}

export interface TeacherListingLessonRow {
  type: "lesson";
  sortOrder: number;
  lesson: TeacherContentTypeLesson;
}

export type TeacherListingItem = TeacherListingSeriesRow | TeacherListingLessonRow;

export interface TeacherListingResult {
  items: TeacherListingItem[];
  /** Flat lesson list for filter-count computation */
  lessons: TeacherContentTypeLesson[];
  isLoading: boolean;
}

export function useTeacherListingItems(contentType: string): TeacherListingResult {
  const q = useQuery({
    queryKey: ["teacher-listing-items-v1", contentType],
    enabled: !!contentType,
    queryFn: async () => {
      // Fetch teacher_listing_items for this content_type key, ordered by sort_order.
      // Embed series + lesson data (supabase PostgREST foreign-key embed).
      const { data: rows, error } = await (supabase as any)
        .from("teacher_listing_items")
        .select([
          "id",
          "kind",
          "sort_order",
          "series_id",
          "lesson_id",
          "series(id,title,description,image_url,lesson_count)",
          "lessons(id,title,description,content,duration,audio_url,video_url,attachment_url,thumbnail_url,rabbi_id,series_id)",
        ].join(","))
        .eq("scope", "content_type")
        .eq("key", contentType)
        .order("sort_order", { ascending: true });

      if (error) {
        // Table missing or query error → fallback to old content-type hook output
        console.warn("teacher_listing_items query error:", error.message);
        return { items: [], lessons: [] };
      }

      const rowArr = (rows ?? []) as any[];

      // Collect unique rabbi_ids from lesson rows for name enrichment
      const rabbiIds = [
        ...new Set(
          rowArr
            .filter((r) => r.kind === "lesson" && r.lessons?.rabbi_id)
            .map((r) => r.lessons.rabbi_id as string)
        ),
      ];
      let rabbiMap = new Map<string, string>();
      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase.from("rabbis").select("id, name").in("id", rabbiIds);
        rabbiMap = new Map((rabbis || []).map((r) => [r.id, r.name]));
      }

      // Collect unique series_ids from lesson rows (to get seriesTitle for modal)
      const lessonSeriesIds = [
        ...new Set(
          rowArr
            .filter((r) => r.kind === "lesson" && r.lessons?.series_id)
            .map((r) => r.lessons.series_id as string)
        ),
      ];
      let seriesMap = new Map<string, string>();
      if (lessonSeriesIds.length > 0) {
        const { data: ss } = await supabase.from("series").select("id, title").in("id", lessonSeriesIds);
        for (const s of ss || []) seriesMap.set(s.id, s.title);
      }

      const items: TeacherListingItem[] = [];
      const lessons: TeacherContentTypeLesson[] = [];

      for (const r of rowArr) {
        if (r.kind === "series" && r.series) {
          const s = r.series;
          items.push({
            type: "series",
            sortOrder: r.sort_order,
            series: {
              id: s.id,
              title: s.title,
              description: s.description ?? null,
              imageUrl: (s as any).image_url ?? null,
              lessonCount: s.lesson_count ?? 0,
            },
          });
        } else if (r.kind === "lesson" && r.lessons) {
          const l = r.lessons;
          const lesson: TeacherContentTypeLesson = {
            id: l.id,
            title: l.title,
            description: l.description ?? null,
            content: l.content ?? null,
            duration: l.duration ?? null,
            audioUrl: l.audio_url ?? null,
            videoUrl: l.video_url ?? null,
            attachmentUrl: l.attachment_url ?? null,
            thumbnailUrl: l.thumbnail_url ?? null,
            rabbiName: l.rabbi_id ? rabbiMap.get(l.rabbi_id) || null : null,
            seriesId: l.series_id ?? null,
            seriesTitle: l.series_id ? seriesMap.get(l.series_id) || null : null,
          };
          items.push({ type: "lesson", sortOrder: r.sort_order, lesson });
          lessons.push(lesson);
        }
      }

      return { items, lessons };
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    items: q.data?.items || [],
    lessons: q.data?.lessons || [],
    isLoading: q.isLoading,
  };
}
