# Parity Fix Plan — book = דברים (REVIEW ROUND 1)

**Ground truth:** OLD site `www.bneyzion.co.il` category page `/מאגר-השיעורים-והמאמרים/תורה/דברים/` + each series' own page (fresh-fetched + cached under `r1cache/`).
**DB:** Supabase `pzvmwfexeiruelwiujxn`, read-only via `sbq.py`.
**Verdict:** The book is **data-complete**. No lessons to insert, no series to create. The whole RD-1 complaint for דברים is **structural/display**, fixed by **2 reparents + code rules** already specced.

---

## Saar's complaint vs דברים reality

| Complaint | Status in דברים |
|---|---|
| Parsha event-series shown OPEN as category rows | TRUE structurally — handled by **CODE** (exclude `title LIKE 'פרשת% \| %'` from category page; keep as sidebar nodes). 11 such nodes exist. |
| Series shown as OPEN roll-ups instead of CLOSED cards | CODE concern — render each non-parsha child as a closed `name · rabbi · N שיעורים` row. |
| Wrong series lesson-counts (e.g. אבינר 1 vs 15) | **DOES NOT reproduce in דברים.** Both אבינר series match exactly (3=3, 5=5+1surplus). The 1-vs-15 defect was בראשית-specific. |

---

## Step A — DB children of the דברים category
34 children total: **11 parsha event-series** (`פרשת% | %`) + **23 non-parsha** rabbi/topic series (one of which, `דפי עבודה - דברים`, is a teachers-wing worksheet set not on the old public category page → leave as-is).

> NOTE: task brief said "12 parsha event-series" but דברים has only **11 parashot** (Devarim…V'Zot HaBeracha) and the DB correctly holds **11**. Not a defect — brief over-counted.

## Step B — OLD rabbi-series (24) matched to NEW
Matching: normalized-title exact, else fuzzy ≥0.85 + same author. Hebrew normalize per spec (strip niqqud 0x0591–0x05C7, NFC, collapse ws, lowercase, strip `״ " ' ׳ \` | ( ) - – — : , . ! ?`).

| Outcome | # | Notes |
|---|---|---|
| OK (old == new) | 19 | exact count parity |
| OVER-FILLED | 3 | internal dup copies / 1 surplus — **no delete** |
| REPARENT (exists, mis-parented) | 2 | the only DB writes |
| Truly MISSING | 0 | |
| UNDER-FILLED | 0 | |

### The 2 "missing" series were a false alarm — they EXIST, mis-parented
Step A's category-children query did not return them because their `parent_id` points elsewhere. A title search across the whole DB found them with lessons intact:

1. **`מאמרים על סוגיות פרשת שופטים`** (הרב יהודה קופרמן) — id `79a5cd68…`, status=active, **3/3 lessons** (`מצוות מינוי שופטים`, `זקן ממרא`, `המלך`, each with a `bneyzion.co.il/media/…pdf` legacy url). Current parent = **`תורה` root** (`bb14b5a5`) → never shows under דברים. **FIX: reparent → דברים category `b082cb95`.**
2. **`פרשת שבוע- דברים`** (הרב דוד ג'יאמי) — id `4d90e367…`, status=category, **25 lessons**. Current parent = parsha node **`פרשת דברים | א-ד`** (`8e8346f2`). Old site lists it as a rabbi-series row on the category page. **FIX: reparent → דברים category `b082cb95`.** Its 25 = the 23 old lessons + 2 internal dup copies (`הברית`, `פרשת התשובה`) → display-dedup. The 23 unique titles match the old series page 1:1 (re-fetched, confirmed).
   - There is also an **empty draft stub** `פרשת שבוע דברים` (id `2ee49d73…`, status=draft, real=0). Leave inert — do **not** promote.

### OVER-FILLED (no inserts, no deletes)
- `מאמרים - חומש דברים` (b831dccd): db 47 vs old 45 → +2 = internal dup copies (`…דרכיה דרכי נעם…עמלק`, `שמחה של מצוה`). All 45 old titles present. → **display-dedup.**
- `מאמרים על פרשיות דברים` (8c74988d): db 19 vs old 18 → +1 = internal dup (`מורשה`). → **display-dedup.**
- `הרב אבינר שיחות על פרשיות דברים` (b3e5c089): db 5 vs old 4 → +1 = **genuine surplus** `הכרת תודה לכל` (NOT in old series page, appears only here, not a parsha copy). → **YOAV DOUBT** (possible mis-assignment); flagged, **not deleted**.

## Step C — Standalone + שו"ת on the old category page
11 standalone + 5 שו"ת old items checked by title across the whole DB. **All 16 already exist** (each found ≥1, mostly inside parsha event-series and the `ספר דברים עם ביאור 'ושננתם'` aggregation series). → **0 standalone inserts, 0 שו"ת inserts.** Their appearance as flat rows on the old page is a display concern (code), not missing data.
- (One old "standalone" — `טבלת מאורעות שנת הארבעים`, הרב יאיר הס — is actually a במדבר lesson cross-linked into a דברים parsha; present in DB under both books. No action.)

## Step D — Parsha event-series presence
All **11** `פרשת% | %` children present (Devarim 47, Va'etchanan 36, Eikev 33, Re'eh 39, Shoftim 48, Ki Teitzei 48, Ki Tavo 33, Nitzavim 28, Vayelech 20, Ha'azinu 18, V'Zot HaBeracha 18). They **stay** as sidebar nodes; the category-page exclusion is a **CODE** rule (not in this SQL).

---

## What the SQL does (idempotent, guarded)
1. Scoping `DO $$` asserts דברים=`b082cb95…` and תורה=`bb14b5a5…` (abort on drift).
2. **Reparent** `79a5cd68…` (`…שופטים`) → דברים category. Guard: only when current parent = תורה root.
3. **Reparent** `4d90e367…` (`פרשת שבוע- דברים`) → דברים category. Guard: only when current parent = parsha node `8e8346f2`.
4. Display-dedup documented as a **no-op** (code-side, FK-safe). No deletes.
5. Verification SELECTs V1–V4: 2 reparented under דברים; child counts 11 parsha / 25 rabbi-topic / 36 total; lesson counts 3 & 25 preserved; draft stub still inert.

## Totals
- series matched: **22/24** by query + **2** found mis-parented = **24/24 accounted**
- series missing (true): **0** · underfilled: **0** · overfilled: **3** (dup/surplus only)
- lessons to insert: **0** · lessons to move: **0** · standalone to insert: **0** · שו"ת to insert: **0**
- **reparents (only DB writes): 2**
- yoav doubts: **1** — surplus lesson `הכרת תודה לכל` in `הרב אבינר שיחות על פרשיות דברים`.

## Yoav / Saar doubts
1. `הכרת תודה לכל` — extra in `הרב אבינר שיחות על פרשיות דברים` (db 5 vs old 4). Genuine surplus, not a copy. Keep or move? (not deleted)
2. `פרשת שבוע- דברים` reparented out of the parsha node — confirm Saar wants it as a top-level rabbi-series **card** on the category page (it is in the old site).
3. Internal dup copies (4 lessons across 3 series + 2 in פרשת שבוע) handled by display-dedup, not deletion — confirm that's the desired policy here too.
4. Brief said 12 parsha event-series; דברים has 11 (correct).
