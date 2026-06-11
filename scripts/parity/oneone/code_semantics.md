# NEW-site code semantics — exact data-fetch behavior of every public route

*Generated 2026-06-11 from the working tree of branch `feat/navigator-bot` (uncommitted local changes included). Read-only audit — no code was modified.*

**Purpose:** data-diff agents comparing old `www.bneyzion.co.il` vs new site must know exactly what the UI pulls from Supabase (project `pzvmwfexeiruelwiujxn`), in what order, with what filters/dedup — otherwise a DB-level diff will disagree with what users actually see.

**Conventions used below**
- All queries go through the anon supabase-js client (`src/integrations/supabase/client.ts`) unless noted as "raw REST" (paginated `fetch` with anon key + `Range` header — used by teachers-wing hooks to beat the 1000-row PostgREST cap).
- "audience filter" = `.not("audience_tags", "cs", "{teachers}")` (exclude teacher-wing) or `.contains("audience_tags",["teachers"])` (teachers-only).
- "title-dedup key" = `title.trim().replace(/[״"'׳`|]/g,"").replace(/\s+/g," ")` (+ `::rabbi_id` where noted). Note: this is quote-stripping + whitespace-collapse only — **no niqqud stripping, no NFC normalization** anywhere in the app dedup keys.
- RPCs used: `get_series_descendant_ids(root_id)`, `get_series_ancestors(series_uuid)`, `get_public_rabbis()`.
- React-query default staleTime 5min (`src/App.tsx:260-268`).
- Route table source of truth: `src/App.tsx:288-422`. `*` → `NotFound` (`src/App.tsx:422`).

---

## 1. Public sidebar — `DesignSidebar.tsx` (rendered by `DesignLayout` on all v2 pages)

File: `src/components/layout-v2/DesignSidebar.tsx`; data: `src/hooks/useContentSidebar.ts`, `src/hooks/useTopicsSidebar.ts`, `src/hooks/useRabbis.ts` (usePublicRabbis).

### 1a. Tab "ראשי" (main tree) — `useContentSidebar()` sidebarQuery (`useContentSidebar.ts:33-253`)

Hard-coded root UUIDs (`useContentSidebar.ts:17-29`): torah `bb14b5a5…`, neviim `a0472c9f…`, ketuvim `5cdd770c…`, howToLearn `62590949…`, generalTopics `2d6d28c1…`, moadim `92130154…`, haftarot `3327c721…`, riddles `c852edd8…`, tools `27ca7dec…`, yemeiIyun `f4040001…`, livuyTatim `7cbd261e…`.

| Step | Query | Filters | Order | Limit |
|---|---|---|---|---|
| Books under Torah+Ketuvim | `series` (`:40-45`) | `parent_id IN (torah,ketuvim)`, `status IN (active,published,category)` | `title` | none |
| Books under Neviim | `series` (`:49-54`) | `parent_id = neviim`, **`status = 'category'` ONLY** (ghost-series guard) | `title` | none |
| Children of Torah books | `series` (`:65-74`) | `parent_id IN torahBookIds`, `status IN (active,published)`, **NOT audience teachers** | `sort_order`, `title` | none |
| Children of Neviim/Ketuvim books | `series` (`:81-89`) | same as Torah children | `sort_order`, `title` | none |
| Children of flat extra sections | `series` (`:100-106`) | `parent_id IN (generalTopics,moadim,haftarot,tools,yemeiIyun,livuyTatim)`, `status IN (active,published)` — **NO audience filter here** | `sort_order`, `title` | none |
| "איך לומדים" deep section | RPC `get_series_descendant_ids(howToLearn)` (`:111-113`) then `series` `id IN desc`, `status IN (active,published,draft)` (`:115-123`) | — | `lesson_count desc`, `title` | none |

Tree build:
- Children sort per book (`:165-172`): if ANY child has `sort_order > 0` → sort by `sort_order` then he-localeCompare; else `sortByBiblicalOrder` (`src/lib/biblicalOrder.ts` — canonical parshiot/books order maps).
- Torah books forced to fixed order `["בראשית","שמות","ויקרא","במדבר","דברים"]` (`:175-182`); Neviim/Ketuvim books via `sortByBiblicalOrder` (`:194-203`).
- "איך לומדים" canonical dedup (`:127-148`): drop direct-child draft placeholders with 0 lessons; group by normalized title (quote-strip), keep highest score (non-draft=+2, lessons>0=+1); sort score desc then he-alpha.
- Extra sections ordering: generalTopics/moadim/haftarot/tools via `sortByCustomOrder` (`src/lib/sidebarOrder.ts` — hard-coded old-site orders); yemeiIyun/livuyTatim raw order from query (`:241-246`).

Link vs accordion (`DesignSidebar.tsx:580-960`):
- Category row (תורה/נביאים/כתובים): **title click navigates `/category/:catId` + opens accordion** (`:697-701`); chevron toggles only (`:717-737`).
- Book row: title click → `/category/:bookId` + toggle (`:774-777`); chevron toggle only.
- "כל השיעורים בחומש/בספר X" button → `/category/:bookId`; **shown only when book has >1 child** (`:832-859`).
- Child (parasha/chapter/series) → `/series/:childId` (`:864-867`).
- חידות לילדים — hard-coded under תורה/בראשית only → `/series/{riddles}` (`:901-934`).
- Extra section header title → `/category/:sectionId` + open (`:1016-1020`); "כל השיעורים ב{section}" → `/category/:sectionId` (`:1062-1080`); section children → `/series/:childId` (`:1085-1119`).
- Quick links above the tree (`:195-199`): `/`, `/parasha`, and **`/how-to-learn-tanach` — NO SUCH ROUTE EXISTS in App.tsx → renders NotFound (404)**.
- Sidebar search is client-side substring `includes()` on already-loaded titles only (`:103-106`).

### 1b. Tab "נושאים" — `useTopicsSidebar()` (`useTopicsSidebar.ts:29-86`)

1. `topics` where `slug = 'themes-root'` → parent id (`:34-38`).
2. `topics` where `parent_id = parent.id`, order `name` (`:49-53`).
3. `lesson_topics` where `topic_id IN childIds` (`:60-63`) — counts rows per topic **with NO join to lessons → counts include unpublished, teacher-tagged, and duplicate lessons**.
4. Sort by computed lessonCount desc (`:81`). Click → `/topic/:slug`.

### 1c. Tab "רבנים" — `usePublicRabbis()` (`useRabbis.ts:39-84`)

- Primary: RPC `get_public_rabbis()` (SECURITY DEFINER, `supabase/migrations/20260603_get_public_rabbis_rpc.sql`): `rabbis` with `status='active' AND lesson_count>0` AND (has active/published series tagged `general` OR has category-status series tagged general-and-NOT-teachers OR has no series at all and no teachers-only series). ~167 rabbis.
- Client-side belt: drop rows with `entity_type` set and ≠ `'rabbi'` (`useRabbis.ts:56-58`).
- Client sort: **tier pinning first** — tier1 `["ראובן ששון","אליעזר קשתיאל"]`, tier2 `["שמואל אליהו"]` (`:29-37`), then `lesson_count desc`.
- Sidebar renders only **top 30** (`DesignSidebar.tsx:85-90` `slice(0,30)`), link `/rabbis/{slug ?? id}`.
- (Note: `useContentSidebar` also exposes its own `rabbisQuery` (`useContentSidebar.ts:429-451`, `entity_type='rabbi'`, limit 50) but DesignSidebar does NOT use it.)

**RISKS vs old site (sidebar):**
- R-SB1: Neviim books must have `status='category'` to appear (`:49-54`) — a real Neviim book stored active/published is invisible in the tree.
- R-SB2: רבנים tab caps at 30 names; old-site sidebar lists the full rabbi list (~153).
- R-SB3: topics counts (1b) disagree with TopicPage's actual rendered count (published + non-teacher + deduped + limit 500) — visible number mismatch.
- R-SB4: quick-link "איך לומדים תנ״ך" → `/how-to-learn-tanach` is a dead route (404).
- R-SB5: extra-section children query has no `teachers` audience exclusion (`:100-106`) — teacher-tagged series under מועדים/הפטרות/כלי-עזר/ליווי-ת"תים would show in the public tree (clicking lands on `/series/:id` which redirects to teachers wing → confusing hop).
- R-SB6: yemeiIyun/livuyTatim children keep raw `sort_order,title` order — no old-site custom order applied.

---

## 2. `/category/:id` — `CategoryPage.tsx`

File: `src/pages/CategoryPage.tsx`. Node meta via `useSeriesDetail(id)` (`src/hooks/useSeriesDetail.ts:4-18`: `series` `eq id` `.single()`, **no status / audience filter**, embeds `rabbis(id,name,image_url)`). Breadcrumb via `useSeriesBreadcrumb(id)` (RPC `get_series_ancestors` + consecutive same-title crumb collapse, `useSeriesHierarchy.ts:4-24`).

### 2a. Series list — `useSeriesForNode(id)` (`useContentSidebar.ts:261-346`)
- RPC `get_series_descendant_ids(nodeId)` → all descendant series ids (root itself excluded from list, `:269`).
- `series` `id IN allIds`, `status IN (active,published,draft)` (category nodes implicitly excluded by status list), **NOT audience teachers** (`:274-282`), order `lesson_count desc`, **`limit(200)`**.
- Drop direct-child draft placeholders (draft + 0 lessons + parent = node) (`:293-295`).
- Canonical title-dedup (quote-strip key, best score: non-draft+has-lessons wins) (`:298-311`).
- Rabbi names via second `rabbis` `id IN` fetch (`:317-322`).
- Final sort: active-with-lessons first, then `lesson_count desc`; drafts last (`:325-330`). Draft survivors get "בהכנה" badge (`CategoryPage.tsx:484-504`).

### 2b. Lessons expanded under each series — `useSeriesLessons(series.id)` (`CategoryPage.tsx:94-113`)
- `lessons` `eq series_id`, `status='published'`, order **`published_at ASC`**, `limit(200)`; embeds `rabbis(name)`. **No dedup, no audience filter.** Rows are buttons → `/lessons/:id`. Cards default-expanded (`:402`).

### 2c. Standalone lessons on the node itself — `useDirectLessons(id)` (`CategoryPage.tsx:117-136`)
- `lessons` `eq series_id = nodeId`, `status='published'`, order **`published_at DESC`**, `limit(50)`. Section "שיעורים בודדים בקטגוריה".

**RISKS vs old site (/category):**
- R-CAT1: `limit(200)` on canonical series — large roots (e.g. clicking נביאים header) silently truncate; old-site category pages list everything.
- R-CAT2: series ordered by `lesson_count desc` — old site orders by its sideNav/document order; visible re-ordering.
- R-CAT3: lessons inside a series ordered `published_at ASC` here but `bible_chapter,title` on `/series/:id` (see §3) — same series shows two different lesson orders in two views; `published_at` largely reflects migration insert order.
- R-CAT4: per-series lesson cap 200 + no dedup (unlike `/series/:id` which dedups) — duplicate migrated rows visible here but hidden there → count mismatch between the two views.
- R-CAT5: direct lessons capped at 50, newest-first — old site shows full list in document order.

---

## 3. `/series/:id` — `DesignPreviewSeriesPageV2.tsx` (also serves `/design-series-page-v2`)

File: `src/pages/DesignPreviewSeriesPageV2.tsx` (main component `:2112-2287`).

- Series meta: `useSeriesDetail(targetId)` — `series` `eq id .single()`, **no status filter** (drafts/categories render).
- **Teachers guard** (`:2223-2225`): if `series.audience_tags` contains `'teachers'` → `<Navigate to="/teachers/series/:id" replace>`. (This is the 327-series public-leak fix.)
- Lessons: `useLessonsBySeries(series.id)` (`src/hooks/useLessonsBySeries.ts:10-43`): `lessons` `eq series_id`, `status='published'`, order **`bible_chapter ASC nullsFirst`, then `title ASC`**; **dedup by title-key + `::rabbi_id`** keeping first. Embeds `rabbis(name)`. No limit (PostgREST default cap 1000).
- Sub-series: `useSeriesChildren(series.id)` (`useSeriesHierarchy.ts:26-40`): `series` `eq parent_id`, order **`title` only** — **NO status filter, NO audience filter, no sort_order**. Page renders only children with `lesson_count > 0` (`:2257-2258`), grouped by rabbi when 2-5 distinct rabbis (`:385-408`), "הצג עוד" after 6.
- Hero rabbi line = distinct rabbi names aggregated from loaded lessons, frequency-sorted (`:2169-2178`).
- Media filter chips (אודיו/וידאו/PDF) derived client-side: video_url → video, else audio_url → audio, else attachment_url → pdf, else text (`:107-112`).

### Lesson popup (`LessonModal`, `:1342-2109`) — opened by card click, synced to `?lesson=<id>`
- Lesson object from already-loaded array; fallback direct fetch `useLesson(id)` for cross-series deep links (`:2159-2165`).
- Shows: title, מאת link → `/rabbis/{rabbi.id}` (**UUID link — relies on RabbiPage UUID→slug redirect**), duration, date, series pill, breadcrumb (`useSeriesBreadcrumb`), HTML5 player (direct file ext test `:119-122` → `<video>`; else iframe), attachment block (`:1863-1915`): `.pdf` → native iframe of the URL; `.doc/.docx` → `view.officeapps.live.com/op/embed.aspx` iframe; both get הורד/פתח-בלשונית links.
- Body text (`:1917-1943`): **`content` (sanitized HTML, full, no truncation) if present, else `description` plain-text** (tags stripped). 
- "שיעורים נוספים מהסדרה" = up to 6 other lessons from the same loaded array (`:1366`). "פתח בעמוד מלא" → `/lessons/:id`.

**RISKS vs old site (/series):**
- R-SER1: `useSeriesChildren` orders children **alphabetically by title** — chapter/part series ("פרק…", "מרד אבשלום | …") render out of biblical/numeric order vs the old site's document order; `sort_order` column is ignored here (unlike the sidebar).
- R-SER2: no status filter on children — draft/category children with `lesson_count>0` render as "חלקי סדרה" cards.
- R-SER3: no audience filter on children — a teacher-tagged child with lessons shows as a public card (click bounces to teachers wing).
- R-SER4: dedup by title+rabbi collapses genuinely distinct same-title lessons of the same rabbi (multi-part shiurim with identical titles) — fewer lessons than old site.
- R-SER5: `bible_chapter,title` ordering — article series with no chapters sort alphabetically, NOT in old-site document order.
- R-SER6: lessons query has no explicit limit → hard 1000-row PostgREST cap; series with >1000 raw rows truncate before dedup.

---

## 4. `/lessons/:id` — `LessonPage.tsx`

File: `src/pages/LessonPage.tsx` (`:81-563`). Hooks: `src/hooks/useLesson.ts`.

- `useLesson(id)` (`useLesson.ts:4-19`): `lessons` `eq id`, `status='published'`, `.maybeSingle()`; embeds `rabbis(id,name,image_url,title)`, `series(id,title)`, selects `audience_tags`. **NO teachers redirect/guard on this page** — teacher-wing lessons are fully renderable at the public URL.
- Related: `useSeriesLessons(lesson.series_id, excludeId=id)` (`useLesson.ts:21-39`): `lessons` `eq series_id`, published, order `published_at ASC`, `limit(20)`, `neq id`.
- Series image: `useSeriesDetail(lesson.series_id)` (`LessonPage.tsx:86`).
- Attachment rendering (`:334-433`): `.pdf` in URL → header + download/open links + **native iframe of url** (75vh); `.doc/.docx` → officeapps embed iframe; anything else → download button only. `additional_attachments[]` → download chips (`:436-461`).
- Body (`:464-480`): `content` → sanitized HTML prose (full); else `description` → plain `<p>` whitespace-pre-line. Bible ref box from `bible_book/chapter/verse` (`:483-490`).

**RISKS:** R-LES1: no audience guard — direct links/search engines can surface teacher worksheets on the public lesson page (inconsistent with the `/series/:id` redirect). R-LES2: related-lessons capped at 20, `published_at ASC`.

---

## 5. Lesson popup component — `LessonDialog.tsx` (used by ParashaPage, home sections, HistoryPage, legacy SeriesList)

File: `src/components/lesson/LessonDialog.tsx`.

- Same `useLesson(lessonId)` fetch (published only, no audience guard).
- URL is rewritten to `/lessons/:id` while open via `history.replaceState` (`:71-85`).
- Auth-only side effects: upsert `user_history`, `user_daily_activity`, points (`:88-134`).
- Media (`:476-515`): video direct-ext → `<video>`, else iframe; audio → `<audio>`.
- Attachment (`:517-541`): **ANY `attachment_url` is iframed directly** — no `.pdf` check and no officeapps fallback for Word. `.docx` URLs render as broken/blank iframe or force-download inside the frame (LessonPage handles this correctly; the dialog does not).
- Body (`:543-560`): `content` sanitized HTML, else `description` plain. Print window includes `content || description` (`:146`).

**RISK:** R-DLG1: Word/doc attachments broken in the popup (iframe of raw docx); also Google-Drive-style URLs that refuse framing show blank (cf. the gview incident) — only a small "הורד PDF" fallback link below.

---

## 6. `/rabbis` and `/rabbis/:id`

- `/rabbis` `RabbisList.tsx:11` → `usePublicRabbis()` (see §1c — RPC + entity_type belt + tier sort). Cards link via slug.
- `/rabbis/:id` `RabbiPage.tsx`: UUID param → `useRabbi` fetch by id → client redirect to `/rabbis/{slug}` (`:32-36`); slug param → `useRabbiBySlug` (`useRabbi.ts:15-29`, `rabbis eq slug .single()` — **no status / entity_type filter**: inactive or content_creator rows render if linked directly).

**What a rabbi page lists** (BOTH series and lessons):
1. "סדרות" — `useRabbiSeries(rabbiId)` (`useRabbi.ts:52-98`):
   - owned: `series` `eq rabbi_id`, `status IN (active,published)`, order **`sort_order ASC`** (no nulls handling → nulls last per PostgREST default asc? PostgREST default puts nulls last on asc);
   - PLUS guest series: `lessons` `eq rabbi_id` published → distinct `series_id`s not already owned → `series id IN`, `status IN (active,published)`, sorted `lesson_count desc`, appended after owned.
   - **No audience filter** → teacher-tagged series can appear on a public rabbi page (links to `/series/:id` → redirect hop).
2. "שיעורים אחרונים" — `useRabbiLessons(rabbiId)` (`useRabbi.ts:100-126`): `lessons` `eq rabbi_id`, published, order **`published_at DESC`**, `limit(60)` → title-dedup (no rabbi in key) → **cap 20**.

**RISKS:** R-RAB1: old-site rabbi page lists the rabbi's lessons exhaustively grouped by series; new page shows series cards + only 20 "recent" lessons in migration-date order — heavy parity gap on prolific rabbis. R-RAB2: guest-series detection includes any series the rabbi has ≥1 lesson in (e.g. giant shared פרשת-שבוע containers) — series list inflated vs old site. R-RAB3: no audience filter on series list.

---

## 7. `/topic/:slug` — `TopicPage.tsx`

File: `src/pages/TopicPage.tsx`.
- `useTopic(slug)` (`:72-87`): `topics` `eq slug .single()`.
- `useTopicLessons(topicId)` (`:89-141`): `lesson_topics` `eq topic_id` with `lessons!inner(...)` join; `lessons.status='published'`; **NOT lessons.audience teachers**; **`limit(500)`** (on link rows). Flatten → **dedup title-key+rabbi_id** → client sort **`published_at DESC`**.
- Render: flat lesson rows → `/lessons/:id`; client search box if >8 lessons.

**RISKS:** R-TOP1: 500-link cap before dedup truncates big topics. R-TOP2: order newest-first = migration order, not old-site order. R-TOP3: header count = deduped count but sidebar badge (§1b) = raw link count — user-visible mismatch.

---

## 8. `/parasha` — `ParashaPage.tsx` + `useParasha.ts`

Current parasha computed locally from `parashaCalendar.ts` (no DB). Five queries (`src/hooks/useParasha.ts`):

| Query | Tables/filters | Order/limit | Notes |
|---|---|---|---|
| all parasha lessons (`:60-103`) | `lessons` published, `.or(title.ilike.%<parasha>%[,short-form])`, NOT teachers | `title` asc, **limit 150** | + title+rabbi dedup; rabbi names second fetch; aggregation added 11.6 for "thin page" fix |
| audio readings (`:106-154`) | `series eq title=<chumash>` → first row → children `.or(ilike קריאה בטעמים/קריאה עם ביאור)` → `lessons in series_ids` published `ilike %parasha%` | none | `chumashSeries[0]` arbitrary if duplicate chumash-titled series exist |
| article series (`:157-209`) | for each hard-coded series in `PARASHA_ARTICLE_SERIES`: `series eq title eq status='active' maybeSingle` → first lesson `ilike %term%` limit 1 | — | exact-title coupling; `status='active'` only |
| riddle (`:212-225`) | `lessons eq series_id=RIDDLES ilike %parasha% limit 1` | — | |
| parasha series id (`:228-239`) | `series eq title="פרשת <X>"` maybeSingle | — | CTA "כל תכני הפרשה" → `/series/:id` |

Page combines audio+lessons deduped by id (`ParashaPage.tsx:141-149`); opens items in `LessonDialog` (§5).

**RISKS:** R-PAR1 (HIGH on specific weeks): main query is bare substring `ilike '%<name>%'` — short parasha names (בא, צו, נח, ראה, אמור, עקב, בלק, שלח) over-match thousands of unrelated titles, and with `limit 150` + `order title` the real parasha content can be pushed out entirely. R-PAR2: `maybeSingle()` on exact-title lookups errors silently if duplicate titles exist → null → missing CTA/article. R-PAR3: article series require `status='active'` exactly.

---

## 9. `/bible/:book` — `BibleBookPage.tsx` + `useBible.ts`

- `useBookCategoryId(book)` (`useBible.ts:98-130`): `series` `eq/ilike title=book`, `parent_id IN (torah,neviim,ketuvim roots)`, `status IN (active,published,category)`, `maybeSingle()`.
- `useBibleBookSeries(catId)` (`useBible.ts:71-92`): `series` `eq parent_id`, `status IN (active,published)`, **NOT teachers**, `lesson_count > 0`, order **`sort_order ASC nullsLast`, then `title`**. Cards → `/series/:id`.
- (Unused on this page but exported: `useBibleBook` chapter histogram and `useBibleChapterLessons` — `bible_book/bible_chapter` based, published, NOT teachers, order `bible_verse nullsLast`, `title`.)

**RISKS:** R-BIB1: `maybeSingle()` throws on duplicate same-title book nodes → swallowed error → null id → empty page. R-BIB2: `lesson_count>0` hides container-children whose lessons are nested deeper (lesson_count counts direct lessons only — empty intermediate categories vanish even when content exists below them).

---

## 10. `/series` (catalog) — `SeriesLibrary.tsx`

- `useTopSeries(30)` (`src/hooks/useTopSeries.ts:13-30`): `series` **`status='active'` only**, `lesson_count>0`, NOT teachers, order `lesson_count desc`, limit 30 → client: drop exact title "שיעורים כלליים", re-sort lesson_count/views_count, top 12 featured (`SeriesLibrary.tsx:192-201`).
- Books grid: titles → `/category/:bookId` (id from sidebar cache) or fallback `/bible/:book` (`:183-189`).
- Rabbis strip: `usePublicRabbis()`, links `/rabbis/{id}` (**UUID, relies on redirect**) (`:475`).
- Topics strip: `useTopics()` (`src/hooks/useTopics.ts:13-22` — **ALL topics, no parent/status filter**, order `sort_order,name`), links `/topic/:slug` (`:577`).

**RISKS:** R-LIB1: `status='active'` excludes `published` series from the catalog. R-LIB2: topics strip includes structural/non-theme topics (different population from the sidebar's themes-root children).

---

## 11. Search (public, header) — `GlobalSearch.tsx` + `useGlobalSearch.ts`

Debounced 250ms, min 2 chars; Hebrew normalization for the PATTERN only (niqqud strip, geresh strip, dash→space; `useGlobalSearch.ts:5-18`) — DB side is plain `ilike`.

| Bucket | Query (`:108-138`) | Filters | Order | Limit |
|---|---|---|---|---|
| rabbis | `rabbis` `.or(name/title/specialty ilike patterns)` | `status='active'` — **no entity_type filter, no get_public_rabbis** | `lesson_count desc` | 6 |
| series | `series` title ilike | **`status='active'` only**, NOT teachers | `lesson_count desc` | 8 |
| lessons | `lessons` title ilike | `status='published'`, NOT teachers | **none (arbitrary)** | 8 |
| books | `products` title ilike | `status='active'` | none | 6 |

**RISKS:** R-SRC1: teacher-only content_creators (מכון דעת סופרים etc.) ARE searchable as rabbis (filtered from /rabbis but not here). R-SRC2: published-status series unsearchable. R-SRC3: lessons bucket unordered + cap 8 → effectively random subset.

---

## 12. Teachers wing (`/teachers/**`)

Layout `TeachersLayout` + `TeacherSidebar.tsx`; the wing intentionally does **NO dedup** ("duplicates are real", `useTeacherBookContent.ts:9-11`) and uses raw paginated REST (1000-row pages) with the anon key.

### 12a. Sidebar — `useTeacherSidebar()` (`src/hooks/useTeacherSidebar.ts:71-275`) + content-type counts (`TeacherSidebar.tsx:41-79`)
- Books: `series` `parent_id IN (torah,neviim,ketuvim)` order title (no status filter).
- Teacher children resolution (ד4 fix, `:97-176`): `lessons` `contains audience teachers`, published, `series_id not null`, limit 10000 → distinct series ids → `series id IN (first 500)`, `lesson_count>0` → climb 1 parent level (intermediate nodes, first 300) → bucket under books by parent-id or **title match**; he-alpha sort per bucket.
- Tools sections (`:207-234`): roots = tools/livuyTatim/maps/howToTeach/riddles; children require **series-level** `audience_tags contains teachers`.
- יוצרים tab: distinct `rabbi_id` from teacher-tagged series (`lesson_count>0`) → `rabbis id IN` order lesson_count desc (`:236-260`) → `/teachers/creator/:id`.
- "סוג תוכן" tab: raw REST count of ALL published teacher lessons per `content_type` (paginated, full count, `TeacherSidebar.tsx:41-79`) → `/teachers/content-type/:type`.
- Torah books expose parshiot links from hard-coded `PARSHIOT_BY_BOOK` → `/teachers/parasha/:book/:parasha`; plus "דפי עבודה" → `/teachers/worksheets/:book`; book title → `/teachers/book/:book`.

### 12b. `/teachers/book/:book` — `useTeacherBookContent(book)` (`useTeacherBookContent.ts:54-168`)
- series: raw REST `lessons?select=series_id&bible_book=eq.<book>&audience_tags=cs.{teachers}&status=published` paginated → distinct ids → `series id IN (chunks 400)`, `lesson_count>0`, order title.
- standalone lessons: raw REST `lessons?...bible_book=eq.<book>&audience teachers&published&order=title`, paginated — ALL rows, **keyed entirely on `lessons.bible_book`**.
- Series cards → `/teachers/series/:id` (`TeachersBookPage.tsx:441,545`).

### 12c. `/teachers/series/:id` — `TeachersSeriesPage.tsx:69-126`
- meta: `series eq id single` (no filters); lessons: `lessons eq series_id`, published, order **`title`**, `limit(300)` — **no audience filter** (shows any published lesson of the series). Lessons open in `TeacherLessonModal`.

### 12d. `/teachers/lesson/:id` — `TeachersLessonPage.tsx:43-77`
- `lessons eq id single` — **no status filter, no audience filter** (drafts/public lessons renderable); + rabbi name + series fetch.

### 12e. `/teachers/content-type/:type` — `useTeacherContentTypeContent` (`useTeacherBookContent.ts:191-258`): raw REST `content_type=eq.<type>` + teachers + published, order title, paginated, includes `content` for the modal; enrich rabbi+series names.

### 12f. `/teachers/parasha/:book/:parasha` — `useTeacherParashaContent` (`useTeacherParashaContent.ts:149-255`): fetch ALL teacher lessons of the book (REST, order title) → client filter `titleMatchesParasha` (variant table `CANONICAL_PARSHIOT` `:39-87`; matches "פרשת X" / "פרשה X" / " X " in title) → series derived from matches, he-alpha.

### 12g. `/teachers/worksheets/:book` — `useTeacherWorksheetsContent` (`:300-370`): same book fetch → client filter `content_type` against `WORKSHEET_CONTENT_TYPES` (bidirectional `includes`, `:281-296`).

### 12h. `/teachers/creator/:id` — `useTeacherCreatorContent` (`useTeacherBookContent.ts:288-358`): `rabbis eq id` + raw REST `lessons rabbi_id=eq + teachers + published order=title`, paginated.

### 12i. Popup — `TeacherLessonModal.tsx`
- No fetch of its own (lesson object passed in — lists above include `content`).
- Body: `content` sanitized HTML else `description` plain (`:180-194`); attachment chip label by ext (`:172-174`); inline viewer (`:228-270`): pdf → native iframe, doc/docx → officeapps embed; download CTA (`:317-323`). Empty-state note when no content/media (`:215`).

**RISKS (teachers wing):**
- R-TCH1: everything is keyed on `lessons.bible_book` / `content_type` / title matching — teacher lessons with NULL `bible_book` exist only via series pages; old-site book pages were tree-based.
- R-TCH2: order `title` everywhere — old site ordered by document/parasha order; worksheets sort alphabetically.
- R-TCH3: sidebar teacher-children capped (first 500 series / 300 intermediates) and resolved only 2 levels up; deeper nesting drops out of the sidebar.
- R-TCH4: `/teachers/series/:id` and `/teachers/lesson/:id` have no audience/status guard — public (or draft) content renderable inside the wing chrome.
- R-TCH5: tools sections need series-level tags while the canonical tagging is lesson-level (`useTeacherSidebar.ts:86-92` comment) — sections can render empty despite content.
- R-TCH6: parasha title-matching misses lessons whose titles lack "פרשת " or the space-delimited name (e.g. "בא - דף עבודה" matches, "דף עבודה לפרשת-בא" with hyphen does not).

---

## 13. Cross-cutting notes for data-diff agents

1. **Two different lesson orders for the same series** (CategoryPage `published_at ASC` vs SeriesPage `bible_chapter,title`) — diff against the right one per route.
2. **Dedup keys are quote-strip+whitespace only** (no niqqud strip / NFC). When replicating in Python, do NOT apply your usual niqqud-strip when predicting what the UI hides — the UI keeps niqqud differences as distinct.
3. `lesson_count` column is trusted everywhere (`gt 0` gates, sort keys) — if it drifts from real published-lesson counts, series vanish/appear in sidebar §1a(howToLearn), §3 children, §9, §10, RPC rabbis.
4. PostgREST implicit 1000-row cap applies to every supabase-js query without `.limit()` (notably `useLessonsBySeries`, `useSeriesChildren`, `useRabbis`).
5. `status` taxonomy actually used by the UI: `active`, `published`, `draft`, `category` — pages disagree on which are visible (see per-route tables).

---

## TOP-RISKS (sorted by user impact)

| # | Risk | Route(s) | Impact | Cite |
|---|------|----------|--------|------|
| 1 | Parasha page main query = bare `ilike %name%` + `limit 150` + order title → on short-named parshiot (בא/צו/נח/ראה/שלח/בלק/עקב/אמור) page fills with false matches and may drop the real content | `/parasha` | HIGH — flagship weekly page wrong on specific weeks | `useParasha.ts:66-75` |
| 2 | Sub-series ("חלקי הסדרה") ordered alphabetically by title, ignoring `sort_order`/biblical order; no status/audience filter on children | `/series/:id` | HIGH — chapter/event series render scrambled vs old site | `useSeriesHierarchy.ts:26-40`, `DesignPreviewSeriesPageV2.tsx:2257` |
| 3 | Title+rabbi dedup hides genuinely distinct same-title lessons (multi-part shiurim) | `/series/:id`, `/topic/:slug`, rabbi lessons, parasha | HIGH — silent lesson loss vs old site counts | `useLessonsBySeries.ts:30-38`, `TopicPage.tsx:122-129`, `useRabbi.ts:116-123` |
| 4 | Rabbi page shows series cards + only 20 "recent" lessons (`published_at desc` = migration order); old site lists the rabbi's lessons exhaustively | `/rabbis/:slug` | HIGH for prolific rabbis | `useRabbi.ts:100-126`, `RabbiPage.tsx:133-184` |
| 5 | `/category/:id` canonical series `limit(200)` + `lesson_count desc` ordering; per-series lessons `published_at ASC` (≠ series-page order), no dedup | `/category/:id` | MED-HIGH — truncation on big roots + visible reorder + count mismatch vs `/series/:id` | `useContentSidebar.ts:274-282`, `CategoryPage.tsx:100-113` |
| 6 | No `teachers` audience guard on `/lessons/:id` and LessonDialog (series page has one) — worksheets leak to public lesson URLs | `/lessons/:id`, popups | MED-HIGH — policy leak Saar already fixed for series | `useLesson.ts:4-19`, `LessonPage.tsx:81-138` |
| 7 | LessonDialog iframes ANY attachment_url raw (no .doc handling, no frame-refusal fallback) → blank/broken popup viewers for Word/Drive links | popup on `/parasha`, home, history | MED — affects every popup attachment that is not a direct PDF | `LessonDialog.tsx:517-541` |
| 8 | Search: content_creator institutions searchable as rabbis; `published` series unsearchable; lessons bucket unordered cap 8 | header search | MED | `useGlobalSearch.ts:108-138` |
| 9 | `/series` catalog + search restricted to `status='active'` — `published` series invisible | `/series`, search | MED | `useTopSeries.ts:20`, `useGlobalSearch.ts:120` |
| 10 | Topics: sidebar count = raw `lesson_topics` rows (incl. unpublished/teachers/dupes) vs TopicPage rendered count (filtered+deduped, cap 500) | sidebar נושאים / `/topic/:slug` | MED — visible number mismatches, big-topic truncation | `useTopicsSidebar.ts:60-79`, `TopicPage.tsx:95-129` |
| 11 | Teachers wing keyed on `lessons.bible_book` + title/content_type string matching; sidebar children capped 500/300; everything title-ordered | `/teachers/**` | MED — null-bible_book lessons unreachable from book pages; alpha order ≠ old site | `useTeacherBookContent.ts:67,117`, `useTeacherSidebar.ts:97-176` |
| 12 | Neviim sidebar books require `status='category'`; extra-section children lack teachers exclusion; yemeiIyun/livuy raw order | sidebar | MED | `useContentSidebar.ts:49-54,100-106` |
| 13 | Sidebar quick-link `/how-to-learn-tanach` is a dead route → 404 | sidebar | LOW-MED — prominent link broken | `DesignSidebar.tsx:198`, `App.tsx:288-422` |
| 14 | `maybeSingle()`/`[0]` on exact-title lookups (book node, chumash, article series, parasha series) breaks silently when duplicate titles exist | `/bible/:book`, `/parasha` | LOW-MED — empty page / missing CTA | `useBible.ts:109-125`, `useParasha.ts:112-121,164-169,232-236` |
| 15 | Sidebar רבנים tab caps at 30 (old sidebar ~153); usePublicRabbis tier-pins 3 names to top | sidebar | LOW | `DesignSidebar.tsx:85-90`, `useRabbis.ts:29-37` |
| 16 | Rabbi-page guest-series inflation (any series with ≥1 lesson by the rabbi) incl. teacher-tagged series | `/rabbis/:slug` | LOW | `useRabbi.ts:66-95` |
