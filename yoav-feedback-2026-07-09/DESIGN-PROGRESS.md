# משימת עיצוב רמה 13 — התקדמות (9.7.2026)

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
