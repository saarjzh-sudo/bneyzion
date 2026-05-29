-- Yehoshua campaign — extend donations table for full admin reporting
-- Safe to run multiple times (IF NOT EXISTS guards everywhere).
-- Run with:
--   env -u HTTPS_PROXY -u HTTP_PROXY psql "$SUPABASE_DB_URL" \
--     -f migrations/yehoshua-campaign-donations.sql

-- ── Campaign tracking columns on donations ─────────────────────────────────
-- source: identifies which campaign/form this donation came from
--         e.g. 'yehoshua-campaign', 'general', 'donate-page'
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS source text;

-- tier_id: the tier identifier chosen by the donor
--          e.g. 'tier-90', 'tier-120', 'tier-400', 'tier-2000', 'free'
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS tier_id text;

-- tier_name: human-readable tier name at time of purchase
--            e.g. 'מחיר מיוחד — 200 ראשונים', 'ספר + הקדשה'
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS tier_name text;

-- tier_perks: JSON array of perks included in the tier
--             e.g. '["ספר יהושע פיזי", "משלוח עד הבית"]'
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS tier_perks jsonb;

-- ── Indexes for admin reporting ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS donations_source_idx
  ON public.donations (source);

CREATE INDEX IF NOT EXISTS donations_source_status_idx
  ON public.donations (source, payment_status);

-- ── Admin report view ─────────────────────────────────────────────────────
-- View: v_yehoshua_campaign_report
-- Returns all donations from the yehoshua campaign with full details.
-- Accessible via: SELECT * FROM v_yehoshua_campaign_report ORDER BY created_at DESC;
CREATE OR REPLACE VIEW public.v_yehoshua_campaign_report AS
SELECT
  id,
  created_at,
  donor_name,
  phone,
  donor_email,
  amount,
  payment_status,
  tier_id,
  tier_name,
  tier_perks,
  payment_id,        -- Grow transaction ID
  asmachta,
  card_suffix,
  invoice_number,
  invoice_url,
  raw_payload        -- contains consent audit trail + webhook data
FROM public.donations
WHERE source = 'yehoshua-campaign'
ORDER BY created_at DESC;

-- ── RLS: view inherits donations RLS (admin-only select on donations) ──────
-- No additional RLS needed — the view is backed by donations which already
-- has RLS that allows only authenticated admins to read rows.

-- ── Summary aggregate (for progress well) ─────────────────────────────────
-- Used by the React hook useCampaignRaised:
--   SELECT COALESCE(SUM(amount), 0) AS raised,
--          COUNT(*) AS supporters
--   FROM donations
--   WHERE source = 'yehoshua-campaign'
--     AND payment_status = 'completed';
-- No view needed — the query is simple enough to run inline from the hook.
