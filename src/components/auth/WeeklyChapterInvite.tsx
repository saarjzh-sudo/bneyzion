/**
 * WeeklyChapterInvite — הזמנה רכה להפוך ל"תלמיד בפרק השבועי".
 *
 * מוצג רק למשתמש מחובר שעדיין אינו לומד את הפרק-השבועי. מקור-האמת למצב-הלומד
 * הוא useUserAccess("program:weekly-chapter") — אותו תג בדיוק שבו משתמש מסלול
 * הפורטל (T03). אם אין גישה ועוד לא מחובר → לא מציגים (כדי לא ללחוץ סתם).
 *
 * שני מצבים:
 *   variant="menu" — שורה דחוסה בתוך תפריט-המשתמש.
 *   variant="card" — באנר חם למצבים ריקים / אזור-משתמש.
 */
import { Link } from "react-router-dom";
import { BookOpen, ArrowLeft } from "lucide-react";
import { useUserAccess } from "@/hooks/useUserAccess";

interface WeeklyChapterInviteProps {
  variant?: "menu" | "card";
  className?: string;
}

const WEEKLY_TAG = "program:weekly-chapter";

const WeeklyChapterInvite = ({ variant = "card", className = "" }: WeeklyChapterInviteProps) => {
  const { hasAccess, isAuthenticated, isLoading } = useUserAccess(WEEKLY_TAG);

  // מציגים רק למחובר שעדיין אינו לומד הפרק-השבועי.
  if (isLoading || !isAuthenticated || hasAccess) return null;

  if (variant === "menu") {
    return (
      <Link
        to="/chapter-weekly"
        className={`flex items-center gap-2.5 mx-1 my-1.5 px-3 py-2.5 rounded-lg bg-primary/8 hover:bg-primary/15 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${className}`}
      >
        <BookOpen className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
        <span className="flex-1 text-sm font-display text-foreground leading-tight">
          מצטרפים ללימוד הפרק השבועי?
        </span>
        <ArrowLeft className="h-3.5 w-3.5 text-primary/70 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-l from-primary/10 via-secondary/50 to-transparent p-6 shadow-[0_10px_30px_-18px_rgba(139,111,71,0.55)] ${className}`}
    >
      {/* פס-זהב עדין בצד — עוגן ויזואלי */}
      <div aria-hidden="true" className="absolute inset-y-0 end-0 w-1 bg-gradient-to-b from-primary/70 via-primary/30 to-transparent" />
      <div className="flex items-start gap-4">
        <div className="shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold tracking-widest text-primary/80 mb-0.5">
            תכנית המנויים
          </div>
          <h3 className="font-display text-lg text-foreground leading-snug">
            מצטרפים ללימוד הפרק השבועי?
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            כל שבוע פרק חדש בתנ"ך, עם הרב יואב אוריאל. מתחילים מתי שבא לכם.
          </p>
          <Link
            to="/chapter-weekly"
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-display hover:bg-primary/90 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60"
          >
            הצטרפו ללימוד
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WeeklyChapterInvite;
