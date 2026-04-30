/**
 * /design-lesson-popup — Lesson popup/dialog demo with REAL data.
 *
 * Pulls the top series from Supabase + the first published lesson of that
 * series. The popup floats over a faux blurred series page so you can see
 * how it looks in context. Click the backdrop to dismiss; "פתח שוב" reopens.
 */
import { useState, useMemo } from "react";
import {
  Play,
  Volume2,
  Heart,
  Share2,
  X,
  Flame,
  Download,
  ChevronDown,
  Star,
  Loader2,
} from "lucide-react";

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
} from "@/lib/designTokens";
import { useTopSeries } from "@/hooks/useTopSeries";
import { useLessonsBySeries } from "@/hooks/useLessonsBySeries";
import { TeacherContentBadge } from "@/components/ui/TeacherContentBadge";

export default function DesignPreviewLessonPopup() {
  const [open, setOpen] = useState(true);

  const { data: allSeries } = useTopSeries(20);
  const topSeries = useMemo(() => {
    if (!allSeries?.length) return null;
    return [...(allSeries as any[])]
      .filter((s) => s.status === "active" && (s.lesson_count || 0) > 0)
      .sort((a, b) => (b.lesson_count || 0) - (a.lesson_count || 0))[0];
  }, [allSeries]);

  const { data: lessons = [] } = useLessonsBySeries(topSeries?.id);

  const lesson = (lessons as any[])[0];
  const cover = topSeries
    ? topSeries.image_url || getSeriesCoverImage(topSeries.title) || "/images/series-default.png"
    : "/images/series-default.png";

  if (!topSeries || !lesson) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          background: colors.parchment,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2 style={{ width: 32, height: 32, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const fam = seriesFamilies[getSeriesFamily(topSeries.title, topSeries.description)];
  const rabbiName = topSeries.rabbis?.name || "";
  const rabbiInitial = rabbiName ? (rabbiName.replace(/^הרב /, "")[0] || "ר") : "ר";
  const lessonType: "video" | "audio" = lesson.source_type === "audio" ? "audio" : "video";
  const lessonImage = lesson.thumbnail_url || cover;
  const publishedAt = lesson.published_at
    ? new Date(lesson.published_at).toLocaleDateString("he-IL")
    : null;

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        position: "relative",
        background: colors.parchment,
        overflow: "hidden",
      }}
    >
      {/* ─── Faux blurred background ─── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${cover})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.5,
          filter: "blur(2px) brightness(0.85)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, rgba(45,31,14,0.4), rgba(45,31,14,0.7))`,
        }}
      />

      <div
        dir="rtl"
        style={{
          position: "absolute",
          inset: 0,
          padding: "8rem 2rem",
          maxWidth: 960,
          margin: "0 auto",
          color: "rgba(255,255,255,0.25)",
          fontFamily: fonts.display,
          fontStyle: "italic",
          fontSize: "1.4rem",
          textAlign: "center",
          textShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        רקע: {topSeries.title} (מטושטש)
      </div>

      {/* ─── Modal ─── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          dir="rtl"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(45,31,14,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 100,
            overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
            style={{
              background: colors.parchment,
              borderRadius: radii.xl,
              maxWidth: 720,
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 25px 80px rgba(45,31,14,0.45), 0 0 0 1px rgba(232,213,160,0.25)",
              position: "relative",
            }}
          >
            {/* Hero region */}
            <div
              style={{
                position: "relative",
                aspectRatio: "16 / 9",
                background: gradients.mahoganyHero,
                overflow: "hidden",
              }}
            >
              <img
                src={lessonImage}
                alt={lesson.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.65 }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)",
                }}
              />

              {/* Play button center */}
              <button
                aria-label="נגן"
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
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
                }}
              >
                {lessonType === "audio" ? (
                  <Volume2 style={{ width: 32, height: 32 }} />
                ) : (
                  <Play style={{ width: 32, height: 32 }} fill="currentColor" />
                )}
              </button>

              {/* Type + duration badges (top-right in RTL = visual right) */}
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  display: "flex",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: radii.sm,
                    background: gradients.goldButton,
                    color: "white",
                    fontFamily: fonts.body,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                  }}
                >
                  {lessonType === "video" ? "וידאו" : "אודיו"}
                </span>
                <span
                  style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: radii.sm,
                    background: "rgba(0,0,0,0.55)",
                    color: "white",
                    fontFamily: fonts.body,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }}
                >
                  {formatDuration(lesson.duration)}
                </span>
              </div>

              {/* Close button (top-left in RTL = visual left) */}
              <button
                onClick={() => setOpen(false)}
                aria-label="סגור"
                style={{
                  position: "absolute",
                  top: 14,
                  left: 14,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.95)",
                  border: "none",
                  color: colors.textDark,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "1.75rem 2rem 1rem" }} dir="rtl">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  marginBottom: "0.85rem",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    padding: "0.25rem 0.65rem",
                    borderRadius: radii.sm,
                    background: fam.badgeBg,
                    color: fam.badgeFg,
                    fontFamily: fonts.body,
                    fontSize: "0.66rem",
                    letterSpacing: "0.12em",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {fam.label}
                </span>
                <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textSubtle }}>
                  סדרה: <span style={{ color: colors.goldDark, fontWeight: 600 }}>{topSeries.title}</span>
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                <h2
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 700,
                    fontSize: "1.5rem",
                    color: colors.textDark,
                    margin: 0,
                    lineHeight: 1.3,
                    fontStyle: "italic",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {lesson.title}
                </h2>
                <TeacherContentBadge tags={(lesson as any).audience_tags} variant="small" />
              </div>

              {/* Rabbi row — fixed: explicit RTL flow with avatar on RIGHT */}
              <div
                dir="rtl"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "0.85rem",
                  paddingBottom: "1.25rem",
                  borderBottom: `1px solid rgba(139,111,71,0.12)`,
                  marginBottom: "1.25rem",
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: gradients.goldButton,
                    border: `2px solid white`,
                    boxShadow: shadows.goldGlowSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: fonts.display,
                    fontWeight: 900,
                    fontSize: "1.1rem",
                    color: "white",
                  }}
                >
                  {rabbiInitial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      color: colors.textDark,
                    }}
                  >
                    {rabbiName}
                  </div>
                  <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted }}>
                    מרצה הסדרה
                  </div>
                </div>
                {publishedAt && (
                  <span
                    style={{
                      flexShrink: 0,
                      fontFamily: fonts.body,
                      fontSize: "0.72rem",
                      color: colors.textSubtle,
                      whiteSpace: "nowrap",
                    }}
                  >
                    פורסם {publishedAt}
                  </span>
                )}
              </div>

              {lesson.description && (
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.98rem",
                    lineHeight: 1.85,
                    color: colors.textMid,
                    margin: "0 0 1.25rem",
                  }}
                >
                  {lesson.description}
                </p>
              )}

              {!lesson.description && (
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.92rem",
                    lineHeight: 1.85,
                    color: colors.textMuted,
                    fontStyle: "italic",
                    margin: "0 0 1.25rem",
                    padding: "0.85rem 1rem",
                    background: "rgba(196,162,101,0.06)",
                    borderRadius: radii.sm,
                    borderInlineStart: `3px solid ${colors.goldLight}`,
                  }}
                >
                  שיעור מתוך הסדרה <b>{topSeries.title}</b> — {(lessons as any[]).length} שיעורים בסך הכל מאת {rabbiName}.
                </p>
              )}

              {/* Other lessons in the series (mini-list) */}
              {(lessons as any[]).length > 1 && (
                <details
                  style={{
                    background: "rgba(196,162,101,0.06)",
                    borderRadius: radii.md,
                    padding: "1rem 1.2rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <summary
                    style={{
                      cursor: "pointer",
                      listStyle: "none",
                      fontFamily: fonts.display,
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      color: colors.goldDark,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>עוד שיעורים בסדרה ({(lessons as any[]).length - 1})</span>
                    <ChevronDown style={{ width: 16, height: 16 }} />
                  </summary>
                  <ol
                    style={{
                      margin: "0.85rem 0 0",
                      paddingInlineStart: "1.25rem",
                      fontFamily: fonts.body,
                      fontSize: "0.88rem",
                      lineHeight: 1.85,
                      color: colors.textMid,
                    }}
                  >
                    {(lessons as any[]).slice(1, 8).map((l) => (
                      <li key={l.id}>
                        {l.title}{" "}
                        {l.duration && (
                          <span style={{ color: colors.textSubtle, fontSize: "0.78rem" }}>
                            · {formatDuration(l.duration)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>

            {/* Footer */}
            <div
              dir="rtl"
              style={{
                padding: "1rem 2rem 1.5rem",
                borderTop: `1px solid rgba(139,111,71,0.12)`,
                background: colors.parchmentDark,
                display: "flex",
                gap: "0.65rem",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {[Heart, Share2, Download].map((Icon, i) => (
                  <button
                    key={i}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: radii.md,
                      border: `1.5px solid rgba(139,111,71,0.25)`,
                      background: "white",
                      color: colors.textMuted,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon style={{ width: 16, height: 16 }} />
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                <button
                  style={{
                    padding: "0.65rem 1.2rem",
                    borderRadius: radii.md,
                    border: "1.5px solid rgba(139,111,71,0.3)",
                    background: "rgba(196,162,101,0.08)",
                    color: colors.goldDark,
                    fontFamily: fonts.accent,
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Flame style={{ width: 14, height: 14 }} />
                  הקדש שיעור
                </button>
                <button
                  style={{
                    padding: "0.7rem 1.5rem",
                    borderRadius: radii.md,
                    border: "none",
                    background: gradients.goldButton,
                    color: "white",
                    fontFamily: fonts.accent,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    boxShadow: shadows.goldGlow,
                  }}
                >
                  <Play style={{ width: 16, height: 16 }} fill="currentColor" />
                  צפה / האזן עכשיו
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: 32,
            right: 32,
            zIndex: 50,
            padding: "0.85rem 1.5rem",
            borderRadius: radii.lg,
            border: "none",
            background: gradients.goldButton,
            color: "white",
            fontFamily: fonts.accent,
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: "pointer",
            boxShadow: shadows.goldGlow,
          }}
        >
          פתח שוב את הפופאפ
        </button>
      )}

      <div
        dir="rtl"
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 90,
          padding: "0.6rem 1rem",
          borderRadius: radii.md,
          background: "rgba(255,255,255,0.92)",
          border: `1px solid rgba(139,111,71,0.2)`,
          fontFamily: fonts.body,
          fontSize: "0.78rem",
          color: colors.textMuted,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: shadows.cardSoft,
          maxWidth: 280,
          lineHeight: 1.5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: 4 }}>
          <Star style={{ width: 14, height: 14, color: colors.goldDark }} />
          <b style={{ color: colors.textDark, fontFamily: fonts.display }}>פופאפ שיעור</b>
        </div>
        דאטה אמיתית: שיעור מסדרת "{topSeries.title}". לחץ מחוץ לחלון לסגירה.
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
