# VERIFY-r2 — harness aligned to code-round-2 (band 999, RPI/TLI, CategoryPage roll-up, order-merge fix) — oneone verification report
*Generated 2026-06-12 09:36 by oneone_verify.py — read-only anon-REST simulation of the CURRENT working-tree UI hooks against the live DB.*

REST calls: 3045 (cache hits 73, errors 0)

## r2 — harness alignment changelog (this run vs the previous full run)

The app changed in commits 6386f089 (5 sidebar parity fixes), 4a1c3691 (code-round-2: RPI
creator pages, tree sidebar, TLI content-types, CategoryPage roll-up) and 7420b265 (sidebar
band 1..999). The harness was re-aligned to the CURRENT working-tree semantics:

1. **Sidebar band cutoff 99→999** in the children query (mirrors useContentSidebar).
2. **Creators** now simulate the RPI path — `rabbi_page_items WHERE rabbi_id ORDER BY
   sort_order` with embedded series/lessons; `kind='qa'` rows are dropped exactly like the
   hook; fallback = teacher-tagged lessons by rabbi (order=title). Creator ids resolved via
   the app's fixed `CREATOR_IDS_ORDERED` 31-list, not name heuristics. The בשושה fallback
   page is counted PASS as a sanctioned deviation (CODE-SPEC teachers-CA7: old page was empty).
3. **Content-types** now simulate `teacher_listing_items (scope=content_type, key=:type)`
   — and faithfully render an EMPTY page when TLI has no rows (the page has no code fallback).
4. **CategoryPage roll-up**: pages whose tree node is `category`/`book` are simulated with
   their real renderer — useSeriesForNode (canonical dedup + band sort) for series cards,
   useDirectLessons (eq.node, NO audience filter) + useRollupLessons (descendants RPC,
   chunks of 40, audience OR) for lessons, dedup by id, order `sort_order NULLS LAST,
   bible_chapter NULLS LAST, title`.
5. **Teachers by-book** = the RENDERED TeacherSidebar rows (tree-driven book list from the
   hook; per-book synthetic rows 'כל התכנים ב<book>', 'דפי עבודה — <book>', + hard-coded
   Torah parshiot). The previous lesson-pool heuristic and parsha-slot injection are retired.
6. **🔴 Harness emission bug fixed**: chained `.order()` keys are now merged into ONE
   comma-joined `order` param (postgrest-js emission). The old multi-param form made
   PostgREST drop the secondary/tertiary sort keys → ~22 FALSE order failures.
7. The PGRST100 TopicPage finding is **resolved in code** (TopicPage now passes
   `{ referencedTable: "lessons" }`) — note removed.

### order_only investigation (75 in previous run → 53 now → 0 after ORDER-FIX.sql)

Five pages were dissected (e.g. `/כתובים/איוב/דברי-איוב-האחרונים-פרקים-כו-לא/`, series
`350a8d10`): live order renders כו(1), כז(2), **לא(6)**, then כח/כט/ל at the END with
`sort_order=NULL` — old order is כו..לא. Two DATA root causes, no remaining sim cause:

- **§1 — `move_lesson` dropped its inline `sort_order` on apply** (oneone_apply.py emits
  only `SET series_id=…`; `copy_lesson` DOES apply sort). Verified live: **all 228**
  move-with-sort ops left their lesson in the right series with `sort_order=NULL` →
  renders last. 141 series, explains **47/53** of the current order_only pages.
- **§2 — mixed sort scales** in 6 series (אסתר/משלי/שופטים/בראשית-מאמרים): unit-scale
  inline sorts (1..6) coexist with stage-7 decade repacks (10,20,30…) → unit 5 sorts
  before decade 10 (= old position 2). Explains the remaining **6/53**.

**Fix path: `fixes/ORDER-FIX.sql` — 313 idempotent UPDATEs (228 §1 + 85 §2 full-series
decade repack), every statement guarded by `id + series_id + IS DISTINCT FROM`; 5 old
positions unresolved → flagged for manual review. NOT EXECUTED (read-only session).**

### Pass-rate comparison

| Section | Previous run | r2 (this run) | Δ / reason |
|---|---|---|---|
| Sidebar (top categories) | 1/13 | **4/13** | band 999 fixed תורה+נביאים book children; rest = alias-label code-asks + כתובים עזרא/נחמיה + howToLearn heuristic |
| Listing pages | 727/1273 | **733/1273** | order-merge fix cleared false order fails; 53 true order fails remain → 0 expected after ORDER-FIX.sql |
| Rabbi pages | 113/154 | **113/154** | unchanged (RPI data gaps) |
| Topics sidebar | FAIL | **FAIL** | order by lesson-count desc vs old curated order; 87 count mismatches (1000-row cap) |
| Topic pages | 58/128 | **58/128** | unchanged (data gaps) |
| Teachers content-types | 14/22 | **14/22** | now measured on the real TLI path; 8 fails = genuine TLI row gaps (e.g. 'חוברת עבודה והכוונה… יהושע' missing in 4 keys) |
| Teachers creators | 1/31 | **24/31** | RPI sim replaced the raw lesson-pool heuristic; 7 fails = genuine RPI data gaps (עמנואל בן ארצי −10, נתן מארגל −4, תלמוד תורה מורשה −2, ושננתם −1, בניה כהן −1, הילביץ׳ +1, עמירם אלבה +1) |
| Teachers by-book | 8/35 | **0/35** | sim now compares RENDERED sidebar rows: every book differs from old by the alias LABEL ('כל התכנים ב<book>' vs old 'כל התכנים בחומש/בספר <book>'; מלכים א 'דפי עבודה ומבחנים'), and 24 books with 0 old children now show 2 synthetic rows — component label fix, not data |
| Guards: teacher-only leaks | 71 | **80** | real: useLessonsBySeries + useDirectLessons have NO audience filter (80 teacher-only lessons across 52 public pages); CategoryPage roll-up adds direct-lesson exposure |

## Summary

| Section | Pass | Total | Pass rate |
|---|---|---|---|
| Sidebar (top categories) | 4 | 13 | 30.8% |
| Listing pages | 733 | 1273 | 57.6% |
| Rabbi pages | 113 | 154 | 73.4% |
| Topics sidebar | FAIL | 1 | — |
| Topic pages | 58 | 128 | 45.3% |
| Teachers content-types | 14 | 22 | 63.6% |
| Teachers creators | 24 | 31 | 77.4% |
| Teachers by-book | 0 | 35 | 0.0% |
| Guards | FAIL | — | — |

## 1. Sidebar

### ✅ ניווט באתר לפי ספר ופרק (static_link)
- quick-link rendered: True

### ✅ פרשת השבוע (static_link)
- quick-link rendered: True

### ❌ איך לומדים תנ"ך (section)
- old=7 (incl. alias) order_ok=False missing=[] extra=['כל האומר דוד חטא אינו אלא טועה', 'בעלי מקרא', 'איך לומדים תנך', 'איך מלמדים תנך', 'גדולי התנך וחטאיהם', 'דרך לימוד תורה שונה ממדעי הטבע', 'הדרכות בדרך הלימוד', 'העובדות בתנך ערכיות ולא היסטוריות', 'הקדמה ללימוד נביאים חסד למשיחו', 'זהירות בלימוד תנך', 'ללמוד וללמד תנך', 'מדברי האחרונים', 'מדברי הראשונים', 'מדברי חזל', 'מדברי חכמי החסידות', 'מן המקרא אל התלמוד', 'פשט התנך מול הדרש הרמז והסוד', 'שימוש בפירוש הנציב להוראת החומש', 'תורה שבכתב ושבעפ', 'דרך לימוד התנך']

### ✅ תורה (category)
- books order ok: True; missing books: []; extra: []
- book-children failing: 0/6

### ✅ נביאים (category)
- books order ok: True; missing books: []; extra: []
- book-children failing: 0/21

### ❌ כתובים (category)
- books order ok: False; missing books: []; extra: ['עזרא', 'נחמיה']
- book-children failing: 7/13
  - **איוב** old=21 new=22 order_ok=True
    - extra: ['כל השיעורים בספר איוב']
  - **שיר השירים** old=8 new=9 order_ok=True
    - extra: ['כל השיעורים בספר שיר השירים']
  - **איכה** old=6 new=6 order_ok=True
    - missing: ['כל השיעורים במגילת איכה']
    - extra: ['כל השיעורים בספר איכה']
  - **קהלת** old=13 new=13 order_ok=True
    - missing: ['כל השיעורים במגילת קהלת']
    - extra: ['כל השיעורים בספר קהלת']
  - **אסתר** old=11 new=12 order_ok=True
    - extra: ['כל השיעורים בספר אסתר']
  - **דניאל** old=13 new=13 order_ok=True
    - missing: ['כל התכנים בספר דניאל']
    - extra: ['כל השיעורים בספר דניאל']
  - **עזרא ונחמיה** old=24 new=24 order_ok=True
    - missing: ['כל עזרא ונחמיה']
    - extra: ['כל השיעורים בספר עזרא ונחמיה']

### ❌ נושאים כלליים בתנ"ך (section)
- old=16 (incl. alias) order_ok=True missing=['כל השיעורים בנושאים הכלליים'] extra=['כל השיעורים בנושאים כלליים בתנך']
- ⚠️ old grandchildren not renderable by one-level sidebar: 1

### ❌ מועדים (section)
- old=16 (incl. alias) order_ok=True missing=['כל השיעורים על המועדים'] extra=['כל השיעורים בהמועדים']
- ⚠️ old grandchildren not renderable by one-level sidebar: 4

### ❌ הפטרות (section)
- old=7 (incl. alias) order_ok=True missing=[] extra=['כל השיעורים בהפטרות']
- ⚠️ old grandchildren not renderable by one-level sidebar: 83

### ❌ ימי עיון בתנ"ך (section)
- old=8 (incl. alias) order_ok=True missing=['כל השיעורים מימי עיון בתנך'] extra=['כל השיעורים בימי עיון בתנך']

### ❌ כלי עזר - טבלאות זמני המאורעות ומפות (section)
- old=1 (incl. alias) order_ok=True missing=[] extra=['כל השיעורים בכלי עזר טבלאות זמני המאורעות ומפות']

### ❌ פרוייקט התנ"ך המוקלט - מתעדכן (static_link)
- quick-link rendered: False

### ❌ ליווי ת"תים (section)
- old=2 (incl. alias) order_ok=True missing=[] extra=['כל השיעורים בליווי תתים']

## 2. Listing pages

Simulated 1273 pages (skipped 47 unmapped).

| Section | Pages | Pass | Old items | New items | Missing | Unexplained extra | Planned extras | Planned removals | Order fails | Rabbi mism. |
|---|---|---|---|---|---|---|---|---|---|---|
| נביאים | 546 | 264 (48.4%) | 7503 | 21411 | 710 | 14571 | 29 | 18 | 21 | 284 |
| כתובים | 365 | 275 (75.3%) | 2209 | 6721 | 52 | 4049 | 79 | 436 | 73 | 33 |
| תורה | 185 | 92 (49.7%) | 5066 | 14495 | 300 | 8904 | 665 | 160 | 7 | 383 |
| הפטרות | 87 | 66 (75.9%) | 582 | 1233 | 15 | 609 | 47 | 10 | 0 | 1 |
| נושאים-כלליים-בתנך | 37 | 19 (51.4%) | 628 | 1052 | 27 | 384 | 33 | 34 | 0 | 20 |
| מועדים | 23 | 8 (34.8%) | 513 | 884 | 16 | 339 | 42 | 6 | 0 | 17 |
| איך-לומדים-תנך | 13 | 6 (46.2%) | 326 | 215 | 162 | 21 | 30 | 0 | 0 | 0 |
| ימי-עיון-בתנך | 8 | 1 (12.5%) | 673 | 946 | 3 | 140 | 136 | 0 | 0 | 9 |
| כלי-עזר-טבלאות-זמני-המאורעות-ומפות | 6 | 1 (16.7%) | 46 | 45 | 5 | 4 | 0 | 0 | 0 | 0 |
| ליווי-תתים | 3 | 1 (33.3%) | 2 | 6 | 0 | 4 | 0 | 0 | 0 | 0 |

Note: 48 of the pages are category/book aggregation nodes — since r2 the harness simulates them with their REAL renderer (CategoryPage: useSeriesForNode canonical series + direct + descendant roll-up lessons, dedup by id); all other pages use /series/:id semantics (useSeriesChildren + useLessonsBySeries).

### Top-20 worst pages

- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/` *(kind=category)*
  - old=263 new=7291 matched=150 in_order=22 missing=113 extra=7141 (planned keep 0, planned remove 10, unexplained 7131) order_ok=False rabbi_mm=0
  - missing sample: ['מצגת מבט על ספר שמואל כיצד פעל דוד להחליף את מלכות שאול', 'ספר מלכים א עם ביאור ושננתם', 'מלך יריחו והמרגלים שבאו לרחב', 'ההבדל בין יהושע לשופטים', 'כריתת ברית עם יושב הארץ', 'רשי הראשון על התורה והנך', 'מדוע לא השלים יהושע את כיבוש הארץ', 'המלכים שהיכה יהושע ומלך חברון']
  - extra sample: ['ביאור ושננתם לספר שמואל א פרק ט', 'הבאת שמואל לעלי', 'מבט רחב על חזון המקדש ביחזקאל שיעור ראשון', 'מבט רחב על חזון המקדש ביחזקאל שיעור ראשון', 'מגלת יהויכין עד חורבן הבית', 'מגלת יהויכין עד חורבן הבית', 'מפת שלושים ואחד המלכים', 'נבואה אישית לצדקיהו']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/` *(kind=category)*
  - old=159 new=4722 matched=115 in_order=6 missing=44 extra=4607 (planned keep 0, planned remove 83, unexplained 4524) order_ok=False rabbi_mm=0
  - missing sample: ['ספר בראשית עם ביאור ושננתם', 'ספר שמות עם ביאור ושננתם', 'ספר ויקרא עם ביאור ושננתם', 'ספר במדבר עם ביאור ושננתם', 'עונש המוות בעקבות אכילת עץ הדעת', 'קללת כנען', 'תאריך לבריאת העולם של הציווי לך לך', 'מדוע יש תולדות יצחק ותולדות יעקב אך לא תולדות אברהם']
  - extra sample: ['שמות מוקלט פרק א ללא טעמים', 'ארבע רוחות השמיים', 'דף פרשת שבוע האזינו תשפד', 'דף פרשת שבוע תצוה תשפג', 'חידות לילדים פרשת בראשית', 'יחסי האדם והאדמה בפרשיות בראשית לך לך', 'מה תפקידו של המדבר בחיים שלנו', 'מצוות מינוי שופטים']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/כתובים/` *(kind=category)*
  - old=94 new=2333 matched=87 in_order=82 missing=7 extra=2246 (planned keep 65, planned remove 218, unexplained 1963) order_ok=False rabbi_mm=2
  - missing sample: ['ספר דניאל עם ביאור ותרגום ושננתם', 'שאלות על מגילת רות', 'היחס בין מגילת אסתר לספר עזרא', 'מדוע מרדכי הציל את אחשורוש', 'מדוע מרדכי מצוה על אסתר להכנס אל אחשורוש מיד', 'מניין שנות מלכי פרס', 'בענין מועד גילוי מקום המקדש']
  - extra sample: ['ושננתם קיום מצוות מחיית עמלק במגילת אסתר', 'צדיק הוא ד כי פיהו מריתי', 'הילד דניאל בארמון נבוכדנצר', 'משלי פרק ג', 'נחמיה בבקיאות פרקים ז ח', 'איוב פרק ח', 'איוב פרק ט', 'לאדם מערכי לב']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/שמואל-א/` *(kind=book)*
  - old=63 new=1065 matched=38 in_order=13 missing=25 extra=1027 (planned keep 0, planned remove 1, unexplained 1026) order_ok=False rabbi_mm=0
  - missing sample: ['מצגת מבט על ספר שמואל כיצד פעל דוד להחליף את מלכות שאול', 'שמואל בקוראי שמו מבוא לספר שמואל', 'למה חמל שאול על אגג', 'הריגת כוהני נוב', 'שהות דוד בארץ פלשתים', 'בן שנה שאול במלכו האמנם', 'האם שאול היה אמור לזכות למלכות נצחית', 'עשהאל ואבנר']
  - extra sample: ['ביאור ושננתם לספר שמואל א פרק א', 'שמואל א מוקלט פרק א ללא טעמים', 'שמואל א פרק א', 'ביאור ושננתם לספר שמואל א פרק ו', 'ביאור ושננתם לספר שמואל א פרק ט', 'ביאור ושננתם לספר שמואל א פרק יא', 'ביאור ושננתם לספר שמואל א פרק יב', 'ביאור ושננתם לספר שמואל א פרק טו']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/בראשית/` *(kind=book)*
  - old=59 new=1037 matched=37 in_order=4 missing=22 extra=1000 (planned keep 1, planned remove 29, unexplained 970) order_ok=False rabbi_mm=0
  - missing sample: ['ראובן פוחז או בכור', 'ספר בראשית עם ביאור ושננתם', 'עונש המוות בעקבות אכילת עץ הדעת', 'קללת כנען', 'תאריך לבריאת העולם של הציווי לך לך', 'מדוע יש תולדות יצחק ותולדות יעקב אך לא תולדות אברהם', 'גניבת נשי האבות ונסיונות חטיפה נוספים', 'פירוש האבן עזרא על מצחק']
  - extra sample: ['בראשית', 'ראשית', 'לא טוב היות האדם לבדו', 'ראה ריח בני כריח שדה אשר ברכו ה', 'האיש הזקן ביותר בעולם', 'הברית עפי הראבע והרמבן', 'הופעת הקבה בעולם על פי שמותיו אלוקים יקוק דין ורחמים', 'המבול והתורה']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/שמות/` *(kind=book)*
  - old=38 new=1003 matched=26 in_order=2 missing=12 extra=977 (planned keep 2, planned remove 27, unexplained 948) order_ok=False rabbi_mm=0
  - missing sample: ['ספר שמות עם ביאור ושננתם', 'מתי נזכרות הנהגות ומידות טובות של הנביאים בכתוב', 'שאלות בפרשת שמות', 'מכת בכורות', 'הציווי על מצות לפני יציאת מצרים', 'מועד אמירת התורה ומצוותיה למשה', 'הזכרת מעמד הר סיני בתנך', 'פוקד עוון אבות על בנים']
  - extra sample: ['ערכים ומידות העולים מפסוקי חומש שמות', 'שמות מוקלט פרק א ללא טעמים', 'פרק ב של הבריאה', 'ביאור שם הויה', 'בלבת אש מתוך הסנה', 'גלות מצרים', 'הבאים מצרימה', 'הגאולה בחומש שמות']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/ירמיהו/` *(kind=book)*
  - old=15 new=932 matched=10 in_order=7 missing=5 extra=922 (planned keep 0, planned remove 0, unexplained 922) order_ok=False rabbi_mm=1
  - missing sample: ['מגלות יהויכין עד חורבן הבית', 'ירמיהו נביא לכל העמים', 'שארית הפליטה לאחר חורבן בית ראשון', 'לימוד חטאי בית ראשון בדורינו', 'נבואות ירמיהו על הגויים']
  - extra sample: ['מגלת יהויכין עד חורבן הבית', 'ירמיהו בבקיאות פרקים א ב', 'אזהרה מפני בוא האויב', 'בני יונדב בן רכב', 'ברוך בן נריה', 'ד ממנה את ירמיהו לנביא', 'הגאולה העתידה', 'הוויכוח בין ירמיהו לבין יושבי מצרים']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/במדבר/` *(kind=book)*
  - old=35 new=912 matched=33 in_order=11 missing=2 extra=879 (planned keep 1, planned remove 15, unexplained 863) order_ok=False rabbi_mm=0
  - missing sample: ['ספר במדבר עם ביאור ושננתם', 'מדוע התלוננו בני ישראל בפרשת בהעלתך שאין להם בשר והרי היה להם שלו']
  - extra sample: ['ערכים ומידות העולים מפסוקי חומש במדבר', 'במדבר מוקלט פרק א ללא טעמים', 'ארבע רוחות השמיים', 'הדרך ממצרים לירושלים', 'החומש של דור המדבר', 'הכנה לקבלת התורה', 'המסלול בדרך לארץ ישראל', 'המסלול המפתיע של המרגלים']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/שופטים/` *(kind=book)*
  - old=41 new=869 matched=27 in_order=11 missing=14 extra=842 (planned keep 0, planned remove 0, unexplained 842) order_ok=False rabbi_mm=1
  - missing sample: ['השופטים בדורותם מבוא לספר שופטים', 'האם בתקופת השופטים חלה התקדמות', 'השופטים הקטנים', 'יאיר בן מנשה מחומש במדבר ויאיר הגלעדי מספר שופטים', 'בני רחל בספר שופטים', 'חזרת מעשה עתניאל ועכסה ביהושע ובשופטים', 'איך הגיעו ישראל לשפל של פילגש בגבעה', 'מעגל הקסמים בספר שופטים']
  - extra sample: ['ביאור ושננתם לספר שופטים פרק א', 'ספר שופטים מוקלט פרק א', 'שופטים מוקלט פרק א ללא טעמים', 'ביאור ושננתם לספר שופטים פרק ב', 'ביאור ושננתם לספר שופטים פרק ט', 'ביאור ושננתם לספר שופטים פרק יז', 'מי יעלה לנו אל הכנעני בתחלה להלחם בו', 'אופי התקופה']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/ישעיהו/` *(kind=book)*
  - old=16 new=853 matched=10 in_order=7 missing=6 extra=843 (planned keep 0, planned remove 0, unexplained 843) order_ok=False rabbi_mm=0
  - missing sample: ['עבודה זרה וגאוה', 'ישעיהו כולו נחמה', 'בן נכר וסריסים', 'ציון וירושלים', 'על איזו תקופה מדברות נבואות הנביאים האחרונים', 'הנבואה הקדומה על החרבת האומות בידי סנחריב']
  - extra sample: ['ישעיה א חמאה ודבש', 'ירמיהו בבקיאות פרקים ג ד', 'ירמיהו בבקיאות פרקים ג ד', 'ישעיהו בבקיאות פרקים יט כ', 'ישעיהו בבקיאות פרקים כא כב', 'ישעיהו בבקיאות פרקים כא כב', 'ישעיהו בבקיאות פרקים כג כד', 'ישעיהו בבקיאות פרקים כג כד']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/יהושע/` *(kind=book)*
  - old=38 new=806 matched=23 in_order=10 missing=15 extra=783 (planned keep 0, planned remove 1, unexplained 782) order_ok=False rabbi_mm=0
  - missing sample: ['הסבר פשוט על מבנה ארץ ישראל', 'נחלת ארץ ישראל', 'מלך יריחו והמרגלים שבאו לרחב', 'ההבדל בין יהושע לשופטים', 'כריתת ברית עם יושב הארץ', 'רשי הראשון על התורה והנך', 'מדוע לא השלים יהושע את כיבוש הארץ', 'המלכים שהיכה יהושע ומלך חברון']
  - extra sample: ['הסבר פשוט על מבנה ארץ ישראל והנחלות', 'ביאור ושננתם על ספר יהושע פרק א', 'יהושע מוקלט פרק א ללא טעמים', 'ספר יהושע מוקלט פרק ב', 'פרשת הגבעונים', 'ספר יהושע מוקלט פרק יג', 'ספר יהושע מוקלט פרק טז', 'מצגת כיצד נחלקה הארץ בין השבטים']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/יחזקאל/` *(kind=book)*
  - old=18 new=795 matched=13 in_order=4 missing=5 extra=782 (planned keep 0, planned remove 3, unexplained 779) order_ok=False rabbi_mm=1
  - missing sample: ['מגלות יהויכין עד חורבן הבית', 'בבל מול ירושלים בקעה מול הרים שיעור ראשון', 'בבל מול ירושלים בקעה מול הרים שיעור שני', 'פתחון פיו של יחזקאל', 'פתיחת פיו של יחזקאל']
  - extra sample: ['מגלת יהויכין עד חורבן הבית', 'יחזקאל מוקלט פרק א', 'יחזקאל פרק א', 'יחזקאל פרקים יז יח', 'שרטוט בית המקדש ביחזקאל לפי שיטות המלבים רשי ומצודות', 'שרטוט בית המקדש ביחזקאל לפי שיטות המלבים רשי ומצודות', 'שרטוט בית המקדש ביחזקאל לפי שיטות המלבים רשי ומצודות', 'ותשאני רוח ואשמע אחרי קול רעש גדול']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/דברים/` *(kind=book)*
  - old=16 new=744 matched=14 in_order=9 missing=2 extra=730 (planned keep 3, planned remove 5, unexplained 722) order_ok=False rabbi_mm=0
  - missing sample: ['דיברה תורה כנגד יצר הרע', 'אם משה היה נכנס לארץ האם התורה היתה ממשיכה להיכתב גם בארץ ישראל']
  - extra sample: ['כי תבואו אל הארץ', 'ערכים ומידות העולים מפסוקי חומש דברים', 'מוסר המלחמה בספר דברים', 'שאלות חזרה דברים', 'דברים מוקלט פרק א ללא טעמים', 'איכה', 'אני כהן', 'ארבע רשויות ההנהגה בעם ישראל']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/ויקרא/` *(kind=book)*
  - old=22 new=710 matched=21 in_order=6 missing=1 extra=689 (planned keep 1, planned remove 1, unexplained 687) order_ok=False rabbi_mm=0
  - missing sample: ['ספר ויקרא עם ביאור ושננתם']
  - extra sample: ['ערכים ומידות העולים מפסוקי חומש ויקרא', 'גוף ונשמה בחומש ויקרא הרב עמירם אלבה', 'שאלות חזרה ויקרא', 'ויקרא מוקלט פרק א ללא טעמים', 'ויקרא', 'אחריות אישית', 'אשרי תבחר ותקרב', 'בין הכרח לתענוג האיסור להקריב שאור ודבש']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/הפטרות/` *(kind=category)*
  - old=31 new=680 matched=31 in_order=31 missing=0 extra=649 (planned keep 31, planned remove 10, unexplained 608) order_ok=True rabbi_mm=0
  - extra sample: ['רבות מחשבות בלב איש ועצת ד היא תקום', 'ויתור על ברכת הארץ', 'התפקיד של בלעם', 'הגנת משה ואליהו', 'איחוד שלושת המקדשים', 'הגלות המצמיחה', 'הכוח של דברי ה', 'הפטרת פרשת ראה כל כלי יוצר עליך לא יצלח']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/כתובים/תהלים/` *(kind=book)*
  - old=12 new=554 matched=12 in_order=10 missing=0 extra=542 (planned keep 4, planned remove 55, unexplained 483) order_ok=False rabbi_mm=3
  - extra sample: ['מעבר לקריאה וביאור בקצרה של ספר תהילים', 'מזמור עה', 'מזמור פח', 'מזמור צז', 'מזמור קח', 'מזמור קכג', 'מזמור קכו', 'מזמור קמו']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/מלכים-ב/` *(kind=book)*
  - old=29 new=456 matched=18 in_order=6 missing=11 extra=438 (planned keep 0, planned remove 0, unexplained 438) order_ok=False rabbi_mm=1
  - missing sample: ['המלכויות בישראל מלכות עשרת השבטים', 'חטאו ועונשו של גיחזי', 'הניסים הפרטיים שעשה אלישע', 'מקבץ שאלות על מלכים ב', 'יונה חסד או אמת', 'אורך התקופה של ספר מלכים', 'הכותים האריות שד שלח בהם וכיצד הוסרו האריות', 'כלי המקדש בתקופת אחשוורוש']
  - extra sample: ['מגלת יהויכין עד חורבן הבית', 'ערכים ומידות העולים מפסוקי ספר מלכים ב', 'מלכות אחזיהו ומותו', 'מלכים ב מוקלט פרק א ללא טעמים', 'כיצד יתכן שיהושפט המלך הצדיק התחבר עם מלכי ישראל הרשעים', 'מהפכת יהוא', 'מעשה עתליה ומעשה יהושבע', 'דמותו של יהואש']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/מלכים-א/` *(kind=book)*
  - old=35 new=448 matched=17 in_order=10 missing=18 extra=431 (planned keep 1, planned remove 3, unexplained 427) order_ok=False rabbi_mm=0
  - missing sample: ['ספר מלכים א עם ביאור ושננתם', 'המלכויות בישראל מבוא לספר מלכים', 'המלכויות בישראל מלכות עשרת השבטים', 'בין משכן למקדש', 'דוד ואבישג', 'מהות העגלים שהקים ירבעם', 'מדוע רץ אליהו לפני אחאב', 'האם חטא איש האלוקים מיהודה']
  - extra sample: ['מפת שלושים ואחד המלכים', 'ערכים ומידות העולים מפסוקי ספר מלכים א', 'רבות מחשבות בלב איש ועצת ד היא תקום', 'מלכים א מוקלט פרק א ללא טעמים', 'שיעור 1 במלכים מלכים א פרק א', 'המלכת שלמה והריגת אדוניהו', 'חלום שלמה בגבעון משפט שלמה', 'מלכות שלמה']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים-כלליים-בתנך/` *(kind=category)*
  - old=101 new=530 matched=96 in_order=96 missing=5 extra=434 (planned keep 23, planned remove 34, unexplained 377) order_ok=True rabbi_mm=6
  - missing sample: ['הסבר פשוט על מבנה ארץ ישראל', 'מדינת הלכה על פי התנך', 'שאלת איסור הבמות', 'חסרון האורים ותומים בבית שני', 'מקורות על אזור אשדוד אשקלון וקרית גת']
  - extra sample: ['הסבר פשוט על מבנה ארץ ישראל והנחלות', 'פרק א יחודו של חבל הלבנון', 'המקום אשר יבחר', 'אבל בית מעכה', 'אבל בית מעכה', 'אברהם וארבעת המלכים', 'איש אשר רוח בו מבוא לספר יהושע', 'אנשי לצון']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/שמואל-ב/` *(kind=book)*
  - old=44 new=363 matched=23 in_order=10 missing=21 extra=340 (planned keep 0, planned remove 0, unexplained 340) order_ok=False rabbi_mm=2
  - missing sample: ['יואב בן צרויה', 'מי היו הכרתי והפלתי', 'דוד ואנשי יבש גלעד', 'יהונתן בן שמעה אחי דוד', 'מלכות איש בשת', 'השבט שאליו השתייכה בת שבע', 'תגובות שונות של דוד המלך למות בניו', 'המשך בירור בעניין מרד אבשלום']
  - extra sample: ['מעבר לקריאה וביאור בקצרה של ספר שמואל ב', 'מעבר לשיעורים קצרים על ספר שמואל ב', 'ערכים ומידות העולים מפסוקי ספר שמואל ב', 'דוד מתבשר על מות שאול', 'קינת דוד', 'המלכת דוד בחברון', 'דוד הולך וחזק', 'יסוד מלכות דוד על כל ישראל']

## 3. Rabbi pages

rabbi_page_items table: available; used for 131 rabbis (rest = fallback owned-series + lessons).

113/154 PASS. Worst 15 by missing lessons:

- **הרב עמנואל בן ארצי**: series old=26 new=21 missing=6 | lessons old=22 new=26 missing=4 extra=8 order_ok=False
- **ושננתם**: series old=6 new=6 missing=0 | lessons old=34 new=29 missing=7 extra=2 order_ok=True
- **הרב חגי ולוסקי**: series old=5 new=1 missing=4 | lessons old=5 new=3 missing=2 extra=0 order_ok=True
- **הרב יואב אוריאל**: series old=50 new=50 missing=0 | lessons old=94 new=114 missing=6 extra=26 order_ok=True
- **הרב יהונתן מיכאלי**: series old=5 new=1 missing=4 | lessons old=0 new=0 missing=0 extra=0 order_ok=True
- **הרב יוסף שילר**: series old=5 new=1 missing=4 | lessons old=11 new=25 missing=0 extra=14 order_ok=True
- **הרב שלמה אבינר**: series old=11 new=8 missing=4 | lessons old=0 new=0 missing=0 extra=0 order_ok=True
- **הרב איתן שנדורפי**: series old=30 new=30 missing=0 | lessons old=73 new=94 missing=2 extra=23 order_ok=True
- **הרב אריה אוריאל**: series old=0 new=0 missing=0 | lessons old=2 new=10 missing=2 extra=10 order_ok=True
- **הרב יהונתן עידן**: series old=3 new=1 missing=2 | lessons old=0 new=0 missing=0 extra=0 order_ok=True
- **הרב מנחם שחור**: series old=7 new=7 missing=0 | lessons old=64 new=81 missing=2 extra=19 order_ok=True
- **מערכת בני ציון**: series old=6 new=6 missing=0 | lessons old=2 new=0 missing=2 extra=0 order_ok=True
- **הרב אס"ף בנדל**: series old=0 new=0 missing=0 | lessons old=15 new=20 missing=1 extra=6 order_ok=True
- **הרב אריה אברמסון**: series old=0 new=0 missing=0 | lessons old=5 new=5 missing=1 extra=1 order_ok=True
- **הרב יוסי ברינר**: series old=0 new=0 missing=0 | lessons old=31 new=46 missing=1 extra=16 order_ok=True

## 4. Topics

- Sidebar: FAIL — old=127 new=127 missing=0 extra=0 order_ok=False count-mismatches=87
- ⚠️ HARNESS FINDING: the sidebar count query returns exactly 1000 rows (PostgREST cap) — the app sends NO limit, so the badge counts in production are computed from a truncated row set.
- series_topics table: present (nonempty=True) — series-card checks enabled
- Topic pages: 58/128 PASS

- **ארץ ישראל**: old=34 new=37 missing=3 extra=6 order_ok=True old_series_cards=0
- **ארון הברית**: old=16 new=16 missing=1 extra=1 order_ok=True old_series_cards=0
- **דוד המלך**: old=54 new=57 missing=1 extra=4 order_ok=True old_series_cards=4
- **__meta__**: old=None new=None missing=None extra=None order_ok=None old_series_cards=None
- **אליהו הנביא**: old=8 new=9 missing=0 extra=1 order_ok=True old_series_cards=0
- **ביטחון ב-ד'**: old=2 new=3 missing=0 extra=1 order_ok=True old_series_cards=0
- **בית המקדש**: old=37 new=38 missing=0 extra=1 order_ok=True old_series_cards=1
- **בית המקדש השלישי**: old=7 new=12 missing=0 extra=5 order_ok=True old_series_cards=0
- **בית שני**: old=34 new=36 missing=0 extra=2 order_ok=True old_series_cards=1
- **ברית מילה**: old=7 new=8 missing=0 extra=1 order_ok=True old_series_cards=0
- **גאולה**: old=53 new=65 missing=0 extra=12 order_ok=False old_series_cards=0
- **גוג ומגוג**: old=10 new=12 missing=0 extra=2 order_ok=False old_series_cards=0
- **גלות**: old=19 new=24 missing=0 extra=5 order_ok=True old_series_cards=0
- **גן עדן**: old=1 new=2 missing=0 extra=1 order_ok=True old_series_cards=0
- **האבות**: old=4 new=5 missing=0 extra=1 order_ok=True old_series_cards=0

## 5. Teachers wing

- teacher_listing_items table: available
- Content types: 14/22 PASS
  - ❌ ביאור הפסוקים (teacher_listing_items): old=119 new=116 matched=116 missing=3 extra=0
  - ❌ ביאורי מילים (teacher_listing_items): old=39 new=38 matched=38 missing=1 extra=0
  - ❌ דגשים והכוונה על סדר הפרקים (teacher_listing_items): old=84 new=82 matched=82 missing=2 extra=0
  - ❌ דפי עבודה (teacher_listing_items): old=70 new=69 matched=69 missing=1 extra=0
  - ✅ הכוונה והדרכה למורה (teacher_listing_items): old=142 new=142 matched=142 missing=0 extra=0
  - ❌ חוברת עבודה (tli_empty→page_renders_empty): old=1 new=0 matched=0 missing=1 extra=0
  - ✅ חידון (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ❌ חידות חזרה (teacher_listing_items): old=118 new=115 matched=115 missing=3 extra=0
  - ✅ מבחן כללי ספר שופטים (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ מבחנים (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ מי אמר למי (teacher_listing_items): old=2 new=2 matched=2 missing=0 extra=0
  - ✅ מפות (teacher_listing_items): old=12 new=12 matched=12 missing=0 extra=0
  - ✅ מקורות עזר לפרקים (teacher_listing_items): old=9 new=9 matched=9 missing=0 extra=0
  - ❌ סיכום הפרקים והנושאים בקצרה (teacher_listing_items): old=159 new=158 matched=158 missing=1 extra=0
  - ❌ ספר יהושע (tli_empty→page_renders_empty): old=1 new=0 matched=0 missing=1 extra=0
  - ✅ ספר מלכים (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ ספר שופטים (teacher_listing_items): old=2 new=2 matched=2 missing=0 extra=0
  - ✅ ערכים ומידות העולים מן הפסוקים (teacher_listing_items): old=11 new=11 matched=11 missing=0 extra=0
  - ✅ שאלות ותשובות (teacher_listing_items): old=33 new=33 matched=33 missing=0 extra=0
  - ✅ שאלות ותשובות על סדר הפרקים (teacher_listing_items): old=99 new=99 matched=99 missing=0 extra=0
  - ✅ שאלות חזרה (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ שאלות עיון (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
- Creators: 24/31 PASS
  - ✅ אוריה כראדי (rabbi_page_items): old=1 new=1 matched=1 missing=0 extra=0 order_ok=True
  - ✅ הרב אורי שטמלר (rabbi_page_items): old=3 new=3 matched=3 missing=0 extra=0 order_ok=True
  - ✅ הרב אשי בלייכר (rabbi_page_items): old=2 new=2 matched=2 missing=0 extra=0 order_ok=True
  - ❌ הרב בניה כהן (rabbi_page_items): old=4 new=3 matched=3 missing=1 extra=0 order_ok=True
  - ✅ הרב גדי שר שלום (rabbi_page_items): old=1 new=1 matched=1 missing=0 extra=0 order_ok=True
  - ✅ הרב דביר אפלבוים (rabbi_page_items): old=3 new=3 matched=3 missing=0 extra=0 order_ok=True
  - ✅ הרב חסדאי בר אור (rabbi_page_items): old=2 new=2 matched=2 missing=0 extra=0 order_ok=True
  - ✅ הרב ידידיה שילה (rabbi_page_items): old=1 new=1 matched=1 missing=0 extra=0 order_ok=True
  - ✅ הרב יהודה בשושה (fallback_lessons_by_rabbi): old=0 new=7 matched=0 missing=0 extra=7 order_ok=True
  - ✅ הרב יונתן לוי (rabbi_page_items): old=12 new=12 matched=12 missing=0 extra=0 order_ok=True
  - ✅ הרב יורם אליהו (rabbi_page_items): old=1 new=1 matched=1 missing=0 extra=0 order_ok=True
  - ✅ הרב יצחק עמראני (rabbi_page_items): old=21 new=21 matched=21 missing=0 extra=0 order_ok=True
  - ✅ הרב מאיר גרשונזון (rabbi_page_items): old=1 new=1 matched=1 missing=0 extra=0 order_ok=True
  - ❌ הרב מאיר הילביץ' (rabbi_page_items): old=5 new=6 matched=5 missing=0 extra=1 order_ok=True
  - ✅ הרב מנחם אליהו (rabbi_page_items): old=2 new=2 matched=2 missing=0 extra=0 order_ok=True
  - ✅ הרב נחום אריאל (rabbi_page_items): old=1 new=1 matched=1 missing=0 extra=0 order_ok=True
  - ✅ הרב ניסים כהן (rabbi_page_items): old=9 new=9 matched=9 missing=0 extra=0 order_ok=True
  - ✅ הרב עדי איצקוביץ' (rabbi_page_items): old=13 new=13 matched=13 missing=0 extra=0 order_ok=True
  - ✅ הרב עמוס נתנאל (rabbi_page_items): old=2 new=2 matched=2 missing=0 extra=0 order_ok=True
  - ❌ הרב עמירם אלבה (rabbi_page_items): old=19 new=20 matched=19 missing=0 extra=1 order_ok=True
  - ❌ הרב עמנואל בן ארצי (rabbi_page_items): old=48 new=42 matched=38 missing=10 extra=4 order_ok=False
  - ✅ הרב שלמה כץ (rabbi_page_items): old=21 new=21 matched=21 missing=0 extra=0 order_ok=True
  - ✅ הרב שמעון לוי והרב נתן מולאיוף (rabbi_page_items): old=11 new=11 matched=11 missing=0 extra=0 order_ok=True
  - ✅ הרב שמעון שוהם (rabbi_page_items): old=22 new=22 matched=22 missing=0 extra=0 order_ok=True
  - ❌ ושננתם - אוצר התורה (rabbi_page_items): old=50 new=49 matched=49 missing=1 extra=0 order_ok=True
  - ✅ ישקו העדרים (rabbi_page_items): old=5 new=5 matched=5 missing=0 extra=0 order_ok=True
  - ✅ מחבר לא ידוע (rabbi_page_items): old=4 new=4 matched=4 missing=0 extra=0 order_ok=True
  - ✅ מכון דעת סופרים (rabbi_page_items): old=6 new=6 matched=6 missing=0 extra=0 order_ok=True
  - ❌ נתן מארגל (rabbi_page_items): old=5 new=1 matched=1 missing=4 extra=0 order_ok=True
  - ✅ סידור שים שלום (rabbi_page_items): old=1 new=1 matched=1 missing=0 extra=0 order_ok=True
  - ❌ תלמוד תורה מורשה (rabbi_page_items): old=6 new=4 matched=4 missing=2 extra=0 order_ok=True
- By-book sim = the RENDERED TeacherSidebar rows (per-book: 'כל התכנים ב<book>', 'דפי עבודה — <book>', + hard-coded parshiot for Torah). KNOWN code-ask: the old sidebar labeled the alias 'כל התכנים בחומש/בספר <book>' (with per-book variants like 'דפי עבודה ומבחנים מלכים א'), and books with 0 old children now show the 2 synthetic rows — label parity needs a component fix, not data.
- By-book tree: 0/35 PASS
  - ❌ בראשית: old=14 new=14 matched=13 missing=1 extra=1 order_ok=True
  - ❌ שמות: old=13 new=13 matched=12 missing=1 extra=1 order_ok=True
  - ❌ ויקרא: old=12 new=12 matched=11 missing=1 extra=1 order_ok=True
  - ❌ במדבר: old=12 new=12 matched=11 missing=1 extra=1 order_ok=True
  - ❌ דברים: old=6 new=6 matched=5 missing=1 extra=1 order_ok=True
  - ❌ יהושע: old=2 new=2 matched=1 missing=1 extra=1 order_ok=True
  - ❌ שופטים: old=2 new=2 matched=1 missing=1 extra=1 order_ok=True
  - ❌ שמואל א: old=2 new=2 matched=1 missing=1 extra=1 order_ok=True
  - ❌ שמואל ב: old=2 new=2 matched=1 missing=1 extra=1 order_ok=True
  - ❌ מלכים א: old=2 new=2 matched=0 missing=2 extra=2 order_ok=True
  - ❌ מלכים ב: old=2 new=2 matched=1 missing=1 extra=1 order_ok=True
  - ❌ ישעיהו: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ ירמיהו: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ יחזקאל: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ הושע: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ יואל: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ עמוס: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ עובדיה: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ יונה: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ מיכה: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ נחום: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ חבקוק: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ צפניה: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ חגי: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ זכריה: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ מלאכי: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ תהלים: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ איוב: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ שיר השירים: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ רות: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ איכה: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ אסתר: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ דניאל: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ עזרא: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True
  - ❌ נחמיה: old=0 new=2 matched=0 missing=0 extra=2 order_ok=True

## 6. Guards

- Teacher-only items in PUBLIC simulations: listings lessons=80, topic lessons=0, sidebar children=0 (rabbi-page lessons=192 — intentional per code comment, info only)
- Draft items in public sidebar: 4
- Popup sample (60 lessons): content-null=28, fully-empty (no content+no media)=0 — known-debt, not FAIL
| Section | Sampled | content NULL | empty popup |
|---|---|---|---|
| איך-לומדים-תנך | 6 | 3 | 0 |
| הפטרות | 6 | 1 | 0 |
| ימי-עיון-בתנך | 6 | 6 | 0 |
| כלי-עזר-טבלאות-זמני-המאורעות-ומפות | 6 | 2 | 0 |
| כתובים | 6 | 6 | 0 |
| ליווי-תתים | 6 | 2 | 0 |
| מועדים | 6 | 1 | 0 |
| נביאים | 6 | 4 | 0 |
| נושאים-כלליים-בתנך | 6 | 2 | 0 |
| תורה | 6 | 2 | 0 |

## Harness notes / limitations

- Queries replicate supabase-js REST emission of the CURRENT working-tree hooks (useContentSidebar band 1..999, useSeriesChildren+useLessonsBySeries for /series/:id, CategoryPage useSeriesForNode+useDirectLessons+useRollupLessons for category/book nodes, useRabbi*, useTopicsSidebar/useTopicLessons, useTeacherSidebar [tree-driven] / useTeacherListingItems [content-types, no fallback] / useTeacherCreatorContent [rabbi_page_items + lessons-by-rabbi fallback]) — including implicit 1000-row PostgREST caps where the app sends no limit.
- r2: chained .order() keys are merged into one comma-joined `order` param exactly like postgrest-js; the previous multi-param emission dropped secondary sort keys and produced false order failures.
- Hebrew collation approximated by codepoint order (browser localeCompare('he') may differ on geresh/maqaf edge cases).
- torah/ketuvim old listing scrape carries lesson rows only (series cards live in sub_links) → series-card diff for those pages is not checked (reported as series_new_unchecked).
- 'planned_extras' = extra new lessons whose id is placed in this series by RESOLVED-OPS; 'planned_removals' = extras the plan drafts or moves elsewhere (expected to disappear after apply).
- Old rav pages aggregate a series into ONE row; lessons inside series are not listed there — rabbi lesson diffs compare the old flat rows vs the new flat list (post-fix exhaustive list).