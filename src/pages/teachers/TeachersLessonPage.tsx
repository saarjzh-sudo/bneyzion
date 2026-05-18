/**
 * TeachersLessonPage — /teachers/lesson/:id
 *
 * Full lesson detail page within the Teachers Wing.
 * The THIRD surface in the lesson trio:
 *   1. LessonCard (in /teachers/series/:id grid)
 *   2. TeacherLessonModal (popup quick-view)
 *   3. TeachersLessonPage (full detail) ← THIS FILE
 *
 * All three surfaces share the same image (lesson trio principle).
 *
 * Layout:
 *   TeachersLayout (olive sidebar + header + footer)
 *   Olive hero with breadcrumb: אגף המורים → [series title] → [lesson title]
 *   Two-column (desktop): main content + sticky metadata panel
 *   Back button → /teachers/series/:seriesId
 *
 * Iron rules:
 *  - RTL logical CSS only
 *  - Lesson trio image chain: thumbnail_url → series.image_url → getSeriesCoverImage() → /images/series-default.png
 *  - No mock data
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  GraduationCap,
  Headphones,
  Video,
  FileDown,
  Loader2,
  Clock,
  User,
  BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

import TeachersLayout from "@/components/teachers/TeachersLayout";
import { colors, fonts, gradients, radii, shadows, getSeriesCoverImage, formatDuration } from "@/lib/designTokens";

// ─── Hook ─────────────────────────────────────────────────────────────────────
function useLessonFull(id: string) {
  return useQuery({
    queryKey: ["teacher-lesson-full", id],
    queryFn: async () => {
      const { data: lesson } = await supabase
        .from("lessons")
        .select("id, title, description, content, duration, source_type, audio_url, video_url, attachment_url, additional_attachments, thumbnail_url, rabbi_id, series_id, bible_book, bible_chapter")
        .eq("id", id)
        .single();
      if (!lesson) return null;

      // Fetch rabbi name
      let rabbiName: string | null = null;
      if (lesson.rabbi_id) {
        const { data: rabbi } = await supabase.from("rabbis").select("name").eq("id", lesson.rabbi_id).single();
        rabbiName = rabbi?.name || null;
      }

      // Fetch series
      let series: { id: string; title: string; image_url: string | null } | null = null;
      if (lesson.series_id) {
        const { data: s } = await supabase
          .from("series")
          .select("id, title, image_url")
          .eq("id", lesson.series_id)
          .single();
        series = s || null;
      }

      return { ...lesson, rabbiName, series };
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeachersLessonPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: lesson, isLoading } = useLessonFull(id);

  if (isLoading) {
    return (
      <TeachersLayout>
        <div style={{ display: "flex", justifyContent: "center", padding: "6rem 0" }}>
          <Loader2 size={32} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </TeachersLayout>
    );
  }

  if (!lesson) {
    return (
      <TeachersLayout>
        <div style={{ textAlign: "center", padding: "6rem 1.5rem", fontFamily: fonts.body, color: colors.textSubtle }}>
          השיעור לא נמצא.{" "}
          <Link to="/teachers" style={{ color: colors.oliveDark }}>חזור לאגף המורים</Link>
        </div>
      </TeachersLayout>
    );
  }

  // Lesson trio image chain
  const heroImage =
    lesson.thumbnail_url ||
    lesson.series?.image_url ||
    (lesson.series ? getSeriesCoverImage(lesson.series.title) : null) ||
    "/images/series-default.png";

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useSEO({
    title: `${lesson.title} — אגף המורים`,
    description: lesson.description || undefined,
    image: heroImage,
    url: `https://bneyzion.co.il/teachers/lesson/${id}`,
  });

  return (
    <>
      <TeachersLayout activeSeriesId={lesson.series_id || undefined}>
        {/* Hero — cinematic 620px with lesson trio image */}
        <div
          style={{
            position: "relative",
            height: 320,
            overflow: "hidden",
            background: `linear-gradient(180deg, ${colors.oliveDark} 0%, #2A3416 60%, ${colors.oliveDark} 100%)`,
          }}
        >
          {/* Background image */}
          <img
            src={heroImage}
            alt={lesson.title}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {/* Overlay gradient */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(42,52,22,0.95) 0%, rgba(42,52,22,0.5) 60%, transparent 100%)" }} />

          {/* Content */}
          <div
            dir="rtl"
            style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", padding: "2rem 1.5rem", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
          >
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              <Link to="/teachers" style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: "rgba(232,213,160,0.7)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                <GraduationCap size={12} />
                אגף המורים
              </Link>
              {lesson.series && (
                <>
                  <ChevronLeft size={11} style={{ color: "rgba(232,213,160,0.4)", transform: "rotate(180deg)" }} />
                  <Link to={`/teachers/series/${lesson.series.id}`} style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: "rgba(232,213,160,0.7)", textDecoration: "none" }}>
                    {lesson.series.title}
                  </Link>
                </>
              )}
            </div>

            {/* Teacher badge */}
            <div style={{ marginBottom: "0.5rem" }}>
              <span style={{ fontFamily: fonts.body, fontSize: "0.62rem", color: "white", background: colors.oliveDark, border: "1px solid rgba(255,255,255,0.2)", padding: "0.18rem 0.65rem", borderRadius: radii.pill, fontWeight: 700 }}>
                אגף המורים
              </span>
            </div>

            {/* Title */}
            <h1 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "clamp(1.2rem, 4vw, 1.7rem)", color: "white", margin: 0, lineHeight: 1.35 }}>
              {lesson.title}
            </h1>

            {/* Meta */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
              {lesson.rabbiName && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontFamily: fonts.body, fontSize: "0.8rem", color: colors.goldShimmer }}>
                  <User size={13} />
                  {lesson.rabbiName}
                </div>
              )}
              {lesson.duration && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>
                  <Clock size={13} />
                  {formatDuration(lesson.duration)}
                </div>
              )}
              {lesson.bible_book && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>
                  <BookOpen size={13} />
                  {lesson.bible_book}
                  {lesson.bible_chapter ? ` פרק ${lesson.bible_chapter}` : ""}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div dir="rtl" style={{ maxWidth: 820, margin: "0 auto", padding: "2rem 1.5rem 3rem" }}>
          {/* Back button */}
          {lesson.series && (
            <Link
              to={`/teachers/series/${lesson.series.id}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontFamily: fonts.body, fontSize: "0.82rem", color: colors.oliveDark, textDecoration: "none", marginBottom: "1.5rem", fontWeight: 600 }}
            >
              <ChevronLeft size={14} style={{ transform: "rotate(180deg)" }} />
              חזור לסדרה: {lesson.series.title}
            </Link>
          )}

          {/* Media player */}
          {lesson.video_url && (
            <div style={{ marginBottom: "1.5rem", borderRadius: radii.xl, overflow: "hidden", background: "#000", boxShadow: shadows.cardHover }}>
              <video controls src={lesson.video_url} style={{ width: "100%", maxHeight: 400, display: "block" }} />
            </div>
          )}
          {lesson.audio_url && !lesson.video_url && (
            <div style={{ marginBottom: "1.5rem", background: "white", borderRadius: radii.xl, padding: "1.5rem", boxShadow: shadows.cardSoft, border: "1px solid rgba(139,111,71,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem", fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted }}>
                <Headphones size={16} style={{ color: colors.goldDark }} />
                הקלטת שיעור
              </div>
              <audio controls src={lesson.audio_url} style={{ width: "100%" }} />
            </div>
          )}

          {/* Attachment — PDF / Word / other */}
          {lesson.attachment_url && (() => {
            const url: string = String(lesson.attachment_url);
            const lower = url.toLowerCase();
            const isPdf = lower.includes('.pdf');
            const isWord = lower.includes('.doc') || lower.includes('.docx');
            const encoded = encodeURIComponent(url);
            const label = isPdf ? 'הורד קובץ PDF' : isWord ? 'הורד קובץ Word' : 'הורד קובץ מצורף';

            return (
              <div style={{ marginBottom: "1.5rem" }}>
                {/* Download button — always visible */}
                <a
                  href={url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.25rem", borderRadius: radii.lg, background: colors.goldDark, color: "white", fontFamily: fonts.body, fontSize: "0.85rem", fontWeight: 700, textDecoration: "none", marginBottom: "1rem", transition: "opacity 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  <FileDown size={15} />
                  {label}
                </a>

                {/* Inline viewer for Word files */}
                {isWord && (
                  <div style={{ borderRadius: radii.xl, overflow: "hidden", border: "1px solid rgba(139,111,71,0.15)" }}>
                    <iframe
                      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`}
                      style={{ width: "100%", border: "none", height: "75vh", minHeight: "500px", display: "block" }}
                      loading="lazy"
                      title="Word Viewer"
                    />
                  </div>
                )}

                {/* Inline viewer for PDF files */}
                {isPdf && (
                  <div style={{ borderRadius: radii.xl, overflow: "hidden", border: "1px solid rgba(139,111,71,0.15)" }}>
                    <iframe
                      src={`https://docs.google.com/gview?url=${encoded}&embedded=true`}
                      style={{ width: "100%", border: "none", height: "75vh", minHeight: "500px", display: "block" }}
                      loading="lazy"
                      title="PDF Viewer"
                    />
                  </div>
                )}
              </div>
            );
          })()}

          {/* Additional attachments */}
          {((lesson as any).additional_attachments || []).length > 0 && (
            <div style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {((lesson as any).additional_attachments as string[]).map((url: string, i: number) => {
                const lower = url.toLowerCase();
                const isPdf = lower.includes('.pdf');
                const isWord = lower.includes('.doc') || lower.includes('.docx');
                const label = isPdf ? `קובץ PDF נוסף ${i + 1}` : isWord ? `קובץ Word נוסף ${i + 1}` : `קובץ מצורף נוסף ${i + 1}`;
                return (
                  <a
                    key={url}
                    href={url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", borderRadius: radii.lg, background: "rgba(139,111,71,0.08)", color: colors.goldDark, fontFamily: fonts.body, fontSize: "0.8rem", fontWeight: 700, textDecoration: "none", border: "1px solid rgba(139,111,71,0.2)" }}
                  >
                    ↓ {label}
                  </a>
                );
              })}
            </div>
          )}

          {/* Description */}
          {lesson.description && (
            <div style={{ marginBottom: "1.5rem", background: "white", borderRadius: radii.xl, padding: "1.25rem 1.5rem", boxShadow: shadows.cardSoft, border: "1px solid rgba(139,111,71,0.08)" }}>
              <p style={{ fontFamily: fonts.body, fontSize: "0.95rem", color: colors.textMid, lineHeight: 1.8, margin: 0 }}>
                {lesson.description}
              </p>
            </div>
          )}

          {/* Content (HTML from Umbraco) */}
          {lesson.content && (
            <div
              style={{ background: "white", borderRadius: radii.xl, padding: "1.5rem 2rem", boxShadow: shadows.cardSoft, border: "1px solid rgba(139,111,71,0.08)", fontFamily: fonts.body, fontSize: "0.95rem", color: colors.textMid, lineHeight: 1.85 }}
              dangerouslySetInnerHTML={{ __html: lesson.content }}
            />
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </TeachersLayout>
    </>
  );
}
