-- ═══════════════════════════════════════════════════════════════════
-- רמה 30 (27.7.2026) — מנגנון קמפיינים רב-פעמי
--
-- הופך את "קמפיין יהושע" ממקרה-יחיד מקודד-קשיח למנגנון:
--   campaigns        — קמפיין גיוס (דף ציבורי /campaign/:slug + אדמין)
--   campaign_tiers   — חבילות תמיכה לכל קמפיין (donations.tier_id = tier_key)
--   campaign_stats / campaign_tier_counts — views אגרגטיביים (בלי PII),
--     הכללה של yehoshua_campaign_stats / yehoshua_tier_counts.
--
-- עיקרון סליקה: donations.product = campaigns.slug = payment_products.id.
-- payment_products נשאר נעול-לשרת (RLS בלי policies) — הסנכרון נעשה
-- בטריגרים SECURITY DEFINER, לא ע"י פתיחת הרשאות לקליינט:
--   campaigns.is_active ⇄ payment_products.active  (כיבוי קמפיין = 403 בסליקה)
--   max(campaign_tiers.max_installments) → payment_products.max_installments
--
-- הדף הישן /design-yehoshua-campaign לא תלוי בטבלאות האלה — ממשיך לעבוד
-- כרגיל (גיבוי + רוכשים אחרונים). ה-seed של יהושע נשמר בערכים זהים
-- לשורת payment_products הקיימת כדי לא לגעת בסליקה החיה.
-- ═══════════════════════════════════════════════════════════════════

-- ── campaigns ──────────────────────────────────────────────────────
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  -- slug = donations.product = payment_products.id (מפתח הסליקה)
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  title text not null,                       -- שם באדמין + display_name בסליקה
  subtitle text,
  goal_amount numeric not null default 0,
  is_active boolean not null default false,  -- שולט גם בדף וגם בסליקה (טריגר)

  -- הירו
  hero_eyebrow text,
  hero_title text,                           -- הכותרת הגדולה (גרדיאנט זהב)
  hero_title_small text,                     -- השורה הקטנה מעל
  hero_subtitle text,
  hero_subtitle_bold text,
  hero_image_url text,
  hero_quote text,
  hero_quote_cite text,

  -- מדיה + סקשנים
  video_url text,
  video_poster_url text,
  video_title text,
  proof_stats jsonb not null default '[]'::jsonb,   -- [{val,label,icon}] — שורת ההוכחה
  story_html text,                                   -- "הסיפור" (HTML מסונן בצד לקוח)
  story_image_url text,
  why_cards jsonb not null default '[]'::jsonb,      -- [{num,title,body}]
  author_html text,                                  -- "מי מאחורי הקמפיין"
  author_name text,
  author_image_url text,
  phases jsonb not null default '[]'::jsonb,         -- [{label,sub,done,current}] — ציר זמן
  faq jsonb not null default '[]'::jsonb,            -- [{q,a}]

  -- תרומה בסכום חופשי
  allow_custom_amount boolean not null default true,
  min_custom_amount numeric not null default 18,

  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── campaign_tiers ─────────────────────────────────────────────────
create table if not exists public.campaign_tiers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  tier_key text not null,                    -- נכתב ל-donations.tier_id (למשל tier-90)
  price numeric not null check (price > 0),
  name text not null,
  headline text,
  badge text,
  note text,
  perks jsonb not null default '[]'::jsonb,  -- ["ספר פיזי", "משלוח", ...]
  tier_limit int,                            -- null = ללא הגבלה
  image_url text,
  image_alt text,
  image_badge text,
  highlight boolean not null default false,
  needs_shipping boolean not null default true,
  max_installments int not null default 1 check (max_installments between 1 and 12),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (campaign_id, tier_key)
);

create index if not exists idx_campaign_tiers_campaign on public.campaign_tiers (campaign_id, sort_order);

-- ── RLS ────────────────────────────────────────────────────────────
alter table public.campaigns enable row level security;
alter table public.campaign_tiers enable row level security;

drop policy if exists campaigns_public_read on public.campaigns;
create policy campaigns_public_read on public.campaigns
  for select using (is_active = true);

drop policy if exists campaigns_admin_all on public.campaigns;
create policy campaigns_admin_all on public.campaigns
  for all using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists campaign_tiers_public_read on public.campaign_tiers;
create policy campaign_tiers_public_read on public.campaign_tiers
  for select using (
    is_active = true
    and exists (select 1 from public.campaigns c where c.id = campaign_id and c.is_active)
  );

drop policy if exists campaign_tiers_admin_all on public.campaign_tiers;
create policy campaign_tiers_admin_all on public.campaign_tiers
  for all using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- ── Views אגרגטיביים (בלי PII — כמו yehoshua_campaign_stats) ─────
-- בבעלות postgres → עוקפים את ה-RLS של donations בכוונה, אגרגטים בלבד.
create or replace view public.campaign_stats as
  select
    c.slug,
    (count(d.id) filter (where d.payment_status = 'completed'))::int as supporters,
    coalesce(sum(d.amount) filter (where d.payment_status = 'completed'), 0) as raised,
    (count(d.id) filter (where d.payment_status = 'pending'))::int as pending_count
  from public.campaigns c
  left join public.donations d on d.product = c.slug
  group by c.slug;

create or replace view public.campaign_tier_counts as
  select c.slug, d.tier_id, count(*)::int as sold
  from public.campaigns c
  join public.donations d on d.product = c.slug
  where d.payment_status = 'completed' and d.tier_id is not null
  group by c.slug, d.tier_id;

grant select on public.campaign_stats to anon, authenticated;
grant select on public.campaign_tier_counts to anon, authenticated;

-- ── סנכרון payment_products (SECURITY DEFINER — בלי לפתוח RLS) ───
create or replace function public.sync_campaign_payment_product()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_max int;
begin
  select greatest(coalesce(max(max_installments), 1), 1) into v_max
  from campaign_tiers where campaign_id = new.id;

  -- שינוי slug: לכבות את שורת-הסליקה הישנה (שורות donations ישנות ממשיכות להצביע עליה)
  if tg_op = 'UPDATE' and old.slug is distinct from new.slug then
    update payment_products set active = false, updated_at = now() where id = old.slug;
  end if;

  insert into payment_products (id, display_name, active, type, page_code_env, target_table, max_installments, description)
  values (new.slug, new.title, new.is_active, 'wallet', 'DONATIONS', 'donations', v_max,
          'קמפיין גיוס — מנוהל אוטומטית ממנגנון הקמפיינים (רמה 30)')
  on conflict (id) do update
    set display_name = excluded.display_name,
        active = excluded.active,
        max_installments = excluded.max_installments,
        updated_at = now();
  return new;
end $$;

drop trigger if exists trg_campaigns_sync_payment_product on public.campaigns;
create trigger trg_campaigns_sync_payment_product
  after insert or update of slug, title, is_active on public.campaigns
  for each row execute function public.sync_campaign_payment_product();

-- מחיקת קמפיין ≠ מחיקת שורת הסליקה (הזמנות עבר מצביעות עליה) — רק כיבוי
create or replace function public.deactivate_campaign_payment_product()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update payment_products set active = false, updated_at = now() where id = old.slug;
  return old;
end $$;

drop trigger if exists trg_campaigns_deactivate_payment_product on public.campaigns;
create trigger trg_campaigns_deactivate_payment_product
  after delete on public.campaigns
  for each row execute function public.deactivate_campaign_payment_product();

-- שינוי בחבילות → עדכון max_installments של הקמפיין בסליקה
create or replace function public.sync_campaign_tiers_installments()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_slug text;
  v_campaign uuid;
begin
  v_campaign := coalesce(new.campaign_id, old.campaign_id);
  select slug into v_slug from campaigns where id = v_campaign;
  if v_slug is not null then
    update payment_products
      set max_installments = (select greatest(coalesce(max(max_installments), 1), 1)
                              from campaign_tiers where campaign_id = v_campaign),
          updated_at = now()
      where id = v_slug;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_campaign_tiers_sync_installments on public.campaign_tiers;
create trigger trg_campaign_tiers_sync_installments
  after insert or update of max_installments or delete on public.campaign_tiers
  for each row execute function public.sync_campaign_tiers_installments();

-- ── updated_at ─────────────────────────────────────────────────────
create or replace function public.campaigns_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_campaigns_touch_updated_at on public.campaigns;
create trigger trg_campaigns_touch_updated_at
  before update on public.campaigns
  for each row execute function public.campaigns_touch_updated_at();
