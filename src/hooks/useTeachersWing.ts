import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sortByBiblicalOrder } from "@/lib/biblicalOrder";

export interface SidebarCategory {
  id: string;
  title: string;
  books: SidebarBook[];
}

export interface SidebarBook {
  id: string;
  title: string;
  children: SidebarChild[];
}

export interface SidebarChild {
  id: string;
  title: string;
  sortOrder?: number;
}

export interface SeriesRow {
  id: string;
  title: string;
  lessonCount: number;
  rabbiName: string | null;
  sourceType: string | null;
  description: string | null;
}

export interface LessonRow {
  id: string;
  title: string;
  description: string | null;
  rabbiName: string | null;
  sourceType: string;
  duration: number | null;
  content: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  attachmentUrl: string | null;
  seriesId: string | null;
}

export interface RabbiInfo {
  id: string;
  name: string;
  lessonCount: number;
}

// Root category IDs
const ROOT_IDS = {
  torah: "bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b",
  neviim: "a0472c9f-8212-44ff-8937-ace5fea4b4dc",
  ketuvim: "5cdd770c-9593-4b0d-9f9e-cda50cf5ef41",
  howToStudy: "26e30725-d5d0-4d88-8f73-f7a279801241",
  moadim: "92130154-e96a-4f98-b032-5a20ac385f63",
  haftarot: "3327c721-7bc9-471c-878f-0b3aef98b090",
  generalTopics: "552bf2ba-cc7a-4dbe-a0fe-2cd64ef9dab0",
  riddles: "c852edd8-d959-4c8d-bf7e-17b5881275fa",
  tools: "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7",
  livuyTatim: "7cbd261e-03b0-43da-a708-e8ae4402105f",
};

const TORAH_BOOK_ORDER = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"];

export function useTeachersWing() {
  const sidebarQuery = useQuery({
    queryKey: ["teachers-wing-sidebar"],
    queryFn: async () => {
      const catIds = [ROOT_IDS.torah, ROOT_IDS.neviim, ROOT_IDS.ketuvim];

      const { data: allBooks } = await supabase
        .from("series")
        .select("id, title, parent_id")
        .in("parent_id", catIds)
        .order("title");

      if (!allBooks) return { categories: [], extraSections: [] };

      const torahBookIds = allBooks
        .filter((b) => b.parent_id === ROOT_IDS.torah)
        .map((b) => b.id);

      const { data: allChildren } = await supabase
        .from("series")
        .select("id, title, parent_id, sort_order")
        .in("parent_id", torahBookIds)
        .order("sort_order")
        .order("title");

      const neviimKetuvimBookIds = allBooks
        .filter((b) => b.parent_id === ROOT_IDS.neviim || b.parent_id === ROOT_IDS.ketuvim)
        .map((b) => b.id);

      const { data: nkChildren } = await supabase
        .from("series")
        .select("id, title, parent_id, sort_order")
        .in("parent_id", neviimKetuvimBookIds)
        .order("sort_order")
        .order("title");

      const extraParentIds = [ROOT_IDS.moadim, ROOT_IDS.haftarot, ROOT_IDS.howToStudy, ROOT_IDS.generalTopics, ROOT_IDS.tools, ROOT_IDS.livuyTatim];
      const { data: extraChildren } = await supabase
        .from("series")
        .select("id, title, parent_id")
        .in("parent_id", extraParentIds)
        .order("title");

      const childrenByBook = new Map<string, SidebarChild[]>();
      for (const c of [...(allChildren || []), ...(nkChildren || [])]) {
        const existing = childrenByBook.get(c.parent_id!) || [];
        existing.push({ id: c.id, title: c.title, sortOrder: (c as any).sort_order ?? 0 });
        childrenByBook.set(c.parent_id!, existing);
      }

      for (const [key, children] of childrenByBook) {
        const hasManualSort = children.some((child) => (child.sortOrder ?? 0) > 0);
        if (hasManualSort) {
          children.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title, "he"));
        } else {
          childrenByBook.set(key, sortByBiblicalOrder(children));
        }
      }

      const categories: SidebarCategory[] = [
        {
          id: ROOT_IDS.torah,
          title: "תורה",
          books: TORAH_BOOK_ORDER
            .map((name) => allBooks.find((b) => b.title === name && b.parent_id === ROOT_IDS.torah))
            .filter(Boolean)
            .map((b) => ({
              id: b!.id,
              title: b!.title,
              children: childrenByBook.get(b!.id) || [],
            })),
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
          books: (() => {
            const ketuvimOrder = ["תהלים", "משלי", "איוב", "שיר השירים", "רות", "איכה", "קהלת", "אסתר", "דניאל", "עזרא", "נחמיה"];
            const ketuvimBooks = allBooks.filter((b) => b.parent_id === ROOT_IDS.ketuvim);
            return ketuvimOrder
              .map((name) => ketuvimBooks.find((b) => b.title === name))
              .filter(Boolean)
              .map((b) => ({ id: b!.id, title: b!.title, children: [] as SidebarChild[] }));
          })(),
        },
      ];

      const extraSections = [
        {
          id: ROOT_IDS.howToStudy,
          title: 'איך מלמדים תנ"ך',
          children: (extraChildren || []).filter((c) => c.parent_id === ROOT_IDS.howToStudy),
        },
        {
          id: ROOT_IDS.generalTopics,
          title: 'נושאים כלליים בתנ"ך',
          children: (extraChildren || []).filter((c) => c.parent_id === ROOT_IDS.generalTopics),
        },
        {
          id: ROOT_IDS.moadim,
          title: "מועדים",
          children: (extraChildren || []).filter((c) => c.parent_id === ROOT_IDS.moadim),
        },
        {
          id: ROOT_IDS.haftarot,
          title: "הפטרות",
          children: (extraChildren || []).filter((c) => c.parent_id === ROOT_IDS.haftarot),
        },
        {
          id: ROOT_IDS.tools,
          title: "כלי עזר - טבלאות זמני המאורעות ומפות",
          children: (extraChildren || []).filter((c) => c.parent_id === ROOT_IDS.tools),
        },
        {
          id: ROOT_IDS.livuyTatim,
          title: 'ליווי ת"תים',
          children: (extraChildren || []).filter((c) => c.parent_id === ROOT_IDS.livuyTatim),
        },
      ];

      return { categories, extraSections };
    },
    staleTime: 1000 * 60 * 10,
  });

  // Fetch series for a series-tree node
  const useSeriesForNode = (nodeId: string | null) => {
    return useQuery({
      queryKey: ["teachers-wing-series", nodeId],
      queryFn: async () => {
        if (!nodeId) return [];

        const { data: descendants } = await supabase.rpc("get_series_descendant_ids", {
          root_id: nodeId,
        });

        const allIds = [nodeId, ...(descendants || []).map((d: any) => d.series_id)];

        const { data: series } = await supabase
          .from("series")
          .select("id, title, lesson_count, rabbi_id, description")
          .in("id", allIds)
          .gt("lesson_count", 0)
          .order("lesson_count", { ascending: false })
          .limit(100);

        if (!series || series.length === 0) return [];

        const rabbiIds = [...new Set(series.filter((s) => s.rabbi_id).map((s) => s.rabbi_id!))];
        let rabbiMap = new Map<string, string>();
        if (rabbiIds.length > 0) {
          const { data: rabbis } = await supabase
            .from("rabbis")
            .select("id, name")
            .in("id", rabbiIds);
          rabbiMap = new Map(rabbis?.map((r) => [r.id, r.name]) || []);
        }

        return series.map((s) => ({
          id: s.id,
          title: s.title,
          lessonCount: s.lesson_count,
          rabbiName: s.rabbi_id ? rabbiMap.get(s.rabbi_id) || null : null,
          sourceType: null,
          description: s.description,
        })) as SeriesRow[];
      },
      enabled: !!nodeId,
      staleTime: 1000 * 60 * 5,
    });
  };

  // Fetch actual lessons for a node and its descendants
  const useLessonsForNode = (nodeId: string | null) => {
    return useQuery({
      queryKey: ["teachers-wing-lessons", nodeId],
      queryFn: async () => {
        if (!nodeId) return [];

        const { data: descendants } = await supabase.rpc("get_series_descendant_ids", {
          root_id: nodeId,
        });

        const allSeriesIds = [nodeId, ...(descendants || []).map((d: any) => d.series_id)];

        const { data: lessons } = await supabase
          .from("lessons")
          .select("id, title, description, source_type, duration, rabbi_id, content, audio_url, video_url, attachment_url, series_id")
          .in("series_id", allSeriesIds)
          .eq("status", "published")
          .order("title")
          .limit(500);

        if (!lessons || lessons.length === 0) return [];

        const rabbiIds = [...new Set(lessons.filter((l) => l.rabbi_id).map((l) => l.rabbi_id!))];
        let rabbiMap = new Map<string, string>();
        if (rabbiIds.length > 0) {
          const { data: rabbis } = await supabase
            .from("rabbis")
            .select("id, name")
            .in("id", rabbiIds);
          rabbiMap = new Map(rabbis?.map((r) => [r.id, r.name]) || []);
        }

        const mapped = lessons.map((l) => ({
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

        // Group lessons by rabbi name
        mapped.sort((a, b) => {
          const aName = a.rabbiName ?? 'תתת';
          const bName = b.rabbiName ?? 'תתת';
          if (aName !== bName) return aName.localeCompare(bName, 'he');
          return 0;
        });

        return mapped;
      },
      enabled: !!nodeId,
      staleTime: 1000 * 60 * 5,
    });
  };


  const useSeriesForRabbi = (rabbiId: string | null) => {
    return useQuery({
      queryKey: ["teachers-wing-rabbi-series", rabbiId],
      queryFn: async () => {
        if (!rabbiId) return [];

        const { data: rabbi } = await supabase
          .from("rabbis")
          .select("name")
          .eq("id", rabbiId)
          .single();

        const { data: series } = await supabase
          .from("series")
          .select("id, title, lesson_count, description")
          .eq("rabbi_id", rabbiId)
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
    queryKey: ["teachers-wing-rabbis"],
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
    generalTopicsId: ROOT_IDS.generalTopics,
    isLoading: sidebarQuery.isLoading,
    useSeriesForNode,
    useLessonsForNode,
    useSeriesForRabbi,
  };
}
