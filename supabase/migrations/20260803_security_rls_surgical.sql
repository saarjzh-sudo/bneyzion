-- ============================================================================
-- אבטחה — תיקון כירורגי, 3.8.2026
-- ============================================================================
-- הקובץ הזה מחליף שלוש מיגרציות רחבות שנכתבו **לפני** שהייתה גישה ל-DB.
-- סקר קריאה-בלבד על הפרודקשן (3.8) הראה שרוב ההנחות שלהן שגויות: המדיניויות
-- כבר קיימות ותקינות. מיגרציה רחבה במצב כזה אינה "הקשחה" — היא סיכון:
--   • היא הייתה מוסיפה `anon_read` ל-`payment_products`, שכרגע RLS פעיל
--     ואפס מדיניויות (כלומר סגור לחלוטין) — כלומר **פתיחה** בשם הקשחה.
--   • היא הייתה מוסיפה מדיניויות כפולות מעל מדיניויות מכוילות היטב.
--
-- מה שאושש בפועל — ורק זה מטופל כאן:
--   1. orders.user_own הוא ALL      → לקוח מסמן הזמנה כשולמה (חדש, קריטי)
--   2. course_enrollments.user_own ALL → הרשמה עצמית לקורס בתשלום (H12)
--   3. community_course_lessons.anon_read = true (H10)
--   4. course_sessions.anon_read = true (H11)
--   5. lesson_dedications "public reads active dedications" (H8)
--   6. series_rabbis / lesson_rabbis: auth.role()='authenticated' (M7)
--   7. donations.anon_insert WITH CHECK (true)
--
-- מה שנבדק ונמצא **תקין** — לא נוגעים: user_roles (U1), contact_messages,
-- profiles, community_members, coupons, site_settings, products,
-- product_categories, dedication_settings, payment_products, grow_webhook_log,
-- shut_archive, migration_*, newsletter_subscribers, user_access_tags,
-- וכל עשר טבלאות user_* (כולן user_own עם `(auth.uid())::text = user_id`).
--
-- הערת-טיפוסים: `auth.uid()` היא uuid; רוב עמודות-הזהות כאן הן **text**.
-- הסכימה משתמשת ב-`(auth.uid())::text = user_id` — נשמרת אותה צורה בדיוק.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1. orders — לקוח יכול לסמן את ההזמנה של עצמו כשולמה  ⚠️ קריטי
-- ────────────────────────────────────────────────────────────────────────────
--   orders · user_own · cmd=ALL · using ((auth.uid())::text = user_id)
--
-- `ALL`, לא `SELECT` — וללא `WITH CHECK`, שב-UPDATE נופל בחזרה לביטוי ה-USING.
-- כלומר קונה מחובר יכול:
--   PATCH /rest/v1/orders?id=eq.<ההזמנה שלו>  {"payment_status":"completed"}
--
-- `api/store/order-download.ts` בודק אך ורק `payment_status === 'completed'`
-- ומנפיק signed URLs. יוצרים הזמנה, לא משלמים, הופכים עמודה, מורידים.
--
-- זה עוקף את **כל** חבילת C1/H1/H2: אין צורך ב-webhook מזויף, אין תעתוע-מחיר
-- ואין טריק orderId. שתי סריקות-קוד לא מצאו את זה כי שתיהן קראו קוד אפליקציה
-- ולא מדיניויות.
--
-- התיקון: לפצל את user_own לקריאה בלבד. יצירה ועדכון נעשים ממילא רק ב-
-- create-payment / webhook עם service_role, שעוקף RLS.
drop policy if exists "user_own" on public.orders;

create policy "orders_owner_read" on public.orders
  for select
  using ((auth.uid())::text = user_id);

-- orders_admin_all כבר קיימת ותקינה (has_role positional) — לא נוגעים בה.


-- ────────────────────────────────────────────────────────────────────────────
-- 2. course_enrollments — הרשמה עצמית לקורס בתשלום (H12)
-- ────────────────────────────────────────────────────────────────────────────
--   course_enrollments · user_own · cmd=ALL · using ((auth.uid())::text = user_id)
--
-- המדיניות בודקת רק שה-user_id הוא שלך — לא שהקורס פתוח. ולכן
-- `useEnrollInCourse` (useCourseEnrollment.ts:120) יכול להירשם לכל courseId,
-- כולל קורס בתשלום. זה גם מה שהיה מנטרל את תיקוני H10/H11 למטה, שנשענים על
-- "הרשמה פעילה" כדי להעניק גישה.
drop policy if exists "user_own" on public.course_enrollments;

create policy "course_enrollments_owner_read" on public.course_enrollments
  for select
  using ((auth.uid())::text = user_id);

-- הרשמה עצמית — רק לקורס פתוח. קורס בתשלום נרשם ע"י ה-webhook (service_role)
-- או ע"י אדמין.
create policy "course_enrollments_self_insert_open_only" on public.course_enrollments
  for insert to authenticated
  with check (
    (auth.uid())::text = user_id
    and exists (
      select 1 from public.community_courses c
      where c.id = course_enrollments.course_id
        and (coalesce(c.access_type, 'open') = 'open' or c.access_tag is null)
    )
  );

-- admin_read_level14 כבר קיימת. מוסיפים ניהול מלא לאדמין (היה קריאה בלבד).
drop policy if exists "course_enrollments_admin_all" on public.course_enrollments;
create policy "course_enrollments_admin_all" on public.course_enrollments
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));


-- ────────────────────────────────────────────────────────────────────────────
-- 3. community_course_lessons — תוכן בתשלום מוגש לאנונימי (H10)
-- ────────────────────────────────────────────────────────────────────────────
--   community_course_lessons · anon_read · SELECT · using (true)
--
-- אושש: `GET /rest/v1/community_course_lessons?course_id=eq.<id>&select=*`
-- עם ה-anon key מה-bundle מחזיר video_url, audio_url, attachment_url,
-- content_html, summary_html, presentation_url, drive_folder_url —
-- לכל שיעור בתשלום, בלי התחברות ובלי רכישה.
-- ה-paywall היה תנאי-JSX בלבד: `grep has_access_tag` מחזיר קורא אחד,
-- src/hooks/useUserAccess.ts, קוד React.
drop policy if exists "anon_read" on public.community_course_lessons;

create policy "ccl_entitled_read" on public.community_course_lessons
  for select
  using (
    exists (
      select 1 from public.community_courses c
      where c.id = community_course_lessons.course_id
        and (
          coalesce(c.access_type, 'open') = 'open'
          or c.access_tag is null
          or exists (
            select 1 from public.user_access_tags t
            where t.tag = c.access_tag
              and (t.user_id = auth.uid()
                   or lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
              and t.cancelled_at is null
              and (t.valid_until is null or t.valid_until > now())
          )
          or exists (
            select 1 from public.course_enrollments e
            where e.course_id = c.id
              and e.user_id = (auth.uid())::text
              and e.status = 'active'
          )
        )
    )
    or has_role(auth.uid(), 'admin'::app_role)
  );

-- תוכן-עניינים ציבורי לדף-המכירה: כותרות ומספרי-שיעור בלבד.
-- **ללא** content_html / summary_html / video_url / audio_url /
-- attachment_url / presentation_url / drive_folder_url.
create or replace view public.public_course_lesson_index
with (security_invoker = false) as
  select id, course_id, lesson_number, week_number,
         bible_book, bible_chapter, title, description,
         layer_type, status, thumbnail_url, published_at, created_at
  from public.community_course_lessons
  where status = 'published';

grant select on public.public_course_lesson_index to anon, authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. course_sessions — zoom_link / recording_url לכל גולש (H11)
-- ────────────────────────────────────────────────────────────────────────────
--   course_sessions · anon_read · SELECT · using (true)
--
-- השער היחיד היה `{isEnrolled && ...}` ב-JSX — הקישורים היו ב-payload של כל
-- מבקר. CommunityPage.tsx:115 אפילו רינדר nextSession.zoom_link בלי בדיקה.
--
-- האפליקציה תלויה בכך שהשאילתה הלא-מסוננת עובדת עבור נרשמים, ולכן: view
-- ציבורי ללוח-הזמנים + טבלת-בסיס מוגבלת-זכאות לקישורים. הקליינט ממזג.
drop policy if exists "anon_read" on public.course_sessions;

create policy "course_sessions_entitled_read" on public.course_sessions
  for select
  using (
    exists (
      select 1 from public.course_enrollments e
      where e.course_id = course_sessions.course_id
        and e.user_id = (auth.uid())::text
        and e.status = 'active'
    )
    or exists (
      select 1
      from public.community_courses c
      join public.user_access_tags t on t.tag = c.access_tag
      where c.id = course_sessions.course_id
        and (t.user_id = auth.uid()
             or lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
        and t.cancelled_at is null
        and (t.valid_until is null or t.valid_until > now())
    )
    or has_role(auth.uid(), 'admin'::app_role)
  );

create policy "course_sessions_admin_write" on public.course_sessions
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- לוח-זמנים ציבורי — בלי zoom_link ובלי recording_url.
create or replace view public.public_course_sessions
with (security_invoker = false) as
  select id, course_id, session_number, title, description,
         session_date, duration_minutes, status, is_recorded, created_at
  from public.course_sessions;

grant select on public.public_course_sessions to anon, authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- 5. lesson_dedications — PII של רוכשים לאנונימי (H8)
-- ────────────────────────────────────────────────────────────────────────────
--   lesson_dedications · "public reads active dedications"
--     · SELECT · to anon,authenticated · using (status = 'active')
--
-- RLS היא ברמת-שורה, לא ברמת-עמודה. 'active' הוא בדיוק המצב שכל הקדשה
-- **ששולמה** מגיעה אליו, ולכן `select=*` אחד מ-anon החזיר dedicator_email,
-- dedicator_phone, asmachta, amount ו-raw_payload (payload התשלום מ-Grow).
drop policy if exists "public reads active dedications" on public.lesson_dedications;

-- "users read own dedications" ו-"admins manage dedications" כבר קיימות
-- ותקינות — לא נוגעים.

-- ה-badge הציבורי: רק מה שמרונדר בפועל.
create or replace view public.public_lesson_dedications
with (security_invoker = false) as
  select id, scope, lesson_id, series_id,
         dedication_type, dedicated_name, dedicator_name,
         message, created_at, status
  from public.lesson_dedications
  where status = 'active';

grant select on public.public_lesson_dedications to anon, authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- 6. series_rabbis / lesson_rabbis — auth.role() אינו הרשאה (M7)
-- ────────────────────────────────────────────────────────────────────────────
--   auth_insert_series_rabbis · INSERT · with check (auth.role() = 'authenticated')
--
-- כל מי שהתחבר עם חשבון Google כלשהו יכול היה להזריק קישורי רב↔תוכן ולשנות
-- ייחוס של שיעורים וסדרות.
drop policy if exists "auth_insert_series_rabbis" on public.series_rabbis;
drop policy if exists "auth_insert_lesson_rabbis" on public.lesson_rabbis;

create policy "series_rabbis_admin_write" on public.series_rabbis
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "lesson_rabbis_admin_write" on public.lesson_rabbis
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- מדיניויות ה-anon_read_* הקיימות נשארות — הייחוס אמור להיות ציבורי.


-- ────────────────────────────────────────────────────────────────────────────
-- 7. donations — הזרקת שורות-תרומה אנונימית
-- ────────────────────────────────────────────────────────────────────────────
--   donations · anon_insert · INSERT · with check (true)
--
-- כל אחד יכול להכניס שורה, כולל `payment_status: 'completed'` וסכום שרירותי.
-- זה מזין את yehoshua_campaign_stats ואת campaign_stats — שני views שמוענקים
-- ל-anon ומוצגים בדפי-הקמפיין הציבוריים. כלומר: זיוף "גויסו ₪X" באתר.
--
-- אין צורך ב-INSERT אנונימי כאן: היצירה האמיתית היא ב-
-- api/grow/create-payment.ts עם service_role, שעוקף RLS.
drop policy if exists "anon_insert" on public.donations;

-- הערה: אין מדיניות SELECT ל-anon על donations, וגם לא הייתה. הטענה
-- באודיט שהטבלה קריאה לציבור (C2) **הופרכה** בסקר — היא נבעה מהסקה מתוך
-- useRecentDonations/useDonationStats, שרצים בדף ציבורי אבל **מחזירים
-- כלום בשקט**. קיר-התורמים ומונה-התורמים שבורים, לא דולפים.

-- אגרגט בלבד — מחזיר את מונה-התורמים לתפקוד בלי לחשוף שום שורת-תורם.
create or replace view public.public_donation_stats
with (security_invoker = false) as
  select count(*)::bigint as donor_count,
         coalesce(sum(amount), 0)::numeric as total_raised
  from public.donations
  where payment_status = 'completed';

grant select on public.public_donation_stats to anon, authenticated;

-- קיר-התורמים (שמות + סכומים) — ה-view נוצר אך **אינו** מוענק ל-anon.
-- הוא שבור היום, ולהחיות אותו פירושו לפרסם שמות תורמים באתר — החלטת-מוצר
-- ופרטיות, לא החלטת-אבטחה. להפעלה, אחרי אישור:
--     grant select on public.public_donation_wall to anon, authenticated;
create or replace view public.public_donation_wall
with (security_invoker = false) as
  select id, donor_name, amount, dedication_type, dedication_name, created_at
  from public.donations
  where payment_status = 'completed';


-- ────────────────────────────────────────────────────────────────────────────
-- 8. site_questions — asker_email בשאלות שפורסמו
-- ────────────────────────────────────────────────────────────────────────────
--   "public reads published questions" · using (is_published AND answer IS NOT NULL)
--
-- מדיניות ה-INSERT כאן מצוינת (כופה status='pending', is_published=false,
-- answer IS NULL) — לא נוגעים בה. אבל ה-SELECT הוא סינון-**שורות**, ולכן
-- `select=*` על שאלה שפורסמה עדיין מחזיר את `asker_email` של השואל.
create or replace view public.public_site_questions
with (security_invoker = false) as
  select id, asker_name, question, answer, answered_by, answered_at, created_at
  from public.site_questions
  where is_published = true and answer is not null;

grant select on public.public_site_questions to anon, authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- 9. M9 — אינדקס ייחודי על מזהה-העסקה (השלמה לשער האידמפוטנטיות בקוד)
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  begin
    execute 'create unique index if not exists uq_orders_payment_id
               on public.orders (payment_id) where payment_id is not null';
  exception when unique_violation then
    raise warning 'uq_orders_payment_id not created — duplicate payment_id values exist in orders. Clean up, then re-run.';
  end;
  begin
    execute 'create unique index if not exists uq_donations_payment_id
               on public.donations (payment_id) where payment_id is not null';
  exception when unique_violation then
    raise warning 'uq_donations_payment_id not created — duplicate payment_id values exist in donations.';
  end;
end $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 10. אחסון — M12 הופרך, ובמקומו נמצא ממצא אמיתי
-- ────────────────────────────────────────────────────────────────────────────
-- סקר storage (4.8): **המדיניות "auth_upload_thumbnails" אינה קיימת ב-DB הזה.**
-- ל-bucket "bnei-zion-thumbnails" אין ולו מדיניות אחת, ולכן כתיבה מהדפדפן חסומה
-- ממילא (RLS פעיל + אפס מדיניויות = deny). הכותב היחיד הוא פונקציית הקצה
-- generate-cover, שרצה עם service_role ועוקפת RLS.
-- ➜ M12 נשען על קריאת 20260612_multi_rabbi_join_tables.sql; המדיניות שם
--   מעולם לא הוחלה. **אין ממצא.** הוספת מדיניויות שם הייתה שינוי-התנהגות,
--   לא תיקון-אבטחה.
--
-- מה שכן נמצא — ה-bucket "fix-screenshots":
--     fixshots anon upload · INSERT · {anon} · with_check (bucket_id = 'fix-screenshots')
--     fixshots anon read   · SELECT · {anon}
-- bucket ציבורי, בלי הגבלת גודל, בלי הגבלת MIME, **ובלי שום התייחסות
-- בקוד** (grep על src/ api/ supabase/functions/ מחזיר אפס).
--
-- כלומר: נקודת-העלאה אנונימית פתוחה לאינטרנט על דומיין-האחסון של הפרויקט.
-- כל אחד מעלה כל קובץ מכל סוג ובכל גודל, וקורא אותו בחזרה — אחסון-קבצים
-- חינמי לתוכן זר על שם העמותה, כולל סוגי-קובץ שלא נועדו להיות מוגשים.
--
-- הטבלאות fix_items / fix_rounds קיימות עם RLS ואפס מדיניויות, כלומר
-- הפיצ'ר הזה רדום. מסירים את ההעלאה האנונימית; הקריאה נשארת כדי לא לשבור
-- קישורים לצילומים שכבר הועלו.
drop policy if exists "fixshots anon upload" on storage.objects;

-- הגבלות ברמת-ה-bucket כהגנה שנייה, גם על ה-buckets הציבוריים שאין להם
-- מדיניות כתיבה — כדי שכל מדיניות עתידית תיוולד מוגבלת.
update storage.buckets
   set file_size_limit = coalesce(file_size_limit, 10485760),
       allowed_mime_types = coalesce(allowed_mime_types,
         array['image/jpeg','image/png','image/webp','image/gif'])
 where id in ('fix-screenshots', 'bnei-zion-thumbnails', 'lesson-images', 'miracle-images');


-- ────────────────────────────────────────────────────────────────────────────
-- 11. has_role — SECURITY DEFINER בלי search_path קבוע
-- ────────────────────────────────────────────────────────────────────────────
-- נמצא בסקר 3.8:
--
--   has_access_tag  → SECURITY DEFINER, proconfig = {search_path=public}   ✓
--   has_role        → SECURITY DEFINER, proconfig = NULL                   ✗
--
-- כ-40 מדיניויות RLS בפרויקט עוברות דרך has_role, כולל כל התיקונים בקובץ הזה.
-- פונקציית SECURITY DEFINER רצה בהרשאות הבעלים; בלי search_path קבוע היא
-- פותרת שמות לפי ה-search_path של **הקורא**.
--
-- כאן ההפניה לטבלה מוסמכת בסכימה (`public.user_roles`), ולכן אין חטיפה
-- טריוויאלית — אבל פתרון-אופרטורים (`=` על app_role) עדיין נפתר דרך
-- ה-search_path, וזו תבנית-הסלמה מוכרת. הלינטר של Supabase מסמן אותה
-- (`function_search_path_mutable`). הפונקציה האחות כבר עושה את זה נכון.
--
-- ALTER ולא CREATE OR REPLACE — לא נוגעים בגוף הפונקציה, רק מקבעים את
-- ההקשר. שינוי הגוף היה מסכן 40 מדיניויות בבת אחת.
alter function public.has_role(uuid, app_role) set search_path = public, pg_temp;
