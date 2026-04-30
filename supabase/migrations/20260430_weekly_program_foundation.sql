-- ============================================================
-- Weekly Program Foundation — Migration
-- 2026-04-30
--
-- Adds the infrastructure for the subscription-based weekly
-- chapter program ("הפרק השבועי").
--
-- Tables added:
--   1. user_access_tags            — fine-grained content access grants
--   2. weekly_program_progress     — per-user progress in the weekly program
--
-- Tables altered:
--   3. community_courses           — adds program_slug, access_type, access_tag
--   4. community_course_lessons    — adds week_number, bible_book, bible_chapter,
--                                    layer_type, summary_html, presentation_url,
--                                    drive_folder_url, published_at (already exists)
--
-- Functions added:
--   5. has_access_tag(p_user_id, p_tag) — SECURITY DEFINER check for access
--
-- Rollback: See bottom of this file.
-- Apply: env -u HTTPS_PROXY -u HTTP_PROXY psql "$SUPABASE_DB_URL" -f supabase/migrations/20260430_weekly_program_foundation.sql
-- ============================================================

-- ============================================================
-- 1. user_access_tags
-- ============================================================
-- Stores fine-grained content-access grants per user.
-- A row means: user X has been granted access to tag Y.
--
-- tag format convention:  "program:<slug>"
-- examples:               "program:weekly-chapter"
--                         "program:megillat-esther"
--                         "course:<course_id>"
--
-- valid_until NULL means "forever" (e.g. lifetime purchase or gift).
-- valid_until is updated by Grow webhook on every successful recurring charge.
--
-- pending_user_link = true when we imported the subscriber from Smoove
-- but the email hasn't registered a Supabase auth account yet.
-- Once the user signs up, we match by email and flip this to false.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_access_tags (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email              text,                                  -- kept for pending_user_link lookup
  tag                text NOT NULL,                         -- e.g. "program:weekly-chapter"
  granted_at         timestamptz NOT NULL DEFAULT now(),
  valid_until        timestamptz,                           -- NULL = forever; updated on recurring charge
  source             text NOT NULL DEFAULT 'manual',        -- 'grow_webhook' | 'smoove_import' | 'manual' | 'admin'
  grow_order_id      uuid REFERENCES public.grow_orders(id),-- FK to the Grow payment that created this row
  notes              text,
  pending_user_link  boolean NOT NULL DEFAULT false,        -- true when imported before user registered
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Unique: one active grant per (user/email, tag) — use upsert on conflict
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_access_tags_user_tag
  ON public.user_access_tags (user_id, tag)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_access_tags_email_tag
  ON public.user_access_tags (lower(email), tag)
  WHERE email IS NOT NULL AND pending_user_link = true;

-- GIN index for fast tag lookups
CREATE INDEX IF NOT EXISTS idx_user_access_tags_tag
  ON public.user_access_tags (tag);

CREATE INDEX IF NOT EXISTS idx_user_access_tags_user_id
  ON public.user_access_tags (user_id);

-- updated_at auto-trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_user_access_tags_updated_at ON public.user_access_tags;
CREATE TRIGGER trg_user_access_tags_updated_at
  BEFORE UPDATE ON public.user_access_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.user_access_tags ENABLE ROW LEVEL SECURITY;

-- Users can read their own grants
CREATE POLICY "user_access_tags: own read"
  ON public.user_access_tags FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "user_access_tags: admin all"
  ON public.user_access_tags FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert/update (webhook + import scripts)
-- (No explicit policy needed — service role bypasses RLS)


-- ============================================================
-- 2. weekly_program_progress
-- ============================================================
-- Per-user tracking for the weekly chapter program.
-- One row per (user, program_slug). Tracks which
-- book/chapter they're currently at and when they
-- last completed a chapter.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.weekly_program_progress (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_slug        text NOT NULL DEFAULT 'weekly-chapter',
  current_book        text,                        -- e.g. "חגי"
  current_chapter     integer,                     -- chapter number
  chapters_completed  integer NOT NULL DEFAULT 0,
  last_activity_at    timestamptz,
  streak_weeks        integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_slug)
);

DROP TRIGGER IF EXISTS trg_weekly_program_progress_updated_at ON public.weekly_program_progress;
CREATE TRIGGER trg_weekly_program_progress_updated_at
  BEFORE UPDATE ON public.weekly_program_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.weekly_program_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_program_progress: own read/write"
  ON public.weekly_program_progress FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "weekly_program_progress: admin all"
  ON public.weekly_program_progress FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));


-- ============================================================
-- 3. community_courses — add program_slug, access_type, access_tag
-- ============================================================
-- program_slug:  identifies this course as part of a named program
--                (e.g. "weekly-chapter"). NULL means standalone.
-- access_type:   "open" | "subscribers_only" | "requires_tag"
-- access_tag:    when access_type = "requires_tag", which tag grants access
--                (e.g. "program:weekly-chapter")
-- ============================================================

ALTER TABLE public.community_courses
  ADD COLUMN IF NOT EXISTS program_slug  text,
  ADD COLUMN IF NOT EXISTS access_type  text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS access_tag   text;

-- Index for quick lookup by program
CREATE INDEX IF NOT EXISTS idx_community_courses_program_slug
  ON public.community_courses (program_slug)
  WHERE program_slug IS NOT NULL;


-- ============================================================
-- 4. community_course_lessons — add weekly program columns
-- ============================================================
-- week_number:       the week-position in the program (1-indexed)
-- bible_book:        which Bible book this lesson covers
-- bible_chapter:     which chapter
-- layer_type:        "base"       — base content (may be public or subscriber-gated)
--                    "enrichment" — depth/commentary (subscribers only)
--                    "exercise"   — worksheet (subscribers only)
-- summary_html:      AI-generated or rabbi-written short summary
-- presentation_url:  link to the accompanying slide deck (Drive/CDN)
-- drive_folder_url:  the source Drive folder for this week's content
--
-- NOTE: published_at already exists in create-schema.sql — no-op here.
-- ============================================================

ALTER TABLE public.community_course_lessons
  ADD COLUMN IF NOT EXISTS week_number        integer,
  ADD COLUMN IF NOT EXISTS bible_book         text,
  ADD COLUMN IF NOT EXISTS bible_chapter      integer,
  ADD COLUMN IF NOT EXISTS layer_type         text NOT NULL DEFAULT 'base',
  ADD COLUMN IF NOT EXISTS summary_html       text,
  ADD COLUMN IF NOT EXISTS presentation_url   text,
  ADD COLUMN IF NOT EXISTS drive_folder_url   text;

-- NOTE: thumbnail_url for a community lesson (can point to Drive or CDN)
ALTER TABLE public.community_course_lessons
  ADD COLUMN IF NOT EXISTS thumbnail_url      text;

-- Index for bible lookups
CREATE INDEX IF NOT EXISTS idx_ccl_bible
  ON public.community_course_lessons (bible_book, bible_chapter)
  WHERE bible_book IS NOT NULL;

-- Index for layer_type (used in access-control queries)
CREATE INDEX IF NOT EXISTS idx_ccl_layer_type
  ON public.community_course_lessons (layer_type);


-- ============================================================
-- 5. has_access_tag(p_user_id, p_tag)
-- ============================================================
-- Returns TRUE if the user has an active (non-expired) grant
-- for the given tag. SECURITY DEFINER so it can be called
-- safely from RLS policies or client code without exposing
-- the underlying table.
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_access_tag(
  p_user_id uuid,
  p_tag     text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_access_tags
    WHERE user_id = p_user_id
      AND tag = p_tag
      AND pending_user_link = false
      AND (valid_until IS NULL OR valid_until > now())
  );
$$;

-- Grant execute to authenticated users (they can check their own access)
GRANT EXECUTE ON FUNCTION public.has_access_tag(uuid, text) TO authenticated;


-- ============================================================
-- ROLLBACK SCRIPT (keep in comments — run manually if needed)
-- ============================================================
-- To rollback this migration:
--
-- DROP FUNCTION IF EXISTS public.has_access_tag(uuid, text);
-- DROP TABLE IF EXISTS public.weekly_program_progress;
-- DROP TABLE IF EXISTS public.user_access_tags;
-- ALTER TABLE public.community_courses
--   DROP COLUMN IF EXISTS program_slug,
--   DROP COLUMN IF EXISTS access_type,
--   DROP COLUMN IF EXISTS access_tag;
-- ALTER TABLE public.community_course_lessons
--   DROP COLUMN IF EXISTS week_number,
--   DROP COLUMN IF EXISTS bible_book,
--   DROP COLUMN IF EXISTS bible_chapter,
--   DROP COLUMN IF EXISTS layer_type,
--   DROP COLUMN IF EXISTS summary_html,
--   DROP COLUMN IF EXISTS presentation_url,
--   DROP COLUMN IF EXISTS drive_folder_url,
--   DROP COLUMN IF EXISTS thumbnail_url;
-- ============================================================
