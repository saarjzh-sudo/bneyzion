/**
 * /design-portal-subscriber — Subscriber's personal area v2.
 *
 * Changes vs v1:
 *   - Uses useUserAccess("program:weekly-chapter") for real access check
 *   - Shows "not a subscriber" gating when user has no access
 *   - Added "הקורסים שלי" section with book progress (Drive-based structure)
 *   - Subscription model updated: single tier ₪110/month direct-debit
 *   - No "upgrade to lifetime" upsell (no longer relevant)
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  Clock,
  Heart,
  Calendar,
  Settings,
  Loader2,
  Play,
  TrendingUp,
  Lock,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Headphones,
  FileText,
  Presentation,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import {
  colors,
  fonts,
  gradients,
  radii,
  shadows,
  getSeriesCoverImage,
  formatDuration,
  lessonTypeLabel,
} from "@/lib/designTokens";
import { useTopSeries } from "@/hooks/useTopSeries";
import { useLessonsBySeries } from "@/hooks/useLessonsBySeries";
import { useUserAccess } from "@/hooks/useUserAccess";

// ── Mock subscriber state (shown when user has access) ──────────────────
const SUBSCRIBER_STATS = {
  weeksActive: 12,
  hoursListened: 11,
  chaptersCompleted: 8,
  dedications: 3,
};

// ── Drive-derived course catalog (חגי/זכריה/מלאכי) ─────────────────────
const PROGRAM_BOOKS = [
  {
    name: "חגי",
    totalChapters: 2,
    completedChapters: 2,
    status: "completed" as const,
    chapters: [
      { name: "פרק א", hasVideo: true, hasAudio: true, hasPdf: true, completed: true },
      { name: "פרק ב", hasVideo: true, hasAudio: true, hasPdf: true, completed: true },
    ],
  },
  {
    name: "זכריה",
    totalChapters: 14,
    completedChapters: 6,
    status: "in_progress" as const,
    chapters: [
      { name: "פרק א", hasVideo: true, hasAudio: true, hasPdf: true, completed: true },
      { name: "פרק ב", hasVideo: true, hasAudio: true, hasPdf: true, completed: true },
      { name: "פרק ג", hasVideo: true, hasAudio: true, hasPdf: true, completed: true },
      { name: "פרק ד", hasVideo: true, hasAudio: true, hasPdf: true, completed: true },
      { name: "פרק ה", hasVideo: true, hasAudio: true, hasPdf: true, completed: true },
      { name: "פרק ו", hasVideo: true, hasAudio: true, hasPdf: true, completed: true },
      { name: "פרק ז", hasVideo: true, hasAudio: true, hasPdf: true, completed: false },
      { name: "פרק ח", hasVideo: true, hasAudio: true, hasPdf: true, completed: false },
      { name: "פרק ט", hasVideo: false, hasAudio: true, hasPdf: true, completed: false },
      { name: "פרק י", hasVideo: false, hasAudio: false, hasPdf: true, completed: false },
      { name: "פרק יא", hasVideo: false, hasAudio: false, hasPdf: false, completed: false },
      { name: "פרק יב", hasVideo: false, hasAudio: false, hasPdf: false, completed: false },
      { name: "פרק יג", hasVideo: false, hasAudio: false, hasPdf: false, completed: false },
      { name: "פרק יד", hasVideo: false, hasAudio: false, hasPdf: false, completed: false },
    ],
  },
  {
    name: "מלאכי",
    totalChapters: 3,
    completedChapters: 0,
    status: "upcoming" as const,
    chapters: [
      { name: "פרק א", hasVideo: false, hasAudio: false, hasPdf: false, completed: false },
      { name: "פרק ב", hasVideo: false, hasAudio: false, hasPdf: false, completed: false },
      { name: "פרק ג", hasVideo: false, hasAudio: false, hasPdf: false, completed: false },
    ],
  },
];

export default function DesignPreviewPortalSubscriber() {
  const { data: topSeries = [], isLoading: seriesLoading } = useTopSeries(20);
  const { hasAccess, isLoading: accessLoading, isAuthenticated, user } = useUserAccess("program:weekly-chapter");
  const [expandedBook, setExpandedBook] = useState<number | null>(1); // Start with זכריה open
  // Quick jump to course detail
  const courseDetailUrl = "/design-course/zechariah";

  const currentBook = (topSeries as any[])[0];
  const { data: currentBookLessons = [] } = useLessonsBySeries(currentBook?.id);

  const upNext = (topSeries as any[]).slice(1, 4);

  const isLoading = accessLoading || seriesLoading;

  if (isLoading) {
    return (
      <DesignLayout>
        <div
          style={{
            padding: "10rem 0",
            display: "flex",
            justifyContent: "center",
            background: colors.parchment,
          }}
        >
          <Loader2
            style={{ width: 32, height: 32, color: colors.goldDark, animation: "spin 1s linear infinite" }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DesignLayout>
    );
  }

  // ── Gating: not authenticated or no access ──────────────────────────
  if (!isAuthenticated || !hasAccess) {
    return (
      <DesignLayout>
        <div
          style={{
            minHeight: "80vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: colors.parchment,
            padding: "3rem 1.5rem",
          }}
        >
          <div
            dir="rtl"
            style={{
              maxWidth: 480,
              textAlign: "center",
              background: "white",
              borderRadius: radii.xl,
              padding: "3rem 2.5rem",
              border: `1px solid rgba(139,111,71,0.12)`,
              boxShadow: "0 16px 48px rgba(45,31,14,0.1)",
            }}
          >
            <Lock
              size={40}
              style={{ color: colors.goldDark, margin: "0 auto 1.25rem", opacity: 0.7 }}
            />
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: "1.5rem",
                color: colors.textDark,
                margin: "0 0 0.75rem",
              }}
            >
              {!isAuthenticated ? "יש להתחבר" : "האזור האישי מיועד למנויים"}
            </h2>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "0.92rem",
                lineHeight: 1.8,
                color: colors.textMuted,
                marginBottom: "2rem",
              }}
            >
              {!isAuthenticated
                ? "כדי לגשת לאזור האישי, יש להתחבר עם חשבון Google שלך."
                : "לא נמצא מנוי פעיל לחשבון זה. הצטרף לתוכנית כדי לקבל גישה."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {!isAuthenticated ? (
                <Link
                  to="/auth"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.9rem 1.5rem",
                    borderRadius: radii.lg,
                    background: gradients.goldButton,
                    color: "white",
                    fontFamily: fonts.accent,
                    fontWeight: 700,
                    fontSize: "1rem",
                    textDecoration: "none",
                    boxShadow: shadows.goldGlow,
                  }}
                >
                  התחבר עם Google
                </Link>
              ) : null}

              <Link
                to="/design-megilat-esther"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.9rem 1.5rem",
                  borderRadius: radii.lg,
                  background: !isAuthenticated ? "transparent" : gradients.goldButton,
                  border: !isAuthenticated ? `1.5px solid ${colors.goldDark}` : "none",
                  color: !isAuthenticated ? colors.goldDark : "white",
                  fontFamily: fonts.accent,
                  fontWeight: 700,
                  fontSize: "1rem",
                  textDecoration: "none",
                  boxShadow: !isAuthenticated ? "none" : shadows.goldGlow,
                }}
              >
                <Heart size={15} fill="currentColor" />
                הצטרף לתוכנית — ₪5 להתחלה
              </Link>
            </div>
          </div>
        </div>
      </DesignLayout>
    );
  }

  // ── Authenticated + has access ────────────────────────────────────────
  const currentLesson = (currentBookLessons as any[])[0];
  const totalLessonsInBook = (currentBookLessons as any[]).length;
  const currentLessonIndex = 1;
  const progressPct = totalLessonsInBook ? Math.round((currentLessonIndex / totalLessonsInBook) * 100) : 0;
  const heroImage =
    currentBook?.image_url || getSeriesCoverImage(currentBook?.title || "") || "/images/series-default.png";

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || "חבר";
  const displayInitial = displayName[0] || "כ";
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <DesignLayout>
      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section
        style={{
          background: gradients.warmDark,
          padding: "4rem 1.5rem 6rem",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 80% 30%, rgba(232,213,160,0.1) 0%, transparent 55%)",
          }}
        />
        <div
          dir="rtl"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            position: "relative",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: "2rem",
            alignItems: "center",
          }}
          className="subscriber-hero"
        >
          {/* Avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                border: `3px solid ${colors.goldShimmer}`,
                boxShadow: shadows.goldGlow,
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                background: gradients.goldButton,
                border: `3px solid ${colors.goldShimmer}`,
                boxShadow: shadows.goldGlow,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "2.1rem",
                color: "white",
                flexShrink: 0,
              }}
            >
              {displayInitial}
            </div>
          )}

          {/* Name + status */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.25rem 0.75rem",
                borderRadius: radii.pill,
                background: "rgba(232,213,160,0.15)",
                border: "1px solid rgba(232,213,160,0.3)",
                color: colors.goldShimmer,
                fontFamily: fonts.body,
                fontSize: "0.7rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
              }}
            >
              <Sparkles size={10} />
              מנוי פעיל — הפרק השבועי
            </div>
            <h1
              style={{
                fontFamily: fonts.display,
                fontWeight: 700,
                fontSize: "clamp(1.7rem, 3.2vw, 2.4rem)",
                margin: 0,
                fontStyle: "italic",
                lineHeight: 1.2,
              }}
            >
              שלום {displayName}, מה תרצה ללמוד היום?
            </h1>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "0.88rem",
                color: "rgba(255,255,255,0.65)",
                marginTop: "0.4rem",
              }}
            >
              הפרק השבועי בתנ"ך · חגי, זכריה ומלאכי
            </p>
          </div>

          {/* Settings */}
          <Link
            to="/profile"
            style={{
              padding: "0.65rem 1.15rem",
              borderRadius: radii.lg,
              border: "1.5px solid rgba(232,213,160,0.3)",
              background: "rgba(232,213,160,0.08)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              color: colors.goldShimmer,
              fontFamily: fonts.accent,
              fontWeight: 700,
              fontSize: "0.82rem",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Settings size={13} />
            הגדרות
          </Link>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .subscriber-hero { grid-template-columns: 1fr !important; text-align: center; }
          }
        `}</style>
      </section>

      {/* ─── Continue learning card (overlapping) ────────────────────── */}
      {currentLesson && currentBook && (
        <section style={{ background: colors.parchment, padding: "0 1.5rem" }}>
          <div style={{ maxWidth: 1200, margin: "-4rem auto 0" }}>
            <div
              style={{
                background: "white",
                borderRadius: radii.xl,
                boxShadow: "0 16px 48px rgba(45,31,14,0.15)",
                overflow: "hidden",
                display: "grid",
                gridTemplateColumns: "minmax(260px, 380px) 1fr",
                position: "relative",
                zIndex: 5,
              }}
              dir="rtl"
              className="continue-card-sub"
            >
              <div
                style={{
                  aspectRatio: "16 / 11",
                  background: gradients.mahoganyHero,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <img
                  src={heroImage}
                  alt={currentBook.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.5))",
                  }}
                />
                <button
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.95)",
                    border: "none",
                    color: colors.textDark,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                >
                  <Play size={28} fill="currentColor" />
                </button>
              </div>
              <div
                style={{
                  padding: "2rem 2.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.7rem",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: colors.goldDark,
                    fontWeight: 700,
                    marginBottom: "0.5rem",
                  }}
                >
                  השיעור הבא בתוכנית שלך
                </div>
                <h2
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 800,
                    fontSize: "1.5rem",
                    color: colors.textDark,
                    margin: "0 0 0.5rem",
                    lineHeight: 1.3,
                  }}
                >
                  {currentLesson.title}
                </h2>
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.88rem",
                    color: colors.textMuted,
                    marginBottom: "1.25rem",
                  }}
                >
                  {currentBook.title} · {currentBook.rabbis?.name || ""} ·{" "}
                  {lessonTypeLabel(currentLesson.source_type)}{" "}
                  {currentLesson.duration ? `· ${formatDuration(currentLesson.duration)}` : ""}
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <div
                    style={{
                      height: 6,
                      background: "rgba(139,111,71,0.1)",
                      borderRadius: 3,
                      overflow: "hidden",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <div
                      style={{
                        width: `${progressPct}%`,
                        height: "100%",
                        background: gradients.goldButton,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: fonts.body,
                      fontSize: "0.75rem",
                      color: colors.textSubtle,
                    }}
                  >
                    <span>
                      שיעור {currentLessonIndex} מתוך {totalLessonsInBook}
                    </span>
                    <span style={{ color: colors.goldDark, fontWeight: 700 }}>{progressPct}% הושלם</span>
                  </div>
                </div>

                <button
                  style={{
                    padding: "0.85rem 1.5rem",
                    borderRadius: radii.md,
                    border: "none",
                    background: gradients.goldButton,
                    color: "white",
                    fontFamily: fonts.accent,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    boxShadow: shadows.goldGlow,
                    alignSelf: "flex-start",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Play size={15} fill="currentColor" />
                  המשך עכשיו
                </button>
              </div>
            </div>
          </div>

          <style>{`
            @media (max-width: 900px) {
              .continue-card-sub { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </section>
      )}

      {/* ─── Stats ────────────────────────────────────────────────────── */}
      <section style={{ background: colors.parchment, padding: "4rem 1.5rem 2rem" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
            gap: "1rem",
          }}
          dir="rtl"
        >
          <StatCard
            icon={<BookOpen size={21} />}
            value={SUBSCRIBER_STATS.chaptersCompleted.toString()}
            label="פרקים הושלמו"
            color={colors.goldDark}
          />
          <StatCard
            icon={<Calendar size={21} />}
            value={SUBSCRIBER_STATS.weeksActive.toString()}
            label="שבועות פעיל"
            color={colors.oliveMain}
          />
          <StatCard
            icon={<Clock size={21} />}
            value={`${SUBSCRIBER_STATS.hoursListened}h`}
            label="שעות לימוד"
            color={colors.tealMain}
          />
          <StatCard
            icon={<Heart size={21} />}
            value={SUBSCRIBER_STATS.dedications.toString()}
            label="הקדשות"
            color="#a52a2a"
          />
        </div>
      </section>

      {/* ─── My courses: book progress ────────────────────────────────── */}
      <section style={{ background: colors.parchment, padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "1.75rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: colors.goldDark,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: "0.3rem",
                }}
              >
                הקורסים שלי
              </div>
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)",
                  color: colors.textDark,
                  margin: 0,
                }}
              >
                הפרק השבועי — חגי, זכריה ומלאכי
              </h2>
            </div>
            <Link
              to={courseDetailUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.65rem 1.25rem",
                borderRadius: radii.md,
                background: gradients.goldButton,
                color: "white",
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "0.85rem",
                textDecoration: "none",
                boxShadow: shadows.goldGlow,
                flexShrink: 0,
              }}
            >
              <Play size={13} fill="currentColor" />
              כנס לתוכנית
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }} dir="rtl">
            {PROGRAM_BOOKS.map((book, idx) => {
              const pct = Math.round((book.completedChapters / book.totalChapters) * 100);
              const statusColor =
                book.status === "completed"
                  ? colors.oliveMain
                  : book.status === "in_progress"
                  ? colors.goldDark
                  : colors.textSubtle;
              const statusLabel =
                book.status === "completed" ? "הושלם" : book.status === "in_progress" ? "בתהליך" : "בקרוב";

              return (
                <div
                  key={book.name}
                  style={{
                    background: "white",
                    borderRadius: radii.xl,
                    border: `1px solid rgba(139,111,71,0.1)`,
                    boxShadow:
                      expandedBook === idx ? "0 8px 24px rgba(139,111,71,0.1)" : shadows.cardSoft,
                    overflow: "hidden",
                  }}
                >
                  {/* Book header */}
                  <button
                    onClick={() => setExpandedBook(expandedBook === idx ? null : idx)}
                    style={{
                      width: "100%",
                      padding: "1.25rem 1.5rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "right",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    {/* Book icon */}
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: radii.md,
                        background:
                          book.status === "completed"
                            ? "rgba(91,110,58,0.12)"
                            : book.status === "in_progress"
                            ? gradients.goldButton
                            : "rgba(139,111,71,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {book.status === "completed" ? (
                        <CheckCircle2 size={20} style={{ color: colors.oliveMain }} />
                      ) : book.status === "in_progress" ? (
                        <BookOpen size={20} style={{ color: "white" }} />
                      ) : (
                        <Lock size={18} style={{ color: colors.textSubtle }} />
                      )}
                    </div>

                    {/* Title + progress */}
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                        <span
                          style={{
                            fontFamily: fonts.display,
                            fontWeight: 800,
                            fontSize: "1.05rem",
                            color: colors.textDark,
                          }}
                        >
                          {book.name}
                        </span>
                        <span
                          style={{
                            padding: "0.15rem 0.55rem",
                            borderRadius: radii.pill,
                            background:
                              book.status === "completed"
                                ? "rgba(91,110,58,0.1)"
                                : book.status === "in_progress"
                                ? "rgba(139,111,71,0.1)"
                                : "rgba(139,111,71,0.05)",
                            color: statusColor,
                            fontFamily: fonts.body,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                          style={{
                            flex: 1,
                            height: 5,
                            background: "rgba(139,111,71,0.1)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background:
                                book.status === "completed" ? colors.oliveMain : gradients.goldButton,
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontFamily: fonts.body,
                            fontSize: "0.73rem",
                            color: colors.textMuted,
                            flexShrink: 0,
                          }}
                        >
                          {book.completedChapters}/{book.totalChapters} פרקים
                        </span>
                      </div>
                    </div>

                    {/* Expand arrow */}
                    <div
                      style={{
                        color: colors.textSubtle,
                        transition: "transform 0.2s",
                        transform: expandedBook === idx ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    >
                      <ChevronRight size={18} />
                    </div>
                  </button>

                  {/* Chapter list */}
                  {expandedBook === idx && (
                    <div
                      style={{
                        borderTop: `1px solid rgba(139,111,71,0.06)`,
                        padding: "0.75rem 1.5rem 1.25rem",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                          gap: "0.5rem",
                        }}
                      >
                        {book.chapters.map((ch) => (
                          <div
                            key={ch.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.6rem",
                              padding: "0.6rem 0.85rem",
                              borderRadius: radii.md,
                              background: ch.completed ? "rgba(91,110,58,0.06)" : colors.parchment,
                              border: `1px solid ${
                                ch.completed ? "rgba(91,110,58,0.12)" : "rgba(139,111,71,0.08)"
                              }`,
                            }}
                          >
                            {ch.completed ? (
                              <CheckCircle2 size={14} style={{ color: colors.oliveMain, flexShrink: 0 }} />
                            ) : ch.hasVideo || ch.hasAudio ? (
                              <Play size={13} style={{ color: colors.goldDark, flexShrink: 0 }} />
                            ) : (
                              <Lock size={12} style={{ color: colors.textSubtle, flexShrink: 0 }} />
                            )}
                            <span
                              style={{
                                fontFamily: fonts.body,
                                fontSize: "0.82rem",
                                color: ch.completed ? colors.oliveMain : ch.hasVideo || ch.hasAudio ? colors.textDark : colors.textSubtle,
                                fontWeight: ch.completed ? 700 : 400,
                                flex: 1,
                              }}
                            >
                              {ch.name}
                            </span>
                            {/* Content type icons */}
                            <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                              {ch.hasVideo && (
                                <span title="וידאו" style={{ color: ch.completed ? colors.oliveMain : colors.goldDark, opacity: 0.7 }}>
                                  <Play size={11} />
                                </span>
                              )}
                              {ch.hasAudio && (
                                <span title="אודיו" style={{ color: ch.completed ? colors.oliveMain : colors.goldDark, opacity: 0.7 }}>
                                  <Headphones size={11} />
                                </span>
                              )}
                              {ch.hasPdf && (
                                <span title="PDF" style={{ color: ch.completed ? colors.oliveMain : colors.goldDark, opacity: 0.7 }}>
                                  <FileText size={11} />
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Up next (from series catalog) ───────────────────────────── */}
      <section style={{ background: colors.parchmentDark, padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            dir="rtl"
            style={{
              marginBottom: "1.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <TrendingUp style={{ width: 19, height: 19, color: colors.oliveMain }} />
            <div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: colors.oliveMain,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                מאגר השיעורים
              </div>
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: "clamp(1.3rem, 2.2vw, 1.65rem)",
                  color: colors.textDark,
                  margin: 0,
                }}
              >
                עוד שיעורים שיעניינו אותך
              </h2>
            </div>
          </div>

          <div
            dir="rtl"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {upNext.map((s) => {
              const cover =
                s.image_url || getSeriesCoverImage(s.title) || "/images/series-default.png";
              return (
                <Link
                  key={s.id}
                  to={`/design-series-page/${s.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      background: "white",
                      borderRadius: radii.lg,
                      overflow: "hidden",
                      border: `1px solid rgba(139,111,71,0.1)`,
                      cursor: "pointer",
                      transition: "all 0.28s",
                      display: "flex",
                      gap: "0.85rem",
                      alignItems: "center",
                      padding: "0.85rem",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    <div
                      style={{
                        width: 76,
                        height: 76,
                        flexShrink: 0,
                        borderRadius: radii.md,
                        overflow: "hidden",
                        background: colors.parchmentDark,
                      }}
                    >
                      <img
                        src={cover}
                        alt={s.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: fonts.display,
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          color: colors.textDark,
                          marginBottom: "0.2rem",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {s.title}
                      </div>
                      <div
                        style={{
                          fontFamily: fonts.body,
                          fontSize: "0.72rem",
                          color: colors.textMuted,
                        }}
                      >
                        {s.rabbis?.name || ""}
                      </div>
                      <div
                        style={{
                          fontFamily: fonts.body,
                          fontSize: "0.72rem",
                          color: colors.goldDark,
                          fontWeight: 600,
                          marginTop: "0.2rem",
                        }}
                      >
                        {s.lesson_count} שיעורים
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: colors.textSubtle, flexShrink: 0 }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Membership status ───────────────────────────────────────── */}
      <section style={{ background: gradients.warmDark, padding: "4rem 1.5rem", color: "white" }}>
        <div dir="rtl" style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
          <Sparkles style={{ width: 28, height: 28, color: colors.goldShimmer, margin: "0 auto 1rem" }} />
          <h2
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "1.6rem",
              margin: "0 0 0.75rem",
              fontStyle: "italic",
            }}
          >
            המנוי שלך פעיל
          </h2>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "0.92rem",
              lineHeight: 1.85,
              color: "rgba(255,255,255,0.65)",
              marginBottom: "1.5rem",
            }}
          >
            חיוב חודשי של ₪110 — ביטול בחינם בכל עת.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.85rem", flexWrap: "wrap" }}>
            <Link
              to="/design-donate"
              style={{
                padding: "0.7rem 1.25rem",
                borderRadius: radii.md,
                background: "transparent",
                border: "1.5px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.8)",
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "0.82rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Heart size={13} />
              תרומה נוספת
            </Link>
            <Link
              to="/contact"
              style={{
                padding: "0.7rem 1.25rem",
                borderRadius: radii.md,
                background: "rgba(232,213,160,0.08)",
                border: "1.5px solid rgba(232,213,160,0.3)",
                color: colors.goldShimmer,
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "0.82rem",
                textDecoration: "none",
              }}
            >
              ביטול מנוי
            </Link>
          </div>
        </div>
      </section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DesignLayout>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: radii.xl,
        padding: "1.4rem 1.25rem",
        border: `1px solid rgba(139,111,71,0.09)`,
        boxShadow: shadows.cardSoft,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, insetInlineEnd: 0, bottom: 0, width: 4, background: color }} />
      <div style={{ display: "flex", justifyContent: "center", color, marginBottom: "0.45rem" }}>
        {icon}
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: "1.7rem",
          color: colors.textDark,
          marginBottom: "0.12rem",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.73rem", color: colors.textMuted }}>
        {label}
      </div>
    </div>
  );
}
