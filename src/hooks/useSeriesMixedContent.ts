import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SeriesRow {
  type: "series";
  id: string;
  title: string;
  rabbiName: string | null;
  totalLessons: number;
  sortOrder: number;
}

export interface LessonRow {
  type: "lesson";
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  videoUrl: string | null;
  audioUrl: string | null;
  rabbiName: string | null;
  sourceType: string;
}

export type MixedContentRow = SeriesRow | LessonRow;

/**
 * Matches the original site display:
 * - Leaf series (no children) → shown as "סדרה" rows
 * - Non-leaf series (have children) → their direct lessons are inlined
 * - Root's direct lessons → shown as individual rows
 */
export function useSeriesMixedContent(seriesId: string | undefined) {
  return useQuery({
    queryKey: ["series-mixed-content", seriesId],
    enabled: !!seriesId,
    queryFn: async () => {
      // 1. Get ALL descendants recursively
      const { data: descendants, error: descError } = await supabase
        .rpc("get_series_descendant_ids", { root_id: seriesId! });
      if (descError) throw descError;

      const descList = (descendants as any[]) ?? [];

      // Build maps
      const allSeriesIds = [seriesId!, ...descList.map((d: any) => d.series_id)];
      const parentMap = new Map<string, string>();
      const titleMap = new Map<string, string>();
      for (const d of descList) {
        parentMap.set(d.series_id, d.parent_series_id);
        titleMap.set(d.series_id, d.series_title);
      }

      // 2. Get lesson counts and child counts for all descendants
      const childCountMap = new Map<string, number>();
      // Count children for each series
      for (const d of descList) {
        const pid = d.parent_series_id;
        childCountMap.set(pid, (childCountMap.get(pid) ?? 0) + 1);
      }
      // Root also
      const rootChildCount = descList.filter((d: any) => d.parent_series_id === seriesId).length;

      // Get lesson counts and sort_order for all series
      const lessonCountMap = new Map<string, number>();
      const sortOrderMap = new Map<string, number>();
      const chunkSize = 30;
      for (let i = 0; i < allSeriesIds.length; i += chunkSize) {
        const chunk = allSeriesIds.slice(i, i + chunkSize);
        const { data: seriesData } = await supabase
          .from("series")
          .select("id, lesson_count, rabbi_id, rabbis(name), sort_order")
          .in("id", chunk);
        for (const s of seriesData ?? []) {
          lessonCountMap.set(s.id, s.lesson_count);
          sortOrderMap.set(s.id, (s as any).sort_order ?? 0);
        }
      }

      // 3. Classify each descendant
      // Leaf = has no children in our descendants list AND has lessons
      // Non-leaf = has children → inline its direct lessons
      const leafSeriesIds: string[] = [];
      const nonLeafSeriesIds: string[] = [seriesId!]; // root is always non-leaf (we expand it)

      for (const d of descList) {
        const hasChildren = (childCountMap.get(d.series_id) ?? 0) > 0;
        const hasLessons = (lessonCountMap.get(d.series_id) ?? 0) > 0;

        if (!hasChildren && hasLessons) {
          leafSeriesIds.push(d.series_id);
        } else if (hasChildren) {
          nonLeafSeriesIds.push(d.series_id);
        }
        // Skip series with no children AND no lessons
      }

      // 4. Compute recursive lesson counts for leaf series
      // (leaf series are simple - just their own lesson_count)

      // 5. Fetch rabbi info for leaf series
      const leafSeriesInfo = new Map<string, { title: string; rabbiName: string | null; lessonCount: number }>();
      for (let i = 0; i < leafSeriesIds.length; i += chunkSize) {
        const chunk = leafSeriesIds.slice(i, i + chunkSize);
        const { data: seriesData } = await supabase
          .from("series")
          .select("id, title, lesson_count, rabbis(name)")
          .in("id", chunk);
        for (const s of seriesData ?? []) {
          leafSeriesInfo.set(s.id, {
            title: s.title,
            rabbiName: (s as any).rabbis?.name ?? null,
            lessonCount: s.lesson_count,
          });
        }
      }

      // 6. Fetch direct lessons from all non-leaf series (to inline them)
      const allInlineLessons: LessonRow[] = [];
      const seenLessonIds = new Set<string>();
      for (let i = 0; i < nonLeafSeriesIds.length; i += chunkSize) {
        const chunk = nonLeafSeriesIds.slice(i, i + chunkSize);
        const { data: lessons, error } = await supabase
          .from("lessons")
          .select("id, title, description, duration, video_url, audio_url, rabbi_id, source_type, series_id, rabbis(name)")
          .in("series_id", chunk)
          .eq("status", "published")
          .order("published_at", { ascending: true })
          .limit(1000);
        if (error) throw error;

        for (const l of lessons ?? []) {
          seenLessonIds.add(l.id);
          allInlineLessons.push({
            type: "lesson",
            id: l.id,
            title: l.title,
            description: l.description,
            duration: l.duration,
            videoUrl: l.video_url,
            audioUrl: l.audio_url,
            rabbiName: (l as any).rabbis?.name ?? null,
            sourceType: l.source_type,
          });
        }
      }

      // 6b. Also fetch lessons tagged via lesson_topics for a matching topic
      // Look up the series title to find a matching topic
      const { data: seriesInfo } = await supabase
        .from("series")
        .select("title")
        .eq("id", seriesId!)
        .single();

      if (seriesInfo?.title) {
        const { data: matchingTopic } = await supabase
          .from("topics")
          .select("id")
          .eq("name", seriesInfo.title)
          .maybeSingle();

        if (matchingTopic) {
          const { data: taggedLessons } = await supabase
            .from("lesson_topics")
            .select("lesson_id, lessons!inner(id, title, description, duration, video_url, audio_url, source_type, status, rabbis(name))")
            .eq("topic_id", matchingTopic.id)
            .eq("lessons.status", "published")
            .limit(500);

          for (const tl of taggedLessons ?? []) {
            const l = (tl as any).lessons;
            if (!l || seenLessonIds.has(l.id)) continue;
            seenLessonIds.add(l.id);
            allInlineLessons.push({
              type: "lesson",
              id: l.id,
              title: l.title,
              description: l.description,
              duration: l.duration,
              videoUrl: l.video_url,
              audioUrl: l.audio_url,
              rabbiName: l.rabbis?.name ?? null,
              sourceType: l.source_type,
            });
          }
        }
      }

      // 7. Build final mixed list: series first, then lessons
      const rows: MixedContentRow[] = [];

      // Add leaf series as "סדרה" rows
      for (const sid of leafSeriesIds) {
        const info = leafSeriesInfo.get(sid);
        if (!info) continue;
        rows.push({
          type: "series",
          id: sid,
          title: info.title,
          rabbiName: info.rabbiName,
          totalLessons: info.lessonCount,
          sortOrder: sortOrderMap.get(sid) ?? 0,
        });
      }

      // Sort series by sort_order, then alphabetically as fallback
      rows.sort((a, b) => {
        const aSort = a.type === "series" ? a.sortOrder : 0;
        const bSort = b.type === "series" ? b.sortOrder : 0;
        if (aSort !== bSort) return aSort - bSort;
        return a.title.localeCompare(b.title, 'he');
      });

      // Group lessons by rabbi, maintaining internal order within each group
      allInlineLessons.sort((a, b) => {
        const aName = a.rabbiName ?? 'תתת'; // nulls last
        const bName = b.rabbiName ?? 'תתת';
        if (aName !== bName) return aName.localeCompare(bName, 'he');
        return 0; // preserve original published_at order within same rabbi
      });
      rows.push(...allInlineLessons);

      return rows;
    },
  });
}
