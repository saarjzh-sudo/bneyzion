/**
 * /design-series-page-v2 — Series detail page, second iteration.
 *
 * Round 3 fixes (2026-04-30 — Saar feedback):
 *   1. Header visibility — added stronger top gradient to CompactSeriesHero
 *      so the transparent header is readable even on dark/mixed images (איכה fallback).
 *      The header itself was always there (sticky, 96px); the issue was zero contrast
 *      between the logo/nav links and the hero background. Fix: add
 *      `linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 30%)` as a top overlay.
 *   2. Sub-series hierarchical organization:
 *      - "הצג עוד" collapse after 6 cards
 *      - Group by rabbi name when children span more than 1 rabbi
 *      - If single rabbi or all same: flat grid (no grouping noise)
 *   3. List/Grid toggle above the lessons list (localStorage persist: 'bnz.lesson.view')
 *   4. Media-type filter chips: הכל / אודיו / וידאו / PDF
 *      Derived from: audio_url vs video_url vs attachment_url (no media_type column exists)
 *   5. LessonModal — full production parity with LessonDialog.tsx:
 *      - Gmail share button
 *      - WhatsApp share button
 *      - Real HTML5 audio/video player (not custom progress bar)
 *      - Breadcrumb nav (uses useSeriesBreadcrumb RPC)
 *      - Series pill (Badge)
 *      - Meta bar: מאת + משך + תאריך with icons
 *      - Close X top-right, action icons top-left (Heart / Print / WhatsApp / Gmail)
 *      - Print handler opens branded print window (same as production)
 *
 * Round 2 fixes (previous session):
 *   1. Header was hidden — DesignLayout already renders it. Removed duplicate
 *      `marginTop: -96` that was INSIDE CompactSeriesHero.
 *   2. Removed "קאנון מקודש" family badge.
 *   3. Removed "שיעורים בסדרה" section title.
 *   4. LessonModal enhanced with Print, Favorites, "שיעורים נוספים" grid.
 *   5. Default route now shows "איכה" (35781f30...) with 9 sub-series.
 *   6. useSeriesDetail used instead of useTopSeries (no status filter).
 *
 * Media type detection (no media_type column in DB):
 *   - audio: lesson.audio_url is set and video_url is null
 *   - video: lesson.video_url is set
 *   - pdf:   lesson.attachment_url is set (and no video/audio, or in addition)
 *   - Filter "הכל" shows everything regardless
 *
 * Real series for demo:
 *   - /design-series-page-v2  →  35781f30... (איכה — has 9 children sub-series)
 *   - /design-series-page-v2/41b62e31-0643-4368-b8ff-04dc25dc2603  →  שיר השירים (18L, no children)
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
  ChevronDown,
  ChevronUp,
  Printer,
  Heart,
  Mail,
  Clock,
  Calendar,
  LayoutGrid,
  List,
  FileText,
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
import { useSeriesChildren, useSeriesBreadcrumb } from "@/hooks/useSeriesHierarchy";
import { TeacherContentBadge } from "@/components/ui/TeacherContentBadge";

// Stable default series for no-param route: "איכה" — has 9 active sub-series
const SUB_SERIES_DEMO_ID = "35781f30-76a7-4fc6-aa06-52a1db4a4054";

// localStorage keys for view preferences
const VIEW_PREF_KEY = "bnz.lesson.view";
const SUBSERIES_VIEW_PREF_KEY = "bnz.subseries.view";

// ─── helpers ────────────────────────────────────────────────────────────────

function lessonImage(lesson: any, seriesImageUrl: string | null, seriesTitle: string): string {
  return (
    lesson.thumbnail_url ||
    seriesImageUrl ||
    getSeriesCoverImage(seriesTitle) ||
    "/images/series-default.png"
  );
}

/** Derive media type from lesson's URL columns (no media_type column exists in DB) */
function getLessonMediaType(lesson: any): "audio" | "video" | "pdf" | "text" {
  if (lesson.video_url) return "video";
  if (lesson.audio_url) return "audio";
  if (lesson.attachment_url) return "pdf";
  return "text";
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
}

function isDirectVideo(url: string): boolean {
  const lower = url.toLowerCase();
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/.test(lower);
}

// ─── WhatsApp / Gmail SVG icons (mirrored from production LessonDialog) ──
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ─── Compact Hero ─────────────────────────────────────────────────────────
/**
 * Compact hero — no family badge, no "start series" button.
 * IMPORTANT: marginTop=0 here — DesignLayout overlapHero handles the -96 offset.
 *
 * Round 3 fix: added strong top gradient overlay (rgba 0,0,0,0.5→transparent)
 * so the transparent header logo/links remain visible regardless of image brightness.
 * Previously with dark images (e.g. איכה fallback) there was no contrast and the
 * header appeared "missing" even though it was there.
 */
function CompactSeriesHero({
  series,
  totalLessons,
  totalSubSeries,
  totalDuration,
  imageUrl,
}: {
  series: any;
  totalLessons: number;
  totalSubSeries: number;
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
        background: gradients.mahoganyHero,
        /* NO minHeight — hero height = padding + content only.
           This prevents the ~150px empty gap below the meta row that appeared
           when minHeight:280 was set with justifyContent:flex-end. */
      }}
    >
      {/* Background image — visible but not overwhelming.
          opacity: 0.55 (was 0.22 — too dark/subtle, illustrations barely visible)
          brightness: 0.9 (was 0.6 — was crushing the image, making it look like a dark screen)
          Goal: "beautiful illustration in background", not "dark overlay with text" */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center 35%",
          opacity: 0.55,
          filter: "brightness(0.9) saturate(0.95)",
        }}
      />

      {/* Bottom gradient — subtle text contrast only */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.40) 100%)",
        }}
      />

      {/* TOP gradient — very light vignette for header readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 40%)",
          pointerEvents: "none",
        }}
      />

      <div
        dir="rtl"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          /* padding-top: 2.75rem — slightly more breathing room below the header.
             Bottom: 1.75rem — comfortable gap after the meta row.
             Saar feedback: "2rem top was too tight, expand a bit". */
          padding: "2.75rem 2rem 1.75rem",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
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
          {/* Show lesson count only when there are direct lessons */}
          {totalLessons > 0 && <span>{totalLessons} שיעורים</span>}
          {/* Show sub-series count when they exist */}
          {totalSubSeries > 0 && (
            <>
              {totalLessons > 0 && <span style={{ opacity: 0.45 }}>·</span>}
              <span>{totalSubSeries} חלקי סדרה</span>
            </>
          )}
          {totalDuration !== "—" && totalLessons > 0 && (
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
 * Round 3: hierarchical organization
 * - If >6 children: show 6, then "הצג עוד" toggle
 * - If children span >1 unique rabbi: group by rabbi with small heading
 * - If single rabbi or all same: flat grid (no group noise)
 *
 * Round 4 (Saar feedback):
 * - Added List/Grid toggle for sub-series cards.
 *   Key: bnz.subseries.view (separate from lessons toggle bnz.lesson.view).
 *   No media chips — sub-series are categories, not media.
 */
function SubSeriesGroup({ children: childSeries }: { children: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const INITIAL_SHOW = 6;

  // View mode — persisted in its own localStorage key (separate from lessons)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem(SUBSERIES_VIEW_PREF_KEY) as ViewMode) || "grid";
    } catch {
      return "grid";
    }
  });

  const handleViewChange = (v: ViewMode) => {
    setViewMode(v);
    try {
      localStorage.setItem(SUBSERIES_VIEW_PREF_KEY, v);
    } catch {
      /* blocked */
    }
  };

  if (!childSeries.length) return null;

  // Determine if we should group by rabbi
  const rabbiNames = childSeries
    .map((c) => c.rabbis?.name)
    .filter(Boolean) as string[];
  const uniqueRabbis = [...new Set(rabbiNames)];
  const shouldGroup = uniqueRabbis.length > 1 && uniqueRabbis.length <= 5;

  const visibleSeries = expanded ? childSeries : childSeries.slice(0, INITIAL_SHOW);
  const hasMore = childSeries.length > INITIAL_SHOW;

  // Build groups
  const groups: { rabbi: string | null; items: any[] }[] = shouldGroup
    ? uniqueRabbis.map((r) => ({
        rabbi: r,
        items: visibleSeries.filter((c) => c.rabbis?.name === r),
      })).filter((g) => g.items.length > 0)
    : [{ rabbi: null, items: visibleSeries }];

  // Add "no rabbi" group if some items have no rabbi and we're grouping
  if (shouldGroup) {
    const noRabbiItems = visibleSeries.filter((c) => !c.rabbis?.name);
    if (noRabbiItems.length > 0) {
      groups.push({ rabbi: null, items: noRabbiItems });
    }
  }

  return (
    <section
      style={{
        background: colors.parchmentDark,
        padding: "2.5rem 1.5rem",
        borderBottom: `1px solid rgba(139,111,71,0.1)`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }} dir="rtl">
        {/* Section header + view toggle */}
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
              flex: 1,
            }}
          >
            {childSeries.length} חלקים
          </span>
          {/* List/Grid toggle — view only, no media chips for sub-series */}
          <div
            style={{
              display: "flex",
              border: `1.5px solid rgba(139,111,71,0.2)`,
              borderRadius: radii.md,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {(["grid", "list"] as ViewMode[]).map((v) => {
              const isActive = viewMode === v;
              return (
                <button
                  key={v}
                  onClick={() => handleViewChange(v)}
                  aria-label={v === "grid" ? "תצוגת כרטיסים" : "תצוגת רשימה"}
                  title={v === "grid" ? "תצוגת כרטיסים" : "תצוגת רשימה"}
                  style={{
                    width: 36,
                    height: 32,
                    border: "none",
                    background: isActive ? colors.goldDark : "transparent",
                    color: isActive ? "white" : colors.textMuted,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                >
                  {v === "grid" ? (
                    <LayoutGrid style={{ width: 15, height: 15 }} />
                  ) : (
                    <List style={{ width: 15, height: 15 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Groups */}
        {groups.map((group, gi) => (
          <div key={gi} style={{ marginBottom: shouldGroup && gi < groups.length - 1 ? "2rem" : 0 }}>
            {shouldGroup && group.rabbi && (
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: colors.goldDark,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "0.75rem",
                  paddingBottom: "0.4rem",
                  borderBottom: `1px solid rgba(139,111,71,0.12)`,
                }}
              >
                {group.rabbi}
              </div>
            )}

            {/* Grid view */}
            {viewMode === "grid" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                {group.items.map((child) => {
                  const cover =
                    child.image_url ||
                    getSeriesCoverImage(child.title) ||
                    "/images/series-default.png";
                  return (
                    <Link
                      key={child.id}
                      to={`/series/${child.id}`}
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
                        {/* Image */}
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
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.4rem", marginBottom: "0.4rem" }}>
                            <div
                              style={{
                                fontFamily: fonts.display,
                                fontWeight: 700,
                                fontSize: "1rem",
                                color: colors.textDark,
                                lineHeight: 1.35,
                                flex: 1,
                              }}
                            >
                              {child.title}
                            </div>
                            <TeacherContentBadge tags={child.audience_tags} variant="small" />
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
                              {child.rabbis?.name && !shouldGroup ? ` · ${child.rabbis.name}` : ""}
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
            ) : (
              /* List view — compact rows with thumbnail */
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {group.items.map((child) => {
                  const cover =
                    child.image_url ||
                    getSeriesCoverImage(child.title) ||
                    "/images/series-default.png";
                  return (
                    <Link
                      key={child.id}
                      to={`/series/${child.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          padding: "0.75rem 1rem",
                          borderRadius: radii.lg,
                          background: "white",
                          border: "1px solid rgba(139,111,71,0.08)",
                          cursor: "pointer",
                          transition: "all 0.18s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = colors.goldDark;
                          e.currentTarget.style.boxShadow = shadows.cardSoft;
                          e.currentTarget.style.background = colors.parchmentDark;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "rgba(139,111,71,0.08)";
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.background = "white";
                        }}
                      >
                        {/* Thumbnail */}
                        <div
                          style={{
                            width: 72,
                            height: 52,
                            borderRadius: radii.md,
                            overflow: "hidden",
                            flexShrink: 0,
                            background: colors.parchmentDeep,
                          }}
                        >
                          <img
                            src={cover}
                            alt={child.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: fonts.display,
                              fontWeight: 700,
                              fontSize: "0.9rem",
                              color: colors.textDark,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {child.title}
                          </div>
                          <div
                            style={{
                              fontFamily: fonts.body,
                              fontSize: "0.7rem",
                              color: colors.textSubtle,
                              marginTop: "0.2rem",
                            }}
                          >
                            {child.lesson_count || 0} שיעורים
                            {child.rabbis?.name && !shouldGroup ? ` · ${child.rabbis.name}` : ""}
                          </div>
                        </div>
                        <ChevronRight
                          style={{
                            width: 16,
                            height: 16,
                            color: colors.goldDark,
                            flexShrink: 0,
                            transform: "rotate(180deg)",
                          }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Show more / Show less toggle */}
        {hasMore && (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              marginTop: "1.5rem",
              marginRight: "auto",
              padding: "0.55rem 1.25rem",
              borderRadius: radii.md,
              border: `1.5px solid rgba(139,111,71,0.25)`,
              background: "transparent",
              color: colors.goldDark,
              fontFamily: fonts.body,
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(139,111,71,0.06)";
              e.currentTarget.style.borderColor = colors.goldDark;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(139,111,71,0.25)";
            }}
          >
            {expanded ? (
              <>
                <ChevronUp style={{ width: 14, height: 14 }} />
                הצג פחות
              </>
            ) : (
              <>
                <ChevronDown style={{ width: 14, height: 14 }} />
                הצג עוד ({childSeries.length - INITIAL_SHOW} נוספים)
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
}

// ─── Controls bar (List/Grid toggle + media filter chips) ─────────────────
type ViewMode = "grid" | "list";
type MediaFilter = "all" | "audio" | "video" | "pdf";

function ControlsBar({
  viewMode,
  onViewChange,
  mediaFilter,
  onMediaFilterChange,
  counts,
}: {
  viewMode: ViewMode;
  onViewChange: (v: ViewMode) => void;
  mediaFilter: MediaFilter;
  onMediaFilterChange: (f: MediaFilter) => void;
  counts: Record<MediaFilter, number>;
}) {
  const chips: { key: MediaFilter; label: string }[] = [
    { key: "all", label: `הכל (${counts.all})` },
    { key: "audio", label: `אודיו (${counts.audio})` },
    { key: "video", label: `וידאו (${counts.video})` },
    { key: "pdf", label: `PDF (${counts.pdf})` },
  ];

  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.75rem",
        marginBottom: "1.25rem",
      }}
    >
      {/* Media filter chips */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {chips.map(({ key, label }) => {
          // Only show chip if count > 0 (or "all")
          if (key !== "all" && counts[key] === 0) return null;
          const isActive = mediaFilter === key;
          return (
            <button
              key={key}
              onClick={() => onMediaFilterChange(key)}
              style={{
                padding: "0.3rem 0.85rem",
                borderRadius: radii.pill,
                border: `1.5px solid ${isActive ? colors.goldDark : "rgba(139,111,71,0.2)"}`,
                background: isActive ? gradients.goldButton : "transparent",
                color: isActive ? "white" : colors.textMuted,
                fontFamily: fonts.body,
                fontSize: "0.75rem",
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* View toggle */}
      <div
        style={{
          display: "flex",
          border: `1.5px solid rgba(139,111,71,0.2)`,
          borderRadius: radii.md,
          overflow: "hidden",
        }}
      >
        {(["grid", "list"] as ViewMode[]).map((v) => {
          const isActive = viewMode === v;
          return (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              aria-label={v === "grid" ? "תצוגת כרטיסים" : "תצוגת רשימה"}
              title={v === "grid" ? "תצוגת כרטיסים" : "תצוגת רשימה"}
              style={{
                width: 36,
                height: 32,
                border: "none",
                background: isActive ? colors.goldDark : "transparent",
                color: isActive ? "white" : colors.textMuted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
              }}
            >
              {v === "grid" ? (
                <LayoutGrid style={{ width: 15, height: 15 }} />
              ) : (
                <List style={{ width: 15, height: 15 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Lesson Card (grid view) ───────────────────────────────────────────────
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
  const mediaType = getLessonMediaType(lesson);

  const mediaIcon =
    mediaType === "video" ? (
      <Play style={{ width: 14, height: 14, color: colors.textDark }} fill={colors.textDark} />
    ) : mediaType === "audio" ? (
      <Volume2 style={{ width: 14, height: 14, color: colors.textDark }} />
    ) : mediaType === "pdf" ? (
      <FileText style={{ width: 14, height: 14, color: colors.textDark }} />
    ) : (
      <Play style={{ width: 14, height: 14, color: colors.textDark }} fill={colors.textDark} />
    );

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
        {/* Teacher badge */}
        <div style={{ position: "absolute", top: 9, left: 9 }}>
          <TeacherContentBadge tags={lesson.audience_tags} variant="small" />
        </div>
        {/* Play/Listen/PDF button */}
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
          {mediaIcon}
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
            {mediaType === "audio" ? "האזן ←" : mediaType === "video" ? "צפה ←" : mediaType === "pdf" ? "קרא ←" : "פתח ←"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Lesson Row (list view) ────────────────────────────────────────────────
function LessonRow({
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
  const mediaType = getLessonMediaType(lesson);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(lesson)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(lesson)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "0.85rem 1rem",
        borderRadius: radii.lg,
        background: "white",
        border: "1px solid rgba(139,111,71,0.08)",
        cursor: "pointer",
        transition: "all 0.18s ease",
        outline: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.goldDark;
        e.currentTarget.style.boxShadow = shadows.cardSoft;
        e.currentTarget.style.background = colors.parchmentDark;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(139,111,71,0.08)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.background = "white";
      }}
    >
      {/* Thumbnail — small, on the right in RTL */}
      <div
        style={{
          width: 72,
          height: 52,
          borderRadius: radii.md,
          overflow: "hidden",
          flexShrink: 0,
          background: colors.parchmentDeep,
        }}
      >
        <img
          src={imgUrl}
          alt={lesson.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: "0.88rem",
            color: colors.textDark,
            lineHeight: 1.35,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {lesson.title}
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.6rem",
            alignItems: "center",
            marginTop: "0.3rem",
            fontFamily: fonts.body,
            fontSize: "0.7rem",
            color: colors.textSubtle,
          }}
        >
          {lesson.rabbis?.name && (
            <span style={{ color: colors.goldDark, fontWeight: 700 }}>
              {lesson.rabbis.name}
            </span>
          )}
          {lesson.duration && (
            <>
              {lesson.rabbis?.name && <span style={{ opacity: 0.4 }}>·</span>}
              <span>{formatDuration(lesson.duration)}</span>
            </>
          )}
        </div>
      </div>

      {/* Media type badge */}
      <span
        style={{
          flexShrink: 0,
          padding: "0.2rem 0.6rem",
          borderRadius: radii.pill,
          background: "rgba(139,111,71,0.08)",
          color: colors.textMuted,
          fontFamily: fonts.body,
          fontSize: "0.65rem",
          fontWeight: 600,
        }}
      >
        {mediaType === "audio" ? "אודיו" : mediaType === "video" ? "וידאו" : mediaType === "pdf" ? "PDF" : "טקסט"}
      </span>
      <TeacherContentBadge tags={lesson.audience_tags} variant="small" />

      {/* Arrow */}
      <ChevronRight
        style={{
          width: 16,
          height: 16,
          color: colors.goldDark,
          flexShrink: 0,
          transform: "rotate(180deg)",
        }}
      />
    </div>
  );
}

// ─── Lessons Section ───────────────────────────────────────────────────────
function LessonsSection({
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
  // View mode — persisted in localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem(VIEW_PREF_KEY) as ViewMode) || "grid";
    } catch {
      return "grid";
    }
  });

  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");

  const handleViewChange = (v: ViewMode) => {
    setViewMode(v);
    try {
      localStorage.setItem(VIEW_PREF_KEY, v);
    } catch {
      /* localStorage may be blocked */
    }
  };

  // Media counts for chips
  const counts = useMemo<Record<MediaFilter, number>>(() => {
    const result = { all: lessons.length, audio: 0, video: 0, pdf: 0 };
    for (const l of lessons) {
      const t = getLessonMediaType(l);
      if (t === "audio") result.audio++;
      else if (t === "video") result.video++;
      else if (t === "pdf") result.pdf++;
    }
    return result;
  }, [lessons]);

  // Filtered lessons
  const filtered = useMemo(() => {
    if (mediaFilter === "all") return lessons;
    return lessons.filter((l) => getLessonMediaType(l) === mediaFilter);
  }, [lessons, mediaFilter]);

  return (
    <section
      style={{
        background: colors.parchment,
        padding: "2rem 1.5rem 4rem",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }} dir="rtl">
        {!isLoading && lessons.length > 0 && (
          <ControlsBar
            viewMode={viewMode}
            onViewChange={handleViewChange}
            mediaFilter={mediaFilter}
            onMediaFilterChange={setMediaFilter}
            counts={counts}
          />
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
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              fontFamily: fonts.body,
              color: colors.textSubtle,
              fontSize: "0.9rem",
            }}
          >
            {mediaFilter === "all"
              ? "אין שיעורים זמינים בסדרה זו כרגע"
              : `אין שיעורי ${mediaFilter === "audio" ? "אודיו" : mediaFilter === "video" ? "וידאו" : "PDF"} בסדרה זו`}
          </div>
        ) : viewMode === "grid" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {filtered.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                seriesImageUrl={seriesImageUrl}
                seriesTitle={seriesTitle}
                onOpen={onOpenLesson}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {filtered.map((lesson) => (
              <LessonRow
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

// ─── Lesson Modal — full production parity ────────────────────────────────
/**
 * Round 3 — full parity with production LessonDialog.tsx:
 *
 * Layout (RTL):
 *   - Top-right: X close button
 *   - Top-left: Heart | Print | WhatsApp | Gmail (icon strip)
 *   - Title (right-aligned, large)
 *   - Meta bar: מאת [rabbi link] · [clock] duration · [calendar] date
 *   - Series pill (badge)
 *   - Breadcrumb nav
 *   - Media player (HTML5 <audio> or <video> or iframe)
 *   - Content / description
 *   - "שיעורים נוספים" grid
 *
 * Print: opens branded print window (same as production).
 * WhatsApp: wa.me share link.
 * Gmail: Google Compose URL.
 */
function LessonModal({
  lesson,
  seriesImageUrl,
  seriesTitle,
  seriesId,
  allLessons,
  onClose,
}: {
  lesson: any;
  seriesImageUrl: string | null;
  seriesTitle: string;
  seriesId: string | undefined;
  allLessons: any[];
  onClose: () => void;
}) {
  const imgUrl = lessonImage(lesson, seriesImageUrl, seriesTitle);
  const [isFavorited, setIsFavorited] = useState(false);
  const { data: breadcrumb } = useSeriesBreadcrumb(seriesId);

  const lessonUrl = `${window.location.origin}/lessons/${lesson.id}`;
  const shareText = `${lesson.title}${lesson.rabbis?.name ? ` - ${lesson.rabbis.name}` : ""}`;
  const mediaType = getLessonMediaType(lesson);

  // Other lessons (max 6)
  const moreLessons = allLessons.filter((l) => l.id !== lesson.id).slice(0, 6);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Handlers (same logic as production LessonDialog) ──
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const logoUrl = `${window.location.origin}/assets/logo-horizontal-color.png`;
    const metaParts = [
      lesson.rabbis?.name ? `מאת: ${lesson.rabbis.name}` : "",
      formatDate(lesson.published_at) || "",
      lesson.duration ? `${Math.floor(lesson.duration / 60)} דקות` : "",
    ].filter(Boolean).join(" · ");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="utf-8" />
        <title>${lesson.title}</title>
        <style>
          @font-face { font-family: 'Kedem'; src: url('${window.location.origin}/fonts/kedem-bold.otf') format('opentype'); font-weight: 700; }
          @font-face { font-family: 'Ploni'; src: url('${window.location.origin}/fonts/ploni-regular.otf') format('opentype'); font-weight: 400; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Ploni','David',serif; max-width: 750px; margin: 0 auto; padding: 0 32px; color: #1a1a1a; line-height: 1.9; background: white; }
          .header { display: flex; align-items: center; justify-content: space-between; padding: 24px 0 20px; border-bottom: 3px solid #3D8B7A; margin-bottom: 28px; }
          .header img { height: 56px; }
          .site-name { font-family: 'Kedem',serif; font-weight: 900; font-size: 14px; color: #3D8B7A; }
          h1 { font-family: 'Kedem',serif; font-weight: 900; font-size: 26px; color: #3D8B7A; margin-bottom: 8px; line-height: 1.3; }
          .meta { color: #666; font-size: 13px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e0d8; }
          .topics-badge { display: inline-block; background: #3D8B7A; color: white; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 20px; margin-bottom: 24px; }
          .content { font-size: 15px; line-height: 2; }
          .footer { margin-top: 40px; padding: 20px 0; border-top: 2px solid #3D8B7A; text-align: center; color: #999; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="site-name">בני ציון – אתר התנ״ך של ישראל</div>
          <img src="${logoUrl}" alt="בני ציון" onerror="this.style.display='none'" />
        </div>
        <h1>${lesson.title}</h1>
        <div class="meta">${metaParts}</div>
        ${seriesTitle ? `<span class="topics-badge">${seriesTitle}</span>` : ""}
        <div class="content">${lesson.content || lesson.description || ""}</div>
        <div class="footer"><div>בני ציון – אתר התנ״ך של ישראל</div><div>${lessonUrl}</div></div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  };

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${lessonUrl}`)}`,
      "_blank"
    );
  };

  const handleGmail = () => {
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText}\n\n${lessonUrl}`)}`,
      "_blank"
    );
  };

  // ── Common icon-button style ──
  const iconBtnStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    color: colors.textMuted,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
  };

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
          width: "min(760px, 95vw)",
          maxHeight: "92vh",
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
            height: 220,
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
              background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 60%)",
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

          {/* Close — top-left (RTL = physical left) */}
          <button
            onClick={onClose}
            aria-label="סגור"
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              width: 32,
              height: 32,
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
            <X style={{ width: 15, height: 15 }} />
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
        <div style={{ padding: "1.25rem 1.75rem 2rem" }}>

          {/* ── Top bar: title (right) + action icons (left) ── */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            {/* Title — right in RTL */}
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "clamp(1.1rem, 2.5vw, 1.45rem)",
                color: colors.textDark,
                margin: 0,
                lineHeight: 1.3,
                flex: 1,
              }}
            >
              {lesson.title}
            </h2>

            {/* Action icons — left side in RTL (Heart | Print | WhatsApp | Gmail) */}
            <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
              <button
                onClick={() => setIsFavorited((v) => !v)}
                aria-label={isFavorited ? "הסר ממועדפים" : "שמור למועדפים"}
                title={isFavorited ? "הסר ממועדפים" : "שמור למועדפים"}
                style={{
                  ...iconBtnStyle,
                  color: isFavorited ? "#e53e3e" : colors.textMuted,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#e53e3e"; e.currentTarget.style.background = "rgba(229,62,62,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = isFavorited ? "#e53e3e" : colors.textMuted; e.currentTarget.style.background = "transparent"; }}
              >
                <Heart style={{ width: 15, height: 15, fill: isFavorited ? "currentColor" : "none" }} />
              </button>
              <button
                onClick={handlePrint}
                aria-label="הדפסה"
                title="הדפסה"
                style={iconBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.color = colors.goldDark; e.currentTarget.style.background = "rgba(139,111,71,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted; e.currentTarget.style.background = "transparent"; }}
              >
                <Printer style={{ width: 15, height: 15 }} />
              </button>
              <button
                onClick={handleWhatsApp}
                aria-label="שיתוף בוואצאפ"
                title="שיתוף בוואצאפ"
                style={iconBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#25D366"; e.currentTarget.style.background = "rgba(37,211,102,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted; e.currentTarget.style.background = "transparent"; }}
              >
                <WhatsAppIcon />
              </button>
              <button
                onClick={handleGmail}
                aria-label="שליחה במייל"
                title="שליחה במייל"
                style={iconBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#EA4335"; e.currentTarget.style.background = "rgba(234,67,53,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted; e.currentTarget.style.background = "transparent"; }}
              >
                <Mail style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>

          {/* ── Meta bar: מאת + duration + date ── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.65rem",
              alignItems: "center",
              marginBottom: "0.75rem",
              fontFamily: fonts.body,
              fontSize: "0.8rem",
              color: colors.textMuted,
            }}
          >
            {lesson.rabbis?.name && (
              <span>
                <span style={{ color: colors.textSubtle }}>מאת </span>
                <Link
                  to={`/rabbis/${lesson.rabbis?.id || ""}`}
                  style={{ color: colors.goldDark, fontWeight: 700, textDecoration: "none" }}
                >
                  {lesson.rabbis.name}
                </Link>
              </span>
            )}
            {lesson.duration && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Clock style={{ width: 12, height: 12 }} />
                {Math.floor(lesson.duration / 60)} דקות
              </span>
            )}
            {lesson.published_at && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Calendar style={{ width: 12, height: 12 }} />
                {formatDate(lesson.published_at)}
              </span>
            )}
          </div>

          {/* ── Series pill (Badge) ── */}
          {seriesTitle && (
            <Link
              to={`/series/${seriesId || ""}`}
              style={{ display: "inline-block", marginBottom: "0.85rem", textDecoration: "none" }}
            >
              <span
                style={{
                  display: "inline-block",
                  padding: "0.25rem 0.85rem",
                  borderRadius: radii.pill,
                  background: "rgba(139,111,71,0.1)",
                  color: colors.goldDark,
                  fontFamily: fonts.body,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                {seriesTitle}
              </span>
            </Link>
          )}

          {/* ── Breadcrumb ── */}
          {breadcrumb && breadcrumb.length > 0 && (
            <nav
              aria-label="breadcrumb"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.3rem",
                marginBottom: "1rem",
                fontFamily: fonts.body,
                fontSize: "0.72rem",
                color: colors.textSubtle,
              }}
            >
              <Link to="/" style={{ color: colors.textSubtle, textDecoration: "none" }}>
                ראשי
              </Link>
              <ChevronRight style={{ width: 11, height: 11, transform: "rotate(180deg)" }} />
              <Link to="/series" style={{ color: colors.textSubtle, textDecoration: "none" }}>
                מאגר השיעורים
              </Link>
              {breadcrumb.map((ancestor) => (
                <span key={ancestor.id} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <ChevronRight style={{ width: 11, height: 11, transform: "rotate(180deg)" }} />
                  <Link
                    to={`/series/${ancestor.id}`}
                    style={{ color: colors.textSubtle, textDecoration: "none" }}
                  >
                    {ancestor.title}
                  </Link>
                </span>
              ))}
              {lesson.bible_book && (
                <>
                  <ChevronRight style={{ width: 11, height: 11, transform: "rotate(180deg)" }} />
                  <Link
                    to={`/bible/${encodeURIComponent(lesson.bible_book)}`}
                    style={{ color: colors.textSubtle, textDecoration: "none" }}
                  >
                    {lesson.bible_book}
                  </Link>
                </>
              )}
              <ChevronRight style={{ width: 11, height: 11, transform: "rotate(180deg)" }} />
              <span
                style={{
                  color: colors.textMid,
                  maxWidth: 180,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {lesson.title}
              </span>
            </nav>
          )}

          {/* ── Divider ── */}
          <div
            style={{
              height: 1,
              background: "rgba(139,111,71,0.1)",
              margin: "0 0 1.25rem",
            }}
          />

          {/* ── Real HTML5 media player ── */}
          {lesson.video_url ? (
            isDirectVideo(lesson.video_url) ? (
              <div
                style={{
                  borderRadius: radii.lg,
                  overflow: "hidden",
                  background: "#000",
                  marginBottom: "1.25rem",
                  aspectRatio: "16 / 9",
                }}
              >
                <video
                  src={lesson.video_url}
                  controls
                  style={{ width: "100%", height: "100%" }}
                  poster={lesson.thumbnail_url || undefined}
                  controlsList="nodownload"
                  preload="metadata"
                />
              </div>
            ) : (
              <div
                style={{
                  borderRadius: radii.lg,
                  overflow: "hidden",
                  background: "#000",
                  marginBottom: "1.25rem",
                  aspectRatio: "16 / 9",
                }}
              >
                <iframe
                  src={lesson.video_url}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            )
          ) : lesson.audio_url ? (
            <div
              style={{
                borderRadius: radii.lg,
                background: colors.parchmentDark,
                border: `1px solid rgba(139,111,71,0.15)`,
                padding: "1rem 1.25rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(139,111,71,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Volume2 style={{ width: 18, height: 18, color: colors.goldDark }} />
              </div>
              <audio
                controls
                src={lesson.audio_url}
                style={{ width: "100%", height: 36 }}
                preload="metadata"
              />
            </div>
          ) : null}

          {/* ── PDF attachment ── */}
          {lesson.attachment_url && (
            <div style={{ marginBottom: "1.25rem" }}>
              <a
                href={lesson.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.55rem 1.25rem",
                  borderRadius: radii.md,
                  background: gradients.goldButton,
                  color: "white",
                  fontFamily: fonts.body,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <FileText style={{ width: 15, height: 15 }} />
                פתח PDF
              </a>
            </div>
          )}

          {/* ── Description ── */}
          {lesson.description && (
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "0.88rem",
                lineHeight: 1.85,
                color: colors.textMid,
                margin: "0 0 1.25rem",
              }}
            >
              {lesson.description.replace(/<[^>]*>/g, "").slice(0, 320)}
              {lesson.description.length > 320 ? "..." : ""}
            </p>
          )}

          {/* ── "פתח בעמוד מלא" link ── */}
          <div style={{ marginBottom: "1.25rem" }}>
            <Link
              to={`/lessons/${lesson.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 1rem",
                borderRadius: radii.md,
                border: `1.5px solid rgba(139,111,71,0.25)`,
                background: "transparent",
                color: colors.textMid,
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                fontWeight: 600,
                textDecoration: "none",
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
              <ExternalLink style={{ width: 13, height: 13 }} />
              פתח בעמוד מלא
            </Link>
          </div>

          {/* ── שיעורים נוספים מהסדרה ── */}
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
                  gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
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
                            height: 88,
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          <img
                            src={lImg}
                            alt={l.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              bottom: 5,
                              left: 5,
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.9)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Play
                              style={{ width: 9, height: 9, color: colors.textDark }}
                              fill={colors.textDark}
                            />
                          </div>
                        </div>
                        <div style={{ padding: "0.55rem 0.75rem 0.7rem" }}>
                          <div
                            style={{
                              fontFamily: fonts.display,
                              fontWeight: 600,
                              fontSize: "0.76rem",
                              color: colors.textDark,
                              lineHeight: 1.35,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              minHeight: "2em",
                            }}
                          >
                            {l.title}
                          </div>
                          <div
                            style={{
                              fontFamily: fonts.body,
                              fontSize: "0.63rem",
                              color: colors.textSubtle,
                              marginTop: "0.2rem",
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

  // Resolve the series ID: URL param → fallback to sub-series demo
  const targetId = id || SUB_SERIES_DEMO_ID;

  const { data: series, isLoading: seriesLoading } = useSeriesDetail(targetId);
  const { data: lessons = [], isLoading: lessonsLoading } = useLessonsBySeries(series?.id);
  const { data: childSeries = [] } = useSeriesChildren(series?.id);

  // Open/close lesson modal, sync URL
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

  // Resolve open lesson object
  const openLesson = useMemo(
    () => (openLessonId ? (lessons as any[]).find((l) => l.id === openLessonId) : null),
    [openLessonId, lessons]
  );

  // Loading state
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
          <a href="/series" style={{ color: colors.goldDark }}>
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
      {/* transparentHeader + overlapHero removed (2026-04-30 Saar feedback):
           - transparentHeader hid the full nav whenever a sidebar was present
           - overlapHero caused double-offset + "thick header on scroll" perception
           - Series page is "catalog not drama" — solid header is correct here.
           - Both can be re-enabled if Saar wants the dark-hero overlap back. */}
      <DesignLayout>
        {/* 1. Compact hero */}
        <CompactSeriesHero
          series={series}
          totalLessons={totalLessons}
          totalSubSeries={(childSeries as any[]).length}
          totalDuration={totalDuration}
          imageUrl={heroImageUrl}
        />

        {/* 2. Sub-series group with show-more + optional grouping */}
        {(childSeries as any[]).length > 0 && (
          <SubSeriesGroup children={childSeries as any[]} />
        )}

        {/* 3. Lessons section with controls */}
        <LessonsSection
          lessons={lessons as any[]}
          seriesImageUrl={seriesImageUrl}
          seriesTitle={series.title}
          isLoading={lessonsLoading}
          onOpenLesson={handleOpenLesson}
        />

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </DesignLayout>

      {/* Modal — outside DesignLayout to cover sidebar */}
      {openLesson && (
        <LessonModal
          lesson={openLesson}
          seriesImageUrl={seriesImageUrl}
          seriesTitle={series.title}
          seriesId={series.id}
          allLessons={lessons as any[]}
          onClose={handleCloseLesson}
        />
      )}
    </>
  );
}
