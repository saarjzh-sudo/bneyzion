/**
 * /program/weekly-chapter — Weekly Program Library
 *
 * Shows all community_courses with in_weekly_program=true as book cards.
 * Each card: cover image, title, chapter count, locked/open state per user access.
 * Access logic: tag for specific book OR program:weekly-chapter tag (all books).
 *
 * Note: /course/weekly-chapter redirects here (back-compat).
 *
 * Built 2026-06-03 — feat/weekly-chapter-data-driven
 */
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Lock,
  ChevronLeft,
  Loader2,
  BookMarked,
  Sparkles,
  Heart,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useWeeklyBooks, type WeeklyCourse } from "@/hooks/useCommunity";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useAuth } from "@/contexts/AuthContext";

// ── Hebrew numerals ────────────────────────────────────────────────────────
const HEB_NUMS = ["א","ב","ג","ד","ה","ו","ז","ח","ט","י","יא","יב","יג","יד","טו","טז","יז","יח","יט","כ","כא","כב","כג","כד"];
function hebNum(n: number) { return HEB_NUMS[n - 1] ?? String(n); }

// ── Book colors (visual identity per book) ────────────────────────────────
const BOOK_ACCENTS: Record<string, string> = {
  "book-ezra":                    "#8B6F47",
  "book-nehemiah":                "#5B6E3A",
  "book-daniel":                  "#6B4E8B",
  "book-esther":                  "#A52A2A",
  "book-haggai-zechariah-malachi":"#3A7A85",
  "book-lamentations":            "#7A5A3A",
};

// ── Book-level access hook wrapper ────────────────────────────────────────
// Per spec: hasAccess = book tag OR program:weekly-chapter tag
// Iron rule: always call BOTH hooks unconditionally.
function useBookAccess(course: WeeklyCourse): boolean {
  const bookTag = course.access_tag ?? `course:${course.program_slug}`;
  const { hasAccess: bookAccess } = useUserAccess(bookTag);
  const { hasAccess: programAccess } = useUserAccess("program:weekly-chapter");
  // base layer always open when access_type=requires_tag (base open policy)
  return bookAccess || programAccess;
}

// ── Book gradient backgrounds (unique per book) ───────────────────────────
const BOOK_GRADIENTS: Record<string, string> = {
  "book-ezra":                    "linear-gradient(140deg, #6B4C28 0%, #9B7A50 45%, #C4A265 100%)",
  "book-nehemiah":                "linear-gradient(140deg, #2D4A1E 0%, #4A7A2E 45%, #78A84A 100%)",
  "book-daniel":                  "linear-gradient(140deg, #3A1F5C 0%, #6B3EA8 45%, #9B6AD4 100%)",
  "book-esther":                  "linear-gradient(140deg, #6B1212 0%, #A52A2A 45%, #D45050 100%)",
  "book-haggai-zechariah-malachi":"linear-gradient(140deg, #1B4A52 0%, #3A7A85 45%, #5AABB8 100%)",
  "book-lamentations":            "linear-gradient(140deg, #3A2A1A 0%, #7A5A3A 45%, #A88060 100%)",
};

// ── BookCard ──────────────────────────────────────────────────────────────
function BookCard({ course }: { course: WeeklyCourse }) {
  const hasAccess = useBookAccess(course);
  const slug = course.program_slug ?? "";
  const accent = BOOK_ACCENTS[slug] ?? colors.goldDark;
  const gradient = BOOK_GRADIENTS[slug] ?? `linear-gradient(140deg, ${accent} 0%, ${accent}99 100%)`;
  const chapterCount = course.total_lessons ?? course.lesson_count ?? 0;
  const isBase = course.access_type === "open";
  const isLocked = !hasAccess && !isBase;

  return (
    <Link
      to={`/course/${slug}`}
      style={{ textDecoration: "none", display: "block" }}
      aria-label={`${course.title} — ${isLocked ? "נעול" : "פתוח"}`}
    >
      <div
        dir="rtl"
        style={{
          background: "white",
          borderRadius: radii.xl,
          boxShadow: shadows.cardSoft,
          border: `1px solid rgba(139,111,71,0.09)`,
          overflow: "hidden",
          transition: "box-shadow 0.22s, transform 0.18s",
          cursor: "pointer",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 14px 36px ${accent}30`;
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.cardSoft;
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* Cover — gradient hero when no image */}
        <div style={{ position: "relative", height: 168, background: course.image_url ? `${accent}22` : gradient, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {course.image_url ? (
            <img
              src={course.image_url}
              alt={course.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            /* No image: show book title large + icon on gradient */
            <div style={{ textAlign: "center", padding: "0 1.5rem", position: "relative", zIndex: 1 }}>
              <BookMarked size={32} style={{ color: "rgba(255,255,255,0.55)", marginBottom: "0.55rem", display: "block", margin: "0 auto 0.55rem" }} />
              <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1rem, 3.5vw, 1.35rem)", color: "white", lineHeight: 1.2, textShadow: "0 2px 8px rgba(0,0,0,0.35)" }}>
                {course.title}
              </div>
            </div>
          )}

          {/* Locked overlay */}
          {isLocked && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.28)", backdropFilter: "blur(1.5px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,0.92)", boxShadow: "0 4px 14px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lock size={20} style={{ color: accent }} />
              </div>
            </div>
          )}

          {/* Chapter count badge — top-start */}
          {chapterCount > 0 && (
            <div style={{ position: "absolute", top: 10, insetInlineStart: 10, background: course.image_url ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.18)", backdropFilter: course.image_url ? "none" : "blur(6px)", borderRadius: radii.pill, padding: "0.2rem 0.65rem", fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, color: course.image_url ? accent : "white", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: course.image_url ? "none" : "1px solid rgba(255,255,255,0.25)" }}>
              {chapterCount} פרקים
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "1rem 1.25rem 1.1rem" }}>
          {/* Show title in body only when there's a cover image (otherwise shown on gradient) */}
          {course.image_url && (
            <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.05rem", color: colors.textDark, margin: "0 0 0.35rem", lineHeight: 1.25 }}>
              {course.title}
            </h3>
          )}
          {!course.image_url && (
            /* When using gradient cover, show smaller subtitle-style title in body */
            <h3 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.88rem", color: colors.textMid, margin: "0 0 0.3rem", lineHeight: 1.3 }}>
              הפרק השבועי בתנ״ך
            </h3>
          )}
          {course.description && (
            <p style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted, margin: "0 0 0.9rem", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {course.description}
            </p>
          )}

          {/* Status row */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: course.description ? 0 : "0.5rem" }}>
            {isLocked ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.22rem 0.6rem", borderRadius: radii.pill, background: "rgba(139,111,71,0.07)", color: colors.textMuted, fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700 }}>
                <Lock size={10} /> דרוש מנוי
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.22rem 0.6rem", borderRadius: radii.pill, background: `${accent}15`, color: accent, fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700 }}>
                <BookOpen size={10} /> פתוח
              </span>
            )}
            <span style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: accent, marginInlineStart: "auto", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.2rem" }}>
              כנס <ChevronLeft size={12} style={{ transform: "rotate(180deg)" }} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function WeeklyProgramLibrary() {
  const { data: books = [], isLoading } = useWeeklyBooks();
  const { hasAccess: hasProgramAccess } = useUserAccess("program:weekly-chapter");
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <DesignLayout sidebar={false}>
      {/* ── Hero ── */}
      <div
        dir="rtl"
        style={{
          background: gradients.warmDark,
          padding: "2.5rem 2rem 2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background texture */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 50%, rgba(232,213,160,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 960, margin: "0 auto", position: "relative" }}>
          {/* Breadcrumb */}
          <div style={{ marginBottom: "1rem" }}>
            <Link to="/courses" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontFamily: fonts.body, fontSize: "0.75rem", color: "rgba(232,213,160,0.5)", textDecoration: "none" }}>
              <ChevronLeft size={13} />הקורסים שלי
            </Link>
          </div>

          {/* Title block */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: colors.goldShimmer, marginBottom: "0.4rem" }}>
                הפרק השבועי בתנ״ך
              </div>
              <h1 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.6rem, 4vw, 2.4rem)", color: "white", margin: 0, lineHeight: 1.15 }}>
                ספריית הספרים
              </h1>
              <p style={{ fontFamily: fonts.body, fontSize: "0.88rem", color: "rgba(255,255,255,0.55)", margin: "0.5rem 0 0", lineHeight: 1.7 }}>
                תכנית המנויים של הרב יואב אוריאל · {books.length} ספרים
              </p>
            </div>

            {/* CTA if no access */}
            {!hasProgramAccess && !isAdmin && (
              <Link
                to="/chapter-weekly"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", borderRadius: radii.lg, background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", boxShadow: shadows.goldGlow, whiteSpace: "nowrap" }}
              >
                <Heart size={14} fill="currentColor" />הצטרף לתכנית
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div dir="rtl" style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* Loading */}
        {isLoading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <Loader2 size={32} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Books grid */}
        {!isLoading && books.length > 0 && (
          <>
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: colors.textDark, margin: "0 0 0.3rem" }}>כל ספרי התכנית</h2>
              <p style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted, margin: 0 }}>
                {hasProgramAccess
                  ? "יש לך גישה מלאה לכל ספרי התכנית"
                  : "פרקי הבסיס פתוחים לכולם · ההרחבות והשיעורים השבועיים למנויים"}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {books.map((book) => (
                <BookCard key={book.id} course={book} />
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {!isLoading && books.length === 0 && (
          <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
            <Sparkles size={40} style={{ color: colors.goldDark, opacity: 0.4, margin: "0 auto 1rem" }} />
            <h2 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1.1rem", color: colors.textMuted, margin: "0 0 0.5rem" }}>הספרים בדרך...</h2>
            <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textSubtle }}>תכני התכנית יתווספו בקרוב</p>
          </div>
        )}

        {/* Program subscription info */}
        {!hasProgramAccess && !isAdmin && !isLoading && (
          <div
            dir="rtl"
            style={{
              marginTop: "2.5rem",
              padding: "1.5rem 1.75rem",
              background: `linear-gradient(135deg, rgba(139,111,71,0.06) 0%, rgba(232,213,160,0.06) 100%)`,
              borderRadius: radii.xl,
              border: `1px solid rgba(139,111,71,0.12)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1rem", color: colors.textDark, marginBottom: "0.3rem" }}>
                מנוי תכנית הפרק השבועי — גישה לכל הספרים
              </div>
              <div style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted, lineHeight: 1.6 }}>
                הצטרף וקבל גישה לכל ספרי התכנית, שיעורים שבועיים עם הרב יואב אוריאל, הרחבות וחומרי למידה.
              </div>
            </div>
            <Link
              to="/chapter-weekly"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", borderRadius: radii.lg, background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", boxShadow: shadows.goldGlow, flexShrink: 0 }}
            >
              לפרטים והצטרפות
            </Link>
          </div>
        )}
      </div>
    </DesignLayout>
  );
}
