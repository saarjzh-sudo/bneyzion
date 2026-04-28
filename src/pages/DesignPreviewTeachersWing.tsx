/**
 * /design-teachers-wing — אגף המורים, redesigned.
 * Categories of teaching tools (atomic content, riddles, courses, articles, etc.)
 */
import { Link } from "react-router-dom";
import { GraduationCap, PenTool, Puzzle, BookOpen, FileText, Music, Sparkles, Loader2 } from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import { colors, fonts, gradients, radii, shadows, getSeriesCoverImage } from "@/lib/designTokens";
import { useTopSeries } from "@/hooks/useTopSeries";

const CATEGORIES = [
  { id: "atomic", icon: PenTool, label: "תכנים אטומיים", description: "פסקאות קצרות לשיעור, שיחה משפחתית, או פוסט קצר.", color: "#8B6F47", count: 142 },
  { id: "riddles", icon: Puzzle, label: "חידות", description: "חידת תנ״ך אחת לכל פרק. מאתגרת, משחקית, מזמינה לדיון.", color: "#5B6E3A", count: 87 },
  { id: "courses", icon: BookOpen, label: "קורסים", description: "מסלולי לימוד שיטתיים בכל ספרי התנ״ך.", color: "#2D7D7D", count: 24 },
  { id: "articles", icon: FileText, label: "מאמרים", description: "מאמרי עומק מאת רבני האתר עם מקורות ומראי מקום.", color: "#1A2744", count: 56 },
  { id: "tools", icon: Music, label: "כלי הוראה", description: "מצגות, דפי עבודה, סרטונים קצרים — כל מה שצריך לכיתה.", color: "#422817", count: 38 },
  { id: "podcasts", icon: GraduationCap, label: "פודקאסט מורים", description: "שיחות עם מחנכים על הוראת תנ״ך.", color: "#6B4F2A", count: 19 },
];

export default function DesignPreviewTeachersWing() {
  const { data: relatedSeries = [], isLoading } = useTopSeries(6);

  return (
    <DesignLayout>
      <DesignPageHero
        variant="olive"
        eyebrow="מרכז אגף המורים"
        title="כלים, תכנים ומשאבים למחנכי תנ״ך"
        subtitle="אגף המורים של בני ציון אוסף את כל החומרים שאתם צריכים — תכנים אטומיים מוכנים לשיעור, חידות, מצגות, מאמרי עומק וכלי הוראה. הכל בגישה חופשית."
      >
        <button style={{ padding: "0.85rem 2rem", borderRadius: radii.lg, border: "none", background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "1rem", cursor: "pointer", boxShadow: shadows.goldGlow }}>
          הצטרף לקהילת המורים
        </button>
      </DesignPageHero>

      {/* Categories grid */}
      <section style={{ background: colors.parchment, padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "2rem" }}>
            <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.oliveMain, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              קטגוריות
            </div>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.5rem, 3vw, 2.1rem)", color: colors.textDark, margin: 0 }}>
              בחר נושא ללמידה
            </h2>
          </div>

          <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link key={cat.id} to={`#${cat.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ background: "white", borderRadius: radii.xl, padding: "1.5rem", border: `1px solid rgba(139,111,71,0.1)`, boxShadow: shadows.cardSoft, cursor: "pointer", transition: "all 0.28s", position: "relative", overflow: "hidden" }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = shadows.cardHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = shadows.cardSoft; }}
                  >
                    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 5, background: cat.color }} />
                    <div style={{ width: 56, height: 56, borderRadius: radii.lg, background: `${cat.color}15`, color: cat.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                      <Icon size={28} />
                    </div>
                    <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.2rem", color: colors.textDark, margin: "0 0 0.45rem" }}>
                      {cat.label}
                    </h3>
                    <p style={{ fontFamily: fonts.body, fontSize: "0.9rem", lineHeight: 1.65, color: colors.textMuted, margin: "0 0 0.85rem" }}>
                      {cat.description}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.85rem", borderTop: `1px solid rgba(139,111,71,0.08)` }}>
                      <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: cat.color, fontWeight: 700 }}>
                        {cat.count} פריטים
                      </span>
                      <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.goldDark, fontWeight: 600 }}>
                        עיין ←
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why join — value prop strip */}
      <section style={{ background: colors.oliveBg, padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }} dir="rtl">
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <Sparkles style={{ width: 28, height: 28, color: colors.oliveMain, margin: "0 auto 0.6rem" }} />
            <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.oliveMain, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              למה להצטרף
            </div>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)", color: colors.textDark, margin: 0 }}>
              מה תקבל באגף המורים
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
            <Benefit icon="📚" title="מאגר חומרים" text="גישה חופשית למאות תכנים מוכנים לשיעור — חידות, מצגות, דפי עבודה." />
            <Benefit icon="👥" title="קהילת מורים" text="קבוצת WhatsApp פעילה למחנכי תנ״ך — שאלות, רעיונות, חברותא וירטואלית." />
            <Benefit icon="🎓" title="הכשרות" text="כנסים שנתיים, סדנאות מקוונות, ולמידה עמיתית מתמשכת." />
            <Benefit icon="🛠" title="כלים מעשיים" text="כלי AI לחיפוש פסוקים, דף עבודה אוטומטי, מחולל חידות." />
          </div>
        </div>
      </section>

      {/* Recommended series for teachers */}
      <section style={{ background: colors.parchment, padding: "4rem 1.5rem 6rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "1.75rem" }}>
            <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              סדרות מומלצות למורים
            </div>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.3rem, 2.5vw, 1.7rem)", color: colors.textDark, margin: 0 }}>
              סדרות שבני ברכי בכיתה
            </h2>
          </div>

          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
              <Loader2 style={{ width: 24, height: 24, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
              {(relatedSeries as any[]).map((s) => {
                const cover = s.image_url || getSeriesCoverImage(s.title) || "/images/series-default.png";
                return (
                  <Link key={s.id} to={`/design-series-page/${s.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ background: "white", borderRadius: radii.lg, overflow: "hidden", border: `1px solid rgba(139,111,71,0.1)`, cursor: "pointer", transition: "all 0.28s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                    >
                      <div style={{ aspectRatio: "16/9", overflow: "hidden", background: colors.parchmentDark }}>
                        <img src={cover} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.9rem", color: colors.textDark, lineHeight: 1.35, marginBottom: "0.3rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.45em" }}>
                          {s.title}
                        </div>
                        <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>
                          {s.rabbis?.name || ""} · {s.lesson_count} שיעורים
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DesignLayout>
  );
}

function Benefit({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div style={{ background: "white", borderRadius: radii.lg, padding: "1.25rem", textAlign: "center", border: `1px solid rgba(91,110,58,0.12)`, boxShadow: shadows.cardSoft }}>
      <div style={{ fontSize: 36, marginBottom: "0.75rem" }}>{icon}</div>
      <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1rem", color: colors.textDark, margin: "0 0 0.4rem" }}>
        {title}
      </h3>
      <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", lineHeight: 1.65, color: colors.textMuted, margin: 0 }}>
        {text}
      </p>
    </div>
  );
}
