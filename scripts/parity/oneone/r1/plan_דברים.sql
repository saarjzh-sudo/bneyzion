-- =====================================================================
-- plan_דברים.sql  ·  Bnei-Zion 1:1 migration · REVIEW ROUND 1 · book=דברים
-- Author: parity agent · DO NOT EXECUTE (read-only review artifact)
-- Idempotent + guarded: every statement is a no-op on re-run.
-- Ground truth: OLD site www.bneyzion.co.il category page /תורה/דברים/
-- =====================================================================
-- Canonical ids (verified live, 2026-06-14):
--   תורה  (root category)        = bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b
--   דברים (book category)        = b082cb95-cec2-4fb4-9d92-4dceb7ce2706  (parent=תורה)
--   פרשת שבוע- דברים  (series)   = 4d90e367-7613-49e0-9069-89ab12093cc2  (mis-parented under parsha node)
--   מאמרים על סוגיות פרשת שופטים = 79a5cd68-a7c5-4589-8589-d6f6f0decfba  (mis-parented under root תורה)
--   פרשת שבוע דברים (draft stub) = 2ee49d73-c22e-4210-838c-b964d83c68d7  (empty, real=0)
-- ---------------------------------------------------------------------
-- FINDINGS SUMMARY:
--   * 24 OLD rabbi-series. 22 match a דברים-category child exactly (title+author).
--   * 0 truly MISSING, 0 UNDER-FILLED, 0 lessons to insert, 0 standalone/shut to insert.
--   * 2 series EXIST but are MIS-PARENTED -> the only data fix is 2 reparents (below).
--   * 3 series OVER-FILLED by internal duplicate copies / 1 surplus -> NO delete; code display-dedup
--     + 1 YOAV DOUBT flagged (see plan_דברים.md). No SQL for those.
--   * 11 parsha event-series (title LIKE 'פרשת% | %') stay as sidebar nodes; CODE excludes them
--     from the category page (code spec, not SQL).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- SCOPING ASSERTIONS (abort if the world changed since this plan was authored)
-- ---------------------------------------------------------------------
DO $$
DECLARE v_book uuid; v_root uuid;
BEGIN
  SELECT id INTO v_book FROM series
    WHERE title='דברים' AND status='category'
      AND parent_id=(SELECT id FROM series WHERE title='תורה' AND parent_id IS NULL);
  IF v_book IS NULL OR v_book <> 'b082cb95-cec2-4fb4-9d92-4dceb7ce2706'
    THEN RAISE EXCEPTION 'GUARD: דברים category id drift (got %)', v_book; END IF;
  SELECT id INTO v_root FROM series WHERE title='תורה' AND parent_id IS NULL;
  IF v_root IS NULL OR v_root <> 'bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b'
    THEN RAISE EXCEPTION 'GUARD: תורה root id drift (got %)', v_root; END IF;
END $$;

-- ---------------------------------------------------------------------
-- FIX 1 — REPARENT: 'מאמרים על סוגיות פרשת שופטים' (הרב יהודה קופרמן)
--   currently parent = תורה (root). Old site lists it under דברים category.
--   3/3 lessons intact (מצוות מינוי שופטים / זקן ממרא / המלך). Guarded reparent.
-- ---------------------------------------------------------------------
UPDATE series
   SET parent_id = 'b082cb95-cec2-4fb4-9d92-4dceb7ce2706'
 WHERE id = '79a5cd68-a7c5-4589-8589-d6f6f0decfba'
   AND title = 'מאמרים על סוגיות פרשת שופטים'
   AND parent_id = 'bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b';   -- no-op once moved

-- ---------------------------------------------------------------------
-- FIX 2 — REPARENT: 'פרשת שבוע- דברים' (הרב דוד ג'יאמי)
--   currently parent = parsha event-series 'פרשת דברים | א-ד' (8e8346f2).
--   Old site lists it as a rabbi-series row on the דברים category page.
--   Reparent to the דברים book category so it renders as a CLOSED card.
--   (25 DB lessons = 23 old + 2 internal dup copies הברית/פרשת התשובה -> display-dedup, see FIX 3.)
-- ---------------------------------------------------------------------
UPDATE series
   SET parent_id = 'b082cb95-cec2-4fb4-9d92-4dceb7ce2706'
 WHERE id = '4d90e367-7613-49e0-9069-89ab12093cc2'
   AND title = 'פרשת שבוע- דברים'
   AND parent_id = '8e8346f2-758f-4e91-baf7-0ba3876aae6e';   -- no-op once moved

-- ---------------------------------------------------------------------
-- FIX 3 — DISPLAY-DEDUP markers (OPTIONAL / safe). NO row deletes (Rule: copies stay).
--   The 3 over-filled series carry internal duplicate lesson copies. The supported
--   project pattern is display-dedup in CODE, not physical delete (FK risk). This block
--   is intentionally a NO-OP (commented) — recorded here only to document scope.
--   Duplicate fingerprints (series_id :: duplicated title):
--     4d90e367 'פרשת שבוע- דברים'        :: 'הברית', 'פרשת התשובה'
--     b831dccd 'מאמרים - חומש דברים'      :: '...דרכיה דרכי נעם...עמלק', 'שמחה של מצוה'
--     8c74988d 'מאמרים על פרשיות דברים'   :: 'מורשה'
--   (No-op: physical dedup deferred to a dedicated FK-safe pass; code dedups by (series_id, norm(title)).)

-- ---------------------------------------------------------------------
-- VERIFICATION SELECTs (run AFTER apply; expect the asserted shapes)
-- ---------------------------------------------------------------------
-- V1: both reparented series now children of דברים category (expect 2 rows)
SELECT id, title, status, parent_id
  FROM series
 WHERE id IN ('79a5cd68-a7c5-4589-8589-d6f6f0decfba',
              '4d90e367-7613-49e0-9069-89ab12093cc2')
   AND parent_id = 'b082cb95-cec2-4fb4-9d92-4dceb7ce2706';

-- V2: דברים category child count = 25 non-parsha rabbi/topic series after reparent
--     (23 pre-existing non-parsha + 2 reparented) + 11 parsha event-series = 36 children total.
SELECT
  count(*) FILTER (WHERE title ~ '^פרשת.+\|')            AS parsha_event_series,   -- expect 11
  count(*) FILTER (WHERE title !~ '^פרשת.+\|')           AS rabbi_topic_series,    -- expect 25
  count(*)                                               AS total_children         -- expect 36
FROM series
WHERE parent_id = 'b082cb95-cec2-4fb4-9d92-4dceb7ce2706';

-- V3: lesson counts of the two reparented series unchanged (data preserved)
SELECT s.title,
       (SELECT count(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') AS real
FROM series s
WHERE s.id IN ('79a5cd68-a7c5-4589-8589-d6f6f0decfba',   -- expect 3
               '4d90e367-7613-49e0-9069-89ab12093cc2');  -- expect 25

-- V4: empty draft stub still inert (no accidental promotion)
SELECT id, title, status,
       (SELECT count(*) FROM lessons l WHERE l.series_id=series.id AND l.status='published') AS real
FROM series WHERE id='2ee49d73-c22e-4210-838c-b964d83c68d7';  -- expect status=draft, real=0

COMMIT;
-- ROLLBACK guidance: to undo, restore parent_id of 79a5cd68 -> bb14b5a5
--                    and 4d90e367 -> 8e8346f2.
