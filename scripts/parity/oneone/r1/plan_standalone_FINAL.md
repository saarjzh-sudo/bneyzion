# plan_standalone_FINAL — Bnei-Zion 1:1 · Round 1 · STANDALONE + שו"ת track

**Scope:** the standalone single-lessons (`kind='שיעור'`) and שו"ת (`kind='שו"ת'`) rows shown
*below the series* on each Torah book's old category page
(`www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/<book>/`), for all 5 books.
**Trigger:** RD-1 left these BLOCKED (Y2/Y3) because the prior grab (`gt_<book>.json`) captured
every standalone/שו"ת row with **empty title AND empty href** (selector matched series rows only).
**This pass:** fresh re-scrape with a corrected selector → full titles/authors/media recovered →
matched 1:1 against the live DB.

- Re-scrape: `curl --noproxy '*'`, cached `oneone/r1cache/<sha1(url)>.html` (fresh 2026-06-14).
- Parser: `oneone/r1_parse.py` (h3>a title even when `<a>` carries `class/data-pjxId` before `href`).
- Matcher: `oneone/r1_standalone_match.py` → `oneone/r1/standalone_recon_<book>.json` (+ `_ALL.json`).
- SQL emitter: `oneone/r1_emit_standalone_sql.py` → `oneone/r1/plan_standalone_FINAL.sql`.
- DB: Supabase `pzvmwfexeiruelwiujxn` (bnei-zion), READ-ONLY via `sbq.py`. Prod = `feat/navigator-bot`.

---

## Selector fix — proof the blocker is resolved

`gt_בראשית.json` (prior grab): `standalone` 39 rows / **39 empty titles**, `shut` 20 rows / **20 empty titles**.
After the corrected selector: **0 empty titles** in every book. Recovered counts exactly match the GT manifest:

| book | series | standalone | שו"ת | empty-title (after fix) |
|---|---:|---:|---:|---:|
| בראשית | 28 | 39 | 20 | 0 |
| שמות | 25 | 27 | 11 | 0 |
| ויקרא | 22 | 15 | 7 | 0 |
| במדבר | 23 | 25 | 10 | 0 |
| דברים | 24 | 11 | 5 | 0 |
| **TOTAL** | **122** | **117** | **53** | **0** |

---

## HEADLINE FINDING — 0 truly-missing rows; the gap is CODE, not DATA

Every one of the **170** old standalone+שו"ת rows (117 + 53) **already exists in the DB**
(status='published', correct `bible_book`), matched by normalized title. **Truly-missing = 0** in all 5 books.

They do not currently sit as `series_id IS NULL` standalone rows — they live **nested under
parsha-event series** (e.g. `פרשת בראשית | א-ו`, `פרשת נח | ו-יא`) and/or the **`ושננתם` anthology
series** (`ספר <book> עם ביאור ושננתם`) and `ימי עיון בתנ"ך` year-series. Each row exists **2–3×
on average** (duplicated across those parents):

| book | GT rows | DB copies of them | avg multiplicity | distinct parent series |
|---|---:|---:|---:|---:|
| בראשית | 59 | 149 | 2.5× | 29 |
| שמות | 38 | 104 | 2.7× | 24 |
| ויקרא | 22 | 39 | 1.8× | 12 |
| במדבר | 35 | 96 | 2.7× | 26 |
| דברים | 16 | 30 | 1.9× | 10 |

**Implication:** the visible deficit on the new category page (`series_id NULL` published = בראשית 16 /
שמות 13 / ויקרא 13 / במדבר 13 / דברים 7, vs old 39/27/15/25/11) is a **rendering/surfacing gap**,
i.e. ROUND1-MASTER change **C4** (render a standalone band on the category page by union+dedup of the
book-scoped single lessons), **not** a data gap. **No INSERTs are needed.** Inserting standalone clones
(the RD-1 במדבר "insert 35" path) would only DEEPEN the existing 2–3× duplication. This resolves the
RD-1 policy inconsistency in favor of the ויקרא/דברים **no-insert** policy, now proven correct for all 5 books.

---

## Per-book breakdown

| book | standalone | שו"ת | std+שו"ת | already in DB | **INSERT new** | rehost-tagged* | direct-media* | text-only* | yoav-fallback** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| בראשית | 39 | 20 | 59 | 59 | **0** | 6 | 22 | 11 | 3 |
| שמות | 27 | 11 | 38 | 38 | **0** | 5 | 19 | 3 | 1 |
| ויקרא | 15 | 7 | 22 | 22 | **0** | 3 | 9 | 3 | 1 |
| במדבר | 25 | 10 | 35 | 35 | **0** | 5 | 15 | 5 | 0 |
| דברים | 11 | 5 | 16 | 16 | **0** | 4 | 5 | 2 | 1 |
| **TOTAL** | **117** | **53** | **170** | **170** | **0** | **23** | **70** | **24** | **6** |

\* media class is computed for the standalone rows from the old page's first download link, and stored in
the (guarded, non-firing) INSERT payloads so the data is ready if Saar ever wants clones:
`s3 / vp4 / external http` → direct (`audio/video/attachment_url`); `bneyzion.co.il/media/...` → **legacy_attachment_url
only + Rule-13 rehost flag** (never `attachment_url=bneyzion.co.il`); no link → text-only. All 53 שו"ת are text-only.
\*\* author name had no exact `rabbis.name` match → `הרב יואב אוריאל` (`acd34d0f-…`) fallback + `review_note`.
(NB: the *existing* DB copies of these rows are often attributed to the `ושננתם - אוצר התורה` collective entity
rather than the individual rabbi named on the old page — a known anthology-attribution artifact, not a missing lesson.)

---

## The SQL — `plan_standalone_FINAL.sql`

170 `INSERT … SELECT … WHERE NOT EXISTS (…)` statements (one per GT row), grouped per book inside
`BEGIN…COMMIT`, each guarded by a normalized-title + `bible_book` existence check. **Because all 170 rows
already exist, every guard is FALSE → 0 rows inserted on APPLY and 0 on RE-RUN (fully idempotent).**

The INSERTs are deliberately **kept rather than deleted**: they carry the exact, vetted payloads
(title, resolved `rabbi_id`, `source_type`, media URLs / legacy-rehost flag, `content_type='שו"ת'` for שו"ת,
`audience_tags=['general']`, `status='published'`, `sort_order=idx*10`) so that *if* Saar decides standalone
clones should be created after all, the file applies them safely without duplicating anything that exists.

### Idempotency — VERIFIED READ-ONLY
The 170 `NOT EXISTS` guards were each run as a positive `EXISTS` SELECT against the live DB using the
identical normalize expression baked into the SQL:

```
exists_in_db = true  → 170
exists_in_db = false → 0
```

→ 170/170 rows are present; the normalize expression matches the DB titles exactly; APPLY = 0 inserts.

---

## Recommendation (hand-off to CODE + Saar decision)

1. **No data write for the standalone/שו"ת track.** Apply `plan_standalone_FINAL.sql` if desired as a
   safety/idempotency proof; it changes nothing.
2. **The real fix is CODE — ROUND1-MASTER C4:** on the category page, render a "שיעורים בודדים" band +
   a "שו"ת" band built from the book-scoped single lessons that currently sit under the parsha/anthology
   series, **union+dedup by normalized title** (collapsing the 2–3× duplication), ordered as on the old page.
   This is the same surfacing already chosen for ויקרא/דברים in RD-1 — now confirmed correct for all 5 books.
3. **Reverse the RD-1 במדבר decision** to insert 35 standalone+שו"ת clones — proven unnecessary and
   duplicative by this re-scrape.
4. **Dedup debt (separate track):** these rows average 2–3 physical copies each. Physical dedup needs FK
   care and is out of scope for RD-1; flagged for a dedicated session.

### Yoav doubts
- 6 author→rabbi fallbacks (בראשית 3, שמות 1, ויקרא 1, דברים 1) — only relevant if clones are ever created;
  the existing DB copies already have an attribution (mostly the `ושננתם` collective). List in
  `standalone_recon_<book>.json` (`rabbi_matched=false`).
