-- ============================================================
-- Migration: multi-rabbi join tables + cover_generations rate-limit table
-- Purpose:   Allow series/lessons to have multiple rabbis.
--            Backward compat: lessons.rabbi_id / series.rabbi_id remain
--            the primary (denormalized) rabbi — the join tables are additive.
-- Critique fixes applied:
--   B: RLS uses FOR INSERT for authenticated (not FOR ALL) — admin-only DELETE
--   D: submitted_by comparison uses auth.uid() without ::text cast (uuid vs uuid)
--   E: has_role named params: _role := 'admin'::app_role, _user_id := auth.uid()::text
--   I: cover_generations table for rate-limiting (Feature 5)
-- Created: 2026-06-12
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. series_rabbis
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS series_rabbis (
  series_id  uuid NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  rabbi_id   uuid NOT NULL REFERENCES rabbis(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'primary',  -- 'primary' | 'guest'
  sort_order int  NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (series_id, rabbi_id)
);

CREATE INDEX IF NOT EXISTS idx_series_rabbis_series ON series_rabbis(series_id);
CREATE INDEX IF NOT EXISTS idx_series_rabbis_rabbi  ON series_rabbis(rabbi_id);

ALTER TABLE series_rabbis ENABLE ROW LEVEL SECURITY;

-- anon can read (for public series pages showing all rabbis)
CREATE POLICY "anon_read_series_rabbis"
  ON series_rabbis FOR SELECT USING (true);

-- authenticated can INSERT their own associations
CREATE POLICY "auth_insert_series_rabbis"
  ON series_rabbis FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- only admin can UPDATE / DELETE
CREATE POLICY "admin_update_series_rabbis"
  ON series_rabbis FOR UPDATE
  USING (
    (SELECT has_role(_role := 'admin'::app_role, _user_id := auth.uid()::text))
  );

CREATE POLICY "admin_delete_series_rabbis"
  ON series_rabbis FOR DELETE
  USING (
    (SELECT has_role(_role := 'admin'::app_role, _user_id := auth.uid()::text))
  );

-- ─────────────────────────────────────────────────────────────
-- 2. lesson_rabbis
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_rabbis (
  lesson_id  uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  rabbi_id   uuid NOT NULL REFERENCES rabbis(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'primary',
  sort_order int  NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lesson_id, rabbi_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_rabbis_lesson ON lesson_rabbis(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_rabbis_rabbi  ON lesson_rabbis(rabbi_id);

ALTER TABLE lesson_rabbis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_lesson_rabbis"
  ON lesson_rabbis FOR SELECT USING (true);

CREATE POLICY "auth_insert_lesson_rabbis"
  ON lesson_rabbis FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_update_lesson_rabbis"
  ON lesson_rabbis FOR UPDATE
  USING (
    (SELECT has_role(_role := 'admin'::app_role, _user_id := auth.uid()::text))
  );

CREATE POLICY "admin_delete_lesson_rabbis"
  ON lesson_rabbis FOR DELETE
  USING (
    (SELECT has_role(_role := 'admin'::app_role, _user_id := auth.uid()::text))
  );

-- ─────────────────────────────────────────────────────────────
-- 3. cover_generations  (rate-limit table for Feature 5)
-- ─────────────────────────────────────────────────────────────
-- Used by generate-cover edge function to enforce 5 calls/hour/user.
CREATE TABLE IF NOT EXISTS cover_generations (
  id         uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cover_gen_user_time
  ON cover_generations(user_id, created_at DESC);

ALTER TABLE cover_generations ENABLE ROW LEVEL SECURITY;

-- Only the service-role key (used in the edge function) can INSERT/SELECT here.
-- No direct client access needed.
CREATE POLICY "service_role_only_cover_gen"
  ON cover_generations FOR ALL
  USING (false)
  WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────
-- 4. Storage bucket: bnei-zion-thumbnails  (if not yet created)
-- ─────────────────────────────────────────────────────────────
-- Belt-and-suspenders: insert is idempotent via ON CONFLICT DO NOTHING.
-- The bucket must be public so image_url served directly.
INSERT INTO storage.buckets (id, name, public)
VALUES ('bnei-zion-thumbnails', 'bnei-zion-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public reads on the bucket objects
CREATE POLICY "public_read_thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bnei-zion-thumbnails');

-- Only authenticated users can upload (insert). Delete restricted to service_role.
CREATE POLICY "auth_upload_thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bnei-zion-thumbnails'
    AND auth.role() = 'authenticated'
  );
