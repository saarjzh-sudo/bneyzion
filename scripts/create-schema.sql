-- bneyzion schema migration: Lovable → own Supabase
-- Generated from src/integrations/supabase/types.ts
-- Run this on the NEW Supabase project via SQL Editor

-- ============================================================
-- ENUM
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TIER 0: Tables with NO foreign key dependencies
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rabbis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text,
  bio text,
  specialty text,
  image_url text,
  lesson_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  parent_id uuid REFERENCES public.topics(id),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  subject text,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  discount_percent numeric NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  donor_name text,
  donor_email text,
  amount numeric NOT NULL,
  dedication_type text NOT NULL DEFAULT 'general',
  dedication_name text,
  is_monthly boolean NOT NULL DEFAULT false,
  payment_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  source_type text,
  status text NOT NULL DEFAULT 'pending',
  total_items integer NOT NULL DEFAULT 0,
  completed_items integer NOT NULL DEFAULT 0,
  failed_items integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'unknown',
  source_id text,
  source_title text,
  source_url text,
  source_data jsonb,
  target_table text,
  target_id text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  migrated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_path text NOT NULL,
  new_path text NOT NULL DEFAULT '',
  redirect_type integer NOT NULL DEFAULT 301,
  status text NOT NULL DEFAULT 'active',
  priority text NOT NULL DEFAULT 'normal',
  meta_title text,
  meta_description text,
  notes text,
  hit_count integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  order_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_id text,
  customer_name text,
  customer_email text,
  customer_phone text,
  shipping_address text,
  shipping_city text,
  shipping_zip text,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ILS',
  installments integer NOT NULL DEFAULT 1,
  invoice_type text NOT NULL DEFAULT 'receipt',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  email text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  smoove_id integer,
  membership_tier text NOT NULL DEFAULT 'free',
  badge_label text,
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  lifetime_points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.user_points_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  points integer NOT NULL,
  action text NOT NULL,
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_daily_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  lessons_completed integer NOT NULL DEFAULT 0,
  minutes_learned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  role public.app_role NOT NULL
);

CREATE TABLE IF NOT EXISTS public.weekly_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  action_type text NOT NULL,
  target_count integer NOT NULL DEFAULT 1,
  reward_points integer NOT NULL DEFAULT 10,
  reward_badge text,
  week_start date NOT NULL DEFAULT CURRENT_DATE,
  week_end date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '7 days'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TIER 1: Tables with FK to Tier 0 only
-- ============================================================

CREATE TABLE IF NOT EXISTS public.series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  rabbi_id uuid REFERENCES public.rabbis(id),
  parent_id uuid REFERENCES public.series(id),
  image_url text,
  lesson_count integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  rabbi_id uuid REFERENCES public.rabbis(id),
  image_url text,
  course_type text NOT NULL DEFAULT 'course',
  status text NOT NULL DEFAULT 'draft',
  price numeric,
  total_lessons integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  zoom_link text,
  smoove_course_id integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.migration_batches(id),
  item_id uuid REFERENCES public.migration_items(id),
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  content text,
  product_type text NOT NULL DEFAULT 'physical',
  price numeric NOT NULL DEFAULT 0,
  original_price numeric,
  image_url text,
  gallery_urls text[],
  category_id uuid REFERENCES public.product_categories(id),
  is_digital boolean NOT NULL DEFAULT false,
  digital_file_url text,
  page_count integer,
  featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.weekly_challenges(id),
  current_count integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TIER 2: Tables with FK to Tier 1
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content text,
  rabbi_id uuid REFERENCES public.rabbis(id),
  series_id uuid REFERENCES public.series(id),
  video_url text,
  audio_url text,
  attachment_url text,
  thumbnail_url text,
  duration integer,
  bible_book text,
  bible_chapter integer,
  bible_verse integer,
  source_type text NOT NULL DEFAULT 'text',
  status text NOT NULL DEFAULT 'draft',
  views_count integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.series_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_series_id uuid NOT NULL REFERENCES public.series(id),
  linked_series_id uuid NOT NULL REFERENCES public.series(id),
  link_type text NOT NULL DEFAULT 'related',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.community_course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.community_courses(id),
  title text NOT NULL,
  description text,
  lesson_number integer NOT NULL DEFAULT 0,
  video_url text,
  audio_url text,
  attachment_url text,
  content_html text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.community_courses(id),
  title text NOT NULL,
  description text,
  session_number integer NOT NULL DEFAULT 0,
  session_date date,
  duration_minutes integer,
  zoom_link text,
  recording_url text,
  is_recorded boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  product_id uuid REFERENCES public.products(id),
  title text NOT NULL,
  item_type text NOT NULL DEFAULT 'product',
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  course_id uuid NOT NULL REFERENCES public.community_courses(id),
  last_session_id uuid REFERENCES public.course_sessions(id),
  status text NOT NULL DEFAULT 'active',
  completed boolean NOT NULL DEFAULT false,
  enrolled_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_member_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.community_members(id),
  course_id uuid NOT NULL REFERENCES public.community_courses(id),
  last_lesson_id uuid REFERENCES public.community_course_lessons(id),
  completed boolean NOT NULL DEFAULT false,
  enrolled_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TIER 3: Tables with FK to Tier 2
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lesson_topics (
  lesson_id uuid NOT NULL REFERENCES public.lessons(id),
  topic_id uuid NOT NULL REFERENCES public.topics(id),
  PRIMARY KEY (lesson_id, topic_id)
);

CREATE TABLE IF NOT EXISTS public.lesson_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id),
  user_id text NOT NULL,
  display_name text,
  avatar_url text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_dedications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id),
  user_id text,
  dedicated_name text NOT NULL,
  dedicator_name text,
  dedication_type text NOT NULL DEFAULT 'general',
  message text,
  amount numeric,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id),
  progress_seconds integer,
  completed boolean,
  watched_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  series_id uuid NOT NULL REFERENCES public.series(id),
  last_lesson_id uuid REFERENCES public.lessons(id),
  completed_lessons integer NOT NULL DEFAULT 0,
  total_lessons integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  enrolled_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_favorite_rabbis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  rabbi_id uuid NOT NULL REFERENCES public.rabbis(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_favorite_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  series_id uuid NOT NULL REFERENCES public.series(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_series_ancestors(series_uuid uuid)
RETURNS TABLE(depth integer, id uuid, title text)
LANGUAGE sql STABLE
AS $$
  WITH RECURSIVE ancestors AS (
    SELECT 0 AS depth, s.id, s.title, s.parent_id
    FROM series s WHERE s.id = series_uuid
    UNION ALL
    SELECT a.depth + 1, s.id, s.title, s.parent_id
    FROM ancestors a JOIN series s ON s.id = a.parent_id
  )
  SELECT depth, id, title FROM ancestors ORDER BY depth DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_series_descendant_ids(root_id uuid)
RETURNS TABLE(series_id uuid, parent_series_id uuid, series_title text)
LANGUAGE sql STABLE
AS $$
  WITH RECURSIVE descendants AS (
    SELECT s.id AS series_id, s.parent_id AS parent_series_id, s.title AS series_title
    FROM series s WHERE s.parent_id = root_id
    UNION ALL
    SELECT s.id, s.parent_id, s.title
    FROM descendants d JOIN series s ON s.parent_id = d.series_id
  )
  SELECT * FROM descendants;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id::text AND role = _role
  );
$$;

-- ============================================================
-- VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.weekly_leaderboard AS
SELECT
  up.user_id,
  p.full_name,
  p.avatar_url,
  up.total_points,
  up.lifetime_points,
  ROW_NUMBER() OVER (ORDER BY up.total_points DESC) AS rank
FROM public.user_points up
LEFT JOIN public.profiles p ON p.id::text = up.user_id;

-- ============================================================
-- INDEXES (for performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lessons_series_id ON public.lessons(series_id);
CREATE INDEX IF NOT EXISTS idx_lessons_rabbi_id ON public.lessons(rabbi_id);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON public.lessons(status);
CREATE INDEX IF NOT EXISTS idx_series_parent_id ON public.series(parent_id);
CREATE INDEX IF NOT EXISTS idx_series_rabbi_id ON public.series(rabbi_id);
CREATE INDEX IF NOT EXISTS idx_series_status ON public.series(status);
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON public.user_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_migration_items_status ON public.migration_items(status);
CREATE INDEX IF NOT EXISTS idx_migration_redirects_old_path ON public.migration_redirects(old_path);

-- Done! Now run the data migration script.
