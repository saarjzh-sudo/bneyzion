/**
 * /design-courses — Courses catalog page v2.
 *
 * Changes vs v1 (2026-04-30):
 *   - Removed Daniel/Esther as locked courses — they are not standalone courses.
 *   - "הפרק השבועי" card upgraded: mini-timeline of 8 books inside the card.
 *   - Added 3 real independent mock courses: "איך ללמוד תנ״ך", "פרשת השבוע", "פרקי אבות".
 *   - Two sections: "הקורסים שלי" (owned/active) + "קורסים נוספים שתאהב".
 *   - Breadcrumb back to portal.
 *
 * Sandbox-only (/design-* route). No production files touched.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  Lock,
  Play,
  Clock,
  ChevronLeft,
  Sparkles,
  ShoppingBag,
  Star,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CourseCard {
  slug: string;
  title: string;
  subtitle: string;
  coverGradient: string;
  progressPct: number;
  totalChapters: number;
  completedChapters: number;
  status: "active" | "completed" | "available";
  ctaLabel: string;
  ctaTo: string;
  tag?: string;
  isMain?: boolean; // featured main course
}

// ── 8-book mini-timeline for the main card ───────────────────────────────────
const TIMELINE_MINI = [
  { name: "דניאל", done: true },
  { name: "איכה", done: true },
  { name: "עזרא-נחמיה", done: true },
  { name: "אסתר", done: true },
  { name: "חגי", done: false, current: false },
  { name: "זכריה", done: false, current: true },
  { name: "מלאכי", done: false },
  { name: "יהושע", done: false },
];

// ── My courses (purchased / active) ──────────────────────────────────────────
const MY_COURSES: CourseCard[] = [
  {
    slug: "weekly-chapter",
    title: "הפרק השבועי בתנ״ך",
    subtitle: "הרב יואב אוריאל · תכנית מנויים",
    coverGradient: gradients.warmDark,
    progressPct: 43,
    totalChapters: 64,
    completedChapters: 18,
    status: "active",
    ctaLabel: "המשך",
    ctaTo: "/design-course/weekly-chapter",
    tag: "מנוי פעיל",
    isMain: true,
  },
  {
    slug: "how-to-learn-tanach",
    title: "איך ללמוד תנ״ך",
    subtitle: "מיומנויות קריאה, קושיות, ופרשנות עצמאית",
    coverGradient: "linear-gradient(135deg, #4A5A2E 0%, #6B7F42 100%)",
    progressPct: 100,
    totalChapters: 8,
    completedChapters: 8,
    status: "completed",
    ctaLabel: "צפה שוב",
    ctaTo: "/design-series-list",
    tag: "הושלם",
  },
];

// ── Additional courses you might like (not yet owned) ────────────────────────
const MORE_COURSES: CourseCard[] = [
  {
    slug: "parasha",
    title: "פרשת השבוע",
    subtitle: "לימוד שבועי לפי הפרשה · כל השנה",
    coverGradient: "linear-gradient(135deg, #1A3A5C 0%, #2D6090 100%)",
    progressPct: 0,
    totalChapters: 54,
    completedChapters: 0,
    status: "available",
    ctaLabel: "גלה עוד",
    ctaTo: "/design-series-list",
  },
  {
    slug: "avot",
    title: "פרקי אבות",
    subtitle: "ששה פרקים של מוסר, חכמה וזהות יהודית",
    coverGradient: "linear-gradient(135deg, #5C3A1A 0%, #8B5C2A 100%)",
    progressPct: 0,
    totalChapters: 6,
    completedChapters: 0,
    status: "available",
    ctaLabel: "גלה עוד",
    ctaTo: "/design-series-list",
  },
  {
    slug: "tehilim",
    title: "תהילים — ספר התפילות",
    subtitle: "150 מזמורים · לימוד מעמיק ורוחני",
    coverGradient: "linear-gradient(135deg, #2D7D7D 0%, #1A5C5C 100%)",
    progressPct: 0,
    totalChapters: 24,
    completedChapters: 0,
    status: "available",
    ctaLabel: "גלה עוד",
    ctaTo: "/design-series-list",
  },
];

export default function DesignPreviewCoursesCatalog() {
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "available">("all");

  const allCourses = [...MY_COURSES, ...MORE_COURSES];
  const filtered =
    filter === "all"
      ? MY_COURSES // default: show only mine
      : filter === "available"
      ? MORE_COURSES
      : MY_COURSES.filter((c) => c.status === filter);

  const activeCnt = MY_COURSES.filter((c) => c.status === "active").length;
  const completedCnt = MY_COURSES.filter((c) => c.status === "completed").length;

  return (
    <DesignLayout sidebar={false}>
      <div dir="rtl" style={{ background: colors.parchment, minHeight: "100vh" }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <section
          style={{
            background: gradients.warmDark,
            padding: "3.5rem 1.5rem 4.5rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 20% 50%, rgba(232,213,160,0.08) 0%, transparent 60%)",
            }}
          />
          <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
            {/* Breadcrumb */}
            <nav style={{ marginBottom: "1.25rem" }}>
              <Link
                to="/design-portal-subscriber"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontFamily: fonts.body,
                  fontSize: "0.78rem",
                  color: "rgba(232,213,160,0.65)",
                  textDecoration: "none",
                }}
              >
                <ChevronLeft size={13} />
                האזור האישי
              </Link>
            </nav>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.25rem 0.75rem",
                borderRadius: radii.pill,
                background: "rgba(232,213,160,0.12)",
                border: "1px solid rgba(232,213,160,0.25)",
                color: colors.goldShimmer,
                fontFamily: fonts.body,
                fontSize: "0.7rem",
                fontWeight: 700,
                marginBottom: "0.75rem",
              }}
            >
              <BookOpen size={11} />
              ספריית הקורסים
            </div>

            <h1
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)",
                color: "white",
                margin: "0 0 0.5rem",
                lineHeight: 1.2,
              }}
            >
              הקורסים שלי
            </h1>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "0.92rem",
                color: "rgba(255,255,255,0.6)",
                margin: 0,
              }}
            >
              {activeCnt} פעיל · {completedCnt} הושלם
            </p>
          </div>
        </section>

        {/* ── Filter tabs ─────────────────────────────────────────────── */}
        <div
          style={{
            background: "white",
            borderBottom: `1px solid rgba(139,111,71,0.1)`,
            padding: "0 1.5rem",
            position: "sticky",
            top: 64,
            zIndex: 30,
          }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: "0.15rem", overflowX: "auto" }}>
            {(
              [
                { key: "all" as const, label: "הקורסים שלי", count: MY_COURSES.length },
                { key: "active" as const, label: "פעיל", count: activeCnt },
                { key: "completed" as const, label: "הושלם", count: completedCnt },
                { key: "available" as const, label: "קורסים נוספים", count: MORE_COURSES.length },
              ]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: "1rem 1.1rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: fonts.body,
                  fontWeight: 700,
                  fontSize: "0.86rem",
                  color: filter === tab.key ? colors.goldDark : colors.textMuted,
                  borderBottom:
                    filter === tab.key ? `2.5px solid ${colors.goldDark}` : "2.5px solid transparent",
                  marginBottom: -1,
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  transition: "color 0.15s",
                }}
              >
                {tab.label}
                <span
                  style={{
                    padding: "0.1rem 0.45rem",
                    borderRadius: radii.pill,
                    background: filter === tab.key ? "rgba(139,111,71,0.12)" : "rgba(139,111,71,0.06)",
                    color: filter === tab.key ? colors.goldDark : colors.textSubtle,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Section: my courses ─────────────────────────────────────── */}
        <section style={{ padding: "3rem 1.5rem" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            {(filter === "all" || filter === "active" || filter === "completed") && (
              <>
                {/* Featured main course — full-width card */}
                {MY_COURSES.filter(
                  (c) => c.isMain && (filter === "all" || c.status === filter)
                ).map((course) => (
                  <MainCourseCard key={course.slug} course={course} />
                ))}

                {/* Secondary courses grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: "1.5rem",
                    marginTop: "1.5rem",
                  }}
                  className="courses-grid"
                >
                  {MY_COURSES.filter(
                    (c) => !c.isMain && (filter === "all" || c.status === filter)
                  ).map((course) => (
                    <CourseTile key={course.slug} course={course} />
                  ))}
                </div>
              </>
            )}

            {/* Available (not yet owned) */}
            {filter === "available" && (
              <>
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.88rem",
                    color: colors.textMuted,
                    marginBottom: "1.75rem",
                    padding: "1rem 1.25rem",
                    borderRadius: radii.lg,
                    background: "rgba(139,111,71,0.05)",
                    border: "1px solid rgba(139,111,71,0.1)",
                  }}
                >
                  קורסים אלה זמינים לרכישה נפרדת או כחלק ממנוי.
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: "1.5rem",
                  }}
                  className="courses-grid"
                >
                  {MORE_COURSES.map((course) => (
                    <CourseTile key={course.slug} course={course} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Section: explore more ──────────────────────────────────── */}
        {(filter === "all") && (
          <section style={{ background: colors.parchmentDark, padding: "3rem 1.5rem 4rem" }}>
            <div dir="rtl" style={{ maxWidth: 1100, margin: "0 auto" }}>
              <div
                style={{
                  marginBottom: "1.75rem",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: fonts.body,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: colors.oliveMain,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      marginBottom: "0.2rem",
                    }}
                  >
                    קורסים נוספים
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
                    קורסים שתאהב
                  </h2>
                </div>
                <button
                  onClick={() => setFilter("available")}
                  style={{
                    padding: "0.6rem 1.1rem",
                    borderRadius: radii.md,
                    background: "transparent",
                    border: `1.5px solid ${colors.goldDark}`,
                    color: colors.goldDark,
                    fontFamily: fonts.accent,
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  הצג הכל
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "1.25rem",
                }}
                className="courses-grid"
              >
                {MORE_COURSES.map((course) => (
                  <CourseTile key={course.slug} course={course} />
                ))}
              </div>
            </div>
          </section>
        )}

        <style>{`
          @media (max-width: 640px) {
            .courses-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </DesignLayout>
  );
}

// ── Main course card (featured — full width) ──────────────────────────────────
function MainCourseCard({ course }: { course: CourseCard }) {
  return (
    <Link to={course.ctaTo} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div
        style={{
          background: "white",
          borderRadius: radii.xl,
          overflow: "hidden",
          border: "1px solid rgba(139,111,71,0.12)",
          boxShadow: "0 8px 32px rgba(139,111,71,0.12)",
          transition: "transform 0.22s, box-shadow 0.22s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 16px 48px rgba(139,111,71,0.18)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(139,111,71,0.12)";
        }}
      >
        {/* Dark top bar */}
        <div
          style={{
            background: course.coverGradient,
            padding: "2.25rem 2rem",
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
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              {/* Tag */}
              {course.tag && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.2rem 0.65rem",
                    borderRadius: radii.pill,
                    background: "rgba(232,213,160,0.15)",
                    border: "1px solid rgba(232,213,160,0.3)",
                    color: colors.goldShimmer,
                    fontFamily: fonts.body,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    marginBottom: "0.6rem",
                  }}
                >
                  <Sparkles size={10} />
                  {course.tag}
                </div>
              )}
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: "clamp(1.4rem, 2.5vw, 1.85rem)",
                  color: "white",
                  margin: "0 0 0.35rem",
                  fontStyle: "italic",
                }}
              >
                {course.title}
              </h2>
              <div style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: "rgba(255,255,255,0.65)" }}>
                {course.subtitle}
              </div>
            </div>

            {/* CTA */}
            <div
              style={{
                padding: "0.85rem 1.75rem",
                borderRadius: radii.lg,
                background: gradients.goldButton,
                color: "white",
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "0.95rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                boxShadow: shadows.goldGlow,
                flexShrink: 0,
              }}
            >
              <Play size={15} fill="currentColor" />
              {course.ctaLabel}
            </div>
          </div>
        </div>

        {/* Content bottom */}
        <div style={{ padding: "1.5rem 2rem" }}>
          {/* 8-book mini-timeline */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.7rem",
                fontWeight: 700,
                color: colors.goldDark,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.85rem",
              }}
            >
              מסלול הלמידה
            </div>
            <div style={{ display: "flex", gap: "0", alignItems: "center", overflowX: "auto" }}>
              {TIMELINE_MINI.map((book, idx) => (
                <div key={book.name} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", minWidth: 60 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: book.done
                          ? "rgba(91,110,58,0.12)"
                          : book.current
                          ? gradients.goldButton
                          : "rgba(139,111,71,0.06)",
                        border: `2px solid ${
                          book.done
                            ? "rgba(91,110,58,0.3)"
                            : book.current
                            ? colors.goldDark
                            : "rgba(139,111,71,0.12)"
                        }`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {book.done ? (
                        <CheckCircle2 size={14} style={{ color: colors.oliveMain }} />
                      ) : book.current ? (
                        <Play size={12} fill="white" style={{ color: "white" }} />
                      ) : (
                        <Clock size={11} style={{ color: colors.textSubtle }} />
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: fonts.body,
                        fontSize: "0.6rem",
                        color: book.done ? colors.oliveMain : book.current ? colors.goldDark : colors.textSubtle,
                        fontWeight: book.current ? 700 : 400,
                        textAlign: "center",
                      }}
                    >
                      {book.name}
                    </div>
                  </div>
                  {idx < TIMELINE_MINI.length - 1 && (
                    <div
                      style={{
                        width: 16,
                        height: 2,
                        background: book.done ? "rgba(91,110,58,0.3)" : "rgba(139,111,71,0.1)",
                        flexShrink: 0,
                        marginBottom: "1rem",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: fonts.body,
                fontSize: "0.73rem",
                color: colors.textSubtle,
                marginBottom: "0.4rem",
              }}
            >
              <span>{course.completedChapters} מתוך {course.totalChapters} פרקים</span>
              <span style={{ color: colors.goldDark, fontWeight: 700 }}>{course.progressPct}%</span>
            </div>
            <div
              style={{
                height: 5,
                background: "rgba(139,111,71,0.1)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${course.progressPct}%`,
                  height: "100%",
                  background: gradients.goldButton,
                  borderRadius: 3,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Regular course tile ────────────────────────────────────────────────────────
function CourseTile({ course }: { course: CourseCard }) {
  const isCompleted = course.status === "completed";
  const isActive = course.status === "active";
  const isAvailable = course.status === "available";

  return (
    <div
      style={{
        background: "white",
        borderRadius: radii.xl,
        overflow: "hidden",
        border: "1px solid rgba(139,111,71,0.1)",
        boxShadow: shadows.cardSoft,
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.22s, box-shadow 0.22s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 12px 36px rgba(139,111,71,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = shadows.cardSoft;
      }}
    >
      {/* Cover */}
      <div
        style={{
          height: 140,
          background: course.coverGradient,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)",
          }}
        />

        {isCompleted && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(91,110,58,0.25)",
              border: "2px solid rgba(91,110,58,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle2 size={22} style={{ color: "rgba(255,255,255,0.95)" }} />
          </div>
        )}

        {/* Tag badge */}
        {course.tag && (
          <div
            style={{
              position: "absolute",
              top: "0.75rem",
              insetInlineStart: "0.75rem",
              padding: "0.22rem 0.6rem",
              borderRadius: radii.pill,
              background: isActive ? "rgba(232,213,160,0.15)" : "rgba(91,110,58,0.15)",
              border: `1px solid ${isActive ? "rgba(232,213,160,0.3)" : "rgba(91,110,58,0.3)"}`,
              color: isActive ? colors.goldShimmer : "rgba(180,220,150,0.9)",
              fontFamily: fonts.body,
              fontSize: "0.68rem",
              fontWeight: 700,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            {isActive ? <Sparkles size={9} /> : <CheckCircle2 size={9} />}
            {course.tag}
          </div>
        )}
      </div>

      {/* Body */}
      <div
        style={{
          padding: "1.4rem 1.5rem 1.6rem",
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <h3
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: "1.05rem",
            color: colors.textDark,
            margin: "0 0 0.3rem",
            lineHeight: 1.3,
          }}
        >
          {course.title}
        </h3>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: "0.82rem",
            color: colors.textMuted,
            margin: "0 0 1.1rem",
            lineHeight: 1.6,
            flex: 1,
          }}
        >
          {course.subtitle}
        </p>

        {/* Progress (active/completed) */}
        {!isAvailable && (
          <div style={{ marginBottom: "1.1rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: fonts.body,
                fontSize: "0.7rem",
                color: colors.textSubtle,
                marginBottom: "0.35rem",
              }}
            >
              <span>{course.completedChapters}/{course.totalChapters} פרקים</span>
              <span style={{ color: isCompleted ? colors.oliveMain : colors.goldDark, fontWeight: 700 }}>
                {course.progressPct}%
              </span>
            </div>
            <div
              style={{
                height: 4,
                background: "rgba(139,111,71,0.1)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${course.progressPct}%`,
                  height: "100%",
                  background: isCompleted ? colors.oliveMain : gradients.goldButton,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        )}

        {/* Available info */}
        {isAvailable && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1.1rem",
              padding: "0.55rem 0.75rem",
              borderRadius: radii.md,
              background: colors.parchment,
              border: "1px solid rgba(139,111,71,0.1)",
            }}
          >
            <Star size={13} style={{ color: colors.goldDark, flexShrink: 0 }} />
            <span style={{ fontFamily: fonts.body, fontSize: "0.76rem", color: colors.textMuted }}>
              {course.totalChapters} פרקים · זמין לרכישה
            </span>
          </div>
        )}

        {/* CTA */}
        <Link
          to={course.ctaTo}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.45rem",
            padding: "0.78rem 1.25rem",
            borderRadius: radii.lg,
            background: isAvailable ? "transparent" : gradients.goldButton,
            border: isAvailable ? `1.5px solid ${colors.goldDark}` : "none",
            color: isAvailable ? colors.goldDark : "white",
            fontFamily: fonts.accent,
            fontWeight: 700,
            fontSize: "0.88rem",
            textDecoration: "none",
            boxShadow: isAvailable ? "none" : shadows.goldGlow,
            transition: "opacity 0.18s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {isAvailable ? (
            <>
              <ShoppingBag size={14} />
              {course.ctaLabel}
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              {course.ctaLabel}
            </>
          )}
        </Link>
      </div>
    </div>
  );
}
