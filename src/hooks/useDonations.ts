import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Donation {
  id: string;
  amount: number;
  donor_name: string | null;
  dedication_type: string;
  dedication_name: string | null;
  created_at: string;
}

export function useRecentDonations() {
  return useQuery({
    queryKey: ["recent-donations"],
    queryFn: async () => {
      // ⚠️ ההוק הזה מחזיר **כלום** בפרודקשן, וכך זה מאז ומתמיד.
      //
      // סקר-DB (3.8.2026): ל-`donations` אין שום מדיניות SELECT ל-anon —
      // ה-SELECT היחיד הוא `admin_select_donations`, מוגבל לשלוש כתובות
      // מייל קבועות. RLS פעיל. כלומר קיר-התורמים בדף התרומות ריק, בשקט.
      //
      // זה **לא** דליפה — זה באג תצוגה. (באודיט הוסק בטעות ההפך, מתוך
      // כך שההוק רץ בדף ציבורי; ההסקה הייתה שגויה.)
      //
      // התיקון קיים ומוכן: `public.public_donation_wall` נוצר במיגרציה
      // 20260803_security_rls_surgical.sql — עם שם, סכום והקדשה בלבד, בלי
      // PII. הוא **לא** מוענק ל-anon בכוונה: להחיות את הקיר פירושו לפרסם
      // שמות תורמים באתר, וזו החלטת-פרטיות של העמותה ולא החלטת-אבטחה.
      //
      // להפעלה, אחרי אישור:
      //   grant select on public.public_donation_wall to anon, authenticated;
      // ואז להחליף את השאילתה כאן ל-`.from("public_donation_wall")`.
      const { data, error } = await supabase
        .from("donations")
        .select("id, amount, donor_name, dedication_type, dedication_name, created_at")
        .eq("payment_status", "completed")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as Donation[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * הוסר באודיט F5 (3.8.2026) — `useCreateDonation`.
 *
 * הוא הכניס שורה ל-`donations` ישירות מהדפדפן עם `amount` שנשלט ע"י הלקוח,
 * ולכן דרש מדיניות INSERT אנונימית על הטבלה שבה יושבים סכומי-הכסף.
 * לא היה לו אף קורא ב-`src/` — היצירה האמיתית נעשית ב-
 * `api/grow/create-payment.ts` עם service_role, אחרי אימות-מחיר בשרת.
 *
 * אם צריך שוב יצירת-תרומה: דרך נתיב-שרת, לא מהקליינט.
 */
