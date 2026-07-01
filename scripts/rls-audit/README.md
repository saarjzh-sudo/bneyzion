# scripts/rls-audit — כלי מחקר RLS (T15)

שלושה כלים לאבחון־ואימות מצב ה-RLS של בני ציון (`pzvmwfexeiruelwiujxn`). כולם
קריאה־בלבד. אף אחד מהם לא מפעיל את המיגרציה.

| קובץ | מה עושה | איך מריצים |
|------|---------|-----------|
| `rls-audit.sql` | שאילתות־מלאי (RLS on/off, policies, indexes, EXPLAIN) | דרך `run-audit.sh` או ב-SQL editor |
| `run-audit.sh`  | מריץ את `rls-audit.sql` דרך Management API | `SUPABASE_ACCESS_TOKEN=sbp_... ./run-audit.sh` |
| `anon-probe.sh` | פונה ל-REST הציבורי עם anon key בלבד (כמו זר בלי התחברות) | `./anon-probe.sh` |

**Token:** קרא `SUPABASE_ACCESS_TOKEN` (Management PAT) מ-`api-keys.md`. אסור
לקבע אותו בקוד (KNOWLEDGE §663 — אירוע דלף־מפתח).

## תהליך ההקשחה (סדר מומלץ)
1. `./anon-probe.sh` — לפני: רואים את הדליפות (order_items, user_roles, ohp_*).
2. סער מפעיל את `supabase/migrations/DO_NOT_APPLY__20260701_rls_hardening.sql`
   ידנית, שלב־אחר־שלב (ראה `RLS-PLAN.md`).
3. `./anon-probe.sh` — אחרי: שלוש הדליפות חוזרות `[]`, המוגנים נשארים `[]`,
   הציבורי (series/teacher) נשאר קריא.
4. בדיקת־עשן באתר החי: דף בית, דף־סדרה, דף־שיעור, היסטוריית־הזמנות, עמוד־אדמין.
