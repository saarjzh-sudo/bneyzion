-- ============================================================================
-- 20260809_security_rate_limit — מגביל-קצב משותף לנתיבי-שרת ציבוריים
-- ============================================================================
--
-- למה: `/api/store/validate-coupon` פתוח לכל אחד, בלי אימות ובלי הגבלה, והוא
-- עונה valid/invalid על כל קוד. כלומר אפשר לסרוק קודי-קופון בלולאה עד שנמצא
-- קוד אמיתי ולקבל הנחה. קודי-קופון הם מילים קצרות — זה מעשי לחלוטין.
--
-- למה בטבלה ולא בזיכרון: הנתיבים רצים כ-serverless (Vercel). מונה בזיכרון-
-- התהליך נמחק בכל cold start ולא משותף בין מופעים מקבילים, ולכן לא מגביל
-- כלום בפועל. הספירה חייבת להיות מרוכזת.
--
-- חלון קבוע (fixed window) ולא sliding: פשוט, זול, ומספיק — הגרוע ביותר הוא
-- פי-2 מהמכסה סביב גבול-חלון, וזה לא משנה מול סריקה של אלפי ניסיונות.

create table if not exists public.rate_limit_hits (
  bucket       text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket, window_start)
);

-- הטבלה נגישה רק דרך הפונקציה למטה (SECURITY DEFINER) ודרך service_role.
-- RLS פעיל בלי אף policy = שום לקוח anon/authenticated לא קורא ולא כותב.
alter table public.rate_limit_hits enable row level security;

comment on table public.rate_limit_hits is
  'מוני קצב לנתיבי-שרת ציבוריים. נכתב רק ע"י public.rate_limit_check.';

-- ----------------------------------------------------------------------------
-- rate_limit_check — מגדיל את המונה ומחזיר true אם עדיין בתוך המכסה.
--
-- אטומי: INSERT ... ON CONFLICT DO UPDATE ... RETURNING מבצע קריאה-והגדלה
-- בפעולה אחת, כך שבקשות מקבילות לא דורסות זו את זו (הבעיה שהייתה בקופונים).
-- ----------------------------------------------------------------------------
create or replace function public.rate_limit_check(
  p_bucket         text,
  p_limit          integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window timestamptz;
  v_hits   integer;
begin
  if p_bucket is null or p_bucket = '' or p_limit <= 0 or p_window_seconds <= 0 then
    -- קלט לא תקין → לא מאשרים. נכשל סגור.
    return false;
  end if;

  -- תחילת החלון הנוכחי, מעוגלת כלפי מטה לגודל-החלון.
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_hits as r (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start)
    do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- ניקוי עצל: ~1% מהקריאות מנקות חלונות ישנים, כדי לא לשלם scan בכל בקשה.
  if random() < 0.01 then
    delete from public.rate_limit_hits
     where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.rate_limit_check(text, integer, integer) from public;
grant execute on function public.rate_limit_check(text, integer, integer) to service_role;

comment on function public.rate_limit_check(text, integer, integer) is
  'מגדיל מונה לחלון הנוכחי ומחזיר true כל עוד לא נחצתה המכסה. נכשל סגור.';
