/**
 * DesignPreviewYehoshuaCampaign — Sandbox
 * Route: /design-yehoshua-campaign
 *
 * V2 complete rebuild 2026-05-26.
 * V3 inline checkout 2026-06-01:
 * - Replaced window.location.href redirect to /donate with InlineCheckoutModal
 * - Grow SDK loads on page-load (not on click) to eliminate the "טוען..." delay
 * - Fallback: if SDK not ready after 5s, falls back to /donate redirect
 * - All DB fields (product, source, tier_id) forwarded identically to Donate.tsx
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGrowPayment } from "@/hooks/useGrowPayment";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTierCounts } from "@/hooks/useTierCounts";
import { X, Loader2, ShieldCheck, CheckCircle2, CreditCard } from "lucide-react";

/* ─── Campaign constants ────────────────────────────────── */
const GOAL = 80_000;

/* ─── Realtime donations hook ───────────────────────────── */
// Reads from the SECURITY DEFINER view yehoshua_campaign_stats.
// anon gets only aggregates (supporters, raised) — no donor PII.
// Realtime subscription stays on "donations" table so any new
// completed payment triggers an immediate refetch of the view.
function useCampaignStats() {
  const [raised, setRaised] = useState<number>(0);
  const [supporters, setSupporters] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    const { data, error } = await supabase
      .from("yehoshua_campaign_stats")
      .select("*")
      .single();
    if (!error && data) {
      const row = data as { raised: number; supporters: number };
      setRaised(Number(row.raised) || 0);
      setSupporters(Number(row.supporters) || 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchStats();

    // Realtime subscription on donations (view doesn't support realtime directly).
    // Any INSERT/UPDATE/DELETE on donations triggers refetch of the view.
    const channel = supabase
      .channel("yehoshua-campaign-stats")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "donations",
          filter: "product=eq.yehoshua-campaign",
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { raised, supporters, loading };
}

/* ─── Tier definition ───────────────────────────────────── */
interface Tier {
  id: string;
  price: number;
  name: string;
  headline: string;
  badge?: string;
  limit: number;
  remaining: number;
  highlight?: boolean;
  perks: string[];
  note?: string;
  image: string;
  imageAlt: string;
  imageBadge?: string;
}

const TIERS: Tier[] = [
  {
    id: "tier-90",
    price: 90,
    name: "מחיר מיוחד — 200 ראשונים",
    headline: "ספר יהושע פיזי עד הבית",
    badge: "200 הראשונים",
    limit: 200,
    remaining: 153,
    highlight: true,
    perks: ["ספר יהושע פיזי", "משלוח עד הבית"],
    image: "/images/yoav-campaign/book-mockup-tank.jpg",
    imageAlt: "ספר יהושע על רקע שטח",
  },
  {
    id: "tier-120",
    price: 120,
    name: "ספר + הקדשה",
    headline: "ספר פיזי + הקדשה אישית מהרב יואב",
    limit: 300,
    remaining: 287,
    perks: ["ספר יהושע פיזי", "הקדשה אישית מהרב יואב", "משלוח"],
    image: "/images/yoav-campaign/book-mockup-dirt.jpg",
    imageAlt: "ספר יהושע על האדמה",
  },
  {
    id: "tier-220",
    price: 220,
    name: "הזוג",
    headline: "שני ספרים פיזיים עד הבית",
    limit: 150,
    remaining: 143,
    perks: ["2 ספרי יהושע", "משלוח"],
    image: "/images/yoav-campaign/book-mockup-tank.jpg",
    imageAlt: "שני ספרי יהושע",
    imageBadge: "×2",
  },
  {
    id: "tier-400",
    price: 400,
    name: "הסט המלא",
    headline: "חמש מגילות + יהושע + שופטים",
    limit: 100,
    remaining: 97,
    perks: ["סט מלא של בני ציון", "ספר יהושע", "פירוש על שופטים", "משלוח"],
    image: "/images/yoav-campaign/set-five-megillot.png",
    imageAlt: "סט חמש מגילות של בני ציון",
  },
  {
    id: "tier-800",
    price: 800,
    name: "השותף",
    headline: "שני סטים מלאים",
    limit: 50,
    remaining: 48,
    perks: ["2× סטים מלאים", "הקדשה אישית", "משלוח"],
    image: "/images/yoav-campaign/set-five-megillot.png",
    imageAlt: "2 סטים",
    imageBadge: "×2",
  },
  {
    id: "tier-1200",
    price: 1200,
    name: "השותף הבכיר",
    headline: "שלושה סטים מלאים",
    limit: 30,
    remaining: 29,
    perks: ["3× סטים מלאים", "הקדשה אישית", "משלוח"],
    image: "/images/yoav-campaign/set-five-megillot.png",
    imageAlt: "3 סטים",
    imageBadge: "×3",
  },
  {
    id: "tier-2000",
    price: 2000,
    name: "שיעור בקהילה",
    headline: "שיעור פיזי של הרב יואב אצלכם",
    note: "שיעור בלבד — בלי ספר",
    limit: 10,
    remaining: 9,
    perks: ["שיעור פיזי בקהילה / בית כנסת"],
    image: "/images/yoav-campaign/yoav-writing-on-tank.jpg",
    imageAlt: "הרב יואב במילואים",
  },
];

/**
 * Max installments the donor may split the payment into, per Saar's spec:
 *   ₪90 / ₪120 / ₪220 (the book tiers) → single payment only
 *   ₪400 and up (sets / partnership / lesson) → up to 5 payments
 * The Grow wallet shows a "מס׳ תשלומים" dropdown capped at this number.
 * Server (create-payment.ts) still clamps to payment_products.max_installments.
 */
const maxInstallmentsFor = (price: number): number => (price <= 220 ? 1 : 5);

const CAMPAIGN_PHASES = [
  { label: "בניית הקמפיין", sub: 'אייר תשפ"ו', done: true },
  { label: "השקה", sub: 'סיון תשפ"ו', done: false, current: true },
  { label: "יעד ראשון — ₪40K", sub: 'תמוז תשפ"ו', done: false },
  { label: "יעד מלא — ₪80K", sub: 'אב תשפ"ו', done: false },
  { label: "הוצאה לאור", sub: 'אלול תשפ"ו', done: false },
  { label: "הספר אצלכם", sub: 'תשרי תשפ"ז', done: false },
];

const FAQ_ITEMS = [
  {
    q: "מתי הספר יגיע?",
    a: 'הספר צפוי להגיע עד החגים — תשרי תשפ"ז.',
  },
  {
    q: "מה כולל הסט המלא?",
    a: "הסט המלא כולל פירוש על חמש מגילות ועל יהושע ושופטים — ספרים שהרב יואב כתב לאורך השנים.",
  },
  {
    q: "האם ניתן להקדיש את הספר לאדם אהוב?",
    a: 'כן. במסלול «ספר + הקדשה» (₪120) ומעלה הרב יואב כותב הקדשה אישית — להנצחה, לסבא, לרב, לחייל. ציינו את שם הנמען בהערת ההזמנה.',
  },
  {
    q: "מה אם אני לא יכול לתמוך עכשיו?",
    a: "אפשר להצטרף לכל אורך הקמפיין. כל תמיכה — גדולה או קטנה — עוזרת להוציא את הספר לאור.",
  },
];

/* ─── Helpers ───────────────────────────────────────────── */
function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const h = () => setY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return y;
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Sub-components ────────────────────────────────────── */

interface StatsProps { raised: number; supporters: number; progressPct: number; }

function StickyNav({ scrolled, onSupportClick, progressPct }: { scrolled: boolean; onSupportClick: () => void; progressPct: number }) {
  return (
    <div
      style={{
        position: "fixed",
        insetBlockStart: 0,
        insetInlineStart: 0,
        insetInlineEnd: 0,
        zIndex: 60,
        background: scrolled ? "hsl(215 55% 14% / 0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBlockEnd: scrolled ? "1px solid hsl(38 75% 55% / 0.18)" : "none",
        transition: "background 0.3s ease, border 0.3s ease",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: scrolled ? "10px 20px" : "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          transition: "padding 0.3s ease",
        }}
      >
        {/* Logo + back */}
        <a
          href="https://bneyzion.co.il"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: scrolled ? "hsl(38 85% 72%)" : "hsl(215 10% 78%)",
            fontSize: 13,
            fontWeight: 600,
            transition: "color 0.3s",
          }}
        >
          <span style={{ fontSize: 16 }}>←</span>
          <span>בני ציון</span>
        </a>

        {/* Center — only when scrolled */}
        {scrolled && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>
              ספר יהושע
            </span>
            <div
              style={{
                width: 90,
                height: 4,
                background: "hsl(215 20% 32%)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, hsl(43 85% 62%), hsl(38 75% 48%))",
                  borderRadius: 4,
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: "hsl(38 85% 68%)", fontWeight: 700 }}>
              {progressPct}%
            </span>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onSupportClick}
          style={{
            background: "linear-gradient(135deg, hsl(43 85% 62%), hsl(38 75% 48%))",
            color: "hsl(215 55% 13%)",
            border: "none",
            borderRadius: 99,
            padding: scrolled ? "7px 18px" : "9px 20px",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            letterSpacing: "0.01em",
            transition: "padding 0.3s, transform 0.15s",
          }}
          onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1.03)")}
          onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1)")}
        >
          לתמיכה בספר ↓
        </button>
      </div>
    </div>
  );
}

function HeroSection({ onSupportClick, raised, supporters, progressPct }: { onSupportClick: () => void } & StatsProps) {
  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        overflow: "hidden",
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "hsl(215 55% 10%)",
        }}
      >
        <img
          src="/images/yoav-campaign/yoav-writing-on-tank.jpg"
          alt="הרב יואב אוריאל כותב ספר על הטנק, מהמילואים בגבול סוריה"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 25%",
            opacity: 0.48,
          }}
        />
        {/* Gradient overlay — bottom heavy */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, hsl(215 55% 12% / 0.2) 0%, hsl(215 55% 12% / 0.55) 40%, hsl(215 55% 12% / 0.95) 100%)",
          }}
        />
        {/* Gold glow top-right */}
        <div
          style={{
            position: "absolute",
            insetBlockStart: 0,
            insetInlineEnd: "5%",
            width: 500,
            height: 500,
            background: "hsl(38 75% 55% / 0.06)",
            borderRadius: "50%",
            filter: "blur(120px)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Hero content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1100,
          margin: "0 auto",
          padding: "80px 24px 56px",
          width: "100%",
        }}
      >
        {/* Eyebrow */}
        <div
          className="hero-fade-1"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 14px",
            borderRadius: 99,
            background: "hsl(38 75% 55% / 0.14)",
            border: "1px solid hsl(38 75% 55% / 0.32)",
            marginBlockEnd: 22,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              background: "hsl(38 75% 62%)",
              borderRadius: "50%",
              animation: "pulse-dot 2s ease-in-out infinite",
            }}
          />
          <span style={{ color: "hsl(38 85% 74%)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" }}>
            קמפיין תמיכה · השקה סיון תשפ"ו
          </span>
        </div>

        {/* H1 */}
        <h1
          className="hero-fade-2"
          style={{ margin: "0 0 20px", lineHeight: 1 }}
        >
          <span
            style={{
              display: "block",
              fontSize: "clamp(14px, 1.6vw, 18px)",
              fontWeight: 500,
              color: "hsl(215 10% 70%)",
              letterSpacing: "0.1em",
              marginBlockEnd: 8,
            }}
          >
            ספר חדש של הרב יואב אוריאל
          </span>
          <span
            style={{
              display: "block",
              fontSize: "clamp(52px, 8vw, 96px)",
              fontWeight: 900,
              background: "linear-gradient(135deg, hsl(43 90% 72%) 0%, hsl(38 75% 52%) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.03em",
              lineHeight: 0.92,
            }}
          >
            ספר יהושע
          </span>
        </h1>

        {/* Sub-headline */}
        <p
          className="hero-fade-3"
          style={{
            fontSize: "clamp(17px, 2.2vw, 22px)",
            color: "hsl(215 10% 82%)",
            lineHeight: 1.5,
            maxWidth: 580,
            margin: "0 0 10px",
            fontWeight: 500,
          }}
        >
          480 עמודים. נכתבו פרק אחר פרק —
        </p>
        <p
          className="hero-fade-3"
          style={{
            fontSize: "clamp(17px, 2.2vw, 22px)",
            color: "white",
            lineHeight: 1.5,
            maxWidth: 580,
            margin: "0 0 32px",
            fontWeight: 700,
          }}
        >
          בעוד הרב יואב עצמו בסבב מילואים, בגבול סוריה.
        </p>

        {/* Pull-quote — anchor */}
        <blockquote
          className="hero-fade-4"
          style={{
            margin: "0 0 36px",
            borderInlineEnd: "4px solid hsl(38 75% 55%)",
            paddingInlineEnd: 20,
            maxWidth: 520,
          }}
        >
          <p
            style={{
              fontStyle: "italic",
              fontSize: "clamp(18px, 2vw, 22px)",
              fontWeight: 700,
              color: "hsl(38 85% 74%)",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            «ספר על כיבוש הארץ — נכתב תוך כדי כיבוש הארץ.»
          </p>
          <cite
            style={{
              display: "block",
              fontStyle: "normal",
              fontSize: 13,
              color: "hsl(215 10% 55%)",
              marginBlockStart: 8,
            }}
          >
            — הרב יואב אוריאל
          </cite>
        </blockquote>

        {/* Progress + CTA row */}
        <div
          className="hero-fade-5"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          {/* Progress compact */}
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBlockEnd: 8,
                gap: 8,
              }}
            >
              <span style={{ color: "hsl(38 85% 70%)", fontWeight: 900, fontSize: 22 }}>
                ₪{raised.toLocaleString()}
              </span>
              <span style={{ color: "hsl(215 10% 48%)", fontSize: 13 }}>
                מתוך ₪{GOAL.toLocaleString()}
              </span>
              <span style={{ color: "hsl(38 85% 68%)", fontWeight: 700, fontSize: 13 }}>
                {supporters} תומכים
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "hsl(215 20% 28%)",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, hsl(43 85% 62%), hsl(38 75% 48%))",
                  borderRadius: 6,
                  transition: "width 1.4s ease-out",
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: "hsl(215 10% 40%)", marginBlockStart: 4 }}>
              {progressPct}% מהיעד · הקמפיין בעיצומו
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={onSupportClick}
            className="cta-glow"
            style={{
              padding: "14px 34px",
              background: "linear-gradient(135deg, hsl(43 85% 62%), hsl(38 75% 48%))",
              color: "hsl(215 55% 12%)",
              border: "none",
              borderRadius: 99,
              fontWeight: 900,
              fontSize: 17,
              cursor: "pointer",
              letterSpacing: "0.01em",
              flexShrink: 0,
            }}
          >
            תמכו בהוצאת הספר ↓
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        style={{
          position: "absolute",
          insetBlockEnd: 24,
          insetInlineStart: "50%",
          transform: "translateX(50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          opacity: 0.45,
          animation: "bounce-down 2.4s ease-in-out infinite",
        }}
      >
        <div style={{ width: 24, height: 36, border: "1.5px solid hsl(215 10% 50%)", borderRadius: 12, position: "relative" }}>
          <div
            style={{
              width: 4,
              height: 8,
              background: "hsl(215 10% 60%)",
              borderRadius: 2,
              position: "absolute",
              top: 5,
              left: "50%",
              transform: "translateX(-50%)",
              animation: "scroll-dot 2.4s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </section>
  );
}

function ProofStrip({ supporters }: { supporters: number }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      style={{
        background: "hsl(215 55% 14%)",
        borderBlockEnd: "1px solid hsl(38 75% 55% / 0.12)",
        padding: "28px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 0,
        }}
      >
        {[
          { val: "15+", label: "שנות הוראת תנ\"ך", icon: "📖" },
          { val: "300+", label: "לומדים פעילים", icon: "👥" },
          { val: "480", label: "עמודים בספר", icon: "📝" },
          { val: String(supporters), label: "תומכים כבר הצטרפו", icon: "🙌" },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              textAlign: "center",
              padding: "16px 12px",
              borderInlineEnd: i < 3 ? "1px solid hsl(215 20% 25%)" : "none",
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(12px)",
              transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`,
            }}
          >
            <div style={{ fontSize: 28, marginBlockEnd: 4 }}>{s.icon}</div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: "hsl(38 85% 68%)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {s.val}
            </div>
            <div style={{ fontSize: 12, color: "hsl(215 10% 52%)", marginBlockStart: 4 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TierCard({ tier, sold, onSupport }: { tier: Tier; sold: number; onSupport: (t: Tier) => void }) {
  // remaining is computed from live DB data (sold) — ignores static tier.remaining
  const remaining = Math.max(0, tier.limit - sold);
  const isSoldOut = remaining === 0;
  const remainingPct = Math.round((remaining / tier.limit) * 100);
  const almostGone = remainingPct <= 25 && !isSoldOut;

  return (
    <div
      style={{
        position: "relative",
        background: tier.highlight
          ? "linear-gradient(155deg, hsl(215 55% 18%) 0%, hsl(215 48% 24%) 100%)"
          : "white",
        border: tier.highlight
          ? "2px solid hsl(38 75% 55%)"
          : "1.5px solid hsl(215 15% 88%)",
        borderRadius: 18,
        padding: tier.highlight ? "32px 22px 24px" : "26px 20px 22px",
        color: tier.highlight ? "white" : "hsl(215 40% 12%)",
        boxShadow: tier.highlight
          ? "0 20px 48px -8px hsl(38 75% 50% / 0.3), 0 0 0 1px hsl(38 75% 55% / 0.35)"
          : "0 2px 12px hsl(215 15% 60% / 0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        opacity: isSoldOut ? 0.55 : 1,
        transform: tier.highlight ? "translateY(-6px)" : "none",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
      }}
      onMouseOver={(e) => {
        if (!isSoldOut) {
          (e.currentTarget as HTMLElement).style.transform =
            tier.highlight ? "translateY(-10px)" : "translateY(-4px)";
        }
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLElement).style.transform =
          tier.highlight ? "translateY(-6px)" : "none";
      }}
    >
      {/* Badge */}
      {tier.badge && !isSoldOut && (
        <div
          style={{
            position: "absolute",
            top: -14,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, hsl(43 85% 62%), hsl(38 75% 48%))",
            color: "hsl(215 55% 12%)",
            fontSize: 11,
            fontWeight: 800,
            padding: "4px 16px",
            borderRadius: 99,
            whiteSpace: "nowrap",
            letterSpacing: "0.05em",
            boxShadow: "0 4px 14px hsl(38 75% 50% / 0.35)",
          }}
        >
          ★ {tier.badge}
        </div>
      )}

      {isSoldOut && (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "hsl(215 15% 52%)",
            color: "white",
            fontSize: 11,
            fontWeight: 800,
            padding: "4px 14px",
            borderRadius: 99,
          }}
        >
          אזל
        </div>
      )}

      {/* Product image */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: 10,
          overflow: "hidden",
          background: tier.highlight ? "hsl(215 30% 22%)" : "hsl(38 25% 96%)",
        }}
      >
        <img
          src={tier.image}
          alt={tier.imageAlt}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {tier.imageBadge && (
          <div
            style={{
              position: "absolute",
              top: 10,
              insetInlineEnd: 10,
              background: "linear-gradient(135deg, hsl(43 85% 62%), hsl(38 75% 48%))",
              color: "hsl(215 55% 12%)",
              fontSize: 20,
              fontWeight: 900,
              padding: "4px 12px",
              borderRadius: 99,
              border: "2px solid white",
            }}
          >
            {tier.imageBadge}
          </div>
        )}
      </div>

      {/* Price row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
              lineHeight: 1,
              color: tier.highlight ? "hsl(38 85% 72%)" : "hsl(215 55% 22%)",
              letterSpacing: "-0.02em",
            }}
          >
            ₪{tier.price.toLocaleString()}
          </div>
          {tier.note && (
            <div style={{ fontSize: 11, color: tier.highlight ? "hsl(215 10% 60%)" : "hsl(215 20% 50%)", marginBlockStart: 3 }}>
              {tier.note}
            </div>
          )}
        </div>
        <div style={{ textAlign: "start", flex: 1 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: tier.highlight ? "white" : "hsl(215 55% 18%)",
              lineHeight: 1.25,
            }}
          >
            {tier.name}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: tier.highlight ? "hsl(38 85% 76%)" : "hsl(215 35% 38%)",
              marginBlockStart: 3,
            }}
          >
            {tier.headline}
          </div>
        </div>
      </div>

      {/* Perks */}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
        {tier.perks.map((item, i) => (
          <li key={i} style={{ fontSize: 14, display: "flex", alignItems: "flex-start", gap: 7, color: tier.highlight ? "hsl(215 10% 86%)" : "hsl(215 30% 28%)" }}>
            <span style={{ color: "hsl(38 75% 55%)", fontWeight: 700, flexShrink: 0, marginBlockStart: 1 }}>✓</span>
            {item}
          </li>
        ))}
      </ul>

      {/* Remaining */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: almostGone ? "hsl(20 85% 55%)" : tier.highlight ? "hsl(38 85% 66%)" : "hsl(38 65% 42%)",
          background: almostGone ? "hsl(20 85% 55% / 0.1)" : "hsl(38 75% 55% / 0.08)",
          borderRadius: 8,
          padding: "5px 10px",
          textAlign: "center",
        }}
      >
        {isSoldOut
          ? "אזל — אין יותר מקומות"
          : almostGone
          ? `⚡ נשארו רק ${remaining} מתוך ${tier.limit}`
          : `נשארו ${remaining} מתוך ${tier.limit}`}
      </div>

      {/* CTA */}
      {isSoldOut ? (
        <div style={{ display: "block", textAlign: "center", padding: "11px 0", borderRadius: 10, fontWeight: 700, fontSize: 14, background: "hsl(215 15% 78%)", color: "hsl(215 20% 44%)", cursor: "not-allowed" }}>
          אזל
        </div>
      ) : (
        <button
          onClick={() => onSupport(tier)}
          style={{
            display: "block",
            width: "100%",
            padding: "12px 0",
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 15,
            border: "none",
            cursor: "pointer",
            background: tier.highlight
              ? "linear-gradient(135deg, hsl(43 85% 62%), hsl(38 75% 48%))"
              : "hsl(215 55% 24%)",
            color: tier.highlight ? "hsl(215 55% 12%)" : "white",
            letterSpacing: "0.01em",
            transition: "opacity 0.15s",
          }}
          onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.87")}
          onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
        >
          אני תומך
        </button>
      )}
    </div>
  );
}

function TiersSection({ onSupport }: { onSupport: (t: Tier) => void }) {
  const tierCounts = useTierCounts(); // live sold counts per tier_id
  const [customAmount, setCustomAmount] = useState("");

  function submitCustom() {
    const num = parseInt(customAmount, 10);
    if (!num || num < 18) return;
    onSupport({ id: "tier-custom", price: num, name: "סכום חופשי", headline: `תרומה של ₪${num}`, limit: 9999, remaining: 9999, perks: ["תמיכה בהוצאת הספר לאור"], image: "/images/yoav-campaign/book-mockup-tank.jpg", imageAlt: "" });
  }

  return (
    <section id="tiers" style={{ background: "hsl(38 30% 96%)", padding: "72px 24px 80px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBlockEnd: 48 }}>
          <p style={{ color: "hsl(38 75% 40%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", marginBlockEnd: 8 }}>
            חבילות תמיכה
          </p>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 900, color: "hsl(215 55% 20%)", margin: "0 0 10px", lineHeight: 1.2 }}>
            בחרו את רמת התמיכה שלכם
          </h2>
          <p style={{ color: "hsl(215 25% 40%)", fontSize: 15, maxWidth: 480, margin: "0 auto" }}>
            מחיר מיוחד ל-200 הראשונים. לאחר מכן המחיר יעלה.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(225px, 1fr))",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          {TIERS.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              sold={tierCounts[tier.id] ?? 0}
              onSupport={onSupport}
            />
          ))}
        </div>

        {/* Custom amount */}
        <div
          style={{
            marginBlockStart: 32,
            background: "linear-gradient(135deg, hsl(38 55% 97%) 0%, hsl(38 65% 93%) 100%)",
            border: "2px dashed hsl(38 75% 55%)",
            borderRadius: 18,
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            textAlign: "center",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 4px", color: "hsl(215 55% 20%)", fontSize: "clamp(18px, 2.2vw, 24px)", fontWeight: 900 }}>
              רוצים לתמוך בסכום אחר?
            </h3>
            <p style={{ margin: 0, color: "hsl(215 30% 36%)", fontSize: 14 }}>
              כל תרומה — גדולה או קטנה — עוזרת להוציא את הספר לאור.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "stretch", gap: 10, width: "100%", maxWidth: 440, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px", position: "relative", display: "flex", alignItems: "center", background: "white", border: "1.5px solid hsl(38 50% 78%)", borderRadius: 12, padding: "0 14px", minWidth: 0 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "hsl(38 75% 42%)", marginInlineEnd: 6 }}>₪</span>
              <input
                type="number"
                inputMode="numeric"
                min={18}
                step={1}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="הקלידו סכום"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 18, fontWeight: 700, color: "hsl(215 55% 20%)", background: "transparent", padding: "14px 0", textAlign: "start", fontFamily: "inherit", width: "100%", minWidth: 0 }}
              />
            </div>
            <button
              onClick={submitCustom}
              disabled={!parseInt(customAmount, 10) || parseInt(customAmount, 10) < 18}
              style={{
                flex: "1 1 160px",
                padding: "0 20px",
                borderRadius: 12,
                border: "none",
                background: parseInt(customAmount, 10) >= 18
                  ? "linear-gradient(135deg, hsl(38 75% 55%), hsl(38 75% 44%))"
                  : "hsl(215 15% 73%)",
                color: "white",
                fontSize: 15,
                fontWeight: 800,
                cursor: parseInt(customAmount, 10) >= 18 ? "pointer" : "not-allowed",
                minHeight: 50,
              }}
            >
              תמכו ←
            </button>
          </div>
          <p style={{ margin: 0, color: "hsl(215 20% 50%)", fontSize: 12 }}>סכום מינימלי ₪18</p>
        </div>
      </div>
    </section>
  );
}

function StorySection() {
  const { ref, visible } = useInView(0.1);
  return (
    <section
      ref={ref}
      style={{ background: "hsl(215 15% 96%)", padding: "80px 24px" }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "5fr 4fr",
          gap: 56,
          alignItems: "center",
        }}
        className="story-grid"
      >
        {/* Text */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateX(24px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <p style={{ color: "hsl(38 75% 40%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", marginBlockEnd: 12 }}>
            הסיפור
          </p>
          <h2
            style={{
              fontSize: "clamp(26px, 3.8vw, 44px)",
              fontWeight: 900,
              color: "hsl(215 55% 20%)",
              lineHeight: 1.15,
              marginBlockEnd: 28,
              margin: "0 0 28px",
            }}
          >
            ספר על כיבוש הארץ —{" "}
            <span style={{ color: "hsl(38 75% 40%)" }}>
              נכתב תוך כדי כיבוש הארץ.
            </span>
          </h2>

          <div style={{ fontSize: 16, lineHeight: 1.8, color: "hsl(215 35% 18%)", display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ margin: 0 }}>
              הרב יואב מלמד תנ"ך כבר 15 שנה. בשנתיים האחרונות — תוך כדי
              המילואים ובין הסבבים — ישב וכתב ספר על יהושע. פירוש שמסתכל
              על ספר יהושע מהמקום שהרב יואב נמצא בו.
            </p>
            <p style={{ margin: 0 }}>
              לא פירוש אקדמי. לא ספר היסטוריה.{" "}
              <strong>
                פירוש על ספר יהושע במבט גאולי, כלל תנ"כי — שמחבר את
                הנבואה למלחמה של ימינו.
              </strong>
            </p>
            <p style={{ margin: 0 }}>
              הספר נוגע לכל אחד ואחת, גם בלי רקע בתנ"ך — ועוזר להבין
              את הגודל של הרגע שאנחנו חיים בו.
            </p>
          </div>

          {/* Divider quote */}
          <div
            style={{
              marginBlockStart: 28,
              paddingBlockStart: 24,
              borderBlockStart: "1px solid hsl(215 15% 84%)",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ width: 4, height: 52, background: "linear-gradient(to bottom, hsl(43 85% 62%), hsl(38 75% 48%))", borderRadius: 2, flexShrink: 0 }} />
            <p style={{ margin: 0, fontStyle: "italic", fontSize: 17, fontWeight: 700, color: "hsl(215 50% 22%)" }}>
              «הספר יצא לאור. הצטרפו לקמפיין ותמכו בהוצאתו לציבור.»
            </p>
          </div>
        </div>

        {/* Image */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateX(-24px)",
            transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s",
          }}
        >
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              border: "2px solid hsl(38 50% 83%)",
              boxShadow: "0 12px 40px hsl(38 50% 50% / 0.12)",
              position: "relative",
            }}
          >
            <img
              src="/images/yoav-campaign/yoav-with-shoftim-book.jpg"
              alt="הרב יואב אוריאל אוחז בספר שופטים, מהמילואים בגבול סוריה"
              style={{ width: "100%", display: "block" }}
            />
            {/* Caption */}
            <div
              style={{
                position: "absolute",
                insetBlockEnd: 0,
                insetInlineStart: 0,
                insetInlineEnd: 0,
                background: "linear-gradient(to top, hsl(215 55% 14% / 0.9), transparent)",
                padding: "20px 16px 14px",
              }}
            >
              <p style={{ color: "hsl(38 85% 72%)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", margin: "0 0 3px" }}>
                מהמילואים בגבול סוריה
              </p>
              <p style={{ color: "white", fontWeight: 800, fontSize: 16, margin: 0 }}>
                הרב יואב אוריאל
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhySection() {
  const { ref, visible } = useInView(0.1);
  const cards = [
    {
      num: "01",
      title: "פירוש שלם — 24 פרקים",
      body: `480 עמודים. כל פרק נפתח לעומק — לא הערות, לא קיצורים. ספר שפותח חלון חדש ללמוד תנ"ך, כמו שהרב יואב מדבר בשיעורי «לחיות תנ"ך».`,
      accent: "hsl(215 55% 22%)",
    },
    {
      num: "02",
      title: "רגע ההיסטוריה שלנו",
      body: "כיבוש הארץ, אחריות עם, גבול. שאלות שיהושע הפעיל לפני 3,300 שנה — ושאנחנו מפעילים שוב היום. הספר עוזר להבין את הגודל של הרגע.",
      accent: "hsl(38 75% 40%)",
    },
    {
      num: "03",
      title: "לא רק לבני ישיבות — לכולם",
      body: "ספר שאפשר לקרוא בסלון עם הילדים, ולהביא לשיעור בכיתה. לכל מי שרוצה להבין מה קורה פה ולמה ספר יהושע הוא הסיפור שלנו.",
      accent: "hsl(215 40% 35%)",
    },
  ];

  return (
    <section ref={ref} style={{ background: "white", padding: "80px 24px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBlockEnd: 48 }}>
          <p style={{ color: "hsl(38 75% 40%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", marginBlockEnd: 8 }}>
            למה הספר הזה
          </p>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 900, color: "hsl(215 55% 20%)", margin: 0, lineHeight: 1.2 }}>
            לא עוד ספר על יהושע.{" "}
            <span style={{ color: "hsl(38 75% 40%)" }}>הספר שצריך עכשיו.</span>
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 }}>
          {cards.map((card, i) => (
            <div
              key={card.num}
              style={{
                background: "linear-gradient(180deg, hsl(38 45% 97%) 0%, hsl(38 38% 94%) 100%)",
                border: "1.5px solid hsl(38 50% 86%)",
                borderRadius: 20,
                padding: "32px 24px",
                opacity: visible ? 1 : 0,
                transform: visible ? "none" : "translateY(20px)",
                transition: `opacity 0.6s ease ${i * 0.12}s, transform 0.6s ease ${i * 0.12}s`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBlockEnd: 18 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: "linear-gradient(135deg, hsl(43 85% 62%), hsl(38 75% 48%))",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: 16,
                    color: "hsl(215 55% 12%)",
                    flexShrink: 0,
                  }}
                >
                  {card.num}
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "hsl(215 55% 20%)", lineHeight: 1.3 }}>
                  {card.title}
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "hsl(215 30% 30%)", lineHeight: 1.7 }}>
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AuthorSection() {
  const { ref, visible } = useInView(0.1);
  return (
    <section ref={ref} style={{ background: "hsl(215 55% 14%)", padding: "80px 24px" }}>
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "2fr 3fr",
          gap: 48,
          alignItems: "center",
        }}
        className="author-grid"
      >
        {/* Image */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateX(20px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              border: "2px solid hsl(38 75% 55% / 0.3)",
              boxShadow: "0 16px 48px hsl(215 55% 8% / 0.5)",
            }}
          >
            <img
              src="/images/yoav-campaign/yoav-with-full-set.jpg"
              alt="הרב יואב אוריאל עם סט הספרים המלא של בני ציון"
              style={{ width: "100%", display: "block" }}
            />
          </div>
        </div>

        {/* Text */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateX(-20px)",
            transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s",
          }}
        >
          <p style={{ color: "hsl(38 85% 66%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", marginBlockEnd: 8 }}>
            מי כותב
          </p>
          <h2 style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 900, color: "white", marginBlockEnd: 20, margin: "0 0 20px" }}>
            הרב יואב אוריאל
          </h2>
          <div style={{ fontSize: 15, lineHeight: 1.8, color: "hsl(215 10% 75%)", display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0 }}>
              ראש תנועת בני ציון ללימוד תנ"ך.{" "}
              <strong style={{ color: "white" }}>מלמד תנ"ך כבר 15 שנה.</strong>{" "}
              בתכנית{" "}
              <strong style={{ color: "hsl(38 85% 68%)" }}>«לחיות תנ"ך»</strong>{" "}
              לומדים איתו יחד 300+ אנשים — סטודנטים, אברכים, רופאים, מורים,
              מהנדסי הייטק. גברים ונשים, מכל גווני הקשת.
            </p>
            <p style={{ margin: 0 }}>
              ערך וכתב את הספר במהלך המילואים — פרק אחר פרק, בין סבב לסבב.
              הספר יצא לאור.
            </p>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
              marginBlockStart: 28,
              paddingBlockStart: 24,
              borderBlockStart: "1px solid hsl(215 20% 24%)",
            }}
          >
            {[
              { val: "15+", label: "שנות הוראה" },
              { val: "300+", label: "לומדים פעילים" },
              { val: "480", label: "עמודים" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: "hsl(38 85% 68%)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                  {s.val}
                </div>
                <div style={{ fontSize: 12, color: "hsl(215 10% 48%)", marginBlockStart: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineSection() {
  const { ref, visible } = useInView(0.1);
  return (
    <section ref={ref} style={{ background: "hsl(38 30% 96%)", padding: "72px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBlockEnd: 44 }}>
          <p style={{ color: "hsl(38 75% 40%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", marginBlockEnd: 8 }}>
            ציר זמן
          </p>
          <h2 style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 900, color: "hsl(215 55% 20%)", margin: 0 }}>
            מה קורה מתי
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${CAMPAIGN_PHASES.length}, 1fr)`,
            gap: 4,
            position: "relative",
          }}
        >
          {/* connector */}
          <div
            style={{
              position: "absolute",
              insetBlockStart: 20,
              insetInlineEnd: "8%",
              insetInlineStart: "8%",
              height: 2,
              background: "hsl(215 15% 82%)",
              zIndex: 0,
            }}
          />

          {CAMPAIGN_PHASES.map((phase, i) => (
            <div
              key={i}
              style={{
                textAlign: "center",
                position: "relative",
                zIndex: 1,
                padding: "0 4px",
                opacity: visible ? 1 : 0,
                transform: visible ? "none" : "translateY(12px)",
                transition: `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s`,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: phase.done || phase.current ? "hsl(38 75% 55%)" : "white",
                  border: `2px solid ${phase.done || phase.current ? "hsl(38 75% 55%)" : "hsl(215 15% 78%)"}`,
                  margin: "0 auto 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  color: phase.done || phase.current ? "hsl(215 55% 13%)" : "hsl(215 15% 62%)",
                  fontWeight: 700,
                  boxShadow: phase.current ? "0 0 0 5px hsl(38 75% 55% / 0.18)" : "none",
                }}
              >
                {phase.done ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: 11, fontWeight: phase.current ? 800 : 600, color: phase.current ? "hsl(215 55% 20%)" : "hsl(215 30% 36%)", marginBlockEnd: 2, lineHeight: 1.3 }}>
                {phase.label}
              </div>
              <div style={{ fontSize: 10, color: "hsl(215 20% 50%)" }}>{phase.sub}</div>
              {phase.current && (
                <div style={{ marginBlockStart: 4, fontSize: 10, fontWeight: 700, color: "hsl(38 75% 42%)", background: "hsl(38 75% 55% / 0.1)", borderRadius: 99, padding: "1px 7px", display: "inline-block" }}>
                  אנחנו כאן
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section style={{ background: "white", padding: "72px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBlockEnd: 40 }}>
          <p style={{ color: "hsl(38 75% 40%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", marginBlockEnd: 8 }}>
            שאלות שאתם שואלים
          </p>
          <h2 style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 900, color: "hsl(215 55% 20%)", margin: 0 }}>
            כל מה שצריך לדעת
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              style={{
                background: open === i ? "hsl(38 40% 97%)" : "hsl(215 10% 98%)",
                border: `1.5px solid ${open === i ? "hsl(38 50% 82%)" : "hsl(215 15% 88%)"}`,
                borderRadius: 14,
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%",
                  padding: "17px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "right",
                  gap: 12,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 16, color: "hsl(215 55% 20%)", flex: 1, textAlign: "right" }}>
                  {item.q}
                </span>
                <span style={{ color: "hsl(38 75% 42%)", fontSize: 24, fontWeight: 300, flexShrink: 0, transform: open === i ? "rotate(45deg)" : "none", transition: "transform 0.2s", lineHeight: 1 }}>
                  +
                </span>
              </button>
              {open === i && (
                <div style={{ padding: "0 20px 18px", color: "hsl(215 30% 28%)", fontSize: 15, lineHeight: 1.75, borderBlockStart: "1px solid hsl(215 15% 90%)" }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onSupportClick, supporters, progressPct }: { onSupportClick: () => void; supporters: number; progressPct: number }) {
  const { ref, visible } = useInView(0.2);
  return (
    <section
      ref={ref}
      style={{
        background: "linear-gradient(155deg, hsl(215 55% 14%) 0%, hsl(215 50% 22%) 60%, hsl(215 42% 26%) 100%)",
        padding: "88px 24px 80px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative glows */}
      <div style={{ position: "absolute", top: -60, insetInlineEnd: "10%", width: 340, height: 340, background: "hsl(38 75% 55% / 0.07)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -40, insetInlineStart: "8%", width: 280, height: 280, background: "hsl(215 40% 40% / 0.12)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />

      <div
        style={{
          maxWidth: 620,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
          opacity: visible ? 1 : 0,
          transform: visible ? "none" : "translateY(24px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 16px",
            borderRadius: 99,
            background: "hsl(38 75% 55% / 0.12)",
            border: "1px solid hsl(38 75% 55% / 0.28)",
            marginBlockEnd: 24,
          }}
        >
          <span style={{ color: "hsl(38 85% 72%)", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }}>
            קמפיין תמיכה בעיצומו
          </span>
        </div>

        <h2
          style={{
            fontSize: "clamp(30px, 5vw, 54px)",
            fontWeight: 900,
            color: "white",
            lineHeight: 1.1,
            marginBlockEnd: 16,
            margin: "0 0 16px",
            letterSpacing: "-0.02em",
          }}
        >
          בכוח התנ"ך ננצח.
        </h2>
        <p
          style={{
            fontSize: 17,
            color: "hsl(215 10% 68%)",
            lineHeight: 1.7,
            marginBlockEnd: 36,
            maxWidth: 480,
            margin: "0 auto 36px",
          }}
        >
          כל תמיכה עוזרת להוציא את הספר לציבור.
          הספר יגיע אליכם עד החגים — תשרי תשפ"ז.
        </p>

        <button
          onClick={onSupportClick}
          className="cta-glow"
          style={{
            display: "inline-block",
            padding: "18px 44px",
            background: "linear-gradient(135deg, hsl(43 85% 62%), hsl(38 75% 48%))",
            color: "hsl(215 55% 12%)",
            border: "none",
            borderRadius: 99,
            fontWeight: 900,
            fontSize: 18,
            cursor: "pointer",
            letterSpacing: "0.01em",
          }}
        >
          לבחירת חבילת תמיכה ↑
        </button>

        <div style={{ marginBlockStart: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ width: 90, height: 3, background: "hsl(215 20% 28%)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: "hsl(38 75% 55%)", borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 13, color: "hsl(38 85% 64%)", fontWeight: 700 }}>
            {supporters} תומכים · {progressPct}% מהיעד
          </span>
        </div>
      </div>
    </section>
  );
}

function DonationToast({ tier, onClose }: { tier: Tier; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        insetBlockEnd: 88,
        insetInlineEnd: 20,
        zIndex: 100,
        background: "hsl(215 55% 17%)",
        border: "1.5px solid hsl(38 75% 55% / 0.45)",
        borderRadius: 16,
        padding: "16px 18px",
        maxWidth: 300,
        boxShadow: "0 12px 40px hsl(215 55% 10% / 0.5)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        animation: "slideInToast 0.35s ease-out both",
      }}
    >
      <div style={{ width: 36, height: 36, background: "hsl(38 75% 55% / 0.15)", border: "1px solid hsl(38 75% 55% / 0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 17 }}>
        ✓
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "white", marginBlockEnd: 3 }}>תודה על התמיכה!</div>
        <div style={{ fontSize: 13, color: "hsl(38 85% 70%)", fontWeight: 600, marginBlockEnd: 2 }}>{tier.name} — ₪{tier.price.toLocaleString()}</div>
        <div style={{ fontSize: 12, color: "hsl(215 10% 52%)" }}>הספר יגיע אליכם עד החגים.</div>
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "hsl(215 10% 48%)", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

function StickyMobileBar({ onSupportClick, progressPct }: { onSupportClick: () => void; progressPct: number }) {
  return (
    <div
      className="mobile-bar"
      style={{
        position: "fixed",
        insetBlockEnd: 0,
        insetInlineStart: 0,
        insetInlineEnd: 0,
        zIndex: 40,
        background: "hsl(215 55% 14% / 0.97)",
        backdropFilter: "blur(14px)",
        borderBlockStart: "1px solid hsl(38 75% 55% / 0.22)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "hsl(38 85% 68%)", fontWeight: 700, marginBlockEnd: 3 }}>
          קמפיין תמיכה · ספר יהושע
        </div>
        <div style={{ height: 4, background: "hsl(215 20% 30%)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: "hsl(38 75% 55%)", borderRadius: 4 }} />
        </div>
      </div>
      <button
        onClick={onSupportClick}
        style={{
          background: "linear-gradient(135deg, hsl(43 85% 62%), hsl(38 75% 48%))",
          color: "hsl(215 55% 13%)",
          border: "none",
          borderRadius: 99,
          padding: "10px 20px",
          fontWeight: 800,
          fontSize: 14,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        לתמיכה ↓
      </button>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function DesignPreviewYehoshuaCampaign() {
  const scrollY = useScrollY();
  const scrolled = scrollY > 80;
  const [toastTier, setToastTier] = useState<Tier | null>(null);
  const { raised, supporters } = useCampaignStats();
  const progressPct = Math.min(100, Math.round((raised / GOAL) * 100));

  // Inline checkout state
  const [checkoutTier, setCheckoutTier] = useState<Tier | null>(null);

  function handleSupport(tier: Tier) {
    // Open inline checkout modal instead of redirecting to /donate
    setCheckoutTier(tier);
  }

  function scrollToTiers() {
    const el = document.getElementById("tiers");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      dir="rtl"
      style={{
        fontFamily: "'Paamon', 'Heebo', sans-serif",
        background: "hsl(38 30% 96%)",
        color: "hsl(215 40% 12%)",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @font-face { font-family: 'Paamon'; src: url('https://bneyzion.vercel.app/fonts/paamon-bold-aaa.otf') format('opentype'); font-weight: 700; font-display: swap; }
        @font-face { font-family: 'Paamon'; src: url('https://bneyzion.vercel.app/fonts/paamon-regular-aaa.otf') format('opentype'); font-weight: 400; font-display: swap; }
        @font-face { font-family: 'Paamon'; src: url('https://bneyzion.vercel.app/fonts/paamon-black-aaa.otf') format('opentype'); font-weight: 900; font-display: swap; }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        a { color: inherit; }
        img { max-width: 100%; }

        /* Entrance animations */
        @keyframes fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInToast { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.6); } }
        @keyframes bounce-down { 0%, 100% { transform: translateX(50%) translateY(0); } 50% { transform: translateX(50%) translateY(6px); } }
        @keyframes scroll-dot { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(8px); } }
        @keyframes ctaGlow { 0% { box-shadow: 0 8px 24px hsl(38 75% 50% / 0.35), 0 0 0 0 hsl(38 75% 55% / 0.45); } 70% { box-shadow: 0 8px 24px hsl(38 75% 50% / 0.35), 0 0 0 16px hsl(38 75% 55% / 0); } 100% { box-shadow: 0 8px 24px hsl(38 75% 50% / 0.35), 0 0 0 0 hsl(38 75% 55% / 0); } }

        .hero-fade-1 { animation: fadeUp 0.7s ease-out 0.15s both; }
        .hero-fade-2 { animation: fadeUp 0.7s ease-out 0.28s both; }
        .hero-fade-3 { animation: fadeUp 0.7s ease-out 0.40s both; }
        .hero-fade-4 { animation: fadeUp 0.7s ease-out 0.52s both; }
        .hero-fade-5 { animation: fadeUp 0.7s ease-out 0.64s both; }

        .cta-glow { animation: ctaGlow 2.8s ease-out infinite; }
        .cta-glow:hover { animation: none; opacity: 0.9; }

        h2, h3 { letter-spacing: -0.02em; margin: 0; }

        /* Responsive */
        @media (max-width: 700px) {
          .story-grid, .author-grid { grid-template-columns: 1fr !important; }
          .story-grid > *:nth-child(2) { order: -1; }
          .mobile-bar { display: flex !important; }
          .desktop-cta-bar { display: none !important; }
        }
        @media (min-width: 701px) {
          .mobile-bar { display: none !important; }
        }
      `}</style>

      {/* Sticky nav */}
      <StickyNav scrolled={scrolled} onSupportClick={scrollToTiers} progressPct={progressPct} />

      {/* Mobile bottom bar */}
      <StickyMobileBar onSupportClick={scrollToTiers} progressPct={progressPct} />

      {/* Toast */}
      {toastTier && <DonationToast tier={toastTier} onClose={() => setToastTier(null)} />}

      {/* Inline checkout modal */}
      {checkoutTier && (
        <InlineCheckoutModal
          tier={checkoutTier}
          onClose={() => setCheckoutTier(null)}
        />
      )}

      {/* ── 1. HERO ── */}
      <HeroSection onSupportClick={scrollToTiers} raised={raised} supporters={supporters} progressPct={progressPct} />

      {/* ── 2. PROOF STRIP ── */}
      <ProofStrip supporters={supporters} />

      {/* ── 3. TIERS (early — Headstart convention) ── */}
      <TiersSection onSupport={handleSupport} />

      {/* ── 4. STORY ── */}
      <StorySection />

      {/* ── 5. WHY THIS BOOK ── */}
      <WhySection />

      {/* ── 6. ABOUT YOAV ── */}
      <AuthorSection />

      {/* ── 7. TIMELINE ── */}
      <TimelineSection />

      {/* ── 8. FAQ ── */}
      <FaqSection />

      {/* ── 9. FINAL CTA ── */}
      <FinalCTA onSupportClick={scrollToTiers} supporters={supporters} progressPct={progressPct} />

      {/* ── FOOTER ── */}
      <footer style={{ background: "hsl(215 55% 11%)", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ color: "white", fontWeight: 700, margin: "0 0 8px" }}>
          תנועת בני ציון ללימוד תנ"ך
        </p>
        <p style={{ fontSize: 13, color: "hsl(215 10% 48%)", margin: "0 0 14px" }}>
          <a href="mailto:office@bneyzion.co.il" style={{ color: "hsl(38 75% 58%)", textDecoration: "none" }}>
            office@bneyzion.co.il
          </a>
          {" · "}
          <a href="https://bneyzion.co.il" style={{ color: "hsl(38 75% 58%)", textDecoration: "none" }}>
            bneyzion.co.il
          </a>
        </p>
        <p style={{ fontSize: 11, color: "hsl(215 10% 30%)", margin: 0 }}>
          בני ציון · לחיות תנ"ך · 2026 · sandbox — לאישור יואב לפני פרסום
        </p>
      </footer>

      {/* Bottom padding for mobile bar */}
      <div className="mobile-bar" style={{ height: 64 }} />
    </div>
  );
}

/* ─── InlineCheckoutModal ───────────────────────────────────────────────────
 * Grows payment directly in the campaign page — no redirect to /donate.
 * Mirrors Donate.tsx logic: same useGrowPayment hook, same params to create-payment.
 * Fallback: if SDK fails to init after 5 s, shows a redirect button to /donate.
 * ────────────────────────────────────────────────────────────────────────── */

function InlineCheckoutModal({
  tier,
  onClose,
}: {
  tier: Tier;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { startPayment, isReady: paymentReady, isLoading: paymentLoading, error: paymentError, setError } = useGrowPayment();

  // Form fields
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);

  // Shipping address (required for all tiers except tier-2000 = lesson-only)
  const needsShipping = tier.price !== 2000;
  const [shippingStreet, setShippingStreet] = useState("");
  const [shippingHouseNumber, setShippingHouseNumber] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");

  // SDK timeout fallback: after 5 seconds, if not ready → show fallback button
  const [sdkTimedOut, setSdkTimedOut] = useState(false);
  useEffect(() => {
    if (paymentReady) return;
    const timer = setTimeout(() => setSdkTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [paymentReady]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const fallbackUrl = `/donate?amount=${tier.price}&source=yehoshua-campaign&tier=${tier.id}&type=donation`;

  const handleSubmit = useCallback(async () => {
    if (!donorName || !donorName.trim().includes(" ")) {
      toast({ title: "נא להזין שם מלא (שם פרטי ומשפחה)", variant: "destructive" });
      return;
    }
    if (!donorPhone || !/^05\d{8}$/.test(donorPhone.replace(/[-\s]/g, ""))) {
      toast({ title: "נא להזין מספר טלפון תקין (05XXXXXXXX)", variant: "destructive" });
      return;
    }
    if (needsShipping && (!shippingStreet.trim() || !shippingHouseNumber.trim() || !shippingCity.trim())) {
      toast({ title: "נא למלא כתובת למשלוח (רחוב, מספר בית, עיר)", variant: "destructive" });
      return;
    }
    if (!tosAccepted) {
      toast({ title: "יש לאשר את התקנון לפני המשך לתשלום", variant: "destructive" });
      return;
    }

    try {
      await startPayment({
        sum: tier.price,
        description: `${tier.headline} — קמפיין ספר יהושע`,
        fullName: donorName,
        phone: donorPhone,
        email: donorEmail,
        type: "donation",
        thankYouType: "donation",
        // ₪90/120/220 → single payment; ₪400+ → up to 5 installments
        installments: maxInstallmentsFor(tier.price),
        meta: {
          product: "yehoshua-campaign",
          tos_accepted: true,
          tos_accepted_at: new Date().toISOString(),
        },
        donationMeta: {
          is_monthly: false,
          donor_email: donorEmail || undefined,
          user_id: user?.id,
          // @ts-expect-error — extra fields forwarded to create-payment
          source: "yehoshua-campaign",
          tier_id: tier.id,
          shipping_street: needsShipping ? shippingStreet.trim() : undefined,
          shipping_house_number: needsShipping ? shippingHouseNumber.trim() : undefined,
          shipping_city: needsShipping ? shippingCity.trim() : undefined,
          shipping_zip: shippingZip.trim() || undefined,
          shipping_notes: shippingNotes.trim() || undefined,
        },
      });

      toast({ title: "חלון תשלום נפתח!", description: "השלימו את התשלום בחלון שנפתח." });
      onClose();
    } catch (err: any) {
      // startPayment already sets error in hook — just show toast
      toast({ title: "שגיאה בפתיחת חלון התשלום", description: err.message, variant: "destructive" });
    }
  }, [donorName, donorPhone, donorEmail, tosAccepted, tier, user, startPayment, toast, onClose]);

  const isProcessing = paymentLoading;
  const addressOk = !needsShipping || (!!shippingStreet.trim() && !!shippingHouseNumber.trim() && !!shippingCity.trim());
  const canSubmit = !isProcessing && (paymentReady || sdkTimedOut) && tosAccepted && !!donorName && !!donorPhone && addressOk;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      dir="rtl"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "hsl(215 55% 8% / 0.75)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background: "white",
          borderRadius: 20,
          padding: "28px 24px 24px",
          boxShadow: "0 32px 80px hsl(215 55% 8% / 0.4)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            insetInlineStart: 16,
            top: 16,
            background: "hsl(215 10% 94%)",
            border: "none",
            borderRadius: 99,
            width: 30,
            height: 30,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "hsl(215 30% 35%)",
          }}
          aria-label="סגור"
        >
          <X size={16} />
        </button>

        {/* Tier summary */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            paddingBlockEnd: 16,
            borderBlockEnd: "1px solid hsl(38 30% 88%)",
          }}
        >
          <img
            src={tier.image}
            alt={tier.imageAlt}
            style={{
              width: 56,
              height: 56,
              borderRadius: 10,
              objectFit: "cover",
              flexShrink: 0,
              border: "1.5px solid hsl(38 50% 84%)",
            }}
          />
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "hsl(38 65% 45%)",
                letterSpacing: "0.1em",
                marginBlockEnd: 3,
              }}
            >
              {tier.name}
            </div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "hsl(215 55% 16%)", lineHeight: 1.25 }}>
              {tier.headline}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "hsl(38 75% 42%)",
                marginBlockStart: 2,
              }}
            >
              ₪{tier.price.toLocaleString("he-IL")}
            </div>
          </div>
        </div>

        {/* Perks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {tier.perks.map((perk) => (
            <div key={perk} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "hsl(215 30% 30%)" }}>
              <CheckCircle2 size={14} style={{ color: "hsl(38 75% 45%)", flexShrink: 0 }} />
              {perk}
            </div>
          ))}
        </div>

        {/* Installments banner */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 12px",
            background: "hsl(38 60% 96%)",
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 700,
            color: "hsl(215 45% 28%)",
            border: "1px solid hsl(38 50% 86%)",
          }}
        >
          <CreditCard size={14} style={{ color: "hsl(38 75% 45%)", flexShrink: 0 }} />
          {maxInstallmentsFor(tier.price) > 1
            ? `ניתן לפצל עד ${maxInstallmentsFor(tier.price)} תשלומים — ללא ריבית`
            : "תשלום אחד בלבד"}
        </div>

        {/* SDK loading indicator or fallback */}
        {!paymentReady && !sdkTimedOut && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "hsl(38 60% 96%)",
              borderRadius: 10,
              fontSize: 13,
              color: "hsl(215 40% 35%)",
              border: "1px solid hsl(38 50% 86%)",
            }}
          >
            <Loader2 size={14} className="animate-spin" style={{ color: "hsl(38 65% 48%)", flexShrink: 0 }} />
            טוען מערכת תשלום מאובטחת...
          </div>
        )}

        {sdkTimedOut && !paymentReady && (
          <div
            style={{
              padding: "12px 16px",
              background: "hsl(38 60% 96%)",
              borderRadius: 10,
              fontSize: 13,
              color: "hsl(215 40% 35%)",
              border: "1px solid hsl(38 50% 84%)",
              lineHeight: 1.6,
            }}
          >
            <strong>מערכת התשלום לא נטענה.</strong> ניתן להמשיך לדף התשלום:
            <a
              href={fallbackUrl}
              style={{
                display: "block",
                marginBlockStart: 8,
                padding: "9px 16px",
                background: "linear-gradient(135deg, hsl(43 85% 58%), hsl(38 75% 45%))",
                color: "hsl(215 55% 12%)",
                borderRadius: 99,
                textAlign: "center",
                fontWeight: 800,
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              המשך לדף תשלום ↗
            </a>
          </div>
        )}

        {/* Error state */}
        {paymentError && (
          <div
            style={{
              padding: "10px 14px",
              background: "hsl(0 65% 96%)",
              border: "1px solid hsl(0 60% 85%)",
              borderRadius: 10,
              fontSize: 13,
              color: "hsl(0 65% 42%)",
            }}
          >
            {paymentError}
          </div>
        )}

        {/* Donor name */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "hsl(215 30% 42%)", marginBlockEnd: 5 }}>
            שם מלא *
          </label>
          <input
            type="text"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            placeholder="שם פרטי ומשפחה..."
            dir="rtl"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1.5px solid hsl(38 30% 82%)",
              fontFamily: "inherit",
              fontSize: 14,
              color: "hsl(215 40% 14%)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Phone + email row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "hsl(215 30% 42%)", marginBlockEnd: 5 }}>
              טלפון *
            </label>
            <input
              type="tel"
              value={donorPhone}
              onChange={(e) => setDonorPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              dir="ltr"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1.5px solid hsl(38 30% 82%)",
                fontFamily: "inherit",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "hsl(215 30% 42%)", marginBlockEnd: 5 }}>
              אימייל
            </label>
            <input
              type="email"
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
              placeholder="email@..."
              dir="ltr"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1.5px solid hsl(38 30% 82%)",
                fontFamily: "inherit",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Shipping address — shown for all tiers except tier-2000 (lesson only) */}
        {needsShipping && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "hsl(215 30% 42%)",
                paddingBlockEnd: 4,
                borderBlockEnd: "1px solid hsl(38 30% 88%)",
              }}
            >
              כתובת למשלוח הספר
            </div>
            {/* Street + house number */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "hsl(215 30% 42%)", marginBlockEnd: 4 }}>
                  רחוב *
                </label>
                <input
                  type="text"
                  value={shippingStreet}
                  onChange={(e) => setShippingStreet(e.target.value)}
                  placeholder="שם הרחוב"
                  dir="rtl"
                  style={{
                    width: "100%",
                    padding: "9px 11px",
                    borderRadius: 10,
                    border: "1.5px solid hsl(38 30% 82%)",
                    fontFamily: "inherit",
                    fontSize: 14,
                    color: "hsl(215 40% 14%)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ width: 72 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "hsl(215 30% 42%)", marginBlockEnd: 4 }}>
                  מס׳ *
                </label>
                <input
                  type="text"
                  value={shippingHouseNumber}
                  onChange={(e) => setShippingHouseNumber(e.target.value)}
                  placeholder="12"
                  dir="ltr"
                  style={{
                    width: "100%",
                    padding: "9px 11px",
                    borderRadius: 10,
                    border: "1.5px solid hsl(38 30% 82%)",
                    fontFamily: "inherit",
                    fontSize: 14,
                    color: "hsl(215 40% 14%)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            {/* City + zip */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "hsl(215 30% 42%)", marginBlockEnd: 4 }}>
                  עיר *
                </label>
                <input
                  type="text"
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  placeholder="שם היישוב"
                  dir="rtl"
                  style={{
                    width: "100%",
                    padding: "9px 11px",
                    borderRadius: 10,
                    border: "1.5px solid hsl(38 30% 82%)",
                    fontFamily: "inherit",
                    fontSize: 14,
                    color: "hsl(215 40% 14%)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ width: 96 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "hsl(215 30% 42%)", marginBlockEnd: 4 }}>
                  מיקוד
                </label>
                <input
                  type="text"
                  value={shippingZip}
                  onChange={(e) => setShippingZip(e.target.value)}
                  placeholder="7 ספרות"
                  dir="ltr"
                  style={{
                    width: "100%",
                    padding: "9px 11px",
                    borderRadius: 10,
                    border: "1.5px solid hsl(38 30% 82%)",
                    fontFamily: "inherit",
                    fontSize: 14,
                    color: "hsl(215 40% 14%)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            {/* Notes */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "hsl(215 30% 42%)", marginBlockEnd: 4 }}>
                הערות משלוח (דירה, קומה, קוד כניסה...)
              </label>
              <textarea
                value={shippingNotes}
                onChange={(e) => setShippingNotes(e.target.value)}
                placeholder="לא חובה"
                dir="rtl"
                rows={2}
                style={{
                  width: "100%",
                  padding: "9px 11px",
                  borderRadius: 10,
                  border: "1.5px solid hsl(38 30% 82%)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  color: "hsl(215 40% 14%)",
                  outline: "none",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>
          </div>
        )}

        {/* TOS */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <input
            id="yehoshua-tos"
            type="checkbox"
            checked={tosAccepted}
            onChange={(e) => setTosAccepted(e.target.checked)}
            style={{ marginBlockStart: 2, accentColor: "hsl(38 75% 45%)", flexShrink: 0 }}
          />
          <label htmlFor="yehoshua-tos" style={{ fontSize: 12, color: "hsl(215 20% 48%)", lineHeight: 1.6, cursor: "pointer" }}>
            אני מאשר/ת את{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "hsl(38 65% 42%)", textDecoration: "underline" }}>
              תקנון האתר
            </a>
            {" "}ומדיניות הפרטיות, ואני מעל גיל 18.
          </label>
        </div>

        {/* CTA button */}
        <button
          onClick={sdkTimedOut && !paymentReady ? undefined : handleSubmit}
          disabled={!canSubmit}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            border: "none",
            background: canSubmit
              ? "linear-gradient(135deg, hsl(43 85% 58%), hsl(38 75% 45%))"
              : "hsl(38 30% 78%)",
            color: canSubmit ? "hsl(215 55% 12%)" : "hsl(215 20% 55%)",
            fontFamily: "inherit",
            fontWeight: 900,
            fontSize: 16,
            cursor: canSubmit ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "all 0.15s",
          }}
        >
          {isProcessing ? (
            <><Loader2 size={16} className="animate-spin" />מעבד תשלום...</>
          ) : (
            <>תמוך ב-₪{tier.price.toLocaleString("he-IL")}</>
          )}
        </button>

        {/* Security note */}
        <p style={{ margin: 0, textAlign: "center", fontSize: 11, color: "hsl(215 20% 52%)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <ShieldCheck size={11} />
          סליקה מאובטחת באמצעות Grow — אשראי, ביט, Apple Pay, Google Pay
        </p>
      </div>
    </div>
  );
}
