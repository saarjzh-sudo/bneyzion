-- ============================================================================
-- רמה 17 · עמוד "משתמשים" מאוחד — RPC admin_unified_users()
-- ============================================================================
-- רשומת-אדם אחת לכל email (union מ-profiles / user_access_tags / donations /
-- orders), עם דגלים: חשבון / מנוי-פעיל / היה-מנוי / תורם / קונה + מקור-אמת
-- (charge אחרון של הו"ק ב-Grow). read-only — אין שום mutation.
--
-- אבטחה (fail-closed):
--   * SECURITY DEFINER — נחוץ כי orders/donations חסומות RLS (user_own),
--     בדיוק כמו הדפוס הקיים של grow_subscription_stats().
--   * שער כניסה: has_role(auth.uid(),'admin') — אחרת EXCEPTION.
--   * REVOKE מ-PUBLIC/anon, GRANT ל-authenticated בלבד.
--
-- ⚠️ לא להריץ בלי אישור מפורש של סער (מודל-אבטחה = אישור לכל מדרגה).
-- ============================================================================

-- ── 1. הרשימה הראשית: שורה לכל אדם (email) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_unified_users()
RETURNS TABLE (
  email                text,
  full_name            text,
  phone                text,
  user_id              uuid,        -- profiles.id אם פתח חשבון
  has_account          boolean,
  tags                 jsonb,       -- [{tag,source,granted_at,valid_until,cancelled_at,active}]
  is_subscriber_active boolean,     -- יש tag פעיל (weekly/eicha)
  was_subscriber       boolean,     -- היה tag אי-פעם
  donation_total       numeric,
  donation_count       integer,
  last_donation_date   date,
  has_monthly_donation boolean,
  purchase_count       integer,
  purchase_total       numeric,
  purchased_products   jsonb,       -- מזהי מוצרים שנקנו (distinct)
  last_sub_charge      date,        -- charge אחרון של מוצר הו"ק (directDebit) — מקור-האמת
  last_any_charge      date,
  first_seen           timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'access denied: admin only';
  END IF;

  RETURN QUERY
  WITH emails AS (
    SELECT lower(trim(p.email)) AS em FROM profiles p
      WHERE p.email IS NOT NULL AND trim(p.email) <> ''
    UNION
    SELECT lower(trim(t.email)) FROM user_access_tags t
      WHERE t.email IS NOT NULL AND trim(t.email) <> ''
    UNION
    SELECT lower(trim(d.donor_email)) FROM donations d
      WHERE d.donor_email IS NOT NULL AND trim(d.donor_email) <> ''
    UNION
    SELECT lower(trim(o.customer_email)) FROM orders o
      WHERE o.customer_email IS NOT NULL AND trim(o.customer_email) <> ''
  ),
  prof AS (
    SELECT DISTINCT ON (lower(trim(p.email)))
      lower(trim(p.email)) AS em, p.id AS uid, p.full_name AS nm, p.created_at AS seen
    FROM profiles p
    WHERE p.email IS NOT NULL AND trim(p.email) <> ''
    ORDER BY lower(trim(p.email)), p.created_at DESC
  ),
  tag_agg AS (
    SELECT lower(trim(t.email)) AS em,
      jsonb_agg(jsonb_build_object(
        'tag', t.tag, 'source', t.source, 'granted_at', t.granted_at,
        'valid_until', t.valid_until, 'cancelled_at', t.cancelled_at,
        'active', (t.cancelled_at IS NULL AND (t.valid_until IS NULL OR t.valid_until > now()))
      ) ORDER BY t.granted_at DESC NULLS LAST) AS tags,
      bool_or(t.cancelled_at IS NULL AND (t.valid_until IS NULL OR t.valid_until > now())) AS active,
      (array_agg(t.display_name ORDER BY t.granted_at DESC NULLS LAST)
        FILTER (WHERE t.display_name IS NOT NULL AND trim(t.display_name) <> ''))[1] AS nm,
      min(t.created_at) AS seen
    FROM user_access_tags t
    WHERE t.email IS NOT NULL AND trim(t.email) <> ''
    GROUP BY 1
  ),
  don_agg AS (
    SELECT lower(trim(d.donor_email)) AS em,
      coalesce(sum(d.amount) FILTER (WHERE d.payment_status = 'completed'), 0) AS total,
      count(*) FILTER (WHERE d.payment_status = 'completed')::int AS cnt,
      max(coalesce(d.charge_date, d.created_at::date))
        FILTER (WHERE d.payment_status = 'completed') AS last_date,
      coalesce(bool_or(d.is_monthly AND d.payment_status = 'completed'), false) AS monthly,
      (array_agg(d.donor_name ORDER BY d.created_at DESC)
        FILTER (WHERE d.donor_name IS NOT NULL AND trim(d.donor_name) <> ''))[1] AS nm,
      (array_agg(d.phone ORDER BY d.created_at DESC)
        FILTER (WHERE d.phone IS NOT NULL AND trim(d.phone) <> ''))[1] AS ph,
      min(d.created_at) AS seen
    FROM donations d
    WHERE d.donor_email IS NOT NULL AND trim(d.donor_email) <> ''
    GROUP BY 1
  ),
  ord_agg AS (
    SELECT lower(trim(o.customer_email)) AS em,
      count(*) FILTER (WHERE o.status IN ('confirmed','completed'))::int AS cnt,
      coalesce(sum(o.total) FILTER (WHERE o.status IN ('confirmed','completed')), 0) AS total,
      -- מקור-האמת: charge אחרון של מוצר הו"ק (כיום רק weekly-chapter-subscription,
      -- שמכסה גם את מסלול איכה — אומת מול ה-DB החי 14.7)
      max(coalesce(o.charge_date, o.created_at::date))
        FILTER (WHERE o.status IN ('confirmed','completed') AND pp.type = 'directDebit') AS last_sub,
      max(coalesce(o.charge_date, o.created_at::date))
        FILTER (WHERE o.status IN ('confirmed','completed')) AS last_any,
      jsonb_agg(DISTINCT o.product)
        FILTER (WHERE o.product IS NOT NULL AND o.status IN ('confirmed','completed')) AS products,
      (array_agg(o.customer_name ORDER BY o.created_at DESC)
        FILTER (WHERE o.customer_name IS NOT NULL AND trim(o.customer_name) <> ''))[1] AS nm,
      (array_agg(o.customer_phone ORDER BY o.created_at DESC)
        FILTER (WHERE o.customer_phone IS NOT NULL AND trim(o.customer_phone) <> ''))[1] AS ph,
      min(o.created_at) AS seen
    FROM orders o
    LEFT JOIN payment_products pp ON pp.id = o.product
    WHERE o.customer_email IS NOT NULL AND trim(o.customer_email) <> ''
    GROUP BY 1
  )
  SELECT
    e.em,
    coalesce(p.nm, o.nm, d.nm, t.nm),
    coalesce(o.ph, d.ph),
    p.uid,
    (p.uid IS NOT NULL),
    coalesce(t.tags, '[]'::jsonb),
    coalesce(t.active, false),
    (t.em IS NOT NULL),
    coalesce(d.total, 0),
    coalesce(d.cnt, 0),
    d.last_date,
    coalesce(d.monthly, false),
    coalesce(o.cnt, 0),
    coalesce(o.total, 0),
    coalesce(o.products, '[]'::jsonb),
    o.last_sub,
    o.last_any,
    least(p.seen, t.seen, d.seen, o.seen)
  FROM emails e
  LEFT JOIN prof    p ON p.em = e.em
  LEFT JOIN tag_agg t ON t.em = e.em
  LEFT JOIN don_agg d ON d.em = e.em
  LEFT JOIN ord_agg o ON o.em = e.em;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_unified_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unified_users() TO authenticated;

-- ── 2. פירוט לאדם בודד (ל-drawer): ציר-זמן תשלומים + תגיות ────────────────
-- אותו מודל אבטחה בדיוק. נטען רק בפתיחת drawer — מחזיק את ה-payload הראשי קטן.
CREATE OR REPLACE FUNCTION public.admin_user_detail(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'access denied: admin only';
  END IF;

  SELECT jsonb_build_object(
    'email', v_email,
    'orders', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'date', coalesce(o.charge_date, o.created_at::date),
        'product', o.product, 'description', o.description,
        'total', o.total, 'status', o.status,
        'payment_label', o.payment_label, 'asmachta', o.asmachta
      ) ORDER BY coalesce(o.charge_date, o.created_at::date) DESC)
      FROM orders o WHERE lower(trim(o.customer_email)) = v_email
    ), '[]'::jsonb),
    'donations', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'date', coalesce(d.charge_date, d.created_at::date),
        'amount', d.amount, 'is_monthly', d.is_monthly,
        'status', d.payment_status, 'description', d.description
      ) ORDER BY coalesce(d.charge_date, d.created_at::date) DESC)
      FROM donations d WHERE lower(trim(d.donor_email)) = v_email
    ), '[]'::jsonb),
    'tags', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'tag', t.tag, 'source', t.source, 'granted_at', t.granted_at,
        'valid_until', t.valid_until, 'cancelled_at', t.cancelled_at,
        'notes', t.notes,
        'active', (t.cancelled_at IS NULL AND (t.valid_until IS NULL OR t.valid_until > now()))
      ) ORDER BY t.granted_at DESC NULLS LAST)
      FROM user_access_tags t WHERE lower(trim(t.email)) = v_email
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_detail(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_detail(text) TO authenticated;
