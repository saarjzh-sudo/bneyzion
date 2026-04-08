import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MigrationItem } from "@/types/migration";

interface Filters {
  sourceType?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedItems {
  items: MigrationItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useMigrationItems(filters: Filters = {}) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;

  return useQuery({
    queryKey: ["migration-items", filters],
    queryFn: async (): Promise<PaginatedItems> => {
      let query = supabase
        .from("migration_items")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filters.sourceType && filters.sourceType !== "all") {
        query = query.eq("source_type", filters.sourceType);
      }
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.search) {
        query = query.or(
          `source_title.ilike.%${filters.search}%,source_url.ilike.%${filters.search}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      const total = count || 0;
      return {
        items: data as MigrationItem[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  });
}

export function useAddMigrationItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<MigrationItem>) => {
      const { data, error } = await supabase
        .from("migration_items")
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["migration-items"] });
      qc.invalidateQueries({ queryKey: ["migration-stats"] });
    },
  });
}

export function useUpdateMigrationItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "completed") updates.migrated_at = new Date().toISOString();
      const { error } = await supabase
        .from("migration_items")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["migration-items"] });
      qc.invalidateQueries({ queryKey: ["migration-stats"] });
    },
  });
}
