# ✅ _DONE — T15 הקשחת RLS (מחקר + מיגרציה־מוכנה · לא־מופעל)

**branch:** `finish/15-rls-prep` · **בסיס:** `b4631c76` · **תאריך:** 1.7.2026
**סטטוס:** הושלם כמחקר. **לא הופעל כלום בפרודקשן.** לא merge, לא deploy.
`npm run build` = ✅ נקי (built in 4.45s, exit 0).

---

## מה נעשה (4 המשימות של _START-HERE)

1. **Audit edge-functions** ✅ — כל 23 הפונקציות + `api/` ניגשות ב-`service_role`;
   `anonClient` משמש רק לאימות־JWT (`getUser`), לא לדאטה. סליקה = service_role בלבד.
2. **EXPLAIN ANALYZE** ✅ — על 3 השאילתות הציבוריות. כולן מאונדקסות ומהירות
   (series 1.7ms · lessons-by-series 33ms דרך `idx_lessons_series_id` · lesson-by-id 1.3ms).
3. **בדיקת־סליקה** ✅ — `create-payment.ts` + `webhook.ts` = service_role, לא תלויים
   ב-anon על lessons/series/orders. **הקשחת־RLS לא שוברת תשלום.**
4. **מיגרציה־מוכנה + RLS-PLAN** ✅ — קובץ מגודר (לא־להחלה) + תוכנית הפעלה + rollback.

## התגלית המרכזית
RLS **כבר מופעל על כל הטבלאות** (כולל lessons/series ו-60+ גיבויים). "הפעלת RLS"
לא הייתה הסיכון. הסיכון האמיתי = **policies רחבים־מדי שדולפים דאטה**. מצאתי 4,
הוכחתי כל אחד בפנייה חיה עם anon key בלבד (`scripts/rls-audit/anon-probe.sh`).

## הדליפות (מוכחות)
| # | טבלה | דולף | חומרה |
|---|------|------|-------|
| 1 | `order_items` | מחירי־רכישה של כולם | **P1** |
| 2 | `user_roles` | user_id של כל האדמינים | **P1** |
| 3 | `fix_items`/`fix_rounds` | אנונימי קורא+כותב QA | P2 |
| 4 | `ohp_*` | אנונימי קורא+כותב | P2 |

מוגן היטב (אומת `[]`): גיבויים, donations, orders, profiles.

## קבצים שנגעתי בהם (רק באזור־הבעלות של T15)
- `supabase/migrations/DO_NOT_APPLY__20260701_rls_hardening.sql` — חדש (מגודר + rollback)
- `scripts/rls-audit/rls-audit.sql` — חדש
- `scripts/rls-audit/run-audit.sh` — חדש
- `scripts/rls-audit/anon-probe.sh` — חדש
- `scripts/rls-audit/README.md` — חדש
- `RLS-PLAN.md` — חדש (הדוח המלא + סדר־הפעלה בטוח + החלטת־ארכיטקטורה על תוכן־מורים)
- `KNOWLEDGE.md` — שורת־תיעוד אחת
- `_DONE.md` — הקובץ הזה

**לא נגעתי בשום קובץ מחוץ לאזור.** אין תלות בקבצים של מסלולים אחרים.

## מה חסום / דורש החלטת סער
- **תיקונים 1–2 (P1, בטוחים):** מוכנים להפעלה בסשן שקט. סדר מדויק ב-`RLS-PLAN.md §3`.
- **תיקונים 3–4 (P2):** דורשים אימות שהמערכות החיצוניות (parity dashboard, OMS
  "אור הפרשה") כותבות ב-service_role ולא ב-anon — לפני החלה. אם ספק → לדלג, הם P2.
- **תוכן־מורים (הפער המקורי):** אי־אפשר לסגור ב-RLS בלי לשבור את אגף־המורים (T07,
  מוגש דרך anon ללא auth — החלטת סער) ואת כלי־העזר הדו־תיוגיים. **המלצה: להשאיר
  את גבול־ה-frontend כמו שהוא.** הפרדה אמיתית = פרויקט נפרד (עמודת visibility + auth).
  פירוט מלא + סקיצת policy אופציונלית ב-`RLS-PLAN.md §5`.

## איך מפעילים (כשסער מחליט)
1. `SUPABASE_ACCESS_TOKEN=sbp_... ./scripts/rls-audit/anon-probe.sh` (מצב "לפני")
2. psql/SQL-editor: `SET rls_hardening.approved = 'yes';` → הרץ את המיגרציה **תיקון־תיקון**
3. אחרי כל תיקון: `anon-probe.sh` + בדיקת־עשן בעמוד הרלוונטי
4. rollback מוכן בתחתית קובץ־המיגרציה

**⚠️ מסלול זה לא נכנס ל-`finish/integration`/deploy עד שסער אומר במפורש.**
