-- 27.5.2026 — Newsletter signups from homepage NewsletterSection
-- One row per email per source. Public can INSERT, only service_role can SELECT/UPDATE.
-- Saar exports to Smoove via cron / manual sync.

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  first_name   text,
  source       text DEFAULT 'homepage',     -- where the signup happened
  consent_at   timestamptz NOT NULL DEFAULT now(),
  consent_ip   inet,
  smoove_id    bigint,                       -- backfilled after Smoove import
  exported_at  timestamptz,
  unsubscribed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- One email per source (re-signup from same source = no-op, blocks ddos)
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_source_idx
  ON public.newsletter_subscribers (lower(email), source);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_exported_idx
  ON public.newsletter_subscribers (exported_at)
  WHERE exported_at IS NULL;

-- RLS: anon can INSERT only, nothing else. service_role full access.
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can subscribe"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "authenticated can subscribe"
  ON public.newsletter_subscribers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.newsletter_subscribers IS 'Homepage newsletter signups. Saar exports to Smoove list_id [TBD] manually or via cron.';
