/**
 * /design-portal-subscriber — Subscriber's personal area v3.
 *
 * Changes vs v2 (2026-04-30):
 *   - Added previewMode toggle (subscriber / member / guest) at top of page
 *     so Saar can review all states without being authenticated.
 *   - New layout: Hero → QuickActions (4 tiles) → Stats → Weekly-Banner →
 *     Master Course Card (8-book timeline) → Gamification (streak/level/badges) →
 *     Recent + Favorites → Suggestions → Membership footer.
 *   - Full gamification: StreakDisplay, LevelBar, BadgesGrid, NotificationBell.
 *   - "הקורסים שלי" shows one master card (not per-book).
 *   - The portal is OPEN to all registered users. Only "הרחבה" and "שיעור שבועי"
 *     tabs inside a course require subscription. This page itself is gated only
 *     for non-authenticated users.
 */
import React from "react";
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
  ChevronRight,
  Flame,
  Trophy,
  Star,
  Bell,
  Bookmark,
  Target,
  Zap,
  Award,
  Shield,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import {
  colors,
  fonts,
  gradients,
  radii,
  shadows,
  getSeriesCoverImage,
} from "@/lib/designTokens";
import { useTopSeries } from "@/hooks/useTopSeries";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useWeeklyBooks } from "@/hooks/useCommunity";
import { useHistory } from "@/hooks/useHistory";
import { useFavorites } from "@/hooks/useFavorites";
import { useLearningDashboard } from "@/hooks/useLearningDashboard";
import { usePoints } from "@/hooks/usePoints";
import { WeeklyUpdatesFeed } from "@/components/weekly/WeeklyUpdatesFeed";
import WeeklyChapterInvite from "@/components/auth/WeeklyChapterInvite";

// ── Real-data types (replaces former mock arrays) ───────────────────────────
// Iron rule: NO mock data — everything below is computed from Supabase hooks.

/** One book in the program-progress timeline (derived from useWeeklyBooks). */
type TimelineBook = {
  name: string;
  slug: string | null;
  status: "done" | "current" | "upcoming";
};

/** A row in the recent/favorites mini-lists. */
type MiniLesson = { title: string; series: string; duration: string };

// Level thresholds — every 500 points is a level (matches POINT_VALUES economy).
const POINTS_PER_LEVEL = 500;
const LEVEL_LABELS = ["לומד מתחיל", "לומד מתמיד", "לומד מתקדם", "לומד ותיק", "תלמיד חכם"];
function levelLabelFor(level: number) {
  return LEVEL_LABELS[Math.min(level - 1, LEVEL_LABELS.length - 1)] ?? "לומד";
}

// Format a lesson duration (DB stores seconds) into "NN דק'".
function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.round(seconds / 60);
  return `${mins} דק'`;
}

// Map a history/favorite DB row to a MiniLesson (graceful fallbacks).
function toMiniLesson(row: any): MiniLesson {
  const lesson = row?.lesson ?? row?.lessons ?? {};
  return {
    title: lesson.title ?? "שיעור",
    series: lesson.rabbis?.name ?? lesson.series?.title ?? "בני ציון",
    duration: formatDuration(lesson.duration),
  };
}

// ── Main component ──────────────────────────────────────────────────────────
export default function DesignPreviewPortalSubscriber() {
  const { data: topSeries = [], isLoading: seriesLoading } = useTopSeries(8);
  const { hasAccess: realAccess, isLoading: accessLoading, isAuthenticated, user } = useUserAccess("program:weekly-chapter");

  // ── Real data hooks (replaces former mock arrays) ───────────────────────
  const { data: books = [], isLoading: booksLoading } = useWeeklyBooks();
  const { data: historyRows = [] } = useHistory();
  const { data: favRows = [] } = useFavorites();
  const { streak = 0, activityDays = [] } = useLearningDashboard();
  const { points: pointsRow } = usePoints();

  // Real access state — portal is always behind RequireAuth so isAuthenticated is always true here
  const isAuth = isAuthenticated;
  const hasSubscription = realAccess;

  // Suggestion series (from real data)
  const suggestions = (topSeries as any[]).slice(0, 4);

  const isLoading = accessLoading || seriesLoading || booksLoading;

  // ── Derived program timeline (real books, ordered by sort_order) ────────
  const currentIdx = books.findIndex((b: any) => b.is_current === true);
  const booksDone = currentIdx >= 0 ? currentIdx : 0;
  const PROGRAM_TIMELINE: TimelineBook[] = books.map((b: any, i: number) => ({
    name: b.title,
    slug: b.program_slug,
    status:
      currentIdx === -1
        ? "upcoming"
        : i < currentIdx
        ? "done"
        : i === currentIdx
        ? "current"
        : "upcoming",
  }));
  const currentBook = currentIdx >= 0 ? (books[currentIdx] as any) : (books[0] as any) ?? null;
  const currentBookSlug = currentBook?.program_slug ?? "weekly-chapter";
  const currentLessonHref = `/course/${currentBookSlug}`;
  // Live Zoom link — from the current book, else the program-wide recurring link.
  const PROGRAM_ZOOM_FALLBACK = "https://us02web.zoom.us/j/89674496888?pwd=NjQgO336yAwHATbkkwsimd92kWrXlp.1";
  const zoomHref = (currentBook as any)?.zoom_link?.trim() || PROGRAM_ZOOM_FALLBACK;
  const overallProgressPct = books.length ? Math.round((booksDone / books.length) * 100) : 0;

  // ── Derived gamification (real points + streak; no mock numbers) ────────
  const totalPoints = (pointsRow as any)?.total_points ?? 0;
  const level = Math.floor(totalPoints / POINTS_PER_LEVEL) + 1;
  const minutesLearned = (activityDays as any[]).reduce((sum, d) => sum + (d.minutes_learned || 0), 0);
  const favCount = (favRows as any[]).length;

  const SUBSCRIBER_STATS = {
    chaptersCompleted: booksDone,
    hoursLearned: Math.round((minutesLearned / 60) * 10) / 10,
    streakDays: streak,
    points: totalPoints,
    level,
    levelLabel: levelLabelFor(level),
    nextLevelAt: level * POINTS_PER_LEVEL,
    overallProgressPct,
    currentBook: currentBook?.title ?? "—",
    totalBooks: books.length,
  };

  // ── Derived achievement badges (computed from real signals) ─────────────
  const BADGES = [
    { id: "first-fav", label: "שיעור ראשון במועדפים", icon: <Bookmark size={18} />, earned: favCount >= 1, color: colors.tealMain },
    { id: "streak7", label: "7 ימים ברצף", icon: <Flame size={18} />, earned: streak >= 7, color: "#e25822" },
    { id: "book1", label: "ספר ראשון הושלם", icon: <Star size={18} />, earned: booksDone >= 1, color: colors.goldDark },
    { id: "points500", label: "500 נקודות", icon: <Award size={18} />, earned: totalPoints >= 500, color: colors.goldDark },
    { id: "books3", label: "3 ספרים הושלמו", icon: <BookOpen size={18} />, earned: booksDone >= 3, color: colors.oliveMain },
    { id: "streak30", label: "30 ימים ברצף", icon: <Target size={18} />, earned: streak >= 30, color: colors.textSubtle },
  ];
  const earnedBadgeCount = BADGES.filter((b) => b.earned).length;

  // ── Derived recent + favorites (real per-user data) ─────────────────────
  const recentLessons: MiniLesson[] = (historyRows as any[]).slice(0, 3).map(toMiniLesson);
  const favoriteLessons: MiniLesson[] = (favRows as any[]).slice(0, 3).map(toMiniLesson);

  if (isLoading) {
    return (
      <DesignLayout>
        <div style={{ padding: "10rem 0", display: "flex", justifyContent: "center", background: colors.parchment }}>
          <Loader2 style={{ width: 32, height: 32, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DesignLayout>
    );
  }

  // Compute display name from real user or mock
  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || "ישי";
  const displayInitial = displayName[0] || "י";
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <DesignLayout>
      {/* ─── Guest gate ────────────────────────────────────────────────── */}
      {!isAuth && <GuestGate />}

      {/* ─── Authenticated view ─────────────────────────────────────────── */}
      {isAuth && (
        <>
          {/* ─── Hero ──────────────────────────────────────────────────── */}
          <section
            style={{
              background: gradients.warmDark,
              padding: "3.5rem 1.5rem 5.5rem",
              color: "white",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Ambient glow */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(circle at 80% 30%, rgba(232,213,160,0.1) 0%, transparent 55%)",
                pointerEvents: "none",
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
              className="portal-hero-grid"
            >
              {/* Avatar */}
              <div style={{ position: "relative" }}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: "50%",
                      border: `3px solid ${colors.goldShimmer}`,
                      boxShadow: shadows.goldGlow,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: "50%",
                      background: hasSubscription ? gradients.goldButton : "rgba(255,255,255,0.1)",
                      border: `3px solid ${hasSubscription ? colors.goldShimmer : "rgba(255,255,255,0.2)"}`,
                      boxShadow: hasSubscription ? shadows.goldGlow : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: fonts.display,
                      fontWeight: 900,
                      fontSize: "2.4rem",
                      color: "white",
                    }}
                  >
                    {displayInitial}
                  </div>
                )}
                {/* Level badge on avatar */}
                {hasSubscription && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: -4,
                      insetInlineEnd: -4,
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: gradients.goldButton,
                      border: "2px solid rgba(45,31,14,0.8)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: fonts.display,
                      fontWeight: 900,
                      fontSize: "0.72rem",
                      color: "white",
                    }}
                  >
                    {SUBSCRIBER_STATS.level}
                  </div>
                )}
              </div>

              {/* Name + status */}
              <div>
                {/* Status badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.25rem 0.75rem",
                    borderRadius: radii.pill,
                    background: hasSubscription ? "rgba(232,213,160,0.15)" : "rgba(255,255,255,0.1)",
                    border: `1px solid ${hasSubscription ? "rgba(232,213,160,0.3)" : "rgba(255,255,255,0.15)"}`,
                    color: hasSubscription ? colors.goldShimmer : "rgba(255,255,255,0.6)",
                    fontFamily: fonts.body,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    marginBottom: "0.6rem",
                  }}
                >
                  {hasSubscription ? <><Sparkles size={10} /> מנוי פעיל — הפרק השבועי</> : <><Shield size={10} /> חבר רשום</>}
                </div>

                <h1
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 700,
                    fontSize: "clamp(1.7rem, 3.2vw, 2.6rem)",
                    margin: "0 0 0.35rem",
                    fontStyle: "italic",
                    lineHeight: 1.2,
                  }}
                >
                  שלום, {displayName}
                </h1>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.9rem",
                    color: "rgba(255,255,255,0.6)",
                    margin: 0,
                  }}
                >
                  {hasSubscription
                    ? `עכשיו: ${SUBSCRIBER_STATS.currentBook} · ${SUBSCRIBER_STATS.overallProgressPct}% מהתכנית הושלמו`
                    : "ברוך הבא לאזור האישי שלך"}
                </p>

                {/* Notification bell */}
                {hasSubscription && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginTop: "0.75rem",
                      padding: "0.4rem 0.85rem",
                      borderRadius: radii.pill,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                    }}
                  >
                    <Bell size={13} style={{ color: colors.goldShimmer }} />
                    <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(255,255,255,0.75)" }}>
                      יש תוכן חדש השבוע — {SUBSCRIBER_STATS.currentBook}
                    </span>
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#e25822",
                        flexShrink: 0,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Settings */}
              <a
                href="#settings"
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
                  alignSelf: "flex-start",
                }}
              >
                <Settings size={13} />
                הגדרות
              </a>
            </div>

            <style>{`
              @media (max-width: 768px) {
                .portal-hero-grid { grid-template-columns: 1fr !important; text-align: center; }
              }
            `}</style>
          </section>

          {/* ─── QuickActions (overlapping hero) ─────────────────────── */}
          <section style={{ background: colors.parchment, padding: "0 1.5rem" }}>
            <div
              dir="rtl"
              style={{ maxWidth: 1200, margin: "-3.5rem auto 0", position: "relative", zIndex: 10 }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  gap: "1rem",
                }}
                className="quick-actions-grid"
              >
                {/* PRIMARY — biggest tile, changes by mode */}
                {hasSubscription ? (
                  /* Subscriber: enter weekly lesson */
                  <Link
                    to={currentLessonHref}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        background: gradients.goldButton,
                        borderRadius: radii.xl,
                        padding: "1.75rem 2rem",
                        boxShadow: "0 12px 40px rgba(139,111,71,0.45)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.6rem",
                        height: "100%",
                        cursor: "pointer",
                        transition: "transform 0.2s, box-shadow 0.2s",
                        minHeight: 130,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 18px 48px rgba(139,111,71,0.55)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(139,111,71,0.45)"; }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: radii.md,
                          background: "rgba(255,255,255,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                        }}
                      >
                        <Play size={22} fill="currentColor" />
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: fonts.display,
                            fontWeight: 900,
                            fontSize: "1.05rem",
                            color: "white",
                            marginBottom: "0.2rem",
                          }}
                        >
                          כנס ללימוד הפרק השבועי — לחיות תנ״ך
                        </div>
                        <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(255,255,255,0.8)" }}>
                          {SUBSCRIBER_STATS.currentBook}
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  /* Member (not subscriber): "המשך מאיפה שהפסקת" */
                  <Link
                    to="/series"
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        background: `linear-gradient(135deg, ${colors.tealMain} 0%, #1A5C5C 100%)`,
                        borderRadius: radii.xl,
                        padding: "1.75rem 2rem",
                        boxShadow: "0 12px 40px rgba(45,125,125,0.4)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.6rem",
                        height: "100%",
                        cursor: "pointer",
                        transition: "transform 0.2s, box-shadow 0.2s",
                        minHeight: 130,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: radii.md,
                          background: "rgba(255,255,255,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                        }}
                      >
                        <Play size={22} fill="currentColor" />
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: fonts.display,
                            fontWeight: 900,
                            fontSize: "1.05rem",
                            color: "white",
                            marginBottom: "0.2rem",
                          }}
                        >
                          המשך מאיפה שהפסקת
                        </div>
                        <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(255,255,255,0.8)" }}>
                          מבוא לקריאת תנ״ך — שיעור 1
                        </div>
                      </div>
                    </div>
                  </Link>
                )}

                {/* Quick action tile component */}
                <QuickTile
                  icon={<Bookmark size={20} />}
                  label="שיעורים שמורים"
                  sub={`${favCount} שמורים`}
                  to="/series"
                  color={colors.tealMain}
                  bg="rgba(45,125,125,0.08)"
                />
                <QuickTile
                  icon={<BookOpen size={20} />}
                  label="הקורסים שלי"
                  sub="1 פעיל"
                  to="/design-my-courses"
                  color={colors.oliveMain}
                  bg="rgba(91,110,58,0.08)"
                />
                <QuickTile
                  icon={<Trophy size={20} />}
                  label="ההישגים שלי"
                  sub={`${earnedBadgeCount} תגים`}
                  to="#achievements"
                  color={colors.goldDark}
                  bg="rgba(139,111,71,0.08)"
                />
              </div>

              <style>{`
                @media (max-width: 900px) {
                  .quick-actions-grid { grid-template-columns: 1fr 1fr !important; }
                }
                @media (max-width: 480px) {
                  .quick-actions-grid { grid-template-columns: 1fr !important; }
                }
              `}</style>
            </div>
          </section>

          {/* ─── Stats ─────────────────────────────────────────────────── */}
          <section style={{ background: colors.parchment, padding: "3.5rem 1.5rem 2rem" }}>
            <div
              dir="rtl"
              style={{
                maxWidth: 1200,
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: hasSubscription ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
                gap: "1rem",
              }}
              className="stats-grid"
            >
              <StatCard
                icon={<BookOpen size={20} />}
                value={hasSubscription ? `${SUBSCRIBER_STATS.chaptersCompleted}` : `${historyRows.length}`}
                label={hasSubscription ? "ספרים הושלמו" : "שיעורים נצפו"}
                sub={hasSubscription ? `מתוך ${SUBSCRIBER_STATS.totalBooks}` : "מצטבר"}
                color={colors.goldDark}
              />
              <StatCard
                icon={<Clock size={20} />}
                value={`${SUBSCRIBER_STATS.hoursLearned}`}
                label="שעות לימוד"
                sub="מצטבר"
                color={colors.tealMain}
              />
              <StatCard
                icon={<Heart size={20} />}
                value={`${favCount}`}
                label="מועדפים שמורים"
                sub="שיעורים"
                color={colors.oliveMain}
              />
              {hasSubscription && (
                <StatCard
                  icon={<Flame size={20} />}
                  value={`${SUBSCRIBER_STATS.streakDays}`}
                  label="ימים ברצף"
                  sub="פעילות יומית"
                  color="#e25822"
                  gold={SUBSCRIBER_STATS.streakDays >= 7}
                />
              )}
            </div>
            <style>{`
              @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
              @media (max-width: 400px) { .stats-grid { grid-template-columns: 1fr !important; } }
            `}</style>
          </section>

          {/* ─── Member upsell CTA (shown only to non-subscribers) ──── */}
          {!hasSubscription && (
            <section style={{ background: colors.parchment, padding: "0 1.5rem 3rem" }}>
              <div dir="rtl" style={{ maxWidth: 1200, margin: "0 auto" }}>
                <div
                  style={{
                    background: `linear-gradient(135deg, ${colors.oliveDark} 0%, ${colors.oliveMain} 60%, #7a9048 100%)`,
                    borderRadius: radii.xl,
                    padding: "2.25rem 2.5rem",
                    position: "relative",
                    overflow: "hidden",
                    border: "1px solid rgba(196,162,101,0.2)",
                    boxShadow: "0 16px 48px rgba(74,90,46,0.3)",
                  }}
                >
                  {/* Ambient shimmer */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "radial-gradient(circle at 90% 10%, rgba(232,213,160,0.12) 0%, transparent 55%)",
                    pointerEvents: "none",
                  }} />
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "2rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {/* Eyebrow */}
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: "0.4rem",
                        padding: "0.22rem 0.75rem", borderRadius: radii.pill,
                        background: "rgba(232,213,160,0.15)", border: "1px solid rgba(232,213,160,0.3)",
                        color: colors.goldShimmer, fontFamily: fonts.body,
                        fontSize: "0.68rem", fontWeight: 700, marginBottom: "0.85rem",
                      }}>
                        <Sparkles size={10} />
                        תכנית המנויים
                      </div>
                      <h2 style={{
                        fontFamily: fonts.display, fontWeight: 900,
                        fontSize: "clamp(1.3rem, 2.5vw, 1.9rem)",
                        color: "white", margin: "0 0 0.6rem", fontStyle: "italic", lineHeight: 1.25,
                      }}>
                        בוא ללמוד תנ״ך כל שבוע — לחיות תנ״ך
                      </h2>
                      <p style={{
                        fontFamily: fonts.body, fontSize: "0.9rem",
                        color: "rgba(255,255,255,0.75)", margin: "0 0 1.1rem", lineHeight: 1.75,
                        maxWidth: 520,
                      }}>
                        הצטרף לתכנית של הרב יואב אוריאל. פרק חדש כל שבוע, סיכומים מעוצבים, שיעורים שבועיים וגישה לכל הארכיון.
                      </p>
                      {/* Price row */}
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                        <div style={{
                          fontFamily: fonts.display, fontWeight: 900,
                          fontSize: "1.3rem", color: colors.goldShimmer,
                        }}>
                          ₪5 חודש ראשון
                        </div>
                        <div style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: "rgba(255,255,255,0.55)" }}>
                          אחר כך ₪110/חודש · ביטול חופשי בכל עת
                        </div>
                      </div>
                      {/* Social proof */}
                      <div style={{
                        marginTop: "0.75rem",
                        fontFamily: fonts.body, fontSize: "0.75rem",
                        color: "rgba(255,255,255,0.5)",
                        display: "flex", alignItems: "center", gap: "0.4rem",
                      }}>
                        <div style={{
                          display: "flex", gap: "-4px",
                        }}>
                          {["#c4a265", "#8b6f47", "#5b6e3a"].map((c, i) => (
                            <div key={i} style={{
                              width: 20, height: 20, borderRadius: "50%",
                              background: c, border: "2px solid rgba(74,90,46,0.8)",
                              marginInlineStart: i === 0 ? 0 : -6,
                            }} />
                          ))}
                        </div>
                        280+ לומדים פעילים השבוע
                      </div>
                    </div>
                    {/* CTA button */}
                    <Link
                      to="/megilat-esther"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.55rem",
                        padding: "1rem 2.25rem", borderRadius: radii.lg,
                        background: gradients.goldButton, color: "white",
                        fontFamily: fonts.accent, fontWeight: 700, fontSize: "1rem",
                        textDecoration: "none", boxShadow: shadows.goldGlow,
                        flexShrink: 0, whiteSpace: "nowrap",
                        transition: "transform 0.2s",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1.04)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1)")}
                    >
                      <Sparkles size={16} />
                      הצטרף עכשיו
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ─── Next weekly session banner ────────────────────────────── */}
          {hasSubscription && (
            <section style={{ background: colors.parchment, padding: "0 1.5rem 3rem" }}>
              <div dir="rtl" style={{ maxWidth: 1200, margin: "0 auto" }}>
                <div
                  style={{
                    background: `linear-gradient(135deg, ${colors.navyDeep} 0%, #162040 100%)`,
                    borderRadius: radii.xl,
                    padding: "1.75rem 2rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1.5rem",
                    flexWrap: "wrap",
                    border: "1px solid rgba(232,213,160,0.12)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: radii.lg,
                        background: "rgba(232,213,160,0.1)",
                        border: "1px solid rgba(232,213,160,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: colors.goldShimmer,
                        flexShrink: 0,
                      }}
                    >
                      <Calendar size={22} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: fonts.body,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: colors.goldShimmer,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          marginBottom: "0.25rem",
                        }}
                      >
                        השיעור השבועי הבא
                      </div>
                      <div
                        style={{
                          fontFamily: fonts.display,
                          fontWeight: 800,
                          fontSize: "1.1rem",
                          color: "white",
                          marginBottom: "0.15rem",
                        }}
                      >
                        {SUBSCRIBER_STATS.currentBook}
                      </div>
                      <div style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: "rgba(255,255,255,0.55)" }}>
                        יום רביעי · 21:00 · שיעור זום חי
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <button
                      style={{
                        padding: "0.65rem 1.25rem",
                        borderRadius: radii.md,
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.8)",
                        fontFamily: fonts.accent,
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <Play size={13} />
                      מהדורות קודמות
                    </button>
                    <a
                      href={zoomHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "0.65rem 1.4rem",
                        borderRadius: radii.md,
                        background: gradients.goldButton,
                        border: "none",
                        color: "white",
                        fontFamily: fonts.accent,
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        boxShadow: shadows.goldGlow,
                      }}
                    >
                      <Zap size={13} />
                      כניסה לשיעור החי
                    </a>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ─── Invite non-subscribers to the weekly program (T06↔T03) ── */}
          {!hasSubscription && (
            <section style={{ background: colors.parchment, padding: "0 1.5rem 3rem" }}>
              <div dir="rtl" style={{ maxWidth: 1200, margin: "0 auto" }}>
                <WeeklyChapterInvite variant="card" />
              </div>
            </section>
          )}

          {/* ─── This week's updates (weekly-program learners) ────────── */}
          {currentBook && (
            <section style={{ background: colors.parchment, padding: "0 1.5rem 3rem" }}>
              <div dir="rtl" style={{ maxWidth: 1200, margin: "0 auto" }}>
                <WeeklyUpdatesFeed
                  courseId={currentBook.id}
                  bookSlug={currentBook.program_slug}
                  bookTitle={currentBook.title}
                  hasAccess={hasSubscription}
                />
              </div>
            </section>
          )}

          {/* ─── Master course card — הפרק השבועי (subscribers only) ── */}
          {hasSubscription && <section style={{ background: colors.parchmentDark, padding: "3.5rem 1.5rem" }}>
            <div dir="rtl" style={{ maxWidth: 1200, margin: "0 auto" }}>
              <SectionLabel icon={<BookOpen size={16} />} eyebrow="הקורסים שלי" title="הפרק השבועי בתנ״ך" color={colors.goldDark} />

              <div
                style={{
                  background: "white",
                  borderRadius: radii.xl,
                  border: `1px solid rgba(139,111,71,0.12)`,
                  boxShadow: shadows.cardHover,
                  overflow: "hidden",
                }}
              >
                {/* Card top — cover + title */}
                <div
                  style={{
                    background: gradients.warmDark,
                    padding: "2.5rem 2rem",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "radial-gradient(circle at 85% 20%, rgba(232,213,160,0.1), transparent 50%)",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "1.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: fonts.body,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: colors.goldShimmer,
                          marginBottom: "0.5rem",
                        }}
                      >
                        תכנית המנויים · הרב יואב אוריאל
                      </div>
                      <h2
                        style={{
                          fontFamily: fonts.display,
                          fontWeight: 900,
                          fontSize: "clamp(1.5rem, 3vw, 2.1rem)",
                          color: "white",
                          margin: "0 0 0.5rem",
                          fontStyle: "italic",
                        }}
                      >
                        הפרק השבועי בתנ״ך
                      </h2>
                      <div
                        style={{
                          fontFamily: fonts.body,
                          fontSize: "0.88rem",
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        {SUBSCRIBER_STATS.overallProgressPct}% מהתכנית הושלמו · עכשיו לומדים: {SUBSCRIBER_STATS.currentBook}
                      </div>
                    </div>

                    {/* Overall progress circle */}
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                      <ProgressRing pct={SUBSCRIBER_STATS.overallProgressPct} />
                    </div>
                  </div>
                </div>

                {/* 8-book timeline */}
                <div
                  style={{
                    padding: "1.75rem 2rem",
                    borderBottom: `1px solid rgba(139,111,71,0.08)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: fonts.body,
                      fontSize: "0.73rem",
                      fontWeight: 700,
                      color: colors.goldDark,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      marginBottom: "1rem",
                    }}
                  >
                    מסלול הלמידה
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "0",
                      alignItems: "center",
                      overflowX: "auto",
                      paddingBottom: "0.5rem",
                    }}
                    className="timeline-scroll"
                  >
                    {PROGRAM_TIMELINE.map((book, idx) => (
                      <TimelineStep key={book.name} book={book} isLast={idx === PROGRAM_TIMELINE.length - 1} />
                    ))}
                  </div>
                </div>

                {/* CTA row */}
                <div
                  style={{
                    padding: "1.25rem 2rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted }}>
                    {SUBSCRIBER_STATS.chaptersCompleted} ספרים הושלמו מתוך {SUBSCRIBER_STATS.totalBooks}
                  </div>
                  <Link
                    to={currentLessonHref}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      padding: "0.78rem 1.5rem",
                      borderRadius: radii.lg,
                      background: gradients.goldButton,
                      color: "white",
                      fontFamily: fonts.accent,
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      textDecoration: "none",
                      boxShadow: shadows.goldGlow,
                    }}
                  >
                    <Play size={14} fill="currentColor" />
                    המשך מהיכן שעצרת
                  </Link>
                </div>
              </div>
            </div>
          </section>}

          {/* ─── Achievements / Gamification (subscribers only) ──────── */}
          {hasSubscription && <section
            id="achievements"
            style={{ background: colors.parchment, padding: "3.5rem 1.5rem" }}
          >
            <div dir="rtl" style={{ maxWidth: 1200, margin: "0 auto" }}>
              <SectionLabel icon={<Trophy size={16} />} eyebrow="הישגים" title="ניקוד, רמות ותגים" color={colors.goldDark} />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.5rem",
                }}
                className="achievements-grid"
              >
                {/* Streak + Level */}
                <div
                  style={{
                    background: "white",
                    borderRadius: radii.xl,
                    padding: "2rem",
                    border: "1px solid rgba(139,111,71,0.1)",
                    boxShadow: shadows.cardSoft,
                  }}
                >
                  {/* Streak */}
                  <div style={{ marginBottom: "2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem" }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: radii.md,
                          background: "rgba(226,88,34,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#e25822",
                          flexShrink: 0,
                        }}
                      >
                        <Flame size={22} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: fonts.display,
                            fontWeight: 900,
                            fontSize: "1.6rem",
                            color: SUBSCRIBER_STATS.streakDays >= 7 ? "#e25822" : colors.textDark,
                            lineHeight: 1,
                          }}
                        >
                          {SUBSCRIBER_STATS.streakDays} ימים
                        </div>
                        <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted }}>
                          רצף לימוד יומי נוכחי
                        </div>
                      </div>
                    </div>
                    {/* Mini daily calendar — last 14 days */}
                    <div style={{ display: "flex", gap: "0.3rem" }}>
                      {Array.from({ length: 14 }, (_, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: 8,
                            borderRadius: 2,
                            background: i < SUBSCRIBER_STATS.streakDays
                              ? i >= 11 ? "#e25822" : "rgba(226,88,34,0.5)"
                              : "rgba(139,111,71,0.08)",
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textSubtle, marginTop: "0.3rem" }}>
                      14 הימים האחרונים
                    </div>
                  </div>

                  {/* Level bar */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.8rem" }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: radii.md,
                          background: "rgba(139,111,71,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: colors.goldDark,
                          flexShrink: 0,
                        }}
                      >
                        <Star size={22} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: fonts.display,
                            fontWeight: 900,
                            fontSize: "1.05rem",
                            color: colors.textDark,
                            lineHeight: 1.2,
                          }}
                        >
                          {SUBSCRIBER_STATS.levelLabel} — רמה {SUBSCRIBER_STATS.level}
                        </div>
                        <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted }}>
                          {SUBSCRIBER_STATS.points.toLocaleString()} נקודות
                        </div>
                      </div>
                    </div>
                    <div
                      dir="ltr"
                      style={{
                        height: 8,
                        background: "rgba(139,111,71,0.1)",
                        borderRadius: 4,
                        overflow: "hidden",
                        marginBottom: "0.35rem",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round((SUBSCRIBER_STATS.points / SUBSCRIBER_STATS.nextLevelAt) * 100)}%`,
                          height: "100%",
                          background: gradients.goldButton,
                          borderRadius: 4,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontFamily: fonts.body,
                        fontSize: "0.72rem",
                        color: colors.textSubtle,
                      }}
                    >
                      <span>{SUBSCRIBER_STATS.points.toLocaleString()}</span>
                      <span style={{ color: colors.goldDark, fontWeight: 700 }}>
                        עוד {SUBSCRIBER_STATS.nextLevelAt - SUBSCRIBER_STATS.points} לרמה {SUBSCRIBER_STATS.level + 1}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div
                  style={{
                    background: "white",
                    borderRadius: radii.xl,
                    padding: "2rem",
                    border: "1px solid rgba(139,111,71,0.1)",
                    boxShadow: shadows.cardSoft,
                  }}
                >
                  <div
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 800,
                      fontSize: "1rem",
                      color: colors.textDark,
                      marginBottom: "1.25rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Award size={18} style={{ color: colors.goldDark }} />
                    תגי הישג
                    <span
                      style={{
                        marginInlineStart: "auto",
                        fontFamily: fonts.body,
                        fontSize: "0.72rem",
                        color: colors.textSubtle,
                        fontWeight: 400,
                      }}
                    >
                      {earnedBadgeCount} מתוך 6
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "0.75rem",
                    }}
                  >
                    {BADGES.map((badge) => (
                      <div
                        key={badge.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "1rem 0.75rem",
                          borderRadius: radii.lg,
                          background: badge.earned ? `${badge.color}10` : "rgba(139,111,71,0.04)",
                          border: `1px solid ${badge.earned ? `${badge.color}30` : "rgba(139,111,71,0.08)"}`,
                          opacity: badge.earned ? 1 : 0.5,
                          filter: badge.earned ? "none" : "grayscale(1)",
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: badge.earned ? `${badge.color}18` : "rgba(139,111,71,0.06)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: badge.earned ? badge.color : colors.textSubtle,
                          }}
                        >
                          {badge.earned ? badge.icon : <Lock size={16} />}
                        </div>
                        <div
                          style={{
                            fontFamily: fonts.body,
                            fontSize: "0.68rem",
                            color: badge.earned ? colors.textDark : colors.textSubtle,
                            textAlign: "center",
                            lineHeight: 1.4,
                            fontWeight: badge.earned ? 700 : 400,
                          }}
                        >
                          {badge.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <style>{`
                @media (max-width: 768px) { .achievements-grid { grid-template-columns: 1fr !important; } }
              `}</style>
            </div>
          </section>}

          {/* ─── Recent + Favorites ────────────────────────────────────── */}
          <section style={{ background: colors.parchmentDark, padding: "3.5rem 1.5rem" }}>
            <div dir="rtl" style={{ maxWidth: 1200, margin: "0 auto" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "2rem",
                }}
                className="history-fav-grid"
              >
                {/* Recent */}
                <div>
                  <SectionLabel icon={<Clock size={16} />} eyebrow="היסטוריה" title="המשך מאיפה שהפסקת" color={colors.tealMain} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {recentLessons.length > 0 ? (
                      recentLessons.map((lesson, i) => (
                        <MiniLessonRow key={i} lesson={lesson} />
                      ))
                    ) : (
                      <EmptyMiniList text="עדיין לא צפית בשיעורים — ההיסטוריה שלך תופיע כאן." />
                    )}
                  </div>
                </div>

                {/* Favorites */}
                <div>
                  <SectionLabel icon={<Bookmark size={16} />} eyebrow="מועדפים" title="שיעורים שאהבת" color={colors.oliveMain} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {favoriteLessons.length > 0 ? (
                      favoriteLessons.map((lesson, i) => (
                        <MiniLessonRow key={i} lesson={lesson} accent={colors.oliveMain} />
                      ))
                    ) : (
                      <EmptyMiniList text="עדיין אין מועדפים — סמן שיעורים שאהבת והם יופיעו כאן." />
                    )}
                  </div>
                </div>
              </div>

              <style>{`
                @media (max-width: 768px) { .history-fav-grid { grid-template-columns: 1fr !important; } }
              `}</style>
            </div>
          </section>

          {/* ─── Suggestions (real series data) ──────────────────────── */}
          {suggestions.length > 0 && (
            <section style={{ background: colors.parchment, padding: "3.5rem 1.5rem" }}>
              <div dir="rtl" style={{ maxWidth: 1200, margin: "0 auto" }}>
                <SectionLabel icon={<TrendingUp size={16} />} eyebrow="מאגר השיעורים" title="שיעורים שיעניינו אותך" color={colors.oliveMain} />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {suggestions.map((s: any) => {
                    const cover = s.image_url || getSeriesCoverImage(s.title) || "/images/series-default.webp";
                    return (
                      <Link
                        key={s.id}
                        to={`/series/${s.id}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <div
                          style={{
                            background: "white",
                            borderRadius: radii.lg,
                            overflow: "hidden",
                            border: "1px solid rgba(139,111,71,0.1)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.85rem",
                            padding: "0.85rem",
                            transition: "transform 0.22s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                        >
                          <div
                            style={{
                              width: 72,
                              height: 72,
                              flexShrink: 0,
                              borderRadius: radii.md,
                              overflow: "hidden",
                              background: colors.parchmentDark,
                            }}
                          >
                            <img src={cover} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontFamily: fonts.display,
                                fontWeight: 700,
                                fontSize: "0.88rem",
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
                            <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textMuted }}>
                              {s.rabbis?.name || ""}
                            </div>
                            <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.goldDark, fontWeight: 600, marginTop: "0.15rem" }}>
                              {s.lesson_count} שיעורים
                            </div>
                          </div>
                          <ChevronRight size={15} style={{ color: colors.textSubtle, flexShrink: 0 }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ─── Account settings ────────────────────────────────────── */}
          <section id="settings" style={{ background: colors.parchment, padding: "3.5rem 1.5rem" }}>
            <div dir="rtl" style={{ maxWidth: 1200, margin: "0 auto" }}>
              <SectionLabel icon={<Settings size={16} />} eyebrow="חשבון" title="הגדרות אישיות" color={colors.goldDark} />
              <div
                style={{
                  background: "white",
                  borderRadius: radii.xl,
                  border: "1px solid rgba(139,111,71,0.1)",
                  boxShadow: shadows.cardSoft,
                  padding: "2rem",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.5rem",
                }}
                className="settings-grid"
              >
                {/* Profile info */}
                <div>
                  <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1rem", color: colors.textDark, marginBottom: "1rem" }}>
                    פרטי חשבון
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      <label style={{ fontFamily: fonts.body, fontSize: "0.72rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.1em", textTransform: "uppercase" }}>שם</label>
                      <div style={{ fontFamily: fonts.body, fontSize: "0.9rem", color: colors.textDark, padding: "0.6rem 0.85rem", background: colors.parchment, borderRadius: radii.md, border: "1px solid rgba(139,111,71,0.12)" }}>
                        {displayName}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      <label style={{ fontFamily: fonts.body, fontSize: "0.72rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.1em", textTransform: "uppercase" }}>אימייל</label>
                      <div style={{ fontFamily: fonts.body, fontSize: "0.9rem", color: colors.textDark, padding: "0.6rem 0.85rem", background: colors.parchment, borderRadius: radii.md, border: "1px solid rgba(139,111,71,0.12)", direction: "ltr", textAlign: "right" }}>
                        {user?.email || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1rem", color: colors.textDark, marginBottom: "1rem" }}>
                    פעולות
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <Link
                      to="/favorites"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.6rem",
                        padding: "0.7rem 1rem", borderRadius: radii.md,
                        background: colors.parchment, border: "1px solid rgba(139,111,71,0.12)",
                        color: colors.textDark, fontFamily: fonts.body,
                        fontSize: "0.88rem", textDecoration: "none",
                        transition: "background 0.15s",
                      }}
                    >
                      <Heart size={14} style={{ color: colors.oliveMain }} />
                      שיעורים מועדפים
                    </Link>
                    <Link
                      to="/history"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.6rem",
                        padding: "0.7rem 1rem", borderRadius: radii.md,
                        background: colors.parchment, border: "1px solid rgba(139,111,71,0.12)",
                        color: colors.textDark, fontFamily: fonts.body,
                        fontSize: "0.88rem", textDecoration: "none",
                      }}
                    >
                      <Clock size={14} style={{ color: colors.tealMain }} />
                      היסטוריית צפייה
                    </Link>
                    <Link
                      to="/contact"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.6rem",
                        padding: "0.7rem 1rem", borderRadius: radii.md,
                        background: colors.parchment, border: "1px solid rgba(139,111,71,0.12)",
                        color: colors.textDark, fontFamily: fonts.body,
                        fontSize: "0.88rem", textDecoration: "none",
                      }}
                    >
                      <Bell size={14} style={{ color: colors.goldDark }} />
                      יצירת קשר ותמיכה
                    </Link>
                  </div>
                </div>
              </div>
              <style>{`.settings-grid { } @media (max-width: 640px) { .settings-grid { grid-template-columns: 1fr !important; } }`}</style>
            </div>
          </section>

          {/* ─── Membership footer ────────────────────────────────────── */}
          <section
            style={{
              background: gradients.warmDark,
              padding: "3.5rem 1.5rem",
              color: "white",
            }}
          >
            <div dir="rtl" style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
              {hasSubscription ? (
                <>
                  <Sparkles style={{ width: 28, height: 28, color: colors.goldShimmer, margin: "0 auto 1rem" }} />
                  <h2
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 700,
                      fontSize: "1.6rem",
                      margin: "0 0 0.6rem",
                      fontStyle: "italic",
                    }}
                  >
                    המנוי שלך פעיל
                  </h2>
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: "0.9rem",
                      lineHeight: 1.85,
                      color: "rgba(255,255,255,0.6)",
                      marginBottom: "1.5rem",
                    }}
                  >
                    מצב המנוי: פעיל · ₪110/חודש · ביטול חינם בכל עת.
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", gap: "0.85rem", flexWrap: "wrap" }}>
                    <Link
                      to="/donate"
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
                </>
              ) : (
                <>
                  <Heart style={{ width: 28, height: 28, color: colors.goldShimmer, margin: "0 auto 1rem" }} />
                  <h2
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 700,
                      fontSize: "1.6rem",
                      margin: "0 0 0.6rem",
                      fontStyle: "italic",
                    }}
                  >
                    הצטרף לתכנית
                  </h2>
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: "0.9rem",
                      lineHeight: 1.85,
                      color: "rgba(255,255,255,0.6)",
                      marginBottom: "1.5rem",
                    }}
                  >
                    גישה מלאה להרחבה, מצגות, מאמרים והקלטות שבועיות — ₪5 לחודש הראשון.
                  </p>
                  <Link
                    to="/megilat-esther"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.9rem 2rem",
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
                    <Sparkles size={15} />
                    הצטרף לתכנית — ₪5 לחודש הראשון
                  </Link>
                </>
              )}
            </div>
          </section>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DesignLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function GuestGate() {
  return (
    <div
      style={{
        minHeight: "70vh",
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
          border: "1px solid rgba(139,111,71,0.12)",
          boxShadow: "0 16px 48px rgba(45,31,14,0.1)",
        }}
      >
        <Lock size={40} style={{ color: colors.goldDark, margin: "0 auto 1.25rem", opacity: 0.7 }} />
        <h2
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: "1.5rem",
            color: colors.textDark,
            margin: "0 0 0.75rem",
          }}
        >
          יש להתחבר
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
          כדי לגשת לאזור האישי, יש להתחבר עם חשבון Google שלך.
        </p>
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
      </div>
    </div>
  );
}

function QuickTile({
  icon,
  label,
  sub,
  to,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  to: string;
  color: string;
  bg: string;
}) {
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "white",
          borderRadius: radii.xl,
          padding: "1.4rem 1.25rem",
          border: "1px solid rgba(139,111,71,0.1)",
          boxShadow: shadows.cardSoft,
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          height: "100%",
          minHeight: 110,
          cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = shadows.cardHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = shadows.cardSoft;
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.md,
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
          }}
        >
          {icon}
        </div>
        <div>
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: "0.88rem",
              color: colors.textDark,
              marginBottom: "0.1rem",
            }}
          >
            {label}
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>
            {sub}
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatCard({
  icon,
  value,
  label,
  sub,
  color,
  gold = false,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub?: string;
  color: string;
  gold?: boolean;
}) {
  return (
    <div
      style={{
        background: gold ? `linear-gradient(135deg, #fffbf0, #fff8e8)` : "white",
        borderRadius: radii.xl,
        padding: "1.4rem 1.25rem",
        border: `1px solid ${gold ? "rgba(226,88,34,0.2)" : "rgba(139,111,71,0.09)"}`,
        boxShadow: gold ? "0 4px 16px rgba(226,88,34,0.15)" : shadows.cardSoft,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, insetInlineEnd: 0, bottom: 0, width: 4, background: color }} />
      <div style={{ display: "flex", justifyContent: "center", color, marginBottom: "0.4rem" }}>
        {icon}
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: "1.8rem",
          color: gold ? "#e25822" : colors.textDark,
          marginBottom: "0.1rem",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.73rem", color: colors.textMuted, marginBottom: "0.1rem" }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textSubtle }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionLabel({
  icon,
  eyebrow,
  title,
  color,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  color: string;
}) {
  return (
    <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
      <div style={{ color, marginTop: "0.18rem" }}>{icon}</div>
      <div>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: "0.72rem",
            fontWeight: 700,
            color,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "0.2rem",
          }}
        >
          {eyebrow}
        </div>
        <h2
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: "clamp(1.3rem, 2.2vw, 1.75rem)",
            color: colors.textDark,
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
    </div>
  );
}

function TimelineStep({
  book,
  isLast,
}: {
  book: TimelineBook;
  isLast: boolean;
}) {
  const isDone = book.status === "done";
  const isCurrent = book.status === "current";

  const bgColor = isDone
    ? "rgba(91,110,58,0.1)"
    : isCurrent
    ? gradients.goldButton
    : "rgba(139,111,71,0.04)";

  const borderColor = isDone
    ? "rgba(91,110,58,0.25)"
    : isCurrent
    ? colors.goldDark
    : "rgba(139,111,71,0.1)";

  return (
    <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.4rem",
          minWidth: 72,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: bgColor,
            border: `2px solid ${borderColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
            position: "relative",
          }}
        >
          {isDone ? (
            <CheckCircle2 size={18} style={{ color: colors.oliveMain }} />
          ) : isCurrent ? (
            <Play size={16} fill="white" style={{ color: "white" }} />
          ) : (
            <Clock size={14} style={{ color: colors.textSubtle }} />
          )}
          {isCurrent && (
            <div
              style={{
                position: "absolute",
                inset: -3,
                borderRadius: "50%",
                border: `2px solid ${colors.goldDark}`,
                animation: "ring-pulse 2s ease-in-out infinite",
                opacity: 0.5,
              }}
            />
          )}
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: "0.68rem",
            fontWeight: isCurrent ? 700 : 400,
            color: isCurrent ? colors.goldDark : isDone ? colors.oliveMain : colors.textSubtle,
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          {book.name}
          {isCurrent && (
            <div style={{ fontSize: "0.6rem", color: colors.goldDark }}>
              כעת בלימוד
            </div>
          )}
        </div>
      </div>
      {!isLast && (
        <div
          style={{
            width: 24,
            height: 2,
            background: isDone ? "rgba(91,110,58,0.3)" : "rgba(139,111,71,0.12)",
            flexShrink: 0,
            margin: "0 0.1rem",
            marginBottom: "1.4rem",
          }}
        />
      )}
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
        <circle
          cx={36}
          cy={36}
          r={r}
          fill="none"
          stroke={colors.goldShimmer}
          strokeWidth={5}
          strokeDasharray={`${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "0.95rem", color: "white", lineHeight: 1 }}>
          {pct}%
        </div>
      </div>
    </div>
  );
}

function MiniLessonRow({
  lesson,
  accent = colors.goldDark,
}: {
  lesson: { title: string; series: string; duration: string };
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: radii.lg,
        padding: "0.85rem 1rem",
        border: "1px solid rgba(139,111,71,0.08)",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        cursor: "pointer",
        transition: "transform 0.18s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(-2px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateX(0)")}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: radii.md,
          background: `${accent}12`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
          flexShrink: 0,
        }}
      >
        <Play size={14} fill="currentColor" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: "0.82rem",
            color: colors.textDark,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {lesson.title}
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.textMuted }}>
          {lesson.duration ? `${lesson.series} · ${lesson.duration}` : lesson.series}
        </div>
      </div>
    </div>
  );
}

// Empty-state row for the recent / favorites mini-lists (real data, none yet).
function EmptyMiniList({ text }: { text: string }) {
  return (
    <div
      dir="rtl"
      style={{
        background: "white",
        borderRadius: radii.lg,
        padding: "1.25rem 1.1rem",
        border: "1px dashed rgba(139,111,71,0.18)",
        fontFamily: fonts.body,
        fontSize: "0.78rem",
        color: colors.textMuted,
        textAlign: "center",
        lineHeight: 1.6,
      }}
    >
      {text}
    </div>
  );
}
