import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MigrationLog } from "@/types/migration";

interface Filters {
  level?: string;
  batchId?: string;
  search?: string;
}

export function useMigrationLogs(filters: Filters = {}) {
  return useQuery({
    queryKey: ["migration-logs", filters],
    queryFn: async () => {
      let query = supabase
        .from("migration_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filters.level && filters.level !== "all") {
        query = query.eq("level", filters.level);
      }
      if (filters.batchId) {
        query = query.eq("batch_id", filters.batchId);
      }
      if (filters.search) {
        query = query.ilike("message", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MigrationLog[];
    },
  });
}
