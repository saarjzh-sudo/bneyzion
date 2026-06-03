/**
 * /courses — Courses catalog page v3 (live DB data).
 *
 * v3 changes (2026-06-03):
 *   - "ספרי התכנית" section at top: live data from community_courses (in_weekly_program=true)
 *   - Each book card links to /course/book-<slug> with price from payment_products
 *   - default_amount=0 → "בקרוב" / disabled purchase (no ₪0 charge)
 *   - "הקורסים שלי" section below: live access check via useUserAccess
 *   - Kept mock MY_COURSES + MORE_COURSES for design reference only (below live section)
 *
 * v2.1 (2026-04-30): previewMode toggle
 * v2 (2026-04-30): TIMELINE_MINI, independent courses
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
  BookMarked,
  Loader2,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import {
  useWeeklyBooks,
  useAllPaymentProducts,
  type WeeklyCourse,
  type PaymentProduct,
} from "@/hooks/useCommunity";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useAuth } from "@/contexts/AuthContext";

type PreviewMode = "subscriber" | "member";

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
    ctaTo: "/course/weekly-chapter",
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
    ctaTo: "/series",
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
    ctaTo: "/series",
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
    ctaTo: "/series",
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
    ctaTo: "/series",
  },
];

// ── Live weekly-book card (for catalog) ───────────────────────────────────
const BOOK_ACCENTS: Record<string, string> = {
  "book-ezra":                    "#8B6F47",
  "book-nehemiah":                "#5B6E3A",
  "book-daniel":                  "#6B4E8B",
  "book-esther":                  "#A52A2A",
  "book-haggai-zechariah-malachi":"#3A7A85",
  "book-lamentations":            "#7A5A3A",
};

function LiveBookCard({ book, product }: { book: WeeklyCourse; product: PaymentProduct | undefined }) {
  const slug = book.program_slug ?? "";
  const accent = BOOK_ACCENTS[slug] ?? colors.goldDark;
  // Both access hooks always called
  const { hasAccess: bookAccess } = useUserAccess(book.access_tag ?? `course:${slug.replace("book-","")}`);
  const { hasAccess: programAccess } = useUserAccess("program:weekly-chapter");
  const hasAccess = bookAccess || programAccess;
  const { isAdmin } = useAuth();
  const price = product?.default_amount ?? 0;
  const priceDisplay = price > 0 ? `₪${price}` : "בקרוב";
  const canBuy = price > 0 && !hasAccess && !isAdmin;

  return (
    <div dir="rtl" style={{ background: "white", borderRadius: radii.xl, border: `1px solid rgba(139,111,71,0.1)`, boxShadow: shadows.cardSoft, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Cover strip */}
      <div style={{ height: 6, background: `linear-gradient(90deg, ${accent} 0%, ${accent}80 100%)` }} />
      <div style={{ padding: "1.25rem 1.35rem", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: radii.md, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {book.image_url
              ? <img src={book.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: radii.md }} />
              : <BookMarked size={20} style={{ color: accent }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1rem", color: colors.textDark, lineHeight: 1.25 }}>{book.title}</div>
            {book.description && (
              <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted, marginTop: "0.2rem", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{book.description}</div>
            )}
          </div>
        </div>
        {/* Status + price */}
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          {hasAccess || isAdmin ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.2rem 0.55rem", borderRadius: radii.pill, background: `${accent}14`, color: accent, fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700 }}>
              <BookOpen size={10} /> פתוח
            </span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.2rem 0.55rem", borderRadius: radii.pill, background: "rgba(139,111,71,0.07)", color: colors.textMuted, fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700 }}>
              <Lock size={10} /> {priceDisplay}
            </span>
          )}
          <Link
            to={`/course/${slug}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.42rem 0.9rem", borderRadius: radii.md, background: hasAccess || isAdmin ? `${accent}14` : gradients.goldButton, color: hasAccess || isAdmin ? accent : "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.75rem", textDecoration: "none", boxShadow: hasAccess || isAdmin ? "none" : shadows.goldGlow, transition: "all 0.15s" }}
          >
            {hasAccess || isAdmin ? "כנס לספר" : canBuy ? "רכישה" : "גלה עוד"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DesignPreviewCoursesCatalog() {
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "available">("all");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("subscriber");

  // Live data
  const { data: weeklyBooks = [], isLoading: booksLoading } = useWeeklyBooks();
  const { data: allProducts = [] } = useAllPaymentProducts();
  const productMap = new Map(allProducts.map((p) => [p.id, p]));

  const isSubscriber = previewMode === "subscriber";

  // For member mode: weekly-chapter is visible but locked; completed course stays
  const visibleMyCourses = MY_COURSES;

  const activeCnt = MY_COURSES.filter((c) => c.status === "active").length;
  const completedCnt = MY_COURSES.filter((c) => c.status === "completed").length;

  return (
    <DesignLayout sidebar={false}>
      <div dir="rtl" style={{ background: colors.parchment, minHeight: "100vh" }}>

        {/* ── Sandbox preview toggle ─────────────────────────────────── */}
        <div
          dir="rtl"
          style={{
            background: "rgba(45,31,14,0.97)",
            borderBottom: "1px solid rgba(232,213,160,0.15)",
            padding: "0.55rem 1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
          }}
        >
          <span style={{
            fontFamily: fonts.body, fontSize: "0.7rem", color: "rgba(232,213,160,0.55)",
            fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
          }}>
            תצוגה מקדימה
          </span>
          <div style={{
            display: "inline-flex", background: "rgba(255,255,255,0.07)",
            borderRadius: 20, padding: "0.2rem", gap: "0.15rem",
          }}>
            {([
              { key: "subscriber" as const, label: "מנוי פעיל" },
              { key: "member" as const, label: "חבר רשום" },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPreviewMode(opt.key)}
                style={{
                  padding: "0.3rem 0.85rem", borderRadius: 16, border: "none",
                  cursor: "pointer", fontFamily: fonts.body, fontWeight: 700, fontSize: "0.75rem",
                  background: previewMode === opt.key ? gradients.goldButton : "transparent",
                  color: previewMode === opt.key ? "white" : "rgba(232,213,160,0.55)",
                  transition: "all 0.18s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Live: ספרי תכנית הפרק השבועי ─────────────────────────── */}
        <section dir="rtl" style={{ background: "white", padding: "2rem 1.5rem", borderBottom: `1px solid rgba(139,111,71,0.08)` }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: colors.textDark, margin: "0 0 0.2rem" }}>ספרי תכנית הפרק השבועי</h2>
                <p style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textMuted, margin: 0 }}>נתונים חיים מ-DB · {weeklyBooks.length} ספרים</p>
              </div>
              <Link to="/program/weekly-chapter" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.4rem 0.9rem", borderRadius: radii.md, background: "rgba(139,111,71,0.08)", color: colors.goldDark, fontFamily: fonts.body, fontWeight: 700, fontSize: "0.78rem", textDecoration: "none", border: `1px solid rgba(139,111,71,0.14)` }}>
                ספרייה מלאה <ChevronLeft size={13} style={{ transform: "rotate(180deg)" }} />
              </Link>
            </div>
            {booksLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}>
                <Loader2 size={24} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
                {weeklyBooks.map((book) => (
                  <LiveBookCard key={book.id} book={book} product={productMap.get(book.payment_product_id ?? `book-${book.program_slug?.replace("book-","")}`)} />
                ))}
              </div>
            )}
          </div>
        </section>

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
                to="/portal"
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
                {visibleMyCourses.filter(
                  (c) => c.isMain && (filter === "all" || c.status === filter)
                ).map((course) => (
                  <MainCourseCard key={course.slug} course={course} isSubscriber={isSubscriber} />
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
                  {visibleMyCourses.filter(
                    (c) => !c.isMain && (filter === "all" || c.status === filter)
                  ).map((course) => (
                    <CourseTile key={course.slug} course={course} isSubscriber={isSubscriber} />
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
                    <CourseTile key={course.slug} course={course} isSubscriber={isSubscriber} />
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
                  <CourseTile key={course.slug} course={course} isSubscriber={isSubscriber} />
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
function MainCourseCard({ course, isSubscriber }: { course: CourseCard; isSubscriber: boolean }) {
  // weekly-chapter is subscriber-only — member sees it locked
  const isLocked = course.slug === "weekly-chapter" && !isSubscriber;

  if (isLocked) {
    return (
      <div
        style={{
          background: "white",
          borderRadius: radii.xl,
          overflow: "hidden",
          border: "1px solid rgba(139,111,71,0.12)",
          boxShadow: "0 8px 32px rgba(139,111,71,0.12)",
          position: "relative",
        }}
      >
        {/* Blurred cover */}
        <div style={{ background: course.coverGradient, padding: "2.25rem 2rem", position: "relative", overflow: "hidden", filter: "blur(2px)", opacity: 0.5 }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.85rem", color: "white", fontStyle: "italic" }}>{course.title}</div>
          <div style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: "rgba(255,255,255,0.65)", marginTop: "0.3rem" }}>{course.subtitle}</div>
        </div>
        {/* Lock overlay */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "rgba(45,31,14,0.72)", gap: "0.75rem", borderRadius: radii.xl,
        }}>
          <Lock size={36} style={{ color: colors.goldShimmer }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: "white", marginBottom: "0.25rem" }}>תכנית המנויים</div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: "rgba(255,255,255,0.6)", marginBottom: "1rem" }}>₪5 לחודש ראשון · ₪110/חודש לאחר מכן</div>
            <Link to="/megilat-esther" style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.75rem 1.75rem", borderRadius: radii.lg,
              background: gradients.goldButton, color: "white",
              fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.9rem",
              textDecoration: "none", boxShadow: shadows.goldGlow,
            }}>
              <Sparkles size={14} />
              הצטרף למנוי
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
              dir="ltr"
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
function CourseTile({ course, isSubscriber }: { course: CourseCard; isSubscriber: boolean }) {
  const isCompleted = course.status === "completed";
  const isActive = course.status === "active";
  const isAvailable = course.status === "available";
  // Available courses are locked for non-subscribers (they need to purchase)
  const isLocked = isAvailable && !isSubscriber;

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
              dir="ltr"
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
        {isLocked ? (
          /* Locked for member — show subscribe CTA */
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.45rem",
              padding: "0.55rem 0.75rem", borderRadius: radii.md,
              background: "rgba(139,111,71,0.06)", border: "1px solid rgba(139,111,71,0.12)",
            }}>
              <Lock size={13} style={{ color: colors.textMuted, flexShrink: 0 }} />
              <span style={{ fontFamily: fonts.body, fontSize: "0.76rem", color: colors.textMuted }}>
                זמין בחבילת מנוי או לרכישה נפרדת
              </span>
            </div>
            <Link
              to="/store"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                gap: "0.45rem", padding: "0.78rem 1.25rem", borderRadius: radii.lg,
                background: "transparent", border: `1.5px solid ${colors.goldDark}`,
                color: colors.goldDark, fontFamily: fonts.accent, fontWeight: 700,
                fontSize: "0.88rem", textDecoration: "none", transition: "opacity 0.18s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.78")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <ShoppingBag size={14} />
              רכוש קורס
            </Link>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
