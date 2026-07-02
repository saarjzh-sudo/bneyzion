/**
 * useDonationStats — live social-proof numbers for the donate page.
 *
 * Reads the `donations` table (the same table useRecentDonations reads, so it
 * stays within the existing public RLS read policy) and returns:
 *   - donorCount: how many completed donations exist
 *   - totalRaised: the summed amount of those donations
 *
 * Resilient by design: if the query fails (RLS, network) the hook returns
 * `ready: false` so the UI can gracefully fall back to static copy instead of
 * showing a broken "0 תורמים" state. No mock data — when the numbers aren't
 * trustworthy we simply hide them.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DonationStats {
  donorCount: number;
  totalRaised: number;
  ready: boolean;
}

export function useDonationStats(): DonationStats {
  const [stats, setStats] = useState<DonationStats>({
    donorCount: 0,
    totalRaised: 0,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      // Pull completed donation amounts + an exact head count in one round-trip.
      const { data, count, error } = await supabase
        .from("donations")
        .select("amount", { count: "exact" })
        .eq("payment_status", "completed");

      if (cancelled) return;
      if (error || !data) {
        // Leave ready=false → UI falls back to static copy.
        return;
      }

      const totalRaised = data.reduce(
        (sum, row: { amount: number | null }) => sum + (Number(row.amount) || 0),
        0
      );

      setStats({
        donorCount: count ?? data.length,
        totalRaised,
        ready: true,
      });
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}
