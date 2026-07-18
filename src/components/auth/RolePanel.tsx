/**
 * RolePanel — פאנל "התפקיד שלי + גישה לניהול" לסיידבר.
 *
 * מיועד לשיבוץ בתוך הסיידבר (T10). מציג למשתמש מחובר את התפקיד שלו וקיצורי-דרך
 * לניהול לפי ההרשאה; למשתמש רגיל — הזמנה מסודרת לבקש גישה; לאורח — כלום.
 *
 * ⚠️ שיבוץ: קובץ-הסיידבר שייך למסלול העיצוב (T10). מסלול זה (T06) מספק את
 * הרכיב בלבד — T10 מוסיף `<RolePanel/>` במקום המתאים. ראה _DONE.md.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { roleMeta, adminLinksFor } from "./roleMeta";

interface RolePanelProps {
  className?: string;
  /** true = מוצג רק לבעלי-תפקיד (יש קישורי-ניהול). מיועד לסיידבר הציבורי,
   *  כדי שלא להציג "בקשת גישת ניהול" לכל גולש מחובר. */
  staffOnly?: boolean;
}

const OPEN_KEY = "bz_rolepanel_open";

/** מצב פתוח/סגור נשמר ב-localStorage כדי שהבחירה של המנהל תישמר בין ריענונים.
 *  ברירת-מחדל: סגור — הפאנל לא קופץ מעל הניווט עד שלוחצים עליו. */
function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

const RolePanel = ({ className = "", staffOnly = false }: RolePanelProps) => {
  const { user, isAdmin, userRole, isLoading } = useAuth();
  const [open, setOpen] = useState<boolean>(readOpen);

  if (isLoading || !user) return null;

  const effectiveRole = isAdmin ? "admin" : userRole ?? "user";
  const role = roleMeta[effectiveRole];
  const adminLinks = adminLinksFor(isAdmin, userRole);

  if (staffOnly && adminLinks.length === 0) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY, next ? "1" : "0");
    } catch {
      /* מצב-פרטי — מתעלמים */
    }
  };

  return (
    <div className={`rounded-xl border border-border/60 bg-secondary/40 ${className}`} dir="rtl">
      {/* כותרת הפאנל — כפתור פתיחה/סגירה. תג התפקיד תמיד גלוי; שאר הפאנל מתקפל. */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="role-panel-body"
        className="flex w-full items-center justify-between gap-2 p-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-display ${role.badgeClass}`}>
          <role.Icon className="h-3 w-3" aria-hidden="true" />
          {role.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          aria-hidden="true"
        />
        <span className="sr-only">{open ? "סגירת פאנל הניהול" : "פתיחת פאנל הניהול"}</span>
      </button>

      {open && (
        <div id="role-panel-body" className="px-3 pb-3">
          {/* קיצורי-דרך לניהול לפי תפקיד */}
          {adminLinks.length > 0 && (
            <nav className="flex flex-col gap-0.5" aria-label="גישה לניהול">
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

          {/* "בקשת גישת ניהול" הוסר מהציבור — הוראת הרב יואב 17.7 */}
        </div>
      )}
    </div>
  );
};

export default RolePanel;
