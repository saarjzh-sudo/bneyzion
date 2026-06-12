/**
 * useTeacherSidebar — data hook for the Teachers Wing production pages.
 *
 * Returns structured data for the teacher sidebar:
 *  - Torah / Nevi'im / Ketuvim book trees (series with audience_tags @> ['teachers'])
 *  - Tools sections (כלי עזר / מפות / ליווי ת"תים / שאלות / מדריכים)
 *  - Rabbis who have teacher-tagged content
 *
 * Used by: TeacherSidebar.tsx, TeachersWingPage.tsx, TeachersSeriesPage.tsx
 *
 * Data strategy:
 * - Fetches series with audience_tags @> ['teachers'] to scope content
 * - Falls back to known root IDs for structural tree (books always show)
 * - Separates "ספרים" (Torah/Nevi'im/Ketuvim hierarchy) from "כלים" (tools sections)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sortByBiblicalOrder } from "@/lib/biblicalOrder";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface TeacherSidebarBook {
  id: string;
  title: string;
  /** Direct child series under this book */
  children: { id: string; title: string }[];
}

export interface TeacherSidebarSection {
  id: string;
  title: string;
  children: { id: string; title: string }[];
}

export interface TeacherSidebarRabbi {
  id: string;
  name: string;
  lessonCount: number;
}

export interface TeacherSidebarData {
  torahBooks: TeacherSidebarBook[];
  neviimBooks: TeacherSidebarBook[];
  ketuvimBooks: TeacherSidebarBook[];
  toolsSections: TeacherSidebarSection[];
  yotzrimRabbis: TeacherSidebarRabbi[];
  isLoading: boolean;
}

// ─── Canonical root IDs (stable — confirmed 2026-05-07) ────────────────────
const ROOT_IDS = {
  torah:        "bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b",
  neviim:       "a0472c9f-8212-44ff-8937-ace5fea4b4dc",
  ketuvim:      "5cdd770c-9593-4b0d-9f9e-cda50cf5ef41",
  tools:        "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7",
  livuyTatim:   "7cbd261e-03b0-43da-a708-e8ae4402105f",
  maps:         "4d78557b-da8b-4b1f-8d8e-09d74ff3070a",
  howToTeach:   "26e30725-d5d0-4d88-8f73-f7a279801241",
  riddles:      "c852edd8-d959-4c8d-bf7e-17b5881275fa",
};

const TORAH_ORDER   = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"];
const KETUVIM_ORDER = ["תהלים", "משלי", "איוב", "שיר השירים", "רות", "איכה", "קהלת", "אסתר", "דניאל", "עזרא", "נחמיה"];

/**
 * Fixed 31-creator list (CODE-SPEC §11 CA5).
 * Order = old sidebar he-alphabetical order. IDs from teachers_plan.json stats.creators.
 * includes dual-role rabbis + content_creators regardless of entity_type/status (CA6).
 */
const CREATOR_IDS_ORDERED = [
  "a1b2c3d4-1111-4444-aaaa-111111111111", // אוריה כראדי
  "e1111111-1111-1111-1111-111111111105", // הרב אורי שטמלר
  "167ed180-6ced-45af-b5d7-e97a916fa93a", // הרב אשי בלייכר
  "e1111111-1111-1111-1111-111111111121", // הרב בניה כהן
  "80fefb33-e324-4eee-9e47-0502724ae149", // הרב גדי שר שלום
  "e1111111-1111-1111-1111-111111111101", // הרב דביר אפלבוים
  "1371e495-c30b-44f5-b3d7-8b3d08f4ca75", // הרב חסדאי בר אור
  "c3d4e5f6-3333-4444-cccc-333333333333", // הרב ידידיה שילה
  "7443c208-f2f2-42f5-bf05-af2554855fbd", // הרב יהודה בשושה
  "356f3470-86cf-4da4-8c34-ba76370ebe4d", // הרב יונתן לוי
  "47569464-d3c7-4e9d-93c5-8ceaebdb031f", // הרב יורם אליהו
  "e97e2b67-5f0f-436f-9fc1-54f706a7a20e", // הרב יצחק עמראני
  "9f357f02-5557-4dba-a941-fdb1ef681f4a", // הרב מאיר גרשונזון
  "71aa933c-5548-4ea7-8be0-dfb659202660", // הרב מאיר הילביץ'
  "21815917-0c20-4ad2-b6ab-3943956c9a55", // הרב מנחם אליהו
  "e1111111-1111-1111-1111-111111111120", // הרב נחום אריאל
  "d6666666-6666-6666-6666-666666666666", // הרב ניסים כהן
  "e1111111-1111-1111-1111-111111111102", // הרב עדי איצקוביץ'
  "e1111111-1111-1111-1111-111111111104", // הרב עמוס נתנאל
  "3da1df9d-4ed5-48ba-9ffa-e3c5271d40e1", // הרב עמירם אלבה
  "744da303-22be-4062-a822-4ba8e8f1b02d", // הרב עמנואל בן ארצי
  "d4e5f6a7-4444-4444-dddd-444444444444", // הרב שלמה כץ
  "0ae09e02-2089-4a99-a1d5-8a6b0a503f81", // הרב שמעון לוי והרב נתן מולאיוף
  "d4e5f6a7-6666-6666-ffff-666666666666", // הרב שמעון שוהם
  "6f4b2572-b019-4832-9547-de7e8bc6d909", // ושננתם - אוצר התורה
  "7fcd7014-5eef-4e9b-b792-e6460d75e720", // ישקו העדרים
  "d4e5f6a7-5555-5555-eeee-555555555555", // מחבר לא ידוע
  "1be980e3-a688-47aa-9eaf-adfa23b105b6", // מכון דעת סופרים
  "e1111111-1111-1111-1111-111111111103", // נתן מארגל
  "b2c3d4e5-2222-4444-bbbb-222222222222", // סידור שים שלום
  "b5555555-5555-5555-5555-555555555555", // תלמוד תורה מורשה
] as const;

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useTeacherSidebar(): TeacherSidebarData {
  const q = useQuery({
    queryKey: ["teacher-sidebar-v2"],
    queryFn: async () => {
      // ── 1. Tree-driven book lists (CODE-SPEC §11 CA10 / tree CA10) ────────
      // Fetch direct children of Torah/Neviim/Ketuvim roots, ordered by sort_order then title.
      // sort_order 1..N = canonical sidebar order set by tree_plan; 0/NULL = page-only extras.
      const mainCatIds = [ROOT_IDS.torah, ROOT_IDS.neviim, ROOT_IDS.ketuvim];

      const { data: booksRaw } = await supabase
        .from("series")
        .select("id, title, parent_id, sort_order")
        .in("parent_id", mainCatIds)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("title", { ascending: true });

      const books = (booksRaw || []) as { id: string; title: string; parent_id: string; sort_order: number | null }[];

      // For each book, get its direct children (the teacher series under that book),
      // ordered by sort_order then title. Only include those with lesson_count > 0
      // or status active/published (series containers may have 0 direct lessons
      // but group sub-series; skip empty drafts).
      const bookIds = books.map((b) => b.id);

      let childSeriesRaw: { id: string; title: string; parent_id: string; sort_order: number | null; lesson_count: number }[] = [];
      if (bookIds.length > 0) {
        // Fetch in a single query (books are bounded: Torah=5, Neviim=21, Ketuvim=11 = 37 max)
        const { data } = await supabase
          .from("series")
          .select("id, title, parent_id, sort_order, lesson_count")
          .in("parent_id", bookIds)
          .in("status", ["active", "published"])
          .gt("lesson_count", 0)
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("title", { ascending: true });
        childSeriesRaw = (data || []) as typeof childSeriesRaw;
      }

      // Group children by book
      const childrenByBook = new Map<string, { id: string; title: string }[]>();
      for (const c of childSeriesRaw) {
        const arr = childrenByBook.get(c.parent_id) || [];
        arr.push({ id: c.id, title: c.title });
        childrenByBook.set(c.parent_id, arr);
      }

      // ── 2. Build book trees ────────────────────────────────────────────────
      const torahRaw   = books.filter((b) => b.parent_id === ROOT_IDS.torah);
      const neviimRaw  = books.filter((b) => b.parent_id === ROOT_IDS.neviim);
      const ketuvimRaw = books.filter((b) => b.parent_id === ROOT_IDS.ketuvim);

      // Torah: canonical order from TORAH_ORDER (fallback to sort_order from DB)
      const torahBooks: TeacherSidebarBook[] = TORAH_ORDER
        .map((name) => torahRaw.find((b) => b.title === name))
        .filter(Boolean)
        .map((b) => ({ id: b!.id, title: b!.title, children: childrenByBook.get(b!.id) || [] }));

      // Neviim: sort_order from tree_plan (already sorted by DB query); fall back to biblical order
      const neviimSorted = neviimRaw.filter((b) => (b.sort_order ?? 0) > 0);
      const neviimUnsorted = neviimRaw.filter((b) => !((b.sort_order ?? 0) > 0));
      const neviimBooks: TeacherSidebarBook[] = [
        ...neviimSorted,
        ...sortByBiblicalOrder(neviimUnsorted),
      ].map((b) => ({ id: b.id, title: b.title, children: childrenByBook.get(b.id) || [] }));

      // Ketuvim: canonical order from KETUVIM_ORDER
      const ketuvimBooks: TeacherSidebarBook[] = KETUVIM_ORDER
        .map((name) => ketuvimRaw.find((b) => b.title === name))
        .filter(Boolean)
        .map((b) => ({ id: b!.id, title: b!.title, children: childrenByBook.get(b!.id) || [] }));

      // ── 3. Tools sections ─────────────────────────────────────────────────
      const toolParentIds = [ROOT_IDS.tools, ROOT_IDS.livuyTatim, ROOT_IDS.maps, ROOT_IDS.howToTeach, ROOT_IDS.riddles];

      const { data: toolRootsRaw } = await supabase
        .from("series")
        .select("id, title, lesson_count, sort_order")
        .in("id", toolParentIds)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("title");

      const { data: toolChildrenRaw } = await supabase
        .from("series")
        .select("id, title, parent_id, sort_order")
        .in("parent_id", toolParentIds)
        .contains("audience_tags", ["teachers"])
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("title");

      const toolChildren = toolChildrenRaw || [];
      const toolChildrenByParent = new Map<string, { id: string; title: string }[]>();
      for (const c of toolChildren) {
        const arr = toolChildrenByParent.get(c.parent_id!) || [];
        arr.push({ id: c.id, title: c.title });
        toolChildrenByParent.set(c.parent_id!, arr);
      }

      const toolsSections: TeacherSidebarSection[] = (toolRootsRaw || []).map((r) => ({
        id:       r.id,
        title:    r.title,
        children: toolChildrenByParent.get(r.id) || [],
      }));

      // ── 4. Creators (yotzrim) — fixed 31-list, old sidebar order (CA5/CA6) ─
      // Fetch names for the fixed ID list regardless of entity_type/status.
      // Counts = number of rabbi_page_items rows per creator (proxy for page depth).
      const { data: creatorsRaw } = await supabase
        .from("rabbis")
        .select("id, name, lesson_count")
        .in("id", [...CREATOR_IDS_ORDERED]);

      const creatorByRabbiId = new Map(
        (creatorsRaw || []).map((r) => [r.id, { id: r.id, name: r.name, lessonCount: r.lesson_count }])
      );

      // Preserve the canonical old-sidebar order (CREATOR_IDS_ORDERED order)
      const yotzrimRabbis: TeacherSidebarRabbi[] = CREATOR_IDS_ORDERED
        .map((id) => creatorByRabbiId.get(id))
        .filter((r): r is NonNullable<typeof r> => !!r)
        .map((r) => ({ id: r.id, name: r.name, lessonCount: r.lessonCount }));

      return { torahBooks, neviimBooks, ketuvimBooks, toolsSections, yotzrimRabbis };
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    torahBooks:     q.data?.torahBooks     || [],
    neviimBooks:    q.data?.neviimBooks    || [],
    ketuvimBooks:   q.data?.ketuvimBooks   || [],
    toolsSections:  q.data?.toolsSections  || [],
    yotzrimRabbis:  q.data?.yotzrimRabbis  || [],
    isLoading:      q.isLoading,
  };
}
