/**
 * /design-portal — Learner's portal, redesigned.
 *
 * The user-facing dashboard. Shows continue-learning, enrolled courses,
 * favorites, history, achievements, dedicated lessons.
 *
 * NOTE: requires authentication in production. For sandbox preview, we
 * show all sections with mock + real data so Saar can see the layout.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Heart,
  Clock,
  Trophy,
  Flame,
  TrendingUp,
  CheckCircle2,
  BookOpen,
  Sparkles,
  Loader2,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import {
  colors,
  fonts,
  gradients,
  radii,
  shadows,
  seriesFamilies,
  getSeriesFamily,
  getSeriesCoverImage,
  formatDuration,
  lessonTypeLabel,
} from "@/lib/designTokens";
import { useTopSeries } from "@/hooks/useTopSeries";
import { useLessonsBySeries } from "@/hooks/useLessonsBySeries";

// Mock user state — until auth wiring is real on the design preview
const USER = {
  name: "סער",
  initial: "ס",
  joinedAt: "אפריל 2025",
  totalListened: "47 שעות",
  streakDays: 12,
  pointsEarned: 1850,
  rank: "תלמיד פעיל",
};

export default function DesignPreviewPortal() {
  const { data: topSeries = [], isLoading } = useTopSeries(10);
  const continueWatchingSeries = topSeries[0];
  const { data: continueLessons = [] } = useLessonsBySeries(continueWatchingSeries?.id);
  const continueLesson = (continueLessons as any[])[0];

  const enrolledSeries = useMemo(() => topSeries.slice(0, 3), [topSeries]);
  const recommendedSeries = useMemo(() => topSeries.slice(3, 7), [topSeries]);

  return (
    <DesignLayout>
      {/* Personalized hero */}
      <section
        style={{
          background: `linear-gradient(135deg, ${colors.textDark} 0%, ${colors.mahogany} 100%)`,
          padding: "4rem 1.5rem 5rem",
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
              "radial-gradient(circle at 20% 50%, rgba(232,213,160,0.08) 0%, transparent 50%)",
          }}
        />

        <div dir="rtl" style={{ maxWidth: 1280, margin: "0 auto", position: "relative" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: "1.5rem",
              alignItems: "center",
              marginBottom: "2.5rem",
            }}
            className="portal-header-grid"
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: gradients.goldButton,
                border: `3px solid ${colors.goldShimmer}`,
                boxShadow: shadows.goldGlow,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "2rem",
                color: "white",
              }}
            >
              {USER.initial}
            </div>
            <div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.78rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: colors.goldShimmer,
                  fontWeight: 700,
                  marginBottom: "0.3rem",
                }}
              >
                ברוך שובך
              </div>
              <h1
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                  margin: 0,
                  fontStyle: "italic",
                }}
              >
                שלום {USER.name}, נמשיך מאיפה שעצרנו?
              </h1>
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.95rem",
                  color: "rgba(255,255,255,0.7)",
                  margin: "0.4rem 0 0",
                }}
              >
                חבר מאז {USER.joinedAt} · דירוג: <b style={{ color: colors.goldShimmer }}>{USER.rank}</b>
              </p>
            </div>
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "1rem",
            }}
          >
            <PortalStat icon={<Clock size={20} />} value={USER.totalListened} label="זמן לימוד" />
            <PortalStat icon={<Flame size={20} />} value={`${USER.streakDays} ימים`} label="רצף יומי" />
            <PortalStat icon={<Trophy size={20} />} value={USER.pointsEarned.toLocaleString("he-IL")} label="נקודות" />
            <PortalStat icon={<CheckCircle2 size={20} />} value="3" label="סדרות הושלמו" />
            <PortalStat icon={<TrendingUp size={20} />} value="2" label="סדרות פעילות" />
          </div>
        </div>
      </section>

      {/* Continue learning hero card */}
      {continueLesson && continueWatchingSeries && (
        <section style={{ background: colors.parchment, padding: "0 1.5rem" }}>
          <div style={{ maxWidth: 1280, margin: "-3rem auto 0" }}>
            <div
              style={{
                background: "white",
                borderRadius: radii.xl,
                boxShadow: "0 12px 40px rgba(45,31,14,0.12)",
                overflow: "hidden",
                display: "grid",
                gridTemplateColumns: "minmax(280px, 380px) 1fr",
                gap: 0,
                position: "relative",
                zIndex: 5,
              }}
              className="continue-card"
              dir="rtl"
            >
              <div
                style={{
                  aspectRatio: "16 / 10",
                  background: gradients.mahoganyHero,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <img
                  src={
                    continueWatchingSeries.image_url ||
                    getSeriesCoverImage(continueWatchingSeries.title) ||
                    "/images/series-default.png"
                  }
                  alt={continueWatchingSeries.title}
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
                  aria-label="המשך"
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
                    boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
                  }}
                >
                  <Play style={{ width: 28, height: 28 }} fill="currentColor" />
                </button>
              </div>
              <div style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.72rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: colors.goldDark,
                    fontWeight: 700,
                    marginBottom: "0.4rem",
                  }}
                >
                  המשך מאיפה שעצרת
                </div>
                <h2
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 700,
                    fontSize: "1.4rem",
                    color: colors.textDark,
                    margin: "0 0 0.5rem",
                    lineHeight: 1.3,
                  }}
                >
                  {continueLesson.title}
                </h2>
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.88rem",
                    color: colors.textMuted,
                    marginBottom: "1rem",
                  }}
                >
                  {continueWatchingSeries.title} · {continueWatchingSeries.rabbis?.name || ""}
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: "1rem" }}>
                  <div
                    style={{
                      height: 6,
                      background: "rgba(139,111,71,0.12)",
                      borderRadius: 3,
                      overflow: "hidden",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <div
                      style={{
                        width: "32%",
                        height: "100%",
                        background: gradients.goldButton,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textSubtle }}>
                    32% הושלם · נשארו 22 דקות
                  </div>
                </div>

                <button
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: radii.md,
                    border: "none",
                    background: gradients.goldButton,
                    color: "white",
                    fontFamily: fonts.accent,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    boxShadow: shadows.goldGlow,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    alignSelf: "flex-start",
                  }}
                >
                  <Play style={{ width: 14, height: 14 }} fill="currentColor" />
                  המשך עכשיו
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* My series */}
      <section style={{ background: colors.parchment, padding: "4rem 1.5rem 2rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "1.75rem" }}>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.goldDark,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.3rem",
              }}
            >
              הספרייה שלך
            </div>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)",
                color: colors.textDark,
                margin: 0,
              }}
            >
              סדרות בתהליך
            </h2>
          </div>

          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
              <Loader2 style={{ width: 24, height: 24, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <div
              dir="rtl"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {enrolledSeries.map((s, i) => {
                const fam = seriesFamilies[getSeriesFamily(s.title, s.description)];
                const cover = s.image_url || getSeriesCoverImage(s.title) || "/images/series-default.png";
                const progress = [62, 45, 18][i] || 30;
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
                        border: `1px solid rgba(139,111,71,0.1)`,
                        boxShadow: shadows.cardSoft,
                        cursor: "pointer",
                        transition: "all 0.28s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-3px)";
                        e.currentTarget.style.boxShadow = shadows.cardHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = shadows.cardSoft;
                      }}
                    >
                      <div style={{ aspectRatio: "16/9", background: colors.parchmentDark, overflow: "hidden" }}>
                        <img src={cover} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div style={{ padding: "1rem 1.1rem 1.1rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.18rem 0.5rem",
                            borderRadius: radii.sm,
                            background: fam.badgeBg,
                            color: fam.badgeFg,
                            fontFamily: fonts.body,
                            fontSize: "0.62rem",
                            letterSpacing: "0.1em",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            marginBottom: "0.45rem",
                          }}
                        >
                          {fam.label}
                        </span>
                        <div
                          style={{
                            fontFamily: fonts.display,
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            color: colors.textDark,
                            lineHeight: 1.35,
                            marginBottom: "0.6rem",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            minHeight: "2.5em",
                          }}
                        >
                          {s.title}
                        </div>
                        <div style={{ height: 4, background: "rgba(139,111,71,0.1)", borderRadius: 2, marginBottom: "0.4rem", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${progress}%`,
                              height: "100%",
                              background: gradients.goldButton,
                              borderRadius: 2,
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.body, fontSize: "0.72rem" }}>
                          <span style={{ color: colors.textMuted }}>{progress}% הושלם</span>
                          <span style={{ color: colors.goldDark, fontWeight: 600 }}>{s.lesson_count} שיעורים</span>
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

      {/* Recommended */}
      <section style={{ background: colors.parchmentDark, padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "1.75rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Sparkles style={{ width: 20, height: 20, color: colors.oliveMain }} />
            <div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: colors.oliveMain,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                המלצות מותאמות
              </div>
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: "clamp(1.3rem, 2.4vw, 1.7rem)",
                  color: colors.textDark,
                  margin: 0,
                }}
              >
                סדרות שאולי תאהב
              </h2>
            </div>
          </div>

          <div
            dir="rtl"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            {recommendedSeries.map((s) => {
              const fam = seriesFamilies[getSeriesFamily(s.title, s.description)];
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
                      border: `1px solid rgba(139,111,71,0.08)`,
                      cursor: "pointer",
                      transition: "all 0.28s",
                      borderRight: `4px solid ${fam.accent}`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    <div style={{ aspectRatio: "16/9", overflow: "hidden", background: colors.parchmentDark }}>
                      <img src={cover} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                    </div>
                    <div style={{ padding: "0.85rem 1rem 1rem" }}>
                      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.88rem", color: colors.textDark, lineHeight: 1.3, marginBottom: "0.3rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.4em" }}>
                        {s.title}
                      </div>
                      <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>
                        {s.rabbis?.name || ""} · {s.lesson_count} שיעורים
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recently watched lessons */}
      {(continueLessons as any[]).length > 1 && (
        <section style={{ background: colors.parchment, padding: "4rem 1.5rem 6rem" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div dir="rtl" style={{ marginBottom: "1.75rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Heart style={{ width: 20, height: 20, color: colors.goldDark }} />
              <div>
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: colors.goldDark,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}
                >
                  היסטוריה
                </div>
                <h2
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 900,
                    fontSize: "clamp(1.3rem, 2.4vw, 1.7rem)",
                    color: colors.textDark,
                    margin: 0,
                  }}
                >
                  שיעורים שלמדת לאחרונה
                </h2>
              </div>
            </div>

            <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {(continueLessons as any[]).slice(1, 6).map((l) => (
                <div
                  key={l.id}
                  style={{
                    background: "white",
                    borderRadius: radii.md,
                    padding: "0.8rem 1rem",
                    border: `1px solid rgba(139,111,71,0.08)`,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.parchmentDark)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: gradients.goldButton,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Play style={{ width: 14, height: 14 }} fill="currentColor" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontWeight: 700,
                        fontSize: "0.92rem",
                        color: colors.textDark,
                        marginBottom: "0.15rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {l.title}
                    </div>
                    <div style={{ fontFamily: fonts.body, fontSize: "0.74rem", color: colors.textMuted }}>
                      {continueWatchingSeries?.title} · {lessonTypeLabel(l.source_type)} · {formatDuration(l.duration)}
                    </div>
                  </div>
                  <CheckCircle2 style={{ width: 18, height: 18, color: colors.oliveMain, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .portal-header-grid { grid-template-columns: 1fr !important; text-align: center; }
          .continue-card { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </DesignLayout>
  );
}

function PortalStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderRadius: radii.md,
        padding: "1rem 1.1rem",
        border: `1px solid rgba(232,213,160,0.15)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem", color: colors.goldShimmer }}>
        {icon}
        <span style={{ fontFamily: fonts.body, fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.4rem", color: "white" }}>
        {value}
      </div>
    </div>
  );
}
