# Parity plan — בראשית (Review Round 1)

**Ground truth:** https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/בראשית/
**GT manifest:** `gt_בראשית_manifest.json` · **GT detail:** `gt_בראשית.json`
**DB queried live** via `scripts/parity/sbq.py` (read-only) on 2026-06-14.

---

## TL;DR — Saar's complaint is confirmed, root cause found

1. **אבינר 1-vs-15 bug** = real. The old site has **two** distinct אבינר series:
   - `הרב אבינר על פרשיות בראשית` → **10 AUDIO** lessons (s3 `.mp3`, `ra_sic5e_*`).
   - `הרב שלמה אבינר על פרשיות בראשית` → **15 DOCX/PDF** lessons (`/media/144xxx/...`).
   The migration **dumped the 15 docx/pdf lessons into the AUDIO series** (now 25) and
   left the docx series with **only 1** lesson. Fix = move 12 misplaced originals +
   insert 2 missing + (1 already correct) → docx series back to 15; audio back toward 10.

2. **Parsha event-series on the category page** = real. Old category page renders
   **0** parsha rows (`parsha_on_category_rows: []`, `counts.parsha_on_category=0`).
   The 12 `פרשת… | range` series in the new DB are **sidebar nodes only**; the CODE
   must exclude `title LIKE 'פרשת% | %'` from category-page rows. No SQL — code spec.

3. Two GT rabbi-series are **misparented** out of the בראשית category (so they don't
   render): `קדושת פשוטו של מקרא בראשית` (under `תורה` root) and
   `תולדות קרבת ה' לאדם…` (under `נושאים כלליים בתנ"ך`).

---

## Counts

| metric | value |
|---|---|
| OLD rabbi-series (GT) | 28 |
| OLD standalone lessons (GT) | 39 |
| OLD שו"ת (GT) | 20 |
| NEW DB children of בראשית category | 41 |
| ↳ parsha event-series (`פרשת… | …`) | 12 |
| ↳ non-parsha children | 29 |
| series matched OK (gap 0) | 18 |
| series UNDER-filled (new < old) | 2 |
| series OVER-filled (new > old) | 6 |
| series MISSING from category (misparented) | 2 |
| lessons to MOVE (9de1 → b2e0) | 12 |
| lessons to INSERT (missing docx) | 2 |
| standalone to insert | **0 (blocked — see Y2)** |
| שו"ת to insert | **0 (blocked — see Y2)** |

> The 29 non-parsha children include 3 housekeeping rows not in GT:
> `דפי עבודה - בראשית` (worksheets, 0 lessons), `חוברת עבודה לתלמיד` (draft),
> `סדרות על החומש` (0 lessons). Not category rabbi-series — leave for code/teachers area.

---

## Series diff table (verified live counts)

| series | author | old | new | gap | class | matched_id | action |
|---|---|---:|---:|---:|---|---|---|
| הרב אבינר על פרשיות בראשית | אבינר | 10 | 25 | -15 | OVERFILL | 9de1aa21 | **move 12 docx out → b2e0** (FIX1); flag 3 surplus (Y4) |
| הרב שלמה אבינר על פרשיות בראשית | אבינר | 15 | 1 | +14 | UNDERFILL | b2e079cd | **receive 12 moved + insert 2** (FIX1+2) → 15 |
| מאמרים על פרשיות בראשית - הרב ערן טמיר | טמיר | 9 | 9 | 0 | OK | 64471337 | — |
| מאמרים קצרים - חומש בראשית | אדלר | 14 | 15 | -1 | OVERFILL | ab762d8c | flag (no parsha overlap) |
| שיעורים על התנ"ך - בראשית | בן שחר | 4 | 0 | +4 | UNDERFILL | 75c09aee | **insert 4 — blocked (Y2)** |
| מאמרים - חומש בראשית | שנדורפי | 70 | 78 | -8 | OVERFILL | a4a97704 | flag; 5 share parsha media (dedup) |
| שיעורים-חומש בראשית | תירוש | 24 | 24 | 0 | OK | cca8bc67 | — |
| פרשת השבוע עפ"י הרמב"ן | קשתיאל | 10 | 10 | 0 | OK | d62cd377 | — |
| דבר תורה לשולחן השבת - בראשית | אוריאל | 43 | 43 | 0 | OK | dbcae806 | — |
| שיעורים קצרים על ספר בראשית | קופמן | 9 | 9 | 0 | OK | 2ca6e16b | — |
| פרשיות בראשית | רוטמן | 6 | 6 | 0 | OK | c9b7ae19 | — |
| מאמרים על פרשיות בראשית | שפירא | 53 | 58 | -5 | OVERFILL | a5505b1a | flag (no parsha overlap) |
| פרשת שבוע-בראשית | ג'יאמי | 36 | 36 | 0 | OK | feaf8a0b | — |
| קדושת פשוטו של מקרא - בראשית | קופרמן | 24 | 28 | -4 | MISSING(misparent) | 46bbc3f2 | **re-parent → בראשית** (FIX3a) |
| בראשית- מוקלט \| ללא טעמים | בארי | 50 | 50 | 0 | OK | 3d600a33 | — |
| מאמרים על הפרשה - חומש בראשית | ונגרובר | 7 | 7 | 0 | OK | 3b12317c | — |
| מבט מגבוה על חומש בראשית | אוריאל | 10 | 11 | -1 | OVERFILL | 182cc679 | flag (no parsha overlap) |
| שיעורים על ספר בראשית - אורות מודיעין | נאמן | 4 | 8 | -4 | OVERFILL | 59f305fb | flag; 4 share parsha media (dedup) |
| רחל, לאה והולדת השבטים (לנשים) | גאל דור | 11 | 11 | 0 | OK | 48718218 | — |
| חומש בראשית - קריאה עם ביאור פשוט | זר | 12 | 12 | 0 | OK | a910a10c | — |
| חומש בראשית - קריאה בטעמים אשכנזי | זר | 12 | 12 | 0 | OK | 261c2776 | — |
| הארות באונקלוס | עידן | 12 | 12 | 0 | OK | 62cc9e36 | — |
| פשט בפרשה | בן ארצי | 23 | 23 | 0 | OK | ff799d93 | — |
| לשון הקודש בפרשה | מיכאלי | 36 | 36 | 0 | OK | d6260ade | — |
| עולמות חדשים בפרשה | שילר | 19 | 19 | 0 | OK | b66e0cdb | — |
| גילויים בפרשה | מונדשיין | 10 | 10 | 0 | OK | c8586bc6 | — |
| מידות בפרשה | ולוסקי | 26 | 26 | 0 | OK | 8755bfbb | — |
| תולדות קרבת ה' לאדם… | אוריאל | 4 | 4 | 0 | MISSING(misparent) | d7a37161 | **re-parent? (Y1)** — guarded, commented |

---

## אבינר evidence (the gold-key media match)

OLD docx-series `הרב שלמה אבינר על פרשיות בראשית` lists 15 media (in order):
`144394 144395 144408 144405 144396 144406 144407 144416 144397 144429 144431 144398 144428 144430 144440`

DB topology (per media-id, ORIG = copied_from NULL, CLONE lives in a parsha series):
- 12 of them are single ORIGINALS misplaced in **9de1** (audio series) sorts 110-220 → **MOVE to b2e0**.
- `144408` has **3** originals in 9de1 (sorts 130/230/240). GT lists it once → move only sort130; sorts 230/240 are surplus (Y4).
- `144440` has an original in 9de1 (sort250) **and** the correct one already in b2e0 → leave b2e0, sort250 is surplus (Y4).
- `144428`, `144430` → **0 rows in DB** → **INSERT** into b2e0 (FIX2). Rule-13 rehost (legacy URL, attachment_url NULL).
- Every parsha event-series clone keeps `copied_from` → its 9de1 original; moving the original's `series_id` does **not** break the clone FK.

The 12 moved lesson-ids (verified):
```
13e836fd 1ba39bbf 5697b566 1319b6a6 86553db8 41e2cf0a a3e5d327
209e6d5d 6030ef11 ab92c2be d37fd8d6 f97ea221
```

---

## Yoav / Saar doubts (do NOT auto-apply)

- **Y1 — `תולדות קרבת ה' לאדם…` re-parent.** Old site lists it on the בראשית category page,
  but it's a cross-chumash series currently under `נושאים כלליים בתנ"ך` (4/4 lessons, content OK).
  Re-parenting is the literal parity fix; may be intentional as a general node. SQL provided **commented** (FIX3b).
- **Y2 — standalone (39) + שו"ת (20) cannot be inserted.** The GT scrape captured these rows with
  **empty title AND empty href** (`title:"", href:""`) — only author + media-icon + length. Inserting
  blind would create junk, un-deduplicatable rows. **Requires a re-scrape of the old בראשית category
  page with a corrected selector** (the standalone rows render their title differently than series rows).
  DB currently has 16 standalone (series_id NULL, bible_book=בראשית) vs old 39 → likely real gap, but
  unprovable without titles. **No SQL emitted.**
- **Y3 — `שיעורים על התנ"ך - בראשית` (75c09aee) old=4 new=0.** 4 audio lessons on the old series page,
  absent in DB. Same scrape limitation (placeholder rows, no href). Needs re-scrape of that series page
  before insert. **No SQL emitted.**
- **Y4 — audio series surplus originals (sorts 230/240/250 in 9de1).** After the move, audio=13 not 10.
  Options: display-dedup by media-id, or physical delete — but each surplus original has a parsha clone
  pointing at it via `copied_from`, so a naive DELETE orphans the clone. Needs FK-aware handling.
  **No destructive SQL emitted.**
- **Y5 — OVERFILL with no parsha overlap** (`מאמרים קצרים` +1, `מאמרים על פרשיות בראשית` +5,
  `מבט מגבוה` +1): extras are NOT parsha clones (verified: 0 shared media with parsha series), so they
  are not the COPY-dedup pattern. Could be legit additions or a different consolidation path. Flagged, not touched.

---

## Step D — parsha event-series confirmed (12/12, all active, KEEP)

`בראשית|א-ו` `נח|ו-יא` `לך לך|יב-יז` `וירא|יח-כב` `חיי שרה|כג-כה` `תולדות|כה-כח`
`ויצא|כח-לב` `וישלח|לב-לו` `וישב|לז-מ` `מקץ|מא-מד` `ויגש|מד-מז` `ויחי|מז-נ`

These stay as sidebar nodes. Category-page exclusion is a **code** change
(`WHERE title NOT LIKE 'פרשת% | %'`), not in this SQL.
