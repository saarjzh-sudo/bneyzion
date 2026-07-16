import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  /** רמה 20: תגית שמוצגת ב"ניווט לפי אופי הלימוד" בסיידבר במקום ב"נושאים בתנ״ך" */
  is_learning_style?: boolean;
}

export function useTopics() {
  // §7 R-LIB2: library strip must show only thematic topics (children of 'themes-root'),
  // NOT structural topics (נביאים/תורה/כתובים under a different parent).
  // Returning ALL topics was showing structural taxonomy in the /series library topics strip.
  return useQuery({
    queryKey: ["topics-themes-only"],
    queryFn: async () => {
      // Find the themes-root parent first
      const { data: parent } = await supabase
        .from("topics")
        .select("id")
        .eq("slug", "themes-root")
        .limit(1);
      if (!parent || parent.length === 0) {
        // Fallback: return all topics (safe degradation)
        const { data, error } = await supabase.from("topics").select("*").order("sort_order").order("name");
        if (error) throw error;
        return data as Topic[];
      }
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("parent_id", parent[0].id)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as Topic[];
    },
  });
}

export function useCreateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (topic: Partial<Topic>) => {
      const { data, error } = await supabase.from("topics").insert([topic as any]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useUpdateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Topic> & { id: string }) => {
      // cast: is_learning_style (רמה 20) עדיין לא בטיפוסים המג'ונרטים של Supabase
      const { data, error } = await (supabase as any).from("topics").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topics"] });
      qc.invalidateQueries({ queryKey: ["topics-themes-only"] });
      // רמה 20: עדכון נושא משפיע גם על רשימות הסיידבר (אופי-הלימוד / נושאים)
      qc.invalidateQueries({ queryKey: ["learning-style-topics"] });
      qc.invalidateQueries({ queryKey: ["topics-sidebar-themes"] });
      qc.invalidateQueries({ queryKey: ["basic-themes-sidebar"] });
    },
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: delRows, error } = await supabase.from("topics").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!delRows?.length) throw new Error("המחיקה לא בוצעה — אין הרשאת מחיקה (RLS).");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}
