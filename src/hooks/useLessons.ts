import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Lesson {
  id: string;
  title: string;
  description: string | null;
  rabbi_id: string | null;
  series_id: string | null;
  video_url: string | null;
  audio_url: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  bible_book: string | null;
  bible_chapter: number | null;
  bible_verse: number | null;
  source_type: string;
  status: string;
  views_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useLessons() {
  return useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("*, rabbis(name), series(title)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lesson: Partial<Lesson>) => {
      const { data, error } = await supabase.from("lessons").insert([lesson as any]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lessons"] }),
  });
}

export function useUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lesson> & { id: string }) => {
      const { data, error } = await supabase.from("lessons").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lessons"] }),
  });
}

export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lessons"] }),
  });
}
