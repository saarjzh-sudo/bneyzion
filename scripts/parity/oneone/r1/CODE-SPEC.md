# CODE-SPEC — Review Round 1 (category-page layout)

**Scope:** code changes only. No data writes in this file (the "1 vs 15" lesson-count gap is a
DATA fix, tracked separately — see §4). Branch in prod = `feat/navigator-bot`.

**Ground truth proven (old www.bneyzion.co.il category pages):**

| book | old `סדרה` rows | old standalone `שיעור` | old `שו"ת` | parsha `פרשת% \| %` rows on category page |
|------|----:|----:|----:|----:|
| בראשית | 28 | 39 | 20 | **0** |
| ויקרא | 22 | 15 | 7 | **0** |
| במדבר | (rows present) | — | — | **0** |

Source: `r1/gt_בראשית.json` (`counts.parsha_on_category = 0`, `parsha_on_category_rows = []`),
`r1/gt_ויקרא.json` (`pipe_parsha_event_series_on_category_page = []`),
`r1/gt_במדבר.json` (`parsha_event_rows_on_category = []`).

**Root cause confirmed in DB.** Direct children of the `בראשית` book node
`db78e0a3-3bcf-4009-96b8-49c76df555f9` (41 rows):
- 12 parsha event-series clones titled `פרשת <name> | <range>` with **`sort_order` = 1..12**
  (e.g. `פרשת בראשית | א-ו` so=1 lc=56, `פרשת נח | ו-יא` so=2 lc=69 …).
- 29 real rabbi/topic series + category containers with **`sort_order` = 0**
  (e.g. `מאמרים - חומש בראשית` lc=73, `הרב אבינר על פרשיות בראשית` lc=25 …).

`useSeriesForNode` pulls ALL descendants and its sort ranks band 1-99 FIRST → the parsha clones
sort to the top; `SeriesBlock` then renders every card with `expanded = true` (default open) and
the page ALSO renders a duplicate "כל השיעורים" roll-up section. That is exactly Saar's complaint:
parsha event-series shown open with rolled-up lessons instead of a flat list of CLOSED rabbi-series
cards + standalone lessons + שו"ת.

---

## 1. CategoryPage.tsx + useSeriesForNode + useRollupLessons — STOP the roll-up-open layout

### 1a. EXCLUDE parsha event-series and teacher-only series from the series list

**File:** `src/hooks/useContentSidebar.ts`, hook `useSeriesForNode` (lines 280-381).

The series query (lines 295-305) and the JS canonical dedup (lines 316-365) must drop parsha
event-series. Add a pattern guard. The detect rule is **pattern-scoped** (`title ~ '^פרשת .* | .*'`),
NOT book-scoped — see RISK §R1 for why this is safe for Neviim/Ketuvim.

- After fetching `series` (line 306), add an exclusion in `seriesFiltered` (line 316-318). Currently:
  ```ts
  const seriesFiltered = series.filter(
    (s) => !(s.status === "draft" && (s.lesson_count ?? 0) === 0 && s.parent_id === nodeId),
  );
  ```
  Add a parsha-clone predicate. Define near `normTitle` (line 310):
  ```ts
  // Parsha event-series clones (consolidation nodes) live in the sidebar tree only —
  // they must NOT appear as category-page series rows. Old site shows 0 of them.
  // Pattern: "פרשת <name> | <chapter-range>"  e.g. "פרשת נח | ו-יא".
  const isParshaEventSeries = (t: string) => /^\s*פרשת\b.*\|\s*[א-ת]/.test(t.trim());
  ```
  and apply:
  ```ts
  const seriesFiltered = series.filter(
    (s) =>
      !isParshaEventSeries(s.title) &&
      !(s.status === "draft" && (s.lesson_count ?? 0) === 0 && s.parent_id === nodeId),
  );
  ```
  Note: `audience_tags.not.cs.{teachers}` filter already runs at line 301 (teacher-only excluded) —
  keep it. The `.or(...)` keeps general + dual-tagged; teacher-only series are already gone.

- Because the parsha clones carry `sort_order` 1..12 and the real series carry 0, removing them
  means the canonical sort (lines 349-365) now ranks the remaining real series. The band logic
  currently puts `sort_order 0/NULL` in band 2 ("page-only") behind band 1 (`>=100`). With the
  parsha clones gone, ALL surviving rabbi-series are `sort_order = 0` → same band → they fall
  through to the `lesson_count desc` tiebreak (line 364), which is acceptable. **Recommended:**
  to mirror the old site's alphabetical-ish series ordering, change the final return ordering so
  that within the page-only band the rows sort by Hebrew title. Add to the comparator before the
  `lesson_count` return:
  ```ts
  // both page-only (sort_order 0/NULL): old site lists series alphabetically by title
  if (bandA === 2 && bandB === 2) return a.title.localeCompare(b.title, "he");
  ```

### 1b. CategoryPage — render CLOSED cards, drop the inline accordion + the duplicate roll-up

**File:** `src/pages/CategoryPage.tsx`.

The current page has THREE problems, all to remove:

1. **`SeriesBlock` defaults to open** — `const [expanded, setExpanded] = useState(true);` at
   **line 552**. It fetches each series' lessons via `useSeriesLessons` (lines 94-127) and renders
   them inline. Replace `SeriesBlock` with a CLOSED card that links to `/series/:id` — no accordion,
   no `useSeriesLessons` call, no inline `LessonRow` list.

2. **The "כל השיעורים" roll-up section** — lines 499-529 (`!lessonsLoading && !rollupLoading &&
   allLessons.length > 0`) renders EVERY descendant lesson again. This is the rolled-up dump Saar
   does not want. **Delete this whole section** and the supporting machinery:
   - `useRollupLessons` hook (lines 187-241) — delete.
   - `hasChildSeries` + `useRollupLessons(...)` call (lines 261-262) — delete.
   - `rollupLessons`, `rollupLoading`, the `allLessons` combiner (lines 274-285) — delete.
   - `useSeriesLessons` hook (lines 94-127) — delete (only `SeriesBlock` used it).
   - The hero "{allLessons.length} שיעורים" badge (lines 435-453) — change to count standalone
     lessons only (see step 4) or remove.

3. **Replace with the correct three-part layout:**
   - **(a) Series cards (CLOSED):** map `canonicalSeries` (line 269, already parsha-filtered by
     §1a) to a closed card component `SeriesRowCard` (new, replaces `SeriesBlock`). Each card =
     cover image (Link `/series/:id`) + title + ALL rabbis (see §2) + `{lessonCount} שיעורים`,
     whole card is a `Link to={`/series/${s.id}`}`. Reuse the existing `SeriesBlock` header markup
     (lines 567-706) MINUS the toggle button / chevron / expanded block. Section heading stays
     `סדרות בנושא` (line 485) or `סדרות` to match the old `קטגוריה: סדרה` grouping.
   - **(b) Standalone lessons:** keep `useDirectLessons(id)` (lines 131-156) — these are lessons
     with `series_id = nodeId` (directly on the book node, the old "שיעור" rows). Render them as
     `LessonRow` (lines 794-909, keep as-is) under a heading `שיעורים`. **Do NOT** roll up
     descendant-series lessons here — only `series_id = nodeId` direct lessons.
   - **(c) שו"ת:** the old site has a third row-type `שו"ת`. In the new DB these are lessons with
     a שו"ת marker. Confirm the column: check `lessons.source_type` / `content_type` for a שו"ת
     value among `series_id = nodeId` rows, then split `directLessons` into `lessons` vs `shut`
     and render שו"ת under its own heading `שאלות ותשובות`. If no reliable marker exists in the
     data yet, fold שו"ת into the standalone lessons list and flag for the data track (see RISK §R4).

   Net: the page renders `[closed series cards] → [standalone lessons] → [שו"ת]`, no accordion,
   no per-descendant roll-up.

### 1c. "all rabbis of a series" query (feeds §1b card + §2)

For each series card we need the distinct rabbis. Two sources, unioned:
- `series.rabbi_id` (the lead/series-level rabbi — this is what the OLD site's author column shows;
  put it FIRST).
- distinct `lessons.rabbi_id` for `WHERE series_id = :id AND status='published'` and the same
  audience filter used elsewhere (`audience_tags.cs.{general} OR not.cs.{teachers}`).

Verified shape (DB):
- `מאמרים - חומש בראשית` → 1 distinct rabbi (`הרב איתן שנדורפי`) — single name.
- `מידות בפרשה` → 2 distinct rabbis; `פרשת שבוע-בראשית` → 2 distinct rabbis — needs "ועוד".

Implement as a small hook `useSeriesRabbis(seriesId)` (new, in `useContentSidebar.ts` or a new
`useSeriesRabbis.ts`):
```ts
// returns ordered distinct rabbi names: [lead (series.rabbi_id), ...others from lessons]
const { data: lead } = await supabase.from("series").select("rabbi_id").eq("id", seriesId).single();
const { data: lessonRabbis } = await supabase
  .from("lessons").select("rabbi_id")
  .eq("series_id", seriesId).eq("status", "published")
  .or("audience_tags.cs.{general},audience_tags.not.cs.{teachers}");
const ids = [...new Set([lead?.rabbi_id, ...lessonRabbis.map(r => r.rabbi_id)].filter(Boolean))];
// fetch rabbis.name for ids (preserve order: lead first), return names[]
```
Display helper (§2): `formatRabbis(names) → names.length<=2 ? names.join(", ") : `${names[0]}, ${names[1]} ועוד``.

> Perf note: avoid N round-trips on a 28-card page. Prefer a single batched query — fetch
> `lessons(series_id, rabbi_id)` for ALL visible series ids in one `.in("series_id", ids)` call,
> group client-side, merge with each `series.rabbi_id`. The series-level `rabbi_id` is already in
> the `useSeriesForNode` select (line 297). Add `rabbi_id`'s name resolution there, and add ONE
> batched lessons-rabbi query keyed on the visible series ids.

---

## 2. Series card multi-rabbi — show all distinct rabbis

The single-rabbi display appears in three places; each shows only `series.rabbi_id`'s name:

- **`src/pages/CategoryPage.tsx`** — `SeriesBlock`, line 668-678 (`{series.rabbiName}`). After §1b
  rewrite, the new closed card renders `formatRabbis(useSeriesRabbis(s.id))` instead of the single
  `series.rabbiName`.
- **`src/pages/BibleBookPage.tsx`** — lines 225-227 + 298-302 derive `rabbiName` from
  `series.rabbis` (first only). Replace with the distinct-rabbi list + `formatRabbis`.
- **`src/components/cards/SeriesCard.tsx`** — prop `rabbiName?: string | null` (line 9), rendered
  line 29. Widen to accept a `rabbiNames?: string[]` (or pre-formatted `rabbiLabel`) and render
  `formatRabbis`. Callers that still pass a single name keep working (fallback to `[rabbiName]`).

**Important parity caveat (do NOT silently "fix" to old behavior):** the OLD site showed exactly
ONE author per series row (the series lead, e.g. `הרב חגי ולוסקי` for `מידות בפרשה`), not "ועוד".
The multi-rabbi "ועוד" display is a Saar-requested ENHANCEMENT over the old layout. Keep the LEAD
rabbi (`series.rabbi_id`) first so the primary name still matches the old site, and append
`ועוד` only when >2 distinct rabbis exist. Source data verified: `series.rabbi_id` for
`מאמרים - חומש בראשית` = `הרב איתן שנדורפי` (matches lessons).

---

## 3. /bible and /bible/:book — chapter grid ("ניווט לפי ספר ופרק")

**Files:** `src/pages/BibleIndexPage.tsx`, `src/pages/BibleBookPage.tsx`, `src/hooks/useBible.ts`.

Current state:
- `/bible` (`BibleIndexPage`) lists the 24 books → links `/bible/:book`. Fine, no change needed.
- `/bible/:book` (`BibleBookPage`) currently shows **event-series cards** (`useBibleBookSeries`,
  lines 54-55) — NOT a chapter grid. The header comment (lines 5-8) says the chapter-grid approach
  was removed "because bible_chapter is NULL on ~94% of lessons".

**Verified data reality (cannot be ignored):** `lessons.bible_chapter` coverage for Torah is sparse:
בראשית 86/1440, שמות 89/1333, ויקרא 56/753, במדבר 83/1040, דברים 84/769. Neviim is denser
(יהושע 257/834, ישעיהו 377/922, הושע 76/116). **There is NO `bible_nav` table** — the only
chapter-bearing tables are `bible_verses` and `chapters` (the latter is the dor-haplaot/miracles
content, unrelated). So a chapter grid built purely from `lessons.bible_chapter` will be near-empty
for Torah books and is the reason it was removed.

**Spec (build the grid where data supports it, keep series fallback otherwise):**
- The hooks already exist and are correct: `useBibleBook(book)` (lines 9-41) aggregates
  `lessons.bible_chapter → {chapter,count}[]`; `useBibleChapterLessons(book,chapter)` (lines 43-64)
  lists a chapter's lessons. They are currently unused by `BibleBookPage`.
- In `BibleBookPage` add a CHAPTER GRID section above the series list, driven by `useBibleBook`:
  render each `{chapter}` that has `count > 0` as a clickable cell (grid of numbered cells, like the
  old "ניווט לפי ספר ופרק"). Clicking a cell → expand inline OR navigate to a chapter view that
  renders `useBibleChapterLessons(book, chapter)` as `LessonRow`s.
- Because Torah `bible_chapter` is sparse, **keep `useBibleBookSeries` as the primary content** and
  show the chapter grid as a SECONDARY "ניווט לפי פרק" strip that only renders when
  `useBibleBook(book).chapters.length > 0`. Do not replace the series list with an empty grid.
- Recommend a backfill task (data track) to populate `lessons.bible_chapter` for Torah from the
  parsha/chapter ranges already encoded in the parsha event-series titles (`פרשת נח | ו-יא` ⇒ ch 6-11).
  Without it, the Torah chapter grid stays thin. FLAG, do not invent.

---

## 4. Series page (/series/:id) — lesson list completeness

**Files:** route `/series/:id` → `src/pages/DesignPreviewSeriesPageV2.tsx`; data hook
`src/hooks/useLessonsBySeries.ts`.

- `useLessonsBySeries` (lines 10-53) is CORRECT: it pages 0-999 then 1000-1999 (beats the PostgREST
  1000-row silent cap, line 35-37) and dedups **by physical `id` only** (lines 43-48) — it does NOT
  collapse same-title multi-part shiurim. So a series with 15 real lessons WILL show 15. **No code
  cap/dedup bug here.**
- The "`הרב שלמה אבינר על פרשיות בראשית` shows 1 vs old 15" is a **DATA gap, not code**: DB has
  exactly 1 physical published lesson for series `b2e079cd-15cf-4172-ab57-60b362f8e74c`
  (`lesson_count = 1`, `count(lessons) = 1`). Old site had 15. → migration under-populated this
  series. **FLAG for the data/parity track** (out of scope for this code-spec; needs a backfill SQL
  plan matching old-series lessons by `legacy_attachment_url`/title). `recon_בראשית.json` lists the
  per-series gaps (e.g. `הרב אבינר` old=10/new=25 over-count, `שיעורים על התנ"ך - בראשית` old=4/new=0).

---

## RISK list

- **R1 — Neviim/Ketuvim event-series must NOT be hidden (the big one).** In Neviim, the event-series
  ARE the content (e.g. `הושע פרק א`, `זכריה פרק ב`, carried with `sort_order` 1..N). The
  parsha-exclude filter is **pattern-scoped** to `^פרשת .* | <hebrew>` and was verified to match
  **0** Neviim children (query: 0 books under Neviim root have a `פרשת% | %` child). So Neviim/Ketuvim
  chapter-series survive. **Do NOT** implement the exclude as "hide all `sort_order >= 1` children"
  or "hide all rows on Torah books" — that would wipe Neviim content. Keep it title-pattern based.
  Add a regression check: after the change, `/category/<a Neviim book id>` still lists its
  `<ספר> פרק <n>` series.

- **R2 — Regex must be tight.** `^\s*פרשת\b.*\|\s*[א-ת]` matches the Torah clones
  (`פרשת בראשית | א-ו`, `פרשת וישלח |לב-לו` — note the missing space before `|` in וישלח, the
  `\s*` before `\|` handles it). It must NOT match legit rabbi-series whose title merely starts with
  `פרשת` but has no `| <range>`, e.g. `פרשת שבוע-בראשית` (lc=36, real series, NO pipe),
  `פרשת השבוע עפ"י הרמב"ן` (lc=10), `פרשת שבוע במדבר`. Verified: these have no `|` so the regex
  skips them. Add a unit assertion on those three titles = false.

- **R3 — `מאמרים על סוגיות פרשת שופטים`-type and `סדרות על החומש`.** Some Torah-root children
  (`bb14b5a5…`) are non-parsha aggregators with `sort_order` 13 (`סדרות על החומש` lc=0). They are not
  parsha clones; the regex leaves them. If a `lesson_count=0` empty aggregator looks ugly as a card,
  rely on the existing draft/empty filter, not the parsha regex.

- **R4 — שו"ת marker may be missing in data.** §1b(c) assumes a `source_type`/`content_type` שו"ת
  marker on lessons. If absent, שו"ת rows fold into standalone lessons (acceptable) — but then the
  category page won't have a separate שו"ת section like the old site (old בראשית = 20 שו"ת). FLAG
  for data track; do not fabricate a marker.

- **R5 — Card-page rabbi query fan-out.** A 28-card Bereishit page calling `useSeriesRabbis` per card
  = 28+ queries. Use the single batched `.in("series_id", visibleIds)` lessons query (see §1c perf
  note) to avoid a slow page / rate pressure.

- **R6 — `useSeriesForNode` is shared.** It also feeds the sidebar-adjacent series views and possibly
  `TopicPage`/`SeriesList`. Adding the parsha-exclude there changes ALL of them. That is desired for
  category pages, but verify `TopicPage` (general-topics) and any rabbi/topic view don't legitimately
  need a `פרשת X | range` row. They don't (those nodes have no parsha clones), but run the
  topic/rabbi pages after the change to confirm no series vanished.

- **R7 — Roll-up removal changes the hero count.** Deleting the `allLessons` roll-up means the hero
  "{N} שיעורים" badge loses its source. Recompute it from standalone `directLessons.length` (the only
  lessons now shown on the category page) or drop the badge. Don't leave it referencing deleted state.

- **R8 — Chapter grid emptiness (Torah).** Shipping the grid as the PRIMARY view for `/bible/:book`
  would show a near-empty grid for Torah (sparse `bible_chapter`). Keep series list primary + grid
  secondary/conditional (§3), or backfill first.

---

## File:line index of changes

| # | file | lines | change |
|---|------|-------|--------|
| 1a | `src/hooks/useContentSidebar.ts` | 310-318 (+ 349-365) | add `isParshaEventSeries` exclude in `seriesFiltered`; title sort within page-only band |
| 1b | `src/pages/CategoryPage.tsx` | 552 | `useState(true)` → closed card, remove accordion |
| 1b | `src/pages/CategoryPage.tsx` | 94-127 | delete `useSeriesLessons` |
| 1b | `src/pages/CategoryPage.tsx` | 187-241 | delete `useRollupLessons` |
| 1b | `src/pages/CategoryPage.tsx` | 261-285 | delete `hasChildSeries`/`rollup*`/`allLessons` combiner |
| 1b | `src/pages/CategoryPage.tsx` | 435-453 | hero lesson-count badge → standalone count or remove |
| 1b | `src/pages/CategoryPage.tsx` | 499-529 | delete "כל השיעורים" roll-up section; add standalone + שו"ת sections |
| 1b | `src/pages/CategoryPage.tsx` | 545-778 | rewrite `SeriesBlock` → `SeriesRowCard` (closed, link `/series/:id`) |
| 1c/2 | `src/hooks/useContentSidebar.ts` (or new `useSeriesRabbis.ts`) | new | batched distinct-rabbi-per-series query |
| 2 | `src/pages/BibleBookPage.tsx` | 225-227, 298-302 | single rabbi → `formatRabbis(distinct)` |
| 2 | `src/components/cards/SeriesCard.tsx` | 9, 29 | accept `rabbiNames[]`/`rabbiLabel`, render `formatRabbis` |
| 3 | `src/pages/BibleBookPage.tsx` | 54-55, 173-337 | add conditional chapter-grid section via `useBibleBook`/`useBibleChapterLessons` |
| 4 | — (data track) | — | backfill missing lessons for under-populated series (e.g. `b2e079cd…` 1→15); see `recon_בראשית.json` |
