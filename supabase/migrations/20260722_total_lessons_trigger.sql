-- רמה 26 (יואב 22.7 11:09+11:12): "למה ללמוד תנ"ך" הוצג "לא נפתח עדיין" וגם
-- באדמין 0 שיעורים — שום מנגנון לא מתחזק את community_courses.total_lessons.
-- קורס שנבנה באדמין או בסקריפט נשאר עם המונה הישן (למה-ללמוד=0, עזרא נתקע על 84).
--
-- ⚠️ סמנטיקה כפולה: בספרי תכנית הפרק-השבועי (in_weekly_program/program_slug)
-- total_lessons מחזיק *מספר פרקים* (זכריה=14, איכה=5) — הטריגר מדלג עליהם
-- ומעדכן רק קורסים רגילים, שבהם המונה = מספר שיעורים שפורסמו.

create or replace function public.sync_course_total_lessons()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  for cid in
    select distinct c from unnest(array_remove(array[
      case when tg_op in ('INSERT', 'UPDATE') then new.course_id end,
      case when tg_op in ('DELETE', 'UPDATE') then old.course_id end
    ], null)) as t(c)
  loop
    update public.community_courses c
    set total_lessons = (
      select count(*) from public.community_course_lessons l
      where l.course_id = cid and l.status = 'published'
    )
    where c.id = cid
      and coalesce(c.in_weekly_program, false) = false
      and c.program_slug is null;
  end loop;
  return null;
end;
$$;

drop trigger if exists trg_sync_course_total_lessons on public.community_course_lessons;
create trigger trg_sync_course_total_lessons
  after insert or delete or update of status, course_id
  on public.community_course_lessons
  for each row execute function public.sync_course_total_lessons();

-- backfill חד-פעמי לכל הקורסים הרגילים (מיישר גם את עזרא/נחמיה/דניאל/למה-ללמוד)
update public.community_courses c
set total_lessons = (
  select count(*) from public.community_course_lessons l
  where l.course_id = c.id and l.status = 'published'
)
where coalesce(c.in_weekly_program, false) = false
  and c.program_slug is null;
