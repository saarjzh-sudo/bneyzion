# 🔒 RLS-PLAN — הקשחת RLS לבני ציון (T15 · פער 14ג)

**תאריך:** 1.7.2026 · **בסיס:** `b4631c76` · **פרויקט:** `pzvmwfexeiruelwiujxn`
**סטטוס:** מחקר + מיגרציה־מוכנה בלבד. **שום דבר לא הופעל בפרודקשן.**
**החלטה נדרשת מסער:** האם ומתי להפעיל את `supabase/migrations/DO_NOT_APPLY__20260701_rls_hardening.sql`.

---

## 0. תקציר מנהלים (TL;DR)

1. **ההנחה שבבסיס המשימה התהפכה.** RLS כבר **מופעל על כל 130+ הטבלאות** —
   כולל `lessons`, `series` וכל 60+ טבלאות הגיבוי. השאילתות הציבוריות עובדות דרך
   policy `anon_read` עם `qual=true`. לכן **"הפעלת RLS" אינה הסיכון** שתואר בתדריך;
   האינדקסים כבר קיימים והשאילתות מהירות (1.7ms / 33ms / 1.3ms).
2. **הסיכון האמיתי הוא ההפך: policies רחבים־מדי שדולפים דאטה לאנונימי.** מצאתי
   ארבעה, שניים מהם פרטיות־ממשית. הוכחתי כל אחד בפנייה חיה עם anon key בלבד.
3. **הפער שהתדריך התכוון אליו — תוכן־מורים — אי־אפשר לסגור ב-RLS** בלי לשבור את
   אגף־המורים (T07) ואת כלי־העזר הדו־תיוגיים. זו החלטת־ארכיטקטורה, לא מיגרציה. §5.
4. הכנתי מיגרציה מתוקנת, מגודרת (עוצרת הרצה־בטעות), עם rollback, + שלושה כלי־audit.

---

## 1. מצב ה-RLS בפועל (מהמחקר החי)

- **RLS enabled = true על כל הטבלאות** ב-`public`. `rls_forced = false` בכולן
  (תקין — service_role עוקף, וזה מה שכל edge-function וה-webhook צריכים).
- **`lessons` (23,312 שורות) ו-`series` (1,749):** policy יחיד `anon_read`,
  `cmd=SELECT`, `roles={public}`, `qual=true`. אין policy כתיבה → אנונימי/מחובר
  לא יכול לכתוב; רק service_role. **קריאה ציבורית = פתוחה לגמרי (כל השורות).**
- **60+ טבלאות גיבוי** (`lessons_bak_*`, `series_bak_*`, `topics_bak_*`...):
  RLS מופעל, **אין policy לאנונימי** → deny-all. אומת: `GET lessons_bak_20260607`
  עם anon → `[]`. ✅ אין דליפת־גיבויים.
- **טבלאות PII** (`donations`, `orders`, `profiles`, `newsletter_subscribers`,
  `grow_orders`, `user_history`...): מוגנות. אומת: anon → `[]`. ✅

---

## 2. ממצאי ה-audit — ארבע דליפות (מוכחות)

כולן אומתו ב-`scripts/rls-audit/anon-probe.sh` (anon key בלבד, בלי התחברות).

| # | טבלה | policy קיים | מה דולף | חומרה | שורות היום |
|---|------|-------------|---------|-------|-----------|
| 1 | `order_items` | `user_own` SELECT `qual=true` | שם־מוצר, מחיר, כמות של **כל** הרכישות | **P1 פרטיות** | 7 |
| 2 | `user_roles` | `admin_only` SELECT `qual=true` | `user_id` של **כל האדמינים** | **P1 info-leak** | 2 |
| 3 | `fix_items`,`fix_rounds` | `anon all` ALL `qual+check=true` | אנונימי **קורא וכותב/מוחק** דשבורד־QA | P2 | 9 |
| 4 | `ohp_messages`,`ohp_chat_messages`,`ohp_send_logs` | `allow_all_ohp_*` ALL | אנונימי **קורא וכותב** מערכת "אור הפרשה" | P2 spam | 2/4/0 |

**למה P1 על 1–2 למרות ספירה נמוכה:** אלה לא נפח אלא סוג. `order_items` חושף מה כל
לקוח קנה ובכמה — דליפה שגדֵלה עם כל מכירה. `user_roles` נותן לתוקף רשימת־יעדים
מדויקת של חשבונות־האדמין להשתלטות ממוקדת. שניהם נסגרים בלי שום סיכון־רגרסיה (§3).

---

## 3. התיקון המוכן — מה עושה, למה בטוח

הקובץ: `supabase/migrations/DO_NOT_APPLY__20260701_rls_hardening.sql`.
מגודר: אם מריצים בטעות הוא **נעצר בשגיאה** עד שמגדירים במכוון
`SET rls_hardening.approved = 'yes';`.

| תיקון | לפני → אחרי | אימות־קדם שכבר עשיתי |
|-------|-------------|----------------------|
| 1 `order_items` | qual=true → קונה רואה רק שלו, אדמין הכל | admin `Orders.tsx` = ענף אדמין ✓ · הסליקה כותבת ב-service_role ✓ |
| 2 `user_roles` | qual=true → משתמש רואה תפקיד־עצמי, אדמין הכל | `AuthContext` קורא `auth.uid()` ✓ · `useUsers` = ענף אדמין ✓ · `has_role`=SECURITY DEFINER, אין רקורסיה ✓ |
| 3 `fix_*` | anon-all → קריאה־ציבורית נשמרת, כתיבה=אדמין | אין קורא ב-repo הזה — ⚠️ אמת דשבורד parity חיצוני |
| 4 `ohp_*` | allow-all → אין גישת־אנונימי; service_role עובד | אין קורא ב-repo הזה — ⚠️ אמת מערכת OMS חיצונית |

**בטוח כי:** כל השאילתות שנשברות מ-RLS מחמיר הן קריאות של דאטה שהמשתמש ממילא
בעליו, או של אדמין מחובר. אף edge-function וה-webhook לא נוגעים ב-anon לטבלאות
האלה — כולם service_role (אומת ב-audit של edge-functions, §4).

**סדר הפעלה בטוח (סער, בסשן נפרד, זמן שקט):**
1. `./scripts/rls-audit/anon-probe.sh` — צלם את מצב ה"לפני".
2. פתח psql/SQL-editor. הרץ `SET rls_hardening.approved = 'yes';`.
3. הרץ את המיגרציה **תיקון־תיקון** (לא הכל בבת אחת). אחרי כל תיקון —
   `anon-probe.sh` + בדיקת־עשן בעמוד הרלוונטי.
4. תיקון 1: בדוק שהיסטוריית־הזמנות של משתמש עדיין נטענת, ושעמוד admin/Orders עובד.
5. תיקון 2: בדוק התחברות + טעינת תפקיד + עמוד ניהול־משתמשים (admin).
6. תיקונים 3–4: רק אחרי שאימתת שהמערכות החיצוניות (parity dashboard, OMS)
   כותבות ב-service_role. אם ספק — דלג עליהם, הם P2.
7. `anon-probe.sh` — ודא ש-3 הדליפות = `[]`, המוגנים = `[]`, הציבורי קריא.

**Rollback:** בתחתית קובץ־המיגרציה, בלוק מוער — הדבק, הרץ, וחוזרים למצב הקודם.

---

## 4. Audit של edge-functions (משימה 1)

עברתי על כל 23 ה-edge-functions ועל שכבת־ה-`api/`. **כולם ניגשים ל-DB דרך
`SUPABASE_SERVICE_ROLE_KEY`.** מספר פונקציות יוצרות בנוסף `anonClient` — אך
**רק לאימות־זהות** (`getUser` על ה-JWT של הקורא), לא לקריאת/כתיבת דאטה. לכן
הקשחת־RLS אינה משפיעה על אף אחת מהן.

- service_role (כתיבה/קריאה): `grow-webhook`, `create-payment`, `broadcast-notification`,
  `generate-cover`, `issue-paperless-invoice`, `navigation-bot`, `import-*`, `enrich-*`,
  `migrate-*`, `auto-tag-lessons`, `compare-content`, `generate-sitemap`, `scan-*` ועוד.
- anonClient לאימות־JWT בלבד: `generate-cover` (`userClient.getUser`),
  `broadcast-notification`, `auto-tag-lessons`, `compare-content`, `migrate-*`.
- **סליקה:** `api/grow/create-payment.ts` + `api/grow/webhook.ts` — service_role בלבד.
  לא תלויים ב-anon על `lessons`/`series`/`orders`. **הקשחת־RLS לא תשבור תשלום.** ✓
  (מחוזק ע"י §19 ב-KNOWLEDGE: אסור INSERT ל-orders/donations מה-frontend.)

---

## 5. ⛔ תוכן־מורים — למה זה מחוץ למיגרציה (החלטת־ארכיטקטורה)

הפער שהתדריך התכוון אליו: `audience_tags @> {teachers}` על `lessons`/`series`
גלוי לאנונימי דרך `anon_read qual=true`. אומת: `GET lessons?audience_tags=cs.{teachers}`
עם anon → מחזיר שורות. הסינון היום הוא **frontend בלבד** (`publicAudience.ts` +
`.not("audience_tags","cs","{teachers}")` בכל hook ציבורי).

**למה אי־אפשר פשוט לחסום ב-RLS:**
1. **אגף־המורים (T07)** מגיש תוכן־מורים דרך anon **ללא auth** — החלטה מודעת של סער
   (KNOWLEDGE: "אגף המורים יהיה פתוח כמו כל האתר — ללא auth, ללא gating").
   qual שחוסם `{teachers}` היה מרוקן את כל אגף־המורים.
2. **כלי־עזר דו־תיוגיים** (`['teachers','general']`) אמורים להיות ציבוריים
   בשורשי "כלי עזר" מסוימים (`isPublicDualAllowed`). qual גורף היה מסתיר גם אותם.
3. הרשימה של "מותר־ציבורי" היא per-series-id בקוד־frontend, לא flag ב-DB.

**המסקנה (כלל־ברזל מ-KNOWLEDGE §5474):** ל-DB הנוכחי אין הפרדת־תוכן אמיתית —
רק תיוג. הפרדה אמיתית דורשת: (א) עמודת `visibility` על `lessons`/`series`,
(ב) העברת אגף־המורים ל-auth (או route נפרד עם service_role edge-function),
(ג) qual שמסנן `visibility='teachers_only'` + עדכון כל hook. זה **פרויקט**, לא
תיקון־RLS, והוא נוגד החלטה קיימת. **המלצה: להשאיר את גבול־ה-frontend כמו שהוא**
עד שסער יחליט אחרת.

סקיצת policy אופציונלית (מכוונת, **לא** במיגרציה), אם אי־פעם עוברים למודל־visibility:

```sql
-- דורש קודם: ALTER TABLE lessons ADD COLUMN visibility text DEFAULT 'public';
-- ואז backfill מ-audience_tags, ואז:
-- DROP POLICY anon_read ON lessons;
-- CREATE POLICY anon_read_public ON lessons FOR SELECT USING (visibility <> 'teachers_only');
-- ורק אחרי שאגף־המורים עבר ל-edge-function/service_role או ל-auth.
```

---

## 6. מה נשאר לסער

- [ ] להחליט על תיקונים 1–2 (P1, בטוחים) → להפעיל בסשן שקט לפי §3.
- [ ] לאמת מול parity dashboard + מערכת OMS לפני תיקונים 3–4 (P2).
- [ ] להחליט אסטרטגית על תוכן־מורים (§5) — כרגע לא נדרשת פעולה, הגבול תקין.
