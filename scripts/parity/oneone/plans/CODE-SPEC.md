# CODE-SPEC — consolidated implementation spec (all plans + 16 TOP-RISKS)

*Synthesizer output 2026-06-12. Sources: 71 code_asks across 8 plans + `code_semantics.md` TOP-RISKS table. File:line cites refer to branch `feat/navigator-bot` as audited in code_semantics.md. One release bundle — see APPLY-ORDER Stage 0.4/11.*

Risk coverage map: R1→§9, R2→§4, R3→§0.2, R4→§6, R5→§3, R6→§5, R7→§5, R8→§10, R9→§10, R10→§7, R11→§11, R12→§2, R13→§2, R14→§9+§8, R15→§2, R16→§6.

---

## §0. Cross-cutting primitives (new `src/lib/contentQuery.ts`)

**0.1 Order convention** — every lesson list: `ORDER BY sort_order ASC NULLS LAST, bible_chapter ASC NULLS LAST, title ASC`; every series-children list: `ORDER BY sort_order ASC NULLS LAST, title ASC (he)`. Band semantics for `series.sort_order`: `1..99` = sidebar position; `0/NULL` = page-only; `>=100` = parked extras (render after the band on pages, never in sidebar). [torah CA1-2, ketuvim CA2-3, neviim CA1-2, moadim CA1-3]

**0.2 Dedup by id, not title** — kill the title(+rabbi) dedup key everywhere a curated order exists (`useLessonsBySeries.ts:30-38`, `TopicPage.tsx:122-129`, `useRabbi.ts:116-123`). The plans curate exact row sets; same-title multi-part shiurim are legitimate. Display-dedup only on physical `id` (and `copied_from` chains when both source+copy land in one list). **Fixes R3 (HIGH).** [torah CA5, ketuvim CA5, neviim CA3, moadim CA6, topics CA6, rabbis CA2]

**0.3 Dual-audience public filter** — replace every `.not("audience_tags","cs","{teachers}")` with "exclude teachers-ONLY": `.or("audience_tags.cs.{general},audience_tags.not.cs.{teachers}")` (helper `publicAudienceFilter(q)`). Rows tagged `['general','teachers']` are public AND teacher-wing (old site shows them on both). Teachers-wing redirect guards fire only when teachers-only. Prerequisite for the L-conflict retag unions and the כלי-עזר/ליווי-ת"תים sections. [ketuvim CA6, moadim CA5, MERGED-REVIEW §L]

**0.4 Hebrew matching** — never raw-compare; UI dedup keys stay quote-strip-only (code_semantics §13.2) but all NEW matching code (parasha, book lookup) uses normalize_he (niqqud strip + NFC + ws-collapse + lowercase).

---

## §1. Migration SQL — new schema objects
As specified in APPLY-ORDER Stage 1: `lessons.sort_order int`, `lessons.copied_from uuid`, `lesson_topics.sort_order int`, `series.nav_visible boolean DEFAULT true`, tables `rabbi_page_items`, `teacher_listing_items`, `series_topics` (+ unique indexes + anon-SELECT RLS), views `rabbi_effective_counts`, `topic_effective_counts`, updated RPC `get_public_rabbis()` (§6). [rabbis CA10, teachers CA3, topics CA4, ketuvim CA1]

## §2. Public sidebar — `src/hooks/useContentSidebar.ts` + `src/components/layout-v2/DesignSidebar.tsx`

1. **Band-driven children** (`useContentSidebar.ts:65-106,165-246`): per parent render ONLY children with `sort_order BETWEEN 1 AND 99`, ordered `sort_order, title(he)`. Retire `sortByBiblicalOrder` fallback, forced Torah order (`:175-182`), `sortByCustomOrder` (`src/lib/sidebarOrder.ts`) and the howToLearn lesson_count-desc heuristic (`:111-148` → plain band query on root `62590949`, excluding teachers child `26e30725`). [tree CA3, CA7]
2. **Top-level = 13 entries in old order** (tree CA4): 1 ניווט-באתר link → `/bible` index (NEW route, §12), 2 פרשת-השבוע link → `/parasha`, 3 איך-לומדים, 4 תורה, 5 נביאים, 6 כתובים, 7 נושאים-כלליים, 8 מועדים, 9 הפטרות, 10 ימי-עיון, 11 כלי-עזר (root `27ca7dec` after reparent), 12 פרוייקט-התנ"ך-המוקלט (new root; page lists its 33 recorded-book series in biblical order — curated query, no reparent [moadim CA8]), 13 ליווי-ת"תים. Drop dead quick-link `/how-to-learn-tanach` (`DesignSidebar.tsx:198` → 404, `App.tsx:288-422`). **Fixes R13.**
3. **Status unification** (`useContentSidebar.ts:40-54,100-106`): books level accepts `status IN ('active','published','category')` for ALL roots (Neviim today category-only — invisible real books); section-children also accept `'category'` AND apply §0.3 audience filter; haftarot renders depth-3 (6 book-children + 83 grandchildren). **Fixes R12 (incl. R-SB1, R-SB5, R-SB6).** [tree CA6]
4. **Alias nodes render as plain links** (tree CA5, 47 slots in `tree_plan.code_asks_data.alias_slots`): 'כל השיעורים ב-X' → `/category/{parent_ref}` at the recorded 1-based position among siblings — no accordion. Keep the auto-button behavior but make the label format identical to old (`DesignSidebar.tsx:832-859`). [ketuvim CA10]
5. **חידות לילדים** = 6th child of תורה (after דברים), not hard-coded under בראשית (`DesignSidebar.tsx:901-934`); keep id usages in /parasha riddle query. [tree CA8]
6. **nav_visible split** (ketuvim CA1): book-children sidebar query adds `nav_visible=true`; CategoryPage body lists `nav_visible=false` children (rabbi source-series) — old-site disjoint sets per Ketuvim book.
7. **רבנים tab** (`DesignSidebar.tsx:85-90`): remove `slice(0,30)`; full list, he-alpha by display name; counts from `rabbi_effective_counts`; trailing "יוצרי תוכן" group pending yoav (rabbis CA8). **Fixes R15 (incl. tier-pinning removal in the tab; pinning may stay on /rabbis cards — yoav).** [rabbis CA5, CA6]
8. **נושאים tab** → §7 counts/order.

## §3. `/category/:id` — `src/pages/CategoryPage.tsx` + `useSeriesForNode` (`useContentSidebar.ts:261-346`)
- Series list: order by §0.1 band (sidebar-band first, parked ≥100 after), NOT `lesson_count desc` (`:274-282`); raise `limit(200)` → paginate or 1000 (כתובים root needs 280+, 151 psalms) [ketuvim CA4, moadim CA3]; keep draft-placeholder drop; dedup per §0.2 — same dedup as /series/:id (count-mismatch R-CAT4).
- Per-series lessons (`CategoryPage.tsx:94-113`): order §0.1 (was `published_at ASC`), same dedup as series page.
- Direct lessons (`:117-136`): order §0.1, lift cap 50 (book nodes receive direct lessons + שו"ת beyond 50) [neviim CA4].
- **Fixes R5 (R-CAT1..5).** [torah CA1]

## §4. `/series/:id` — `DesignPreviewSeriesPageV2.tsx` + `useLessonsBySeries.ts` + `useSeriesHierarchy.ts`
- Lessons (`useLessonsBySeries.ts:10-43`): order §0.1; dedup §0.2; explicit `.limit(2000)` + paging (PostgREST 1000 silent cap, R-SER6).
- Children (`useSeriesHierarchy.ts:26-40` + `:2257`): order `sort_order,title`; `status IN ('active','published')`; audience filter §0.3 (children render scrambled/leaking today). **Fixes R2 (R-SER1/2/3/5).** [neviim CA2, moadim CA2]
- Teachers redirect (`:2223-2225`): only when teachers-ONLY (§0.3).
- Empty series render an empty state, never 404 (e.g. הפטרת וילך) [moadim CA7].
- Old pages interleave series-cards + lesson rows; new renders two sections — each keeps internal old order via sort_order; **confirm split-rendering with Saar** [moadim CA9].
- Design: uniform cream-gold per the 10.6 night-session style on series/category/lesson/topic routes — verify created series inherit (topics CA7).

## §5. Lesson popups + `/lessons/:id` — `LessonPage.tsx`, `useLesson.ts`, `LessonDialog.tsx`
- **Teachers guard on `/lessons/:id`** (`useLesson.ts:4-19`, `LessonPage.tsx:81-138`): teachers-only lesson → `<Navigate to="/teachers/lesson/:id">` (mirror of the series fix). Same guard in `LessonDialog`. **Fixes R6.** [neviim CA5]
- **Attachment rendering in LessonDialog** (`LessonDialog.tsx:517-541`): replicate LessonPage logic — `.pdf` → native iframe; `.doc/.docx` → `view.officeapps.live.com/op/embed.aspx`; Google-Drive links → `drive.google.com/file/d/<id>/preview` (NEVER gview — the dead-gview incident); anything else / frame-refusal (onerror/timeout) → prominent download CTA, not a blank frame. **Fixes R7.**
- **Full body text**: `content` sanitized HTML, full, no truncation; else `description`. Popup full text+file = stated goal; scrape queue fills missing `content` (APPLY-ORDER Stage 6.3). Related-lessons list ordered §0.1 (R-LES2).

## §6. Rabbi pages — `RabbiPage.tsx`, `useRabbi.ts`, `RabbisList.tsx`, RPC
- **rabbi_page_items-driven page** (rabbis CA1): when rows exist, render EXACTLY them, `sort_order ASC`, ONE flat list — series rows as cards (link `/series/:id`), lesson rows as table rows (rabbi link + duration + download), qa rows like old שו"ת (popup with full text [neviim CA6]). Replaces `useRabbiSeries`+`useRabbiLessons` (`useRabbi.ts:52-126`, `RabbiPage.tsx:133-184`): no `limit(60)`, no cap-20, no `published_at DESC`, no guest-series inflation. **Fixes R4 + R16.**
- **Media filter pills, no pagination** (rabbis CA4): כל הסוגים / וידאו / אודיו / טקסט-PDF / שאלות-ותשובות; classification kind='qa'→שו"ת, else video_url→וידאו, else audio_url→אודיו, else טקסט/PDF; series pill by dominant lesson media.
- **Fallback** when no rpi rows (rabbis CA3 — e.g. הרב שמעון לוי, old empty-by-bug → sane behavior per policy): owned series (active/published, §0.3) + all his published public lessons, series-first then §0.1, uncapped.
- **Counts** (rabbis CA6): view `rabbi_effective_counts` = COUNT(rpi kind IN ('lesson','qa')) + SUM(series.lesson_count) over kind='series'; fallback = published public lesson count. Never display stale `rabbis.lesson_count`, never copy old nav numbers (wrong for 85/154 on the old site itself).
- **RPC `get_public_rabbis()`** (rabbis CA7, migration `20260603_get_public_rabbis_rpc.sql`): `entity_type='rabbi' AND status='active' AND (EXISTS rpi OR effective_count>0)` — replaces `lesson_count>0`. Keep client entity belt (`useRabbis.ts:56-58`).
- **Slug route guard** (rabbis CA9, `useRabbi.ts:15-29`): add `status='active'` + entity_type check on deep-linked slugs; keep UUID→slug redirect.

## §7. Topics — `useTopicsSidebar.ts`, `TopicPage.tsx`, `useTopics.ts`
- Sidebar order = `topics.sort_order ASC` (not computed-count desc, `useTopicsSidebar.ts:81`) [topics CA2]; badge count = `topic_effective_counts` view (published + non-teachers-only + id-dedup) so badge == page count. **Fixes R10 (R-SB3/R-TOP3).** [topics CA1]
- TopicPage order = `lesson_topics.sort_order ASC NULLS LAST` (not `published_at DESC`); merged-topic extras trail at 1000+ [topics CA3]. Apply `limit` AFTER filter (largest topic 246 items) [topics CA5]; dedup §0.2.
- **Series-cards interleave** (topics CA4): also query `series_topics`; interleave lessons+series rows by shared sort ladder; series-card component → `/series/:id`. Without it, תנ"ך מוקלט (33 cards) and לימוד-בקצב-של-פרק-לשיעור (38) render EMPTY.
- Library strip `useTopics()` (`useTopics.ts:13-22`) → themes-root children only (R-LIB2) [topics CA8]. Cream-gold design check on the 2 new topics [topics CA7].

## §8. `/bible/:book` + NEW `/bible` index — `useBible.ts`, `BibleBookPage.tsx`
- NEW `/bible` route: book-and-chapter navigation index (sidebar top-entry 1 target) [tree CA1, torah CA3].
- `useBookCategoryId` (`useBible.ts:98-130`): replace `maybeSingle()` with `.limit(2)` + deterministic pick (parent IN roots, status precedence category>active>published) + console.warn on dup titles (R-BIB1, part of **R14**).
- `useBibleBookSeries` (`:71-92`): `lesson_count>0` → descendant-aware (gate on `EXISTS(descendant published lesson)` or precomputed rollup) so intermediate containers don't vanish (R-BIB2).

## §9. `/parasha` — `useParasha.ts`, `ParashaPage.tsx`
- **Anchor to the canonical parasha node**: resolve current parasha → its event-series under the chumash (e.g. 'פרשת קורח | טז-יח', tree node by exact normalized title `פרשת <X>`), then content = descendants union direct lessons of that node, ordered §0.1; PLUS keep the aggregate section (the 11.6 useParasha aggregation) for cross-refs — but the bare `ilike '%<name>%'` main query (`useParasha.ts:66-75`) becomes a SECONDARY source, word-boundary-matched (` <name> ` / `פרשת <name>`), and never displaces node content (limit applies after node rows). **Fixes R1 (HIGH — short names בא/צו/נח/ראה/שלח/בלק/עקב/אמור).** [torah CA4]
- All exact-title lookups (`:112-121,164-169,232-236`): `maybeSingle()` → `.limit(2)`+pick+warn (rest of **R14**); article series accept `status IN ('active','published')` (R-PAR3).
- Riddle query keeps id `c852edd8` (tree CA8).

## §10. Catalog + search — `useTopSeries.ts`, `useGlobalSearch.ts`
- `useTopSeries.ts:20`: `status IN ('active','published')`. **Fixes R9** (and makes the 62 O-conflict status values moot).
- `useGlobalSearch.ts:108-138`: series bucket `status IN ('active','published')`; rabbis bucket filtered by entity_type='rabbi' (or get_public_rabbis ids) — content_creator institutions stop surfacing as rabbis; lessons bucket: audience filter §0.3 + `ORDER BY sort_order NULLS LAST, title` (was unordered cap 8). **Fixes R8.**

## §11. Teachers wing — `useTeacherSidebar.ts`, `useTeacherBookContent.ts`, `TeachersSeriesPage.tsx`, `TeachersLessonPage.tsx`, `TeacherLessonModal.tsx`, `useTeacherParashaContent.ts`
- **Sidebar ראשי tab = tree-driven** (tree CA10, teachers CA10): top order פרשת-השבוע (link, current parasha) → איך-מלמדים (`26a5e728`) → תורה → נביאים → כתובים; books + children by `series.sort_order` (tree_plan sets it) — replaces bible_book+title-match bucketing with 500/300 caps (`useTeacherSidebar.ts:97-176`). Per-parsha links via existing `/teachers/parasha/:book/:parasha` + `PARSHIOT_BY_BOOK` — VERIFY against the 48 slots in `tree_plan.code_asks_data.teachers_parsha_slots` (old per-book lists, old order) [tree CA9]. **Fixes R11 (R-TCH1/R-TCH3).**
- **סוג תוכן tab** (teachers CA4): exactly the 22 old types in the old fixed order, counts = `teacher_listing_items` rows per key (not raw lesson counts, not the old 3x-inflated numbers). `/teachers/content-type/:type` renders `teacher_listing_items` WHERE scope='content_type' AND key=:type ORDER BY sort_order — series rows as cards, lesson rows as modal rows (teachers CA3).
- **יוצרים tab** (teachers CA5-6): exactly the 31 old creators in old he-alpha order from the fixed id list; include dual-role rabbis regardless of entity_type/status filters. `/teachers/creator/:id` renders from rabbi_page_items (kind+sort_order); fallback (only הרב יהודה בשושה, old empty-table bug) → his actual teacher-tagged content [teachers CA7].
- `TeachersSeriesPage.tsx:69-126`: lessons `status='published'`, order `sort_order NULLS LAST, title`, keep wing chrome only for teachers-audience series; `TeachersLessonPage.tsx:43-77`: published + teachers-audience guard (R-TCH4) [teachers CA9].
- `TeacherLessonModal`: FULL content + attachment download on every entry point; lazy-fetch content by id when the listing omitted it [teachers CA8]. Attachment viewer per §5 rules.
- Parasha title-matching (`useTeacherParashaContent.ts:39-87`): extend variants with normalize_he + hyphen/prefix forms (R-TCH6).
- CA1/CA2 (tabs renamed; FilterPanel removed) — verified done, keep.

## §12. Routes — `src/App.tsx:288-422`
Add `/bible` (index). Keep `*`→NotFound. No other new routes (teachers parasha/worksheets exist).

---

### Out of scope for code (apply-stage duties referenced by plans)
copy_lesson full-row semantics + `copied_from` stamp, lesson_count recompute, Rule-13 rehost, `needs_content_scrape`, publish_lesson support, tmp-id resolution — see APPLY-ORDER Stages 5–10. [ketuvim CA7-9, moadim CA10, torah CA6, neviim CA7]
