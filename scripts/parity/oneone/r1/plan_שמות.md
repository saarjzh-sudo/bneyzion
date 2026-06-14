# REVIEW ROUND 1 — book = שמות — parity diff + fix plan

GROUND TRUTH: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/שמות/
GT manifest: `oneone/r1/gt_שמות_manifest.json` · rich rows: `oneone/r1/gt_שמות.json`
NEW DB: project `pzvmwfexeiruelwiujxn`, שמות category id `5149a23b-8181-4c41-81db-1efcd2631f5a`
(parent = תורה root). Verified fresh against DB on 2026-06-14 (prior series_diffs file was wrong on the counts).

## TL;DR — what is actually broken vs what is correct

Saar's complaint splits into THREE distinct root causes, only TWO of which are data bugs:

1. **CODE / structure (not SQL):** the category page renders parsha event-series rows OPEN with
   rolled-up lessons. 11 parsha event-series (`פרשת X | range`) live as direct children of the שמות
   category. They are sidebar nav nodes and must be EXCLUDED from the category-page row list.
   Their lessons are `copied_from` clones of the canonical rabbi-series (verified: פרשת שמות | א-ו
   has 77 lessons, 68 of them `copied_from` set). This is the code spec, NOT this plan's SQL.

2. **DISPLAY semantics (not SQL):** "series lesson-counts are wrong / 1 vs 15". Cross-book series
   (לשון הקודש בפרשה, מידות בפרשה, פשט בפרשה, עולמות חדשים בפרשה, הארות באונקלוס) store their FULL
   multi-Torah lesson set under the שמות node, so `real` count is inflated vs the old שמות page,
   which showed only the שמות-subset. The category page MUST count/show only the book-subset
   (lessons whose `bible_book='שמות'` OR otherwise scoped to this book), not the whole series.
   This is the code spec, NOT this plan's SQL. Evidence below.

3. **DATA bugs (this plan's SQL):** exactly TWO:
   - **אבינר merge:** GT has TWO distinct אבינר series (19 + 21). Migration merged both into one DB
     series (40 lessons) and left the second DB series EMPTY (0). → SPLIT back.
   - **5 missing standalone/שו"ת** lessons (3 standalone + 2 שו"ת) → insert as standalone.
   Plus one structural nesting issue (קשתיאל) that is CODE, see below.

## A. DB children of שמות category (37 direct children verified)

11 parsha event-series (EXCLUDE from category page, keep as sidebar — code):
פרשת בא | י-יג · בשלח | יג-יז · וארא | ו-ט · ויקהל | לה-לח · יתרו | יח-כ · כי תשא | ל-לד ·
משפטים | כא-כד · פקודי | לח-מ · שמות | א-ו · תצוה | כז-ל · תרומה | כה-כז.

25 rabbi/topic series + standalone. Plus nav node `כל השיעורים בחומש שמות` (3ad6516e) and
`דפי עבודה - שמות` (d7777771) hold nested children.

## B. Rabbi-series match (GT 25 series → DB)

| status | GT old | DB real | DB shmot-subset | series | note |
|---|---|---|---|---|---|
| MISSING-as-direct-child | 23 | 24 | 24 | הרב קשתיאל על פרשיות שמות (קשתיאל) | **EXISTS** id `2224268f` but nested under `כל השיעורים בחומש שמות` (3ad6516e), not a direct שמות child → category-page query misses it. CODE fix (include this nav-node's children, or reparent). DB has 24 vs GT 23: one extra lesson "בגדי הכהונה, בגדי הבד..." — benign, flag Yoav, do NOT delete. |
| **SPLIT BUG** | 19 / 21 | 0 / 40 | 0 / 40 | הרב אבינר על פרשיות שמות (×2) | DB `1f4cf5c3`=0 (empty), `1ff919db`=40. The 40 = merge of both GT series. sort_order 10–190 = GT-series-1 (19 lessons), sort_order 200–400 = GT-series-2 (21 lessons). All 19 + all 21 GT lessons matched 1:1 in the 40. → **SQL: move sort_order≥200 to the empty series.** |
| OK | 41,13,12,14,71,12,10,7,30,29,40,11,11 | = | = | אוריאל ×2, ערן טמיר, אלי אדלר, שנדורפי, אוהד תירוש ×1, איתן קופמן, נתן רוטמן, ג'יאמי, קופרמן, דן בארי, יונדב זר ×2 | exact, perfect |
| OVER-by-cross-book (DISPLAY, not bug) | 37/30/21/21/9 | 149/117/76/92/24 | 0/1/0/0/0 | לשון הקודש בפרשה, מידות בפרשה, פשט בפרשה, עולמות חדשים בפרשה, הארות באונקלוס | cross-Torah series, `bible_book` mostly NULL. Old שמות page showed only the שמות-subset (37/30/21/21/9). All GT-listed שמות lessons present (missing_from_db=0). Category page must count book-subset. NO SQL. |
| OVER-by-1 (benign dup) | 34 / 4 / 9 | 40 / 5 / 10 | 39/4/10 | שפירא (מאמרים על פרשיות שמות), נועם ונגרובר, יצחק בן שחר | DB has all GT lessons + 1 extra each. שפירא extra = "מבין שני הכרובים 1" (near-dup). flag Yoav, do NOT delete. |
| MISSING-cross-book | 4 | — | — | תולדות קרבת ה' לאדם (אוריאל) | old row href = `/נושאים-כלליים-בתנך/...` — this is a GENERAL-topics series, not under תורה/שמות. It appears on the שמות page as a cross-link only. Confirm it exists under its own topic root before any action. flag Yoav (out of book scope). NO SQL here. |

Matched=23/25, MISSING-true=0 (קשתיאל exists, אוריאל-תולדות is cross-topic), SPLIT=1 (אבינר),
UNDER=0, OVER-display=5, OVER-benign=3.

## C. Standalone (27) + שו"ת (11) on old category page

Normalized match of GT 38 items vs full שמות-scope DB lessons (1,125 distinct titles):
- standalone 24/27 present, **3 missing**
- שו"ת 9/11 present, **2 missing**

The 5 missing rows ALL have empty href on the old page (`href=""`) — title+preview only, no
dedicated lesson page / no media URL we can rehost. Authors resolved:

| kind | title (truncated) | author | rabbi_id |
|---|---|---|---|
| lesson | מתן תורה כיצד מתגלה הנשמה הישראלית... | הרב דוד חי הכהן | cc169a16-6fac-4da9-915c-b484c7b24b11 |
| lesson | "שובו אלי" חטא העגל הוא שורש החטאים... | הרבנית נורית גאל דור (לנשים) | 53089efa-5913-40ed-a530-f6e47a5c10c2 |
| lesson | עם קשה עורף... | הרב אברהם וסרמן | 1acd517c-1e18-4bdc-a18e-0ecf5924e50f |
| שו"ת | מכת בכורות שלום לרבנים... | הרב איתן שנדורפי | be153d0e-b68e-4704-a108-56f5af7d0ca9 |
| שו"ת | זמן השיעבוד כתוב בשמות רבה... | הרב מנחם שחור | 4822f2bb-9d1c-4adc-9554-d2a2db7bdbc8 |

→ SQL inserts them as standalone (series_id NULL, bible_book='שמות', media NULL, marked review_note
for Yoav since no source URL). YOAV DOUBT: these may be intentionally dropped audio stubs.

## D. Parsha event-series (12 expected → 11 present)

GT/old site has parshiyot for שמות: שמות, וארא, בא, בשלח, יתרו, משפטים, תרומה, תצוה, כי תשא,
ויקהל, פקודי — that is 11 (פרשת ויקהל-פקודי are sometimes combined; the old structure here is 11
distinct event-series, all present in DB). No missing event-series. They STAY as sidebar nodes;
the CODE excludes them from the category-page rows. NO SQL.

## Yoav doubts (flag, no action)
1. קשתיאל DB=24 vs GT=23: extra "בגדי הכהונה, בגדי הבד- ייחודיות הפרט בעבודת ה'". keep or drop?
2. שפירא מאמרים DB extra "מבין שני הכרובים 1" (40 vs 34): keep or merge?
3. נועם ונגרובר +1, יצחק בן שחר +1: benign over-by-1.
4. 5 missing standalone/שו"ת have NO source URL on old site — insert as text-stub or leave dropped?
5. תולדות קרבת ה' לאדם (אוריאל, 4): cross-topic series under נושאים-כלליים, not under שמות. confirm canonical home.

## Code-spec items (NOT in plan_שמות.sql — for the category-page component)
- C1. Exclude children where `title ~ '^פרשת.+\|'` from the category-page row list (keep in sidebar).
- C2. For each series row, show lesson_count = count of that series' lessons scoped to this book
      (bible_book='שמות' or book-scoped), NOT the full series count. Fixes 149/117/92/76/24 → 37/30/21/21/9.
- C3. Include the children of nav-nodes `כל השיעורים בחומש שמות` (3ad6516e) and
      `דפי עבודה - שמות` (d7777771) as category-page series rows (this surfaces קשתיאל + the 2 חידות).
- C4. Render series rows CLOSED (one row: title · rabbi · "N שיעורים" → click → series page),
      followed by standalone lessons then שו"ת.
