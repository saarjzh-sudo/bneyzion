import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ChapterCount {
  chapter: number;
  count: number;
}

export function useBibleBook(book: string | undefined) {
  return useQuery({
    queryKey: ["bible-book", book],
    queryFn: async () => {
      if (!book) return { chapters: [] as ChapterCount[], total: 0 };

      const { data, error } = await supabase
        .from("lessons")
        .select("bible_chapter")
        .eq("bible_book", book)
        .eq("status", "published")
        .not("bible_chapter", "is", null)
        .not("audience_tags", "cs", "{teachers}");

      if (error) throw error;

      // Aggregate by chapter
      const map = new Map<number, number>();
      for (const row of data || []) {
        if (row.bible_chapter) {
          map.set(row.bible_chapter, (map.get(row.bible_chapter) || 0) + 1);
        }
      }

      const chapters: ChapterCount[] = Array.from(map.entries())
        .map(([chapter, count]) => ({ chapter, count }))
        .sort((a, b) => a.chapter - b.chapter);

      return { chapters, total: data?.length || 0 };
    },
    enabled: !!book,
  });
}

export function useBibleChapterLessons(book: string | undefined, chapter: number | undefined) {
  return useQuery({
    queryKey: ["bible-chapter-lessons", book, chapter],
    queryFn: async () => {
      if (!book || !chapter) return [];

      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, description, duration, bible_verse, rabbi_id, series_id, audio_url, video_url, source_type, rabbis(id, name, title)")
        .eq("bible_book", book)
        .eq("bible_chapter", chapter)
        .eq("status", "published")
        .not("audience_tags", "cs", "{teachers}")
        .order("bible_verse", { ascending: true, nullsFirst: false })
        .order("title");

      if (error) throw error;
      return data || [];
    },
    enabled: !!book && !!chapter,
  });
}

/**
 * useBibleBookSeries — fetches event-series that are direct children of a
 * bible-book category node (e.g. "ספר יהושע" category → its parshiot/events).
 * Ordered by bible_chapter then title. Teacher-wing series are excluded.
 */
export function useBibleBookSeries(bookCategoryId: string | undefined) {
  return useQuery({
    queryKey: ["bible-book-series", bookCategoryId],
    queryFn: async () => {
      if (!bookCategoryId) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("series")
        .select("id, title, lesson_count, sort_order, image_url, status, rabbis(name)")
        .eq("parent_id", bookCategoryId)
        .in("status", ["active", "published"])
        .not("audience_tags", "cs", "{teachers}")
        .gt("lesson_count", 0)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("title") as { data: Array<{ id: string; title: string; lesson_count: number | null; sort_order: number | null; image_url: string | null; status: string; rabbis: { name: string } | { name: string }[] | null }> | null; error: unknown };
      if (error) throw error;
      return data || [];
    },
    enabled: !!bookCategoryId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * useBookCategoryId — resolves a book name (Hebrew) to its category node ID
 * in the series tree. Tries exact match first, then ilike fallback.
 */
export function useBookCategoryId(bookName: string | undefined) {
  return useQuery({
    queryKey: ["book-category-id", bookName],
    queryFn: async () => {
      if (!bookName) return null;
      const ROOT_IDS = [
        "bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b", // torah
        "a0472c9f-8212-44ff-8937-ace5fea4b4dc", // neviim
        "5cdd770c-9593-4b0d-9f9e-cda50cf5ef41", // ketuvim
      ];
      // Try exact match first
      const { data: exact } = await supabase
        .from("series")
        .select("id")
        .eq("title", bookName)
        .in("parent_id", ROOT_IDS)
        .in("status", ["active", "published", "category"])
        .maybeSingle();
      if (exact?.id) return exact.id;
      // Fallback: ilike (handles minor spacing/punctuation variants)
      const { data: fuzzy } = await supabase
        .from("series")
        .select("id")
        .ilike("title", bookName)
        .in("parent_id", ROOT_IDS)
        .in("status", ["active", "published", "category"])
        .maybeSingle();
      return fuzzy?.id ?? null;
    },
    enabled: !!bookName,
    staleTime: 1000 * 60 * 10,
  });
}

/** Get all unique bible books that have lessons */
export function useBibleBooks() {
  return useQuery({
    queryKey: ["bible-books-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("bible_book")
        .eq("status", "published")
        .not("bible_book", "is", null);

      if (error) throw error;

      const countMap = new Map<string, number>();
      for (const row of data || []) {
        if (row.bible_book) {
          countMap.set(row.bible_book, (countMap.get(row.bible_book) || 0) + 1);
        }
      }

      return Array.from(countMap.entries()).map(([name, count]) => ({ name, count }));
    },
  });
}
