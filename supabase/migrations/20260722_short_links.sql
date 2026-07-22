-- קישורים מקוצרים (יואב 22.7): לכל עמוד באתר קישור קצר bneyzion.co.il/s/<code>
-- כמו באתרים הישנים. נוצרים באדמין (עמוד "קישורים מקוצרים"), הפניה בצד-לקוח.
create table if not exists public.short_links (
  code        text primary key check (code ~ '^[A-Za-z0-9_-]{2,32}$'),
  target_path text not null,               -- נתיב פנימי ("/store/..." וכו')
  label       text,                        -- תיאור חופשי לאדמין
  clicks      integer not null default 0,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.short_links enable row level security;

-- כולם קוראים (ההפניה רצה אצל הגולש); כתיבה — אדמין בלבד (אותו דפוס כמו
-- admin_all של community_courses: user_roles.role in admin/creator).
drop policy if exists short_links_public_read on public.short_links;
create policy short_links_public_read on public.short_links
  for select using (true);

drop policy if exists short_links_admin_write on public.short_links;
create policy short_links_admin_write on public.short_links
  for all using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('admin', 'creator')
    )
  ) with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('admin', 'creator')
    )
  );

-- ספירת קליקים בלי לפתוח update ציבורי: פונקציה security definer שמעלה
-- את המונה בלבד. הגולש האנונימי קורא לה דרך rpc.
create or replace function public.increment_short_link_clicks(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.short_links set clicks = clicks + 1 where code = p_code;
$$;

grant execute on function public.increment_short_link_clicks(text) to anon, authenticated;
