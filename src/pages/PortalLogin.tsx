/**
 * PortalLogin — דף כניסה ידידותי לפורטל הלומדים.
 *
 * מחליף את Auth.tsx (שהוא "כניסה לדשבורד ניהול") בכל הנתיבים המגיעים מה-Portal.
 * RequireAuth מנתב כאן במקום /auth כשה-next מכיל /portal / /course.
 *
 * עיצוב: סגנון כללי של האתר — Layout ראשי (DesignHeader + DesignFooter בלי sidebar),
 *        רקע parchment, אקצנט זהב, כותרת navy. לא חגיגי / לא "פרסומי" כמו chapter-weekly.
 *
 * Flow:
 *   /portal-login?next=/course/weekly-chapter
 *     ↓ Google OAuth (redirectTo = /portal-login?next=ENCODED)
 *     ↓ Google → Supabase → אותו URL עם session פעיל
 *     ↓ ה-useEffect שלמטה מזהה user && next → navigate(next)
 */
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { BookOpen, ShieldCheck, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import { colors, shadows } from "@/lib/designTokens";

export default function PortalLogin() {
  const { user, isLoading, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);

  // next= — לאן לחזור אחרי login. default: /portal
  const rawNext = searchParams.get("next");
  const next = rawNext ? decodeURIComponent(rawNext) : "/portal";

  // אם כבר מחובר — redirect מיידי
  useEffect(() => {
    if (!isLoading && user) {
      navigate(next, { replace: true });
    }
  }, [user, isLoading, navigate, next]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      // Pass next through to OAuth so Google → Supabase → /portal-login?next=…
      // and the useEffect above redirects automatically.
      await signInWithGoogle(next === "/portal" ? undefined : next);
    } finally {
      setSigningIn(false);
    }
  };

  if (isLoading) {
    return (
      <Layout sidebar={false}>
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: `3px solid ${colors.parchmentDeep}`,
              borderTopColor: colors.goldDark,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </Layout>
    );
  }

  return (
    <Layout sidebar={false}>
      <main
        dir="rtl"
        style={{
          minHeight: "70vh",
          background: colors.parchment,
          padding: "64px 16px 96px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Title */}
        <div style={{ maxWidth: 560, width: "100%", textAlign: "center", marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: "'Ploni', 'Frank Ruhl Libre', serif",
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 700,
              color: colors.navyDeep,
              letterSpacing: "-0.01em",
              marginBottom: 12,
              lineHeight: 1.2,
            }}
          >
            כניסה לאזור האישי
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "#5C5547",
              lineHeight: 1.6,
              maxWidth: 460,
              margin: "0 auto",
            }}
          >
            התחבר עם חשבון Google כדי לגשת לקורסים שלך,
            לשמור התקדמות ולהמשיך מאיפה שעצרת.
          </p>
        </div>

        {/* Login card */}
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: "#FFFFFF",
            borderRadius: 16,
            padding: "40px 32px",
            boxShadow: shadows.cardSoft,
            border: `1px solid ${colors.parchmentDeep}`,
          }}
        >
          {/* Google Sign-in button */}
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "14px 24px",
              borderRadius: 10,
              border: `1px solid ${colors.parchmentDeep}`,
              background: "#FFFFFF",
              fontFamily: "'Ploni', system-ui, sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: colors.navyDeep,
              cursor: signingIn ? "wait" : "pointer",
              opacity: signingIn ? 0.6 : 1,
              transition: "all 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
            onMouseEnter={(e) => {
              if (!signingIn) {
                e.currentTarget.style.borderColor = colors.goldDark;
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(139,111,71,0.15)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.parchmentDeep;
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
            }}
          >
            {/* Official Google G logo (multicolor) */}
            <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            <span>{signingIn ? "מתחבר..." : "כניסה עם Google"}</span>
          </button>

          {/* Benefits */}
          <div
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: `1px solid ${colors.parchmentDeep}`,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {[
              { Icon: BookOpen, text: "גישה לכל הקורסים שיש לך" },
              { Icon: TrendingUp, text: "מעקב התקדמות ומועד אחרון" },
              { Icon: ShieldCheck, text: "הפרטים שלך נשמרים אצלך בלבד" },
            ].map(({ Icon, text }, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 14.5,
                  color: "#5C5547",
                }}
              >
                <Icon size={18} color={colors.goldDark} strokeWidth={2} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer help */}
        <div style={{ textAlign: "center", marginTop: 28, maxWidth: 460 }}>
          <p style={{ fontSize: 14, color: "#5C5547", marginBottom: 6 }}>
            עדיין לא רכשת מנוי?{" "}
            <Link
              to="/chapter-weekly"
              style={{
                color: colors.goldDark,
                fontWeight: 600,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              הצטרף לתכנית "לחיות תנ"ך"
            </Link>
          </p>
          <p style={{ fontSize: 13, color: "#8A8275" }}>
            יש בעיה?{" "}
            <Link
              to="/contact"
              style={{
                color: "#5C5547",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              צרו קשר
            </Link>
          </p>
        </div>
      </main>
    </Layout>
  );
}
