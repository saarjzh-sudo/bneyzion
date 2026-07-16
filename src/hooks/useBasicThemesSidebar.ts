/**
 * useBasicThemesSidebar — fetches the curated "40 הנושאים הבסיסיים בתנ״ך" set
 * (Rav Yoav Uriel's request, 5.7.2026): a SMALL, hand-picked list of the most
 * foundational Tanakh themes (גוג ומגוג, ירושלים, גלות וגאולה, משיח, גבורה,
 * תשובה, ברית, מנהיגות, אמונה, מקדש, מלכות, חטא ותיקון, …).
 *
 * This is a SEPARATE root from 'themes-root' (the pre-existing 126-topic full
 * thematic taxonomy that already powers the rest of the "נושאים בתנ״ך" tab).
 * Reusing the same root would have mixed a curated "most basic" list into a
 * much larger uncurated one — kept as two distinct sections instead:
 *   1. This hook → curated 40 (shown first, prominent)
 *   2. useTopicsSidebar → the existing full 126-topic list (shown below, "עוד נושאים")
 *
 * Root topic: topics.slug = 'biblical-themes-root' (created 6.7.2026, 40 children).
 * Lessons are linked via lesson_topics exactly like the existing taxonomy, so
 * navigation stays on the SAME route: /topic/:slug (TopicPage.tsx, unchanged).
 *
 * Zero-count tags are filtered out here (never shown) — one curated tag
 * ("עם סגולה וייעוד ישראל") has 0 PUBLIC lessons (its only content match was
 * teacher-exclusive) and is intentionally hidden by this filter.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BasicThemeItem {
  id: string;
  name: string;
  slug: string;
  lessonCount: number;
  sortOrder: number | null;
}

const ROOT_SLUG = "biblical-themes-root";

export function useBasicThemesSidebar() {
  return useQuery<BasicThemeItem[]>({
    queryKey: ["basic-themes-sidebar"],
    queryFn: async () => {
      const { data: parent, error: parentError } = await supabase
        .from("topics")
        .select("id")
        .eq("slug", ROOT_SLUG)
        .single();

      if (parentError || !parent) {
        console.warn("[useBasicThemesSidebar] biblical-themes-root not found:", parentError?.message);
        return [];
      }

      // רמה 20: תגית שיואב העביר ל"אופי הלימוד" (is_learning_style) יורדת מכאן.
      const { data: children, error: childError } = await (supabase as any)
        .from("topics")
        .select("id, name, slug, sort_order")
        .eq("parent_id", parent.id)
        .eq("is_learning_style", false)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name");

      if (childError) throw childError;
      if (!children || children.length === 0) return [];

      // Same dual-audience-safe counting as useTopicsSidebar: public (general) +
      // dual-tagged (teachers+general) lessons count; teacher-EXCLUSIVE lessons don't.
      const childIds = children.map((c) => c.id);
      const countRows: { topic_id: string }[] = [];
      const PAGE = 2000;
      for (let start = 0; ; start += PAGE) {
        const { data: page, error: pageErr } = await supabase
          .from("lesson_topics")
          .select("topic_id, lessons!inner(status, audience_tags)")
          .in("topic_id", childIds)
          .eq("lessons.status", "published")
          .or("audience_tags.cs.{general}", { referencedTable: "lessons" })
          .range(start, start + PAGE - 1);
        if (pageErr || !page || page.length === 0) break;
        for (const r of page as any[]) countRows.push({ topic_id: r.topic_id });
        if (page.length < PAGE) break;
      }

      const countMap: Record<string, number> = {};
      for (const row of countRows) {
        countMap[row.topic_id] = (countMap[row.topic_id] || 0) + 1;
      }

      const result: BasicThemeItem[] = children
        .map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          lessonCount: countMap[c.id] || 0,
          sortOrder: (c as any).sort_order ?? null,
        }))
        // Never show a tag with 0 public lessons (Saar's rule: 0 lessons = don't display).
        .filter((c) => c.lessonCount > 0);

      result.sort((a, b) => {
        const aOrd = a.sortOrder ?? 99999;
        const bOrd = b.sortOrder ?? 99999;
        if (aOrd !== bOrd) return aOrd - bOrd;
        return a.name.localeCompare(b.name, "he");
      });
      return result;
    },
    staleTime: 1000 * 60 * 10,
  });
}
