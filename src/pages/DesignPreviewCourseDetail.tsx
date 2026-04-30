/**
 * /design-course/:slug — Weekly program course detail page v2.
 *
 * Changes vs v1 (2026-04-30):
 *   - Sidebar expanded from 3 books to 8-book full timeline
 *     (דניאל ✅ → איכה ✅ → עזרא-נחמיה ✅ → אסתר ✅ → חגי 🔄 → זכריה ▶️ → מלאכי ⏰ → יהושע ⏰)
 *   - Default state: זכריה expanded + פרק ז highlighted
 *   - Completed books: collapsed by default, expandable in read-only mode
 *   - Future books (מלאכי, יהושע): locked UI, not clickable
 *   - Breadcrumb updated: "< הקורסים שלי" → /design-courses
 *   - Tab labels: "בסיס" / "הרחבה" / "שיעור שבועי" (matching Saar's spec)
 *
 * Access gates:
 *   - "בסיס" tab: open to all
 *   - "הרחבה" + "שיעור שבועי": require useUserAccess("program:weekly-chapter")
 *
 * Sandbox toggle: מנוי / לא-מנוי (preserved from v1)
 */
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  Lock,
  Play,
  Headphones,
  FileText,
  Presentation,
  ChevronRight,
  ChevronLeft,
  Heart,
  Sparkles,
  Download,
  Clock,
  Loader2,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useUserAccess } from "@/hooks/useUserAccess";

// ── Types ──────────────────────────────────────────────────────────────────
type TabKey = "base" | "enrichment" | "weekly";
type BookStatus = "done" | "in_progress" | "current" | "upcoming";

interface ContentItem { label: string; available: boolean; durationMin?: number; }
interface ChapterDef {
  number: number;
  name: string;
  completed: boolean;
  base: { audioReading: ContentItem; orientationSheet: ContentItem; };
  enrichment: { video: ContentItem; article: ContentItem; slides: ContentItem; };
  weeklyLesson: { video: ContentItem; summary: ContentItem; };
}
interface BookDef {
  slug: string;
  name: string;
  status: BookStatus;
  totalChapters: number;
  description: string;
  chapters: ChapterDef[];
}

// ── Helper ─────────────────────────────────────────────────────────────────
function makeChapters(
  count: number,
  allDone: boolean,
  partialDone: number = 0,
  hasContent: boolean = true
): ChapterDef[] {
  const hNames = ["א","ב","ג","ד","ה","ו","ז","ח","ט","י","יא","יב","יג","יד","טו","טז","יז","יח","יט","כ","כא","כב","כג","כד"];
  return Array.from({ length: count }, (_, i) => {
    const num = i + 1;
    const done = allDone || i < partialDone;
    const avail = hasContent && (allDone || i < partialDone + 3);
    return {
      number: num,
      name: `פרק ${hNames[i] ?? String(num)}`,
      completed: done,
      base: {
        audioReading: { label: "קריאה מוקלטת עם ביאור", available: avail },
        orientationSheet: { label: "דף הכוונה", available: avail },
      },
      enrichment: {
        video: { label: "שיעור וידאו מלא — הרב יואב אוריאל", available: done, durationMin: done ? 40 + num * 2 : 0 },
        article: { label: "מאמר הרחבה", available: done },
        slides: { label: "מצגת הפרק", available: done },
      },
      weeklyLesson: {
        video: { label: "הקלטת השיעור השבועי", available: done, durationMin: done ? 50 + num : 0 },
        summary: { label: "סיכום השיעור (PDF)", available: done },
      },
    };
  });
}

// ── Full 8-book program ────────────────────────────────────────────────────
const PROGRAM_BOOKS: BookDef[] = [
  {
    slug: "daniel",
    name: "דניאל",
    status: "done",
    totalChapters: 12,
    description: "12 פרקים של חזיונות וגבורה — דניאל בבל, חוד הגאולה, ועידן הקץ.",
    chapters: makeChapters(12, true),
  },
  {
    slug: "eicha",
    name: "איכה",
    status: "done",
    totalChapters: 5,
    description: "קינות ירמיהו על חורבן ירושלים — אבל, תקווה וחידוש.",
    chapters: makeChapters(5, true),
  },
  {
    slug: "ezra-nehemiah",
    name: "עזרא-נחמיה",
    status: "done",
    totalChapters: 23,
    description: "שיבת ציון, בניין הבית, חידוש הברית — ספר אחד עם שני גיבורים.",
    chapters: makeChapters(23, true),
  },
  {
    slug: "esther",
    name: "אסתר",
    status: "done",
    totalChapters: 10,
    description: "הסתר פנים, נסים נסתרים ותכנית אלוהית — אסתר ומרדכי.",
    chapters: makeChapters(10, true),
  },
  {
    slug: "chagai",
    name: "חגי",
    status: "in_progress",
    totalChapters: 2,
    description: "ספר קצר ועוצמתי — נבואות בית שני, קריאה לחידוש ביהמ\"ק.",
    chapters: makeChapters(2, false, 1, true),
  },
  {
    slug: "zechariah",
    name: "זכריה",
    status: "current",
    totalChapters: 14,
    description: "14 פרקים של חזיונות, מלאכים, ומסרים נצחיים על גאולה ויום ה'.",
    chapters: makeChapters(14, false, 6, true),
  },
  {
    slug: "malachi",
    name: "מלאכי",
    status: "upcoming",
    totalChapters: 3,
    description: "הנביא האחרון — ביקורת חריפה, אהבת ה' לישראל, ונבואת אליהו.",
    chapters: makeChapters(3, false, 0, false),
  },
  {
    slug: "joshua",
    name: "יהושע",
    status: "upcoming",
    totalChapters: 24,
    description: "כיבוש הארץ, חלוקתה לשבטים, ואתגרי ממשיך משה.",
    chapters: makeChapters(24, false, 0, false),
  },
];

// ── Component ──────────────────────────────────────────────────────────────
export default function DesignPreviewCourseDetail() {
  const { slug = "zechariah" } = useParams<{ slug: string }>();
  const { hasAccess: realAccess, isLoading: accessLoading } = useUserAccess("program:weekly-chapter");

  // Sandbox preview toggle
  const [previewMode, setPreviewMode] = useState<"subscriber" | "locked">("subscriber");
  const hasAccess = previewMode === "subscriber" || realAccess;

  // Default: open on זכריה פרק ז (book index 5, chapter index 6)
  const defaultBookIdx = Math.max(0, PROGRAM_BOOKS.findIndex((b) => b.slug === slug));
  const [activeBookIdx, setActiveBookIdx] = useState(defaultBookIdx >= 0 ? defaultBookIdx : 5);
  const [expandedBooks, setExpandedBooks] = useState<Set<number>>(() => {
    const initial = defaultBookIdx >= 0 ? defaultBookIdx : 5;
    return new Set([initial]);
  });
  const [activeChapterIdx, setActiveChapterIdx] = useState(() => {
    const bIdx = defaultBookIdx >= 0 ? defaultBookIdx : 5;
    const book = PROGRAM_BOOKS[bIdx];
    if (book.slug === "zechariah") return 6; // פרק ז = index 6
    const firstIncomplete = book.chapters.findIndex((c) => !c.completed);
    return firstIncomplete >= 0 ? firstIncomplete : 0;
  });
  const [activeTab, setActiveTab] = useState<TabKey>("base");

  const activeBook = PROGRAM_BOOKS[activeBookIdx];
  const activeChapter = activeBook.chapters[activeChapterIdx];

  const completedCount = PROGRAM_BOOKS.reduce(
    (sum, b) => sum + b.chapters.filter((c) => c.completed).length,
    0
  );
  const totalCount = PROGRAM_BOOKS.reduce((sum, b) => sum + b.totalChapters, 0);

  function toggleBook(idx: number) {
    const book = PROGRAM_BOOKS[idx];
    if (book.status === "upcoming") return; // don't expand future books
    setExpandedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function selectChapter(bookIdx: number, chapterIdx: number) {
    const book = PROGRAM_BOOKS[bookIdx];
    if (book.status === "upcoming") return;
    setActiveBookIdx(bookIdx);
    setActiveChapterIdx(chapterIdx);
    setActiveTab("base");
    // ensure the book is expanded
    setExpandedBooks((prev) => new Set([...prev, bookIdx]));
  }

  if (accessLoading) {
    return (
      <DesignLayout sidebar={false}>
        <div style={{ padding: "10rem 0", display: "flex", justifyContent: "center" }}>
          <Loader2 style={{ width: 32, height: 32, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DesignLayout>
    );
  }

  return (
    <DesignLayout sidebar={false}>
      {/* ─── Top bar ──────────────────────────────────────────────────── */}
      <div
        dir="rtl"
        style={{
          background: gradients.warmDark,
          padding: "1.5rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Breadcrumb */}
          <Link
            to="/design-courses"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontFamily: fonts.body,
              fontSize: "0.78rem",
              color: "rgba(232,213,160,0.6)",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={13} />
            הקורסים שלי
          </Link>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)" }} />
          <div>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: colors.goldShimmer,
                marginBottom: "0.2rem",
              }}
            >
              הפרק השבועי בתנ״ך
            </div>
            <h1
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: "1.25rem",
                color: "white",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {activeBook.name} — {activeChapter.name}
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {/* Overall progress */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "1.2rem",
                color: colors.goldShimmer,
                lineHeight: 1,
              }}
            >
              {completedCount}/{totalCount}
            </div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.63rem", color: "rgba(255,255,255,0.5)" }}>
              פרקים
            </div>
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: 90,
              height: 5,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.round((completedCount / totalCount) * 100)}%`,
                height: "100%",
                background: gradients.goldButton,
                borderRadius: 3,
              }}
            />
          </div>

          <Link
            to="/design-portal-subscriber"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: radii.md,
              border: "1.5px solid rgba(232,213,160,0.3)",
              background: "rgba(232,213,160,0.08)",
              color: colors.goldShimmer,
              fontFamily: fonts.accent,
              fontWeight: 700,
              fontSize: "0.75rem",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            האזור האישי
          </Link>
        </div>
      </div>

      {/* ─── Sandbox preview toggle ────────────────────────────────────── */}
      <div
        dir="rtl"
        style={{
          background: "rgba(45,31,14,0.97)",
          borderBottom: "1px solid rgba(232,213,160,0.15)",
          padding: "0.5rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.85rem",
        }}
      >
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: "0.68rem",
            color: "rgba(232,213,160,0.5)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          תצוגה מקדימה
        </span>
        <div
          style={{
            display: "inline-flex",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 20,
            padding: "0.18rem",
            gap: "0.1rem",
          }}
        >
          {(
            [
              { key: "subscriber" as const, label: "מנוי" },
              { key: "locked" as const, label: "לא-מנוי" },
            ]
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPreviewMode(opt.key)}
              style={{
                padding: "0.28rem 0.8rem",
                borderRadius: 16,
                border: "none",
                cursor: "pointer",
                fontFamily: fonts.body,
                fontWeight: 700,
                fontSize: "0.72rem",
                background: previewMode === opt.key ? gradients.goldButton : "transparent",
                color: previewMode === opt.key ? "white" : "rgba(232,213,160,0.5)",
                transition: "all 0.18s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Two-column layout ─────────────────────────────────────────── */}
      <div
        dir="rtl"
        style={{
          display: "grid",
          gridTemplateColumns: "min(300px, 32%) 1fr",
          minHeight: "calc(100vh - 220px)",
          background: colors.parchment,
        }}
        className="course-detail-grid"
      >
        {/* ─── LEFT Sidebar: book + chapter nav ─────────────────────── */}
        <aside
          style={{
            background: "white",
            borderInlineStart: `1px solid rgba(139,111,71,0.1)`,
            overflowY: "auto",
            position: "sticky",
            top: 96,
            maxHeight: "calc(100vh - 96px)",
          }}
        >
          {/* Sidebar header */}
          <div
            style={{
              padding: "1.25rem 1rem",
              borderBottom: `1px solid rgba(139,111,71,0.08)`,
              background: colors.parchment,
            }}
          >
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.65rem",
                fontWeight: 700,
                color: colors.goldDark,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.2rem",
              }}
            >
              תוכן הקורס
            </div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted }}>
              {completedCount} מתוך {totalCount} פרקים · 8 ספרים
            </div>
          </div>

          {/* Book list */}
          {PROGRAM_BOOKS.map((book, bIdx) => {
            const bookCompleted = book.status === "done";
            const bookCurrent = book.status === "current";
            const bookInProgress = book.status === "in_progress";
            const bookUpcoming = book.status === "upcoming";
            const isExpanded = expandedBooks.has(bIdx);
            const isActive = activeBookIdx === bIdx;

            return (
              <div key={book.slug} style={{ borderBottom: `1px solid rgba(139,111,71,0.06)` }}>
                {/* Book header button */}
                <button
                  onClick={() => toggleBook(bIdx)}
                  disabled={bookUpcoming}
                  style={{
                    width: "100%",
                    padding: "0.85rem 1rem",
                    background: isActive && !bookUpcoming ? "rgba(139,111,71,0.05)" : "none",
                    border: "none",
                    cursor: bookUpcoming ? "default" : "pointer",
                    textAlign: "right",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    opacity: bookUpcoming ? 0.45 : 1,
                    borderInlineEnd: isActive ? `3px solid ${colors.goldDark}` : "3px solid transparent",
                  }}
                >
                  {/* Status dot */}
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: bookCompleted
                        ? "rgba(91,110,58,0.12)"
                        : bookCurrent
                        ? gradients.goldButton
                        : bookInProgress
                        ? "rgba(139,111,71,0.12)"
                        : "rgba(139,111,71,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      border: bookCurrent ? `2px solid ${colors.goldDark}` : "2px solid transparent",
                    }}
                  >
                    {bookCompleted ? (
                      <CheckCircle2 size={14} style={{ color: colors.oliveMain }} />
                    ) : bookCurrent ? (
                      <Play size={12} fill="white" style={{ color: "white" }} />
                    ) : bookInProgress ? (
                      <BookOpen size={12} style={{ color: colors.goldDark }} />
                    ) : (
                      <Clock size={11} style={{ color: colors.textSubtle }} />
                    )}
                  </div>

                  <div style={{ flex: 1, textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontWeight: bookCurrent || bookInProgress ? 800 : 700,
                        fontSize: "0.85rem",
                        color: bookCurrent ? colors.goldDark : bookCompleted ? colors.oliveMain : colors.textDark,
                      }}
                    >
                      {book.name}
                    </div>
                    <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textSubtle }}>
                      {bookCompleted
                        ? `${book.totalChapters} פרקים · הושלם`
                        : bookCurrent
                        ? `פרק ז מתוך ${book.totalChapters} · נוכחי`
                        : bookInProgress
                        ? `1/${book.totalChapters} פרקים`
                        : `${book.totalChapters} פרקים · בקרוב`}
                    </div>
                  </div>

                  {!bookUpcoming && (
                    <span
                      style={{
                        color: colors.textSubtle,
                        flexShrink: 0,
                        transition: "transform 0.15s",
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    >
                      <ChevronRight size={13} />
                    </span>
                  )}
                </button>

                {/* Chapter list (expanded) */}
                {isExpanded && !bookUpcoming && (
                  <div style={{ paddingBottom: "0.4rem" }}>
                    {book.chapters.map((ch, cIdx) => {
                      const isChActive = activeBookIdx === bIdx && activeChapterIdx === cIdx;
                      const isReadOnly = bookCompleted; // completed books = read-only (can browse)
                      return (
                        <button
                          key={ch.number}
                          onClick={() => selectChapter(bIdx, cIdx)}
                          style={{
                            width: "100%",
                            padding: "0.5rem 1rem 0.5rem 2rem",
                            background: isChActive ? "rgba(139,111,71,0.1)" : "none",
                            borderInlineStart: isChActive ? `3px solid ${colors.goldDark}` : "3px solid transparent",
                            border: "none",
                            borderTop: "none",
                            borderBottom: "none",
                            borderInlineEnd: "none",
                            cursor: "pointer",
                            textAlign: "right",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          {ch.completed ? (
                            <CheckCircle2 size={11} style={{ color: colors.oliveMain, flexShrink: 0 }} />
                          ) : ch.base.audioReading.available ? (
                            <div
                              style={{
                                width: 11,
                                height: 11,
                                borderRadius: "50%",
                                border: `1.5px solid ${colors.goldDark}`,
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 11,
                                height: 11,
                                borderRadius: "50%",
                                border: "1.5px solid rgba(139,111,71,0.2)",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <span
                            style={{
                              fontFamily: fonts.body,
                              fontSize: "0.78rem",
                              color: isChActive
                                ? colors.goldDark
                                : ch.completed
                                ? colors.oliveMain
                                : ch.base.audioReading.available
                                ? colors.textDark
                                : colors.textSubtle,
                              fontWeight: isChActive ? 700 : 400,
                            }}
                          >
                            {ch.name}
                            {isReadOnly && (
                              <span style={{ marginInlineStart: "0.3rem", opacity: 0.5, fontSize: "0.6rem" }}>
                                ✓
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        {/* ─── RIGHT: Main content ───────────────────────────────────── */}
        <main style={{ padding: "2.5rem 2rem", maxWidth: 860 }}>
          {/* Chapter header */}
          <div style={{ marginBottom: "2rem" }}>
            {/* Book description */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.22rem 0.65rem",
                borderRadius: radii.pill,
                background: activeBook.status === "current"
                  ? "rgba(139,111,71,0.1)"
                  : activeBook.status === "done"
                  ? "rgba(91,110,58,0.1)"
                  : "rgba(139,111,71,0.06)",
                color: activeBook.status === "current"
                  ? colors.goldDark
                  : activeBook.status === "done"
                  ? colors.oliveMain
                  : colors.textMuted,
                fontFamily: fonts.body,
                fontSize: "0.7rem",
                fontWeight: 700,
                marginBottom: "0.75rem",
              }}
            >
              {activeBook.status === "current" ? (
                <><Play size={11} fill="currentColor" /> פרק נוכחי</>
              ) : activeBook.status === "done" ? (
                <><CheckCircle2 size={11} /> הושלם</>
              ) : (
                <><BookOpen size={11} /> בתהליך</>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: "clamp(1.5rem, 3vw, 2.1rem)",
                  color: colors.textDark,
                  margin: 0,
                }}
              >
                {activeBook.name} — {activeChapter.name}
              </h2>
              {activeChapter.completed && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.22rem 0.6rem",
                    borderRadius: radii.pill,
                    background: "rgba(91,110,58,0.1)",
                    color: colors.oliveMain,
                    fontFamily: fonts.body,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={11} />
                  הושלם
                </span>
              )}
            </div>

            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "0.85rem",
                color: colors.textMuted,
                margin: "0.5rem 0 0",
                lineHeight: 1.65,
              }}
            >
              {activeBook.description}
            </p>
          </div>

          {/* ─── 3 Tabs ────────────────────────────────────────────── */}
          <div style={{ marginBottom: "1.75rem" }}>
            <div
              style={{
                display: "flex",
                gap: "0.25rem",
                borderBottom: `2px solid rgba(139,111,71,0.1)`,
              }}
            >
              {(
                [
                  { key: "base" as const, label: "בסיס", locked: false },
                  { key: "enrichment" as const, label: "הרחבה", locked: !hasAccess },
                  { key: "weekly" as const, label: "שיעור שבועי", locked: !hasAccess },
                ]
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "0.75rem 1.25rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: fonts.body,
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    color:
                      activeTab === tab.key
                        ? colors.goldDark
                        : tab.locked
                        ? colors.textSubtle
                        : colors.textMuted,
                    borderBottom:
                      activeTab === tab.key
                        ? `2px solid ${colors.goldDark}`
                        : "2px solid transparent",
                    marginBottom: -2,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    transition: "color 0.15s",
                  }}
                >
                  {tab.locked && <Lock size={11} />}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Tab: בסיס ──────────────────────────────────────────── */}
          {activeTab === "base" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {activeChapter.base.audioReading.available ? (
                <>
                  <ContentCard
                    icon={<Headphones size={18} />}
                    title="קריאה מוקלטת עם ביאור"
                    subtitle="הרב יונדב זר · פתוח לכולם"
                    type="audio"
                    available
                  />
                  <ContentCard
                    icon={<FileText size={18} />}
                    title={activeChapter.base.orientationSheet.label}
                    subtitle="PDF · פתוח להורדה"
                    type="pdf"
                    available
                  />
                  <ContentCard
                    icon={<FileText size={18} />}
                    title="ביאור ושננתם לפרק"
                    subtitle="PDF · מותאם לקריאה עצמית"
                    type="pdf"
                    available
                  />
                </>
              ) : (
                <EmptyTabState
                  icon={<Headphones size={32} />}
                  title="תכני הבסיס טרם פורסמו"
                  desc="הפרק עדיין לא הגיע בתוכנית — תכנים יפורסמו כשיגיע תורו."
                />
              )}
            </div>
          )}

          {/* ─── Tab: הרחבה ─────────────────────────────────────────── */}
          {activeTab === "enrichment" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {!hasAccess ? (
                <LockedTabPanel tab="הרחבה" />
              ) : activeChapter.enrichment.video.available ? (
                <>
                  <ContentCard
                    icon={<Play size={18} />}
                    title={activeChapter.enrichment.video.label}
                    subtitle={`${activeChapter.enrichment.video.durationMin} דקות · HD`}
                    type="video"
                    available
                    featured
                  />
                  <ContentCard
                    icon={<FileText size={18} />}
                    title={activeChapter.enrichment.article.label}
                    subtitle="הרב יואב אוריאל · PDF"
                    type="pdf"
                    available
                  />
                  <ContentCard
                    icon={<Presentation size={18} />}
                    title={activeChapter.enrichment.slides.label}
                    subtitle="PowerPoint · ניתן להורדה"
                    type="slides"
                    available
                  />
                </>
              ) : (
                <EmptyTabState
                  icon={<Play size={32} />}
                  title="תכני ההרחבה טרם פורסמו"
                  desc="הפרק עדיין לא הגיע בתוכנית — שיעור ההרחבה יפורסם לפי לוח הזמנים."
                />
              )}
            </div>
          )}

          {/* ─── Tab: שיעור שבועי ──────────────────────────────────── */}
          {activeTab === "weekly" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {!hasAccess ? (
                <LockedTabPanel tab="שיעור שבועי" />
              ) : activeChapter.weeklyLesson.video.available ? (
                <>
                  <ContentCard
                    icon={<Play size={18} />}
                    title={activeChapter.weeklyLesson.video.label}
                    subtitle={`${activeChapter.weeklyLesson.video.durationMin} דקות · עם הרב יואב אוריאל`}
                    type="video"
                    available
                    featured
                  />
                  <ContentCard
                    icon={<FileText size={18} />}
                    title={activeChapter.weeklyLesson.summary.label}
                    subtitle="סיכום נקודות מרכזיות · PDF"
                    type="pdf"
                    available
                  />
                </>
              ) : (
                <EmptyTabState
                  icon={<Play size={32} />}
                  title="הקלטת השיעור טרם פורסמה"
                  desc="השיעור השבועי עדיין לא הגיע — ההקלטה תפורסם אחרי השיעור."
                />
              )}
            </div>
          )}

          {/* ─── Chapter navigation ──────────────────────────────── */}
          <div
            style={{
              marginTop: "3rem",
              paddingTop: "1.5rem",
              borderTop: `1px solid rgba(139,111,71,0.1)`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            {activeChapterIdx > 0 ? (
              <button
                onClick={() => selectChapter(activeBookIdx, activeChapterIdx - 1)}
                style={{
                  padding: "0.7rem 1.25rem",
                  borderRadius: radii.md,
                  background: "white",
                  border: `1px solid rgba(139,111,71,0.15)`,
                  cursor: "pointer",
                  fontFamily: fonts.body,
                  fontSize: "0.85rem",
                  color: colors.textMid,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                הפרק הקודם ←
              </button>
            ) : (
              <div />
            )}

            {activeChapterIdx < activeBook.chapters.length - 1 && (
              <button
                onClick={() => selectChapter(activeBookIdx, activeChapterIdx + 1)}
                style={{
                  padding: "0.7rem 1.5rem",
                  borderRadius: radii.md,
                  background: gradients.goldButton,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: fonts.accent,
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: "white",
                  boxShadow: shadows.goldGlow,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                → הפרק הבא
              </button>
            )}
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .course-detail-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ring-pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.15); opacity: 0.2; } }
      `}</style>
    </DesignLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function ContentCard({
  icon,
  title,
  subtitle,
  type,
  available,
  featured = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  type: "video" | "audio" | "pdf" | "slides";
  available: boolean;
  featured?: boolean;
}) {
  const typeColors: Record<string, string> = {
    video: colors.goldDark,
    audio: colors.tealMain,
    pdf: "#a52a2a",
    slides: colors.oliveMain,
  };
  const accentColor = typeColors[type] || colors.goldDark;

  return (
    <div
      style={{
        background: "white",
        borderRadius: radii.xl,
        padding: featured ? "1.5rem 1.75rem" : "1.1rem 1.5rem",
        border: featured ? `2px solid ${colors.goldDark}` : `1px solid rgba(139,111,71,0.1)`,
        boxShadow: featured ? "0 8px 24px rgba(139,111,71,0.12)" : shadows.cardSoft,
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        opacity: available ? 1 : 0.4,
        cursor: available ? "pointer" : "default",
      }}
    >
      <div
        style={{
          width: featured ? 52 : 42,
          height: featured ? 52 : 42,
          borderRadius: radii.md,
          background: `${accentColor}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: accentColor,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: featured ? "1rem" : "0.9rem",
            color: colors.textDark,
            marginBottom: "0.12rem",
          }}
        >
          {title}
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: "0.76rem", color: colors.textMuted }}>
          {subtitle}
        </div>
      </div>
      {available && (
        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
          {type === "video" || type === "audio" ? (
            <button
              style={{
                padding: "0.48rem 0.95rem",
                borderRadius: radii.md,
                background: gradients.goldButton,
                border: "none",
                color: "white",
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.32rem",
                boxShadow: shadows.goldGlow,
              }}
            >
              <Play size={12} fill="currentColor" />
              {type === "audio" ? "האזן" : "צפה"}
            </button>
          ) : (
            <button
              style={{
                padding: "0.48rem 0.85rem",
                borderRadius: radii.md,
                background: "transparent",
                border: `1px solid ${accentColor}40`,
                color: accentColor,
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.32rem",
              }}
            >
              <Download size={12} />
              הורד
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LockedTabPanel({ tab }: { tab: string }) {
  return (
    <div
      dir="rtl"
      style={{
        background: "white",
        borderRadius: radii.xl,
        padding: "3rem 2rem",
        border: `1px solid rgba(139,111,71,0.1)`,
        boxShadow: shadows.cardSoft,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(139,111,71,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1.25rem",
        }}
      >
        <Lock size={28} style={{ color: colors.goldDark, opacity: 0.7 }} />
      </div>
      <h3
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: "1.15rem",
          color: colors.textDark,
          margin: "0 0 0.5rem",
        }}
      >
        תוכן ה{tab} למנויים בלבד
      </h3>
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: "0.85rem",
          lineHeight: 1.8,
          color: colors.textMuted,
          maxWidth: 380,
          margin: "0 auto 1.75rem",
        }}
      >
        שיעורי ההרחבה, המצגות, המאמרים וההקלטות השבועיות פתוחים למנויי הפרק השבועי בלבד.
      </p>
      <Link
        to="/design-megilat-esther"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.85rem 1.75rem",
          borderRadius: radii.lg,
          background: gradients.goldButton,
          color: "white",
          fontFamily: fonts.accent,
          fontWeight: 700,
          fontSize: "0.92rem",
          textDecoration: "none",
          boxShadow: shadows.goldGlow,
        }}
      >
        <Heart size={14} fill="currentColor" />
        הצטרף — ₪5 לחודש הראשון
      </Link>
      <div style={{ marginTop: "0.85rem" }}>
        <Link
          to="/design-portal-subscriber"
          style={{
            fontFamily: fonts.body,
            fontSize: "0.78rem",
            color: colors.goldDark,
            textDecoration: "underline",
          }}
        >
          כבר מנוי? התחבר לאזור האישי
        </Link>
      </div>
    </div>
  );
}

function EmptyTabState({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: radii.xl,
        padding: "3rem 2rem",
        border: `1px solid rgba(139,111,71,0.08)`,
        textAlign: "center",
      }}
      dir="rtl"
    >
      <div style={{ color: colors.textSubtle, margin: "0 auto 1rem", width: "fit-content" }}>
        {icon}
      </div>
      <h3
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: "1rem",
          color: colors.textMuted,
          margin: "0 0 0.5rem",
        }}
      >
        {title}
      </h3>
      <p style={{ fontFamily: fonts.body, fontSize: "0.84rem", color: colors.textSubtle, maxWidth: 360, margin: "0 auto" }}>
        {desc}
      </p>
    </div>
  );
}
