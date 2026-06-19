# 🎮 מבחן המיגרציה הגדול — HANDOFF להרצה בסשן חדש

> **קרא את זה ראש. כל התשתית מוכנה. נשאר רק לשגר את ה-workflow ולדווח.**
> נבנה 19.6.2026. מקור-אמת מלא: `MIGRATION-1TO1-STATE.md` (אותה תיקייה) → סעיף "🎮 מבחן-המיגרציה הגדול".

## מה זה
מבחן רוחבי: גורד את **שני האתרים** — הישן (`bneyzion.co.il`) והחדש (`bneyzion.vercel.app`) — ל-**443 צמתים** (127 נושאים + 154 רבנים + 37 ספרים + 125 סקשנים), משווה כל צומת, ו-**443 סוכני-שיפוט** מציפים תקלות אמיתיות (מסננים פערים לגיטימיים).

## מצב נוכחי (מוכן לשיגור)
- ✅ work-list (443) — `mtest-worklist.json` + `mtest-args.json` (meta לסוכנים).
- ✅ extractor אחיד (ישן `.lessonBlock` + חדש `a[href^="/series/"|"/lessons/"]` + `div[role=button]` לשורות-דיאלוג) — `mtest_extract.cjs`. **באג תוקן:** שורות-שיעור בדפי-רב/סקשן נפתחות כדיאלוג בלי href → נוסף `div[role=button]`.
- ✅ גרידה הושלמה → `/tmp/mtest/<safe>.json` (item-lists) + diff → `/tmp/mtest_diff/<safe>.json`. **גובו ל-`mtest_data.tar.gz`** (בתיקייה הזו).
- ✅ workflow `migration-big-test-wf.js` — מוכן.
- 📊 אות מוקדם מה-diff: **0 אי-התאמות-ספירה** (lesson_count תקין!), 161 צמתים עם extra-in-new, 323 עם missing-in-new (רוב צפוי לגיטימי — הסוכנים יסננו).

## 🚀 הרצה (3 צעדים בסשן החדש)
```bash
cd /Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity
# 1. שחזר את נתוני-הגרידה ל-/tmp (אם /tmp נמחק בין סשנים):
[ -d /tmp/mtest_diff ] || tar -xzf mtest_data.tar.gz -C /tmp
ls /tmp/mtest_diff/*.json | wc -l   # אמור להראות 443
```
**2. שגר את ה-workflow** (Workflow tool) — args = תוכן `mtest-args.json`:
```
Workflow({
  scriptPath: "/Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity/migration-big-test-wf.js",
  args: <הדבק את תוכן mtest-args.json — מערך של 443 {safe,name,type}>
})
```
> הסוכנים קוראים `/tmp/mtest_diff/<safe>.json` ושופטים. **לא נוגעים ב-API → אין throttle.** 443 סוכנים, 16 במקביל, ~10-15 דק'.

**3. קרא את התוצאה** → `{summary:{clean,minor_gap,defect}, defects:[...], minor:[...]}`. הצף לסער את ה-**defects** מקובצים לפי `severity` ו-`type`.

## חוקי-השיפוט (מוטמעים ב-workflow — מה נחשב תקלה אמיתית)
- old_n=0/old_err אבל new>0 = **scrape-miss ישן, החדש תקין** (לא תקלה).
- extra_in_new = **זיהום** (חמור) — אבל dual-audience (ושננתם/ציר-זמן/סיכומים/מפות/קריאה-וביאור) = לגיטימי. "(N)" או כפילות = תקלה אמיתית.
- missing_in_new לגיטימי: דפי-עבודה/שאלות-חזרה/חידות (teacher-only), לינקי-ניווט (כל-השיעורים/מעבר-ל), פריטים-ריקים. תקלה אמיתית: שיעור/סדרה אמיתיים שחסרים.
- count_mismatch>1 = תקלה.

## אחרי התוצאות
**לפי הכרעת סער:** אם נמצאו defects אמיתיים → לתקן (אותו דפוס: engine-per-type + verify-before-apply) → ולהריץ עוד **5 סבבים** של המבחן עד דוח נקי. אם נקי → המיגרציה חתומה סופית.

## אם /tmp נמחק לגמרי ואין tar → גרידה-מחדש (15-20 דק'):
```bash
python3 mtest_extract_all.py 8   # גורד 443×2 (שני האתרים)
python3 mtest_diff.py            # מחשב diff
```

## קבצים (כולם ב-`scripts/parity/`)
`mtest-worklist.json` · `mtest-args.json` · `mtest_build_worklist.py` · `mtest_extract.cjs` · `mtest_extract_all.py` · `mtest_diff.py` · `migration-big-test-wf.js` · `mtest_data.tar.gz` (גיבוי הנתונים).
