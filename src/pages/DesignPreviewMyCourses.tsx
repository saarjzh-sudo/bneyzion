/**
 * /design-my-courses — "הקורסים שלי" — דף הלמידה האישי.
 *
 * מקור נתונים:
 *   - course_enrollments JOIN community_courses (דרך useMyEnrollments)
 *   - user_access_tags (דרך useUserAccess) לבדיקת גישה לתכנית הפרק השבועי
 *   - community_courses (הכל) — לסקציית "קורסים נוספים"
 *
 * שני sections:
 *   1. "הקורסים שלי" — קורסים שיש לי גישה (enrolled + access_type='open')
 *   2. "קורסים נוספים שתאהב" — קורסים שאין לי גישה (locked, גירוי לרכישה)
 *
 * Entry: header UserMenu → "הקורסים שלי" + entry נפרד מהפורטל.
 * Sandbox בלבד עד rollout מסאר.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Lock,
  Play,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingBag,
  Trophy,
  Flame,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import jerusalemWalls from "@/assets/jerusalem-walls.webp";
import { useMyEnrollments, useCommunityCoursesPublic } from "@/hooks/useCourseEnrollment";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useAuth } from "@/contexts/AuthContext";

// ── Gradient per course type ──────────────────────────────────────────────────
const COURSE_GRADIENTS: Record<string, string> = {
  "weekly-chapter-subscription": gradients.warmDark,
  default: `linear-gradient(135deg, ${colors.goldDark} 0%, ${colors.mahogany} 100%)`,
};

function courseGradient(slug: string | null | undefined) {
  if (!slug) return COURSE_GRADIENTS.default;
  return COURSE_GRADIENTS[slug] ?? COURSE_GRADIENTS.default;
}

// ── Lock icon overlay ─────────────────────────────────────────────────────────
function LockOverlay({ ctaLabel, ctaTo }: { ctaLabel: string; ctaTo: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        borderRadius: radii.lg,
        backdropFilter: "blur(2px)",
      }}
    >
      <Lock size={32} color="white" />
      <Link
        to={ctaTo}
        style={{
          background: colors.goldLight,
          color: colors.textDark,
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: "0.9rem",
          padding: "0.5rem 1.2rem",
          borderRadius: radii.md,
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 6,
          boxShadow: shadows.cardSoft,
        }}
      >
        <ShoppingBag size={16} />
        {ctaLabel}
      </Link>
    </div>
  );
}

// ── Course card ───────────────────────────────────────────────────────────────
interface CourseCardData {
  id: string;
  title: string;
  subtitle?: string;
  slug: string | null;
  gradient: string;
  progressPct: number;
  lessonCount: number;
  hasAccess: boolean;
  ctaTo: string;
  ctaLabel: string;
  tag?: string;
  isSubscription?: boolean;
  accessType: string | null;
}

function CourseCard({ course }: { course: CourseCardData }) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: radii.xl,
        overflow: "hidden",
        boxShadow: shadows.card,
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.cardHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.card;
      }}
    >
      {/* Gradient cover */}
      <div
        style={{
          background: course.gradient,
          padding: "1.5rem",
          minHeight: 160,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          direction: "rtl",
        }}
      >
        {/* Tag */}
        {course.tag && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
            <span
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "white",
                fontSize: "0.7rem",
                fontWeight: 700,
                fontFamily: fonts.display,
                padding: "2px 10px",
                borderRadius: radii.pill,
                letterSpacing: "0.05em",
              }}
            >
              {course.tag}
            </span>
          </div>
        )}

        {/* Title */}
        <div>
          <h3
            style={{
              fontFamily: fonts.display,
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "white",
              marginBottom: 4,
              lineHeight: 1.3,
            }}
          >
            {course.title}
          </h3>
          {course.subtitle && (
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}>
              {course.subtitle}
            </p>
          )}
        </div>

        {/* Progress bar (only for owned courses) */}
        {course.hasAccess && course.progressPct > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
                התקדמות
              </span>
              <span style={{ color: "white", fontSize: "0.75rem", fontWeight: 700 }}>
                {course.progressPct}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "rgba(255,255,255,0.25)",
                borderRadius: radii.pill,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${course.progressPct}%`,
                  background: colors.goldShimmer,
                  borderRadius: radii.pill,
                  transition: "width 0.8s ease-out",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          background: "white",
          padding: "1rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          direction: "rtl",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: colors.textMuted, fontSize: "0.8rem" }}>
          <BookOpen size={14} />
          <span>{course.lessonCount} שיעורים</span>
        </div>

        {course.hasAccess && course.lessonCount === 0 && !course.isSubscription ? (
          /* קורס בלי שיעורים עדיין — אין לאן להיכנס, אומרים את זה בכנות */
          <span
            style={{
              background: colors.parchmentDeep,
              color: colors.textMuted,
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "0.85rem",
              padding: "0.4rem 1rem",
              borderRadius: radii.md,
            }}
          >
            לא נפתח עדיין
          </span>
        ) : course.hasAccess ? (
          <Link
            to={course.ctaTo}
            style={{
              background: colors.goldDark,
              color: "white",
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "0.85rem",
              padding: "0.4rem 1rem",
              borderRadius: radii.md,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {course.isSubscription ? <Play size={14} /> : <ChevronLeft size={14} />}
            {course.ctaLabel}
          </Link>
        ) : (
          <Link
            to={course.ctaTo}
            style={{
              background: colors.parchmentDeep,
              color: colors.goldDark,
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "0.85rem",
              padding: "0.4rem 1rem",
              borderRadius: radii.md,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 4,
              border: `1px solid ${colors.goldLight}`,
            }}
          >
            <Lock size={13} />
            פרטים נוספים
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DesignPreviewMyCourses() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: enrollments = [], isLoading: enrollLoading } = useMyEnrollments();
  const { data: allCourses = [], isLoading: coursesLoading } = useCommunityCoursesPublic();
  const { hasAccess: hasWeeklyChapter, isLoading: accessLoading } = useUserAccess("program:weekly-chapter");
  // קוהורט איכה (ימי שני) — מסלול איכה עד המיזוג לרגילים אחרי ט' באב
  const { hasAccess: hasEicha } = useUserAccess("program:eicha-monday");

  const isLoading = authLoading || enrollLoading || coursesLoading || accessLoading;

  // IDs שיש לי enrollment
  const enrolledIds = useMemo(
    () => new Set((enrollments as any[]).map((e: any) => e.course_id)),
    [enrollments]
  );

  // קורסים פתוחים (access_type='open') + enrolled
  const myCourses = useMemo<CourseCardData[]>(() => {
    const result: CourseCardData[] = [];

    // 1. תכנית הפרק השבועי — מבוסס user_access_tags
    if (hasWeeklyChapter) {
      result.push({
        id: "weekly-chapter",
        title: "הפרק השבועי בתנ\"ך",
        subtitle: "הרב יואב אוריאל · תכנית מנויים",
        slug: "weekly-chapter",
        gradient: gradients.warmDark,
        progressPct: 43,
        lessonCount: 64,
        hasAccess: true,
        ctaTo: "/course/weekly-chapter",
        ctaLabel: "המשך ללמוד",
        tag: "מנוי פעיל",
        isSubscription: true,
        accessType: "subscribers_only",
      });
    }

    // 1ב. קוהורט איכה — מסלול ימי שני (מוצג רק למי שאין לו את המנוי הרגיל)
    if (hasEicha && !hasWeeklyChapter) {
      result.push({
        id: "eicha-monday",
        title: "לחיות תנ\"ך — מגילת איכה",
        subtitle: "הרב יואב אוריאל · ימי שני 21:00",
        slug: "book-lamentations",
        gradient: gradients.warmDark,
        progressPct: 0,
        lessonCount: 6,
        hasAccess: true,
        ctaTo: "/course/book-lamentations",
        ctaLabel: "המשך ללמוד",
        tag: "תכנית איכה",
        isSubscription: true,
        accessType: "subscribers_only",
      });
      // מעבר קל וברור לתכנית הראשית (8.7, סער) — הספר הנוכחי של ימי רביעי פתוח להם
      const mainBook = (allCourses as any[]).find((c: any) => c.is_current === true && c.in_weekly_program);
      if (mainBook) {
        result.push({
          id: "weekly-main-switch",
          title: "הפרק השבועי — התכנית הראשית",
          subtitle: `ימי רביעי · לומדים עכשיו: ${mainBook.title}`,
          slug: mainBook.program_slug,
          gradient: gradients.warmDark,
          progressPct: 0,
          lessonCount: mainBook.lesson_count ?? 0,
          hasAccess: true,
          ctaTo: `/course/${mainBook.program_slug}`,
          ctaLabel: "מעבר ללימוד הראשי",
          tag: "פתוח לכם",
          isSubscription: true,
          accessType: "subscribers_only",
        });
      }
    }

    // 2. קורסים enrolled מה-DB
    for (const enr of enrollments as any[]) {
      const cc = enr.community_courses;
      if (!cc) continue;
      result.push({
        id: cc.id,
        title: cc.title,
        subtitle: cc.rabbis?.name ? `${cc.rabbis.name}` : undefined,
        slug: cc.id,
        gradient: courseGradient(null),
        progressPct: 0,
        lessonCount: cc.total_lessons ?? 0,
        hasAccess: true,
        ctaTo: `/portal/course/${cc.id}`,
        ctaLabel: "כניסה לקורס",
        accessType: cc.access_type ?? "open",
      });
    }

    // 3. קורסים open שאין לי enrollment (auto-access)
    for (const cc of allCourses as any[]) {
      if (enrolledIds.has(cc.id)) continue;
      if (cc.access_type !== "open" && cc.access_type !== null) continue;
      result.push({
        id: cc.id,
        title: cc.title,
        subtitle: cc.rabbis?.name,
        slug: cc.id,
        gradient: courseGradient(null),
        progressPct: 0,
        lessonCount: cc.total_lessons ?? 0,
        hasAccess: true,
        ctaTo: `/portal/course/${cc.id}`,
        ctaLabel: "כניסה לקורס",
        tag: "חינמי",
        accessType: "open",
      });
    }

    return result;
  }, [enrollments, allCourses, enrolledIds, hasWeeklyChapter, hasEicha]);

  // קורסים נעולים — יש מחיר / requires_tag, אין לי גישה
  const lockedCourses = useMemo<CourseCardData[]>(() => {
    const ownedIds = new Set(myCourses.map((c) => c.id));
    return (allCourses as any[])
      .filter((cc: any) => !ownedIds.has(cc.id) && cc.access_type !== "open" && cc.access_type !== null)
      .map((cc: any) => ({
        id: cc.id,
        title: cc.title,
        subtitle: cc.rabbis?.name,
        slug: cc.id,
        gradient: `linear-gradient(135deg, ${colors.textSubtle} 0%, #4a4a4a 100%)`,
        progressPct: 0,
        lessonCount: cc.total_lessons ?? 0,
        hasAccess: false,
        ctaTo: cc.access_type === "subscribers_only" ? "/chapter-weekly" : `/store/${cc.id}`,
        ctaLabel: "הצטרף",
        accessType: cc.access_type,
      }));
  }, [allCourses, myCourses]);

  // לא מחובר
  if (!authLoading && !user) {
    return (
      <DesignLayout>
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            padding: "3rem 1rem",
            background: colors.parchment,
            direction: "rtl",
          }}
        >
          <Lock size={48} color={colors.textSubtle} />
          <h2 style={{ fontFamily: fonts.display, fontSize: "1.5rem", color: colors.textDark, fontWeight: 700 }}>
            יש להתחבר כדי לראות את הקורסים שלך
          </h2>
          <Link
            to="/portal-login?next=%2Fdesign-my-courses"
            style={{
              background: colors.goldDark,
              color: "white",
              fontFamily: fonts.display,
              fontWeight: 700,
              padding: "0.75rem 2rem",
              borderRadius: radii.lg,
              textDecoration: "none",
              fontSize: "1rem",
            }}
          >
            כניסה עם Google
          </Link>
        </div>
      </DesignLayout>
    );
  }

  return (
    <DesignLayout>
      <div style={{ background: colors.parchment, minHeight: "100vh", direction: "rtl" }}>
        {/* Hero — רמה 13: אקוורל-זהב מאחורי הגרדיאנט הכהה (הקו של יואב), הטקסט המוזהב נשאר קריא */}
        <div
          style={{
            backgroundImage: `linear-gradient(rgba(251,246,236,0.60), rgba(237,229,208,0.72)), url('/images/hero-watercolor-courses.webp')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            padding: "3rem 1.5rem 2.5rem",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(139,111,71,0.10)",
                border: "1px solid rgba(139,111,71,0.25)",
                borderRadius: radii.pill,
                padding: "4px 16px",
                marginBottom: 16,
              }}
            >
              <Trophy size={16} color="#8B6F47" />
              <span style={{ color: "#8B6F47", fontFamily: fonts.display, fontSize: "0.85rem" }}>
                אזור הלמידה האישי
              </span>
            </div>
            <h1
              style={{
                fontFamily: fonts.display,
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                fontWeight: 700,
                color: "#4A3823",
                textShadow: "0 1px 12px rgba(255,252,245,0.55)",
                marginBottom: 10,
                lineHeight: 1.2,
              }}
            >
              הקורסים שלי
            </h1>
            <p style={{ color: "rgba(74,56,35,0.85)", fontSize: "1.05rem", maxWidth: 480, margin: "0 auto" }}>
              כל הקורסים שיש לך גישה אליהם, במקום אחד
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.25rem" }}>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "4rem 0" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  border: `4px solid ${colors.goldDark}`,
                  borderTopColor: "transparent",
                  animation: "spin 0.8s linear infinite",
                  margin: "0 auto 16px",
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ color: colors.textSubtle, fontFamily: fonts.display }}>טוען קורסים...</p>
            </div>
          ) : (
            <>
              {/* ─── באנר תכנית הפרק השבועי — "הקורס" המרכזי (למי שעוד לא מנוי) ─── */}
              {!hasWeeklyChapter && !accessLoading && (
                <section
                  style={{
                    marginBottom: "3rem",
                    backgroundImage: `linear-gradient(105deg, rgba(24,19,11,0.92) 0%, rgba(30,25,14,0.78) 48%, rgba(24,19,11,0.5) 100%), url(${jerusalemWalls})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center 35%",
                    borderRadius: radii.xl,
                    border: "1px solid rgba(196,162,101,0.35)",
                    boxShadow: "0 16px 48px rgba(24,19,11,0.3)",
                    padding: "2.5rem 2.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "2rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: "0.4rem",
                      padding: "0.22rem 0.75rem", borderRadius: radii.pill,
                      background: "rgba(232,213,160,0.15)", border: "1px solid rgba(232,213,160,0.3)",
                      color: colors.goldShimmer, fontFamily: fonts.body,
                      fontSize: "0.68rem", fontWeight: 700, marginBottom: "0.8rem",
                    }}>
                      תכנית המנויים
                    </div>
                    <h2 style={{
                      fontFamily: fonts.display, fontWeight: 900,
                      fontSize: "clamp(1.4rem, 2.6vw, 2rem)",
                      color: "white", margin: "0 0 0.5rem", lineHeight: 1.2,
                    }}>
                      הפרק השבועי בתנ״ך — הקורס המרכזי שלנו
                    </h2>
                    <p style={{
                      fontFamily: fonts.body, fontSize: "0.92rem",
                      color: "rgba(255,255,255,0.78)", margin: 0, lineHeight: 1.7, maxWidth: 560,
                    }}>
                      פרק חדש כל שבוע עם הרב יואב אוריאל: שיעור חי, סיכומים מעוצבים וגישה לכל הארכיון.
                    </p>
                  </div>
                  <Link
                    to="/chapter-weekly"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.55rem",
                      padding: "1rem 2.25rem", borderRadius: radii.lg,
                      background: gradients.goldButton, color: "white",
                      fontFamily: fonts.display, fontWeight: 700, fontSize: "1rem",
                      textDecoration: "none", boxShadow: shadows.goldGlow,
                      flexShrink: 0, whiteSpace: "nowrap",
                    }}
                  >
                    להצטרפות לתכנית
                  </Link>
                </section>
              )}

              {/* ─── הקורסים שלי ─── */}
              {myCourses.length > 0 ? (
                <section style={{ marginBottom: "3rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
                    <CheckCircle2 size={22} color={colors.goldDark} />
                    <h2
                      style={{
                        fontFamily: fonts.display,
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        color: colors.textDark,
                        margin: 0,
                      }}
                    >
                      הקורסים שלי
                    </h2>
                    <span
                      style={{
                        background: colors.goldDark,
                        color: "white",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "2px 10px",
                        borderRadius: radii.pill,
                      }}
                    >
                      {myCourses.length}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: "1.25rem",
                    }}
                  >
                    {myCourses.map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                </section>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem 1.5rem",
                    background: "white",
                    borderRadius: radii.xl,
                    border: `1px solid ${colors.parchmentDeep}`,
                    marginBottom: "3rem",
                  }}
                >
                  <BookOpen size={48} color={colors.textSubtle} style={{ margin: "0 auto 12px" }} />
                  <h3 style={{ fontFamily: fonts.display, fontSize: "1.2rem", color: colors.textDark, marginBottom: 8 }}>
                    עדיין אין לך קורסים
                  </h3>
                  <p style={{ color: colors.textSubtle, marginBottom: 20 }}>
                    הצטרף לתכנית הפרק השבועי או בחר קורס מהרשימה למטה
                  </p>
                  <Link
                    to="/chapter-weekly"
                    style={{
                      background: colors.goldDark,
                      color: "white",
                      fontFamily: fonts.display,
                      fontWeight: 700,
                      padding: "0.65rem 1.5rem",
                      borderRadius: radii.md,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Sparkles size={16} />
                    הצטרף לתכנית
                  </Link>
                </div>
              )}

              {/* ─── קורסים נוספים שתאהב ─── */}
              {lockedCourses.length > 0 && (
                <section>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
                    <Flame size={22} color={colors.textSubtle} />
                    <h2
                      style={{
                        fontFamily: fonts.display,
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        color: colors.textDark,
                        margin: 0,
                      }}
                    >
                      קורסים נוספים שתאהב
                    </h2>
                  </div>
                  <p style={{ color: colors.textSubtle, marginBottom: "1.25rem", fontSize: "0.9rem" }}>
                    תכנים פרמיום שממתינים לך — הצטרף כדי לפתוח גישה מלאה
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: "1.25rem",
                    }}
                  >
                    {lockedCourses.map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                </section>
              )}

              {/* Empty state — אין קורסים נעולים גם כן */}
              {myCourses.length > 0 && lockedCourses.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    background: `linear-gradient(135deg, ${colors.oliveBg}, ${colors.parchment})`,
                    borderRadius: radii.xl,
                    border: `1px solid ${colors.parchmentDeep}`,
                    marginTop: "1rem",
                  }}
                >
                  <Trophy size={32} color={colors.goldDark} style={{ margin: "0 auto 10px" }} />
                  <p style={{ fontFamily: fonts.display, color: colors.textMid, fontWeight: 600 }}>
                    יש לך גישה לכל הקורסים הזמינים כרגע
                  </p>
                  <p style={{ color: colors.textSubtle, fontSize: "0.85rem", marginTop: 4 }}>
                    קורסים חדשים יתווספו בהמשך
                  </p>
                </div>
              )}

              {/* Quick nav */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: "2.5rem",
                  paddingTop: "2rem",
                  borderTop: `1px solid ${colors.parchmentDeep}`,
                  justifyContent: "center",
                }}
              >
                <Link
                  to="/portal"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0.5rem 1.25rem",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.goldLight}`,
                    color: colors.goldDark,
                    fontFamily: fonts.display,
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    textDecoration: "none",
                    background: "white",
                  }}
                >
                  <BookOpen size={16} />
                  פורטל הלומדים
                </Link>
                <Link
                  to="/chapter-weekly"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0.5rem 1.25rem",
                    borderRadius: radii.md,
                    background: colors.goldDark,
                    color: "white",
                    fontFamily: fonts.display,
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    textDecoration: "none",
                  }}
                >
                  <Sparkles size={16} />
                  תכנית הפרק השבועי
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </DesignLayout>
  );
}
