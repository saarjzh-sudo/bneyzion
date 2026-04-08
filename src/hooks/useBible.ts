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
        .not("bible_chapter", "is", null);

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
        .order("bible_verse", { ascending: true, nullsFirst: false })
        .order("title");

      if (error) throw error;
      return data || [];
    },
    enabled: !!book && !!chapter,
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
