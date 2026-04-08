import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MigrationStats {
  total: number;
  completed: number;
  in_progress: number;
  failed: number;
  skipped: number;
  pending: number;
  byType: Record<string, number>;
  redirectsTotal: number;
  redirectsActive: number;
  redirectsBroken: number;
  totalHits: number;
}

async function fetchAllRows(table: "migration_items" | "migration_redirects", columns: string) {
  const pageSize = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    allData = allData.concat(data || []);
    hasMore = (data?.length || 0) === pageSize;
    from += pageSize;
  }

  return allData;
}

export function useMigrationStats() {
  return useQuery({
    queryKey: ["migration-stats"],
    queryFn: async (): Promise<MigrationStats> => {
      const [items, redirects] = await Promise.all([
        fetchAllRows("migration_items", "status, source_type"),
        fetchAllRows("migration_redirects", "status, hit_count"),
      ]);

      const stats: MigrationStats = {
        total: items.length,
        completed: items.filter((i) => i.status === "completed").length,
        in_progress: items.filter((i) => i.status === "in_progress").length,
        failed: items.filter((i) => i.status === "failed").length,
        skipped: items.filter((i) => i.status === "skipped").length,
        pending: items.filter((i) => i.status === "pending").length,
        byType: {},
        redirectsTotal: redirects.length,
        redirectsActive: redirects.filter((r) => r.status === "active").length,
        redirectsBroken: redirects.filter((r) => r.status === "broken").length,
        totalHits: redirects.reduce((sum, r) => sum + (r.hit_count || 0), 0),
      };

      items.forEach((item) => {
        stats.byType[item.source_type] = (stats.byType[item.source_type] || 0) + 1;
      });

      return stats;
    },
  });
}
