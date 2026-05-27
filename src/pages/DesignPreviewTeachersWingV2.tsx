/**
 * /design-teachers-wing-v2 — sandbox alias for the production Teachers Wing.
 *
 * After Saar's 2026-05-27 feedback:
 * - Removed DesignLayout (was showing the main site sidebar — wrong)
 * - Removed InPageNav center tabs (moved into TeacherSidebar at right)
 * - Now renders TeachersWingPage directly — sandbox = production
 *
 * /design-teachers-wing-v2 and /teachers are now identical.
 * Both show: TeachersLayout (own sidebar) + slim olive hero + content area.
 */
import TeachersWingPage from "@/pages/teachers/TeachersWingPage";

export default function DesignPreviewTeachersWingV2() {
  return <TeachersWingPage />;
}
