/**
 * useCampaignDedication — "תרומה ⟵ הקדשה" (26.8.2026, קמפיין סעדיה).
 *
 * תורם שנותן סכום שמכסה הקדשה יכול לבחור, בתוך אותה תרומה (בלי חיוב נוסף),
 * שיעור/סדרה פנויים להקדשה. הבחירה עוברת ל-create-payment.ts כ-
 * `donationMeta.companion_dedication`, שיוצר שם שורת lesson_dedications
 * "pending" ומאמת שהסכום מכסה את המחיר (dedication_settings) — בדיוק כמו
 * הצנרת הקיימת של הקדשה עצמאית, רק בלי תשלום שני. ה-webhook (donations
 * success) הופך אותה ל-active על אותו callback. ראו CampaignDedicationPicker.
 *
 * ⛔ זהירות תוכן-מורים: הבחירה חייבת להחריג audience_tags∋teachers —
 * חוק-הברזל "אפס דליפת מורים לציבור" חל גם כאן.
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** מזהי שיעור/סדרה עם הקדשה פעילה כבר — לסינון-לקוח (ה-DB חוסם 409 גם על pending). */
export function useDedicationTakenIds() {
  return useQuery({
    queryKey: ["dedication-taken-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_lesson_dedications" as never)
        .select("lesson_id, series_id")
        .eq("status", "active");
      if (error) throw error;
      const lessons = new Set<string>();
      const series = new Set<string>();
      for (const row of (data ?? []) as unknown as { lesson_id: string | null; series_id: string | null }[]) {
        if (row.lesson_id) lessons.add(row.lesson_id);
        if (row.series_id) series.add(row.series_id);
      }
      return { lessons, series };
    },
    staleTime: 1000 * 30,
  });
}

export interface DedicationSeriesCandidate {
  id: string;
  title: string;
  lesson_count: number | null;
}

export interface DedicationLessonCandidate {
  id: string;
  title: string;
  series_id: string | null;
  rabbi_lesson_count: number;
}

/** חיפוש סדרות פנויות להקדשה (ציבורי בלבד, לא-מוקדשות). ריבאונס בקומפוננטה הקוראת. */
export function useDedicationSeriesSearch(term: string, enabled: boolean) {
  const clean = term.trim();
  return useQuery<DedicationSeriesCandidate[]>({
    queryKey: ["dedication-series-search", clean],
    enabled: enabled && clean.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("id, title, lesson_count")
        .eq("status", "active")
        .not("audience_tags", "cs", "{teachers}")
        .ilike("title", `%${clean}%`)
        .order("lesson_count", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as DedicationSeriesCandidate[];
    },
  });
}

/** חיפוש שיעורים פנויים להקדשה, עם ספירת-שיעורי-הרב (לתמחור "רב מבוקש"). */
export function useDedicationLessonSearch(term: string, enabled: boolean) {
  const clean = term.trim();
  return useQuery<DedicationLessonCandidate[]>({
    queryKey: ["dedication-lesson-search", clean],
    enabled: enabled && clean.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, series_id, rabbis(lesson_count)")
        .not("audience_tags", "cs", "{teachers}")
        .ilike("title", `%${clean}%`)
        .limit(12);
      if (error) throw error;
      return ((data ?? []) as unknown as Array<{
        id: string;
        title: string;
        series_id: string | null;
        rabbis: { lesson_count: number | null } | null;
      }>).map((r) => ({
        id: r.id,
        title: r.title,
        series_id: r.series_id,
        rabbi_lesson_count: Number(r.rabbis?.lesson_count ?? 0),
      }));
    },
  });
}

/** דיבאונס קטן לתיבת-חיפוש (בלי תלות חיצונית). */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
