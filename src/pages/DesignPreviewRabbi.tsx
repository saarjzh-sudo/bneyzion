/**
 * /design-rabbi/:id — Single rabbi profile, redesigned.
 */
import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, BookOpen, Library, Play, Heart } from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows, seriesFamilies, getSeriesFamily, getSeriesCoverImage, lessonTypeLabel, formatDuration } from "@/lib/designTokens";
import { useRabbi, useRabbiSeries, useRabbiLessons } from "@/hooks/useRabbi";
import { usePublicRabbis } from "@/hooks/useRabbis";

export default function DesignPreviewRabbi() {
  const { id } = useParams<{ id?: string }>();
  const { data: allRabbis } = usePublicRabbis();

  // Default to top rabbi by lesson count
  const effectiveId = useMemo(() => {
    if (id) return id;
    if (!allRabbis?.length) return undefined;
    const top = [...(allRabbis as any[])].sort((a, b) => (b.lesson_count || 0) - (a.lesson_count || 0))[0];
    return top?.id;
  }, [allRabbis, id]);

  const { data: rabbi, isLoading: rabbiLoading } = useRabbi(effectiveId);
  const { data: series = [] } = useRabbiSeries(effectiveId);
  const { data: lessons = [] } = useRabbiLessons(effectiveId);

  if (rabbiLoading || !rabbi) {
    return (
      <DesignLayout>
        <div style={{ padding: "8rem 0", display: "flex", justifyContent: "center", background: colors.parchment }}>
          <Loader2 style={{ width: 32, height: 32, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DesignLayout>
    );
  }

  const initial = ((rabbi as any).name || "").replace(/^הרב /, "")[0] || "ר";
  const totalLessons = (rabbi as any).lesson_count || (lessons as any[]).length;
  const totalSeries = (series as any[]).length;

  return (
    <DesignLayout transparentHeader overlapHero>
      {/* Mahogany hero with avatar */}
      <div
        style={{
          minHeight: 460,
          position: "relative",
          overflow: "hidden",
          marginTop: -96,
          background: gradients.mahoganyHero,
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(0,0,0,0.55) 100%)" }} />

        <div
          dir="rtl"
          style={{
            position: "relative",
            minHeight: 460,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "150px 1.5rem 4rem",
            maxWidth: 800,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: (rabbi as any).image_url ? "transparent" : gradients.goldButton,
              backgroundImage: (rabbi as any).image_url ? `url(${(rabbi as any).image_url})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              border: `4px solid ${colors.goldShimmer}`,
              boxShadow: shadows.goldGlow,
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: "3rem",
              color: "white",
            }}
          >
            {!(rabbi as any).image_url && initial}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.85rem" }}>
            <div style={{ width: 40, height: 1, background: "rgba(232,213,160,0.45)" }} />
            <div style={{ width: 6, height: 6, background: colors.goldShimmer, transform: "rotate(45deg)" }} />
            <div style={{ width: 40, height: 1, background: "rgba(232,213,160,0.45)" }} />
          </div>

          <h1 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "clamp(2rem, 4.5vw, 3rem)", color: "rgba(255,255,255,0.95)", textShadow: "0 2px 20px rgba(0,0,0,0.5)", margin: "0 0 0.5rem", fontStyle: "italic" }}>
            {(rabbi as any).name}
          </h1>

          {(rabbi as any).title && (
            <div style={{ fontFamily: fonts.body, fontSize: "1rem", color: colors.goldShimmer, marginBottom: "1.25rem" }}>
              {(rabbi as any).title}
            </div>
          )}

          {/* Stats inline */}
          <div style={{ display: "flex", gap: "2rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <Stat value={totalLessons.toLocaleString("he-IL")} label="שיעורים" />
            <Stat value={totalSeries.toLocaleString("he-IL")} label="סדרות" />
            <Stat value="∞" label="מסירות" />
          </div>

          <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button style={{ padding: "0.85rem 1.8rem", borderRadius: radii.lg, border: "none", background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "1rem", cursor: "pointer", boxShadow: shadows.goldGlow, display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <Play size={16} fill="currentColor" /> השמע אקראית
            </button>
            <button style={{ padding: "0.85rem 1.6rem", borderRadius: radii.lg, border: "1.5px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", color: "white", fontFamily: fonts.accent, fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <Heart size={16} /> עקוב
            </button>
          </div>
        </div>
      </div>

      {/* Bio */}
      {(rabbi as any).bio && (
        <section style={{ background: colors.parchment, padding: "4rem 1.5rem 2rem" }}>
          <div style={{ maxWidth: 880, margin: "0 auto" }} dir="rtl">
            <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              ביוגרפיה
            </div>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)", color: colors.textDark, margin: "0 0 1.25rem" }}>
              על הרב
            </h2>
            <p style={{ fontFamily: fonts.body, fontSize: "1.05rem", lineHeight: 2, color: colors.textMid, margin: 0 }}>
              {(rabbi as any).bio}
            </p>
          </div>
        </section>
      )}

      {/* Series section */}
      {(series as any[]).length > 0 && (
        <section style={{ background: colors.parchment, padding: "3rem 1.5rem 2rem" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div dir="rtl" style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                {totalSeries} סדרות
              </div>
              <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)", color: colors.textDark, margin: 0 }}>
                הסדרות של {(rabbi as any).name}
              </h2>
            </div>

            <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {(series as any[]).slice(0, 6).map((s) => {
                const fam = seriesFamilies[getSeriesFamily(s.title, s.description)];
                const cover = s.image_url || getSeriesCoverImage(s.title) || "/images/series-default.png";
                return (
                  <Link key={s.id} to={`/design-series-page/${s.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ background: "white", borderRadius: radii.xl, overflow: "hidden", border: `1px solid rgba(139,111,71,0.1)`, boxShadow: shadows.cardSoft, cursor: "pointer", transition: "all 0.28s", borderRight: `4px solid ${fam.accent}` }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = shadows.cardHover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = shadows.cardSoft; }}
                    >
                      <div style={{ aspectRatio: "16/9", overflow: "hidden", background: colors.parchmentDark }}>
                        <img src={cover} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div style={{ padding: "1rem 1.1rem 1.15rem" }}>
                        <span style={{ display: "inline-block", padding: "0.15rem 0.45rem", borderRadius: radii.sm, background: fam.badgeBg, color: fam.badgeFg, fontFamily: fonts.body, fontSize: "0.6rem", letterSpacing: "0.1em", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.45rem" }}>
                          {fam.label}
                        </span>
                        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.95rem", color: colors.textDark, lineHeight: 1.35, marginBottom: "0.4rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.5em" }}>
                          {s.title}
                        </div>
                        <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.goldDark, fontWeight: 600 }}>
                          {s.lesson_count || 0} שיעורים
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Latest lessons strip */}
      {(lessons as any[]).length > 0 && (
        <section style={{ background: colors.parchmentDark, padding: "3rem 1.5rem 6rem" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div dir="rtl" style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.oliveMain, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                שיעורים אחרונים
              </div>
              <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.3rem, 2.4vw, 1.7rem)", color: colors.textDark, margin: 0 }}>
                לאחרונה לימד
              </h2>
            </div>
            <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {(lessons as any[]).slice(0, 8).map((l: any) => (
                <div key={l.id} style={{ background: "white", borderRadius: radii.md, padding: "0.85rem 1rem", border: `1px solid rgba(139,111,71,0.08)`, display: "flex", alignItems: "center", gap: "0.85rem", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = shadows.cardSoft)}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                >
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: gradients.goldButton, color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Play size={14} fill="currentColor" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.92rem", color: colors.textDark, marginBottom: "0.15rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {l.title}
                    </div>
                    <div style={{ fontFamily: fonts.body, fontSize: "0.74rem", color: colors.textMuted }}>
                      {(l as any).series?.title || ""} · {lessonTypeLabel(l.source_type)}
                      {l.duration ? ` · ${formatDuration(l.duration)}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DesignLayout>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.6rem", color: colors.goldShimmer, marginBottom: "0.1rem" }}>
        {value}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: "rgba(255,255,255,0.65)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}
