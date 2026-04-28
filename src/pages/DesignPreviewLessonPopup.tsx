/**
 * /design-lesson-popup — Lesson popup/dialog demo.
 *
 * Shows the redesigned LessonDialog floating over a faux blurred series page,
 * so we can review the popup in context. Replaces the existing dialog used
 * across SeriesList, BibleBookPage, etc.
 *
 * Dev-only.
 */
import { useState } from "react";
import {
  Play,
  Volume2,
  Heart,
  Share2,
  X,
  Flame,
  Download,
  ChevronDown,
  Star,
} from "lucide-react";

import { colors, fonts, gradients, radii, shadows, seriesFamilies } from "@/lib/designTokens";

const LESSON = {
  title: 'בְּרֵאשִׁית בָּרָא — בריאת העולם בעיני חז״ל',
  series: 'אגדות חז״ל בספר בראשית',
  family: "sacredCanon" as const,
  rabbi: { name: "הרב יואב אוריאל", role: "ראש מדרשת הקהילה" },
  duration: "47:23",
  type: "video" as "video" | "audio",
  publishedAt: "כ״ג ניסן תשפ״ו",
  thumbnail: "/images/series-tanach-victory.png",
  description:
    "השיעור הראשון בסדרה. נצלול אל ההלכה הראשונה של רש״י על התורה — \"לא היה צריך להתחיל את התורה אלא מהחֹדש הזה לכם\" — ונבחן את עומק המסר. למה התורה נפתחת בסיפור הבריאה, ומה זה אומר עלינו ועל היחס שלנו אל הארץ.",
  notes: [
    "פתיחה — הקושיה של רש״י",
    "מדרש בראשית רבה: \"בראשית — בשביל\"",
    "המהר״ל: בריאה כסיבה תכליתית",
    "סיכום והשלכות לימינו",
  ],
};

export default function DesignPreviewLessonPopup() {
  const [open, setOpen] = useState(true);
  const fam = seriesFamilies[LESSON.family];

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        position: "relative",
        background: colors.parchment,
        overflow: "hidden",
      }}
    >
      {/* ─── Faux background: blurred series page below the modal ─── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${LESSON.thumbnail})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.5,
          filter: "blur(2px) brightness(0.85)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, rgba(45,31,14,0.4), rgba(45,31,14,0.7))`,
        }}
      />

      {/* Faux content lines (just to give context) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "8rem 2rem",
          maxWidth: 960,
          margin: "0 auto",
          color: "rgba(255,255,255,0.25)",
          fontFamily: fonts.display,
          fontStyle: "italic",
          fontSize: "1.4rem",
          textAlign: "center",
          textShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        רקע: דף הסדרה (מטושטש)
      </div>

      {/* ─── Modal backdrop ─── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(45,31,14,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 100,
            overflowY: "auto",
          }}
        >
          {/* Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.parchment,
              borderRadius: radii.xl,
              maxWidth: 720,
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow:
                "0 25px 80px rgba(45,31,14,0.45), 0 0 0 1px rgba(232,213,160,0.25)",
              position: "relative",
            }}
          >
            {/* ─── Hero region (thumbnail + play overlay) ─── */}
            <div
              style={{
                position: "relative",
                aspectRatio: "16 / 9",
                background: gradients.mahoganyHero,
                overflow: "hidden",
              }}
            >
              <img
                src={LESSON.thumbnail}
                alt={LESSON.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.65,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)",
                }}
              />

              {/* Play button center */}
              <button
                aria-label="נגן"
                style={{
                  position: "absolute",
                  top: "50%",
                  insetInlineStart: "50%",
                  transform: "translate(50%, -50%)",
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.95)",
                  border: "none",
                  color: colors.textDark,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translate(50%, -50%) scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translate(50%, -50%) scale(1)";
                }}
              >
                {LESSON.type === "audio" ? (
                  <Volume2 style={{ width: 32, height: 32 }} />
                ) : (
                  <Play style={{ width: 32, height: 32 }} fill="currentColor" />
                )}
              </button>

              {/* Type + duration badges */}
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  insetInlineEnd: 14,
                  display: "flex",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: radii.sm,
                    background: gradients.goldButton,
                    color: "white",
                    fontFamily: fonts.body,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                  }}
                >
                  {LESSON.type === "video" ? "וידאו" : "אודיו"}
                </span>
                <span
                  style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: radii.sm,
                    background: "rgba(0,0,0,0.55)",
                    color: "white",
                    fontFamily: fonts.body,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }}
                >
                  {LESSON.duration}
                </span>
              </div>

              {/* Close */}
              <button
                onClick={() => setOpen(false)}
                aria-label="סגור"
                style={{
                  position: "absolute",
                  top: 14,
                  insetInlineStart: 14,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.95)",
                  border: "none",
                  color: colors.textDark,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* ─── Body ─── */}
            <div style={{ padding: "1.75rem 2rem 1rem" }}>
              {/* Family badge + breadcrumb */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  marginBottom: "0.85rem",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    padding: "0.25rem 0.65rem",
                    borderRadius: radii.sm,
                    background: fam.badgeBg,
                    color: fam.badgeFg,
                    fontFamily: fonts.body,
                    fontSize: "0.66rem",
                    letterSpacing: "0.12em",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {fam.label}
                </span>
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.78rem",
                    color: colors.textSubtle,
                  }}
                >
                  סדרה: <a style={{ color: colors.goldDark, textDecoration: "underline", textUnderlineOffset: 2 }}>{LESSON.series}</a>
                </span>
              </div>

              {/* Title */}
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: "1.5rem",
                  color: colors.textDark,
                  margin: "0 0 0.85rem",
                  lineHeight: 1.3,
                  fontStyle: "italic",
                }}
              >
                {LESSON.title}
              </h2>

              {/* Rabbi line */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.85rem",
                  paddingBottom: "1.25rem",
                  borderBottom: `1px solid rgba(139,111,71,0.12)`,
                  marginBottom: "1.25rem",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: gradients.goldButton,
                    border: `2px solid white`,
                    boxShadow: shadows.goldGlowSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: fonts.display,
                    fontWeight: 900,
                    fontSize: "1.1rem",
                    color: "white",
                  }}
                >
                  {LESSON.rabbi.name.split(" ").pop()?.[0] ?? "ר"}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      color: colors.textDark,
                    }}
                  >
                    {LESSON.rabbi.name}
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.body,
                      fontSize: "0.78rem",
                      color: colors.textMuted,
                    }}
                  >
                    {LESSON.rabbi.role}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.72rem",
                    color: colors.textSubtle,
                  }}
                >
                  פורסם {LESSON.publishedAt}
                </span>
              </div>

              {/* Description */}
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.98rem",
                  lineHeight: 1.85,
                  color: colors.textMid,
                  margin: "0 0 1.25rem",
                }}
              >
                {LESSON.description}
              </p>

              {/* Notes block */}
              <details
                open
                style={{
                  background: "rgba(196,162,101,0.06)",
                  borderRadius: radii.md,
                  padding: "1rem 1.2rem",
                  marginBottom: "1.5rem",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    listStyle: "none",
                    fontFamily: fonts.display,
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    color: colors.goldDark,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>נקודות עיקריות בשיעור</span>
                  <ChevronDown style={{ width: 16, height: 16 }} />
                </summary>
                <ol
                  style={{
                    margin: "0.85rem 0 0",
                    paddingInlineStart: "1.25rem",
                    fontFamily: fonts.body,
                    fontSize: "0.88rem",
                    lineHeight: 1.85,
                    color: colors.textMid,
                  }}
                >
                  {LESSON.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ol>
              </details>
            </div>

            {/* ─── Footer (sticky-feel actions) ─── */}
            <div
              style={{
                padding: "1rem 2rem 1.5rem",
                borderTop: `1px solid rgba(139,111,71,0.12)`,
                background: colors.parchmentDark,
                display: "flex",
                gap: "0.65rem",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  aria-label="הוסף למועדפים"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: radii.md,
                    border: `1.5px solid rgba(139,111,71,0.25)`,
                    background: "white",
                    color: colors.textMuted,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Heart style={{ width: 16, height: 16 }} />
                </button>
                <button
                  aria-label="שתף"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: radii.md,
                    border: `1.5px solid rgba(139,111,71,0.25)`,
                    background: "white",
                    color: colors.textMuted,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Share2 style={{ width: 16, height: 16 }} />
                </button>
                <button
                  aria-label="הורד"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: radii.md,
                    border: `1.5px solid rgba(139,111,71,0.25)`,
                    background: "white",
                    color: colors.textMuted,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Download style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                <button
                  style={{
                    padding: "0.65rem 1.2rem",
                    borderRadius: radii.md,
                    border: "1.5px solid rgba(139,111,71,0.3)",
                    background: "rgba(196,162,101,0.08)",
                    color: colors.goldDark,
                    fontFamily: fonts.accent,
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Flame style={{ width: 14, height: 14 }} />
                  הקדש שיעור
                </button>
                <button
                  style={{
                    padding: "0.7rem 1.5rem",
                    borderRadius: radii.md,
                    border: "none",
                    background: gradients.goldButton,
                    color: "white",
                    fontFamily: fonts.accent,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    boxShadow: shadows.goldGlow,
                  }}
                >
                  <Play style={{ width: 16, height: 16 }} fill="currentColor" />
                  צפה / האזן עכשיו
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* "Reopen" floating button when closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: 32,
            insetInlineEnd: 32,
            zIndex: 50,
            padding: "0.85rem 1.5rem",
            borderRadius: radii.lg,
            border: "none",
            background: gradients.goldButton,
            color: "white",
            fontFamily: fonts.accent,
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: "pointer",
            boxShadow: shadows.goldGlow,
          }}
        >
          פתח שוב את הפופאפ
        </button>
      )}

      {/* Hint at top-right */}
      <div
        style={{
          position: "fixed",
          top: 24,
          insetInlineEnd: 24,
          zIndex: 90,
          padding: "0.6rem 1rem",
          borderRadius: radii.md,
          background: "rgba(255,255,255,0.92)",
          border: `1px solid rgba(139,111,71,0.2)`,
          fontFamily: fonts.body,
          fontSize: "0.8rem",
          color: colors.textMuted,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: shadows.cardSoft,
          maxWidth: 280,
          lineHeight: 1.5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: 4 }}>
          <Star style={{ width: 14, height: 14, color: colors.goldDark }} />
          <b style={{ color: colors.textDark, fontFamily: fonts.display }}>פופאפ שיעור</b>
        </div>
        זה הפופאפ שמופיע כשלוחצים על שיעור ברשימת הסדרה. לחץ מחוץ לחלון לסגירה.
      </div>
    </div>
  );
}
