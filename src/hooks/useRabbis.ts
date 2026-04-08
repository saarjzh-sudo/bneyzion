import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Rabbi {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  image_url: string | null;
  specialty: string | null;
  status: string;
  lesson_count: number;
  created_at: string;
}

export function useRabbis() {
  return useQuery({
    queryKey: ["rabbis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rabbis").select("*").order("name");
      if (error) throw error;
      return data as Rabbi[];
    },
  });
}

export function useCreateRabbi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rabbi: Partial<Rabbi>) => {
      const { data, error } = await supabase.from("rabbis").insert([rabbi as any]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rabbis"] }),
  });
}

export function useUpdateRabbi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Rabbi> & { id: string }) => {
      const { data, error } = await supabase.from("rabbis").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rabbis"] }),
  });
}

export function useDeleteRabbi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rabbis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rabbis"] }),
  });
}
