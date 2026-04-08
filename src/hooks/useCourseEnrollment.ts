import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCommunityCoursesPublic() {
  return useQuery({
    queryKey: ["community-courses-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_courses")
        .select("*, rabbis(id, name, image_url)")
        .eq("status", "active")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCourseDetail(courseId: string | undefined) {
  return useQuery({
    queryKey: ["community-course-detail", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_courses")
        .select("*, rabbis(id, name, image_url, title)")
        .eq("id", courseId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCourseSessions(courseId: string | undefined) {
  return useQuery({
    queryKey: ["course-sessions", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_sessions" as any)
        .select("*")
        .eq("course_id", courseId!)
        .order("session_number");
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
}

export function useCourseEnrollment(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["course-enrollment", user?.id, courseId],
    enabled: !!user && !!courseId,
    queryFn: async () => {
      const { data } = await supabase
        .from("course_enrollments" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("course_id", courseId!)
        .maybeSingle();
      return data as any;
    },
  });
}

export function useMyEnrollments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-course-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments" as any)
        .select("*, community_courses(id, title, image_url, course_type, total_lessons, rabbis(name))")
        .eq("user_id", user!.id)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
}

export function useEnrollInCourse() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("course_enrollments" as any)
        .insert({ user_id: user.id, course_id: courseId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-enrollment"] });
      qc.invalidateQueries({ queryKey: ["my-course-enrollments"] });
    },
  });
}

export function useNextSession() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["next-session", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get enrolled course IDs
      const { data: enrollments } = await supabase
        .from("course_enrollments" as any)
        .select("course_id")
        .eq("user_id", user!.id)
        .eq("status", "active");
      
      if (!enrollments || enrollments.length === 0) return null;
      
      const courseIds = (enrollments as any[]).map((e: any) => e.course_id);
      const now = new Date().toISOString();
      
      const { data } = await supabase
        .from("course_sessions" as any)
        .select("*, community_courses(title)")
        .in("course_id", courseIds)
        .gte("session_date", now)
        .eq("status", "upcoming")
        .order("session_date")
        .limit(1)
        .maybeSingle();
      
      return data as any;
    },
  });
}
