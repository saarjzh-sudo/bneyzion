-- רמה 27 (22.7.2026 ערב) — סבב יואב 16:09-18:01
-- 1. content_sliders.variant — עיצובים קבועים לבחירה (הכרעת סער 18:00:
--    "בוא נעשה את הסליידים עם עיצובים קבועים שאפשר לבחור להחליף").
-- 2. site_feedback — טופס "האתר בהרצה" (יואב 16:31): דיווחי באגים והערות
--    מהגולשים, נקראים ב-/admin/feedback.

alter table public.content_sliders
  add column if not exists variant text not null default 'cards'
  check (variant in ('cards', 'compact'));

create table if not exists public.site_feedback (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  name text,
  phone text,
  page text,
  status text not null default 'new' check (status in ('new', 'handled')),
  created_at timestamptz not null default now()
);

alter table public.site_feedback enable row level security;

-- כל גולש (גם אנונימי) יכול לדווח; רק אדמין קורא/מעדכן/מוחק.
drop policy if exists feedback_public_insert on public.site_feedback;
create policy feedback_public_insert on public.site_feedback
  for insert with check (char_length(message) between 3 and 4000);

drop policy if exists feedback_admin_read on public.site_feedback;
create policy feedback_admin_read on public.site_feedback
  for select using (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists feedback_admin_update on public.site_feedback;
create policy feedback_admin_update on public.site_feedback
  for update using (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists feedback_admin_delete on public.site_feedback;
create policy feedback_admin_delete on public.site_feedback
  for delete using (has_role(auth.uid(), 'admin'::app_role));
