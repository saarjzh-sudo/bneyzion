import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * הקדשת שיעור/סדרה — טבלת `lesson_dedications`.
 *
 * ⚠️ הטבלה כפי שהיא ב-generated types (src/integrations/supabase/types.ts) תומכת
 * היום רק ב-lesson_id (אין עדיין series_id / scope / amount / asmachta / payment_status).
 * העמודות המורחבות האלה נוצרות ע"י סוכן-DB מקביל. עד שה-types מתעדכנים, קריאה/כתיבה
 * של השדות המורחבים עוברת דרך `as never` (כמו התבנית ב-useEvents.ts) כדי לא לשבור build.
 * אם השדות עדיין לא קיימים בפועל ב-DB, insert/update עם הם יזרקו שגיאת "column not found" —
 * וזה תקין (מחכה למיגרציה של הסוכן האחר, לא קוד שבור).
 */

export type DedicationScope = "lesson" | "series";
export type DedicationType = "iluy_neshama" | "refua" | "hatzlacha" | "memory";

export interface LessonDedication {
  id: string;
  /** "lesson" (ברירת מחדל, תואם לאחור) או "series". */
  scope: DedicationScope;
  lesson_id: string | null;
  series_id: string | null;
  dedication_type: string;
  dedicated_name: string;
  dedicator_name: string | null;
  message: string | null;
  amount: number | null;
  /** "active" = מאושר ומוצג באתר. "pending" = ממתין לאישור תשלום. */
  status: string;
  /** אסמכתת תשלום Grow, אם ההקדשה נוצרה דרך תשלום (ולא seeding ידני). */
  payment_asmachta: string | null;
  user_id: string | null;
  created_at: string;
}

export const DEDICATION_TYPE_LABELS: Record<string, string> = {
  iluy_neshama: "לעילוי נשמת",
  refua: "לרפואה שלמה",
  hatzlacha: "להצלחת",
  memory: "לזכרון",
};

/**
 * ⚠️ מיפוי עמודות DB: בטבלה החיה העמודה היא `asmachta` (לא payment_asmachta),
 * ובהגדרות — `price_lesson`/`price_series` (לא lesson_price). ההוקים ממפים
 * כאן פעם אחת כדי ששאר הקוד (כולל האדמין) ימשיך לעבוד עם השמות הקיימים.
 */
function mapDedicationRow(row: Record<string, unknown>): LessonDedication {
  return {
    ...(row as unknown as LessonDedication),
    payment_asmachta: (row.asmachta as string | null) ?? null,
  };
}

/** הקדשות פעילות על שיעור ספציפי. */
export function useLessonDedications(lessonId?: string) {
  return useQuery({
    queryKey: ["lesson-dedications", "lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_dedications")
        .select("*")
        .eq("lesson_id", lessonId!)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as unknown as Record<string, unknown>[]).map(mapDedicationRow);
    },
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 5,
  });
}

/** הקדשות פעילות על סדרה שלמה (מוצג בראש עמוד הסדרה, לא רק בשיעור בודד). */
export function useSeriesDedications(seriesId?: string) {
  return useQuery({
    queryKey: ["lesson-dedications", "series", seriesId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_dedications")
        .select("*")
        .eq("series_id" as never, seriesId!)
        .eq("scope" as never, "series")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as unknown as Record<string, unknown>[]).map(mapDedicationRow);
    },
    enabled: !!seriesId,
    staleTime: 1000 * 60 * 5,
  });
}

export interface CreateDedicationInput {
  scope: DedicationScope;
  lesson_id?: string;
  series_id?: string;
  dedication_type: DedicationType | string;
  dedicated_name: string;
  dedicator_name?: string;
  message?: string;
  amount?: number;
  user_id?: string;
  /** ברירת מחדל "pending" — הופך ל"active" רק לאחר אישור תשלום (webhook) או seeding ידני. */
  status?: "pending" | "active";
  payment_asmachta?: string;
}

/** יצירת רשומת הקדשה (משמש גם ע"י seeding ידני באדמין, וגם כ-fallback לפני-תשלום). */
export function useCreateDedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ded: CreateDedicationInput) => {
      const payload = {
        scope: ded.scope,
        lesson_id: ded.scope === "lesson" ? ded.lesson_id ?? null : null,
        series_id: ded.scope === "series" ? ded.series_id ?? null : null,
        dedication_type: ded.dedication_type,
        dedicated_name: ded.dedicated_name,
        dedicator_name: ded.dedicator_name ?? null,
        message: ded.message ?? null,
        amount: ded.amount ?? null,
        status: ded.status ?? "pending",
        asmachta: ded.payment_asmachta ?? null,
        user_id: ded.user_id ?? null,
      };
      const { data, error } = await supabase
        .from("lesson_dedications")
        .insert(payload as never)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["lesson-dedications"] });
      if (vars.lesson_id) qc.invalidateQueries({ queryKey: ["lesson-dedications", "lesson", vars.lesson_id] });
      if (vars.series_id) qc.invalidateQueries({ queryKey: ["lesson-dedications", "series", vars.series_id] });
      qc.invalidateQueries({ queryKey: ["admin-dedications"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Admin: full list + status/price management
// ---------------------------------------------------------------------------

/** כל ההקדשות (לכל הסטטוסים) — לשימוש פאנל האדמין. */
export function useAllDedications() {
  return useQuery({
    queryKey: ["admin-dedications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_dedications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as unknown as Record<string, unknown>[]).map(mapDedicationRow);
    },
  });
}

export function useUpdateDedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LessonDedication> & { id: string }) => {
      const { error } = await supabase
        .from("lesson_dedications")
        .update(updates as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dedications"] });
      qc.invalidateQueries({ queryKey: ["lesson-dedications"] });
    },
  });
}

export function useDeleteDedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // לא מוחקים בפועל — מסמנים archived (כלל-ברזל: לעולם לא למחוק, לשמור עותק).
      const { error } = await supabase
        .from("lesson_dedications")
        .update({ status: "archived" } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dedications"] });
      qc.invalidateQueries({ queryKey: ["lesson-dedications"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Dedication settings (prices) — table `dedication_settings`, may not exist yet.
// Falls back to hardcoded defaults (600 lesson / 1800 series) if the table
// is missing or empty, so the UI never breaks while the DB agent ships it.
// ---------------------------------------------------------------------------

export interface DedicationSettings {
  lesson_price: number;
  series_price: number;
  /** תמחור דיפרנציאלי (סער 10.7): רב מבוקש = מחיר שיעור גבוה יותר. */
  lesson_price_popular: number;
  /** סף "רב מבוקש" — לפי rabbis.lesson_count. */
  popular_rabbi_min_lessons: number;
  /** סדרות בינוניות/גדולות — מחיר לפי מספר השיעורים בסדרה. */
  series_price_mid: number;
  series_price_large: number;
  series_mid_threshold: number;
  series_large_threshold: number;
}

const FALLBACK_SETTINGS: DedicationSettings = {
  lesson_price: 600,
  series_price: 1800,
  lesson_price_popular: 900,
  popular_rabbi_min_lessons: 100,
  series_price_mid: 2400,
  series_price_large: 3200,
  series_mid_threshold: 21,
  series_large_threshold: 61,
};

export function useDedicationSettings() {
  return useQuery({
    queryKey: ["dedication-settings"],
    queryFn: async (): Promise<DedicationSettings> => {
      try {
        const { data, error } = await supabase
          .from("dedication_settings" as never)
          .select("*")
          .maybeSingle();
        if (error || !data) return FALLBACK_SETTINGS;
        const row = data as unknown as Record<string, unknown>;
        // עמודות ה-DB: price_lesson / price_series (+ עמודות התמחור הדיפרנציאלי)
        return {
          lesson_price: Number(row.price_lesson ?? FALLBACK_SETTINGS.lesson_price),
          series_price: Number(row.price_series ?? FALLBACK_SETTINGS.series_price),
          lesson_price_popular: Number(row.price_lesson_popular ?? FALLBACK_SETTINGS.lesson_price_popular),
          popular_rabbi_min_lessons: Number(row.popular_rabbi_min_lessons ?? FALLBACK_SETTINGS.popular_rabbi_min_lessons),
          series_price_mid: Number(row.price_series_mid ?? FALLBACK_SETTINGS.series_price_mid),
          series_price_large: Number(row.price_series_large ?? FALLBACK_SETTINGS.series_price_large),
          series_mid_threshold: Number(row.series_mid_threshold ?? FALLBACK_SETTINGS.series_mid_threshold),
          series_large_threshold: Number(row.series_large_threshold ?? FALLBACK_SETTINGS.series_large_threshold),
        };
      } catch {
        return FALLBACK_SETTINGS;
      }
    },
    staleTime: 1000 * 60 * 10,
    // Never let a missing table surface as a loading spinner forever.
    retry: false,
  });
}

export function useUpdateDedicationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<DedicationSettings>) => {
      // מיפוי חזרה לשמות עמודות ה-DB
      const dbRow: Record<string, number> = {};
      if (settings.lesson_price !== undefined) dbRow.price_lesson = settings.lesson_price;
      if (settings.series_price !== undefined) dbRow.price_series = settings.series_price;
      if (settings.lesson_price_popular !== undefined) dbRow.price_lesson_popular = settings.lesson_price_popular;
      if (settings.popular_rabbi_min_lessons !== undefined) dbRow.popular_rabbi_min_lessons = settings.popular_rabbi_min_lessons;
      if (settings.series_price_mid !== undefined) dbRow.price_series_mid = settings.series_price_mid;
      if (settings.series_price_large !== undefined) dbRow.price_series_large = settings.series_price_large;
      if (settings.series_mid_threshold !== undefined) dbRow.series_mid_threshold = settings.series_mid_threshold;
      if (settings.series_large_threshold !== undefined) dbRow.series_large_threshold = settings.series_large_threshold;

      const { data: existing } = await supabase
        .from("dedication_settings" as never)
        .select("id")
        .maybeSingle();
      const row = existing as unknown as { id: number } | null;
      if (row?.id !== undefined && row?.id !== null) {
        const { error } = await supabase
          .from("dedication_settings" as never)
          .update(dbRow as never)
          .eq("id" as never, row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dedication_settings" as never)
          .insert(dbRow as never);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dedication-settings"] }),
  });
}

// ---------------------------------------------------------------------------
// תמחור דיפרנציאלי — חישוב מחיר בפועל לשיעור/סדרה נתונים.
// משקף 1:1 את computeDedicationPrice בשרת (api/grow/create-payment.ts) —
// הלקוח מציג, השרת אוכף. אם משנים כלל — לשנות בשני המקומות.
// ---------------------------------------------------------------------------

export interface DedicationPricing {
  lessonPrice: number;
  seriesPrice: number;
  isPopularRabbi: boolean;
  seriesLessonCount: number;
}

export function useDedicationPricing(lessonId?: string, seriesId?: string) {
  const { data: settings } = useDedicationSettings();
  return useQuery({
    queryKey: ["dedication-pricing", lessonId ?? null, seriesId ?? null, settings],
    queryFn: async (): Promise<DedicationPricing> => {
      const s = settings ?? FALLBACK_SETTINGS;
      let isPopularRabbi = false;
      let seriesLessonCount = 0;

      if (lessonId) {
        try {
          const { data: lesson } = await supabase
            .from("lessons")
            .select("rabbi_id")
            .eq("id", lessonId)
            .maybeSingle();
          const rabbiId = (lesson as unknown as { rabbi_id: string | null })?.rabbi_id;
          if (rabbiId) {
            const { data: rabbi } = await supabase
              .from("rabbis")
              .select("lesson_count")
              .eq("id", rabbiId)
              .maybeSingle();
            isPopularRabbi =
              Number((rabbi as unknown as { lesson_count: number | null })?.lesson_count ?? 0) >=
              s.popular_rabbi_min_lessons;
          }
        } catch {
          /* מחיר בסיס כברירת מחדל */
        }
      }

      if (seriesId) {
        try {
          const { data: series } = await supabase
            .from("series")
            .select("lesson_count")
            .eq("id", seriesId)
            .maybeSingle();
          seriesLessonCount = Number(
            (series as unknown as { lesson_count: number | null })?.lesson_count ?? 0
          );
        } catch {
          /* מחיר בסיס כברירת מחדל */
        }
      }

      const lessonPrice = isPopularRabbi ? s.lesson_price_popular : s.lesson_price;
      let seriesPrice = s.series_price;
      if (seriesLessonCount >= s.series_large_threshold) seriesPrice = s.series_price_large;
      else if (seriesLessonCount >= s.series_mid_threshold) seriesPrice = s.series_price_mid;

      return { lessonPrice, seriesPrice, isPopularRabbi, seriesLessonCount };
    },
    enabled: !!settings && (!!lessonId || !!seriesId),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
}
