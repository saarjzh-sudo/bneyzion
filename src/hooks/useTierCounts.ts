/**
 * useTierCounts
 *
 * Reads the `yehoshua_tier_counts` view (aggregates completed donations
 * per tier_id for the yehoshua-campaign) and returns a Record<tierId, sold>.
 *
 * Subscribes to the `donations` table for realtime updates — any new
 * completed payment re-fetches the view.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTierCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  async function fetchCounts() {
    const { data, error } = await supabase
      .from("yehoshua_tier_counts")
      .select("tier_id, sold");

    if (error) {
      console.warn("useTierCounts fetch error:", error.message);
      return;
    }
    if (!data) return;

    const map: Record<string, number> = {};
    for (const row of data as { tier_id: string; sold: number }[]) {
      map[row.tier_id] = row.sold;
    }
    setCounts(map);
  }

  useEffect(() => {
    fetchCounts();

    // Re-fetch whenever any yehoshua-campaign donation changes
    const channel = supabase
      .channel("yehoshua-tier-counts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "donations",
          filter: "product=eq.yehoshua-campaign",
        },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return counts;
}
