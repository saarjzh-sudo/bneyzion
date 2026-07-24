/**
 * useAdminContent — hooks ייעודיים לעמודי האדמין (שיעורים / סדרות / בוררים).
 *
 * למה קובץ נפרד: useLessons/useSeries נשארים כמו שהם — דף הבית הציבורי
 * (DesignPreviewHome) משתמש בהם, ואסור לשנות שם התנהגות.
 *
 * הרקע: PostgREST מוגבל ל-max_rows=1000. בטבלאות של האתר (23K+ שיעורים,
 * 1,750+ סדרות) שליפה "של הכל" נחתכת בשקט ל-1000 החדשים — האדמין הציג
 * רק חלק קטן מהתוכן, והחיפוש חיפש רק בתוכו. לכן כאן הכל בצד השרת:
 * חיפוש (ilike), סינון סטטוס, ספירות מדויקות ודפדוף (range).
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ADMIN_PAGE_SIZE = 50;

/** ניקוי מחרוזת חיפוש לשימוש בתוך פילטרים של PostgREST (פסיק/סוגריים שוברים or()) */
const sanitizeTerm = (t: string) =>
  t.replace(/[%_,()\\]/g, " ").replace(/\s+/g, " ").trim();

/** יואב 23.7 22:12: חיפוש באדמין גם לפי שם הרב — מזהי רבנים שתואמים למונח.
 *  הרשימה קטנה (מאות), אז שאילתת-עזר אחת מספיקה; "הרב"/"הרבנית" בתחילת
 *  המונח מוסרים כדי ש"הרב בניה" ימצא את "בניה כהן" גם אם השם שמור בלי תואר. */
async function rabbiIdsMatching(term: string): Promise<string[]> {
  const bare = term.replace(/^(הרב|הרבנית|רב)\s+/, "");
  const { data } = await supabase
    .from("rabbis")
    .select("id")
    .or(`name.ilike.%${term}%${bare !== term ? `,name.ilike.%${bare}%` : ""}`)
    .limit(40);
  return (data ?? []).map((r) => r.id);
}

export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── שיעורים ─────────────────────────────────────────────────────────

export type AdminLessonStatus = "all" | "pending_review" | "draft" | "published" | "archived";

export function useAdminLessonCounts() {
  return useQuery({
    queryKey: ["admin-lesson-counts"],
    queryFn: async () => {
      const statuses = ["pending_review", "draft", "published", "archived"] as const;
      const head = (s?: string) => {
        let q = supabase.from("lessons").select("id", { count: "exact", head: true });
        if (s) q = q.eq("status", s);
        return q;
      };
      const [all, ...rest] = await Promise.all([head(), ...statuses.map(s => head(s))]);
      const counts: Record<string, number> = { all: all.count ?? 0 };
      statuses.forEach((s, i) => { counts[s] = rest[i].count ?? 0; });
      return counts;
    },
    staleTime: 30_000,
  });
}

export function useAdminLessonsPage({
  search, status, page,
}: { search: string; status: AdminLessonStatus; page: number }) {
  const term = sanitizeTerm(search);
  return useQuery({
    queryKey: ["admin-lessons", { term, status, page }],
    queryFn: async () => {
      // בכוונה בלי content — גוף מאמר של אלפי שיעורים לא נגרר לרשימה.
      // את השיעור המלא שולפים ב-fetchLessonById רק כשפותחים עריכה.
      let q = supabase
        .from("lessons")
        .select(
          "id, title, description, rabbi_id, series_id, source_type, status, thumbnail_url, review_note, created_at, rabbis!lessons_rabbi_id_fkey(name), series(title)",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
      if (status !== "all") q = q.eq("status", status);
      if (term) {
        const rabbiIds = await rabbiIdsMatching(term);
        const rabbiClause = rabbiIds.length ? `,rabbi_id.in.(${rabbiIds.join(",")})` : "";
        q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%${rabbiClause}`);
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as any[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}

/** שליפת שיעור מלא (כולל content) לפתיחת דיאלוג עריכה */
export async function fetchLessonById(id: string) {
  const { data, error } = await supabase.from("lessons").select("*").eq("id", id).single();
  if (error) throw error;
  return data as any;
}

// ─── סדרות ───────────────────────────────────────────────────────────

export type AdminSeriesTab =
  | "all" | "pending_review" | "active" | "published" | "draft" | "category" | "archived";
export type AdminAudienceFilter = "all" | "teachers" | "general";

export function useAdminSeriesCounts() {
  return useQuery({
    queryKey: ["admin-series-counts"],
    queryFn: async () => {
      const statuses = ["pending_review", "active", "published", "draft", "category", "archived"] as const;
      const head = (s?: string) => {
        let q = supabase.from("series").select("id", { count: "exact", head: true });
        if (s) q = q.eq("status", s);
        return q;
      };
      const teachersHead = supabase
        .from("series")
        .select("id", { count: "exact", head: true })
        .contains("audience_tags", ["teachers"]);
      const [all, teachers, ...rest] = await Promise.all([head(), teachersHead, ...statuses.map(s => head(s))]);
      const counts: Record<string, number> = { all: all.count ?? 0, teachers: teachers.count ?? 0 };
      counts.general = counts.all - counts.teachers;
      statuses.forEach((s, i) => { counts[s] = rest[i].count ?? 0; });
      return counts;
    },
    staleTime: 30_000,
  });
}

export function useAdminSeriesPage({
  search, tab, audience, page,
}: { search: string; tab: AdminSeriesTab; audience: AdminAudienceFilter; page: number }) {
  const term = sanitizeTerm(search);
  return useQuery({
    queryKey: ["admin-series", { term, tab, audience, page }],
    queryFn: async () => {
      let q = supabase
        .from("series")
        .select(
          // parent:parent_id — embed עצמי דרך עמודת ה-FK; ההינט series!series_parent_id_fkey לא קיים ב-schema cache
          "id, title, description, rabbi_id, parent_id, image_url, lesson_count, status, audience_tags, sort_order, show_in_parasha, created_at, rabbis!series_rabbi_id_fkey(name), parent:parent_id(id, title)",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
      if (tab !== "all") q = q.eq("status", tab);
      if (audience === "teachers") q = q.contains("audience_tags", ["teachers"]);
      if (audience === "general") q = q.not("audience_tags", "cs", "{teachers}");
      if (term) {
        const rabbiIds = await rabbiIdsMatching(term);
        const rabbiClause = rabbiIds.length ? `,rabbi_id.in.(${rabbiIds.join(",")})` : "";
        q = q.or(`title.ilike.%${term}%${rabbiClause}`);
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as any[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}

// ─── עץ הסדרות (יואב 23.7 22:12: "לנווט כאילו בתוך עץ האתר") ─────────

export interface SeriesTreeRow {
  id: string;
  title: string;
  rabbi_id: string | null;
  parent_id: string | null;
  lesson_count: number | null;
  status: string;
  audience_tags: string[] | null;
  sort_order: number | null;
  image_url: string | null;
  description: string | null;
  show_in_parasha: boolean | null;
  created_at: string;
  rabbis: { name: string } | null;
  parent: { id: string; title: string } | null;
  hasChildren: boolean;
}

/** רמת-עץ אחת: ילדי הצומת (או שורשים כש-parentId=null), עם דגל has-children. */
export function useSeriesTreeLevel(parentId: string | null) {
  return useQuery({
    queryKey: ["admin-series-tree", parentId ?? "roots"],
    queryFn: async () => {
      let q = supabase
        .from("series")
        .select(
          "id, title, description, rabbi_id, parent_id, image_url, lesson_count, status, audience_tags, sort_order, show_in_parasha, created_at, rabbis!series_rabbi_id_fkey(name), parent:parent_id(id, title)",
        )
        .neq("status", "archived")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("title", { ascending: true })
        .limit(500);
      q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const ids = rows.map((r) => r.id);
      const withChildren = new Set<string>();
      if (ids.length > 0) {
        // באצוות של 100 — רשימת in() ארוכה מדי נחתכת ב-URL
        for (let i = 0; i < ids.length; i += 100) {
          const { data: kids } = await supabase
            .from("series")
            .select("parent_id")
            .in("parent_id", ids.slice(i, i + 100))
            .neq("status", "archived")
            .limit(1000);
          for (const k of kids ?? []) if (k.parent_id) withChildren.add(k.parent_id);
        }
      }
      return rows.map((r) => ({ ...r, hasChildren: withChildren.has(r.id) })) as SeriesTreeRow[];
    },
    staleTime: 60_000,
  });
}

// ─── בורר סדרות (combobox) ───────────────────────────────────────────

export interface SeriesPickerItem {
  id: string;
  title: string;
  status: string;
  lesson_count: number | null;
  parent: { title: string } | null;
}

const PICKER_SELECT = "id, title, status, lesson_count, parent:parent_id(title)";

/**
 * חיפוש סדרות בצד השרת לבורר-עם-חיפוש.
 * ברירת מחדל: בלי קטגוריות ובלי ארכיון (זו ההצפה שהרב יואב פגש בעריכת מאמר).
 * includeId — הסדרה הנוכחית של הרשומה הנערכת נכללת תמיד, גם אם קטגוריה/ארכיון,
 * כדי שערך קיים לא "ייעלם" מהתצוגה.
 */
export function useSeriesPickerSearch({
  term, includeId, includeCategories,
}: { term: string; includeId?: string; includeCategories?: boolean }) {
  const clean = sanitizeTerm(term);
  return useQuery({
    queryKey: ["admin-series-picker", { clean, includeId: includeId ?? null, includeCategories: !!includeCategories }],
    queryFn: async () => {
      const statuses = includeCategories
        ? ["active", "published", "draft", "category"]
        : ["active", "published", "draft"];
      let q = supabase.from("series").select(PICKER_SELECT).in("status", statuses);
      if (clean) {
        q = q.ilike("title", `%${clean}%`).order("title").limit(50);
      } else {
        q = q.order("created_at", { ascending: false }).limit(30);
      }
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as unknown as SeriesPickerItem[];
      if (includeId && !rows.some(r => r.id === includeId)) {
        const { data: cur } = await supabase
          .from("series").select(PICKER_SELECT).eq("id", includeId).maybeSingle();
        if (cur) rows = [cur as unknown as SeriesPickerItem, ...rows];
      }
      return rows;
    },
    staleTime: 30_000,
  });
}

// ─── נושאים (topics) ─────────────────────────────────────────────────

export interface TopicPickerItem {
  id: string;
  name: string;
  parent_id: string | null;
  slug?: string | null;
  is_learning_style?: boolean | null;
}

/**
 * כל הנושאים לבורר (927 נכון ל-7.2026 — מתחת לתקרת ה-1000).
 * הערה: העמודה היא name — שליפת title (הבאג הישן) נכשלה בשקט והבורר באשף היה ריק.
 */
export function useTopicsForPicker() {
  return useQuery({
    queryKey: ["admin-topics-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, name, parent_id, slug, is_learning_style")
        .order("name")
        .limit(1000);
      if (error) throw error;
      // is_learning_style חסר ב-types.ts הישן (נוסף ברמה 20) — cast דרך unknown
      return (data ?? []) as unknown as TopicPickerItem[];
    },
    staleTime: 60_000,
  });
}
