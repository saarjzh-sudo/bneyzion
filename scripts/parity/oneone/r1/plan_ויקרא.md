# Parity Fix Plan — ויקרא (Bnei-Zion 1:1 migration · Review Round 1)

**Ground truth:** old category page `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/ויקרא/`
**GT manifest:** `oneone/r1/gt_ויקרא.json` (44 rows: 22 series + 15 standalone + 7 שו"ת) — `count_mismatches: []`, `pipe_parsha_event_series_on_category_page: []`
**DB:** project `pzvmwfexeiruelwiujxn` (bnei-zion). Category `ויקרא` = `series.status='category'`, parent `תורה`.
**SQL:** `oneone/r1/plan_ויקרא.sql` — idempotent, guarded, BEGIN/COMMIT, scoping + verification SELECTs. **Not executed.**

---

## Headline

The new category page is in **near-perfect parity** for rabbi-series structure. 22/22 old rabbi-series matched a NEW series by **exact normalized title** (no fuzzy needed). Only **two** anomalies, plus the structural code items Saar flagged.

| Bucket | Count |
|---|---|
| Old rabbi-series (GT) | 22 |
| Matched NEW series | 22 (all exact-title) |
| **OK** (old_count == new real-count) | **20** |
| **UNDERFILLED** | **1** — קופרמן series, old=17 / new=0 |
| **OVERFILLED** | **1** — תירוש series, old=25 / new=26 (in-series dup) |
| MISSING SERIES (no new match) | 0 |
| Parsha event-series present (sidebar nodes) | 10 (Vayikra has exactly 10 parshiyot) |
| Lessons to **insert** | **17** (the Kuperman backfill) |
| Lessons to **move** | 0 |
| Standalone/שו"ת to insert | **0** (all 22 already in DB) |
| Lessons flagged for display-dedup | 1 (`עבד עברי` in Tirosh) |

> Note: the task template said "12 parsha event-series" — that is a generic number. Vayikra has **10** parshiyot (ויקרא, צו, שמיני, תזריע, מצורע, אחרי מות, קדושים, אמור, בהר, בחוקותי) and all 10 event-series are present as children. Correct.

---

## A. DB children of the ויקרא category (33 total)

- **22 rabbi/topic series** → the old category page's "סדרה" rows. (matched, see §B)
- **10 parsha event-series** (`title LIKE 'פרשת% | %'`) → sidebar nav nodes ONLY; CODE must exclude from category rows:
  `פרשת ויקרא | א-ה` (51), `פרשת צו | ו-ח` (38), `פרשת שמיני | ט-יא` (32), `פרשת תזריע | יב-יג` (42),
  `פרשת מצורע | יד-טו` (33), `פרשת אחרי מות | טז-יח` (36), `פרשת קדושים | יט-כ` (37), `פרשת אמור | כא-כד` (50),
  `פרשת בהר | כה-כו` (42), `פרשת בחוקותי | כו-כז` (41).
- **1 teacher-area node**: `דפי עבודה - ויקרא` (הרב ניסים כהן, 2 lessons) — not a category rabbi-series; teacher-area only.

---

## B. Series diff (old rabbi-series → new)

All 22 matched by exact normalized title. 20 are exact-count OK. The two exceptions:

### B.1 UNDERFILLED — `קדושת פשוטו של מקרא - ויקרא` (הרב יהודה קופרמן זצ"ל)
- **old=17, new=0.** Series `155c726f-a725-555a-a173-b51671bc36a8` exists but is **empty**.
- Root cause: the 17 lessons exist in the DB but were scattered into **other** series during migration — into the parsha-event-series (`פרשת ויקרא | א-ה`, `פרשת אמור | כא-כד`, `פרשת תזריע | יב-יג`, `פרשת קדושים | יט-כ`, `פרשת צו | ו-ח`) and into general buckets (`שיעורים כלליים`, `דרכי הפרשנות והמדרש בתנ"ך`, `איך לומדים תנ"ך`). None landed in the dedicated Vayikra series.
- **Fix (SQL Part B.1):** INSERT all 17 fresh into series `155c726f…`, sourced from the old series-page rows, `sort_order` = old index ×10 (10…170). Same backfill pattern as the night-log gap-closing; the scattered copies stay where they are (display-dedup handles overlap with parsha series).
- **Media — Rule 13:** all 17 are PDFs on `bneyzion.co.il/media/*.pdf` → flagged **REHOST**. `legacy_attachment_url` keeps the verbatim old URL (gold key + rehost-worker input); `attachment_url` set to the same URL for now. `source_type='text'`.
- Idempotency guard: `INSERT ... WHERE NOT EXISTS (same series_id + same legacy_attachment_url)`.

### B.2 OVERFILLED — `שיעורים- חומש ויקרא` (הרב אוהד תירוש)
- **old=25, new=26** (gap −1). Cause: exact **in-series duplicate** — `עבד עברי` appears twice (`sort_order` 210 and 260) with **identical `audio_url`** (`…/הרב דוד ג'יאמי/פרשת שבוע/49משפטים.MP3`). GT has `עבד עברי` exactly once.
  - canonical (older): `74c38a37-6c6e-4dc6-afb6-4c01bd87486e` (created 2026-02-23)
  - duplicate (newer): `9de08b75-7a9e-466c-ba52-7b6ebc5ebbaa` (created 2026-03-15, sort_order 260)
- **Policy:** per project precedent (display-dedup, no physical delete), flagged for the display layer; a guarded `DELETE` of the newer row is included **commented out** in the SQL pending Saar's approval.
- ⚠️ Doubt (Yoav): both copies point to a *משפטים* (Shemot) MP3, so this row may be a mis-imported lesson entirely — see §Doubts.

---

## C. Standalone + שו"ת (15 + 7 = 22 old-page rows) — **0 inserts**

Every one of the 22 standalone/שו"ת titles from the old category page **already exists in the DB** (each ≥2 published copies; each with ≥1 copy carrying `bible_book='ויקרא'`). **Zero** of them exist with `series_id IS NULL` — they are all nested under a **parsha-event-series** and/or the aggregation series `ספר ויקרא עם ביאור 'ושננתם'` (`29eb7c0b-…`).

On the old site these render as flat "שיעור"/"שו"ת" rows because there they are direct children of the book category. In the new DB the same lessons exist but hang under parsha nodes. **Therefore: no SQL inserts** (inserting standalone copies would create genuine duplicates). Surfacing them as flat category rows is a **CODE concern** — the category-page query should union lessons by `bible_book='ויקרא'` that live under parsha-event-series, deduped by normalized title, and render them as standalone rows below the series cards. → flagged as Yoav doubt for confirmation of the surfacing rule.

The 22 (all present): טומאת הלידה ומהותה · 'באר הבהרת'… · כמעשה ארץ מצרים · "אמת מה נהדר" · סוגיות בפרשת קדושים · השמיטה כפגישה… · (מצגת) קבלת היסורים… · ספר ויקרא עם ביאור 'ושננתם' · שכינה בתוך החיים… · הדם והחלב · קורבנות ללא אכילה… · המקרה שאינו מקרי · מאוהל מועד לאמר · וידבר ה' אליו… · מעמדם ותפקידם של הכהנים · (שו"ת) איזה קרבנות… · בין פרשת ויקרא לפרשת צו · צרעת - קירבה לה' · ברכת לולב · שמיני עצרת ושמחת תורה… · מיקום פרשיות בהר בחוקותי · למי שייכת ארץ ישראל?

---

## D. Parsha event-series (sidebar nodes)
All 10 present (see §A). They **stay** as children/sidebar nodes; the **CODE** excludes them from the category-page row list and from the standalone surfacing dedup-source it draws from. No SQL.

---

## Yoav doubts / flags
1. **Surfacing rule for standalone+שו"ת (22 rows).** They exist only under parsha-event / aggregation series, not as `series_id IS NULL`. Confirm the category page should pull-and-dedup them from parsha series rather than us inserting standalone copies. (No SQL written; this is the safe default.)
2. **תירוש `עבד עברי` duplicate audio is a *משפטים* (Shemot) MP3** (`49משפטים.MP3`, attributed to הרב דוד ג'יאמי, not תירוש). Both copies share it. Likely a stray/mis-imported lesson, not just a dedup. Recommend: display-dedup now (drop newer `9de08b75…`); investigate whether the remaining copy even belongs in this Vayikra/תירוש series.
3. **Kuperman lessons are pure PDFs on `bneyzion.co.il/media/`** — all 17 need rehost before they render (gview is dead per project rule; native iframe in code). Inserts carry the legacy URL so the rehost worker can pick them up by `legacy_attachment_url LIKE '%bneyzion.co.il/media/%'`.

---

## Files
- `oneone/r1/plan_ויקרא.sql` — guarded fix (17 Kuperman inserts + dedup note + verification). NOT executed.
- `oneone/r1/plan_ויקרא.md` — this file.
- `oneone/r1/series_diffs_ויקרא.json` — 22-entry diff array.
