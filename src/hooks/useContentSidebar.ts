import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sortByBiblicalOrder } from "@/lib/biblicalOrder";
import { sortByCustomOrder } from "@/lib/sidebarOrder";
import type { SidebarCategory, SidebarBook, SidebarChild, SeriesRow, LessonRow, RabbiInfo } from "@/hooks/useTeachersWing";

// Re-export types
export type { SidebarCategory, SidebarBook, SidebarChild, SeriesRow, LessonRow, RabbiInfo };

export interface ExtraSection {
  id: string;
  title: string;
  children: { id: string; title: string; parent_id?: string | null }[];
}

// Root category IDs for the full content tree
const ROOT_IDS = {
  torah: "bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b",
  neviim: "a0472c9f-8212-44ff-8937-ace5fea4b4dc",
  ketuvim: "5cdd770c-9593-4b0d-9f9e-cda50cf5ef41",
  howToLearn: "62590949-6187-4e17-b84d-65a518467521",
  generalTopics: "2d6d28c1-3c5c-4d61-9283-410bc56cd351",
  moadim: "92130154-e96a-4f98-b032-5a20ac385f63",
  haftarot: "3327c721-7bc9-471c-878f-0b3aef98b090",
  riddles: "c852edd8-d959-4c8d-bf7e-17b5881275fa",
  tools: "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7",
  yemeiIyun: "f4040001-0001-4000-8000-000000000000",
  livuyTatim: "7cbd261e-03b0-43da-a708-e8ae4402105f",
};

const TORAH_BOOK_ORDER = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"];

export function useContentSidebar() {
  const sidebarQuery = useQuery({
    queryKey: ["content-sidebar"],
    queryFn: async () => {
      const catIds = [ROOT_IDS.torah, ROOT_IDS.neviim, ROOT_IDS.ketuvim];

      // Fetch books under Torah/Ketuvim — active or published (Ketuvim uses published/active for real books)
      const { data: torahKetuvimBooks } = await supabase
        .from("series")
        .select("id, title, parent_id")
        .in("parent_id", [ROOT_IDS.torah, ROOT_IDS.ketuvim])
        .in("status", ["active", "published", "category"])
        .order("title");

      // Fetch books under Neviim — only "category" status (all real Neviim books are category;
      // draft/active non-category entries here are ghost series that must be hidden)
      const { data: neviimBooks } = await supabase
        .from("series")
        .select("id, title, parent_id")
        .eq("parent_id", ROOT_IDS.neviim)
        .eq("status", "category")
        .order("title");

      const allBooks = [...(torahKetuvimBooks || []), ...(neviimBooks || [])];

      if (!allBooks.length) return { categories: [], extraSections: [] };

      // Fetch children of Torah books (parshiot etc.)
      const torahBookIds = allBooks
        .filter((b) => b.parent_id === ROOT_IDS.torah)
        .map((b) => b.id);

      const { data: torahChildren } = await supabase
        .from("series")
        .select("id, title, parent_id, sort_order")
        .in("parent_id", torahBookIds)
        .in("status", ["active", "published"])
        // Public tree must never show teacher-wing content (worksheets etc.).
        // Exclude any series whose audience_tags contains 'teachers'.
        .not("audience_tags", "cs", "{teachers}")
        .order("sort_order")
        .order("title");

      // Fetch children of Neviim/Ketuvim books
      const nkBookIds = allBooks
        .filter((b) => b.parent_id === ROOT_IDS.neviim || b.parent_id === ROOT_IDS.ketuvim)
        .map((b) => b.id);

      const { data: nkChildren } = await supabase
        .from("series")
        .select("id, title, parent_id, sort_order")
        .in("parent_id", nkBookIds)
        .in("status", ["active", "published"])
        // Public tree must never show teacher-wing content (worksheets etc.).
        .not("audience_tags", "cs", "{teachers}")
        .order("sort_order")
        .order("title");

      // Fetch children of expandable sections (flat sections: direct children are the leaf series)
      const flatExpandableIds = [
        ROOT_IDS.generalTopics,
        ROOT_IDS.moadim,
        ROOT_IDS.haftarot,
        ROOT_IDS.tools,
        ROOT_IDS.yemeiIyun,
        ROOT_IDS.livuyTatim,
      ];
      const { data: expandableChildren } = await supabase
        .from("series")
        .select("id, title, parent_id, sort_order")
        .in("parent_id", flatExpandableIds)
        .in("status", ["active", "published"])
        .order("sort_order")
        .order("title");

      // "איך לומדים" is a DEEP section: its direct children are sub-category nodes (status=category),
      // and the actual leaf series live 2 levels deep. We fetch ALL descendants via RPC and apply
      // the canonical dedup rule (active/published with lessons preferred; draft-only allowed when no twin).
      const { data: howToLearnDesc } = await supabase.rpc("get_series_descendant_ids", {
        root_id: ROOT_IDS.howToLearn,
      });
      const howToLearnDescIds = (howToLearnDesc || []).map((d: any) => d.series_id as string);
      const { data: howToLearnAll } = howToLearnDescIds.length > 0
        ? await supabase
            .from("series")
            .select("id, title, parent_id, sort_order, status, lesson_count")
            .in("id", howToLearnDescIds)
            .in("status", ["active", "published", "draft"])
            .order("lesson_count", { ascending: false })
            .order("title")
        : { data: [] };

      // Apply canonical dedup for howToLearn children (same rules as useSeriesForNode):
      // normalize quotes in the title key + drop direct-child empty draft placeholders.
      const normHtl = (t: string) => t.trim().replace(/[״"'׳‘’“”`]/g, "").replace(/\s+/g, " ");
      const howToLearnCanonicalMap = new Map<string, { id: string; title: string; parent_id: string | null; sort_order: number | null; status: string; lesson_count: number }>();
      for (const s of (howToLearnAll || [])) {
        if (s.status === "draft" && (s.lesson_count ?? 0) === 0 && s.parent_id === ROOT_IDS.howToLearn) continue;
        const key = normHtl(s.title);
        const existing = howToLearnCanonicalMap.get(key);
        if (!existing) {
          howToLearnCanonicalMap.set(key, s as any);
        } else {
          const existScore = (existing.status !== "draft" ? 2 : 0) + (existing.lesson_count > 0 ? 1 : 0);
          const newScore = (s.status !== "draft" ? 2 : 0) + (s.lesson_count > 0 ? 1 : 0);
          if (newScore > existScore) howToLearnCanonicalMap.set(key, s as any);
        }
      }
      // Sort: active/published with lessons first, drafts last, alphabetical within group
      const howToLearnChildren = Array.from(howToLearnCanonicalMap.values())
        .sort((a, b) => {
          const aScore = (a.status !== "draft" ? 2 : 0) + (a.lesson_count > 0 ? 1 : 0);
          const bScore = (b.status !== "draft" ? 2 : 0) + (b.lesson_count > 0 ? 1 : 0);
          if (bScore !== aScore) return bScore - aScore;
          return a.title.localeCompare(b.title, "he");
        });
      // Add fake parent_id field matching howToLearn root for getChildren() to work
      const howToLearnForSection = howToLearnChildren.map((s) => ({
        id: s.id,
        title: s.title,
        parent_id: ROOT_IDS.howToLearn,
        sort_order: s.sort_order ?? 0,
      }));

      // Build children map
      const childrenByBook = new Map<string, SidebarChild[]>();
      for (const c of [...(torahChildren || []), ...(nkChildren || [])]) {
        const existing = childrenByBook.get(c.parent_id!) || [];
        existing.push({ id: c.id, title: c.title, sortOrder: (c as any).sort_order ?? 0 });
        childrenByBook.set(c.parent_id!, existing);
      }
      // Sort children: if any child has sort_order > 0, use sort_order; otherwise use biblical order
      for (const [key, children] of childrenByBook) {
        const hasManualSort = children.some((c: any) => c.sortOrder > 0);
        if (hasManualSort) {
          children.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.title.localeCompare(b.title, 'he'));
        } else {
          childrenByBook.set(key, sortByBiblicalOrder(children));
        }
      }

      // Filter out non-chumash items from Torah books (like "דפי פרשת שבוע")
      const torahBooks = TORAH_BOOK_ORDER
        .map((name) => allBooks.find((b) => b.title === name && b.parent_id === ROOT_IDS.torah))
        .filter(Boolean)
        .map((b) => ({
          id: b!.id,
          title: b!.title,
          children: childrenByBook.get(b!.id) || [],
        }));

      // Build Torah/Neviim/Ketuvim categories
      const categories: SidebarCategory[] = [
        {
          id: ROOT_IDS.torah,
          title: "תורה",
          books: torahBooks,
        },
        {
          id: ROOT_IDS.neviim,
          title: "נביאים",
          books: sortByBiblicalOrder(allBooks
            .filter((b) => b.parent_id === ROOT_IDS.neviim))
            .map((b) => ({ id: b.id, title: b.title, children: childrenByBook.get(b.id) || [] })),
        },
        {
          id: ROOT_IDS.ketuvim,
          title: "כתובים",
          books: sortByBiblicalOrder(allBooks
            .filter((b) => b.parent_id === ROOT_IDS.ketuvim))
            .map((b) => ({ id: b.id, title: b.title, children: childrenByBook.get(b.id) || [] })),
        },
      ];

      // Build expandable extra sections with proper ordering
      const getChildren = (parentId: string) =>
        (expandableChildren || []).filter((c) => c.parent_id === parentId);

      const extraSections: ExtraSection[] = [
        {
          id: ROOT_IDS.howToLearn,
          title: 'איך לומדים תנ"ך',
          // Use the canonical deep children (all descendant leaf series, deduped)
          children: howToLearnForSection,
        },
        {
          id: ROOT_IDS.generalTopics,
          title: 'נושאים כלליים בתנ"ך',
          children: sortByCustomOrder(getChildren(ROOT_IDS.generalTopics), "generalTopics"),
        },
        {
          id: ROOT_IDS.moadim,
          title: "המועדים",
          children: sortByCustomOrder(getChildren(ROOT_IDS.moadim), "moadim"),
        },
        {
          id: ROOT_IDS.haftarot,
          title: "הפטרות",
          children: sortByCustomOrder(getChildren(ROOT_IDS.haftarot), "haftarot"),
        },
        {
          id: ROOT_IDS.tools,
          title: "כלי עזר - טבלאות זמני המאורעות ומפות",
          children: sortByCustomOrder(getChildren(ROOT_IDS.tools), "tools"),
        },
        {
          id: ROOT_IDS.yemeiIyun,
          title: 'ימי עיון בתנ"ך',
          children: getChildren(ROOT_IDS.yemeiIyun),
        },
        {
          id: ROOT_IDS.livuyTatim,
          title: 'ליווי ת"תים',
          children: getChildren(ROOT_IDS.livuyTatim),
        },
      ];

      return { categories, extraSections };
    },
    staleTime: 1000 * 60 * 10,
  });

  // Fetch series for a node — canonical dedup rule:
  // For each unique title in the descendant tree:
  //   - If an active/published copy with lesson_count > 0 exists → show it
  //   - Else if only a draft copy exists (no active twin) → show it (mirrors old site)
  //   - Never show a draft that has an active/published twin (bad duplicate)
  // Excludes the root node itself and intermediate category nodes (status=category).
  const useSeriesForNode = (nodeId: string | null) => {
    return useQuery({
      queryKey: ["content-series-canonical", nodeId],
      queryFn: async () => {
        if (!nodeId) return [];
        const { data: descendants } = await supabase.rpc("get_series_descendant_ids", {
          root_id: nodeId,
        });
        const allIds = [...(descendants || []).map((d: any) => d.series_id)];
        if (allIds.length === 0) return [];

        // Fetch ALL statuses (active, published, draft) — we apply canonical filter in JS
        // Exclude "category" nodes (those are sub-category containers, not leaf series)
        const { data: series } = await supabase
          .from("series")
          .select("id, title, lesson_count, rabbi_id, description, status, image_url, parent_id")
          .in("id", allIds)
          .in("status", ["active", "published", "draft"])
          // Public category page must never surface teacher-wing series.
          .not("audience_tags", "cs", "{teachers}")
          .order("lesson_count", { ascending: false })
          .limit(200);
        if (!series || series.length === 0) return [];

        // Normalize a title for dedup: strip Hebrew/ASCII quote variants + collapse whitespace,
        // so 'כל האומר דוד…' and '"כל האומר דוד…"' (active vs draft twin) collapse to one key.
        const normTitle = (t: string) =>
          t.trim().replace(/[״"'׳‘’“”`]/g, "").replace(/\s+/g, " ");

        // Drop direct-child placeholder sub-categories: a draft node with 0 lessons whose parent IS
        // the requested node is a sub-category shell (old site shows it in the sidebar, not as a
        // center series). Deeper draft-only leaves (e.g. parent = a sub-category) are kept.
        const seriesFiltered = series.filter(
          (s) => !(s.status === "draft" && (s.lesson_count ?? 0) === 0 && s.parent_id === nodeId),
        );

        // Canonical dedup: group by normalized title, pick best version
        const byTitle = new Map<string, typeof series[number]>();
        // First pass: pick active/published with lessons
        for (const s of seriesFiltered) {
          const key = normTitle(s.title);
          const existing = byTitle.get(key);
          if (!existing) {
            byTitle.set(key, s);
          } else {
            // Prefer active/published with lessons over draft/empty
            const existingScore = (existing.status !== "draft" ? 2 : 0) + (existing.lesson_count > 0 ? 1 : 0);
            const newScore = (s.status !== "draft" ? 2 : 0) + (s.lesson_count > 0 ? 1 : 0);
            if (newScore > existingScore) byTitle.set(key, s);
          }
        }

        // Filter: include only if it's the best version of its title.
        // Additionally exclude drafts that have an active twin (we kept only the active twin above).
        const canonical = Array.from(byTitle.values());

        const rabbiIds = [...new Set(canonical.filter((s) => s.rabbi_id).map((s) => s.rabbi_id!))];
        let rabbiMap = new Map<string, string>();
        if (rabbiIds.length > 0) {
          const { data: rabbis } = await supabase.from("rabbis").select("id, name").in("id", rabbiIds);
          rabbiMap = new Map(rabbis?.map((r) => [r.id, r.name]) || []);
        }

        // Sort: active/published with lessons first, then by lesson_count desc, drafts last
        canonical.sort((a, b) => {
          const aActive = a.status !== "draft" && a.lesson_count > 0 ? 1 : 0;
          const bActive = b.status !== "draft" && b.lesson_count > 0 ? 1 : 0;
          if (bActive !== aActive) return bActive - aActive;
          return (b.lesson_count ?? 0) - (a.lesson_count ?? 0);
        });

        return canonical.map((s) => ({
          id: s.id,
          title: s.title,
          lessonCount: s.lesson_count,
          rabbiName: s.rabbi_id ? rabbiMap.get(s.rabbi_id) || null : null,
          sourceType: null,
          description: s.description,
          imageUrl: s.image_url ?? null,
          isDraft: s.status === "draft",
        })) as (SeriesRow & { imageUrl: string | null; isDraft: boolean })[];
      },
      enabled: !!nodeId,
      staleTime: 1000 * 60 * 5,
    });
  };

  // Fetch lessons for a node
  const useLessonsForNode = (nodeId: string | null) => {
    return useQuery({
      queryKey: ["content-lessons", nodeId],
      queryFn: async () => {
        if (!nodeId) return [];
        const { data: descendants } = await supabase.rpc("get_series_descendant_ids", {
          root_id: nodeId,
        });
        const allSeriesIds = [nodeId, ...(descendants || []).map((d: any) => d.series_id)];
        // Fetch lessons in chunks to avoid hitting limits
        const chunkSize = 30;
        let allLessons: any[] = [];
        for (let i = 0; i < allSeriesIds.length; i += chunkSize) {
          const chunk = allSeriesIds.slice(i, i + chunkSize);
          const { data: lessons } = await supabase
            .from("lessons")
            .select("id, title, description, source_type, duration, rabbi_id, content, audio_url, video_url, attachment_url, series_id")
            .in("series_id", chunk)
            .eq("status", "published")
            .order("published_at", { ascending: true })
            .limit(1000);
          if (lessons) allLessons = allLessons.concat(lessons);
        }
        const lessons = allLessons;
        if (!lessons || lessons.length === 0) return [];
        const rabbiIds = [...new Set(lessons.filter((l) => l.rabbi_id).map((l) => l.rabbi_id!))];
        let rabbiMap = new Map<string, string>();
        if (rabbiIds.length > 0) {
          const { data: rabbis } = await supabase.from("rabbis").select("id, name").in("id", rabbiIds);
          rabbiMap = new Map(rabbis?.map((r) => [r.id, r.name]) || []);
        }
        return lessons.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description,
          rabbiName: l.rabbi_id ? rabbiMap.get(l.rabbi_id) || null : null,
          sourceType: l.source_type,
          duration: l.duration,
          content: l.content,
          audioUrl: l.audio_url,
          videoUrl: l.video_url,
          attachmentUrl: l.attachment_url,
          seriesId: l.series_id,
        })) as LessonRow[];
      },
      enabled: !!nodeId,
      staleTime: 1000 * 60 * 5,
    });
  };

  // Fetch series for a rabbi
  const useSeriesForRabbi = (rabbiId: string | null) => {
    return useQuery({
      queryKey: ["content-rabbi-series", rabbiId],
      queryFn: async () => {
        if (!rabbiId) return [];
        const { data: rabbi } = await supabase.from("rabbis").select("name").eq("id", rabbiId).single();
        const { data: series } = await supabase
          .from("series")
          .select("id, title, lesson_count, description")
          .eq("rabbi_id", rabbiId)
          .in("status", ["active", "published"])
          .gt("lesson_count", 0)
          .order("lesson_count", { ascending: false })
          .limit(100);
        if (!series || series.length === 0) return [];
        return series.map((s) => ({
          id: s.id,
          title: s.title,
          lessonCount: s.lesson_count,
          rabbiName: rabbi?.name || null,
          sourceType: null,
          description: s.description,
        })) as SeriesRow[];
      },
      enabled: !!rabbiId,
      staleTime: 1000 * 60 * 5,
    });
  };

  const rabbisQuery = useQuery({
    queryKey: ["content-rabbis"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rabbis")
        .select("id, name, lesson_count")
        .eq("status", "active")
        .gt("lesson_count", 0)
        .order("lesson_count", { ascending: false })
        .limit(50);
      return (data || []).map((r) => ({
        id: r.id,
        name: r.name,
        lessonCount: r.lesson_count,
      })) as RabbiInfo[];
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    categories: sidebarQuery.data?.categories || [],
    extraSections: sidebarQuery.data?.extraSections || [],
    rabbis: rabbisQuery.data || [],
    riddlesSeriesId: ROOT_IDS.riddles,
    isLoading: sidebarQuery.isLoading,
    useSeriesForNode,
    useLessonsForNode,
    useSeriesForRabbi,
  };
}
