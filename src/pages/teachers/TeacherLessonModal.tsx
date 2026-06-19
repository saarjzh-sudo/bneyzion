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
 *  - Lesson trio image chain: thumbnailUrl → seriesImageUrl → getSeriesCoverImage() → /images/series-default.webp
 *  - ESC/X/backdrop all close
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Headphones, Video, FileDown, ExternalLink, GraduationCap } from "lucide-react";
import { colors, fonts, radii, shadows, getSeriesCoverImage, formatDuration } from "@/lib/designTokens";
import { sanitizeHtml } from "@/lib/sanitize";
import RecommendedTeacherLessons from "@/components/teachers/RecommendedTeacherLessons";

interface LessonItem {
  id: string;
  title: string;
  description: string | null;
  content?: string | null;
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
  /** Series author — authoritative for teacher content. Prefer over lesson.rabbiName,
   *  which the migration sometimes set to the wrong rabbi (e.g. שמואל אליהו on a מנחם אליהו series). */
  seriesRabbiName?: string | null;
  /** Optional context to improve "שיעורים מומלצים" relevance (self-derived from the lesson if omitted). */
  bibleBook?: string | null;
  contentType?: string | null;
  rabbiId?: string | null;
  onClose: () => void;
}

export default function TeacherLessonModal({
  lesson,
  seriesId,
  seriesImageUrl,
  seriesTitle,
  seriesRabbiName,
  bibleBook,
  contentType,
  rabbiId,
  onClose,
}: TeacherLessonModalProps) {
  const displayRabbi = seriesRabbiName || lesson.rabbiName;
  // Lesson trio image chain
  const imgSrc =
    lesson.thumbnailUrl ||
    seriesImageUrl ||
    getSeriesCoverImage(seriesTitle) ||
    "/images/series-default.webp";

  // Round-2 migration fix: some teacher video lessons store the .mp4 in attachment_url
  // (video_url is null). Without this, the file fell between the video player (needs
  // video_url) and the PDF/Word viewer (.pdf/.docx only) → the popup showed nothing.
  const isVideoFile = (u: string | null | undefined) =>
    !!u && /\.(mp4|m4v|mov|webm|ogv)(\?|#|$)/i.test(u);
  const videoSrc = lesson.videoUrl || (isVideoFile(lesson.attachmentUrl) ? lesson.attachmentUrl : null);
  // attachment routed to the PDF/Word inline viewer (i.e. anything that is NOT a video)
  const docAttachmentUrl = lesson.attachmentUrl && !isVideoFile(lesson.attachmentUrl) ? lesson.attachmentUrl : null;

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
            onError={(e) => { (e.target as HTMLImageElement).src = "/images/series-default.webp"; }}
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
            {displayRabbi && (
              <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.goldShimmer, fontWeight: 700, marginTop: "0.2rem" }}>
                {displayRabbi}
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
            {videoSrc && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontFamily: fonts.body, fontSize: "0.72rem", color: colors.oliveMain }}>
                <Video size={12} /> וידאו
              </span>
            )}
            {lesson.audioUrl && !videoSrc && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontFamily: fonts.body, fontSize: "0.72rem", color: colors.goldDark }}>
                <Headphones size={12} /> שמע
              </span>
            )}
            {docAttachmentUrl && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>
                <FileDown size={12} /> {docAttachmentUrl.toLowerCase().includes('.pdf') ? 'PDF' : docAttachmentUrl.toLowerCase().includes('.doc') ? 'Word' : 'קובץ'}
              </span>
            )}
          </div>

          {/* Full content (HTML) — shown when available; falls back to plain description */}
          {lesson.content ? (
            <div
              style={{ fontFamily: fonts.body, fontSize: "0.88rem", color: colors.textMid, lineHeight: 1.75, margin: "0 0 1rem" }}
              className="prose prose-sm max-w-none
                [&_p]:mb-3 [&_p]:leading-relaxed
                [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
                [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1
                [&_strong]:font-bold
                [&_blockquote]:border-r-4 [&_blockquote]:border-amber-400/50 [&_blockquote]:pr-3 [&_blockquote]:italic [&_blockquote]:text-stone-500"
              dir="rtl"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.content) }}
            />
          ) : lesson.description ? (
            <p style={{ fontFamily: fonts.body, fontSize: "0.88rem", color: colors.textMid, lineHeight: 1.65, margin: "0 0 1rem" }}>
              {lesson.description}
            </p>
          ) : null}

          {/* Media player / embed (video first, then audio) */}
          {videoSrc && (
            <div style={{ marginBottom: "1rem", borderRadius: radii.lg, overflow: "hidden", background: "#000" }}>
              <video
                controls
                src={videoSrc}
                style={{ width: "100%", maxHeight: 320, display: "block" }}
              />
            </div>
          )}
          {lesson.audioUrl && !videoSrc && (
            <div style={{ marginBottom: "1rem" }}>
              <audio controls src={lesson.audioUrl} style={{ width: "100%" }} />
            </div>
          )}

          {/* Fallback: no content at all */}
          {!lesson.content && !lesson.description && !videoSrc && !lesson.audioUrl && !lesson.attachmentUrl && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", gap: "0.6rem", color: colors.textSubtle, fontFamily: fonts.body, textAlign: "center" }}>
              <FileDown size={32} style={{ color: colors.goldDark, opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: "0.85rem" }}>
                תוכן השיעור זמין בדף המלא.
              </p>
              <p style={{ margin: 0, fontSize: "0.78rem", color: colors.textSubtle }}>
                לחץ על "לדף המלא" כדי לצפות בחומר.
              </p>
            </div>
          )}

          {/* PDF / Word inline viewer (videos are handled by the <video> player above) */}
          {docAttachmentUrl && (() => {
            const url = docAttachmentUrl;
            const lower = url.toLowerCase();
            const isPdf  = lower.includes(".pdf");
            const isDocx = lower.includes(".docx") || lower.includes(".doc");

            if (isPdf) {
              return (
                <div style={{ marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textSubtle, fontWeight: 600 }}>
                      תצוגת מסמך:
                    </div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: fonts.body, fontSize: "0.8rem", fontWeight: 700, color: "#fff", background: "#3f6b4c", padding: "0.3rem 0.9rem", borderRadius: radii.lg, textDecoration: "none" }}
                    >
                      פתח PDF בכרטיסייה חדשה ↗
                    </a>
                  </div>
                  <iframe
                    src={url}
                    title="PDF viewer"
                    style={{ width: "100%", height: 420, border: "1px solid rgba(139,111,71,0.15)", borderRadius: radii.lg, background: "#fff" }}
                  />
                </div>
              );
            }

            if (isDocx) {
              const encoded = encodeURIComponent(url);
              // Office Online viewer (primary), Google Docs viewer (fallback in title attr)
              const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`;
              return (
                <div style={{ marginBottom: "0.5rem" }}>
                  <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textSubtle, marginBottom: "0.4rem", fontWeight: 600 }}>
                    תצוגת מסמך Word:
                  </div>
                  <iframe
                    src={officeUrl}
                    title="Word viewer"
                    style={{ width: "100%", height: 320, border: "1px solid rgba(139,111,71,0.15)", borderRadius: radii.lg }}
                  />
                </div>
              );
            }

            return null;
          })()}

          {/* שיעורים מומלצים באותו נושא */}
          <RecommendedTeacherLessons
            lessonId={lesson.id}
            seriesId={seriesId || null}
            bibleBook={bibleBook ?? null}
            contentType={contentType ?? null}
            rabbiId={rabbiId ?? null}
            variant="modal"
            onNavigate={onClose}
          />
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
            const label = lower.includes('.pdf') ? 'הורד PDF' : lower.includes('.doc') ? 'הורד Word' : isVideoFile(lower) ? 'הורד וידאו' : 'הורד קובץ';
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
