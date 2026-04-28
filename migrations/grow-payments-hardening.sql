-- Grow / Meshulam payment integration — hardening migration
-- Brings bnei zion's payment plumbing in line with the proven aboulafia recipe:
--   * stores transaction details (asmachta, card suffix, transaction_type_id)
--   * captures Grow-issued receipt numbers/URLs
--   * audit trail for ToS consent (raw_payload)
--   * Smoove subscription state per row
--   * payment_products whitelist (product ↔ Smoove list ↔ pageCode env ↔ installment cap)
--
-- Safe to run multiple times (IF NOT EXISTS guards everywhere).

-- ───── donations ─────
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS asmachta text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS card_suffix text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS transaction_type_id integer;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS raw_payload jsonb;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS invoice_url text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS invoice_id text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS smoove_subscribed boolean DEFAULT false;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS smoove_list_id integer;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS product text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS description text;

-- ───── orders ─────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS asmachta text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS card_suffix text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS transaction_type_id integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS raw_payload jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS smoove_subscribed boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS smoove_list_id integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS description text;

-- ───── payment_products ─────
-- Single source of truth for product wiring. The webhook + create-payment
-- both read from here. FALLBACK_RULES in code keeps things working if the
-- table is empty or the migration hasn't run yet.
CREATE TABLE IF NOT EXISTS public.payment_products (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  -- Grow flow type: 'wallet' (one-time SDK overlay) or 'directDebit' (redirect)
  type text NOT NULL CHECK (type IN ('wallet', 'directDebit')),
  -- Which env var holds the Grow pageCode for this product.
  -- Resolved at runtime as process.env['GROW_PAGECODE_' || page_code_env].
  page_code_env text NOT NULL,
  max_installments integer NOT NULL DEFAULT 1,
  smoove_list_id integer,
  smoove_list_name text,
  default_amount numeric,
  description text,
  -- Which DB table the order goes into ('orders' or 'donations')
  target_table text NOT NULL DEFAULT 'orders',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Two starter products
INSERT INTO public.payment_products
  (id, display_name, type, page_code_env, max_installments, smoove_list_id, smoove_list_name, default_amount, description, target_table)
VALUES
  ('weekly-chapter-subscription', 'מנוי הפרק השבועי',
   'directDebit', 'SUBSCRIPTION', 1,
   1045078, 'הפרק השבועי - תכנית מנויים',
   110, 'מנוי הפרק השבועי - בני ציון', 'orders'),
  ('book-megilat-esther', 'מגילת אסתר',
   'wallet', 'PRODUCTS', 3,
   1131982, 'מגילת אסתר',
   70, 'ספר מגילת אסתר - בני ציון', 'orders')
ON CONFLICT (id) DO UPDATE SET
  display_name      = EXCLUDED.display_name,
  type              = EXCLUDED.type,
  page_code_env     = EXCLUDED.page_code_env,
  max_installments  = EXCLUDED.max_installments,
  smoove_list_id    = EXCLUDED.smoove_list_id,
  smoove_list_name  = EXCLUDED.smoove_list_name,
  default_amount    = EXCLUDED.default_amount,
  description       = EXCLUDED.description,
  target_table      = EXCLUDED.target_table,
  updated_at        = now();
