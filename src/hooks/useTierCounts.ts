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

    // Realtime subscription — triggers when a donation row changes.
    // NOTE: requires donations table in supabase_realtime publication.
    // The 30s polling below acts as fallback if realtime is unavailable.
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

    // Polling fallback: re-fetch tier counts every 30 seconds.
    // Guarantees sold counts stay current even without realtime.
    const pollInterval = setInterval(fetchCounts, 30_000);

    // Refresh when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchCounts();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return counts;
}
