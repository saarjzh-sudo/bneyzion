-- ============================================================
-- Migration: lesson_dedications system — "הקדשת שיעור/סדרה"
-- Track:     dedication-system (Saar, 6.7.2026)
-- Purpose:   Let a visitor dedicate a lesson OR a series ("Le'ilui
--            nishmat" / in-honor-of), pay via the EXISTING Grow flow
--            (api/grow/create-payment.ts + api/grow/webhook.ts), and
--            have the dedication go live AUTOMATICALLY on successful
--            payment — no manual admin approval in the normal flow.
--
-- Status:    READY — NOT yet applied. Additive only (no destructive
--            drops). Saar runs sequentially with a fresh backup.
--
-- IMPORTANT — table already exists live (pre-dates tracked migrations,
-- like `payment_products`). This migration only ALTERs it (adds columns
-- + fixes RLS) — it does not recreate it. All ALTERs use IF NOT EXISTS /
-- defensive guards so re-running is safe.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. lesson_dedications — add series scope + payment fields
-- ────────────────────────────────────────────────────────────
-- Existing live columns (confirmed via src/integrations/supabase/types.ts):
--   id uuid, lesson_id uuid NOT NULL REFERENCES lessons(id),
--   dedication_type text NOT NULL DEFAULT '...', dedicated_name text NOT NULL,
--   dedicator_name text, message text, status text NOT NULL DEFAULT '...',
--   user_id uuid, amount numeric, created_at timestamptz NOT NULL DEFAULT now()
--
-- This ALTER block only adds what's missing for the new scope + payment flow.

-- 1a. lesson_id becomes optional — a series-scoped dedication has no lesson_id.
ALTER TABLE public.lesson_dedications
  ALTER COLUMN lesson_id DROP NOT NULL;

-- 1b. series_id — the other half of the scope (mutually exclusive with lesson_id).
ALTER TABLE public.lesson_dedications
  ADD COLUMN IF NOT EXISTS series_id uuid REFERENCES public.series(id);

-- 1c. scope — explicit discriminator, avoids relying on which FK is null.
ALTER TABLE public.lesson_dedications
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'lesson';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lesson_dedications_scope_check'
  ) THEN
    ALTER TABLE public.lesson_dedications
      ADD CONSTRAINT lesson_dedications_scope_check
      CHECK (scope IN ('lesson', 'series'));
  END IF;
END $$;

-- 1d. Exactly one of lesson_id / series_id must be set, matching `scope`.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lesson_dedications_scope_target_check'
  ) THEN
    ALTER TABLE public.lesson_dedications
      ADD CONSTRAINT lesson_dedications_scope_target_check
      CHECK (
        (scope = 'lesson' AND lesson_id IS NOT NULL AND series_id IS NULL)
        OR
        (scope = 'series' AND series_id IS NOT NULL AND lesson_id IS NULL)
      );
  END IF;
END $$;

-- 1e. Payment trail fields — mirror the donations/orders convention
-- (asmachta = bank reference, used for idempotent webhook dedup; paid_at =
-- when Grow confirmed the charge, distinct from created_at = when the
-- pending row was first inserted at checkout time).
ALTER TABLE public.lesson_dedications
  ADD COLUMN IF NOT EXISTS asmachta text;

ALTER TABLE public.lesson_dedications
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- amount already exists (numeric, nullable) per current schema — confirmed via
-- src/integrations/supabase/types.ts (Row.amount: number | null). No ALTER needed.

-- Buyer contact fields — needed to email/thank the dedicator and to dedup
-- against grow_orders / show in admin. Nullable — legacy rows won't have them.
ALTER TABLE public.lesson_dedications
  ADD COLUMN IF NOT EXISTS dedicator_email text;
ALTER TABLE public.lesson_dedications
  ADD COLUMN IF NOT EXISTS dedicator_phone text;

-- Full Grow payload for audit/debug (same convention as donations.raw_payload).
ALTER TABLE public.lesson_dedications
  ADD COLUMN IF NOT EXISTS raw_payload jsonb;

-- updated_at — status can change later (e.g. admin hides an abusive dedication).
ALTER TABLE public.lesson_dedications
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- status: existing default is likely 'pending' or similar — normalize the
-- allowed values explicitly (idempotent: only adds constraint if missing).
-- SAFETY: skip adding the CHECK (instead of failing the whole migration) if
-- any live row already has a status outside this set — surfaces as a NOTICE
-- so Saar can decide what to do with the outlier rows, per "never invent /
-- list for yoav" — we do not silently coerce unknown statuses.
DO $$
DECLARE
  bad_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lesson_dedications_status_check'
  ) THEN
    SELECT count(*) INTO bad_count
      FROM public.lesson_dedications
      WHERE status IS NOT NULL AND status NOT IN ('pending', 'active', 'hidden', 'refunded');
    IF bad_count > 0 THEN
      RAISE NOTICE 'lesson_dedications: % row(s) with status outside (pending,active,hidden,refunded) — CHECK constraint NOT added, review manually', bad_count;
    ELSE
      ALTER TABLE public.lesson_dedications
        ADD CONSTRAINT lesson_dedications_status_check
        CHECK (status IN ('pending', 'active', 'hidden', 'refunded'));
    END IF;
  END IF;
END $$;

-- Idempotent webhook dedup key — a dedication payment should only ever
-- create ONE row per asmachta (mirrors the orders/donations dedup pattern
-- in grow-webhook-sync, minus the charge_date component since dedications
-- are always one-time/wallet, never recurring).
CREATE UNIQUE INDEX IF NOT EXISTS lesson_dedications_asmachta_uidx
  ON public.lesson_dedications (asmachta)
  WHERE asmachta IS NOT NULL;

CREATE INDEX IF NOT EXISTS lesson_dedications_series_idx
  ON public.lesson_dedications (series_id) WHERE series_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS lesson_dedications_lesson_idx
  ON public.lesson_dedications (lesson_id) WHERE lesson_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS lesson_dedications_status_idx
  ON public.lesson_dedications (status);

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION public.lesson_dedications_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lesson_dedications_updated_at ON public.lesson_dedications;
CREATE TRIGGER lesson_dedications_updated_at
  BEFORE UPDATE ON public.lesson_dedications
  FOR EACH ROW EXECUTE FUNCTION public.lesson_dedications_set_updated_at();

COMMENT ON TABLE public.lesson_dedications IS
  'הקדשת שיעור/סדרה — visitor dedicates a lesson or series (in memory of / in honor of), pays via Grow, goes active automatically on webhook confirmation. scope discriminates lesson_id vs series_id (mutually exclusive, enforced by CHECK). Dedup by asmachta.';

-- ────────────────────────────────────────────────────────────
-- 2. RLS fix — ⚠️ CRITICAL (Saar's exact instruction)
-- ────────────────────────────────────────────────────────────
-- Current live state: a single policy "user_own" with cmd=ALL, which in
-- practice blocks public SELECT of active dedications on lesson/series
-- pages (only the row's own user_id can see it, and only if authenticated
-- with a matching user_id — anon visitors see nothing). Replace with:
--   • Public (anon + authenticated) may SELECT rows with status='active'
--     — this is what lesson/series pages render (Rule #4: full content
--     only for active dedications, never pending/hidden ones).
--   • Authenticated users may additionally SELECT their OWN rows regardless
--     of status (so a buyer can see their pending dedication on a
--     "my dedications" screen while it's still processing).
--   • INSERT / UPDATE are SERVICE ROLE ONLY — the public never writes a
--     dedication row directly. The row is created at checkout time by
--     api/grow/create-payment.ts (service role) as 'pending', then flipped
--     to 'active' by the webhook (service role) on successful payment.
--     This matches Saar's "בתשלום → אוטומטי" model without opening a
--     public write path that could be abused to fake a dedication.
--   • Admins get full access for moderation (hide an abusive entry, etc.)
--     via public.has_role(auth.uid(), 'admin') — same helper used by
--     promos/bible_verses/grow_orders policies.

ALTER TABLE public.lesson_dedications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own" ON public.lesson_dedications;
-- Defensive: drop any other pre-existing policy names we might collide with.
DROP POLICY IF EXISTS "lesson_dedications_user_own" ON public.lesson_dedications;
DROP POLICY IF EXISTS "public reads active dedications" ON public.lesson_dedications;
DROP POLICY IF EXISTS "users read own dedications" ON public.lesson_dedications;
DROP POLICY IF EXISTS "service role writes dedications" ON public.lesson_dedications;
DROP POLICY IF EXISTS "admins manage dedications" ON public.lesson_dedications;

CREATE POLICY "public reads active dedications"
  ON public.lesson_dedications
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "users read own dedications"
  ON public.lesson_dedications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- service_role bypasses RLS by default in Supabase, but we declare an
-- explicit policy too for clarity/auditability (belt + suspenders — matches
-- the promos.sql style of naming every operation explicitly).
CREATE POLICY "service role writes dedications"
  ON public.lesson_dedications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "service role updates dedications"
  ON public.lesson_dedications
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admins manage dedications"
  ON public.lesson_dedications
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ────────────────────────────────────────────────────────────
-- 3. dedication_settings — single-row admin-configurable pricing
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dedication_settings (
  id            integer PRIMARY KEY DEFAULT 1,
  price_lesson  numeric NOT NULL DEFAULT 600,
  price_series  numeric NOT NULL DEFAULT 1800,
  enabled       boolean NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dedication_settings_singleton CHECK (id = 1)
);

INSERT INTO public.dedication_settings (id, price_lesson, price_series, enabled)
VALUES (1, 600, 1800, true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.dedication_settings_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dedication_settings_updated_at ON public.dedication_settings;
CREATE TRIGGER dedication_settings_updated_at
  BEFORE UPDATE ON public.dedication_settings
  FOR EACH ROW EXECUTE FUNCTION public.dedication_settings_set_updated_at();

ALTER TABLE public.dedication_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public reads dedication settings" ON public.dedication_settings;
DROP POLICY IF EXISTS "admins update dedication settings" ON public.dedication_settings;
DROP POLICY IF EXISTS "admins insert dedication settings" ON public.dedication_settings;

-- Public must read this (the /dedicate checkout UI needs the live prices
-- and the enabled flag) but never write it.
CREATE POLICY "public reads dedication settings"
  ON public.dedication_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admins update dedication settings"
  ON public.dedication_settings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert dedication settings"
  ON public.dedication_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.dedication_settings IS
  'Single-row (id=1) admin-configurable pricing for the הקדשת שיעור/סדרה system. price_lesson/price_series in ILS. enabled=false hides the dedicate CTA site-wide without touching code.';

-- ────────────────────────────────────────────────────────────
-- 4. payment_products wiring — reuse the EXISTING Grow flow
-- ────────────────────────────────────────────────────────────
-- Two products so the checkout UI (useGrowPayment.startPayment) can pass
-- meta.product='dedication-lesson' or 'dedication-series' exactly like any
-- other product-driven purchase. type='wallet' = one-time (no direct debit —
-- a dedication is a single payment, never recurring).
--
-- default_amount mirrors dedication_settings at migration time; the ADMIN
-- price (dedication_settings) is the live source of truth the checkout page
-- should read for the displayed price — default_amount here is only the
-- Grow-side fallback / historical snapshot, same role FALLBACK_PRODUCTS
-- plays in api/grow/create-payment.ts.
--
-- target_table = 'lesson_dedications' is a NEW value (previously only
-- 'orders' | 'donations' existed by convention). api/grow/webhook.ts's
-- targetTable variable is untyped `string`, so this does not break existing
-- logic — but webhook.ts's row-shape assumptions (customer_name/donor_name
-- column presence) do NOT match lesson_dedications' columns
-- (dedicated_name/dedicator_name). See report §"Risks" — a small
-- webhook.ts change (out of this task's file scope) is required to
-- special-case target_table === 'lesson_dedications' the same way it
-- already special-cases 'orders' with the `status` column.
INSERT INTO public.payment_products
  (id, display_name, active, type, page_code_env, max_installments, target_table, default_amount, description)
VALUES
  ('dedication-lesson', 'הקדשת שיעור', true, 'wallet', 'PRODUCTS', 1, 'lesson_dedications', 600,
   'הקדשת שיעור בודד לעילוי נשמה / לרפואה / לזכר'),
  ('dedication-series', 'הקדשת סדרה', true, 'wallet', 'PRODUCTS', 1, 'lesson_dedications', 1800,
   'הקדשת סדרה שלמה לעילוי נשמה / לרפואה / לזכר')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  type = EXCLUDED.type,
  target_table = EXCLUDED.target_table,
  description = EXCLUDED.description;

-- ────────────────────────────────────────────────────────────
-- 5. grow_webhook_log — allow 'lesson_dedications' as a target_table value
-- ────────────────────────────────────────────────────────────
-- grow_webhook_log.target_table (added in 20260602_grow_orders.sql-era /
-- grow-webhook-sync) is free text already — no constraint to update.
-- Nothing to do here; noted for completeness / future readers.
