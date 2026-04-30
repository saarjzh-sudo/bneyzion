import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Series {
  id: string;
  title: string;
  description: string | null;
  rabbi_id: string | null;
  parent_id: string | null;
  image_url: string | null;
  lesson_count: number;
  status: string;
  created_at: string;
  audience_tags: string[];
}

export function useSeries() {
  return useQuery({
    queryKey: ["series"],
    queryFn: async () => {
      const { data, error } = await supabase.from("series").select("*, rabbis(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (series: Partial<Series>) => {
      const { data, error } = await supabase.from("series").insert([series as { title: string } & Partial<Series>]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["series"] }),
  });
}

export function useUpdateSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Series> & { id: string }) => {
      const { data, error } = await supabase.from("series").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["series"] }),
  });
}

export function useDeleteSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("series").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["series"] }),
  });
}
