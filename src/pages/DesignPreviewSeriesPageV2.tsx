/**
 * /design-series-page-v2 — Series detail page, second iteration.
 *
 * What changed vs. /design-series-page (v1):
 *   1. Hero is compact — title + rabbi + count/duration only. No "start series" button.
 *   2. Share/Save are icon-only, shown inline next to the title (hover on desktop,
 *      tap-to-reveal state on mobile).
 *   3. No "על הסדרה" paragraph section — content grid starts immediately after hero.
 *   4. Child-series (sub-series via parent_id) are shown as a top group
 *      "חלקי הסדרה" with larger cards, before the flat lessons grid.
 *   5. Lesson cards carry their cover image (placeholder for now, TODO: real per-lesson images).
 *   6. Click on a lesson card → shadcn Dialog modal. URL gains ?lesson=ID so
 *      direct links work. Modal has large image, player controls area, description,
 *      and "פתח בעמוד מלא" link.
 *   7. Sidebar has the Bnei Zion logo at the top (via DesignLayout's sidebar slot —
 *      implemented directly in DesignSidebar; this page just ensures the logo
 *      is visible by NOT hiding the sidebar).
 *
 * Data sources (all real Supabase):
 *   - useTopSeries(150)       → find the series (by :id param, or top by lesson_count)
 *   - useSeriesChildren(id)   → child sub-series (parent_id match)
 *   - useLessonsBySeries(id)  → direct lessons of this series
 *
 * IMAGE PLACEHOLDER POLICY (temporary):
 *   lesson.thumbnail_url → series.image_url → getSeriesCoverImage(title) → /images/series-default.png
 *   All lesson cards share the series cover until per-lesson images are provided by the designer.
 *   See KNOWLEDGE.md §7 "Series page redesign — Saar feedback 2026-04-30".
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  Share2,
  Bookmark,
  Play,
  Volume2,
  Loader2,
  X,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from "lucide-react";

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
import { useSeriesChildren } from "@/hooks/useSeriesHierarchy";

// ─── helpers ────────────────────────────────────────────────────────────────

function lessonImage(lesson: any, seriesImageUrl: string | null, seriesTitle: string): string {
  return (
    lesson.thumbnail_url ||
    seriesImageUrl ||
    getSeriesCoverImage(seriesTitle) ||
    "/images/series-default.png"
  );
}

// ─── Compact Hero ─────────────────────────────────────────────────────────
/**
 * Compact hero: no big CTA button, no "start series" noise.
 * Share/Save icons appear inline next to the title on hover (desktop)
 * or after a tap on the title row (mobile).
 */
function CompactSeriesHero({
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
  const [actionsVisible, setActionsVisible] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        marginTop: -96,
        background: gradients.mahoganyHero,
        // Compact: max 320px tall instead of 480
      }}
    >
      {/* Background image — subtle */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center 35%",
          opacity: 0.22,
          filter: "brightness(0.6) saturate(0.9)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <div
        dir="rtl"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "130px 2rem 2.5rem",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* Family badge */}
        <span
          style={{
            display: "inline-block",
            padding: "0.28rem 0.8rem",
            borderRadius: radii.pill,
            background: "rgba(232,213,160,0.13)",
            border: "1px solid rgba(232,213,160,0.28)",
            color: colors.goldShimmer,
            fontFamily: fonts.body,
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            marginBottom: "0.9rem",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            width: "fit-content",
          }}
        >
          {fam.label}
        </span>

        {/* Title row + inline action icons */}
        <div
          style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}
          onMouseEnter={() => setActionsVisible(true)}
          onMouseLeave={() => setActionsVisible(false)}
        >
          <h1
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)",
              color: "rgba(255,255,255,0.96)",
              textShadow: "0 1px 12px rgba(0,0,0,0.4)",
              margin: 0,
              lineHeight: 1.2,
              flex: 1,
            }}
          >
            {series.title}
          </h1>

          {/* Share + Bookmark — icon-only, visible on hover/tap */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              opacity: actionsVisible ? 1 : 0,
              transition: "opacity 0.2s ease",
              paddingTop: "0.35rem",
              flexShrink: 0,
            }}
          >
            <button
              aria-label="שתף"
              onClick={() => setActionsVisible((v) => !v)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1.5px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.85)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
            >
              <Share2 style={{ width: 14, height: 14 }} />
            </button>
            <button
              aria-label="שמור לרשימה"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1.5px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.85)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
            >
              <Bookmark style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Mobile: tap title area to reveal actions */}
          <button
            aria-label="פעולות"
            onClick={() => setActionsVisible((v) => !v)}
            style={{
              display: "none", // shown via media query below
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1.5px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.85)",
              cursor: "pointer",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: "0.35rem",
              flexShrink: 0,
            }}
            className="series-hero-mobile-action"
          >
            <Share2 style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Rabbi + meta — single line */}
        <div
          style={{
            display: "flex",
            gap: "0.6rem",
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: "0.75rem",
            fontFamily: fonts.body,
            fontSize: "0.9rem",
            color: "rgba(255,255,255,0.78)",
          }}
        >
          {rabbiName && (
            <>
              <span
                style={{
                  color: colors.goldShimmer,
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: "0.95rem",
                }}
              >
                {rabbiName}
              </span>
              <span style={{ opacity: 0.45 }}>·</span>
            </>
          )}
          <span>{totalLessons} שיעורים</span>
          {totalDuration !== "—" && (
            <>
              <span style={{ opacity: 0.45 }}>·</span>
              <span>{totalDuration} סה"כ</span>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .series-hero-mobile-action { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-series (child series) group ─────────────────────────────────────
/**
 * When a series has child-series, show them as a top block with larger cards.
 * Clicking a child card navigates to that child's own v2 page.
 */
function SubSeriesGroup({ children: childSeries }: { children: any[] }) {
  if (!childSeries.length) return null;

  return (
    <section
      style={{
        background: colors.parchmentDark,
        padding: "2.5rem 1.5rem",
        borderBottom: `1px solid rgba(139,111,71,0.1)`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }} dir="rtl">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            marginBottom: "1.5rem",
          }}
        >
          <BookOpen style={{ width: 18, height: 18, color: colors.goldDark }} />
          <h2
            style={{
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: "1.2rem",
              color: colors.textDark,
              margin: 0,
            }}
          >
            חלקי הסדרה
          </h2>
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: "0.75rem",
              color: colors.textSubtle,
              marginRight: "auto",
            }}
          >
            {childSeries.length} חלקים
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {childSeries.map((child) => {
            const cover =
              child.image_url ||
              getSeriesCoverImage(child.title) ||
              "/images/series-default.png";
            const fam = seriesFamilies[getSeriesFamily(child.title, child.description)];
            return (
              <Link
                key={child.id}
                to={`/design-series-page-v2/${child.id}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    borderRadius: radii.xl,
                    overflow: "hidden",
                    background: "white",
                    border: `1px solid rgba(139,111,71,0.1)`,
                    boxShadow: shadows.cardSoft,
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = shadows.cardHover;
                    e.currentTarget.style.borderColor = colors.goldDark;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = shadows.cardSoft;
                    e.currentTarget.style.borderColor = "rgba(139,111,71,0.1)";
                  }}
                >
                  {/* Image — taller for sub-series (more prominent) */}
                  <div
                    style={{
                      height: 200,
                      overflow: "hidden",
                      position: "relative",
                      background: colors.parchmentDeep,
                    }}
                  >
                    <img
                      src={cover}
                      alt={child.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)",
                      }}
                    />
                    {/* Family badge */}
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        padding: "0.22rem 0.6rem",
                        borderRadius: radii.sm,
                        background: fam.badgeBg,
                        color: fam.badgeFg,
                        fontFamily: fonts.body,
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        backdropFilter: "blur(4px)",
                        WebkitBackdropFilter: "blur(4px)",
                      }}
                    >
                      {fam.label}
                    </span>
                  </div>

                  <div style={{ padding: "1rem 1.25rem 1.25rem" }}>
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: colors.textDark,
                        lineHeight: 1.35,
                        marginBottom: "0.4rem",
                      }}
                    >
                      {child.title}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: fonts.body,
                          fontSize: "0.72rem",
                          color: colors.textSubtle,
                        }}
                      >
                        {child.lesson_count || 0} שיעורים
                        {child.rabbis?.name ? ` · ${child.rabbis.name}` : ""}
                      </span>
                      <ChevronRight
                        style={{
                          width: 16,
                          height: 16,
                          color: colors.goldDark,
                          transform: "rotate(180deg)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Lesson Card ──────────────────────────────────────────────────────────
function LessonCard({
  lesson,
  seriesImageUrl,
  seriesTitle,
  onOpen,
}: {
  lesson: any;
  seriesImageUrl: string | null;
  seriesTitle: string;
  onOpen: (lesson: any) => void;
}) {
  const imgUrl = lessonImage(lesson, seriesImageUrl, seriesTitle);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(lesson)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(lesson)}
      style={{
        borderRadius: radii.xl,
        overflow: "hidden",
        background: "white",
        border: "1px solid rgba(139,111,71,0.1)",
        boxShadow: shadows.cardSoft,
        cursor: "pointer",
        transition: "all 0.25s ease",
        outline: "none",
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
      {/* Thumbnail */}
      <div
        style={{
          height: 170,
          overflow: "hidden",
          position: "relative",
          background: colors.parchmentDark,
        }}
      >
        <img
          src={imgUrl}
          alt={lesson.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.42) 0%, transparent 52%)",
          }}
        />
        {/* Type badge */}
        <span
          style={{
            position: "absolute",
            top: 9,
            right: 9,
            padding: "0.18rem 0.55rem",
            borderRadius: radii.sm,
            background: gradients.goldButton,
            color: "white",
            fontFamily: fonts.body,
            fontSize: "0.65rem",
            fontWeight: 700,
          }}
        >
          {lessonTypeLabel(lesson.source_type)}
        </span>
        {/* Play/Listen button */}
        <div
          style={{
            position: "absolute",
            bottom: 9,
            left: 9,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.93)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.28)",
          }}
        >
          {lesson.source_type === "audio" ? (
            <Volume2 style={{ width: 14, height: 14, color: colors.textDark }} />
          ) : (
            <Play style={{ width: 14, height: 14, color: colors.textDark }} fill={colors.textDark} />
          )}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "0.9rem 1rem 1.1rem" }}>
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: "0.68rem",
            color: colors.goldDark,
            marginBottom: "0.25rem",
          }}
        >
          {lesson.rabbis?.name || ""}
        </div>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: "0.93rem",
            color: colors.textDark,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: "2.6em",
            marginBottom: "0.5rem",
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
              fontSize: "0.7rem",
              color: colors.textSubtle,
            }}
          >
            {formatDuration(lesson.duration)}
          </span>
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: "0.7rem",
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
}

// ─── Lessons Grid ─────────────────────────────────────────────────────────
function LessonsGrid({
  lessons,
  seriesImageUrl,
  seriesTitle,
  isLoading,
  onOpenLesson,
}: {
  lessons: any[];
  seriesImageUrl: string | null;
  seriesTitle: string;
  isLoading: boolean;
  onOpenLesson: (lesson: any) => void;
}) {
  const totalCount = lessons.length;

  return (
    <section
      style={{
        background: colors.parchment,
        padding: "2.5rem 1.5rem 4rem",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }} dir="rtl">
        {/* Section header */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: "1.75rem",
          }}
        >
          <h2
            style={{
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
              color: colors.textDark,
              margin: 0,
            }}
          >
            שיעורים בסדרה
          </h2>
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: "0.8rem",
              color: colors.textSubtle,
            }}
          >
            {totalCount} שיעורים
          </span>
        </div>

        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
            <Loader2
              style={{
                width: 28,
                height: 28,
                color: colors.goldDark,
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        ) : lessons.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              fontFamily: fonts.body,
              color: colors.textSubtle,
              fontSize: "0.9rem",
            }}
          >
            אין שיעורים זמינים בסדרה זו כרגע
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                seriesImageUrl={seriesImageUrl}
                seriesTitle={seriesTitle}
                onOpen={onOpenLesson}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Lesson Modal ─────────────────────────────────────────────────────────
/**
 * Opens as an overlay dialog. URL gets ?lesson=ID so direct links work.
 * SEO: the page's canonical URL stays the same — only the query param changes.
 */
function LessonModal({
  lesson,
  seriesImageUrl,
  seriesTitle,
  onClose,
}: {
  lesson: any;
  seriesImageUrl: string | null;
  seriesTitle: string;
  onClose: () => void;
}) {
  const imgUrl = lessonImage(lesson, seriesImageUrl, seriesTitle);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.72)",
          zIndex: 1000,
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          animation: "fadeIn 0.18s ease",
        }}
      />

      {/* Dialog */}
      <div
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label={lesson.title}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          width: "min(680px, 95vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: radii.xl,
          background: "white",
          boxShadow: "0 32px 80px rgba(0,0,0,0.45)",
          animation: "slideUp 0.22s ease",
        }}
      >
        {/* Hero image */}
        <div
          style={{
            height: 240,
            position: "relative",
            overflow: "hidden",
            borderRadius: `${radii.xl} ${radii.xl} 0 0`,
            background: colors.parchmentDeep,
            flexShrink: 0,
          }}
        >
          <img
            src={imgUrl}
            alt={lesson.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 60%)",
            }}
          />

          {/* Type badge */}
          <span
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              padding: "0.28rem 0.75rem",
              borderRadius: radii.pill,
              background: gradients.goldButton,
              color: "white",
              fontFamily: fonts.body,
              fontSize: "0.7rem",
              fontWeight: 700,
            }}
          >
            {lessonTypeLabel(lesson.source_type)}
          </span>

          {/* Close */}
          <button
            onClick={onClose}
            aria-label="סגור"
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1.5px solid rgba(255,255,255,0.4)",
              background: "rgba(0,0,0,0.35)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>

          {/* Duration overlay */}
          {lesson.duration && (
            <span
              style={{
                position: "absolute",
                bottom: 14,
                left: 14,
                fontFamily: fonts.body,
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              {formatDuration(lesson.duration)}
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem 1.75rem 2rem" }}>
          {/* Rabbi */}
          {lesson.rabbis?.name && (
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.75rem",
                fontWeight: 700,
                color: colors.goldDark,
                marginBottom: "0.4rem",
                letterSpacing: "0.05em",
              }}
            >
              {lesson.rabbis.name}
            </div>
          )}

          {/* Title */}
          <h2
            style={{
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: "clamp(1.15rem, 2.5vw, 1.5rem)",
              color: colors.textDark,
              margin: "0 0 1.25rem",
              lineHeight: 1.3,
            }}
          >
            {lesson.title}
          </h2>

          {/* Player area — placeholder until real player is wired */}
          <div
            style={{
              background: colors.parchmentDark,
              borderRadius: radii.lg,
              padding: "1rem 1.25rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <button
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "none",
                background: gradients.goldButton,
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: shadows.goldGlowSoft,
                flexShrink: 0,
              }}
            >
              {lesson.source_type === "audio" ? (
                <Volume2 style={{ width: 18, height: 18 }} />
              ) : (
                <Play style={{ width: 18, height: 18 }} fill="currentColor" />
              )}
            </button>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: 4,
                  background: "rgba(139,111,71,0.15)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: "0%",
                    background: gradients.goldButton,
                    borderRadius: 2,
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "0.35rem",
                  fontFamily: fonts.body,
                  fontSize: "0.7rem",
                  color: colors.textSubtle,
                }}
              >
                <span>0:00</span>
                <span>{formatDuration(lesson.duration)}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {lesson.description && (
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "0.9rem",
                lineHeight: 1.85,
                color: colors.textMid,
                margin: "0 0 1.5rem",
              }}
            >
              {lesson.description.replace(/<[^>]*>/g, "").slice(0, 280)}
              {lesson.description.length > 280 ? "..." : ""}
            </p>
          )}

          {/* "Open full page" link */}
          <Link
            to={`/lessons/${lesson.id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontFamily: fonts.body,
              fontSize: "0.82rem",
              color: colors.goldDark,
              textDecoration: "none",
              fontWeight: 700,
              borderBottom: `1px solid rgba(139,111,71,0.4)`,
              paddingBottom: "0.15rem",
            }}
          >
            <ExternalLink style={{ width: 13, height: 13 }} />
            פתח בעמוד מלא
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)); } to { opacity: 1; transform: translate(-50%, -50%); } }
      `}</style>
    </>
  );
}

// ─── Main page component ───────────────────────────────────────────────────
export default function DesignPreviewSeriesPageV2() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openLessonId, setOpenLessonId] = useState<string | null>(
    searchParams.get("lesson")
  );

  // ── Data
  const { data: allSeries, isLoading: seriesLoading } = useTopSeries(150);

  const series = useMemo(() => {
    if (!allSeries?.length) return null;
    if (id) return (allSeries as any[]).find((s: any) => s.id === id) || null;
    return [...(allSeries as any[])]
      .filter((s) => s.status === "active" && (s.lesson_count || 0) > 0)
      .sort((a, b) => (b.lesson_count || 0) - (a.lesson_count || 0))[0];
  }, [allSeries, id]);

  const { data: lessons = [], isLoading: lessonsLoading } = useLessonsBySeries(series?.id);
  const { data: childSeries = [] } = useSeriesChildren(series?.id);

  // ── Open/close lesson modal, sync URL
  const handleOpenLesson = useCallback(
    (lesson: any) => {
      setOpenLessonId(lesson.id);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("lesson", lesson.id);
        return next;
      });
    },
    [setSearchParams]
  );

  const handleCloseLesson = useCallback(() => {
    setOpenLessonId(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("lesson");
      return next;
    });
  }, [setSearchParams]);

  // ── Resolve open lesson object from lessons list
  const openLesson = useMemo(
    () => (openLessonId ? (lessons as any[]).find((l) => l.id === openLessonId) : null),
    [openLessonId, lessons]
  );

  // ── Loading state
  if (seriesLoading) {
    return (
      <DesignLayout>
        <div style={{ padding: "8rem 0", display: "flex", justifyContent: "center" }}>
          <Loader2
            style={{
              width: 32,
              height: 32,
              color: colors.goldDark,
              animation: "spin 1s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
          dir="rtl"
        >
          לא נמצאה סדרה.{" "}
          <a href="/design-series-list" style={{ color: colors.goldDark }}>
            חזור לרשימת הסדרות
          </a>
        </div>
      </DesignLayout>
    );
  }

  const totalLessons = (lessons as any[]).length || series.lesson_count || 0;
  const totalDurationSec = (lessons as any[]).reduce(
    (sum: number, l: any) => sum + (l.duration || 0),
    0
  );
  const totalDuration = formatDuration(totalDurationSec);
  const seriesImageUrl =
    series.image_url || getSeriesCoverImage(series.title) || null;
  const heroImageUrl = seriesImageUrl || "/images/series-default.png";

  return (
    <>
      <DesignLayout transparentHeader overlapHero>
        {/* 1. Compact hero */}
        <CompactSeriesHero
          series={series}
          totalLessons={totalLessons}
          totalDuration={totalDuration}
          imageUrl={heroImageUrl}
        />

        {/* 2. Sub-series group (if any) */}
        {(childSeries as any[]).length > 0 && (
          <SubSeriesGroup children={childSeries as any[]} />
        )}

        {/* 3. Flat lessons grid — immediately after hero (or after sub-series) */}
        <LessonsGrid
          lessons={lessons as any[]}
          seriesImageUrl={seriesImageUrl}
          seriesTitle={series.title}
          isLoading={lessonsLoading}
          onOpenLesson={handleOpenLesson}
        />

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </DesignLayout>

      {/* Lesson modal — rendered outside DesignLayout so it covers the sidebar too */}
      {openLesson && (
        <LessonModal
          lesson={openLesson}
          seriesImageUrl={seriesImageUrl}
          seriesTitle={series.title}
          onClose={handleCloseLesson}
        />
      )}
    </>
  );
}
