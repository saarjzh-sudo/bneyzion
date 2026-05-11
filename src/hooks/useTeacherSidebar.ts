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
  maagarEzrei:  "6bfb7aaa-cd9e-4562-b087-a37fcc24d295",
  maagarTorah:  "2e248097-b954-4c28-91dc-b84a19f9fabc",
  maagarNeviim: "42ac131e-631d-4518-8896-86cd1c49c07a",
  maagarKetuvim:"cb088913-d868-4203-965a-117e5569e170",
};

const TORAH_ORDER   = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"];
const KETUVIM_ORDER = ["תהלים", "משלי", "איוב", "שיר השירים", "רות", "איכה", "קהלת", "אסתר", "דניאל", "עזרא", "נחמיה"];

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useTeacherSidebar(): TeacherSidebarData {
  const q = useQuery({
    queryKey: ["teacher-sidebar-v1"],
    queryFn: async () => {
      // ── 1. Get all books under Torah / Nevi'im / Ketuvim roots ────────────
      const mainCatIds = [ROOT_IDS.torah, ROOT_IDS.neviim, ROOT_IDS.ketuvim];

      const { data: booksRaw } = await supabase
        .from("series")
        .select("id, title, parent_id")
        .in("parent_id", mainCatIds)
        .order("title");

      const books = booksRaw || [];

      // ── 2. Get teacher-tagged children of those books ─────────────────────
      const bookIds = books.map((b) => b.id);
      const { data: childrenRaw } = await supabase
        .from("series")
        .select("id, title, parent_id")
        .in("parent_id", bookIds)
        .contains("audience_tags", ["teachers"])
        .gt("lesson_count", 0)
        .order("title");

      const children = childrenRaw || [];
      const childrenByBook = new Map<string, { id: string; title: string }[]>();
      for (const c of children) {
        const arr = childrenByBook.get(c.parent_id!) || [];
        arr.push({ id: c.id, title: c.title });
        childrenByBook.set(c.parent_id!, arr);
      }

      // ── 3. Build book trees ───────────────────────────────────────────────
      const torahRaw = books.filter((b) => b.parent_id === ROOT_IDS.torah);
      const torahBooks: TeacherSidebarBook[] = TORAH_ORDER
        .map((name) => torahRaw.find((b) => b.title === name))
        .filter(Boolean)
        .map((b) => ({
          id:       b!.id,
          title:    b!.title,
          children: childrenByBook.get(b!.id) || [],
        }));

      const neviimRaw = books.filter((b) => b.parent_id === ROOT_IDS.neviim);
      const neviimBooks: TeacherSidebarBook[] = sortByBiblicalOrder(neviimRaw).map((b) => ({
        id:       b.id,
        title:    b.title,
        children: childrenByBook.get(b.id) || [],
      }));

      const ketuvimRaw = books.filter((b) => b.parent_id === ROOT_IDS.ketuvim);
      const ketuvimBooks: TeacherSidebarBook[] = KETUVIM_ORDER
        .map((name) => ketuvimRaw.find((b) => b.title === name))
        .filter(Boolean)
        .map((b) => ({
          id:       b!.id,
          title:    b!.title,
          children: childrenByBook.get(b!.id) || [],
        }));

      // ── 4. Tools sections ─────────────────────────────────────────────────
      const toolParentIds = [ROOT_IDS.tools, ROOT_IDS.livuyTatim, ROOT_IDS.maps, ROOT_IDS.howToTeach, ROOT_IDS.riddles];

      const { data: toolRootsRaw } = await supabase
        .from("series")
        .select("id, title, lesson_count")
        .in("id", toolParentIds)
        .order("title");

      const { data: toolChildrenRaw } = await supabase
        .from("series")
        .select("id, title, parent_id")
        .in("parent_id", toolParentIds)
        .contains("audience_tags", ["teachers"])
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

      // ── 5. Rabbis with teacher content ────────────────────────────────────
      // Get distinct rabbi_ids from teacher-tagged series
      const { data: taggedSeries } = await supabase
        .from("series")
        .select("rabbi_id")
        .contains("audience_tags", ["teachers"])
        .gt("lesson_count", 0)
        .not("rabbi_id", "is", null);

      const rabbiIds = [...new Set((taggedSeries || []).map((s) => s.rabbi_id!))].slice(0, 40);

      let yotzrimRabbis: TeacherSidebarRabbi[] = [];
      if (rabbiIds.length > 0) {
        const { data: rabbisRaw } = await supabase
          .from("rabbis")
          .select("id, name, lesson_count")
          .in("id", rabbiIds)
          .order("lesson_count", { ascending: false });

        yotzrimRabbis = (rabbisRaw || []).map((r) => ({
          id:          r.id,
          name:        r.name,
          lessonCount: r.lesson_count,
        }));
      }

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
