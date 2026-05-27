/**
 * TeachersWingPage — /teachers
 *
 * Production Teachers Wing main page.
 *
 * Layout: TeachersLayout (DesignHeader + TeacherSidebar + DesignFooter)
 * Sidebar: 3 tabs — ראשי / סוג תוכן / יוצרים (per Saar feedback 2026-05-27)
 *
 * Content area responds to sidebar selection:
 *   book selected       → series grid for that book/section
 *   content_type        → lesson list for that content type
 *   creator             → lesson list for that creator
 *   nothing selected    → welcome state
 *
 * Lesson click → popup modal (stays in Teachers Wing context)
 * "לדף המלא" → /teachers/lesson/:id (URL-shareable)
 *
 * Hero: slim banner at top, olive variant, "אגף המורים"
 */
import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ExternalLink,
  GraduationCap,
  Loader2,
  X,
  FileText,
  Tag,
  Users,
  LayoutGrid,
  List,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

import TeachersLayout from "@/components/teachers/TeachersLayout";
import { type TeacherSidebarSelection } from "@/components/teachers/TeacherSidebar";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useTeachersWing, type SeriesRow } from "@/hooks/useTeachersWing";
import { SUPABASE_URL_RUNTIME } from "@/integrations/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────
type ViewMode = "grid" | "list";
const VIEW_KEY = "bnz.teachers.view";

// ─── Helper: anon key ───────────────────────────────────────────────────────
function getAnonKey(): string {
  return atob("ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CNmRtMTNabVY0WldseWRXVnNkMmwxYW5odUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpVMU5UTTFOelVzSW1WNGNDSTZNakE1TVRFeU9UVTNOWDAuVTVhZ0xrZjZqZkxVZzdVamZkblRKZmF2VXN4LWR5enhzMmZ4SmdXQXA0bw==");
}

// ─── Hook: series for a selected node ────────────────────────────────────────
function useSeriesForBook(bookId: string | null) {
  const { useSeriesForNode } = useTeachersWing();
  return useSeriesForNode(bookId);
}

// ─── Hook: lessons for a content_type ────────────────────────────────────────
interface LessonBrief {
  id: string;
  title: string;
  content_type: string | null;
  attachment_url: string | null;
  audio_url: string | null;
  video_url: string | null;
  duration: number | null;
  rabbi_name: string | null;
}

function useLessonsForContentType(contentType: string | null) {
  return useQuery<LessonBrief[]>({
    queryKey: ["tw-lessons-by-ctype", contentType],
    enabled: !!contentType,
    queryFn: async () => {
      if (!contentType) return [];
      const anonKey = getAnonKey();
      const encodedType = encodeURIComponent(contentType);
      const url = `${SUPABASE_URL_RUNTIME}/rest/v1/lessons?select=id,title,content_type,attachment_url,audio_url,video_url,duration,rabbi_id&audience_tags=cs.%7Bteachers%7D&status=eq.published&content_type=eq.${encodedType}&order=title.asc&limit=100`;
      const resp = await fetch(url, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      });
      if (!resp.ok) return [];
      const rows: Array<{
        id: string; title: string; content_type: string | null;
        attachment_url: string | null; audio_url: string | null;
        video_url: string | null; duration: number | null; rabbi_id: string | null;
      }> = await resp.json();
      const rabbiIds = [...new Set(rows.filter(r => r.rabbi_id).map(r => r.rabbi_id!))];
      let rabbiMap = new Map<string, string>();
      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase.from("rabbis").select("id, name").in("id", rabbiIds);
        rabbiMap = new Map((rabbis || []).map(r => [r.id, r.name]));
      }
      return rows.map(r => ({
        id: r.id,
        title: r.title,
        content_type: r.content_type,
        attachment_url: r.attachment_url,
        audio_url: r.audio_url,
        video_url: r.video_url,
        duration: r.duration,
        rabbi_name: r.rabbi_id ? rabbiMap.get(r.rabbi_id) || null : null,
      }));
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Hook: lessons for a creator ─────────────────────────────────────────────
function useLessonsForCreator(creatorId: string | null) {
  return useQuery<LessonBrief[]>({
    queryKey: ["tw-lessons-by-creator", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      if (!creatorId) return [];
      const anonKey = getAnonKey();
      const url = `${SUPABASE_URL_RUNTIME}/rest/v1/lessons?select=id,title,content_type,attachment_url,audio_url,video_url,duration,rabbi_id&audience_tags=cs.%7Bteachers%7D&status=eq.published&rabbi_id=eq.${creatorId}&order=title.asc&limit=100`;
      const resp = await fetch(url, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      });
      if (!resp.ok) return [];
      const rows: Array<{
        id: string; title: string; content_type: string | null;
        attachment_url: string | null; audio_url: string | null;
        video_url: string | null; duration: number | null; rabbi_id: string | null;
      }> = await resp.json();
      return rows.map(r => ({
        id: r.id,
        title: r.title,
        content_type: r.content_type,
        attachment_url: r.attachment_url,
        audio_url: r.audio_url,
        video_url: r.video_url,
        duration: r.duration,
        rabbi_name: null,
      }));
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Hook: lesson detail (for popup) ─────────────────────────────────────────
interface LessonDetail {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  audio_url: string | null;
  video_url: string | null;
  attachment_url: string | null;
  rabbi_name: string | null;
}

function useLessonDetail(lessonId: string | null) {
  return useQuery<LessonDetail | null>({
    queryKey: ["tw-lesson-detail", lessonId],
    enabled: !!lessonId,
    queryFn: async () => {
      if (!lessonId) return null;
      const { data } = await supabase
        .from("lessons")
        .select("id, title, description, duration, audio_url, video_url, attachment_url, rabbi_id")
        .eq("id", lessonId)
        .single();
      if (!data) return null;
      let rabbiName: string | null = null;
      if (data.rabbi_id) {
        const { data: rabbi } = await supabase.from("rabbis").select("name").eq("id", data.rabbi_id).single();
        rabbiName = rabbi?.name || null;
      }
      return {
        id: data.id,
        title: data.title,
        description: data.description,
        duration: data.duration,
        audio_url: data.audio_url,
        video_url: data.video_url,
        attachment_url: data.attachment_url,
        rabbi_name: rabbiName,
      };
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ─── ViewToggle ──────────────────────────────────────────────────────────────
function ViewToggle({ viewMode, onChange }: { viewMode: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div style={{ display: "flex", border: `1.5px solid rgba(139,111,71,0.2)`, borderRadius: radii.md, overflow: "hidden" }}>
      {(["grid", "list"] as ViewMode[]).map((v) => {
        const active = viewMode === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            title={v === "grid" ? "תצוגת כרטיסים" : "תצוגת רשימה"}
            style={{
              width: 36, height: 32, border: "none",
              background: active ? colors.goldDark : "transparent",
              color: active ? "white" : colors.textMuted,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
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
          background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.1)",
          boxShadow: shadows.cardSoft, padding: "1.25rem 1.25rem 1rem", cursor: "pointer",
          transition: "all 0.22s ease", position: "relative", overflow: "hidden",
          height: "100%", display: "flex", flexDirection: "column", gap: "0.5rem",
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
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 4, background: gradients.oliveButton }} />
        <span style={{ fontFamily: fonts.body, fontSize: "0.6rem", color: colors.oliveDark, background: "rgba(74,90,46,0.1)", padding: "0.1rem 0.5rem", borderRadius: radii.pill, fontWeight: 700, alignSelf: "flex-start" }}>
          אגף המורים
        </span>
        <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "0.95rem", color: colors.textDark, margin: 0, lineHeight: 1.4, paddingInlineEnd: "0.5rem" }}>
          {series.title}
        </h3>
        {series.rabbiName && (
          <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.goldDark, fontWeight: 700 }}>
            {series.rabbiName}
          </div>
        )}
        {series.description && (
          <p style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textMuted, margin: 0, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
            {series.description}
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.65rem", borderTop: "1px solid rgba(139,111,71,0.08)", marginTop: "auto" }}>
          <span style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textSubtle }}>{series.lessonCount} שיעורים</span>
          <span style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.oliveMain, fontWeight: 600 }}>לסדרה ←</span>
        </div>
      </div>
    </Link>
  );
}

// ─── SeriesListRow ────────────────────────────────────────────────────────────
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

// ─── LessonRow ────────────────────────────────────────────────────────────────
function LessonRow({ lesson, onOpen }: { lesson: LessonBrief; onOpen: (id: string) => void }) {
  return (
    <div
      onClick={() => onOpen(lesson.id)}
      style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 1rem", borderRadius: radii.lg, background: "white", border: "1px solid rgba(139,111,71,0.07)", cursor: "pointer", transition: "all 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.oliveMain; e.currentTarget.style.background = colors.parchmentDark; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(139,111,71,0.07)"; e.currentTarget.style.background = "white"; }}
    >
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: lesson.video_url ? colors.oliveMain : lesson.audio_url ? colors.goldDark : colors.textSubtle, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lesson.title}</div>
        {lesson.content_type && <div style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.oliveDark, marginTop: "0.1rem" }}>{lesson.content_type}</div>}
      </div>
      {lesson.duration && (
        <span style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.textSubtle, flexShrink: 0 }}>
          {Math.round(lesson.duration / 60)}′
        </span>
      )}
      {lesson.attachment_url && (
        <span style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.goldDark, background: "rgba(139,111,71,0.08)", padding: "0.1rem 0.4rem", borderRadius: radii.pill, flexShrink: 0 }}>
          קובץ
        </span>
      )}
      <span style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.oliveMain, fontWeight: 600, flexShrink: 0 }}>פרטים ←</span>
    </div>
  );
}

// ─── LessonPopup ──────────────────────────────────────────────────────────────
function LessonPopup({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const { data: lesson, isLoading } = useLessonDetail(lessonId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(45,31,14,0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 80,
        }}
      />
      <div
        dir="rtl"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(640px, 92vw)",
          maxHeight: "85vh",
          overflowY: "auto",
          background: colors.parchment,
          borderRadius: radii.xl,
          boxShadow: shadows.card,
          zIndex: 90,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{
          background: `linear-gradient(135deg, ${colors.oliveDark}, ${colors.oliveMain})`,
          padding: "1.25rem 1.5rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderRadius: `${radii.xl} ${radii.xl} 0 0`,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <GraduationCap size={18} style={{ color: "#E8D5A0" }} />
            <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.85rem", color: "#E8D5A0" }}>
              אגף המורים
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(232,213,160,0.8)", padding: "0.25rem", lineHeight: 0 }}
            aria-label="סגור"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.5rem", flex: 1 }}>
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
              <Loader2 size={28} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
            </div>
          ) : !lesson ? (
            <div style={{ fontFamily: fonts.body, color: colors.textMuted, textAlign: "center", padding: "2rem" }}>
              לא נמצא שיעור
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.3rem", color: colors.textDark, margin: "0 0 0.5rem" }}>
                {lesson.title}
              </h2>
              {lesson.rabbi_name && (
                <div style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.goldDark, fontWeight: 700, marginBottom: "1rem" }}>
                  {lesson.rabbi_name}
                </div>
              )}
              {lesson.description && (
                <p style={{ fontFamily: fonts.body, fontSize: "0.9rem", color: colors.textMid, lineHeight: 1.65, marginBottom: "1.25rem" }}>
                  {lesson.description}
                </p>
              )}
              {lesson.audio_url && (
                <div style={{ marginBottom: "1rem" }}>
                  <audio controls src={lesson.audio_url} style={{ width: "100%", borderRadius: radii.md }} />
                </div>
              )}
              {lesson.attachment_url && (
                <a
                  href={lesson.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.2rem", background: colors.goldDark, color: "white", borderRadius: radii.lg, fontFamily: fonts.body, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", marginBottom: "1rem" }}
                >
                  <FileText size={15} />
                  הורד קובץ
                </a>
              )}
              {lesson.duration && (
                <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textSubtle, marginBottom: "1rem" }}>
                  משך: {Math.round(lesson.duration / 60)} דקות
                </div>
              )}
              <div style={{ borderTop: `1px solid rgba(139,111,71,0.12)`, paddingTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                <Link
                  to={`/teachers/lesson/${lesson.id}`}
                  onClick={onClose}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontFamily: fonts.body, fontSize: "0.82rem", color: colors.oliveDark, fontWeight: 700, textDecoration: "none" }}
                >
                  <ExternalLink size={14} />
                  לדף המלא
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Content area components ──────────────────────────────────────────────────

function BookContentArea({ bookId, bookTitle }: { bookId: string; bookTitle: string }) {
  const { data: series, isLoading } = useSeriesForBook(bookId);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(VIEW_KEY) as ViewMode) || "grid"; } catch { return "grid"; }
  });
  const handleViewChange = (v: ViewMode) => {
    setViewMode(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* blocked */ }
  };
  if (isLoading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
      <Loader2 size={28} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
    </div>
  );
  const items = series || [];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: colors.oliveDark, margin: 0 }}>{bookTitle}</h2>
          <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textSubtle, marginTop: "0.2rem" }}>{items.length} סדרות</div>
        </div>
        <ViewToggle viewMode={viewMode} onChange={handleViewChange} />
      </div>
      {items.length === 0 ? (
        <div style={{ padding: "2.5rem", background: "white", borderRadius: radii.xl, border: "1px dashed rgba(139,111,71,0.2)", fontFamily: fonts.body, color: colors.textMuted, textAlign: "center" }}>
          אין סדרות זמינות לספר זה
        </div>
      ) : viewMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.25rem" }}>
          {items.map((s) => <SeriesCard key={s.id} series={s} />)}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {items.map((s) => <SeriesListRow key={s.id} series={s} />)}
        </div>
      )}
    </div>
  );
}

function ContentTypeArea({ contentType, onLessonOpen }: { contentType: string; onLessonOpen: (id: string) => void }) {
  const { data: lessons, isLoading } = useLessonsForContentType(contentType);
  if (isLoading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
      <Loader2 size={28} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
    </div>
  );
  const items = lessons || [];
  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Tag size={18} style={{ color: colors.oliveDark }} />
          <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: colors.textDark, margin: 0 }}>{contentType}</h2>
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textSubtle, marginTop: "0.25rem" }}>{items.length} שיעורים{items.length === 100 ? "+" : ""}</div>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: "2.5rem", background: "white", borderRadius: radii.xl, border: "1px dashed rgba(139,111,71,0.2)", fontFamily: fonts.body, color: colors.textMuted, textAlign: "center" }}>
          אין שיעורים בסוג תוכן זה
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {items.map((l) => <LessonRow key={l.id} lesson={l} onOpen={onLessonOpen} />)}
        </div>
      )}
    </div>
  );
}

function CreatorArea({ creatorId, creatorName, onLessonOpen }: { creatorId: string; creatorName: string; onLessonOpen: (id: string) => void }) {
  const { data: lessons, isLoading } = useLessonsForCreator(creatorId);
  if (isLoading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
      <Loader2 size={28} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
    </div>
  );
  const items = lessons || [];
  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Users size={18} style={{ color: colors.goldDark }} />
          <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: colors.textDark, margin: 0 }}>{creatorName}</h2>
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textSubtle, marginTop: "0.25rem" }}>{items.length} שיעורים{items.length === 100 ? "+" : ""}</div>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: "2.5rem", background: "white", borderRadius: radii.xl, border: "1px dashed rgba(139,111,71,0.2)", fontFamily: fonts.body, color: colors.textMuted, textAlign: "center" }}>
          אין שיעורים ליוצר זה
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {items.map((l) => <LessonRow key={l.id} lesson={l} onOpen={onLessonOpen} />)}
        </div>
      )}
    </div>
  );
}

function WelcomeState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 2rem", background: "white", borderRadius: radii.xl, border: "1px dashed rgba(74,90,46,0.2)", gap: "1rem", textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${colors.oliveDark}, ${colors.oliveMain})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: shadows.cardSoft }}>
        <GraduationCap size={32} style={{ color: "#E8D5A0" }} />
      </div>
      <div style={{ fontFamily: fonts.display, fontSize: "1.2rem", fontWeight: 800, color: colors.textDark }}>
        ברוך הבא לאגף המורים
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.9rem", color: colors.textMuted, maxWidth: 380, lineHeight: 1.7 }}>
        בחר ספר מהתפריט לפי עץ התנ"ך, סנן לפי סוג תוכן, או עיין לפי יוצר
      </div>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
        {[
          { icon: <BookOpen size={14} />, label: "ראשי — עץ הספרים" },
          { icon: <Tag size={14} />,      label: "סוג תוכן — לפי קטגוריה" },
          { icon: <Users size={14} />,    label: "יוצרים — לפי מחבר" },
        ].map(({ icon, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.9rem", background: colors.parchmentDark, borderRadius: radii.pill, fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted }}>
            <span style={{ color: colors.oliveDark }}>{icon}</span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TeachersWingPage() {
  useSEO({
    title: 'אגף המורים — כלים ותכנים למחנכי תנ"ך',
    description: 'מאגר תכנים מקצועי למורים ומחנכי תנ"ך: דפי עבודה, חידות, כלי עזר, מדריכים ועוד',
    url: "https://bneyzion.co.il/teachers",
  });

  const [selection, setSelection] = useState<TeacherSidebarSelection | null>(null);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  const handleSidebarSelect = useCallback((sel: TeacherSidebarSelection) => {
    setSelection(sel);
    setOpenLessonId(null);
  }, []);

  const handleLessonOpen  = useCallback((id: string) => setOpenLessonId(id), []);
  const handleLessonClose = useCallback(() => setOpenLessonId(null), []);

  const renderContent = () => {
    if (!selection)                      return <WelcomeState />;
    if (selection.type === "book")       return <BookContentArea bookId={selection.id} bookTitle={selection.label} />;
    if (selection.type === "content_type") return <ContentTypeArea contentType={selection.id} onLessonOpen={handleLessonOpen} />;
    if (selection.type === "creator")    return <CreatorArea creatorId={selection.id} creatorName={selection.label} onLessonOpen={handleLessonOpen} />;
    return <WelcomeState />;
  };

  return (
    <TeachersLayout
      onSidebarSelect={handleSidebarSelect}
      sidebarSelection={selection}
    >
      {/* Slim hero — olive, identifies Teachers Wing, ≤30vh */}
      <div
        dir="rtl"
        style={{
          background: `linear-gradient(135deg, ${colors.oliveDark} 0%, ${colors.oliveMain} 60%, rgba(91,110,58,0.85) 100%)`,
          padding: "1.5rem 2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")", opacity: 0.4, pointerEvents: "none" as const }} />
        <div style={{ position: "relative", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(232,213,160,0.15)", border: "1.5px solid rgba(232,213,160,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GraduationCap size={18} style={{ color: "#E8D5A0" }} />
            </div>
            <span style={{ fontFamily: fonts.body, fontSize: "0.72rem", fontWeight: 700, color: "rgba(232,213,160,0.8)", letterSpacing: "0.08em" }}>
              אגף המורים
            </span>
          </div>
          <h1 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)", color: "#FAF6F0", margin: "0 0 0.35rem", lineHeight: 1.25 }}>
            כלים ותכנים למחנכי תנ"ך
          </h1>
          <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: "rgba(250,246,240,0.75)", margin: 0, lineHeight: 1.5 }}>
            בחר מהתפריט לפי עץ הספרים, סוג תוכן, או יוצר
          </p>
        </div>
      </div>

      {/* Content area */}
      <div
        dir="rtl"
        style={{
          padding: "2rem 1.5rem 4rem",
          maxWidth: 900,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {renderContent()}
      </div>

      {/* Lesson popup */}
      {openLessonId && (
        <LessonPopup lessonId={openLessonId} onClose={handleLessonClose} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </TeachersLayout>
  );
}
