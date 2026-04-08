import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

export function useLearningDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Last watched lesson (continue where you left off)
  const { data: lastWatched } = useQuery({
    queryKey: ["last-watched", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_history")
        .select("lesson_id, watched_at, progress_seconds, completed, lessons(id, title, duration, audio_url, video_url, thumbnail_url, source_type, series_id, rabbis(id, name), series(id, title))")
        .eq("user_id", user!.id)
        .eq("completed", false)
        .order("watched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ? { ...data, lesson: (data as any).lessons } : null;
    },
  });

  // Active enrollments
  const { data: enrollments } = useQuery({
    queryKey: ["active-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_enrollments")
        .select("*, series(id, title, image_url, lesson_count)")
        .eq("user_id", user!.id)
        .eq("completed", false)
        .order("enrolled_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  // Streak data - last 30 days of activity
  const { data: activityDays } = useQuery({
    queryKey: ["activity-days", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data } = await supabase
        .from("user_daily_activity")
        .select("activity_date, lessons_completed, minutes_learned")
        .eq("user_id", user!.id)
        .gte("activity_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("activity_date", { ascending: false });
      return data ?? [];
    },
  });

  // Calculate streak
  const streak = (() => {
    if (!activityDays || activityDays.length === 0) return 0;
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const dates = new Set(activityDays.map((d: any) => d.activity_date));
    
    // Start from today or yesterday
    if (!dates.has(today) && !dates.has(yesterday)) return 0;
    
    let count = 0;
    let checkDate = dates.has(today) ? new Date() : new Date(Date.now() - 86400000);
    
    while (dates.has(checkDate.toISOString().split("T")[0])) {
      count++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return count;
  })();

  // Record activity
  const recordActivity = useMutation({
    mutationFn: async ({ lessonsCompleted = 0, minutesLearned = 0 }: { lessonsCompleted?: number; minutesLearned?: number }) => {
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];
      
      // Try to get existing record
      const { data: existing } = await supabase
        .from("user_daily_activity")
        .select("id, lessons_completed, minutes_learned")
        .eq("user_id", user.id)
        .eq("activity_date", today)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_daily_activity")
          .update({
            lessons_completed: (existing.lessons_completed || 0) + lessonsCompleted,
            minutes_learned: (existing.minutes_learned || 0) + minutesLearned,
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("user_daily_activity")
          .insert({
            user_id: user.id,
            activity_date: today,
            lessons_completed: lessonsCompleted,
            minutes_learned: minutesLearned,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-days"] });
    },
  });

  return {
    lastWatched,
    enrollments,
    activityDays,
    streak,
    recordActivity,
    isLoggedIn: !!user,
  };
}
