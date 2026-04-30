/**
 * /design-series-list — Top series list, redesigned.
 *
 * Pulls REAL data from Supabase (top series by lesson_count, only active).
 * The first series is highlighted with a "⭐ דוגמה לסדרה עם תמונת קאוורס"
 * badge so Saar can clearly see what a series with a cover image looks like
 * vs without (most series in the DB don't have image_url populated yet).
 *
 * Layout matches DesignPreviewHome's TopSeriesSection card pattern:
 *   - Hero (parchment variant via DesignPageHero)
 *   - Filter row (family chips)
 *   - Two-column responsive grid: image (38%) + info (62%)
 *   - Family-color stripe on the inside edge of each cover
 */
import { useMemo, useState } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import {
  colors,
  fonts,
  gradients,
  radii,
  shadows,
  seriesFamilies,
  getSeriesFamily,
  getSeriesCoverImage,
  type SeriesFamily,
} from "@/lib/designTokens";
import { useTopSeries } from "@/hooks/useTopSeries";
import { TeacherContentBadge } from "@/components/ui/TeacherContentBadge";

const FAMILIES_ORDER: SeriesFamily[] = [
  "sacredCanon",
  "weeklyObservance",
  "miraculous",
  "remembrance",
  "youth",
  "assembly",
  "reference",
];

export default function DesignPreviewSeriesList() {
  const { data: allSeries, isLoading } = useTopSeries(150);
  const [activeFamily, setActiveFamily] = useState<SeriesFamily | "all">("all");
  const [search, setSearch] = useState("");

  // Top 5 series by lesson_count (only active, only with rabbi)
  const top5 = useMemo(() => {
    if (!allSeries?.length) return [];
    return [...(allSeries as any[])]
      .filter((s: any) => s.status === "active" && (s.lesson_count || 0) > 0)
      .sort((a, b) => (b.lesson_count || 0) - (a.lesson_count || 0))
      .slice(0, 5);
  }, [allSeries]);

  // All series filtered
  const filteredAll = useMemo(() => {
    if (!allSeries?.length) return [];
    let list = [...(allSeries as any[])].filter(
      (s) => s.status === "active" && (s.lesson_count || 0) > 0
    );
    if (activeFamily !== "all") {
      list = list.filter((s) => getSeriesFamily(s.title, s.description) === activeFamily);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.title || "").toLowerCase().includes(q) ||
          (s.rabbis?.name || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (b.lesson_count || 0) - (a.lesson_count || 0));
  }, [allSeries, activeFamily, search]);

  return (
    <DesignLayout>
      <DesignPageHero
        variant="parchment"
        eyebrow="ספריית הסדרות"
        title="הסדרות באתר"
        subtitle={
          allSeries
            ? `${allSeries.filter((s: any) => s.status === "active").length} סדרות פעילות, מ-200+ רבנים. בחר נושא או חפש סדרה.`
            : "טוען..."
        }
      >
        {/* Search bar */}
        <div
          style={{
            position: "relative",
            maxWidth: 480,
            margin: "1rem auto 0",
          }}
        >
          <Search
            style={{
              position: "absolute",
              top: "50%",
              right: 16,
              transform: "translateY(-50%)",
              width: 18,
              height: 18,
              color: colors.textSubtle,
            }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש סדרה או רב..."
            style={{
              width: "100%",
              padding: "0.85rem 3rem 0.85rem 1.25rem",
              borderRadius: radii.lg,
              border: `1.5px solid ${colors.parchmentDeep}`,
              background: "white",
              fontFamily: fonts.body,
              fontSize: "0.95rem",
              color: colors.textDark,
              outline: "none",
              direction: "rtl",
              boxShadow: shadows.cardSoft,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.goldDark;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.parchmentDeep;
            }}
          />
        </div>
      </DesignPageHero>

      {/* ─── Family filter chips ────────────────────────────────────────── */}
      <section
        style={{
          background: colors.parchment,
          padding: "1rem 1.5rem 0",
          position: "sticky",
          top: 96,
          zIndex: 10,
          borderBottom: `1px solid rgba(139,111,71,0.1)`,
        }}
      >
        <div
          dir="rtl"
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            padding: "0.5rem 0 1.25rem",
            scrollbarWidth: "thin",
          }}
        >
          <button
            onClick={() => setActiveFamily("all")}
            style={{
              padding: "0.5rem 1.1rem",
              borderRadius: radii.pill,
              border: `1.5px solid ${activeFamily === "all" ? colors.goldDark : "rgba(139,111,71,0.2)"}`,
              background:
                activeFamily === "all" ? colors.goldDark : "white",
              color: activeFamily === "all" ? "white" : colors.textMuted,
              fontFamily: fonts.body,
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >
            כל הסדרות
          </button>
          {FAMILIES_ORDER.map((key) => {
            const fam = seriesFamilies[key];
            const active = activeFamily === key;
            return (
              <button
                key={key}
                onClick={() => setActiveFamily(key)}
                style={{
                  padding: "0.5rem 1.1rem",
                  borderRadius: radii.pill,
                  border: `1.5px solid ${active ? fam.accent : "rgba(139,111,71,0.2)"}`,
                  background: active ? fam.badgeBg : "white",
                  color: active ? fam.badgeFg : colors.textMuted,
                  fontFamily: fonts.body,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}
              >
                {fam.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Top 5 highlighted ──────────────────────────────────────────── */}
      <section style={{ background: colors.parchment, padding: "3.5rem 1.5rem 2.5rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "2rem" }}>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.goldDark,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.3rem",
              }}
            >
              הסדרות הפופולריות ביותר
            </div>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "clamp(1.5rem, 3vw, 2.1rem)",
                color: colors.textDark,
                margin: 0,
              }}
            >
              חמש הסדרות עם הכי הרבה שיעורים
            </h2>
          </div>

          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
              <Loader2 style={{ width: 28, height: 28, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <div
              dir="rtl"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {top5.map((s, i) => {
                const fam = seriesFamilies[getSeriesFamily(s.title, s.description)];
                const cover = s.image_url || getSeriesCoverImage(s.title) || "/images/series-default.png";
                const isFirst = i === 0;
                return (
                  <Link
                    key={s.id}
                    to={`/design-series-page/${s.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div
                      style={{
                        borderRadius: radii.xl,
                        overflow: "hidden",
                        display: "flex",
                        background: "white",
                        border: isFirst
                          ? `2px solid ${colors.goldDark}`
                          : `1px solid rgba(139,111,71,0.1)`,
                        cursor: "pointer",
                        transition: "all 0.28s ease",
                        boxShadow: isFirst
                          ? `0 8px 32px rgba(139,111,71,0.18), 0 0 0 4px rgba(196,162,101,0.1)`
                          : shadows.cardSoft,
                        minHeight: 160,
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = isFirst
                          ? `0 12px 48px rgba(139,111,71,0.25), 0 0 0 4px rgba(196,162,101,0.15)`
                          : shadows.cardHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = isFirst
                          ? `0 8px 32px rgba(139,111,71,0.18), 0 0 0 4px rgba(196,162,101,0.1)`
                          : shadows.cardSoft;
                      }}
                    >
                      {/* Marker badge for the first card */}
                      {isFirst && (
                        <div
                          style={{
                            position: "absolute",
                            top: -10,
                            right: 16,
                            zIndex: 5,
                            padding: "0.3rem 0.85rem",
                            borderRadius: radii.pill,
                            background: gradients.goldButton,
                            color: "white",
                            fontFamily: fonts.body,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            boxShadow: shadows.goldGlow,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                          }}
                        >
                          <Sparkles style={{ width: 12, height: 12 }} />
                          דוגמה לסדרה עם תמונת קאוורס
                        </div>
                      )}

                      {/* Image */}
                      <div style={{ width: "38%", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                        <img
                          src={cover}
                          alt={s.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        {/* Family stripe */}
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            left: 0,
                            width: 5,
                            background: fam.accent,
                          }}
                        />
                        {/* Lesson count badge */}
                        <div
                          style={{
                            position: "absolute",
                            bottom: 10,
                            right: 10,
                            padding: "0.25rem 0.65rem",
                            borderRadius: radii.sm,
                            background: "rgba(0,0,0,0.6)",
                            color: "white",
                            fontFamily: fonts.body,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            backdropFilter: "blur(6px)",
                            WebkitBackdropFilter: "blur(6px)",
                          }}
                        >
                          {s.lesson_count} שיעורים
                        </div>
                      </div>

                      {/* Info */}
                      <div
                        style={{
                          padding: "1.25rem 1.4rem",
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.65rem", flexWrap: "wrap" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.22rem 0.6rem",
                                borderRadius: radii.sm,
                                background: fam.badgeBg,
                                color: fam.badgeFg,
                                fontFamily: fonts.body,
                                fontSize: "0.65rem",
                                letterSpacing: "0.1em",
                                fontWeight: 700,
                                textTransform: "uppercase",
                              }}
                            >
                              {fam.label}
                            </span>
                            <TeacherContentBadge tags={s.audience_tags} />
                          </div>
                          <div
                            style={{
                              fontFamily: fonts.display,
                              fontWeight: 900,
                              fontSize: "1.1rem",
                              color: colors.textDark,
                              lineHeight: 1.3,
                              marginBottom: "0.35rem",
                            }}
                          >
                            {s.title}
                          </div>
                          {s.rabbis?.name && (
                            <div
                              style={{
                                fontFamily: fonts.body,
                                fontSize: "0.85rem",
                                color: colors.goldDark,
                                fontWeight: 600,
                                marginBottom: "0.5rem",
                              }}
                            >
                              {s.rabbis.name}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: "0.75rem",
                            paddingTop: "0.75rem",
                            borderTop: "1px solid rgba(139,111,71,0.08)",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: fonts.body,
                              fontSize: "0.78rem",
                              color: colors.textMuted,
                            }}
                          >
                            {i === 0 ? "הסדרה הגדולה באתר" : `מקום #${i + 1}`}
                          </span>
                          <button
                            style={{
                              padding: "0.4rem 1rem",
                              borderRadius: "0.65rem",
                              border: "none",
                              background: gradients.goldButton,
                              color: "white",
                              fontFamily: fonts.accent,
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          >
                            התחל ללמוד ←
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── Full list (compact) ────────────────────────────────────────── */}
      <section style={{ background: colors.parchmentDark, padding: "4rem 1.5rem 6rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "2rem" }}>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.oliveMain,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.3rem",
              }}
            >
              {filteredAll.length} סדרות
              {activeFamily !== "all" && ` בקטגוריה: ${seriesFamilies[activeFamily].label}`}
              {search && ` · חיפוש: "${search}"`}
            </div>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "clamp(1.4rem, 2.8vw, 1.9rem)",
                color: colors.textDark,
                margin: 0,
              }}
            >
              כל הסדרות
            </h2>
          </div>

          <div
            dir="rtl"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "1rem",
            }}
          >
            {filteredAll.slice(0, 24).map((s) => {
              const fam = seriesFamilies[getSeriesFamily(s.title, s.description)];
              return (
                <Link
                  key={s.id}
                  to={`/design-series-page/${s.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      background: "white",
                      borderRadius: radii.lg,
                      padding: "1rem 1.1rem",
                      border: `1px solid rgba(139,111,71,0.08)`,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      borderRight: `4px solid ${fam.accent}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateX(-3px)";
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(45,31,14,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateX(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.15rem 0.5rem",
                          borderRadius: radii.sm,
                          background: fam.badgeBg,
                          color: fam.badgeFg,
                          fontFamily: fonts.body,
                          fontSize: "0.6rem",
                          letterSpacing: "0.08em",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        {fam.label}
                      </span>
                      <TeacherContentBadge tags={s.audience_tags} variant="small" />
                    </div>
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color: colors.textDark,
                        lineHeight: 1.35,
                        marginBottom: "0.35rem",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        minHeight: "2.6em",
                      }}
                    >
                      {s.title}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontFamily: fonts.body,
                        fontSize: "0.75rem",
                        color: colors.textMuted,
                      }}
                    >
                      <span>{s.rabbis?.name || ""}</span>
                      <span style={{ color: colors.goldDark, fontWeight: 600 }}>
                        {s.lesson_count} שיעורים
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </DesignLayout>
  );
}
