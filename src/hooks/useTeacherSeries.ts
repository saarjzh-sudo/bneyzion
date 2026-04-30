/**
 * useTeacherSeries — fetches series where audience_tags @> ARRAY['teachers']
 * Used by the "מורים" tab (tab 4) in DesignSidebar.
 *
 * Returns series sorted by lesson_count DESC, limited to active/published.
 * Each row includes the rabbi name for display.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeacherSeriesRow {
  id: string;
  title: string;
  lesson_count: number;
  parent_id: string | null;
  status: string;
  audience_tags: string[];
  rabbis: { name: string } | null;
}

export function useTeacherSeries() {
  return useQuery<TeacherSeriesRow[]>({
    queryKey: ["teacher-series"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("id, title, lesson_count, parent_id, status, audience_tags, rabbis(name)")
        .contains("audience_tags", ["teachers"])
        .in("status", ["active", "published"])
        .order("lesson_count", { ascending: false });

      if (error) throw error;
      return (data ?? []) as TeacherSeriesRow[];
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });
}
