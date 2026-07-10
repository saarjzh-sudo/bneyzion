/**
 * /admin/notifications — 10.7.2026 (איחוד, הוראת סער): שיגור ההתראות אוחד עם
 * תיבת הפניות לעמוד אחד — MessagesAndNotifications.tsx. הנתיב /admin/notifications
 * פותח אוטומטית את טאב "התראות למשתמשים" (לפי ה-pathname).
 * הקובץ נשאר כ-re-export כדי שהראוט הקיים ב-App.tsx ימשיך לעבוד ללא שינוי.
 */
export { default } from "./MessagesAndNotifications";
