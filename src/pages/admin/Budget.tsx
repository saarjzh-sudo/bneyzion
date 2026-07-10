/**
 * Admin · /admin/budget — הפניה לדשבורד המאוחד.
 *
 * 10.7.2026 (איחוד דשבורדים, הוראת סער): כל תוכן העמוד הזה — גרפי מנויי
 * ה-Monday, MRR, נטישה ותרומות — עבר לדשבורד הראשי (/admin) כסקשן
 * "מנויים ותרומות — לוח Monday" (src/components/admin/MondayInsightsSection.tsx).
 *
 * הקובץ נשאר כדי שהראוט /admin/budget לא יחזיר 404 (קישורים ישנים / סימניות).
 * אחרי שהראוט יוסר מ-App.tsx אפשר למחוק את הקובץ.
 */
import { Navigate } from "react-router-dom";

export default function Budget() {
  return <Navigate to="/admin" replace />;
}
