/**
 * TanachNewsPage — /tanach-news
 * "חדשות תנ"כיות — מאורעות השעה לאור התנ"ך" — הטור היומי של הרב יואב אוריאל.
 *
 * נבנה 7.7.2026 (סער + הרב יואב): מאגר הטורים (נקלטים אוטומטית מקבוצות
 * "בכוח התנ״ך ננצח" ע"י scripts/daily_content_sync.py) במודל דור-הפלאות —
 * ובראש העמוד, מודגש במסגרת, הטור האחרון ("החדשות של היום", בלי תלות ביום
 * ספציפי — הרב יואב 15:10). תאריכים עבריים (hebcal, מאומת). בסיום: כפתורי
 * ווטסאפ ודור-הפלאות במקום קישורי-טקסט.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DesignHeader from "@/components/layout-v2/DesignHeader";
import DesignFooter from "@/components/layout-v2/DesignFooter";
import { useSEO } from "@/hooks/useSEO";
import { sanitizeHtml } from "@/lib/sanitize";
import { hebrewDateLabel } from "@/lib/hebrewDate";
import { WhatsAppButton, DorHaplaotButton } from "@/components/family/BrandButtons";

const GOLD_DARK = "#8B6F47";
const GOLD_LIGHT = "#C4A265";
const PARCHMENT = "#FAF6F0";
const TEXT_DARK = "#2D1F0E";
const TEXT_MUTED = "#6B5C4A";
const NAVY_DEEP = "#1A2744";

const NEWS_SERIES_ID = "5d111b52-b421-4150-adfd-df256950117c";
const RABBI_NAME = "הרב יואב אוריאל";
const RABBI_AVATAR = "/images/yoav-campaign/yoav-with-shoftim-book.jpg";

interface NewsItem {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
}

function useTanachNews() {
  return useQuery<NewsItem[]>({
    queryKey: ["tanach-news-page"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, description, content, published_at, thumbnail_url")
        .eq("series_id", NEWS_SERIES_ID)
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NewsItem[];
    },
  });
}

export default function TanachNewsPage() {
  useSEO({
    title: "חדשות תנ״כיות — בני ציון",
    description: "מאורעות השעה לאור התנ״ך — הטור היומי של הרב יואב אוריאל",
  });
  const { data: items = [], isLoading } = useTanachNews();
  const [latest, ...rest] = items;

  return (
    <div style={{ minHeight: "100vh", background: PARCHMENT, fontFamily: "Ploni, sans-serif" }}>
      <DesignHeader />

      {/* Hero — נהר הירדן בצבעי-מים (Gemini, 7.7.2026) בשקיפות מתחת לגרדיאנט */}
      <section
        dir="rtl"
        style={{
          background: `linear-gradient(180deg, ${NAVY_DEEP} 0%, #2A3A5C 100%)`,
          padding: "4.5rem 1.5rem 5rem",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            backgroundImage: "url('/images/tanach-news-hero.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center 62%",
            opacity: 0.38,
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(180deg, rgba(26,39,68,0.55) 0%, rgba(26,39,68,0.25) 55%, rgba(26,39,68,0.75) 100%)`,
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at 50% 0%, rgba(232,213,160,0.14), transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            border: "1px solid rgba(232,213,160,0.4)", borderRadius: 999,
            padding: "0.35rem 1rem", color: "#E8D5A0",
            fontSize: "0.85rem", marginBottom: "1.25rem", position: "relative",
          }}
        >
          {RABBI_NAME}
        </div>
        <h1
          style={{
            fontFamily: "Kedem, Frank Ruhl Libre, serif",
            fontWeight: 900,
            fontSize: "clamp(2.3rem, 6vw, 3.6rem)",
            color: "#fff",
            margin: "0 0 0.8rem",
            position: "relative",
          }}
        >
          חדשות תנ״כיות
        </h1>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "1.05rem", margin: 0, position: "relative" }}>
          מאורעות השעה לאור התנ״ך — טור יומי
        </p>
      </section>

      <section dir="rtl" style={{ padding: "3.5rem 1.5rem 6rem", maxWidth: 1100, margin: "0 auto" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: TEXT_MUTED }}>טוען...</div>
        ) : (
          <>
            {/* ── הטור האחרון — "החדשות של היום", מודגש במסגרת ── */}
            {latest && (
              <article
                style={{
                  background: "#fff",
                  border: `2px solid ${GOLD_LIGHT}`,
                  borderRadius: "1.5rem",
                  boxShadow: "0 14px 44px rgba(139,111,71,0.16)",
                  padding: "2rem 2.25rem",
                  marginBottom: "3.5rem",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: "absolute", inset: 0,
                    background: "radial-gradient(ellipse at 88% 0%, rgba(232,213,160,0.22), transparent 55%)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.45rem",
                    background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD_DARK})`,
                    color: "#fff", borderRadius: 999, padding: "0.3rem 0.95rem",
                    fontSize: "0.78rem", fontWeight: 700, marginBottom: "1.1rem",
                    position: "relative",
                  }}
                >
                  📰 החדשות של היום
                </div>
                {/* תמונת המסר מהוואטסאפ — בראש הטור (סער 7.7.2026) */}
                {latest.thumbnail_url && (
                  <div
                    style={{
                      borderRadius: "1rem", overflow: "hidden",
                      marginBottom: "1.25rem", maxHeight: 340,
                      border: "1px solid rgba(139,111,71,0.15)",
                      position: "relative",
                    }}
                  >
                    <img
                      src={latest.thumbnail_url}
                      alt={latest.title}
                      style={{ width: "100%", height: "100%", maxHeight: 340, objectFit: "cover", objectPosition: "center 30%", display: "block" }}
                    />
                  </div>
                )}
                <h2
                  style={{
                    fontFamily: "Kedem, Frank Ruhl Libre, serif",
                    fontSize: "clamp(1.5rem, 3.4vw, 2.1rem)",
                    fontWeight: 900, color: TEXT_DARK, margin: "0 0 1rem",
                    position: "relative",
                  }}
                >
                  {latest.title}
                </h2>
                {latest.content && (
                  <div
                    className="tanach-news-body"
                    style={{ position: "relative" }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(latest.content) }}
                  />
                )}

                {/* חתימת הרב + כפתורי-מותג */}
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: "0.6rem",
                    marginTop: "1.5rem", paddingTop: "1.1rem",
                    borderTop: "1px solid rgba(139,111,71,0.15)",
                  }}
                >
                  <img
                    src={RABBI_AVATAR}
                    alt={RABBI_NAME}
                    style={{
                      width: 38, height: 38, borderRadius: "50%",
                      objectFit: "cover", objectPosition: "top",
                      border: "2px solid rgba(196,162,101,0.4)", flexShrink: 0,
                    }}
                  />
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: TEXT_DARK }}>
                    {RABBI_NAME}
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "1.1rem", position: "relative" }}>
                  <WhatsAppButton />
                  <DorHaplaotButton />
                </div>
              </article>
            )}

            {/* ── מאגר הטורים ── */}
            {rest.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                  <h2
                    style={{
                      fontFamily: "Kedem, Frank Ruhl Libre, serif",
                      fontSize: "1.2rem", fontWeight: 700, color: NAVY_DEEP,
                      margin: 0, whiteSpace: "nowrap",
                    }}
                  >
                    מאגר הטורים
                  </h2>
                  <div style={{ flex: 1, height: 1, background: "rgba(139,111,71,0.2)" }} />
                  <span style={{ fontSize: "0.72rem", color: TEXT_MUTED, whiteSpace: "nowrap" }}>
                    {rest.length} טורים
                  </span>
                </div>
                <style>{`
                  .news-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
                  @media (max-width: 600px) { .news-grid { grid-template-columns: 1fr; } }
                  .tanach-news-body p { font-family: Ploni, sans-serif; font-size: 1rem; line-height: 1.85; color: ${TEXT_DARK}; margin: 0 0 0.9rem; }
                  .tanach-news-body strong { color: ${GOLD_DARK}; }
                  .news-card:hover { transform: translateY(-4px); box-shadow: 0 16px 44px rgba(45,31,14,0.12); border-color: ${GOLD_LIGHT}; }
                `}</style>
                <div className="news-grid">
                  {rest.map((n) => (
                    <Link
                      key={n.id}
                      to={`/lessons/${n.id}`}
                      className="news-card"
                      style={{
                        display: "block",
                        background: "#fff",
                        border: "1px solid rgba(139,111,71,0.1)",
                        borderRadius: "1.25rem",
                        boxShadow: "0 2px 12px rgba(45,31,14,0.05)",
                        padding: 0,
                        overflow: "hidden",
                        textDecoration: "none",
                        transition: "all 0.25s ease",
                      }}
                    >
                      {n.thumbnail_url && (
                        <div style={{ height: 150, overflow: "hidden", position: "relative" }}>
                          <img
                            src={n.thumbnail_url}
                            alt=""
                            aria-hidden
                            loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", display: "block" }}
                          />
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(45,31,14,0.35) 0%, transparent 55%)" }} />
                        </div>
                      )}
                      <div style={{ padding: "1.1rem 1.35rem 1.25rem" }}>
                      {n.published_at && (
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: GOLD_DARK, letterSpacing: "0.04em", marginBottom: "0.45rem" }}>
                          {hebrewDateLabel(n.published_at.slice(0, 10))}
                        </div>
                      )}
                      <h3
                        style={{
                          fontFamily: "Kedem, Frank Ruhl Libre, serif",
                          fontSize: "1.1rem", fontWeight: 700, color: TEXT_DARK,
                          margin: "0 0 0.5rem", lineHeight: 1.4,
                        }}
                      >
                        {n.title}
                      </h3>
                      {n.description && (
                        <p
                          style={{
                            fontSize: "0.85rem", color: TEXT_MUTED, lineHeight: 1.7, margin: 0,
                            display: "-webkit-box" as any, WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical" as any, overflow: "hidden",
                          }}
                        >
                          {n.description}
                        </p>
                      )}
                      <div style={{ fontSize: "0.78rem", color: GOLD_DARK, fontWeight: 700, marginTop: "0.7rem" }}>
                        לקריאת הטור ←
                      </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>

      <DesignFooter />
    </div>
  );
}
