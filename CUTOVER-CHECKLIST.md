# 🔀 צ׳קליסט Cutover — `bneyzion.co.il` → אתר Vercel החדש

**מטרה:** להעביר את הדומיין הראשי `bneyzion.co.il` (כיום Umbraco) ואת תת-הדומיין `club.bneyzion.co.il` (כיום WordPress/WooCommerce) לאתר החדש (`bneyzion.vercel.app`), **בלי לינק שבור אחד** ובלי אובדן דירוג בגוגל.

> ⚠️ **המהלך עצמו ידני ובאישור סער בלבד.** המסמך הזה מכין אותו — הוא לא מבצע אותו.
> מבצעים רק אחרי שכל מסלולי-הסיום מאוחדים, נבדקו ב-Vercel preview, וסער אישר.

---

## 0. לפני שנוגעים ב-DNS — תנאים מקדימים

- [ ] כל 15 המסלולים מוזגו ל-`finish/integration`, `npm run build` נקי, preview אושר ע״י סער.
- [ ] גיבוי מלא של Umbraco (`www.bneyzion.co.il`) — ייצוא תוכן + מסד נתונים. **לא מוחקים כלום עד 60 יום אחרי הצלחה.**
- [ ] גיבוי מלא של WooCommerce (`club.bneyzion.co.il`) — מוצרים, הזמנות, לקוחות.
- [ ] רשומת TTL של ה-DNS הונמכה ל-300 שניות **24 שעות לפני** המעבר (כדי שהמעבר יהיה מהיר והפיך).
- [ ] חלון זמן-שקט מתואם (לילה / מוצ״ש), לא בשעת-שיא של תנועה.
- [ ] מוודאים שיש גישה מלאה לפאנל ה-DNS (רשם הדומיין) ולפרויקט Vercel.

---

## 1. מיפוי הכתובות הישנות → החדשות (מקור-אמת: `vercel.json`)

כל המיפויים כבר ממומשים כ-301 קבועים ב-`vercel.json`. טבלת-על:

### 1א. Umbraco — דומיין ראשי (`bneyzion.co.il` / `www`)
| כתובת ישנה (Umbraco) | יעד חדש |
|---|---|
| `/אודותינו` | `/about` |
| `/צור-קשר` | `/contact` |
| `/תרומות` | `/donate` |
| `/חנות-הספרים` (+ תתי-דפים) | `/store` |
| `/אגף-המורים`, `/מאגר-עזרי-הלמידה` | `/teachers` |
| `/בן-ציון-חיים-הנמן-היד` | `/memorial` |
| `/פרשת-השבוע` | `/parasha` |
| `/מאגר-השיעורים-והמאמרים`, `/דרך-לימוד-התנך`, `/מקורות-על-חשיבות-לימוד-תנך` | `/series` |
| ספרי-התנ״ך והנושאים (`/תורה`, `/נביאים`, `/כתובים`, `/משנה`, `/גמרא`, `/הלכה`, `/מחשבה`, `/אמונה-ומוסר`, `/מועדים`, `/חגים`, `/מגילות`, `/מדרשים`, `/שיעורים`, `/מאמרים`) | `/series` |
| `/רבנים` | `/rabbis` |
| `/כנס` | `/kenes` |
| `/rabbis/<UUID>` (203 מזהי-רבנים ישנים) | `/rabbis/<slug>` |

### 1ב. WooCommerce — תת-דומיין החנות (`club.bneyzion.co.il`)
כל המיפויים **מוגנים ב-`has: host = club.bneyzion.co.il`** — לא נדלקים עד שסער יפנה את תת-הדומיין לאתר. יעד: `https://bneyzion.co.il/store`.
| כתובת ישנה (WooCommerce) | יעד חדש |
|---|---|
| `/` (שורש החנות) | `/store` |
| `/shop` (+ תתי) | `/store` |
| `/product/:slug` | `/store` |
| `/product-category/:slug` | `/store` |
| `/cart`, `/checkout` | `/store` |
| `/my-account` (+ תתי) | `/store` |

> **החלטה לסער:** האם תת-הדומיין `club.bneyzion.co.il` (א) יופנה כולו לאתר החדש ב-DNS ואז ה-301 האלה יבצעו את העבודה, או (ב) יישאר על WordPress. אם (א) — לוודא שהדומיין `club` נוסף ל-Vercel ו-SSL הונפק לו. אם (ב) — להסיר את 9 ה-301 של club מ-`vercel.json` (הם inert עד אז, לכן לא מזיקים).

### רשת-ביטחון בקוד (SPA)
מעבר ל-301 של Vercel, `src/pages/NotFound.tsx` מכיל מפת-נפילה (`LEGACY_PATHS`) שתופסת כתובת-Umbraco ידועה שהגיעה ל-catch-all של ה-SPA ומנתבת אותה במקום להציג 404.

---

## 2. שלב המעבר עצמו (יום ה-Cutover)

- [ ] **הוספת הדומיין ב-Vercel:** בפרויקט `bneyzion` → Settings → Domains → הוסף `bneyzion.co.il` ו-`www.bneyzion.co.il`.
- [ ] Vercel יציג את רשומות ה-DNS הנדרשות (A / CNAME / ALIAS). מעדכנים אצל רשם-הדומיין:
  - [ ] `bneyzion.co.il` (apex) → לפי הנחיית Vercel (A או ALIAS/ANAME).
  - [ ] `www.bneyzion.co.il` → CNAME ל-`cname.vercel-dns.com`.
  - [ ] (אופציונלי) `club.bneyzion.co.il` → לפי החלטה 1ב.
- [ ] המתנה להתפשטות DNS (עד TTL שהונמך מראש).
- [ ] Vercel מנפיק תעודת SSL אוטומטית (Let's Encrypt) לכל דומיין. לוודא **Valid Configuration** ירוק בכל הדומיינים.

---

## 3. אימות אחרי המעבר (Smoke Test — חובה לעבור לפני שמכריזים "עלה")

### 3א. תשתית
- [ ] `https://bneyzion.co.il` → 200, טוען את האתר החדש.
- [ ] `https://www.bneyzion.co.il` → מפנה ל-apex (או להפך — עקבי).
- [ ] SSL תקף בכל הדומיינים (מנעול ירוק, בלי אזהרת mixed-content).
- [ ] `http://` → `https://` (Vercel אוטומטי).

### 3ב. אימות ה-301 (בדיקה ידנית של דגימה)
לכל שורה בטבלה 1א — לפתוח את הכתובת הישנה ולוודא 301 → היעד הנכון (בלי 404, בלי לולאה). דגימת-מפתח:
- [ ] `bneyzion.co.il/פרשת-השבוע` → `/parasha` (301)
- [ ] `bneyzion.co.il/אגף-המורים` → `/teachers` (301)
- [ ] `bneyzion.co.il/חנות-הספרים` → `/store` (301)
- [ ] `bneyzion.co.il/תרומות` → `/donate` (301)
- [ ] `bneyzion.co.il/רבנים` → `/rabbis` (301)
- [ ] כתובת-רב ישנה עם UUID → `/rabbis/<slug>` (301)
- [ ] כתובת-זבל אקראית (`/xyz123`) → דף-404 המעוצב (לא מסך לבן).

> אפשר להריץ את כל הדגימה בבת-אחת:
> `for p in פרשת-השבוע אגף-המורים חנות-הספרים תרומות רבנים; do curl -sI -o /dev/null -w "%{http_code} %{redirect_url}\n" "https://bneyzion.co.il/$p"; done`

### 3ג. אימות תוכן ופונקציונליות
- [ ] דף הבית, `/series`, `/rabbis`, `/parasha`, `/teachers`, `/store`, `/donate` — נטענים עם דאטה אמיתי.
- [ ] התחברות (כולל Google OAuth — ראה סעיף 4) עובדת.
- [ ] סליקת Grow (`/store`, מנוי, תרומה) — עסקת-בדיקה **רק אם סער מאשר**; אחרת בדיקה ויזואלית של פתיחת דף-התשלום.
- [ ] בוט בנצי עונה.
- [ ] חיפוש (⌘K) מחזיר תוצאות.

### 3ד. SEO
- [ ] `bneyzion.co.il/sitemap.xml` נגיש ומצביע על הדומיין החדש (תלוי T13).
- [ ] `bneyzion.co.il/robots.txt` נכון.
- [ ] תגי canonical מצביעים על `bneyzion.co.il` (לא על `vercel.app`) — תלוי T13.
- [ ] Google Search Console: הוספת/אימות `bneyzion.co.il`, הגשת ה-sitemap, ובקשת reindex.
- [ ] בדיקת OG (שיתוף בוואטסאפ/פייסבוק) מציגה תמונה+כותרת נכונות — תלוי T13.

---

## 4. עדכונים חיצוניים תלויי-דומיין (אחרי המעבר)

- [ ] **Google OAuth** (פרויקט `tidy-rig-466800-d2`):
  - [ ] הוספת `https://bneyzion.co.il` + `https://www.bneyzion.co.il` ל-Authorized JavaScript origins.
  - [ ] עדכון Branding (home / privacy / ToS URLs) לדומיין החדש.
  - [ ] הגשת מסך-ההסכמה ל-production verification (כרגע Testing).
- [ ] **Supabase Auth** (`pzvmwfexeiruelwiujxn`): הוספת הדומיין החדש ל-Site URL + Redirect URLs.
- [ ] **Grow / Meshulam:** לוודא ש-webhook + דפי-הצלחה/כישלון עובדים תחת הדומיין החדש (כרגע `https://bneyzion.vercel.app/api/grow/webhook`). לעדכן אם צריך URL קבוע.
- [ ] **Meta Pixel / GTM:** לאמת שהפיקסלים של האתר הישן והחנות (GTM-MBQXGFR) לא נשארים תלויים בדומיין הישן.
- [ ] קמפיינים חיים (Meta / Google Ads) שמצביעים על כתובות ישנות — לוודא שה-301 תופס, ובהדרגה לעדכן ל-URL חדש.

---

## 5. תוכנית-נסיגה (Rollback) — אם משהו נשבר

- [ ] מחזירים את רשומות ה-DNS ל-Umbraco/WordPress הישנים (בגלל ה-TTL הנמוך — מהיר).
- [ ] האתר הישן נשאר **חי ולא-נגוע** לאורך כל התהליך — הוא ה-fallback.
- [ ] מתעדים מה נשבר, מתקנים ב-preview, ומתזמנים ניסיון חוזר.
- [ ] **לא מוחקים** את Umbraco/WooCommerce לפחות 60 יום אחרי cutover יציב.

---

## 6. אחרי הצלחה יציבה (60 יום)

- [ ] הורדת האתר הישן (Umbraco) — אחרי שגוגל אינדקס מחדש והתנועה עברה.
- [ ] סגירת/הפניית WooCommerce.
- [ ] מחיקת ה-route `/portal-old` (גיבוי-מיגרציה — כבר עבר את חלון 30 היום).
- [ ] העלאת ה-TTL של ה-DNS בחזרה לערך רגיל.

---

> מסמך זה מתוחזק ע״י מסלול **T14 (routing)**. שינוי במיפוי → עדכן גם את `vercel.json` וגם את `src/pages/NotFound.tsx`.
