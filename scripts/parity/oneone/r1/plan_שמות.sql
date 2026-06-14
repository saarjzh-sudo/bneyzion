-- ============================================================================
-- REVIEW ROUND 1 — book = שמות — FIX PLAN (idempotent, guarded). DO NOT auto-execute.
-- Project: pzvmwfexeiruelwiujxn
-- שמות category id: 5149a23b-8181-4c41-81db-1efcd2631f5a  (parent = תורה root)
-- Verified fresh 2026-06-14. READ plan_שמות.md for evidence.
--
-- SCOPE: this file performs ONLY the two genuine data mutations:
--   FIX 1 — split the merged אבינר series (40 -> 19 + 21)
--   FIX 2 — insert 5 missing standalone/שו"ת lessons
-- Everything else (parsha-series exclusion, book-subset counts, surfacing קשתיאל
--   nested under nav-nodes, closed-card layout) is CODE, see plan_שמות.md §Code-spec.
-- Every statement is guarded so a re-run is a no-op. Run inside one transaction.
-- ============================================================================
BEGIN;

-- ----------------------------------------------------------------------------
-- SCOPING SELECTS (run first, eyeball before commit)
-- ----------------------------------------------------------------------------
-- 0a. confirm category id
SELECT id, title, status FROM series
 WHERE title='שמות' AND status='category'
   AND parent_id=(SELECT id FROM series WHERE title='תורה' AND parent_id IS NULL);
-- expect: 5149a23b-8181-4c41-81db-1efcd2631f5a

-- 0b. confirm the two אבינר series pre-state: 1f4cf5c3 = 0 lessons, 1ff919db = 40 lessons
SELECT s.id, s.title, s.lesson_count,
       (SELECT count(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') real
  FROM series s
 WHERE s.id IN ('1f4cf5c3-8435-456e-bc08-17d05c8d7535',  -- empty target (GT series 2, 21 lessons)
                '1ff919db-25cc-4935-8e68-f12483693e8f')  -- merged source (40 lessons)
 ORDER BY real;
-- expect pre-state: 1f4cf5c3 real=0 , 1ff919db real=40

-- ============================================================================
-- FIX 1 — SPLIT MERGED אבינר SERIES
-- GT: series#1 "הרב אבינר על פרשיות שמות" = 19 lessons (old href .../הרב-אבינר-על-פרשיות-שמות/)
--     series#2 "הרב אבינר על פרשיות שמות" = 21 lessons (old href .../הרב-אבינר-שיחות-על-פרשיות-שמות/)
-- DB merged both into 1ff919db (40): sort_order 10..190 => series#1 (19), 200..400 => series#2 (21).
-- Verified: all 19 series#1 titles AND all 21 series#2 titles matched 1:1 inside the 40.
-- Move the sort_order>=200 block (the 21 lessons) into the empty series 1f4cf5c3.
-- GUARD: only runs while target is still empty (idempotent — second run moves 0 rows).
-- ----------------------------------------------------------------------------
UPDATE lessons l
   SET series_id = '1f4cf5c3-8435-456e-bc08-17d05c8d7535'
 WHERE l.series_id = '1ff919db-25cc-4935-8e68-f12483693e8f'
   AND l.status = 'published'
   AND l.sort_order >= 200
   AND (SELECT count(*) FROM lessons x
          WHERE x.series_id='1f4cf5c3-8435-456e-bc08-17d05c8d7535'
            AND x.status='published') = 0;   -- guard: target empty

-- Re-sequence the moved block to 10,20,... (only those now in the target, keeps order)
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY sort_order) * 10 AS new_so
    FROM lessons
   WHERE series_id='1f4cf5c3-8435-456e-bc08-17d05c8d7535' AND status='published'
)
UPDATE lessons l SET sort_order = ranked.new_so, updated_at=now()
  FROM ranked WHERE l.id = ranked.id AND l.sort_order <> ranked.new_so;

-- Refresh denormalized lesson_count on both אבינר series (guarded: only if drifted)
UPDATE series s
   SET lesson_count = (SELECT count(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published')
 WHERE s.id IN ('1f4cf5c3-8435-456e-bc08-17d05c8d7535','1ff919db-25cc-4935-8e68-f12483693e8f')
   AND s.lesson_count <> (SELECT count(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published');

-- ============================================================================
-- FIX 2 — INSERT 5 MISSING STANDALONE / שו"ת  (series_id NULL, bible_book='שמות')
-- These 5 appear on the old שמות category page but are absent from the DB.
-- All 5 had EMPTY href on the old page (no media URL to rehost) -> insert as text stubs
-- with review_note flag for Yoav. source_type='text', status='published', no media.
-- GUARD: WHERE NOT EXISTS on exact title (idempotent).
-- ----------------------------------------------------------------------------

-- 2.1 standalone — הרב דוד חי הכהן
INSERT INTO lessons (id,title,rabbi_id,series_id,bible_book,source_type,content_type,status,views_count,audience_tags,review_note,published_at,created_at,updated_at)
SELECT gen_random_uuid(),
  'מתן תורה כיצד מתגלה הנשמה הישראלית מן השמים ומן הארץ כאחד?',
  'cc169a16-6fac-4da9-915c-b484c7b24b11', NULL, 'שמות', 'text', NULL, 'published', 0, '{}'::text[],
  'R1-שמות: standalone from old category page, no source URL on old site (href empty) — Yoav verify media',
  now(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE title='מתן תורה כיצד מתגלה הנשמה הישראלית מן השמים ומן הארץ כאחד?');

-- 2.2 standalone — הרבנית נורית גאל דור (לנשים)
INSERT INTO lessons (id,title,rabbi_id,series_id,bible_book,source_type,content_type,status,views_count,audience_tags,review_note,published_at,created_at,updated_at)
SELECT gen_random_uuid(),
  '"שובו אלי" חטא העגל הוא שורש החטאים כולם. מהו השורש של חטא העגל?',
  '53089efa-5913-40ed-a530-f6e47a5c10c2', NULL, 'שמות', 'text', NULL, 'published', 0, '{}'::text[],
  'R1-שמות: standalone from old category page, no source URL on old site (href empty) — Yoav verify media',
  now(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE title='"שובו אלי" חטא העגל הוא שורש החטאים כולם. מהו השורש של חטא העגל?');

-- 2.3 standalone — הרב אברהם וסרמן
INSERT INTO lessons (id,title,rabbi_id,series_id,bible_book,source_type,content_type,status,views_count,audience_tags,review_note,published_at,created_at,updated_at)
SELECT gen_random_uuid(),
  'עם קשה עורף',
  '1acd517c-1e18-4bdc-a18e-0ecf5924e50f', NULL, 'שמות', 'text', NULL, 'published', 0, '{}'::text[],
  'R1-שמות: standalone from old category page, title truncated from old preview; no source URL (href empty) — Yoav verify title+media',
  now(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE title='עם קשה עורף' AND rabbi_id='1acd517c-1e18-4bdc-a18e-0ecf5924e50f');

-- 2.4 שו"ת — הרב איתן שנדורפי
INSERT INTO lessons (id,title,rabbi_id,series_id,bible_book,source_type,content_type,status,views_count,audience_tags,review_note,published_at,created_at,updated_at)
SELECT gen_random_uuid(),
  'מכת בכורות',
  'be153d0e-b68e-4704-a108-56f5af7d0ca9', NULL, 'שמות', 'qa', 'שו"ת', 'published', 0, '{}'::text[],
  'R1-שמות: שו"ת from old category page, title truncated from old preview; no source URL (href empty) — Yoav verify',
  now(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE title='מכת בכורות' AND rabbi_id='be153d0e-b68e-4704-a108-56f5af7d0ca9' AND content_type='שו"ת');

-- 2.5 שו"ת — הרב מנחם שחור
INSERT INTO lessons (id,title,rabbi_id,series_id,bible_book,source_type,content_type,status,views_count,audience_tags,review_note,published_at,created_at,updated_at)
SELECT gen_random_uuid(),
  'זמן השיעבוד',
  '4822f2bb-9d1c-4adc-9554-d2a2db7bdbc8', NULL, 'שמות', 'qa', 'שו"ת', 'published', 0, '{}'::text[],
  'R1-שמות: שו"ת from old category page, title truncated from old preview; no source URL (href empty) — Yoav verify',
  now(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE title='זמן השיעבוד' AND rabbi_id='4822f2bb-9d1c-4adc-9554-d2a2db7bdbc8' AND content_type='שו"ת');

-- ============================================================================
-- VERIFICATION SELECTS (run after, before COMMIT)
-- ============================================================================
-- V1. אבינר split: expect 1f4cf5c3 -> 21 , 1ff919db -> 19
SELECT s.id, s.title, s.lesson_count,
       (SELECT count(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') real
  FROM series s
 WHERE s.id IN ('1f4cf5c3-8435-456e-bc08-17d05c8d7535','1ff919db-25cc-4935-8e68-f12483693e8f')
 ORDER BY real;

-- V2. 5 standalone inserted: expect 5 rows
SELECT title, rabbi_id, content_type, source_type, series_id, bible_book
  FROM lessons
 WHERE review_note LIKE 'R1-שמות:%'
 ORDER BY title;

-- V3. no parsha-series were touched (sanity): count of copied_from clones unchanged
SELECT count(*) parsha_clone_lessons
  FROM lessons l
  JOIN series s ON s.id=l.series_id
 WHERE s.parent_id='5149a23b-8181-4c41-81db-1efcd2631f5a'
   AND s.title ~ '^פרשת.+\|'
   AND l.copied_from IS NOT NULL;

-- COMMIT;   -- uncomment only after V1/V2 look right
ROLLBACK;    -- default safe: this plan is NOT meant to auto-execute
