# VERIFY — oneone verification report
*Generated 2026-06-12 08:47 by oneone_verify.py — read-only anon-REST simulation of the CURRENT working-tree UI hooks against the live DB.*

REST calls: 203 (cache hits 0, errors 0)

> 🔴 **P0 HARNESS FINDING — PGRST100:** TopicPage.tsx:112 sends or=(lessons.audience_tags...) at top level — PostgREST rejects it (PGRST100, needs lessons.or=(...)) → production topic pages error out. Harness verified topic data with the equivalent foreign-table filter.

## Summary

| Section | Pass | Total | Pass rate |
|---|---|---|---|
| Rabbi pages | 113 | 154 | 73.4% |

## 3. Rabbi pages

rabbi_page_items table: available; used for 131 rabbis (rest = fallback owned-series + lessons).

113/154 PASS. Worst 15 by missing lessons:

- **הרב עמנואל בן ארצי**: series old=26 new=21 missing=6 | lessons old=22 new=26 missing=4 extra=8 order_ok=False
- **ושננתם**: series old=6 new=6 missing=0 | lessons old=34 new=29 missing=7 extra=2 order_ok=True
- **הרב חגי ולוסקי**: series old=5 new=1 missing=4 | lessons old=5 new=3 missing=2 extra=0 order_ok=True
- **הרב יואב אוריאל**: series old=50 new=50 missing=0 | lessons old=94 new=114 missing=6 extra=26 order_ok=True
- **הרב יהונתן מיכאלי**: series old=5 new=1 missing=4 | lessons old=0 new=0 missing=0 extra=0 order_ok=True
- **הרב יוסף שילר**: series old=5 new=1 missing=4 | lessons old=11 new=25 missing=0 extra=14 order_ok=True
- **הרב שלמה אבינר**: series old=11 new=8 missing=4 | lessons old=0 new=0 missing=0 extra=0 order_ok=True
- **הרב איתן שנדורפי**: series old=30 new=30 missing=0 | lessons old=73 new=94 missing=2 extra=23 order_ok=True
- **הרב אריה אוריאל**: series old=0 new=0 missing=0 | lessons old=2 new=10 missing=2 extra=10 order_ok=True
- **הרב יהונתן עידן**: series old=3 new=1 missing=2 | lessons old=0 new=0 missing=0 extra=0 order_ok=True
- **הרב מנחם שחור**: series old=7 new=7 missing=0 | lessons old=64 new=81 missing=2 extra=19 order_ok=True
- **מערכת בני ציון**: series old=6 new=6 missing=0 | lessons old=2 new=0 missing=2 extra=0 order_ok=True
- **הרב אס"ף בנדל**: series old=0 new=0 missing=0 | lessons old=15 new=20 missing=1 extra=6 order_ok=True
- **הרב אריה אברמסון**: series old=0 new=0 missing=0 | lessons old=5 new=5 missing=1 extra=1 order_ok=True
- **הרב יוסי ברינר**: series old=0 new=0 missing=0 | lessons old=31 new=46 missing=1 extra=16 order_ok=True

## Harness notes / limitations

- Queries replicate supabase-js REST emission of the CURRENT working-tree hooks (useContentSidebar, useSeriesChildren+useLessonsBySeries for /series/:id, useRabbi*, useTopicsSidebar/useTopicLessons, useTeacherSidebar/useTeacherBookContent) — including implicit 1000-row PostgREST caps where the app sends no limit.
- Hebrew collation approximated by codepoint order (browser localeCompare('he') may differ on geresh/maqaf edge cases).
- torah/ketuvim old listing scrape carries lesson rows only (series cards live in sub_links) → series-card diff for those pages is not checked (reported as series_new_unchecked).
- 'planned_extras' = extra new lessons whose id is placed in this series by RESOLVED-OPS; 'planned_removals' = extras the plan drafts or moves elsewhere (expected to disappear after apply).
- Old rav pages aggregate a series into ONE row; lessons inside series are not listed there — rabbi lesson diffs compare the old flat rows vs the new flat list (post-fix exhaustive list).