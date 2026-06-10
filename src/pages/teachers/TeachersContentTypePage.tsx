/**
 * TeachersContentTypePage — /teachers/content-type/:type
 *
 * Category page for all teacher lessons of a specific content_type.
 * Shows lessons grouped by series (where applicable) + standalone lessons.
 * Stays within the Teachers Wing layout/sidebar.
 *
 * Controls: grid/list toggle + media filter chips.
 *
 * Iron rules:
 *   - RTL logical CSS only
 *   - Olive color scheme
 *   - No mock data
 *   - No dedup / series_id=null filter
 */
import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  GraduationCap,
  Search,
  X,
  ChevronLeft,
  Headphones,
  Video,
  FileDown,
  LayoutGrid,
  List,
  Layers,
  Loader2,
} from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import TeachersLayout from "@/components/teachers/TeachersLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import TeacherLessonModal from "./TeacherLessonModal";
import {
  colors,
  fonts,
  gradients,
  radii,
  shadows,
  getSeriesCoverImage,
  formatDuration,
} from "@/lib/designTokens";
import {
  useTeacherContentTypeContent,
  type TeacherContentTypeLesson,
} from "@/hooks/useTeacherBookContent";

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = "grid" | "list";
type MediaFilter = "all" | "audio" | "video" | "pdf" | "text";

const VIEW_KEY = "bnz.teachers.ct.view";

function getLessonMediaType(l: TeacherContentTypeLesson): "audio" | "video" | "pdf" | "text" {
  if (l.videoUrl) return "video";
  if (l.audioUrl) return "audio";
  if (l.attachmentUrl) return "pdf";
  return "text";
}

// ─── ControlsBar ─────────────────────────────────────────────────────────────
function ControlsBar({
  viewMode,
  onViewChange,
  mediaFilter,
  onMediaFilterChange,
  search,
  onSearch,
  counts,
}: {
  viewMode: ViewMode;
  onViewChange: (v: ViewMode) => void;
  mediaFilter: MediaFilter;
  onMediaFilterChange: (f: MediaFilter) => void;
  search: string;
  onSearch: (v: string) => void;
  counts: Record<MediaFilter, number>;
}) {
  const chips: { key: MediaFilter; label: string }[] = [
    { key: "all",   label: `הכל (${counts.all})` },
    { key: "audio", label: `אודיו (${counts.audio})` },
    { key: "video", label: `וידאו (${counts.video})` },
    { key: "pdf",   label: `PDF (${counts.pdf})` },
    { key: "text",  label: `טקסט (${counts.text})` },
  ];

  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
          <Search
            size={14}
            style={{ position: "absolute", insetInlineEnd: "0.75rem", top: "50%", transform: "translateY(-50%)", color: colors.textSubtle, pointerEvents: "none" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="חיפוש בשיעורים..."
            style={{ width: "100%", height: 36, paddingInlineEnd: "2.2rem", paddingInlineStart: "0.75rem", borderRadius: radii.md, border: "1px solid rgba(139,111,71,0.2)", fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textDark, background: "white", outline: "none", direction: "rtl" }}
          />
          {search && (
            <button onClick={() => onSearch("")} style={{ position: "absolute", insetInlineStart: "0.5rem", top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: colors.textSubtle, padding: 0, display: "flex" }}>
              <X size={13} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", border: `1.5px solid rgba(139,111,71,0.2)`, borderRadius: radii.md, overflow: "hidden", flexShrink: 0 }}>
          {(["grid", "list"] as ViewMode[]).map((v) => {
            const active = viewMode === v;
            return (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                title={v === "grid" ? "תצוגת כרטיסים" : "תצוגת רשימה"}
                style={{ width: 36, height: 34, border: "none", background: active ? gradients.oliveButton : "transparent", color: active ? "white" : colors.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
              >
                {v === "grid" ? <LayoutGrid size={14} /> : <List size={14} />}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
        {chips.map(({ key, label }) => {
          if (key !== "all" && counts[key] === 0) return null;
          const isActive = mediaFilter === key;
          return (
            <button
              key={key}
              onClick={() => onMediaFilterChange(key)}
              style={{ padding: "0.28rem 0.8rem", borderRadius: radii.pill, border: `1.5px solid ${isActive ? colors.oliveDark : "rgba(139,111,71,0.2)"}`, background: isActive ? gradients.oliveButton : "transparent", color: isActive ? "white" : colors.textMuted, fontFamily: fonts.body, fontSize: "0.73rem", fontWeight: isActive ? 700 : 500, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── LessonCard (grid) ────────────────────────────────────────────────────────
function LessonCard({ lesson, onClick }: { lesson: TeacherContentTypeLesson; onClick: () => void }) {
  const imgSrc = lesson.thumbnailUrl || getSeriesCoverImage(lesson.seriesTitle || "") || "/images/series-default.png";
  return (
    <div
      onClick={onClick}
      style={{ background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.09)", boxShadow: shadows.cardSoft, cursor: "pointer", overflow: "hidden", display: "flex", flexDirection: "column", transition: "all 0.2s ease", position: "relative" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = shadows.cardHover; e.currentTarget.style.borderColor = colors.goldDark; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = shadows.cardSoft; e.currentTarget.style.borderColor = "rgba(139,111,71,0.09)"; }}
    >
      <div style={{ height: 110, overflow: "hidden", flexShrink: 0 }}>
        <img src={imgSrc} alt={lesson.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).src = "/images/series-default.png"; }} />
      </div>
      <div style={{ position: "absolute", top: 0, right: 0, width: 4, height: "100%", background: gradients.oliveButton }} />
      <div style={{ padding: "0.8rem", display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
        {lesson.seriesTitle && (
          <span style={{ fontFamily: fonts.body, fontSize: "0.58rem", color: colors.oliveDark, background: "rgba(74,90,46,0.1)", padding: "0.1rem 0.45rem", borderRadius: radii.pill, fontWeight: 700, alignSelf: "flex-start", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
            {lesson.seriesTitle}
          </span>
        )}
        <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "0.86rem", color: colors.textDark, margin: 0, lineHeight: 1.4 }}>
          {lesson.title}
        </h3>
        {lesson.rabbiName && (
          <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.goldDark, fontWeight: 700 }}>{lesson.rabbiName}</div>
        )}
        {lesson.description && (
          <p style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted, margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
            {lesson.description}
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.55rem", borderTop: "1px solid rgba(139,111,71,0.07)", marginTop: "auto" }}>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {lesson.videoUrl && <Video size={12} style={{ color: colors.oliveMain }} />}
            {lesson.audioUrl && <Headphones size={12} style={{ color: colors.goldDark }} />}
            {lesson.attachmentUrl && <FileDown size={12} style={{ color: colors.textSubtle }} />}
          </div>
          {lesson.duration && (
            <span style={{ fontFamily: fonts.body, fontSize: "0.66rem", color: colors.textSubtle }}>{formatDuration(lesson.duration)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LessonListRow ────────────────────────────────────────────────────────────
function LessonListRow({ lesson, onClick }: { lesson: TeacherContentTypeLesson; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 1rem", borderRadius: radii.lg, background: "white", border: "1px solid rgba(139,111,71,0.08)", cursor: "pointer", transition: "all 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.goldDark; e.currentTarget.style.background = colors.parchmentDark; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(139,111,71,0.08)"; e.currentTarget.style.background = "white"; }}
    >
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: lesson.videoUrl ? colors.oliveMain : lesson.audioUrl ? colors.goldDark : colors.textSubtle, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.86rem", color: colors.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lesson.title}</div>
        {lesson.rabbiName && <div style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.goldDark, marginTop: "0.15rem" }}>{lesson.rabbiName}</div>}
        {lesson.seriesTitle && <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textSubtle, marginTop: "0.1rem" }}>{lesson.seriesTitle}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
        {lesson.videoUrl && <Video size={13} style={{ color: colors.oliveMain }} />}
        {lesson.audioUrl && <Headphones size={13} style={{ color: colors.goldDark }} />}
        {lesson.attachmentUrl && <FileDown size={13} style={{ color: colors.textSubtle }} />}
        {lesson.duration && <span style={{ fontFamily: fonts.body, fontSize: "0.66rem", color: colors.textSubtle }}>{formatDuration(lesson.duration)}</span>}
        <span style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.oliveMain, fontWeight: 600 }}>פרטים ←</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeachersContentTypePage() {
  const { type = "" } = useParams<{ type: string }>();
  const decodedType = decodeURIComponent(type);

  const { lessons, isLoading } = useTeacherContentTypeContent(decodedType);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(VIEW_KEY) as ViewMode) || "grid"; } catch { return "grid"; }
  });
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [search, setSearch] = useState("");
  const [modalLessonId, setModalLessonId] = useState<string | null>(null);

  const handleViewChange = (v: ViewMode) => {
    setViewMode(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* blocked */ }
  };

  const filteredLessons = useMemo(() => {
    // Dedup: the migration cross-listed the same worksheet under many teachers, so a
    // content-type showed hundreds of identical cards (same title + same attached file).
    // Collapse by attachment file when present, else by normalized title. (Saar 10.6.2026)
    const seen = new Set<string>();
    let result = lessons.filter((l: any) => {
      const key = l.attachmentUrl
        ? `f:${l.attachmentUrl}`
        : `t:${(l.title || "").trim().replace(/[״"'׳`|]/g, "").replace(/\s+/g, " ")}::${l.rabbiName || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (search.trim()) {
      const q = search.trim();
      result = result.filter((l) => l.title.includes(q) || (l.description || "").includes(q));
    }
    if (mediaFilter !== "all") {
      result = result.filter((l) => getLessonMediaType(l) === mediaFilter);
    }
    return result;
  }, [lessons, search, mediaFilter]);

  const counts = useMemo((): Record<MediaFilter, number> => {
    const c: Record<MediaFilter, number> = { all: lessons.length, audio: 0, video: 0, pdf: 0, text: 0 };
    for (const l of lessons) c[getLessonMediaType(l)]++;
    return c;
  }, [lessons]);

  const modalLesson = modalLessonId ? lessons.find((l) => l.id === modalLessonId) || null : null;

  useSEO({
    title: `${decodedType} — אגף המורים`,
    description: `כל שיעורי ${decodedType} באגף המורים`,
    url: `https://bneyzion.co.il/teachers/content-type/${type}`,
  });

  return (
    <TeachersLayout>
      <DesignPageHero
        variant="olive"
        compact
        eyebrow={
          <span>
            <Link to="/teachers" style={{ color: "rgba(232,213,160,0.8)", textDecoration: "none" }}>אגף המורים</Link>
            {" / "}
          </span> as unknown as string
        }
        title={decodedType}
        subtitle={`${lessons.length} שיעורים באגף המורים`}
        icon={<GraduationCap size={24} style={{ color: "#E8D5A0" }} />}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
          <Link
            to="/teachers"
            style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(232,213,160,0.75)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.2rem" }}
          >
            <ChevronLeft size={12} style={{ transform: "rotate(180deg)" }} />
            אגף המורים
          </Link>
        </div>
      </DesignPageHero>

      <div dir="rtl" style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem 3rem" }}>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
            <Loader2 size={32} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
          </div>
        ) : lessons.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", color: colors.textSubtle, fontFamily: fonts.body }}>
            <Layers size={48} style={{ color: colors.goldDark, marginBottom: "1rem", opacity: 0.4 }} />
            <p>לא נמצא תוכן מסוג "{decodedType}"</p>
            <Link to="/teachers" style={{ display: "inline-block", marginTop: "1rem", fontFamily: fonts.body, fontSize: "0.85rem", color: colors.oliveDark, textDecoration: "none" }}>
              ← חזור לאגף המורים
            </Link>
          </div>
        ) : (
          <>
            <ControlsBar
              viewMode={viewMode}
              onViewChange={handleViewChange}
              mediaFilter={mediaFilter}
              onMediaFilterChange={setMediaFilter}
              search={search}
              onSearch={setSearch}
              counts={counts}
            />

            {filteredLessons.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: colors.textSubtle, fontFamily: fonts.body }}>
                <p>לא נמצאו תוצאות לסינון הנוכחי.</p>
                <button
                  onClick={() => { setSearch(""); setMediaFilter("all"); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: colors.oliveDark, fontFamily: fonts.body, fontSize: "0.85rem", textDecoration: "underline" }}
                >
                  אפס סינון
                </button>
              </div>
            ) : viewMode === "grid" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.1rem" }}>
                {filteredLessons.map((l) => (
                  <LessonCard key={l.id} lesson={l} onClick={() => setModalLessonId(l.id)} />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {filteredLessons.map((l) => (
                  <LessonListRow key={l.id} lesson={l} onClick={() => setModalLessonId(l.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {modalLesson && (
        <TeacherLessonModal
          lesson={{ id: modalLesson.id, title: modalLesson.title, description: modalLesson.description, content: modalLesson.content ?? null, duration: modalLesson.duration, sourceType: null, audioUrl: modalLesson.audioUrl, videoUrl: modalLesson.videoUrl, attachmentUrl: modalLesson.attachmentUrl, thumbnailUrl: modalLesson.thumbnailUrl, rabbiName: modalLesson.rabbiName }}
          seriesId={modalLesson.seriesId || ""}
          seriesImageUrl={null}
          seriesTitle={modalLesson.seriesTitle || ""}
          onClose={() => setModalLessonId(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </TeachersLayout>
  );
}
