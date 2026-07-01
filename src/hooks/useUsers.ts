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
  role: "admin" | "moderator" | "user" | "creator";
}

export interface AccessTag {
  id: string;
  user_id: string | null;
  email: string | null;
  tag: string;
  valid_until: string | null;
  source: string | null;
  pending_user_link: boolean | null;
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

/** כל גישות-התוכן (מנויים + קורסים) — tag format: "program:..." או "course:..." */
export function useAccessTags() {
  return useQuery({
    queryKey: ["user-access-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_access_tags" as never)
        .select("id, user_id, email, tag, valid_until, source, pending_user_link");
      if (error) throw error;
      return (data ?? []) as unknown as AccessTag[];
    },
  });
}

/** הענקת גישה ידנית (מנוי/קורס) — source='admin' */
export function useGrantAccessTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, email, tag, valid_until }: {
      user_id: string | null; email: string | null; tag: string; valid_until?: string | null;
    }) => {
      const payload: Record<string, unknown> = {
        tag: tag.trim(),
        source: "admin",
        pending_user_link: !user_id,
      };
      if (user_id) payload.user_id = user_id;
      if (email) payload.email = email.trim().toLowerCase();
      if (valid_until) payload.valid_until = new Date(valid_until).toISOString();
      const { error } = await supabase.from("user_access_tags" as never).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-access-tags"] }),
  });
}

/** שלילת גישה — מסיים מיידית (valid_until=now) במקום מחיקה, לשמירת היסטוריה */
export function useRevokeAccessTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_access_tags" as never)
        .update({ valid_until: new Date().toISOString() } as never)
        .eq("id" as never, id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-access-tags"] }),
  });
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: string | null;
  completed: boolean | null;
}

/** כל ההרשמות לקורסים — לזיהוי "קוני קורסים" לכל משתמש */
export function useCourseEnrollments() {
  return useQuery({
    queryKey: ["admin-course-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("id, user_id, course_id, status, completed");
      if (error) throw error;
      return (data ?? []) as unknown as Enrollment[];
    },
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
