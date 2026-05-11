/**
 * TeachersWingPage — /teachers
 *
 * Production Teachers Wing main page.
 * 5 tabs approved by Saar (2026-05-11):
 *   ספרים       — Torah / Nevi'im / Ketuvim tree (series filtered by audience_tags)
 *   חידות        — "חידות לילדים - פרשת השבוע" series
 *   חומרי לימוד  — דפי עבודה + סיכומים + חוברות + ביאורי מילים + פשט + ביאור
 *   כלים ומדריכים — כלי עזר + מפות + מדריכים + ליווי ת"תים + שאלות
 *   איך מלמדים  — "איך מלמדים תנ"ך" + דגשים לפרשות
 *
 * Layout: TeachersLayout (DesignHeader + TeacherSidebar + DesignFooter)
 * Hero: olive variant (hardcoded per iron rule)
 * All series links → /teachers/series/:id (not /design-teachers-series/:id)
 */
import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  HelpCircle,
  FileText,
  Wrench,
  GraduationCap,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronLeft,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

import TeachersLayout from "@/components/teachers/TeachersLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useTeachersWing, type SeriesRow } from "@/hooks/useTeachersWing";

// ─── Types / constants ────────────────────────────────────────────────────────
type TabId = "books" | "riddles" | "worksheets" | "tools" | "howto";
type ViewMode = "grid" | "list";

const VIEW_KEY = "bnz.teachers.view";

const TABS: { id: TabId; label: string; icon: typeof BookOpen }[] = [
  { id: "books",      label: "ספרים",           icon: BookOpen },
  { id: "riddles",    label: "חידות",            icon: HelpCircle },
  { id: "worksheets", label: "חומרי לימוד",     icon: FileText },
  { id: "tools",      label: "כלים ומדריכים",   icon: Wrench },
  { id: "howto",      label: "איך מלמדים",      icon: GraduationCap },
];

// Stable series IDs
const IDS = {
  riddles:    "c852edd8-d959-4c8d-bf7e-17b5881275fa",
  howToStudy: "26e30725-d5d0-4d88-8f73-f7a279801241",
  tools:      "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7",
  livuyTatim: "7cbd261e-03b0-43da-a708-e8ae4402105f",
  maps:       "4d78557b-da8b-4b1f-8d8e-09d74ff3070a",
};

// ─── Shared data fetchers ─────────────────────────────────────────────────────

function useLessonsInSeries(seriesId: string) {
  return useQuery({
    queryKey: ["tw-prod-lessons", seriesId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, title, description, duration, audio_url, video_url, attachment_url, rabbi_id")
        .eq("series_id", seriesId)
        .eq("status", "published")
        .order("title")
        .limit(200);
      if (!data || data.length === 0) return [];
      const rabbiIds = [...new Set(data.filter((l) => l.rabbi_id).map((l) => l.rabbi_id!))];
      let rabbiMap = new Map<string, string>();
      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase
          .from("rabbis")
          .select("id, name")
          .in("id", rabbiIds);
        rabbiMap = new Map((rabbis || []).map((r) => [r.id, r.name]));
      }
      return data.map((l) => ({
        id:          l.id,
        title:       l.title,
        description: l.description,
        duration:    l.duration,
        audioUrl:    l.audio_url,
        videoUrl:    l.video_url,
        attachmentUrl: l.attachment_url,
        rabbiName:   l.rabbi_id ? rabbiMap.get(l.rabbi_id) || null : null,
      }));
    },
    staleTime: 1000 * 60 * 10,
  });
}

function useTeacherSeriesByKeyword(keyword: string) {
  return useQuery({
    queryKey: ["tw-prod-kw", keyword],
    queryFn: async () => {
      const { data } = await supabase
        .from("series")
        .select("id, title, lesson_count, rabbi_id, description")
        .contains("audience_tags", ["teachers"])
        .ilike("title", `%${keyword}%`)
        .order("title")
        .limit(100);
      if (!data || data.length === 0) return [];
      const rabbiIds = [...new Set(data.filter((s) => s.rabbi_id).map((s) => s.rabbi_id!))];
      let rabbiMap = new Map<string, string>();
      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase
          .from("rabbis")
          .select("id, name")
          .in("id", rabbiIds);
        rabbiMap = new Map((rabbis || []).map((r) => [r.id, r.name]));
      }
      return data.map((s) => ({
        id:          s.id,
        title:       s.title,
        lessonCount: s.lesson_count,
        rabbiName:   s.rabbi_id ? rabbiMap.get(s.rabbi_id) || null : null,
        description: s.description,
        sourceType:  null,
      })) as SeriesRow[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

function useToolsSeries() {
  return useQuery({
    queryKey: ["tw-prod-tools"],
    queryFn: async () => {
      const toolIds = [IDS.tools, IDS.livuyTatim, IDS.maps];
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
      const rabbiIds = [...new Set(all.filter((s) => s.rabbi_id).map((s) => s.rabbi_id!))];
      let rabbiMap = new Map<string, string>();
      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase
          .from("rabbis")
          .select("id, name")
          .in("id", rabbiIds);
        rabbiMap = new Map((rabbis || []).map((r) => [r.id, r.name]));
      }
      return all.map((s) => ({
        id:          s.id,
        title:       s.title,
        lessonCount: s.lesson_count,
        rabbiName:   s.rabbi_id ? rabbiMap.get(s.rabbi_id) || null : null,
        description: s.description,
        sourceType:  null,
      })) as SeriesRow[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ─── ViewToggle ───────────────────────────────────────────────────────────────
function ViewToggle({ viewMode, onChange }: { viewMode: ViewMode; onChange: (v: ViewMode) => void }) {
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
        const active = viewMode === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            title={v === "grid" ? "תצוגת כרטיסים" : "תצוגת רשימה"}
            style={{
              width: 36,
              height: 32,
              border: "none",
              background: active ? colors.goldDark : "transparent",
              color: active ? "white" : colors.textMuted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {v === "grid" ? <LayoutGrid size={15} /> : <List size={15} />}
          </button>
        );
      })}
    </div>
  );
}

// ─── SeriesCard ───────────────────────────────────────────────────────────────
function SeriesCard({ series }: { series: SeriesRow }) {
  return (
    <Link to={`/teachers/series/${series.id}`} style={{ textDecoration: "none", color: "inherit" }}>
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
        {/* Olive accent stripe (RTL = right) */}
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 4, background: gradients.oliveButton }} />

        {/* Badge */}
        <span style={{ fontFamily: fonts.body, fontSize: "0.6rem", color: colors.oliveDark, background: "rgba(74,90,46,0.1)", padding: "0.1rem 0.5rem", borderRadius: radii.pill, fontWeight: 700, alignSelf: "flex-start" }}>
          אגף המורים
        </span>

        {/* Title */}
        <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "0.95rem", color: colors.textDark, margin: 0, lineHeight: 1.4, paddingInlineEnd: "0.5rem" }}>
          {series.title}
        </h3>

        {/* Rabbi */}
        {series.rabbiName && (
          <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.goldDark, fontWeight: 700 }}>
            {series.rabbiName}
          </div>
        )}

        {/* Description */}
        {series.description && (
          <p style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textMuted, margin: 0, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
            {series.description}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.65rem", borderTop: "1px solid rgba(139,111,71,0.08)", marginTop: "auto" }}>
          <span style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textSubtle }}>{series.lessonCount} שיעורים</span>
          <span style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.oliveMain, fontWeight: 600 }}>לסדרה ←</span>
        </div>
      </div>
    </Link>
  );
}

// ─── SeriesListRow ─────────────────────────────────────────────────────────────
function SeriesListRow({ series }: { series: SeriesRow }) {
  return (
    <Link to={`/teachers/series/${series.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.85rem 1rem", borderRadius: radii.lg, background: "white", border: "1px solid rgba(139,111,71,0.08)", cursor: "pointer", transition: "all 0.18s ease" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.goldDark; e.currentTarget.style.boxShadow = shadows.cardSoft; e.currentTarget.style.background = colors.parchmentDark; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(139,111,71,0.08)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "white"; }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: gradients.oliveButton, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.88rem", color: colors.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{series.title}</div>
          {series.rabbiName && <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.goldDark, fontWeight: 600, marginTop: "0.15rem" }}>{series.rabbiName}</div>}
        </div>
        <span style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.textMuted, background: colors.parchmentDeep, padding: "0.2rem 0.6rem", borderRadius: radii.pill, flexShrink: 0 }}>
          {series.lessonCount} שיעורים
        </span>
        <ExternalLink size={13} style={{ color: colors.textSubtle, flexShrink: 0 }} />
      </div>
    </Link>
  );
}

// ─── LessonRow (for riddles / howto tabs) ─────────────────────────────────────
function LessonItemRow({ lesson }: { lesson: { id: string; title: string; duration: number | null; audioUrl: string | null; videoUrl: string | null; rabbiName: string | null } }) {
  return (
    <Link to={`/teachers/lesson/${lesson.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.7rem 1rem", borderRadius: radii.md, background: "white", border: "1px solid rgba(139,111,71,0.07)", cursor: "pointer", transition: "all 0.15s" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.oliveMain; e.currentTarget.style.background = colors.parchmentDark; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(139,111,71,0.07)"; e.currentTarget.style.background = "white"; }}
      >
        {/* Media type dot */}
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: lesson.videoUrl ? colors.oliveMain : lesson.audioUrl ? colors.goldDark : colors.textSubtle, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lesson.title}</div>
          {lesson.rabbiName && <div style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.goldDark }}>{lesson.rabbiName}</div>}
        </div>
        {lesson.duration && (
          <span style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.textSubtle, flexShrink: 0 }}>
            {Math.round(lesson.duration / 60)}′
          </span>
        )}
        <span style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.oliveMain, fontWeight: 600, flexShrink: 0 }}>פרטים ←</span>
      </div>
    </Link>
  );
}

// ─── SeriesGrid helper ────────────────────────────────────────────────────────
function SeriesGrid({ series, viewMode }: { series: SeriesRow[]; viewMode: ViewMode }) {
  if (series.length === 0) {
    return <div style={{ color: colors.textSubtle, fontFamily: fonts.body, fontSize: "0.85rem", padding: "2rem 0", textAlign: "center" }}>לא נמצאו סדרות</div>;
  }
  if (viewMode === "grid") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.25rem" }}>
        {series.map((s) => <SeriesCard key={s.id} series={s} />)}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {series.map((s) => <SeriesListRow key={s.id} series={s} />)}
    </div>
  );
}

// ─── BooksTab ─────────────────────────────────────────────────────────────────
function BooksTab({ viewMode, onViewChange }: { viewMode: ViewMode; onViewChange: (v: ViewMode) => void }) {
  const { categories, useSeriesForNode, isLoading } = useTeachersWing();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["torah"]));

  const seriesQ = useSeriesForNode(selectedNodeId);
  const toggle = (id: string) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (isLoading) return <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><Loader2 size={28} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} /></div>;

  return (
    <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "2rem", alignItems: "start" }}>
      {/* Book tree */}
      <nav style={{ background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.1)", boxShadow: shadows.cardSoft, overflow: "hidden", position: "sticky", top: "6rem" }}>
        {categories.map((cat) => {
          const open = expanded.has(cat.id);
          return (
            <div key={cat.id}>
              <button onClick={() => toggle(cat.id)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1rem", background: colors.parchmentDark, border: "none", borderBottom: "1px solid rgba(139,111,71,0.1)", cursor: "pointer", fontFamily: fonts.display, fontWeight: 800, fontSize: "0.9rem", color: colors.oliveDark, textAlign: "right" }}>
                {cat.title}
                {open ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
              </button>
              {open && (
                <div>
                  {cat.books.map((book) => {
                    const isSelected = selectedNodeId === book.id;
                    return (
                      <div key={book.id}>
                        <button
                          onClick={() => { setSelectedNodeId(book.id); setSelectedTitle(book.title); }}
                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 1.2rem", background: isSelected ? "rgba(139,111,71,0.08)" : "transparent", border: "none", borderBottom: "1px solid rgba(139,111,71,0.06)", cursor: "pointer", fontFamily: fonts.body, fontSize: "0.82rem", color: isSelected ? colors.oliveDark : colors.textMid, textAlign: "right", borderInlineStart: isSelected ? `3px solid ${colors.goldDark}` : "3px solid transparent" }}
                        >
                          {book.title}
                        </button>
                        {book.children.length > 0 && isSelected &&
                          book.children.map((child) => (
                            <button key={child.id} onClick={() => { setSelectedNodeId(child.id); setSelectedTitle(child.title); }} style={{ width: "100%", display: "flex", padding: "0.5rem 1.5rem", background: selectedNodeId === child.id ? "rgba(139,111,71,0.12)" : "transparent", border: "none", cursor: "pointer", fontFamily: fonts.body, fontSize: "0.76rem", color: selectedNodeId === child.id ? colors.oliveDark : colors.textMuted, textAlign: "right" }}>
                              {child.title}
                            </button>
                          ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Series panel */}
      <div>
        {!selectedNodeId ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", color: colors.textSubtle, fontFamily: fonts.body }}>
            <BookOpen size={48} style={{ color: colors.goldDark, marginBottom: "1rem", opacity: 0.5 }} />
            <p>בחר ספר מהתפריט כדי לראות את הסדרות</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h2 style={{ fontFamily: fonts.display, fontSize: "1.15rem", color: colors.oliveDark, margin: 0 }}>{selectedTitle}</h2>
              <ViewToggle viewMode={viewMode} onChange={onViewChange} />
            </div>
            {seriesQ.isLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}><Loader2 size={24} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} /></div>
            ) : (
              <SeriesGrid series={seriesQ.data || []} viewMode={viewMode} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── RiddlesTab ───────────────────────────────────────────────────────────────
function RiddlesTab() {
  const q = useLessonsInSeries(IDS.riddles);
  if (q.isLoading) return <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}><Loader2 size={24} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} /></div>;
  return (
    <div>
      <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, marginBottom: "1.25rem" }}>
        חידות לילדים לפרשת השבוע — {q.data?.length || 0} שיעורים
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {(q.data || []).map((l) => <LessonItemRow key={l.id} lesson={l} />)}
      </div>
    </div>
  );
}

// ─── WorksheetsTab ───────────────────────────────────────────────────────────
function WorksheetsTab({ viewMode, onViewChange }: { viewMode: ViewMode; onViewChange: (v: ViewMode) => void }) {
  const keywords = ["דף עבודה", "סיכום", "חוברת", "ביאורי מילים", "פשט", "ביאור"];
  const queries = keywords.map((kw) => useTeacherSeriesByKeyword(kw));
  const isLoading = queries.some((q) => q.isLoading);

  const combined = Object.values(
    queries.reduce((acc, q) => {
      for (const s of q.data || []) { acc[s.id] = s; }
      return acc;
    }, {} as Record<string, SeriesRow>)
  ).sort((a, b) => b.lessonCount - a.lessonCount);

  if (isLoading) return <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}><Loader2 size={24} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} /></div>;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, margin: 0 }}>{combined.length} סדרות — דפי עבודה, סיכומים, חוברות, ביאורי מילים ועוד</p>
        <ViewToggle viewMode={viewMode} onChange={onViewChange} />
      </div>
      <SeriesGrid series={combined} viewMode={viewMode} />
    </div>
  );
}

// ─── ToolsTab ─────────────────────────────────────────────────────────────────
function ToolsTab({ viewMode, onViewChange }: { viewMode: ViewMode; onViewChange: (v: ViewMode) => void }) {
  const q = useToolsSeries();
  if (q.isLoading) return <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}><Loader2 size={24} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} /></div>;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, margin: 0 }}>כלי עזר, מפות, מדריכים, ליווי ת"תים ועוד — {q.data?.length || 0} סדרות</p>
        <ViewToggle viewMode={viewMode} onChange={onViewChange} />
      </div>
      <SeriesGrid series={q.data || []} viewMode={viewMode} />
    </div>
  );
}

// ─── HowToTab ────────────────────────────────────────────────────────────────
function HowToTab() {
  const q = useLessonsInSeries(IDS.howToStudy);
  if (q.isLoading) return <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}><Loader2 size={24} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} /></div>;
  return (
    <div>
      <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, marginBottom: "1.25rem" }}>
        {q.data?.length || 0} שיעורים על מתודולוגיה של הוראת תנ"ך
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {(q.data || []).map((l) => <LessonItemRow key={l.id} lesson={l} />)}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeachersWingPage() {
  useSEO({
    title: 'אגף המורים — כלים ותכנים למחנכי תנ"ך',
    description: 'מאגר תכנים מקצועי למורים ומחנכי תנ"ך: דפי עבודה, חידות, כלי עזר, מדריכים ועוד',
    url: "https://bneyzion.co.il/teachers",
  });

  const [activeTab, setActiveTab] = useState<TabId>("books");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(VIEW_KEY) as ViewMode) || "grid"; }
    catch { return "grid"; }
  });

  const handleViewChange = useCallback((v: ViewMode) => {
    setViewMode(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* blocked */ }
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case "books":      return <BooksTab viewMode={viewMode} onViewChange={handleViewChange} />;
      case "riddles":    return <RiddlesTab />;
      case "worksheets": return <WorksheetsTab viewMode={viewMode} onViewChange={handleViewChange} />;
      case "tools":      return <ToolsTab viewMode={viewMode} onViewChange={handleViewChange} />;
      case "howto":      return <HowToTab />;
    }
  };

  return (
    <TeachersLayout>
        {/* Hero */}
        <DesignPageHero
          variant="olive"
          eyebrow="אגף המורים"
          title='כלים ותכנים למחנכי תנ"ך'
          subtitle='מאגר תכנים מקצועי למורים: דפי עבודה, חידות, כלי עזר, מדריכים והוראות לכיתות א׳–י״ב'
          icon={<GraduationCap size={28} style={{ color: "#E8D5A0" }} />}
        />

        {/* Tab navigation */}
        <div
          dir="rtl"
          style={{
            background: "white",
            borderBottom: `1px solid rgba(139,111,71,0.12)`,
            position: "sticky",
            top: 96,
            zIndex: 20,
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "0 1.5rem",
              display: "flex",
              gap: "0.25rem",
              overflowX: "auto",
            }}
          >
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.9rem 1.1rem",
                    background: "none",
                    border: "none",
                    borderBottom: active ? `2.5px solid ${colors.oliveDark}` : "2.5px solid transparent",
                    cursor: "pointer",
                    fontFamily: fonts.body,
                    fontSize: "0.85rem",
                    fontWeight: active ? 700 : 400,
                    color: active ? colors.oliveDark : colors.textMuted,
                    whiteSpace: "nowrap",
                    transition: "all 0.15s",
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div
          dir="rtl"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "2rem 1.5rem 3rem",
          }}
        >
          {renderTab()}
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </TeachersLayout>
  );
}
