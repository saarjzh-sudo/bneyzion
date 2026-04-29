/**
 * /design-portal-subscriber — Subscriber's personal area, redesigned.
 *
 * For weekly-chapter program subscribers. Shows:
 *  - Their progress (which book/chapter they're on)
 *  - Books they completed (gallery)
 *  - This week's content
 *  - Subscription status + dedications they made
 *  - Settings link
 *
 * Pulls real series data from Supabase. Uses mock subscriber state
 * (until auth is wired through this sandbox).
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  Clock,
  Heart,
  Crown,
  Calendar,
  Settings,
  Flame,
  Loader2,
  Play,
  TrendingUp,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows, getSeriesCoverImage, formatDuration, lessonTypeLabel } from "@/lib/designTokens";
import { useTopSeries } from "@/hooks/useTopSeries";
import { useLessonsBySeries } from "@/hooks/useLessonsBySeries";

const SUBSCRIBER = {
  name: "סער",
  initial: "ס",
  email: "saar.j.z.h@gmail.com",
  joinedAt: "אפריל 2025",
  tier: "מנוי שנתי",
  tierIcon: Crown,
  expiresAt: "אפריל 2026",
  totalBooks: 4,
  weeksActive: 52,
  hoursListened: 47,
  dedications: 8,
};

// Books "completed" (mock — uses real series, just labeled as 'done')
const COMPLETED_BOOK_TITLES = ["יהושע", "שופטים", "שמות", "ויקרא"];

export default function DesignPreviewPortalSubscriber() {
  const { data: topSeries = [], isLoading } = useTopSeries(20);

  const currentBook = (topSeries as any[])[0];
  const { data: currentBookLessons = [] } = useLessonsBySeries(currentBook?.id);

  const completedBooks = useMemo(() => {
    return (topSeries as any[]).filter((s) => COMPLETED_BOOK_TITLES.some((t) => (s.title || "").includes(t))).slice(0, 4);
  }, [topSeries]);

  const upNext = (topSeries as any[]).slice(1, 4);

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

  const TierIcon = SUBSCRIBER.tierIcon;
  const currentLesson = (currentBookLessons as any[])[0];
  const totalLessonsInBook = (currentBookLessons as any[]).length;
  const currentLessonIndex = 1;
  const progressPct = totalLessonsInBook ? Math.round((currentLessonIndex / totalLessonsInBook) * 100) : 0;
  const heroImage = currentBook?.image_url || getSeriesCoverImage(currentBook?.title || "") || "/images/series-default.png";

  return (
    <DesignLayout>
      {/* ─── Personal hero ─── */}
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
            background: "radial-gradient(circle at 80% 30%, rgba(232,213,160,0.1) 0%, transparent 55%)",
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
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: gradients.goldButton,
              border: `4px solid ${colors.goldShimmer}`,
              boxShadow: shadows.goldGlow,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: "2.4rem",
              color: "white",
            }}
          >
            {SUBSCRIBER.initial}
          </div>

          {/* Name + tier */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
              <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.goldShimmer, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
                האזור האישי שלך
              </span>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.2rem 0.65rem", borderRadius: radii.pill, background: "rgba(232,213,160,0.15)", border: "1px solid rgba(232,213,160,0.3)", color: colors.goldShimmer, fontSize: "0.7rem", fontWeight: 700 }}>
                <TierIcon size={11} />
                {SUBSCRIBER.tier}
              </div>
            </div>
            <h1 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", margin: 0, fontStyle: "italic", lineHeight: 1.2 }}>
              שלום {SUBSCRIBER.name}, מה תרצה ללמוד היום?
            </h1>
            <p style={{ fontFamily: fonts.body, fontSize: "0.92rem", color: "rgba(255,255,255,0.7)", marginTop: "0.5rem" }}>
              חבר מאז {SUBSCRIBER.joinedAt} · המנוי בתוקף עד {SUBSCRIBER.expiresAt}
            </p>
          </div>

          {/* Settings */}
          <Link
            to="/profile"
            style={{
              padding: "0.7rem 1.25rem",
              borderRadius: radii.lg,
              border: "1.5px solid rgba(232,213,160,0.3)",
              background: "rgba(232,213,160,0.08)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              color: colors.goldShimmer,
              fontFamily: fonts.accent,
              fontWeight: 700,
              fontSize: "0.85rem",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Settings size={14} />
            הגדרות
          </Link>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .subscriber-hero { grid-template-columns: 1fr !important; text-align: center; }
          }
        `}</style>
      </section>

      {/* ─── Continue learning hero card (overlapping) ─── */}
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
                gridTemplateColumns: "minmax(280px, 420px) 1fr",
                position: "relative",
                zIndex: 5,
              }}
              dir="rtl"
              className="continue-card-sub"
            >
              <div style={{ aspectRatio: "16 / 11", background: gradients.mahoganyHero, position: "relative", overflow: "hidden" }}>
                <img src={heroImage} alt={currentBook.title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.5))" }} />
                <button
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 80,
                    height: 80,
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
                  <Play size={32} fill="currentColor" />
                </button>
              </div>
              <div style={{ padding: "2rem 2.25rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: colors.goldDark, fontWeight: 700, marginBottom: "0.5rem" }}>
                  השיעור הבא בתוכנית שלך
                </div>
                <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.6rem", color: colors.textDark, margin: "0 0 0.5rem", lineHeight: 1.3 }}>
                  {currentLesson.title}
                </h2>
                <div style={{ fontFamily: fonts.body, fontSize: "0.92rem", color: colors.textMuted, marginBottom: "1.25rem" }}>
                  {currentBook.title} · {currentBook.rabbis?.name || ""} · {lessonTypeLabel(currentLesson.source_type)} {currentLesson.duration ? `· ${formatDuration(currentLesson.duration)}` : ""}
                </div>

                {/* Progress in book */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ height: 6, background: "rgba(139,111,71,0.12)", borderRadius: 3, overflow: "hidden", marginBottom: "0.4rem" }}>
                    <div style={{ width: `${progressPct}%`, height: "100%", background: gradients.goldButton, borderRadius: 3 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textSubtle }}>
                    <span>שיעור {currentLessonIndex} מתוך {totalLessonsInBook}</span>
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
                    fontSize: "1rem",
                    cursor: "pointer",
                    boxShadow: shadows.goldGlow,
                    alignSelf: "flex-start",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Play size={16} fill="currentColor" />
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

      {/* ─── Stats grid ─── */}
      <section style={{ background: colors.parchment, padding: "4rem 1.5rem 2rem" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
          dir="rtl"
        >
          <Stat icon={<BookOpen size={22} />} value={SUBSCRIBER.totalBooks.toString()} label="ספרים סיימתי" color={colors.goldDark} />
          <Stat icon={<Calendar size={22} />} value={SUBSCRIBER.weeksActive.toString()} label="שבועות פעיל" color={colors.oliveMain} />
          <Stat icon={<Clock size={22} />} value={`${SUBSCRIBER.hoursListened}h`} label="שעות לימוד" color={colors.tealMain} />
          <Stat icon={<Heart size={22} />} value={SUBSCRIBER.dedications.toString()} label="הקדשות שעשיתי" color="#a52a2a" />
        </div>
      </section>

      {/* ─── My books library ─── */}
      <section style={{ background: colors.parchment, padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "1.75rem" }}>
            <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              הספרייה האישית שלך
            </div>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "clamp(1.5rem, 2.8vw, 2.1rem)", color: colors.textDark, margin: 0 }}>
              ספרים שלמדת בתוכנית
            </h2>
          </div>

          {completedBooks.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", background: "white", borderRadius: radii.xl, fontFamily: fonts.body, color: colors.textMuted }}>
              אין עדיין ספרים שהושלמו. <Link to="/series" style={{ color: colors.goldDark, fontWeight: 700 }}>התחל עכשיו</Link>
            </div>
          ) : (
            <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.25rem" }}>
              {completedBooks.map((s) => {
                const cover = s.image_url || getSeriesCoverImage(s.title) || "/images/series-default.png";
                return (
                  <Link
                    key={s.id}
                    to={`/design-series-page/${s.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div
                      style={{
                        background: "white",
                        borderRadius: radii.xl,
                        overflow: "hidden",
                        border: `1px solid rgba(91,110,58,0.15)`,
                        boxShadow: shadows.cardSoft,
                        cursor: "pointer",
                        transition: "all 0.28s",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = shadows.cardHover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = shadows.cardSoft; }}
                    >
                      <div style={{ aspectRatio: "16 / 10", overflow: "hidden", background: colors.parchmentDark, position: "relative" }}>
                        <img src={cover} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div
                          style={{
                            position: "absolute",
                            top: 12,
                            insetInlineEnd: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "0.3rem 0.6rem",
                            borderRadius: radii.pill,
                            background: "rgba(91,110,58,0.95)",
                            color: "white",
                            fontFamily: fonts.body,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            backdropFilter: "blur(8px)",
                          }}
                        >
                          <CheckCircle2 size={12} />
                          הושלם
                        </div>
                      </div>
                      <div style={{ padding: "1rem 1.15rem 1.15rem" }}>
                        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1rem", color: colors.textDark, marginBottom: "0.3rem" }}>
                          {s.title}
                        </div>
                        <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted, marginBottom: "0.6rem" }}>
                          {s.rabbis?.name || ""} · {s.lesson_count} שיעורים
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: `1px solid rgba(139,111,71,0.05)`, fontFamily: fonts.body, fontSize: "0.75rem" }}>
                          <span style={{ color: colors.oliveMain, fontWeight: 700 }}>100% הושלם</span>
                          <span style={{ color: colors.goldDark, fontWeight: 600 }}>חזור לספר ←</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── Up next ─── */}
      <section style={{ background: colors.parchmentDark, padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "1.75rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <TrendingUp style={{ width: 20, height: 20, color: colors.oliveMain }} />
            <div>
              <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.oliveMain, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                ההמשך שלך
              </div>
              <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "clamp(1.4rem, 2.4vw, 1.7rem)", color: colors.textDark, margin: 0 }}>
                הספרים הבאים בתוכנית שלך
              </h2>
            </div>
          </div>

          <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {upNext.map((s) => {
              const cover = s.image_url || getSeriesCoverImage(s.title) || "/images/series-default.png";
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
                    <div style={{ width: 80, height: 80, flexShrink: 0, borderRadius: radii.md, overflow: "hidden", background: colors.parchmentDark }}>
                      <img src={cover} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.92rem", color: colors.textDark, marginBottom: "0.2rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {s.title}
                      </div>
                      <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>
                        {s.rabbis?.name || ""}
                      </div>
                      <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.goldDark, fontWeight: 600, marginTop: "0.2rem" }}>
                        {s.lesson_count} שיעורים בהמתנה
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Membership status ─── */}
      <section style={{ background: gradients.warmDark, padding: "4rem 1.5rem", color: "white" }}>
        <div dir="rtl" style={{ maxWidth: 880, margin: "0 auto", textAlign: "center" }}>
          <Crown style={{ width: 32, height: 32, color: colors.goldShimmer, margin: "0 auto 1rem" }} />
          <h2 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1.7rem", margin: "0 0 1rem", fontStyle: "italic" }}>
            המנוי השנתי שלך פעיל
          </h2>
          <p style={{ fontFamily: fonts.body, fontSize: "1rem", lineHeight: 1.85, color: "rgba(255,255,255,0.7)", marginBottom: "1.5rem" }}>
            בתוקף עד <strong style={{ color: colors.goldShimmer }}>{SUBSCRIBER.expiresAt}</strong>. תודה שאתה חלק מהקהילה.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.85rem", flexWrap: "wrap" }}>
            <Link
              to="/design-megilat-esther"
              style={{
                padding: "0.7rem 1.3rem",
                borderRadius: radii.md,
                background: "rgba(232,213,160,0.08)",
                border: "1.5px solid rgba(232,213,160,0.4)",
                color: colors.goldShimmer,
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "0.85rem",
                textDecoration: "none",
              }}
            >
              שדרג לחבר כסיל לחיים
            </Link>
            <Link
              to="/design-donate"
              style={{
                padding: "0.7rem 1.3rem",
                borderRadius: radii.md,
                background: "transparent",
                border: "1.5px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.8)",
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "0.85rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Heart size={13} />
              תרומה נוספת
            </Link>
          </div>
        </div>
      </section>
    </DesignLayout>
  );
}

function Stat({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: radii.xl,
        padding: "1.5rem 1.4rem",
        border: `1px solid rgba(139,111,71,0.1)`,
        boxShadow: shadows.cardSoft,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 4, background: color }} />
      <div style={{ display: "flex", justifyContent: "center", color, marginBottom: "0.5rem" }}>{icon}</div>
      <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.8rem", color: colors.textDark, marginBottom: "0.15rem", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted, letterSpacing: "0.05em" }}>
        {label}
      </div>
    </div>
  );
}
