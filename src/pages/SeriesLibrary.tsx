/**
 * SeriesLibrary — /series
 *
 * Landing page for browsing all series content.
 * Sections: hero+search · סדרות נבחרות · לפי ספר תנ"ך · לפי רב · לפי נושא.
 *
 * Design decisions (per critique):
 * - "סדרות נבחרות" = sorted by lesson_count DESC + views_count secondary.
 *   "שיעורים כלליים" filtered by exact title only (not heuristic).
 * - Topics section: NO size-by-count (useTopics has no count field).
 *   Shows root topics only (parent_id = null), fixed font size.
 * - Bible-book pills navigate to /category/:id via useContentSidebar cache,
 *   with /bible/:book fallback.
 * - No teacher leakage: useTopSeries already filters audience_tags.
 * - dir="rtl" on every section container.
 */

import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Loader2, BookOpen, Users } from "lucide-react";
import DesignLayout from "@/components/layout-v2/DesignLayout";
import { useTopSeries } from "@/hooks/useTopSeries";
import { usePublicRabbis } from "@/hooks/useRabbis";
import { useTopics } from "@/hooks/useTopics";
import { useContentSidebar } from "@/hooks/useContentSidebar";
import { useSEO } from "@/hooks/useSEO";
import {
  colors,
  fonts,
  radii,
  shadows,
  getSeriesCoverImage,
  getSeriesFamily,
  seriesFamilies,
} from "@/lib/designTokens";

// ─── Bible books in canonical order ──────────────────────────────────────────

const TORAH_BOOKS = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"];
const NEVIIM_BOOKS = [
  "יהושע", "שופטים", "שמואל א", "שמואל ב", "מלכים א", "מלכים ב",
  "ישעיהו", "ירמיהו", "יחזקאל", "הושע", "יואל", "עמוס", "עובדיה",
  "יונה", "מיכה", "נחום", "חבקוק", "צפניה", "חגי", "זכריה", "מלאכי",
];
const KETUVIM_BOOKS = [
  "תהלים", "משלי", "איוב", "שיר השירים", "רות", "איכה", "קהלת",
  "אסתר", "דניאל", "עזרא", "נחמיה", "דברי הימים א", "דברי הימים ב",
];

const BOOK_SECTIONS = [
  { label: "תורה", books: TORAH_BOOKS },
  { label: "נביאים", books: NEVIIM_BOOKS },
  { label: "כתובים", books: KETUVIM_BOOKS },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveSeriesImage(s: { image_url?: string | null; title: string }): string {
  return (s.image_url || getSeriesCoverImage(s.title) || "/images/series-default.png");
}

// ─── SeriesCard ───────────────────────────────────────────────────────────────

function SeriesCard({ series }: { series: { id: string; title: string; image_url?: string | null; rabbis?: { name: string } | null; lesson_count?: number | null } }) {
  const navigate = useNavigate();
  const family = getSeriesFamily(series.title);
  const familyDef = seriesFamilies[family];
  const imgSrc = resolveSeriesImage(series);
  const rabbiName = Array.isArray(series.rabbis)
    ? (series.rabbis as { name: string }[])[0]?.name
    : (series.rabbis as { name: string } | null)?.name;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/series/${series.id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/series/${series.id}`)}
      style={{
        borderRadius: radii.lg,
        overflow: "hidden",
        background: "white",
        boxShadow: shadows.cardSoft,
        cursor: "pointer",
        border: `1px solid rgba(139,111,71,0.08)`,
        transition: "box-shadow 0.15s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.cardHover;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.cardSoft;
        (e.currentTarget as HTMLDivElement).style.transform = "none";
      }}
    >
      {/* Image */}
      <div style={{ height: 140, overflow: "hidden", background: "#EDE5D6" }}>
        <img
          src={imgSrc}
          alt={series.title}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/series-default.png"; }}
        />
      </div>
      {/* Body */}
      <div style={{ padding: "0.9rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        {/* Family badge */}
        <span
          style={{
            display: "inline-block",
            padding: "0.1rem 0.5rem",
            borderRadius: radii.pill,
            background: familyDef.badgeBg,
            color: familyDef.badgeFg,
            fontFamily: fonts.body,
            fontSize: "0.65rem",
            fontWeight: 700,
            width: "fit-content",
          }}
        >
          {familyDef.label}
        </span>
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: "0.95rem",
            fontWeight: 700,
            color: colors.textDark,
            lineHeight: 1.3,
          }}
        >
          {series.title}
        </span>
        {rabbiName && (
          <span style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textMuted }}>
            {rabbiName}
          </span>
        )}
        {(series.lesson_count ?? 0) > 0 && (
          <span style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.goldDark, fontWeight: 600 }}>
            {series.lesson_count} שיעורים
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SeriesLibrary() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Data
  const { data: allTopSeries = [], isLoading: seriesLoading } = useTopSeries(30);
  const { data: rabbis = [], isLoading: rabbisLoading } = usePublicRabbis();
  const { data: topics = [], isLoading: topicsLoading } = useTopics();
  const { categories: sidebarCategories } = useContentSidebar();

  useSEO({
    title: "מאגר השיעורים והמאמרים — בני ציון",
    description: "18,000+ שיעורים ומאמרים בתנ״ך. לימוד עמוק מבית המדרש של בני ציון.",
    url: "https://bneyzion.co.il/series",
  });

  // Build book→categoryId map from sidebar cache
  const bookCategoryMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const cat of (sidebarCategories ?? [])) {
      // cat.books contains book nodes with id + title
      for (const book of (cat.books ?? [])) {
        if (book.title && book.id) map[book.title] = book.id;
      }
    }
    return map;
  }, [sidebarCategories]);

  function navigateToBook(bookTitle: string) {
    const catId = bookCategoryMap[bookTitle];
    if (catId) {
      navigate(`/category/${catId}`);
    } else {
      navigate(`/bible/${encodeURIComponent(bookTitle)}`);
    }
  }

  // Featured series: filter out "שיעורים כלליים" (exact title), then sort by lesson_count + views_count
  const featuredSeries = useMemo(() => {
    const filtered = allTopSeries.filter((s) => s.title !== "שיעורים כלליים");
    return filtered
      .slice()
      .sort((a, b) => {
        const countDiff = (b.lesson_count ?? 0) - (a.lesson_count ?? 0);
        if (countDiff !== 0) return countDiff;
        return ((b as { views_count?: number }).views_count ?? 0) - ((a as { views_count?: number }).views_count ?? 0);
      })
      .slice(0, 12);
  }, [allTopSeries]);

  // Search filter over featured series
  const filteredSeries = useMemo(() => {
    if (!searchQuery.trim()) return featuredSeries;
    const q = searchQuery.trim().toLowerCase();
    return featuredSeries.filter((s) => {
      const rabbiName = Array.isArray(s.rabbis)
        ? (s.rabbis as { name: string }[])[0]?.name ?? ""
        : (s.rabbis as { name: string } | null)?.name ?? "";
      return (
        s.title.toLowerCase().includes(q) ||
        rabbiName.toLowerCase().includes(q)
      );
    });
  }, [featuredSeries, searchQuery]);

  // Root topics only (parent_id = null) — no size-by-count since count is unavailable
  const rootTopics = useMemo(
    () => topics.filter((t) => !t.parent_id).slice(0, 12),
    [topics]
  );

  // Top rabbis (up to 12 by lesson_count)
  const topRabbis = useMemo(() => rabbis.slice(0, 12), [rabbis]);

  return (
    <DesignLayout>
      {/* ── Hero + Search ── */}
      <div
        dir="rtl"
        style={{
          background: `linear-gradient(160deg, #FBF6EC 0%, #F5EFE0 60%, #EDE5D0 100%)`,
          borderBottom: `1px solid rgba(139,111,71,0.12)`,
          padding: "3rem 2rem 2.5rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            insetInlineEnd: "-80px",
            top: "-100px",
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "rgba(196,162,101,0.06)",
            pointerEvents: "none",
          }}
        />
        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: "2.4rem",
            fontWeight: 800,
            color: colors.textDark,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          מאגר השיעורים והמאמרים
        </h1>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: "1rem",
            color: colors.textMuted,
            margin: "0.5rem 0 0",
          }}
        >
          18,000+ שיעורים ומאמרים בתנ״ך · 800+ סדרות · 200+ רבנים
        </p>
        <div
          style={{
            width: "4rem",
            height: 2,
            background: "rgba(196,162,101,0.3)",
            margin: "1rem 0",
          }}
        />

        {/* Search */}
        <div style={{ position: "relative", maxWidth: 480 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              insetInlineEnd: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: colors.textSubtle,
              pointerEvents: "none",
            }}
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חפש סדרה, שם רב..."
            style={{
              width: "100%",
              padding: "0.7rem 3rem 0.7rem 1.2rem",
              fontFamily: fonts.body,
              fontSize: "0.95rem",
              background: "white",
              border: `1px solid rgba(139,111,71,0.2)`,
              borderRadius: radii.pill,
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(139,111,71,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(139,111,71,0.2)")}
          />
        </div>
      </div>

      {/* ── Main content ── */}
      <div dir="rtl" style={{ padding: "2rem" }}>

        {/* ── Section: סדרות נבחרות ── */}
        <section style={{ marginBottom: "3rem" }}>
          <h2
            style={{
              fontFamily: fonts.display,
              fontSize: "1.4rem",
              fontWeight: 700,
              color: colors.textDark,
              margin: "0 0 1.25rem",
            }}
          >
            סדרות נבחרות
          </h2>

          {seriesLoading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "1rem",
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 240,
                    borderRadius: radii.lg,
                    background: "rgba(139,111,71,0.06)",
                    animation: "pulse 1.4s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          ) : filteredSeries.length === 0 ? (
            <p style={{ fontFamily: fonts.body, color: colors.textSubtle, fontSize: "0.9rem" }}>
              לא נמצאו סדרות התואמות את החיפוש.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "1rem",
              }}
            >
              {filteredSeries.map((s) => (
                <SeriesCard key={s.id} series={s} />
              ))}
            </div>
          )}
        </section>

        {/* ── Section: לפי ספר תנ"ך ── */}
        <section style={{ marginBottom: "3rem" }}>
          <h2
            style={{
              fontFamily: fonts.display,
              fontSize: "1.4rem",
              fontWeight: 700,
              color: colors.textDark,
              margin: "0 0 1.25rem",
            }}
          >
            לפי ספר תנ״ך
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {BOOK_SECTIONS.map(({ label, books }) => (
              <div key={label}>
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: colors.textSubtle,
                    letterSpacing: "0.08em",
                    marginBottom: "0.5rem",
                  }}
                >
                  {label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {books.map((bookTitle) => (
                    <button
                      key={bookTitle}
                      onClick={() => navigateToBook(bookTitle)}
                      style={{
                        padding: "0.35rem 0.85rem",
                        border: `1px solid rgba(139,111,71,0.18)`,
                        borderRadius: radii.pill,
                        fontFamily: fonts.body,
                        fontSize: "0.85rem",
                        background: "white",
                        color: colors.textDark,
                        cursor: "pointer",
                        transition: "background 0.12s, color 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = colors.parchmentDeep;
                        (e.currentTarget as HTMLButtonElement).style.color = colors.goldDeep;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "white";
                        (e.currentTarget as HTMLButtonElement).style.color = colors.textDark;
                      }}
                    >
                      {bookTitle}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section: לפי רב ── */}
        <section style={{ marginBottom: "3rem" }}>
          <h2
            style={{
              fontFamily: fonts.display,
              fontSize: "1.4rem",
              fontWeight: 700,
              color: colors.textDark,
              margin: "0 0 1.25rem",
            }}
          >
            לפי רב
          </h2>
          {rabbisLoading ? (
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: "50%",
                    background: "rgba(139,111,71,0.06)",
                    animation: "pulse 1.4s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "1rem",
              }}
            >
              {topRabbis.map((rabbi) => (
                <Link
                  key={rabbi.id}
                  to={`/rabbis/${rabbi.id}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.4rem",
                    textDecoration: "none",
                    padding: "0.75rem 0.5rem",
                    borderRadius: radii.lg,
                    background: "white",
                    border: `1px solid rgba(139,111,71,0.08)`,
                    boxShadow: shadows.cardSoft,
                    transition: "box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = shadows.card)}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = shadows.cardSoft)}
                >
                  {/* Avatar */}
                  {rabbi.image_url ? (
                    <img
                      src={rabbi.image_url}
                      alt={rabbi.name}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: `2px solid rgba(139,111,71,0.12)`,
                      }}
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = "none";
                        const fallback = el.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${colors.goldDark}, ${colors.goldLight})`,
                      display: rabbi.image_url ? "none" : "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: fonts.display,
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    {rabbi.name.replace(/^הרב\s+/, "").charAt(0)}
                  </div>
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: "0.78rem",
                      color: colors.textDark,
                      fontWeight: 600,
                      textAlign: "center",
                      lineHeight: 1.3,
                    }}
                  >
                    {rabbi.name}
                  </span>
                  {(rabbi.lesson_count ?? 0) > 0 && (
                    <span
                      style={{
                        fontFamily: fonts.body,
                        fontSize: "0.7rem",
                        color: colors.textSubtle,
                      }}
                    >
                      {rabbi.lesson_count} שיעורים
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Section: לפי נושא ── */}
        {!topicsLoading && rootTopics.length > 0 && (
          <section style={{ marginBottom: "3rem" }}>
            <h2
              style={{
                fontFamily: fonts.display,
                fontSize: "1.4rem",
                fontWeight: 700,
                color: colors.textDark,
                margin: "0 0 1.25rem",
              }}
            >
              לפי נושא
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
              {rootTopics.map((topic) => (
                <Link
                  key={topic.id}
                  to={`/topic/${topic.slug}`}
                  style={{
                    padding: "0.4rem 1rem",
                    border: `1px solid rgba(139,111,71,0.18)`,
                    borderRadius: radii.pill,
                    fontFamily: fonts.body,
                    fontSize: "0.9rem",
                    color: colors.textDark,
                    background: "white",
                    textDecoration: "none",
                    transition: "background 0.12s, color 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = colors.parchmentDeep;
                    (e.currentTarget as HTMLAnchorElement).style.color = colors.goldDeep;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "white";
                    (e.currentTarget as HTMLAnchorElement).style.color = colors.textDark;
                  }}
                >
                  {topic.name}
                </Link>
              ))}
            </div>
          </section>
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
}
