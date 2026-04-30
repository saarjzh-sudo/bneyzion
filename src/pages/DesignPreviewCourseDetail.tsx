/**
 * /design-course/:slug — Weekly program course detail page.
 *
 * Layout: two-column
 *   LEFT sidebar: book list → chapter list (collapsible, current chapter highlighted)
 *   RIGHT main: chapter content with 3 tabs:
 *     1. בסיס       — base content: audio reading + orientation sheet (open to all)
 *     2. העמקה      — enrichment: full video + article + slides (subscribers only)
 *     3. שיעור      — weekly lesson recording + summary PDF (subscribers only)
 *
 * Access:
 *   - "בסיס" tab: always visible
 *   - "העמקה" + "שיעור" tabs: require useUserAccess("program:weekly-chapter")
 *     If no access: show preview + lock + link to /design-megilat-esther
 *
 * Data: Drive-derived structure from scan (0AFz55knVlI2BUk9PVA)
 * Note: actual file URLs from Drive are placeholders until backend serves them.
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
  ChevronDown,
  ChevronRight,
  Heart,
  Sparkles,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useUserAccess } from "@/hooks/useUserAccess";

// ── Drive-derived full structure ──────────────────────────────────────────
const PROGRAM_BOOKS: BookDef[] = [
  {
    slug: "chagai",
    name: "חגי",
    totalChapters: 2,
    description: "ספר קצר ועוצמתי — נבואות בית שני, קריאה לחידוש ביהמ\"ק, ורוח גאולה בוקעת.",
    chapters: [
      {
        number: 1,
        name: "פרק א",
        completed: true,
        base: {
          audioReading: { label: "קריאה מוקלטת עם ביאור", available: true },
          orientationSheet: { label: "דף הכוונה", available: true },
        },
        enrichment: {
          video: { label: "שיעור וידאו מלא — הרב יואב אוריאל", available: true, durationMin: 45 },
          article: { label: "מאמר הרחבה", available: true },
          slides: { label: "מצגת הפרק", available: true },
        },
        weeklyLesson: {
          video: { label: "הקלטת השיעור השבועי", available: true, durationMin: 52 },
          summary: { label: "סיכום השיעור (PDF)", available: true },
        },
      },
      {
        number: 2,
        name: "פרק ב",
        completed: true,
        base: {
          audioReading: { label: "קריאה מוקלטת עם ביאור", available: true },
          orientationSheet: { label: "דף הכוונה", available: true },
        },
        enrichment: {
          video: { label: "שיעור וידאו מלא — הרב יואב אוריאל", available: true, durationMin: 38 },
          article: { label: "מאמר הרחבה", available: true },
          slides: { label: "מצגת הפרק", available: true },
        },
        weeklyLesson: {
          video: { label: "הקלטת השיעור השבועי", available: true, durationMin: 47 },
          summary: { label: "סיכום השיעור (PDF)", available: true },
        },
      },
    ],
  },
  {
    slug: "zechariah",
    name: "זכריה",
    totalChapters: 14,
    description: "14 פרקים של חזיונות, מלאכים, ומסרים נצחיים על גאולה ויום ה'.",
    chapters: Array.from({ length: 14 }, (_, i) => {
      const num = i + 1;
      const completed = num <= 6;
      const hasFullContent = num <= 9;
      return {
        number: num,
        name: `פרק ${["א","ב","ג","ד","ה","ו","ז","ח","ט","י","יא","יב","יג","יד"][i]}`,
        completed,
        base: {
          audioReading: { label: "קריאה מוקלטת עם ביאור", available: hasFullContent },
          orientationSheet: { label: "דף הכוונה", available: hasFullContent },
        },
        enrichment: {
          video: { label: "שיעור וידאו מלא — הרב יואב אוריאל", available: completed, durationMin: completed ? 40 + num * 2 : 0 },
          article: { label: "מאמר הרחבה", available: completed },
          slides: { label: "מצגת הפרק", available: completed },
        },
        weeklyLesson: {
          video: { label: "הקלטת השיעור השבועי", available: completed, durationMin: completed ? 50 + num : 0 },
          summary: { label: "סיכום השיעור (PDF)", available: completed },
        },
      };
    }),
  },
  {
    slug: "malachi",
    name: "מלאכי",
    totalChapters: 3,
    description: "הנביא האחרון — ביקורת חריפה, אהבת ה' לישראל, ונבואת אליהו.",
    chapters: Array.from({ length: 3 }, (_, i) => ({
      number: i + 1,
      name: `פרק ${["א","ב","ג"][i]}`,
      completed: false,
      base: {
        audioReading: { label: "קריאה מוקלטת עם ביאור", available: false },
        orientationSheet: { label: "דף הכוונה", available: false },
      },
      enrichment: {
        video: { label: "שיעור וידאו מלא", available: false, durationMin: 0 },
        article: { label: "מאמר הרחבה", available: false },
        slides: { label: "מצגת הפרק", available: false },
      },
      weeklyLesson: {
        video: { label: "הקלטת השיעור השבועי", available: false, durationMin: 0 },
        summary: { label: "סיכום השיעור (PDF)", available: false },
      },
    })),
  },
];

type TabKey = "base" | "enrichment" | "weekly";

interface ContentItem { label: string; available: boolean; durationMin?: number; }
interface ChapterDef {
  number: number;
  name: string;
  completed: boolean;
  base: { audioReading: ContentItem; orientationSheet: ContentItem; };
  enrichment: { video: ContentItem; article: ContentItem; slides: ContentItem; };
  weeklyLesson: { video: ContentItem; summary: ContentItem; };
}
interface BookDef { slug: string; name: string; totalChapters: number; description: string; chapters: ChapterDef[]; }

export default function DesignPreviewCourseDetail() {
  const { slug = "zechariah" } = useParams<{ slug: string }>();
  const { hasAccess, isLoading: accessLoading } = useUserAccess("program:weekly-chapter");

  // Find initial book by slug, default to zechariah
  const initialBookIdx = PROGRAM_BOOKS.findIndex((b) => b.slug === slug) ?? 1;
  const [activeBookIdx, setActiveBookIdx] = useState(Math.max(0, initialBookIdx));
  const [expandedBooks, setExpandedBooks] = useState<Set<number>>(new Set([initialBookIdx >= 0 ? initialBookIdx : 1]));
  const [activeChapterIdx, setActiveChapterIdx] = useState(() => {
    const book = PROGRAM_BOOKS[Math.max(0, initialBookIdx)];
    // Default: first incomplete chapter
    const firstIncomplete = book.chapters.findIndex((c) => !c.completed);
    return firstIncomplete >= 0 ? firstIncomplete : 0;
  });
  const [activeTab, setActiveTab] = useState<TabKey>("base");

  const activeBook = PROGRAM_BOOKS[activeBookIdx];
  const activeChapter = activeBook.chapters[activeChapterIdx];

  function toggleBook(idx: number) {
    setExpandedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function selectChapter(bookIdx: number, chapterIdx: number) {
    setActiveBookIdx(bookIdx);
    setActiveChapterIdx(chapterIdx);
    setActiveTab("base");
  }

  const completedCount = PROGRAM_BOOKS.reduce(
    (sum, b) => sum + b.chapters.filter((c) => c.completed).length,
    0
  );
  const totalCount = PROGRAM_BOOKS.reduce((sum, b) => sum + b.totalChapters, 0);

  return (
    <DesignLayout sidebar={false}>
      {/* ─── Top bar ────────────────────────────────────────────────────── */}
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
        <div>
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: colors.goldShimmer,
              marginBottom: "0.3rem",
            }}
          >
            הפרק השבועי בתנ"ך
          </div>
          <h1
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: "1.4rem",
              color: "white",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            חגי, זכריה ומלאכי
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {/* Overall progress */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "1.3rem",
                color: colors.goldShimmer,
                lineHeight: 1,
              }}
            >
              {completedCount}/{totalCount}
            </div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: "rgba(255,255,255,0.55)" }}>
              פרקים
            </div>
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: 100,
              height: 6,
              background: "rgba(255,255,255,0.12)",
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
              padding: "0.55rem 1.1rem",
              borderRadius: radii.md,
              border: "1.5px solid rgba(232,213,160,0.3)",
              background: "rgba(232,213,160,0.08)",
              color: colors.goldShimmer,
              fontFamily: fonts.accent,
              fontWeight: 700,
              fontSize: "0.78rem",
              textDecoration: "none",
            }}
          >
            לאזור האישי
          </Link>
        </div>
      </div>

      {/* ─── Two-column layout ─────────────────────────────────────────── */}
      <div
        dir="rtl"
        style={{
          display: "grid",
          gridTemplateColumns: "min(280px, 30%) 1fr",
          minHeight: "calc(100vh - 200px)",
          background: colors.parchment,
        }}
        className="course-detail-grid"
      >
        {/* ─── Sidebar: book + chapter nav ────────────────────────────── */}
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
                fontSize: "0.68rem",
                fontWeight: 700,
                color: colors.goldDark,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.25rem",
              }}
            >
              תוכן הקורס
            </div>
            <div
              style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted }}
            >
              {completedCount} מתוך {totalCount} פרקים
            </div>
          </div>

          {/* Book list */}
          {PROGRAM_BOOKS.map((book, bIdx) => {
            const bookCompleted = book.chapters.every((c) => c.completed);
            const bookInProgress = !bookCompleted && book.chapters.some((c) => c.completed);
            const isExpanded = expandedBooks.has(bIdx);

            return (
              <div key={book.slug} style={{ borderBottom: `1px solid rgba(139,111,71,0.06)` }}>
                {/* Book header */}
                <button
                  onClick={() => toggleBook(bIdx)}
                  style={{
                    width: "100%",
                    padding: "0.85rem 1rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "right",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: bookCompleted
                        ? "rgba(91,110,58,0.12)"
                        : bookInProgress
                        ? "rgba(139,111,71,0.12)"
                        : "rgba(139,111,71,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {bookCompleted ? (
                      <CheckCircle2 size={14} style={{ color: colors.oliveMain }} />
                    ) : bookInProgress ? (
                      <BookOpen size={13} style={{ color: colors.goldDark }} />
                    ) : (
                      <Lock size={12} style={{ color: colors.textSubtle }} />
                    )}
                  </div>

                  <span
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      color: colors.textDark,
                      flex: 1,
                    }}
                  >
                    {book.name}
                  </span>

                  <span style={{ color: colors.textSubtle, flexShrink: 0, transition: "transform 0.15s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                    <ChevronRight size={14} />
                  </span>
                </button>

                {/* Chapter list */}
                {isExpanded && (
                  <div style={{ paddingBottom: "0.4rem" }}>
                    {book.chapters.map((ch, cIdx) => {
                      const isActive = activeBookIdx === bIdx && activeChapterIdx === cIdx;
                      return (
                        <button
                          key={ch.number}
                          onClick={() => selectChapter(bIdx, cIdx)}
                          style={{
                            width: "100%",
                            padding: "0.55rem 1rem 0.55rem 2rem",
                            background: isActive
                              ? "rgba(139,111,71,0.1)"
                              : "none",
                            borderInlineStart: isActive
                              ? `3px solid ${colors.goldDark}`
                              : "3px solid transparent",
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
                            <CheckCircle2 size={12} style={{ color: colors.oliveMain, flexShrink: 0 }} />
                          ) : ch.base.audioReading.available ? (
                            <div style={{ width: 12, height: 12, borderRadius: "50%", border: `1.5px solid ${colors.goldDark}`, flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 12, height: 12, borderRadius: "50%", border: `1.5px solid rgba(139,111,71,0.2)`, flexShrink: 0 }} />
                          )}
                          <span
                            style={{
                              fontFamily: fonts.body,
                              fontSize: "0.8rem",
                              color: isActive ? colors.goldDark : ch.completed ? colors.oliveMain : ch.base.audioReading.available ? colors.textDark : colors.textSubtle,
                              fontWeight: isActive ? 700 : 400,
                            }}
                          >
                            {ch.name}
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

        {/* ─── Main content ────────────────────────────────────────────── */}
        <main style={{ padding: "2.5rem 2rem", maxWidth: 860 }}>
          {/* Chapter header */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Link
                to={`/design-course/${activeBook.slug}`}
                style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.goldDark, textDecoration: "none" }}
              >
                {activeBook.name}
              </Link>
              <ChevronRight size={13} style={{ color: colors.textSubtle }} />
              <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted }}>
                {activeChapter.name}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
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
                    padding: "0.25rem 0.65rem",
                    borderRadius: radii.pill,
                    background: "rgba(91,110,58,0.1)",
                    color: colors.oliveMain,
                    fontFamily: fonts.body,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={12} />
                  הושלם
                </span>
              )}
            </div>
          </div>

          {/* ─── 3 Tabs ──────────────────────────────────────────────── */}
          <div style={{ marginBottom: "1.75rem" }}>
            <div
              style={{
                display: "flex",
                gap: "0.25rem",
                borderBottom: `2px solid rgba(139,111,71,0.1)`,
                paddingBottom: "0",
              }}
            >
              {(
                [
                  { key: "base", label: "תכני בסיס", locked: false },
                  { key: "enrichment", label: "העמקה", locked: !hasAccess },
                  { key: "weekly", label: "השיעור השבועי", locked: !hasAccess },
                ] as { key: TabKey; label: string; locked: boolean }[]
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
                  {tab.locked && <Lock size={12} />}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Tab: Base ───────────────────────────────────────────── */}
          {activeTab === "base" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {activeChapter.base.audioReading.available ? (
                <>
                  <ContentCard
                    icon={<Headphones size={18} />}
                    title="קריאה מוקלטת עם ביאור"
                    subtitle="הרב יונדב זר"
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

          {/* ─── Tab: Enrichment ─────────────────────────────────────── */}
          {activeTab === "enrichment" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {!hasAccess ? (
                <LockedTabPanel />
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
                  title="תכני ההעמקה טרם פורסמו"
                  desc="הפרק עדיין לא הגיע בתוכנית — שיעור ההעמקה יפורסם לפי לוח הזמנים."
                />
              )}
            </div>
          )}

          {/* ─── Tab: Weekly Lesson ──────────────────────────────────── */}
          {activeTab === "weekly" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {!hasAccess ? (
                <LockedTabPanel />
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

          {/* ─── Chapter navigation ──────────────────────────────────── */}
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
            ) : <div />}

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
      `}</style>
    </DesignLayout>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

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
            marginBottom: "0.15rem",
          }}
        >
          {title}
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted }}>
          {subtitle}
        </div>
      </div>

      {available && (
        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
          {type === "video" || type === "audio" ? (
            <button
              style={{
                padding: "0.5rem 1rem",
                borderRadius: radii.md,
                background: gradients.goldButton,
                border: "none",
                color: "white",
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                boxShadow: shadows.goldGlow,
              }}
            >
              <Play size={13} fill="currentColor" />
              {type === "audio" ? "האזן" : "צפה"}
            </button>
          ) : (
            <button
              style={{
                padding: "0.5rem 0.9rem",
                borderRadius: radii.md,
                background: "transparent",
                border: `1px solid ${accentColor}40`,
                color: accentColor,
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <Download size={13} />
              הורד
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LockedTabPanel() {
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
          fontSize: "1.2rem",
          color: colors.textDark,
          margin: "0 0 0.5rem",
        }}
      >
        תוכן זה למנויים בלבד
      </h3>
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: "0.88rem",
          lineHeight: 1.8,
          color: colors.textMuted,
          maxWidth: 380,
          margin: "0 auto 1.75rem",
        }}
      >
        שיעורי ההעמקה, המצגות, המאמרים וההקלטות השבועיות פתוחים למנויי הפרק השבועי בלבד.
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
          fontSize: "0.95rem",
          textDecoration: "none",
          boxShadow: shadows.goldGlow,
        }}
      >
        <Heart size={15} fill="currentColor" />
        הצטרף — ₪5 לחודש הראשון
      </Link>
      <div style={{ marginTop: "0.85rem" }}>
        <Link
          to="/design-portal-subscriber"
          style={{
            fontFamily: fonts.body,
            fontSize: "0.8rem",
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
      <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textSubtle, maxWidth: 360, margin: "0 auto" }}>
        {desc}
      </p>
    </div>
  );
}
