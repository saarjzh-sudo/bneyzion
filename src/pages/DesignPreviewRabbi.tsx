/**
 * /design-rabbi/:id — Single rabbi profile, redesigned.
 * 1.2: Series sorted by biblical order (sortByBiblicalOrder from biblicalOrder.ts)
 * 1.3: TOC — horizontal strip of books with series, scroll-to on click
 */
import { useMemo, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, BookOpen, Library, Play, Heart } from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows, seriesFamilies, getSeriesFamily, getSeriesCoverImage, lessonTypeLabel, formatDuration } from "@/lib/designTokens";
import { useRabbi, useRabbiSeries, useRabbiLessons } from "@/hooks/useRabbi";
import { usePublicRabbis } from "@/hooks/useRabbis";
import { sortByBiblicalOrder, getBiblicalSortIndex } from "@/lib/biblicalOrder";

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

  // ── 1.2: Sort series by biblical order ───────────────────────────────────
  const sortedSeries = useMemo(() => sortByBiblicalOrder(series as any[]), [series]);

  // ── 1.3: Build TOC — unique book groups with known biblical names first ──
  const bookGroups = useMemo(() => {
    const groups: Map<string, { bookName: string; seriesIds: string[]; idx: number }> = new Map();
    for (const s of sortedSeries as any[]) {
      const idx = getBiblicalSortIndex(s.title);
      // Extract the matched book/parsha name from title
      const title: string = s.title;
      // We can reuse getBiblicalSortIndex to check if it's recognized
      if (idx === Infinity) {
        // unrecognized — push to "אחר"
        if (!groups.has("__other__")) groups.set("__other__", { bookName: "אחר", seriesIds: [], idx: Infinity });
        groups.get("__other__")!.seriesIds.push(s.id);
        continue;
      }
      // Find the canonical book name: check parsha prefix or direct match
      let bookName = title.split(/[\s|–\-]/)[0];
      if (title.startsWith("פרשת ")) {
        // Group under Torah book by parsha name
        bookName = title.replace(/^פרשת\s+/, "").split(/[\s|–\-]/)[0];
        // Map parsha → Torah book
        const torahBooks: Record<string, string> = {
          "בראשית": "בראשית", "נח": "בראשית", "לך": "בראשית", "וירא": "בראשית",
          "חיי": "בראשית", "תולדות": "בראשית", "ויצא": "בראשית", "וישלח": "בראשית",
          "וישב": "בראשית", "מקץ": "בראשית", "ויגש": "בראשית", "ויחי": "בראשית",
          "שמות": "שמות", "וארא": "שמות", "בא": "שמות", "בשלח": "שמות",
          "יתרו": "שמות", "משפטים": "שמות", "תרומה": "שמות", "תצוה": "שמות",
          "כי": "שמות", "ויקהל": "שמות", "פקודי": "שמות",
          "ויקרא": "ויקרא", "צו": "ויקרא", "שמיני": "ויקרא", "תזריע": "ויקרא",
          "מצורע": "ויקרא", "אחרי": "ויקרא", "קדושים": "ויקרא", "אמור": "ויקרא",
          "בהר": "ויקרא", "בחוקותי": "ויקרא",
          "במדבר": "במדבר", "נשא": "במדבר", "בהעלותך": "במדבר", "שלח": "במדבר",
          "קרח": "במדבר", "חוקת": "במדבר", "בלק": "במדבר", "פנחס": "במדבר",
          "מטות": "במדבר", "מסעי": "במדבר",
          "דברים": "דברים", "ואתחנן": "דברים", "עקב": "דברים", "ראה": "דברים",
          "שופטים": "דברים", "ניצבים": "דברים", "נצבים": "דברים", "וילך": "דברים",
          "האזינו": "דברים",
        };
        bookName = torahBooks[bookName] || bookName;
      }
      if (!groups.has(bookName)) {
        groups.set(bookName, { bookName, seriesIds: [], idx });
      }
      groups.get(bookName)!.seriesIds.push(s.id);
    }
    return Array.from(groups.values()).sort((a, b) => a.idx - b.idx);
  }, [sortedSeries]);

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const scrollToBook = useCallback((bookName: string) => {
    const el = sectionRefs.current.get(bookName);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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

      {/* ── 1.3: Bible Book TOC ───────────────────────────────────────────── */}
      {bookGroups.length > 1 && (
        <div
          dir="rtl"
          style={{
            background: "white",
            borderBottom: `1px solid ${colors.parchmentDeep}`,
            padding: "0.9rem 1.5rem",
            position: "sticky",
            top: 64,
            zIndex: 20,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", minWidth: "max-content" }}>
            <span style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textMuted, fontWeight: 700, letterSpacing: "0.1em", marginInlineEnd: "0.5rem", flexShrink: 0 }}>
              ספרים:
            </span>
            {bookGroups.map((g) => (
              <button
                key={g.bookName}
                onClick={() => scrollToBook(g.bookName)}
                style={{
                  padding: "0.35rem 0.85rem",
                  borderRadius: radii.pill,
                  border: `1.5px solid rgba(139,111,71,0.18)`,
                  background: "transparent",
                  color: g.bookName === "אחר" ? colors.textMuted : colors.textDark,
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  opacity: g.bookName === "אחר" ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = `rgba(196,162,101,0.1)`;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = colors.goldDark;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,111,71,0.18)";
                }}
              >
                {g.bookName}
                <span style={{ marginInlineStart: "0.3rem", fontSize: "0.65rem", color: colors.goldDark, fontWeight: 900 }}>
                  {g.seriesIds.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 1.2 + 1.3: Series grouped by biblical book ───────────────────── */}
      {sortedSeries.length > 0 && (
        <section style={{ background: colors.parchment, padding: "3rem 1.5rem 2rem" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div dir="rtl" style={{ marginBottom: "2rem" }}>
              <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                {totalSeries} סדרות
              </div>
              <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)", color: colors.textDark, margin: 0 }}>
                הסדרות של {(rabbi as any).name} — לפי סדר התנ"ך
              </h2>
            </div>

            {/* Render by book group if TOC exists, otherwise flat list */}
            {bookGroups.length > 1 ? (
              <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
                {bookGroups.map((g) => {
                  const groupSeries = sortedSeries.filter((s: any) => g.seriesIds.includes(s.id));
                  return (
                    <div
                      key={g.bookName}
                      ref={(el) => {
                        if (el) sectionRefs.current.set(g.bookName, el as HTMLElement);
                        else sectionRefs.current.delete(g.bookName);
                      }}
                    >
                      {/* Book heading */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                        <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.2rem", color: colors.textDark }}>
                          {g.bookName}
                        </div>
                        <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, rgba(139,111,71,0.2))` }} />
                        <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted, fontWeight: 600 }}>
                          {groupSeries.length} סדרות
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px,100%), 1fr))", gap: "1.25rem" }}>
                        {groupSeries.map((s: any) => <SeriesCard key={s.id} s={s} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px,100%), 1fr))", gap: "1.25rem" }}>
                {sortedSeries.map((s: any) => <SeriesCard key={s.id} s={s} />)}
              </div>
            )}
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

function SeriesCard({ s }: { s: any }) {
  const fam = seriesFamilies[getSeriesFamily(s.title, s.description)];
  const cover = s.image_url || getSeriesCoverImage(s.title) || "/images/series-default.png";
  return (
    <Link to={`/series/${s.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: "white",
          borderRadius: radii.xl,
          overflow: "hidden",
          border: `1px solid rgba(139,111,71,0.1)`,
          boxShadow: shadows.cardSoft,
          cursor: "pointer",
          transition: "all 0.28s",
          borderInlineEnd: `4px solid ${fam.accent}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = shadows.cardHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = shadows.cardSoft;
        }}
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
