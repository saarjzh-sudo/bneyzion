import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Rabbi {
  id: string;
  name: string;
  slug: string;
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

// 27.5.2026 — priority tiers per profile.md (bnei-zion). Pinned to top of /rabbis list.
const RABBI_TIER_1 = ["ראובן ששון", "אליעזר קשתיאל"];
const RABBI_TIER_2 = ["שמואל אליהו"];

function getRabbiTier(name: string): number {
  const cleanName = name.replace(/^הרב\s+/, "").trim();
  if (RABBI_TIER_1.some(t => cleanName.includes(t))) return 1;
  if (RABBI_TIER_2.some(t => cleanName.includes(t))) return 2;
  return 99;
}

export function usePublicRabbis() {
  return useQuery({
    queryKey: ["rabbis-public"],
    queryFn: async () => {
      // Use get_public_rabbis() RPC which filters to rabbis who have at least 1
      // 'general'-tagged series — excluding teacher-only creators (ישקו העדרים,
      // מכון דעת סופרים, הרב עדי איצקוביץ', תלמוד תורה מורשה, etc.) that
      // should only appear in the Teachers Wing.
      // Migration: supabase/migrations/20260603_get_public_rabbis_rpc.sql
      // Fallback: if RPC not yet applied, falls back to the old query.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rpcData, error: rpcError } = await (supabase as any)
        .rpc("get_public_rabbis");
      if (!rpcError && rpcData) {
        const sorted = (rpcData as Rabbi[]).slice().sort((a, b) => {
          const tierDiff = getRabbiTier(a.name) - getRabbiTier(b.name);
          if (tierDiff !== 0) return tierDiff;
          return (b.lesson_count ?? 0) - (a.lesson_count ?? 0);
        });
        return sorted;
      }
      // Fallback (RPC not yet deployed)
      const { data, error } = await supabase
        .from("rabbis")
        .select("*")
        .eq("status", "active")
        .gt("lesson_count", 0)
        .order("lesson_count", { ascending: false });
      if (error) throw error;
      const sorted = (data as Rabbi[]).slice().sort((a, b) => {
        const tierDiff = getRabbiTier(a.name) - getRabbiTier(b.name);
        if (tierDiff !== 0) return tierDiff;
        return (b.lesson_count ?? 0) - (a.lesson_count ?? 0);
      });
      return sorted;
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
