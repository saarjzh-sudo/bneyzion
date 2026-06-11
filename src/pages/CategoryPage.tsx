/**
 * CategoryPage — /category/:id
 *
 * Shows all canonical series under a node (book / topic category) and
 * optionally any "standalone" lessons whose series_id points directly to that node.
 *
 * Canonical series rule (matches the old site, fixes 4→6 for "איך לומדים"):
 *   For each unique series title in the descendant tree:
 *     - If an active/published copy with lesson_count > 0 exists → show it
 *     - If only a draft copy exists (no active twin) → show it (preserves parity)
 *     - Never show a draft that has an active/published twin (hidden duplicate)
 *   Category nodes (status=category) are always excluded — they are containers.
 *
 * Under each series — lessons are expanded inline with thumbnail images.
 * Lesson image priority: thumbnail_url → series.image_url → getSeriesCoverImage → default.
 *
 * Layout: DesignLayout (v2 with sidebar). Cream+gold, RTL.
 */

import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronDown,
  Loader2,
  BookOpen,
  Play,
  Volume2,
  FileText,
  AlertCircle,
  Construction,
  ExternalLink,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import {
  colors,
  fonts,
  gradients,
  radii,
  shadows,
  getSeriesCoverImage,
  formatDuration,
} from "@/lib/designTokens";
import { useSeriesDetail } from "@/hooks/useSeriesDetail";
import { useSeriesBreadcrumb } from "@/hooks/useSeriesHierarchy";
import { useContentSidebar } from "@/hooks/useContentSidebar";
import { supabase } from "@/integrations/supabase/client";

// ─── type for series with canonical fields ───────────────────────────────────

type CanonicalSeries = {
  id: string;
  title: string;
  lessonCount: number | null;
  rabbiName: string | null;
  description?: string | null;
  imageUrl?: string | null;
  isDraft?: boolean;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function resolveSeriesImage(s: { imageUrl?: string | null; title: string }): string {
  return s.imageUrl || getSeriesCoverImage(s.title) || "/images/series-default.png";
}

function lessonImage(
  lesson: { thumbnail_url?: string | null },
  series: { imageUrl?: string | null; title: string }
): string {
  return (
    lesson.thumbnail_url ||
    series.imageUrl ||
    getSeriesCoverImage(series.title) ||
    "/images/series-default.png"
  );
}

function lessonMediaIcon(l: {
  video_url?: string | null;
  audio_url?: string | null;
  attachment_url?: string | null;
}) {
  if (l.video_url) return <Play size={13} style={{ flexShrink: 0 }} />;
  if (l.audio_url) return <Volume2 size={13} style={{ flexShrink: 0 }} />;
  if (l.attachment_url) return <FileText size={13} style={{ flexShrink: 0 }} />;
  return <BookOpen size={13} style={{ flexShrink: 0 }} />;
}

// ─── hook: lessons for one series ────────────────────────────────────────────

function useSeriesLessons(seriesId: string) {
  return useQuery({
    queryKey: ["series-lessons-expanded", seriesId],
    enabled: !!seriesId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      // R-CAT3 fix: align order with /series/:id (bible_chapter nullsLast, then title).
      // R-CAT4 fix: add dedup to avoid count mismatch between CategoryPage and SeriesPage.
      const { data, error } = await supabase
        .from("lessons")
        .select(
          "id, title, duration, published_at, thumbnail_url, video_url, audio_url, attachment_url, bible_chapter, rabbi_id, rabbis(name)"
        )
        .eq("series_id", seriesId)
        .eq("status", "published")
        .order("bible_chapter", { ascending: true, nullsFirst: false })
        .order("title", { ascending: true })
        .limit(200);
      if (error) throw error;
      // Dedup by enriched key: norm(title)|norm(rabbi)|basename(attachment)|audio|video
      const seen = new Set<string>();
      return (data ?? []).filter((l: any) => {
        const normTitle = (l.title || "").trim().replace(/[״"'׳`|]/g, "").replace(/\s+/g, " ");
        const normRabbi = (l.rabbis?.name || l.rabbi_id || "").trim().replace(/[״"'׳`|]/g, "").replace(/\s+/g, " ");
        const attBase = l.attachment_url ? l.attachment_url.split("/").pop()?.split("?")[0] || "" : "";
        const key = `${normTitle}|${normRabbi}|${attBase}|${l.audio_url || ""}|${l.video_url || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
  });
}

// ─── hook: standalone lessons on the category node itself ────────────────────

function useDirectLessons(nodeId: string | undefined) {
  return useQuery({
    queryKey: ["category-direct-lessons", nodeId],
    enabled: !!nodeId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select(
          "id, title, duration, published_at, thumbnail_url, video_url, audio_url, attachment_url, rabbi_id, rabbis(name)"
        )
        .eq("series_id", nodeId!)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: node, isLoading: nodeLoading } = useSeriesDetail(id);
  const { data: breadcrumbs = [] } = useSeriesBreadcrumb(id);

  const { useSeriesForNode } = useContentSidebar();
  const { data: seriesList = [], isLoading: seriesLoading } = useSeriesForNode(id ?? null);

  const { data: directLessons = [], isLoading: lessonsLoading } = useDirectLessons(id);

  const isLoading = nodeLoading || seriesLoading;

  const title = node?.title ?? "קטגוריה";

  // Cast to canonical type (hook now returns extra fields)
  const canonicalSeries = seriesList as unknown as CanonicalSeries[];

  return (
    <DesignLayout>
      {/* ── Hero ── */}
      <div
        dir="rtl"
        style={{
          background: `linear-gradient(160deg, #FBF6EC 0%, #F5EFE0 60%, #EDE5D0 100%)`,
          borderBottom: `1px solid rgba(139,111,71,0.12)`,
          padding: "2.5rem 2rem 2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative arc */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            insetInlineEnd: "-60px",
            top: "-80px",
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(196,162,101,0.07)",
            pointerEvents: "none",
          }}
        />

        {/* Breadcrumb */}
        {breadcrumbs.length > 0 && (
          <nav
            aria-label="ניווט"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <Link
              to="/"
              style={{
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                color: colors.textSubtle,
                textDecoration: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = colors.goldDark)}
              onMouseLeave={(e) => (e.currentTarget.style.color = colors.textSubtle)}
            >
              ראשי
            </Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.id} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <ChevronLeft size={12} style={{ color: colors.textSubtle, flexShrink: 0 }} />
                <Link
                  to={`/category/${crumb.id}`}
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.78rem",
                    color: crumb.id === id ? colors.goldDark : colors.textSubtle,
                    textDecoration: "none",
                    fontWeight: crumb.id === id ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (crumb.id !== id) e.currentTarget.style.color = colors.goldDark;
                  }}
                  onMouseLeave={(e) => {
                    if (crumb.id !== id) e.currentTarget.style.color = colors.textSubtle;
                  }}
                >
                  {crumb.title}
                </Link>
              </span>
            ))}
          </nav>
        )}

        {/* Title */}
        {nodeLoading ? (
          <div
            style={{
              height: 40,
              width: 200,
              borderRadius: radii.sm,
              background: "rgba(139,111,71,0.1)",
              animation: "pulse 1.5s ease infinite",
            }}
          />
        ) : (
          <h1
            style={{
              fontFamily: fonts.display,
              fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
              fontWeight: 700,
              color: colors.textDark,
              margin: 0,
              lineHeight: 1.2,
              background: gradients.goldText,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {title}
          </h1>
        )}

        {/* Description */}
        {node?.description && (
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "0.92rem",
              color: colors.textMuted,
              marginTop: "0.6rem",
              marginBottom: 0,
              maxWidth: 560,
              lineHeight: 1.65,
            }}
          >
            {node.description}
          </p>
        )}

        {/* Series count badge */}
        {!seriesLoading && canonicalSeries.length > 0 && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              marginTop: "1rem",
              padding: "0.3rem 0.75rem",
              borderRadius: radii.pill,
              background: "rgba(139,111,71,0.08)",
              border: `1px solid rgba(139,111,71,0.15)`,
              fontFamily: fonts.body,
              fontSize: "0.78rem",
              color: colors.goldDark,
              fontWeight: 600,
            }}
          >
            <BookOpen size={13} />
            {canonicalSeries.length} סדרות
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div
        dir="rtl"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "2rem 1.5rem",
        }}
      >
        {/* ── Series with expanded lessons ── */}
        {isLoading ? (
          <SeriesGridSkeleton />
        ) : canonicalSeries.length === 0 ? (
          <EmptyState title={title} />
        ) : (
          <section>
            <h2
              style={{
                fontFamily: fonts.display,
                fontSize: "1.1rem",
                fontWeight: 700,
                color: colors.textDark,
                marginBottom: "1.25rem",
                marginTop: 0,
                paddingBottom: "0.5rem",
                borderBottom: `2px solid rgba(196,162,101,0.2)`,
              }}
            >
              סדרות בנושא
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {canonicalSeries.map((s) => (
                <SeriesBlock
                  key={s.id}
                  series={s}
                  onNavigate={(path) => navigate(path)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Direct / standalone lessons on this category node ── */}
        {!lessonsLoading && directLessons.length > 0 && (
          <section style={{ marginTop: "2.5rem" }}>
            <h2
              style={{
                fontFamily: fonts.display,
                fontSize: "1.1rem",
                fontWeight: 700,
                color: colors.textDark,
                marginBottom: "1.25rem",
                marginTop: 0,
                paddingBottom: "0.5rem",
                borderBottom: `2px solid rgba(196,162,101,0.2)`,
              }}
            >
              שיעורים בודדים בקטגוריה
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {directLessons.map((l) => (
                <LessonRow
                  key={l.id}
                  lesson={l}
                  fallbackImage={"/images/series-default.png"}
                  onNavigate={(path) => navigate(path)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </DesignLayout>
  );
}

// ─── SeriesBlock ─────────────────────────────────────────────────────────────
// Renders a series card header + expandable lessons list below it.

function SeriesBlock({
  series,
  onNavigate,
}: {
  series: CanonicalSeries;
  onNavigate: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true); // default open
  const { data: lessons = [], isLoading } = useSeriesLessons(series.id);
  const imgSrc = resolveSeriesImage(series);
  const hasDraftBadge = series.isDraft && (!series.lessonCount || series.lessonCount === 0);

  return (
    <div
      style={{
        borderRadius: radii.lg,
        overflow: "hidden",
        background: "white",
        border: `1px solid rgba(139,111,71,0.10)`,
        boxShadow: "0 2px 8px rgba(45,31,14,0.06)",
      }}
    >
      {/* ── Series header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 0,
        }}
      >
        {/* Cover image — stays a Link to series page; stopPropagation prevents toggle */}
        <Link
          to={`/series/${series.id}`}
          style={{
            display: "block",
            width: 100,
            flexShrink: 0,
            overflow: "hidden",
            background: "#EDE5D6",
          }}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imgSrc}
            alt={series.title}
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/images/series-default.png";
            }}
          />
        </Link>

        {/* Entire title row is now a toggle button */}
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-controls={`series-lessons-${series.id}`}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "0.85rem 1rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "right",
            gap: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(250,246,240,0.7)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          {/* Content column */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              alignItems: "flex-start",
            }}
          >
            {/* Draft badge */}
            {hasDraftBadge && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: radii.pill,
                  background: "rgba(139,111,71,0.08)",
                  color: colors.textSubtle,
                  fontFamily: fonts.body,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  width: "fit-content",
                  marginBottom: "0.1rem",
                }}
              >
                <Construction size={10} />
                בהכנה
              </div>
            )}

            <span
              style={{
                fontFamily: fonts.display,
                fontSize: "1rem",
                fontWeight: 700,
                color: colors.textDark,
                lineHeight: 1.3,
              }}
            >
              {series.title}
            </span>

            {series.rabbiName && (
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.8rem",
                  color: colors.textMuted,
                }}
              >
                {series.rabbiName}
              </span>
            )}

            {series.lessonCount != null && series.lessonCount > 0 && (
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.75rem",
                  color: colors.goldDark,
                  fontWeight: 600,
                }}
              >
                {series.lessonCount} שיעורים
              </span>
            )}
          </div>

          {/* Chevron */}
          <ChevronDown
            size={16}
            style={{
              flexShrink: 0,
              transition: "transform 0.18s",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              color: colors.textSubtle,
              marginInlineStart: "0.75rem",
            }}
          />
        </button>
      </div>

      {/* ── Expanded lessons ── */}
      {expanded && (
        <div
          id={`series-lessons-${series.id}`}
          style={{
            borderTop: `1px solid rgba(139,111,71,0.08)`,
          }}
        >
          {isLoading ? (
            <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: colors.textSubtle }} />
              <span style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textSubtle }}>
                טוען שיעורים...
              </span>
            </div>
          ) : lessons.length === 0 ? (
            hasDraftBadge ? (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  fontFamily: fonts.body,
                  fontSize: "0.8rem",
                  color: colors.textSubtle,
                  fontStyle: "italic",
                }}
              >
                הסדרה בהכנה — שיעורים יתווספו בקרוב
              </div>
            ) : null
          ) : (
            <div>
              {lessons.map((l) => (
                <LessonRow
                  key={l.id}
                  lesson={l}
                  fallbackImage={resolveSeriesImage(series)}
                  onNavigate={onNavigate}
                />
              ))}
              {/* Link to full series page */}
              <div
                style={{
                  padding: "0.5rem 1rem",
                  borderTop: `1px solid rgba(139,111,71,0.05)`,
                }}
              >
                <Link
                  to={`/series/${series.id}`}
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.78rem",
                    color: colors.goldDark,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                >
                  לדף הסדרה המלאה
                  <ExternalLink size={11} />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LessonRow ───────────────────────────────────────────────────────────────

type LessonRowData = {
  id: string;
  title: string;
  duration?: number | null;
  published_at?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  attachment_url?: string | null;
  rabbis?: { name: string } | { name: string }[] | null;
};

function LessonRow({
  lesson,
  fallbackImage,
  onNavigate,
}: {
  lesson: LessonRowData;
  fallbackImage: string;
  onNavigate: (path: string) => void;
}) {
  const rabbiName = Array.isArray(lesson.rabbis)
    ? lesson.rabbis[0]?.name
    : (lesson.rabbis as { name: string } | null)?.name;

  const imgSrc = lesson.thumbnail_url || fallbackImage;

  return (
    <button
      onClick={() => onNavigate(`/lessons/${lesson.id}`)}
      style={{
        width: "100%",
        textAlign: "right",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.55rem 1rem",
        background: "transparent",
        border: "none",
        borderTop: `1px solid rgba(139,111,71,0.06)`,
        cursor: "pointer",
        transition: "background 0.15s",
        fontFamily: fonts.body,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(196,162,101,0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 48,
          height: 34,
          flexShrink: 0,
          borderRadius: radii.sm,
          overflow: "hidden",
          background: "#EDE5D6",
          position: "relative",
        }}
      >
        <img
          src={imgSrc}
          alt=""
          aria-hidden
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/images/series-default.png";
          }}
        />
        {/* Media type overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 2,
            insetInlineStart: 2,
            color: "white",
            background: "rgba(45,31,14,0.55)",
            borderRadius: 3,
            padding: "1px 3px",
            display: "flex",
            alignItems: "center",
          }}
        >
          {lessonMediaIcon(lesson)}
        </div>
      </div>

      {/* Title + rabbi */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.83rem",
            fontWeight: 600,
            color: colors.textDark,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {lesson.title}
        </div>
        {rabbiName && (
          <div style={{ fontSize: "0.72rem", color: colors.textMuted, marginTop: "0.1rem" }}>
            {rabbiName}
          </div>
        )}
      </div>

      {/* Duration */}
      {lesson.duration != null && lesson.duration > 0 && (
        <span
          style={{
            fontSize: "0.72rem",
            color: colors.textSubtle,
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {formatDuration(lesson.duration)}
        </span>
      )}
    </button>
  );
}

// ─── SeriesGridSkeleton ──────────────────────────────────────────────────────

function SeriesGridSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            borderRadius: radii.lg,
            overflow: "hidden",
            background: "white",
            border: `1px solid rgba(139,111,71,0.08)`,
            display: "flex",
            height: 80,
          }}
        >
          <div
            style={{
              width: 100,
              background: "rgba(139,111,71,0.08)",
              animation: "pulse 1.5s ease infinite",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, padding: "0.85rem 1rem" }}>
            <div
              style={{
                height: 14,
                width: "60%",
                borderRadius: radii.sm,
                background: "rgba(139,111,71,0.08)",
                animation: "pulse 1.5s ease infinite",
                marginBottom: "0.5rem",
              }}
            />
            <div
              style={{
                height: 11,
                width: "35%",
                borderRadius: radii.sm,
                background: "rgba(139,111,71,0.06)",
                animation: "pulse 1.5s ease infinite",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

function EmptyState({ title }: { title: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        gap: "1rem",
        color: colors.textSubtle,
        textAlign: "center",
      }}
    >
      <AlertCircle size={40} style={{ opacity: 0.4 }} />
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: "1.1rem",
          fontWeight: 600,
          color: colors.textMuted,
        }}
      >
        אין סדרות ב{title} כרגע
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: "0.85rem",
          color: colors.textSubtle,
          maxWidth: 340,
        }}
      >
        ייתכן שהתוכן עדיין בעריכה או שהנושא נמצא תחת קטגוריה אחרת.
      </div>
    </div>
  );
}
