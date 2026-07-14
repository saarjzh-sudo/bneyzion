/**
 * useCourseProgress — מעקב התקדמות אישי בקורס (רמה 18, יואב 14.7).
 *
 * "מה מהם הוא למד, מה מהם השלים, מסמן כזה" — לכל לומד מחובר נשמרת שורה
 * לכל פריט-תוכן שסומן כנלמד (course_lesson_progress, RLS per-user).
 * אורח (לא מחובר) מקבל Set ריק וכפתורי הסימון מוסתרים.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCourseProgress(courseId: string | undefined) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["course-progress", courseId, user?.id],
    enabled: !!courseId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_lesson_progress")
        .select("lesson_id")
        .eq("course_id", courseId)
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set<string>((data ?? []).map((r: any) => String(r.lesson_id)));
    },
  });
  return {
    completedIds: query.data ?? new Set<string>(),
    isLoading: query.isLoading,
    canTrack: !!user?.id,
  };
}

export function useToggleLessonComplete(courseId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, completed }: { lessonId: string; completed: boolean }) => {
      if (!user?.id || !courseId) throw new Error("צריך להתחבר כדי לסמן התקדמות");
      if (completed) {
        const { error } = await (supabase as any)
          .from("course_lesson_progress")
          .upsert(
            { user_id: user.id, course_id: courseId, lesson_id: lessonId },
            { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
          );
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("course_lesson_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-progress", courseId] }),
  });
}
