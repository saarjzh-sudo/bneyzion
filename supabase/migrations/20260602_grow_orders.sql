-- ============================================================
-- grow_orders — Grow payment session log
-- 2026-06-02
--
-- Creates the `grow_orders` table that serves as a permanent
-- audit log for every Grow transaction (initial + recurring charges).
--
-- Design notes:
--   • The existing Grow webhook (api/grow/webhook.ts) writes
--     DIRECTLY to `orders` / `donations` (order_id comes from
--     cField1). grow_orders is an ADDITIONAL layer — it stores
--     the raw Grow transaction fields without replacing the
--     existing flow. The webhook already has a try/catch block
--     that silently skips grow_orders if the table doesn't exist.
--   • user_access_tags.grow_order_id FK is added here (the
--     weekly_program_foundation migration declared the column but
--     couldn't add the FK because this table didn't exist yet).
--   • target_table + linked_record_id allow tracing back to the
--     orders or donations row that was created/updated.
--
-- Apply:
--   env -u HTTPS_PROXY -u HTTP_PROXY psql "$SUPABASE_DB_URL" \
--     -f supabase/migrations/20260602_grow_orders.sql
-- Or via Management API (single query string — see KNOWLEDGE.md §7).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. grow_orders table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.grow_orders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Grow-issued identifiers
  grow_transaction_id   text,                       -- txData.transactionId
  asmachta              text,                       -- txData.asmachta (bank reference)
  process_id            text,                       -- txData.processId
  process_token         text,                       -- txData.processToken (sensitive — store temporarily)

  -- Page/merchant routing
  page_code             text,                       -- Grow pageCode used for this charge
  merchant_user_id      text,                       -- Grow userId (merchant account)

  -- Financial
  amount                numeric(10,2) NOT NULL,     -- txData.sum
  currency              text NOT NULL DEFAULT 'ILS',
  payment_status        text NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'failed'
  installments          integer NOT NULL DEFAULT 1,      -- txData.paymentsNum
  total_installments    integer,                         -- txData.allPaymentsNum (0 = recurring no-end)

  -- Card details
  card_suffix           text,                       -- txData.cardSuffix (last 4 digits)
  card_brand            text,                       -- txData.cardBrand
  card_type             text,                       -- txData.cardType
  card_exp              text,                       -- txData.cardExp

  -- Payment method
  payment_method        text,                       -- 'credit' | 'directDebit' | etc.
  transaction_type_id   integer,                    -- txData.transactionTypeId

  -- Customer
  customer_name         text,                       -- txData.fullName
  customer_email        text,                       -- txData.payerEmail
  customer_phone        text,                       -- txData.payerPhone

  -- Product / routing
  payment_product_id    text REFERENCES public.payment_products(id),  -- cField3
  flow_type             text,                       -- cField2: 'product' | 'donation' | 'wallet' | 'directDebit'

  -- Grow-issued receipt/invoice
  invoice_number        text,                       -- txData.invoiceNumber
  invoice_url           text,                       -- txData.invoiceUrl
  invoice_id            text,                       -- txData.invoiceId

  -- Link back to orders/donations row
  target_table          text,                       -- 'orders' | 'donations'
  linked_record_id      uuid,                       -- the orders.id or donations.id

  -- Raw payload (full webhook body)
  raw_payload           jsonb,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 2. Indexes
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_grow_orders_transaction_id
  ON public.grow_orders (grow_transaction_id);

CREATE INDEX IF NOT EXISTS idx_grow_orders_asmachta
  ON public.grow_orders (asmachta);

CREATE INDEX IF NOT EXISTS idx_grow_orders_customer_email
  ON public.grow_orders (lower(customer_email));

CREATE INDEX IF NOT EXISTS idx_grow_orders_linked_record
  ON public.grow_orders (target_table, linked_record_id);

CREATE INDEX IF NOT EXISTS idx_grow_orders_payment_product
  ON public.grow_orders (payment_product_id);

CREATE INDEX IF NOT EXISTS idx_grow_orders_created_at
  ON public.grow_orders (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 3. updated_at trigger (reuse existing function from weekly_program_foundation)
-- ────────────────────────────────────────────────────────────
-- set_updated_at() was created by 20260430_weekly_program_foundation.sql
-- We use CREATE OR REPLACE to be idempotent even if run before that migration.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_grow_orders_updated_at ON public.grow_orders;
CREATE TRIGGER trg_grow_orders_updated_at
  BEFORE UPDATE ON public.grow_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 4. RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.grow_orders ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS — webhook writes don't need a policy.
-- Admins can read/write all rows.
CREATE POLICY "grow_orders: admin all"
  ON public.grow_orders FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can read their own orders (by email)
CREATE POLICY "grow_orders: customer read own"
  ON public.grow_orders FOR SELECT
  USING (lower(customer_email) = lower(auth.jwt() ->> 'email'));

-- ────────────────────────────────────────────────────────────
-- 5. FK on user_access_tags.grow_order_id
--    The weekly_program_foundation migration added the column
--    but couldn't add the FK because grow_orders didn't exist.
--    Now that the table exists, add the constraint.
-- ────────────────────────────────────────────────────────────
-- Only add if user_access_tags exists and the column is present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_access_tags'
      AND column_name  = 'grow_order_id'
  ) THEN
    -- Drop existing FK if it exists (to allow re-run)
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name         = 'user_access_tags'
        AND constraint_name    = 'user_access_tags_grow_order_id_fkey'
    ) THEN
      ALTER TABLE public.user_access_tags
        DROP CONSTRAINT user_access_tags_grow_order_id_fkey;
    END IF;

    ALTER TABLE public.user_access_tags
      ADD CONSTRAINT user_access_tags_grow_order_id_fkey
      FOREIGN KEY (grow_order_id)
      REFERENCES public.grow_orders(id)
      ON DELETE SET NULL;

    RAISE NOTICE 'FK user_access_tags.grow_order_id → grow_orders.id added.';
  ELSE
    RAISE NOTICE 'user_access_tags.grow_order_id column not found — skipping FK (run weekly_program_foundation first).';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- Rollback (run manually if needed):
-- ────────────────────────────────────────────────────────────
-- ALTER TABLE public.user_access_tags DROP CONSTRAINT IF EXISTS user_access_tags_grow_order_id_fkey;
-- DROP TABLE IF EXISTS public.grow_orders;
