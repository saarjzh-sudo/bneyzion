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

// ── BookCard ──────────────────────────────────────────────────────────────
function BookCard({ course }: { course: WeeklyCourse }) {
  const hasAccess = useBookAccess(course);
  const slug = course.program_slug ?? "";
  const accent = BOOK_ACCENTS[slug] ?? colors.goldDark;
  const chapterCount = course.lesson_count ?? 0;
  const isBase = course.access_type === "open";

  return (
    <Link
      to={`/course/${slug}`}
      style={{ textDecoration: "none", display: "block" }}
      aria-label={`${course.title} — ${hasAccess || isBase ? "פתוח" : "נעול"}`}
    >
      <div
        dir="rtl"
        style={{
          background: "white",
          borderRadius: radii.xl,
          boxShadow: shadows.cardSoft,
          border: `1px solid rgba(139,111,71,0.09)`,
          overflow: "hidden",
          transition: "box-shadow 0.2s, transform 0.18s",
          cursor: "pointer",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 32px rgba(139,111,71,0.18)`;
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.cardSoft;
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* Cover */}
        <div style={{ position: "relative", height: 160, background: `linear-gradient(135deg, ${accent}22 0%, ${accent}08 100%)`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {course.image_url ? (
            <img
              src={course.image_url}
              alt={course.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <BookMarked size={48} style={{ color: accent, opacity: 0.35 }} />
          )}
          {/* Lock overlay */}
          {!hasAccess && !isBase && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.45)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lock size={18} style={{ color: colors.textMuted }} />
              </div>
            </div>
          )}
          {/* Chapter count badge */}
          <div style={{ position: "absolute", top: 10, insetInlineStart: 10, background: "rgba(255,255,255,0.92)", borderRadius: radii.pill, padding: "0.18rem 0.6rem", fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, color: accent, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            {chapterCount > 0 ? `${chapterCount} פרקים` : "פרקים"}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "1.1rem 1.25rem" }}>
          <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.05rem", color: colors.textDark, margin: "0 0 0.35rem", lineHeight: 1.25 }}>
            {course.title}
          </h3>
          {course.description && (
            <p style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted, margin: "0 0 0.9rem", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {course.description}
            </p>
          )}
          {/* Status */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {(hasAccess || isBase) ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.22rem 0.6rem", borderRadius: radii.pill, background: `${accent}15`, color: accent, fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700 }}>
                <BookOpen size={10} /> פתוח
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.22rem 0.6rem", borderRadius: radii.pill, background: "rgba(139,111,71,0.07)", color: colors.textMuted, fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700 }}>
                <Lock size={10} /> דרוש מנוי
              </span>
            )}
            <span style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.textSubtle, marginInlineStart: "auto", display: "flex", alignItems: "center", gap: "0.2rem" }}>
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
