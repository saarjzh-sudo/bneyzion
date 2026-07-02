/**
 * WeeklyUpdatesFeed — "העדכונים שלך השבוע" for the weekly program.
 *
 * Mirrors the rhythm of the הפרק-השבועי WhatsApp group so a learner sees this
 * week's content at a glance, without navigating: the current chapter's three
 * stages — 📄 תכני הבסיס → 📖 הרחבה → 🎥 השיעור והסיכום — each listing the REAL
 * files from community_course_lessons. Enrichment + weekly are gated for
 * non-subscribers (matches WeeklyBookDetail tab gating).
 *
 * Data: useCourseDataWithResources (real). No mock. Owned by T03.
 */
import { Link } from "react-router-dom";
import {
  BookOpen, Sparkles, Video, FileText, Headphones, Film,
  Lock, ChevronLeft, Loader2, CheckCircle2,
} from "lucide-react";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useCourseDataWithResources, type CommunityLesson, type ChapterLayersMulti } from "@/hooks/useCommunity";

const HEB_NUMS = ["א","ב","ג","ד","ה","ו","ז","ח","ט","י","יא","יב","יג","יד","טו","טז","יז","יח","יט","כ","כא","כב","כג","כד"];
const hebNum = (n: number) => HEB_NUMS[n - 1] ?? String(n);

function mediaUrl(l: CommunityLesson) {
  return l.video_url ?? l.audio_url ?? l.attachment_url ?? l.presentation_url ?? null;
}
function MediaIcon({ l }: { l: CommunityLesson }) {
  if (l.video_url) return <Film size={15} />;
  if (l.audio_url) return <Headphones size={15} />;
  return <FileText size={15} />;
}

type StageKey = "base" | "enrichment" | "weekly";
const STAGES: { key: StageKey; title: string; blurb: string; icon: React.ReactNode; accent: string; gated: boolean }[] = [
  { key: "base",       title: "תכני הבסיס",     blurb: "דף הכוונה, ביאור והקלטת הפרק — כמידי שישי",           icon: <BookOpen size={16} />,  accent: colors.goldDark,  gated: false },
  { key: "enrichment", title: "תכני ההרחבה",    blurb: "מאמר העמקה והפרק במבט רחב — לקראת השיעור",           icon: <Sparkles size={16} />,  accent: colors.tealMain,  gated: true  },
  { key: "weekly",     title: "השיעור והסיכום", blurb: "הקלטת השיעור החי, סיכום ותרשים — לאחר המפגש",         icon: <Video size={16} />,     accent: colors.oliveMain, gated: true  },
];

export function WeeklyUpdatesFeed({
  courseId,
  bookSlug,
  bookTitle,
  hasAccess,
}: {
  courseId: string | undefined;
  bookSlug: string | null | undefined;
  bookTitle: string;
  hasAccess: boolean;
}) {
  const { data: courseData, isLoading } = useCourseDataWithResources(courseId);

  if (!courseId || isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "2.5rem 0" }}>
        <Loader2 size={24} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (!courseData) return null;

  // Current chapter = the highest chapter that already has a live-lesson
  // recording ('weekly' layer); if none yet, the highest chapter with any content.
  const chapters = courseData.chapterNumbers;
  const taught = chapters.filter((ch) => (courseData.chapters.get(ch)?.weekly.length ?? 0) > 0);
  const currentChapter = taught.length ? Math.max(...taught) : (chapters.length ? Math.max(...chapters) : null);
  const chapterData: ChapterLayersMulti | null = currentChapter ? courseData.chapters.get(currentChapter) ?? null : null;

  const totalChapters = chapters.length;
  const doneCount = taught.length;
  const pct = totalChapters ? Math.round((doneCount / totalChapters) * 100) : 0;

  const bookHref = `/course/${bookSlug ?? "weekly-chapter"}`;
  const chapterHref = currentChapter ? `${bookHref}?chapter=${currentChapter}` : bookHref;

  return (
    <div dir="rtl">
      {/* Header + progress */}
      <div
        style={{
          background: gradients.warmDark,
          borderRadius: radii.xl,
          padding: "1.5rem 1.75rem",
          marginBottom: "1.25rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 85% 20%, rgba(232,213,160,0.1), transparent 55%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.15em", color: colors.goldShimmer, marginBottom: "0.35rem" }}>
              העדכונים שלך השבוע
            </div>
            <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.3rem", color: "white", margin: 0, fontStyle: "italic" }}>
              {bookTitle}{currentChapter ? ` — פרק ${hebNum(currentChapter)}` : ""}
            </h3>
            <div style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: "rgba(255,255,255,0.6)", marginTop: "0.3rem" }}>
              נלמדו {doneCount} מתוך {totalChapters} פרקים · {pct}% מהספר
            </div>
          </div>
          <Link
            to={chapterHref}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.7rem 1.4rem", borderRadius: radii.lg, background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.88rem", textDecoration: "none", boxShadow: shadows.goldGlow, flexShrink: 0 }}
          >
            כניסה ללימוד <ChevronLeft size={15} />
          </Link>
        </div>
        {/* progress bar */}
        <div dir="ltr" style={{ position: "relative", height: 7, background: "rgba(255,255,255,0.12)", borderRadius: 4, overflow: "hidden", marginTop: "1rem" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: gradients.goldButton, borderRadius: 4 }} />
        </div>
      </div>

      {/* Three stages */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
        {STAGES.map((stage) => {
          const items = (chapterData?.[stage.key] ?? []) as CommunityLesson[];
          const locked = stage.gated && !hasAccess;
          return (
            <div
              key={stage.key}
              style={{
                background: "white",
                borderRadius: radii.xl,
                border: "1px solid rgba(139,111,71,0.1)",
                boxShadow: shadows.cardSoft,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ padding: "1rem 1.2rem", borderBottom: "1px solid rgba(139,111,71,0.07)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ width: 34, height: 34, borderRadius: radii.md, background: `${stage.accent}15`, color: stage.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {stage.icon}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "0.95rem", color: colors.textDark, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    {locked && <Lock size={12} style={{ color: colors.textSubtle }} />}
                    {stage.title}
                  </div>
                  <div style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.textMuted, lineHeight: 1.4 }}>{stage.blurb}</div>
                </div>
              </div>

              <div style={{ padding: "0.6rem 0.7rem", flex: 1 }}>
                {locked ? (
                  <Link to="/chapter-weekly" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", padding: "1.4rem 0.75rem", textDecoration: "none", textAlign: "center" }}>
                    <Lock size={20} style={{ color: stage.accent, opacity: 0.6 }} />
                    <span style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted, lineHeight: 1.5 }}>
                      פתוח למנויי הפרק השבועי
                    </span>
                    <span style={{ fontFamily: fonts.accent, fontSize: "0.75rem", fontWeight: 700, color: stage.accent }}>הצטרפו לתכנית</span>
                  </Link>
                ) : items.length === 0 ? (
                  <div style={{ padding: "1.3rem 0.75rem", textAlign: "center", fontFamily: fonts.body, fontSize: "0.74rem", color: colors.textSubtle }}>
                    יתעדכן בהמשך השבוע
                  </div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {items.map((l) => {
                      const url = mediaUrl(l);
                      const row = (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.5rem 0.6rem", borderRadius: radii.md, width: "100%" }}>
                          <span style={{ color: stage.accent, flexShrink: 0, display: "flex" }}><MediaIcon l={l} /></span>
                          <span style={{ flex: 1, minWidth: 0, fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</span>
                          {url && <ChevronLeft size={13} style={{ color: colors.textSubtle, flexShrink: 0 }} />}
                        </span>
                      );
                      return (
                        <li key={l.id} style={{ background: "rgba(139,111,71,0.03)", borderRadius: radii.md }}>
                          {url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }} title={l.title}>{row}</a>
                          ) : (
                            <Link to={chapterHref} style={{ textDecoration: "none", display: "block" }}>{row}</Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {!locked && items.length > 0 && (
                <div style={{ padding: "0.4rem 1.2rem 0.9rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <CheckCircle2 size={12} style={{ color: stage.accent }} />
                  <span style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.textMuted }}>{items.length} פריטים זמינים</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeeklyUpdatesFeed;
