/**
 * TeachersSeriesPage — /teachers/series/:id
 *
 * Production series page within the Teachers Wing.
 *
 * Layout:
 *   TeachersLayout (olive sidebar + header + footer)
 *   Olive hero with breadcrumb: אגף המורים → [series title]
 *   Two-column: teacher sidebar panel (right) + lesson list (left)
 *   Filter panel: search / media / sort
 *   Lesson cards with olive teacher badge
 *   Click → TeacherLessonModal (popup quick-view)
 *   Modal CTA "לדף המלא ←" → /teachers/lesson/:id
 *
 * Iron rules:
 *  - RTL logical CSS only
 *  - Lesson trio image chain: thumbnail_url → series.image_url → getSeriesCoverImage() → /images/series-default.png
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
  Loader2,
  Filter,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

import TeachersLayout from "@/components/teachers/TeachersLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import TeacherLessonModal from "./TeacherLessonModal";
import { colors, fonts, gradients, radii, shadows, getSeriesCoverImage, formatDuration } from "@/lib/designTokens";

// ─── Types ───────────────────────────────────────────────────────────────────
type SortMode = "default" | "alpha" | "duration-desc" | "duration-asc";
type MediaFilter = "all" | "audio" | "video" | "pdf";

interface LessonItem {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  sourceType: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  attachmentUrl: string | null;
  thumbnailUrl: string | null;
  rabbiName: string | null;
}

interface SeriesMeta {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  lesson_count: number;
  rabbi_id: string | null;
  rabbiName: string | null;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────
function useSeriesMeta(id: string) {
  return useQuery({
    queryKey: ["teacher-series-meta-prod", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("series")
        .select("id, title, description, image_url, lesson_count, rabbi_id")
        .eq("id", id)
        .single();
      if (!data) return null;
      let rabbiName: string | null = null;
      if (data.rabbi_id) {
        const { data: r } = await supabase.from("rabbis").select("name").eq("id", data.rabbi_id).single();
        rabbiName = r?.name || null;
      }
      return { ...data, rabbiName } as SeriesMeta;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

function useSeriesLessons(seriesId: string) {
  return useQuery({
    queryKey: ["teacher-series-lessons-prod", seriesId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, title, description, duration, source_type, audio_url, video_url, attachment_url, thumbnail_url, rabbi_id")
        .eq("series_id", seriesId)
        .eq("status", "published")
        .order("title")
        .limit(300);
      if (!data || data.length === 0) return [];
      const rabbiIds = [...new Set(data.filter((l) => l.rabbi_id).map((l) => l.rabbi_id!))];
      let rabbiMap = new Map<string, string>();
      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase.from("rabbis").select("id, name").in("id", rabbiIds);
        rabbiMap = new Map((rabbis || []).map((r) => [r.id, r.name]));
      }
      return data.map((l) => ({
        id:            l.id,
        title:         l.title,
        description:   l.description,
        duration:      l.duration,
        sourceType:    l.source_type,
        audioUrl:      l.audio_url,
        videoUrl:      l.video_url,
        attachmentUrl: l.attachment_url,
        thumbnailUrl:  l.thumbnail_url,
        rabbiName:     l.rabbi_id ? rabbiMap.get(l.rabbi_id) || null : null,
      })) as LessonItem[];
    },
    enabled: !!seriesId,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── FilterPanel ─────────────────────────────────────────────────────────────
function FilterPanel({
  search, onSearch, media, onMedia, sort, onSort,
  totalCount, filteredCount,
}: {
  search: string; onSearch: (v: string) => void;
  media: MediaFilter; onMedia: (v: MediaFilter) => void;
  sort: SortMode; onSort: (v: SortMode) => void;
  totalCount: number; filteredCount: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      dir="rtl"
      style={{ background: "white", borderRadius: radii.xl, border: "1px solid rgba(74,90,46,0.15)", boxShadow: shadows.cardSoft, marginBottom: "1.5rem", overflow: "hidden" }}
    >
      {/* Search row (always visible) */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderBottom: expanded ? "1px solid rgba(139,111,71,0.1)" : "none" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={15} style={{ position: "absolute", insetInlineEnd: "0.75rem", top: "50%", transform: "translateY(-50%)", color: colors.textSubtle, pointerEvents: "none" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="חיפוש בשיעורים..."
            style={{ width: "100%", height: 36, paddingInlineEnd: "2.25rem", paddingInlineStart: "0.75rem", borderRadius: radii.md, border: "1px solid rgba(139,111,71,0.2)", fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textDark, background: colors.parchment, outline: "none", direction: "rtl" }}
          />
          {search && (
            <button onClick={() => onSearch("")} style={{ position: "absolute", insetInlineStart: "0.5rem", top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: colors.textSubtle, padding: 0, display: "flex" }}>
              <X size={13} />
            </button>
          )}
        </div>
        <span style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textSubtle, whiteSpace: "nowrap", flexShrink: 0 }}>{filteredCount}/{totalCount}</span>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.75rem", borderRadius: radii.md, border: `1px solid ${expanded ? colors.oliveDark : "rgba(139,111,71,0.2)"}`, background: expanded ? "rgba(74,90,46,0.08)" : "transparent", color: expanded ? colors.oliveDark : colors.textMuted, fontFamily: fonts.body, fontSize: "0.75rem", cursor: "pointer" }}
        >
          <Filter size={13} />
          סינון
        </button>
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {/* Media filter */}
          <div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textSubtle, marginBottom: "0.4rem", fontWeight: 700 }}>סוג מדיה</div>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {([["all","הכל"],["audio","שמע"],["video","וידאו"],["pdf","PDF"]] as [MediaFilter, string][]).map(([v, label]) => (
                <button key={v} onClick={() => onMedia(v)} style={{ padding: "0.3rem 0.8rem", borderRadius: radii.pill, border: `1px solid ${media === v ? colors.oliveDark : "rgba(139,111,71,0.2)"}`, background: media === v ? colors.oliveDark : "transparent", color: media === v ? "white" : colors.textMuted, fontFamily: fonts.body, fontSize: "0.75rem", cursor: "pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* Sort */}
          <div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textSubtle, marginBottom: "0.4rem", fontWeight: 700 }}>מיון</div>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {([["default","ברירת מחדל"],["alpha","א-ב"],["duration-desc","ארוכים קודם"],["duration-asc","קצרים קודם"]] as [SortMode, string][]).map(([v, label]) => (
                <button key={v} onClick={() => onSort(v)} style={{ padding: "0.3rem 0.8rem", borderRadius: radii.pill, border: `1px solid ${sort === v ? colors.oliveDark : "rgba(139,111,71,0.2)"}`, background: sort === v ? colors.oliveDark : "transparent", color: sort === v ? "white" : colors.textMuted, fontFamily: fonts.body, fontSize: "0.75rem", cursor: "pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LessonCard ───────────────────────────────────────────────────────────────
function LessonCard({
  lesson,
  seriesImageUrl,
  seriesTitle,
  onClick,
}: {
  lesson: LessonItem;
  seriesImageUrl: string | null;
  seriesTitle: string;
  onClick: () => void;
}) {
  // Lesson trio image chain
  const imgSrc =
    lesson.thumbnailUrl ||
    seriesImageUrl ||
    getSeriesCoverImage(seriesTitle) ||
    "/images/series-default.png";

  return (
    <div
      onClick={onClick}
      style={{ background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.09)", boxShadow: shadows.cardSoft, cursor: "pointer", overflow: "hidden", display: "flex", flexDirection: "column", transition: "all 0.2s ease", position: "relative" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = shadows.cardHover; e.currentTarget.style.borderColor = colors.goldDark; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = shadows.cardSoft; e.currentTarget.style.borderColor = "rgba(139,111,71,0.09)"; }}
    >
      {/* Image */}
      <div style={{ height: 120, overflow: "hidden", flexShrink: 0 }}>
        <img src={imgSrc} alt={lesson.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).src = "/images/series-default.png"; }} />
      </div>

      {/* Olive accent stripe */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 4, height: "100%", background: gradients.oliveButton }} />

      {/* Body */}
      <div style={{ padding: "0.85rem", display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1 }}>
        {/* Teacher badge */}
        <span style={{ fontFamily: fonts.body, fontSize: "0.6rem", color: colors.oliveDark, background: "rgba(74,90,46,0.1)", padding: "0.1rem 0.5rem", borderRadius: radii.pill, fontWeight: 700, alignSelf: "flex-start" }}>
          אגף המורים
        </span>

        <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "0.88rem", color: colors.textDark, margin: 0, lineHeight: 1.4 }}>
          {lesson.title}
        </h3>

        {lesson.rabbiName && (
          <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.goldDark, fontWeight: 700 }}>{lesson.rabbiName}</div>
        )}

        {lesson.description && (
          <p style={{ fontFamily: fonts.body, fontSize: "0.77rem", color: colors.textMuted, margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
            {lesson.description}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.6rem", borderTop: "1px solid rgba(139,111,71,0.07)", marginTop: "auto" }}>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {lesson.videoUrl && <Video size={13} style={{ color: colors.oliveMain }} />}
            {lesson.audioUrl && <Headphones size={13} style={{ color: colors.goldDark }} />}
            {lesson.attachmentUrl && <FileDown size={13} style={{ color: colors.textSubtle }} />}
          </div>
          {lesson.duration && (
            <span style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.textSubtle }}>{formatDuration(lesson.duration)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeachersSeriesPage() {
  const { id = "" } = useParams<{ id: string }>();

  const metaQ  = useSeriesMeta(id);
  const lessonsQ = useSeriesLessons(id);

  const [search, setSearch] = useState("");
  const [media, setMedia] = useState<MediaFilter>("all");
  const [sort, setSort] = useState<SortMode>("default");
  const [modalLessonId, setModalLessonId] = useState<string | null>(null);

  const series = metaQ.data;
  const allLessons = lessonsQ.data || [];

  const filtered = useMemo(() => {
    let list = allLessons;

    if (search.trim()) {
      const q = search.trim();
      list = list.filter((l) => l.title.includes(q) || (l.description || "").includes(q));
    }

    if (media !== "all") {
      list = list.filter((l) => {
        if (media === "audio")  return !!l.audioUrl && !l.videoUrl;
        if (media === "video")  return !!l.videoUrl;
        if (media === "pdf")    return !!l.attachmentUrl;
        return true;
      });
    }

    if (sort === "alpha") {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title, "he"));
    } else if (sort === "duration-desc") {
      list = [...list].sort((a, b) => (b.duration || 0) - (a.duration || 0));
    } else if (sort === "duration-asc") {
      list = [...list].sort((a, b) => (a.duration || 0) - (b.duration || 0));
    }

    return list;
  }, [allLessons, search, media, sort]);

  const modalLesson = modalLessonId ? allLessons.find((l) => l.id === modalLessonId) || null : null;

  useSEO({
    title: series?.title ? `${series.title} — אגף המורים` : "אגף המורים",
    description: series?.description || undefined,
    url: `https://bneyzion.co.il/teachers/series/${id}`,
  });

  return (
    <TeachersLayout activeSeriesId={id}>
        {/* Hero */}
        <DesignPageHero
          variant="olive"
          compact
          eyebrow={
            <span>
              <Link to="/teachers" style={{ color: "rgba(232,213,160,0.8)", textDecoration: "none" }}>אגף המורים</Link>
              {" / "}
            </span> as unknown as string
          }
          title={series?.title || "טוען..."}
          subtitle={series?.description || undefined}
          icon={<GraduationCap size={24} style={{ color: "#E8D5A0" }} />}
        >
          {/* Breadcrumb + meta */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
            <Link
              to="/teachers"
              style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(232,213,160,0.75)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.2rem" }}
            >
              <ChevronLeft size={12} style={{ transform: "rotate(180deg)" }} />
              אגף המורים
            </Link>
            {series?.rabbiName && (
              <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(232,213,160,0.75)" }}>• {series.rabbiName}</span>
            )}
            {series && (
              <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(232,213,160,0.75)" }}>• {series.lesson_count} שיעורים</span>
            )}
          </div>
        </DesignPageHero>

        {/* Content */}
        <div dir="rtl" style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem 3rem" }}>
          {metaQ.isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
              <Loader2 size={32} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
            </div>
          ) : !series ? (
            <div style={{ textAlign: "center", padding: "3rem", color: colors.textSubtle, fontFamily: fonts.body }}>
              הסדרה לא נמצאה.{" "}
              <Link to="/teachers" style={{ color: colors.oliveDark }}>חזור לאגף המורים</Link>
            </div>
          ) : (
            <>
              <FilterPanel
                search={search} onSearch={setSearch}
                media={media} onMedia={setMedia}
                sort={sort} onSort={setSort}
                totalCount={allLessons.length}
                filteredCount={filtered.length}
              />

              {lessonsQ.isLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                  <Loader2 size={24} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: colors.textSubtle, fontFamily: fonts.body }}>
                  לא נמצאו שיעורים. <button onClick={() => { setSearch(""); setMedia("all"); }} style={{ background: "none", border: "none", color: colors.oliveDark, cursor: "pointer", fontFamily: fonts.body }}>אפס סינון</button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.25rem" }}>
                  {filtered.map((lesson) => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      seriesImageUrl={series.image_url}
                      seriesTitle={series.title}
                      onClick={() => setModalLessonId(lesson.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Lesson popup modal */}
        {modalLesson && (
          <TeacherLessonModal
            lesson={modalLesson}
            seriesId={id}
            seriesImageUrl={series?.image_url || null}
            seriesTitle={series?.title || ""}
            onClose={() => setModalLessonId(null)}
          />
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </TeachersLayout>
  );
}
