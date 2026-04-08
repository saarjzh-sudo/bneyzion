

## תכנית השוואת עומק: סיידבר מול האתר המקורי

### הבעיה
צריך לוודא שכאשר לוחצים על כל פריט בסיידבר (בשני הדפים: `/series` ו-`/teachers`), מוצגות **אותן סדרות ושיעורים** כמו באתר המקורי (`bneyzion.co.il`). כרגע אין כלי אוטומטי שעושה את ההשוואה הזו.

### גישה: Edge Function להשוואה אוטומטית

נבנה **Edge Function** שמבצעת את ההשוואה באופן שיטתי:

1. **שליפת עץ הסיידבר מה-DB** - כל ה-ROOT_IDS, הספרים, והילדים שלהם
2. **לכל צומת בסיידבר** - שליפת הסדרות/שיעורים שמוצגים אצלנו (אותה לוגיקה של `useSeriesForNode` / `useLessonsForNode`)
3. **Scrape של האתר המקורי** - האתר המקורי הוא SPA שטוען תוכן דרך API. נשלוף את ה-API שלו ישירות (Umbraco API) כדי לקבל את רשימת התכנים לכל קטגוריה
4. **השוואה והפקת דוח פערים** - כמה פריטים אצלנו vs אצלם, אילו כותרות חסרות

### שלבי המימוש

#### שלב 1: זיהוי ה-API של האתר המקורי
האתר המקורי (`bneyzion.co.il`) הוא Umbraco SPA שטוען תוכן דרך AJAX. נשתמש בכלי הדפדפן לזהות את ה-endpoints שהוא קורא כשלוחצים על פריט בסיידבר. נתחיל מלנווט לאתר ולצפות ב-Network requests.

#### שלב 2: בניית Edge Function `compare-content`
```text
Input:  { nodeId: string, nodeTitle: string, page: "series" | "teachers" }
Output: {
  ourCount: number,
  originalCount: number,
  missingTitles: string[],   // קיים באתר המקורי, חסר אצלנו
  extraTitles: string[],     // קיים אצלנו, לא קיים באתר המקורי
  matchedTitles: string[]
}