# VERIFY — oneone verification report
*Generated 2026-06-12 11:53 by oneone_verify.py — read-only anon-REST simulation of the CURRENT working-tree UI hooks against the live DB.*

REST calls: 3040 (cache hits 73, errors 0)

## Summary

| Section | Pass | Total | Pass rate |
|---|---|---|---|
| Sidebar (top categories) | 10 | 13 | 76.9% |
| Listing pages | 795 | 1273 | 62.5% |
| Rabbi pages | 128 | 154 | 83.1% |
| Topics sidebar | PASS | 1 | — |
| Topic pages | 102 | 128 | 79.7% |
| Teachers content-types | 22 | 22 | 100.0% |
| Teachers creators | 30 | 31 | 96.8% |
| Teachers by-book | 35 | 35 | 100.0% |
| Guards | PASS | — | — |

## 1. Sidebar

### ✅ ניווט באתר לפי ספר ופרק (static_link)
- quick-link rendered: True

### ✅ פרשת השבוע (static_link)
- quick-link rendered: True

### ✅ איך לומדים תנ"ך (section)
- old=7 (incl. alias) order_ok=True missing=[] extra=[]

### ✅ תורה (category)
- books order ok: True; missing books: []; extra: []
- book-children failing: 0/6

### ✅ נביאים (category)
- books order ok: True; missing books: []; extra: []
- book-children failing: 0/21

### ✅ כתובים (category)
- books order ok: True; missing books: []; extra: []
- book-children failing: 0/11

### ❌ נושאים כלליים בתנ"ך (section)
- old=16 (incl. alias) order_ok=True missing=[] extra=['כל ארץ ישראל']

### ❌ מועדים (section)
- old=16 (incl. alias) order_ok=True missing=[] extra=['כל יום הכיפורים', 'כל סוכות']

### ❌ הפטרות (section)
- old=7 (incl. alias) order_ok=True missing=[] extra=['כל הפטרות בראשית', 'כל הפטרות שמות', 'כל הפטרות ויקרא', 'כל הפטרות במדבר', 'כל הפטרות דברים']

### ✅ ימי עיון בתנ"ך (section)
- old=8 (incl. alias) order_ok=True missing=[] extra=[]

### ✅ כלי עזר - טבלאות זמני המאורעות ומפות (section)
- old=1 (incl. alias) order_ok=True missing=[] extra=[]

### ✅ פרוייקט התנ"ך המוקלט - מתעדכן (static_link)
- quick-link rendered: True

### ✅ ליווי ת"תים (section)
- old=2 (incl. alias) order_ok=True missing=[] extra=[]

## 2. Listing pages

Simulated 1273 pages (skipped 47 unmapped).

| Section | Pages | Pass | Old items | New items | Missing | Unexplained extra | Planned extras | Planned removals | Order fails | Rabbi mism. |
|---|---|---|---|---|---|---|---|---|---|---|
| נביאים | 546 | 267 (48.9%) | 7503 | 21772 | 358 | 14585 | 26 | 16 | 23 | 288 |
| כתובים | 365 | 323 (88.5%) | 2209 | 6777 | 15 | 4072 | 75 | 436 | 24 | 37 |
| תורה | 185 | 97 (52.4%) | 5066 | 14488 | 234 | 8899 | 593 | 164 | 7 | 383 |
| הפטרות | 87 | 66 (75.9%) | 582 | 1233 | 15 | 609 | 47 | 10 | 0 | 1 |
| נושאים-כלליים-בתנך | 37 | 20 (54.1%) | 628 | 1069 | 19 | 393 | 33 | 34 | 1 | 20 |
| מועדים | 23 | 8 (34.8%) | 513 | 886 | 14 | 339 | 42 | 6 | 1 | 17 |
| איך-לומדים-תנך | 13 | 8 (61.5%) | 326 | 231 | 147 | 23 | 29 | 0 | 0 | 0 |
| ימי-עיון-בתנך | 8 | 2 (25.0%) | 673 | 946 | 1 | 140 | 134 | 0 | 1 | 9 |
| כלי-עזר-טבלאות-זמני-המאורעות-ומפות | 6 | 3 (50.0%) | 46 | 43 | 5 | 2 | 0 | 0 | 0 | 0 |
| ליווי-תתים | 3 | 1 (33.3%) | 2 | 6 | 0 | 4 | 0 | 0 | 0 | 0 |

Note: 48 of the pages are category/book aggregation nodes — since r2 the harness simulates them with their REAL renderer (CategoryPage: useSeriesForNode canonical series + direct + descendant roll-up lessons, dedup by id); all other pages use /series/:id semantics (useSeriesChildren + useLessonsBySeries).

### Top-20 worst pages

- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/` *(kind=category)*
  - old=263 new=7411 matched=262 in_order=24 missing=1 extra=7149 (planned keep 0, planned remove 9, unexplained 7140) order_ok=False rabbi_mm=0
  - missing sample: ['בין משכן למקדש']
  - extra sample: ['ביאור ושננתם לספר שמואל א פרק ט', 'אין מוקדם ומאוחר בתורה', 'הבאת שמואל לעלי', 'המלחמה בחמשת מלכי האמורי', 'השנה הרביעית ליהויקים', 'כל ספר ישעיהו', 'מבט רחב על חזון המקדש ביחזקאל שיעור ראשון', 'מבט רחב על חזון המקדש ביחזקאל שיעור ראשון']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/` *(kind=category)*
  - old=159 new=4731 matched=124 in_order=8 missing=35 extra=4607 (planned keep 0, planned remove 85, unexplained 4522) order_ok=False rabbi_mm=0
  - missing sample: ['עונש המוות בעקבות אכילת עץ הדעת', 'קללת כנען', 'תאריך לבריאת העולם של הציווי לך לך', 'מדוע יש תולדות יצחק ותולדות יעקב אך לא תולדות אברהם', 'גניבת נשי האבות ונסיונות חטיפה נוספים', 'פירוש האבן עזרא על מצחק', 'קנין מקומות בארץ ישראל בכסף', 'דברי אברהם לעבד שלא להשיב את בנו לחרן']
  - extra sample: ['שמות מוקלט פרק א ללא טעמים', 'ארבע רוחות השמיים', 'דף פרשת שבוע האזינו תשפד', 'דף פרשת שבוע תצוה תשפג', 'חידות לילדים פרשת בראשית', 'יחסי האדם והאדמה בפרשיות בראשית לך לך', 'מה תפקידו של המדבר בחיים שלנו', 'מצוות מינוי שופטים']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/כתובים/` *(kind=category)*
  - old=94 new=2349 matched=93 in_order=83 missing=1 extra=2256 (planned keep 65, planned remove 218, unexplained 1973) order_ok=False rabbi_mm=2
  - missing sample: ['ספר דניאל עם ביאור ותרגום ושננתם']
  - extra sample: ['ושננתם קיום מצוות מחיית עמלק במגילת אסתר', 'צדיק הוא ד כי פיהו מריתי', 'הילד דניאל בארמון נבוכדנצר', 'משלי פרק ג', 'איוב פרק ד', 'נחמיה בבקיאות פרקים ז ח', 'איוב פרק ח', 'איוב פרק ט']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/שמואל-א/` *(kind=book)*
  - old=63 new=1090 matched=63 in_order=38 missing=0 extra=1027 (planned keep 0, planned remove 1, unexplained 1026) order_ok=False rabbi_mm=0
  - extra sample: ['ביאור ושננתם לספר שמואל א פרק א', 'שמואל א מוקלט פרק א ללא טעמים', 'שמואל א פרק א', 'ביאור ושננתם לספר שמואל א פרק ו', 'ביאור ושננתם לספר שמואל א פרק ט', 'ביאור ושננתם לספר שמואל א פרק יא', 'ביאור ושננתם לספר שמואל א פרק יב', 'ביאור ושננתם לספר שמואל א פרק טו']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/בראשית/` *(kind=book)*
  - old=59 new=1040 matched=40 in_order=6 missing=19 extra=1000 (planned keep 1, planned remove 32, unexplained 967) order_ok=False rabbi_mm=0
  - missing sample: ['ראובן פוחז או בכור', 'עונש המוות בעקבות אכילת עץ הדעת', 'קללת כנען', 'תאריך לבריאת העולם של הציווי לך לך', 'מדוע יש תולדות יצחק ותולדות יעקב אך לא תולדות אברהם', 'גניבת נשי האבות ונסיונות חטיפה נוספים', 'פירוש האבן עזרא על מצחק', 'קנין מקומות בארץ ישראל בכסף']
  - extra sample: ['בראשית', 'בראשית מוקלט פרק א ללא טעמים', 'ראשית', 'לא טוב היות האדם לבדו', 'ראה ריח בני כריח שדה אשר ברכו ה', 'האיש הזקן ביותר בעולם', 'הברית עפי הראבע והרמבן', 'הופעת הקבה בעולם על פי שמותיו אלוקים יקוק דין ורחמים']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/שמות/` *(kind=book)*
  - old=38 new=1006 matched=29 in_order=5 missing=9 extra=977 (planned keep 2, planned remove 27, unexplained 948) order_ok=False rabbi_mm=0
  - missing sample: ['מתי נזכרות הנהגות ומידות טובות של הנביאים בכתוב', 'שאלות בפרשת שמות', 'מכת בכורות', 'הציווי על מצות לפני יציאת מצרים', 'מועד אמירת התורה ומצוותיה למשה', 'הזכרת מעמד הר סיני בתנך', 'פוקד עוון אבות על בנים', 'האם מצות עליה לרגל נוהגת במשכן']
  - extra sample: ['ערכים ומידות העולים מפסוקי חומש שמות', 'שמות מוקלט פרק א ללא טעמים', 'פרק ב של הבריאה', 'ביאור שם הויה', 'בלבת אש מתוך הסנה', 'גלות מצרים', 'הבאים מצרימה', 'הגאולה בחומש שמות']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/ירמיהו/` *(kind=book)*
  - old=15 new=935 matched=14 in_order=11 missing=1 extra=921 (planned keep 0, planned remove 0, unexplained 921) order_ok=False rabbi_mm=1
  - missing sample: ['מגלות יהויכין עד חורבן הבית']
  - extra sample: ['מגלת יהויכין עד חורבן הבית', 'ירמיהו בבקיאות פרקים א ב', 'אזהרה מפני בוא האויב', 'בני יונדב בן רכב', 'ברוך בן נריה', 'ד ממנה את ירמיהו לנביא', 'הגאולה העתידה', 'הוויכוח בין ירמיהו לבין יושבי מצרים']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/במדבר/` *(kind=book)*
  - old=35 new=916 matched=35 in_order=12 missing=0 extra=881 (planned keep 1, planned remove 15, unexplained 865) order_ok=False rabbi_mm=0
  - extra sample: ['ערכים ומידות העולים מפסוקי חומש במדבר', 'במדבר מוקלט פרק א ללא טעמים', 'ארבע רוחות השמיים', 'הדרך ממצרים לירושלים', 'החומש של דור המדבר', 'הכנה לקבלת התורה', 'המסלול בדרך לארץ ישראל', 'המסלול המפתיע של המרגלים']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/שופטים/` *(kind=book)*
  - old=41 new=886 matched=41 in_order=25 missing=0 extra=845 (planned keep 0, planned remove 0, unexplained 845) order_ok=False rabbi_mm=1
  - extra sample: ['ביאור ושננתם לספר שופטים פרק א', 'ספר שופטים מוקלט פרק א', 'שופטים מוקלט פרק א ללא טעמים', 'ביאור ושננתם לספר שופטים פרק ב', 'ביאור ושננתם לספר שופטים פרק ט', 'ביאור ושננתם לספר שופטים פרק יז', 'מי יעלה לנו אל הכנעני בתחלה להלחם בו', 'אופי התקופה']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/ישעיהו/` *(kind=book)*
  - old=16 new=860 matched=16 in_order=13 missing=0 extra=844 (planned keep 0, planned remove 0, unexplained 844) order_ok=False rabbi_mm=0
  - extra sample: ['ישעיה א חמאה ודבש', 'ירמיהו בבקיאות פרקים ג ד', 'ירמיהו בבקיאות פרקים ג ד', 'ישעיהו בבקיאות פרקים יט כ', 'ישעיהו בבקיאות פרקים כא כב', 'ישעיהו בבקיאות פרקים כא כב', 'ישעיהו בבקיאות פרקים כג כד', 'ישעיהו בבקיאות פרקים כג כד']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/יהושע/` *(kind=book)*
  - old=38 new=820 matched=37 in_order=26 missing=1 extra=783 (planned keep 0, planned remove 1, unexplained 782) order_ok=False rabbi_mm=0
  - missing sample: ['הסבר פשוט על מבנה ארץ ישראל']
  - extra sample: ['הסבר פשוט על מבנה ארץ ישראל והנחלות', 'ביאור ושננתם על ספר יהושע פרק א', 'יהושע מוקלט פרק א ללא טעמים', 'ספר יהושע מוקלט פרק ב', 'פרשת הגבעונים', 'ספר יהושע מוקלט פרק יג', 'ספר יהושע מוקלט פרק טז', 'מצגת כיצד נחלקה הארץ בין השבטים']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/יחזקאל/` *(kind=book)*
  - old=18 new=796 matched=15 in_order=6 missing=3 extra=781 (planned keep 0, planned remove 2, unexplained 779) order_ok=False rabbi_mm=1
  - missing sample: ['מגלות יהויכין עד חורבן הבית', 'בבל מול ירושלים בקעה מול הרים שיעור ראשון', 'בבל מול ירושלים בקעה מול הרים שיעור שני']
  - extra sample: ['מגלת יהויכין עד חורבן הבית', 'יחזקאל מוקלט פרק א', 'יחזקאל פרק א', 'יחזקאל פרקים יז יח', 'שרטוט בית המקדש ביחזקאל לפי שיטות המלבים רשי ומצודות', 'שרטוט בית המקדש ביחזקאל לפי שיטות המלבים רשי ומצודות', 'שרטוט בית המקדש ביחזקאל לפי שיטות המלבים רשי ומצודות', 'ותשאני רוח ואשמע אחרי קול רעש גדול']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/דברים/` *(kind=book)*
  - old=16 new=744 matched=16 in_order=9 missing=0 extra=728 (planned keep 3, planned remove 4, unexplained 721) order_ok=False rabbi_mm=0
  - extra sample: ['כי תבואו אל הארץ', 'ערכים ומידות העולים מפסוקי חומש דברים', 'מוסר המלחמה בספר דברים', 'דברים מוקלט פרק א ללא טעמים', 'איכה', 'אני כהן', 'ארבע רשויות ההנהגה בעם ישראל', 'בכיה של חינם']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/ויקרא/` *(kind=book)*
  - old=22 new=713 matched=22 in_order=6 missing=0 extra=691 (planned keep 1, planned remove 1, unexplained 689) order_ok=False rabbi_mm=0
  - extra sample: ['ערכים ומידות העולים מפסוקי חומש ויקרא', 'גוף ונשמה בחומש ויקרא הרב עמירם אלבה', 'ויקרא מוקלט פרק א ללא טעמים', 'ויקרא', 'אחריות אישית', 'אשרי תבחר ותקרב', 'בין הכרח לתענוג האיסור להקריב שאור ודבש', 'ההגיון של קרבן תודה']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/הפטרות/` *(kind=category)*
  - old=31 new=680 matched=31 in_order=31 missing=0 extra=649 (planned keep 31, planned remove 10, unexplained 608) order_ok=True rabbi_mm=0
  - extra sample: ['רבות מחשבות בלב איש ועצת ד היא תקום', 'ויתור על ברכת הארץ', 'התפקיד של בלעם', 'הגנת משה ואליהו', 'איחוד שלושת המקדשים', 'הגלות המצמיחה', 'הכוח של דברי ה', 'הפטרת פרשת ראה כל כלי יוצר עליך לא יצלח']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/כתובים/תהלים/` *(kind=book)*
  - old=12 new=555 matched=12 in_order=11 missing=0 extra=543 (planned keep 4, planned remove 55, unexplained 484) order_ok=False rabbi_mm=3
  - extra sample: ['מעבר לקריאה וביאור בקצרה של ספר תהילים', 'מזמור סד', 'מזמור ע', 'מזמור עה', 'מזמור פ', 'מזמור פב', 'מזמור פג', 'מזמור פח']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/מלכים-ב/` *(kind=book)*
  - old=29 new=468 matched=28 in_order=16 missing=1 extra=440 (planned keep 0, planned remove 0, unexplained 440) order_ok=False rabbi_mm=1
  - missing sample: ['המלכויות בישראל מלכות עשרת השבטים']
  - extra sample: ['מגלת יהויכין עד חורבן הבית', 'ערכים ומידות העולים מפסוקי ספר מלכים ב', 'מלכות אחזיהו ומותו', 'כיצד יתכן שיהושפט המלך הצדיק התחבר עם מלכי ישראל הרשעים', 'מהפכת יהוא', 'מעשה עתליה ומעשה יהושבע', 'דמותו של יהואש', 'אהבת ה']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/מלכים-א/` *(kind=book)*
  - old=35 new=465 matched=34 in_order=22 missing=1 extra=431 (planned keep 1, planned remove 3, unexplained 427) order_ok=False rabbi_mm=1
  - missing sample: ['בין משכן למקדש']
  - extra sample: ['מפת שלושים ואחד המלכים', 'ערכים ומידות העולים מפסוקי ספר מלכים א', 'רבות מחשבות בלב איש ועצת ד היא תקום', 'מלכים א מוקלט פרק א ללא טעמים', 'שיעור 1 במלכים מלכים א פרק א', 'המלכת שלמה והריגת אדוניהו', 'חלום שלמה בגבעון משפט שלמה', 'מלכות שלמה']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים-כלליים-בתנך/` *(kind=category)*
  - old=101 new=538 matched=98 in_order=97 missing=3 extra=440 (planned keep 23, planned remove 34, unexplained 383) order_ok=False rabbi_mm=6
  - missing sample: ['הסבר פשוט על מבנה ארץ ישראל', 'מדינת הלכה על פי התנך', 'שאלת איסור הבמות']
  - extra sample: ['הסבר פשוט על מבנה ארץ ישראל והנחלות', 'פרק א יחודו של חבל הלבנון', 'המקום אשר יבחר', 'אבל בית מעכה', 'אבל בית מעכה', 'אברהם וארבעת המלכים', 'איש אשר רוח בו מבוא לספר יהושע', 'אנשי לצון']
- `https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/מועדים/` *(kind=category)*
  - old=58 new=440 matched=57 in_order=56 missing=1 extra=383 (planned keep 42, planned remove 6, unexplained 335) order_ok=False rabbi_mm=4
  - missing sample: ['אורי וישעי']
  - extra sample: ['ארבעת בגדי הכהן הגדול ביום הכיפורים', 'ארבעת בגדי הכהן הגדול ביום הכיפורים', 'גאולת מצרים והגאולה העתידה', 'הקטורת והשראת השכינה', 'זכר עמלק', 'לב הפרק זכריה פרק ד', 'מדוע ירושלים נקראת צדק ושלם', 'מה מיוחד בירושלים']

## 3. Rabbi pages

rabbi_page_items table: available; used for 133 rabbis (rest = fallback owned-series + lessons).

128/154 PASS. Worst 15 by missing lessons:

- **הרב יואב אוריאל**: series old=50 new=50 missing=0 | lessons old=94 new=89 missing=5 extra=0 order_ok=True
- **הרב עמנואל בן ארצי**: series old=26 new=26 missing=0 | lessons old=22 new=20 missing=3 extra=1 order_ok=True
- **הרב אריה אוריאל**: series old=0 new=0 missing=0 | lessons old=2 new=10 missing=2 extra=10 order_ok=True
- **הרב מנחם שחור**: series old=7 new=7 missing=0 | lessons old=64 new=62 missing=2 extra=0 order_ok=True
- **מערכת בני ציון**: series old=6 new=6 missing=0 | lessons old=2 new=0 missing=2 extra=0 order_ok=True
- **הרב איתן שנדורפי**: series old=30 new=30 missing=0 | lessons old=73 new=72 missing=1 extra=0 order_ok=True
- **הרב אביעד תפוחי**: series old=0 new=0 missing=0 | lessons old=0 new=1 missing=0 extra=1 order_ok=True
- **הרב אוהד קרקובר**: series old=0 new=0 missing=0 | lessons old=0 new=2 missing=0 extra=2 order_ok=True
- **הרב אורן טרבלסי**: series old=0 new=0 missing=0 | lessons old=0 new=1 missing=0 extra=1 order_ok=True
- **הרב אסף שטראוס**: series old=0 new=0 missing=0 | lessons old=0 new=1 missing=0 extra=1 order_ok=True
- **הרב אריאל בראלי**: series old=0 new=0 missing=0 | lessons old=0 new=2 missing=0 extra=2 order_ok=True
- **הרב אריאל כהן**: series old=0 new=0 missing=0 | lessons old=0 new=1 missing=0 extra=1 order_ok=True
- **הרב אריה מרזר**: series old=0 new=0 missing=0 | lessons old=0 new=1 missing=0 extra=1 order_ok=True
- **הרב ברק עוקבי**: series old=0 new=0 missing=0 | lessons old=0 new=3 missing=0 extra=3 order_ok=True
- **הרב גדי שלוין**: series old=0 new=0 missing=0 | lessons old=0 new=3 missing=0 extra=3 order_ok=True

## 4. Topics

- Sidebar: PASS — old=127 new=127 missing=0 extra=0 order_ok=True count-mismatches=78
- ⚠️ HARNESS FINDING: the sidebar count query returns exactly 1000 rows (PostgREST cap) — the app sends NO limit, so the badge counts in production are computed from a truncated row set.
- series_topics table: present (nonempty=True) — series-card checks enabled
- Topic pages: 102/128 PASS

- **ארון הברית**: old=16 new=15 missing=1 extra=0 order_ok=True old_series_cards=0
- **ארץ ישראל**: old=34 new=33 missing=1 extra=0 order_ok=True old_series_cards=0
- **דוד המלך**: old=54 new=55 missing=1 extra=2 order_ok=True old_series_cards=4
- **התשובה**: old=5 new=16 missing=1 extra=12 order_ok=False old_series_cards=0
- **ירושלים**: old=28 new=27 missing=1 extra=0 order_ok=True old_series_cards=1
- **כריתת ברית**: old=11 new=10 missing=1 extra=0 order_ok=True old_series_cards=0
- **__meta__**: old=None new=None missing=None extra=None order_ok=None old_series_cards=None
- **גאולה**: old=53 new=53 missing=0 extra=0 order_ok=False old_series_cards=0
- **גוג ומגוג**: old=10 new=10 missing=0 extra=0 order_ok=False old_series_cards=0
- **האבות**: old=4 new=5 missing=0 extra=1 order_ok=True old_series_cards=0
- **האזנה לפסוקים עם ביאור פשוט**: old=0 new=2 missing=0 extra=2 order_ok=True old_series_cards=55
- **חנ**: old=None new=None missing=None extra=None order_ok=None old_series_cards=None
- **חנוכה**: old=None new=None missing=None extra=None order_ok=None old_series_cards=None
- **יום העצמאות**: old=None new=None missing=None extra=None order_ok=None old_series_cards=None
- **לימוד בקצב של פרק לשיעור**: old=None new=None missing=None extra=None order_ok=None old_series_cards=None

## 5. Teachers wing

- teacher_listing_items table: available
- Content types: 22/22 PASS
  - ✅ ביאור הפסוקים (teacher_listing_items): old=119 new=119 matched=119 missing=0 extra=0
  - ✅ ביאורי מילים (teacher_listing_items): old=39 new=39 matched=39 missing=0 extra=0
  - ✅ דגשים והכוונה על סדר הפרקים (teacher_listing_items): old=84 new=84 matched=84 missing=0 extra=0
  - ✅ דפי עבודה (teacher_listing_items): old=70 new=70 matched=70 missing=0 extra=0
  - ✅ הכוונה והדרכה למורה (teacher_listing_items): old=142 new=142 matched=142 missing=0 extra=0
  - ✅ חוברת עבודה (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ חידון (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ חידות חזרה (teacher_listing_items): old=118 new=118 matched=118 missing=0 extra=0
  - ✅ מבחן כללי ספר שופטים (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ מבחנים (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ מי אמר למי (teacher_listing_items): old=2 new=2 matched=2 missing=0 extra=0
  - ✅ מפות (teacher_listing_items): old=12 new=12 matched=12 missing=0 extra=0
  - ✅ מקורות עזר לפרקים (teacher_listing_items): old=9 new=9 matched=9 missing=0 extra=0
  - ✅ סיכום הפרקים והנושאים בקצרה (teacher_listing_items): old=159 new=159 matched=159 missing=0 extra=0
  - ✅ ספר יהושע (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ ספר מלכים (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ ספר שופטים (teacher_listing_items): old=2 new=2 matched=2 missing=0 extra=0
  - ✅ ערכים ומידות העולים מן הפסוקים (teacher_listing_items): old=11 new=11 matched=11 missing=0 extra=0
  - ✅ שאלות ותשובות (teacher_listing_items): old=33 new=33 matched=33 missing=0 extra=0
  - ✅ שאלות ותשובות על סדר הפרקים (teacher_listing_items): old=99 new=99 matched=99 missing=0 extra=0
  - ✅ שאלות חזרה (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
  - ✅ שאלות עיון (teacher_listing_items): old=1 new=1 matched=1 missing=0 extra=0
- Creators: 30/31 PASS
  - ✅ אוריה כראדי (rabbi_page_items): old=1 new=1 matched=1 missing=0 extra=0 order_ok=True
  - ✅ הרב אורי שטמלר (rabbi_page_items): old=3 new=3 matched=3 missing=0 extra=0 order_ok=True
  - ✅ הרב אשי בלייכר (rabbi_page_items): old=2 new=2 matched=2 missing=0 extra=0 order_ok=True
  - ✅ הרב בניה כהן (rabbi_page_items): old=4 new=4 matched=4 missing=0 extra=0 order_ok=True
  - ✅ הרב גדי שר שלום (rabbi_page_items): old=1 new=1 matched=1 missing=0 extra=0 order_ok=True
  - ✅ הרב דביר אפלבוים (rabbi_page_items): old=3 new=3 matched=3 missing=0 extra=0 order_ok=True
  - ✅ הרב חסדאי בר אור (rabbi_page_items): old=2 new=2 matched=2 missing=0 extra=0 order_ok=True
  - ✅ הרב ידידיה שילה (rabbi_page_items): old=1 new=1 matched=1 missing=0 extra=0 order_ok=True
  - ✅ הרב יהודה בשושה (fallback_lessons_by_rabbi): old=0 new=7 matched=0 missing=0 extra=7 order_ok=True
  - ✅ הרב יונתן לוי (rabbi_page_items): old=12 new=12 matched=12 missing=0 extra=0 order_ok=True
  - ✅ הרב יורם אליהו (rabbi_page_items): old=1 new=1 matched=1 missing=0 extra=0 order_ok=True
  - ✅ הרב יצחק עמראני (rabbi_page_items): old=21 new=21 matched=21 missing=0 extra=0 order_ok=True
  - ✅ הרב מאיר גרשונזון (rabbi_page_items): old=1 new=1 matched=1 missing=0 extra=0 order_ok=True
  - ✅ הרב מאיר הילביץ' (rabbi_page_items): old=5 new=5 matched=5 missing=0 extra=0 order_ok=True
  - ✅ הרב מנחם אליהו (rabbi_page_items): old=2 new=2 matched=2 missing=0 extra=0 order_ok=True
  - ✅ הרב נחום אריאל (rabbi_page_items): old=1 new=1 matched=1 missing=0 extra=0 order_ok=True
  - ✅ הרב ניסים כהן (rabbi_page_items): old=9 new=9 matched=9 missing=0 extra=0 order_ok=True
  - ✅ הרב עדי איצקוביץ' (rabbi_page_items): old=13 new=13 matched=13 missing=0 extra=0 order_ok=True
  - ✅ הרב עמוס נתנאל (rabbi_page_items): old=2 new=2 matched=2 missing=0 extra=0 order_ok=True
  - ✅ הרב עמירם אלבה (rabbi_page_items): old=19 new=19 matched=19 missing=0 extra=0 order_ok=True
  - ❌ הרב עמנואל בן ארצי (rabbi_page_items): old=48 new=45 matched=44 missing=4 extra=1 order_ok=True
  - ✅ הרב שלמה כץ (rabbi_page_items): old=21 new=21 matched=21 missing=0 extra=0 order_ok=True
  - ✅ הרב שמעון לוי והרב נתן מולאיוף (rabbi_page_items): old=11 new=11 matched=11 missing=0 extra=0 order_ok=True
  - ✅ הרב שמעון שוהם (rabbi_page_items): old=22 new=22 matched=22 missing=0 extra=0 order_ok=True
  - ✅ ושננתם - אוצר התורה (rabbi_page_items): old=50 new=50 matched=50 missing=0 extra=0 order_ok=True
  - ✅ ישקו העדרים (rabbi_page_items): old=5 new=5 matched=5 missing=0 extra=0 order_ok=True
  - ✅ מחבר לא ידוע (rabbi_page_items): old=4 new=4 matched=4 missing=0 extra=0 order_ok=True
  - ✅ מכון דעת סופרים (rabbi_page_items): old=6 new=6 matched=6 missing=0 extra=0 order_ok=True
  - ✅ נתן מארגל (rabbi_page_items): old=5 new=5 matched=5 missing=0 extra=0 order_ok=True
  - ✅ סידור שים שלום (rabbi_page_items): old=1 new=1 matched=1 missing=0 extra=0 order_ok=True
  - ✅ תלמוד תורה מורשה (rabbi_page_items): old=6 new=6 matched=6 missing=0 extra=0 order_ok=True
- By-book sim = the RENDERED TeacherSidebar rows (per-book: 'כל התכנים ב<book>', 'דפי עבודה — <book>', + hard-coded parshiot for Torah). KNOWN code-ask: the old sidebar labeled the alias 'כל התכנים בחומש/בספר <book>' (with per-book variants like 'דפי עבודה ומבחנים מלכים א'), and books with 0 old children now show the 2 synthetic rows — label parity needs a component fix, not data.
- By-book tree: 35/35 PASS
  - ✅ בראשית: old=14 new=14 matched=14 missing=0 extra=0 order_ok=True
  - ✅ שמות: old=13 new=13 matched=13 missing=0 extra=0 order_ok=True
  - ✅ ויקרא: old=12 new=12 matched=12 missing=0 extra=0 order_ok=True
  - ✅ במדבר: old=12 new=12 matched=12 missing=0 extra=0 order_ok=True
  - ✅ דברים: old=6 new=6 matched=6 missing=0 extra=0 order_ok=True
  - ✅ יהושע: old=2 new=2 matched=2 missing=0 extra=0 order_ok=True
  - ✅ שופטים: old=2 new=2 matched=2 missing=0 extra=0 order_ok=True
  - ✅ שמואל א: old=2 new=2 matched=2 missing=0 extra=0 order_ok=True
  - ✅ שמואל ב: old=2 new=2 matched=2 missing=0 extra=0 order_ok=True
  - ✅ מלכים א: old=2 new=2 matched=2 missing=0 extra=0 order_ok=True
  - ✅ מלכים ב: old=2 new=2 matched=2 missing=0 extra=0 order_ok=True
  - ✅ ישעיהו: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ ירמיהו: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ יחזקאל: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ הושע: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ יואל: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ עמוס: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ עובדיה: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ יונה: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ מיכה: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ נחום: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ חבקוק: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ צפניה: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ חגי: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ זכריה: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ מלאכי: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ תהלים: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ איוב: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ שיר השירים: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ רות: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ איכה: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ אסתר: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ דניאל: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ עזרא: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True
  - ✅ נחמיה: old=0 new=0 matched=0 missing=0 extra=0 order_ok=True

## 6. Guards

- Teacher-only items in PUBLIC simulations: listings lessons=0, topic lessons=0, sidebar children=0 (rabbi-page lessons=192 — intentional per code comment, info only)
- Draft items in public sidebar: 0
- Popup sample (60 lessons): content-null=30, fully-empty (no content+no media)=1 — known-debt, not FAIL
| Section | Sampled | content NULL | empty popup |
|---|---|---|---|
| איך-לומדים-תנך | 6 | 4 | 0 |
| הפטרות | 6 | 1 | 0 |
| ימי-עיון-בתנך | 6 | 6 | 0 |
| כלי-עזר-טבלאות-זמני-המאורעות-ומפות | 6 | 2 | 0 |
| כתובים | 6 | 6 | 0 |
| ליווי-תתים | 6 | 2 | 0 |
| מועדים | 6 | 0 | 0 |
| נביאים | 6 | 5 | 1 |
| נושאים-כלליים-בתנך | 6 | 3 | 0 |
| תורה | 6 | 2 | 0 |

## Harness notes / limitations

- Queries replicate supabase-js REST emission of the CURRENT working-tree hooks (useContentSidebar band 1..999, useSeriesChildren+useLessonsBySeries for /series/:id, CategoryPage useSeriesForNode+useDirectLessons+useRollupLessons for category/book nodes, useRabbi*, useTopicsSidebar/useTopicLessons, useTeacherSidebar [tree-driven] / useTeacherListingItems [content-types, no fallback] / useTeacherCreatorContent [rabbi_page_items + lessons-by-rabbi fallback]) — including implicit 1000-row PostgREST caps where the app sends no limit.
- r2: chained .order() keys are merged into one comma-joined `order` param exactly like postgrest-js; the previous multi-param emission dropped secondary sort keys and produced false order failures.
- Hebrew collation approximated by codepoint order (browser localeCompare('he') may differ on geresh/maqaf edge cases).
- torah/ketuvim old listing scrape carries lesson rows only (series cards live in sub_links) → series-card diff for those pages is not checked (reported as series_new_unchecked).
- 'planned_extras' = extra new lessons whose id is placed in this series by RESOLVED-OPS; 'planned_removals' = extras the plan drafts or moves elsewhere (expected to disappear after apply).
- Old rav pages aggregate a series into ONE row; lessons inside series are not listed there — rabbi lesson diffs compare the old flat rows vs the new flat list (post-fix exhaustive list).