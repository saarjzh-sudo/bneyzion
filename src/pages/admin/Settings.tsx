/**
 * /admin/settings — 10.7.2026 (הוראת סער, "הגדרות האתר"): העמוד אוחד לתוך
 * מרכז השליטה (/admin/control-center).
 *
 * בדיקת חפיפה שנעשתה לפני האיחוד: כל 7 ההגדרות שנוהלו כאן — print_dedication +
 * שש הגדרות ההנצחה (memorial_name/subtitle/dedication/bio/legacy/verse) —
 * קיימות אחת-לאחת במרשם siteCopyRegistry של מרכז השליטה (קבוצת "הנצחה",
 * מסומנות sensitive = עריכה רק לסער). לא נותרה כאן אף הגדרה ייחודית.
 *
 * הקובץ נשאר כהפניה כדי שהראוט /admin/settings לא יחזיר 404 (סימניות ישנות).
 * אחרי שהראוט יוסר מ-App.tsx אפשר למחוק את הקובץ.
 */
import { Navigate } from "react-router-dom";

const Settings = () => <Navigate to="/admin/control-center" replace />;

export default Settings;
