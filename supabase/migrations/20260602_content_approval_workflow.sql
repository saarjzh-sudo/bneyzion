-- ============================================================
-- Migration: content approval workflow
-- Purpose:   Support draft → pending_review → published flow
--            for lessons + series + community_course_lessons.
--            Creators upload as pending_review; admins approve.
-- Status:    READY — apply via psql or Supabase dashboard
-- Created:   2026-06-02
-- ============================================================

-- ---- 1. lessons: add approval columns -------------------------

-- submitted_by: uuid of the creator who submitted for review
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id);

-- reviewed_by: uuid of the admin who approved/rejected
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

-- published_at already exists in create-schema.sql — skip
-- submitted_at: when it was sent for review
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- review_note: optional feedback when returning to draft
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS review_note text;

-- Extend status to allow 'pending_review'
-- (status is text, so no enum change needed — just document it)
-- Valid values: draft | pending_review | published | archived
-- Existing rows default to their current status unchanged.

-- Index for quick pending_review queue
CREATE INDEX IF NOT EXISTS idx_lessons_pending_review
  ON public.lessons(status)
  WHERE status = 'pending_review';

-- ---- 2. series: add approval columns --------------------------

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id);

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS review_note text;

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_series_pending_review
  ON public.series(status)
  WHERE status = 'pending_review';

-- ---- 3. community_course_lessons: add approval columns --------

ALTER TABLE public.community_course_lessons
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id);

ALTER TABLE public.community_course_lessons
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

ALTER TABLE public.community_course_lessons
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

ALTER TABLE public.community_course_lessons
  ADD COLUMN IF NOT EXISTS review_note text;

CREATE INDEX IF NOT EXISTS idx_ccl_pending_review
  ON public.community_course_lessons(status)
  WHERE status = 'pending_review';

-- ---- 4. Backfill: existing published rows keep their status ---
-- Nothing to do — existing rows have status='published' or 'draft'
-- and the new columns default to NULL, which is correct.

-- ---- 5. RLS note -----------------------------------------------
-- Creators can INSERT lessons with status='pending_review'.
-- The existing "public read on content" policy must be updated
-- to exclude pending_review rows from public view.
-- Add this RLS update to the security sweep when deploying:
--   lessons: public read WHERE status = 'published'
--   (already enforced by existing policy — pending_review rows won't appear)
