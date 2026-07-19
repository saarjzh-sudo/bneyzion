import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sortByBiblicalOrder } from "@/lib/biblicalOrder";
// sortByCustomOrder is intentionally unused since §2.1 — band sort_order from DB replaces it.
import type { SidebarCategory, SidebarBook, SidebarChild, SeriesRow, LessonRow, RabbiInfo } from "@/hooks/useTeachersWing";

// Re-export types
export type { SidebarCategory, SidebarBook, SidebarChild, SeriesRow, LessonRow, RabbiInfo };

export interface ExtraSectionChild {
  id: string;
  title: string;
  parent_id?: string | null;
  children?: { id: string; title: string; parent_id?: string | null }[];
}

export interface ExtraSection {
  id: string;
  title: string;
  children: ExtraSectionChild[];
}

// Root category IDs for the full content tree
const ROOT_IDS = {
  recordedProject: "041ce810-92ae-59e4-9e07-11fd014255fa",
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

// ─── פרוייקט התנ"ך המוקלט — אגרגציה משותפת (סיידבר + CategoryPage) ─────────────
// הסדרות המוקלטות חיות תחת הורי-הספרים; צומת-הפרוייקט עצמו ריק. הדפוס מכסה גם
// "...מוקלט..." וגם "...קריאה בטעמים..." (migration-rules §2). דדופ תאומי-מיגרציה
// במפתח חזק, ומיון בסדר-הקאנון (תורה→נביאים→כתובים).
export const RECORDED_PROJECT_ID = "041ce810-92ae-59e4-9e07-11fd014255fa";

const recNorm = (t: string) => t.replace(/[״"'׳`|\-–—]/g, "").replace(/\s+/g, "").trim();
const RECORDED_BOOK_CANON = [
  "בראשית", "שמות", "ויקרא", "במדבר", "דברים",
  "יהושע", "שופטים", "שמואל א", "שמואל ב", "שמואל",
  "מלכים א", "מלכים ב", "מלכים",
  "ישעיהו", "ישעיה", "ירמיהו", "ירמיה", "יחזקאל",
  "הושע", "יואל", "עמוס", "עובדיה", "יונה", "מיכה", "נחום",
  "חבקוק", "צפניה", "חגי", "זכריה", "מלאכי",
  "תהילים", "תהלים", "משלי", "איוב", "שיר השירים", "רות",
  "איכה", "קהלת", "אסתר", "דניאל", "עזרא", "נחמיה", "דברי הימים",
];
const stripGershayim = (t: string) => t.replace(/['׳״"]/g, "");
const recCanonIndex = (title: string) => {
  const t = stripGershayim(title.replace(/^חומש\s+/, "")).replace(/[\-–—|]/g, " ").replace(/\s+/g, " ").trim();
  let best = 9999, bestLen = -1;
  for (let i = 0; i < RECORDED_BOOK_CANON.length; i++) {
    const b = stripGershayim(RECORDED_BOOK_CANON[i]);
    if ((t === b || t.startsWith(b + " ")) && b.length > bestLen) { best = i; bestLen = b.length; }
  }
  return best;
};

export interface RecordedProjectSeries {
  id: string;
  title: string;
  imageUrl: string | null;
  lessonCount: number | null;
}

export async function fetchRecordedProjectSeries(): Promise<RecordedProjectSeries[]> {
  const { data } = await supabase
    .from("series")
    .select("id, title, image_url, lesson_count")
    .or("title.ilike.%מוקלט%,title.ilike.%קריאה בטעמים%")
    .in("status", ["active", "published"])
    .not("audience_tags", "cs", "{teachers}")
    .order("title");
  const seen = new Set<string>();
  return (data || [])
    .filter((s) => {
      const k = recNorm(s.title);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((s) => ({
      id: s.id,
      title: s.title,
      imageUrl: (s as any).image_url ?? null,
      lessonCount: (s as any).lesson_count ?? null,
    }))
    .sort((a, b) => {
      const ia = recCanonIndex(a.title);
      const ib = recCanonIndex(b.title);
      if (ia !== ib) return ia - ib; // biblical canon (Torah → Neviim → Ketuvim)
      return a.title.localeCompare(b.title, "he"); // variants within a book
    });
}

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
        // §2.1: book level is band-driven too (old order; excludes page-only nodes like split עזרא/נחמיה)
        .gte("sort_order", 1)
        .lte("sort_order", 999)
        .order("sort_order")
        .order("title");

      // Fetch books under Neviim — only "category" status (all real Neviim books are category;
      // draft/active non-category entries here are ghost series that must be hidden)
      const { data: neviimBooks } = await supabase
        .from("series")
        .select("id, title, parent_id")
        .eq("parent_id", ROOT_IDS.neviim)
        .eq("status", "category")
        .gte("sort_order", 1)
        .lte("sort_order", 999)
        .order("sort_order")
        .order("title");

      const allBooks = [...(torahKetuvimBooks || []), ...(neviimBooks || [])];

      if (!allBooks.length) return { categories: [], extraSections: [] };

      // Fetch children of Torah books (parshiot etc.)
      const torahBookIds = allBooks
        .filter((b) => b.parent_id === ROOT_IDS.torah)
        .map((b) => b.id);

      // §2.1: band-driven children — only sort_order 1..999 appear in sidebar (תהלים has 150 real children).
      // §0.3: dual-audience filter — exclude teacher-only, keep general+teachers dual-tagged.
      const { data: torahChildren } = await supabase
        .from("series")
        .select("id, title, parent_id, sort_order")
        .in("parent_id", torahBookIds)
        .in("status", ["active", "published"])
        .gte("sort_order", 1)
        .lte("sort_order", 999)
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
        .gte("sort_order", 1)
        .lte("sort_order", 999)
        .not("audience_tags", "cs", "{teachers}")
        .order("sort_order")
        .order("title");

      // Fetch children of expandable sections (flat sections: direct children are the leaf series)
      // §2.1: band-driven — sidebar shows only sort_order 1..999 per parent, ordered by sort_order ASC.
      // §0.3: dual-audience filter — exclude teacher-only rows (but keep dual-tagged general+teachers).
      // "איך לומדים" is now treated as a flat section (old site showed 5 direct leaf series, not all descendants).
      const flatExpandableIds = [
        ROOT_IDS.howToLearn,
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
        // §2.1: only sidebar-band items (sort_order 1-999). 0/NULL = page-only. >=1000 = parked.
        .gte("sort_order", 1)
        .lte("sort_order", 999)
        // §0.3: exclude teacher-only series from public tree
        .not("audience_tags", "cs", "{teachers}")
        .order("sort_order")
        .order("title");

      // Old-site sections are TWO levels deep (e.g. הפטרות → הפטרות-בראשית → 83 individual
      // haftarot; מועדים → יום הכיפורים/סוכות → sub-series). Fetch grandchildren with the
      // same band+audience filters and nest them under their section child.
      const sectionChildIds = (expandableChildren || []).map((c) => c.id);
      const { data: sectionGrandchildren } = sectionChildIds.length
        ? await supabase
            .from("series")
            .select("id, title, parent_id, sort_order")
            .in("parent_id", sectionChildIds)
            .in("status", ["active", "published"])
            .gte("sort_order", 1)
            .lte("sort_order", 999)
            .not("audience_tags", "cs", "{teachers}")
            .order("sort_order")
            .order("title")
        : { data: [] as any[] };

      // פרוייקט התנ"ך המוקלט — the recorded series live under their BOOK parents (not under
      // this section root, which has 0 direct children). R3 15.6.2026 (Saar): the old public page
      // (/פרוייקט-התנך-המוקלט-מתעדכן) lists ~33 recorded series in biblical-canon order. We
      // aggregate them here by title pattern WITHOUT re-parenting (they stay under their books).
      // רמה 13: the aggregation moved to the exported fetchRecordedProjectSeries so the
      // /category/<recordedProject> page (which was EMPTY — 0 direct children) reuses it.
      const recordedChildren: ExtraSectionChild[] = (await fetchRecordedProjectSeries()).map(
        (s) => ({ id: s.id, title: s.title }),
      );

      // “איך לומדים” is treated as a flat section like the other expandable sections:
      // only its direct children with sort_order 1..999 appear in the sidebar (old site showed 5 leaf series).
      // The deep-RPC approach was fetching all descendants (20+) which broke parity.
      // §2.1: same band filter (sort_order 1..999) as flatExpandableIds.
      // §0.3: dual-audience filter (exclude teacher-only series).

      // Build children map
      // §2.1: DB already filters 1..99 band and orders sort_order ASC — just build the map.
      // The sortByBiblicalOrder fallback is retired: band sort_order is now authoritative.
      const childrenByBook = new Map<string, SidebarChild[]>();
      for (const c of [...(torahChildren || []), ...(nkChildren || [])]) {
        const existing = childrenByBook.get(c.parent_id!) || [];
        existing.push({ id: c.id, title: c.title, sortOrder: (c as any).sort_order ?? 0 });
        childrenByBook.set(c.parent_id!, existing);
      }
      // Sort by sort_order then title — DB result is already in this order, but JS sort ensures
      // stability if multiple rows share the same sort_order.
      for (const [, children] of childrenByBook) {
        children.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.title.localeCompare(b.title, 'he'));
      }

      // Filter out non-chumash items from Torah books (like "דפי פרשת שבוע").
      // R3 14.6.2026 (Saar): REMOVED the synthetic "חידות לילדים פ״ש" 6th Torah entry (was §2.5 CA8).
      // חידות = teacher content; the old site's תורה sidebar shows only the 5 chumashim, and under
      // the strict R3 filter that entry would route to an empty /series page. The weekly-riddle
      // widget on the home page (riddleQuery) remains the public/family touchpoint for riddles.
      const torahChumashBooks = TORAH_BOOK_ORDER
        .map((name) => allBooks.find((b) => b.title === name && b.parent_id === ROOT_IDS.torah))
        .filter(Boolean)
        .map((b) => ({
          id: b!.id,
          title: b!.title,
          children: childrenByBook.get(b!.id) || [],
        }));
      const torahBooks = torahChumashBooks;

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

      // Build expandable extra sections.
      // §2.1: sortByCustomOrder is retired — DB returns sort_order-ordered results (band 1-999).
      // The order from the DB query (sort_order ASC NULLS LAST, title) is the canonical order.
      const getChildren = (parentId: string) =>
        (expandableChildren || [])
          .filter((c) => c.parent_id === parentId)
          .map((c) => ({
            ...c,
            children: (sectionGrandchildren || []).filter((g) => g.parent_id === c.id),
          }));

      const extraSections: ExtraSection[] = [
        {
          id: ROOT_IDS.howToLearn,
          title: 'איך לומדים תנ"ך',
          // Direct band-1..999 children (same as all other flat sections, parity with old site's 5 entries)
          children: getChildren(ROOT_IDS.howToLearn),
        },
        // 'נושאים כלליים בתנ"ך' — הוסר 7.7.2026 (הרב יואב, הערה א'): כל 23 הסדרות
        // הומרו לתגיות בלשונית "נושאים בתנ״ך" (392 שיעורים תויגו; 16 נושאים חדשים
        // תחת themes-root + 7 מיפויים לנושאים קיימים). ראה lesson_topics_bak_yoav_20260707.
        {
          id: ROOT_IDS.moadim,
          title: "מועדים", // old-site exact title
          children: getChildren(ROOT_IDS.moadim),
        },
        {
          id: ROOT_IDS.haftarot,
          title: "הפטרות",
          children: getChildren(ROOT_IDS.haftarot),
        },
        // old-site top-level order: ימי עיון → כלי עזר → פרוייקט המוקלט → ליווי ת"תים
        {
          id: ROOT_IDS.yemeiIyun,
          title: 'ימי עיון בתנ"ך',
          children: getChildren(ROOT_IDS.yemeiIyun),
        },
        {
          id: ROOT_IDS.tools,
          title: "כלי עזר - טבלאות זמני המאורעות ומפות",
          children: getChildren(ROOT_IDS.tools),
        },
        {
          id: ROOT_IDS.recordedProject,
          title: 'פרוייקט התנ"ך המוקלט - מתעדכן',
          // R3 15.6.2026: the ~33 recorded series, aggregated from their book parents in canon order.
          children: recordedChildren,
        },
        // 'ליווי ת"תים' — הוסר מהסיידבר הציבורי 7.7.2026 (הרב יואב, הערה ג').
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
  const useSeriesForNode = (nodeId: string | null, opts?: { leafOnly?: boolean }) => {
    const leafOnly = opts?.leafOnly ?? false;
    return useQuery({
      queryKey: ["content-series-canonical", nodeId, leafOnly],
      queryFn: async () => {
        if (!nodeId) return [];
        const { data: descendants } = await supabase.rpc("get_series_descendant_ids", {
          root_id: nodeId,
        });
        const allIds = [...(descendants || []).map((d: any) => d.series_id)];
        if (allIds.length === 0) return [];

        // Fetch ALL statuses (active, published, draft) — we apply canonical filter in JS
        // Exclude "category" nodes (those are sub-category containers, not leaf series)
        // §3: raise limit 200→1000 (כתובים root has 280+ series, psalms 151 series)
        // §0.3: dual-audience filter — keep general+teachers dual-tagged, exclude teachers-only
        const { data: series } = await supabase
          .from("series")
          .select("id, title, lesson_count, rabbi_id, description, status, image_url, parent_id, sort_order")
          .in("id", allIds)
          .in("status", ["active", "published", "draft"])
          // §0.3: exclude teacher-only series from public category page
          .not("audience_tags", "cs", "{teachers}")
          // §0.1 sort: sort_order band first, then title (canonical series order)
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("title", { ascending: true })
          .limit(1000);
        if (!series || series.length === 0) return [];

        // Normalize a title for dedup: strip Hebrew/ASCII quote variants + collapse whitespace,
        // so 'כל האומר דוד…' and '"כל האומר דוד…"' (active vs draft twin) collapse to one key.
        const normTitle = (t: string) =>
          t.trim().replace(/[״"'׳‘’“”`]/g, "").replace(/\s+/g, " ");

        // Parsha event-series clones (consolidation nodes) live in the sidebar tree only —
        // they must NOT appear as category-page series rows. Old site shows 0 of them.
        // Pattern: "פרשת <name> | <chapter-range>"  e.g. "פרשת נח | ו-יא".
        // SAFETY (R1): pattern-scoped on title only — never book-scoped or sort_order-scoped.
        // Neviim event-series ("הושע פרק א", "זכריה פרק ב") have no "|" range → not matched.
        // Regression proof: ^\s*פרשת\s.*\|\s*[א-ת] matches 0 children of any Neviim book.
        // Non-matched examples (must stay false): "פרשת שבוע-בראשית", "פרשת השבוע עפ"י הרמב"ן", "פרשת שבוע במדבר"
        const isParshaEventSeries = (t: string) => /^\s*פרשת\s.*\|\s*[א-ת]/.test(t.trim());

        // Drop direct-child placeholder sub-categories: a draft node with 0 lessons whose parent IS
        // the requested node is a sub-category shell (old site shows it in the sidebar, not as a
        // center series). Deeper draft-only leaves (e.g. parent = a sub-category) are kept.
        // leafOnly (אשף ההעלאה): צומת שמשמש הורה לסדרות אחרות הוא מיכל-קטגוריה בעץ,
        // לא סדרה שמשייכים אליה שיעור — מסתירים אותו מרשימת הבחירה (הערת יואב 19.7).
        const containerIds = new Set(series.map((s) => s.parent_id).filter(Boolean));

        const seriesFiltered = series.filter(
          (s) =>
            !isParshaEventSeries(s.title) &&
            !(s.status === "draft" && (s.lesson_count ?? 0) === 0 && s.parent_id === nodeId) &&
            !(leafOnly && containerIds.has(s.id)),
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

        // §0.1 sort: sort_order band (1-99 first), then parked (>=100), then 0/NULL page-only,
        // then by lesson_count desc within same group, drafts last.
        canonical.sort((a: any, b: any) => {
          const aOrder = (a as any).sort_order;
          const bOrder = (b as any).sort_order;
          // Band category: 1-99 = sidebar (main), 0/NULL = page-only, >=100 = parked
          const bandA = aOrder == null || aOrder === 0 ? 2 : aOrder >= 100 ? 1 : 0;
          const bandB = bOrder == null || bOrder === 0 ? 2 : bOrder >= 100 ? 1 : 0;
          if (bandA !== bandB) return bandA - bandB;
          // Within main band: sort by sort_order
          if (bandA === 0) {
            if ((aOrder || 0) !== (bOrder || 0)) return (aOrder || 0) - (bOrder || 0);
          }
          // Both page-only (sort_order 0/NULL): mirror old site's alphabetical series ordering
          if (bandA === 2 && bandB === 2) return a.title.localeCompare(b.title, "he");
          // Within same position: active/published with lessons before drafts
          const aActive = a.status !== "draft" && (a.lesson_count ?? 0) > 0 ? 1 : 0;
          const bActive = b.status !== "draft" && (b.lesson_count ?? 0) > 0 ? 1 : 0;
          if (bActive !== aActive) return bActive - aActive;
          return (b.lesson_count ?? 0) - (a.lesson_count ?? 0);
        });

        return canonical.map((s) => ({
          id: s.id,
          title: s.title,
          lessonCount: s.lesson_count,
          rabbiId: s.rabbi_id ?? null,
          rabbiName: s.rabbi_id ? rabbiMap.get(s.rabbi_id) || null : null,
          sourceType: null,
          description: s.description,
          imageUrl: (s as any).image_url ?? null,
          isDraft: s.status === "draft",
        })) as (SeriesRow & { rabbiId: string | null; imageUrl: string | null; isDraft: boolean })[];
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
            // R3 14.6.2026 (Saar): node-lesson list must exclude teacher content too.
            .not("audience_tags", "cs", "{teachers}")
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
      // Public רבנים tab = individual rabbis only. Content creators / institutions
      // (ושננתם, מכון דעת סופרים, תלמוד תורה מורשה…) are entity_type='content_creator'
      // and belong to the teachers wing — never the public rabbis list. (Saar 10.6.2026)
      // Cast to any: entity_type isn't in the generated types yet but exists in the DB.
      const { data } = await (supabase as any)
        .from("rabbis")
        .select("id, name, lesson_count")
        .eq("status", "active")
        .eq("entity_type", "rabbi")
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
