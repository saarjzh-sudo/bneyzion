# BASELINE (pre-apply) — oneone verification report
*Generated 2026-06-12 02:33 by oneone_verify.py — read-only anon-REST simulation of the CURRENT working-tree UI hooks against the live DB.*

REST calls: 2 (cache hits 3201, errors 4)

> 🔴 **P0 HARNESS FINDING — PGRST201:** the DB now contains `lesson_rabbis`/`series_rabbis` m2m tables alongside the `rabbi_id` fkeys, so the app's own `rabbis(name)` embeds (useLessonsBySeries, useSeriesChildren, TopicPage, search…) are rejected as ambiguous — those UI queries FAIL in production right now and lists render empty. The harness verified data parity using the disambiguated embed (`rabbis!lessons_rabbi_id_fkey`). Code or DB must be fixed (drop/rename m2m or disambiguate every embed).

> 🔴 **P0 HARNESS FINDING — PGRST100:** TopicPage.tsx:112 sends or=(lessons.audience_tags...) at top level — PostgREST rejects it (PGRST100, needs lessons.or=(...)) → production topic pages error out. Harness verified topic data with the equivalent foreign-table filter.

## Summary

| Section | Pass | Total | Pass rate |
|---|---|---|---|
| Sidebar (top categories) | 1 | 13 | 7.7% |
| Listing pages | 48 | 1273 | 3.8% |
| Rabbi pages | 16 | 154 | 10.4% |
| Topics sidebar | FAIL | 1 | — |
| Topic pages | 29 | 128 | 22.7% |
| Teachers content-types | 1 | 22 | 4.5% |
| Teachers creators | 1 | 31 | 3.2% |
| Teachers by-book | 13 | 35 | 37.1% |
| Guards | FAIL | — | — |

## 1. Sidebar

### ❌ ניווט באתר לפי ספר ופרק (static_link)
- quick-link rendered: False

### ✅ פרשת השבוע (static_link)
- quick-link rendered: True

### ❌ איך לומדים תנ"ך (section)
- old=7 (incl. alias) order_ok=True missing=['הגישה הראויה ללימוד תנך', 'היחס הראוי לאבות ולחטאיהם', 'דרכי הפרשנות והמדרש בתנך', 'אוסף מקורות על חשיבות לימוד תנך', 'אוסף הדרכות בלימוד תנך'] extra=['כל האומר דוד חטא אינו אלא טועה', 'איך לומדים תנך', 'איך מלמדים תנך', 'הקדמה ללימוד נביאים חסד למשיחו', 'ללמוד וללמד תנך', 'שימוש בפירוש הנציב להוראת החומש', 'הדיבור הישיר בתורה', 'לפני ואחרי במשנת הספורנו']

### ❌ תורה (category)
- books order ok: False; missing books: ['חידות לילדים פש']; extra: []
- book-children failing: 5/5
  - **בראשית** old=14 new=1 order_ok=True
    - missing: ['כל השיעורים בחומש בראשית', 'פרשת בראשית א ו', 'פרשת נח ו יא', 'פרשת לך לך יב יז', 'פרשת וירא יח כב', 'פרשת חיי שרה כג כה', 'פרשת תולדות כה כח', 'פרשת ויצא כח לב', 'פרשת וישלח לב לו', 'פרשת וישב לז מ', 'פרשת מקץ מא מד', 'פרשת ויגש מד מז', 'פרשת ויחי מז נ', 'סדרות על החומש']
    - extra: ['חידות לילדים פש']
  - **שמות** old=12 new=0 order_ok=True
    - missing: ['כל השיעורים בחומש שמות', 'פרשת שמות א ו', 'פרשת וארא ו ט', 'פרשת בא י יג', 'פרשת בשלח יג יז', 'פרשת יתרו יח כ', 'פרשת משפטים כא כד', 'פרשת תרומה כה כז', 'פרשת תצוה כז ל', 'פרשת כי תשא ל לד', 'פרשת ויקהל לה לח', 'פרשת פקודי לח מ']
  - **ויקרא** old=11 new=0 order_ok=True
    - missing: ['כל השיעורים בחומש ויקרא', 'פרשת ויקרא א ה', 'פרשת צו ו ח', 'פרשת שמיני ט יא', 'פרשת תזריע יב יג', 'פרשת מצורע יד טו', 'פרשת אחרי מות טז יח', 'פרשת קדושים יט כ', 'פרשת אמור כא כד', 'פרשת בהר כה כו', 'פרשת בחוקותי כו כז']
  - **במדבר** old=11 new=0 order_ok=True
    - missing: ['כל השיעורים בחומש במדבר', 'פרשת במדבר א ד', 'פרשת נשא ד ז', 'פרשת בהעלותך ח יב', 'פרשת שלח לך יג טו', 'פרשת קורח טז יח', 'פרשת חוקת יט כב', 'פרשת בלק כב כה', 'פרשת פנחס כה ל', 'פרשת מטות ל לב', 'פרשת מסעי לג לו']
  - **דברים** old=12 new=0 order_ok=True
    - missing: ['כל השיעורים בחומש דברים', 'פרשת דברים א ד', 'פרשת ואתחנן ד ז', 'פרשת עקב ז יא', 'פרשת ראה יא טז', 'פרשת שופטים טז כא', 'פרשת כי תצא כא כה', 'פרשת כי תבוא כו כט', 'פרשת נצבים כט ל', 'פרשת וילך לא', 'פרשת האזינו לב', 'פרשת וזאת הברכה לג לד']

### ❌ נביאים (category)
- books order ok: True; missing books: []; extra: []
- book-children failing: 17/21
  - **יהושע** old=19 new=18 order_ok=True
    - missing: ['מלחמת מלכי הצפון פרק יא', 'ערי המקלט והלויים פרקים כ כא']
    - extra: ['ערי המקלט והלוויים פרקים כ כא']
  - **שמואל א** old=27 new=21 order_ok=True
    - missing: ['דוד בקעילה ובזיף פרק כג', 'דוד ושאול במערה פרק כד', 'שאול ודוד בזיף פרק כו', 'בריחת דוד לצקלג פרק כז', 'מלחמת דוד בעמלק פרקים כט ל', 'מות שאול ובניו פרק לא']
  - **שמואל ב** old=22 new=13 order_ok=True
    - missing: ['בקשת בנין המקדש פרק ז', 'אמנון תמר ואבשלום פרק יג', 'אבשלום שב לירושלים פרק יד', 'המלכת דוד מחדש פרק יט', 'מרד שבע בן בכרי פרק כ', 'הגבעונים ובני שאול פרק כא', 'שירת דוד פרק כב', 'גיבורי דוד פרק כג', 'המגפה וגורן ארונה פרק כד']
  - **מלכים א** old=20 new=20 order_ok=True
    - missing: ['נפילת מלכות שלמה פרק יא', 'אבים אסא נדב ובעשא פרק טו']
    - extra: ['פילוג המלוכה וחטא הנשים הנכריות פרק יא', 'אביהם אסא נדב ובעשא פרק טו']
  - **מלכים ב** old=21 new=21 order_ok=True
    - missing: ['עלית אליהו לשמים פרק ב']
    - extra: ['עליית אליהו לשמים פרק ב']
  - **ישעיהו** old=67 new=66 order_ok=True
    - missing: ['ישעיהו פרק נט']
  - **הושע** old=15 new=0 order_ok=True
    - missing: ['כל השיעורים בספר הושע', 'הושע פרק א', 'הושע פרק ב', 'הושע פרק ג', 'הושע פרק ד', 'הושע פרק ה', 'הושע פרק ו', 'הושע פרק ז', 'הושע פרק ח', 'הושע פרק ט', 'הושע פרק י', 'הושע פרק יא', 'הושע פרק יב', 'הושע פרק יג', 'הושע פרק יד']
  - **יואל** old=5 new=0 order_ok=True
    - missing: ['כל השיעורים בספר יואל', 'יואל פרק א', 'יואל פרק ב', 'יואל פרק ג', 'יואל פרק ד']
  - **עמוס** old=10 new=0 order_ok=True
    - missing: ['כל השיעורים בספר עמוס', 'עמוס פרק א', 'עמוס פרק ב', 'עמוס פרק ג', 'עמוס פרק ד', 'עמוס פרק ה', 'עמוס פרק ו', 'עמוס פרק ז', 'עמוס פרק ח', 'עמוס פרק ט']
  - **יונה** old=5 new=0 order_ok=True
    - missing: ['כל השיעורים בספר יונה', 'יונה פרק א', 'יונה פרק ב', 'יונה פרק ג', 'יונה פרק ד']

### ❌ כתובים (category)
- books order ok: False; missing books: []; extra: ['עזרא', 'נחמיה']
- book-children failing: 9/13
  - **תהלים** old=151 new=0 order_ok=True
    - missing: ['כל השיעורים בספר תהלים', 'מזמור א אשרי האיש', 'מזמור ב למה רגשו', 'מזמור ג מזמור לדוד בברחו', 'מזמור ד למנצח בנגינות', 'מזמור ה למנצח אל הנחילות', 'מזמור ו למנצח בנגינות', 'מזמור ז שגיון לדוד', 'מזמור ח למנצח על הגתית', 'מזמור ט למנצח על מות לבן', 'מזמור י למה ה', 'מזמור יא למנצח לדוד', 'מזמור יב למנצח על השמינית', 'מזמור יג למנצח מזמור לדוד', 'מזמור יד למנצח לדוד אמר נבל']
  - **משלי** old=32 new=0 order_ok=True
    - missing: ['כל השיעורים בספר משלי', 'פרק א משלי שלמה', 'פרק ב אם תקח אמרי', 'פרק ג בני תורתי אל תשכח', 'פרק ד שמעו בנים', 'פרק ה בני לחכמתי הקשיבה', 'פרק ו אם ערבת לרעך', 'פרק ז שמור אמרי', 'פרק ח הלא חכמה תקרא', 'פרק ט חכמות בנתה ביתה', 'פרק י בן חכם ישמח אב', 'פרק יא בא זדון ויבא קלון', 'פרק יב הן צדיק בארץ ישלם', 'פרק יג בן חכם מוסר אב', 'פרק יד חכמות נשים']
  - **איוב** old=21 new=0 order_ok=True
    - missing: ['אסונות איוב והגעת הרעים פרקים א ב', 'דברי איוב הראשונים פרק ג', 'מענה אליפז הראשון פרקים ד ה', 'תגובת איוב לאליפז פרקים ו ז', 'מענה בלדד הראשון פרק ח', 'תגובת איוב לבלדד פרקים ט י', 'מענה צופר הראשון פרק יא', 'תגובת איוב לצופר פרקים יב יד', 'מענה אליפז השני פרק טו', 'תגובת איוב לאליפז פרקים טז יז', 'מענה בלדד השני פרק יח', 'תגובת איוב לבלדד פרק יט', 'מענה צופר השני פרק כ', 'תגובת איוב לצופר פרק כא', 'מענה אליפז השלישי פרק כב']
  - **שיר השירים** old=8 new=0 order_ok=True
    - missing: ['שיר השירים פרק א', 'שיר השירים פרק ב', 'שיר השירים פרק ג', 'שיר השירים פרק ד', 'שיר השירים פרק ה', 'שיר השירים פרק ו', 'שיר השירים פרק ז', 'שיר השירים פרק ח']
  - **איכה** old=6 new=0 order_ok=True
    - missing: ['כל השיעורים במגילת איכה', 'איכה פרק א', 'איכה פרק ב', 'איכה פרק ג', 'איכה פרק ד', 'איכה פרק ה']
  - **קהלת** old=13 new=0 order_ok=True
    - missing: ['כל השיעורים במגילת קהלת', 'קהלת פרק א', 'קהלת פרק ב', 'קהלת פרק ג', 'קהלת פרק ד', 'קהלת פרק ה', 'קהלת פרק ו', 'קהלת פרק ז', 'קהלת פרק ח', 'קהלת פרק ט', 'קהלת פרק י', 'קהלת פרק יא', 'קהלת פרק יב']
  - **אסתר** old=11 new=11 order_ok=True
    - missing: ['כל השיעורים על מגילת אסתר']
    - extra: ['כל השיעורים בספר אסתר']
  - **דניאל** old=13 new=13 order_ok=True
    - missing: ['כל התכנים בספר דניאל']
    - extra: ['כל השיעורים בספר דניאל']
  - **עזרא ונחמיה** old=24 new=0 order_ok=True
    - missing: ['כל עזרא ונחמיה', 'עזרא פרק א', 'עזרא פרק ב', 'עזרא פרק ג', 'עזרא פרק ד', 'עזרא פרק ה', 'עזרא פרק ו', 'עזרא פרק ז', 'עזרא פרק ח', 'עזרא פרק ט', 'עזרא פרק י', 'נחמיה פרק א', 'נחמיה פרק ב', 'נחמיה פרק ג', 'נחמיה פרק ד']

### ❌ נושאים כלליים בתנ"ך (section)
- old=16 (incl. alias) order_ok=True missing=['כל השיעורים בנושאים הכלליים', 'ארבע המלכויות', 'בית המקדש והכהנים'] extra=['כל השיעורים בנושאים כלליים בתנך']
- ⚠️ old grandchildren not renderable by one-level sidebar: 1

### ❌ מועדים (section)
- old=16 (incl. alias) order_ok=True missing=['כל השיעורים על המועדים', 'חודש אלול וימי התשובה', 'ראש השנה', 'יום הכיפורים', 'סוכות', 'שמיני עצרת', 'חנוכה', 'טו בשבט', 'פורים', 'פסח', 'ספירת העומר', 'יום העצמאות', 'יום ירושלים', 'שבועות', 'שלושת השבועות'] extra=['כל השיעורים בהמועדים']
- ⚠️ old grandchildren not renderable by one-level sidebar: 4

### ❌ הפטרות (section)
- old=7 (incl. alias) order_ok=True missing=['הפטרות בראשית', 'הפטרות שמות', 'הפטרות ויקרא', 'הפטרות במדבר', 'הפטרות דברים', 'הפטרות המועדים'] extra=['כל השיעורים בהפטרות']
- ⚠️ old grandchildren not renderable by one-level sidebar: 83

### ❌ ימי עיון בתנ"ך (section)
- old=8 (incl. alias) order_ok=True missing=['כל השיעורים מימי עיון בתנך'] extra=['כל השיעורים בימי עיון בתנך']

### ❌ כלי עזר - טבלאות זמני המאורעות ומפות (section)
- old=1 (incl. alias) order_ok=True missing=[] extra=['כל השיעורים בכלי עזר טבלאות זמני המאורעות ומפות']

### ❌ פרוייקט התנ"ך המוקלט - מתעדכן (static_link)
- quick-link rendered: False

### ❌ ליווי ת"תים (section)
- old=2 (incl. alias) order_ok=True missing=['שופטים'] extra=['כל השיעורים בליווי תתים']

## 2. Listing pages

Simulated 1273 pages (skipped 47 unmapped).

| Section | Pages | Pass | Old items | New items | Missing | Unexplained extra | Planned extras | Planned removals | Order fails | Rabbi mism. |
|---|---|---|---|---|---|---|---|---|---|---|
| נביאים | 546 | 24 (4.4%) | 7503 | 6033 | 1901 | 355 | 57 | 19 | 464 | 121 |
| כתובים | 365 | 11 (3.0%) | 2209 | 1858 | 915 | 314 | 4 | 246 | 92 | 13 |
| תורה | 185 | 3 (1.6%) | 5066 | 3361 | 2513 | 184 | 598 | 26 | 140 | 86 |
| הפטרות | 87 | 0 (0.0%) | 582 | 319 | 285 | 0 | 16 | 6 | 26 | 0 |
| נושאים-כלליים-בתנך | 37 | 4 (10.8%) | 628 | 396 | 259 | 4 | 1 | 22 | 15 | 1 |
| מועדים | 23 | 1 (4.3%) | 513 | 153 | 369 | 2 | 0 | 7 | 13 | 1 |
| איך-לומדים-תנך | 13 | 3 (23.1%) | 326 | 102 | 252 | 0 | 27 | 1 | 6 | 0 |
| ימי-עיון-בתנך | 8 | 0 (0.0%) | 673 | 229 | 475 | 4 | 1 | 26 | 8 | 0 |
| כלי-עזר-טבלאות-זמני-המאורעות-ומפות | 6 | 1 (16.7%) | 46 | 43 | 5 | 2 | 0 | 0 | 3 | 0 |
| ליווי-תתים | 3 | 1 (33.3%) | 2 | 6 | 0 | 1 | 0 | 3 | 0 | 0 |

Note: 48 of the pages are category/book aggregation nodes — the app renders them via CategoryPage (descendant aggregation), not /series/:id; the harness applies the prescribed series-page semantics everywhere, so their diffs overstate gaps. Worst-20 below lists leaf (collection) pages first.

### Top-20 worst pages

- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/ימי-עיון-בתנך/כל-השיעורים-מימי-עיון-בתנך/` *(kind=event_series)*
  - old=204 new=4 matched=3 in_order=1 missing=201 extra=1 (planned keep 0, planned remove 1, unexplained 0) order_ok=False rabbi_mm=0
  - missing sample: ['היחס לנבואה', 'כתבי הקודש מעטפה ותוכן', 'הגניבה על ידי אבותינו הקדושים', 'היחס הנכון לגדולת אישי התנך', 'לשון הכתוב ומשמעותה', 'כבוד אבות וכבוד שמים בתרגום אונקלוס', 'שאלות כמפתח לפתיחת הלב', 'קין בעל תשובה']
  - extra sample: ['בת שבע אם המלכות']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/כתובים/עזרא-ונחמיה/כל-עזרא-ונחמיה/` *(kind=collection)*
  - old=20 new=104 matched=3 in_order=3 missing=17 extra=101 (planned keep 0, planned remove 48, unexplained 53) order_ok=True rabbi_mm=0
  - missing sample: ['בנין ירושלים בתקופת נחמיה', 'שיבת ציון אז והיום', 'נחמיה תקומה וחומה', 'כפילות רשימת שבי הגולה', 'ספר עזרא עם תרגום וביאור ושננתם', 'שיבת ציון הצלחות ומשברים', 'שיבת ציון הצלחות ומשברים', 'מגילת אסתר וספרי הבית השני 1']
  - extra sample: ['נחמיה עולה לירושלים', 'תרגום לעברית עזרא פרק ו', 'גלות בית שני', 'צרי יהודה', 'אחדות', 'זרע הקודש', 'תרגום לעברית עזרא פרק ז', 'צרי יהודה ובנין החומה']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/כתובים/איוב/קריאה-וביאור-בקצרה-של-ספר-איוב/` *(kind=collection)*
  - old=42 new=145 matched=42 in_order=6 missing=0 extra=103 (planned keep 0, planned remove 52, unexplained 51) order_ok=False rabbi_mm=0
  - extra sample: ['מזמור עז', 'מזמור קא', 'מזמור קלט', 'מזמור קג', 'מזמור צג', 'מזמור קלו', 'מזמור צד', 'מזמור קיט חלק ג']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך/כל-השיעורים-באיך-לומדים-תנך/` *(kind=alias)*
  - old=94 new=12 matched=0 in_order=0 missing=94 extra=12 (planned keep 12, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
  - missing sample: ['שלושת עקרונות היסוד בלימוד תנך', 'הרב זלמן מלמד על לימוד תנך', 'חשיבות לימוד תנך בהקדמה ליהושע', 'שיעור קומה', 'הדרך הנכונה ללמד תנך', 'ההבנה האמתית של סיפורי התורה', 'היחס הנכון ללימוד התנך', 'היחס לנבואה']
  - extra sample: ['למה התנך לא מסודר על פי הגמרא בבא בתרא יד ב', 'רוח וחומר בסיפורי התנך', 'תנך בפשט עליון', 'למה לא ללמוד פרושים על תורה משנה גמרא וכו שאני ממציא', 'איך זה שהסבר פשט הכתובים נראה לפעמים מאד רחוק מן הפשט', 'איך לא ללמוד תנך', 'מדוע אסור לפרש את התנך בגובה עיניים', 'זהירות מהנמכה של גדולי עולם']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/כתובים/דניאל/כל-התכנים-בספר-דניאל/` *(kind=alias)*
  - old=15 new=81 matched=7 in_order=2 missing=8 extra=74 (planned keep 0, planned remove 36, unexplained 38) order_ok=False rabbi_mm=1
  - missing sample: ['הילד דניאל בארמון נבוכדנצר', 'ספר דניאל עם ביאור ותרגום ושננתם', 'מגילת אסתר וספרי הבית השני 1', 'מגילת אסתר וספרי הבית השני 2', 'שיבת ציון אז והיום', 'תאריכים בימי שיבת ציון', 'הקדמה לתופעת ארבע המלכויות', 'ציר זמן גלות בבל']
  - extra sample: ['לב הפרק דניאל פרק ב חלק שני', 'לב הפרק דניאל פרק ו', 'תרגום לעברית דניאל פרק ז', 'מלחמת תחיית המתים', 'לב הפרק דניאל פרק ג', 'לב הפרק דניאל פרק ה', 'לב הפרק דניאל פרק ז', 'לב הפרק דניאל פרק ט']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/מועדים/פסח/` *(kind=collection)*
  - old=102 new=31 matched=31 in_order=3 missing=71 extra=0 (planned keep 0, planned remove 0, unexplained 0) order_ok=False rabbi_mm=0
  - missing sample: ['מהפכות הפסח בתנך', 'הפסחים בתנך', 'יסודות המגיד בתנך', 'מדוע תקנו חזל שסיפור יציאת מצרים יהיה בנוי על פרשת ארמי אובד אבי', 'חג המצות חג הפסח וזמן חרותנו', 'באזני ילד אספר', 'סיפור השיעבוד במצרים', 'הולדת משה ומשמעותה']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-שמות-א-ו/` *(kind=collection)*
  - old=72 new=8 matched=3 in_order=1 missing=69 extra=5 (planned keep 5, planned remove 0, unexplained 0) order_ok=False rabbi_mm=0
  - missing sample: ['טבלת שנות השיעבוד במצרים', 'סבלות מצרים כמבררים את הזהות הישראלית', 'סוגיית המלך והמלכות בישראל רצון למלכות שמים', 'משה ככוח הפועל', 'השמות בחומש שמות', 'נפלאות שנאת המצרים כלפי העבריים', 'מי רוצה לצאת ממצרים', 'הניצחון על יסוד המים ביציאת מצרים']
  - extra sample: ['שאלות מקיפות פרשת שמות', 'תולדות קרבת ה לאדם מבראשית לאורך חומשי התורה', 'ביאור הפסוקים פרשת שמות', 'ביאורי מילים ושאלות פרשת שמות', 'דגשים לפרשת שמות']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים-כלליים-בתנך/כל-השיעורים-בנושאים-הכלליים/` *(kind=alias)*
  - old=101 new=37 matched=35 in_order=10 missing=66 extra=2 (planned keep 0, planned remove 2, unexplained 0) order_ok=False rabbi_mm=0
  - missing sample: ['מי אמר שלא תהיה גלות נוספת', 'אין עוד גלות לאחר הגאולה העתידה', 'פלאי נבואות הגאולה', 'עשרת העיקרים של מלחמת גוג ומגוג', 'נבואות מלחמת גוג ומגוג', 'גוג ומגוג מה זה', 'מיהו מנסח הנבואות', 'הנבואה משמים לארץ']
  - extra sample: ['בזכות נשים מרירות נגאלו ישראל', 'העקידת יצחק ר יצחק עראמה']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-בשלח-יג-יז/` *(kind=collection)*
  - old=71 new=14 matched=4 in_order=2 missing=67 extra=10 (planned keep 10, planned remove 0, unexplained 0) order_ok=False rabbi_mm=1
  - missing sample: ['טבלת שנות השיעבוד במצרים', 'בירור גאוות ה מתוך שירת הים', 'שני צדדים המלווים אותנו מיציאת מצרים', 'המטה של משה', 'מה הוסיפה קריעת ים סוף על יציאת מצרים', 'הפלשתים ושאר האויבים בפרשת בשלח', 'הנהגת ה איש מלחמה', 'עמוד האש ועמוד הענן']
  - extra sample: ['חידות לילדים פרשת בשלח', 'ביאורי מילים ושאלות פרשת בשלח', 'חוברת עבודה לתלמיד בשלח', 'שאלות חזרה על פרשת בשלח', 'שאלות מקיפות בשלח', 'שאלות מקיפות פרשת בשלח', 'דגשים לפרשת בשלח', 'שיעור פרשת בשלח']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/בראשית/פרשת-ויצא-כח-לב/` *(kind=collection)*
  - old=70 new=14 matched=5 in_order=2 missing=65 extra=9 (planned keep 8, planned remove 0, unexplained 1) order_ok=False rabbi_mm=0
  - missing sample: ['טבלת תולדות יעקב', 'ארמי אובד אבי', 'ישראל והמלאכים', 'סולם יעקב', 'כיצד יתכן שיעקב אבינו נשא שתי אחיות', 'האם יעקב שנא את לאה', 'ויזכר אלקים את רחל', 'מדוע גער יעקב ברחל']
  - extra sample: ['חוברת עבודה לתלמיד ויצא', 'חידות רשי על פי אב פרשת ויצא', 'דגשים לפרשת ויצא ויעקב איש תם', 'חידות על פי אב פרשת ויצא', 'שאלות מקיפות פרשת ויצא', 'שאלות חזרה על פרשת ויצא', 'דגשים פרשת ויצא', 'ביאור הפסוקים פרשת ויצא']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-בא-י-יג/` *(kind=collection)*
  - old=67 new=13 matched=3 in_order=3 missing=64 extra=10 (planned keep 10, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
  - missing sample: ['טבלת שנות השיעבוד במצרים', 'מעלת הבית הישראלי', 'עבודת ההשתייכות לכלל ישראל', 'מיהו הפרשן האולטימטיבי לאירועי הסביבה', 'הסדר של עשר המכות', 'ה חוזר לדבר אל ישראל', 'שלוש המכות שהכריעו את פרעה', 'עולם חדש של זמנים']
  - extra sample: ['ביאור הפסוקים פרשת בא', 'חידות לילדים פרשת בא', 'שיעור פרשת בא', 'ביאור פשט הפסוקים פרשת בא', 'ביאורי מילים ושאלות פרשת בא', 'שאלות חזרה על פרשת בא', 'שאלות מקיפות פרשת בא', 'דגשים לפרשות וארא בא']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/שמואל-א/כל-השיעורים-בספר-שמואל-א/` *(kind=alias)*
  - old=63 new=1 matched=1 in_order=1 missing=62 extra=0 (planned keep 0, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
  - missing sample: ['אלקנה חנה ופנינה', 'הולדת המלכות מכח אמונת חנה', 'חנה חן תחינה וחנינה', 'אל הנער הזה התפללתי', 'חטא בני עלי במבט כולל על הכהונה', 'ארון ה בארץ פלשתים', 'עלילות הארון בארץ פלשתים', 'ראשית המלוכה']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-יתרו-יח-כ/` *(kind=collection)*
  - old=63 new=13 matched=3 in_order=3 missing=60 extra=10 (planned keep 8, planned remove 0, unexplained 2) order_ok=True rabbi_mm=0
  - missing sample: ['מן השמים היא התורה היא המעצבת את ערכי המציאות', 'משפחת משה לא נשלטה בידי מצרים', 'קרבת ה לישראל בתחילת בריאתם', 'עמלק ויתרו יחסי ישראל והגויים', 'מחיי האבות אל חיי התורה', 'תהליך ההכשרה לקראת קבלת תורה', 'אנכי ה אלוקיך המטרה של יציאת מצרים', 'ההגבלה והפרישה לקראת מעמד הר סיני']
  - extra sample: ['חידות לילדים פרשת יתרו', 'חוברת עבודה לתלמיד יתרו', 'שאלות חזרה על פרשת יתרו', 'שיעור פרשת יתרו', 'שאלות מקיפות פרשת יתרו', 'ביאור פשט הפסוקים פרשת יתרו', 'דגשים לפרשת יתרו חלק א', 'דגשים לפרשת יתרו חלק ב']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/מלכים-ב/שיעורים-קצרים-קריאה-וביאור-ספר-מלכים-ב/` *(kind=collection)*
  - old=61 new=0 matched=0 in_order=0 missing=61 extra=0 (planned keep 0, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
  - missing sample: ['נבואת אליהו לאחזיהו', 'עלית אליהו לשמים', 'ניצחון המלכים על מואב', 'ניסי אלישע חלק א', 'ניסי אלישע חלק ב', 'ניסי אלישע חלק ג', 'אלישע נעמן וגיחזי חלק א', 'אלישע נעמן וגיחזי חלק ב']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/מועדים/כל-השיעורים-על-המועדים/` *(kind=collection)*
  - old=58 new=0 matched=0 in_order=0 missing=58 extra=0 (planned keep 0, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
  - missing sample: ['תשובת אלול בבית המקדש השני', 'סדר בסליחות', 'אורי וישעי', 'השיבנו ה אליך ונשובה', 'ראש השנה על פי ספר נחמיה', 'החייאת בן השונמית בראש השנה', 'ארפא משובתם אוהבם נדבה', 'פעולת תקיעת השופר בראש השנה']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-וארא-ו-ט/` *(kind=collection)*
  - old=59 new=10 matched=1 in_order=1 missing=58 extra=9 (planned keep 9, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
  - missing sample: ['טבלת שנות השיעבוד במצרים', 'הבנת שליחותו של עם ישראל היוצאת מעשרת המכות', 'המכות תודעת האחדות לעומת תודעת החלקיות', 'השמות בחומש שמות', 'המטה של משה', 'יציאת מצרים הצלת הטוב מן הרע', 'הסדר של עשר המכות', 'היחוס של משה מתגלה']
  - extra sample: ['חידות לילדים פרשת וארא', 'שאלות מקיפות פרשת וארא', 'ביאור הפסוקים פרשת וארא', 'ביאורי מילים ושאלות פרשת וארא', 'שאלות מקיפות וארא', 'דגשים לפרשות וארא בא', 'שאלות חזרה על פרשת וארא', 'ביאור פשט הפסוקים פרשת וארא']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/בראשית/כל-השיעורים-בחומש-בראשית/` *(kind=alias)*
  - old=59 new=3 matched=2 in_order=1 missing=57 extra=1 (planned keep 1, planned remove 0, unexplained 0) order_ok=False rabbi_mm=0
  - missing sample: ['קין בעל תשובה', 'טבלת עשרים הדורות הראשונים', 'מה פירוש המושג צלם אלוקים', 'מה פירוש המושג עזר כנגדו', 'איזו מיתה נגזרה על האדם בעקבות אכילת עץ הדעת', 'דמותו של חנוך', 'שירתו של למך לשתי נשיו', 'בני האלקים ובנות האדם']
  - extra sample: ['בראשית']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-משפטים-כא-כד/` *(kind=collection)*
  - old=57 new=14 matched=3 in_order=2 missing=54 extra=11 (planned keep 10, planned remove 0, unexplained 1) order_ok=False rabbi_mm=0
  - missing sample: ['תפקיד המשפט בישראל', 'מהות ודרך ההליכה אחר הרוב', 'המשפטים בישראל משפטי ה', 'מפה של המצוות פרשת משפטים', 'העבדות', 'מעט מעט אגרשנו מפניך', 'התפקיד הסודי של הפחד מפני ישראל', 'הדינים במשפטים פירוט משפטי של עשרת הדברות']
  - extra sample: ['חידות לילדים פרשת משפטים', 'חוברת עבודה לתלמיד משפטים', 'שיעור פרשת משפטים', 'שאלות חזרה על פרשת משפטים', 'סדר ומשמעות בפרשות משפטים כי תשא', 'שאלות מקיפות משפטים', 'שאלות מקיפות פרשת משפטים', 'ביאור הפסוקים פרשת משפטים']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/במדבר/פרשת-פנחס-כה-ל/` *(kind=collection)*
  - old=56 new=10 matched=5 in_order=4 missing=51 extra=5 (planned keep 3, planned remove 0, unexplained 2) order_ok=False rabbi_mm=2
  - missing sample: ['סדר בפרשת המועדים', 'טבלת מאורעות שנת הארבעים', 'הפרהסיא הציבורית בין זמרי לפנחס', 'זהירות נקמה', 'שתיים שהן ארבע מינוי יהושע', 'מידת הקנאות', 'פנחס הוא אליהו', 'מאבק ישראל ומדין']
  - extra sample: ['חידות לילדים פרשת פנחס', 'פרשת פינחס', 'דגשים לפרשת פנחס ב', 'דגשים לפרשת פנחס א', 'ונקריב לפניך קרבן תמיד']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/בראשית/פרשת-וישב-לז-מ/` *(kind=collection)*
  - old=53 new=12 matched=1 in_order=1 missing=52 extra=11 (planned keep 10, planned remove 0, unexplained 1) order_ok=True rabbi_mm=0
  - missing sample: ['פרשת יהודה ותמר', 'פרשת יהודה ותמר', 'יוסף ואחיו', 'טבלת תולדות יעקב', 'הכל מן האישה', 'הכיצד נמכר יוסף', 'עדות ביהוסף שמו מחלוקת יוסף והאחים', 'מחלוקת לשם שמים בבניין ישראל']
  - extra sample: ['חידות לילדים פרשת וישב', 'שאלות חזרה על פרשת וישב', 'ביאור הפסוקים פרשת וישב', 'דגשים פרשת וישב', 'חוברת עבודה לתלמיד וישב', 'פרשת וישב', 'דגשים לפרשת וישב מכירת יוסף', 'שאלות מקיפות פרשת וישב']

## 3. Rabbi pages

rabbi_page_items table: available; used for 0 rabbis (rest = fallback owned-series + lessons).

16/154 PASS. Worst 15 by missing lessons:

- **הרב יואב אוריאל**: series old=50 new=63 missing=4 | lessons old=94 new=990 missing=57 extra=953 order_ok=False
- **ושננתם**: series old=6 new=0 missing=6 | lessons old=34 new=0 missing=34 extra=0 order_ok=True
- **הרב איתן שנדורפי**: series old=30 new=33 missing=2 | lessons old=73 new=909 missing=36 extra=872 order_ok=False
- **הרב מנחם שחור**: series old=7 new=13 missing=2 | lessons old=64 new=215 missing=26 extra=177 order_ok=False
- **הרב יהודה קופרמן זצ"ל**: series old=8 new=1 missing=8 | lessons old=19 new=115 missing=17 extra=113 order_ok=True
- **הרב יוסי ברינר**: series old=0 new=0 missing=0 | lessons old=31 new=9 missing=23 extra=1 order_ok=False
- **הרב עמנואל בן ארצי**: series old=26 new=14 missing=13 | lessons old=22 new=456 missing=5 extra=439 order_ok=False
- **הרב יוסף שילר**: series old=5 new=1 missing=4 | lessons old=11 new=115 missing=10 extra=114 order_ok=True
- **הרב אס"ף בנדל**: series old=0 new=0 missing=0 | lessons old=15 new=4 missing=11 extra=0 order_ok=False
- **מערכת בני ציון**: series old=6 new=0 missing=6 | lessons old=2 new=293 missing=2 extra=293 order_ok=True
- **הרב עמירם אלבה**: series old=6 new=0 missing=6 | lessons old=13 new=376 missing=0 extra=363 order_ok=False
- **הרב דוד ג'יאמי**: series old=5 new=0 missing=5 | lessons old=0 new=39 missing=0 extra=39 order_ok=True
- **הרב חגי ולוסקי**: series old=5 new=3 missing=3 | lessons old=5 new=211 missing=2 extra=208 order_ok=False
- **הרב יהונתן מיכאלי**: series old=5 new=1 missing=4 | lessons old=0 new=201 missing=0 extra=201 order_ok=True
- **הרב שלמה אבינר**: series old=11 new=11 missing=4 | lessons old=0 new=174 missing=0 extra=174 order_ok=True

## 4. Topics

- Sidebar: FAIL — old=127 new=123 missing=5 extra=1 order_ok=False count-mismatches=92
- ⚠️ HARNESS FINDING: the sidebar count query returns exactly 1000 rows (PostgREST cap) — the app sends NO limit, so the badge counts in production are computed from a truncated row set.
- series_topics table: missing (nonempty=False) — series-card checks SKIPPED gracefully
- Topic pages: 29/128 PASS

- **ארץ ישראל**: old=34 new=32 missing=3 extra=1 order_ok=False old_series_cards=0
- **גאולה**: old=53 new=51 missing=2 extra=0 order_ok=False old_series_cards=0
- **ארון הברית**: old=16 new=15 missing=1 extra=0 order_ok=False old_series_cards=0
- **בית המקדש**: old=37 new=37 missing=1 extra=1 order_ok=False old_series_cards=1
- **בכורות**: old=2 new=1 missing=1 extra=0 order_ok=True old_series_cards=0
- **גוג ומגוג**: old=10 new=9 missing=1 extra=0 order_ok=False old_series_cards=0
- **__meta__**: old=None new=None missing=None extra=None order_ok=None old_series_cards=None
- **אהבת ה'**: old=7 new=7 missing=0 extra=0 order_ok=False old_series_cards=0
- **אליהו הנביא**: old=8 new=8 missing=0 extra=0 order_ok=False old_series_cards=0
- **אלישע הנביא**: old=6 new=6 missing=0 extra=0 order_ok=False old_series_cards=0
- **ביטחון ב-ד'**: old=2 new=2 missing=0 extra=0 order_ok=False old_series_cards=0
- **בית המקדש השלישי**: old=7 new=7 missing=0 extra=0 order_ok=False old_series_cards=0
- **בית שני**: old=34 new=34 missing=0 extra=0 order_ok=False old_series_cards=1
- **ברית מילה**: old=7 new=7 missing=0 extra=0 order_ok=False old_series_cards=0
- **גלות**: old=19 new=19 missing=0 extra=0 order_ok=False old_series_cards=0

## 5. Teachers wing

- teacher_listing_items table: MISSING → fallback hooks simulated
- Content types: 1/22 PASS
  - ❌ ביאור הפסוקים (fallback_lessons_by_content_type): old=119 new=946 matched=111 missing=8 extra=835
  - ❌ ביאורי מילים (fallback_lessons_by_content_type): old=39 new=379 matched=38 missing=1 extra=341
  - ❌ דגשים והכוונה על סדר הפרקים (fallback_lessons_by_content_type): old=84 new=197 matched=59 missing=25 extra=138
  - ❌ דפי עבודה (fallback_lessons_by_content_type): old=70 new=512 matched=67 missing=3 extra=445
  - ❌ הכוונה והדרכה למורה (fallback_lessons_by_content_type): old=142 new=934 matched=138 missing=4 extra=796
  - ❌ חוברת עבודה (fallback_lessons_by_content_type): old=1 new=14 matched=1 missing=0 extra=13
  - ✅ חידון (fallback_lessons_by_content_type): old=1 new=1 matched=1 missing=0 extra=0
  - ❌ חידות חזרה (fallback_lessons_by_content_type): old=118 new=856 matched=118 missing=0 extra=738
  - ❌ מבחן כללי ספר שופטים (fallback_lessons_by_content_type): old=1 new=2 matched=1 missing=0 extra=1
  - ❌ מבחנים (fallback_lessons_by_content_type): old=1 new=3 matched=1 missing=0 extra=2
  - ❌ מי אמר למי (fallback_lessons_by_content_type): old=2 new=14 matched=2 missing=0 extra=12
  - ❌ מפות (fallback_lessons_by_content_type): old=12 new=61 matched=12 missing=0 extra=49
  - ❌ מקורות עזר לפרקים (fallback_lessons_by_content_type): old=9 new=36 matched=9 missing=0 extra=27
  - ❌ סיכום הפרקים והנושאים בקצרה (fallback_lessons_by_content_type): old=159 new=251 matched=156 missing=3 extra=95
  - ❌ ספר יהושע (fallback_lessons_by_content_type): old=1 new=3 matched=0 missing=1 extra=3
  - ❌ ספר מלכים (fallback_lessons_by_content_type): old=1 new=2 matched=1 missing=0 extra=1
  - ❌ ספר שופטים (fallback_lessons_by_content_type): old=2 new=4 matched=1 missing=1 extra=3
  - ❌ ערכים ומידות העולים מן הפסוקים (fallback_lessons_by_content_type): old=11 new=27 matched=11 missing=0 extra=16
  - ❌ שאלות ותשובות (fallback_lessons_by_content_type): old=33 new=74 matched=21 missing=12 extra=53
  - ❌ שאלות ותשובות על סדר הפרקים (fallback_lessons_by_content_type): old=99 new=841 matched=60 missing=39 extra=781
  - ❌ שאלות חזרה (fallback_lessons_by_content_type): old=1 new=63 matched=0 missing=1 extra=63
  - ❌ שאלות עיון (fallback_lessons_by_content_type): old=1 new=2 matched=1 missing=0 extra=1
- Creators: 1/31 PASS
  - ❌ אוריה כראדי : old=1 new=2 matched=1 missing=0
  - ❌ הרב אורי שטמלר : old=3 new=221 matched=0 missing=3
  - ❌ הרב אשי בלייכר : old=2 new=67 matched=0 missing=2
  - ❌ הרב בניה כהן : old=4 new=407 matched=0 missing=4
  - ❌ הרב גדי שר שלום : old=1 new=46 matched=1 missing=0
  - ❌ הרב דביר אפלבוים : old=3 new=315 matched=0 missing=3
  - ❌ הרב חסדאי בר אור : old=2 new=78 matched=2 missing=0
  - ❌ הרב ידידיה שילה : old=1 new=2 matched=1 missing=0
  - ❌ הרב יהודה בשושה : old=0 new=7 matched=0 missing=0
  - ❌ הרב יונתן לוי : old=12 new=155 matched=12 missing=0
  - ❌ הרב יורם אליהו : old=1 new=50 matched=1 missing=0
  - ❌ הרב יצחק עמראני : old=21 new=146 matched=21 missing=0
  - ❌ הרב מאיר גרשונזון : old=1 new=2 matched=0 missing=1
  - ❌ הרב מאיר הילביץ' : old=5 new=0 matched=0 missing=5
  - ❌ הרב מנחם אליהו : old=2 new=278 matched=0 missing=2
  - ❌ הרב נחום אריאל : old=1 new=164 matched=0 missing=1
  - ❌ הרב ניסים כהן : old=9 new=181 matched=9 missing=0
  - ❌ הרב עדי איצקוביץ' : old=13 new=137 matched=0 missing=13
  - ❌ הרב עמוס נתנאל : old=2 new=0 matched=0 missing=2
  - ❌ הרב עמירם אלבה : old=19 new=331 matched=13 missing=6
  - ❌ הרב עמנואל בן ארצי : old=48 new=12 matched=7 missing=41
  - ❌ הרב שלמה כץ : old=21 new=258 matched=21 missing=0
  - ❌ הרב שמעון לוי והרב נתן מולאיוף : old=11 new=162 matched=11 missing=0
  - ❌ הרב שמעון שוהם : old=22 new=158 matched=22 missing=0
  - ❌ ושננתם - אוצר התורה : old=50 new=1256 matched=46 missing=4
  - ❌ ישקו העדרים : old=5 new=140 matched=3 missing=2
  - ❌ מחבר לא ידוע : old=4 new=25 matched=4 missing=0
  - ❌ מכון דעת סופרים : old=6 new=209 matched=6 missing=0
  - ❌ נתן מארגל : old=5 new=121 matched=0 missing=5
  - ✅ סידור שים שלום : old=1 new=1 matched=1 missing=0
  - ❌ תלמוד תורה מורשה : old=6 new=114 matched=0 missing=6
- By-book tree: 13/35 PASS
  - ❌ איוב: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ❌ איכה: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ❌ אסתר: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ❌ במדבר: old=12 new=19 matched=11 missing=1 extra=8 order_ok=False
  - ❌ בראשית: old=14 new=27 matched=12 missing=2 extra=15 order_ok=True
  - ❌ דברים: old=6 new=11 matched=5 missing=1 extra=6 order_ok=True
  - ❌ דניאל: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ הושע: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ❌ ויקרא: old=12 new=20 matched=11 missing=1 extra=9 order_ok=False
  - ✅ זכריה: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ חבקוק: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ חגי: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ❌ יהושע: old=2 new=15 matched=0 missing=2 extra=15 order_ok=True
  - ✅ יואל: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ יונה: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ יחזקאל: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ❌ ירמיהו: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ❌ ישעיהו: old=0 new=3 matched=0 missing=0 extra=3 order_ok=True
  - ✅ מיכה: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ מלאכי: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ❌ מלכים א: old=2 new=14 matched=1 missing=1 extra=13 order_ok=True
  - ❌ מלכים ב: old=2 new=10 matched=1 missing=1 extra=9 order_ok=True
  - ✅ נחום: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ❌ נחמיה: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ✅ עובדיה: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ❌ עזרא: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ✅ עמוס: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ צפניה: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ❌ רות: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ❌ שופטים: old=2 new=17 matched=1 missing=1 extra=16 order_ok=True
  - ✅ שיר השירים: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ❌ שמואל א: old=2 new=17 matched=1 missing=1 extra=16 order_ok=True
  - ❌ שמואל ב: old=2 new=11 matched=0 missing=2 extra=11 order_ok=True
  - ❌ שמות: old=13 new=28 matched=11 missing=2 extra=17 order_ok=True
  - ❌ תהלים: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True

## 6. Guards

- Teacher-only items in PUBLIC simulations: listings lessons=215, topic lessons=0, sidebar children=0 (rabbi-page lessons=784 — intentional per code comment, info only)
- Draft items in public sidebar: 2
- Popup sample (60 lessons): content-null=26, fully-empty (no content+no media)=0 — known-debt, not FAIL
| Section | Sampled | content NULL | empty popup |
|---|---|---|---|
| איך-לומדים-תנך | 6 | 3 | 0 |
| הפטרות | 6 | 1 | 0 |
| ימי-עיון-בתנך | 6 | 4 | 0 |
| כלי-עזר-טבלאות-זמני-המאורעות-ומפות | 6 | 2 | 0 |
| כתובים | 6 | 2 | 0 |
| ליווי-תתים | 6 | 2 | 0 |
| מועדים | 6 | 4 | 0 |
| נביאים | 6 | 5 | 0 |
| נושאים-כלליים-בתנך | 6 | 2 | 0 |
| תורה | 6 | 2 | 0 |

## Harness notes / limitations

- Queries replicate supabase-js REST emission of the CURRENT working-tree hooks (useContentSidebar, useSeriesChildren+useLessonsBySeries for /series/:id, useRabbi*, useTopicsSidebar/useTopicLessons, useTeacherSidebar/useTeacherBookContent) — including implicit 1000-row PostgREST caps where the app sends no limit.
- Hebrew collation approximated by codepoint order (browser localeCompare('he') may differ on geresh/maqaf edge cases).
- torah/ketuvim old listing scrape carries lesson rows only (series cards live in sub_links) → series-card diff for those pages is not checked (reported as series_new_unchecked).
- 'planned_extras' = extra new lessons whose id is placed in this series by RESOLVED-OPS; 'planned_removals' = extras the plan drafts or moves elsewhere (expected to disappear after apply).
- Old rav pages aggregate a series into ONE row; lessons inside series are not listed there — rabbi lesson diffs compare the old flat rows vs the new flat list (post-fix exhaustive list).