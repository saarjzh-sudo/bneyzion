/**
 * /admin/users — עמוד "משתמשים" המאוחד (רמה 17) בתוך פאנל הניהול.
 *
 * מחליף את הפיצול "מנויים"/"משתמשים": רשומת-אדם אחת לכל אימייל, דגלים,
 * אינדיקטור מקור-אמת (חויב ב-Grow / רק Monday), drawer עם ציר-זמן, הענקת
 * והסרת גישה. הדאטה: admin_unified_users() (admin-only, fail-closed).
 * העמוד הישן /admin/subscribers נשאר ככלי-חירום (קישור בכותרת).
 */
import { AdminLayout } from "@/components/admin/AdminLayout";
import UnifiedUsersView from "@/pages/DesignPreviewUsers";

export default function AdminUnifiedUsers() {
  return (
    <AdminLayout>
      <UnifiedUsersView />
    </AdminLayout>
  );
}
