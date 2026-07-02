/**
 * AccessDenied — מסך "אין הרשאה" מסודר, במקום הדף היבש הקודם.
 *
 * מציג למשתמש מה התפקיד הנוכחי שלו, מסביר בשפה אנושית, ונותן שני מוצאים:
 * לבקש גישה (→ /contact) או לחזור לאתר. משתמש-מחובר בלבד מגיע לכאן
 * (ProtectedRoute מפנה אורחים ל-/auth).
 */
import { Link } from "react-router-dom";
import { ShieldQuestion, ArrowRight, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { roleMeta } from "./roleMeta";

interface AccessDeniedProps {
  /** תיאור קצר של הדף שנחסם, לצורך הבהרה. */
  area?: string;
}

const AccessDenied = ({ area }: AccessDeniedProps) => {
  const { userRole } = useAuth();
  const role = roleMeta[userRole ?? "user"];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-[#FAF6F0] via-[#F5F0E8] to-[#FAF6F0]"
      dir="rtl"
    >
      <div className="w-full max-w-md text-center bg-white rounded-2xl border border-[#EDE5D6] shadow-[0_2px_12px_rgba(45,31,14,0.06)] p-8">
        <div className="w-14 h-14 mx-auto mb-5 flex items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldQuestion className="h-7 w-7" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-heading text-[#1A2744] mb-2">הדף הזה סגור בפניך</h1>
        <p className="text-muted-foreground leading-relaxed">
          {area ? `${area} מיועד לצוות הניהול. ` : "האזור הזה מיועד לצוות הניהול. "}
          אם אתה אמור לקבל גישה, אפשר לבקש אותה ונטפל בזה.
        </p>

        <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1 rounded-lg bg-muted text-sm text-muted-foreground">
          <role.Icon className="h-3.5 w-3.5" aria-hidden="true" />
          התפקיד שלך כרגע: <span className="font-display text-foreground">{role.label}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-7">
          <Link
            to="/contact?subject=access"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-display hover:bg-primary/90 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            בקשת גישה
          </Link>
          <Link
            to="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#EDE5D6] text-foreground font-display hover:bg-[#F5F0E8] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/40"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            חזרה לאתר
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
