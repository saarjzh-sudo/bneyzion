/**
 * ZoomCtaCard — "כניסה לשיעור החי" call-to-action for the weekly program.
 *
 * The weekly lesson is a recurring live Zoom session (currently Wednesday 21:00).
 * The same recurring link is reused every week and posted to the WhatsApp group
 * on lesson day. We read it from the book's `zoom_link` column when set, and
 * fall back to the known program-wide recurring link so the CTA always works.
 *
 * Data source: community_courses.zoom_link (real). No mock.
 * Owned by T03 (weekly portal). Design language: warm-cream + gold, Kedem/Antidot.
 */
import { Link } from "react-router-dom";
import { Video, Clock, Calendar } from "lucide-react";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";

// Program-wide recurring Zoom link (from the הפרק-השבועי WhatsApp group).
// Used only as a fallback when a book has no zoom_link set in the DB/admin.
const PROGRAM_ZOOM_FALLBACK =
  "https://us02web.zoom.us/j/89674496888?pwd=NjQgO336yAwHATbkkwsimd92kWrXlp.1";

// Default weekly session schedule text (editable later via admin/site-settings).
const DEFAULT_SESSION_DAY = "יום רביעי";
const DEFAULT_SESSION_TIME = "21:00";

export function ZoomCtaCard({
  zoomLink,
  sessionDay = DEFAULT_SESSION_DAY,
  sessionTime = DEFAULT_SESSION_TIME,
  chapterLabel,
  hasAccess,
  compact = false,
}: {
  zoomLink?: string | null;
  sessionDay?: string;
  sessionTime?: string;
  /** e.g. "פרק יב׳" — the chapter studied in the upcoming live session. */
  chapterLabel?: string;
  /** Subscribers get the live link; others get a join-the-program CTA. */
  hasAccess: boolean;
  compact?: boolean;
}) {
  const href = zoomLink?.trim() || PROGRAM_ZOOM_FALLBACK;

  return (
    <div
      dir="rtl"
      style={{
        background: `linear-gradient(135deg, ${colors.navyDeep} 0%, #162040 100%)`,
        borderRadius: radii.xl,
        padding: compact ? "1.25rem 1.4rem" : "1.6rem 1.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1.25rem",
        flexWrap: "wrap",
        border: "1px solid rgba(232,213,160,0.14)",
        boxShadow: shadows.cardHover,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1.1rem", minWidth: 0 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: radii.lg,
            background: "rgba(232,213,160,0.1)",
            border: "1px solid rgba(232,213,160,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.goldShimmer,
            flexShrink: 0,
          }}
        >
          <Video size={24} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: "0.68rem",
              fontWeight: 700,
              color: colors.goldShimmer,
              letterSpacing: "0.15em",
              marginBottom: "0.25rem",
            }}
          >
            השיעור השבועי החי
          </div>
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: "1.1rem",
              color: "white",
              marginBottom: "0.2rem",
              lineHeight: 1.2,
            }}
          >
            {chapterLabel ? `לומדים יחד — ${chapterLabel}` : "מפגש זום חי עם הרב יואב אוריאל"}
          </div>
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: "0.8rem",
              color: "rgba(255,255,255,0.6)",
              display: "flex",
              alignItems: "center",
              gap: "0.9rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <Calendar size={12} /> {sessionDay}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <Clock size={12} /> {sessionTime}
            </span>
          </div>
        </div>
      </div>

      {hasAccess ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "0.8rem 1.6rem",
            borderRadius: radii.lg,
            background: gradients.goldButton,
            color: "white",
            fontFamily: fonts.accent,
            fontWeight: 700,
            fontSize: "0.92rem",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: shadows.goldGlow,
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          <Video size={16} />
          כניסה לשיעור החי
        </a>
      ) : (
        <Link
          to="/chapter-weekly"
          style={{
            padding: "0.8rem 1.6rem",
            borderRadius: radii.lg,
            background: gradients.goldButton,
            color: "white",
            fontFamily: fonts.accent,
            fontWeight: 700,
            fontSize: "0.92rem",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: shadows.goldGlow,
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          הצטרפו כדי להשתתף בשיעור החי
        </Link>
      )}
    </div>
  );
}

export default ZoomCtaCard;
