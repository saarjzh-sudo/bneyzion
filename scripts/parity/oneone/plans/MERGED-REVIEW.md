# MERGED-REVIEW — bneyzion 1:1 parity plans (synthesizer)

*Generated 2026-06-12 by `scripts/merge_check.py` (read-only; machine-readable detail in `plans/merge_report.json`).*
*Inputs: 8 plan files in `scripts/parity/oneone/plans/` + `code_semantics.md`.*

---

## 1. Totals per op type per plan

| op | tree | torah | ketuvim | neviim_ah | moadim_misc | topics | rabbis | teachers | **TOTAL** |
|---|---|---|---|---|---|---|---|---|---|
| set_lesson_sort | — | 5306 | 1261 | 2918 | 2139 | 19 | — | — | **11643** |
| copy_lesson | — | 1989 | 620 | 286 | 1055 | — | — | — | **3950** |
| set_series_sort | 584 | — | 358 | 94 | 48 | — | — | — | **1084** |
| link_lesson_topic | — | — | — | — | — | 1300 | — | — | **1300** |
| rabbi_page_item | — | — | 17 | — | — | — | 1112 | 277 | **1406** |
| teacher_listing_item | — | — | — | — | — | — | — | 895 | **895** |
| move_lesson | — | 116 | 228 | 6 | 68 | 19 | — | — | **437** |
| update_series | 167 | — | 137 | — | — | — | — | — | **304** |
| insert_lesson | — | 51 | 17 | 28 | 13 | 22 | 172 | 9 | **312** |
| link_series_topic | — | — | — | — | — | 178 | — | — | **178** |
| set_lesson_rabbi | — | 33 | 27 | 8 | 15 | — | 50 | 3 | **136** |
| set_topic_sort | — | — | — | — | — | 123 | — | — | **123** |
| draft_lesson | — | 50 | 3 | — | 54 | — | — | — | **107** |
| update_lesson_field | — | — | — | — | — | — | — | 98 | **98** |
| unlink_lesson_topic | — | — | — | — | — | 93 | — | — | **93** |
| retag_lesson | — | 13 | 7 | 2 | 14 | 17 | — | 37 | **90** |
| reparent_series | 32 | — | 38 | — | — | — | — | — | **70** |
| create_series | 42 | — | 1 | 1 | 3 | 2 | 10 | — | **59** |
| set_series_rabbi | — | — | — | — | 9 | 2 | 46 | — | **57** |
| merge_rabbi | — | — | — | — | — | — | 14 | 2 | **16** |
| publish_lesson | — | — | — | — | 16 | — | — | — | **16** |
| set_entity_type | — | — | — | — | — | — | 2 | 11 | **13** |
| update_rabbi_field | — | — | — | — | — | — | — | 2 | **2** |
| create_topic | — | — | — | — | — | 2 | — | — | **2** |
| demote_series | — | — | — | 1 | — | — | — | — | **1** |
| **ops total** | **825** | **7558** | **2697** | **3361** | **3434** | **1777** | **1406** | **1334** | **22392** |
| yoav_review | 19 | 50 | 274 | 22 | 203 | 30 | 59 | 38 | **695** |
| code_asks | 10 | 6 | 10 | 7 | 10 | 8 | 10 | 10 | **71** |

Vocabulary extensions used by plans (apply runner must support): `publish_lesson` (moadim),
`update_lesson_field` (teachers — 96× `content_type`, 2× `attachment_url_old`),
`update_rabbi_field` (teachers), `teacher_listing_item` (teachers — new table),
`link_series_topic` (topics — new table `series_topics`), `demote_series` (neviim).
Ref variants: `lesson_ref` / `lesson_ref_old{title,rabbi,canonical_old_url}` (set_lesson_sort on inserted rows),
`series_ref` as dict `{tmp_id}` / `{old_url}` (rabbis_plan), inline `sort_order` on move/copy (ketuvim).

---

## 2. Conflicts (script-detected) + resolutions

**314 conflict records.** Deterministic resolution rules applied (in this priority order):
1. **tree_plan wins on structure** (parent, status, series.sort_order).
2. **Book-page plan wins over topic/rabbi/teachers plan on a lesson's `series_id`** (placement). Book-plan tie-break: torah > ketuvim > neviim_aharonim > moadim_misc.
3. **topic/rabbi/teachers plans use copy/link semantics, never move.**
4. **Sort scopes are independent**: `lessons.sort_order` is per-series-row context (a sort whose `series_ref` ≠ home series targets the copy row in that series), `lesson_topics.sort_order` per topic, `rabbi_page_items.sort_order` per rabbi, `teacher_listing_items.sort_order` per (scope,key). Cross-plan same-number in different scopes is NOT a conflict — and indeed **0** same-scope contradictions (G) and **0** same-scope slot collisions (H) were found after ref normalization.

### A. move-move — contradictory homes for the same lesson — **23**
| pair | n | resolution |
|---|---|---|
| moadim ↔ topics | 19 | moadim (book plan) keeps the `move_lesson`; topics_plan's move converts to `copy_lesson` to its tmp-series (same target list, link semantics). 17/19 are the מאמרים-על-ימי-בית-שני / משפט-המלך cluster where both plans create the same new series — see P below; after tmp-id remap the two moves become **identical** and the conflict dissolves. |
| ketuvim ↔ moadim | 2 | Lessons cross-listed on a תהלים psalm page and a ימי-עיון page. ketuvim wins the home (`ec9ae746` psalm series); moadim's move → copy into `f4040001-...` (ימי עיון). |
| moadim ↔ torah | 2 | torah wins (e.g. lesson `c53ef868` home = `6ba0b449` torah series); moadim's הפטרת-שבת-פרה placement → copy. |

### B. reparent-reparent — **0**. C. series-sort — **1 cross-plan + 4 same-plan cross-listings**
- Cross-plan (1): series `10e20007` "חמאה ודבש - ישעיהו" — tree_plan parks at **100** (page-only band, not in old sidebar) vs neviim sort **13** (card position on the old ישעיהו page). **tree_plan wins**; consistent in practice — cards 1–12 are the sidebar-band series, so the page-only card still renders 13th when the page orders by sort_order. NOTE: tree_plan also reparents it (parent currently NULL → `1fb20386` ישעיהו) — reparent must run before sorts.
- Same-plan (4, all moadim): a series cross-listed on two old pages with two positions (e.g. `tmp:series:003` sort 120 on page A / 10 on page B). One column → **first op wins** (canonical home page emitted first); the second listing's order is preserved by that page's own ladder, no data loss.

### D. draft-vs-use — **10** (all inside lessons_plan_torah)
Generator inconsistency: the same row is both `draft_lesson` ("exact dup of matched old item") and `set_lesson_sort` into a page slot. The old page really shows BOTH near-identical items (e.g. 'פרה אדומה- טומאת מת' twice on פרשת-חוקת). **USAGE WINS — cancel the draft, keep the sort** (1:1 row-count parity with the old page); all 10 logged to yoav_review.

### E. publish-vs-draft — **0**. F. merge cycles/chains — **0** (16 merge_rabbi edges form a clean forest).

### G/H. lesson-sort same-scope contradictions/collisions — **0 / 0** after ref normalization. Every (lesson,scope) has one value; every (scope,slot) one lesson. The earlier "13 contradictions" were an artifact of null `lesson_id` on `lesson_ref`-style ops.

### I. topic-link duplicates — **2** (within topics_plan)
Same topic, multiple sort slots with `lesson_id` unresolved at plan time (insert-referencing links). Apply dedups on `(topic_id, lesson_id)` keep-first after tmp resolution.

### J. rabbi_page_items — **59 duplicate rows + 59 sort collisions** (rabbis_plan ↔ teachers_plan, mostly creator overlap e.g. ושננתם `71aa933c`)
Old site lists dual-role creators on BOTH wings, so both plans emit rows for the same (rabbi, series). Resolution: **rabbis_plan owns the public rabbi page ladder** — keep its rows verbatim; teachers_plan rows for the same (rabbi,kind,target) are dropped (unique index `(rabbi_id,kind,coalesce(series_id,lesson_id))`); teachers-only extras append after `max(sort_order)` preserving relative order. The teachers wing creator page reads `teacher_listing_items`/its own ordering, so no teachers-side loss.

### K. insert-dup — **82 url-groups, 87 redundant insert ops** (312 raw inserts → **225 physical inserts**)
Distribution: torah↔rabbis 34, neviim↔rabbis 21, ketuvim↔rabbis 12, rabbis↔teachers 4, moadim-internal 4, 3-way 4, other 3. Expected: old rabbi pages re-list the same שו"ת/lesson items as the book pages. Resolution: **one physical insert — highest-priority plan's payload wins** (book plan payloads carry page context; rabbis_plan adds `dedup_key`); the apply runner maintains a tmp-id alias map so losers' `rabbi_page_item.lesson_ref` / sort ops resolve to the single new row. All inserts obey Rule 13 (`attachment_url_old` / `rehost:true`) and `needs_content_scrape` queues.

### L. retag-conflict — **3** (ketuvim says `['general','teachers']`, topics says `['general']`)
Same lessons (e.g. `b31da8ad`) appear on the old PUBLIC topic page AND old teachers pages. **Resolution: UNION → `['general','teachers']`** (dual-audience), which REQUIRES the dual-audience public filter fix (CODE-SPEC §0.3) — otherwise the union hides them publicly. No general-vs-teachers-only contradiction found.

### M. lesson-rabbi conflict — **4** — same person, name-variant strings (`רותי שפירא - ד"ר` vs `… (לנשים)`; `ושננתם` vs `ושננתם - אוצר התורה`). Book plan string wins (matches old page display); merge_rabbi ops already unify the underlying rabbi rows; flagged to yoav.

### N. series-rabbi conflict — **1** (moadim-internal, series `d714fb34`: `274f4480` ×2 vs `acd34d0f` ×1) — first (majority) wins; yoav_review.

### O. update-series conflict — **62** (all ketuvim vs tree, all `status`: tree=`active` vs ketuvim=`published`)
Both are public statuses; difference only matters to `/series` catalog + search which today filter `status='active'` (R-LIB1/R-SRC2). **tree_plan wins → `active`**, and CODE-SPEC makes catalog/search accept both — net user-visible effect: none.

### P. create-series duplicates — **6 title-groups**
`קונטרס הנשים הנכריות` (ketuvim+rabbis), `בבל מול ירושלים` (moadim+rabbis), `משפט המלך בתנ"ך והלכה` + `מאמרים על ימי בית שני` (moadim+rabbis+topics — 3-way!), `תנ"ך בעיון - ישעיהו` (neviim+rabbis), `לב הפרק - ישעיהו` (rabbis-internal; NOTE: neviim plan instead **demotes** existing dup `c8b151d0` and keeps `e93c7a85` — rabbis_plan's create must be remapped to `e93c7a85`, not created). Resolution: ONE create per old node, owner = highest-priority plan; tmp-id alias map remaps all referencing ops (incl. the 19 A-conflicts above and `set_series_rabbi` on tmp refs).

### Q. teacher_listing_items collisions — **0**. S. demote-vs-structure — **0**.

---

## 3. Net effect after resolution

| metric | raw | after merge |
|---|---|---|
| ops total | 22392 | ~22280 (drop 87 dup inserts, ~5 dup creates, 10 drafts, 62 status values, ~60 rpi dups, 23 move→copy/identity conversions) |
| physical insert_lesson | 312 | **225** (+ scrape queue: ≥19 neviim + ketuvim שו"ת/text rows; + rehost queue per Rule 13) |
| create_series | 59 | **~53** |
| conflicts needing human eyes | — | **18** (10 D + 4 M + 1 N + 3 L) — appended to yoav_review |

**Riskiest items** (carried into APPLY-ORDER gates):
1. The 3,950 copy_lesson ops inflate row counts — display-dedup must move to id-based (CODE-SPEC) or copies show as dups on /category (R-CAT4).
2. tmp-id alias map correctness (K/P remaps) — a wrong remap silently re-parents 19 topic moves.
3. Dual-audience filter change is a prerequisite for L-resolution and moadim CA5 (כלי-עזר/ליווי-ת"תים) — applying retags before the code fix hides content publicly.
4. series.sort_order single-column carries two meanings (sidebar band 1..99 / page order / ≥100 parked) — all consumers must adopt the band convention in the same deploy.
