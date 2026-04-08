import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useAwardPoints } from "@/hooks/usePoints";

export function useFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("id, created_at, lesson_id, lessons(id, title, duration, audio_url, video_url, rabbis(id, name))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((f: any) => ({ ...f, lesson: f.lessons }));
    },
  });
}

export function useAddFavorite() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const awardPoints = useAwardPoints();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase
        .from("user_favorites")
        .insert({ user_id: user.id, lesson_id: lessonId });
      if (error) throw error;
    },
    onSuccess: (_data, lessonId) => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      awardPoints.mutate({ action: "favorite", referenceId: lessonId });
      toast.success("השיעור נוסף למועדפים");
    },
    onError: () => toast.error("שגיאה בשמירת השיעור"),
  });
}

export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (favoriteId: string) => {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("id", favoriteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      toast.success("השיעור הוסר מהמועדפים");
    },
    onError: () => toast.error("שגיאה בהסרת השיעור"),
  });
}

export function useIsFavorite(lessonId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-favorite", user?.id, lessonId],
    enabled: !!user && !!lessonId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_favorites")
        .select("id")
        .eq("user_id", user!.id)
        .eq("lesson_id", lessonId!)
        .maybeSingle();
      return data;
    },
  });
}
