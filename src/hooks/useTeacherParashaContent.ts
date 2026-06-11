/**
 * useTeacherParashaContent — data hook for Teachers Wing parasha pages.
 *
 * Fetches teacher content for a specific book + parasha combination.
 * Parasha matching: lesson titles that contain "פרשת <X>" (from DB, not bible_chapter
 * since bible_chapter is mostly null in teacher content).
 *
 * Strategy:
 *   1. Get all teacher lessons for the book
 *   2. Filter client-side by parasha name match in title
 *   3. Derive series IDs from matching lessons, fetch those series
 *
 * useTeacherWorksheetsContent — fetches content_type like "דפי עבודה" / "חוברת עבודה"
 * for a specific book.
 *
 * CANONICAL PARSHIOT (from old site — ground truth):
 *   בראשית: בראשית,נח,לך לך,וירא,חיי שרה,תולדות,ויצא,וישלח,וישב,מקץ,ויגש,ויחי (12)
 *   שמות:   שמות,וארא,בא,בשלח,יתרו,משפטים,תרומה,תצוה,כי תשא,ויקהל,פקודי (11)
 *   ויקרא:  ויקרא,צו,שמיני,תזריע,מצורע,אחרי מות,קדושים,אמור,בהר,בחוקותי (10)
 *   במדבר:  במדבר,נשא,בהעלותך,שלח,קרח,חוקת,בלק,פנחס,מטות,מסעי (10)
 *   דברים:  דברים,ואתחנן,עקב,ראה (4)
 *   נביאים+כתובים: no parshiot — only "כל התכנים" + "דפי עבודה"
 *
 * NOTE: DB has spelling variants (פינחס/פנחס, בחוקתי/בחוקותי) — normalize via
 * CANONICAL_PARSHIOT which is indexed by the canonical "old-site" name.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL_RUNTIME } from "@/integrations/supabase/client";

function getAnonKey(): string {
  return atob(
    "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CNmRtMTNabVY0WldseWRXVnNkMmwxYW5odUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpVMU5UTTFOelVzSW1WNGNDSTZNakE1TVRFeU9UVTNOWDAuVTVhZ0xrZjZqZkxVZzdVamZkblRKZmF2VXN4LWR5enhzMmZ4SmdXQXA4bw=="
  );
}

// ─── Canonical parshiot per book (from old site — ground truth) ───────────────
// Key = canonical parsha name (without "פרשת "), value = list of DB spelling variants
export const CANONICAL_PARSHIOT: Record<string, string[]> = {
  "בראשית": ["בראשית"],
  "נח":     ["נח"],
  "לך לך":  ["לך לך"],
  "וירא":   ["וירא"],
  "חיי שרה":["חיי שרה"],
  "תולדות": ["תולדות"],
  "ויצא":   ["ויצא"],
  "וישלח":  ["וישלח"],
  "וישב":   ["וישב"],
  "מקץ":    ["מקץ"],
  "ויגש":   ["ויגש"],
  "ויחי":   ["ויחי"],
  "שמות":   ["שמות"],
  "וארא":   ["וארא"],
  "בא":     ["בא"],
  "בשלח":   ["בשלח"],
  "יתרו":   ["יתרו"],
  "משפטים": ["משפטים"],
  "תרומה":  ["תרומה"],
  "תצוה":   ["תצוה"],
  "כי תשא": ["כי תשא", "כי-תשא"],
  "ויקהל":  ["ויקהל", "ויקהל פקודי", "ויקהל-פקודי"],
  "פקודי":  ["פקודי"],
  "ויקרא":  ["ויקרא"],
  "צו":     ["צו"],
  "שמיני":  ["שמיני"],
  "תזריע":  ["תזריע", "תזריע מצורע", "תזריע-מצורע"],
  "מצורע":  ["מצורע"],
  "אחרי מות":["אחרי מות", "אחרי", "אחרי-מות"],
  "קדושים": ["קדושים"],
  "אמור":   ["אמור"],
  "בהר":    ["בהר", "בהר בחוקותי", "בהר-בחוקותי"],
  "בחוקותי":["בחוקותי", "בחוקתי", "בחקתי"],
  "במדבר":  ["במדבר"],
  "נשא":    ["נשא"],
  "בהעלותך":["בהעלותך"],
  "שלח":    ["שלח", "שלח לך"],
  "קרח":    ["קרח"],
  "חוקת":   ["חוקת", "חקת"],
  "בלק":    ["בלק"],
  "פנחס":   ["פנחס", "פינחס"],
  "מטות":   ["מטות", "מטות מסעי", "מטות-מסעי"],
  "מסעי":   ["מסעי"],
  "דברים":  ["דברים"],
  "ואתחנן": ["ואתחנן"],
  "עקב":    ["עקב"],
  "ראה":    ["ראה"],
};

// Parshiot per book (old site canonical list)
export const PARSHIOT_BY_BOOK: Record<string, string[]> = {
  "בראשית": ["בראשית","נח","לך לך","וירא","חיי שרה","תולדות","ויצא","וישלח","וישב","מקץ","ויגש","ויחי"],
  "שמות":   ["שמות","וארא","בא","בשלח","יתרו","משפטים","תרומה","תצוה","כי תשא","ויקהל","פקודי"],
  "ויקרא":  ["ויקרא","צו","שמיני","תזריע","מצורע","אחרי מות","קדושים","אמור","בהר","בחוקותי"],
  "במדבר":  ["במדבר","נשא","בהעלותך","שלח","קרח","חוקת","בלק","פנחס","מטות","מסעי"],
  "דברים":  ["דברים","ואתחנן","עקב","ראה"],
  // Neviim & Ketuvim — no parshiot
};

/** Returns all variant spellings for a parsha name (for title matching) */
export function getParashaVariants(parashaName: string): string[] {
  return CANONICAL_PARSHIOT[parashaName] || [parashaName];
}

/** Check if a lesson title contains the given parasha (any variant) — R-TCH6 fix */
export function titleMatchesParasha(title: string, parashaName: string): boolean {
  const variants = getParashaVariants(parashaName);
  // §11 R-TCH6: extend matching to cover:
  //   - "פרשת-<name>" (hyphen prefix form in DB)
  //   - "<name>-<suffix>" (e.g. "בא-דף עבודה")
  //   - start/end of string
  const separators = /[\s|–\-/״'"׳`"()[\]]/;
  return variants.some((v) => {
    const vl = v;
    // Prefix forms
    if (title.includes(`פרשת ${vl}`) || title.includes(`פרשת-${vl}`)) return true;
    if (title.includes(`פרשה ${vl}`) || title.includes(`פרשה-${vl}`)) return true;
    // Starts with (e.g. "נח - דף עבודה")
    if (title === vl || title.startsWith(`${vl} `) || title.startsWith(`${vl}-`)) return true;
    // Ends with
    if (title.endsWith(` ${vl}`) || title.endsWith(`-${vl}`)) return true;
    // Word-boundary: surrounded by separators
    const idx = title.indexOf(` ${vl} `);
    if (idx >= 0) return true;
    // Additional: "/<name>" or "<name>|"
    if (title.includes(` ${vl}|`) || title.includes(`|${vl} `) ||
        title.includes(`/${vl}`) || title.includes(`${vl}/`)) return true;
    // Check each separator boundary
    const beforeIdx = title.indexOf(vl);
    if (beforeIdx >= 0) {
      const before = beforeIdx === 0 ? null : title[beforeIdx - 1];
      const after = beforeIdx + vl.length >= title.length ? null : title[beforeIdx + vl.length];
      const validBefore = before === null || separators.test(before);
      const validAfter = after === null || separators.test(after);
      if (validBefore && validAfter) return true;
    }
    return false;
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeacherParashaLesson {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  duration: number | null;
  audioUrl: string | null;
  videoUrl: string | null;
  attachmentUrl: string | null;
  thumbnailUrl: string | null;
  contentType: string | null;
  rabbiName: string | null;
  seriesId: string | null;
  seriesTitle: string | null;
}

export interface TeacherParashaSeries {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  lesson_count: number;
  rabbiName: string | null;
}

export interface TeacherParashaResult {
  lessons: TeacherParashaLesson[];
  series: TeacherParashaSeries[];
  isLoading: boolean;
}

// ─── useTeacherParashaContent ─────────────────────────────────────────────────

export function useTeacherParashaContent(
  book: string,
  parasha: string,
): TeacherParashaResult {
  const q = useQuery({
    queryKey: ["teacher-parasha-content-v1", book, parasha],
    enabled: !!book && !!parasha,
    queryFn: async () => {
      const anonKey = getAnonKey();
      const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

      // 1. Fetch all teacher lessons for this book (paginated)
      const base = `${SUPABASE_URL_RUNTIME}/rest/v1/lessons?select=id,title,description,content,duration,audio_url,video_url,attachment_url,thumbnail_url,content_type,rabbi_id,series_id&bible_book=eq.${encodeURIComponent(book)}&audience_tags=cs.%7Bteachers%7D&status=eq.published&order=title`;
      const allRaw: any[] = [];
      const PAGE = 1000;
      for (let start = 0; ; start += PAGE) {
        const resp = await fetch(base, {
          headers: { ...headers, Range: `${start}-${start + PAGE - 1}` },
        });
        if (!resp.ok) break;
        const rows = await resp.json();
        allRaw.push(...rows);
        if (rows.length < PAGE) break;
      }

      // 2. Filter by parasha in title
      const parashaRows = allRaw.filter((l) => titleMatchesParasha(l.title, parasha));

      if (parashaRows.length === 0) return { lessons: [], series: [] };

      // 3. Enrich with rabbi names
      const rabbiIds = [...new Set(parashaRows.filter((l) => l.rabbi_id).map((l) => l.rabbi_id as string))];
      let rabbiMap = new Map<string, string>();
      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase.from("rabbis").select("id, name").in("id", rabbiIds);
        rabbiMap = new Map((rabbis || []).map((r) => [r.id, r.name]));
      }

      // 4. Enrich with series titles (for context)
      const seriesIds = [...new Set(parashaRows.filter((l) => l.series_id).map((l) => l.series_id as string))];
      let seriesMap = new Map<string, { title: string; image_url: string | null; lesson_count: number; rabbi_id: string | null; description: string | null }>();
      if (seriesIds.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < seriesIds.length; i += 400) chunks.push(seriesIds.slice(i, i + 400));
        for (const chunk of chunks) {
          const { data: ss } = await supabase
            .from("series")
            .select("id, title, image_url, lesson_count, rabbi_id, description")
            .in("id", chunk);
          for (const s of ss || []) {
            seriesMap.set(s.id, {
              title: s.title,
              image_url: s.image_url,
              lesson_count: s.lesson_count,
              rabbi_id: s.rabbi_id,
              description: s.description,
            });
          }
        }
      }

      const lessons: TeacherParashaLesson[] = parashaRows.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        content: l.content ?? null,
        duration: l.duration,
        audioUrl: l.audio_url,
        videoUrl: l.video_url,
        attachmentUrl: l.attachment_url,
        thumbnailUrl: l.thumbnail_url,
        contentType: l.content_type,
        rabbiName: l.rabbi_id ? rabbiMap.get(l.rabbi_id) || null : null,
        seriesId: l.series_id,
        seriesTitle: l.series_id ? seriesMap.get(l.series_id)?.title || null : null,
      }));

      // 5. Build series list from matching lessons (unique series that have parasha lessons)
      const uniqueSeriesForParasha = new Map<string, TeacherParashaSeries>();
      for (const l of parashaRows) {
        if (l.series_id && seriesMap.has(l.series_id) && !uniqueSeriesForParasha.has(l.series_id)) {
          const s = seriesMap.get(l.series_id)!;
          uniqueSeriesForParasha.set(l.series_id, {
            id: l.series_id,
            title: s.title,
            description: s.description,
            image_url: s.image_url,
            lesson_count: s.lesson_count,
            rabbiName: s.rabbi_id ? rabbiMap.get(s.rabbi_id) || null : null,
          });
        }
      }
      const series = [...uniqueSeriesForParasha.values()].sort((a, b) =>
        a.title.localeCompare(b.title, "he"),
      );

      return { lessons, series };
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    lessons: q.data?.lessons || [],
    series: q.data?.series || [],
    isLoading: q.isLoading,
  };
}

// ─── Types for worksheets ─────────────────────────────────────────────────────

export interface TeacherWorksheetLesson {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  duration: number | null;
  audioUrl: string | null;
  videoUrl: string | null;
  attachmentUrl: string | null;
  thumbnailUrl: string | null;
  contentType: string | null;
  rabbiName: string | null;
  seriesId: string | null;
  seriesTitle: string | null;
}

export interface TeacherWorksheetsResult {
  lessons: TeacherWorksheetLesson[];
  isLoading: boolean;
}

// Worksheet content_type values (from old site + DB audit)
const WORKSHEET_CONTENT_TYPES = [
  "דפי עבודה",
  "חוברת עבודה",
  "שאלות חזרה",
  "שאלות ותשובות",
  "שאלות מקיפות",
  "שאלות עיון",
  "מבחן",
  "בחינה",
  "שאלות",
];

export function isWorksheetContentType(ct: string | null): boolean {
  if (!ct) return false;
  return WORKSHEET_CONTENT_TYPES.some((wct) => ct.includes(wct) || wct.includes(ct));
}

// ─── useTeacherWorksheetsContent ─────────────────────────────────────────────

export function useTeacherWorksheetsContent(book: string): TeacherWorksheetsResult {
  const q = useQuery({
    queryKey: ["teacher-worksheets-content-v1", book],
    enabled: !!book,
    queryFn: async () => {
      const anonKey = getAnonKey();
      const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

      // Strategy: fetch all teacher lessons for the book, filter by worksheet content_type
      // This is more reliable than querying by content_type (too many variants)
      const base = `${SUPABASE_URL_RUNTIME}/rest/v1/lessons?select=id,title,description,content,duration,audio_url,video_url,attachment_url,thumbnail_url,content_type,rabbi_id,series_id&bible_book=eq.${encodeURIComponent(book)}&audience_tags=cs.%7Bteachers%7D&status=eq.published&order=title`;
      const allRaw: any[] = [];
      const PAGE = 1000;
      for (let start = 0; ; start += PAGE) {
        const resp = await fetch(base, {
          headers: { ...headers, Range: `${start}-${start + PAGE - 1}` },
        });
        if (!resp.ok) break;
        const rows = await resp.json();
        allRaw.push(...rows);
        if (rows.length < PAGE) break;
      }

      // Filter by worksheet content types
      const worksheetRows = allRaw.filter((l) => isWorksheetContentType(l.content_type));

      if (worksheetRows.length === 0) return [];

      // Enrich with rabbi names + series titles
      const rabbiIds = [...new Set(worksheetRows.filter((l) => l.rabbi_id).map((l) => l.rabbi_id as string))];
      const seriesIds = [...new Set(worksheetRows.filter((l) => l.series_id).map((l) => l.series_id as string))];

      let rabbiMap = new Map<string, string>();
      let seriesMap = new Map<string, string>();

      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase.from("rabbis").select("id, name").in("id", rabbiIds);
        rabbiMap = new Map((rabbis || []).map((r) => [r.id, r.name]));
      }
      if (seriesIds.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < seriesIds.length; i += 400) chunks.push(seriesIds.slice(i, i + 400));
        for (const chunk of chunks) {
          const { data: ss } = await supabase.from("series").select("id, title").in("id", chunk);
          for (const s of ss || []) seriesMap.set(s.id, s.title);
        }
      }

      return worksheetRows.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        content: l.content ?? null,
        duration: l.duration,
        audioUrl: l.audio_url,
        videoUrl: l.video_url,
        attachmentUrl: l.attachment_url,
        thumbnailUrl: l.thumbnail_url,
        contentType: l.content_type,
        rabbiName: l.rabbi_id ? rabbiMap.get(l.rabbi_id) || null : null,
        seriesId: l.series_id,
        seriesTitle: l.series_id ? seriesMap.get(l.series_id) || null : null,
      }));
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    lessons: q.data || [],
    isLoading: q.isLoading,
  };
}
