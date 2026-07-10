# משימת עיצוב רמה 13 — התקדמות (9.7.2026)

## 🚀 רמה 13 — סבב שני (10.7 צהריים, אישורי סער: "תבצע אין בעיה" / "תבצע הכל")
6 משימות נוספות, אומתו חי, מחסומים 0/0/2:
1. **4 צינורות התוכן אומתו:** פסוק-יומי + חדשות (launchd רץ כולל הבוקר, תמונות 6/6+5/5) · פודקאסט (פרק 1, הבא=שלישי) · **מייל שבועי נבנה מאפס כצינור:** טבלת `newsletters` + `scripts/newsletters_sync.py` (Gmail→DB, שולח בני-ציון **בלבד** — from:send.vpcontact.com לבד תופס את כל הלקוחות!; UA-דפדפני נגד Cloudflare-1010 של viplus; unescape ל-drive) + launchd `com.bneyzion.newsletter-sync` 09:20 + `/newsletter` מציג 52 גיליונות עם תמונות מ-storage (fallback ל-JSON).
2. **שכבת-הצ'אט במרכז-השליטה:** edge `copy-assistant` (אדמין-בלבד JWT→user_roles, Gemini, fail-closed על המרשם, פרוס+אומת 403) + AiRequestBox (הצעה לפני/אחרי → אישור ידני).
3. **עריכת תפריטים:** `useNavItems` (copy.nav.items, fail-closed) בהדר+מגירה + MenuEditor באדמין. אומת חי.
4. **מחירי משלוח:** `useShippingOptions` (copy.shipping.options) בקופה+דיאלוג + ShippingEditor. אומת חי (₪25→₪29).
5. **תנ"ך מוקלט ריק תוקן:** /category של פרוייקט-המוקלט (0 ילדים ישירים) → `fetchRecordedProjectSeries` משותף עם הסיידבר, 37 סדרות בסדר-קאנון.
6. **סליקת-חנות — אודיט:** מחווטת מלא מ-round-1 + env מוגדר בפרודקשן (ראיה: הזמנת store:wc-3635 מ-2.7 נוצרה אחרי בדיקת GROW_PAGECODE_PRODUCTS) + webhook מאשר. נותר טסט-חיוב אמיתי = סער בלבד. יהושע לא נגעתי.
**פסיפסים בוטלו** (סער: ההירויים והכרטיסיות כבר שופרו בסשן קודם). **גייטים חיצוניים:** העשרת-1,459=החלטת-יואב · מיזוג-איכה=23.7 · דיפלוי=ממתין ל"פרוס".

## 🚀 רמה 13 — סבב פונקציונלי מלא (10.7 בוקר, סשן "סדר לקראת רמה 13")
8 משימות בוצעו, כולן אומתו חי בפריוויו (build+preview 5217), מחסומים נקיים (audio=0/drift=0/phantoms=2-מוסברים; דריפט-1 של יואב 1737→1738 יושר — הסנכרון-היומי הוסיף טור):
1. **קטגוריה (4 הערות יואב):** כותרות "סדרות"/"תכנים בודדים" (הליסטינג מקובץ — אומת ב-DB, אפס interleave) · "תכנים" במקום "שיעורים" · תג-פורמט קבוע על כל שורה · סרגל סינון-לפי-פורמט דביק. `CategoryPage.tsx`.
2. **באג-ניגודיות:** `filter` על body שבר את כל ה-fixed → backdrop-filter על overlay קבוע. `AccessibilityWidget.tsx`.
3. **בנצי:** כפתור-מזעור (נקודה 36px, localStorage, + להחזרה) + מוסתר ב-/store,/checkout,/cart (סער: "בחנות הוא מיותר").
4. **חנות-DB:** 15 "הספרים שעוד לא יצאו"→active (יואב: קטגוריה אמיתית) · 3 ימי-עיון-שעברו נשארו מוסתרים · סדר-קטגוריות תוקן. גיבויים `products_bak_20260710`+`product_categories_bak_20260710`.
5. **קטלוג-חנות:** אריחי-קטגוריות+ספירות · סליידר "לקראת {מועד}" (hebcal terms→titles; תשעה-באב→איכה) · סליידר מבצעים · קטגוריות ריקות מוסתרות. `StorePage.tsx`.
6. **נגן צף:** מודל-השיעור בסדרה מעביר לנגן הגלובלי — כפתור "האזנה ברקע" + העברה אוטומטית בסגירה תוך-ניגון (שמירת מיקום). אומת: ההאזנה שורדת ניווט. `DesignPreviewSeriesPageV2.tsx`+`PlayerContext`.
7. **ניווט לפי אופי-הלימוד:** קבוצה בסיידבר + `/learning-style/:key` + RPC `get_learning_style_series` (set-based; **pg_column_size לא length — length עשה statement-timeout כ-anon**; 514/225/138/6).
8. **מרכז שליטה** `/admin/control-center`: מרשם `siteCopyRegistry` (19 שדות) + `useSiteCopy` (fallback מקודד) + חיפוש/שמירה/איפוס + sensitive=רק-סער + **RLS: כתיבת-אדמין רק על copy./image./memorial_/print_/homepage_** (fail-closed). אומת e2e: override הוצג חי ונמחק. ⚠️ תמלול קוליות-יואב 9.7: ביקש בדיוק את זה (לשנות כותרת-חנות/מדורים/תפריטים) + גישת-צ'אט-AI — שכבת-ה-AI ממתינה להחלטת-הרשאות של סער. פתוח: עריכת-תפריטים (navigation.ts) במרשם.
9. **פסיפסים (pilots):** 3 פיילוטים בסגנון-הזוהר (דור-הפלאות) נשלחו ל-WA של סער — `pilots/mosaic-sections/`. **fan-out רק אחרי אישור.**
**לא נפרס לפרודקשן — הכל בסנדבוקס, ממתין ל"פרוס" מסער.**

## 🔧 רמה 12.5b (10.7 00:25, `0186a243`) — תיקון חיווט-מת
🐛 ההירו של דף-הבית והפרשה חוברו לקומפוננטות **מתות**: `home/HeroSection` (אין יבואן) ו-`chapter-weekly/Hero` (הראוט `/parasha`→`ParashaPage`). הדף החי: `/`→`Index`=lazy(`DesignPreviewHome`)→`DesignHero`. תוקן: וידאו-Veo+פוסטר ב-`DesignHero` (+היפוך-סכימה: אוברליי-שמנת, H1 `#4A3823`, CTA כהה — הווידאו בהיר!) · `ParashaPage`→`/images/hero-watercolor-parasha.webp` (תחת האוברליי הכהה הקיים). אומת בפריוויו (דסקטופ+נייד) + חי (chunk מכיל hero-watercolor, פוסטר+נכס 200). **לקח: תמיד לאמת מול App.tsx מה חי לפני חיווט** (חוק-ברזל קיים שלא קוים).

## 🏆 רמה 12.5 פרוסה (9.7 23:45) — tag `level12.5-2026-07-09` (`7b149b02`)
דיפלוי prod אומת חי: דף-בית 200 · וידאו-הירו = Veo (1,021,728b בדיוק) · תמונות-מוצר מה-DB 200. DB: 23 מוצרים על אקוורל (גיבוי `products_bak_20260709`; שחזור: `update products p set image_url=b.image_url from products_bak_20260709 b where b.id=p.id`). בנדל 2ruth תוקן v3 (כיוון-כריכה RTL) לפי הערת-סער ואושר. **פתוח לסשן הבא:** טורקיז-חנות · פריטים-שאינם-ספר · בדיקת הירו טקסט+נייד · המשך רמה 13 (בוט-אדמין, ניווט-יואב, נגן-צף...).

## שיטה נעולה
ספרים: כריכה אמיתית (מהאתר הישן `club.bneyzion.co.il`, `{ספר}-דיגיטלי-שקוף`, או `source_url` של המוצר) → nano-banana (`gemini-3-pro-image`) מטמיע אורגנית בסצנה תמטית, בסגנון `yehoshua_A_flat_grey.jpg`, RTL, צבע אמיתי (מגילות=טורקיז, נביאים=אפור). קבצים ב-`pilots/`.
הירו: אותו סגנון אקוורל, **בלי ספר-מוצר**, רחב.

## ספרים בודדים — 8/8 ✅ (`pilots/series-final/` + real-covers)
יהושע(A,אפור) · רות(V4,טורקיז) · שופטים(אפור) · אסתר · שיר · קהלת · יונה · איכה. **מאושרים ע"י סער: יהושע A, רות V4.** השאר נשלחו לאישור WA.

## ⚠️ שני סשנים במקביל (22:39+)
סשן מקביל (כנראה "רמה 12" שנפתח במחשב) ייצר את 8 ההירו (`pilots/heroes/`), חיווט אותם בקוד (`src/assets/hero-watercolor-*.webp`, `Hero.tsx`, `tanach-news-hero.webp`) וייצר 9 בנדלים (`pilots/series-final/bundle_*.jpg`). **הסשן הזה (רמה 13/מרחוק) לקח בלעדית את: הנפשת הירו דף-הבית.** גרוק נפסל ע"י סער (יקר, $14.10, משעמם) → **Veo 3.1 fast הוא הקו**: `homepage_hero_anim_veo.mp4` (8ש', ~$1, זריחה+ציפורים+אד). ל-veo: מפתח Gemini הרגיל, `veo-3.1-fast-generate-preview:predictLongRunning`, image={bytesBase64Encoded}, poll operation → uri עם X-goog-api-key. גרסת הגרוק הישנה: `homepage_hero_anim.mp4`. חיווט הווידאו לקוד + טורקיז-חנות + DB-swap = אצל הסשן שבבעלות הקוד. אין לערוך קוד משני סשנים!

## סטטוס 23:10 (הסשן בעל-הקוד)
- [x] בנדלים 9/9 — נשלחו ל-WA. שיטה: og:image אמיתי מהאתר הישן כרפרנס (URL עברי חייב quote!). series6 תוקן (שופטים קדמי, לא יהושע-מזוהם-מרפרנס) · 2kohelet מ-kohelet המאושר.
- [x] גרסאות דיגיטליות = אותה תמונה (במיפוי ה-SQL).
- [x] הירו 8/8 מופשטים (בלי דמויות/מגילה, פלטת-זהב) — נשלחו ל-WA + חוּוטו: דף-בית (`HeroSection` — וידאו-גרוק `public/video/hero-watercolor.mp4` + פוסטר, טקסט הפך כהה!) · פרשה (`chapter-weekly/Hero` — לא נגעתי ב-jerusalem-walls, משותף ל-4 דפים) · מורים (`TeachersWingPage` imageSrc) · קורסים (`DesignPreviewMyCourses` blend כהה) · חנות (`StorePage` שכבה 45%) · אודות (`PageHero` קיבל prop `bgImage`) · משפחה (`FamilyTanach` + עמעום overlay) · חדשים (in-place, גיבוי ב-`_originals/`).
- [x] בילד עבר נקי (4.7s).
- [x] Storage: 17 תמונות ב-`product-images/watercolor/` (כולן 200) · snapshot `products_bak_20260709` (47).
- [x] סקריפט החלפה מוכן: `scripts/apply-watercolor-product-images.sql` (24 עדכונים) — **לא הוחל, ממתין לאישור סער.**
- [ ] ⏳ אישורי-סער: 6 ספרים (WA) · 9 בנדלים (WA) · 8 הירו (WA) · הרצת ה-SQL · דיפלוי.
- [ ] ❓ "טורקיז-חנות" שהוקצה לי בפתק-התיאום — לא ברור לי מה סוכם בסשן השני; ממתין להגדרה.
- [ ] 📝 זיכרון-חדש: הנפשות עתידיות = Veo 3.1 fast (לא גרוק). הווידאו הקיים חוּוט; אם יוחלף ב-Veo — להחליף את `public/video/hero-watercolor.mp4` בלבד, הקוד לא משתנה.
- [ ] פריטים שאינם-ספר (תרומת-שופטים, מתחדשים, קורסים, מנויים, אזורים) — במודע לא בסבב; לשאול את סער אם רוצה גם.
- [ ] החלפה ב-DB: snapshot `products` → עדכון `image_url` מוצר-מוצר + אימות 200 → סנדבוקס, בלי פרודקשן עד "פרוס".

## סטטוס 23:30 (הסשן המרוחק) — בנדלים v2/v3 + Veo חוּות
- סער פסל את הבנדלים המקוריים (איבדו פרופורציה וכיוון; רק esther_shir אושר). **תוקנו כולם מהמוקאפים האמיתיים** (og:image של דפי-הסט הישנים — סטים מקצועיים שקופים!): `bundle_series6_v2` · `bundle_set5_v3` · `bundle_2ruth_v2` · `bundle_2esther_v3` · `bundle_2shoftim_v3` · `bundle_2kohelet_v2` · `bundle_hashlama3_v2` · `bundle_hashlama4_v2`. כולם עברו אימות-חזותי (מספר-ספרים/RTL/כותרות) ונשלחו ל-WA. ⚠️ מלכודות שנלמדו: בלי FIDELITY-clause המודל מצייר את הכריכות · "2 ספרים" חייב "TWO identical copies, both front covers" · רפרנס יחיד⇒ספר-יחיד.
- הירו דף-הבית: **Veo הוחלף בקובץ המחווט** `public/video/hero-watercolor.mp4` (גיבוי גרוק: `pilots/heroes/_grok_wired_backup.mp4`).
- SQL: **נעצר ע"י סער לפני הרצה** (בגלל הבנדלים). גיבוי אומת 47/47.
- ⏳ על אישור-סער לבנדלים: (1) העלאת ה-v2/v3 ל-storage `product-images/watercolor/` באותם שמות (דריסת הישנים) (2) הרצת ה-SQL (3) build+commit+tag `level12.5` (4) deploy (5) אימות חי. השאר (טורקיז-חנות, פריטים-שאינם-ספר, בדיקת-נייד) — לסשן חדש לפי הוראת סער.

## מקורות/מפתחות
Gemini key + `gemini-3-pro-image` (api-keys.md). Supabase PAT `sbp_bddd…` proj `pzvmwfexeiruelwiujxn`. Green API 7105260665 (WA לסער 972526018772). rclone `gdrive:` לקבצים>10MB.
