import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── WeeklyCourse — full course record for weekly-program books ────────────

export interface WeeklyCourse {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  program_slug: string | null;
  access_type: string | null; // 'open' | 'requires_tag' | 'subscribers_only'
  access_tag: string | null;  // e.g. 'course:ezra' or 'program:weekly-chapter'
  in_weekly_program: boolean;
  sort_order: number | null;
  status: string;
  lesson_count: number | null;
  total_lessons: number | null;
  is_current: boolean | null; // admin-set: which book is being studied now
  // for payment:
  payment_product_id: string | null; // e.g. 'book-ezra'
}

export interface PaymentProduct {
  id: string;
  display_name: string;
  default_amount: number;
  active: boolean;
  type: string | null;
  target_table: string | null;
  description: string | null;
}

// useWeeklyBooks — all courses with in_weekly_program=true, sorted
export function useWeeklyBooks() {
  return useQuery({
    queryKey: ["weekly-books"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_courses")
        .select("*")
        .eq("in_weekly_program", true)
        // קורס בארכיון (מחיקה רכה מהאדמין) לא מופיע בניווט הספרים
        .neq("status", "archived")
        .order("sort_order", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as WeeklyCourse[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

// useCurrentWeeklyBook — the single book currently being taught (is_current=true).
// Used by the portal hero/banner AND by T08 (app-push) to identify the audience
// for "new content this week" notifications: subscribers with the
// 'program:weekly-chapter' access tag who are studying THIS book.
// Returns null if no book is flagged current.
export function useCurrentWeeklyBook() {
  return useQuery({
    queryKey: ["current-weekly-book"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_courses")
        .select("*")
        .eq("in_weekly_program", true)
        .eq("is_current", true)
        .maybeSingle();
      if (error) throw error;
      return data as WeeklyCourse | null;
    },
    staleTime: 1000 * 60 * 10,
  });
}

// useWeeklyBookBySlug — single book by program_slug (e.g. 'book-ezra')
export function useWeeklyBookBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["weekly-book-by-slug", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_courses")
        .select("*")
        .eq("program_slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data as WeeklyCourse | null;
    },
    staleTime: 1000 * 60 * 10,
  });
}

// usePaymentProduct — fetch payment product row by id (e.g. 'book-ezra')
export function usePaymentProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ["payment-product", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_products")
        .select("id, display_name, default_amount, active, type, target_table, description")
        .eq("id", productId!)
        .maybeSingle();
      if (error) throw error;
      return data as PaymentProduct | null;
    },
    staleTime: 1000 * 60 * 10,
  });
}

// useAllPaymentProducts — fetch all for catalog view
export function useAllPaymentProducts() {
  return useQuery({
    queryKey: ["all-payment-products"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_products")
        .select("id, display_name, default_amount, active, type, target_table, description");
      if (error) throw error;
      return (data ?? []) as PaymentProduct[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ── useCourseDataMultiBySlug — like useCourseDataMulti but accepts book slug
// Includes 'resources' layer for books like Daniel
export function useCourseDataWithResources(courseId: string | undefined) {
  return useQuery({
    queryKey: ["course-data-resources", courseId],
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

      const result: CourseDataWithResources = {
        intro: [],
        resources: [],
        chapters: new Map(),
        chapterNumbers: [],
        rawLessons: [],
      };

      for (const lesson of lessons) {
        const lt = lesson.layer_type?.toLowerCase();

        if (lt === "intro") { result.intro.push(lesson); continue; }
        if (lt === "resources") { result.resources.push(lesson); continue; }

        const ch = lesson.bible_chapter;
        if (!ch) continue;

        // rawLessons: all non-intro/resources lessons (used for HZM sub-book grouping)
        result.rawLessons.push(lesson);

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

export interface CourseDataWithResources {
  intro: CommunityLesson[];
  resources: CommunityLesson[];
  chapters: Map<number, ChapterLayersMulti>;
  chapterNumbers: number[];
  /** Raw lessons (all non-intro/resources), used by HZM sub-book grouping */
  rawLessons: CommunityLesson[];
}

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

// ── family_cards — כרטיסיות "תנ״ך למשפחה" (הערת סער, 11.7.2026) ───────────
// התוכן עבר מ-hardcoded בקוד (FamilyTanach.tsx + DesignPreviewHome.tsx) לטבלת
// family_cards ב-Supabase, כדי שאפשר יהיה לשלוט בו מהאדמין (/admin/content?tab=family).
// RLS: קריאה ציבורית לפעילים בלבד (is_active=true), כתיבה לאדמין בלבד (level14).

export interface FamilyCard {
  id: string;
  card_key: string;          // מזהה קבוע (parasha / chapter-weekly / ...)
  title: string;
  description: string | null;
  href: string;              // נתיב פנימי באתר
  image_url: string | null;
  badge: string | null;
  home_title: string | null;       // כותרת חלופית לסקשן דף-הבית (אם שונה)
  home_description: string | null; // תיאור חלופי לדף-הבית
  show_on_home: boolean;     // האם הכרטיס מופיע גם בסקשן "תנ״ך למשפחה" בדף הבית
  sort_order: number;
  is_active: boolean;
}

// כל הכרטיסיות הפעילות, לפי סדר — לעמוד /family-tanach.
// public_read ב-RLS כבר מסנן is_active=true; הסינון כאן הוא הגנה כפולה בלבד.
export function useFamilyCards() {
  return useQuery({
    queryKey: ["family-cards"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("family_cards")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FamilyCard[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ── isWeeklyChapterProgram — סינון-תצוגה נגד כפילות (הערת סער, 11.7.2026) ──
// "בקורסים, תכנית לחיות תנ״ך — היא תכנית הפרק השבועי. תוריד, זה כפילות."
// שורת התכנית ב-community_courses לא נמחקת (סוכן אחר עובד על הטבלה במקביל) —
// הכפילות נפתרת בקוד: CommunityPage מסתיר כל כרטיס שמייצג את התכנית עצמה
// ומציג במקומו כרטיס סטטי אחד שמוביל ל-/chapter-weekly.
export function isWeeklyChapterProgram(course: {
  program_slug?: string | null;
  title?: string | null;
}): boolean {
  if (course.program_slug === "weekly-chapter") return true;
  // תופס גם את "לחיות תנ״ך - תכנית המנויים" בכל וריאציית גרשיים
  const title = (course.title ?? "").replace(/["״׳']/g, "");
  return title.includes("לחיות תנך") || title.includes("הפרק השבועי");
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
