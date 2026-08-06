-- ============================================================================
-- אבטחה — M10: קופון עם max_uses ניתן למימוש בלתי-מוגבל
-- ============================================================================
-- הבעיה (אודיט 29.7): create-payment קורא את used_count, ו-webhook.ts:286
-- מגדיל אותו — אבל בין השניים עוברות **דקות** (המשתמש ממלא פרטי כרטיס ב-Grow).
-- קופון max_uses=1: פותחים 20 טאבים, כולם קוראים used_count=0, כולם עוברים,
-- כולם מקבלים את ההנחה. ההערה בקוד ("Read-then-write is fine at this scale")
-- התייחסה למקביליות ברמת-המילישניה, לא לפער-ההזמנה.
-- בנוסף: הקופון לא אומת מחדש בזמן ה-webhook.
--
-- הפתרון: **שריון** אטומי בזמן create-payment, לא ספירה בזמן ה-webhook.
-- שריון פג תוקף לבד אחרי 30 דקות, ולכן נטישת-צ'קאאוט אינה שורפת קופון —
-- וזו הייתה הסיבה המקורית לספור רק ב-webhook. שתי הדרישות מתקיימות יחד.
--
-- הפונקציה עושה SELECT ... FOR UPDATE על שורת-הקופון, ולכן שתי בקשות
-- מקבילות מסתדרות בתור ולא יכולות שתיהן לראות את אותו מצב.
-- ============================================================================

create table if not exists public.coupon_reservations (
  id           uuid primary key default gen_random_uuid(),
  coupon_id    uuid not null references public.coupons(id) on delete cascade,
  order_id     uuid,
  created_at   timestamptz not null default now(),
  -- מסומן ע"י ה-webhook כשהתשלום אושר. שריון שלא נצרך פג תוקף לפי created_at.
  consumed_at  timestamptz,
  released_at  timestamptz
);

create index if not exists idx_coupon_reservations_active
  on public.coupon_reservations (coupon_id, created_at)
  where consumed_at is null and released_at is null;

create index if not exists idx_coupon_reservations_order
  on public.coupon_reservations (order_id);

-- הטבלה נגישה אך ורק ל-service_role (ה-API). אין שום סיבה שדפדפן ייגע בה.
alter table public.coupon_reservations enable row level security;
revoke all on public.coupon_reservations from anon, authenticated;

-- ── חלון השריון ─────────────────────────────────────────────────────────────
-- 30 דקות: ארוך מספיק לכל תהליך תשלום סביר ב-Grow, קצר מספיק שנטישה תשחרר
-- את הקופון באותו סשן-קניות.
create or replace function public.coupon_reservation_window()
returns interval language sql immutable as $$ select interval '30 minutes' $$;

-- ============================================================================
-- reserve_coupon — הבדיקה וההקצאה בפעולה אטומית אחת
-- ============================================================================
-- מחזיר את פרטי הקופון + reservation_id בהצלחה, או valid=false עם סיבה.
-- כל הלוגיקה של validateCoupon משוכפלת כאן **בכוונה**: זו נקודת-האמת
-- היחידה שרצה תחת נעילה. בדיקת ה-TS נשארת ל-UX (הודעות שגיאה מוקדמות).
create or replace function public.reserve_coupon(
  p_code     text,
  p_order_id uuid default null
)
returns table (
  valid           boolean,
  reason          text,
  code            text,
  discount_type   text,
  discount_value  numeric,
  reservation_id  uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_coupon   public.coupons%rowtype;
  v_json     jsonb;
  v_active   integer;
  v_type     text;
  v_value    numeric;
  v_res_id   uuid;
begin
  if p_code is null or btrim(p_code) = '' then
    return query select false, 'לא הוזן קוד קופון', null::text, null::text, null::numeric, null::uuid;
    return;
  end if;

  -- FOR UPDATE — כאן נוצר התור. בקשה מקבילה ממתינה עד ה-COMMIT של הראשונה,
  -- ואז רואה את השריון שלה. זה הלב של התיקון.
  -- coupons.code מוסמך במפורש — 'code' לבדו מתנגש עם עמודת-הפלט באותו שם
  -- (42702 ambiguous) והפיל כל קריאה לפונקציה.
  select * into v_coupon
  from public.coupons
  where upper(btrim(coupons.code)) = upper(btrim(p_code))
  for update;

  if not found then
    return query select false, 'קוד הקופון לא נמצא', null::text, null::text, null::numeric, null::uuid;
    return;
  end if;

  if v_coupon.status is distinct from 'active' then
    return query select false, 'הקופון אינו פעיל', null::text, null::text, null::numeric, null::uuid;
    return;
  end if;

  if v_coupon.valid_from is not null and v_coupon.valid_from > now() then
    return query select false, 'הקופון עדיין לא בתוקף', null::text, null::text, null::numeric, null::uuid;
    return;
  end if;

  if v_coupon.valid_until is not null and v_coupon.valid_until < now() then
    return query select false, 'תוקף הקופון פג', null::text, null::text, null::numeric, null::uuid;
    return;
  end if;

  if v_coupon.max_uses is not null then
    -- שימושים שכבר נספרו + שריונים פתוחים שטרם פגו.
    select count(*) into v_active
    from public.coupon_reservations r
    where r.coupon_id = v_coupon.id
      and r.consumed_at is null
      and r.released_at is null
      and r.created_at > now() - public.coupon_reservation_window();

    if coalesce(v_coupon.used_count, 0) + v_active >= v_coupon.max_uses then
      return query select false, 'הקופון מוצה — נוצלו כל השימושים', null::text, null::text, null::numeric, null::uuid;
      return;
    end if;
  end if;

  -- דרך jsonb ולא בגישה ישירה לשדה: `discount_type` / `discount_amount` הן
  -- עמודות מרמה 13 שהוחלו out-of-band ואינן ב-types.ts. גישה ישירה לעמודה
  -- חסרה מפילה את קומפילציית ה-plpgsql בקריאה הראשונה — כלומר כל רכישה עם
  -- קופון. `jsonb ->> 'missing'` פשוט מחזיר NULL. זו אותה סובלנות שכבר
  -- קיימת ב-api/lib/coupon.ts (`(c as any).discount_type`).
  v_json := to_jsonb(v_coupon);
  v_type := case when v_json ->> 'discount_type' = 'amount' then 'amount' else 'percent' end;
  v_value := case when v_type = 'amount'
                  then coalesce((v_json ->> 'discount_amount')::numeric, 0)
                  else coalesce((v_json ->> 'discount_percent')::numeric, 0) end;

  if v_value <= 0 then
    return query select false, 'הקופון אינו מוגדר כראוי', null::text, null::text, null::numeric, null::uuid;
    return;
  end if;

  insert into public.coupon_reservations (coupon_id, order_id)
  values (v_coupon.id, p_order_id)
  returning id into v_res_id;

  return query select true, null::text, v_coupon.code, v_type, v_value, v_res_id;
end;
$$;

-- ============================================================================
-- consume_coupon_reservation — נקרא ע"י ה-webhook כשהתשלום אושר
-- ============================================================================
-- מגדיל את used_count **פעם אחת בלבד** לכל שריון. קריאה חוזרת (שידור-חוזר של
-- webhook, ראו M9) לא תגדיל שוב, כי consumed_at כבר מלא.
create or replace function public.consume_coupon_reservation(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_coupon_id uuid;
begin
  update public.coupon_reservations
     set consumed_at = now()
   where id = p_reservation_id
     and consumed_at is null
     and released_at is null
  returning coupon_id into v_coupon_id;

  if v_coupon_id is null then
    return false;  -- לא קיים / כבר נצרך / שוחרר
  end if;

  update public.coupons
     set used_count = coalesce(used_count, 0) + 1
   where id = v_coupon_id;

  return true;
end;
$$;

-- ============================================================================
-- release_coupon_reservation — תשלום נכשל → משחררים מיד
-- ============================================================================
create or replace function public.release_coupon_reservation(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.coupon_reservations
     set released_at = now()
   where id = p_reservation_id
     and consumed_at is null
     and released_at is null;
  return found;
end;
$$;

-- שלוש הפונקציות הן SECURITY DEFINER וכותבות לקופונים — רק ה-API (service_role)
-- רשאי לקרוא להן. בלי ה-REVOKE, כל דפדפן עם ה-anon key היה יכול לשרוף קופונים.
revoke all on function public.reserve_coupon(text, uuid) from public, anon, authenticated;
revoke all on function public.consume_coupon_reservation(uuid) from public, anon, authenticated;
revoke all on function public.release_coupon_reservation(uuid) from public, anon, authenticated;
grant execute on function public.reserve_coupon(text, uuid) to service_role;
grant execute on function public.consume_coupon_reservation(uuid) to service_role;
grant execute on function public.release_coupon_reservation(uuid) to service_role;
