import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MigrationRedirect } from "@/types/migration";

interface Filters {
  status?: string;
  search?: string;
  priority?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedRedirects {
  redirects: MigrationRedirect[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useRedirects(filters: Filters = {}) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;

  return useQuery({
    queryKey: ["migration-redirects", filters],
    queryFn: async (): Promise<PaginatedRedirects> => {
      let query = supabase
        .from("migration_redirects")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.search) {
        query = query.or(
          `old_path.ilike.%${filters.search}%,new_path.ilike.%${filters.search}%,meta_title.ilike.%${filters.search}%`
        );
      }
      if (filters.priority && filters.priority !== "all") {
        query = query.eq("priority", filters.priority);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      const total = count || 0;
      return {
        redirects: data as MigrationRedirect[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  });
}

export function useAddRedirect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (redirect: Partial<MigrationRedirect>) => {
      const { data, error } = await supabase
        .from("migration_redirects")
        .insert(redirect as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["migration-redirects"] });
      qc.invalidateQueries({ queryKey: ["migration-stats"] });
    },
  });
}

export function useUpdateRedirect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MigrationRedirect> & { id: string }) => {
      const { error } = await supabase
        .from("migration_redirects")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["migration-redirects"] });
      qc.invalidateQueries({ queryKey: ["migration-stats"] });
    },
  });
}

export function useDeleteRedirect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("migration_redirects")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["migration-redirects"] });
      qc.invalidateQueries({ queryKey: ["migration-stats"] });
    },
  });
}

export function useImportRedirectsCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (csvText: string) => {
      const lines = csvText.trim().split("\n");
      const redirects = lines.slice(1).map((line) => {
        const [old_path, new_path] = line.split(",").map((s) => s.trim().replace(/"/g, ""));
        return { old_path, new_path, status: "active" };
      }).filter((r) => r.old_path);

      if (redirects.length === 0) throw new Error("No valid redirects found");

      // Insert in batches of 500 to avoid payload limits
      for (let i = 0; i < redirects.length; i += 500) {
        const batch = redirects.slice(i, i + 500);
        const { error } = await supabase
          .from("migration_redirects")
          .insert(batch as any);
        if (error) throw error;
      }
      return redirects.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["migration-redirects"] });
      qc.invalidateQueries({ queryKey: ["migration-stats"] });
    },
  });
}
