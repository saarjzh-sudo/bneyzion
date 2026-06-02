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

export function useBibleChapter(book: string | undefined, chapter: number | undefined) {
  return useQuery({
    queryKey: ["bible-verses", book, chapter],
    enabled: !!book && !!chapter,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bible_verses")
        .select("verse, text_he")
        .eq("book", book!)
        .eq("chapter", chapter!)
        .order("verse", { ascending: true });
      if (error) throw error;
      return data as Array<{ verse: number; text_he: string }>;
    },
    staleTime: 1000 * 60 * 60, // 1hr — static text, cache aggressively
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
