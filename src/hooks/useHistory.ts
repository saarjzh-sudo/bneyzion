import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_history")
        .select("id, watched_at, completed, progress_seconds, lesson_id, lessons(id, title, duration, audio_url, video_url, rabbis(id, name))")
        .eq("user_id", user!.id)
        .order("watched_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []).map((h: any) => ({ ...h, lesson: h.lessons }));
    },
  });
}
