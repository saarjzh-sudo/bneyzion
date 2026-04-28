/**
 * /design-series-page — Full simulation of a single-series detail page.
 *
 * Card patterns lifted 1:1 from DesignPreviewHome.tsx:
 *   - PopularLessonCard (lessons grid)
 *   - TopSeriesCard    (related series)
 *   - RabbisAvatar     (rabbis row)
 *
 * Mock data is hardcoded here so we don't need Supabase auth; once approved
 * we'll replace the mock blocks with the real `useLessons`, `useSeries`,
 * `usePublicRabbis` hooks (already used by DesignPreviewHome).
 *
 * Dev-only (gated by import.meta.env.DEV in App.tsx).
 */
import { Play, Heart, Share2, Flame, BookmarkPlus, Volume2 } from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, shadows, radii, seriesFamilies } from "@/lib/designTokens";

// ────────────────────────────────────────────────────────────────────────
// Mock series data — represents a typical Sacred-Canon family series
// (mahogany hero, gold accents, scholarly tone)
// ────────────────────────────────────────────────────────────────────────
const SERIES = {
  id: "sample-series",
  family: "sacredCanon" as const,
  title: 'סדרת "אגדות חז״ל בספר בראשית"',
  rabbi: { name: "הרב יואב אוריאל", lessons: 287, avatar: null },
  description:
    "מסע לעומקי האגדות החז״ליות שמלוות את ספר בראשית — איך חז״ל קוראים את הסיפורים, איזה מסר הם רואים בכל פסוק, ומה זה אומר לחיים שלנו היום. סדרת לימוד שיטתית בארבעים ושבעה שיעורים, מבראשית עד וזאת הברכה.",
  pullQuote:
    '"וְהָאָדָם יָדַע אֶת חַוָּה אִשְׁתּוֹ — דע, שהאהבה היא ידיעה, וההכרה היא בריאה." (חז״ל על בראשית ד׳)',
  lessonCount: 47,
  totalDuration: "32 שעות",
  status: "מתעדכנת",
  imageUrl: "/images/series-tanach-victory.png",
};

const LESSONS = [
  { id: 1, title: 'שיעור 1: "בְּרֵאשִׁית בָּרָא" — בריאת העולם בעיני חז״ל', duration: 47, type: "video", thumb: "/images/series-tanach-victory.png" },
  { id: 2, title: 'גן עדן: מה איבדנו ומה נשאר?', duration: 38, type: "audio", thumb: "/images/lesson-audio.png" },
  { id: 3, title: "קין והבל — סיפור הקנאה הראשון", duration: 52, type: "video", thumb: "/images/lesson-video.png" },
  { id: 4, title: "תיבת נח: כשהעולם מתחיל מחדש", duration: 41, type: "video", thumb: "/images/series-iyov.png" },
  { id: 5, title: "מגדל בבל ופיזור הלשונות", duration: 33, type: "audio", thumb: "/images/series-lashon-hakodesh.png" },
  { id: 6, title: "אברהם — הניסיונות העשרה", duration: 56, type: "video", thumb: "/images/series-middot.png" },
];

const RELATED = [
  { id: "r1", family: "sacredCanon", title: "אגדות חז״ל בספר שמות", lessonCount: 38, image: "/images/series-lashon-hakodesh.png" },
  { id: "r2", family: "weeklyObservance", title: "פרשת השבוע — עיון מעמיק", lessonCount: 54, image: "/images/series-tanach-victory.png" },
  { id: "r3", family: "miraculous", title: "דור הפלאות — סיפורי השגחה", lessonCount: 70, image: "/images/series-iyov.png" },
  { id: "r4", family: "youth", title: "חידות תנ״ך לילדים", lessonCount: 24, image: "/images/series-middot.png" },
];

const RABBIS_FROM_SERIES = [
  { name: "הרב יואב אוריאל", lessons: 287 },
  { name: "הרב אריה כהנא", lessons: 142 },
  { name: "הרב יצחק חיון", lessons: 88 },
  { name: "הרב מנחם בורשטיין", lessons: 195 },
  { name: "הרב חיים נבון", lessons: 60 },
  { name: "הרב ישראל מאיר לאו", lessons: 73 },
];

// ────────────────────────────────────────────────────────────────────────
function typeLabel(t: string) {
  return t === "video" ? "וידאו" : t === "audio" ? "אודיו" : "טקסט";
}

// Custom hero for this page — matches home-page DesignHero pattern
// (full-bleed mahogany gradient, shimmer text, gold divider, italic H1)
function SeriesHero() {
  const fam = seriesFamilies[SERIES.family];

  return (
    <div
      style={{
        minHeight: 480,
        position: "relative",
        overflow: "hidden",
        marginTop: -96, // overlap header
        background: gradients.mahoganyHero,
      }}
    >
      {/* Background image with overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${SERIES.imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center 35%",
          opacity: 0.32,
          filter: "brightness(0.7) saturate(1.1)",
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Grain */}
      <svg
        style={{ position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none" }}
        width="100%"
        height="100%"
        aria-hidden
      >
        <filter id="series-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#series-grain)" />
      </svg>

      <div
        dir="rtl"
        style={{
          position: "relative",
          minHeight: 480,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "150px 1.5rem 4rem",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        {/* Family badge */}
        <div
          style={{
            display: "inline-block",
            padding: "0.4rem 1rem",
            borderRadius: radii.pill,
            background: "rgba(232,213,160,0.15)",
            border: `1px solid rgba(232,213,160,0.3)`,
            color: colors.goldShimmer,
            fontFamily: fonts.body,
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: "1.25rem",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          {fam.label}
        </div>

        {/* Gold divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ width: 50, height: 1, background: "rgba(232,213,160,0.45)" }} />
          <div
            style={{
              width: 7,
              height: 7,
              background: colors.goldShimmer,
              transform: "rotate(45deg)",
            }}
          />
          <div style={{ width: 50, height: 1, background: "rgba(232,213,160,0.45)" }} />
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: "clamp(2rem, 4.5vw, 3.4rem)",
            color: "rgba(255,255,255,0.95)",
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            margin: "0 0 1rem",
            lineHeight: 1.25,
            fontStyle: "italic",
          }}
        >
          {SERIES.title}
        </h1>

        {/* Rabbi line + meta */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            fontFamily: fonts.body,
            fontSize: "0.95rem",
            color: "rgba(255,255,255,0.85)",
            marginBottom: "1.25rem",
          }}
        >
          <span style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.goldShimmer }}>
            {SERIES.rabbi.name}
          </span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{SERIES.lessonCount} שיעורים</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{SERIES.totalDuration}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ color: colors.goldLight }}>{SERIES.status}</span>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            style={{
              padding: "0.85rem 2rem",
              borderRadius: radii.lg,
              border: "none",
              background: gradients.goldButton,
              color: "white",
              fontFamily: fonts.accent,
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
              boxShadow: shadows.goldGlow,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Play style={{ width: 18, height: 18 }} fill="currentColor" />
            התחל את הסדרה
          </button>
          <button
            style={{
              padding: "0.85rem 1.6rem",
              borderRadius: radii.lg,
              border: "1.5px solid rgba(255,255,255,0.35)",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              color: "white",
              fontFamily: fonts.accent,
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <BookmarkPlus style={{ width: 16, height: 16 }} />
            שמור לרשימה
          </button>
          <button
            aria-label="שתף"
            style={{
              width: 48,
              height: 48,
              borderRadius: radii.lg,
              border: "1.5px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.05)",
              color: "white",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Share2 style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Description block with pull-quote
function DescriptionBlock() {
  return (
    <section style={{ background: colors.parchment, padding: "5rem 1.5rem 3rem" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }} dir="rtl">
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: "0.78rem",
            fontWeight: 700,
            color: colors.goldDark,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "0.4rem",
          }}
        >
          על הסדרה
        </div>
        <h2
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: "clamp(1.5rem, 3vw, 2.1rem)",
            color: colors.textDark,
            margin: "0 0 1.25rem",
          }}
        >
          על מה הסדרה הזאת
        </h2>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: "1.05rem",
            lineHeight: 2,
            color: colors.textMid,
            margin: 0,
          }}
        >
          {SERIES.description}
        </p>

        {/* Pull-quote */}
        <div
          style={{
            marginTop: "2rem",
            padding: "1.5rem 1.75rem",
            borderInlineEnd: `4px solid ${colors.goldLight}`,
            background: "rgba(196,162,101,0.08)",
            borderRadius: radii.md,
            fontFamily: fonts.display,
            fontStyle: "italic",
            fontSize: "1.1rem",
            color: colors.textDark,
            lineHeight: 1.7,
          }}
        >
          {SERIES.pullQuote}
        </div>
      </div>
    </section>
  );
}

// Lessons grid — copies PopularLessonsSection card pattern from home
function LessonsGrid() {
  return (
    <section style={{ background: colors.parchment, padding: "3rem 1.5rem 5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          dir="rtl"
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "2.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.goldDark,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.3rem",
              }}
            >
              {SERIES.lessonCount} שיעורים בסדרה
            </div>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "clamp(1.5rem, 3vw, 2.1rem)",
                color: colors.textDark,
                margin: 0,
              }}
            >
              שיעורי הסדרה
            </h2>
          </div>
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: "0.88rem",
              color: colors.goldDark,
              borderBottom: `1px solid ${colors.goldDark}`,
              paddingBottom: 1,
              cursor: "pointer",
            }}
          >
            הצג הכל ←
          </span>
        </div>

        <div
          dir="rtl"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {LESSONS.map((lesson) => (
            <div
              key={lesson.id}
              style={{
                borderRadius: radii.xl,
                overflow: "hidden",
                border: `1px solid rgba(139,111,71,0.1)`,
                background: "white",
                cursor: "pointer",
                transition: "all 0.28s ease",
                boxShadow: shadows.cardSoft,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = shadows.cardHover;
                e.currentTarget.style.borderColor = colors.goldDark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = shadows.cardSoft;
                e.currentTarget.style.borderColor = "rgba(139,111,71,0.1)";
              }}
            >
              <div
                style={{
                  height: 180,
                  overflow: "hidden",
                  position: "relative",
                  background: colors.parchmentDark,
                }}
              >
                <img
                  src={lesson.thumb}
                  alt={lesson.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    insetInlineEnd: 10,
                    padding: "0.2rem 0.65rem",
                    borderRadius: radii.sm,
                    background: gradients.goldButton,
                    color: "white",
                    fontFamily: fonts.body,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                  }}
                >
                  {typeLabel(lesson.type)}
                </span>
                {/* Play icon overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 10,
                    insetInlineStart: 10,
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.95)",
                    color: colors.textDark,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                >
                  {lesson.type === "audio" ? (
                    <Volume2 style={{ width: 16, height: 16 }} />
                  ) : (
                    <Play style={{ width: 16, height: 16 }} fill="currentColor" />
                  )}
                </div>
              </div>

              <div style={{ padding: "1rem 1.1rem 1.25rem" }}>
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    color: colors.goldDark,
                    marginBottom: "0.3rem",
                  }}
                >
                  {SERIES.rabbi.name}
                </div>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: colors.textDark,
                    lineHeight: 1.45,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    marginBottom: "0.5rem",
                    minHeight: "2.7em",
                  }}
                >
                  {lesson.title}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: "0.72rem",
                      color: colors.textSubtle,
                    }}
                  >
                    {lesson.duration} דקות
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: "0.72rem",
                      color: colors.goldDark,
                      fontWeight: 600,
                    }}
                  >
                    {lesson.type === "audio" ? "האזן ←" : "צפה ←"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Rabbis row — circular avatars (same pattern as home RabbisSection)
function RabbisRow() {
  return (
    <section style={{ background: colors.oliveBg, padding: "4rem 1.5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          dir="rtl"
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "2.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.oliveMain,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.3rem",
              }}
            >
              למדו עוד מ-200 רבנים ומרצים
            </div>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "clamp(1.5rem, 3vw, 2.1rem)",
                color: colors.textDark,
                margin: 0,
              }}
            >
              רבנים שיעורם בסדרה
            </h2>
          </div>
        </div>

        <div
          dir="rtl"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {RABBIS_FROM_SERIES.map((r) => (
            <div
              key={r.name}
              style={{
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 88,
                  height: 88,
                  margin: "0 auto 0.65rem",
                  borderRadius: "50%",
                  background: gradients.goldButton,
                  border: `2.5px solid white`,
                  boxShadow: shadows.cardSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: "1.6rem",
                  color: "white",
                  transition: "all 0.28s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.08)";
                  e.currentTarget.style.boxShadow = shadows.cardHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = shadows.cardSoft;
                }}
              >
                {r.name.split(" ").pop()?.[0] ?? "ר"}
              </div>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  color: colors.textDark,
                  lineHeight: 1.3,
                }}
              >
                {r.name}
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.7rem",
                  color: colors.oliveMain,
                  marginTop: 2,
                }}
              >
                {r.lessons} שיעורים
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Related series — TopSeriesCard pattern, color-coded by family
function RelatedSeries() {
  return (
    <section style={{ background: colors.parchmentDark, padding: "5rem 1.5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          dir="rtl"
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "2.75rem",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.oliveMain,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.3rem",
              }}
            >
              סדרות נוספות
            </div>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "clamp(1.5rem, 3vw, 2.1rem)",
                color: colors.textDark,
                margin: 0,
              }}
            >
              קשורות לסדרה הזאת
            </h2>
          </div>
        </div>

        <div
          dir="rtl"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {RELATED.map((s) => {
            const fam = seriesFamilies[s.family as keyof typeof seriesFamilies];
            return (
              <div
                key={s.id}
                style={{
                  borderRadius: radii.xl,
                  overflow: "hidden",
                  display: "flex",
                  background: "white",
                  border: `1px solid rgba(139,111,71,0.1)`,
                  cursor: "pointer",
                  transition: "all 0.28s ease",
                  boxShadow: "0 2px 12px rgba(45,31,14,0.04)",
                  minHeight: 130,
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 10px 36px rgba(45,31,14,0.10)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(45,31,14,0.04)";
                }}
              >
                <div
                  style={{
                    width: "38%",
                    flexShrink: 0,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={s.image}
                    alt={s.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {/* Family stripe (left edge) */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      insetInlineEnd: 0,
                      width: 4,
                      background: fam.accent,
                    }}
                  />
                </div>

                <div
                  style={{
                    padding: "1.1rem 1.25rem",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.22rem 0.6rem",
                        borderRadius: radii.sm,
                        background: fam.badgeBg,
                        color: fam.badgeFg,
                        fontFamily: fonts.body,
                        fontSize: "0.65rem",
                        letterSpacing: "0.1em",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {fam.label}
                    </span>
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontWeight: 900,
                        fontSize: "1rem",
                        color: colors.textDark,
                        lineHeight: 1.3,
                        marginBottom: "0.3rem",
                      }}
                    >
                      {s.title}
                    </div>
                    <div
                      style={{
                        fontFamily: fonts.body,
                        fontSize: "0.72rem",
                        color: colors.textSubtle,
                      }}
                    >
                      {s.lessonCount} שיעורים
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        height: 3,
                        flex: 1,
                        marginInlineStart: "0.75rem",
                        background: "rgba(139,111,71,0.1)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: "0%",
                          background: gradients.oliveButton,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <button
                      style={{
                        padding: "0.3rem 0.9rem",
                        borderRadius: "0.65rem",
                        border: "none",
                        background: gradients.goldButton,
                        color: "white",
                        fontFamily: fonts.accent,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      התחל ללמוד
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Memorial / dedication strip
function DedicationStrip() {
  return (
    <section
      style={{
        background: gradients.warmDark,
        padding: "3rem 1.5rem",
        textAlign: "center",
      }}
      dir="rtl"
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Flame
          style={{
            width: 24,
            height: 24,
            color: colors.goldShimmer,
            margin: "0 auto 0.75rem",
          }}
        />
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: "0.78rem",
            fontWeight: 700,
            color: colors.goldShimmer,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "0.5rem",
          }}
        >
          הקדישו שיעור
        </div>
        <h3
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: "1.5rem",
            color: "white",
            margin: "0 0 1rem",
          }}
        >
          הקדישו את אחד השיעורים בסדרה לזכר יקיריכם
        </h3>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: "0.95rem",
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.7)",
            marginBottom: "1.5rem",
          }}
        >
          תרומתכם תאפשר לנו להמשיך לבנות את הספרייה. השיעור יוצג עם הקדשה לעילוי נשמתם.
        </p>
        <button
          style={{
            padding: "0.75rem 1.8rem",
            borderRadius: radii.lg,
            border: "1.5px solid rgba(232,213,160,0.4)",
            background: "rgba(232,213,160,0.08)",
            color: colors.goldShimmer,
            fontFamily: fonts.accent,
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Heart style={{ width: 16, height: 16 }} />
          הקדש שיעור
        </button>
      </div>
    </section>
  );
}

export default function DesignPreviewSeriesPage() {
  return (
    <DesignLayout transparentHeader overlapHero>
      <SeriesHero />
      <DescriptionBlock />
      <LessonsGrid />
      <RabbisRow />
      <RelatedSeries />
      <DedicationStrip />
    </DesignLayout>
  );
}
