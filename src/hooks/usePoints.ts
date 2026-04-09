import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const POINT_VALUES = {
  course_complete: 100,
  comment: 5,
  favorite: 5,
  lesson_view: 10,
  streak_bonus: 5,
} as const;

export type PointAction = keyof typeof POINT_VALUES;

export function usePoints() {
  const { user } = useAuth();

  const { data: points, isLoading } = useQuery({
    queryKey: ["user-points", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_points" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? { total_points: 0, lifetime_points: 0 };
    },
  });

  return { points, isLoading, isLoggedIn: !!user };
}

export function usePointsLog() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-points-log", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_points_log" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
}

export function useAwardPoints() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, referenceId }: { action: PointAction; referenceId?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const pts = POINT_VALUES[action];

      // Log the points event
      await supabase.from("user_points_log" as any).insert({
        user_id: user.id,
        points: pts,
        action,
        reference_id: referenceId,
      } as any);

      // Atomic upsert — avoids race condition on concurrent awards
      const { data: existing } = await supabase
        .from("user_points" as any)
        .select("total_points, lifetime_points")
        .eq("user_id", user.id)
        .maybeSingle();

      const prev = existing as { total_points?: number; lifetime_points?: number } | null;
      await supabase.from("user_points" as any).upsert({
        user_id: user.id,
        total_points: (prev?.total_points || 0) + pts,
        lifetime_points: (prev?.lifetime_points || 0) + pts,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "user_id" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-points"] });
      qc.invalidateQueries({ queryKey: ["user-points-log"] });
    },
  });
}
