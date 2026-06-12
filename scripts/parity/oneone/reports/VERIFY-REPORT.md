# post-code2-changes — oneone verification report
*Generated 2026-06-12 09:09 by oneone_verify.py — read-only anon-REST simulation of the CURRENT working-tree UI hooks against the live DB.*

REST calls: 161 (cache hits 4, errors 0)

> 🔴 **P0 HARNESS FINDING — PGRST100:** TopicPage.tsx:112 sends or=(lessons.audience_tags...) at top level — PostgREST rejects it (PGRST100, needs lessons.or=(...)) → production topic pages error out. Harness verified topic data with the equivalent foreign-table filter.

## Summary

| Section | Pass | Total | Pass rate |
|---|---|---|---|
| Listing pages | 7 | 50 | 14.0% |
| Teachers content-types | 14 | 22 | 63.6% |
| Teachers creators | 1 | 31 | 3.2% |
| Teachers by-book | 8 | 35 | 22.9% |

## 2. Listing pages

Simulated 50 pages (skipped 47 unmapped).

| Section | Pages | Pass | Old items | New items | Missing | Unexplained extra | Planned extras | Planned removals | Order fails | Rabbi mism. |
|---|---|---|---|---|---|---|---|---|---|---|
| כתובים | 12 | 1 (8.3%) | 222 | 339 | 20 | 136 | 1 | 0 | 7 | 14 |
| הפטרות | 8 | 1 (12.5%) | 83 | 83 | 0 | 0 | 0 | 0 | 0 | 0 |
| ימי-עיון-בתנך | 8 | 1 (12.5%) | 673 | 677 | 3 | 6 | 1 | 0 | 0 | 9 |
| איך-לומדים-תנך | 7 | 2 (28.6%) | 288 | 156 | 161 | 3 | 26 | 0 | 0 | 0 |
| כלי-עזר-טבלאות-זמני-המאורעות-ומפות | 6 | 1 (16.7%) | 46 | 43 | 5 | 2 | 0 | 0 | 0 | 0 |
| מועדים | 4 | 1 (25.0%) | 103 | 99 | 4 | 0 | 0 | 0 | 0 | 5 |
| ליווי-תתים | 2 | 0 (0.0%) | 0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 |
| נביאים | 1 | 0 (0.0%) | 263 | 0 | 263 | 0 | 0 | 0 | 0 | 0 |
| נושאים-כלליים-בתנך | 1 | 0 (0.0%) | 101 | 96 | 6 | 1 | 0 | 0 | 0 | 6 |
| תורה | 1 | 0 (0.0%) | 159 | 2 | 157 | 0 | 0 | 0 | 0 | 0 |

Note: 21 of the pages are category/book aggregation nodes — the app renders them via CategoryPage (descendant aggregation), not /series/:id; the harness applies the prescribed series-page semantics everywhere, so their diffs overstate gaps. Worst-20 below lists leaf (collection) pages first.

### Top-20 worst pages

- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך/כל-השיעורים-באיך-לומדים-תנך/` *(kind=alias)*
  - old=94 new=33 matched=20 in_order=20 missing=74 extra=13 (planned keep 12, planned remove 0, unexplained 1) order_ok=True rabbi_mm=0
  - missing sample: ['שלושת עקרונות היסוד בלימוד תנך', 'הרב זלמן מלמד על לימוד תנך', 'חשיבות לימוד תנך בהקדמה ליהושע', 'שיעור קומה', 'הדרך הנכונה ללמד תנך', 'ההבנה האמתית של סיפורי התורה', 'היחס הנכון ללימוד התנך', 'היחס לנבואה']
  - extra sample: ['מחשב מסלול מחדש', 'איך זה שהסבר פשט הכתובים נראה לפעמים מאד רחוק מן הפשט', 'למה התנך לא מסודר על פי הגמרא בבא בתרא יד ב', 'רוח וחומר בסיפורי התנך', 'למה לא ללמוד פרושים על תורה משנה גמרא וכו שאני ממציא', 'האם אפשר להסביר תנך פשוט אבל לא בגובה עיניים', 'מדוע אסור לפרש את התנך בגובה עיניים', 'זהירות מהנמכה של גדולי עולם']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך/דרכי-הפרשנות-והמדרש-בתנך/` *(kind=collection)*
  - old=55 new=51 matched=49 in_order=49 missing=6 extra=2 (planned keep 1, planned remove 0, unexplained 1) order_ok=True rabbi_mm=0
  - missing sample: ['אין מקרא יוצא מדי פשוטו', 'דרכיה דרכי נועם', 'אין מוקדם ומאוחר בנביאים', 'חלוקת הפרקים וספרי התנך', 'סיומות השמות בתנך', 'הביטויים עם ישראל בני ישראל ועדת ישראל']
  - extra sample: ['מחשב מסלול מחדש', 'דרכי הפרשנות והמדרש בתנך']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך/הגישה-הראויה-ללימוד-תנך/` *(kind=collection)*
  - old=27 new=22 matched=22 in_order=22 missing=5 extra=0 (planned keep 0, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
  - missing sample: ['איך יש להבין תלונות על הקבה בתנך', 'התנך אינו ספר היסטוריה', 'תנך וארכאולוגיה', 'המטרה בלימוד תנך', 'מה מטרתנו בלימוד תנך']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/כלי-עזר-טבלאות-זמני-המאורעות-ומפות/ציר-זמן-תקופת-המלכים/` *(kind=collection)*
  - old=3 new=0 matched=0 in_order=0 missing=3 extra=0 (planned keep 0, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
  - missing sample: ['ציר זמן תקופת המלכים כמות מידע מינימלית', 'ציר זמן תקופת המלכים כמות מידע בינונית', 'ציר זמן תקופת המלכים כל המידע']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך/היחס-הראוי-לאבות-ולחטאיהם/` *(kind=collection)*
  - old=18 new=17 matched=16 in_order=16 missing=2 extra=1 (planned keep 1, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
  - missing sample: ['הגישה לחטאים של גדולי האומה', 'ביאור הכלל כל הגדול מחברו יצרו גדול הימנו']
  - extra sample: ['היחס הראוי לאבות ולחטאיהם']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/ימי-עיון-בתנך/ימי-עיון-בתנך-תשעו/` *(kind=event_series)*
  - old=55 new=57 matched=55 in_order=55 missing=0 extra=2 (planned keep 0, planned remove 0, unexplained 2) order_ok=True rabbi_mm=0
  - extra sample: ['דבורה הנביאה הנהגה אידיאלית', 'שבת ציון אז והיום']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/ימי-עיון-בתנך/ימי-עיון-בתנך-תשעח/` *(kind=event_series)*
  - old=62 new=64 matched=62 in_order=62 missing=0 extra=2 (planned keep 0, planned remove 0, unexplained 2) order_ok=True rabbi_mm=0
  - extra sample: ['דמויות המופלאה של שמשון', 'דוד המלך בטחון והשתדלות']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/ימי-עיון-בתנך/כל-השיעורים-מימי-עיון-בתנך/` *(kind=event_series)*
  - old=204 new=204 matched=203 in_order=203 missing=1 extra=1 (planned keep 0, planned remove 0, unexplained 1) order_ok=True rabbi_mm=2
  - missing sample: ['מגלות יהויכין עד חורבן הבית']
  - extra sample: ['מגלת יהויכין עד חורבן הבית']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/כלי-עזר-טבלאות-זמני-המאורעות-ומפות/מבנה-ירושלים-בסוף-תקופת-בית-ראשון-ותחילת-תקופת-בית-שני/` *(kind=collection)*
  - old=2 new=0 matched=0 in_order=0 missing=2 extra=0 (planned keep 0, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
  - missing sample: ['מבנה ירושלים בסוף הבית הראשון עם הסברים', 'המחשות של ירושלים בזמן בית ראשון מול ירושלים כיום רק ההרים רק החומות וכו']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/ימי-עיון-בתנך/ימי-עיון-בתנך-תשעד/` *(kind=event_series)*
  - old=29 new=29 matched=28 in_order=28 missing=1 extra=1 (planned keep 1, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
  - missing sample: ['מגלות יהויכין עד חורבן הבית']
  - extra sample: ['מגלת יהויכין עד חורבן הבית']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/כלי-עזר-טבלאות-זמני-המאורעות-ומפות/מפות-עזר-לספר-יהושע/` *(kind=collection)*
  - old=14 new=15 matched=14 in_order=14 missing=0 extra=1 (planned keep 0, planned remove 0, unexplained 1) order_ok=True rabbi_mm=0
  - extra sample: ['מפות על ספר יהושע']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/כלי-עזר-טבלאות-זמני-המאורעות-ומפות/מפות-עזר-לספר-שופטים/` *(kind=collection)*
  - old=10 new=11 matched=10 in_order=10 missing=0 extra=1 (planned keep 0, planned remove 0, unexplained 1) order_ok=True rabbi_mm=0
  - extra sample: ['מפות על ספר שופטים']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/ליווי-תתים/שופטים/` *(kind=collection)*
  - old=0 new=1 matched=0 in_order=0 missing=0 extra=1 (planned keep 0, planned remove 0, unexplained 1) order_ok=True rabbi_mm=0
  - extra sample: ['סיכום נושאי הפרקים בספר שופטים']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/מועדים/חודש-אלול-וימי-התשובה/` *(kind=collection)*
  - old=24 new=23 matched=23 in_order=23 missing=1 extra=0 (planned keep 0, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
  - missing sample: ['אורי וישעי']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך/אוסף-הדרכות-בלימוד-תנך/` *(kind=empty)*
  - old=0 new=0 matched=0 in_order=0 missing=0 extra=0 (planned keep 0, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך/אוסף-מקורות-על-חשיבות-לימוד-תנך/` *(kind=empty)*
  - old=0 new=0 matched=0 in_order=0 missing=0 extra=0 (planned keep 0, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/הפטרות/הפטרות-במדבר/` *(kind=collection)*
  - old=10 new=10 matched=10 in_order=10 missing=0 extra=0 (planned keep 0, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/הפטרות/הפטרות-בראשית/` *(kind=collection)*
  - old=0 new=0 matched=0 in_order=0 missing=0 extra=0 (planned keep 0, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/הפטרות/הפטרות-דברים/` *(kind=collection)*
  - old=14 new=14 matched=14 in_order=14 missing=0 extra=0 (planned keep 0, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/הפטרות/הפטרות-המועדים/` *(kind=collection)*
  - old=7 new=7 matched=7 in_order=7 missing=0 extra=0 (planned keep 0, planned remove 0, unexplained 0) order_ok=True rabbi_mm=0

## 5. Teachers wing

- teacher_listing_items table: available
- Content types: 14/22 PASS
  - ❌ ביאור הפסוקים (teacher_listing_items): old=119 new=116 matched=116 missing=3 extra=0
  - ❌ ביאורי מילים (teacher_listing_items): old=39 new=38 matched=38 missing=1 extra=0
  - ❌ דגשים והכוונה על סדר הפרקים (teacher_listing_items): old=84 new=82 matched=82 missing=2 extra=0
  - ❌ דפי עבודה (teacher_listing_items): old=70 new=69 matched=69 missing=1 extra=0
  - ✅ הכוונה והדרכה למורה (teacher_listing_items): old=142 new=142 matched=142 missing=0 extra=0
  - ❌ חוברת עבודה (fallback_lessons_by_content_type): old=1 new=13 matched=1 missing=0 extra=12
  - ✅ חידון (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ❌ חידות חזרה (teacher_listing_items): old=118 new=115 matched=115 missing=3 extra=0
  - ✅ מבחן כללי ספר שופטים (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ מבחנים (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ מי אמר למי (teacher_listing_items): old=2 new=2 matched=2 missing=0 extra=0
  - ✅ מפות (teacher_listing_items): old=12 new=12 matched=12 missing=0 extra=0
  - ✅ מקורות עזר לפרקים (teacher_listing_items): old=9 new=9 matched=9 missing=0 extra=0
  - ❌ סיכום הפרקים והנושאים בקצרה (teacher_listing_items): old=159 new=158 matched=158 missing=1 extra=0
  - ❌ ספר יהושע (fallback_lessons_by_content_type): old=1 new=3 matched=0 missing=1 extra=3
  - ✅ ספר מלכים (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ ספר שופטים (teacher_listing_items): old=2 new=2 matched=2 missing=0 extra=0
  - ✅ ערכים ומידות העולים מן הפסוקים (teacher_listing_items): old=11 new=11 matched=11 missing=0 extra=0
  - ✅ שאלות ותשובות (teacher_listing_items): old=33 new=33 matched=33 missing=0 extra=0
  - ✅ שאלות ותשובות על סדר הפרקים (teacher_listing_items): old=99 new=99 matched=99 missing=0 extra=0
  - ✅ שאלות חזרה (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ שאלות עיון (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
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
  - ❌ הרב מאיר הילביץ' : old=5 new=1 matched=1 missing=4
  - ❌ הרב מנחם אליהו : old=2 new=278 matched=0 missing=2
  - ❌ הרב נחום אריאל : old=1 new=164 matched=0 missing=1
  - ❌ הרב ניסים כהן : old=9 new=181 matched=9 missing=0
  - ❌ הרב עדי איצקוביץ' : old=13 new=137 matched=0 missing=13
  - ❌ הרב עמוס נתנאל : old=2 new=3 matched=1 missing=1
  - ❌ הרב עמירם אלבה : old=19 new=348 matched=14 missing=5
  - ❌ הרב עמנואל בן ארצי : old=48 new=23 matched=16 missing=32
  - ❌ הרב שלמה כץ : old=21 new=259 matched=21 missing=0
  - ❌ הרב שמעון לוי והרב נתן מולאיוף : old=11 new=163 matched=11 missing=0
  - ❌ הרב שמעון שוהם : old=22 new=158 matched=22 missing=0
  - ❌ ושננתם - אוצר התורה : old=50 new=1113 matched=48 missing=2
  - ❌ ישקו העדרים : old=5 new=140 matched=3 missing=2
  - ❌ מחבר לא ידוע : old=4 new=25 matched=4 missing=0
  - ❌ מכון דעת סופרים : old=6 new=209 matched=6 missing=0
  - ❌ נתן מארגל : old=5 new=110 matched=0 missing=5
  - ✅ סידור שים שלום : old=1 new=1 matched=1 missing=0
  - ❌ תלמוד תורה מורשה : old=6 new=114 matched=0 missing=6
- By-book tree: 8/35 PASS
  - ❌ איוב: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ❌ איכה: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ❌ אסתר: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ במדבר: old=12 new=22 matched=11 missing=1 extra=11 order_ok=False
  - ❌ בראשית: old=14 new=28 matched=12 missing=2 extra=16 order_ok=True
  - ❌ דברים: old=6 new=15 matched=5 missing=1 extra=10 order_ok=False
  - ❌ דניאל: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ הושע: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ❌ ויקרא: old=12 new=24 matched=11 missing=1 extra=13 order_ok=False
  - ❌ זכריה: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ✅ חבקוק: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ חגי: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ❌ יהושע: old=2 new=11 matched=0 missing=2 extra=11 order_ok=True
  - ❌ יואל: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ✅ יונה: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ❌ יחזקאל: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ ירמיהו: old=0 new=3 matched=0 missing=0 extra=3 order_ok=True
  - ❌ ישעיהו: old=0 new=4 matched=0 missing=0 extra=4 order_ok=True
  - ❌ מיכה: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ❌ מלאכי: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ❌ מלכים א: old=2 new=15 matched=1 missing=1 extra=14 order_ok=True
  - ❌ מלכים ב: old=2 new=11 matched=1 missing=1 extra=10 order_ok=True
  - ✅ נחום: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ❌ נחמיה: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ✅ עובדיה: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ❌ עזרא: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ✅ עמוס: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ❌ צפניה: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True
  - ✅ רות: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ❌ שופטים: old=2 new=16 matched=1 missing=1 extra=15 order_ok=True
  - ✅ שיר השירים: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ❌ שמואל א: old=2 new=13 matched=1 missing=1 extra=12 order_ok=True
  - ❌ שמואל ב: old=2 new=10 matched=0 missing=2 extra=10 order_ok=True
  - ❌ שמות: old=13 new=29 matched=11 missing=2 extra=18 order_ok=True
  - ❌ תהלים: old=0 new=1 matched=0 missing=0 extra=1 order_ok=True

## Harness notes / limitations

- Queries replicate supabase-js REST emission of the CURRENT working-tree hooks (useContentSidebar, useSeriesChildren+useLessonsBySeries for /series/:id, useRabbi*, useTopicsSidebar/useTopicLessons, useTeacherSidebar/useTeacherBookContent) — including implicit 1000-row PostgREST caps where the app sends no limit.
- Hebrew collation approximated by codepoint order (browser localeCompare('he') may differ on geresh/maqaf edge cases).
- torah/ketuvim old listing scrape carries lesson rows only (series cards live in sub_links) → series-card diff for those pages is not checked (reported as series_new_unchecked).
- 'planned_extras' = extra new lessons whose id is placed in this series by RESOLVED-OPS; 'planned_removals' = extras the plan drafts or moves elsewhere (expected to disappear after apply).
- Old rav pages aggregate a series into ONE row; lessons inside series are not listed there — rabbi lesson diffs compare the old flat rows vs the new flat list (post-fix exhaustive list).