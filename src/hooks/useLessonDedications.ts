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
export type DedicationType = "iluy_neshama" | "refua" | "memory";

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
  memory: "לזכרון",
};

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
      return (data || []) as unknown as LessonDedication[];
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
      return (data || []) as unknown as LessonDedication[];
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
        payment_asmachta: ded.payment_asmachta ?? null,
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
      return (data || []) as unknown as LessonDedication[];
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
}

const FALLBACK_SETTINGS: DedicationSettings = {
  lesson_price: 600,
  series_price: 1800,
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
        return {
          lesson_price: Number(row.lesson_price ?? FALLBACK_SETTINGS.lesson_price),
          series_price: Number(row.series_price ?? FALLBACK_SETTINGS.series_price),
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
    mutationFn: async (settings: DedicationSettings) => {
      const { data: existing } = await supabase
        .from("dedication_settings" as never)
        .select("id")
        .maybeSingle();
      const row = existing as unknown as { id: string } | null;
      if (row?.id) {
        const { error } = await supabase
          .from("dedication_settings" as never)
          .update(settings as never)
          .eq("id" as never, row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dedication_settings" as never)
          .insert(settings as never);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dedication-settings"] }),
  });
}
