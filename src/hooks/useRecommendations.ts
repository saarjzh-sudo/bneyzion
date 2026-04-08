import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useRecommendations(limit = 6) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recommendations", user?.id, limit],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // 1. Get user's watched rabbi IDs + topics from history
      const { data: history } = await supabase
        .from("user_history")
        .select("lesson_id, lessons(rabbi_id, series_id, bible_book)")
        .eq("user_id", user!.id)
        .order("watched_at", { ascending: false })
        .limit(50);

      // 2. Get favorite rabbis
      const { data: favRabbis } = await supabase
        .from("user_favorite_rabbis")
        .select("rabbi_id")
        .eq("user_id", user!.id);

      // Build signal sets
      const watchedLessonIds = new Set((history || []).map((h: any) => h.lesson_id));
      const rabbiCounts = new Map<string, number>();
      const seriesIds = new Set<string>();
      const bibleBooks = new Set<string>();

      for (const h of history || []) {
        const l = (h as any).lessons;
        if (!l) continue;
        if (l.rabbi_id) rabbiCounts.set(l.rabbi_id, (rabbiCounts.get(l.rabbi_id) || 0) + 1);
        if (l.series_id) seriesIds.add(l.series_id);
        if (l.bible_book) bibleBooks.add(l.bible_book);
      }

      // Add favorite rabbis with high weight
      for (const fr of favRabbis || []) {
        rabbiCounts.set(fr.rabbi_id, (rabbiCounts.get(fr.rabbi_id) || 0) + 5);
      }

      // Sort rabbis by weight
      const topRabbiIds = [...rabbiCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      if (topRabbiIds.length === 0 && seriesIds.size === 0) {
        // No signals — return popular lessons
        const { data } = await supabase
          .from("lessons")
          .select("id, title, duration, audio_url, video_url, thumbnail_url, source_type, views_count, rabbis(id, name, image_url), series(id, title)")
          .eq("status", "published")
          .order("views_count", { ascending: false })
          .limit(limit);
        return { lessons: data || [], source: "popular" as const };
      }

      // 3. Fetch candidate lessons from top rabbis / same series / same books
      const filters: string[] = [];
      if (topRabbiIds.length) filters.push(`rabbi_id.in.(${topRabbiIds.join(",")})`);
      if (seriesIds.size) filters.push(`series_id.in.(${[...seriesIds].join(",")})`);
      if (bibleBooks.size) filters.push(`bible_book.in.(${[...bibleBooks].join(",")})`);

      const { data: candidates } = await supabase
        .from("lessons")
        .select("id, title, duration, audio_url, video_url, thumbnail_url, source_type, views_count, rabbi_id, series_id, bible_book, rabbis(id, name, image_url), series(id, title)")
        .eq("status", "published")
        .or(filters.join(","))
        .limit(100);

      // 4. Score & rank (exclude already watched)
      const scored = (candidates || [])
        .filter((l: any) => !watchedLessonIds.has(l.id))
        .map((l: any) => {
          let score = 0;
          if (l.rabbi_id && rabbiCounts.has(l.rabbi_id)) score += rabbiCounts.get(l.rabbi_id)! * 2;
          if (l.series_id && seriesIds.has(l.series_id)) score += 3;
          if (l.bible_book && bibleBooks.has(l.bible_book)) score += 2;
          score += Math.min(l.views_count || 0, 100) / 100; // small popularity boost
          return { ...l, _score: score };
        })
        .sort((a: any, b: any) => b._score - a._score)
        .slice(0, limit);

      return { lessons: scored, source: "personalized" as const };
    },
  });
}
