/**
 * T09 promo system — data hook.
 *
 * Real data from Supabase (no mock arrays). The `promos` table may not exist
 * yet in the DB (its migration is DO-NOT-APPLY until Saar confirms), so the
 * query fails soft: on ANY error it returns [] and the whole promo layer
 * renders nothing. Nothing on the site breaks before the table is applied.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Promo } from "./types";

// `promos` is not in the generated Database type yet — loosen the client for
// this one table so the build stays clean until types are regenerated.
const db = supabase as unknown as {
  from: (table: string) => any;
};

async function fetchActivePromos(): Promise<Promo[]> {
  try {
    const { data, error } = await db
      .from("promos")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (error) {
      // 42P01 = undefined_table (migration not applied yet) → silent empty
      return [];
    }
    return (data ?? []) as Promo[];
  } catch {
    return [];
  }
}

/** Returns the currently-active promos (scheduling is applied by the caller). */
export function usePromos() {
  return useQuery({
    queryKey: ["promos"],
    queryFn: fetchActivePromos,
    staleTime: 1000 * 60 * 5,
    retry: false, // don't hammer a missing table
    refetchOnWindowFocus: false,
  });
}

/** Is `now` inside the promo's [starts_at, ends_at] scheduling window? */
export function isWithinSchedule(promo: Promo, nowMs: number): boolean {
  if (promo.starts_at && new Date(promo.starts_at).getTime() > nowMs) return false;
  if (promo.ends_at && new Date(promo.ends_at).getTime() < nowMs) return false;
  return true;
}

/**
 * Does the promo target the current visitor?
 * Empty `audience_tags` = everyone. Otherwise at least one tag must overlap.
 */
export function matchesAudience(promo: Promo, visitorTags: string[]): boolean {
  if (!promo.audience_tags || promo.audience_tags.length === 0) return true;
  return promo.audience_tags.some((t) => visitorTags.includes(t));
}
