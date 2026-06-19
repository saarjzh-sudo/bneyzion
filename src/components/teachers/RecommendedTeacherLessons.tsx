/**
 * RecommendedTeacherLessons — "שיעורים מומלצים באותו נושא"
 *
 * Shared block shown at the bottom of:
 *   - TeacherLessonModal (popup quick-view)  → variant="modal", onNavigate closes the modal
 *   - TeachersLessonPage (full lesson page)   → variant="page"
 *
 * Pulls topically-related teacher lessons via useTeacherRecommendations.
 * Renders nothing while loading or when there are no recommendations.
 *
 * Iron rules:
 *   - RTL logical CSS only
 *   - Olive (Teachers Wing) palette
 *   - Each card links to /teachers/lesson/:id
 */
import { Link } from "react-router-dom";
import { Headphones, Video, FileDown, FileText, Sparkles } from "lucide-react";
import { colors, fonts, radii, shadows } from "@/lib/designTokens";
import {
  useTeacherRecommendations,
  type TeacherRecOpts,
} from "@/hooks/useTeacherRecommendations";

interface Props extends Omit<TeacherRecOpts, "limit"> {
  variant?: "modal" | "page";
  /** Called when a recommendation is clicked (e.g. to close the modal). */
  onNavigate?: () => void;
}

function MediaIcon({ r }: { r: { videoUrl: string | null; audioUrl: string | null; attachmentUrl: string | null } }) {
  if (r.videoUrl) return <Video size={12} style={{ color: colors.oliveMain }} />;
  if (r.audioUrl) return <Headphones size={12} style={{ color: colors.goldDark }} />;
  if (r.attachmentUrl) return <FileDown size={12} style={{ color: colors.textSubtle }} />;
  return <FileText size={12} style={{ color: colors.textSubtle }} />;
}

export default function RecommendedTeacherLessons({
  variant = "page",
  onNavigate,
  ...recOpts
}: Props) {
  const { data, isLoading } = useTeacherRecommendations({ ...recOpts, limit: 6 });

  if (isLoading || !data || data.length === 0) return null;

  const isModal = variant === "modal";

  return (
    <section
      dir="rtl"
      style={{
        marginTop: isModal ? "1.25rem" : "2.5rem",
        paddingTop: "1.25rem",
        borderTop: "1px solid rgba(139,111,71,0.14)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.9rem" }}>
        <Sparkles size={15} style={{ color: colors.goldDark }} />
        <h3
          style={{
            fontFamily: fonts.display,
            fontSize: isModal ? "0.95rem" : "1.05rem",
            fontWeight: 800,
            color: colors.oliveDark,
            margin: 0,
          }}
        >
          שיעורים מומלצים באותו נושא
        </h3>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isModal
            ? "repeat(auto-fill, minmax(180px, 1fr))"
            : "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {data.map((r) => (
          <Link
            key={r.id}
            to={`/teachers/lesson/${r.id}`}
            onClick={onNavigate}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                background: "white",
                borderRadius: radii.lg,
                border: "1px solid rgba(139,111,71,0.1)",
                boxShadow: shadows.cardSoft,
                padding: "0.7rem 0.8rem",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
                cursor: "pointer",
                transition: "all 0.16s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.goldDark;
                e.currentTarget.style.boxShadow = shadows.cardHover;
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(139,111,71,0.1)";
                e.currentTarget.style.boxShadow = shadows.cardSoft;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {r.contentType && (
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.56rem",
                    color: colors.oliveDark,
                    background: "rgba(74,90,46,0.1)",
                    padding: "0.08rem 0.4rem",
                    borderRadius: radii.pill,
                    fontWeight: 700,
                    alignSelf: "flex-start",
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.contentType}
                </span>
              )}
              <div
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  color: colors.textDark,
                  lineHeight: 1.35,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {r.title}
              </div>
              {(r.rabbiName || r.seriesTitle) && (
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.66rem",
                    color: colors.goldDark,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.rabbiName || r.seriesTitle}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "auto",
                  paddingTop: "0.4rem",
                }}
              >
                <MediaIcon r={r} />
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.66rem",
                    color: colors.oliveMain,
                    fontWeight: 600,
                  }}
                >
                  לתוכן המלא ←
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
