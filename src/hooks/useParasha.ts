import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentParasha, getParashaSeriesTitle, getParashaChumash, PARASHA_ARTICLE_SERIES } from "@/lib/parashaCalendar";

const RIDDLES_SERIES_ID = "c852edd8-d959-4c8d-bf7e-17b5881275fa";

export interface ParashaLesson {
  id: string;
  title: string;
  description: string | null;
  source_type: string;
  audio_url: string | null;
  video_url: string | null;
  content: string | null;
  duration: number | null;
  rabbi_name: string | null;
  series_title: string | null;
}

export interface ParashaArticleSeries {
  title: string;
  rabbi: string;
  seriesId: string | null;
  lessonId: string | null;
  lessonTitle: string | null;
  lessonContent: string | null;
}

export function useParasha() {
  const parasha = getCurrentParasha();
  const seriesTitle = getParashaSeriesTitle(parasha);
  const chumash = getParashaChumash(parasha);

  // Get the parasha series and its lessons
  const parashaLessonsQuery = useQuery({
    queryKey: ["parasha-lessons", seriesTitle],
    queryFn: async () => {
      if (!seriesTitle) return [];
      
      // Find the series
      const { data: series } = await supabase
        .from("series")
        .select("id")
        .eq("title", seriesTitle)
        .single();

      if (!series) return [];

      // Get lessons from this series
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, title, description, source_type, audio_url, video_url, content, duration, rabbi_id")
        .eq("series_id", series.id)
        .eq("status", "published")
        .order("title");

      if (!lessons || lessons.length === 0) return [];

      // Get rabbi names
      const rabbiIds = [...new Set(lessons.filter(l => l.rabbi_id).map(l => l.rabbi_id!))];
      const { data: rabbis } = await supabase
        .from("rabbis")
        .select("id, name")
        .in("id", rabbiIds.length > 0 ? rabbiIds : ["00000000-0000-0000-0000-000000000000"]);

      const rabbiMap = new Map(rabbis?.map(r => [r.id, r.name]) || []);

      return lessons.map(l => ({
        ...l,
        rabbi_name: l.rabbi_id ? rabbiMap.get(l.rabbi_id) || null : null,
        series_title: seriesTitle,
      })) as ParashaLesson[];
    },
  });

  // Get audio lessons (Torah reading)
  const audioLessonsQuery = useQuery({
    queryKey: ["parasha-audio", parasha, chumash],
    queryFn: async () => {
      if (!chumash) return [];

      // Find Torah reading series under this chumash
      const { data: chumashSeries } = await supabase
        .from("series")
        .select("id, title")
        .eq("title", chumash);

      if (!chumashSeries || chumashSeries.length === 0) return [];

      // Find audio series (קריאה בטעמים, קריאה עם ביאור)
      const chumashId = chumashSeries[0].id;
      const { data: audioSeries } = await supabase
        .from("series")
        .select("id, title")
        .eq("parent_id", chumashId)
        .or("title.ilike.%קריאה בטעמים%,title.ilike.%קריאה עם ביאור%");

      if (!audioSeries || audioSeries.length === 0) return [];

      // Find lessons with parasha name
      const seriesIds = audioSeries.map(s => s.id);
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, title, description, source_type, audio_url, video_url, content, duration, rabbi_id")
        .in("series_id", seriesIds)
        .eq("status", "published")
        .ilike("title", `%${parasha}%`);

      if (!lessons) return [];

      const rabbiIds = [...new Set(lessons.filter(l => l.rabbi_id).map(l => l.rabbi_id!))];
      const { data: rabbis } = await supabase
        .from("rabbis")
        .select("id, name")
        .in("id", rabbiIds.length > 0 ? rabbiIds : ["00000000-0000-0000-0000-000000000000"]);

      const rabbiMap = new Map(rabbis?.map(r => [r.id, r.name]) || []);

      return lessons.map(l => ({
        ...l,
        rabbi_name: l.rabbi_id ? rabbiMap.get(l.rabbi_id) || null : null,
        series_title: null,
      })) as ParashaLesson[];
    },
  });

  // Get article series and find matching lessons
  const articleSeriesQuery = useQuery({
    queryKey: ["parasha-article-series", parasha],
    queryFn: async () => {
      const results: ParashaArticleSeries[] = [];
      
      for (const articleSeries of PARASHA_ARTICLE_SERIES) {
        // Find the series by exact title
        const { data: series } = await supabase
          .from("series")
          .select("id")
          .eq("title", articleSeries.seriesTitle)
          .eq("status", "active")
          .maybeSingle();

        let lessonId: string | null = null;
        let lessonTitle: string | null = null;
        let lessonContent: string | null = null;

        if (series) {
          const { data: lessons } = await supabase
            .from("lessons")
            .select("id, title, content")
            .eq("series_id", series.id)
            .eq("status", "published")
            .ilike("title", `%${parasha}%`)
            .limit(1);
          const lesson = lessons?.[0] || null;
          
          if (lesson) {
            lessonId = lesson.id;
            lessonTitle = lesson.title;
            lessonContent = lesson.content;
          }
        }

        results.push({
          title: articleSeries.title,
          rabbi: articleSeries.rabbi,
          seriesId: series?.id || null,
          lessonId,
          lessonTitle,
          lessonContent,
        });
      }

      return results;
    },
  });

  // Get riddle for current parasha
  const riddleQuery = useQuery({
    queryKey: ["parasha-riddle", parasha],
    queryFn: async () => {
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, title, content, description")
        .eq("series_id", RIDDLES_SERIES_ID)
        .eq("status", "published")
        .ilike("title", `%${parasha}%`)
        .limit(1);

      return lessons?.[0] || null;
    },
  });

  // Get the series ID for the current parasha (for the "כל תכני הפרשה" CTA)
  const parashaSeriesIdQuery = useQuery({
    queryKey: ["parasha-series-id", seriesTitle],
    queryFn: async () => {
      if (!seriesTitle) return null;
      const { data: series } = await supabase
        .from("series")
        .select("id")
        .eq("title", seriesTitle)
        .maybeSingle();
      return series?.id || null;
    },
  });

  return {
    parasha,
    chumash,
    seriesTitle,
    parashaSeriesId: parashaSeriesIdQuery.data || null,
    lessons: parashaLessonsQuery.data || [],
    audioLessons: audioLessonsQuery.data || [],
    articleSeries: articleSeriesQuery.data || PARASHA_ARTICLE_SERIES.map(s => ({ title: s.title, rabbi: s.rabbi, seriesId: null, lessonId: null, lessonTitle: null, lessonContent: null })),
    riddle: riddleQuery.data || null,
    isLoading: parashaLessonsQuery.isLoading || audioLessonsQuery.isLoading || articleSeriesQuery.isLoading,
  };
}
