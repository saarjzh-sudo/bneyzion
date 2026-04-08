import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "moderator" | "user";
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useUserRoles() {
  return useQuery({
    queryKey: ["user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data as UserRole[];
    },
  });
}

export function useAddRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      const { error } = await supabase.from("user_roles").insert([{ user_id, role } as any]);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-roles"] }),
  });
}

export function useRemoveRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-roles"] }),
  });
}

export function useCommunityMembers() {
  return useQuery({
    queryKey: ["admin-community-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("*")
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateMemberTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, tier }: { memberId: string; tier: string }) => {
      const { error } = await supabase
        .from("community_members")
        .update({ membership_tier: tier })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-community-members"] }),
  });
}

export function useUpdateMemberStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, status }: { memberId: string; status: string }) => {
      const { error } = await supabase
        .from("community_members")
        .update({ status })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-community-members"] }),
  });
}
