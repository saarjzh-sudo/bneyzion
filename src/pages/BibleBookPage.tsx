/**
 * BibleBookPage — /bible/:book
 *
 * Shows the navigation tree for a bible book, mirroring the old site's structure.
 *
 * PRIMARY section — "event-series" navigation grid:
 *   Torah books   → Parasha series (title matches /פרשת .+ \|/)
 *   Neviim/Ketuvim → Chapter series (title matches / פרק /)
 *   Displayed as a prominent grid of nav-cards → /series/:id
 *
 * SECONDARY section — other series under the book category (rabbi series, etc.)
 *   Displayed as a compact list below the nav grid.
 *
 * Architecture: useBookCategoryId(book) → category node ID
 *               useBibleBookSeries(id)   → ALL children (no teachers, lesson_count>0)
 *               Split client-side: event-series (nav) vs. regular series
 * Teacher-leakage guard: useBibleBookSeries already filters audience_tags.
 * Layout: DesignLayout (v2 with sidebar).
 */

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { BookOpen, ChevronLeft, Play, FileText, Hash, BookMarked } from "lucide-react";
import DesignLayout from "@/components/layout-v2/DesignLayout";
import { useBibleBookSeries, useBookCategoryId, useBibleBook, useBibleChapterLessons } from "@/hooks/useBible";
import { useSEO } from "@/hooks/useSEO";
import { colors, fonts, radii, shadows, getSeriesCoverImage } from "@/lib/designTokens";
import { formatRabbis } from "@/pages/CategoryPage";
import { useNavigate } from "react-router-dom";

// ─── Book metadata ────────────────────────────────────────────────────────────

const TORAH_BOOKS = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"];

function getBookCategory(book: string): string {
  if (TORAH_BOOKS.includes(book)) return "תורה";
  const neviim = [
    "יהושע", "שופטים", "שמואל א", "שמואל ב", "מלכים א", "מלכים ב",
    "ישעיהו", "ירמיהו", "יחזקאל", "הושע", "יואל", "עמוס", "עובדיה",
    "יונה", "מיכה", "נחום", "חבקוק", "צפניה", "חגי", "זכריה", "מלאכי",
  ];
  if (neviim.includes(book)) return "נביאים";
  return "כתובים";
}

function resolveSeriesImage(s: { image_url?: string | null; title: string }): string {
  return s.image_url || getSeriesCoverImage(s.title) || "/images/series-default.png";
}

function mediaIcon(s: { lesson_count?: number | null }) {
  if ((s.lesson_count ?? 0) > 0) return <Play size={13} style={{ color: colors.goldDark }} />;
  return <FileText size={13} style={{ color: colors.textSubtle }} />;
}

/**
 * Detect whether a series is a navigation "event-series" (parasha or chapter node).
 *
 * Torah:   title matches /פרשת .+ \|/  e.g. "פרשת בראשית | א-ו"
 * Neviim/Ketuvim: title contains " פרק "  e.g. "הושע פרק א"
 *
 * The pipe-guard (פרשת + |) avoids false positives like "בראשית- מוקלט | ללא טעמים".
 * The " פרק " space-guard avoids matching "דפי עבודה" or "כל השיעורים".
 */
function isEventSeries(title: string, isTorahBook: boolean): boolean {
  if (isTorahBook) {
    return /פרשת\s+.+\|/.test(title);
  }
  return /\sפרק\s/.test(title);
}

/** Section heading label per book type */
function navSectionLabel(isTorahBook: boolean): string {
  return isTorahBook ? "פרשות החומש" : "פרקי הספר";
}

// ─── Main component ───────────────────────────────────────────────────────────

const BibleBookPage = () => {
  const { book } = useParams<{ book: string }>();
  const navigate = useNavigate();
  const decodedBook = book ? decodeURIComponent(book) : "";
  const category = getBookCategory(decodedBook);
  const isTorahBook = TORAH_BOOKS.includes(decodedBook);

  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);

  const { data: bookCategoryId, isLoading: idLoading } = useBookCategoryId(decodedBook);
  const { data: seriesList = [], isLoading: seriesLoading } = useBibleBookSeries(bookCategoryId ?? undefined);
  const { data: chapterData } = useBibleBook(decodedBook);
  const { data: chapterLessons = [], isLoading: chapterLessonsLoading } = useBibleChapterLessons(
    selectedChapter ? decodedBook : undefined,
    selectedChapter ?? undefined
  );

  const chapters = chapterData?.chapters ?? [];
  const hasChapters = chapters.length > 0;

  const isLoading = idLoading || seriesLoading;

  // Split series into navigation event-series vs. regular rabbi series
  const eventSeries = seriesList.filter((s) => isEventSeries(s.title, isTorahBook));
  const regularSeries = seriesList.filter((s) => !isEventSeries(s.title, isTorahBook));

  useSEO({
    title: `${decodedBook} — סדרות ושיעורים`,
    description: `שיעורים וסדרות בספר ${decodedBook} מבית המדרש של בני ציון`,
    url: `https://bneyzion.co.il/bible/${encodeURIComponent(decodedBook)}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${decodedBook} — סדרות ושיעורים`,
      description: `שיעורים וסדרות בספר ${decodedBook}`,
      isPartOf: { "@type": "WebSite", name: "בני ציון", url: "https://bneyzion.co.il" },
      about: { "@type": "Book", name: decodedBook, inLanguage: "he" },
    },
  });

  return (
    <DesignLayout>
      {/* ── Hero ── */}
      <div
        dir="rtl"
        style={{
          background: `linear-gradient(160deg, #FBF6EC 0%, #F5EFE0 60%, #EDE5D0 100%)`,
          borderBottom: `1px solid rgba(139,111,71,0.12)`,
          padding: "2.5rem 2rem 2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative arc */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            insetInlineEnd: "-60px",
            top: "-80px",
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(196,162,101,0.07)",
            pointerEvents: "none",
          }}
        />

        {/* Breadcrumb */}
        <nav
          aria-label="ניווט"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            flexWrap: "wrap",
            marginBottom: "1rem",
          }}
        >
          <Link
            to="/"
            style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textSubtle, textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.goldDark)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.textSubtle)}
          >
            ראשי
          </Link>
          <ChevronLeft size={12} style={{ color: colors.textSubtle }} />
          <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textSubtle }}>{category}</span>
          <ChevronLeft size={12} style={{ color: colors.textSubtle }} />
          <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.goldDark, fontWeight: 600 }}>
            {decodedBook}
          </span>
        </nav>

        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: radii.lg,
              background: "rgba(139,111,71,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BookOpen size={24} style={{ color: colors.goldDark }} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: fonts.display,
                fontSize: "2rem",
                fontWeight: 800,
                color: colors.textDark,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {decodedBook}
            </h1>
            {!isLoading && eventSeries.length > 0 && (
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.9rem",
                  color: colors.textMuted,
                  margin: "0.3rem 0 0",
                }}
              >
                {eventSeries.length} {isTorahBook ? "פרשות" : "פרקים"}
                {regularSeries.length > 0 && ` · ${regularSeries.length} סדרות נוספות`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Content area ── */}
      <div
        dir="rtl"
        style={{ padding: "1.5rem 2rem", maxWidth: 920 }}
      >

        {/* ── Loading skeletons ── */}
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 64,
                  borderRadius: radii.lg,
                  background: "rgba(139,111,71,0.06)",
                  animation: "pulse 1.4s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        )}

        {/* ── Empty state (no event-series AND no regular series) ── */}
        {!isLoading && seriesList.length === 0 && (
          <div
            style={{
              padding: "3rem 1rem",
              textAlign: "center",
              fontFamily: fonts.body,
              color: colors.textSubtle,
            }}
          >
            <BookOpen size={36} style={{ color: colors.textSubtle, opacity: 0.4, margin: "0 auto 1rem" }} />
            <p style={{ margin: 0, fontSize: "0.95rem" }}>
              השיעורים בספר זה מאורגנים בסיידבר — בחר סדרה מהתפריט הצידי.
            </p>
            <Link
              to="/"
              style={{
                display: "inline-block",
                marginTop: "1rem",
                fontFamily: fonts.body,
                fontSize: "0.85rem",
                color: colors.goldDark,
                textDecoration: "none",
              }}
            >
              חזרה לראשי
            </Link>
          </div>
        )}

        {/* ── (1) PRIMARY: Event-series navigation grid ── */}
        {!isLoading && eventSeries.length > 0 && (
          <section style={{ marginBottom: regularSeries.length > 0 ? "2.5rem" : 0 }}>
            {/* Section heading */}
            <h2
              style={{
                fontFamily: fonts.display,
                fontSize: "1rem",
                fontWeight: 700,
                color: colors.textDark,
                marginTop: 0,
                marginBottom: "1rem",
                paddingBottom: "0.45rem",
                borderBottom: `2px solid rgba(196,162,101,0.22)`,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <BookMarked size={15} style={{ color: colors.goldDark }} />
              {navSectionLabel(isTorahBook)}
            </h2>

            {/* Navigation grid — 2 columns on wide, 1 on narrow */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "0.65rem",
              }}
            >
              {eventSeries.map((series) => {
                // Extract label and range from title: "פרשת X | טווח" or "ספר פרק N"
                const pipeIdx = series.title.indexOf("|");
                const mainLabel = pipeIdx > -1
                  ? series.title.slice(0, pipeIdx).trim()
                  : series.title;
                const rangeLabel = pipeIdx > -1
                  ? series.title.slice(pipeIdx + 1).trim()
                  : "";

                return (
                  <div
                    key={series.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/series/${series.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && navigate(`/series/${series.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem 1rem",
                      borderRadius: radii.lg,
                      background: "white",
                      border: `1px solid rgba(139,111,71,0.12)`,
                      boxShadow: shadows.cardSoft,
                      cursor: "pointer",
                      transition: "box-shadow 0.15s, border-color 0.15s, background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.boxShadow = "0 4px 16px rgba(139,111,71,0.18)";
                      el.style.borderColor = "rgba(196,162,101,0.4)";
                      el.style.background = "#FFFDF8";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.boxShadow = shadows.cardSoft;
                      el.style.borderColor = "rgba(139,111,71,0.12)";
                      el.style.background = "white";
                    }}
                  >
                    {/* Gold dot accent */}
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: colors.goldDark,
                        flexShrink: 0,
                        opacity: 0.7,
                      }}
                    />

                    {/* Labels */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: fonts.display,
                          fontSize: "0.92rem",
                          fontWeight: 700,
                          color: colors.textDark,
                          lineHeight: 1.3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {mainLabel}
                      </div>
                      {rangeLabel && (
                        <div
                          style={{
                            fontFamily: fonts.body,
                            fontSize: "0.74rem",
                            color: colors.textSubtle,
                            marginTop: "0.1rem",
                          }}
                        >
                          {rangeLabel}
                        </div>
                      )}
                    </div>

                    {/* Lesson count badge */}
                    {(series.lesson_count ?? 0) > 0 && (
                      <span
                        style={{
                          flexShrink: 0,
                          fontFamily: fonts.body,
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: colors.goldDark,
                          background: "rgba(196,162,101,0.1)",
                          borderRadius: radii.pill,
                          padding: "0.15rem 0.5rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {series.lesson_count}
                      </span>
                    )}

                    <ChevronLeft size={14} style={{ color: colors.textSubtle, flexShrink: 0, transform: "rotate(180deg)" }} />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── (2) SECONDARY: Regular (rabbi/topic) series ── */}
        {!isLoading && regularSeries.length > 0 && (
          <section>
            {/* Only show heading if there were also event-series above */}
            {eventSeries.length > 0 && (
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: colors.textDark,
                  marginTop: 0,
                  marginBottom: "0.75rem",
                  paddingBottom: "0.4rem",
                  borderBottom: `2px solid rgba(196,162,101,0.18)`,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <Hash size={15} style={{ color: colors.goldDark }} />
                סדרות נוספות
              </h2>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {regularSeries.map((series) => {
                const imgSrc = resolveSeriesImage(series);
                const allRabbis = Array.isArray(series.rabbis)
                  ? (series.rabbis as { name: string }[]).map((r) => r.name)
                  : series.rabbis
                  ? [(series.rabbis as { name: string }).name]
                  : [];
                const rabbiLabel = formatRabbis(allRabbis);

                return (
                  <div
                    key={series.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/series/${series.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && navigate(`/series/${series.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      borderRadius: radii.lg,
                      overflow: "hidden",
                      background: "white",
                      border: `1px solid rgba(139,111,71,0.10)`,
                      boxShadow: shadows.cardSoft,
                      cursor: "pointer",
                      transition: "box-shadow 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(139,111,71,0.18)";
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,111,71,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.cardSoft;
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,111,71,0.10)";
                    }}
                  >
                    {/* Cover image */}
                    <div
                      style={{
                        width: 72,
                        flexShrink: 0,
                        overflow: "hidden",
                        background: "#EDE5D6",
                      }}
                    >
                      <img
                        src={imgSrc}
                        alt={series.title}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/images/series-default.png";
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div
                      style={{
                        flex: 1,
                        padding: "0.65rem 1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.15rem",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: fonts.display,
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: colors.textDark,
                          lineHeight: 1.3,
                        }}
                      >
                        {series.title}
                      </span>
                      {rabbiLabel && (
                        <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted }}>
                          {rabbiLabel}
                        </span>
                      )}
                      {(series.lesson_count ?? 0) > 0 && (
                        <span
                          style={{
                            fontFamily: fonts.body,
                            fontSize: "0.72rem",
                            color: colors.goldDark,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                          }}
                        >
                          {mediaIcon(series)}
                          {series.lesson_count} שיעורים
                        </span>
                      )}
                    </div>

                    {/* Arrow */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        paddingInlineEnd: "1rem",
                        color: colors.textSubtle,
                      }}
                    >
                      <ChevronLeft size={16} style={{ transform: "rotate(180deg)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── (3) TERTIARY: bible_chapter grid (fallback for books with sparse data) ── */}
        {/* Only shown when there are chapters but NO event-series found via DB */}
        {!isLoading && hasChapters && eventSeries.length === 0 && (
          <div style={{ marginTop: "0.5rem" }}>
            <h2
              style={{
                fontFamily: fonts.display,
                fontSize: "1rem",
                fontWeight: 700,
                color: colors.textDark,
                marginBottom: "0.75rem",
                marginTop: 0,
                paddingBottom: "0.4rem",
                borderBottom: `2px solid rgba(196,162,101,0.18)`,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Hash size={15} style={{ color: colors.goldDark }} />
              ניווט לפי פרק
            </h2>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.4rem",
              }}
            >
              {chapters.map(({ chapter, count }) => {
                const isSelected = selectedChapter === chapter;
                return (
                  <button
                    key={chapter}
                    onClick={() => setSelectedChapter(isSelected ? null : chapter)}
                    style={{
                      padding: "0.3rem 0.65rem",
                      borderRadius: radii.pill,
                      border: `1px solid ${isSelected ? colors.goldDark : "rgba(139,111,71,0.25)"}`,
                      background: isSelected ? colors.goldDark : "white",
                      color: isSelected ? "white" : colors.textDark,
                      fontFamily: fonts.body,
                      fontSize: "0.8rem",
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    title={`${count} שיעורים`}
                  >
                    פרק {chapter}
                  </button>
                );
              })}
            </div>

            {selectedChapter !== null && (
              <div style={{ marginTop: "1.25rem" }}>
                <h3
                  style={{
                    fontFamily: fonts.display,
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: colors.textMuted,
                    margin: "0 0 0.75rem",
                  }}
                >
                  פרק {selectedChapter} — שיעורים
                </h3>
                {chapterLessonsLoading ? (
                  <div style={{ padding: "0.75rem", fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textSubtle }}>
                    טוען...
                  </div>
                ) : chapterLessons.length === 0 ? (
                  <div style={{ padding: "0.75rem", fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textSubtle }}>
                    אין שיעורים עם מיקום מפורש בפרק זה
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {chapterLessons.map((l: any) => {
                      const rabbiName = Array.isArray(l.rabbis)
                        ? l.rabbis[0]?.name
                        : l.rabbis?.name;
                      return (
                        <button
                          key={l.id}
                          onClick={() => navigate(`/lessons/${l.id}`)}
                          style={{
                            width: "100%",
                            textAlign: "right",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            padding: "0.5rem 0.75rem",
                            background: "white",
                            border: `1px solid rgba(139,111,71,0.08)`,
                            borderRadius: radii.md,
                            cursor: "pointer",
                            fontFamily: fonts.body,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(196,162,101,0.05)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                        >
                          <Play size={13} style={{ color: colors.goldDark, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.83rem", fontWeight: 600, color: colors.textDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {l.title}
                            </div>
                            {rabbiName && (
                              <div style={{ fontSize: "0.72rem", color: colors.textMuted, marginTop: "0.1rem" }}>
                                {rabbiName}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </DesignLayout>
  );
};

export default BibleBookPage;
