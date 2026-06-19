/**
 * Sections whose dual-tagged (`['teachers','general']`) PUBLISHED content is genuinely
 * public — it appears on BOTH the public repository AND the teacher wing of the old site
 * (Saar 15.6.2026 decision, סבב 3). For these roots ONLY we relax the strict
 * `.not(audience_tags cs {teachers})` public filter, so dual-audience study-aids show.
 *
 * The strict filter STAYS everywhere else (parasha / topic / category / rabbi / search /
 * sidebar node lists) — that is what stops the 5,291-teacher-worksheet leak (14.6 "זה מחדל").
 *
 * Ground truth (old public page):
 *   /מאגר-השיעורים-והמאמרים/כלי-עזר-טבלאות-זמני-המאורעות-ומפות
 *   → 20 public items, incl. 6 maps/timelines by הרב עמנואל בן ארצי.
 *
 * KNOWLEDGE.md:1719 — a `published`-status series/lesson tagged `['teachers','general']`
 * is legitimate public content; only a `category`-status dual node is a teacher-org node.
 */
export const PUBLIC_DUAL_ALLOWED_ROOTS = new Set<string>([
  "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7", // כלי עזר - טבלאות זמני המאורעות ומפות (root)
  "4d78557b-da8b-4b1f-8d8e-09d74ff3070a", // מפות עזר לתנ"ך (sub-series under כלי עזר)
]);

export const isPublicDualAllowed = (id: string | null | undefined): boolean =>
  !!id && PUBLIC_DUAL_ALLOWED_ROOTS.has(id);
