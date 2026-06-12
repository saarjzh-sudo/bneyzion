import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns true if the string looks like a UUID (legacy URL) */
export function isUUID(s: string | undefined): boolean {
  return !!s && UUID_RE.test(s);
}

/**
 * Fetch a rabbi by slug (primary path).
 * Used by RabbiPage when the URL param is a slug.
 */
export function useRabbiBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["rabbi-slug", slug],
    enabled: !!slug && !isUUID(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rabbis")
        .select("*")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Fetch a rabbi by UUID (legacy path — used for redirects).
 * RabbiPage calls this when the URL param looks like a UUID,
 * reads the slug, and then does a client-side navigate.
 */
export function useRabbi(id: string | undefined) {
  return useQuery({
    queryKey: ["rabbi", id],
    enabled: !!id && isUUID(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rabbis")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useRabbiSeries(rabbiId: string | undefined) {
  return useQuery({
    queryKey: ["rabbi-series", rabbiId],
    enabled: !!rabbiId,
    queryFn: async () => {
      // R-RAB2 fix: show only series OWNED by this rabbi (rabbi_id = this rabbi).
      // The "guest series" second query inflated the list with giant shared containers
      // (e.g. פרשת השבוע for any rabbi with even 1 lesson there).
      // R-RAB3 fix: exclude teacher-tagged series from the public rabbi page.
      const { data: owned, error: ownedErr } = await supabase
        .from("series")
        .select("id, title, description, image_url, lesson_count, status, sort_order, audience_tags")
        .eq("rabbi_id", rabbiId!)
        .in("status", ["active", "published"])
        .not("audience_tags", "cs", '{"teachers"}')
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("lesson_count", { ascending: false });
      if (ownedErr) throw ownedErr;

      // Future: if rabbi_page_items rows exist for this rabbi, the page component
      // will use them for a curated ordered view (series/lesson/qa kinds).
      // This hook returns owned series as the fallback.
      return owned ?? [];
    },
  });
}

/**
 * useRabbiPageItems — reads curated page items for a rabbi from the
 * rabbi_page_items table. Returns null when no rows exist (caller falls
 * back to useRabbiSeries + useRabbiLessons). Table created via migration
 * in a future session; until then, query will return empty → fallback always used.
 */
export function useRabbiPageItems(rabbiId: string | undefined) {
  return useQuery({
    queryKey: ["rabbi-page-items", rabbiId],
    enabled: !!rabbiId,
    queryFn: async () => {
      // Table may not exist yet — catch the 42P01 error gracefully
      const { data, error } = await (supabase as any)
        .from("rabbi_page_items")
        .select("id, kind, series_id, lesson_id, sort_order, series(id,title,image_url,lesson_count), lessons(id,title,duration,audio_url,video_url,attachment_url)")
        .eq("rabbi_id", rabbiId!)
        .lt("sort_order", 9000) // 9000+ = parked rows (old-page extras kept for audit, not rendered)
        .order("sort_order", { ascending: true });
      if (error) {
        // Table doesn't exist yet — return empty (triggers fallback)
        if (error.code === "42P01" || error.message?.includes("does not exist")) return [];
        throw error;
      }
      return (data ?? []) as any[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useRabbiLessons(rabbiId: string | undefined) {
  return useQuery({
    queryKey: ["rabbi-lessons", rabbiId],
    enabled: !!rabbiId,
    queryFn: async () => {
      // R-RAB1 fix: fetch ALL lessons (no limit(60)/slice(20)).
      // Old-site rabbi page lists the rabbi's content exhaustively.
      // Ordered: bible_chapter (nulls last) then title — consistent with series page.
      // No audience filter here — a rabbi's own lessons are expected in his page;
      // teacher-tagged content shows here intentionally (it's HIS content).
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, duration, thumbnail_url, published_at, audio_url, video_url, attachment_url, bible_chapter, series(id, title)")
        .eq("rabbi_id", rabbiId!)
        .eq("status", "published")
        .order("bible_chapter", { ascending: true, nullsFirst: false })
        .order("title", { ascending: true });
      if (error) throw error;
      // Dedup by enriched key: norm(title)|norm(series_title)|basename(attachment)|audio_url|video_url
      // This absorbs COPY-duplicates from the migration while keeping genuinely
      // distinct same-title lessons (different series, different media).
      const seen = new Set<string>();
      return (data || []).filter((l: any) => {
        const normTitle = (l.title || "").trim().replace(/[״"'׳`|]/g, "").replace(/\s+/g, " ");
        const seriesKey = ((l.series as any)?.title || "").trim().replace(/[״"'׳`|]/g, "").replace(/\s+/g, " ");
        const attBase = l.attachment_url ? l.attachment_url.split("/").pop()?.split("?")[0] || "" : "";
        const key = `${normTitle}|${seriesKey}|${attBase}|${l.audio_url || ""}|${l.video_url || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
  });
}
