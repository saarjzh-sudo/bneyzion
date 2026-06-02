/**
 * CategoryPage — /category/:id
 *
 * Shows all series under a node (book / topic category) and optionally
 * any "standalone" lessons whose series_id points directly to that node.
 *
 * Data strategy:
 *   - Node name/title: useSeriesDetail (single row)
 *   - Breadcrumb ancestors: useSeriesBreadcrumb (RPC get_series_ancestors)
 *   - Direct child series with lesson_count > 0:
 *       useContentSidebar.useSeriesForNode (RPC get_series_descendant_ids)
 *       — already handles dedup by relying on DB unique IDs.
 *   - Standalone lessons (series_id === nodeId, direct, not via sub-series):
 *       direct Supabase query filtered to the exact nodeId.
 *
 * Layout: DesignLayout (v2 with sidebar).
 * Cream #FBF6EC hero, gold accents, RTL.
 */

import { lazy, Suspense } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2, BookOpen, Play, Volume2, FileText, AlertCircle } from "lucide-react";

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

// ─── helpers ────────────────────────────────────────────────────────────────

function seriesImage(s: { image_url?: string | null; title: string }): string {
  return s.image_url || getSeriesCoverImage(s.title) || "/images/series-default.png";
}

function lessonMediaIcon(l: { video_url?: string | null; audio_url?: string | null; attachment_url?: string | null }) {
  if (l.video_url) return <Play size={13} style={{ flexShrink: 0 }} />;
  if (l.audio_url) return <Volume2 size={13} style={{ flexShrink: 0 }} />;
  if (l.attachment_url) return <FileText size={13} style={{ flexShrink: 0 }} />;
  return <BookOpen size={13} style={{ flexShrink: 0 }} />;
}

// ─── Standalone-lessons hook ─────────────────────────────────────────────────
// Fetches lessons whose series_id = nodeId directly (not descendant series).
// Used for the "שיעורים בודדים" section.
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
        // Dedup: series_id is set, so null-series duplicates can't appear here.
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

  // Series under this node (via useContentSidebar's useSeriesForNode hook)
  const { useSeriesForNode } = useContentSidebar();
  const { data: seriesList = [], isLoading: seriesLoading } = useSeriesForNode(id ?? null);

  // Standalone lessons directly on this node
  const { data: directLessons = [], isLoading: lessonsLoading } = useDirectLessons(id);

  const isLoading = nodeLoading || seriesLoading;

  const title = node?.title ?? "קטגוריה";

  // ── Render ──
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
        {/* Subtle decorative arc */}
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
        {!seriesLoading && seriesList.length > 0 && (
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
            {seriesList.length} סדרות
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
        {/* ── Series grid ── */}
        {isLoading ? (
          <SeriesGridSkeleton />
        ) : seriesList.length === 0 ? (
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {seriesList.map((s) => (
                <SeriesCard key={s.id} series={s} />
              ))}
            </div>
          </section>
        )}

        {/* ── Direct lessons section ── */}
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
                <LessonRow key={l.id} lesson={l} onNavigate={(path) => navigate(path)} />
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

// ─── SeriesCard ──────────────────────────────────────────────────────────────

function SeriesCard({
  series,
}: {
  series: {
    id: string;
    title: string;
    lessonCount: number | null;
    rabbiName: string | null;
    description?: string | null;
  };
}) {
  const imgSrc = seriesImage({ title: series.title });

  return (
    <Link
      to={`/series/${series.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        style={{
          borderRadius: radii.lg,
          overflow: "hidden",
          background: "white",
          border: `1px solid rgba(139,111,71,0.10)`,
          boxShadow: "0 2px 8px rgba(45,31,14,0.06)",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
          cursor: "pointer",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.card || "0 6px 20px rgba(45,31,14,0.12)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "none";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(45,31,14,0.06)";
        }}
      >
        {/* Cover image */}
        <div
          style={{
            width: "100%",
            aspectRatio: "16/9",
            overflow: "hidden",
            position: "relative",
            background: "#EDE5D6",
          }}
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
        </div>

        {/* Card body */}
        <div style={{ padding: "0.75rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: "0.88rem",
              fontWeight: 700,
              color: colors.textDark,
              lineHeight: 1.3,
            }}
          >
            {series.title}
          </div>
          {series.rabbiName && (
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.76rem",
                color: colors.textMuted,
              }}
            >
              {series.rabbiName}
            </div>
          )}
          {series.lessonCount != null && series.lessonCount > 0 && (
            <div
              style={{
                marginTop: "auto",
                paddingTop: "0.4rem",
                fontFamily: fonts.body,
                fontSize: "0.72rem",
                color: colors.goldDark,
                fontWeight: 600,
              }}
            >
              {series.lessonCount} שיעורים
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── LessonRow ───────────────────────────────────────────────────────────────

function LessonRow({
  lesson,
  onNavigate,
}: {
  lesson: {
    id: string;
    title: string;
    duration?: number | null;
    published_at?: string | null;
    video_url?: string | null;
    audio_url?: string | null;
    attachment_url?: string | null;
    rabbis?: { name: string } | { name: string }[] | null;
  };
  onNavigate: (path: string) => void;
}) {
  const rabbiName = Array.isArray(lesson.rabbis)
    ? lesson.rabbis[0]?.name
    : (lesson.rabbis as { name: string } | null)?.name;

  return (
    <button
      onClick={() => onNavigate(`/lessons/${lesson.id}`)}
      style={{
        width: "100%",
        textAlign: "right",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.7rem 0.9rem",
        borderRadius: radii.md,
        background: "white",
        border: `1px solid rgba(139,111,71,0.10)`,
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: fonts.body,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(196,162,101,0.06)";
        e.currentTarget.style.borderColor = "rgba(139,111,71,0.22)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "white";
        e.currentTarget.style.borderColor = "rgba(139,111,71,0.10)";
      }}
    >
      {/* Media icon */}
      <span style={{ color: colors.goldDark, display: "flex", alignItems: "center" }}>
        {lessonMediaIcon(lesson)}
      </span>

      {/* Title + rabbi */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.84rem",
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
          <div style={{ fontSize: "0.73rem", color: colors.textMuted, marginTop: "0.1rem" }}>
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "1.25rem",
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            borderRadius: radii.lg,
            overflow: "hidden",
            background: "white",
            border: `1px solid rgba(139,111,71,0.08)`,
          }}
        >
          <div
            style={{
              width: "100%",
              aspectRatio: "16/9",
              background: "rgba(139,111,71,0.08)",
              animation: "pulse 1.5s ease infinite",
            }}
          />
          <div style={{ padding: "0.75rem" }}>
            <div
              style={{
                height: 14,
                borderRadius: radii.sm,
                background: "rgba(139,111,71,0.08)",
                animation: "pulse 1.5s ease infinite",
                marginBottom: "0.4rem",
              }}
            />
            <div
              style={{
                height: 11,
                width: "60%",
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
