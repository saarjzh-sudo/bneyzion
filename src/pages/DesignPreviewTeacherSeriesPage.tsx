/**
 * /design-teachers-series/:id — דף סדרה בתוך אגף המורים
 *
 * Design decisions:
 * - Hero: olive variant (matches wing)
 * - Breadcrumb: אגף המורים → [tab] → [series title]
 * - 6-tab InPageNav: same as DesignPreviewTeachersWingV2 (ספרים / חידות / דפי עבודה / כלים / איך מלמדים / עזרי הוראה)
 * - Two-column layout: RIGHT = teachers-wing mini-sidebar (clickable, switches tabs),
 *   LEFT = series lessons + filter panel
 * - Filter panel: חיפוש / ספר / סוג מדיה / מיון / PDF בלבד
 * - SEO: <title> / <meta description> / og:* / canonical via react-helmet (Vite's built-in)
 * - Teacher badge on every lesson card (olive stripe, "אגף המורים" chip)
 * - Cards link BACK into teacher wing context, not to production /series/:id
 * - Sandbox-only — does NOT touch production SeriesPagePublic.tsx
 *
 * Route: /design-teachers-series/:id
 */
import { useState, useMemo, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  BookOpen,
  HelpCircle,
  FileText,
  Wrench,
  GraduationCap,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Loader2,
  Search,
  Filter,
  ExternalLink,
  Headphones,
  Video,
  FileDown,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import {
  colors,
  fonts,
  gradients,
  radii,
  shadows,
} from "@/lib/designTokens";
import { useTeachersWing, type SeriesRow } from "@/hooks/useTeachersWing";
import { formatDuration } from "@/lib/designTokens";

// ─── Tab types (mirrors V2) ────────────────────────────────────────────────
type TabId = "books" | "riddles" | "worksheets" | "tools" | "howto" | "ezrei";

const TABS: { id: TabId; label: string; icon: typeof BookOpen }[] = [
  { id: "books",      label: "ספרים",         icon: BookOpen },
  { id: "riddles",    label: "חידות",          icon: HelpCircle },
  { id: "worksheets", label: "דפי עבודה",      icon: FileText },
  { id: "tools",      label: "כלים ומדריכים", icon: Wrench },
  { id: "howto",      label: "איך מלמדים",    icon: GraduationCap },
  { id: "ezrei",      label: "עזרי הוראה",     icon: Layers },
];

// Teacher series IDs (same as V2)
const TEACHER_SERIES_IDS = {
  riddles:    "c852edd8-d959-4c8d-bf7e-17b5881275fa",
  howToStudy: "26e30725-d5d0-4d88-8f73-f7a279801241",
  tools:      "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7",
  livuyTatim: "7cbd261e-03b0-43da-a708-e8ae4402105f",
  maps:       "4d78557b-da8b-4b1f-8d8e-09d74ff3070a",
};

// ─── Data hooks ─────────────────────────────────────────────────────────────

/** Full series metadata */
function useSeriesMeta(id: string) {
  return useQuery({
    queryKey: ["teacher-series-meta", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("series")
        .select("id, title, description, image_url, lesson_count, rabbi_id, audience_tags")
        .eq("id", id)
        .single();
      if (!data) return null;
      let rabbiName: string | null = null;
      if (data.rabbi_id) {
        const { data: r } = await supabase
          .from("rabbis")
          .select("name")
          .eq("id", data.rabbi_id)
          .single();
        rabbiName = r?.name || null;
      }
      return { ...data, rabbiName };
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

/** All lessons in a series */
function useSeriesLessons(seriesId: string) {
  return useQuery({
    queryKey: ["teacher-series-lessons", seriesId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, title, description, duration, source_type, audio_url, video_url, attachment_url, rabbi_id, series_id")
        .eq("series_id", seriesId)
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("title")
        .limit(300);
      if (!data || data.length === 0) return [];
      const rabbiIds = [...new Set(data.filter(l => l.rabbi_id).map(l => l.rabbi_id!))];
      let rabbiMap = new Map<string, string>();
      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase.from("rabbis").select("id, name").in("id", rabbiIds);
        rabbiMap = new Map((rabbis || []).map(r => [r.id, r.name]));
      }
      return data.map(l => ({
        id: l.id,
        title: l.title,
        description: l.description,
        duration: l.duration,
        sourceType: l.source_type,
        audioUrl: l.audio_url,
        videoUrl: l.video_url,
        attachmentUrl: l.attachment_url,
        rabbiName: l.rabbi_id ? rabbiMap.get(l.rabbi_id) || null : null,
      }));
    },
    enabled: !!seriesId,
    staleTime: 1000 * 60 * 5,
  });
}

/** All teacher series for a given tab (to show in sidebar) */
function useTabSeries(tab: TabId) {
  return useQuery({
    queryKey: ["teacher-tab-series", tab],
    queryFn: async () => {
      if (tab === "riddles") {
        const { data } = await supabase
          .from("series")
          .select("id, title, lesson_count")
          .eq("id", TEACHER_SERIES_IDS.riddles)
          .single();
        return data ? [{ id: data.id, title: data.title, lessonCount: data.lesson_count }] : [];
      }
      if (tab === "howto") {
        const { data } = await supabase
          .from("series")
          .select("id, title, lesson_count")
          .eq("id", TEACHER_SERIES_IDS.howToStudy)
          .single();
        return data ? [{ id: data.id, title: data.title, lessonCount: data.lesson_count }] : [];
      }
      if (tab === "worksheets") {
        const { data } = await supabase
          .from("series")
          .select("id, title, lesson_count")
          .contains("audience_tags", ["teachers"])
          .ilike("title", "%דפי עבודה%")
          .order("title")
          .limit(50);
        return (data || []).map(s => ({ id: s.id, title: s.title, lessonCount: s.lesson_count }));
      }
      if (tab === "tools") {
        const { data } = await supabase
          .from("series")
          .select("id, title, lesson_count")
          .in("id", [TEACHER_SERIES_IDS.tools, TEACHER_SERIES_IDS.livuyTatim, TEACHER_SERIES_IDS.maps])
          .order("title");
        return (data || []).map(s => ({ id: s.id, title: s.title, lessonCount: s.lesson_count }));
      }
      if (tab === "ezrei") {
        // Return all teacher-tagged series not matching the other tabs
        const { data } = await supabase
          .from("series")
          .select("id, title, lesson_count")
          .contains("audience_tags", ["teachers"])
          .not("title", "ilike", "%דפי עבודה%")
          .order("lesson_count", { ascending: false })
          .limit(40);
        return (data || []).map(s => ({ id: s.id, title: s.title, lessonCount: s.lesson_count }));
      }
      // books — return teacher-tagged series
      const { data } = await supabase
        .from("series")
        .select("id, title, lesson_count")
        .contains("audience_tags", ["teachers"])
        .order("lesson_count", { ascending: false })
        .limit(40);
      return (data || []).map(s => ({ id: s.id, title: s.title, lessonCount: s.lesson_count }));
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Mini tab bar (same 6 tabs) ────────────────────────────────────────────
function MiniTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (t: TabId) => void;
}) {
  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        gap: "0.25rem",
        flexWrap: "wrap",
        background: "white",
        borderRadius: radii.xl,
        border: "1px solid rgba(139,111,71,0.12)",
        boxShadow: shadows.cardSoft,
        padding: "0.3rem",
        marginBottom: "2rem",
      }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 1rem",
              borderRadius: radii.lg,
              border: "none",
              background: isActive ? gradients.oliveButton : "transparent",
              color: isActive ? "white" : colors.textMuted,
              fontFamily: fonts.body,
              fontSize: "0.82rem",
              fontWeight: isActive ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
          >
            <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Teachers Wing Sidebar Panel ────────────────────────────────────────────
function TeachersSidebarPanel({
  activeTab,
  currentSeriesId,
}: {
  activeTab: TabId;
  currentSeriesId: string;
}) {
  const navigate = useNavigate();
  const seriesQuery = useTabSeries(activeTab);
  const series = seriesQuery.data ?? [];

  return (
    <nav
      style={{
        background: "white",
        borderRadius: radii.xl,
        border: "1px solid rgba(74,90,46,0.15)",
        boxShadow: shadows.cardSoft,
        overflow: "hidden",
        position: "sticky",
        top: "6rem",
        maxHeight: "calc(100vh - 8rem)",
        overflowY: "auto",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "0.9rem 1rem",
          background: `linear-gradient(135deg, ${colors.oliveDark} 0%, ${colors.oliveMain} 100%)`,
          color: "white",
        }}
      >
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "0.85rem", color: "white" }}>
          {TABS.find(t => t.id === activeTab)?.label || "סדרות"}
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: "rgba(255,255,255,0.75)", marginTop: "0.15rem" }}>
          {series.length} סדרות
        </div>
      </div>

      {/* Series list */}
      {seriesQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "1.5rem" }}>
          <Loader2 style={{ width: 20, height: 20, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
        </div>
      ) : series.length === 0 ? (
        <div style={{ padding: "1.5rem", fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted, textAlign: "center" }}>
          אין סדרות
        </div>
      ) : (
        <div>
          {series.map((s) => {
            const isCurrent = s.id === currentSeriesId;
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/design-teachers-series/${s.id}`)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.65rem 1rem",
                  background: isCurrent ? "rgba(74,90,46,0.1)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(139,111,71,0.07)",
                  borderInlineEnd: isCurrent ? `3px solid ${colors.oliveDark}` : "3px solid transparent",
                  cursor: "pointer",
                  fontFamily: fonts.body,
                  fontSize: "0.8rem",
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? colors.oliveDark : colors.textMid,
                  textAlign: "right",
                  transition: "all 0.15s",
                  minWidth: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.background = "rgba(74,90,46,0.05)";
                    e.currentTarget.style.color = colors.oliveDark;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = colors.textMid;
                  }
                }}
              >
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                  {s.title}
                </span>
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.62rem",
                    color: colors.textSubtle,
                    background: colors.parchmentDeep,
                    padding: "0.1rem 0.4rem",
                    borderRadius: radii.pill,
                    flexShrink: 0,
                    marginInlineStart: "0.5rem",
                  }}
                >
                  {s.lessonCount}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}

// ─── Filter panel ───────────────────────────────────────────────────────────
type SortMode = "default" | "alpha" | "duration-desc" | "duration-asc";
type MediaFilter = "all" | "audio" | "video" | "pdf";

interface FiltersState {
  search: string;
  media: MediaFilter;
  sort: SortMode;
  pdfOnly: boolean;
}

function FilterPanel({
  filters,
  onChange,
  totalCount,
  filteredCount,
}: {
  filters: FiltersState;
  onChange: (f: Partial<FiltersState>) => void;
  totalCount: number;
  filteredCount: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      dir="rtl"
      style={{
        background: "white",
        borderRadius: radii.xl,
        border: "1px solid rgba(74,90,46,0.15)",
        boxShadow: shadows.cardSoft,
        marginBottom: "1.5rem",
        overflow: "hidden",
      }}
    >
      {/* Always-visible search row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          borderBottom: expanded ? "1px solid rgba(139,111,71,0.1)" : "none",
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            style={{
              position: "absolute",
              right: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              width: 15,
              height: 15,
              color: colors.textSubtle,
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="חיפוש בשיעורים..."
            style={{
              width: "100%",
              height: 36,
              paddingInlineEnd: "2.25rem",
              paddingInlineStart: "0.75rem",
              borderRadius: radii.md,
              border: "1px solid rgba(139,111,71,0.2)",
              fontFamily: fonts.body,
              fontSize: "0.85rem",
              color: colors.textDark,
              background: colors.parchment,
              outline: "none",
              direction: "rtl",
            }}
          />
          {filters.search && (
            <button
              onClick={() => onChange({ search: "" })}
              style={{
                position: "absolute",
                left: "0.5rem",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: colors.textSubtle,
                padding: 0,
                display: "flex",
              }}
            >
              <X style={{ width: 13, height: 13 }} />
            </button>
          )}
        </div>

        {/* Count */}
        <span style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textSubtle, whiteSpace: "nowrap", flexShrink: 0 }}>
          {filteredCount}/{totalCount} שיעורים
        </span>

        {/* Toggle more filters */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.4rem 0.75rem",
            borderRadius: radii.md,
            border: `1px solid ${expanded ? colors.oliveDark : "rgba(139,111,71,0.2)"}`,
            background: expanded ? "rgba(74,90,46,0.08)" : "transparent",
            color: expanded ? colors.oliveDark : colors.textMuted,
            fontFamily: fonts.body,
            fontSize: "0.78rem",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Filter style={{ width: 13, height: 13 }} />
          סינונים
          {expanded ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
        </button>
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            padding: "0.9rem 1rem",
            alignItems: "flex-start",
          }}
        >
          {/* Media type */}
          <div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textSubtle, marginBottom: "0.4rem", fontWeight: 600 }}>
              סוג מדיה
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {(["all", "audio", "video", "pdf"] as MediaFilter[]).map(m => {
                const labels: Record<MediaFilter, string> = { all: "הכל", audio: "אודיו", video: "וידאו", pdf: "PDF" };
                const isActive = filters.media === m;
                return (
                  <button
                    key={m}
                    onClick={() => onChange({ media: m })}
                    style={{
                      padding: "0.3rem 0.7rem",
                      borderRadius: radii.pill,
                      border: `1px solid ${isActive ? colors.oliveDark : "rgba(139,111,71,0.2)"}`,
                      background: isActive ? colors.oliveDark : "transparent",
                      color: isActive ? "white" : colors.textMuted,
                      fontFamily: fonts.body,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    {labels[m]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort */}
          <div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textSubtle, marginBottom: "0.4rem", fontWeight: 600 }}>
              מיון
            </div>
            <select
              value={filters.sort}
              onChange={(e) => onChange({ sort: e.target.value as SortMode })}
              style={{
                height: 32,
                paddingInline: "0.6rem",
                borderRadius: radii.md,
                border: "1px solid rgba(139,111,71,0.2)",
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                color: colors.textDark,
                background: "white",
                cursor: "pointer",
                direction: "rtl",
              }}
            >
              <option value="default">ברירת מחדל</option>
              <option value="alpha">אלפבית</option>
              <option value="duration-desc">ארוך ← קצר</option>
              <option value="duration-asc">קצר ← ארוך</option>
            </select>
          </div>

          {/* PDF only toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.35rem" }}>
            <button
              onClick={() => onChange({ pdfOnly: !filters.pdfOnly })}
              style={{
                width: 36,
                height: 20,
                borderRadius: radii.pill,
                background: filters.pdfOnly ? colors.oliveDark : "rgba(139,111,71,0.15)",
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
                flexShrink: 0,
              }}
            >
              <div style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "white",
                position: "absolute",
                top: 3,
                left: filters.pdfOnly ? 3 : 19,
                transition: "left 0.2s",
              }} />
            </button>
            <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMid }}>
              PDF בלבד
            </span>
          </div>

          {/* Clear all */}
          {(filters.search || filters.media !== "all" || filters.sort !== "default" || filters.pdfOnly) && (
            <button
              onClick={() => onChange({ search: "", media: "all", sort: "default", pdfOnly: false })}
              style={{
                marginTop: "1.35rem",
                padding: "0.3rem 0.7rem",
                borderRadius: radii.pill,
                border: "1px solid rgba(139,111,71,0.2)",
                background: "transparent",
                color: colors.textMuted,
                fontFamily: fonts.body,
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              נקה הכל
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Lesson Card (teacher-styled) ────────────────────────────────────────────
function TeacherLessonCard({ lesson, index }: {
  lesson: ReturnType<typeof useSeriesLessons>["data"] extends (infer T)[] | undefined ? T : never;
  index: number;
}) {
  if (!lesson) return null;
  const hasAudio = !!lesson.audioUrl;
  const hasVideo = !!lesson.videoUrl;
  const hasPdf   = !!lesson.attachmentUrl;

  return (
    <Link to={`/design-lesson-page/${lesson.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: "white",
          borderRadius: radii.xl,
          border: "1px solid rgba(74,90,46,0.1)",
          boxShadow: shadows.cardSoft,
          padding: "1rem 1.1rem 0.9rem",
          cursor: "pointer",
          transition: "all 0.2s ease",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          gap: "0.9rem",
          alignItems: "flex-start",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = colors.oliveDark;
          e.currentTarget.style.boxShadow = shadows.cardHover;
          e.currentTarget.style.background = "rgba(74,90,46,0.02)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(74,90,46,0.1)";
          e.currentTarget.style.boxShadow = shadows.cardSoft;
          e.currentTarget.style.background = "white";
        }}
      >
        {/* Olive left stripe (RTL end = right in Hebrew) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            insetInlineEnd: 0,
            bottom: 0,
            width: 3,
            background: gradients.oliveButton,
          }}
        />

        {/* Index number */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "rgba(74,90,46,0.1)",
            color: colors.oliveDark,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: fonts.body,
            fontWeight: 800,
            fontSize: "0.72rem",
            flexShrink: 0,
            marginTop: "0.1rem",
          }}
        >
          {index + 1}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Teacher badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: "0.6rem",
                color: colors.oliveDark,
                background: "rgba(74,90,46,0.1)",
                padding: "0.1rem 0.45rem",
                borderRadius: radii.pill,
                fontWeight: 700,
                letterSpacing: "0.03em",
              }}
            >
              אגף המורים
            </span>
          </div>

          <h3
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "0.9rem",
              color: colors.textDark,
              margin: 0,
              lineHeight: 1.4,
              marginBottom: "0.25rem",
            }}
          >
            {lesson.title}
          </h3>

          {lesson.rabbiName && (
            <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.goldDark, fontWeight: 600 }}>
              {lesson.rabbiName}
            </div>
          )}

          {lesson.description && (
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "0.76rem",
                color: colors.textMuted,
                margin: "0.3rem 0 0",
                lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {lesson.description}
            </p>
          )}

          {/* Media badges + duration */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginTop: "0.55rem", flexWrap: "wrap" }}>
            {hasAudio && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontFamily: fonts.body, fontSize: "0.63rem", color: colors.oliveDark, background: "rgba(74,90,46,0.08)", padding: "0.15rem 0.5rem", borderRadius: radii.pill }}>
                <Headphones style={{ width: 10, height: 10 }} />
                אודיו
              </span>
            )}
            {hasVideo && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontFamily: fonts.body, fontSize: "0.63rem", color: colors.navyDeep, background: "rgba(26,39,68,0.08)", padding: "0.15rem 0.5rem", borderRadius: radii.pill }}>
                <Video style={{ width: 10, height: 10 }} />
                וידאו
              </span>
            )}
            {hasPdf && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontFamily: fonts.body, fontSize: "0.63rem", color: colors.goldDeep, background: "rgba(139,111,71,0.1)", padding: "0.15rem 0.5rem", borderRadius: radii.pill }}>
                <FileDown style={{ width: 10, height: 10 }} />
                PDF
              </span>
            )}
            {lesson.duration && (
              <span style={{ fontFamily: fonts.body, fontSize: "0.63rem", color: colors.textSubtle, marginInlineStart: "auto" }}>
                {formatDuration(lesson.duration)}
              </span>
            )}
          </div>
        </div>

        <ChevronRight style={{ width: 14, height: 14, color: colors.textSubtle, flexShrink: 0, marginTop: "0.35rem", transform: "scaleX(-1)" }} />
      </div>
    </Link>
  );
}

// ─── Page root ─────────────────────────────────────────────────────────────
export default function DesignPreviewTeacherSeriesPage() {
  const { id } = useParams<{ id: string }>();
  const seriesId = id || "";

  const [activeTab, setActiveTab] = useState<TabId>("books");
  const [filters, setFilters] = useState<FiltersState>({
    search: "",
    media: "all",
    sort: "default",
    pdfOnly: false,
  });

  const metaQuery = useSeriesMeta(seriesId);
  const lessonsQuery = useSeriesLessons(seriesId);

  const series = metaQuery.data;
  const allLessons = lessonsQuery.data ?? [];

  // Apply filters
  const filteredLessons = useMemo(() => {
    let result = [...allLessons];

    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        (l.description || "").toLowerCase().includes(q)
      );
    }

    if (filters.media !== "all") {
      if (filters.media === "audio") result = result.filter(l => !!l.audioUrl);
      if (filters.media === "video") result = result.filter(l => !!l.videoUrl);
      if (filters.media === "pdf")   result = result.filter(l => !!l.attachmentUrl);
    }

    if (filters.pdfOnly) {
      result = result.filter(l => !!l.attachmentUrl);
    }

    if (filters.sort === "alpha") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title, "he"));
    } else if (filters.sort === "duration-desc") {
      result = [...result].sort((a, b) => (b.duration || 0) - (a.duration || 0));
    } else if (filters.sort === "duration-asc") {
      result = [...result].sort((a, b) => (a.duration || 0) - (b.duration || 0));
    }

    return result;
  }, [allLessons, filters]);

  const handleFilterChange = (partial: Partial<FiltersState>) => {
    setFilters(prev => ({ ...prev, ...partial }));
  };

  // SEO: update document.title + meta tags via useEffect
  const pageTitle = series
    ? `${series.title} | אגף המורים | בני ציון`
    : "אגף המורים | בני ציון";
  const metaDesc = series?.description
    ? `${series.description.slice(0, 150)}...`
    : 'תכנים, שיעורים וכלים למחנכי תנ"ך — אגף המורים של בני ציון.';

  useEffect(() => {
    document.title = pageTitle;
    // Update or create meta description
    let descEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!descEl) {
      descEl = document.createElement("meta");
      descEl.setAttribute("name", "description");
      document.head.appendChild(descEl);
    }
    descEl.setAttribute("content", metaDesc);
    // canonical
    let canonEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonEl) {
      canonEl = document.createElement("link");
      canonEl.setAttribute("rel", "canonical");
      document.head.appendChild(canonEl);
    }
    canonEl.setAttribute("href", `https://bneyzion.vercel.app/design-teachers-series/${seriesId}`);
    return () => {
      document.title = "בני ציון — לימוד תנ\"ך";
    };
  }, [pageTitle, metaDesc, seriesId]);

  return (
    <DesignLayout sidebar={false}>

      {/* Hero */}
      <DesignPageHero
        variant="olive"
        eyebrow="אגף המורים"
        title={series?.title || "טוען..."}
        subtitle={series?.description?.slice(0, 100) || ""}
      />

      {/* Main body */}
      <div
        style={{
          background: colors.parchment,
          minHeight: "60vh",
          padding: "2rem 1.5rem 5rem",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }} dir="rtl">

          {/* Breadcrumb */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              marginBottom: "1.5rem",
              fontFamily: fonts.body,
              fontSize: "0.8rem",
              color: colors.textSubtle,
              flexWrap: "wrap",
            }}
          >
            <Link to="/design-teachers-wing-v2" style={{ color: colors.oliveDark, textDecoration: "none", fontWeight: 600 }}>
              אגף המורים
            </Link>
            <ChevronRight style={{ width: 12, height: 12, transform: "scaleX(-1)" }} />
            <span style={{ color: colors.textSubtle }}>{TABS.find(t => t.id === activeTab)?.label}</span>
            <ChevronRight style={{ width: 12, height: 12, transform: "scaleX(-1)" }} />
            <span style={{ color: colors.textDark, fontWeight: 600 }}>
              {series?.title || "..."}
            </span>
          </nav>

          {/* 6-tab navigation (full width) */}
          <MiniTabBar activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Two-column layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "260px 1fr",
              gap: "1.75rem",
              alignItems: "start",
            }}
          >
            {/* RIGHT: Teachers Wing mini-sidebar */}
            <TeachersSidebarPanel activeTab={activeTab} currentSeriesId={seriesId} />

            {/* LEFT: Filter panel + Lessons */}
            <div>
              {/* Series meta strip */}
              {series && (
                <div
                  style={{
                    background: "white",
                    borderRadius: radii.xl,
                    border: "1px solid rgba(74,90,46,0.12)",
                    padding: "0.9rem 1.1rem",
                    marginBottom: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    boxShadow: shadows.cardSoft,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.05rem", color: colors.textDark }}>
                      {series.title}
                    </div>
                    {series.rabbiName && (
                      <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.goldDark, fontWeight: 600, marginTop: "0.15rem" }}>
                        {series.rabbiName}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: "0.7rem",
                      color: colors.oliveDark,
                      background: "rgba(74,90,46,0.1)",
                      padding: "0.3rem 0.8rem",
                      borderRadius: radii.pill,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {series.lesson_count} שיעורים
                  </span>
                </div>
              )}

              {/* Filter panel */}
              <FilterPanel
                filters={filters}
                onChange={handleFilterChange}
                totalCount={allLessons.length}
                filteredCount={filteredLessons.length}
              />

              {/* Lessons list */}
              {lessonsQuery.isLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                  <Loader2 style={{ width: 28, height: 28, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
                </div>
              ) : filteredLessons.length === 0 ? (
                <div
                  style={{
                    padding: "3rem",
                    background: "white",
                    borderRadius: radii.xl,
                    border: "1px dashed rgba(74,90,46,0.2)",
                    fontFamily: fonts.body,
                    color: colors.textMuted,
                    textAlign: "center",
                    fontSize: "0.9rem",
                  }}
                >
                  {allLessons.length === 0
                    ? "אין שיעורים זמינים בסדרה זו"
                    : "אין שיעורים התואמים לסינון הנוכחי"}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {filteredLessons.map((lesson, index) => (
                    <TeacherLessonCard key={lesson.id} lesson={lesson} index={index} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DesignLayout>
  );
}
