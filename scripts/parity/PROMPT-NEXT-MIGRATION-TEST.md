# 🎯 פרומפט — מבחן-המיגרציה הבא + שלבים הבאים (בני ציון)

> העתק-הדבק את הבלוק הזה לסשן חדש. הוא מניח את הבסיס של 19-20.6.2026 ולא נסוג ממנו.

---

**משימה: השלב הבא של מבחן-המיגרציה הגדול של בני ציון. קרא קודם את `bneyzion/scripts/parity/SESSION-20260619-ROUTING-BASELINE.md` ואת כללי-הזהב 1-11 בסוכן `bneyzion-migrator`. הבסיס החי = commit `b4631c76`, deploy `dpl_7Zav`. אל תיסוג ממנו (section-child→/category, שורש=כפתור).**

**מתודולוגיה (חובה):**
- **דטרמיניסטי לפני סוכנים.** השתמש ב-`mtest_deep_completeness.py` (golden-key אודיו), `mtest_pollution_scan.py` (זיהום-פנים-סדרתי), ובדיקות-DB — הם אמינים. סוכנים רק לשיפוט-מקרים-עמומים.
- **סוכנים תמיד batched** (~12/סוכן). לעולם לא 443 סוכנים מקבילים (שורף rate-limit; ראה כשל סבב-1). 0 throttle עם batching.
- **כל שינוי-DB → snapshot table קודם. כל שינוי-קוד → commit. אמת חי בפרוד (headless) אחרי כל תיקון.**
- **q() ב-sbq:** טפל ב-`'Failed to run sql'/'ERROR'` כשגיאת-SQL (אל תנסה שוב), לא כ-throttle.

**4 הממדים שהמבחן הישן פספס (ה-extractor חייב לתפוס `LessonRow`=onClick-div / `cursor:pointer`, לא רק `a[href]`):**
1. **סדר-רשימה** מול הישן (לא רק ספירה).
2. **שלמות פס-השיעורים** (rendered מול allow-list).
3. **זיהום-פנים-סדרתי** (שיעורי-סדרה DB מול ישן — 096fc3cd היה 35 מ-7 רבנים, ישן=12).
4. **content-length** (#1).

**שלבים הבאים (לפי סדר עדיפות):**
1. **#1 — 183 שיעורים ריקים:** סער בודק ידנית את ה-PDF (`/tmp/empty183-lessons.pdf`, נתונים ב-`/tmp/empty183.json`). אחרי שיחזיר אילו צריך תוכן — שחזר אותם (גרידת-עומק מהדף הישן; שים לב: רוב דפי-הישן לא חושפים טקסט-מאמר בקלות — ייתכן שצריך תוכן-מקור מיואב). אל תכריז "1:1 מלא" עד שזה נסגר.
2. **תקן את ארטיפקט-ה-prep ב-`migration-parity-validate-wf.js`:** הסר `[:40]`, והשווה **interleaved** (סדרה+שיעור בסדר הישן) ולא series-block-then-standalone. הרץ מחדש על **כל 4 סוגי הצמתים** (sections+books **+ topics + rabbis** — הסבב הקודם כיסה רק sections+books). ה-prep: `mtest_parity_prep` (בנה מ-public_book/lesson_topics/rabbi_page_items מול old_listings).
3. **order-issue יחיד + 9 "pollution":** ודא שה-9 הם סדרות-ספר לגיטימיות (ה-scrape-הישן לא תפס כותרות) ולא זיהום-אמת. תקן את ה-order-issue הבודד.
4. **בדיקת-רינדור-חי:** עדכן את `mtest_extract.cjs` לתפוס `cursor:pointer` LessonRow (dedup לפי שורת-כותרת חיצונית), גרוד מחדש את 443 הצמתים מהאתר ה**מתוקן**, והשווה לישן — לאמת שהתיקון נחת בכל הדפים (לא רק במדגם).
5. **רבנים/נושאים:** הרץ `mtest_pollution_scan` גם על דפי-רבנים (over-attribution) ונושאים.

**יעד:** דוח נקי על כל ~600 הצמתים בכל 4 הממדים, או רשימת-תיקונים מדויקת. עדכן את `SESSION-20260619-ROUTING-BASELINE.md` + הזיכרון בכל ממצא. עדכן את סער בוואטסאפ (`972526018772@c.us`, Green API ב-`shigor-pro/references/clients.md`) על כל אבן-דרך.

**קבצים:** `scripts/parity/` — `mtest_deep_completeness.py` · `mtest_pollution_scan.py` · `migration-parity-validate-wf.js` · `mtest_extract.cjs` · `mtest-worklist.json` · `oneone/old_listings_*.json` (אמת-הישן) · `SESSION-20260619-ROUTING-BASELINE.md`.
