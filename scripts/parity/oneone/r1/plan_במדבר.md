# Plan — book **במדבר** · Bnei-Zion 1:1 migration · Review Round 1

**Ground truth:** old `www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/במדבר/`
**Verified against:** live DB via `sbq.py` (re-queried fresh — prior `series_diffs` data confirmed wrong on the אבינר/קדושת lines).
**Plan SQL:** `plan_במדבר.sql` (idempotent, guarded, `BEGIN…ROLLBACK` — DO NOT auto-execute).

---

## Saar's complaint — confirmed by evidence

The old category page (`gt_במדבר.json` → `rows`) renders **58 flat rows**: 23 rabbi-series (CLOSED cards "name · rabbi · N שיעורים"), 25 standalone lessons, 10 שו"ת. Field `parsha_event_rows_on_category = []` — the old page renders **ZERO** parsha event-series rows. So:

- **The 11 parsha event-series in the DB (`title LIKE 'פרשת% | %'`) must be EXCLUDED from the category page by CODE** (sidebar nodes only). This is the code spec, not a SQL change.
- The DB job here is only to fix **lesson misassignment** so the rabbi-series counts match the old site.

---

## STEP 1 — אבינר split (the headline bug Saar named)

Two **distinct** old אבינר series exist (disjoint lesson sets): old #1 = 16 lessons, old #15 = 19 lessons (0 overlap, verified).

The migration **merged both into `6ba0b449`** (36 rows = 16 + 19 + 1 internal dup of "וימאסו בארץ חמדה"). The second series `d860d934` got only 6 COPY-clones of 6 of the #15 lessons.

| series id | old target | now | after fix |
|-----------|-----------|-----|-----------|
| `6ba0b449` | old#1 (16) | 36 | 17 (16 + 1 internal dup → display-dedup) |
| `d860d934` | old#15 (19) | 6 | 25 (19 moved + 6 pre-existing copy clones → display-dedup to 19) |

**Action:** `UPDATE` MOVE the 19 old#15 rows (sort_order 170–350 in `6ba0b449`) → `d860d934`. The 6 pre-existing copies in `d860d934` become duplicates → **flag for display-dedup, do NOT delete** (per rules). Guard: re-run no-op because moved rows no longer match `series_id='6ba0b449…'`.

This is exactly what Saar saw: "הרב שלמה אבינר…" showing 1 vs 15 — the lessons were sitting in the sibling אבינר series.

---

## STEP 2 — קדושת פשוטו של מקרא - במדבר (`48adc2eb`): EMPTY 0 vs old 19

All **19** old lessons EXIST in the DB but scattered: each has a copy in a parsha-event series (`book=במדבר` where present) **and** in the general topical series "שיעורים כלליים" / "איך לומדים תנ\"ך" / "דרכי הפרשנות…". The canonical book-series got **none** (0 published).

**Action:** 19 guarded `INSERT … SELECT` clones into `48adc2eb`, cloning real media from the preferred in-book source row (all 19 sources resolved, 0 missing). `bible_book='במדבר'`, `copied_from=src.id` guard. Live media columns (`attachment_url`/`video_url`/`audio_url`) are already rehosted (0 `bneyzion.co.il`); only `legacy_attachment_url` keeps the old reference — **no new Rule-13 violation**.

---

## STEP 3 — מידות בפרשה (`dfb8c480`): 27 vs old 28

One lesson, **"טלית שכולה אמת"**, is **NOT in the DB at all** (checked across all series + standalone). The manifest carried only title+author (no media href).

**Action:** guarded `INSERT` placeholder row (NULL media), `sort_order=999`.
**⚠ YOAV DOUBT #1:** media URL unknown — needs the old series-page href before it is playable.

---

## STEP 4 — Standalone lessons (25): flat category rows

All 25 old standalone lessons EXIST in the DB but **only nested inside parsha-event series** (20) or other series (5); **0 as standalone** (`series_id NULL`). Old page shows them as flat rows.

**Action:** 25 guarded `INSERT … SELECT` clones with `series_id NULL`, `bible_book='במדבר'`, cloning media from the nested copy, `copied_from` guard. Nested copies stay (sidebar content).

## STEP 5 — שו"ת (10): flat שו"ת rows

All 10 EXIST nested in parsha-event series; 0 standalone. Same treatment, `content_type` defaulted to `'shut'` for the שו"ת column.

---

## Flag-only (no SQL — per "don't delete copies" rule)

- **אבינר internal dup**: "וימאסו בארץ חמדה" appears twice in `6ba0b449` (so=60 + so=360) → display-dedup.
- **מתקרבים (`77adb8ce`)** over-filled by 1: punctuation-variant dup "איך העיז קורח, ולמה דוקא קטורת?" (so=20) vs "איך העיז קורח ולמה דוקא קטורת" (so=None) → display-dedup.
- **טמיר (`fe3a4eb9`)** has +1 non-published row "הוד והדר לבשת (מינוי יהושע)" not on old page; published count 14 = old 14 → OK, extra noted.
- **מאמרים שנדורפי (`82460c3c`)** 44 vs old 43 — over-filled by 1. **⚠ YOAV DOUBT #2:** which extra row; likely a parsha-copy merged in → display-dedup candidate, flagged for review (not touched).
- **Duplicate parsha node**: פרשת קורח appears twice — `aa50e54c` (47, no rabbi) + `6adf155c` (5, הרב יחזקאל כהן). Sidebar nodes; flag for merge-review, no delete.
- **"דפי עבודה - במדבר" (`d7777773`)**: a teachers/worksheets node (status=published, ושננתם), **NOT on the old category page** → must be excluded from the category page by code (like parsha nodes).

---

## Totals

| metric | value |
|--------|-------|
| old rabbi-series | 23 |
| new non-parsha children | 24 (incl. teachers "דפי עבודה") |
| series matched OK | 18 |
| series missing | 0 |
| series under-filled | 3 (אבינר#15, קדושת, מידות) |
| series over-filled | 2 (אבינר#1-merged, מתקרבים) + שנדורפי flagged |
| lessons to MOVE (אבינר) | 19 |
| lessons to INSERT — קדושת | 19 |
| lessons to INSERT — מידות placeholder | 1 |
| standalone to INSERT | 25 |
| שו"ת to INSERT | 10 |
| parsha event-series (sidebar) | 11 rows / 10 parshiot (קורח dup) |
| Yoav doubts | 2 |

**Expected after apply** (verification SELECTs in the .sql):
`6ba0b449=17 · d860d934=25 · 48adc2eb=19 · dfb8c480=28` and 35 new `series_id NULL` rows for `book=במדבר`.
