/**
 * RolePanel — פאנל "התפקיד שלי + גישה לניהול" לסיידבר.
 *
 * מיועד לשיבוץ בתוך הסיידבר (T10). מציג למשתמש מחובר את התפקיד שלו וקיצורי-דרך
 * לניהול לפי ההרשאה; למשתמש רגיל — הזמנה מסודרת לבקש גישה; לאורח — כלום.
 *
 * ⚠️ שיבוץ: קובץ-הסיידבר שייך למסלול העיצוב (T10). מסלול זה (T06) מספק את
 * הרכיב בלבד — T10 מוסיף `<RolePanel/>` במקום המתאים. ראה _DONE.md.
 */
import { Link } from "react-router-dom";
import { ShieldQuestion } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { roleMeta, adminLinksFor } from "./roleMeta";

interface RolePanelProps {
  className?: string;
  /** true = מוצג רק לבעלי-תפקיד (יש קישורי-ניהול). מיועד לסיידבר הציבורי,
   *  כדי שלא להציג "בקשת גישת ניהול" לכל גולש מחובר. */
  staffOnly?: boolean;
}

const RolePanel = ({ className = "", staffOnly = false }: RolePanelProps) => {
  const { user, isAdmin, userRole, isLoading } = useAuth();

  if (isLoading || !user) return null;

  const effectiveRole = isAdmin ? "admin" : userRole ?? "user";
  const role = roleMeta[effectiveRole];
  const adminLinks = adminLinksFor(isAdmin, userRole);

  if (staffOnly && adminLinks.length === 0) return null;

  return (
    <div className={`rounded-xl border border-border/60 bg-secondary/40 p-3 ${className}`} dir="rtl">
      {/* תג התפקיד */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-display ${role.badgeClass}`}>
          <role.Icon className="h-3 w-3" aria-hidden="true" />
          {role.label}
        </span>
      </div>

      {/* קיצורי-דרך לניהול לפי תפקיד */}
      {adminLinks.length > 0 && (
        <nav className="mt-2.5 flex flex-col gap-0.5" aria-label="גישה לניהול">
          {adminLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                link.primary ? "text-primary font-display" : "text-foreground"
              }`}
            >
              <link.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {link.label}
            </Link>
          ))}
        </nav>
      )}

      {/* משתמש רגיל — בקשת גישה */}
      {!isAdmin && adminLinks.length === 0 && (
        <Link
          to="/contact?subject=access"
          className="mt-2.5 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ShieldQuestion className="h-4 w-4 shrink-0" aria-hidden="true" />
          בקשת גישת ניהול
        </Link>
      )}
    </div>
  );
};

export default RolePanel;
