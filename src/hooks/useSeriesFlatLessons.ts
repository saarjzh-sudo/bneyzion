import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FlatLessonRow {
  id: string;
  title: string;
  duration: number | null;
  video_url: string | null;
  audio_url: string | null;
  rabbi_name: string | null;
  series_id: string | null;
  series_title: string | null;
}

/**
 * Fetches ALL lessons that belong to a series and ALL its descendants (recursive),
 * producing a flat list grouped by immediate child series title.
 */
export function useSeriesFlatLessons(seriesId: string | undefined) {
  return useQuery({
    queryKey: ["series-flat-lessons", seriesId],
    enabled: !!seriesId,
    queryFn: async () => {
      // 1. Get ALL descendant series using recursive RPC
      const { data: descendants, error: descError } = await supabase
        .rpc("get_series_descendant_ids", { root_id: seriesId! });
      if (descError) throw descError;

      // Build a map: series_id -> its top-level child bucket title
      // We need to figure out which top-level child each descendant belongs to
      const childOfRoot = new Map<string, { id: string; title: string }>();
      const seriesMap = new Map<string, { title: string; parentId: string | null }>();

      for (const d of (descendants as any[]) ?? []) {
        seriesMap.set(d.series_id, { title: d.series_title, parentId: d.parent_series_id });
        // Direct children of root
        if (d.parent_series_id === seriesId) {
          childOfRoot.set(d.series_id, { id: d.series_id, title: d.series_title });
        }
      }

      // For each descendant, trace up to find the top-level child of root
      function getTopLevelChild(sid: string): { id: string; title: string } | null {
        if (childOfRoot.has(sid)) return childOfRoot.get(sid)!;
        const entry = seriesMap.get(sid);
        if (!entry || !entry.parentId) return null;
        return getTopLevelChild(entry.parentId);
      }

      // Collect all series IDs to query (parent + all descendants)
      const allDescendantIds = (descendants as any[])?.map((d: any) => d.series_id) ?? [];
      const allSeriesIds = [seriesId!, ...allDescendantIds];

      // 2. Fetch all lessons from all these series in chunks
      const allLessons: FlatLessonRow[] = [];
      const chunkSize = 30;
      for (let i = 0; i < allSeriesIds.length; i += chunkSize) {
        const chunk = allSeriesIds.slice(i, i + chunkSize);
        const { data: lessons, error } = await supabase
          .from("lessons")
          .select("id, title, duration, video_url, audio_url, rabbi_id, series_id, rabbis(name)")
          .in("series_id", chunk)
          .order("published_at", { ascending: true })
          .limit(1000);

        if (error) throw error;

        for (const l of lessons ?? []) {
          const topChild = l.series_id === seriesId
            ? null
            : getTopLevelChild(l.series_id!);

          allLessons.push({
            id: l.id,
            title: l.title,
            duration: l.duration,
            video_url: l.video_url,
            audio_url: l.audio_url,
            rabbi_name: (l as any).rabbis?.name ?? null,
            series_id: l.series_id,
            series_title: topChild?.title ?? null,
          });
        }
      }

      // Group lessons by rabbi name
      allLessons.sort((a, b) => {
        const aName = a.rabbi_name ?? 'תתת';
        const bName = b.rabbi_name ?? 'תתת';
        if (aName !== bName) return aName.localeCompare(bName, 'he');
        return 0;
      });

      return allLessons;
    },
  });
}
