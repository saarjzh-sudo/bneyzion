# 🏆 פרומפט הזהב — ביקורת מיגרציה 1:1 לבני ציון

> העתק-הדבק את הבלוק למטה לכל סשן חדש שבו אתה רוצה לבדוק/לתקן את שלמות הדאטה של בני ציון
> מול האתר הישן. עובד לכל מקרה: בדיקה חד-פעמית, תיקון אחרי שינוי, או בקרה שוטפת.

---

## 📋 הפרומפט (העתק מכאן)

```
תפעיל את הסוכן bneyzion-migrator עם הסקיל bneyzion-migration-parity.
המטרה: לוודא שהאתר החדש (bneyzion.vercel.app + Supabase) הוא 1:1 מול האתר הישן
(bneyzion.co.il) — כל שיעור/מאמר/דף עבודה קיים, נפתח, עם אותו טקסט ואותן כותרות.
בלי תוספות, בלי חוסרים.

חוקי ברזל (לא לסטות):
1. Rule 13 — כל attachment_url חייב לשבת על Supabase Storage (pzvmwfexeiruelwiujxn.supabase.co).
   אסור bneyzion.co.il — האתר הישן יימחק והדומיין יעבור לאתר החדש. אם נמצא URL על הישן →
   הורד → העלה ל-Storage (bucket lesson-attachments) → עדכן DB. המקור הישן נשמר ב-legacy_attachment_url.
2. proxy מנוטרל בכל קריאת רשת: env -u HTTPS_PROXY -u HTTP_PROXY NO_PROXY='*' / curl --noproxy '*'.
3. גיבוי DB לפני כל UPDATE: CREATE TABLE lessons_bak_parity_YYYYMMDD AS SELECT * FROM lessons.
4. ground-truth + צילום — אסור "תקין" בלי הוכחה חיה. PDF אמיתי = 200 + application/pdf (או Word/Office) + >0 bytes. gview מת.
5. אסור push/deploy בלי "push"/"deploy" מפורש ממני. שינויי DB מותרים אחרי גיבוי.
6. NFC normalize לכל השוואת כותרת. "חוסר" נבדק מול כל השיעורים, לא רק תת-קבוצה.
7. אל תמציא תוכן. אין התאמה ודאית → השאר ריק + רשימה ליואב.

הפעולות (read-only כברירת מחדל):
- ביקורת ספר בודד:   python3 scripts/parity/audit_book.py --book <שם הספר>
- ביקורת כל האתר:    python3 scripts/parity/audit_full.py --max-pages 6000
- תיקון attachments על הישן: python3 scripts/rehost_bneyzion_attachments.py --audit  (ואז --run --resume)

תמיד הרץ עם:
  env -u HTTPS_PROXY -u HTTP_PROXY NO_PROXY='*' SUPABASE_MANAGEMENT_API_TOKEN=<מ-api-keys.md> python3 ...
  (לרי-host צריך גם SUPABASE_SERVICE_ROLE=<מ-api-keys.md, שורת bnei-zion service_role>)

פרשנות תוצאות (אל תבהל משווא):
- "PDF שבור" שהוא Content-Type Word/Office = לגיטימי, לא שבור.
- "חוסר" שנמצא תחת וריאנט-כותרת (הבדל מקף/רווח/audience) = לא חוסר אמיתי. תאמת מול כל השיעורים.
- "תוספת" יכולה לנבוע מגרנולריות crawl (series↔lesson) — לאמת מול האתר הישן לפני שמכריזים.

בסוף: דוח parity (מותאמים/חוסרים-אמיתיים/תוספות/attachments), רשימת חוסרים-אמיתיים אם יש,
וצילום חי של פופאפ אחד שמראה PDF מרונדר inline. עדכן KNOWLEDGE.md. אל תפרוס/תדחוף בלי אישור.
```

---

## 🔁 בקרה שוטפת (מומלץ אחרי כל שינוי תוכן / אחת לתקופה)

1. **אחרי כל ייבוא/עריכת תוכן** — הרץ `audit_book.py --book <הספר שנגעת בו>`. ודא 0 חוסרים-אמיתיים, 0 על הישן.
2. **בקרה חודשית** — הרץ `audit_full.py` על כל האתר. שמור את ה-JSON ב-`reports/` והשווה לחודש קודם (regressions).
3. **לפני מחיקת האתר הישן** — חובה: `rehost_bneyzion_attachments.py --audit` חייב להחזיר 0 על bneyzion.co.il.
   כל עוד יש >0 — אסור למחוק את הישן (תישבר התצוגה).
4. **כל ספר, פעם אחת** — לעבור ספר-ספר: בראשית, שמות, ויקרא, במדבר, דברים, יהושע... עד שכל אחד = 0 חוסרים.

## 🗂️ קבצים
- `scripts/parity/SKILL.md` — המפרט המלא (13 כללי ברזל, pipeline).
- `scripts/parity/audit_book.py` — ביקורת ספר (העובד; reuse של parity_engine).
- `scripts/parity/audit_full.py` — crawl גלובלי של שני המאגרים → diff מול כל הדאטה.
- `scripts/parity/parity_engine.py` — normalize + canonical_match + diff (ספריית ליבה).
- `scripts/rehost_bneyzion_attachments.py` — הורדה מהישן → Supabase Storage → עדכון URL.
- `.claude/agents/bneyzion-migrator.md` — הגדרת הסוכן.
- `reports/` — פלט JSON לכל ריצה (היסטוריה להשוואה).

## 🔑 מפתחות (ב-api-keys.md, מחוץ ל-git)
- `SUPABASE_MANAGEMENT_API_TOKEN` = sbp_... (Management API, SQL)
- `SUPABASE_SERVICE_ROLE` (bnei-zion) = eyJ... (העלאות Storage)

*נוצר 9.6.2026. ריצה ראשונה: בראשית-מורים 129/156 מותאמים, 0 חוסרים אמיתיים, 0 attachments על האתר הישן.*
