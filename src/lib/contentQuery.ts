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
 * §0.3 Dual-audience public filter
 *   Old filter: .not("audience_tags","cs","{teachers}") — excluded ANY lesson tagged teachers,
 *   even dual-tagged ['general','teachers'] ones the old site showed in public.
 *   New filter: exclude ONLY teacher-ONLY rows (not tagged 'general').
 *   Rows tagged ['general','teachers'] are public AND teacher-wing (old site shows both).
 *   Applied to: sidebar children, category page, series children, search, parasha.
 *   Note: teachers redirect on /series/:id and /lessons/:id fires only for teachers-only rows.
 */

/**
 * Is this row teachers-only? (Has teachers tag but NOT general tag.)
 * Used for client-side redirect guards on /series/:id and /lessons/:id.
 */
export function isTeachersOnly(audienceTags: string[] | null | undefined): boolean {
  if (!Array.isArray(audienceTags)) return false;
  return audienceTags.includes("teachers") && !audienceTags.includes("general");
}
