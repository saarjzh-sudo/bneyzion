/**
 * TeachersWorksheetsPage — /teachers/worksheets/:book
 *
 * Displays all "דפי עבודה" content for a specific Bible book.
 * "Worksheets" = lessons with content_type containing:
 *   דפי עבודה, חוברת עבודה, שאלות חזרה, שאלות ותשובות, שאלות מקיפות,
 *   שאלות עיון, מבחן, בחינה, שאלות
 *
 * Layout: TeachersLayout (olive sidebar + DesignHeader + DesignFooter)
 * Hero: olive variant, compact
 * Content: lessons list/grid + media filter + search
 *
 * Iron rules:
 *  - RTL logical CSS only
 *  - Olive color scheme
 *  - No mock data
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
  BookOpen,
  Loader2,
  FileText,
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
  useTeacherWorksheetsContent,
  type TeacherWorksheetLesson,
} from "@/hooks/useTeacherParashaContent";

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = "grid" | "list";
type MediaFilter = "all" | "audio" | "video" | "pdf" | "text";

const VIEW_KEY = "bnz.teachers.worksheets.view";

function getLessonMediaType(l: TeacherWorksheetLesson): "audio" | "video" | "pdf" | "text" {
  if (l.videoUrl) return "video";
  if (l.audioUrl) return "audio";
  if (l.attachmentUrl) return "pdf";
  return "text";
}

// ─── ControlsBar ─────────────────────────────────────────────────────────────
function ControlsBar({
  viewMode, onViewChange, mediaFilter, onMediaFilterChange, search, onSearch, counts,
}: {
  viewMode: ViewMode; onViewChange: (v: ViewMode) => void;
  mediaFilter: MediaFilter; onMediaFilterChange: (f: MediaFilter) => void;
  search: string; onSearch: (v: string) => void;
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
          <Search size={14} style={{ position: "absolute", insetInlineEnd: "0.75rem", top: "50%", transform: "translateY(-50%)", color: colors.textSubtle, pointerEvents: "none" }} />
          <input
            type="text" value={search} onChange={(e) => onSearch(e.target.value)}
            placeholder="חיפוש בדפי עבודה..." dir="rtl"
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
              <button key={v} onClick={() => onViewChange(v)} title={v === "grid" ? "תצוגת כרטיסים" : "תצוגת רשימה"} style={{ width: 36, height: 34, border: "none", background: active ? gradients.oliveButton : "transparent", color: active ? "white" : colors.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
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
            <button key={key} onClick={() => onMediaFilterChange(key)} style={{ padding: "0.28rem 0.8rem", borderRadius: radii.pill, border: `1.5px solid ${isActive ? colors.oliveDark : "rgba(139,111,71,0.2)"}`, background: isActive ? gradients.oliveButton : "transparent", color: isActive ? "white" : colors.textMuted, fontFamily: fonts.body, fontSize: "0.73rem", fontWeight: isActive ? 700 : 500, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── LessonCard (grid) ────────────────────────────────────────────────────────
function LessonCard({ lesson, onClick }: { lesson: TeacherWorksheetLesson; onClick: () => void }) {
  const imgSrc = lesson.thumbnailUrl || getSeriesCoverImage(lesson.seriesTitle || "") || "/images/series-default.png";
  return (
    <div
      onClick={onClick}
      style={{ background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.09)", boxShadow: shadows.cardSoft, cursor: "pointer", overflow: "hidden", display: "flex", flexDirection: "column", transition: "all 0.2s ease", position: "relative" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = shadows.cardHover; e.currentTarget.style.borderColor = colors.goldDark; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = shadows.cardSoft; e.currentTarget.style.borderColor = "rgba(139,111,71,0.09)"; }}
    >
      <div style={{ height: 90, overflow: "hidden", flexShrink: 0 }}>
        <img src={imgSrc} alt={lesson.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).src = "/images/series-default.png"; }} />
      </div>
      <div style={{ position: "absolute", top: 0, right: 0, width: 4, height: "100%", background: gradients.oliveButton }} />
      <div style={{ padding: "0.7rem", display: "flex", flexDirection: "column", gap: "0.28rem", flex: 1 }}>
        {lesson.contentType && (
          <span style={{ fontFamily: fonts.body, fontSize: "0.57rem", color: colors.oliveDark, background: "rgba(74,90,46,0.1)", padding: "0.08rem 0.4rem", borderRadius: radii.pill, fontWeight: 700, alignSelf: "flex-start" }}>
            {lesson.contentType}
          </span>
        )}
        <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "0.83rem", color: colors.textDark, margin: 0, lineHeight: 1.4 }}>{lesson.title}</h3>
        {lesson.rabbiName && <div style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.goldDark, fontWeight: 700 }}>{lesson.rabbiName}</div>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.45rem", borderTop: "1px solid rgba(139,111,71,0.07)", marginTop: "auto" }}>
          <div style={{ display: "flex", gap: "0.3rem" }}>
            {lesson.videoUrl && <Video size={12} style={{ color: colors.oliveMain }} />}
            {lesson.audioUrl && <Headphones size={12} style={{ color: colors.goldDark }} />}
            {lesson.attachmentUrl && <FileDown size={12} style={{ color: colors.textSubtle }} />}
          </div>
          {lesson.duration && <span style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textSubtle }}>{formatDuration(lesson.duration)}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── LessonListRow ────────────────────────────────────────────────────────────
function LessonListRow({ lesson, onClick }: { lesson: TeacherWorksheetLesson; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 1rem", borderRadius: radii.lg, background: "white", border: "1px solid rgba(139,111,71,0.08)", cursor: "pointer", transition: "all 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.goldDark; e.currentTarget.style.background = colors.parchmentDark; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(139,111,71,0.08)"; e.currentTarget.style.background = "white"; }}
    >
      <FileText size={15} style={{ color: colors.oliveDark, flexShrink: 0, opacity: 0.7 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.86rem", color: colors.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lesson.title}</div>
        {lesson.rabbiName && <div style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.goldDark, marginTop: "0.1rem" }}>{lesson.rabbiName}</div>}
        {lesson.contentType && <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textSubtle, marginTop: "0.05rem" }}>{lesson.contentType}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
        {lesson.videoUrl && <Video size={13} style={{ color: colors.oliveMain }} />}
        {lesson.audioUrl && <Headphones size={13} style={{ color: colors.goldDark }} />}
        {lesson.attachmentUrl && <FileDown size={13} style={{ color: colors.textSubtle }} />}
        <span style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.oliveMain, fontWeight: 600 }}>פרטים ←</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeachersWorksheetsPage() {
  const { book = "" } = useParams<{ book: string }>();
  const decodedBook = decodeURIComponent(book);

  const { lessons, isLoading } = useTeacherWorksheetsContent(decodedBook);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(VIEW_KEY) as ViewMode) || "list"; } catch { return "list"; }
  });
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [search, setSearch]           = useState("");
  const [modalLessonId, setModalLessonId] = useState<string | null>(null);

  const handleViewChange = (v: ViewMode) => {
    setViewMode(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* blocked */ }
  };

  const filteredLessons = useMemo(() => {
    let result = lessons;
    if (search.trim()) {
      const q = search.trim();
      result = result.filter((l) => l.title.includes(q) || (l.description || "").includes(q));
    }
    if (mediaFilter !== "all") {
      result = result.filter((l) => getLessonMediaType(l) === mediaFilter);
    }
    return result;
  }, [lessons, search, mediaFilter]);

  const counts: Record<MediaFilter, number> = useMemo(() => {
    const c: Record<MediaFilter, number> = { all: lessons.length, audio: 0, video: 0, pdf: 0, text: 0 };
    for (const l of lessons) c[getLessonMediaType(l)]++;
    return c;
  }, [lessons]);

  const modalLesson = modalLessonId ? lessons.find((l) => l.id === modalLessonId) || null : null;

  useSEO({
    title: `דפי עבודה — ${decodedBook} | אגף המורים`,
    description: `דפי עבודה, חוברות וחומרי לימוד לספר ${decodedBook} — אגף המורים בני ציון`,
    url: `https://bneyzion.co.il/teachers/worksheets/${book}`,
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
            <Link to={`/teachers/book/${book}`} style={{ color: "rgba(232,213,160,0.8)", textDecoration: "none" }}>{decodedBook}</Link>
            {" / "}
          </span> as unknown as string
        }
        title={`דפי עבודה — ${decodedBook}`}
        subtitle={`חוברות עבודה, שאלות חזרה ומבחנים לספר ${decodedBook}`}
        icon={<GraduationCap size={22} style={{ color: "#E8D5A0" }} />}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
          <Link
            to={`/teachers/book/${book}`}
            style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(232,213,160,0.75)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.2rem" }}
          >
            <ChevronLeft size={12} style={{ transform: "rotate(180deg)" }} />
            כל התכנים ב{decodedBook}
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
            <BookOpen size={48} style={{ color: colors.goldDark, marginBottom: "1rem", opacity: 0.4 }} />
            <p style={{ margin: 0 }}>לא נמצאו דפי עבודה עבור {decodedBook}</p>
            <Link to={`/teachers/book/${book}`} style={{ display: "inline-block", marginTop: "1rem", fontFamily: fonts.body, fontSize: "0.85rem", color: colors.oliveDark, textDecoration: "none" }}>
              ← חזור לכל התכנים ב{decodedBook}
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

            {/* Results */}
            {filteredLessons.length > 0 ? (
              viewMode === "grid" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "1rem" }}>
                  {filteredLessons.map((l) => <LessonCard key={l.id} lesson={l} onClick={() => setModalLessonId(l.id)} />)}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {filteredLessons.map((l) => <LessonListRow key={l.id} lesson={l} onClick={() => setModalLessonId(l.id)} />)}
                </div>
              )
            ) : (
              <div style={{ textAlign: "center", padding: "3rem", color: colors.textSubtle, fontFamily: fonts.body }}>
                <p>לא נמצאו תוצאות לסינון הנוכחי.</p>
                <button onClick={() => { setSearch(""); setMediaFilter("all"); }} style={{ background: "none", border: "none", cursor: "pointer", color: colors.oliveDark, fontFamily: fonts.body, fontSize: "0.85rem", textDecoration: "underline" }}>
                  אפס סינון
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lesson modal — includes PDF/Word viewer (Task 4) */}
      {modalLesson && (
        <TeacherLessonModal
          lesson={{
            id: modalLesson.id,
            title: modalLesson.title,
            description: modalLesson.description,
            duration: modalLesson.duration,
            sourceType: null,
            audioUrl: modalLesson.audioUrl,
            videoUrl: modalLesson.videoUrl,
            attachmentUrl: modalLesson.attachmentUrl,
            thumbnailUrl: modalLesson.thumbnailUrl,
            rabbiName: modalLesson.rabbiName,
          }}
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
