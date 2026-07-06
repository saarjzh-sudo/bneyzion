/**
 * CookieConsent — bottom banner, RTL, gates marketing cookies.
 *
 * Compliance layer (2026-07-06). Renders once per browser until the user
 * decides ("אישור הכל" / "רק הכרחיות"). Choice persists via `src/lib/consent.ts`
 * (localStorage) and drives `hasMarketingConsent()` — the gate the Facebook
 * pixel loader on `ThankYou.tsx` must check before injecting its script
 * (see SHARED-FILE PATCHES NEEDED in the session summary; this component
 * does not touch ThankYou.tsx itself).
 *
 * Also exported: `reopenCookieBanner()` — call from a footer "העדפות עוגיות"
 * link so users can change their mind later (clears consent + shows the
 * banner again without a full reload).
 */
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { colors, fonts, radii, shadows } from "@/lib/designTokens";
import { clearConsent, hasDecided, onConsentChange, setConsent } from "@/lib/consent";

const REOPEN_EVENT = "bnz:cookie-banner-reopen";

/** Call this from anywhere (e.g. footer link) to force the banner to reappear. */
export function reopenCookieBanner(): void {
  clearConsent();
  window.dispatchEvent(new CustomEvent(REOPEN_EVENT));
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasDecided());

    const unsubscribeConsent = onConsentChange((state) => {
      setVisible(state === null);
    });
    const handleReopen = () => setVisible(true);
    window.addEventListener(REOPEN_EVENT, handleReopen);

    return () => {
      unsubscribeConsent();
      window.removeEventListener(REOPEN_EVENT, handleReopen);
    };
  }, []);

  const decide = useCallback((accept: boolean) => {
    setConsent(accept ? "accepted_all" : "necessary_only");
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      role="region"
      aria-label="הודעת עוגיות ופרטיות"
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: 2000,
        background: "#FFFFFF",
        borderTop: `1px solid rgba(139,111,71,0.22)`,
        boxShadow: shadows.modal,
        padding: "1rem 1.25rem",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1rem",
          justifyContent: "space-between",
        }}
      >
        <p
          style={{
            flex: "1 1 320px",
            margin: 0,
            fontFamily: fonts.body,
            fontSize: "0.92rem",
            lineHeight: 1.7,
            color: colors.textDark,
          }}
        >
          אנחנו משתמשים בעוגיות כדי להפעיל את האתר ולשפר את חוויית הלמידה שלך.
          חלק מהעוגיות הכרחיות לתפעול השוטף, וחלק — שיווקיות — נטענות רק
          באישורך. פרטים נוספים ב
          <Link
            to="/privacy-policy"
            style={{ color: colors.goldDark, textDecoration: "underline", fontWeight: 600 }}
          >
            מדיניות הפרטיות
          </Link>
          .
        </p>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => decide(false)}
            aria-label="אישור עוגיות הכרחיות בלבד"
            style={{
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: "0.88rem",
              padding: "0.65rem 1.1rem",
              borderRadius: radii.md,
              border: `1px solid rgba(139,111,71,0.35)`,
              background: "#fff",
              color: colors.textDark,
              cursor: "pointer",
            }}
            onFocus={(e) => (e.currentTarget.style.outline = `2px solid ${colors.goldDark}`)}
            onBlur={(e) => (e.currentTarget.style.outline = "none")}
          >
            רק הכרחיות
          </button>

          <button
            type="button"
            onClick={() => decide(true)}
            aria-label="אישור כל העוגיות"
            style={{
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: "0.88rem",
              padding: "0.65rem 1.3rem",
              borderRadius: radii.md,
              border: "none",
              background: `linear-gradient(135deg, ${colors.goldDark}, ${colors.goldLight})`,
              color: "#fff",
              cursor: "pointer",
              boxShadow: shadows.goldGlowSoft,
            }}
            onFocus={(e) => (e.currentTarget.style.outline = `2px solid ${colors.textDark}`)}
            onBlur={(e) => (e.currentTarget.style.outline = "none")}
          >
            אישור
          </button>
        </div>
      </div>
    </div>
  );
}
