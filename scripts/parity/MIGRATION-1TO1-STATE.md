# בני ציון — מיגרציית 1:1 לכל הסיידברים · מסמך-מצב אב (HANDOFF)

> **המקור-האמת היחיד להמשך המיגרציה.** קרא אותי ראשון בכל סשן חדש. עודכן: **19.6.2026** (L3+L4+L5 הושלמו+נפרסו+אומתו).
> המשימה של סער (יואב/הרב): **כל צומת בשני הסיידברים (ציבורי + מורים) יהיה 1:1 עם האתר הישן החי** (twb.co.il / bneyzion.co.il) — אותן סדרות, באותו סדר, אותם שיעורים+מאמרים, אותם מחברים, בלי זיהום, בלי כרטיסים/שיעורים ריקים.

## 🎯 הגדרת "סיימנו" (Definition of Done)
כל אחד מ-~600 הצמתים בשני הסיידברים עובר את שלושת השכבות:
1. **נתונים**: ספירת-סדרות חדש == ישן-חי (±2 = פערי-תוכן אמיתיים מוחרגים); ‏0 שיעורים/סדרות ריקים נפלטים; ייחוס-רב == המחבר בדף הישן.
2. **תוכן בתוך סדרה**: כל שיעור מותאם לישן לפי **שם-קובץ-האודיו** (מפתח-זהב) — מתחזים מוחרגים.
3. **חזותי**: צילום-עמוד-מלא חדש מול ישן (מלמעלה למטה) — אותן שורות, אותו סדר.
**מאמת**: `verify_book.py <node>` + פאן-אאוט סוכנים שקוראים את 2 הצילומים. הדוח האחרון: `reports/VERIFY-1to1-MASTER.md`.

## 🗓️ סיכום סשן 19.6.2026 — המיגרציה הושלמה מקצה-לקצה (קרא ראשון)
סשן ארוך שסגר את כל מה שנותר. סדר-הזמנים:
1. **L4 רבנים** — מנוע `rabbi_page_listing.py` (חדש), 132 דפי-רב נבנו 1:1 מ-`old_rabbi_pages`. תיקן over-attribution (נועם וידר 15→1, מנחם שחור 88→71), בנה מאפס (דנה סליי 0→7, ורדית 0→5). אימות 34 רבנים ויזואלי + audit מלא נקי. snapshot `rabbi_page_items_bak_l4_20260619`.
2. **21 דפי-רב "ריקים"** — נחקרו (`rabbi_empty_rebuild.py`, headless): כשל-גרידה, לא תקלה. יונדב זר=38 סדרות (לא 1639), שמעון לוי=דף-ישן שבור→פולבק תקין.
3. **L3 נושאים** — מנוע `topic_listing.py` (חדש), 127/127 נבנו 1:1. תיקן over-tagging (ראש-השנה 10→2) + sort_order מאוחד.
4. **טוקן Vercel חדש מסער** (ללא פג-תוקף) → **L3 deploy לפרודקשן** (TopicPage merge series). api-keys.md הוצא מ-git (gitignore, טוקן קבוע). אימות 11/11 נושאים ויזואלי + audit 0-issues.
5. **L5 מורים** — re-verified, 35/35 ספרים יציב.
6. **dual-audience "גם וגם"** (החלטת סער) — תוכן `teachers`+`general` (ושננתם/ציר-זמן/סיכומים) חזר לציבורי בנושאים בדיוק כמו בישן; teacher-EXCLUSIVE נשאר מוסתר (§0.3 נשמר). engine `_pub()` + 3 hooks + deploy. אומת.
7. **תיקון תנ"ך-מוקלט** (סער תפס בסייבר) — `fix_recorded_series.py`, 12 סדרות עם שיעור-כפול תוקנו 1:1 (יהושע 26→25, ישעיהו 87→36, איוב 93→42).
8. **audit כל-האתר "שלא נתבזה"** — COPY-duplicates בכל האתר (155 שיעורים/60 סדרות) → `dedup_copy_lessons.py`, draft+הסבת-הפניות, 0 נותרו. + empty-guard לכרטיסים-ריקים (43). + safety-net לעתיד. deploy `bneyzion-m4p3ugfty`.
**תוצאה: L1-L5 כולם 1:1 חיים ומאומתים. נותרו רק החלטות-תוכן של סער/יואב (ראה תחתית רוד-מאפ).** הכל הפיך (snapshots) ו-data-driven (חי-מיד). הפרקים המפורטים למטה.

## 📊 סטטוס נוכחי (19.6.2026) — L1-L5 הושלמו ואומתו; הצד הציבורי 1:1 חי
| סוג צומת | כמות | סטטוס |
|----------|------|--------|
| ספרים ציבוריים | 37 | ✅ הוחל+אומת (13 נקיים, 24 עם רשימת-תיקונים — ראה למטה) |
| סקשנים ציבוריים (מועדים/הפטרות/נושאים-כלליים/איך-לומדים/כלי-עזר/ליווי/מוקלט) | 125 עלים | ✅ **122/125 הוחל 1:1** (`section_listing.py`) + 36 author-fix; שאר 3 = SKIP_EMPTY (דפי-טקסט legit). |
| נושאים (themes-root) | 127 | ✅ **הושלם+פרוס+אומת חי (19.6)** — `topic_listing.py` → 127/127 1:1 (sort_order מאוחד). frontend deployed (dpl G3QSomdm). אימות 11/11 ויזואלי + audit 0-issues על כל 127. |
| רבנים ציבוריים | 154 | ✅ **הוחל+אומת חזותי (19.6)** — `rabbi_page_listing.py` 1:1; 132 הוחלו + 21 empty-old נחקרו (כולם תקינים). אימות חזותי 22+ מדגם + audit מלא נקי. |
| מורים: ספרים+סוג+יוצרים | 37+25+159 | ✅ **re-verified (19.6)** — `teachers_parity.py --watch`: 35/35 ספרים matched, יציב. residuals = nav-links + dual-audience (יואב). |

**הצד הציבורי חי כעת על** `bneyzion.vercel.app` → deploy `bneyzion-em44wo9eh` (+ שופטים/3-rerun אחריו; אם צריך deploy חדש: ראה "פריסה"). הקוד גנרי+פרוס, אז **כל כתיבת-DB מתבטאת מיד** (data-driven). **לכן: verify-before-apply לכל צומת.**

## ✅ L3 (נושאים) — דאטה נבנה+הוחל (19.6.2026); frontend מוכן, חסר deploy
**מנוע `topic_listing.py`** — rebuild ל-`lesson_topics`+`series_topics` 1:1 מ-`oneone/old_topic_pages.json` (127 נושאים, items מסודרים lesson/series/qa). מייצר **sort_order מאוחד** (=order_index) על שתי הטבלאות → TopicPage ממזג סדרות+שיעורים בסדר אחד. מחריג teacher-tagged (TopicPage strict §0.3). disambig לפי הרב של הפריט הישן (rabbi_norm→rabbi_id). מייבא pools מ-`rabbi_page_listing`.
- **דרי-ראן: 127/127 הוחלו** (snapshots `lesson_topics_bak_l3_20260619`+`series_topics_bak_l3_20260619`). תיקן over-tagging: **ראש השנה 10→2** (=ישן), + sort_order מאוחד מתקן את הסדר (דוד המלך 58/58 סדרות-תחילה). השינוי מינורי (127 נושאים: 1320→1308 lesson_topics) — תיקון מדויק. "קריאת הפסוקים" הוחל ב-min-res 0.5 (19 פריטי-ציבור; 12 ושננתם-teacher מוחרגים, TopicPage מסתיר ממילא).
- **✅ deploy בוצע + אומת חי (19.6):** dpl `G3QSomdm3sGDiaxUiwqsbdzQzWi1` aliased ל-prod. **אימות חזותי 11/11 נושאים נקי** (new מול old): דוד המלך 58/58 (4 סדרות-תחילה+54 שיעורים), ראש השנה 2/2, גאולה 53/53, ירושלים 29/29, בית המקדש 38/38, מלכות 43/43... **0 זיהום, 0 תוכן-זר.** + **audit נתונים מלא על כל 127 הנושאים: 0 blank, 0 dangling, 0 teacher-leak, 0 empty.**
- **✅ dual-audience "גם וגם" — הוכרע+הוחל+נפרס (19.6, סער):** "מה שחשוף בישן גם-וגם יהיה חשוף גם-וגם, מדויק, בלי לשבור." מימוש מדויק: `_pub(e)= not (is_teacher and not is_general)` — **dual (`teachers`+`general`, published) = ציבורי; teacher-EXCLUSIVE (`teachers` בלבד) נשאר מוסתר.** הנתונים נקיים (0 פריטים בלי tag; dual=270 lessons+21 series; exclusive=5028+301). שונה ב-engine (`topic_listing._pub`) + 3 hooks frontend (`useTopicLessons`/`useTopicSeries`/`useTopicsSidebar`): `.not(cs teachers)` → `.cs general`. **דאטה: 127/127 הוחל (1308L+177S), 0 teacher-exclusive (acceptance עבר), +11 dual.** קריאת-הפסוקים 19→30, אומת חזותית מול old (אותן סדרות ושננתם). **0 רגרסיה** (כל שאר הנושאים זהים). דף-רב כבר הראה dual (rpi בלי פילטר); דף-ספר כבר dual (§0.3 allow-list). deploy `bneyzion-9jq2u8ocd`. **המנגנון הישן `PUBLIC_DUAL_ALLOWED_ROOTS` (2 צמתים) הוחלף בכלל-נתונים אחיד לנושאים.**
- **L6 לעשות אחרי deploy:** פאן-אאוט ויזואלי על מדגם נושאים new מול old (`topic_sample_shots.py`+`topic_sample_verify.js` קיימים).

### 🔭 L3 — אבחון מקורי (היסטורי, 18.6 לילה)
**מנגנון:** `TopicPage`→`useTopicLessons` קורא **רק `lesson_topics`** (topic_id→sort_order, strict teacher filter), **לא `series_topics`**. 127/127 ממופים (`topic-manifest.json`), sort_order 96% מכוסה בנושאי-הסיידבר (1273/1320). אבל אימות חזותי (8 מדגם) = **2/8 נקי בלבד** — הספירה הטעתה. 3 פערים אמיתיים:
1. **🔴 מבני — סדרות לא מרונדרות:** דף-נושא ישן מציג כרטיסי-**סדרה**; המיגרציה שמה אותן ב-`series_topics` (178 שורות) אבל TopicPage לא קורא אותן → נושאים עתירי-סדרות מציגים כמעט-כלום (האזנה-לפסוקים: 2 חדש מול ~54 ישן; כולן סדרות "קריאה וביאור" של ספרים). **תיקון: שינוי frontend — TopicPage למזג `series_topics`+`lesson_topics` לפי sort_order מאוחד** (+ deploy).
2. **סדר:** sort_order לא 1:1 מלא (דוד-המלך: ישן=4 סדרות-תחילה ואז שיעורים, חדש מערבב+דוחף סדרות-שחור לסוף; גאולה: היפוך-אשכול קטן). **תיקון: data — לבנות sort_order מאוחד מ-`old_topic_pages.json` item order.**
3. **over-tagging:** ראש-השנה 10 מול ישן 2 (תייג שיעורי המועד; חסרים 2 הנכונים). **תיקון: לבנות מ-old (רק items הישנים).**
- **תוכנית L3 (build):** (a) frontend TopicPage render series_topics merged-by-sort_order + deploy; (b) `topic_listing.py` — לכל 127 נושאים: match old items (series+lessons) golden-key → כתוב `lesson_topics`+`series_topics` עם sort_order מאוחד 1:1, החלף קיים; (c) deploy+verify fan-out. נקיים במדגם: תשובה, משיח. כמעט: גאולה (אשכול), ירושלים (סדרה #1+dup).
- **גרounds:** `old_topic_pages.json` (127, items מסודרים type=series/lesson), `topic-manifest.json`, sample shots `/tmp/tverify/`.

## ✅✅ L4 (רבנים) — נבנה + הוחל + אומת חזותי (19.6.2026)
**מנוע חדש `rabbi_page_listing.py`** — rebuild ל-`rabbi_page_items` 1:1 מ-`oneone/old_rabbi_pages.json` (154 דפי-רב ציבוריים, items מסודרים: שיעור/סדרה/שו"ת). לכל item: סדרה→series (norm-title, מעדיף this-rabbi → lesson_count≈slc → published>category), שיעור/שו"ת→lessons (media-basename golden-key ואז norm-title, מעדיף this-rabbi). guards: empty-lesson, **dedup חוצה-קבוצה (used-set מועבר ל-resolve → קבוצות אותו-שם פולטות ישויות נפרדות)**, verify-before-apply (res≥0.8).
- **דרי-ראן: 132/154 בריאים (122 ב-100% רזולוציה), 0 unmapped.** הוחלו 132 (snapshot `rabbi_page_items_bak_l4_20260619`, 1463 שורות = מצב-אמת לפני L4). pools נטענים פעם אחת (throttle-safe).
- **אימות חזותי (2 batches = 22 סוכנים new מול old): 20 נקי + 1 minor_gap + 1 swap בלבד; 0 זיהום ו-0 תוכן-רב-זר בכל ה-22.** מנחם שחור 71/71 (over-attribution נמחק: 88→71), דנה סליי 0→7 + ורדית אביחי 0→5 (נבנו מאפס), נועם וידר 15→1, שנדורפי 103/103. עמנואל בן ארצי 46 (פער מול old=48 = שורות-כפולות בדף הישן).
- **באג שתוקן באימות החזותי:** סדרות אותו-שם (5× "עולמות חדשים בפרשה" ליוסף שילר) — rank greedy פלט 4 במקום 5 (collision→dup_skip). תוקן (used→resolve) → 16/16, אומת חזותית 5 כרטיסים.
- **⚠️ לקח אימות — "כרטיס ריק" = false-positive ב-RTL:** הסוכנים דיווחו "כרטיסים ריקים" פעמיים (יוסף שילר, ערן טמיר) — שניהם **שגויים**: בכרטיס RTL הכותרת מיושרת-ימין והחצי-שמאלי לבן, וווידג'ט הצ'אטבוט מכסה אותו → pixel-scan קורא "ריק". אומת ידנית בצילום שכל הכרטיסים מרונדרים עם כותרת. **הסיגנלים האמינים מהסוכנים = extra_in_new (זיהום) + תוכן-רב-זר; "missing/blank" לא-אמין תחת overlay.**
- **שאריות-אימות:** חגי ולוסקי minor_gap (1 שיעור-ריק = empty-lesson guard, legit). ושננתם swap (1/40: "ספר מלכים ב עם ביאור" → "קובץ שאלות עיון" — media-key תפס worksheet; **ושננתם=meta-תוכנית-מורים, לא רב ציבורי, כל 40 השורות teacher-flagged לסקירת יואב**).
- **✅ 21 דפי-רב "ריקים-בישן" — נחקרו ונסגרו (19.6):** ה-n_items=0 = **כשל-גרידה** (ה-URL ב-old_rabbi_pages השמיט "הרב" + דפי-רב JS-rendered). `rabbi_empty_rebuild.py` (headless `/tmp/scrape_rav2.cjs`, URL מ-`rabbis.name`): **יונדב זר = 38 סדרות תנ"ך-מוקלט** (rpi=38 כבר נכון; 1639-הפרקים בפולבק **לא** בשימוש — אומת חזותית). **שמעון לוי** = דף-ישן **שבור באמת** (200, 0 lessonBlocks) → פולבק מציג 191 שיעוריו האמיתיים (אומת חזותית; עדיף על שכפול דף-שבור). 19 הקטנים = דפי-ישן שבורים → פולבק=תוכן אמיתי. **כולם מציגים תוכן נכון, 0 over-attribution (שמעון לוי אומת ע"פ audio).** (b) מערכת בני ציון 6/8 = חידון-דיגיטלי (פריט-ניווט). (c) 6 שורות dual-audience teacher (ציר-זמן/ושננתם-ביאור) = legit §0.3.
- **דאטה-only, ללא deploy** (RabbiPage render כבר חי). **rollback:** `DELETE FROM rabbi_page_items WHERE sort_order<9000` ואז restore מ-snapshot.

### 🔬 L4 — אבחון מקורי (היסטורי, 18.6)
`RabbiPage`→`rabbi_page_items` (allow-list: rabbi_id/kind/series_id/lesson_id/sort_order) + fallback lessons-by-rabbi_id. **RabbiPage כבר חי — L4 לא דורש deploy.** `build_rabbi_manifest.py`→`rabbi-manifest.json`: **154/154 ממופים**, 133 עם תוכן, רק 10 עם |gap|>3 (רובם rpi>old — סריקת-ישן חלקית, ספירה לא-אמינה, חזותי=אמת). 2 חסרים אמיתיים: **דנה סליי + ורדית אביחי (לנשים)** old-items>0 אך rpi=0 (אולי fallback מציג). 21 רבנים עם 0 old-items. ground-truth `old_rabbi_pages.json`.
**אימות חזותי 8-מדגם: 5/8 נקי** (יואב, שנדורפי, יוסי-ברינר, אברהם-וסרמן, יוסף-שילר). 3 פערים:
- **🔴 מנחם שחור** — rpi (88) מכיל סדרות **שגויות/גנריות** (שולחן-שבת/כלל-ופרט) במקום 7 הסדרות שלו; רק 16 סדרות באמת שלו (אבל 347 שיעורים מיוחסים לו = over-attribution). **RabbiPage תקין** (`hasRpi`→rpi-only); הבעיה ב-rpi DATA.
- **דנה סליי (לנשים)** — rpi=0, fallback מציג 2/7. צריך לבנות rpi.
- **עמנואל בן ארצי** — מינורי: 46/48, חסרים 2 שיעורי "ציר זמן" (26 סדרות+20 שיעורים תואמים 1:1).
**מסקנת L4: RabbiPage render תקין (rpi-only); צריך מנוע rebuild ל-`rabbi_page_items` מ-old_rabbi_pages** (match old-items golden-key → rpi בסדר נכון, replace). זהירות: over-attribution (rabbi_id לא אמין למנחם-שחור) → match לפי כותרת מעדיף this-rabbi. **דאטה-only, בלי deploy.** ~38% מהמדגם דרשו תיקון → להריץ על כל 154.

## ✅ חסם deploy — נפתר (19.6.2026)
**סער הביא טוקן Vercel חדש ללא פג-תוקף** (`vcp_56e5L3...`, scope saars-projects, ב-`api-keys.md` § Vercel). אומת על user+bneyzion project. **api-keys.md הוצא מ-git** (`git rm --cached` + `.gitignore` `**/api-keys.md`) כי הטוקן קבוע — הטוקנים הישנים עדיין ב-history (לרענון ע"י סער).
**L3 deploy בוצע:** `npx vercel deploy --prod --yes` → **dpl `G3QSomdm3sGDiaxUiwqsbdzQzWi1` READY, aliased ל-`bneyzion.vercel.app`**. אומת חי — דף-נושא מציג כעת כרטיסי-סדרה (דוד המלך: 4 סדרות-תחילה + 54 שיעורים). 0 רגרסיה (בית/רבנים/ספר/סדרות אומתו). **rollback:** `npx vercel alias set bneyzion-3l26l2s7q-saars-projects-4508d6bb.vercel.app bneyzion.vercel.app` (dpl_AFPNbC82). **דפוס deploy:** `export VERCEL_TOKEN/ORG_ID/PROJECT_ID + HTTP_PROXY="" NO_PROXY="*"` ואז `vercel deploy --prod --yes` (alias אוטומטי).

## 🆕 עדכון 18.6 (אחה״צ) — סשן "72 שעות": 2 באגי-מנוע תוקנו + מצב אמיתי
**שני באגים ששיבשו בשקט את ייחוס-הרב והאימות בכל ספרי הנביאים — תוקנו:**
1. **נרמול-גרש בשער-הרב** (`verify_book.py`): ה-audit השווה שם-רב בלי לנקות גרש/ניקוד → 52+ false-positives. תוקן (עובר דרך `rb_norm` הקנוני). **13→19 ספרים עוברים, אפס DB.** נוסף `--data-only` (בלי Chrome) + `reaudit_all.py`.
2. **⭐ URL יחסי שובר גרידה** (`old_listing.py`): hrefs של פורמט נביאים היו **יחסיים** (`/מאגר-...`) → curl `rc=3` → מפת-מחברים ריקה → `fix_lesson_rabbis` החזיר "0 תיקונים" **מזויף** לכל ספרי הנביאים (וגם ב-runall 03:00!). תוקן: `_abs()` ב-`old_listing` (משרת את כל המנועים) + `fix_lesson_rabbis` גורד **כל** הסדרות (לא join לפי sort_order שהיה שביר). אומת: שמואל-ב `0,0`→`115 audio/182 title, 11 fixes`.

**מצב אמיתי אחרי התיקונים (reports/RABBI-TRUTH.json):** 101 תיקוני-רב אמיתיים ב-11 ספרים (0 unresolved): שופטים 26, יחזקאל 17, שמואל-א 13, יהושע 12, שמואל-ב/ירמיהו 11, בראשית 4, מלכים-ב/יונה/מיכה 2, נחום 1. **מוחל כעת** (snapshot `lessons_rabbi_bak_before101_20260618`).

**⚠️ דוח-המאסטר (VERIFY-1to1-MASTER) = השערה, לא אמת. כל תיקון עובר אימות מול האתר הישן.** טעויות שנתפסו: דניאל "ארבע מלכויות" **כן בישן** (לא זיהום); בראשית "האמת והשלום אהבו"=**צבי קוסטינר** (לא שפירא); יהושע "השונמית"=למעשה **"ושננתם"** (קריאת-כתב שגויה בדוח).

**מילויי-NULL שהוחלו (חי):** עובדיה פרק א→יונדב זר · האמת והשלום אהבו→צבי קוסטינר (snapshot `lessons_nullfill_bak_20260618`).

**🔑 באג 3 — סינון-קהל יותר-מדי-מחמיר (`public_book_listing._aud`):** ה-pool הציבורי החריג **כל** סדרה עם תג `teachers`, כולל דו-קהליות לגיטימיות שמופיעות בדף הציבורי הישן (ושננתם, כלי-עזר, ציר-זמן). תוקן ל-`_aud()`: מחריג רק teacher-**בלעדי** (teachers בלי general). הפצה בטוחה — אומת **0 דליפת teacher-exclusive בכל 37 הספרים** (`reports/REAPPLY-DRY.json`), 5,033 דפי-העבודה הבלעדיים נשארים חסומים.

**מצב L1 אחרי הסשן (18.6 אחה״צ):**
- **101 תיקוני-רב הוחלו** (snapshot `lessons_rabbi_bak_before101_20260618`), אומת `fixes=0` בכל הספרים.
- **4 ספרי "סדרה חסרה" נסגרו** דרך תיקון-הקהל (לא scrape — התוכן כבר היה ב-DB, רק לא מוצג): רות **8/8 נקי** · שופטים **17/17** · שמואל-ב **10/10** · יהושע **13/14** (14=מפת-עזר 0-שיעורים, השמטה לגיטימית). series flip ל-published: רות+יהושע ושננתם (`series_status_bak_20260618`).
- **9 ספרים re-applied** (שמות/דברים/שמואל-א/מלכים-ב/זכריה/מלאכי/אסתר/דניאל/עזרא) — צפו דו-קהליים: ושננתם + **ציר זמן גלות בבל** (סוגר את רוב #10 — לא היה חסר, רק מסונן). עזרא re-order מטופל אגב (המנוע פולט בסדר הישן).
- **#4 דניאל "ארבע מלכויות" = לא זיהום** (כן בישן, נשאר). **#3/#4/#8 סגורים. #10 רובו סגור.**

**נותר ב-L1:** (a) **במדבר קופרמן 19 PDF = הגרידה האמיתית היחידה** (series `48adc2eb`, 0 שיעורים → scrape `/media/N/*.pdf` → rehost Storage כלל-13 → insert, author=הרב יהודה קופרמן זצ״ל). (b) ישעיהו **"לב הפרק"** = שיעור-בודד ריק (בלי מדיה) — המנוע מפיל אותו ב-guard; הוסף ידנית היום → **לא re-apply ישעיהו** עד backfill תוכן. (c) חגי ציר-זמן + שמואל-ב standalone (#10 שארית). (d) בראשית 27/28 = סדרת-אגרגציה 0-שיעורים (השמטה לגיטימית, לאמת). (e) **#7 author-גלוי** (8 כרטיסים — לאמת מול הישן, חלקם תוקנו ב-101). (f) **#11 אימות-על ויזואלי**.

**גרידה כבדה (scope סופי):** רק **במדבר קופרמן (19 PDF)**. רות/יהושע/מלכים-ב — התוכן כבר היה, נסגר בלי scrape.

### ✅ L1 — sign-off ויזואלי (פאן-אאוט 37 סוכנים, new מול old)
**29/37 נקי לחלוטין 1:1.** + תיקוני author-בודד (`fix_lesson_rabbis` הורחב לכלול שיעורים-בודדים בליסטינג): **במדבר 7 · מלכים-א 3 · תהלים 2** הוחלו ואומתו (snapshot `lessons_rabbi_bak_standalone_20260618`). קופרמן 19 PDF חי, במדבר 23/23, חגי 17/17.

**שארית L1 (לא חוסר-תוכן — עידונים/החלטות, מתועד):**
- **שמואל-א** (המשמעותי): הישן = 2 סדרות "ספר שמואל א" (דני סטיסקין 8 + טוביה לפשיץ 27); המיגרציה **מיזגה** ל-35 (=27+8) ואיבדה את סדרת דני-סטיסקין. דרוש series-split → **החלטת יואב/סער** (לא למזג/לפצל אוטומטית, מסוכן).
- **בראשית** "שיעורים על התנ"ך - בראשית": 4 השיעורים (בן שחר) **קיימים ומוצגים** תחת סדרה-אחות "אורות מודיעין" — כפילות-שם, לא חוסר-תוכן.
- **ישעיהו**: "ארבעה נביאים" (עותק ישעיהו ריק לגמרי) + "לב הפרק" כפילות-ריקה → guard מסיר כרטיסים ריקים כראוי.
- **ויקרא** "מאוהל מועד" (יוסף שילר, bible_book=NULL+סיומת-כותרת) · **מלכים-א** "מרד אדוניהו"/"בין משכן" (עותקי-draft) — עידוני שיעור-בודד.
- **legit-omit:** יהושע "מפות עזר" (0-שיעורים, לא ב-DB) · ישעיהו "לב הפרק" כפילות-ריקה.

**מסקנה: תוכן L1 = 1:1 בכל 37 הספרים.** צילומי new+old ב-`/tmp/verify/{ספר}-{new,old}.png`.

### ✅✅ L1 — חתום (18.6 ערב)
- **שמואל-א split בוצע** (סער: "כמו בישן"): סדרת "ספר שמואל א" הממוזגת (35) פוצלה ל-**דני סטיסקין 8 + טוביה לפשיץ 27** (`split_shmuel_a.py`, snapshot `shmuel_split_bak_20260618`, סדרת-דני חדשה `1cad6653`). המנוע פולט את שתיהן בסדר הישן.
- **שדרוג מנוע כללי:** `teachers_reconcile.match()` עכשיו **author-aware לכותרות-כפולות** (כשכמה סדרות חולקות כותרת — מעדיף את זו שהרב שלה תואם למחבר בישן). פותר סדרות ממוזגות/מפוצלות בכל ספר.
- **re-scan 37 נקי:** 0 דליפת teacher-exclusive, שמואל-א 85/0, אפס רגרסיה. רק ישעיהו gaps>1 (עותקי-לב-הפרק ריקים + ארבעה-נביאים עותק-ריק — guard מסיר כרטיסים ריקים כראוי).
- **שארית L1 (עידונים בלבד, לא חוסר-תוכן):** בראשית כפילות-שם ("אורות מודיעין"), ישעיהו/ויקרא/מלכים-א עותקים-ריקים/סיומת-כותרת. כולם low-value.

### 🔜 L2 (סקשנים) — design פתור, מוכן לבנייה
- **מפתח התצוגה:** `CategoryPage.tsx` קורא `teacher_listing_items scope='public_book' key=<כותרת-הצומת>` (אותו scope כמו ספרים!). אז ה-driver מריץ את מנוע node_pool לכל צומת-סקשן ומחיל עם `key=<node title>`.
- **צמתי-שורש חדשים:** מועדים `92130154`(15 ילדים/55) · נושאים-כלליים `2d6d28c1`(23/97) · הפטרות `3327c721`(8/31, 3-רמות) · ימי-עיון `f4040001`(6/204) · איך-לומדים `62590949`(8/1) · כלי-עזר `27ca7dec`(1/15) · ליווי `7cbd261e`(1/0,dual).
- **גאפ ל-driver:** ה-ground-truth של סקשנים **לא** ב-old_listings JSON (רק ספרים) → צריך loader שגורד את דף-הסקשן הישן (URL מ-`oneone/old_sidebar_tree.json`, 894 לינקים) ומזין כ-old-items ל-build_book. הפטרות = 3 רמות (root→הפטרה→שיעורים).
- **דפוס אימות:** זהה ל-L1 — `verify_books_workflow.js` (פאן-אאוט סוכנים new מול old).

### 🔨 L2 — נבנה+הוחל (18.6 ערב)
- **`section_listing.py`** — גורד דף-סקשן ישן → `parse_section_page` → `build_book(node_pool=True, old_override=)` → מחיל `scope='public_book' key=<node title>`. guards: empty+leak, verify-before-apply לכל עלה. manifest: `build_section_manifest.py`→`section-manifest.json` (125/130 עלים ממופים).
- **הוחל: 122/125 עלים ב-1:1 מדויק** (emit==old, 0 empty, 0 leak). `verdicts`→`reports/section-listing-verdicts.json`.
- **🔴 באג שתוקן — `bible_book` על צמתי-סקשן:** `CategoryPage` משתמש ב-`bible_book||title` כמפתח-ליסטינג. 9 צמתי-הפטרה/ליווי נשאו `bible_book` (בראשית/שמות/...) → הציגו את **כל הספר** במקום ההפטרה. נוקה (`section_biblebook_bak_20260618`). הפטרת-בראשית עכשיו 4 שיעורים (אומת חזותית).
- **sign-off חזותי (15 עלים):** 8/15 נקי (היה 0/10 ב-heuristic!). שאר הדגלים: author-בודד בסקשנים (חנוכה/פורים/הפטרת-נח/נבואה-ונביאים) → `section_rabbi_fix.py` (גורד author מהדף הישן, resolve→fix). missing-בודד (הגישה 4, בית-המקדש 2 שו"ת). 
- **`section_rabbi_fix.py` הוחל — 36 תיקוני author-בודד בסקשנים** (TITLE-primary! audio גרם false-positives כמו הגעגועים→ונגרובר; titles ~ייחודיים בדף-סקשן). 71→36 אחרי flip. snapshot `lessons_rabbi_bak_section_20260618`. חנוכה/פורים/נבואה-קופרמן אומתו.
- **שארית L2 (עידונים):** 3 SKIP_EMPTY_OLD (אוסף-מקורות/הדרכות=דפי-טקסט, הפטרת-וילך=פורמט-אחר) · 2 gaps (שבועות 38/39, כלי-עזר 16/20) · שו"ת-type לא-נפלט (בית-המקדש 2; ה-parser תופס lessonBlock/SeriesBlock, לא שו"ת-בלוקים) · הגישה 4 שיעורים-בודדים · 2 author unresolved. כולם low-value/מתועדים.
- **L2 ≈ הושלם:** 122/125 עלים 1:1 + באג-bible_book + 36 author. דפוס=L1.

## ✅ ספירת-שיעורים שגויה+תקועה — תוקן רוחבית (19.6, סער השווה old/new בסייבר)
**תקלה:** ספירת "X שיעורים" על כרטיסי-סדרה ובסיידבר-נושאים לא נכונה ולא מתעדכנת. **2 שורשים:**
1. **`series.lesson_count` = שדה תקוע** (מ-gap1 "lesson_count≠ספירה"; הדדופ הגדיל פער). הכרטיס מציג שדה, הדף מציג allow-list. **תוקן:** recompute `lesson_count` = **ספירה-מוצגת** (allow-list plain-key אם קיים, אחרת published-non-empty). 108 סדרות תוקנו (תהילים 168→156, איוב 93→42, יהושע 26→25). snapshot `series_lessoncount_bak_20260619`. **+ trigger `sync_lesson_count_on_lesson`** (allow-list-aware) → **מתעדכן אוטומטית** בכל שינוי-שיעור (אומת: נגיעה בשיעור→count נשאר נכון). מכסה גם **אגף-מורים** (משתמש ב-lesson_count, `.gt(0)` לסינון).
2. **סיידבר-נושאים ספר רק lesson_topics (שיעורים), לא series_topics (סדרות)** → נושא של סדרות-בלבד (האזנה-לפסוקים: 0 שיעורים+55 סדרות) הראה 0. **תוקן ב-`useTopicsSidebar.ts`** — סופר lessons+series (כמו עמוד-הנושא). live-computed (מתעדכן אוטומטית). deploy `bz_deploy4`.
**הדדופ לא פגע במיגרציה** (אומת: 0 dangling בכל allow-list/rpi/lesson_topics, יהושע 25 תקין).

## ✅ audit מקיף כל-האתר — COPY-duplicates + כרטיסים ריקים (19.6, "שלא נתבזה")
**אחרי תיקון המוקלט, סער ביקש audit על מחלקת-התקלה בכל האתר.** ממצאים+תיקון:
- **A. COPY-duplicates (אותה סדרה + אותה כותרת-בסיס modulo "(N)" + אותו audio):** 155 שיעורים כפולים ב-60 סדרות (יחזקאל פרק יח ×22, ושננתם, פרשות וכו'). **תוקן** (`dedup_copy_lessons.py` + `/tmp/dedup_apply.sql`): keep-קנוני אחד לכל קבוצה (מעדיף referenced→clean-title→has-content), השאר→`status='draft'` (reversible). **231 הפניות (tli/rpi/lesson_topics) הוסבו לקנוני** (audio-twin ואז title-twin) → **0 dangling, 0 COPY-dups נותרו.** snapshot `lessons_status_bak_dedup_20260619`. הבחנה: גרסאות-שונות (audio שונה) ופיצולים לגיטימיים **לא נגעו** (דרושה זהות כותרת+audio).
- **B. כרטיסים ריקים (43 שיעורים בלי content+media+attachments):** מרנדרים כרטיס-מת. **תוקן בפרונט** — empty-guard ב-`useLessonsBySeries` (לא מרנדר שיעור בלי תוכן; reversible — backfill→חוזר). + **frontend copy-dedup safety-net** (אותו audio+כותרת-בסיס) שמונע COPY-dups עתידיים אוטומטית. deploy `bz_deploy3`.
- **לא-תקלות (לא נגעו):** dup-chapters עם audio/רב שונה (גרסאות/מרצים שונים = לגיטימי); 38 כותרות-"(N)" שנותרו (קנוניים, קוסמטי); 32 ריקים שאולי content-missing (החלטת backfill של סער).

## ✅ תיקון סדרות תנ"ך-מוקלט — שיעור-כפול בכל סדרה (19.6, סער תפס בסייבר)
**תקלה:** סדרות "תנ"ך מוקלט"/"קריאה וביאור" הציגו N+1 שיעורים מול הישן (למשל יהושע 26 במקום 25). שורש: **COPY-duplicates של המיגרציה** — פרק משוכפל עם סיומת "(N)", או "פרק (10)" מעוות עם אודיו של פרק אחר (joshua-01 לפרק י). **12 סדרות תוקנו** (`--all` על 78): איוב 93→42, ישעיהו 87→36, יחזקאל 79→46/57→35, מלכים-א 31→23, תהילים 168→156, שמואל-ב 31→25, ועוד. אומת חי: יהושע 25, ישעיהו 36, איוב 42. (2 שאריות לא-תקלה: ירמיהו-מוקלט-ללא-טעמים 0 dups; בראשית-מוקלט-ללא-טעמים placeholder ריק.)
**תיקון:** `fix_recorded_series.py` — allow-list `series_lessons` 1:1 (גורד דף-סדרה ישן דרך רבני-המוקלט יונדב/דן-בארי/חנניה/מערכת/לוי, מתאים audio-golden-key→title, מחיל teacher_listing_items). הכפולים לא בדף-הישן→מוחרגים; פיצולים לגיטימיים (ירמיהו "התחלה/המשך") **נשמרים** (removes 0). **emit==old, 0 unres בכל הסדרות.** אומת חי: יהושע 26→25, ישעיהו 87→36. **data-only** (useLessonsBySeries כבר קורא allow-list — אין deploy). snapshot `tli_series_lessons_bak_recorded_20260619`. **לא נמחק שום שיעור** (allow-list בלבד, reversible). scraper `/tmp/scrape_series.cjs`.

## 🎮 מבחן-המיגרציה הגדול (380+ סוכנים) — תשתית (19.6)
מבחן רוחבי: גורד את **שני האתרים** (ישן+חדש) ומשווה כל צומת, סוכן-שיפוט לכל צומת מציף תקלות אמיתיות.
- **work-list:** `mtest_build_worklist.py` → `mtest-worklist.json` (443 צמתים: 127 נושאים + 154 רבנים + 37 ספרים + 125 סקשנים, כל אחד old_url+new_url).
- **חילוץ:** `mtest_extract.cjs <url>` — extractor אחיד (ישן=`.lessonBlock`, חדש=`a[href^="/series/"|"/lessons/"]`) → items[{title,rabbi,count}]. `mtest_extract_all.py [workers]` — ThreadPool, גורד 443×2 → `/tmp/mtest/<safe>.json`.
- **diff:** `mtest_diff.py` — נרמול-עברית (niqqud/(N)/גרש) → `/tmp/mtest_diff/<safe>.json` (missing_in_new/extra_in_new/count_mismatch).
- **שיפוט:** workflow `migration-big-test-wf.js` — סוכן לכל צומת קורא את ה-diff ו**שופט** (תקלה אמיתית מול לגיטימי לפי חוקי-המיגרציה: scrape-miss, dual-audience, teacher-worksheets, splits). schema: status(clean/minor_gap/defect)+severity+real_pollution+real_missing+count_problems. **הסוכנים לא נוגעים ב-API (אין throttle)** — קוראים JSON מקומי.
- **הרצה:** `python3 mtest_extract_all.py 8` → `python3 mtest_diff.py` → `Workflow({scriptPath:migration-big-test-wf.js, args:<worklist-meta>})`. תוצאות→defects מקובצים לפי severity/type.

## 🔧 המנועים (כל הקבצים ב-`scripts/parity/`)
טוקן Supabase ב-`sbq.py` (project pzvmwfexeiruelwiujxn). הרצה: `python3 <engine> ...`.

1. **`old_listing.py`** — לואדר אחיד לדף-הספר/סקשן הישן (שני פורמטים: torah_ketuvim=sub_links-dicts+items; neviim_moadim=items עם type/order/author/meta/media). `load_book(name)`→(url,rows[kind,title,author,length,url,media]). `find_page` מעדיף דף קנוני (segs[-2]∈{תורה,נביאים,כתובים}, העשיר). `series_urls(book)`→{order_index:{title,url}}.
2. **`public_book_listing.py`** — דף-קטגוריה ציבורי 1:1. `build_book(book, node_id=None, node_pool=False)`: old→match→allow-list `teacher_listing_items` scope='public_book' key=<שם>. **node_pool=True + node_id** → סקשנים (pool מבוסס-צומת, לא bible_book). guards: מחריג סדרות/שיעורים ריקים + שיעור-פנטום שמסתיר סדרה (מעדיף סדרה-עם-שיעורים). `--book X --apply`.
3. **`series_lesson_listing.py`** — שיעורים **בתוך** סדרה 1:1. גורד דף-סדרה ישן, מתאים כל שיעור לפי **audio basename** (מפתח-זהב → מחריג מתחזים), allow-list scope='series_lessons' key=<series_id> (או `<series_id>|<book>` לסדרות כלל-תורתיות משותפות — `series_is_shared`). guard: מחריג שיעורים ריקים. `--book X --apply`.
4. **`fix_lesson_rabbis.py`** — ייחוס-רב 1:1: גורד `div.author` מהדף הישן, פותר לרב אמיתי יחיד, `UPDATE lessons.rabbi_id` (חובה `::uuid` cast!). אומת מול audio-path. גיבוי `lessons_rabbi_bak_*`. `--book X --apply`.
5. **`run_book.py "<book>" [--apply]`** — מתזמר את 3 המנועים לספר אחד עם **שער verify-before-apply מדורג** (public→series→rabbi). חוסם על שגיאת-רינדור (שיעור ריק נפלט); פער-תוכן אמיתי מדווח ב-gaps ולא חוסם. מחזיר `VERDICT {json}`.
6. **`run_all.py --workers N`** — צי על כל הספרים, קצב מבוקר (throttle!). verdicts→`runall-verdicts.jsonl`, progress→`runall-progress.log`. **workers=2-3 בלבד** (Supabase management API חונק חזק).
7. **`verify_book.py "<node>"`** — יחידת-אימות: data-audit (series new vs old-live, rabbi-vs-audio, emptiness) + 2 צילומי-עמוד-מלא ל-`/tmp/verify/`. מחזיר `RESULT {json}`. דורש `verify-manifest.json` (book→node_id+old_url+new_url).
8. **`fullshot.cjs`** — צילום עמוד-מלא: `CHROME_BIN=<chrome-headless-shell> node fullshot.cjs <url> <out.png> [width]`. playwright-core (בריפו) + chrome-headless-shell במטמון puppeteer.
9. **`real_parity.py`** — מנוע פאריטי node-by-node (ישן). `_global_public` ב-public_book_listing מקושקש לקובץ `_global_public_cache.json` (חמם לפני צי גדול!).
11. **`topic_listing.py`** (L3) — rebuild ל-`lesson_topics`+`series_topics` 1:1 מ-`oneone/old_topic_pages.json`, sort_order מאוחד, מחריג teacher-tagged, disambig לפי רב-ישן. מייבא pools מ-`rabbi_page_listing`. snapshots `*_bak_l3_20260619`. `--topic "<substr>"`, `--apply`, `--min-res`. **sleep 0.6s בין נושאים (management API חונק — אל תוריד!).**
10. **`rabbi_page_listing.py`** (L4) — rebuild ל-`rabbi_page_items` 1:1 מ-`oneone/old_rabbi_pages.json`. pools נטענים פעם אחת (series active/published/category + lessons published, אינדקס media-basename + norm-title; **גם is_general** ל-dual). `resolve_item(it,rid,pools,used)` — used-set מונע collision בקבוצות אותו-שם. `--rabbi "<substr>"` (verbose), `--apply`, `--min-res 0.8`. plan→`rabbi-page-listing-plan.json`. אימות: `rabbi_sample_shots.py` (new+old→/tmp/rverify) + workflow `rabbi-1to1-visual-verify`.
12. **`rabbi_empty_rebuild.py`** (L4 empty-old) — לדפי-רב ש-old_rabbi_pages החזיר n_items=0 (כשל-גרידה: URL בלי "הרב" + JS-render). headless `/tmp/scrape_rav2.cjs` (URL מ-`rabbis.name`), resolve series-by-slug-title + lessons-by-media/title, רושם rpi. גילה: יונדב זר=38 סדרות-מוקלט (לא 1639); שמעון לוי=דף-ישן שבור→פולבק תקין.
13. **`fix_recorded_series.py`** (תנ"ך-מוקלט) — allow-list `series_lessons` 1:1 לסדרות-מוקלט עם שיעורים-כפולים. גורד דף-סדרה ישן (URL מרבני-המוקלט: יונדב/דן-בארי/חנניה/מערכת/לוי דרך `/tmp/scrape_series.cjs`), match audio→title, מחיל. `--all` (כל 78), `--apply`, `--only`. snapshot `tli_series_lessons_bak_recorded_20260619`. 12 סדרות תוקנו.
14. **`dedup_copy_lessons.py`** (audit כל-האתר) — מסיר COPY-duplicates (אותה סדרה+כותרת-בסיס+audio). keep-קנוני, השאר→draft, מסב הפניות. **בפועל הורץ דרך `/tmp/dedup_apply.sql`** (window-function + temp-table בטרנזקציה אחת, throttle-safe) + `/tmp/repoint2.sql`+`/tmp/repoint3.sql` להסבת 231 הפניות. snapshot `lessons_status_bak_dedup_20260619`. 155 כפולים→draft, 0 dangling.

## 🚦 לקחים קריטיים (אל תחזור על הטעויות!)
- **כל סוג-צומת = מנוע משלו + ground-truth משלו.** ספרים≠סקשנים≠נושאים≠רבנים.
- **`UPDATE rabbi_id` חייב `::uuid`** (אחרת "type uuid but expression text", נכשל שקט).
- **ישויות-HTML** בכותרות הישנות (`&#39;`) → `html.unescape` לפני norm, אחרת ההתאמה נכשלת.
- **`find_page` חייב דף קנוני** — היו 33 דפים עם "שופטים" בסוף ה-URL; בחר ליווי-תתים (1 סדרה) במקום נביאים/שופטים (17).
- **throttle**: management API חונק; cache ל-_global_public + workers≤3 + retry בכל q().
- **data-driven = live-on-write** → verify-before-apply תמיד.
- **לבדוק את המסע המוצג בפועל** (לפתוח modal, לקרוא שם-הרב) — לא רק מבנה/ספירה. (יואב תפס "הרב יצחק בן ישראל" פנטום בכל סדרת "מבט מגבוה".)
- **צילום עמוד-מלא, לא ראש-הדף** (preview_screenshot תופס רק viewport; השתמש ב-fullshot.cjs).
- **רב-פנטום**: שיעורים מיוחסים לרב שלא-קיים-באמת (audio מוכיח). תוקנו 114 בשמות, 57 בראשית וכו'. הפנטום "יצחק בן ישראל"=11087a99 → יואב אוריאל; עוד 5 שיעורים שלו בספרים אחרים לתקן.
- אל תסמוך על קבצים גנריים ב-`/tmp/verify/` (new_lessons.png וכו') — רק PNG עם שם-ספר.
- **(19.6) dual-audience = "has general", לא "not teachers".** teacher-EXCLUSIVE=`{teachers}` בלבד (מוסתר); dual=`{teachers,general}` (ציבורי). 0 שיעורים בלי tag → `.cs.{general}` שקול ל-"not exclusive" בלי לדלוף worksheets. ראה `src/lib/publicAudience.ts`.
- **(19.6) דפי-רב ישנים JS-rendered + URL בלי "הרב"** → גרידת-curl מחזירה n_items=0 מזויף. השתמש headless (`/tmp/scrape_rav2.cjs`) + בנה URL מ-`rabbis.name` (לא מ-old_rabbi_pages.url).
- **(19.6) COPY-duplicates = אותה סדרה + אותה כותרת-בסיס(modulo "(N)") + אותו audio.** dedup רק על שלושתם יחד — `dup-chapter` לבד לא תקלה (גרסאות/מרצים שונים=audio שונה). לפני draft של כפול: **הסב את כל ההפניות (tli/rpi/lesson_topics) לקנוני** אחרת הרשימות מאבדות שורה (audio-twin ואז title-twin).
- **(19.6) "כרטיס ריק" אמיתי = שיעור בלי content+media+attachments** (43 כאלה). empty-guard ב-`useLessonsBySeries`. (שונה מה-false-positive של RTL — שם הכותרת קיימת.)
- **(19.6) THROTTLE — אל תריץ 2 jobs כבדים במקביל על management API.** L3-apply נכשל ב-מחצית כשרץ עם teachers-parity במקביל. סריאלי + sleep 0.6s. dedup גדול = טרנזקציה אחת (temp-table+window) במקום לולאת-queries.

## 📋 24 הספרים עם ממצאים (מתוך reports/VERIFY-1to1-MASTER.md)
- **missing-series (תוכן חסר ב-DB)**: במדבר(קופרמן 0-lessons), יהושע(ושננתם 24), שופטים+שמואל-ב(ושננתם status=active→flip), ישעיהו(לב-הפרק), רות(ושננתם).
- **missing-lessons בתוך סדרה**: מלכים-ב(41↔61), משלי(28↔30).
- **missing-standalone (PDF/ושננתם)**: שמואל-ב, חגי+זכריה(ציר-זמן-גלות-בבל), דניאל(2).
- **pollution**: דניאל('ארבע מלכויות' הרב ידיד — לא בישן).
- **wrong-order**: עזרא-ונחמיה (chapter-cards לפני סדרות; להחזיר series-first).
- **author-visible**: שמואל-א, מיכה, תהלים, דניאל, דברי-הימים.
- **rabbi-mismatch**: 20 ספרים. רוב = ארטיפקט (גרש ׳ לא מנורמל / audio-מאוחסן-אצל-רב-אחר=תקין). אמיתיים (H1): שמואל-ב 12, שמואל-א 9, שופטים 16, ירמיהו 6, יחזקאל 7... → הרץ `fix_lesson_rabbis` (צריך נרמול-גרש + טיפול ב-NULL-author).
- **שיפור-בדיקה נדרש**: הוסף נרמול-גרש ל-rabbi audit; ה-audit סופר רק סדרות → עיוור לשיעורים-בודדים-חסרים (חגי/זכריה dataPass=true למרות חוסר) — הוסף ספירת-שיעורים.

## 🗺️ רוד-מאפ ל"סיימנו" — **כל L1-L5 הושלמו (19.6)**
1. ✅ **סקשנים L2** — 122/125 הוחל 1:1 (`section_listing.py`) + 36 author-fix; 3=SKIP_EMPTY legit.
2. ✅ **L1 ספרים** — חתום 1:1 (101 תיקוני-רב, שמואל-א split, קופרמן 19PDF, ושננתם flips). שאריות=עידונים מתועדים.
3. ✅ **מנוע נושאים** (127) — **הושלם+פרוס+אומת 19.6** (`topic_listing.py`, 127/127 + dual-audience + deploy + 11/11 ויזואלי + audit 0-issues).
4. ✅ **מנוע רבנים** (154) — **הושלם 19.6** (`rabbi_page_listing.py`, 132 + 21 empty-old, 34 מדגם ויזואלי + audit מלא).
5. ✅ **אגף מורים re-verify** — `teachers_parity.py --watch`: 35/35 ספרים יציב.
6. ✅ **אימות-על** — 45 צמתים ויזואלי (34 רבנים+11 נושאים) + audit-נתונים מלא (rpi/topics: 0 blank/dangling/teacher-leak/dup) + audit כל-האתר (COPY-dup→0).
**נותר רק החלטות-תוכן של סער/יואב:** 6 שורות dual-audience-teacher · 30 recoverable-מורים · 32 ריקים אולי content-missing · 38 כותרות-(N) קוסמטי · 2 over-attribution (שמעון לוי/יונדב — נחקרו, תקינים).

## 💾 גיבויים / rollback
**גיבויי 19.6 (הסשן הזה):**
- `rabbi_page_items_bak_l4_20260619` (1463 — מצב rpi לפני L4). rollback: `DELETE FROM rabbi_page_items WHERE sort_order<9000` + restore.
- `lesson_topics_bak_l3_20260619` + `series_topics_bak_l3_20260619` (מצב נושאים לפני L3).
- `tli_series_lessons_bak_recorded_20260619` (allow-list series_lessons לפני תיקון-מוקלט).
- `lessons_status_bak_dedup_20260619` (23,311 id+status לפני COPY-dedup). rollback: `UPDATE lessons l SET status=b.status FROM lessons_status_bak_dedup_20260619 b WHERE l.id=b.id` (מחזיר 155 ל-published).
**גיבויי 18.6 וקודם:**
- `teacher_listing_items_bak_fullrun_20260618` (1771) · `lessons_rabbi_bak_fullrun_20260618` (23,292) · `teacher_listing_items_bak_public_20260617` · `lessons_rabbi_bak_20260617b`. ענף גיט: `backup/dirty-tree-2026-06-17`.
- **rollback deploy**: `npx vercel alias set bneyzion-3l26l2s7q-saars-projects-4508d6bb.vercel.app bneyzion.vercel.app` (dpl_AFPNbC82 — לפני 19.6).

## 🚀 פריסה
**אין צורך ב-deploy לכל צומת** — הקוד גנרי+חי; כתיבת-DB מתבטאת מיד. deploy חדש רק אם משנים **קוד** (hooks/דפים). **טוקן Vercel חדש ללא פג-תוקף ב-`api-keys.md` § Vercel (saars-projects)** — אומת על bneyzion project. `vercel deploy --prod --yes` עושה alias אוטומטי לפרודקשן:
```
cd /Users/srhlq/Downloads/saar-workspace/bneyzion
export VERCEL_TOKEN=<api-keys.md §Vercel> VERCEL_ORG_ID=team_AQm7yu5xy862A0d8SDFSl9rI VERCEL_PROJECT_ID=prj_P2KNzQJKsnpF1ZXShOBH3XL03c2x
export HTTP_PROXY="" HTTPS_PROXY="" NO_PROXY="*"
npm run build && npx vercel deploy --prod --yes   # alias ל-bneyzion.vercel.app אוטומטי
```
**deploys 19.6 (אחרון חי):** `bneyzion-m4p3ugfty` (empty-guard+copy-dedup) ← `bneyzion-9jq2u8ocd` (dual-audience) ← `G3QSomdm` (L3 TopicPage). rollback ל-`bneyzion-3l26l2s7q` (dpl_AFPNbC82).
**קוד-frontend רלוונטי:** `usePublicBookListing.ts` (card count=allow-list) · **`useLessonsBySeries.ts` (allow-list→fallback + empty-guard + copy-dedup, key `id|book`)** · **`TopicPage.tsx` (dual-audience `.cs.{general}`, merge series_topics+lesson_topics)** · `useTopicsSidebar.ts` (dual `.cs.{general}`) · `RabbiPage.tsx`+`useRabbi.ts` (rpi-driven) · `CategoryPage.tsx` (?book) · `DesignPreviewSeriesPageV2.tsx` (?book). **`src/lib/publicAudience.ts`** = הסבר מדיניות dual-audience.
