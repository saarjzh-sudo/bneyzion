import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CommunityMember {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: string;
  user_id: string | null;
  joined_at: string;
  membership_tier: string;
  badge_label: string | null;
}

export function useMembership() {
  const { user } = useAuth();

  const { data: membership, isLoading, refetch } = useQuery({
    queryKey: ["community-membership", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Check by user_id first, then by email
      const { data: byId } = await supabase
        .from("community_members")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      if (byId) return byId as CommunityMember;

      // Fallback: check by email and link user_id
      if (user!.email) {
        const { data: byEmail } = await supabase
          .from("community_members")
          .select("*")
          .eq("email", user!.email)
          .eq("status", "active")
          .maybeSingle();
        if (byEmail && !byEmail.user_id) {
          // Link the auth user to the existing community member
          await supabase
            .from("community_members")
            .update({ user_id: user!.id })
            .eq("id", byEmail.id);
          return { ...byEmail, user_id: user!.id } as CommunityMember;
        }
        if (byEmail) return byEmail as CommunityMember;
      }

      return null;
    },
  });

  const isMember = !!membership && membership.status === "active";

  return { membership, isMember, isLoading, refetch };
}

export function useJoinCommunity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (info: { firstName: string; lastName: string; phone?: string }) => {
      if (!user?.email) throw new Error("נדרש חשבון עם כתובת אימייל");

      const { data, error } = await supabase
        .from("community_members")
        .insert({
          email: user.email,
          user_id: user.id,
          first_name: info.firstName,
          last_name: info.lastName,
          phone: info.phone || null,
          status: "active",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") throw new Error("כבר רשום כחבר קהילה");
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-membership"] });
    },
  });
}

export function useLearningStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["learning-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Total lessons watched
      const { count: totalLessons } = await supabase
        .from("user_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);

      // Completed lessons
      const { count: completedLessons } = await supabase
        .from("user_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("completed", true);

      // Total favorites
      const { count: totalFavorites } = await supabase
        .from("user_favorites")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);

      // Active enrollments
      const { count: activeEnrollments } = await supabase
        .from("user_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);

      // Streak
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: activityDays } = await supabase
        .from("user_daily_activity")
        .select("activity_date")
        .eq("user_id", user!.id)
        .gte("activity_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("activity_date", { ascending: false });

      let streak = 0;
      if (activityDays && activityDays.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const dates = new Set(activityDays.map((d: any) => d.activity_date));
        if (dates.has(today) || dates.has(yesterday)) {
          let checkDate = dates.has(today) ? new Date() : new Date(Date.now() - 86400000);
          while (dates.has(checkDate.toISOString().split("T")[0])) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          }
        }
      }

      // Total minutes learned
      const { data: minutesData } = await supabase
        .from("user_daily_activity")
        .select("minutes_learned")
        .eq("user_id", user!.id);
      const totalMinutes = minutesData?.reduce((sum: number, d: any) => sum + (d.minutes_learned || 0), 0) || 0;

      return {
        totalLessons: totalLessons || 0,
        completedLessons: completedLessons || 0,
        totalFavorites: totalFavorites || 0,
        activeEnrollments: activeEnrollments || 0,
        streak,
        totalMinutes,
      };
    },
  });
}
