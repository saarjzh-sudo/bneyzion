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

      // Upsert total
      const { data: existing } = await supabase
        .from("user_points" as any)
        .select("id, total_points, lifetime_points")
        .eq("user_id", user.id)
        .maybeSingle();

      if ((existing as any)?.id) {
        await supabase
          .from("user_points" as any)
          .update({
            total_points: ((existing as any).total_points || 0) + pts,
            lifetime_points: ((existing as any).lifetime_points || 0) + pts,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", (existing as any).id);
      } else {
        await supabase.from("user_points" as any).insert({
          user_id: user.id,
          total_points: pts,
          lifetime_points: pts,
        } as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-points"] });
      qc.invalidateQueries({ queryKey: ["user-points-log"] });
    },
  });
}
