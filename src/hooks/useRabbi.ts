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
      // First: series directly owned by this rabbi
      const { data: owned, error: ownedErr } = await supabase
        .from("series")
        .select("id, title, description, image_url, lesson_count, status, sort_order")
        .eq("rabbi_id", rabbiId!)
        .in("status", ["active", "published"])
        .order("sort_order", { ascending: true });
      if (ownedErr) throw ownedErr;

      // Second: series where this rabbi has published lessons but series.rabbi_id ≠ this rabbi
      // (handles guest-lecturer and multi-rabbi series like פרשת השבוע)
      const { data: lessons, error: lessonsErr } = await supabase
        .from("lessons")
        .select("series_id")
        .eq("rabbi_id", rabbiId!)
        .eq("status", "published")
        .not("series_id", "is", null);
      if (lessonsErr) throw lessonsErr;

      const ownedIds = new Set((owned ?? []).map((s) => s.id));
      const extraIds = [...new Set((lessons ?? []).map((l) => l.series_id as string))]
        .filter((sid) => sid && !ownedIds.has(sid));

      let extra: typeof owned = [];
      if (extraIds.length > 0) {
        const { data: extraData, error: extraErr } = await supabase
          .from("series")
          .select("id, title, description, image_url, lesson_count, status, sort_order")
          .in("id", extraIds)
          .in("status", ["active", "published"]);
        if (extraErr) throw extraErr;
        extra = extraData ?? [];
      }

      // Merge: owned first, then extra sorted by lesson_count desc
      return [
        ...(owned ?? []),
        ...extra.sort((a, b) => (b.lesson_count ?? 0) - (a.lesson_count ?? 0)),
      ];
    },
  });
}

export function useRabbiLessons(rabbiId: string | undefined) {
  return useQuery({
    queryKey: ["rabbi-lessons", rabbiId],
    enabled: !!rabbiId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, duration, thumbnail_url, published_at, series(id, title)")
        .eq("rabbi_id", rabbiId!)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      // Collapse duplicate rows (the migration cross-listed the same lesson into several
      // series, so a rabbi's lesson can appear multiple times). Dedup by normalized title,
      // keep the first (newest), cap at 20.
      const seen = new Set<string>();
      const deduped = (data || []).filter((l) => {
        const key = (l.title || "").trim().replace(/[״"'׳`|]/g, "").replace(/\s+/g, " ");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return deduped.slice(0, 20);
    },
  });
}
