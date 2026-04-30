/**
 * /design-series-page — Single-series detail page, redesigned.
 *
 * Pulls REAL data from Supabase:
 *   - Top series by lesson_count (or specific :id from URL)
 *   - All published lessons of that series
 *   - Other series by the same rabbi (related)
 *
 * Card patterns lifted 1:1 from DesignPreviewHome.tsx.
 */
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Play, Heart, Share2, Flame, BookmarkPlus, Volume2, Loader2 } from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import {
  colors,
  fonts,
  gradients,
  shadows,
  radii,
  seriesFamilies,
  getSeriesFamily,
  getSeriesCoverImage,
  lessonTypeLabel,
  formatDuration,
} from "@/lib/designTokens";
import { useTopSeries } from "@/hooks/useTopSeries";
import { useLessonsBySeries } from "@/hooks/useLessonsBySeries";
import { TeacherContentBadge } from "@/components/ui/TeacherContentBadge";

// ────────────────────────────────────────────────────────────────────────
// Hero — full-bleed mahogany w/ family-aware accent
// ────────────────────────────────────────────────────────────────────────
function SeriesHero({
  series,
  totalLessons,
  totalDuration,
  imageUrl,
}: {
  series: any;
  totalLessons: number;
  totalDuration: string;
  imageUrl: string;
}) {
  const fam = seriesFamilies[getSeriesFamily(series.title, series.description)];
  const rabbiName = series.rabbis?.name || "";

  return (
    <div
      style={{
        minHeight: 480,
        position: "relative",
        overflow: "hidden",
        marginTop: -96,
        background: gradients.mahoganyHero,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center 35%",
          opacity: 0.32,
          filter: "brightness(0.7) saturate(1.1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(0,0,0,0.55) 100%)",
        }}
      />

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

        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1rem" }}>
          <div style={{ width: 50, height: 1, background: "rgba(232,213,160,0.45)" }} />
          <div style={{ width: 7, height: 7, background: colors.goldShimmer, transform: "rotate(45deg)" }} />
          <div style={{ width: 50, height: 1, background: "rgba(232,213,160,0.45)" }} />
        </div>

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
          {series.title}
        </h1>

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
            marginBottom: "1.5rem",
          }}
        >
          {rabbiName && (
            <>
              <span style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.goldShimmer }}>
                {rabbiName}
              </span>
              <span style={{ opacity: 0.5 }}>·</span>
            </>
          )}
          <span>{totalLessons} שיעורים</span>
          {totalDuration !== "—" && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{totalDuration}</span>
            </>
          )}
        </div>

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

// ────────────────────────────────────────────────────────────────────────
// Description block — pulls real description; if empty, hides the section
// ────────────────────────────────────────────────────────────────────────
function DescriptionBlock({ series, totalLessons }: { series: any; totalLessons: number }) {
  const description = series.description?.trim();
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
          {description ? "על מה הסדרה הזאת" : `${totalLessons} שיעורים מאת ${series.rabbis?.name || "המרצה"}`}
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
          {description ||
            `סדרת לימוד שיטתית בת ${totalLessons} שיעורים. אפשר להתחיל מהשיעור הראשון ולעבור לפי הסדר, או לבחור שיעור ספציפי לפי הנושא. כל שיעור עומד בפני עצמו, אבל המכלול בונה תמונה שלמה ומעמיקה.`}
        </p>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Lessons grid — same card pattern as PopularLessonsSection on home
// ────────────────────────────────────────────────────────────────────────
function LessonsGrid({
  lessons,
  rabbi,
  isLoading,
  totalCount,
}: {
  lessons: any[];
  rabbi: string;
  isLoading: boolean;
  totalCount: number;
}) {
  const LESSON_PLACEHOLDER: Record<string, string> = {
    video: "/images/lesson-video.png",
    audio: "/images/lesson-audio.png",
    text: "/images/lesson-text.png",
    pdf: "/images/lesson-text.png",
  };

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
              {totalCount} שיעורים בסדרה
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
          {totalCount > 12 && (
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
              הצג את כל ה-{totalCount} ←
            </span>
          )}
        </div>

        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
            <Loader2 style={{ width: 28, height: 28, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
          </div>
        ) : (
          <div
            dir="rtl"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {lessons.slice(0, 12).map((lesson) => {
              const thumbUrl =
                lesson.thumbnail_url || LESSON_PLACEHOLDER[lesson.source_type] || "/images/series-default.png";
              return (
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
                  <div style={{ height: 180, overflow: "hidden", position: "relative", background: colors.parchmentDark }}>
                    <img
                      src={thumbUrl}
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
                        right: 10,
                        padding: "0.2rem 0.65rem",
                        borderRadius: radii.sm,
                        background: gradients.goldButton,
                        color: "white",
                        fontFamily: fonts.body,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                      }}
                    >
                      {lessonTypeLabel(lesson.source_type)}
                    </span>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 10,
                        left: 10,
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
                      {lesson.source_type === "audio" ? (
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
                      {lesson.rabbis?.name || rabbi}
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
                        marginBottom: "0.35rem",
                        minHeight: "2.7em",
                      }}
                    >
                      {lesson.title}
                    </div>
                    <div style={{ marginBottom: "0.35rem" }}>
                      <TeacherContentBadge tags={(lesson as any).audience_tags} variant="small" />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span
                        style={{
                          fontFamily: fonts.body,
                          fontSize: "0.72rem",
                          color: colors.textSubtle,
                        }}
                      >
                        {formatDuration(lesson.duration)}
                      </span>
                      <span
                        style={{
                          fontFamily: fonts.body,
                          fontSize: "0.72rem",
                          color: colors.goldDark,
                          fontWeight: 600,
                        }}
                      >
                        {lesson.source_type === "audio" ? "האזן ←" : "צפה ←"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Related series — other series by same rabbi or in same family
// ────────────────────────────────────────────────────────────────────────
function RelatedSeries({ allSeries, currentSeries }: { allSeries: any[]; currentSeries: any }) {
  const related = useMemo(() => {
    if (!allSeries?.length) return [];
    return allSeries
      .filter((s) => s.id !== currentSeries.id)
      .filter((s) => (s.rabbi_id && s.rabbi_id === currentSeries.rabbi_id) || s.lesson_count > 30)
      .sort((a, b) => (b.lesson_count || 0) - (a.lesson_count || 0))
      .slice(0, 4);
  }, [allSeries, currentSeries]);

  if (related.length === 0) return null;

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
          {related.map((s) => {
            const fam = seriesFamilies[getSeriesFamily(s.title, s.description)];
            const cover = s.image_url || getSeriesCoverImage(s.title) || "/images/series-default.png";
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
                <div style={{ width: "38%", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                  <img src={cover} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: 0,
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
                    <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textSubtle }}>
                      {s.lesson_count} שיעורים{s.rabbis?.name && ` · ${s.rabbis.name}`}
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
                        marginLeft: "0.75rem",
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

// ────────────────────────────────────────────────────────────────────────
// Dedication strip
// ────────────────────────────────────────────────────────────────────────
function DedicationStrip() {
  return (
    <section style={{ background: gradients.warmDark, padding: "3rem 1.5rem", textAlign: "center" }} dir="rtl">
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Flame style={{ width: 24, height: 24, color: colors.goldShimmer, margin: "0 auto 0.75rem" }} />
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
        <h3 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1.5rem", color: "white", margin: "0 0 1rem" }}>
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

// ────────────────────────────────────────────────────────────────────────
export default function DesignPreviewSeriesPage() {
  const { id } = useParams<{ id?: string }>();
  const { data: allSeries, isLoading: seriesLoading } = useTopSeries(150);

  // If no :id passed, default to top series by lesson_count
  const series = useMemo(() => {
    if (!allSeries?.length) return null;
    if (id) return allSeries.find((s: any) => s.id === id) || null;
    return [...(allSeries as any[])]
      .filter((s) => s.status === "active" && (s.lesson_count || 0) > 0)
      .sort((a, b) => (b.lesson_count || 0) - (a.lesson_count || 0))[0];
  }, [allSeries, id]);

  const { data: lessons = [], isLoading: lessonsLoading } = useLessonsBySeries(series?.id);

  if (seriesLoading) {
    return (
      <DesignLayout>
        <div style={{ padding: "8rem 0", display: "flex", justifyContent: "center" }}>
          <Loader2 style={{ width: 32, height: 32, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
        </div>
      </DesignLayout>
    );
  }

  if (!series) {
    return (
      <DesignLayout>
        <div
          style={{
            padding: "8rem 1.5rem",
            textAlign: "center",
            fontFamily: fonts.body,
            color: colors.textMuted,
          }}
        >
          לא נמצאה סדרה. <a href="/design-series-list" style={{ color: colors.goldDark }}>חזור לרשימת הסדרות</a>
        </div>
      </DesignLayout>
    );
  }

  const totalLessons = (lessons as any[]).length || series.lesson_count || 0;
  const totalDurationSec = (lessons as any[]).reduce((sum, l) => sum + (l.duration || 0), 0);
  const totalDuration = formatDuration(totalDurationSec);
  const imageUrl = series.image_url || getSeriesCoverImage(series.title) || "/images/series-default.png";

  return (
    <DesignLayout transparentHeader overlapHero>
      <SeriesHero
        series={series}
        totalLessons={totalLessons}
        totalDuration={totalDuration}
        imageUrl={imageUrl}
      />
      <DescriptionBlock series={series} totalLessons={totalLessons} />
      <LessonsGrid
        lessons={lessons as any[]}
        rabbi={series.rabbis?.name || ""}
        isLoading={lessonsLoading}
        totalCount={totalLessons}
      />
      <RelatedSeries allSeries={(allSeries as any[]) || []} currentSeries={series} />
      <DedicationStrip />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </DesignLayout>
  );
}
