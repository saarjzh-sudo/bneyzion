-- content_sliders — סליידרים בשליטת יואב (רמה 26ד, 22.7.2026)
-- יואב 13:25: "ממש אשמח אם תהיה לי אפשרות ליצור לבד סליידרים לסידרה/קטגוריה
-- בדף הבית ובאגפים (כרגע אגף המורים)."
-- source_id = צומת בעץ ה-series (סדרה רגילה או קטגוריה) — השאילתה בצד-הלקוח
-- מושכת את שיעורי הצומת + שיעורי הילדים הישירים שלו.

create table if not exists public.content_sliders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  eyebrow text,
  placement text not null check (placement in ('home', 'teachers')),
  source_id uuid not null references public.series(id) on delete cascade,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.content_sliders enable row level security;

-- קריאה ציבורית לפעילים; אדמין רואה הכול
drop policy if exists sliders_public_read on public.content_sliders;
create policy sliders_public_read on public.content_sliders
  for select using (is_active or has_role(auth.uid(), 'admin'::app_role));

drop policy if exists sliders_admin_all on public.content_sliders;
create policy sliders_admin_all on public.content_sliders
  for all using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));
