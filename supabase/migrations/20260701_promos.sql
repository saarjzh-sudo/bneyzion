-- ============================================================
-- Migration: promos — global banners / popups / conference strips
-- Track:     T09 promo-popups
-- Purpose:   One managed table that drives site-wide promotional
--            messages: a quiet top banner, a modal popup, or a
--            conference strip. T01 admin READS/manages this table;
--            T09 only defines the schema + public read.
-- Status:    READY — NOT yet applied. Saar must confirm before running.
--            (Table is queried defensively by the client: a missing
--             table simply renders nothing, never crashes.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.promos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which surface renders this promo:
  --   'banner'     → quiet top strip (allowed on every page, incl. product/learning)
  --   'popup'      → modal dialog (suppressed by default on product + learning pages)
  --   'conference' → slim conference/event strip under the header
  type                text NOT NULL DEFAULT 'banner'
                        CHECK (type IN ('banner', 'popup', 'conference')),

  -- Content (all external-facing Hebrew — managed from the admin)
  title               text,
  body                text,
  cta_label           text,
  cta_url             text,
  image_url           text,

  -- Targeting: matches the site-wide audience_tags convention.
  -- Empty array = show to everyone. Otherwise the current audience must
  -- overlap (e.g. ARRAY['teachers'], ARRAY['weekly-learners']).
  audience_tags       text[] NOT NULL DEFAULT '{}',

  -- Ordering when several promos of the same type are active at once.
  -- Higher wins; only the top one of each surface is shown.
  priority            integer NOT NULL DEFAULT 0,

  -- Re-appearance cap, enforced client-side via localStorage:
  --   'always'  → show every page load
  --   'session' → once per browser session (default)
  --   'once'    → once ever (until the visitor clears storage)
  --   'daily'   → at most once per calendar day
  frequency           text NOT NULL DEFAULT 'session'
                        CHECK (frequency IN ('always', 'session', 'once', 'daily')),

  -- Can the visitor close it? (banners/popups: yes; a hard notice: no)
  dismissible         boolean NOT NULL DEFAULT true,

  -- Default-OFF safety switches for popups. A popup is auto-suppressed on
  -- product pages (/store, /course, /checkout) and learning pages
  -- (/lessons, portal, player) unless these are explicitly set to false.
  suppress_on_product   boolean NOT NULL DEFAULT true,
  suppress_on_learning  boolean NOT NULL DEFAULT true,

  -- Visual variant, mapped to the design tokens (gold / olive / navy).
  theme               text NOT NULL DEFAULT 'gold'
                        CHECK (theme IN ('gold', 'olive', 'navy')),

  -- Scheduling window (NULL = open-ended on that side).
  starts_at           timestamptz,
  ends_at             timestamptz,

  -- Master on/off switch.
  is_active           boolean NOT NULL DEFAULT true,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Fast "what is live right now" lookup.
CREATE INDEX IF NOT EXISTS promos_active_idx
  ON public.promos (type, priority DESC)
  WHERE is_active = true;

-- GIN index for audience overlap queries (audience_tags && ARRAY[...]).
CREATE INDEX IF NOT EXISTS promos_audience_tags_idx
  ON public.promos USING GIN (audience_tags);

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION public.promos_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS promos_updated_at ON public.promos;
CREATE TRIGGER promos_updated_at
  BEFORE UPDATE ON public.promos
  FOR EACH ROW EXECUTE FUNCTION public.promos_set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────
-- Public may read only ACTIVE promos. Admins (T01 dashboard) manage all.
ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public reads active promos"
  ON public.promos
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "admins read all promos"
  ON public.promos
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert promos"
  ON public.promos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update promos"
  ON public.promos
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete promos"
  ON public.promos
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.promos IS
  'Site-wide promo system (T09). type=banner|popup|conference. Popups auto-suppressed on product/learning pages unless suppress_on_* set false. Managed by T01 admin.';
