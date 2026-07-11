# DESIGN-IMAGE-STYLES.md — שלוש סדרות התמונות של אתר בני ציון (מסמך קנוני)

> נכתב 11.7.2026 לפי הוראת סער: "אני רוצה שתזכור כל אחת מסדרות התמונות שהשתמשת בהן".
> שלוש סדרות נפרדות, כל אחת עם סגנון, מודל ופרומפט משלה. **אסור לערבב ביניהן.**
> מקורות: `scripts/gen_course_images.py` · `scripts/image-batch-phase1.py` · `KNOWLEDGE.md §6b` · `yoav-feedback-2026-07-09/DESIGN-PROGRESS.md` · `scripts/apply-watercolor-product-images.sql`.

| # | סדרה | מודל | טכניקה | יעד ב-DB | Storage |
|---|-------|-------|---------|-----------|---------|
| 1 | שיעורים / פרקים / סדרות (v3) | Imagen 4 / Imagen 4 Fast | text→image | `lessons.thumbnail_url`, `series.image_url` | `bnei-zion-thumbnails/{books,chapters,series}/` |
| 2 | ספרים ובנדלים בחנות | `gemini-3-pro-image` (nano-banana) | **image+text→image** (כריכה אמיתית כרפרנס) | `products.image_url` | `product-images/watercolor/` |
| 3 | קורסים דיגיטליים | `gemini-3-pro-image` | text→image | `community_courses.image_url` | `product-images/course-covers/` |

כללי-על לכל שלוש הסדרות: **בלי טקסט/אותיות/קליגרפיה בתמונה · בלי פרצופים · בלי דמויות נשים (חוק-ברזל של הרב יואב — הופר פעם אחת בשיר-השירים, ראה KNOWLEDGE §9) · 16:9 לרוחב (קורסים/שיעורים) · תמיד `--noproxy '*'` / opener בלי פרוקסי (NetSpark) · נכס מועלה ומאומת 200 לפני עדכון רשומה · snapshot לפני mutation.**

---

## סדרה 1 — שיעורים, פרקים וסדרות (נוסחת v3 הנעולה, אושרה 26.5.2026)

**מטרה:** thumbnails אחידים לכל תוכן-הלימוד באתר — 43 ספרי תנ"ך, ~949 פרקים, ~403 סדרות. אקוורל מינימליסטי, מופשט, רוחני, פסטלי.

**מודל:** Imagen 4 דרך Vertex (`predictions[0].bytesBase64Encoded`, ~$0.06/תמונה, `scripts/image-batch-phase{1,2,3}.py`) או Imagen 4 Fast `imagen-4.0-fast-generate-001` דרך Gemini API (~$0.02/תמונה, `scripts/generate_shir_hashirim_images.py`). `aspectRatio: "16:9"`, ‏1280×720.

**מבנה הפרומפט:** `f"{STYLE}\n\nContent to visualize: {content}"`.

### ה-STYLE הקנוני (נעול — אסור לשנות בלי אישור מפורש של סער)

```
Minimalist watercolor painting on white textured paper.
Ultra-clean, gentle, soft, ethereal, atmospheric, meditative, spiritually evocative.
Loose watercolor washes, muted pastel tones — sage green, dusty teal, soft blue-gray,
warm sand, wheat, pale gold, quiet lavender, blush rose.
Visible paper grain, gentle gradients, completely soft edges.
No harsh lines. No dark outlines.
ABSOLUTELY NO TEXT, NO LETTERS, NO HEBREW CHARACTERS, NO ENGLISH CHARACTERS,
NO TYPOGRAPHY, NO CALLIGRAPHY anywhere in the image.
Generous white space — leave the center open and luminous.
Abstract representation, impressionistic style, spiritual ambiance.
NEGATIVE: absolutely no people, no humans, no figures, no human silhouettes,
no faces, no body parts, no hair, no clothing, no dresses, no gowns, no robes,
no hands, no feet, no arms, no legs, no children, no men, no women,
no portraits, no anthropomorphic shapes, no characters, no persons whatsoever.
```

(בלוק ה-NEGATIVE המורחב נוסף אחרי תקרית תמונת-האישה בשיר-השירים; הגרסה ב-KNOWLEDGE §6b היא ללא הבלוק — הגרסה בקוד `image-batch-phase1.py` היא המחייבת.)

### נוסחת התוכן (v3) — 6 כללים

1. פתח ב-`Abstract spiritual representation of [theme]`.
2. **אלמנט עדין אחד בלבד** — orb / gateway / arch / petals / ripples / single flame / horizon / drop / leaves / single string of light / doorway / wisp.
3. סביב האלמנט: atmospheric washes / mist / light.
4. adjective רגשי: Delicate / subtle / intimate / quiet / tender.
5. שלילה מפורשת בסוף: `No human figures, no faces, no letters, no text.`
6. **אסור אובייקט גרפי-מדי** (כינור שלם, חרב, כתר) — רק *רמז* לאובייקט (מיתר זהוב יחיד, לא כינור).

### דוגמאות קנוניות (מ-`BOOK_DESC` בסקריפט)

בראשית:
```
Abstract spiritual representation of creation and the first dawn. A single soft orb
of warm gold light emerging from swirling mist, gentle washes of sage green and warm
sand spreading outward. Delicate atmospheric layers, completely soft edges.
No human figures, no faces, no letters, no text.
```

תהילים (v3.1 — מיתר יחיד, לא כינור שלם):
```
Abstract spiritual representation of prayer, praise, and the full emotional range of
the human heart reaching toward the divine. A single golden string of light vibrating
gently in the center, surrounded by soft watercolor washes of warm gold, quiet
lavender, and pale rose. Tender, intimate atmosphere, generous white space.
No human figures, no faces, no letters, no text.
```

שופטים (דוגמה ל"בלי אובייקט" — שדות-צבע טהורים):
```
Abstract spiritual representation of cycles of light and shadow, faith and redemption.
Turbulent washes of dark indigo and warm gold, dissolving into soft stillness and
quiet light — no arc, no torch, no figure of any kind. Pure abstract color fields.
Quiet, hopeful atmosphere. No human figures, no faces, no letters, no text.
```

### תפעול

- **Vision gate חובה:** כל תמונה נבדקת ב-Gemini Vision (`lib/vision_gate.py`, `verify_no_humans`) — עד 3 נסיונות, כישלון → `scripts/rejected-images.json`, לא נכתב ל-DB.
- Resume דרך `scripts/image-batch-state.json` — לעולם לא מתחילים מאפס.
- `updated_at = NOW()` על כל UPDATE.
- Fallback סטטי בקוד (לא ג'נרוט): `getSeriesCoverImage()` ב-`src/lib/designTokens.ts` ממפה כותרת-סדרה ל-webp מ-`/public/images/`, ו-7 משפחות-העיצוב (`seriesFamilies`) צובעות כרטיסים/הירו לפי אופי הסדרה. סדר עדיפות תמונה בשיעור: `lesson.thumbnail_url` → `series.image_url` → `getSeriesCoverImage(series.title)` → `/images/series-default.png`.

---

## סדרה 2 — ספרים ובנדלים בחנות (כריכות אמיתיות מוטמעות באקוורל, 9-10.7.2026, רמות 12.5-13)

**מטרה:** תמונות-מוצר לחנות — 24 מוצרים (8 ספרים בודדים + גרסאות דיגיטליות + 9 בנדלים). הייחוד: **הכריכה האמיתית של הספר מופיעה בתמונה, נאמנה למקור,** משולבת אורגנית בסצנה תמטית בסגנון האקוורל של האתר.

**מודל:** `gemini-3-pro-image` (nano-banana) במצב **image+text→image** — תמונת הכריכה האמיתית נשלחת כ-`inline_data` לצד פרומפט הטמעה.

### השיטה הנעולה (ציטוט מ-DESIGN-PROGRESS.md — "שיטה נעולה")

> ספרים: כריכה אמיתית (מהאתר הישן `club.bneyzion.co.il`, `{ספר}-דיגיטלי-שקוף`, או `source_url` של המוצר) → nano-banana (`gemini-3-pro-image`) מטמיע אורגנית בסצנה תמטית, בסגנון `yehoshua_A_flat_grey.jpg`, RTL, צבע אמיתי (מגילות=טורקיז, נביאים=אפור).

- **מקור הכריכה:** og:image של דף-המוצר באתר הישן (URL עברי חייב `quote`!), קובץ `{ספר}-דיגיטלי-שקוף`, או `products.source_url`. לבנדלים/סטים — og:image של דפי-הסט הישנים (מוקאפים מקצועיים שקופים).
- **סגנון הרפרנס המאושר:** `yoav-feedback-2026-07-09/pilots/real-covers/yehoshua_A_flat_grey.jpg` (וריאנט A — flat, רקע אפור-רך). סער אישר במפורש: יהושע A, רות V4.
- **צבעי אמת:** כריכות המגילות = טורקיז, נביאים (יהושע/שופטים) = אפור. לא ממציאים צבע.

### ⚠️ שלוש מלכודות שנלמדו בדם (חובה בכל פרומפט עתידי)

1. **FIDELITY clause חובה** — בלי סעיף מפורש שמחייב נאמנות מוחלטת לכריכת-הרפרנס, המודל *מצייר מחדש* את הכריכות (ממציא טיפוגרפיה/עיטור).
2. **בנדל של 2 עותקים** חייב ניסוח `TWO identical copies, both front covers visible` — אחרת המודל ממציא ספר שני שונה.
3. **רפרנס יחיד ⇒ ספר יחיד** בתוצאה. לבנדל רב-ספרים חייבים רפרנס שמכיל את כל הספרים (המוקאפ השקוף של הסט) — לא רפרנס של ספר בודד.
4. (בונוס) **כיוון-RTL של כריכה** — שדרת הספר מימין; בנדל 2ruth נפסל ותוקן ב-v3 בגלל כיוון הפוך.

### ⚠️ סטטוס שימור הפרומפטים

**מחרוזות הפרומפט המילוליות המקוריות לא נשמרו** — נוצרו בשני סשנים מקבילים ב-9.7.2026 (רמה 12 מקומי + רמה 13 מרוחק) בסקריפטים זמניים (scratchpad) שנמחקו. הסעיף הזה הוא **שחזור-שיטה** מהתיעוד בזמן-אמת (`DESIGN-PROGRESS.md`) ומהתוצרים עצמם. אין לצטט ממנו "פרומפט מקורי" מילה-במילה. בג'נרוט עתידי: לבנות פרומפט חדש לפי השיטה + המלכודות למעלה, עם התוצרים המאושרים כרפרנס-סגנון.

### קבצים ומיקומים

- תוצרים סופיים: `yoav-feedback-2026-07-09/pilots/series-final/` (ספרים: `esther.jpg`, `ruth.png`, `shoftim.jpg`, `shir.jpg`, `kohelet.jpg`, `eicha.jpg`, `yona.jpg` · בנדלים: `bundle_*_v2/v3` = הגרסאות המתוקנות) + `pilots/real-covers/yehoshua_real.jpg` (הכריכה המקורית) ו-`yehoshua_A_flat_grey.jpg` (הרפרנס המאושר).
- Storage חי: `product-images/watercolor/` (17 קבצים, פרויקט `pzvmwfexeiruelwiujxn`).
- החלה ב-DB: `scripts/apply-watercolor-product-images.sql` — מיפוי title→image לפי 24 מוצרים, אידמפוטנטי. גיבוי/שחזור: `products_bak_20260709` (47 שורות).
- גרסה דיגיטלית = אותה תמונה כמו הפיזית (במיפוי ה-SQL).
- **לא הוחלפו בכוונה:** תרומת-שופטים-לחיילים, מתחדשים-בתנ"ך, מנויים, קורסים, אזורים-בארץ-ישראל, וכל ה-draft.

---

## סדרה 3 — קורסים דיגיטליים (אקוורל צבעוני, רמה 14, 10.7.2026)

**מטרה:** תמונות לקורסי-הקהילה (`community_courses`). הנחיית סער: "אל תיצמד רק לגוון צהוב אלא תעשה צבעוני ויפה, אלמנט מרכזי עדין, כמו שאר האתר". שונה מסדרה 1: **צבעוני יותר, פלטה ייעודית לכל קורס**, אלמנט מרכזי מוחשי (לא מופשט-טהור).

**מודל:** `gemini-3-pro-image`, text→image. **סקריפט קנוני חי בריפו:** `scripts/gen_course_images.py` (ג'נרוט → העלאה → אימות 200 → גיבוי → apply; אידמפוטנטי, dry-run כברירת-מחדל).

### ה-STYLE הקנוני (משותף לכל הקורסים)

```
Delicate watercolor painting for a premium Bible-study website.
ONE delicate central element only, soft translucent washes, visible paper texture,
airy composition with generous breathing room. Colorful and beautiful palette as specified.
ABSOLUTELY NO text, NO letters, NO words, NO numbers, NO human faces.
Wide landscape composition 16:9, soft edges fading to warm cream paper.
```

מבנה: `f"{prompt}. {STYLE}"` — הפרומפט הפרטני קודם, ה-STYLE אחריו.

### כל 9 הפרומפטים הפרטניים (מהסקריפט, המקור המחייב)

| קורס (slug) | פרומפט מלא |
|--------------|-------------|
| `book-ezra` | `Rising golden sun over ancient Jerusalem stones being lovingly rebuilt, a small green cypress sapling growing between the stones. Palette: warm amber, soft sky blue, touches of fresh green` |
| `book-nehemiah` | `An ancient Jerusalem stone wall gate with a fresh olive branch across it, morning light. Palette: sage green, warm sandstone, soft turquoise sky` |
| `book-daniel` | `A majestic lion resting peacefully under a deep indigo night sky full of golden stars. Palette: rich indigo, violet, luminous gold stars` |
| `book-esther` | `A Persian palace garden with blooming myrtle branches and roses, a delicate golden crown resting on marble. Palette: deep crimson, rose pink, emerald green` |
| `book-lamentations` | `Jerusalem city walls at dusk, dignified and quiet, a single small candle flame glowing warmly in the foreground. Palette: muted sepia, dusty blue-gray, one warm flame` |
| `book-haggai-zechariah-malachi` | `A golden menorah between two olive trees, the vision of Zechariah, dawn light rising behind. Palette: deep teal, luminous gold, soft silver-green olive leaves` |
| `course-how-to-learn` | `An open ancient book with soft rays of light rising gently from its pages like a sunrise. Palette: fresh cerulean blue, spring green, warm cream` |
| `course-why-learn` | `A winding footpath through green wheat fields leading to a glowing sunrise horizon. Palette: fresh greens, golden sunrise, soft coral clouds` |
| `course-shoftim-new-look` | `A shofar horn resting beside an ancient olive tree in a windswept field, dramatic expressive sky. Palette: earthy olive green, storm blue, warm ochre` |

(ה-UUID של כל קורס ↔ slug נמצא במילון `COURSES` בסקריפט — הוא המקור, לא לשכפל לכאן.)

### קבצים ומיקומים

- תוצרים: `yoav-feedback-2026-07-09/pilots/course-covers/{slug}.jpg`.
- Storage חי: `product-images/course-covers/{slug}.jpg`.
- ‏DB: `community_courses.image_url`, גיבוי `community_courses_bak_20260710`.

---

## נספח — סגנונות שכנים (לא לבלבל עם שלוש הסדרות)

- **הירויים של עמודים (8 עמודים, 9.7):** אקוורל מופשט בפלטת-זהב, רחב, **בלי ספר-מוצר ובלי דמויות/מגילה**. קבצים: `pilots/heroes/`, מחווטים כ-`src/assets/hero-watercolor-*.webp`. הפרומפטים לא נשמרו (סשן מקביל). הנפשת הירו = **Veo 3.1 fast** (~$1/8ש'), לא גרוק.
- **פיילוטי-פסיפס (בוטלו ע"י סער):** `pilots/mosaic-sections/gen_pilot.py` — סגנון "הזוהר" (רפרנס `card-dor-haplaot.jpg`, image+text, אנכי 3:4). לא בשימוש.
- **קמפיין-יואב (חיילים):** `scripts/gen-yehoshua-shoftim-image.py` — **gpt-image-2**, צילום-מוצר פוטוריאליסטי עם טקסט עברי על הכריכות. סגנון קמפיין נפרד לחלוטין, לא סגנון האתר.
- **טוקנים סטטיים:** `src/lib/designTokens.ts` — צבעים/פונטים/7 משפחות-סדרות/`getSeriesCoverImage`. קוד, לא ג'נרוט.
