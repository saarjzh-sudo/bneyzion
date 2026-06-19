/**
 * contentQuery.ts — shared query helpers for the public content tree.
 *
 * §0 cross-cutting primitives (CODE-SPEC 2026-06-12):
 *
 * §0.1 Order convention
 *   Every lesson list: sort_order ASC NULLS LAST, bible_chapter ASC NULLS LAST, title ASC
 *   Every series-children list: sort_order ASC NULLS LAST, title ASC (he-alpha)
 *   sort_order band semantics on series:
 *     1..99  = sidebar position (always visible in sidebar)
 *     0/NULL = page-only (visible on category/series pages, not in sidebar)
 *     >=100  = parked extras (shown on pages after the main band, never in sidebar)
 *
 * §0.3 Public audience filter — STRICT (REVERTED 14.6.2026, Saar round-3)
 *   The 12.6 "dual-audience" experiment was WRONG. It assumed rows tagged
 *   ['general','teachers'] should appear in BOTH the public tree and the teacher wing
 *   ("old site shows both"). It does not. Saar confirmed: teacher content — worksheets
 *   (דפי עבודה), kids riddles (חידות לילדים), comprehensive questions (שאלות מקיפות),
 *   maps (מפות עזר), ביאור ושננתם — must NEVER appear in the public content lists.
 *   Audit (14.6): all 270 ['general','teachers'] rows are teacher-format content that the
 *   migration cross-tagged; ZERO are genuine public shiurim. The loose filter also let
 *   CategoryPage's standalone band (useDirectLessons, which had NO filter at all) leak
 *   14 teacher shiurim per chumash.
 *   STRICT RULE NOW: exclude ANY lesson/series tagged 'teachers' →
 *     .not("audience_tags","cs","{teachers}")   (matches useParasha / useBible / useRabbi)
 *   Applied to: sidebar tree, category page (cards + standalone band), node lessons,
 *   series pages, topic pages/sidebar, recommendations, search, parasha, bible.
 */

/**
 * Is this row teachers-only? (Has teachers tag but NOT general tag.)
 * Used for client-side redirect guards on /series/:id and /lessons/:id.
 */
export function isTeachersOnly(audienceTags: string[] | null | undefined): boolean {
  if (!Array.isArray(audienceTags)) return false;
  return audienceTags.includes("teachers") && !audienceTags.includes("general");
}
