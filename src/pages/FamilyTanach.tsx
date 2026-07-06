/**
 * /family-tanach — "תנ״ך למשפחה" lobby page.
 *
 * A standalone gateway (requested by Rabbi Yoav Uriel + Saar, 7.7.2026) that gathers every
 * daily/family learning experience under one warm, premium hub — accessible from the top nav,
 * not buried as a homepage section.
 *
 * Reuses the existing FamilyBibleSection chapel-arch card language from DesignPreviewHome.tsx
 * (same /public/family-bible/*.webp assets) but expands it into a full page: hero + 6 cards +
 * a closing CTA. Wrapped in the production <Layout> (header + sidebar + footer), matching
 * ParashaPage.tsx's pattern.
 *
 * Real data only: the "חידות לשולחן השבת" card pulls its live lesson count from Supabase
 * (series id c852edd8-d959-4c8d-bf7e-17b5881275fa — "חידות לילדים פ"ש", 50 lessons, active,
 * audience_tags=[general] — verified 7.7.2026 via Management API). No mock numbers.
 *
 * SHARED-FILE PATCHES NEEDED (not applied here — see report to Saar):
 *  1. src/App.tsx — lazy import + <Route path="/family-tanach">
 *  2. src/components/layout-v2/DesignHeader.tsx — NAV_ITEMS entry "תנ״ך למשפחה"
 *  3. src/pages/DesignPreviewHome.tsx — FamilyBibleSection "הלימוד היומי" header should link here
 */

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { colors, fonts, gradients, shadows } from "@/lib/designTokens";

// ── Riddles series — real data, no mock ────────────────────────────────────
const RIDDLES_SERIES_ID = "c852edd8-d959-4c8d-bf7e-17b5881275fa";

function useRiddlesSeries() {
  return useQuery({
    queryKey: ["family-tanach-riddles-series", RIDDLES_SERIES_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("id, title, lesson_count, image_url, status, audience_tags")
        .eq("id", RIDDLES_SERIES_ID)
        .not("audience_tags", "cs", '{"teachers"}')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Card model ───────────────────────────────────────────────────────────
interface LobbyCard {
  id: string;
  title: string;
  desc: string;
  href: string;
  image: string;
  badge?: string;
  disabled?: boolean;
}

const BASE_CARDS: LobbyCard[] = [
  {
    id: "parasha",
    title: "פרשת השבוע",
    desc: "מאמר, שיעורי אודיו ווידאו על פרשת השבוע — כל שבוע מחדש",
    href: "/parasha",
    image: "/family-bible/parasha-shavua.webp",
    badge: "מתעדכן שבועית",
  },
  {
    id: "chapter-weekly",
    title: "הפרק השבועי",
    desc: "עם הרב יואב אוריאל — לומדים תנ״ך פרק אחרי פרק, כל השנה",
    href: "/chapter-weekly",
    image: "/family-bible/hero-compass.webp",
    badge: "התוכנית המרכזית",
  },
  {
    id: "daily-verse",
    title: "פסוק אחד ביום",
    desc: "תנ״ך לחיים — פסוק קצר להתחיל איתו את היום, לכל הגילאים",
    href: "/daily-verse",
    image: "/family-bible/abstract-verse.webp",
  },
  {
    id: "daily-video",
    title: "וידאו יומי",
    desc: "כמה דקות ביום, סרטון קצר שמקרב את התנ״ך הביתה",
    href: "/daily-video",
    image: "/family-bible/hero-verse.webp",
  },
  {
    id: "dor-haplaot",
    title: "דור הפלאות",
    desc: "70 ניסי מלחמת חרבות ברזל — סיפורי הצלה והשגחה שלא ישכחו",
    href: "/dor-haplaot",
    image: "/family-bible/abstract-miracles.webp",
  },
  {
    id: "riddles",
    title: "חידות לשולחן השבת",
    desc: "חידות תנ״ך לילדים, מוכן להדפסה ולשולחן השבת",
    href: `/series/${RIDDLES_SERIES_ID}`,
    image: "/family-bible/abstract-podcast.webp",
  },
];

function FamilyTanachHero() {
  return (
    <section
      dir="rtl"
      style={{
        background: gradients.warmDark,
        padding: "5rem 1.5rem 6.5rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* soft gold vignette */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(232,213,160,0.14) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.4rem 1.1rem",
            borderRadius: 999,
            border: `1px solid rgba(232,213,160,0.35)`,
            color: colors.goldShimmer,
            fontFamily: fonts.body,
            fontSize: "0.85rem",
            marginBottom: "1.5rem",
          }}
        >
          שער חדש באתר בני ציון
        </div>

        <h1
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: "clamp(2.4rem, 6vw, 4rem)",
            lineHeight: 1.12,
            margin: "0 0 1.1rem",
            color: "#fff",
          }}
        >
          תנ״ך למשפחה
        </h1>

        <p
          style={{
            fontFamily: fonts.body,
            fontSize: "clamp(1.05rem, 2.2vw, 1.3rem)",
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.85)",
            maxWidth: 620,
            margin: "0 auto",
          }}
        >
          כמה דקות ביום, וכל בית הופך לבית תנ״ך. מגיל הגן ועד סבא וסבתא — מקום אחד
          שמביא את התנ״ך הביתה, כל יום מחדש.
        </p>
      </div>
    </section>
  );
}

function LobbyCardTile({ card, onClick }: { card: LobbyCard; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={card.disabled}
      aria-label={`${card.title} — ${card.desc}`}
      className="family-tanach-card"
      style={{
        position: "relative",
        display: "block",
        width: "100%",
        textAlign: "start",
        cursor: card.disabled ? "default" : "pointer",
        opacity: card.disabled ? 0.55 : 1,
        border: `1px solid rgba(139,111,71,0.18)`,
        borderRadius: "1rem",
        overflow: "hidden",
        background: "#fff",
        boxShadow: shadows.cardSoft,
        padding: 0,
        font: "inherit",
        color: "inherit",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "16 / 10", overflow: "hidden" }}>
        <img
          src={card.image}
          alt=""
          aria-hidden
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(45,31,14,0.05) 0%, rgba(45,31,14,0.55) 100%)",
          }}
        />
        {card.badge && (
          <span
            style={{
              position: "absolute",
              top: 12,
              insetInlineStart: 12,
              background: "rgba(45,31,14,0.75)",
              color: colors.goldShimmer,
              fontFamily: fonts.body,
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "0.3rem 0.7rem",
              borderRadius: 999,
              letterSpacing: "0.01em",
            }}
          >
            {card.badge}
          </span>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            insetInlineStart: 0,
            insetInlineEnd: 0,
            padding: "1rem 1.1rem",
          }}
        >
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: "1.25rem",
              color: "#fff",
              textShadow: "0 1px 3px rgba(0,0,0,0.4)",
            }}
          >
            {card.title}
          </div>
        </div>
      </div>

      <div style={{ padding: "1rem 1.1rem 1.3rem" }}>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: "0.92rem",
            lineHeight: 1.6,
            color: colors.textMuted,
            margin: 0,
          }}
        >
          {card.desc}
        </p>
        {!card.disabled && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              marginTop: "0.85rem",
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: "0.88rem",
              color: colors.goldDark,
            }}
          >
            להיכנס
            <span aria-hidden style={{ fontSize: "1rem" }}>
              ←
            </span>
          </span>
        )}
      </div>
    </button>
  );
}

export default function FamilyTanach() {
  useSEO({
    title: "תנ״ך למשפחה",
    description:
      "לימוד תנ״ך יומי ומשפחתי — פרשת השבוע, הפרק השבועי, פסוק יומי, וידאו יומי, דור הפלאות וחידות לשולחן השבת. מקום אחד לכל המשפחה.",
  });

  const navigate = useNavigate();
  const { data: riddlesSeries } = useRiddlesSeries();

  const cards: LobbyCard[] = BASE_CARDS.map((c) => {
    if (c.id !== "riddles") return c;
    const count = riddlesSeries?.lesson_count;
    return {
      ...c,
      desc: count
        ? `${count} חידות תנ״ך לילדים, מוכן להדפסה ולשולחן השבת`
        : c.desc,
    };
  });

  return (
    <Layout>
      <FamilyTanachHero />

      <section
        dir="rtl"
        style={{
          background: colors.parchment,
          padding: "3.5rem 1.5rem 5rem",
        }}
      >
        <div style={{ maxWidth: 1140, margin: "-4rem auto 0" }}>
          <style>{`
            .family-tanach-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1.5rem;
            }
            @media (max-width: 960px) {
              .family-tanach-grid { grid-template-columns: repeat(2, 1fr); }
            }
            @media (max-width: 600px) {
              .family-tanach-grid { grid-template-columns: 1fr; }
            }
            .family-tanach-card:hover:not(:disabled) {
              transform: translateY(-4px);
              box-shadow: 0 16px 48px rgba(45,31,14,0.14);
            }
            .family-tanach-card {
              transition: transform 0.25s ease, box-shadow 0.25s ease;
            }
            .family-tanach-card:focus-visible {
              outline: 3px solid ${colors.goldLight};
              outline-offset: 2px;
            }
          `}</style>

          <div className="family-tanach-grid">
            {cards.map((card) => (
              <LobbyCardTile
                key={card.id}
                card={card}
                onClick={() => !card.disabled && navigate(card.href)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA — ties back to the main subscription program */}
      <section
        dir="rtl"
        style={{
          background: colors.parchmentDark,
          borderTop: `1px solid rgba(139,111,71,0.15)`,
          padding: "3.5rem 1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
              color: colors.textDark,
              margin: "0 0 0.75rem",
            }}
          >
            רוצים ללמוד יחד כל השנה?
          </h2>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "1rem",
              lineHeight: 1.7,
              color: colors.textMuted,
              margin: "0 0 1.75rem",
            }}
          >
            הצטרפו לתוכנית הפרק השבועי עם הרב יואב אוריאל, ולמדו תנ״ך יחד עם אלפי
            משפחות בכל רחבי הארץ.
          </p>
          <button
            type="button"
            onClick={() => navigate("/chapter-weekly")}
            style={{
              background: gradients.goldButton,
              color: "#fff",
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: "1rem",
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.9rem 2.2rem",
              cursor: "pointer",
              boxShadow: shadows.goldGlowSoft,
            }}
          >
            להצטרפות לתוכנית הפרק השבועי
          </button>
        </div>
      </section>
    </Layout>
  );
}
