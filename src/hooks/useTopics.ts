import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
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
      const { data, error } = await supabase.from("topics").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}
