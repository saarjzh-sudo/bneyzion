import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCommunityCoruses() {
  return useQuery({
    queryKey: ["community-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_courses")
        .select("*")
        .eq("status", "active")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCourseLessons(courseId: string | undefined) {
  return useQuery({
    queryKey: ["community-course-lessons", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_course_lessons")
        .select("*")
        .eq("course_id", courseId!)
        .eq("status", "published")
        .order("lesson_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useMemberAccess(userEmail: string | undefined) {
  return useQuery({
    queryKey: ["member-access", userEmail],
    enabled: !!userEmail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("*, community_member_courses(course_id)")
        .eq("email", userEmail!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
