import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const LS_KEY = "bneyzion_last_lesson";

export interface LastLessonData {
  lessonId: string;
  title: string;
  rabbiName: string | null;
  progressSeconds: number | null;
  duration: number | null;
  timestamp: number;
}

function getLocalLastLesson(): LastLessonData | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastLessonData;
  } catch {
    return null;
  }
}

export function saveLocalLastLesson(data: LastLessonData) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable
  }
}

export function useLastLesson() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["last-lesson", user?.id ?? "anon"],
    queryFn: async (): Promise<LastLessonData | null> => {
      if (user) {
        const { data, error } = await supabase
          .from("user_history")
          .select("lesson_id, progress_seconds, watched_at, lessons(title, duration, rabbis(name, title))")
          .eq("user_id", user.id)
          .order("watched_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data) return null;

        const lesson = data.lessons as any;
        if (!lesson) return null;

        const rabbi = lesson.rabbis as { name: string; title: string | null } | null;
        const rabbiName = rabbi ? (rabbi.title ? `${rabbi.title} ${rabbi.name}` : rabbi.name) : null;

        return {
          lessonId: data.lesson_id,
          title: lesson.title,
          rabbiName,
          progressSeconds: data.progress_seconds,
          duration: lesson.duration,
          timestamp: new Date(data.watched_at).getTime(),
        };
      }

      // Not authenticated — use localStorage
      return getLocalLastLesson();
    },
    staleTime: 30_000,
  });

  return { lastLesson: query.data ?? null, isLoading: query.isLoading };
}
