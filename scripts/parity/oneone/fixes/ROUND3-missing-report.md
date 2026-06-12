# ROUND3 — last-mile missing items, evidence report

*Round-3 missing-items analyst · 2026-06-12 · DB access: SELECT-only via `sbq.py` (pzvmwfexeiruelwiujxn).
Deliverables: `fixes/ROUND3-missing.sql` (executed by the orchestrator), `fixes/analyze_missing_r3.py`
(reproducible classifier + generator; run `python3 fixes/analyze_missing_r3.py --sql`), plus
`fixes/r3_analysis.json` (per-occurrence diagnosis), `fixes/r3_scrape_queue.jsonl`,
`fixes/r3_yoav_list.json`, `fixes/r3_gains_estimate.json`.*

**Input:** fresh verify (`reports/verify_results.json`, listings) — **172 failing pages, 1,290
missing item-occurrences** (the brief said 919 — that was the pre-r2-verify figure; the analyzer
re-simulated all 172 pages against the cached anon-REST state and reproduced the fresh verify
**exactly: 1,290/1,290, 0 drift**, so full per-occurrence missing lists were recovered despite the
25-per-page cap in `verify_results.json`).

**Note on DEFERRED-med-low.jsonl:** the file is **empty** (0 bytes) — the 08:30 apply run consumed
it. Deferral state was reconstructed from RESOLVED-OPS × the journal: of 27,039 ops, 26,926 are
journaled; the 113 never-journaled split 81 med (med-sanity gate), 24 low, 8 high
(stage-7 `no-row-in-scope` + 3 teachers-wing rows). Only **4 missing occurrences** trace to
deferred ops — all four are low-confidence `copy_lesson` ops, now emitted as guarded SQL.

---

## 1 · Class histogram (1,290 occurrences)

| class | n | meaning |
|---|---:|---|
| ALIAS_PAGE_CODE | **473** | page is a "כל השיעורים ב-X" alias node — code-rendered roll-up slot (24 pages, CODE-SPEC §2.4); data copies would mass-duplicate content |
| NEVER_MATCHED | **356** | old row has no `matched_lesson_id` in item_match |
| OP_MISSING | **279** | matched lesson exists in DB, but no placement op ever targeted this page's series |
| TITLE_DRIFT | **81** | the matched lesson **is rendered** on the page — under a different title (or the old page lists the title more times than rows exist) |
| APPLIED_BUT_NO_ROW | **64** | placement ops journaled `applied`, yet no row in page scope |
| APPLIED_BUT_FILTERED | **33** | a row for the lesson IS in scope but the UI filter hides it |
| DEFERRED_LOW | **4** | responsible `copy_lesson` op exists, conf=low, never ran |

### Refined sub-classes (what the raw classes actually are)

| sub-class | n | disposition |
|---|---:|---|
| NM / insert-op draft pending **scrape queue** | 340 | the apply DID insert these rows (det-uuid match) as `status='draft'` pending content-scrape/rehost; the queue never finished. **196 unique lessons** → `r3_scrape_queue.jsonl` |
| ABNR / same — insert applied, draft pending | 51 | same root cause (these are the "applied but no row" ops — the row exists, draft) |
| NM / published title exists elsewhere, matcher missed | 12 | yoav (same-title rows may be different lessons) |
| NM / only bneyzion.co.il media (Rule 13) | 3 | yoav + rehost queue, NOT inserted raw |
| NM / no media, no candidate | 1 | yoav |
| TD / safe renames (current DB title on NO old page) | 17 | SQL retitles |
| TD / old page lists title ×2, DB has one row | 54 | yoav (cloning content to mimic old-site duplication needs a human call) |
| TD / current title demanded by other old pages | 10 | yoav |
| FILTERED / draft rows WITH media in right scope | 6 | SQL publish |
| FILTERED / **chunk-cap** (see finding F5) | 24 | code finding |
| FILTERED / draft, no content, no media | 3 | yoav |
| DEFERRED_LOW copies | 4 | SQL guarded copies |

---

## 2 · Five structural findings (what the last-mile missing really is)

**F1 — Stray draft twins hijack 5 pages (188 occurrences = the 5 worst series pages).**
שיעורים-קצרים…מלכים-ב (59), שיעורים-על-התנך-יחזקאל (40), ישעיהו-מוקלט (36), שיעורים-יהושע (34),
שיעורים-על-התנך-ירמיהו (19): item_match mapped each to an **empty/near-empty draft twin parked at
the נביאים root**, while the plans correctly targeted the ACTIVE twins (e.g. `5578c087` lc=59,
`b7b24b9b` lc=41). Verified by simulating the active twins against the old pages: **יהושע 34/34
order-perfect with zero changes**, מלכים-ב 59/61, יחזקאל 39/40, ירמיהו 20/20+2 dups, ישעיהו 36/36
(+51 extra chapter recordings = real new content). Fix: 5 reparents arm the verifier's twin-repick
(same parent + same `normalize_he` title + lessons>0) + surgical residuals (2 moves, 1 copy whose
stage-7 sort had errored `no-row-in-scope`, 3 evidence-backed demotes, repack of יחזקאל).

**F2 — The scrape/rehost queue never finished → 403 occurrences (196 lessons) are sitting in the
DB as content-less drafts.** `oneone_apply` inserted them (det-uuid confirmed), queued content
scrape (`status='draft'` until filled), and the journal says `applied` — but 215 of 268 live
insert-op rows are still draft with `content IS NULL`. Publishing them via SQL would render empty
popups, so the correct fix is **re-running `process_scrape_queue`/`process_rehost_queue`** for the
op_ids in `fixes/r3_scrape_queue.jsonl`. This single queue run resolves more missing items than
everything else combined.

**F3 — 24 alias pages ("כל השיעורים ב-X", 473 occurrences) need the CODE-SPEC §2.4 alias slot**, not
data: tree_map marks them `alias_of_parent`; the current renderer sends them to `/series/:id` of the
book node (direct lessons only) instead of the parent roll-up. Copying ~470 lessons into book nodes
would mass-duplicate content across every ancestor page. No SQL authored.

**F4 — Two match-file artifacts (67 occurrences).**
(a) The section page `/איך-לומדים-תנך/` is mapped to leaf `096fc3cd` ("איך לומדים תנ"ך", a child of
הגישה-הראויה!) instead of the section root `62590949` — the same id the app's own
`ROOT_IDS.howToLearn` uses. 60 of its 74 missing rows live in sibling series that the correct root
rolls up. Remap in item_match/tree_map, no DB change.
(b) `/הפטרות/הפטרות-שמות/מאמרים-הפטרות-ספר-שמות/` (7 missing) shares its mapped series `269dc17c`
with `/מאמרים-על-הפטרות-שמות/` — a **different** old listing (16 other rows) that currently
**PASSES**. One series cannot satisfy both; filling page A breaks page B. Needs its own series +
remap. (Generator auto-detects this and emitted nothing — see `match_conflict` guard.)

**F5 — PRODUCTION BUG (code): the CategoryPage roll-up truncates at 1,000 rows per 40-series
chunk.** Verified live: 4 of the תורה roll-up chunks return exactly 1,000 rows (PostgREST limit),
and all 24 "in-scope-but-not-rendered" occurrences (15 on /תורה/, 6 on /תורה/בראשית/ …) sit in
truncated chunks — published, public-audience rows the real UI silently drops. Needs pagination in
`useRollupLessons` (same family as the sidebar count-cap finding in VERIFY-REPORT).

---

## 3 · ROUND3-missing.sql — contents

**112 statements** (108 writes + 4 scoping/verification SELECTs), all idempotent and guarded; every
write carries old-page evidence in a comment. Validated live pre-delivery: 5/5 twins still at root,
15/15 copy sources+targets exist (1 already satisfied → no-op by guard), 17/17 retitle guards match
the live titles, 6/6 publishes are draft now, 3/3 demotes are published now, 17/17 move rows exist.

| § | what | writes |
|---|---|---:|
| 1 | reparent 5 stray draft twins (arms verify twin-repick; drafts stay invisible in app) | 5 |
| 2 | moves — re-home rows (2 from draft twin, 14 אסתר book-direct→child series keeping every roll-up identical, 1 misplaced dup to ירמיהו-פרק-ט) | 17 |
| 3 | guarded copies (clone + `copied_from`, `gen_random_uuid()`, forced `published`, audience∪general) — incl. the stage-7-errored 'אחד היה אברהם' and the 4 deferred-low ops | 15 |
| 4 | sort repacks to old-page slots (10·position) | 44 |
| 5 | demotes to draft (reversible; each title verified absent from ALL old listings) | 3 |
| 6 | publishes (in-scope drafts WITH media, listed on old public pages) | 6 |
| 7 | retitles to the old-page title (current title demanded nowhere) | 17 |
| 8 | inserts | 0 (all "insertable" rows turned out to already exist as drafts → F2) |
| 9 | `lesson_count` sync for the 17 touched series (also drops the מלכים-ב draft twin to lc=0, which is what lets the twin-repick fire) | 1 |

Caveat for the verify operator: the 15 copies are **not** in RESOLVED-OPS, so on ancestor
aggregation pages they will show as *unexplained* extras (+1 each). Every affected ancestor already
fails on hundreds-to-thousands of unexplained extras (e.g. נביאים 7,131; תורה 4,524), so no
currently-passing page is harmed — confirmed via the co-mapping guard.

---

## 4 · Expected coverage gain

**Fix routing of the 1,290 occurrences:**

| route | n |
|---|---:|
| ROUND3-missing.sql (now) | **240** |
| scrape/rehost queue re-run | **403** |
| code: alias slots (§2.4) | 473 |
| code: roll-up chunk cap | 24 |
| match-file remap (F4) | 67 |
| yoav | **83** |

**Per-section missing → route** (current missing count → sql / queue / code-alias / match / chunk / yoav):

| section | missing | sql | queue | alias | match | chunk | yoav |
|---|---:|---:|---:|---:|---:|---:|---:|
| נביאים | 711 | 197 | 243 | 236 | — | — | 35 |
| תורה | 300 | 8 | 100 | 156 | — | 24 | 12 |
| איך-לומדים-תנך | 162 | 1 | 22 | 74 | 60 | — | 5 |
| כתובים | 52 | 26 | 18 | 1 | — | — | 7 |
| נושאים-כלליים | 26 | 3 | 12 | 6 | — | — | 5 |
| מועדים | 16 | 2 | 6 | — | — | — | 8 |
| הפטרות | 15 | — | — | — | 7 | — | 8 |
| כלי-עזר | 5 | — | 2 | — | — | — | 3 |
| ימי-עיון | 3 | 3 | — | — | — | — | — |

**Expected page-pass gain (listings 781/1,273 today):**

- **+14 pages flip on ROUND3-missing.sql alone**: the 4 twin pages (מלכים-ב 61, יחזקאל 40,
  יהושע 34, ירמיהו 20), בראשית-מוקלט, תהלים-בבקיאות, איוב-בבקיאות, נחמיה-הרב-מאיר-הילביץ,
  עזרא-פרק-ב, 3 יחזקאל chapter pages, ימי-עיון-תשעד, הקדמה-ללימוד-נביאים → **795/1,273**.
- **+13 more after the scrape-queue re-run** (pages whose only residue is pending drafts:
  הגישה-הראויה, מאמרים-חומש-בראשית, פרשת-בראשית-א-ו, מידות-בפרשה ×2, ישעיהו-פרק-א, שמואל-א ×2 …)
  → **~808/1,273**.
- ישעיהו-מוקלט loses all 36 missing but keeps 51 extras (real recordings of chapters לח-נו the old
  page never listed — legit new content; flagged, not demoted).
- The 24 alias pages flip only with the §2.4 code slot; the big aggregation pages (נביאים, תורה,
  book pages) cannot flip on extras regardless of missing-fixes.

## 5 · Yoav list

**101 evidence rows** in `fixes/r3_yoav_list.json` (83 yoav-routed occurrences + match-conflict
summaries + identity-check notes for the 3 demoted rows). Largest buckets: 54 old-page duplicate
listings (same title twice on one old page, one row in DB), 12 matcher-missed same-title rows,
10 title drifts demanded elsewhere, 3 Rule-13 rehost-first rows, the rest singletons with full
old-page evidence (url + idx + title + rabbi + media).
