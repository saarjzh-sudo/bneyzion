/**
 * TeacherLessonModal — popup quick-view for a lesson inside the Teachers Wing.
 *
 * Triggered from TeachersSeriesPage when user clicks a lesson card.
 * Closes on: ESC key / X button / backdrop click.
 * CTA "לדף המלא ←" navigates to /teachers/lesson/:id.
 *
 * Mobile: full-screen bottom sheet (position fixed, 100dvh)
 * Desktop: centered modal with blurred backdrop
 *
 * Iron rules:
 *  - RTL logical CSS only
 *  - Lesson trio image chain: thumbnailUrl → seriesImageUrl → getSeriesCoverImage() → /images/series-default.png
 *  - ESC/X/backdrop all close
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Headphones, Video, FileDown, ExternalLink, GraduationCap } from "lucide-react";
import { colors, fonts, radii, shadows, getSeriesCoverImage, formatDuration } from "@/lib/designTokens";

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

interface TeacherLessonModalProps {
  lesson: LessonItem;
  seriesId: string;
  seriesImageUrl: string | null;
  seriesTitle: string;
  onClose: () => void;
}

export default function TeacherLessonModal({
  lesson,
  seriesId,
  seriesImageUrl,
  seriesTitle,
  onClose,
}: TeacherLessonModalProps) {
  // Lesson trio image chain
  const imgSrc =
    lesson.thumbnailUrl ||
    seriesImageUrl ||
    getSeriesCoverImage(seriesTitle) ||
    "/images/series-default.png";

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    // Prevent body scroll while open
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(45,31,14,0.65)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex: 200,
        }}
      />

      {/* Modal panel */}
      <div
        dir="rtl"
        style={{
          position: "fixed",
          zIndex: 201,
          // Desktop: centered
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(560px, 95vw)",
          maxHeight: "90dvh",
          background: "white",
          borderRadius: radii.xl,
          boxShadow: shadows.modal,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Image header */}
        <div style={{ position: "relative", height: 200, flexShrink: 0 }}>
          <img
            src={imgSrc}
            alt={lesson.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { (e.target as HTMLImageElement).src = "/images/series-default.png"; }}
          />
          {/* Dark overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(45,31,14,0.75) 0%, rgba(45,31,14,0.1) 60%)" }} />

          {/* Teacher badge */}
          <div style={{ position: "absolute", top: "0.75rem", insetInlineEnd: "0.75rem" }}>
            <span style={{ fontFamily: fonts.body, fontSize: "0.62rem", color: "white", background: colors.oliveDark, padding: "0.2rem 0.65rem", borderRadius: radii.pill, fontWeight: 700, display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <GraduationCap size={11} />
              אגף המורים
            </span>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="סגור"
            style={{ position: "absolute", top: "0.75rem", insetInlineStart: "0.75rem", background: "rgba(45,31,14,0.6)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}
          >
            <X size={16} />
          </button>

          {/* Title overlaid on image */}
          <div style={{ position: "absolute", bottom: "0.9rem", insetInlineEnd: "1rem", insetInlineStart: "1rem" }}>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.05rem", color: "white", margin: 0, lineHeight: 1.35 }}>
              {lesson.title}
            </h2>
            {lesson.rabbiName && (
              <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.goldShimmer, fontWeight: 700, marginTop: "0.2rem" }}>
                {lesson.rabbiName}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
            {lesson.duration && (
              <span style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textSubtle }}>
                {formatDuration(lesson.duration)}
              </span>
            )}
            {lesson.videoUrl && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontFamily: fonts.body, fontSize: "0.72rem", color: colors.oliveMain }}>
                <Video size={12} /> וידאו
              </span>
            )}
            {lesson.audioUrl && !lesson.videoUrl && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontFamily: fonts.body, fontSize: "0.72rem", color: colors.goldDark }}>
                <Headphones size={12} /> שמע
              </span>
            )}
            {lesson.attachmentUrl && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>
                <FileDown size={12} /> {String(lesson.attachmentUrl).toLowerCase().includes('.pdf') ? 'PDF' : String(lesson.attachmentUrl).toLowerCase().includes('.doc') ? 'Word' : 'קובץ'}
              </span>
            )}
          </div>

          {/* Description */}
          {lesson.description && (
            <p style={{ fontFamily: fonts.body, fontSize: "0.88rem", color: colors.textMid, lineHeight: 1.65, margin: "0 0 1rem" }}>
              {lesson.description}
            </p>
          )}

          {/* Media player / embed (video first, then audio) */}
          {lesson.videoUrl && (
            <div style={{ marginBottom: "1rem", borderRadius: radii.lg, overflow: "hidden", background: "#000" }}>
              <video
                controls
                src={lesson.videoUrl}
                style={{ width: "100%", maxHeight: 200, display: "block" }}
              />
            </div>
          )}
          {lesson.audioUrl && !lesson.videoUrl && (
            <div style={{ marginBottom: "1rem" }}>
              <audio controls src={lesson.audioUrl} style={{ width: "100%" }} />
            </div>
          )}
        </div>

        {/* Footer CTAs */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid rgba(139,111,71,0.1)",
            display: "flex",
            gap: "0.75rem",
            flexShrink: 0,
          }}
        >
          {/* Primary CTA — full lesson page */}
          <Link
            to={`/teachers/lesson/${lesson.id}`}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              padding: "0.7rem 1rem",
              background: `linear-gradient(135deg, ${colors.oliveDark}, ${colors.oliveMain})`,
              color: "white",
              borderRadius: radii.lg,
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: "0.88rem",
              textDecoration: "none",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            <ExternalLink size={15} />
            לדף המלא ←
          </Link>

          {/* Secondary CTA — attachment download */}
          {lesson.attachmentUrl && (() => {
            const lower = String(lesson.attachmentUrl).toLowerCase();
            const label = lower.includes('.pdf') ? 'הורד PDF' : lower.includes('.doc') ? 'הורד Word' : 'הורד קובץ';
            return (
              <a
                href={lesson.attachmentUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.7rem 1rem",
                  background: colors.goldDark,
                  color: "white",
                  border: `1.5px solid ${colors.goldDark}`,
                  borderRadius: radii.lg,
                  fontFamily: fonts.body,
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  textDecoration: "none",
                }}
              >
                <FileDown size={14} />
                {label}
              </a>
            );
          })()}
        </div>
      </div>

      {/* Mobile bottom sheet override */}
      <style>{`
        @media (max-width: 640px) {
          [data-teacher-modal] {
            top: auto !important;
            left: 0 !important;
            bottom: 0 !important;
            transform: none !important;
            width: 100% !important;
            max-height: 90dvh !important;
            border-radius: 1.25rem 1.25rem 0 0 !important;
          }
        }
      `}</style>
    </>
  );
}
