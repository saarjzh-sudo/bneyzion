-- Migration: get_public_rabbis() RPC
-- Created: 2026-06-03 (round-9)
-- Updated: 2026-06-03 (round-11) — fixed 3 bugs:
--   1. Added status='category' to the EXISTS clause for category-only series
--   2. Added direct-lesson fallback for rabbis with no series container
--   3. Refined category clause to exclude creator entries like ישקו העדרים:
--      category-status + general + teachers is a "tools" series (maps/aids),
--      not a public rabbi. Require category-status series to be exclusively general.
--
-- WHY: usePublicRabbis() previously returned ALL rabbis with lesson_count>0,
--      including 17 teacher-only creators (ישקו העדרים, מכון דעת סופרים,
--      הרב עדי איצקוביץ', תלמוד תורה מורשה, etc.) who should only appear
--      in the Teachers Wing, not the public sidebar.
--
--      The round-9 version (status IN 'active','published' only) excluded ~85
--      valid public rabbis whose series only had status='category'.
--      This round-11 version fixes that while correctly filtering ישקו.
--
-- Result: ~167 public rabbis (vs 68 in broken round-9 version, vs 153 in old site)
-- The 14 gap vs old site: all acceptable (lc=0 historical rabbis + name-format diffs)
--
-- Run: paste into Supabase Dashboard → SQL Editor → Run
-- OR:  curl -s --noproxy '*' -X POST https://api.supabase.com/v1/projects/pzvmwfexeiruelwiujxn/database/query ...

CREATE OR REPLACE FUNCTION public.get_public_rabbis()
RETURNS TABLE (
  id          uuid,
  name        text,
  slug        text,
  title       text,
  bio         text,
  image_url   text,
  specialty   text,
  status      text,
  lesson_count integer,
  created_at  timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT
    r.id, r.name, r.slug, r.title, r.bio,
    r.image_url, r.specialty, r.status,
    r.lesson_count, r.created_at
  FROM rabbis r
  WHERE
    r.status = 'active'
    AND r.lesson_count > 0
    AND (
      -- Clause 1: published/active series with 'general' tag (allows mixed teachers+general)
      -- This covers: regular public rabbis, שמעון לוי, מנחם אליהו, etc.
      EXISTS (
        SELECT 1 FROM series s
        WHERE s.rabbi_id = r.id
          AND s.status IN ('active', 'published')
          AND 'general' = ANY(s.audience_tags)
      )
      OR
      -- Clause 2: category-status series that are EXCLUSIVELY 'general' (not also 'teachers')
      -- This covers: rabbis whose content is organized under category-nodes for public browsing.
      -- The NOT teachers guard prevents ישקו העדרים from passing via their
      -- "כלי עזר - טבלאות זמני המאורעות ומפות" series which has ['teachers','general']
      -- (that series is teaching-tools, not a public rabbi profile).
      EXISTS (
        SELECT 1 FROM series s
        WHERE s.rabbi_id = r.id
          AND s.status = 'category'
          AND 'general' = ANY(s.audience_tags)
          AND NOT 'teachers' = ANY(s.audience_tags)
      )
      OR
      -- Clause 3: rabbis with direct lessons but no series container at all
      -- (55 rabbis in old site had no series; their lessons attach directly to the rabbi)
      (
        r.lesson_count > 0
        AND NOT EXISTS (
          SELECT 1 FROM series s2
          WHERE s2.rabbi_id = r.id
            AND 'teachers' = ANY(s2.audience_tags)
            AND NOT 'general' = ANY(s2.audience_tags)
        )
        AND NOT EXISTS (
          SELECT 1 FROM series s3 WHERE s3.rabbi_id = r.id
        )
      )
    )
  ORDER BY r.lesson_count DESC;
$$;

-- Grant access to anon and authenticated roles (public read)
GRANT EXECUTE ON FUNCTION public.get_public_rabbis() TO anon, authenticated;
