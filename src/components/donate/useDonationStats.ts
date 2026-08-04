/**
 * useDonationStats — live social-proof numbers for the donate page.
 *
 * Reads the aggregate view `public_donation_stats` and returns:
 *   - donorCount: how many completed donations exist
 *   - totalRaised: the summed amount of those donations
 *
 * אודיט F5/C2 (3.8.2026): קודם זה קרא את `donations` עצמה, "so it stays within
 * the existing public RLS read policy" — וההערה הזו הייתה העדות הכי ברורה
 * לכך שהמדיניות הציבורית קיימת. RLS היא ברמת-שורה, ולכן אותה מדיניות החזירה
 * גם את donor_email, phone, card_suffix, כתובת-מגורים, ת"ז ו-raw_payload
 * ב-`select=*` אחד. עכשיו נקראים שני מספרים מ-view; הטבלה נעולה ל-anon.
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
      // שני מספרים מוכנים מהאגרגט — גם מהיר יותר מלמשוך את כל השורות
      // ולסכם בדפדפן, מה שהקוד הקודם עשה.
      const { data, error } = await supabase
        .from("public_donation_stats" as never)
        .select("donor_count, total_raised")
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        // Leave ready=false → UI falls back to static copy.
        return;
      }

      const row = data as unknown as { donor_count: number | null; total_raised: number | null };

      setStats({
        donorCount: Number(row.donor_count) || 0,
        totalRaised: Number(row.total_raised) || 0,
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
