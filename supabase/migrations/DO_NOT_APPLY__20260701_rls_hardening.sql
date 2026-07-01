-- ═══════════════════════════════════════════════════════════════════════════
--  ⛔ DO NOT APPLY — הקשחת RLS · מיגרציה מוכנה, לא־מופעלת (T15, פער 14ג)
-- ═══════════════════════════════════════════════════════════════════════════
--
--  נכתב:      1.7.2026 · בסיס b4631c76 · פרויקט pzvmwfexeiruelwiujxn (בני ציון)
--  מקור:      scripts/rls-audit/ + RLS-PLAN.md (קרא אותם לפני שמפעילים)
--
--  ⚠️ הקובץ הזה לא נכנס ל-finish/integration ולא ל-deploy. סער מפעיל אותו
--     ידנית, בסשן נפרד, בזמן שקט, שלב־אחר־שלב, אחרי אימות — לא כבלוק אחד.
--
--  שכבת־ביטחון: אם מריצים את הקובץ בטעות (psql -f / supabase db push) הוא
--  ייעצר מיד עם שגיאה. כדי להפעיל בפועל צריך במכוון:
--        SET rls_hardening.approved = 'yes';
--  לפני ההרצה — ורק אחרי שקראת את RLS-PLAN.md.
--
--  ממצא־מפתח מהמחקר: RLS כבר מופעל על כל הטבלאות (כולל lessons/series ו-60+
--  טבלאות גיבוי). השאילתות הציבוריות רצות דרך policy `anon_read` עם qual=true,
--  ולכן הפעלת־RLS *אינה* הסיכון — הסיכון היה תיאורטי. הבעיה האמיתית היא
--  policies רחבים מדי שחושפים דאטה. המיגרציה הזו מתקנת ארבעה כאלה.
--  אינדקסים: כל השאילתות הציבוריות כבר מאונדקסות — אין אינדקס חדש נדרש.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── שער־ביטחון (עוצר הרצה־בטעות) ──────────────────────────────────────────
DO $guard$
BEGIN
  IF current_setting('rls_hardening.approved', true) IS DISTINCT FROM 'yes' THEN
    RAISE EXCEPTION
      '⛔ מיגרציית הקשחת־RLS חסומה. קרא RLS-PLAN.md, ואז: SET rls_hardening.approved = ''yes''; לפני ההרצה.';
  END IF;
END
$guard$;

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
--  תיקון 1 — order_items · דליפת פרטי־רכישה  (P1, פרטיות)
--  לפני: policy `user_own` cmd=SELECT qual=true → כל אנונימי רואה כל שורות־הזמנה
--        (שם מוצר, מחיר, כמות) של כל הקונים.
--  אחרי: קונה רואה רק את הפריטים של ההזמנות שלו; אדמין רואה הכל; כתיבה = service_role.
--  אימות־קדם: admin Orders.tsx קורא order_items(count) — מכוסה ע"י ענף האדמין.
--             הסליקה כותבת דרך api/grow/webhook.ts (service_role, עוקף RLS) — לא נשבר.
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "user_own" ON public.order_items;

CREATE POLICY "order_items_owner_or_admin_read" ON public.order_items
  FOR SELECT
  USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()::text)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- ═══════════════════════════════════════════════════════════════════════════
--  תיקון 2 — user_roles · חשיפת זהות אדמינים  (P1, info-disclosure)
--  לפני: policy `admin_only` cmd=SELECT qual=true → אנונימי מקבל את user_id של
--        כל האדמינים (משטח תקיפה: יעד ממוקד להשתלטות־חשבון).
--  אחרי: משתמש רואה רק את התפקידים שלו; אדמין רואה הכל.
--  אימות־קדם: AuthContext.tsx קורא תפקיד עצמי (auth.uid()) — עובד.
--             useUsers.ts עושה select('*') בעמוד אדמין — מכוסה ע"י ענף האדמין.
--             has_role הוא SECURITY DEFINER → אין רקורסיית־RLS.
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_only" ON public.user_roles;

CREATE POLICY "user_roles_self_or_admin_read" ON public.user_roles
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- ═══════════════════════════════════════════════════════════════════════════
--  תיקון 3 — fix_items / fix_rounds · כתיבת־אנונימי לדשבורד־QA  (P2)
--  לפני: policy `anon all` cmd=ALL qual+check=true → אנונימי קורא *וגם כותב/מוחק*.
--  אחרי: קריאה־ציבורית נשמרת (דשבורד ה-parity); כתיבה = אדמין/service_role בלבד.
--  ⚠️ אימות־קדם נדרש: ודא שדשבורד ה-fix-rounds (parity_watch) לא כותב עם anon.
--     אם הוא כותב עם service_role — התיקון בטוח. אם עם anon — דחה את התיקון הזה.
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "anon all" ON public.fix_items;
DROP POLICY IF EXISTS "anon all" ON public.fix_rounds;

CREATE POLICY "fix_items_public_read"  ON public.fix_items  FOR SELECT USING (true);
CREATE POLICY "fix_items_admin_write"  ON public.fix_items  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "fix_rounds_public_read" ON public.fix_rounds FOR SELECT USING (true);
CREATE POLICY "fix_rounds_admin_write" ON public.fix_rounds FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ═══════════════════════════════════════════════════════════════════════════
--  תיקון 4 — ohp_* · כתיבת־אנונימי למערכת "אור הפרשה"  (P2, spam/vandalism)
--  לפני: policy `allow_all_ohp_*` cmd=ALL qual+check=true → אנונימי קורא וכותב
--        הודעות/לוגים (ohp_messages, ohp_chat_messages, ohp_send_logs).
--  אחרי: אין גישת־אנונימי כלל. המערכת עובדת דרך service_role (עוקף RLS).
--  ⚠️ אימות־קדם נדרש: ודא שאין frontend אנונימי שקורא/כותב ohp_* (בריפו הזה — אין;
--     הטבלאות שייכות למערכת OMS נפרדת שרצה עם service_role).
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "allow_all_ohp_messages"      ON public.ohp_messages;
DROP POLICY IF EXISTS "allow_all_ohp_chat_messages" ON public.ohp_chat_messages;
DROP POLICY IF EXISTS "allow_all_ohp_send_logs"     ON public.ohp_send_logs;
-- אין policy חדש → RLS מופעל + אפס policy = deny-all לאנונימי; service_role עובד.

-- ═══════════════════════════════════════════════════════════════════════════
--  ⛔ לא־כלול במיגרציה הזו (דורש החלטת־ארכיטקטורה — ראה RLS-PLAN.md §5):
--  תוכן־מורים (audience_tags @> {teachers}) על lessons/series חשוף לאנונימי דרך
--  anon_read qual=true. אי־אפשר לחסום אותו ב-RLS בלי לשבור את "אגף המורים"
--  (T07) שמגיש תוכן־מורים דרך anon ללא auth (החלטה מודעת של סער), ואת "כלי העזר"
--  הדו־תיוגיים שאמורים להיות ציבוריים. חסימת־RLS פה = רגרסיה. הגבול נשאר סינון־
--  frontend (publicAudience.ts) עד שסער יחליט להעביר את אגף־המורים ל-auth + עמודת
--  visibility. סקיצת policy אופציונלית מובאת ב-RLS-PLAN.md, מכוונת ולא מופעלת.
-- ═══════════════════════════════════════════════════════════════════════════

COMMIT;

-- ── Rollback (הדבק והרץ אם צריך לחזור אחורה) ──────────────────────────────
-- BEGIN;
-- DROP POLICY IF EXISTS "order_items_owner_or_admin_read" ON public.order_items;
-- CREATE POLICY "user_own" ON public.order_items FOR SELECT USING (true);
-- DROP POLICY IF EXISTS "user_roles_self_or_admin_read" ON public.user_roles;
-- CREATE POLICY "admin_only" ON public.user_roles FOR SELECT USING (true);
-- DROP POLICY IF EXISTS "fix_items_public_read"  ON public.fix_items;
-- DROP POLICY IF EXISTS "fix_items_admin_write"  ON public.fix_items;
-- DROP POLICY IF EXISTS "fix_rounds_public_read" ON public.fix_rounds;
-- DROP POLICY IF EXISTS "fix_rounds_admin_write" ON public.fix_rounds;
-- CREATE POLICY "anon all" ON public.fix_items  FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "anon all" ON public.fix_rounds FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "allow_all_ohp_messages"      ON public.ohp_messages      FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "allow_all_ohp_chat_messages" ON public.ohp_chat_messages FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "allow_all_ohp_send_logs"     ON public.ohp_send_logs     FOR ALL USING (true) WITH CHECK (true);
-- COMMIT;
