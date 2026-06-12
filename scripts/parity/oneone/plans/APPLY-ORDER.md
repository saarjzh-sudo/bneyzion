# APPLY-ORDER — safe execution order for the merged 1:1 parity plan

*Synthesizer output 2026-06-12. Consumes: 8 plan files + `merge_report.json` resolutions.*
*Project: Supabase `pzvmwfexeiruelwiujxn`. Verification via `python3 scripts/parity/sbq.py "SQL"`.*
*POLICY: never DELETE rows — only status/audience demotion. Rule 13: every `attachment_url_old` / `rehost:true` media URL on bneyzion.co.il goes through the rehost queue to Storage before publish.*

---

## Stage 0 — Preconditions (no data ops)

1. `merge_check.py` green (current report: 314 records, all auto-resolvable; 18 flagged to yoav_review).
2. Build the **tmp-id alias map** from merge_report K/P resolutions (loser tmp_id → winner tmp_id / existing series id, incl. `rabbis_plan:לב-הפרק-ישעיהו → e93c7a85`).
3. Build the **dropped-ops list** (87 dup inserts, ~5 dup creates, 10 cancelled drafts, 62 losing status values, ~60 rpi dups, 23 move→copy conversions, 4+1 losing rabbi attributions, 3 retag unions).
4. Code deploy gate: CODE-SPEC §0 (dual-audience filter + sort_order consumers) must ship in the SAME release window as stages 4–9, or sequence: schema → data → code, with the site tolerating null sort_order until the final deploy (all new orderings are `NULLS LAST` so pre-deploy behavior is unchanged).

## Stage 1 — Schema additions (idempotent migration)

```sql
ALTER TABLE lessons       ADD COLUMN IF NOT EXISTS sort_order int;
ALTER TABLE lessons       ADD COLUMN IF NOT EXISTS copied_from uuid REFERENCES lessons(id);
ALTER TABLE lesson_topics ADD COLUMN IF NOT EXISTS sort_order int;
ALTER TABLE series        ADD COLUMN IF NOT EXISTS nav_visible boolean DEFAULT true;
CREATE TABLE IF NOT EXISTS rabbi_page_items(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rabbi_id uuid NOT NULL REFERENCES rabbis(id),
  kind text NOT NULL CHECK (kind IN ('series','lesson','qa')),
  series_id uuid REFERENCES series(id), lesson_id uuid REFERENCES lessons(id),
  sort_order int,
  CHECK ((kind='series') = (series_id IS NOT NULL)),
  CHECK ((kind IN ('lesson','qa')) = (lesson_id IS NOT NULL)));
CREATE UNIQUE INDEX IF NOT EXISTS rpi_uniq ON rabbi_page_items(rabbi_id, kind, coalesce(series_id, lesson_id));
CREATE TABLE IF NOT EXISTS teacher_listing_items(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL, key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('series','lesson')),
  series_id uuid REFERENCES series(id), lesson_id uuid REFERENCES lessons(id),
  sort_order int);
CREATE UNIQUE INDEX IF NOT EXISTS tli_uniq ON teacher_listing_items(scope, key, kind, coalesce(series_id, lesson_id));
CREATE TABLE IF NOT EXISTS series_topics(
  series_id uuid NOT NULL REFERENCES series(id),
  topic_id uuid NOT NULL REFERENCES topics(id),
  sort_order int, PRIMARY KEY (series_id, topic_id));
-- RLS: anon SELECT on the 3 new tables (same policy shape as lesson_topics)
```
**Verify:** `SELECT column_name FROM information_schema.columns WHERE table_name='lessons' AND column_name IN ('sort_order','copied_from');` + same for the 3 tables; anon-REST `GET /rest/v1/rabbi_page_items?limit=1` returns 200.

## Stage 2 — Backups (full-table copies, suffix `_bak_oneone_20260612`)

```sql
CREATE TABLE series_bak_oneone_20260612        AS SELECT * FROM series;
CREATE TABLE lessons_bak_oneone_20260612       AS SELECT * FROM lessons;
CREATE TABLE lesson_topics_bak_oneone_20260612 AS SELECT * FROM lesson_topics;
CREATE TABLE topics_bak_oneone_20260612        AS SELECT * FROM topics;
CREATE TABLE rabbis_bak_oneone_20260612        AS SELECT * FROM rabbis;
```
**Verify:** row counts equal source (`series` 1698, `lessons` 18452, `topics` 864, `rabbis` 214, `lesson_topics` 12369).

## Stage 3 — Rabbi identity ops (BEFORE any attribution/page-item op)

Order inside stage: `set_entity_type` (13) → `update_rabbi_field` (2) → `merge_rabbi` (16: repoint `lessons.rabbi_id`, `series.rabbi_id`, then set merged-from row `status='inactive'`, record alias for name resolution — never delete).
**Verify:** `SELECT count(*) FROM lessons l JOIN rabbis r ON l.rabbi_id=r.id WHERE r.status='inactive';` → 0; merged-from rabbis have 0 owned series; `get_public_rabbis()` count diff is explainable (±16).

## Stage 4 — Tree ops (tree_plan first, then surviving book-plan series ops)

Order: `create_series` (~53, with tmp registry; parents may be tmp → topological order) → `reparent_series` (70; includes `10e20007` NULL→ישעיהו) → `update_series` (status/fields, post-merge winners) → `demote_series` (1) → `set_series_rabbi` (57, after Stage 3 ids).
DEFER `set_series_sort` to Stage 7 (needs all series to exist; conflict winners only).
**Verify:** orphan check `SELECT count(*) FROM series WHERE parent_id IS NULL AND id NOT IN (<18 known roots>);` → 0 new; cycle check via recursive CTE returns 0; tmp registry fully resolved (no unresolved `tmp:` refs remain in the runner state).

## Stage 5 — Lesson placement (book plans → topics → rest)

1. `move_lesson` (437 minus 23 conversions = winners only) — `UPDATE lessons SET series_id=...`.
2. `copy_lesson` (3950 + 23 converted) — INSERT full-row copies (media, content, description, published_at, bible_*, audience) **without** lesson_topics links, stamp `copied_from=<source id>`; record `(source_id, target_series) → new_id` in the copy map. Skip if an identical copy already exists (idempotency: `copied_from+series_id` unique probe).
3. `retag_lesson` (90, L-unions applied), `publish_lesson` (16), `draft_lesson` (97 surviving), `set_lesson_rabbi` (136 winners, via name→id using Stage-3 alias table), `update_lesson_field` (98).
**Verify:** `SELECT count(*) FROM lessons WHERE copied_from IS NOT NULL;` ≈ 3973; no published lesson with `series_id IS NULL` that the plans placed; spot-check 5 known pages (e.g. תהלים מזמור-כז: old row-set == new row-set by normalized title).

## Stage 6 — Inserts + queues

1. `insert_lesson` — **225 physical** (post-K-dedup), `status='published'` only after queues pass; resolve `series_ref` via tmp registry; tmp-lesson registry for `lesson_ref` consumers.
2. **Rehost queue (Rule 13):** every payload `attachment_url_old`/`audio/video` on `bneyzion.co.il` + teachers_plan's 2 `update_lesson_field attachment_url_old` → download → Supabase Storage → write final URL. No bneyzion.co.il URL may remain in any published row.
3. **Scrape queue:** `needs_content_scrape:true` rows (≥19: neviim 17 שו"ת + 2 lessons; + ketuvim שו"ת/text rows) → fetch old_url → extract full popup text into `lessons.content` (NFC; popup-full-text parity is a stated goal).
**Verify:** `SELECT count(*) FROM lessons WHERE (audio_url LIKE '%bneyzion.co.il%' OR video_url LIKE '%bneyzion.co.il%' OR attachment_url LIKE '%bneyzion.co.il%') AND status='published';` → **0**; inserted rows with empty `content` AND empty media → 0 (or parked as draft + yoav item).

## Stage 7 — Sorts (after ALL rows exist)

1. `set_series_sort` (1084 winners; tree band semantics: 1..99 sidebar / 0-null page-only / ≥100 parked).
2. `set_lesson_sort` (11643): resolve each `(lesson_ref, series_ref)` to the physical row — home row if `lessons.series_id = series_ref`, else copy-map row, else tmp-insert row; then `UPDATE lessons SET sort_order=...`. Unresolved refs → error list, not silent skip.
3. Re-pack pass per scope: renumber 10,20,30… preserving relative order (absorbs the 4 moadim cross-list residues; H=0 so no real collisions expected — assert).
**Verify:** per sampled series, `SELECT title FROM lessons WHERE series_id='<id>' AND status='published' ORDER BY sort_order NULLS LAST, bible_chapter, title;` equals the old page row order (script-diff ≥30 random pages from old_listings_*.json, normalize_he); duplicate-slot probe `SELECT series_id, sort_order, count(*) FROM lessons WHERE sort_order IS NOT NULL GROUP BY 1,2 HAVING count(*)>1 AND count(DISTINCT id)>1;` → 0.

## Stage 8 — Topics

`create_topic` (2) → `rename/merge` (2 merges expressed as link-moves; no merge_topic ops emitted) → `set_topic_sort` (123) → `unlink_lesson_topic` (93) → `link_lesson_topic` (1300; upsert with sort_order; dedup `(topic_id,lesson_id)` keep-first) → `series_topics` inserts (178).
**Verify:** themes-root children = 127 ordered 1..127 matching `old_topics_sidebar.json`; per-topic diff of 10 sampled topic pages vs `old_topic_pages.json` (items+order); the 2 series-card-only topics (תנ"ך מוקלט, לימוד בקצב של פרק לשיעור) have ≥33/38 series_topics rows.

## Stage 9 — Rabbi page items + teachers listings

1. `rabbi_page_items` (1406 → ~1346 post-J-dedup): rabbis_plan ladder first, neviim qa rows (resolve `lesson_ref` tmp → inserted ids), teachers extras appended after `max(sort_order)` per rabbi.
2. `teacher_listing_items` (895), unique-index upsert.
**Verify:** `SELECT rabbi_id, count(*) FROM rabbi_page_items GROUP BY 1;` vs old_rabbi_pages.json row counts per rabbi (±documented yoav exceptions, e.g. הרב שמעון לוי empty-by-bug → sane fallback); per content-type counts == teachers_plan `stats.content_type_pages.resolved`.

## Stage 10 — Recompute counters + views

```sql
UPDATE series s SET lesson_count = (SELECT count(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published');
-- rabbis.lesson_count: recompute from published public lessons (display uses the view below)
CREATE OR REPLACE VIEW rabbi_effective_counts AS ...;   -- CODE-SPEC §6
CREATE OR REPLACE VIEW topic_effective_counts AS ...;   -- CODE-SPEC §7
-- refresh get_public_rabbis() per CODE-SPEC §6 (rabbi_page_items-aware)
```
**Verify:** `SELECT count(*) FROM series WHERE lesson_count <> (SELECT count(*) FROM lessons l WHERE l.series_id=series.id AND l.status='published');` → 0. lesson_count is trusted by sidebar/children/bible gates (code_semantics §13.3) — this stage is mandatory before code flips.

## Stage 11 — Code deploy + full verification

1. Deploy CODE-SPEC bundle (one release).
2. Re-run the parity crawl (depth-audit standard: **lesson-list-per-series comparison**, not title-existence — per the 10.6 lesson) over: 13 sidebar roots, ≥50 random listing pages per section, all 154 rabbi pages, 127 topic pages, 22 teachers content-types, 31 creators.
3. Anon-REST spot checks (what the browser actually pulls) + Chrome screenshot pass on 10 routes (visual-verifier rule).
4. Rollback path: restore `*_bak_oneone_20260612` tables + previous deploy alias.
