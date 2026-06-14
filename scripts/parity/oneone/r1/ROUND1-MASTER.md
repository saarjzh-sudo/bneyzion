# ROUND1-MASTER — Bnei-Zion 1:1 migration · Saar Review Round 1

**Scope:** category-page parity for the 5 Torah books (בראשית, שמות, ויקרא, במדבר, דברים).
**Ground truth:** old site `www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/<book>/` + each series' own page (fresh-fetched 2026-06-14, cached under `r1cache/`).
**DB:** Supabase `pzvmwfexeiruelwiujxn` (bnei-zion), queried READ-ONLY via `sbq.py`. Prod branch = `feat/navigator-bot`.
**Inputs synthesized:** `plan_<book>.md`, `plan_<book>.sql`, `gt_<book>_manifest.json`, `series_diffs_<book>.json`, `bible_nav*.json`, `CODE-SPEC.md`.

Saar's complaint decomposes into THREE root causes, only TWO of which are data:
1. **CODE (layout):** parsha event-series (`title LIKE 'פרשת% | %'`) render OPEN as category rows with rolled-up lessons. They are sidebar nodes only — old site renders **0** of them on the category page (verified all 5 books). Fix = exclude by title-pattern + render CLOSED series cards.
2. **CODE (display count):** cross-book series (לשון הקודש בפרשה, מידות בפרשה, פשט בפרשה …) store their FULL multi-Torah lesson set under one book node, inflating the card count vs the old book-scoped page. Fix = count the book-subset, not the whole series. **No SQL.**
3. **DATA (this plan's SQL):** under-populated / split rabbi-series (the "1 vs 15" אבינר bug) + missing standalone/שו"ת. Per-book SQL below.

---

## 1. Per-book table

Columns: old series (GT manifest), matched, true-missing (no DB series), under-filled, over-filled (dup/surplus, no delete), lessons-to-INSERT, lessons-to-MOVE, standalone-to-insert, שו"ת-to-insert. Worst gaps named inline.

### בראשית
| metric | value |
|---|---|
| old series / standalone / שו"ת (GT) | 28 / 39 / 20 |
| matched | 26 of 28 (24 OK-count + 2 misparented found) |
| true-missing series | 0 |
| under-filled | **2** — `הרב שלמה אבינר על פרשיות בראשית` **1→15** (worst gap in project); `שיעורים על התנ"ך - בראשית` (בן שחר) **0→4** (blocked Y3) |
| over-filled | 6 (אבינר-audio 25 vs 10; שנדורפי +8; שפירא +5; אדלר +1; מבט מגבוה +1; נאמן +4 — all flag, no delete) |
| misparented (re-parent) | 2 — `קדושת פשוטו של מקרא - בראשית` (קופרמן, 24/28) → reparent; `תולדות קרבת ה' לאדם` (4/4) → reparent **commented/guarded (Y1)** |
| lessons to MOVE | **12** (docx from audio series 9de1 → docx series b2e0) |
| lessons to INSERT | **2** (missing docx media 144428, 144430 → b2e0; Rule-13 rehost queued) |
| standalone to insert | **0 — BLOCKED (Y2):** GT scrape captured standalone+שו"ת rows with empty title AND empty href; un-dedupable. Needs re-scrape with corrected selector. DB has 16 standalone vs old 39 → likely real gap, unprovable. |
| שו"ת to insert | **0 — BLOCKED (Y2)** |
| SQL ops | 1 MOVE-update (12 ids) + 1 re-sort update + 2 INSERT + reparent update(s) + 3 commented DELETE |

### שמות
| metric | value |
|---|---|
| old series / standalone / שו"ת (GT) | 25 / 27 / 11 |
| matched | 23 of 25 (קשתיאל exists but nested → code; אוריאל-תולדות is cross-topic) |
| true-missing series | 0 |
| under-filled | 0 |
| over-filled | 5 display (cross-book: לשון הקודש 149 vs 37, מידות 117 vs 30, עולמות 92 vs 21, פשט 76 vs 21, אונקלוס 24 vs 9 — **CODE count fix, no SQL**) + 3 benign +1 (שפירא, ונגרובר, בן שחר) |
| **SPLIT BUG** | `הרב אבינר על פרשיות שמות` ×2 — DB `1f4cf5c3`=**0** (empty) / `1ff919db`=**40** (merge of 19+21). Move sort_order≥200 (21 lessons) → empty series. |
| lessons to MOVE | **21** (one UPDATE; the אבינר split) |
| lessons to INSERT | **5** standalone-stub (3 lesson + 2 שו"ת) — empty href on old page, no media URL, marked review_note (Yoav doubt: may be intentionally dropped audio stubs) |
| standalone to insert | 3 (of the 5 above) | שו"ת to insert | 2 (of the 5 above) |
| code-only | קשתיאל (24, nested under nav-node `3ad6516e`) must be surfaced as a category row (C3) |
| SQL ops | 4 UPDATE (split move + re-sort) + 5 INSERT |

### ויקרא
| metric | value |
|---|---|
| old series / standalone / שו"ת (GT) | 22 / 15 / 7 |
| matched | 22 of 22 (all exact-title) |
| true-missing series | 0 |
| under-filled | **1** — `קדושת פשוטו של מקרא - ויקרא` (קופרמן) **0→17** (empty; 17 lessons scattered into parsha + general buckets) |
| over-filled | **1** — `שיעורים- חומש ויקרא` (תירוש) 26 vs 25: in-series dup `עבד עברי` (commented DELETE; ⚠ Yoav: both copies point to a *משפטים* MP3 — possible mis-import) |
| lessons to MOVE | 0 |
| lessons to INSERT | **17** (Kuperman backfill into `155c726f…`; all PDFs on bneyzion.co.il/media → Rule-13 REHOST, legacy_attachment_url set, idempotent guard) |
| standalone to insert | **0** (all 22 standalone+שו"ת already in DB, nested under parsha/aggregation series; surfacing = CODE concern) |
| שו"ת to insert | **0** |
| SQL ops | 17 INSERT + 5 commented DELETE (dedup) |

### במדבר
| metric | value |
|---|---|
| old series / standalone / שו"ת (GT) | 23 / 25 / 10 |
| matched | 18 OK + see below |
| true-missing series | 0 |
| under-filled | **3** — `הרב שלמה אבינר על פרשיות במדבר` (#15) **6→25** (split); `קדושת פשוטו של מקרא - במדבר` (`48adc2eb`) **0→19** (empty, scattered); `מידות בפרשה` **27→28** (1 missing, `טלית שכולה אמת`, NOT in DB) |
| over-filled | 2 (אבינר#1-merged 36; מתקרבים +1 dup) + שנדורפי 44 vs 43 flagged (Y2) |
| **SPLIT BUG** | `6ba0b449` holds merged 36 (=16 old#1 + 19 old#15 + 1 internal dup); `d860d934` had only 6 copy-clones → **MOVE 19 old#15 rows → d860d934** |
| lessons to MOVE | **19** (אבינר split) |
| lessons to INSERT | **19** קדושת backfill (clone real media, no Rule-13 violation — media already rehosted) + **1** מידות placeholder (NULL media; ⚠ Yoav #1, needs old href) |
| standalone to insert | **25** (all exist nested in parsha/other; 0 as `series_id NULL` → insert standalone clones) |
| שו"ת to insert | **10** (same; `content_type='shut'`) |
| SQL ops | 55 INSERT (19 קדושת + 1 מידות + 25 standalone + 10 שו"ת) + 1 UPDATE (אבינר move) + 1 reparent + 1 commented DELETE |
| flags | פרשת קורח parsha node DUPLICATED (`aa50e54c`=47 + `6adf155c`=5); `דפי עבודה - במדבר` worksheets node must be code-excluded |

### דברים
| metric | value |
|---|---|
| old series / standalone / שו"ת (GT) | 24 / 11 / 5 |
| matched | 22 by query + 2 found misparented = **24/24** |
| true-missing series | 0 |
| under-filled | 0 |
| over-filled | 3 — `מאמרים - חומש דברים` +2 dup; `מאמרים על פרשיות דברים` +1 dup; `הרב אבינר שיחות על פרשיות דברים` 5 vs 4 (genuine surplus `הכרת תודה לכל` — Yoav doubt) — all display-dedup, no delete |
| **REPARENT (only DB writes)** | 2 — `מאמרים על סוגיות פרשת שופטים` (קופרמן, 3/3, under תורה root) → דברים category; `פרשת שבוע- דברים` (ג'יאמי, 25, under parsha node `8e8346f2`) → דברים category |
| lessons to MOVE / INSERT | 0 / 0 |
| standalone to insert | **0** (all 16 standalone+שו"ת already in DB) |
| שו"ת to insert | **0** |
| note | אבינר 1-vs-15 defect **does NOT reproduce** in דברים (3=3, 5=5+1surplus) — that defect was בראשית-specific |
| SQL ops | 4 UPDATE (2 reparent + guards) + 3 commented DELETE |

---

## 2. Grand totals (5 Torah books)

| metric | בראשית | שמות | ויקרא | במדבר | דברים | **TOTAL** |
|---|---:|---:|---:|---:|---:|---:|
| old rabbi-series (GT) | 28 | 25 | 22 | 23 | 24 | **122** |
| old standalone (GT) | 39 | 27 | 15 | 25 | 11 | **117** |
| old שו"ת (GT) | 20 | 11 | 7 | 10 | 5 | **53** |
| series matched | 26 | 23 | 22 | 18+ | 24 | ~113/122 |
| true-missing series | 0 | 0 | 0 | 0 | 0 | **0** |
| under-filled series | 2 | 0 | 1 | 3 | 0 | **6** |
| over-filled series | 6 | 8 | 1 | 3 | 3 | **21** (all flag-only, no delete) |
| lessons to MOVE | 12 | 21 | 0 | 19 | 0 | **52** |
| lessons to INSERT (series backfill) | 2 | 0 | 17 | 20 | 0 | **39** |
| lessons to INSERT (standalone+שו"ת stubs) | 0🔒 | 5 | 0 | 35 | 0 | **40** |
| standalone to INSERT | 0🔒 | 3 | 0 | 25 | 0 | **28** (+ 39 blocked in בראשית) |
| שו"ת to INSERT | 0🔒 | 2 | 0 | 10 | 0 | **12** (+ 20 blocked in בראשית) |
| series REPARENT | 2 | 0 | 0 | 1 | 2 | **5** |
| commented DELETE (dedup, await approval) | 3 | 0 | 5 | 1 | 3 | **12** |

🔒 = בראשית standalone(39)+שו"ת(20) blocked by empty-href scrape (Y2). Not counted in the insert totals.

**Headline DB writes to apply (79 INSERT total, verified vs the .sql files):** ~52 MOVE + **39 series-backfill INSERT** (בראשית 2 + ויקרא 17 + במדבר 20) + **40 standalone/שו"ת INSERT** (שמות 5 + במדבר 35) + 5 REPARENT. Zero destructive ops auto-applied; 12 DELETEs are commented pending Saar.
> Note on the `lessons-to-INSERT (series backfill)` table row: שמות's 5 inserts are standalone/שו"ת stubs (counted in the standalone/שו"ת rows), NOT series backfill — so series-backfill INSERT = 39, not 44. במדבר's 20 = 19 קדושת + 1 מידות-placeholder.

---

## 3. APPLY ORDER (data SQL) + per-book verification

Apply books independently, each inside its own `BEGIN…COMMIT` (run as `BEGIN` → inspect verification SELECTs → `COMMIT`, else `ROLLBACK`). All plans are idempotent/guarded (re-run = 0 rows). **DELETE blocks stay commented.** Order ranked easiest→hardest / lowest→highest write volume:

1. **`plan_דברים.sql`** — safest. 2 reparents only, 0 inserts. **VERIFY:** both series now under דברים category `b082cb95`; `…שופטים`=3 lessons, `פרשת שבוע- דברים`=25; draft stub `2ee49d73` still inert (real=0); 11 parsha / 25 rabbi-topic children.
2. **`plan_בראשית.sql`** — MOVE 12 (9de1→b2e0) + re-sort + INSERT 2 + reparent קדושת. **VERIFY:** `b2e079cd` real-count == **15**; `9de1aa21` drops toward 10 (13 surplus flagged); media 144428 & 144430 exist once; `46bbc3f2` (קדושת) parent = בראשית category. Then queue 144428/144430 legacy URLs for Rule-13 rehost.
3. **`plan_ויקרא.sql`** — INSERT 17 Kuperman into `155c726f…`. **VERIFY:** series real-count == **17**; all 17 carry `legacy_attachment_url LIKE '%bneyzion.co.il/media/%'` for rehost; תירוש still 26 (dedup deferred). Queue the 17 for rehost.
4. **`plan_שמות.sql`** — SPLIT move (21 rows sort_order≥200) `1ff919db`→`1f4cf5c3` + re-sort + INSERT 5 stubs. **VERIFY:** `1f4cf5c3` real-count == **21**, `1ff919db` == **19**; 5 stub rows exist with `series_id NULL`, `bible_book='שמות'`, review_note set.
5. **`plan_במדבר.sql`** — heaviest (55 INSERT + 19-row MOVE + reparent). **VERIFY (combined query per the .sql):** `6ba0b449`==**17** (16 + 1 internal dup), `d860d934`==**25** (19 moved + 6 pre-existing copies → display-dedup to 19), `48adc2eb`==**19** (קדושת backfill), `dfb8c480`==**28** (מידות + placeholder); **35** new `series_id NULL` rows for `bible_book='במדבר'` (25 standalone + 10 שו"ת).

**Single combined verification pattern per book** (each rabbi-series real-count == old_count):
```sql
SELECT s.id, s.title, COUNT(l.*) FILTER (WHERE l.status='published') AS real_count
FROM series s LEFT JOIN lessons l ON l.series_id = s.id
WHERE s.id IN (<the touched series ids for this book>)
GROUP BY s.id, s.title;
-- assert each real_count == the GT old_count in series_diffs_<book>.json
```

---

## 4. Consolidated CODE-CHANGES (from CODE-SPEC), ranked by user impact

| # | change | files | impact | why |
|---|---|---|---|---|
| **C1** | **Exclude parsha event-series from category rows.** Add `isParshaEventSeries = /^\s*פרשת\b.*\|\s*[א-ת]/` predicate to `seriesFiltered`. | `useContentSidebar.ts` `useSeriesForNode` 310-318 | **CRITICAL** — this IS Saar's #1 complaint | Old site renders 0 parsha rows; clones carry sort_order 1..12 and sort to top |
| **C2** | **Render CLOSED series cards** (link `/series/:id`), DELETE the inline accordion (`SeriesBlock` `useState(true)` → `SeriesRowCard`), DELETE the "כל השיעורים" roll-up section + `useRollupLessons`/`useSeriesLessons`/`allLessons` combiner. | `CategoryPage.tsx` 94-127, 187-241, 261-285, 499-529, 545-778 | **CRITICAL** | removes the rolled-open dump; restores flat list |
| **C3** | **Book-subset lesson count** on each card (count lessons scoped to this book, not the whole cross-Torah series). | `CategoryPage.tsx` card render + count hook | **HIGH** | fixes 149/117/92/76/24 → 37/30/21/21/9 (שמות display inflation) |
| **C4** | **Three-part layout** `[closed series cards] → [standalone שיעור] → [שו"ת]`. Standalone = `series_id = nodeId` direct lessons only (do NOT roll up descendants). שו"ת split by `source_type/content_type` marker. | `CategoryPage.tsx` | **HIGH** | matches old page row grouping |
| **C5** | **Surface nested nav-node children** (שמות `כל השיעורים בחומש שמות` `3ad6516e` → surfaces קשתיאל; reparent or include children). | `useSeriesForNode` / שמות | **MEDIUM** | otherwise קשתיאל (24 lessons) never shows on שמות category |
| **C6** | **Multi-rabbi card display** — `useSeriesRabbis(seriesId)` (batched `.in("series_id", ids)`, lead `series.rabbi_id` first), `formatRabbis(names) → ≤2 join ", " else "X, Y ועוד"`. | `CategoryPage.tsx`, `BibleBookPage.tsx` 225-227/298-302, `SeriesCard.tsx` 9/29 | MEDIUM (enhancement) | Saar-requested over old single-author; keep lead first for parity |
| **C7** | **Within-band Hebrew title sort** for page-only band (all real series now sort_order 0). `a.title.localeCompare(b.title,"he")`. | `useSeriesForNode` 349-365 | LOW | mirrors old ~alphabetical series order |
| **C8** | **/bible/:book conditional chapter grid** (`useBibleBook`/`useBibleChapterLessons`), grid SECONDARY, series list PRIMARY (Torah `bible_chapter` sparse). | `BibleBookPage.tsx` 54-55/173-337 | LOW | grid near-empty for Torah; backfill flagged, do not invent |

### ⚠️ Neviim/Ketuvim SAFETY NOTE (CODE-SPEC R1 — the big one)
The parsha-exclude **MUST be title-pattern-scoped** (`^פרשת .* | <hebrew>`), **NOT** book-scoped and **NOT** "hide all sort_order≥1 children". In Neviim the event-series ARE the content (`הושע פרק א`, `זכריה פרק ב`, carried with sort_order 1..N). The pattern matches **0** Neviim children (verified). A book-scoped or sort-order-scoped exclude would **wipe all Neviim/Ketuvim content.** Regression check after the change: `/category/<a Neviim book id>` still lists its `<ספר> פרק <n>` series. Tight-regex assertions (R2): `פרשת שבוע-בראשית`, `פרשת השבוע עפ"י הרמב"ן`, `פרשת שבוע במדבר` must all evaluate **false** (no `|` range). bible_nav_compare confirms 0 books missing in new DB, chapter coverage parity (only ויקרא +1 extra ch107).

---

## 5. Open questions / Yoav doubts (aggregated)

**Cross-book / policy:**
- **Display-dedup vs physical delete (12 commented DELETEs).** Project rule = no destructive deletes; all over-fills and internal dups are flagged for display-dedup. Confirm Saar wants display-dedup (not delete) for: בראשית audio surplus (sorts 230/240/250), ויקרא תירוש `עבד עברי`, במדבר אבינר dup + מתקרבים + קורח-node dup, דברים 4 internal dups.
- **Standalone/שו"ת surfacing rule (ויקרא, דברים, partly שמות).** Many standalone/שו"ת already exist nested under parsha/aggregation series, not as `series_id NULL`. Default taken = do NOT insert duplicates; surface them at the category page by union+dedup (CODE). Confirm that's the wanted behavior vs inserting standalone copies (במדבר took the insert path → 35 inserts; ויקרא/דברים took the no-insert path). **Inconsistency to resolve: במדבר inserts standalone clones, ויקרא/דברים do not.** Pick one policy.

**Book-specific:**
- **בראשית Y2 (BLOCKED):** standalone(39)+שו"ת(20) GT rows have empty title AND empty href → un-insertable. Needs a re-scrape of the old בראשית category page with a corrected selector before any insert. This is the one unresolved "couldn't find the missing lessons" item.
- **בראשית Y3 (BLOCKED):** `שיעורים על התנ"ך - בראשית` (בן שחר) old=4 new=0 — 4 audio lessons on old series page, placeholder rows no href → needs series-page re-scrape.
- **בראשית Y1:** `תולדות קרבת ה' לאדם` reparent into בראשית is the literal parity fix but may be an intentional general-topics node (also appears under שמות as cross-link). SQL commented/guarded.
- **שמות:** 5 missing standalone/שו"ת have NO source URL (empty href) — insert as text-stub (chosen) or leave dropped? קשתיאל DB=24 vs GT=23 (+1 benign "בגדי הכהונה"); שפירא +1 "מבין שני הכרובים 1"; ונגרובר/בן שחר +1 — keep or drop?
- **ויקרא:** תירוש `עבד עברי` dup audio is a *משפטים*(Shemot) MP3 attributed to ג'יאמי — possibly a mis-imported lesson, not just a dedup. 17 Kuperman PDFs need rehost before they render (gview dead → native iframe).
- **במדבר:** מידות `טלית שכולה אמת` inserted as NULL-media placeholder — needs old series-page href before playable. שנדורפי 44 vs 43 (+1, which row?). פרשת קורח node duplicated → merge-review (no delete).
- **דברים:** surplus `הכרת תודה לכל` in `הרב אבינר שיחות על פרשיות דברים` (5 vs 4) — genuine, not a copy; keep or move? Confirm `פרשת שבוע- דברים` should be a top-level rabbi-series card (it is on old site).

**Data-track flags (not RD-1 SQL):** Rule-13 rehost queue for the inserted legacy URLs (בראשית 144428/144430; ויקרא 17 Kuperman PDFs). Torah `bible_chapter` backfill for a non-empty chapter grid (C8) — flagged, do not invent.

---

## Return summary

- **Grand totals:** old GT 122 rabbi-series / 117 standalone / 53 שו"ת across 5 books. **0 true-missing series.** 6 under-filled, 21 over-filled (all flag-only). Planned DB writes: **52 MOVE + 44 series-backfill INSERT + 40 standalone/שו"ת INSERT + 5 REPARENT**; 12 DELETEs commented pending approval. Verified GT counts match the manifests exactly.
- **Unresolved (couldn't locate missing lessons in old site):** **בראשית only** — Y2 (39 standalone + 20 שו"ת) and Y3 (4 בן שחר audio) are BLOCKED by an empty-title/empty-href scrape; require a re-scrape with a corrected selector before insertion. Every other book's gaps were fully resolved to concrete SQL.
- **Policy inconsistency to resolve:** במדבר inserts standalone/שו"ת clones; ויקרא + דברים deliberately do not (rely on CODE surfacing). Saar must pick one.

### 10 worst series gaps (ranked by |gap|, verified counts)
| # | series | book | old → new | gap | fix |
|---|---|---|---:|---:|---|
| 1 | הרב שלמה אבינר על פרשיות בראשית | בראשית | 15 → 1 | **+14** | MOVE 12 + INSERT 2 → 15 (the headline "1 vs 15") |
| 2 | קדושת פשוטו של מקרא - ויקרא (קופרמן) | ויקרא | 17 → 0 | **+17** | INSERT 17 backfill |
| 3 | קדושת פשוטו של מקרא - במדבר | במדבר | 19 → 0 | **+19** | INSERT 19 backfill |
| 4 | הרב אבינר על פרשיות שמות #2 (empty split) | שמות | 21 → 0 | **+21** | SPLIT-move 21 from merged series |
| 5 | הרב אבינר על פרשיות שמות (merged) | שמות | 19 → 40 | **−21** | over by the other half of the split |
| 6 | הרב שלמה אבינר על פרשיות במדבר #15 | במדבר | 19 → 6 | **+13** | SPLIT-move 19 |
| 7 | הרב אבינר על פרשיות בראשית (audio) | בראשית | 10 → 25 | **−15** | MOVE 12 docx OUT; flag 3 surplus |
| 8 | מאמרים - חומש בראשית (שנדורפי) | בראשית | 70 → 78 | **−8** | flag (5 share parsha media, dedup) |
| 9 | מאמרים על פרשיות בראשית (שפירא) | בראשית | 53 → 58 | **−5** | flag (no parsha overlap) |
| 10 | שיעורים על התנ"ך - בראשית (בן שחר) | בראשית | 4 → 0 | **+4** | BLOCKED (Y3) — re-scrape needed |

*(Display-only over-counts from cross-book series — לשון הקודש 149 vs 37, מידות 117 vs 30 in שמות — are larger in raw magnitude but are NOT data gaps; they are the C3 count-scoping fix and excluded from this "worst gaps" ranking.)*
