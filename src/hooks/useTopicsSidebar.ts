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
        .select("id, name, slug")
        .eq("parent_id", parent.id)
        .order("name");

      if (childError) throw childError;
      if (!children || children.length === 0) return [];

      // Step 3: fetch lesson counts — filtered to published + non-teacher lessons so the
      // number in the sidebar matches what TopicPage actually renders (R-TOP3 / R-SB3 fix).
      const childIds = children.map((c) => c.id);
      const { data: counts, error: countError } = await supabase
        .from("lesson_topics")
        .select("topic_id, lessons!inner(status, audience_tags)")
        .in("topic_id", childIds)
        .eq("lessons.status", "published")
        .not("lessons.audience_tags", "cs", "{teachers}");

      if (countError) throw countError;

      // Build a count map
      const countMap: Record<string, number> = {};
      for (const row of (counts || []) as any[]) {
        const tid: string = row.topic_id;
        countMap[tid] = (countMap[tid] || 0) + 1;
      }

      // Merge and sort by count desc
      const result: TopicSidebarItem[] = children.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        lessonCount: countMap[c.id] || 0,
      }));

      result.sort((a, b) => b.lessonCount - a.lessonCount);
      return result;
    },
    staleTime: 1000 * 60 * 10, // 10 min — topics change rarely
  });
}
