/**
 * useWeeklyProgramChapters — real per-book chapter data for the weekly program.
 *
 * ── מקור האמת לפרק הנוכחי הנלמד (level 15, 11.7.2026) ─────────────────────
 * "איפה התוכנית נמצאת השבוע" נקבע דטרמיניסטית, לא תלוי-משתמש:
 *
 *   1. הספר הנוכחי  = community_courses.is_current = true (דגל אדמין יחיד
 *      בין ספרי in_weekly_program; ורופא ב-DB — בדיוק שורה אחת true).
 *   2. הפרק הנוכחי  = ה-bible_chapter הגבוה ביותר בספר שיש לו שיעור
 *      layer_type='weekly' בסטטוס published — כלומר הקלטת השיעור החי
 *      האחרונה שהועלתה. זה אותו תוכן שנשלח לקבוצות הוואטסאפ של התוכנית
 *      אחרי כל מפגש זום (רביעי 21:00), ולכן זה הסיגנל האמין ביותר.
 *
 * למה לא שדות אחרים:
 *   - published_at: המיגרציה קבעה לכל השורות אותו timestamp — לא שמיש למיון.
 *   - week_number: null בכל השורות.
 *   - user_history: עוקב אחרי טבלת `lessons` של האתר הראשי (FK), לא אחרי
 *     community_course_lessons — אין התקדמות-משתמש לתוכנית השבועית כיום.
 *     ?chapter=N ב-URL הוא ה-override המפורש של המשתמש.
 *
 * הקומפוננטות (WeeklyBookDetail auto-jump, GlobalWeeklyNav highlight,
 * WeeklyScheduleCard status) נגזרות כולן מהמנגנון הזה.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BookChapters {
  /** Real bible_chapter numbers that have published content (sorted asc). */
  chapters: number[];
  /** Chapters that already have a published 'weekly' layer = taught live. */
  taught: Set<number>;
}

export type WeeklyChaptersMap = Map<string, BookChapters>;

/**
 * One query for the whole program: every published lesson's
 * (course_id, bible_chapter, layer_type) → Map<course_id, BookChapters>.
 * Replaces the old 1..total_lessons proxy that showed wrong chapter lists
 * (e.g. נחמיה learns chapters 1,2,3,8,9,10,11,13 — not א׳-ח׳).
 */
export function useWeeklyProgramChapters(courseIds: string[]) {
  const key = [...courseIds].sort().join(",");
  return useQuery({
    queryKey: ["weekly-program-chapters", key],
    enabled: courseIds.length > 0,
    queryFn: async (): Promise<WeeklyChaptersMap> => {
      const { data, error } = await (supabase as any)
        .from("community_course_lessons")
        .select("course_id, bible_chapter, layer_type")
        .in("course_id", courseIds)
        .eq("status", "published")
        .not("bible_chapter", "is", null);
      if (error) throw error;

      const map: WeeklyChaptersMap = new Map();
      for (const row of (data ?? []) as Array<{ course_id: string; bible_chapter: number; layer_type: string | null }>) {
        if (!map.has(row.course_id)) map.set(row.course_id, { chapters: [], taught: new Set() });
        const entry = map.get(row.course_id)!;
        if (!entry.chapters.includes(row.bible_chapter)) entry.chapters.push(row.bible_chapter);
        if (row.layer_type?.toLowerCase() === "weekly") entry.taught.add(row.bible_chapter);
      }
      for (const entry of map.values()) entry.chapters.sort((a, b) => a - b);
      return map;
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * The deterministic "current chapter" of a book (see doc-comment above):
 * highest taught chapter; falls back to highest chapter with any content.
 * Returns null when the book has no chapter content yet.
 */
export function currentChapterOf(book: BookChapters | undefined): number | null {
  if (!book || book.chapters.length === 0) return null;
  const taught = book.chapters.filter((ch) => book.taught.has(ch));
  if (taught.length > 0) return taught[taught.length - 1];
  return null;
}
