/**
 * legacyResolver — maps old Umbraco content URLs (www.bneyzion.co.il) to the
 * exact series/lesson page on the new site, entirely in-house (no vercel.json
 * redirects, per Saar's rule) and entirely client-side against Supabase with
 * the public anon key.
 *
 * Old URL shape:
 *   /מאגר-עזרי-הלמידה/{מדור: תורה|נביאים|כתובים}/{ספר}/{סדרה-slug}[/{שיעור-slug}]
 *   /מאגר-עזרי-הלמידה/{סדרה-slug}[/{שיעור-slug}]              (e.g. איך-מלמדים-תנך)
 *   /מאגר-השיעורים-והמאמרים/...                               (same shape)
 * where slug = the Hebrew title with hyphens instead of spaces and without
 * commas / quotes / geresh-gershayim.
 *
 * SEO note: this resolution is client-side, i.e. a JS redirect. Google treats
 * a JS location change as a redirect and indexes the destination; the
 * canonical URL remains the target page's own canonical. When the
 * bneyzion.co.il domain moves to the new site, old Google results land here,
 * get resolved, and consolidate onto the exact new page.
 *
 * ⚠️ scripts/test_legacy_urls.py mirrors this normalization + resolution
 * logic in Python for offline verification — keep the two in sync.
 */

import { supabase } from "@/integrations/supabase/client";

/** Legacy top-level roots whose descendants are content (series/lessons). */
export const LEGACY_CONTENT_ROOTS = new Set([
  "מאגר-עזרי-הלמידה",
  "מאגר-השיעורים-והמאמרים",
]);

/** Old-site section names — positional markers, not content. */
const SECTION_NAMES = new Set(["תורה", "נביאים", "כתובים"]);

/**
 * Bidirectional normalization: turns either a URL slug or a DB title into the
 * same comparison key. lower-case, strip commas/quotes/geresh/gershayim/dots,
 * collapse all hyphen variants + whitespace into a single space.
 */
export function normalizeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[,"'`’‘“”׳״.!?():;]/g, "")
    .replace(/[-–—ـ־_\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Canonical Tanakh book names as stored in series.bible_book / lessons.bible_book
 * (space-separated, e.g. "שמואל א"), keyed by their normalized form, plus known
 * spelling variants ("ישעיה" → "ישעיהו", "תהילים" → "תהלים").
 */
const CANONICAL_BOOKS = [
  // תורה
  "בראשית", "שמות", "ויקרא", "במדבר", "דברים",
  // נביאים
  "יהושע", "שופטים", "שמואל", "שמואל א", "שמואל ב",
  "מלכים", "מלכים א", "מלכים ב",
  "ישעיהו", "ירמיהו", "יחזקאל",
  "הושע", "יואל", "עמוס", "עובדיה", "יונה", "מיכה",
  "נחום", "חבקוק", "צפניה", "חגי", "זכריה", "מלאכי", "תרי עשר",
  // כתובים
  "תהלים", "משלי", "איוב", "שיר השירים", "רות", "איכה", "קהלת",
  "אסתר", "דניאל", "עזרא", "נחמיה", "עזרא ונחמיה",
  "דברי הימים", "דברי הימים א", "דברי הימים ב",
];

const BOOK_LOOKUP: Record<string, string> = {};
for (const b of CANONICAL_BOOKS) BOOK_LOOKUP[normalizeSlug(b)] = b;
// Spelling variants seen on the old site / in old data
BOOK_LOOKUP[normalizeSlug("ישעיה")] = "ישעיהו";
BOOK_LOOKUP[normalizeSlug("ירמיה")] = "ירמיהו";
BOOK_LOOKUP[normalizeSlug("תהילים")] = "תהלים";
BOOK_LOOKUP[normalizeSlug("קוהלת")] = "קהלת";

/** Returns the canonical DB book name for a URL segment, or null. */
export function canonicalBook(segment: string): string | null {
  return BOOK_LOOKUP[normalizeSlug(segment)] ?? null;
}

/** Words too generic to use as an ilike anchor. */
const STOP_WORDS = new Set([
  "פרשת", "פרשות", "פרשה", "חומש", "ספר", "פרק", "פרקים",
  "על", "עם", "של", "לפי", "סדר", "כל", "אל", "את", "בין", "מן",
]);

/**
 * Picks up to `max` anchor words from a normalized slug for ilike retrieval,
 * longest first, skipping stop words (falls back to stop words if nothing else).
 */
export function pickSearchWords(normalized: string, max = 3): string[] {
  const words = normalized.split(" ").filter((w) => w.length >= 2);
  const good = words.filter((w) => !STOP_WORDS.has(w));
  const pool = good.length > 0 ? good : words;
  return [...new Set(pool)].sort((a, b) => b.length - a.length).slice(0, max);
}

/** Escape ilike wildcards in a user-derived word. */
function escapeIlike(word: string): string {
  return word.replace(/[\\%_]/g, (m) => "\\" + m);
}

interface SeriesRow {
  id: string;
  title: string;
  bible_book: string | null;
  status: string;
}

interface LessonRow {
  id: string;
  title: string;
  bible_book?: string | null;
  status: string;
}

function preferPublished<T extends { status: string }>(rows: T[]): T | null {
  if (rows.length === 0) return null;
  return rows.find((r) => r.status === "published") ?? rows[0];
}

/**
 * Finds a series whose normalized title equals the normalized slug.
 * Retrieval: ilike on the 1-2 strongest words (AND), then exact normalized
 * comparison client-side. Multiple matches (e.g. the 5 "חידות לילדים —
 * פרשת השבוע" series, one per חומש) are disambiguated by bible_book vs the
 * book segment from the URL.
 */
async function findSeries(slug: string, book: string | null): Promise<SeriesRow | null> {
  const target = normalizeSlug(slug);
  if (!target) return null;
  const words = pickSearchWords(target);
  if (words.length === 0) return null;

  const attempts: string[][] = [];
  if (words.length >= 2) attempts.push([words[0], words[1]]);
  for (const w of words) attempts.push([w]);

  let matches: SeriesRow[] = [];
  for (const attempt of attempts) {
    let q = supabase.from("series").select("id,title,bible_book,status");
    for (const w of attempt) q = q.ilike("title", `%${escapeIlike(w)}%`);
    const { data, error } = await q.limit(400);
    if (error || !data) continue;
    matches = (data as SeriesRow[]).filter((r) => normalizeSlug(r.title) === target);
    if (matches.length > 0) break;
  }
  if (matches.length === 0) return null;

  if (book && matches.length > 1) {
    const bookNorm = normalizeSlug(book);
    const byBook = matches.filter(
      (r) => r.bible_book && normalizeSlug(r.bible_book) === bookNorm,
    );
    if (byBook.length > 0) matches = byBook;
  }
  return preferPublished(matches);
}

/** Finds a lesson inside a specific series by normalized title equality. */
async function findLessonInSeries(seriesId: string, slug: string): Promise<LessonRow | null> {
  const target = normalizeSlug(slug);
  if (!target) return null;
  const { data, error } = await supabase
    .from("lessons")
    .select("id,title,status")
    .eq("series_id", seriesId)
    .limit(500);
  if (error || !data) return null;
  const matches = (data as LessonRow[]).filter((r) => normalizeSlug(r.title) === target);
  return preferPublished(matches);
}

/** Global lesson search (same retrieval strategy as findSeries). */
async function findLessonGlobal(slug: string, book: string | null): Promise<LessonRow | null> {
  const target = normalizeSlug(slug);
  if (!target) return null;
  const words = pickSearchWords(target);
  if (words.length === 0) return null;

  const attempts: string[][] = [];
  if (words.length >= 2) attempts.push([words[0], words[1]]);
  for (const w of words) attempts.push([w]);

  let matches: LessonRow[] = [];
  for (const attempt of attempts) {
    let q = supabase.from("lessons").select("id,title,bible_book,status");
    for (const w of attempt) q = q.ilike("title", `%${escapeIlike(w)}%`);
    const { data, error } = await q.limit(400);
    if (error || !data) continue;
    matches = (data as LessonRow[]).filter((r) => normalizeSlug(r.title) === target);
    if (matches.length > 0) break;
  }
  if (matches.length === 0) return null;

  if (book && matches.length > 1) {
    const bookNorm = normalizeSlug(book);
    const byBook = matches.filter(
      (r) => r.bible_book && normalizeSlug(r.bible_book) === bookNorm,
    );
    if (byBook.length > 0) matches = byBook;
  }
  return preferPublished(matches);
}

/**
 * Resolves an old-site rabbi name (the ?rav= query param of
 * /מאגר-השיעורים-והמאמרים/רבנים?rav=הרב יונדב זר) to the new /rabbis/:slug.
 * Mirrors api/legacy-redirect.js: exact name first, then the titled form,
 * then the shortest ilike match (the individual rabbi, not a duo page).
 */
export async function resolveRabbiSlug(rawName: string): Promise<string | null> {
  const name = rawName.trim();
  if (!name) return null;
  const stripped = name.replace(/^(הרב|הרבנית|רב)\s+/, "");
  if (stripped.length < 2) return null;
  const { data, error } = await supabase
    .from("rabbis")
    .select("slug,name")
    .ilike("name", `%${escapeIlike(stripped)}%`)
    .limit(5);
  if (error || !data || data.length === 0) return null;
  const rows = data as { slug: string; name: string }[];
  const exact =
    rows.find((r) => r.name === name) ??
    rows.find(
      (r) =>
        r.name === `הרב ${stripped}` ||
        r.name === `הרבנית ${stripped}` ||
        r.name === stripped,
    );
  if (exact) return exact.slug;
  return [...rows].sort((a, b) => a.name.length - b.name.length)[0].slug;
}

/** True when a decoded pathname belongs to a legacy content repository. */
export function isLegacyContentPath(decodedPathname: string): boolean {
  const first = decodedPathname.replace(/^\/+/, "").split("/")[0] ?? "";
  return LEGACY_CONTENT_ROOTS.has(first);
}

export interface LegacyResolution {
  /** New-site path to navigate to. Always present — never a dead 404. */
  target: string;
  /** How the target was found (for logging/tests). */
  via: "lesson" | "series" | "sub-series" | "lesson-global" | "book" | "library";
}

/**
 * Resolves a decoded legacy content pathname to the exact new-site page.
 * Graded fallback: lesson-in-series → series → sub-series → global lesson →
 * book page (/bible/:book) → series library (/series?q=). Never returns the
 * teachers page and never leaves a Hebrew content path on a dry 404.
 */
export async function resolveLegacyContentUrl(decodedPathname: string): Promise<LegacyResolution> {
  const segs = decodedPathname
    .split("?")[0]
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  // segs[0] = repository root; the rest describe the content tree.
  const rest = segs.slice(1);

  // The old rabbis index (/root/רבנים, personal pages carried ?rav= which is
  // handled earlier in NotFound) belongs on /rabbis, not in the series library.
  if (rest.some((s) => normalizeSlug(s) === "רבנים")) {
    return { target: "/rabbis", via: "library" };
  }

  let book: string | null = null;
  let content: string[] = rest;

  if (rest.length > 0 && SECTION_NAMES.has(normalizeSlug(rest[0]))) {
    // /root/תורה/במדבר/... → book is positional (segment after the section)
    book = rest.length > 1 ? canonicalBook(rest[1]) : null;
    content = rest.slice(book ? 2 : 1);
  } else if (rest.length > 0) {
    const maybeBook = canonicalBook(rest[0]);
    if (maybeBook) {
      book = maybeBook;
      content = rest.slice(1);
    }
  }

  // Old index pages (נושאים/?subject=, יוצרים/?rav=) carry no series slug.
  content = content.filter(
    (s) => !["נושאים", "יוצרים"].includes(normalizeSlug(s)),
  );

  const fallback = (): LegacyResolution => {
    if (book) return { target: `/bible/${encodeURIComponent(book)}`, via: "book" };
    const q = content.length > 0 ? normalizeSlug(content[content.length - 1]) : "";
    return {
      target: q ? `/series?q=${encodeURIComponent(q)}` : "/series",
      via: "library",
    };
  };

  if (content.length === 0) return fallback();

  const seriesSlug = content[0];
  const lessonSlug = content.length > 1 ? content[content.length - 1] : null;

  try {
    const series = await findSeries(seriesSlug, book);

    if (series && lessonSlug) {
      const lesson = await findLessonInSeries(series.id, lessonSlug);
      if (lesson) return { target: `/lessons/${lesson.id}`, via: "lesson" };
      // The deepest segment may itself be a nested series (series.parent_id).
      const sub = await findSeries(lessonSlug, book);
      if (sub) return { target: `/series/${sub.id}`, via: "sub-series" };
      return { target: `/series/${series.id}`, via: "series" };
    }

    if (series) return { target: `/series/${series.id}`, via: "series" };

    // No series match — the deepest segment might be a lesson or a series on its own.
    const lastSlug = content[content.length - 1];
    if (lastSlug !== seriesSlug) {
      const deepSeries = await findSeries(lastSlug, book);
      if (deepSeries) return { target: `/series/${deepSeries.id}`, via: "series" };
    }
    const lesson = await findLessonGlobal(lastSlug, book);
    if (lesson) return { target: `/lessons/${lesson.id}`, via: "lesson-global" };
  } catch {
    // Network/API failure — fall through to the graceful fallback below.
  }

  return fallback();
}
