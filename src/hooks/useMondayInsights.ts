/**
 * useMondayInsights — נתוני מנויי הפרק-השבועי מלוח Monday של בני ציון.
 *
 * עובר דרך edge-function `monday-insights` (הטוקן server-side, לא נחשף ב-client).
 * מקור: לוח "היסטוריית מנויים חודשית" (5094769002).
 *
 * אם ה-edge לא פרוס / חסר secret → ה-query נכשל ו-`error` מאוכלס (הדף מציג מצב-הקמה).
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MonthPoint {
  month: string;     // "2026-06"
  newSubs: number;   // מנויים חדשים
  left: number;      // עזבו
  active: number;    // סהכ פעיל
  mrr: number;       // הכנסה חודשית חוזרת (₪)
  churn: number;     // אחוז נטישה
}

export interface DonationCampaign {
  key: string;
  label: string;
  count: number;
  total: number;
}

export interface DonationSummary {
  campaigns: DonationCampaign[];
  total: number;
  count: number;
}

export interface MondayInsights {
  months: MonthPoint[];
  current: MonthPoint | null;
  donations: DonationSummary | null;
  /** ספירה חיה מלוח "מנויי הפרק השבועי" (סטטוס הו״ק=פעילה) — המספר הרשמי */
  liveActive: number | null;
}

export function useMondayInsights() {
  return useQuery<MondayInsights>({
    queryKey: ["monday-insights"],
    staleTime: 1000 * 60 * 30, // נתון חודשי — אין צורך לרענן תכופות
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("monday-insights", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return {
        months: (data?.months ?? []) as MonthPoint[],
        current: (data?.current ?? null) as MonthPoint | null,
        donations: (data?.donations ?? null) as DonationSummary | null,
        liveActive: (data?.liveActive ?? null) as number | null,
      };
    },
  });
}
