/**
 * roleMeta — מקור-אמת אחד לתצוגת תפקידים והרשאות באזור-המשתמש.
 *
 * מרכז את תוויות-התפקידים, הצבעים, וקישורי-הניהול לפי תפקיד — כדי ש-UserMenu,
 * RolePanel ו-AccessDenied יציגו את אותו הדבר בדיוק.
 *
 * מקור-האמת להרשאות עצמן הוא DB (`user_roles` + `has_role` RPC), נחשף דרך
 * AuthContext (`isAdmin`, `userRole`, `isCreator`). כאן רק שכבת-התצוגה.
 */
import type { LucideIcon } from "lucide-react";
import { Crown, PencilRuler, ShieldCheck, UserRound, Upload, Users, LayoutDashboard, BookOpen } from "lucide-react";
import type { AppRole } from "@/contexts/AuthContext";

export interface RoleMeta {
  label: string;
  Icon: LucideIcon;
  /** מחלקות Tailwind לתג. */
  badgeClass: string;
}

export const roleMeta: Record<AppRole, RoleMeta> = {
  admin: {
    label: "מנהל",
    Icon: Crown,
    badgeClass: "bg-primary/12 text-primary",
  },
  creator: {
    label: "יוצר תוכן",
    Icon: PencilRuler,
    badgeClass: "bg-accent/15 text-accent-foreground",
  },
  moderator: {
    label: "מנהל תוכן",
    Icon: ShieldCheck,
    badgeClass: "bg-accent/15 text-accent-foreground",
  },
  user: {
    label: "משתמש רשום",
    Icon: UserRound,
    badgeClass: "bg-muted text-muted-foreground",
  },
};

export interface AdminLink {
  to: string;
  label: string;
  Icon: LucideIcon;
  /** להדגשה ויזואלית (הקישור הראשי לתפקיד). */
  primary?: boolean;
}

/**
 * הקישורים שמשתמש בתפקיד נתון רשאי להגיע אליהם בפועל.
 * גזור מ-allowedRoles של הראוטים ב-App.tsx (admin=הכל · creator=ניהול-תוכן).
 */
export function adminLinksFor(isAdmin: boolean, role: AppRole | null): AdminLink[] {
  if (isAdmin) {
    return [
      { to: "/admin", label: "ניהול האתר", Icon: LayoutDashboard, primary: true },
      { to: "/admin/upload", label: "העלאת תוכן", Icon: Upload },
      { to: "/admin/users", label: "ניהול משתמשים והרשאות", Icon: Users },
    ];
  }
  if (role === "creator" || role === "moderator") {
    return [
      { to: "/admin/upload", label: "העלאת תוכן", Icon: Upload, primary: true },
      { to: "/admin/lessons", label: "ניהול השיעורים", Icon: BookOpen },
    ];
  }
  return [];
}
