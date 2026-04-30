-- ============================================================
-- Migration: audience_tags on series + lessons
-- Purpose:   Enable Teachers Wing → sidebar merge.
--            Tag content as "teachers" / "general" / etc.
--            so the sidebar can filter without a separate page.
-- Status:    READY — not yet applied. Saar must confirm before running.
-- ============================================================

-- ---- 1. Add audience_tags to series ----------------------------
ALTER TABLE series
  ADD COLUMN IF NOT EXISTS audience_tags TEXT[] NOT NULL DEFAULT ARRAY['general'];

-- GIN index: fast @> queries ("find all series tagged 'teachers'")
CREATE INDEX IF NOT EXISTS idx_series_audience_tags
  ON series USING GIN (audience_tags);

-- ---- 2. Add audience_tags to lessons ---------------------------
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS audience_tags TEXT[] NOT NULL DEFAULT ARRAY['general'];

CREATE INDEX IF NOT EXISTS idx_lessons_audience_tags
  ON lessons USING GIN (audience_tags);

-- ---- 3. Backfill: keyword scan on series.title -----------------
-- Marks a series as "teachers" if its title contains known
-- teacher-relevant Hebrew keywords.
-- After Yoav reviews the Admin UI he can correct mismatches.

UPDATE series
SET audience_tags = ARRAY['teachers', 'general']
WHERE
  title ILIKE '%מורים%'
  OR title ILIKE '%מחנכ%'
  OR title ILIKE '%הוראה%'
  OR title ILIKE '%כיתה%'
  OR title ILIKE '%כלי עזר%'
  OR title ILIKE '%מצגת%'
  OR title ILIKE '%דף עבודה%'
  OR title ILIKE '%אגף%'
  OR title ILIKE '%פדגוגי%'
  OR title ILIKE '%קורס מורים%'
  OR title ILIKE '%הכשרה%'
  OR title ILIKE '%סדנה%'
  OR title ILIKE '%חידה%'
  OR title ILIKE '%חינוך%';

-- ---- 4. Cascade: lessons inherit their series' teacher tag -----
-- Any lesson whose series is tagged "teachers" also gets tagged.
-- Keeps the filter consistent: series-page + lesson-page both
-- respect the tag without per-row manual work.

UPDATE lessons
SET audience_tags = ARRAY['teachers', 'general']
WHERE series_id IN (
  SELECT id FROM series
  WHERE audience_tags @> ARRAY['teachers']
)
AND NOT (audience_tags @> ARRAY['teachers']);

-- ---- 5. Helper view (optional, non-destructive) ----------------
-- Convenient for the Admin bulk-tag UI query:
--   SELECT * FROM series_with_audience WHERE teacher_tagged = true;

CREATE OR REPLACE VIEW series_with_audience AS
SELECT
  s.id,
  s.title,
  s.status,
  s.lesson_count,
  s.audience_tags,
  s.rabbi_id,
  r.name AS rabbi_name,
  ('teachers' = ANY(s.audience_tags)) AS teacher_tagged
FROM series s
LEFT JOIN rabbis r ON r.id = s.rabbi_id;

-- ============================================================
-- HOW TO APPLY (run from project root):
--
--   supabase db push
--   -- OR, direct psql:
--   env -u HTTPS_PROXY -u HTTP_PROXY psql "$SUPABASE_DB_URL" \
--     -f supabase/migrations/20260430_audience_tags.sql
--
-- ROLLBACK (if needed):
--   DROP VIEW IF EXISTS series_with_audience;
--   ALTER TABLE lessons DROP COLUMN IF EXISTS audience_tags;
--   ALTER TABLE series  DROP COLUMN IF EXISTS audience_tags;
--   DROP INDEX IF EXISTS idx_series_audience_tags;
--   DROP INDEX IF EXISTS idx_lessons_audience_tags;
-- ============================================================
