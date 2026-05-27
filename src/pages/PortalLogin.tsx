/**
 * PortalLogin — דף כניסה ידידותי לפורטל הלומדים / "לחיות תנ"ך".
 *
 * מחליף את Auth.tsx (שהיה "כניסה לדשבורד ניהול") בכל הנתיבים שמגיעים מה-Portal.
 * RequireAuth מנתב כאן במקום /auth כשה-next מכיל /portal / /course.
 *
 * עיצוב: chapter-weekly-theme (אותו עיצוב של ThankYou / Portal).
 * OAuth: Google — אותו signInWithGoogle מ-AuthContext.
 * אחרי login: redirect ל-next= param (מעבר ל-/portal ב-default).
 */
import "@/styles/chapter-weekly.css";

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { BookOpen, Users, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function PortalLogin() {
  const { user, isLoading, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);

  // next= — לאן לחזור אחרי login. default: /portal
  const next = searchParams.get("next") ?? "/portal";

  // אם כבר מחובר — redirect מיידי
  useEffect(() => {
    if (!isLoading && user) {
      navigate(decodeURIComponent(next), { replace: true });
    }
  }, [user, isLoading, navigate, next]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      // Supabase Google OAuth — redirectTo חוזר לאותה origin.
      // אחרי callback המשתמש נחת ב-/ עם session פעיל,
      // ואז RequireAuth יוביל אוטומטית ל-next.
      // כדי לשמור את next אחרי redirect — נשמור ב-sessionStorage.
      if (next && next !== "/portal") {
        sessionStorage.setItem("bnz.portal-next", decodeURIComponent(next));
      }
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="chapter-weekly-theme min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="chapter-weekly-theme min-h-screen bg-gradient-to-b from-background via-secondary to-background"
      dir="rtl"
    >
      {/* Header */}
      <header className="py-6 px-4 bg-gradient-to-br from-secondary via-muted to-secondary">
        <div className="max-w-lg mx-auto text-center">
          <Link to="/">
            <img
              src="/lovable-uploads/b5f2dd73-fe0b-41e8-8bcd-fc1516514ecf.png"
              alt="לוגו בני ציון"
              className="h-12 md:h-16 mx-auto hover:scale-105 transition-transform duration-300"
            />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-l from-primary to-primary/80 py-8 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-2">
            כניסה לפורטל הלומדים
          </h1>
          <p className="text-primary-foreground/90">
            "לחיות תנ"ך — הפרק השבועי" עם הרב יואב אוריאל
          </p>
        </div>
      </div>

      {/* Login card */}
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-card border-2 border-primary/20 rounded-2xl shadow-xl overflow-hidden">
          {/* Lock icon */}
          <div className="p-8 pb-4 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">כניסה עם חשבון Google</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              נשתמש בחשבון Google שלך כדי לזהות אותך ולוודא שיש לך גישה לפורטל.
              <br />
              לא יישמר שום מידע ללא רשותך.
            </p>
          </div>

          {/* Google Sign-in button */}
          <div className="px-8 pb-6">
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-6 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-wait"
            >
              {/* Google G icon */}
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {signingIn ? "מתחבר..." : "כניסה עם Google"}
            </button>
          </div>

          {/* Divider + benefits */}
          <div className="border-t border-border mx-6 mb-6 pt-5 space-y-3">
            {[
              { icon: <BookOpen className="w-4 h-4 text-primary" />, text: "גישה לכל שיעורי הפרק השבועי" },
              { icon: <Users className="w-4 h-4 text-primary" />, text: "מעקב אחרי ההתקדמות שלך" },
              { icon: <Lock className="w-4 h-4 text-primary" />, text: "הפרטים שלך מאובטחים ופרטיים" },
            ].map(({ icon, text }, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                {icon}
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Help link */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            עדיין לא מנוי?{" "}
            <Link to="/chapter-weekly" className="text-primary font-semibold underline underline-offset-2 hover:text-primary/80">
              הצטרף לתכנית
            </Link>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            יש בעיה?{" "}
            <Link to="/contact" className="underline underline-offset-2 hover:text-primary">
              צרו קשר
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
