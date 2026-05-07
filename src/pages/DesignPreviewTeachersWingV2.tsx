/**
 * /design-teachers-wing-v2 — אגף המורים v2
 *
 * Design decisions:
 * - Hero: olive variant, eyebrow "אגף המורים", title "כלים ותכנים למחנכי תנ״ך"
 * - Navigation: in-page tabs (ספרים / חידות / דפי עבודה / כלים ומדריכים / איך מלמדים)
 * - Data: real data from useTeachersWing hook + direct Supabase queries per tab
 * - List/Cards toggle: same pattern as DesignPreviewSeriesPageV2 (bnz.teachers.view)
 * - audience_tags filtering: only series/lessons tagged ["teachers"] appear
 * - No AITeacherTools component (Saar not familiar with it — excluded pending decision)
 * - No role gating in sandbox
 * - Sandbox-only — does NOT touch production TeachersWing.tsx
 *
 * Tab map (2026-05-07):
 *   books    → Torah/Nevi'im/Ketuvim tree (filtered: teacher-tagged series only)
 *   riddles  → "חידות לילדים - פרשת השבוע" series (ID: c852edd8-...)
 *   worksheets → "דפי עבודה - *" series (audience_tags @> ['teachers'])
 *   tools    → "כלי עזר", "מפות עזר", "ליווי ת"תים" (audience_tags @> ['teachers'])
 *   howto    → "איך מלמדים תנ"ך" (ID: 26e30725-...)
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  LayoutGrid,
  List,
  HelpCircle,
  FileText,
  Wrench,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
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
import { useTeachersWing, useMaagarEzreiTree, type SeriesRow } from "@/hooks/useTeachersWing";

// ─── localStorage key ──────────────────────────────────────────────────────
const VIEW_PREF_KEY = "bnz.teachers.view";

// ─── Tab definition ────────────────────────────────────────────────────────
type TabId = "books" | "riddles" | "worksheets" | "tools" | "howto" | "ezrei";

const TABS: { id: TabId; label: string; icon: typeof BookOpen }[] = [
  { id: "books",      label: "ספרים",          icon: BookOpen },
  { id: "riddles",    label: "חידות",           icon: HelpCircle },
  { id: "worksheets", label: "דפי עבודה",       icon: FileText },
  { id: "tools",      label: "כלים ומדריכים",  icon: Wrench },
  { id: "howto",      label: "איך מלמדים",     icon: GraduationCap },
  { id: "ezrei",      label: "עזרי הוראה",      icon: GraduationCap },
];

// ─── Known teacher series IDs (stable — confirmed 2026-05-07) ─────────────
const TEACHER_SERIES_IDS = {
  riddles:   "c852edd8-d959-4c8d-bf7e-17b5881275fa", // חידות לילדים - פרשת השבוע
  howToStudy:"26e30725-d5d0-4d88-8f73-f7a279801241", // איך מלמדים תנ"ך
  tools:     "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7", // כלי עזר - טבלאות זמני המאורעות ומפות
  livuyTatim:"7cbd261e-03b0-43da-a708-e8ae4402105f", // ליווי ת"תים
  maps:      "4d78557b-da8b-4b1f-8d8e-09d74ff3070a", // מפות עזר לתנ"ך
};

// ─── View mode ─────────────────────────────────────────────────────────────
type ViewMode = "grid" | "list";

// ─── Hooks for specific content tabs ──────────────────────────────────────

/** Lessons in a given root series (direct, no descendants) */
function useLessonsInSeries(seriesId: string) {
  return useQuery({
    queryKey: ["tw-lessons-in-series", seriesId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, title, description, duration, audio_url, video_url, attachment_url, rabbi_id")
        .eq("series_id", seriesId)
        .eq("status", "published")
        .order("title")
        .limit(200);
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
        audioUrl: l.audio_url,
        videoUrl: l.video_url,
        attachmentUrl: l.attachment_url,
        rabbiName: l.rabbi_id ? rabbiMap.get(l.rabbi_id) || null : null,
      }));
    },
    staleTime: 1000 * 60 * 10,
  });
}

/** All series with audience_tags @> ['teachers'] matching a keyword */
function useTeacherSeriesByKeyword(keyword: string) {
  return useQuery({
    queryKey: ["tw-teacher-series-keyword", keyword],
    queryFn: async () => {
      const { data } = await supabase
        .from("series")
        .select("id, title, lesson_count, rabbi_id, description, audience_tags")
        .contains("audience_tags", ["teachers"])
        .ilike("title", `%${keyword}%`)
        .order("title")
        .limit(100);
      if (!data || data.length === 0) return [];
      const rabbiIds = [...new Set(data.filter(s => s.rabbi_id).map(s => s.rabbi_id!))];
      let rabbiMap = new Map<string, string>();
      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase.from("rabbis").select("id, name").in("id", rabbiIds);
        rabbiMap = new Map((rabbis || []).map(r => [r.id, r.name]));
      }
      return data.map(s => ({
        id: s.id,
        title: s.title,
        lessonCount: s.lesson_count,
        rabbiName: s.rabbi_id ? rabbiMap.get(s.rabbi_id) || null : null,
        description: s.description,
        sourceType: null,
      })) as SeriesRow[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

/** All tools series: כלי עזר + ליווי ת"תים + מפות עזר */
function useToolsSeries() {
  return useQuery({
    queryKey: ["tw-tools-series"],
    queryFn: async () => {
      const toolIds = [
        TEACHER_SERIES_IDS.tools,
        TEACHER_SERIES_IDS.livuyTatim,
        TEACHER_SERIES_IDS.maps,
      ];
      const { data: roots } = await supabase
        .from("series")
        .select("id, title, lesson_count, description, rabbi_id")
        .in("id", toolIds);
      const { data: children } = await supabase
        .from("series")
        .select("id, title, lesson_count, description, rabbi_id")
        .in("parent_id", toolIds)
        .contains("audience_tags", ["teachers"])
        .order("title")
        .limit(100);
      const all = [...(roots || []), ...(children || [])];
      const rabbiIds = [...new Set(all.filter(s => s.rabbi_id).map(s => s.rabbi_id!))];
      let rabbiMap = new Map<string, string>();
      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase.from("rabbis").select("id, name").in("id", rabbiIds);
        rabbiMap = new Map((rabbis || []).map(r => [r.id, r.name]));
      }
      return all.map(s => ({
        id: s.id,
        title: s.title,
        lessonCount: s.lesson_count,
        rabbiName: s.rabbi_id ? rabbiMap.get(s.rabbi_id) || null : null,
        description: s.description,
        sourceType: null,
      })) as SeriesRow[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ─── View toggle (same visual pattern as SeriesPageV2) ─────────────────────
function ViewToggle({
  viewMode,
  onViewChange,
}: {
  viewMode: ViewMode;
  onViewChange: (v: ViewMode) => void;
}) {
  return (
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
  );
}

// ─── Series card (grid view) ───────────────────────────────────────────────
function SeriesCard({ series }: { series: SeriesRow }) {
  return (
    <Link
      to={`/design-teachers-series/${series.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        style={{
          background: "white",
          borderRadius: radii.xl,
          border: "1px solid rgba(139,111,71,0.1)",
          boxShadow: shadows.cardSoft,
          padding: "1.25rem 1.25rem 1rem",
          cursor: "pointer",
          transition: "all 0.22s ease",
          position: "relative",
          overflow: "hidden",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
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
        {/* Olive accent stripe on the right (RTL start) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 4,
            background: gradients.oliveButton,
          }}
        />

        {/* Teacher badge */}
        <div style={{ marginBottom: "0.25rem" }}>
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: "0.6rem",
              color: colors.oliveDark,
              background: "rgba(74,90,46,0.1)",
              padding: "0.1rem 0.5rem",
              borderRadius: radii.pill,
              fontWeight: 700,
              letterSpacing: "0.03em",
            }}
          >
            אגף המורים
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: "0.95rem",
            color: colors.textDark,
            margin: 0,
            lineHeight: 1.4,
            paddingInlineEnd: "0.5rem",
          }}
        >
          {series.title}
        </h3>

        {/* Rabbi */}
        {series.rabbiName && (
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: "0.75rem",
              color: colors.goldDark,
              fontWeight: 700,
            }}
          >
            {series.rabbiName}
          </div>
        )}

        {/* Description (truncated) */}
        {series.description && (
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "0.8rem",
              color: colors.textMuted,
              margin: 0,
              lineHeight: 1.55,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              flex: 1,
            }}
          >
            {series.description}
          </p>
        )}

        {/* Footer: lesson count */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "0.65rem",
            borderTop: "1px solid rgba(139,111,71,0.08)",
            marginTop: "auto",
          }}
        >
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: "0.7rem",
              color: colors.textSubtle,
            }}
          >
            {series.lessonCount} שיעורים
          </span>
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: "0.7rem",
              color: colors.oliveMain,
              fontWeight: 600,
            }}
          >
            לסדרה ←
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Series row (list view) ────────────────────────────────────────────────
function SeriesRow_({ series }: { series: SeriesRow }) {
  return (
    <Link
      to={`/design-teachers-series/${series.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
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
        {/* Olive dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: gradients.oliveButton,
            flexShrink: 0,
          }}
        />

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "0.88rem",
              color: colors.textDark,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {series.title}
          </div>
          {series.rabbiName && (
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.7rem",
                color: colors.goldDark,
                fontWeight: 600,
                marginTop: "0.15rem",
              }}
            >
              {series.rabbiName}
            </div>
          )}
        </div>

        {/* Lesson count badge */}
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: "0.68rem",
            color: colors.textMuted,
            background: colors.parchmentDeep,
            padding: "0.2rem 0.6rem",
            borderRadius: radii.pill,
            flexShrink: 0,
          }}
        >
          {series.lessonCount} שיעורים
        </span>

        <ExternalLink
          style={{ width: 13, height: 13, color: colors.textSubtle, flexShrink: 0 }}
        />
      </div>
    </Link>
  );
}

// ─── Books tab ─────────────────────────────────────────────────────────────
/**
 * Shows the Torah/Nevi'im/Ketuvim category tree.
 * User clicks a book → series for that book load below.
 */
function BooksTab() {
  const { categories, useSeriesForNode, isLoading } = useTeachersWing();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeTitle, setSelectedNodeTitle] = useState<string>("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    () => new Set(["torah"])
  );

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem(VIEW_PREF_KEY) as ViewMode) || "grid";
    } catch {
      return "grid";
    }
  });

  const handleViewChange = (v: ViewMode) => {
    setViewMode(v);
    try {
      localStorage.setItem(VIEW_PREF_KEY, v);
    } catch {
      /* localStorage may be blocked */
    }
  };

  const seriesQuery = useSeriesForNode(selectedNodeId);

  const toggleCat = (catId: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
      >
        <Loader2
          style={{
            width: 28,
            height: 28,
            color: colors.goldDark,
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        gap: "2rem",
        alignItems: "start",
      }}
    >
      {/* ── Left panel: book tree ── */}
      <nav
        style={{
          background: "white",
          borderRadius: radii.xl,
          border: "1px solid rgba(139,111,71,0.1)",
          boxShadow: shadows.cardSoft,
          overflow: "hidden",
          position: "sticky",
          top: "6rem",
        }}
      >
        {categories.map((cat) => {
          const isExpanded = expandedCats.has(cat.id);
          return (
            <div key={cat.id}>
              {/* Category header */}
              <button
                onClick={() => toggleCat(cat.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.85rem 1rem",
                  background: colors.parchmentDark,
                  border: "none",
                  borderBottom: "1px solid rgba(139,111,71,0.1)",
                  cursor: "pointer",
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  color: colors.oliveDark,
                  textAlign: "right",
                }}
              >
                {cat.title}
                {isExpanded ? (
                  <ChevronUp style={{ width: 14, height: 14 }} />
                ) : (
                  <ChevronDown style={{ width: 14, height: 14 }} />
                )}
              </button>

              {/* Books list */}
              {isExpanded && (
                <div>
                  {cat.books.map((book) => {
                    const isSelected = selectedNodeId === book.id;
                    return (
                      <button
                        key={book.id}
                        onClick={() => {
                          setSelectedNodeId(book.id);
                          setSelectedNodeTitle(book.title);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.6rem 1rem 0.6rem 1.5rem",
                          background: isSelected
                            ? "rgba(74,90,46,0.08)"
                            : "transparent",
                          border: "none",
                          borderBottom: "1px solid rgba(139,111,71,0.06)",
                          borderRight: isSelected
                            ? `3px solid ${colors.oliveDark}`
                            : "3px solid transparent",
                          cursor: "pointer",
                          fontFamily: fonts.body,
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: "0.83rem",
                          color: isSelected ? colors.oliveDark : colors.textMid,
                          textAlign: "right",
                          transition: "all 0.15s",
                        }}
                      >
                        {book.title}
                        {book.children.length > 0 && (
                          <span
                            style={{
                              fontSize: "0.65rem",
                              color: colors.textSubtle,
                              background: colors.parchmentDeep,
                              padding: "0.1rem 0.4rem",
                              borderRadius: radii.pill,
                              flexShrink: 0,
                            }}
                          >
                            {book.children.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Right panel: series grid/list ── */}
      <div>
        {!selectedNodeId ? (
          // Prompt state
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "4rem 2rem",
              background: "white",
              borderRadius: radii.xl,
              border: "1px dashed rgba(139,111,71,0.2)",
              gap: "1rem",
            }}
          >
            <BookOpen
              style={{ width: 40, height: 40, color: colors.oliveDark, opacity: 0.5 }}
            />
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: "1.1rem",
                fontWeight: 700,
                color: colors.textMuted,
              }}
            >
              בחר ספר מהתפריט כדי לראות את הסדרות
            </div>
          </div>
        ) : seriesQuery.isLoading ? (
          <div
            style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
          >
            <Loader2
              style={{
                width: 28,
                height: 28,
                color: colors.goldDark,
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        ) : (
          <>
            {/* Header + toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 800,
                    fontSize: "1.15rem",
                    color: colors.textDark,
                  }}
                >
                  {selectedNodeTitle}
                </div>
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.75rem",
                    color: colors.textSubtle,
                  }}
                >
                  {seriesQuery.data?.length ?? 0} סדרות
                </div>
              </div>
              <ViewToggle viewMode={viewMode} onViewChange={handleViewChange} />
            </div>

            {/* Series grid or list */}
            {(seriesQuery.data?.length ?? 0) === 0 ? (
              <div
                style={{
                  padding: "2.5rem",
                  background: "white",
                  borderRadius: radii.xl,
                  border: "1px solid rgba(139,111,71,0.08)",
                  fontFamily: fonts.body,
                  color: colors.textMuted,
                  textAlign: "center",
                }}
              >
                אין סדרות זמינות עדיין לספר זה
              </div>
            ) : viewMode === "grid" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
                  gap: "1rem",
                }}
              >
                {(seriesQuery.data ?? []).map((s) => (
                  <SeriesCard key={s.id} series={s} />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {(seriesQuery.data ?? []).map((s) => (
                  <SeriesRow_ key={s.id} series={s} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Riddles tab ───────────────────────────────────────────────────────────
/**
 * "חידות לילדים - פרשת השבוע" — 32 lessons, one per weekly portion.
 * Fetched directly from the series by its stable ID.
 */
function RiddlesTab() {
  const lessonsQuery = useLessonsInSeries(TEACHER_SERIES_IDS.riddles);

  if (lessonsQuery.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <Loader2 style={{ width: 28, height: 28, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const lessons = lessonsQuery.data ?? [];

  return (
    <div dir="rtl">
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.3rem", color: colors.textDark, margin: 0 }}>
          חידות לילדים — פרשת השבוע
        </h2>
        <p style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textSubtle, margin: "0.3rem 0 0" }}>
          {lessons.length} חידות — מוכנות לשיעור ולשולחן שבת
        </p>
      </div>

      {/* Grid of lesson cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
        {lessons.map((lesson) => (
          <Link key={lesson.id} to={`/lessons/${lesson.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div
              style={{
                background: "white",
                borderRadius: radii.xl,
                border: "1px solid rgba(139,111,71,0.1)",
                boxShadow: shadows.cardSoft,
                padding: "1.1rem 1.1rem 0.9rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.borderColor = colors.goldDark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "rgba(139,111,71,0.1)";
              }}
            >
              {/* Icon badge */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <HelpCircle style={{ width: 16, height: 16, color: colors.tealMain, flexShrink: 0 }} />
                <span style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.tealMain, fontWeight: 700, letterSpacing: "0.04em" }}>
                  חידה
                </span>
              </div>

              <h3 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.9rem", color: colors.textDark, margin: 0, lineHeight: 1.4 }}>
                {lesson.title}
              </h3>

              {lesson.description && (
                <p style={{
                  fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted,
                  margin: 0, lineHeight: 1.5,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {lesson.description}
                </p>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "auto", paddingTop: "0.5rem" }}>
                {lesson.audioUrl && (
                  <span style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textSubtle, background: colors.parchmentDeep, padding: "0.1rem 0.4rem", borderRadius: radii.pill }}>
                    אודיו
                  </span>
                )}
                {lesson.attachmentUrl && (
                  <span style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textSubtle, background: colors.parchmentDeep, padding: "0.1rem 0.4rem", borderRadius: radii.pill }}>
                    PDF
                  </span>
                )}
                <span style={{ marginInlineStart: "auto", fontFamily: fonts.body, fontSize: "0.68rem", color: colors.oliveDark, fontWeight: 600 }}>
                  לצפייה ←
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {lessons.length === 0 && (
        <div style={{ padding: "3rem", textAlign: "center", fontFamily: fonts.body, color: colors.textMuted }}>
          אין חידות זמינות כרגע
        </div>
      )}
    </div>
  );
}

// ─── Worksheets tab ────────────────────────────────────────────────────────
/**
 * "דפי עבודה - *" — 26 series, one per Bible book.
 * All tagged audience_tags @> ['teachers'].
 */
function WorksheetsTab() {
  const worksheetsQuery = useTeacherSeriesByKeyword("דפי עבודה");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(VIEW_PREF_KEY) as ViewMode) || "grid"; } catch { return "grid"; }
  });

  if (worksheetsQuery.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <Loader2 style={{ width: 28, height: 28, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const series = worksheetsQuery.data ?? [];

  return (
    <div dir="rtl">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.3rem", color: colors.textDark, margin: 0 }}>
            דפי עבודה לתנ"ך
          </h2>
          <p style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textSubtle, margin: "0.3rem 0 0" }}>
            {series.length} ספרים — דפי עבודה מוכנים להדפסה
          </p>
        </div>
        <ViewToggle viewMode={viewMode} onViewChange={(v) => { setViewMode(v); try { localStorage.setItem(VIEW_PREF_KEY, v); } catch {} }} />
      </div>

      {series.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", fontFamily: fonts.body, color: colors.textMuted }}>
          אין דפי עבודה זמינים כרגע
        </div>
      ) : viewMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
          {series.map((s) => <SeriesCard key={s.id} series={s} />)}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {series.map((s) => <SeriesRow_ key={s.id} series={s} />)}
        </div>
      )}
    </div>
  );
}

// ─── Tools tab (new) ────────────────────────────────────────────────────────
/**
 * כלי עזר + מפות + ליווי ת"תים — all teacher-tagged tools series.
 */
function ToolsTab() {
  const toolsQuery = useToolsSeries();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(VIEW_PREF_KEY) as ViewMode) || "grid"; } catch { return "grid"; }
  });

  if (toolsQuery.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <Loader2 style={{ width: 28, height: 28, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const series = toolsQuery.data ?? [];

  return (
    <div dir="rtl">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.3rem", color: colors.textDark, margin: 0 }}>
            כלים ומדריכים
          </h2>
          <p style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textSubtle, margin: "0.3rem 0 0" }}>
            טבלאות, מפות, ליווי ת"תים — עזרים מוכנים לשיעור
          </p>
        </div>
        <ViewToggle viewMode={viewMode} onViewChange={(v) => { setViewMode(v); try { localStorage.setItem(VIEW_PREF_KEY, v); } catch {} }} />
      </div>

      {series.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", fontFamily: fonts.body, color: colors.textMuted }}>
          אין כלים זמינים כרגע
        </div>
      ) : viewMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
          {series.map((s) => <SeriesCard key={s.id} series={s} />)}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {series.map((s) => <SeriesRow_ key={s.id} series={s} />)}
        </div>
      )}
    </div>
  );
}

// ─── HowTo tab ─────────────────────────────────────────────────────────────
/**
 * "איך מלמדים תנ"ך" — 14 lessons on teaching methodology.
 * Fetched directly from the series by its stable ID.
 */
function HowToTab() {
  const lessonsQuery = useLessonsInSeries(TEACHER_SERIES_IDS.howToStudy);

  if (lessonsQuery.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <Loader2 style={{ width: 28, height: 28, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const lessons = lessonsQuery.data ?? [];

  return (
    <div dir="rtl">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.3rem", color: colors.textDark, margin: 0 }}>
          איך מלמדים תנ"ך
        </h2>
        <p style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textSubtle, margin: "0.3rem 0 0" }}>
          {lessons.length} שיעורים בפדגוגיה של תנ"ך — מתודולוגיה, גישה, וכלים להוראה
        </p>
      </div>

      {/* Lesson list — editorial list view (no grid) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {lessons.map((lesson, index) => (
          <Link key={lesson.id} to={`/lessons/${lesson.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem 1.2rem",
                background: "white",
                borderRadius: radii.xl,
                border: "1px solid rgba(139,111,71,0.1)",
                boxShadow: shadows.cardSoft,
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.oliveDark;
                e.currentTarget.style.background = colors.parchmentDark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(139,111,71,0.1)";
                e.currentTarget.style.background = "white";
              }}
            >
              {/* Number */}
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: gradients.oliveButton, color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: fonts.body, fontWeight: 800, fontSize: "0.8rem", flexShrink: 0,
              }}>
                {index + 1}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.9rem", color: colors.textDark, lineHeight: 1.3 }}>
                  {lesson.title}
                </div>
                {lesson.description && (
                  <div style={{
                    fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted, marginTop: "0.2rem",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {lesson.description}
                  </div>
                )}
              </div>

              {/* Media badges */}
              <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                {lesson.audioUrl && (
                  <span style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.oliveDark, background: "rgba(74,90,46,0.08)", padding: "0.15rem 0.5rem", borderRadius: radii.pill }}>
                    אודיו
                  </span>
                )}
                {lesson.attachmentUrl && (
                  <span style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.goldDark, background: "rgba(139,111,71,0.08)", padding: "0.15rem 0.5rem", borderRadius: radii.pill }}>
                    PDF
                  </span>
                )}
              </div>

              <ExternalLink style={{ width: 14, height: 14, color: colors.textSubtle, flexShrink: 0 }} />
            </div>
          </Link>
        ))}
      </div>

      {lessons.length === 0 && (
        <div style={{ padding: "3rem", textAlign: "center", fontFamily: fonts.body, color: colors.textMuted }}>
          אין שיעורים זמינים כרגע
        </div>
      )}
    </div>
  );
}

/* CreatorsTab removed — replaced by 4 new content-specific tabs (2026-05-07).
   If a "creators" tab is needed in future, it can be a filtered view of rabbis
   whose series have audience_tags @> ['teachers']. */

// ─── EzreiTab — "עזרי הוראה" from מאגר-עזרי-הלמידה (migrated 2026-05-07) ──
/**
 * Displays the teacher aids tree: Torah / Nevi'im / Ketuvim / איך מלמדים
 * Each section shows its books; each book expands to show sub-series.
 * Data comes from Supabase series with audience_tags = ['teachers'] only.
 */
function EzreiTab() {
  const { maagarRootIds } = useTeachersWing();
  const [activeSection, setActiveSection] = useState<string>(maagarRootIds.torah);
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());

  const SECTIONS = [
    { id: maagarRootIds.torah,       label: "תורה" },
    { id: maagarRootIds.neviim,      label: "נביאים" },
    { id: maagarRootIds.ketuvim,     label: "כתובים" },
    { id: maagarRootIds.howToTeach,  label: 'איך מלמדים תנ"ך' },
  ];

  const { data: books, isLoading } = useMaagarEzreiTree(activeSection);

  const toggleBook = (bookId: string) => {
    setExpandedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  };

  return (
    <div dir="rtl">
      {/* Section switcher pills */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        {SECTIONS.map((s) => {
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => { setActiveSection(s.id); setExpandedBooks(new Set()); }}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: radii.pill,
                border: `1.5px solid ${isActive ? colors.oliveDark : "rgba(139,111,71,0.2)"}`,
                background: isActive ? colors.oliveDark : "white",
                color: isActive ? "white" : colors.textMid,
                fontFamily: fonts.body,
                fontWeight: isActive ? 700 : 500,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.18s",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <Loader2 style={{ width: 28, height: 28, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
        </div>
      ) : !books || books.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", fontFamily: fonts.body, color: colors.textMuted }}>
          אין תכנים בקטגוריה זו
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {books.map((book) => {
            const isExpanded = expandedBooks.has(book.id);
            const subCount = book.subSeries.length;
            return (
              <div
                key={book.id}
                style={{
                  background: "white",
                  borderRadius: radii.xl,
                  border: "1px solid rgba(139,111,71,0.1)",
                  boxShadow: shadows.cardSoft,
                  overflow: "hidden",
                }}
              >
                {/* Book header */}
                <button
                  onClick={() => toggleBook(book.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem 1.25rem",
                    background: isExpanded ? colors.parchmentDark : "white",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: fonts.display,
                    fontWeight: 800,
                    fontSize: "1rem",
                    color: colors.oliveDark,
                    textAlign: "right",
                    transition: "background 0.15s",
                  }}
                >
                  <span>{book.title}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {subCount > 0 && (
                      <span style={{
                        fontFamily: fonts.body,
                        fontSize: "0.7rem",
                        color: colors.textSubtle,
                        background: colors.parchmentDeep,
                        padding: "0.2rem 0.6rem",
                        borderRadius: radii.pill,
                      }}>
                        {subCount} סדרות
                      </span>
                    )}
                    {isExpanded
                      ? <ChevronUp style={{ width: 16, height: 16 }} />
                      : <ChevronDown style={{ width: 16, height: 16 }} />
                    }
                  </div>
                </button>

                {/* Sub-series list */}
                {isExpanded && subCount > 0 && (
                  <div style={{ borderTop: "1px solid rgba(139,111,71,0.08)" }}>
                    {book.subSeries.map((sub, i) => (
                      <Link
                        key={sub.id}
                        to={`/design-teachers-series/${sub.id}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.75rem 1.5rem",
                            borderBottom: i < subCount - 1 ? "1px solid rgba(139,111,71,0.06)" : "none",
                            background: "white",
                            cursor: "pointer",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = colors.parchment; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: colors.goldDark,
                              flexShrink: 0,
                            }} />
                            <span style={{
                              fontFamily: fonts.body,
                              fontWeight: 600,
                              fontSize: "0.88rem",
                              color: colors.textDark,
                            }}>
                              {sub.title}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{
                              fontFamily: fonts.body,
                              fontSize: "0.7rem",
                              color: colors.textSubtle,
                              background: colors.parchmentDeep,
                              padding: "0.15rem 0.5rem",
                              borderRadius: radii.pill,
                            }}>
                              {sub.lessonCount} שיעורים
                            </span>
                            <ExternalLink style={{ width: 12, height: 12, color: colors.textSubtle }} />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {isExpanded && subCount === 0 && (
                  <div style={{
                    padding: "1rem 1.5rem",
                    fontFamily: fonts.body,
                    fontSize: "0.82rem",
                    color: colors.textMuted,
                    borderTop: "1px solid rgba(139,111,71,0.08)",
                  }}>
                    לחץ לצפייה בתוכן הישיר
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── In-page tab navigation ────────────────────────────────────────────────
function InPageNav({
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
        gap: 0,
        background: "white",
        borderRadius: radii.xl,
        border: "1px solid rgba(139,111,71,0.12)",
        boxShadow: shadows.cardSoft,
        padding: "0.3rem",
        marginBottom: "2.5rem",
        width: "fit-content",
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
              gap: "0.5rem",
              padding: "0.65rem 1.5rem",
              borderRadius: radii.lg,
              border: "none",
              background: isActive ? gradients.oliveButton : "transparent",
              color: isActive ? "white" : colors.textMuted,
              fontFamily: fonts.body,
              fontSize: "0.9rem",
              fontWeight: isActive ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <Icon style={{ width: 16, height: 16 }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page root ─────────────────────────────────────────────────────────────
export default function DesignPreviewTeachersWingV2() {
  const [activeTab, setActiveTab] = useState<TabId>("books");

  return (
    <DesignLayout>
      {/* Hero — olive variant as per design token spec */}
      <DesignPageHero
        variant="olive"
        eyebrow="אגף המורים"
        title='כלים ותכנים למחנכי תנ"ך'
        subtitle='כל הכלים שמחנך תנ"ך צריך — ספרים לפי חלק, חידות לשיעור, דפי עבודה, כלי עזר, ופדגוגיה מעשית. תוכן teacher-only — מסונן ומוכן.'
      />

      {/* Main content area */}
      <div
        style={{
          background: colors.parchment,
          minHeight: "60vh",
          padding: "3rem 1.5rem 5rem",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }} dir="rtl">
          {/* In-page tab navigation */}
          <InPageNav activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab panels */}
          {activeTab === "books"      && <BooksTab />}
          {activeTab === "riddles"    && <RiddlesTab />}
          {activeTab === "worksheets" && <WorksheetsTab />}
          {activeTab === "tools"      && <ToolsTab />}
          {activeTab === "howto"      && <HowToTab />}
          {activeTab === "ezrei"      && <EzreiTab />}
        </div>
      </div>
    </DesignLayout>
  );
}
