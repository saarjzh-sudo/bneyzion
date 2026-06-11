# 🏆 פרומפט הזהב v2 — סגירת פערים + זיהוי פערים חדשים (בני ציון)

> העתק את כל הבלוק שבמסגרת לסשן הבא. הוא runbook מלא: גם לסגור את 409 הפערים הקיימים, וגם לזהות פערים חדשים בכל זמן.

---

```
אתה bneyzion-migrator עם הסקיל bneyzion-migration-parity. עבוד מ-/Users/saarj/Downloads/saar-workspace/bneyzion.
המשימה: לסגור את הפערים הקיימים בין האתר הישן (bneyzion.co.il) לחדש (bneyzion.vercel.app + Supabase),
ולזהות פערים חדשים. קרא קודם: scripts/parity/SKILL.md + KNOWLEDGE.md + scripts/parity/reports/missing-FINAL.json.

═══════ מצב נוכחי (9.6.2026 ✓ updated) ═══════
- כל האתר הישן נסרק (10,157 עמודים, שני המאגרים). אגף המורים מאומת 100% (0 חוסרים, כל 373 ה-attachments
  הועברו ל-Supabase Storage, 0 על האתר הישן). Rule 13 violations = 0.
- missing-FINAL.json = 409 → אחרי re-verification בסשן ה׳: 259 confirmed → **2 גיתות אמיתיות בלבד**:
  - `פרשת קורח | טז-יח` (45 שיעורים, id aa50e54c) — הוכנס
  - `חמאה ודבש - ישעיהו` (1 שיעור, id 10e20007) — הוכנס
- שאר 259 ה"חוסרים" = aggregation/navigation pages של האתר הישן. לא שיעורים פרטניים.
  **כלל Depth:** depth≤4 = כמעט תמיד category/series-listing page (לא lesson). depth≥6 = lesson פרטני.
  depth=5 = lesson רק אם יש S3/video/PDF ייחודי + H1 שונה משם הסדרה.
- **פרשנות למספרי אתר ישן:** "ימי עיון" 33-43 PDFs = handouts בכנסים, לא שיעורים חדשים (הם כבר בDB).
  "הפטרות מועדים" = aggregation pages שמקשרות לשיעורים קיימים.
  "פרשת X" depth=4 = series page קיימת (אפילו אם הtoken-overlap נכשל). בדוק ישירות: SELECT FROM series WHERE title ILIKE '%ראשי הכותרת%'.

═══════ מפתחות (מ-api-keys.md, מחוץ ל-git) ═══════
- SUPABASE_MANAGEMENT_API_TOKEN = sbp_...   (SQL — Management API)
- SUPABASE_SERVICE_ROLE (bnei-zion) = eyJ... (העלאות Storage)
- project ref: pzvmwfexeiruelwiujxn | bucket: lesson-attachments
- כל פקודה: env -u HTTPS_PROXY -u HTTP_PROXY NO_PROXY='*' ...  (NetSpark — חובה proxy מנוטרל / curl --noproxy '*')

═══════ חוקי ברזל (לא לסטות) ═══════
1. Rule 13 — attachment_url תמיד על Supabase Storage (pzvmwfexeiruelwiujxn.supabase.co). אסור bneyzion.co.il.
2. גיבוי לפני כל write: CREATE TABLE lessons_bak_YYYYMMDD AS SELECT * FROM lessons; (וגם series_bak אם נוגעים בסדרות).
3. אל תמציא תוכן/כותרת/שם רב. אין ודאות → השאר + רשימה ליואב.
4. ground-truth + צילום — אסור "DONE" בלי צילום פופאפ חי שמראה PDF/תוכן מרונדר inline.
5. אסור push/deploy בלי "push"/"deploy" מפורש מסער. שינויי DB+Storage מותרים אחרי גיבוי.
6. NFC normalize לכל השוואה. "חוסר" נבדק מול כל השיעורים (לא תת-קבוצה). Word/Office = attachment לגיטימי, לא שבור.

═══════ שלב 1 — סגירת 409 הפערים הקיימים ═══════
א. טען missing-FINAL.json. הרץ אימות-מחדש רופף (significant-token containment מול כל title ב-lessons) כדי
   לזרוק וריאנטי-ניסוח שכבר קיימים → "confirmed-missing". (חלק מ-409 הם "מזמור כז | ..." מול שם אחר בחדש.)
ב. קבץ confirmed-missing לפי bible_book + סדרה (לפי מבנה ה-URL הישן ולפי הכותרת).
ג. לכל פריט — מצא/צור את הסדרה היעד:
   - חפש series קיימת: SELECT id,title FROM series WHERE bible_book=... AND title ILIKE ... AND audience_tags @> ARRAY['general'].
   - אם אין — צור: INSERT INTO series (title, bible_book, audience_tags, status, parent_id) VALUES (...,'{book}',ARRAY['general'],'published', <category_parent_id>);
     (parent_id = שורש הקטגוריה המתאים; ראה themes/series קיימים לאותו ספר.)
ד. צור את השיעור (lessons NOT NULL: title; שאר עם default). INSERT מומלץ:
   INSERT INTO lessons (title, bible_book, bible_chapter, series_id, audience_tags, source_type, status,
     attachment_url, legacy_attachment_url, video_url, audio_url, content, description, published_at)
   VALUES ('<title>','<book>',<chapter|null>,'<series_id>',ARRAY['general'],
           '<pdf|video|audio|text>','published', <storage_url|null>, <old_url|null>,
           <yt|null>, <audio|null>, <scraped_html|null>, <250-char-desc|null>, NOW());
   - source_type: 'pdf' אם יש קובץ, 'video'/'audio' אם מדיה, אחרת 'text'.
   - יש PDF/Word בישן (pdfs[]): curl --noproxy '*' הורד → ודא file=PDF/Office → העלה ל-Storage
     (PUT {ref}.supabase.co/storage/v1/object/lesson-attachments/{key} עם Authorization: Bearer SERVICE_ROLE,
      x-upsert:true) → attachment_url = .../object/public/lesson-attachments/{key}. (לוגיקה מוכנה ב-rehost script.)
   - בלי PDF (טקסט/שיעור): fetch_html של ה-url הישן → חלץ H1+גוף (כמו fill-teacher-content.py: extract_lesson_content_from_page),
     אמת H1≡title ≥0.75 → content+description. מדיה: youtube/soundcloud → video_url/audio_url.
   - confidence gate: התאמה ודאית בלבד. ספק → אל תיצור, רשום ל-yoav.
ה. אחרי כל ~20 → אמת חי: פתח את הדף/פופאפ בחדש (Firecrawl/Chrome), צלם שהשיעור מופיע והקובץ/תוכן מרונדר.
ו. בסוף: דווח כמה נוצרו (לפי ספר/סוג), כמה נשארו ל-yoav, וצילומים. עדכן KNOWLEDGE.md. אל תפרוס בלי אישור.

═══════ שלב 2 — זיהוי פערים חדשים (בכל זמן / בקרה שוטפת) ═══════
א. crawl טרי מלא + ניתוח:
   env -u HTTPS_PROXY -u HTTP_PROXY NO_PROXY='*' SUPABASE_MANAGEMENT_API_TOKEN=sbp_... \
     python3 scripts/parity/audit_full.py --max-pages 9000 --workers 8
   # אם "crawl חלקי" → הרץ שוב עם --resume עד "crawl הושלם ✓" (checkpoint שורד kills).
   python3 scripts/parity/analyze_missing.py            # → reports/missing-TRUE-*.json
ב. diff מול הרשימה הקודמת: השווה missing-TRUE החדש מול missing-FINAL.json הישן.
   - פריטים שמופיעים עכשיו ולא היו קודם = פערים חדשים (regression — תוכן שנמחק/נשבר/שינה כותרת).
   - פריטים שהיו ואינם = נסגרו. ✓
ג. בדיקה ממוקדת אחרי כל עריכת תוכן: python3 scripts/parity/audit_book.py --book <הספר שנגעת בו>
   (כולל אימות-חוסרים גלובלי; ודא 0 חוסרים אמיתיים + 0 attachments על הישן).
ד. בדיקת Rule 13 (חובה לפני מחיקת האתר הישן):
   python3 scripts/parity/rehost... --audit   # או SQL: SELECT COUNT(*) FROM lessons WHERE attachment_url LIKE '%bneyzion.co.il%'  → חייב 0.
   כל עוד >0 — אסור למחוק את הישן (תישבר התצוגה).
ה. תזמון מומלץ: full audit חודשי (שמור JSON ב-reports/ להשוואה) · audit_book אחרי כל ייבוא/עריכה ·
   rehost --audit לפני כל "מוחקים את האתר הישן".

═══════ פרשנות (אל תבהל משווא — כל מספר-חוסרים גולמי מנופח) ═══════
- "חוסר" שנמצא תחת וריאנט-כותרת (מקף/רווח/"פרשת"/audience) = לא חוסר. אמת מול כל ה-titles + לפי שם-קובץ-PDF.
- raw audit_full missing מנופח ע"י דפי קטגוריה/סדרה + כפילויות (האתר הישן מוכפל ~פי 7). analyze_missing מנפה.
- Word/Excel/PPT content-type = attachment תקין.
- אגף המורים כבר 0 חוסרים — אם מופיע שם חוסר חדש, חשד לרגרסיה אמיתית, בדוק מיד.

תוצרים בסוף הסשן: כמה פערים נסגרו, רשימת מה שנשאר (missing-FINAL מעודכן), צילומי אימות, עדכון KNOWLEDGE.md.
```

---

## קבצים שהפרומפט מסתמך עליהם
- `scripts/parity/SKILL.md` · `audit_full.py` (--resume/--workers) · `analyze_missing.py` · `audit_book.py` · `parity_engine.py`
- `scripts/rehost_bneyzion_attachments.py` (לוגיקת download→Storage→update מוכנה לשימוש חוזר)
- `scripts/parity/reports/missing-FINAL.json` (409 הפערים) · `reports/*.json` (היסטוריה)
- `.claude/agents/bneyzion-migrator.md`

*נכתב 9.6.2026 אחרי crawl מלא (10,157 עמודים) + 4 שלבי אימות (3,643→409). אגף מורים סגור; הפרומפט סוגר את הצד הציבורי.*
