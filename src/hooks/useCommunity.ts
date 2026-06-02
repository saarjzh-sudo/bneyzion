import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types for weekly-chapter data-driven page ──────────────────────────────

export interface CommunityLesson {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  lesson_number: number;
  video_url: string | null;
  audio_url: string | null;
  attachment_url: string | null;
  content_html: string | null;
  status: string;
  published_at: string | null;
  week_number: number | null;
  bible_book: string | null;
  bible_chapter: number | null;
  layer_type: string | null; // 'base' | 'enrichment' | 'weekly' | 'intro' | 'resources'
  summary_html: string | null;
  presentation_url: string | null;
  drive_folder_url: string | null;
  thumbnail_url: string | null;
  reading_chapter: number | null;
}

// ── Multi-item layer model (new: one row per file) ────────────────────────
// Each chapter/layer can have multiple lessons (e.g. base has ושננתם + audio + guidance_sheet).

export interface ChapterLayersMulti {
  chapter: number;
  topic: string | null;          // description from the first row of this chapter
  base: CommunityLesson[];
  enrichment: CommunityLesson[];
  weekly: CommunityLesson[];
}

export interface CourseDataMulti {
  intro: CommunityLesson[];       // intro-layer items (shown before chapter 1)
  chapters: Map<number, ChapterLayersMulti>;
  chapterNumbers: number[];
}

// ── Legacy single-item model (kept for backward compat) ──────────────────
export interface ChapterLayers {
  chapter: number;
  base: CommunityLesson | null;
  enrichment: CommunityLesson | null;
  weekly: CommunityLesson | null;
}

export interface CourseLayerMap {
  intro: CommunityLesson | null;
  resources: CommunityLesson | null;
  chapters: Map<number, ChapterLayers>;
  chapterNumbers: number[];
}

// ── useCourseByProgramSlug ─────────────────────────────────────────────────

export function useCourseByProgramSlug(programSlug: string | undefined) {
  return useQuery({
    queryKey: ["course-by-program-slug", programSlug],
    enabled: !!programSlug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_courses")
        .select("*")
        .eq("program_slug", programSlug!)
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, any> | null;
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ── useCourseDataMulti — NEW multi-item hook ───────────────────────────────
// Supports the new model where each layer has multiple items per chapter.

export function useCourseDataMulti(courseId: string | undefined) {
  return useQuery({
    queryKey: ["course-data-multi", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_course_lessons")
        .select("*")
        .eq("course_id", courseId!)
        .eq("status", "published")
        .order("bible_chapter", { ascending: true, nullsFirst: true })
        .order("lesson_number", { ascending: true });
      if (error) throw error;

      const lessons = (data ?? []) as CommunityLesson[];

      const result: CourseDataMulti = {
        intro: [],
        chapters: new Map(),
        chapterNumbers: [],
      };

      for (const lesson of lessons) {
        const lt = lesson.layer_type?.toLowerCase();

        if (lt === "intro") {
          result.intro.push(lesson);
          continue;
        }

        const ch = lesson.bible_chapter;
        if (!ch) continue;

        if (!result.chapters.has(ch)) {
          result.chapters.set(ch, {
            chapter: ch,
            topic: lesson.description ?? null,
            base: [],
            enrichment: [],
            weekly: [],
          });
        }
        const entry = result.chapters.get(ch)!;
        // Set topic from first row if not yet set
        if (!entry.topic && lesson.description) entry.topic = lesson.description;

        if (lt === "base") entry.base.push(lesson);
        else if (lt === "enrichment") entry.enrichment.push(lesson);
        else if (lt === "weekly") entry.weekly.push(lesson);
      }

      result.chapterNumbers = Array.from(result.chapters.keys()).sort((a, b) => a - b);

      return result;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ── useChapterLayerMap (legacy — keep for backward compat) ─────────────────

export function useChapterLayerMap(courseId: string | undefined) {
  return useQuery({
    queryKey: ["chapter-layer-map", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_course_lessons")
        .select("*")
        .eq("course_id", courseId!)
        .eq("status", "published")
        .order("lesson_number", { ascending: true });
      if (error) throw error;

      const lessons = (data ?? []) as CommunityLesson[];

      const result: CourseLayerMap = {
        intro: null,
        resources: null,
        chapters: new Map(),
        chapterNumbers: [],
      };

      for (const lesson of lessons) {
        const lt = lesson.layer_type?.toLowerCase();

        if (lt === "intro") {
          result.intro = lesson;
          continue;
        }
        if (lt === "resources") {
          result.resources = lesson;
          continue;
        }

        const ch = lesson.bible_chapter;
        if (!ch) continue;

        if (!result.chapters.has(ch)) {
          result.chapters.set(ch, { chapter: ch, base: null, enrichment: null, weekly: null });
        }
        const entry = result.chapters.get(ch)!;
        if (lt === "base") entry.base = lesson;
        else if (lt === "enrichment") entry.enrichment = lesson;
        else if (lt === "weekly") entry.weekly = lesson;
      }

      result.chapterNumbers = Array.from(result.chapters.keys()).sort((a, b) => a - b);

      return result;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCommunityCoruses() {
  return useQuery({
    queryKey: ["community-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_courses")
        .select("*")
        .eq("status", "active")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCourseLessons(courseId: string | undefined) {
  return useQuery({
    queryKey: ["community-course-lessons", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_course_lessons")
        .select("*")
        .eq("course_id", courseId!)
        .eq("status", "published")
        .order("lesson_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useBibleChapter(book: string | undefined, chapter: number | undefined) {
  return useQuery({
    queryKey: ["bible-verses", book, chapter],
    enabled: !!book && !!chapter,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bible_verses")
        .select("verse, text_he")
        .eq("book", book!)
        .eq("chapter", chapter!)
        .order("verse", { ascending: true });
      if (error) throw error;
      return data as Array<{ verse: number; text_he: string }>;
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useMemberAccess(userEmail: string | undefined) {
  return useQuery({
    queryKey: ["member-access", userEmail],
    enabled: !!userEmail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("*, community_member_courses(course_id)")
        .eq("email", userEmail!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
