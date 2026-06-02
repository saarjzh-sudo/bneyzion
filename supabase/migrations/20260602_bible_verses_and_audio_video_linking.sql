-- ============================================================
-- Migration: bible_verses table + audio/video linking
-- 2026-06-02
--
-- Purpose:
--   1. bible_verses — native verse storage (replaces Sefaria external links)
--   2. community_course_lessons: add reading_chapter INT for native reader link
--   3. community_course_lessons: add audio_url TEXT for audio↔video unification
--
-- This supports:
--   - Decision 2: Native bible chapter reader (no external Sefaria link)
--   - Decision 3: audio + video on same lesson row
--
-- Apply:
--   env -u HTTPS_PROXY -u HTTP_PROXY psql "$SUPABASE_DB_URL" \
--     -f supabase/migrations/20260602_bible_verses_and_audio_video_linking.sql
-- ============================================================

-- ============================================================
-- 1. bible_verses
-- ============================================================
-- Stores Masoretic (nikud) text per verse.
-- Populated once via fetch_ezra_verses.py (Sefaria public API).
-- Primary key: (book, chapter, verse) — unique constraint.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bible_verses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book        text NOT NULL,          -- Hebrew: "עזרא", "נחמיה", etc.
  chapter     integer NOT NULL,       -- 1-based
  verse       integer NOT NULL,       -- 1-based
  text_he     text NOT NULL,          -- Full verse text with nikud (from Sefaria)
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book, chapter, verse)
);

-- Indexes for fast chapter lookups
CREATE INDEX IF NOT EXISTS idx_bible_verses_book_chapter
  ON public.bible_verses (book, chapter);

-- RLS: public read (no auth needed — Torah is public domain)
ALTER TABLE public.bible_verses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bible_verses: public read"
  ON public.bible_verses FOR SELECT
  USING (true);

-- Admin can insert/update (for initial population + future books)
CREATE POLICY "bible_verses: admin write"
  ON public.bible_verses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role bypasses RLS (used by fetch script)


-- ============================================================
-- 2. community_course_lessons — add reading_chapter + audio_url
-- ============================================================
-- reading_chapter: when type=reading, store chapter number here.
--   Frontend uses: SELECT text_he FROM bible_verses
--     WHERE book = ccl.bible_book AND chapter = ccl.reading_chapter
--     ORDER BY verse
--   instead of linking to Sefaria.
--
-- audio_url: existing audio lesson from lessons table.
--   For "ביאור הפרק - הרב יונדב זר": the S3 audio and Drive video
--   are unified on a single community_course_lessons row.
--   audio_url = S3 mp3 URL from lessons table
--   video_url = Drive /preview iframe URL (already set from import)
-- ============================================================

ALTER TABLE public.community_course_lessons
  ADD COLUMN IF NOT EXISTS reading_chapter  integer,
  ADD COLUMN IF NOT EXISTS audio_url        text;

-- Index for native reader lookups
CREATE INDEX IF NOT EXISTS idx_ccl_reading_chapter
  ON public.community_course_lessons (bible_book, reading_chapter)
  WHERE reading_chapter IS NOT NULL;

-- ============================================================
-- ROLLBACK (keep in comments)
-- ============================================================
-- DROP TABLE IF EXISTS public.bible_verses;
-- ALTER TABLE public.community_course_lessons
--   DROP COLUMN IF EXISTS reading_chapter,
--   DROP COLUMN IF EXISTS audio_url;
-- ============================================================
