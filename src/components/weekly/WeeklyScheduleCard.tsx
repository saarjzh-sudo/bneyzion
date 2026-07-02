/**
 * WeeklyScheduleCard — "לו״ז הפרקים" for a weekly-program book.
 *
 * Per Saar's decision: embed the DESIGNED schedule image that is shared in the
 * WhatsApp group (exported from the Drive). We render `scheduleImageUrl` when
 * available. Until that asset is provided we show a live, auto-generated
 * chapter list built from the book's REAL chapters (no mock) so the section is
 * never empty — this doubles as the fallback if no image is set.
 *
 * Owned by T03 (weekly portal). Design: warm-cream + gold, RTL, accessible.
 */
import { CalendarDays, CheckCircle2, Play, Clock } from "lucide-react";
import { colors, fonts, radii, shadows } from "@/lib/designTokens";

export type ScheduleItem = {
  /** Display label, e.g. "פרק יב׳" or "פרקים ט׳-י׳". */
  label: string;
  /** "done" = already studied · "current" = this week · "upcoming". */
  status: "done" | "current" | "upcoming";
  /** Optional anchor used to deep-link into the chapter. */
  onOpen?: () => void;
};

const STATUS_META: Record<ScheduleItem["status"], { text: string; color: string; bg: string }> = {
  done: { text: "נלמד", color: colors.oliveMain, bg: "rgba(91,110,58,0.1)" },
  current: { text: "השבוע", color: colors.goldDark, bg: "rgba(139,111,71,0.12)" },
  upcoming: { text: "בקרוב", color: colors.textSubtle, bg: "rgba(139,111,71,0.05)" },
};

export function WeeklyScheduleCard({
  bookTitle,
  scheduleImageUrl,
  items,
  accent = colors.goldDark,
}: {
  bookTitle: string;
  /** Designed schedule image (Drive export). When set, it is shown as-is. */
  scheduleImageUrl?: string | null;
  /** Auto-generated fallback list from real chapters. */
  items: ScheduleItem[];
  accent?: string;
}) {
  return (
    <section
      dir="rtl"
      aria-label={`לוח זמנים — ${bookTitle}`}
      style={{
        background: "white",
        borderRadius: radii.xl,
        border: "1px solid rgba(139,111,71,0.12)",
        boxShadow: shadows.cardSoft,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          padding: "1.1rem 1.4rem",
          borderBottom: "1px solid rgba(139,111,71,0.08)",
          background: "rgba(139,111,71,0.03)",
        }}
      >
        <CalendarDays size={18} style={{ color: accent }} />
        <div>
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: "0.66rem",
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: accent,
            }}
          >
            לו״ז הלימוד
          </div>
          <h3
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: "1.05rem",
              color: colors.textDark,
              margin: 0,
            }}
          >
            סדר הפרקים — {bookTitle}
          </h3>
        </div>
      </div>

      {/* Designed schedule image (preferred) */}
      {scheduleImageUrl ? (
        <div style={{ padding: "1rem" }}>
          <img
            src={scheduleImageUrl}
            alt={`לוח זמנים ללימוד ${bookTitle}`}
            loading="lazy"
            style={{ width: "100%", height: "auto", borderRadius: radii.lg, display: "block" }}
          />
        </div>
      ) : (
        /* Auto-generated fallback from real chapters */
        <div style={{ padding: "0.5rem 0.75rem 0.9rem" }}>
          {items.length === 0 ? (
            <div
              style={{
                padding: "2rem 1rem",
                textAlign: "center",
                fontFamily: fonts.body,
                fontSize: "0.83rem",
                color: colors.textSubtle,
              }}
            >
              הלו״ז יעודכן בקרוב.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
              {items.map((it, i) => {
                const m = STATUS_META[it.status];
                const clickable = !!it.onOpen;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={it.onOpen}
                      disabled={!clickable}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.7rem",
                        padding: "0.7rem 0.85rem",
                        background: it.status === "current" ? m.bg : "transparent",
                        border: "none",
                        borderRadius: radii.md,
                        cursor: clickable ? "pointer" : "default",
                        textAlign: "right",
                        borderBottom: i < items.length - 1 ? "1px solid rgba(139,111,71,0.06)" : "none",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: m.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          color: m.color,
                        }}
                      >
                        {it.status === "done" ? (
                          <CheckCircle2 size={14} />
                        ) : it.status === "current" ? (
                          <Play size={12} fill="currentColor" />
                        ) : (
                          <Clock size={12} />
                        )}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontFamily: fonts.body,
                          fontWeight: it.status === "current" ? 700 : 500,
                          fontSize: "0.9rem",
                          color: it.status === "upcoming" ? colors.textMuted : colors.textDark,
                        }}
                      >
                        {it.label}
                      </span>
                      <span
                        style={{
                          fontFamily: fonts.body,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: m.color,
                          background: m.bg,
                          borderRadius: radii.pill,
                          padding: "0.15rem 0.6rem",
                          flexShrink: 0,
                        }}
                      >
                        {m.text}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export default WeeklyScheduleCard;
