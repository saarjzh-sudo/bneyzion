/**
 * useContentSliders — סליידרים מוגדרי-אדמין (רמה 26ד, יואב 13:25).
 *
 * טבלת content_sliders: כל שורה = סליידר על צומת בעץ ה-series (סדרה או
 * קטגוריה) בדף הבית או באגף המורים. השיעורים: הצומת עצמו + ילדיו הישירים,
 * חדשים-קודם, גיוון עד 2 לסדרה, מקס' 12 (אותו כלל כמו סליידרי דף-הבית).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContentSlider {
  id: string;
  title: string;
  eyebrow: string | null;
  placement: "home" | "teachers";
  source_id: string;
  sort_order: number;
  is_active: boolean;
  sourceTitle?: string | null;
}

export function useContentSliders(placement?: "home" | "teachers") {
  return useQuery<ContentSlider[]>({
    queryKey: ["content-sliders", placement ?? "all"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let q = (supabase as any)
        .from("content_sliders")
        .select("id, title, eyebrow, placement, source_id, sort_order, is_active, series:source_id(title)")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (placement) q = q.eq("placement", placement).eq("is_active", true);
      const { data, error } = await q;
      // הטבלה עוד לא קיימת (קוד נפרס לפני DB)? — אין סליידרים, בלי לשבור את הדף
      if (error) return [];
      return ((data ?? []) as any[]).map((r) => ({ ...r, sourceTitle: r.series?.title ?? null }));
    },
  });
}

export interface SliderLessonItem {
  id: string;
  title: string;
  content_type: string | null;
  video_url: string | null;
  audio_url: string | null;
  attachment_url: string | null;
  series_id: string | null;
  rabbiName: string | null;
}

/** שיעורי הסליידר: הצומת + ילדיו הישירים, published בלבד, מגוון, עד 12. */
export function useSliderLessons(sourceId: string | undefined) {
  return useQuery<SliderLessonItem[]>({
    queryKey: ["content-slider-lessons", sourceId],
    enabled: !!sourceId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data: children } = await (supabase as any)
        .from("series")
        .select("id")
        .eq("parent_id", sourceId!);
      const ids = [sourceId!, ...((children ?? []) as any[]).map((c) => c.id)];
      const { data, error } = await (supabase as any)
        .from("lessons")
        .select("id, title, content_type, video_url, audio_url, attachment_url, series_id, rabbis!lessons_rabbi_id_fkey(name)")
        .in("series_id", ids)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      const perSeries: Record<string, number> = {};
      const out: SliderLessonItem[] = [];
      for (const l of (data ?? []) as any[]) {
        const key = l.series_id || l.id;
        perSeries[key] = (perSeries[key] || 0) + 1;
        if (perSeries[key] <= 2) out.push({ ...l, rabbiName: l.rabbis?.name ?? null });
        if (out.length >= 12) break;
      }
      return out;
    },
  });
}

// ── אדמין ─────────────────────────────────────────────────────────────────
export function useCreateSlider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; eyebrow: string | null; placement: string; source_id: string; sort_order: number }) => {
      const { error } = await (supabase as any).from("content_sliders").insert([input]);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-sliders"] }),
  });
}

export function useUpdateSlider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ContentSlider>) => {
      const { error } = await (supabase as any).from("content_sliders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-sliders"] }),
  });
}

export function useDeleteSlider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("content_sliders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-sliders"] }),
  });
}

/** חיפוש סדרה/קטגוריה לבורר באדמין */
export function useSeriesSearch(term: string) {
  return useQuery({
    queryKey: ["series-search", term],
    enabled: term.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("series")
        .select("id, title, lesson_count, status")
        .ilike("title", `%${term.trim()}%`)
        .in("status", ["active", "published", "category"])
        .order("lesson_count", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data ?? []) as { id: string; title: string; lesson_count: number | null; status: string }[];
    },
  });
}
