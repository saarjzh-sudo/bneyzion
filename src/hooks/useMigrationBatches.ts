import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MigrationBatch } from "@/types/migration";

export function useMigrationBatches() {
  return useQuery({
    queryKey: ["migration-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("migration_batches")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MigrationBatch[];
    },
  });
}
