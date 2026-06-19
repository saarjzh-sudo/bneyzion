/**
 * useTopicsSidebar — fetches the 127 thematic topics that are direct children
 * of the 'themes-root' parent topic, ordered by lesson count descending.
 *
 * These are the pure thematic subjects (דוד המלך, גאולה, מלכות, …) and NOT
 * the structural book-tree topics (נביאים / תורה / כתובים which live under
 * a different parent and would pollute the tab with enormous counts).
 *
 * The query mirrors:
 *   SELECT t.id, t.name, t.slug, COUNT(lt.lesson_id) n
 *   FROM topics t
 *   JOIN topics p ON t.parent_id = p.id
 *   LEFT JOIN lesson_topics lt ON lt.topic_id = t.id
 *   WHERE p.slug = 'themes-root'
 *   GROUP BY t.id
 *   ORDER BY n DESC
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TopicSidebarItem {
  id: string;
  name: string;
  slug: string;
  lessonCount: number;
  sortOrder: number | null;
}

export function useTopicsSidebar() {
  return useQuery<TopicSidebarItem[]>({
    queryKey: ["topics-sidebar-themes"],
    queryFn: async () => {
      // Step 1: find the themes-root parent id
      const { data: parent, error: parentError } = await supabase
        .from("topics")
        .select("id")
        .eq("slug", "themes-root")
        .single();

      if (parentError || !parent) {
        // If themes-root doesn't exist yet, return empty rather than crashing
        console.warn("[useTopicsSidebar] themes-root not found:", parentError?.message);
        return [];
      }

      // Step 2: fetch children with aggregated lesson counts via RPC-less approach.
      // PostgREST doesn't support direct GROUP BY, so we fetch children then
      // aggregate counts via the lesson_topics table separately.
      const { data: children, error: childError } = await supabase
        .from("topics")
        .select("id, name, slug, sort_order")
        .eq("parent_id", parent.id)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name");

      if (childError) throw childError;
      if (!children || children.length === 0) return [];

      // Step 3: fetch lesson counts using paginated .range() to bypass PostgREST 1000-row cap.
      // Uses the same dual-audience filter as TopicPage (§0.3) so sidebar badge == page count.
      // referencedTable: "lessons" is required for .or() on an embedded join (avoids PGRST100).
      const childIds = children.map((c) => c.id);
      const countRows: { topic_id: string }[] = [];
      const PAGE = 2000;
      for (let start = 0; ; start += PAGE) {
        const { data: page, error: pageErr } = await supabase
          .from("lesson_topics")
          .select("topic_id, lessons!inner(status, audience_tags)")
          .in("topic_id", childIds)
          .eq("lessons.status", "published")
          // Saar 19.6 dual-audience: count public + dual (teachers+general) lessons; teacher-exclusive
          // hidden. Keeps the sidebar topic-counts consistent with the dual-inclusive TopicPage.
          .or("audience_tags.cs.{general}", { referencedTable: "lessons" })
          .range(start, start + PAGE - 1);
        if (pageErr || !page || page.length === 0) break;
        for (const r of page as any[]) countRows.push({ topic_id: r.topic_id });
        if (page.length < PAGE) break;
      }

      // Step 3b (Saar 19.6): ALSO count series_topics — a topic page renders SERIES cards too
      // (e.g. "האזנה לפסוקים" = 0 lessons + 55 series). Counting only lessons under-counted those
      // topics to 0/near-0. Badge must equal the page item count = lessons + series.
      const seriesCountRows: { topic_id: string }[] = [];
      for (let start = 0; ; start += PAGE) {
        const { data: page, error: pageErr } = await (supabase as any)
          .from("series_topics")
          .select("topic_id, series!inner(status, audience_tags)")
          .in("topic_id", childIds)
          .in("series.status", ["published", "active"])
          .or("audience_tags.cs.{general}", { referencedTable: "series" })
          .range(start, start + PAGE - 1);
        if (pageErr || !page || page.length === 0) break;
        for (const r of page as any[]) seriesCountRows.push({ topic_id: r.topic_id });
        if (page.length < PAGE) break;
      }

      // Build a count map (lessons + series)
      const countMap: Record<string, number> = {};
      for (const row of [...countRows, ...seriesCountRows]) {
        const tid: string = row.topic_id;
        countMap[tid] = (countMap[tid] || 0) + 1;
      }

      // Merge and sort by sort_order ASC (curated 1..127 from old site), then name.
      // lesson count is kept for badge display but does NOT drive order.
      const result: TopicSidebarItem[] = children.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        lessonCount: countMap[c.id] || 0,
        sortOrder: (c as any).sort_order ?? null,
      }));

      result.sort((a, b) => {
        const aOrd = a.sortOrder ?? 99999;
        const bOrd = b.sortOrder ?? 99999;
        if (aOrd !== bOrd) return aOrd - bOrd;
        return a.name.localeCompare(b.name, "he");
      });
      return result;
    },
    staleTime: 1000 * 60 * 10, // 10 min — topics change rarely
  });
}
