# ROUND3 — Topic-page EXTRAS unlink · report

**Author:** TOPICS-EXTRAS-UNLINK author · **Date:** 2026-06-12 · **Mode:** read-only scoping (SELECT via `sbq.py`); SQL executed by orchestrator.
**Artifact:** `fixes/ROUND3-topics-unlink.sql` — 152 guarded tuple-IN `DELETE`s across 56 topics.
**Backup:** `lesson_topics_bak_oneone_20260612` (12,369 rows). Lessons stay alive in their series; only the topic *link* is removed.

## What this does
Enforces Saar's strict 1:1 between every `themes-root` topic page and its **old-site** topic page. A live lesson is an **EXTRA** when it is linked to a topic but its normalized title is **not present** on that topic's old page (`old_topic_pages.json` `items[]` where `type='lesson'`), counting multiplicity. Method mirrors `oneone_verify.run_topics` exactly (same audience filter: `published` AND (`general` ∈ tags OR `teachers` ∉ tags); same `normalize_he`; same order-preserving multiset diff).

## Totals

| metric | value |
|---|---|
| extras **unlinked** | **152** |
| &nbsp;&nbsp;· duplicate-title surplus (title on old page, over-represented) | 140 |
| &nbsp;&nbsp;· genuine-new (title absent from old page entirely) | 12 |
| topics touched | 56 |
| ROUND1 §5 pins skipped (pair-level violations) | 0 / 9 untouched |
| ktiv kept-variants (≥0.8 vs a *missing* old lesson) | 0 |
| series-card matches kept + flagged → yoav | 9 |
| regressions (PASS→FAIL) | 0 |

## Predicted topic-page pass-rate

Computed on the verifier's own mapping (`match/item_match.json` `mapped_topic_id`), so the baseline equals the live verifier's **58/128**:

> **58/128 → 103/128  (+45)**

Ceiling notes — the remaining mapped failures are **out of this round's scope** (this round only *unlinks* extras):
- **6 topics** still fail on a live lesson whose title equals an old **series-card** (`type='series'`) item — needs `series_topics` modeling / yoav, not a lesson unlink.
- **2 topics** (גאולה, גוג ומגוג) reach old=new=matched but fail **lesson order** → `ORDER-FIX.sql` lane.
- **7 topics** still fail on **missing** old lessons (we hold fewer than the old page) → insert/relink lane.
- **9 topics** are name-stale in `item_match.json` (e.g. נסים/חנ/חנוכה/ראש השנה restored after the match snapshot); their DATA is corrected here but the verifier won't credit them until `item_match.json` is regenerated.

## 10 biggest topics affected

| # | topic | old | live | unlinked | keep | result |
|--:|---|--:|--:|--:|--:|---|
| 1 | גאולה | 53 | 65 | **12** | 53 | still fails: lesson order (ORDER-FIX lane) |
| 2 | ימי העיון בתנ"ך | 246 | 257 | **11** | 246 | PASS (1:1) |
| 3 | חורבן בית המקדש | 19 | 26 | **7** | 19 | PASS (1:1) |
| 4 | כהונה | 32 | 39 | **7** | 32 | PASS (1:1) |
| 5 | מלכות | 38 | 46 | **6** | 40 | still fails: 2 series-card extra(s) |
| 6 | נבואה | 36 | 42 | **6** | 36 | PASS (1:1) |
| 7 | ארץ ישראל | 34 | 37 | **5** | 32 | still fails: 2 missing lesson(s) |
| 8 | בית המקדש השלישי | 7 | 12 | **5** | 7 | PASS (1:1) |
| 9 | גלות | 19 | 24 | **5** | 19 | PASS (1:1) |
| 10 | כריתת ברית | 11 | 15 | **5** | 10 | still fails: 1 missing lesson(s) |

## Per-topic table (all 56 touched, by unlink count)

| topic | `?subject=` | old | live | unlinked | keep | dup/new | result |
|---|---|--:|--:|--:|--:|:--:|---|
| גאולה | גאולה | 53 | 65 | 12 | 53 | 11/1 | still fails: lesson order (ORDER-FIX lane) |
| ימי העיון בתנ"ך | ימי העיון בתנ"ך | 246 | 257 | 11 | 246 | 11/0 | PASS (1:1) |
| חורבן בית המקדש | חורבן בית המקדש | 19 | 26 | 7 | 19 | 7/0 | PASS (1:1) |
| כהונה | כהונה | 32 | 39 | 7 | 32 | 7/0 | PASS (1:1) |
| מלכות | מלכות | 38 | 46 | 6 | 40 | 6/0 | still fails: 2 series-card extra(s) |
| נבואה | נבואה | 36 | 42 | 6 | 36 | 6/0 | PASS (1:1) |
| ארץ ישראל | ארץ ישראל | 34 | 37 | 5 | 32 | 3/2 | still fails: 2 missing lesson(s) |
| בית המקדש השלישי | בית המקדש השלישי | 7 | 12 | 5 | 7 | 5/0 | PASS (1:1) |
| גלות | גלות | 19 | 24 | 5 | 19 | 5/0 | PASS (1:1) |
| כריתת ברית | כריתת ברית | 11 | 15 | 5 | 10 | 4/1 | still fails: 1 missing lesson(s) |
| משכן שילה | משכן שילה | 7 | 11 | 4 | 7 | 4/0 | PASS (1:1) |
| נזיר | נזיר | 10 | 14 | 4 | 10 | 4/0 | PASS (1:1) |
| ניסים | ניסים | 2 | 6 | 4 | 2 | 0/4 | PASS (1:1) |
| שבטים | שבטים | 17 | 21 | 4 | 17 | 4/0 | PASS (1:1) |
| יהושע בן נון | יהושע בן נון | 6 | 9 | 3 | 6 | 3/0 | PASS (1:1) |
| ירושלים | ירושלים | 28 | 30 | 3 | 27 | 3/0 | still fails: 1 missing lesson(s) |
| ישעיהו | ישעיהו | 4 | 7 | 3 | 4 | 3/0 | PASS (1:1) |
| מלחמה | מלחמה | 10 | 13 | 3 | 10 | 3/0 | PASS (1:1) |
| עבדות | עבדות | 9 | 12 | 3 | 9 | 3/0 | PASS (1:1) |
| קרבנות | קרבנות | 26 | 29 | 3 | 26 | 3/0 | PASS (1:1) |
| בית שני | בית שני | 34 | 36 | 2 | 34 | 2/0 | PASS (1:1) |
| גוג ומגוג | גוג ומגוג | 10 | 12 | 2 | 10 | 1/1 | still fails: lesson order (ORDER-FIX lane) |
| דוד המלך | דוד המלך | 54 | 57 | 2 | 55 | 2/0 | still fails: 2 series-card extra(s) |
| חטא העגל | חטא העגל | 6 | 8 | 2 | 6 | 2/0 | PASS (1:1) |
| יציאת מצרים | יציאת מצרים | 9 | 11 | 2 | 9 | 2/0 | PASS (1:1) |
| מצרים | מצרים | 7 | 9 | 2 | 7 | 2/0 | PASS (1:1) |
| פלשתים | פלשתים | 7 | 9 | 2 | 7 | 2/0 | PASS (1:1) |
| קיום ברית | קיום ברית | 11 | 12 | 2 | 10 | 1/1 | still fails: 1 missing lesson(s) |
| קרבן פסח | קרבן פסח | 12 | 14 | 2 | 12 | 2/0 | PASS (1:1) |
| שאול המלך | שאול המלך | 15 | 18 | 2 | 16 | 2/0 | still fails: 1 series-card extra(s) |
| שבת | שבת | 8 | 10 | 2 | 8 | 2/0 | PASS (1:1) |
| שיעורים לנשים | שיעורים לנשים | 25 | 27 | 2 | 25 | 2/0 | PASS (1:1) |
| תשובה | תשובה | 8 | 10 | 2 | 8 | 0/2 | PASS (1:1) |
| אליהו הנביא | אליהו הנביא | 8 | 9 | 1 | 8 | 1/0 | PASS (1:1) |
| ארון הברית | ארון הברית | 16 | 16 | 1 | 15 | 1/0 | still fails: 1 missing lesson(s) |
| ביטחון ב-ד' | ביטחון ב-ד' | 2 | 3 | 1 | 2 | 1/0 | PASS (1:1) |
| בית המקדש | בית המקדש | 37 | 38 | 1 | 37 | 1/0 | PASS (1:1) |
| ברית מילה | ברית מילה | 7 | 8 | 1 | 7 | 1/0 | PASS (1:1) |
| גן עדן | גן עדן | 1 | 2 | 1 | 1 | 1/0 | PASS (1:1) |
| האבות | האבות | 4 | 5 | 1 | 4 | 1/0 | PASS (1:1) |
| הכניסה לארץ | הכניסה לארץ | 5 | 6 | 1 | 5 | 1/0 | PASS (1:1) |
| המשכן וכליו | המשכן וכליו | 25 | 26 | 1 | 25 | 1/0 | PASS (1:1) |
| הנביא והמלך | הנביא והמלך | 4 | 5 | 1 | 4 | 1/0 | PASS (1:1) |
| יאשיהו | יאשיהו | 3 | 4 | 1 | 3 | 1/0 | PASS (1:1) |
| יהושפט | יהושפט | 7 | 8 | 1 | 7 | 1/0 | PASS (1:1) |
| יום העצמאות | יום העצמאות | 2 | 3 | 1 | 2 | 1/0 | PASS (1:1) |
| ירמיהו | ירמיהו | 3 | 4 | 1 | 3 | 1/0 | PASS (1:1) |
| יתרו והקיני | יתרו והקיני | 3 | 4 | 1 | 3 | 1/0 | PASS (1:1) |
| כיבוש הארץ | כיבוש הארץ | 9 | 10 | 1 | 9 | 1/0 | PASS (1:1) |
| מעמד הר סיני | מעמד הר סיני | 1 | 2 | 1 | 1 | 1/0 | PASS (1:1) |
| מתן תורה | מתן תורה | 21 | 22 | 1 | 21 | 1/0 | PASS (1:1) |
| נביאי השקר | נביאי השקר | 6 | 7 | 1 | 6 | 1/0 | PASS (1:1) |
| נשים בתנ"ך | נשים בתנ"ך | 6 | 7 | 1 | 6 | 1/0 | PASS (1:1) |
| עמי כנען | עמי כנען | 7 | 8 | 1 | 7 | 1/0 | PASS (1:1) |
| צומות | צומות | 3 | 4 | 1 | 3 | 1/0 | PASS (1:1) |
| שכר ועונש | שכר ועונש | 2 | 3 | 1 | 2 | 1/0 | PASS (1:1) |

## Ambiguous → yoav

### A. Series-card matches kept (NOT unlinked) — 9
These live lessons carry the exact title of an old **series-card** on the topic page. They are legitimately on the old page, so they are kept; but the verifier compares only against `type='lesson'` items, so these topics stay red until `series_topics` renders series cards. Decide: render as series-card vs treat as a real lesson.

| topic | lesson title | match | lesson_id |
|---|---|---|---|
| דוד המלך | בין דוד לשלמה | series-exact | `50115c96-e9ce-47bd-b749-1b298963b893` |
| דוד המלך | בין שאול לדוד | series-exact | `087d3447-89d3-4d4f-a320-bae54468a74d` |
| האזנה לפסוקים עם ביאור פשוט | עובדיה בבקיאות | series-exact | `5544d8b7-7d12-4a64-af1e-6225ab8e83af` |
| האזנה לפסוקים עם ביאור פשוט | קריאה וביאור בקצרה של ספר עובדיה | series-exact | `f2ee92c4-88f2-4cab-88d3-d161b1bc7a4d` |
| מלכות | המלך בישראל | series-exact | `0b58490a-c361-41ce-b2c4-b98e98bc55b3` |
| מלכות | בין שאול לדוד | series-exact | `087d3447-89d3-4d4f-a320-bae54468a74d` |
| מפרשי המקרא | לפני ואחרי במשנת הספורנו | series-exact | `ce850a85-cfda-41c8-a1ea-19df29cf272a` |
| שאול המלך | בין שאול לדוד | series-exact | `087d3447-89d3-4d4f-a320-bae54468a74d` |
| שלמה המלך | בין דוד לשלמה | series-exact | `50115c96-e9ce-47bd-b749-1b298963b893` |

### B. Genuine-new unlinks in topics that still miss an old lesson — 4
Below the 0.8 token-set threshold, so unlinked as true extras. But each sits in a topic that is *also* missing an old lesson — worth a glance in case it's a heavy reword (then rename the live title instead of unlinking).

| topic | unlinked lesson | lesson_id | topic still missing |
|---|---|---|---|
| ארץ ישראל | מהי בעצם ברית בין הבתרים? | `504e17e7-d17a-4d3f-b674-e7640b4b0d41` | נחלת ארץ ישראל; על מה נכרתה ברית בין הבתרים ומה משמעותה לדורות |
| ארץ ישראל | גבולות הארץ 2 שלבים | `5111a8c2-67d2-43a3-81d4-0b8025449fc9` | נחלת ארץ ישראל; על מה נכרתה ברית בין הבתרים ומה משמעותה לדורות |
| כריתת ברית | מהי בעצם ברית בין הבתרים? | `504e17e7-d17a-4d3f-b674-e7640b4b0d41` | על מה נכרתה ברית בין הבתרים ומה משמעותה לדורות |
| קיום ברית | מהי בעצם ברית בין הבתרים? | `504e17e7-d17a-4d3f-b674-e7640b4b0d41` | על מה נכרתה ברית בין הבתרים ומה משמעותה לדורות |

### C. נסים vs ניסים / התשובה vs תשובה
ROUND1 §5 re-created the **distinct** old-sidebar topics נסים(3)/חנ(1)/התשובה(5) and pinned their old-page lessons; those topics are already 1:1 and **untouched** here. The separate topics **ניסים**(old 2) and **תשובה**(old 8) still carried the gap4-merge leftovers (`sort_order ≥ 1000`) of נסים/התשובה — those are unlinked here (4 from ניסים, 2 from תשובה). Confirmed the 9 pin pairs are preserved (V2 = 9).

## Verification baked into the SQL
- **Pre-scope:** `r3_pairs_to_delete` = 152 (verified live), `r3_pins_present` = 9 (verified live).
- **V1:** target pairs remaining → expect 0. **V2:** pins present → expect 9. **V3:** post visible-published count for the 15 worst topics (each = keep value, asserted `current − unlink = keep` for all 56 topics live). **V4:** `lesson_topics` rowcount → expect 12,465 − 152 = 12,313.