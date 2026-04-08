import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LessonDedication {
  id: string;
  lesson_id: string;
  dedication_type: string;
  dedicated_name: string;
  dedicator_name: string | null;
  message: string | null;
  created_at: string;
}

export function useLessonDedications(lessonId?: string) {
  return useQuery({
    queryKey: ["lesson-dedications", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_dedications")
        .select("*")
        .eq("lesson_id", lessonId!)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as LessonDedication[];
    },
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateDedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ded: {
      lesson_id: string;
      dedication_type: string;
      dedicated_name: string;
      dedicator_name?: string;
      message?: string;
      user_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("lesson_dedications")
        .insert(ded)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["lesson-dedications", vars.lesson_id] }),
  });
}
