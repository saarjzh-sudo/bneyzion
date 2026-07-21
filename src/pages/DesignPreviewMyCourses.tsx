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
  /** יואב 14.7: כמה מילים על הקורס — מוצג על הכרטיס */
  description?: string | null;
  /** מחיר רכישה חד-פעמית (מ-community_courses.price) — הופך את הכרטיס למכירתי */
  price?: number | null;
  slug: string | null;
  gradient: string;
  /** (סער 10.7) תמונת אקוורל מה-DB — כשקיימת, מחליפה את הגרדיאנט */
  imageUrl?: string | null;
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
      {/* Cover — תמונת אקוורל כשקיימת, גרדיאנט אחרת. שכבת-כהות עדינה בתחתית
          שומרת על קריאות הכותרת הלבנה מעל התמונה. */}
      <div
        style={{
          background: course.imageUrl
            ? `linear-gradient(180deg, rgba(26,39,68,0.06) 30%, rgba(24,32,26,0.66) 100%), url('${course.imageUrl}') center / cover no-repeat`
            : course.gradient,
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
              textShadow: course.imageUrl ? "0 1px 10px rgba(0,0,0,0.45)" : undefined,
            }}
          >
            {course.title}
          </h3>
          {course.subtitle && (
            <p
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "0.85rem",
                textShadow: course.imageUrl ? "0 1px 8px rgba(0,0,0,0.5)" : undefined,
              }}
            >
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

      {/* תיאור קצר (יואב 14.7) — "לימוד ספר דניאל באופן יסודי, פרק אחרי פרק" */}
      {course.description && (
        <p
          style={{
            background: "white",
            margin: 0,
            padding: "0.9rem 1.25rem 0",
            color: colors.textMuted,
            fontSize: "0.85rem",
            lineHeight: 1.6,
            direction: "rtl",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {course.description}
        </p>
      )}

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
        {course.lessonCount > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: colors.textMuted, fontSize: "0.8rem" }}>
            <BookOpen size={14} />
            <span>{course.lessonCount} שיעורים</span>
          </div>
        ) : (
          <span />
        )}

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
        ) : course.price && course.price > 0 ? (
          /* מכירתי (יואב 14.7): מחיר גלוי + כניסה ישירה לעמוד הקורס לרכישה */
          <Link
            to={course.ctaTo}
            style={{
              background: gradients.goldButton,
              color: "white",
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "0.85rem",
              padding: "0.45rem 1.1rem",
              borderRadius: radii.md,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: shadows.goldGlow,
            }}
          >
            לרכישה — ₪{Number(course.price).toLocaleString()}
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
  const { user, isAdmin, isLoading: authLoading, signInWithGoogle } = useAuth();
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
    // יואב 21.7: גם אדמין נכנס דרך כרטיס-השער — ספרי התכנית לא נפרסים לו ככרטיסים.
    if (hasWeeklyChapter || isAdmin) {
      result.push({
        id: "weekly-chapter",
        title: "הפרק השבועי בתנ\"ך",
        // יואב 18.7: כרטיס-שער אחד לכל התכנית — כל ספרי הפרק השבועי בפנים
        subtitle: "הרב יואב אוריאל · השער לכל ספרי התכנית",
        slug: "weekly-chapter",
        gradient: gradients.warmDark,
        // יואב 13.7 (אודיט): הוסרו מספרי-דמה (43%/64). מנוי מתמשך אין לו "אחוז השלמה",
        // וספירת-שיעורים קשיחה מטעה — 0 → הפס והספירה מוסתרים (guard בפוטר).
        progressPct: 0,
        lessonCount: 0,
        hasAccess: true,
        ctaTo: "/course/weekly-chapter",
        ctaLabel: "המשך ללמוד",
        tag: hasWeeklyChapter ? "מנוי פעיל" : "גישת מנהל",
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
    // סער 14.7: קורס-ספר שנרכש נפתח בדף הספר המסודר-לפי-פרקים
    // (/course/book-*), לא בדף הפורטל השטוח.
    for (const enr of enrollments as any[]) {
      const cc = enr.community_courses;
      if (!cc) continue;
      result.push({
        id: cc.id,
        title: cc.title,
        // יואב 14.7: על כל קורס כתוב מי יצר אותו — ברירת מחדל הרב יואב אוריאל
        subtitle: `מאת ${cc.rabbis?.name || "הרב יואב אוריאל"}`,
        description: cc.description ?? null,
        slug: cc.id,
        gradient: courseGradient(null),
        imageUrl: cc.image_url ?? null,
        progressPct: 0,
        lessonCount: cc.total_lessons ?? 0,
        hasAccess: true,
        ctaTo: cc.program_slug ? `/course/${cc.program_slug}` : `/portal/course/${cc.id}`,
        ctaLabel: "כניסה לקורס",
        accessType: cc.access_type ?? "open",
      });
    }

    // 2ב. אדמין + מנוי הפרק השבועי — קורסי-הספרים פתוחים להם בפועל
    // (זהה לשער בדף הקורס: hasAccess = isAdmin || programAccess). בלי זה
    // הקטלוג הציג להם "לצפייה ורכישה" בעוד שהדף עצמו נפתח מלא — הבאג
    // שיואב מצא 15.7. מנוי גם עלול היה לרכוש שוב קורס שכלול במנוי שלו.
    for (const cc of allCourses as any[]) {
      if (enrolledIds.has(cc.id)) continue;
      if (cc.access_type === "open" || cc.access_type === null) continue;
      // איכה למנויי-הקוהורט כבר מיוצגת בכרטיס "תכנית איכה" למעלה
      if (hasEicha && !hasWeeklyChapter && cc.program_slug === "book-lamentations") continue;
      // יואב 18.7 + 21.7: ספרי הפרק-השבועי לא נפרסים ככרטיסים נפרדים לאיש —
      // גם לא לאדמין. הכניסה תמיד דרך כרטיס-השער "הפרק השבועי בתנ\"ך".
      const isWeeklyBook =
        cc.in_weekly_program === true || String(cc.program_slug || "").startsWith("book-");
      if (isWeeklyBook) continue;
      if (!isAdmin) continue;
      result.push({
        id: cc.id,
        title: cc.title,
        subtitle: `מאת ${cc.rabbis?.name || "הרב יואב אוריאל"}`,
        description: cc.description ?? null,
        slug: cc.id,
        gradient: courseGradient(null),
        imageUrl: cc.image_url ?? null,
        progressPct: 0,
        lessonCount: cc.total_lessons ?? 0,
        hasAccess: true,
        ctaTo: cc.program_slug ? `/course/${cc.program_slug}` : `/portal/course/${cc.id}`,
        ctaLabel: "כניסה לקורס",
        tag: "גישת מנהל",
        accessType: cc.access_type,
      });
    }

    // 3. קורסים חינמיים (access_type=open) — רק למחובר. סער 14.7: לאורח הם
    // לא "הקורסים שלי" — הם מוצגים לו בהמשך העמוד ברשימה הכללית.
    if (user) {
      for (const cc of allCourses as any[]) {
        if (enrolledIds.has(cc.id)) continue;
        if (cc.access_type !== "open" && cc.access_type !== null) continue;
        result.push({
          id: cc.id,
          title: cc.title,
          subtitle: `מאת ${cc.rabbis?.name || "הרב יואב אוריאל"}`,
          description: cc.description ?? null,
          slug: cc.id,
          gradient: courseGradient(null),
          imageUrl: cc.image_url ?? null,
          progressPct: 0,
          lessonCount: cc.total_lessons ?? 0,
          hasAccess: true,
          ctaTo: cc.program_slug ? `/course/${cc.program_slug}` : `/portal/course/${cc.id}`,
          ctaLabel: "כניסה לקורס",
          tag: "חינמי",
          accessType: "open",
        });
      }
    }

    return result;
  }, [enrollments, allCourses, enrolledIds, hasWeeklyChapter, hasEicha, user, isAdmin]);

  // "כל הקורסים בתנ"ך" — מה שזמין למי שעוד אין לו גישה:
  // • requires_tag עם מחיר > 0 (ניתן לרכישה)
  // • subscribers_only (מפנה למנוי)
  // • לאורח: גם הקורסים החינמיים (כניסה אחרי התחברות)
  // סער 14.7: קורס בלי מחיר ובלי מסלול (חזל"מ) — לא מוצג בכלל.
  const lockedCourses = useMemo<CourseCardData[]>(() => {
    const ownedIds = new Set(myCourses.map((c) => c.id));
    const guestFree: CourseCardData[] = !user
      ? (allCourses as any[])
          .filter((cc: any) => cc.access_type === "open" || cc.access_type === null)
          .map((cc: any) => ({
            id: cc.id,
            title: cc.title,
            subtitle: `מאת ${cc.rabbis?.name || "הרב יואב אוריאל"}`,
            description: cc.description ?? null,
            slug: cc.id,
            gradient: courseGradient(null),
            imageUrl: cc.image_url ?? null,
            progressPct: 0,
            lessonCount: cc.total_lessons ?? 0,
            hasAccess: true,
            ctaTo: cc.program_slug ? `/course/${cc.program_slug}` : `/portal/course/${cc.id}`,
            ctaLabel: "כניסה חינם",
            tag: "חינמי",
            accessType: "open",
          }))
      : [];
    const paid = (allCourses as any[])
      .filter((cc: any) => {
        if (ownedIds.has(cc.id) || cc.access_type === "open" || cc.access_type === null) return false;
        // יואב 21.7: ספרי הפרק-השבועי לא מופיעים כקורסים בודדים גם ברשימה הכללית —
        // התכנית מיוצגת בבאנר "הפרק השבועי" למעלה.
        if (cc.in_weekly_program === true || String(cc.program_slug || "").startsWith("book-")) return false;
        if (cc.access_type === "subscribers_only") return true;
        return (Number(cc.price) || 0) > 0; // requires_tag בלי מחיר = מוסתר
      })
      .map((cc: any) => ({
        id: cc.id,
        title: cc.title,
        subtitle: `מאת ${cc.rabbis?.name || "הרב יואב אוריאל"}`,
        description: cc.description ?? null,
        price: cc.access_type === "requires_tag" ? Number(cc.price) || null : null,
        slug: cc.id,
        gradient: `linear-gradient(135deg, ${colors.textSubtle} 0%, #4a4a4a 100%)`,
        imageUrl: cc.image_url ?? null,
        progressPct: 0,
        lessonCount: cc.total_lessons ?? 0,
        hasAccess: false,
        // דניאל וחבריו (requires_tag עם program_slug) — דף הספר עצמו הוא דף
        // הרכישה (WeeklyBookDetail): שם רואים תוכן, מחיר וכפתור רכישה.
        ctaTo:
          cc.access_type === "subscribers_only"
            ? "/chapter-weekly"
            : cc.program_slug
              ? `/course/${cc.program_slug}`
              : `/portal/course/${cc.id}`,
        ctaLabel: "לצפייה ורכישה",
        accessType: cc.access_type,
      }));
    return [...paid, ...guestFree];
  }, [allCourses, myCourses, user]);

  // יואב 14.7: העמוד הוא קטלוג ציבורי — "קורסים בתנ"ך" — פתוח גם בלי התחברות.
  // אורח רואה את כל הקורסים עם CTA לרכישה/הצטרפות; ההתחברות מוצעת בעדינות
  // (כרטיס "יש לך כבר קורסים?") במקום חומת-נעילה שמבריחה מתעניינים.
  const isGuest = !authLoading && !user;

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
                בית הקורסים של בני ציון
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
              קורסים בתנ"ך
            </h1>
            <p style={{ color: "rgba(74,56,35,0.85)", fontSize: "1.05rem", maxWidth: 480, margin: "0 auto" }}>
              קורסי עומק מוקלטים מאת הרב יואב אוריאל — והקורסים שלך, במקום אחד
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
                    {isGuest ? "יש לך כבר קורסים אצלנו?" : "עדיין אין לך קורסים"}
                  </h3>
                  <p style={{ color: colors.textSubtle, marginBottom: 20 }}>
                    {isGuest
                      ? "התחברות מהירה עם Google תציג כאן את הקורסים שרכשת"
                      : "הצטרפו לתכנית הפרק השבועי או בחרו קורס מהרשימה למטה"}
                  </p>
                  {isGuest && (
                    <button
                      onClick={() => signInWithGoogle("/design-my-courses")}
                      style={{
                        background: "white",
                        color: colors.textDark,
                        fontFamily: fonts.display,
                        fontWeight: 700,
                        padding: "0.65rem 1.5rem",
                        borderRadius: radii.md,
                        border: `1px solid ${colors.parchmentDeep}`,
                        cursor: "pointer",
                        marginLeft: 10,
                      }}
                    >
                      כניסה עם Google
                    </button>
                  )}
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
                      כל הקורסים בתנ"ך
                    </h2>
                  </div>
                  <p style={{ color: colors.textSubtle, marginBottom: "1.25rem", fontSize: "0.9rem" }}>
                    קורסי עומק מוקלטים, ספר אחר ספר — רכישה חד-פעמית פותחת גישה מלאה
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
