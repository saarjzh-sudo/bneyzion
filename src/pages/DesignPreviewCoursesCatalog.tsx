/**
 * /design-courses — Courses catalog page.
 *
 * Shows all courses the user has purchased / enrolled in, plus locked
 * courses with a CTA to purchase. Completely separate from the personal
 * profile (/design-portal-subscriber) — that page is profile+stats,
 * this page is purely the course catalog grid.
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
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";

// ── Mock catalog ─────────────────────────────────────────────────────────────
interface CourseCard {
  slug: string;
  title: string;
  subtitle: string;
  coverColor: string;
  progressPct: number;
  totalChapters: number;
  completedChapters: number;
  status: "active" | "completed" | "locked";
  ctaLabel: string;
  ctaTo: string;
  tag?: string;
}

const COURSES: CourseCard[] = [
  {
    slug: "weekly-chapter",
    title: "הפרק השבועי בתנ\"ך",
    subtitle: "חגי, זכריה ומלאכי — הרב יואב אוריאל",
    coverColor: gradients.warmDark,
    progressPct: 43,
    totalChapters: 19,
    completedChapters: 8,
    status: "active",
    ctaLabel: "המשך",
    ctaTo: "/design-course/zechariah",
    tag: "מנוי פעיל",
  },
  {
    slug: "eicha",
    title: "מגילת איכה",
    subtitle: "קינות ותקווה — לימוד מעמיק לתשעה באב",
    coverColor: "linear-gradient(135deg, #422817 0%, #6B2A0E 100%)",
    progressPct: 100,
    totalChapters: 5,
    completedChapters: 5,
    status: "completed",
    ctaLabel: "צפה שוב",
    ctaTo: "/design-course/eicha",
    tag: "הושלם",
  },
  {
    slug: "daniel",
    title: "סדרת דניאל",
    subtitle: "חזיונות, מסרים וגאולה — לימוד שיטתי",
    coverColor: "linear-gradient(135deg, #1A2744 0%, #2D4080 100%)",
    progressPct: 0,
    totalChapters: 12,
    completedChapters: 0,
    status: "locked",
    ctaLabel: "רכוש",
    ctaTo: "/design-megilat-esther",
  },
  {
    slug: "esther",
    title: "סדרת אסתר",
    subtitle: "הסתר פנים, נסים נסתרים ותכנית אלוהית",
    coverColor: "linear-gradient(135deg, #2D4A2A 0%, #4A7A40 100%)",
    progressPct: 0,
    totalChapters: 10,
    completedChapters: 0,
    status: "locked",
    ctaLabel: "רכוש",
    ctaTo: "/design-megilat-esther",
  },
];

export default function DesignPreviewCoursesCatalog() {
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "locked">("all");

  const filtered =
    filter === "all" ? COURSES : COURSES.filter((c) => c.status === filter);

  const activeCnt = COURSES.filter((c) => c.status === "active").length;
  const completedCnt = COURSES.filter((c) => c.status === "completed").length;
  const lockedCnt = COURSES.filter((c) => c.status === "locked").length;

  return (
    <DesignLayout sidebar={false}>
      <div dir="rtl" style={{ background: colors.parchment, minHeight: "100vh" }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <section
          style={{
            background: gradients.warmDark,
            padding: "3.5rem 1.5rem 4rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 20% 50%, rgba(232,213,160,0.08) 0%, transparent 60%)",
            }}
          />
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              position: "relative",
            }}
          >
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
              {activeCnt} פעיל · {completedCnt} הושלם · {lockedCnt} זמין לרכישה
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
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              display: "flex",
              gap: "0.15rem",
              overflowX: "auto",
            }}
          >
            {(
              [
                { key: "all", label: "הכל", count: COURSES.length },
                { key: "active", label: "פעיל", count: activeCnt },
                { key: "completed", label: "הושלם", count: completedCnt },
                { key: "locked", label: "זמין לרכישה", count: lockedCnt },
              ] as { key: typeof filter; label: string; count: number }[]
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
                    filter === tab.key
                      ? `2.5px solid ${colors.goldDark}`
                      : "2.5px solid transparent",
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
                    background:
                      filter === tab.key
                        ? "rgba(139,111,71,0.12)"
                        : "rgba(139,111,71,0.06)",
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

        {/* ── Course grid ─────────────────────────────────────────────── */}
        <section style={{ padding: "3rem 1.5rem" }}>
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1.5rem",
            }}
            className="courses-grid"
          >
            {filtered.map((course) => (
              <CourseTile key={course.slug} course={course} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div
              style={{
                maxWidth: 480,
                margin: "4rem auto",
                textAlign: "center",
                padding: "3rem 2rem",
                background: "white",
                borderRadius: radii.xl,
                border: `1px solid rgba(139,111,71,0.1)`,
                boxShadow: shadows.cardSoft,
              }}
            >
              <BookOpen size={36} style={{ color: colors.textSubtle, margin: "0 auto 1rem" }} />
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.92rem",
                  color: colors.textMuted,
                  margin: 0,
                }}
              >
                אין קורסים בקטגוריה זו
              </p>
            </div>
          )}
        </section>

        <style>{`
          @media (max-width: 640px) {
            .courses-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </DesignLayout>
  );
}

// ── Course tile component ─────────────────────────────────────────────────────
function CourseTile({ course }: { course: CourseCard }) {
  const isLocked = course.status === "locked";
  const isCompleted = course.status === "completed";
  const isActive = course.status === "active";

  const tagColor = isCompleted
    ? colors.oliveMain
    : isActive
    ? colors.goldDark
    : colors.textSubtle;

  const tagBg = isCompleted
    ? "rgba(91,110,58,0.1)"
    : isActive
    ? "rgba(139,111,71,0.12)"
    : "rgba(139,111,71,0.06)";

  return (
    <div
      style={{
        background: "white",
        borderRadius: radii.xl,
        overflow: "hidden",
        border: `1px solid rgba(139,111,71,0.1)`,
        boxShadow: isLocked ? "none" : shadows.cardSoft,
        opacity: isLocked ? 0.88 : 1,
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
        e.currentTarget.style.boxShadow = isLocked ? "none" : shadows.cardSoft;
      }}
    >
      {/* Cover image area */}
      <div
        style={{
          height: 160,
          background: course.coverColor,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)",
          }}
        />

        {/* Lock overlay for locked courses */}
        {isLocked && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                border: "2px solid rgba(255,255,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock size={22} style={{ color: "rgba(255,255,255,0.9)" }} />
            </div>
          </div>
        )}

        {/* Completed checkmark */}
        {isCompleted && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(91,110,58,0.25)",
              border: "2px solid rgba(91,110,58,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle2 size={24} style={{ color: "rgba(255,255,255,0.95)" }} />
          </div>
        )}

        {/* Tag badge */}
        {course.tag && (
          <div
            style={{
              position: "absolute",
              top: "0.75rem",
              insetInlineStart: "0.75rem",
              padding: "0.25rem 0.65rem",
              borderRadius: radii.pill,
              background: tagBg,
              border: `1px solid ${tagColor}40`,
              color: tagColor,
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
            {isActive && <Sparkles size={10} />}
            {isCompleted && <CheckCircle2 size={10} />}
            {course.tag}
          </div>
        )}
      </div>

      {/* Card body */}
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
            fontSize: "1.1rem",
            color: colors.textDark,
            margin: "0 0 0.35rem",
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
            margin: "0 0 1.25rem",
            lineHeight: 1.6,
            flex: 1,
          }}
        >
          {course.subtitle}
        </p>

        {/* Progress (shown for active/completed only) */}
        {!isLocked && (
          <div style={{ marginBottom: "1.25rem" }}>
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
              <span>
                {course.completedChapters} מתוך {course.totalChapters} פרקים
              </span>
              <span style={{ color: isCompleted ? colors.oliveMain : colors.goldDark, fontWeight: 700 }}>
                {course.progressPct}%
              </span>
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
                  background: isCompleted ? colors.oliveMain : gradients.goldButton,
                  borderRadius: 3,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Locked info */}
        {isLocked && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1.25rem",
              padding: "0.65rem 0.85rem",
              borderRadius: radii.md,
              background: colors.parchment,
              border: `1px solid rgba(139,111,71,0.1)`,
            }}
          >
            <Clock size={14} style={{ color: colors.textSubtle, flexShrink: 0 }} />
            <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted }}>
              {course.totalChapters} פרקים · נעול — דורש רכישה
            </span>
          </div>
        )}

        {/* CTA button */}
        <Link
          to={course.ctaTo}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.45rem",
            padding: "0.78rem 1.25rem",
            borderRadius: radii.lg,
            background: isLocked ? "transparent" : gradients.goldButton,
            border: isLocked ? `1.5px solid ${colors.goldDark}` : "none",
            color: isLocked ? colors.goldDark : "white",
            fontFamily: fonts.accent,
            fontWeight: 700,
            fontSize: "0.88rem",
            textDecoration: "none",
            boxShadow: isLocked ? "none" : shadows.goldGlow,
            transition: "opacity 0.18s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {isLocked ? (
            <>
              <ShoppingBag size={14} />
              {course.ctaLabel}
            </>
          ) : isCompleted ? (
            <>
              <Play size={14} fill="currentColor" />
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
