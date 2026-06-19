# bneyzion-migration-parity — Skill

**Version:** 1.0 (2026-06-09)
**Scope:** אימות 1:1 מלא בין האתר הישן (bneyzion.co.il) לחדש (bneyzion.vercel.app + Supabase)
**Owner:** bneyzion-migrator agent
**Scripts:** `scripts/parity/` (כל הסקריפטים בתיקייה זו)

---

## מטרה

לוודא שכל שיעור, כל קטגוריה, כל מאמר, כל דף עבודה — **קיים, נפתח, ותואם תוכן** בין האתר הישן לחדש.
1:1 מלא. לא פחות, לא יותר.

---

## Pipeline — 7 שלבים

### שלב A — אינוונטר האתר הישן
**סקריפט:** `step_a_old_inventory.py`

בונה מפה מלאה של האתר הישן:
- מאגר השיעורים: `/מאגר-השיעורים-והמאמרים/` (SSR — curl ישיר)
- מאגר עזרי הלמידה: `/מאגר-עזרי-הלמידה/` (SSR — curl ישיר)
- קרוֹל רקורסיבי עד עומק 5
- לכל פריט: URL, כותרת (H1), הורה, סוג, attachment_url, audio_url, video_url

פלט: `scripts/parity/old-inventory-{book}-{date}.json`

### שלב B — אינוונטר הצד החדש
**סקריפט:** `step_b_new_inventory.py`

שאילתות Supabase לספר/קטגוריה נבחרת:
- lessons JOIN series JOIN rabbis
- audience_tags filter
- כל שדות המדיה + status

פלט: `scripts/parity/new-inventory-{book}-{date}.json`

### שלב C — התאמה קנונית
**פונקציה:** `canonical_match()` ב-`parity_engine.py`

לוגיקת התאמה בסדר עדיפויות:
1. התאמה מדויקת אחרי NFC + הסרת ניקוד
2. התאמה 80%+ overlap
3. substring ≥75% כשאחד כלול בשני
4. prefix 14 תווים (פרשות ושם ספר)

### שלב D — בדיקות 1:1 לכל פריט
**סקריפט:** `step_d_item_checks.py`

לכל פריט:
1. **קיום** — האם נמצא ב-Supabase
2. **נפתח** — `curl -sI --noproxy '*' URL` → 200
3. **attachment אמיתי** — `curl -sI --noproxy '*' attachment_url` → 200 + `Content-Type: application/pdf` + `Content-Length > 0`
   - **NEVER gview** (`docs.google.com/gview` = מת: 200 + content-length:0)
   - PDFs בנתיב `/media/{id}/{filename}.pdf` על bneyzion.co.il
4. **כותרת זהה** — H1 == title (אחרי normalize)
5. **רינדור חי** — Chrome headless `--virtual-time-budget=10000` על TeacherLessonModal

### שלב E — diff דו-כיווני
**סקריפט:** `step_e_diff.py`

3 קטגוריות:
- **חוסרים** (missing): בישן, לא בחדש
- **תוספות** (extras): בחדש, לא בישן (סאר ביקש לדגל הכל — "בלי תוספות")
- **אי-התאמות** (mismatches): קיים בשני הצדדים אבל כותרת/מדיה שונה

### שלב F — תיקון confidence-gated
**סקריפט:** `step_f_fix.py`

**חובה לפני כל write:**
```sql
CREATE TABLE lessons_bak_parity_{YYYY_MM_DD} AS SELECT * FROM lessons;
```

Gates:
- H1 match ≥ 0.80 → תיקון כותרת מאושר
- attachment_url: PDF 200 OK + `application/pdf` + `>0 bytes` → עדכון מאושר
- content: scraped + H1 ≥ 0.75 → עדכון מאושר
- ספק כלשהו → השאר ריק + דווח ליואב

**אסור לכתוב תוכן בדוי.** אם אין ודאות — הישאר.

### שלב G — דוח parity
**סקריפט:** `step_g_report.py`

Scorecard לכל ספר/קטגוריה:
```
ספר: בראשית
============================
סדרות בישן:    XX
סדרות בחדש:    YY
שיעורים בישן:  AAA
שיעורים בחדש:  BBB
מותאמים:       CCC (NN%)
חוסרים:        DD
תוספות:        EE
אי-התאמות:     FF
  - כותרת:     GG
  - attachment: HH
  - audio:      II
אחוז parity:   PP%
יעד: 100%
```

---

## חוקי ברזל — חייבים להיות בכל ריצה

### 1. proxy חייב להיות מנוטרל
```bash
env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/parity/run_parity.py --book בראשית
# או:
HTTP_PROXY="" HTTPS_PROXY="" NO_PROXY="*" python3 ...
```
NetSpark מסנן בלי `--noproxy '*'` על curl.

### 2. gview = מת — לעולם לא
`docs.google.com/gview?url=...` מחזיר 200 + content-length:0 = PDF ריק.
בדיקת attachment אמיתית:
```bash
curl --noproxy '*' -sI "$PDF_URL" | grep -E "HTTP|Content-Type|Content-Length"
```
HTTP 200 + `Content-Type: application/pdf` + `Content-Length > 0` = אמיתי.

### 3. גיבוי לפני כל UPDATE
```sql
CREATE TABLE lessons_bak_parity_YYYYMMDD AS SELECT * FROM lessons;
SELECT COUNT(*) FROM lessons_bak_parity_YYYYMMDD;  -- חייב להיות > 13000
```
אם הגיבוי כבר קיים (`DROP TABLE IF EXISTS` לפני).

### 4. אסור push/deploy בלי אישור מסאר
- שינויי DB (UPDATE/INSERT) = מותר אחרי גיבוי
- deploy לפרודקשן = חייב "פרוס" / "deploy" מפורש מסאר
- push ל-feat/navigator-bot = חייב "push" מפורש מסאר

### 5. מפת ראוטים
- `/series/:id` → DesignPreviewSeriesPageV2 (public general)
- `/teachers/*` → TeachersWingPage / TeachersBookPage / TeachersSeriesPage (teachers)
- `/lessons/:id` → LessonPage (production)
- `/design-*` → sandbox בלבד (לא לבדוק כ-production)

### 6. audience_tags הפרדה חובה
- `teachers` = אגף המורים בלבד (URL: `/teachers/`)
- `general` = ציבור (URL: `/series/`)
- שניהם = שלב הצגה כפולה (לא שגיאה)
- בדיקה: `SELECT COUNT(*) FROM lessons WHERE audience_tags @> ARRAY['teachers'] AND audience_tags @> ARRAY['general']`

### 7. אימות ויזואלי חובה — לא רק 200
`curl 200 OK` ≠ אתר תקין.
אחרי כל שינוי → Chrome headless screenshot + firecrawl לפרק אחד לפחות.

### 8. ספירה מדויקת תמיד
- DB lesson count ≠ UI item count
- UI מציג series counts (לא lessons)
- תמיד `SELECT COUNT(*) FROM lessons WHERE...` לא ממשק

### 9. NFC normalization חובה לעברית
```python
import unicodedata
def normalize_he(s):
    s = ''.join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))  # הסר ניקוד
    s = unicodedata.normalize('NFC', s)
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'[""״\'"׳]', '', s)
    s = re.sub(r'[|–—\-]', ' ', s)
    return s.lower()
```
בלי זה: "applied: 0/N" כשהטקסט נראה זהה.

### 10. PDFים ב-bneyzion.co.il קיימים — לא "אבדו ב-Lovable"
URL pattern: `https://www.bneyzion.co.il/media/{id}/{filename}.pdf`
כולם זמינים. מיגרציה לא העבירה אותם ל-Supabase Storage — אבל ה-URL המקורי עובד.
**חשוב: ה-URL המקורי הוא זמני בלבד** — ראה כלל 13 למטה.

### ⚠️ 13. attachment_url חייב להיות על Supabase Storage בלבד — לעולם לא bneyzion.co.il

**כלל ברזל קריטי (נלמד 2026-06-09, מגיפת 307 URLs שבורים):**

```
אסור בהחלט:  attachment_url = "https://www.bneyzion.co.il/media/..."
מחויב:       attachment_url = "https://pzvmwfexeiruelwiujxn.supabase.co/storage/v1/object/public/lesson-attachments/..."
```

**למה:**
1. `bneyzion.co.il` עומד להיות מחוזר לאתר החדש (Vercel). כל URL שמצביע עליו ייהפך לדף 404 של האתר החדש.
2. האתר הישן חוסם iframe embeds → PDF לא מרנדר inline בפופאפ (רק "פתח בכרטיסייה חדשה").
3. Supabase Storage = self-hosted, אמין, תומך inline embed, לא תלוי בדומיין חיצוני.

**בדיקת parity חייבת לכלול שני שלבים:**
- (א) `attachment_url` מצביע על `pzvmwfexeiruelwiujxn.supabase.co/storage/...` — **לא** על bneyzion.co.il
- (ב) PDF מרנדר **inline** בפופאפ (TeacherLessonModal) — לא רק "פתח בכרטיסייה חדשה"

**זרימת re-host (לכל URL שגוי):**
1. `curl --noproxy '*' -sL "$OLD_URL" -o /tmp/check.pdf` → ודא `file /tmp/check.pdf` = "PDF document"
2. העלה ל-Storage: `supabase storage upload lesson-attachments/{book}/{slug}.pdf /tmp/check.pdf`
3. URL חדש: `https://pzvmwfexeiruelwiujxn.supabase.co/storage/v1/object/public/lesson-attachments/{book}/{slug}.pdf`
4. עדכן DB: `UPDATE lessons SET attachment_url = '{new_url}' WHERE id = '{lesson_id}'`
5. אמת בדפדפן שה-PDF נפתח inline בפופאפ

**bucket:** `lesson-attachments` (public bucket, ללא RLS על קריאה)
**naming convention:** `{bible_book}/{series_slug}/{lesson_slug}-{lesson_id[:8]}.pdf`

**סקריפט אמת לאחר re-host (חובה לפני "DONE"):**
```bash
# בדוק שאין URLs שנותרו על bneyzion.co.il
SQL='SELECT COUNT(*) FROM lessons WHERE attachment_url LIKE '"'"'%bneyzion.co.il%'"'"''
# Expected: 0
```

### 11. per-parasha: חייב title-match ב-TR row
בסדרות עם PDF לכל פרשה: `<tr data-tooltip>` → `{title_norm: pdf_href}`.
**אסור** first_pdf_in_page כ-fallback — ייתן "נח.pdf" ל"וירא".

### 12. TeacherLessonModal — fallback חובה
כשאין description/video/audio/attachment → body ריק = bug.
פתרון: fallback block "תוכן השיעור זמין בדף המלא".

---

## הרצה מהירה (quick start)

```bash
# בראשית — ריצה מלאה
cd /Users/saarj/Downloads/saar-workspace/bneyzion
env -u HTTPS_PROXY -u HTTP_PROXY \
  SUPABASE_MANAGEMENT_API_TOKEN=$(cat /tmp/sbp_token) \
  python3 scripts/parity/run_parity.py \
    --book בראשית \
    --sections main,teachers \
    --mode full \
    --output scripts/parity/reports/bereshit-$(date +%Y%m%d).json

# ריצה על ספר אחד — קריאה בלבד (ללא שינויי DB)
python3 scripts/parity/run_parity.py --book בראשית --dry-run

# ריצה עם תיקונים (אחרי גיבוי אוטומטי)
python3 scripts/parity/run_parity.py --book בראשית --fix --backup-first
```

---

## מבנה קבצים

```
scripts/parity/
├── SKILL.md                    # מסמך זה
├── run_parity.py               # מנהל pipeline מלא
├── parity_engine.py            # normalize + match + diff (shared lib)
├── step_a_old_inventory.py     # קרוֹל האתר הישן
├── step_b_new_inventory.py     # שאילתות Supabase
├── step_d_item_checks.py       # בדיקות HTTP + PDF אמיתי
├── step_f_fix.py               # תיקונים gated
├── step_g_report.py            # דוח parity
└── reports/                    # פלט JSON + MD לכל ריצה
    └── bereshit-YYYYMMDD.json
```

---

## היסטוריית הרצות

| תאריך | ספר/section | parity % | הערות |
|-------|-------------|----------|-------|
| 2026-06-09 | בראשית (ראשוני) | ראה דוח | ריצה ראשונה של הכלי |

---

*Skill created 2026-06-09. Agent: bneyzion-migrator. Replaces parity-audit.py (partial).*

---

## ✅ v1 working entry point (2026-06-09)

`step_a_old_inventory.py` השתמש ב-crawl שגוי (`/פרשת-השבוע/?book=`) והחזיר 0 פריטים.
**העובד:** `audit_book.py` — משתמש בנתיב המוכח `/מאגר-עזרי-הלמידה/{ספר}/` (כמו ה-rehost) + פונקציות parity_engine.

```bash
env -u HTTPS_PROXY -u HTTP_PROXY NO_PROXY='*' \
  SUPABASE_MANAGEMENT_API_TOKEN=sbp_... \
  python3 scripts/parity/audit_book.py --book בראשית
```

**ריצה ראשונה — בראשית (אגף מורים):** ישן 156 / חדש 262 / מותאמים 129 (82.7%) / חוסרים 26 / תוספות 132 / **0 על האתר הישן (Rule 13 ✓)** / 252 attachments תקינים (154 PDF + 98 Word — Word הוא לגיטימי, לא שבור).
**הערות לדיוק:** crawl ישן הוא teachers-only וחלקי (גרנולריות series↔lesson) → "תוספות 132" מנופח. צריך: (א) crawl גם של `/מאגר-השיעורים-והמאמרים/` לציבורי, (ב) פירוק series-leaf לשיעורים בודדים. attachments מקבלים עכשיו גם Word/Office.

---

## ✅ תוצאות ריצה מלאה (9.6.2026) — האתר כולו

**crawl הושלם: 10,157 עמודים (שני המאגרים).** הכלי הפיק:
- **0 attachments על bneyzion.co.il site-wide** (Rule 13 מחזיק — אחרי re-host של 373).
- **אגף מורים: 0 חוסרים** (מאומת מלא).
- **צד ציבורי: 409 חוסרים אמיתיים** (~101 עם PDF) — `reports/missing-FINAL.json`. אחרי narrowing: raw 3,643 → dedup (פי~7 כפילות) → 1,325 ייחודיים → סינון+אימות גלובלי → 409.

**Entry points עובדים:**
- ספר בודד: `python3 scripts/parity/audit_book.py --book <ספר>` (אימות-חוסרים גלובלי מובנה)
- כל האתר: `python3 scripts/parity/audit_full.py --max-pages 9000 --workers 8` (--resume עד "הושלם ✓") → `analyze_missing.py`
- ⚠️ `step_a_old_inventory.py` הישן שבור (crawl ל-0) — להשתמש ב-audit_book/audit_full.

**לקח מפתח:** כל מספר-חוסרים גולמי מנופח ע"י דפי קטגוריה/סדרה + כפילויות URL + וריאנטי-ניסוח (מקף/"פרשת"/audience). חובה לנפות לפני שמדווחים — אחרת false-alarm (בראשית: 26 "חוסרים" = 0 אמיתיים).

**פרומפט סגירת פערים:** `GOLDEN-PROMPT-v2-gap-closing.md`.

---

## סבב תיקונים 2 + עדכון-חי (14.6.2026) — חובה לקרוא לפני סבב הבא

### לקחי שורש (מיגרציה) — לבדוק בכל סבב
1. **סדרות "כפולות" אינן תמיד דליפה.** בדוק את הישן: אבינר-בראשית = 2 דפים נפרדים לגיטימיים (אודיו `הרב-אבינר-על-פרשיות-בראשית` + שיחות `הרב-אבינר-שיחות`). שם-סדרה "שגוי" עשוי להיות נכון. ground-truth = slugs של דפי-הילד בישן (`audit_full_state.json` → `pages`).
2. **"כותרת = שם הרב" + content=NULL** = המיגרציה לא חילצה כותרת מ-docx. `WHERE btrim(l.title)=btrim(r.name)`. תקן מ-slug הישן + backfill.
3. **זיהום חוצה-סדרות** — שיעור בסדרה לא-נכונה. השווה רשימת-שיעורים-בסדרה מול slugs הישן; **העבר (series_id), אל תמחק** (ארכב status='draft').
4. **סדרת-רפאים 1-שיעור** — wrapper סביב פריט יחיד. "N שיעורים בסדרה" בפופאפ הישן = ספירת **פריטי-קטגוריה**, לא שיעורי-סדרה! פריט יחיד צריך להיות lesson לא series. ב-content-type: שורת `teacher_listing_items` kind='series' עם 1 שיעור → המר ל-kind='lesson' או הפנה לסדרה-רבת-שיעורים אמיתית באותו content_type.
5. **mp4 ב-`attachment_url`** (video_url ריק) — הפופאפ לא ניגן (טיפל רק ב-pdf/docx). תוקן ב-`TeacherLessonModal` (זיהוי סיומת וידאו → `<video>`).
6. **מיון הקדמות:** `sort_order NULLS LAST→bible_chapter NULLS LAST` דוחף הקדמה (chapter=NULL) לסוף → `sort_order=-10` להקדמות (`title ~ 'הקדמה ל|מבוא לספר'`).
7. **עמודות-פרשה תמטיות** (עולמות חדשים/פשט/לשון הקודש) — איבדו מיפוי-פרשה (כותרות בלי שם-פרשה, bible_book=NULL). שחזור: scrape `/מאגר-השיעורים-והמאמרים/תורה/{chumash}/{column}/{slug}/` — הפרשה ב-`<meta keywords>` "פרשת X" (16KB head מספיק). הוסף suffix `" - פרשת {X}"` לכותרת ב-DB → title-matchable כמו העמודות העובדות. נרמל כתיב לקלנדר: קרח→קורח, נוח→נח, ניצבים→נצבים, בחוקותי→בחוקתי.

### אימות (חובה — אחרת מאמתים קוד ישן!)
- **PWA service-worker מגיש קוד ישן אחרי deploy.** לפני אימות-חי בדפדפן: `(await navigator.serviceWorker.getRegistrations()).forEach(r=>r.unregister()); (await caches.keys()).forEach(k=>caches.delete(k));` → reload. ודא `performance.getEntriesByType('resource')` main-hash = build מקומי (`dist/assets/main-*.js`).
- **anon-REST** (מפתח anon base64 ב-`src/integrations/supabase/client.ts`) = מה שהדפדפן שולף (RLS-aware) — אימות דאטה. **bundle-hash per-chunk** — אימות קוד. **word-boundary** (`titleMatchesParasha`) — `%חוקת%` תופס גם "בחוקתי".
- **edge cache ל-index.html:** `curl "https://bneyzion.vercel.app/?_cb=$RANDOM"`.

### עדכון-חי (Supabase Realtime) — "כמו מד-התרומות ביהושע"
- דפוס: `useTierCounts.ts` / `useParasha.ts` — `supabase.channel().on('postgres_changes',{schema:'public',table},cb).subscribe()` → `invalidateQueries`.
- **חובה ל-push:** `ALTER PUBLICATION supabase_realtime ADD TABLE public.<t>` + **`ALTER TABLE public.<t> REPLICA IDENTITY FULL`** (בלי זה אין אירועי UPDATE ל-anon). lessons+series כבר מופעלים. (הפובליקציה הייתה ריקה → מד-התרומות עבד דרך polling בלבד.)
- fallback: `refetchInterval:30_000` (מושהה בטאב מוסתר!) + `refetchOnWindowFocus` + watcher-תאריך.
- **auto-reload קוד** (`main.tsx`): `serviceWorker.ready→setInterval(reg.update,60s)` + reload על `controllerchange` (guarded ל-controller קיים).

### דיפלוי + גיבוי
prod = alias ידני. `npx vercel deploy --yes` → `npx vercel alias set <preview> bneyzion.vercel.app`. rollback = alias ל-dpl קודם. **גיבוי לפני כל write:** `*_bak_r<N>_<date>` (lessons+series+teacher_listing_items). זיכרון: `bneyzion-pwa-sw-stale-verification` + `bneyzion-fix-rounds-dashboard`.
