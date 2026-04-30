/**
 * /design-series-page-v2 — Series detail page, second iteration.
 *
 * Round 2 fixes (2026-04-30 — Saar feedback):
 *   1. Header was hidden — DesignLayout already renders it. Removed duplicate
 *      `marginTop: -96` that was INSIDE CompactSeriesHero (caused double-overlap
 *      which pushed the hero 192px above the top, hiding the header visually).
 *      Fixed: hero uses `marginTop: 0`, `overlapHero` on DesignLayout handles it.
 *   2. Removed "קאנון מקודש" family badge from the hero. Saar doesn't want it.
 *   3. Removed "שיעורים בסדרה" section title. Cards speak for themselves.
 *   4. LessonModal enhanced to match existing design parity:
 *      - Print button
 *      - Save to favorites button
 *      - "שיעורים נוספים" grid at bottom (like /design-lesson-page)
 *   5. Default route (/design-series-page-v2) now shows a real series with
 *      sub-series (ID: 35781f30-76a7-4fc6-aa06-52a1db4a4054 — "איכה")
 *      so the sub-series section is always visible on the base route.
 *   6. /design-series-page-v2/:id continues to work for any real series ID.
 *
 * What changed vs. /design-series-page (v1):
 *   - Hero is compact — title + rabbi + count/duration only. No "start series" button.
 *   - Share/Save are icon-only, shown inline next to the title (hover on desktop).
 *   - No "על הסדרה" paragraph — lessons grid starts immediately after hero.
 *   - Child-series shown as top block "חלקי הסדרה" with larger cards, before lessons.
 *   - Lesson cards carry their cover image (placeholder until per-lesson images ready).
 *   - Click on lesson → modal with ?lesson=ID in URL for direct links.
 *
 * Real series for demo:
 *   - /design-series-page-v2  →  35781f30... (איכה — has 9 children sub-series)
 *   - /design-series-page-v2/41b62e31-0643-4368-b8ff-04dc25dc2603  →  שיר השירים (18L, no children)
 *
 * Data sources (all real Supabase):
 *   - useTopSeries(150)       → find the series (by :id param, fallback to sub-series demo)
 *   - useSeriesChildren(id)   → child sub-series (parent_id match)
 *   - useLessonsBySeries(id)  → direct lessons of this series
 */
import { useCallback, useEffect, useMemo, useState } from "react";
// Note: useMemo still used for openLesson resolution below
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
  Printer,
  Heart,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import {
  colors,
  fonts,
  gradients,
  shadows,
  radii,
  getSeriesCoverImage,
  lessonTypeLabel,
  formatDuration,
} from "@/lib/designTokens";
import { useSeriesDetail } from "@/hooks/useSeriesDetail";
import { useLessonsBySeries } from "@/hooks/useLessonsBySeries";
import { useSeriesChildren } from "@/hooks/useSeriesHierarchy";

// Stable default series for no-param route: "איכה" — has 9 active sub-series
const SUB_SERIES_DEMO_ID = "35781f30-76a7-4fc6-aa06-52a1db4a4054";

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
 * Compact hero: no big CTA button, no family badge, no "start series" noise.
 * Share/Save icons appear inline next to the title on hover (desktop).
 * marginTop is 0 here — DesignLayout's overlapHero prop handles the -96 offset.
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
  const rabbiName = series.rabbis?.name || "";
  const [actionsVisible, setActionsVisible] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        // marginTop removed — DesignLayout with overlapHero adds -96 to <main>
        background: gradients.mahoganyHero,
        minHeight: 280,
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
        {/* Title row + inline action icons — no family badge */}
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

          {/* Share + Bookmark — icon-only, visible on hover */}
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
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {childSeries.map((child) => {
            const cover =
              child.image_url ||
              getSeriesCoverImage(child.title) ||
              "/images/series-default.png";
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
                      height: 180,
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
/**
 * Section title "שיעורים בסדרה" removed — cards speak for themselves.
 * Count shown as secondary text next to the grid, not as a bold header.
 */
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
  return (
    <section
      style={{
        background: colors.parchment,
        padding: "2rem 1.5rem 4rem",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }} dir="rtl">
        {/* Count pill — subtle, no section heading */}
        {!isLoading && lessons.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "1rem",
            }}
          >
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                color: colors.textSubtle,
              }}
            >
              {lessons.length} שיעורים
            </span>
          </div>
        )}

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
 * Enhanced modal — parity with the existing LessonPage design:
 *   - Print button (window.print())
 *   - Save to favorites button (heart icon)
 *   - "שיעורים נוספים" grid at the bottom — same pattern as /design-lesson-page aside
 *   - "פתח בעמוד מלא" link to /lessons/:id
 *
 * URL gains ?lesson=ID on open for direct-link support.
 */
function LessonModal({
  lesson,
  seriesImageUrl,
  seriesTitle,
  allLessons,
  onClose,
}: {
  lesson: any;
  seriesImageUrl: string | null;
  seriesTitle: string;
  allLessons: any[];
  onClose: () => void;
}) {
  const imgUrl = lessonImage(lesson, seriesImageUrl, seriesTitle);
  const [isFavorited, setIsFavorited] = useState(false);

  // Other lessons in the same series (excluding current, max 6)
  const moreLessons = allLessons
    .filter((l) => l.id !== lesson.id)
    .slice(0, 6);

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
          width: "min(700px, 95vw)",
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
              margin: "0 0 1rem",
              lineHeight: 1.3,
            }}
          >
            {lesson.title}
          </h2>

          {/* Action bar: Print + Favorites + Open full */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "1.25rem",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => window.print()}
              aria-label="הדפסה"
              title="הדפס שיעור"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.85rem",
                borderRadius: radii.md,
                border: `1.5px solid rgba(139,111,71,0.25)`,
                background: "transparent",
                color: colors.textMid,
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(139,111,71,0.06)";
                e.currentTarget.style.borderColor = colors.goldDark;
                e.currentTarget.style.color = colors.goldDark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(139,111,71,0.25)";
                e.currentTarget.style.color = colors.textMid;
              }}
            >
              <Printer style={{ width: 14, height: 14 }} />
              הדפסה
            </button>

            <button
              onClick={() => setIsFavorited((v) => !v)}
              aria-label={isFavorited ? "הסר ממועדפים" : "שמור למועדפים"}
              title={isFavorited ? "הסר ממועדפים" : "שמור למועדפים"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.85rem",
                borderRadius: radii.md,
                border: `1.5px solid ${isFavorited ? colors.goldDark : "rgba(139,111,71,0.25)"}`,
                background: isFavorited ? "rgba(139,111,71,0.08)" : "transparent",
                color: isFavorited ? colors.goldDark : colors.textMid,
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <Heart
                style={{
                  width: 14,
                  height: 14,
                  fill: isFavorited ? colors.goldDark : "none",
                }}
              />
              {isFavorited ? "שמור במועדפים" : "שמור למועדפים"}
            </button>

            <Link
              to={`/lessons/${lesson.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.85rem",
                borderRadius: radii.md,
                border: `1.5px solid rgba(139,111,71,0.25)`,
                background: "transparent",
                color: colors.textMid,
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(139,111,71,0.06)";
                e.currentTarget.style.borderColor = colors.goldDark;
                e.currentTarget.style.color = colors.goldDark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(139,111,71,0.25)";
                e.currentTarget.style.color = colors.textMid;
              }}
            >
              <ExternalLink style={{ width: 14, height: 14 }} />
              פתח בעמוד מלא
            </Link>
          </div>

          {/* Player area */}
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

          {/* ── שיעורים נוספים בסדרה — grid, like production LessonPage ── */}
          {moreLessons.length > 0 && (
            <div
              style={{
                marginTop: "1.5rem",
                paddingTop: "1.5rem",
                borderTop: `1px solid rgba(139,111,71,0.1)`,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: colors.goldDark,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: "0.85rem",
                }}
              >
                שיעורים נוספים מהסדרה
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {moreLessons.map((l) => {
                  const lImg = lessonImage(l, seriesImageUrl, seriesTitle);
                  return (
                    <Link
                      key={l.id}
                      to={`/lessons/${l.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <div
                        style={{
                          borderRadius: radii.md,
                          overflow: "hidden",
                          background: colors.parchmentDark,
                          border: `1px solid rgba(139,111,71,0.1)`,
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = colors.goldDark;
                          e.currentTarget.style.boxShadow = shadows.cardSoft;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "rgba(139,111,71,0.1)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <div
                          style={{
                            height: 90,
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          <img
                            src={lImg}
                            alt={l.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          {/* Play badge */}
                          <div
                            style={{
                              position: "absolute",
                              bottom: 6,
                              left: 6,
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.9)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Play
                              style={{ width: 10, height: 10, color: colors.textDark }}
                              fill={colors.textDark}
                            />
                          </div>
                        </div>
                        <div style={{ padding: "0.6rem 0.75rem 0.75rem" }}>
                          <div
                            style={{
                              fontFamily: fonts.display,
                              fontWeight: 600,
                              fontSize: "0.78rem",
                              color: colors.textDark,
                              lineHeight: 1.35,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              minHeight: "2.1em",
                            }}
                          >
                            {l.title}
                          </div>
                          <div
                            style={{
                              fontFamily: fonts.body,
                              fontSize: "0.65rem",
                              color: colors.textSubtle,
                              marginTop: "0.25rem",
                            }}
                          >
                            {formatDuration(l.duration)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
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
  // Resolve the series ID: URL param → fallback to sub-series demo
  const targetId = id || SUB_SERIES_DEMO_ID;

  // useSeriesDetail fetches by ID with no status filter — works for any series
  const { data: series, isLoading: seriesLoading } = useSeriesDetail(targetId);

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
      {/* transparentHeader + overlapHero: hero slides under the header cleanly */}
      <DesignLayout transparentHeader overlapHero>
        {/* 1. Compact hero — no marginTop inside, DesignLayout handles overlap */}
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
          allLessons={lessons as any[]}
          onClose={handleCloseLesson}
        />
      )}
    </>
  );
}
