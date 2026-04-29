/**
 * /design-lesson-page — Full lesson detail page, redesigned.
 *
 * The third surface in the lesson trio:
 *   1. LessonCard (in series-page grid, BEFORE click)
 *   2. LessonPopup (on click)
 *   3. LessonPage (full detail navigation) ← THIS FILE
 *
 * All three carry the SAME accompanying image at the top — when a user
 * clicks a card, the popup grows from that image, and "open full page"
 * keeps the same image as the page hero. The image is the visual thread
 * that ties the trio together.
 *
 * Editorial-magazine layout: sticky big image hero, type-driven content
 * column, sticky audio/video player on scroll, related lessons rail,
 * comments + dedications block.
 */
import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Play,
  Volume2,
  Heart,
  Share2,
  Download,
  Flame,
  Bookmark,
  Clock,
  Calendar,
  ArrowLeft,
  Loader2,
  ChevronRight,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import {
  colors,
  fonts,
  gradients,
  radii,
  shadows,
  seriesFamilies,
  getSeriesFamily,
  getSeriesCoverImage,
  lessonTypeLabel,
  formatDuration,
} from "@/lib/designTokens";
import { useTopSeries } from "@/hooks/useTopSeries";
import { useLessonsBySeries } from "@/hooks/useLessonsBySeries";

export default function DesignPreviewLessonPage() {
  const { id } = useParams<{ id?: string }>();

  // Default to first lesson of top series
  const { data: topSeries = [] } = useTopSeries(20);
  const series = (topSeries as any[])[0];
  const { data: lessons = [], isLoading } = useLessonsBySeries(series?.id);

  // If id passed, find that lesson; else use first
  const lesson = useMemo(() => {
    const list = lessons as any[];
    if (!list.length) return null;
    if (id) return list.find((l) => l.id === id) || list[0];
    return list[0];
  }, [lessons, id]);

  if (isLoading || !lesson || !series) {
    return (
      <DesignLayout>
        <div style={{ padding: "10rem 0", display: "flex", justifyContent: "center", background: colors.parchment }}>
          <Loader2 style={{ width: 32, height: 32, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DesignLayout>
    );
  }

  const fam = seriesFamilies[getSeriesFamily(series.title, series.description)];
  const heroImage = lesson.thumbnail_url || series.image_url || getSeriesCoverImage(series.title) || "/images/series-default.png";
  const isAudio = lesson.source_type === "audio";
  const rabbiName = (lesson.rabbis?.name || series.rabbis?.name || "").trim();
  const rabbiInitial = rabbiName ? (rabbiName.replace(/^הרב /, "")[0] || "ר") : "ר";

  const otherLessons = (lessons as any[]).filter((l) => l.id !== lesson.id).slice(0, 6);
  const lessonNumber = (lessons as any[]).findIndex((l) => l.id === lesson.id) + 1;
  const totalInSeries = (lessons as any[]).length;

  return (
    <DesignLayout transparentHeader overlapHero>
      {/* ─── Cinematic hero with the SHARED accompanying image ─── */}
      <div
        style={{
          position: "relative",
          minHeight: 620,
          overflow: "hidden",
          marginTop: -96,
        }}
      >
        {/* Hero image — full-bleed */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
            filter: "brightness(0.6) saturate(1.1)",
          }}
        />
        {/* Gradient layer to ensure text readability */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(45,31,14,0.4) 0%, rgba(45,31,14,0.1) 30%, rgba(26,18,8,0.85) 100%)",
          }}
        />
        {/* Grain */}
        <svg style={{ position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none" }} width="100%" height="100%" aria-hidden>
          <filter id="grain-lesson-page"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width="100%" height="100%" filter="url(#grain-lesson-page)" />
        </svg>

        <div
          dir="rtl"
          style={{
            position: "relative",
            minHeight: 620,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "150px 1.5rem 3.5rem",
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          {/* Back to series */}
          <Link
            to={`/design-series-page/${series.id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 0.85rem",
              borderRadius: radii.pill,
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.9)",
              fontFamily: fonts.body,
              fontSize: "0.78rem",
              fontWeight: 600,
              textDecoration: "none",
              alignSelf: "flex-start",
              marginBottom: "1.5rem",
            }}
          >
            <ChevronRight size={13} />
            סדרה: {series.title}
          </Link>

          {/* Family + lesson number */}
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <span
              style={{
                padding: "0.3rem 0.75rem",
                borderRadius: radii.pill,
                background: "rgba(232,213,160,0.15)",
                border: "1px solid rgba(232,213,160,0.3)",
                color: colors.goldShimmer,
                fontFamily: fonts.body,
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                backdropFilter: "blur(8px)",
              }}
            >
              {fam.label}
            </span>
            <span
              style={{
                padding: "0.3rem 0.75rem",
                borderRadius: radii.pill,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.85)",
                fontFamily: fonts.body,
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                backdropFilter: "blur(8px)",
              }}
            >
              שיעור {lessonNumber} מתוך {totalInSeries}
            </span>
          </div>

          {/* Big editorial title */}
          <h1
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "clamp(2.4rem, 6vw, 4.5rem)",
              color: "rgba(255,255,255,0.97)",
              textShadow: "0 4px 30px rgba(0,0,0,0.5)",
              margin: "0 0 1rem",
              lineHeight: 1.1,
              fontStyle: "italic",
              maxWidth: 900,
            }}
          >
            {lesson.title}
          </h1>

          {/* Meta row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.25rem",
              flexWrap: "wrap",
              fontFamily: fonts.body,
              fontSize: "0.92rem",
              color: "rgba(255,255,255,0.85)",
              marginBottom: "2rem",
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: gradients.goldButton,
                  border: "2px solid rgba(255,255,255,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  color: "white",
                }}
              >
                {rabbiInitial}
              </div>
              <span style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.goldShimmer }}>
                {rabbiName}
              </span>
            </div>

            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.25)" }} />

            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <Clock size={14} />
              {formatDuration(lesson.duration)}
            </div>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              {isAudio ? <Volume2 size={14} /> : <Play size={14} fill="currentColor" />}
              {lessonTypeLabel(lesson.source_type)}
            </div>

            {lesson.published_at && (
              <>
                <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.25)" }} />
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <Calendar size={14} />
                  {new Date(lesson.published_at).toLocaleDateString("he-IL")}
                </div>
              </>
            )}
          </div>

          {/* Big play button + secondary actions */}
          <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              style={{
                padding: "1rem 2rem",
                borderRadius: radii.lg,
                border: "none",
                background: gradients.goldButton,
                color: "white",
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "1.05rem",
                cursor: "pointer",
                boxShadow: "0 8px 32px rgba(139,111,71,0.5)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              {isAudio ? <Volume2 size={18} /> : <Play size={18} fill="currentColor" />}
              {isAudio ? "האזן עכשיו" : "צפה עכשיו"}
            </button>
            <ActionGlass icon={<Bookmark size={16} />} label="שמור" />
            <ActionGlass icon={<Heart size={16} />} label="מועדפים" />
            <ActionGlass icon={<Share2 size={16} />} label="שתף" />
            <ActionGlass icon={<Download size={16} />} label="הורד" />
          </div>
        </div>
      </div>

      {/* ─── Two-column body: content + sidebar ─── */}
      <section style={{ background: colors.parchment, padding: "5rem 1.5rem 4rem" }}>
        <div
          dir="rtl"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 320px",
            gap: "3rem",
          }}
          className="lesson-page-grid"
        >
          {/* Left column: long-form content */}
          <article>
            {/* Description */}
            {lesson.description && (
              <>
                <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  תקציר השיעור
                </div>
                <p style={{ fontFamily: fonts.body, fontSize: "1.1rem", lineHeight: 2, color: colors.textMid, margin: "0 0 2rem" }}>
                  {lesson.description}
                </p>
              </>
            )}
            {!lesson.description && (
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: "1rem",
                  lineHeight: 1.95,
                  color: colors.textMuted,
                  fontStyle: "italic",
                  padding: "1.25rem 1.5rem",
                  background: "rgba(196,162,101,0.06)",
                  borderRadius: radii.md,
                  borderInlineStart: `4px solid ${colors.goldLight}`,
                  marginBottom: "2.5rem",
                }}
              >
                שיעור מסדרת <strong>{series.title}</strong> מאת <strong>{rabbiName}</strong>. תקציר מלא יתווסף בקרוב.
              </div>
            )}

            {/* Pull quote */}
            <div
              style={{
                margin: "2.5rem 0",
                padding: "2rem 2.25rem",
                background: "#fdf8ee",
                borderInlineEnd: `4px solid ${colors.goldLight}`,
                borderRadius: radii.md,
                fontFamily: fonts.display,
                fontSize: "1.3rem",
                lineHeight: 1.7,
                color: colors.textDark,
                fontStyle: "italic",
                position: "relative",
              }}
            >
              <span style={{ position: "absolute", top: "0.5rem", insetInlineStart: "1rem", fontFamily: fonts.display, fontSize: "3.5rem", color: "rgba(196,162,101,0.3)", lineHeight: 1, fontStyle: "normal" }}>
                "
              </span>
              <p style={{ margin: 0, paddingInlineStart: "1.5rem" }}>
                "{lesson.title}" — שיעור {lessonNumber} מתוך הסדרה השלמה של {rabbiName}, שמבינה את התנ״ך כתורת חיים.
              </p>
            </div>

            {/* Audio player (sticky-feel) */}
            <div
              style={{
                margin: "2.5rem 0",
                padding: "1.25rem 1.5rem",
                background: gradients.warmDark,
                color: "white",
                borderRadius: radii.xl,
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: "1.25rem",
                alignItems: "center",
                boxShadow: "0 12px 40px rgba(45,31,14,0.25)",
              }}
            >
              <button
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: gradients.goldButton,
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: shadows.goldGlow,
                }}
              >
                {isAudio ? <Volume2 size={22} /> : <Play size={22} fill="currentColor" />}
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1rem", marginBottom: "0.4rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {lesson.title}
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "0%", background: gradients.goldButton, borderRadius: 2 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem", fontFamily: fonts.body, fontSize: "0.72rem", color: "rgba(255,255,255,0.6)" }}>
                  <span>0:00</span>
                  <span>{formatDuration(lesson.duration)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {[0.75, 1.0, 1.25, 1.5].map((s) => (
                  <button
                    key={s}
                    style={{
                      padding: "0.3rem 0.55rem",
                      borderRadius: radii.sm,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: s === 1.0 ? "rgba(232,213,160,0.18)" : "transparent",
                      color: s === 1.0 ? colors.goldShimmer : "rgba(255,255,255,0.65)",
                      fontFamily: fonts.body,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            {/* Dedication CTA */}
            <div
              style={{
                margin: "2.5rem 0",
                padding: "1.5rem 1.75rem",
                background: "rgba(196,162,101,0.06)",
                border: `1px solid rgba(196,162,101,0.2)`,
                borderRadius: radii.lg,
                display: "flex",
                gap: "1rem",
                alignItems: "center",
              }}
            >
              <Flame style={{ width: 28, height: 28, color: colors.goldDark, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1rem", color: colors.textDark, marginBottom: "0.2rem" }}>
                  הקדישו את השיעור הזה
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, lineHeight: 1.6 }}>
                  לעילוי נשמת יקיריכם — השיעור יוצג עם ההקדשה לכל הלומדים.
                </div>
              </div>
              <button
                style={{
                  padding: "0.6rem 1.1rem",
                  borderRadius: radii.md,
                  border: `1.5px solid ${colors.goldDark}`,
                  background: "transparent",
                  color: colors.goldDark,
                  fontFamily: fonts.accent,
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                הקדש
              </button>
            </div>

            {/* Comments placeholder */}
            <div style={{ margin: "3rem 0" }}>
              <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.3rem", color: colors.textDark, margin: "0 0 1rem" }}>
                תגובות לומדים
              </h2>
              <div style={{ padding: "1.25rem 1.5rem", background: "rgba(245,240,232,0.5)", border: `1px dashed rgba(139,111,71,0.2)`, borderRadius: radii.md, fontFamily: fonts.body, fontSize: "0.9rem", color: colors.textMuted, textAlign: "center", lineHeight: 1.7 }}>
                התגובות פתוחות לחברי הקהילה. <Link to="/community" style={{ color: colors.goldDark, fontWeight: 600 }}>הצטרף לקהילה</Link>
              </div>
            </div>
          </article>

          {/* Right column (start in RTL): related lessons + series progress */}
          <aside>
            <div
              style={{
                position: "sticky",
                top: 120,
                background: "white",
                borderRadius: radii.xl,
                padding: "1.5rem",
                border: `1px solid rgba(139,111,71,0.1)`,
                boxShadow: shadows.cardSoft,
              }}
            >
              {/* Series progress */}
              <div style={{ marginBottom: "1.5rem", paddingBottom: "1.25rem", borderBottom: `1px solid rgba(139,111,71,0.08)` }}>
                <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  התקדמות בסדרה
                </div>
                <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.1rem", color: colors.textDark, marginBottom: "0.85rem" }}>
                  {series.title}
                </div>
                <div style={{ height: 6, background: "rgba(139,111,71,0.1)", borderRadius: 3, overflow: "hidden", marginBottom: "0.4rem" }}>
                  <div style={{ width: `${(lessonNumber / totalInSeries) * 100}%`, height: "100%", background: gradients.goldButton, borderRadius: 3 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted }}>
                  <span>שיעור {lessonNumber} מתוך {totalInSeries}</span>
                  <span style={{ color: colors.goldDark, fontWeight: 700 }}>{Math.round((lessonNumber / totalInSeries) * 100)}%</span>
                </div>
              </div>

              {/* Other lessons in series */}
              <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.85rem" }}>
                שיעורים בסדרה
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {otherLessons.map((l) => (
                  <Link
                    key={l.id}
                    to={`/design-lesson-page/${l.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.65rem",
                      padding: "0.55rem 0.7rem",
                      borderRadius: radii.sm,
                      textDecoration: "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,111,71,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: gradients.goldButton,
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Play size={10} fill="currentColor" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: "0.82rem", color: colors.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {l.title}
                      </div>
                      <div style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.textMuted }}>
                        {formatDuration(l.duration)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <Link
                to={`/design-series-page/${series.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  marginTop: "1rem",
                  padding: "0.6rem",
                  borderRadius: radii.md,
                  background: "rgba(196,162,101,0.06)",
                  color: colors.goldDark,
                  fontFamily: fonts.body,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  border: `1px solid rgba(196,162,101,0.2)`,
                }}
              >
                <ArrowLeft size={13} />
                ראה את כל הסדרה
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .lesson-page-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
        }
      `}</style>
    </DesignLayout>
  );
}

function ActionGlass({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      style={{
        padding: "0.85rem 1.1rem",
        borderRadius: radii.lg,
        border: "1.5px solid rgba(255,255,255,0.25)",
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        color: "rgba(255,255,255,0.92)",
        fontFamily: fonts.body,
        fontSize: "0.85rem",
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
