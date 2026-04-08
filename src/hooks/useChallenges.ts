import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useWeeklyChallenges() {
  return useQuery({
    queryKey: ["weekly-challenges"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("weekly_challenges" as any)
        .select("*")
        .eq("active", true)
        .lte("week_start", today)
        .gte("week_end", today)
        .order("created_at");
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
}

export function useChallengeProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["challenge-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_challenge_progress" as any)
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
}

export function useUpdateChallengeProgress() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeId, increment = 1 }: { challengeId: string; increment?: number }) => {
      if (!user) return;

      const { data: existing } = await supabase
        .from("user_challenge_progress" as any)
        .select("id, current_count, completed")
        .eq("user_id", user.id)
        .eq("challenge_id", challengeId)
        .maybeSingle();

      if ((existing as any)?.completed) return;

      if ((existing as any)?.id) {
        await supabase
          .from("user_challenge_progress" as any)
          .update({
            current_count: ((existing as any).current_count || 0) + increment,
          } as any)
          .eq("id", (existing as any).id);
      } else {
        await supabase.from("user_challenge_progress" as any).insert({
          user_id: user.id,
          challenge_id: challengeId,
          current_count: increment,
        } as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenge-progress"] });
    },
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["weekly-leaderboard"],
    queryFn: async () => {
      // Use RPC or direct query on the view
      const { data, error } = await supabase
        .from("user_points" as any)
        .select("user_id, total_points, lifetime_points")
        .order("total_points", { ascending: false })
        .limit(10);
      if (error) throw error;
      
      // Get profiles for these users
      if (!data || data.length === 0) return [];
      const userIds = (data as any[]).map((d: any) => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return (data as any[]).map((d: any, i: number) => ({
        ...d,
        rank: i + 1,
        profile: profileMap.get(d.user_id),
      }));
    },
  });
}
