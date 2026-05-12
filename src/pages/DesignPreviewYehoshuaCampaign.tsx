/**
 * DesignPreviewYehoshuaCampaign — Sandbox only
 * Route: /design-yehoshua-campaign
 *
 * Headstart-style pre-launch page for "ספר יהושע" by Rabbi Yoav Uriel.
 * Content 100% from STRATEGY.md + landing-page-prelaunch-v2.html — no invention.
 * Design layer: Headstart structural patterns on top of bneyzion brand.
 *
 * Headstart patterns implemented:
 * 1. Sticky top progress bar (pre-launch variant — shows goal, opens date)
 * 2. Hero split: video/image left + campaign meta right (adapted: copy right, image left in RTL)
 * 3. Tier cards — price-first, content list, per-card CTA, "most popular" badge, sold-out state
 * 4. Sticky bottom mobile bar — progress pill + pledge CTA
 * 5. Campaign timeline strip
 * 6. Testimonials / social proof
 * 7. FAQ accordion
 * 8. Final CTA section
 * 9. Recent backers animated strip (simulated — real Headstart shows last 5-10)
 */

import { useState, useEffect, useRef } from "react";

/* ─── Types ─────────────────────────────────────────────── */
interface Tier {
  id: string;
  price: number;
  name: string;
  tagline: string;
  includes: string[];
  badge?: string; // "הכי פופולרי" | "early-bird" | "מוגבל ל-200"
  limit?: number;
  highlight?: boolean;
  soldOut?: boolean;
}

interface FaqItem {
  q: string;
  a: string;
}

/* ─── Data (from STRATEGY.md §4) ────────────────────────── */
const TIERS: Tier[] = [
  {
    id: "tier-50",
    price: 50,
    name: "המעודד",
    tagline: "מצטרפים לרצון",
    includes: [
      "תודה אישית מהרב יואב",
      "שמך בעמוד «תורמי הספר» באתר",
    ],
  },
  {
    id: "tier-90",
    price: 90,
    name: "מחיר מיוחד — ראשונים",
    tagline: "48 שעות ראשונות בלבד",
    includes: [
      "ספר יהושע פיזי + משלוח",
      "חיסכון של 25% — ₪90 במקום ₪120",
    ],
    badge: "early-bird",
    limit: 200,
    highlight: false,
  },
  {
    id: "tier-120",
    price: 120,
    name: "הקורא",
    tagline: "ספר יהושע אצלי בבית",
    includes: [
      "1 ספר פיזי + משלוח",
      "הספר יגיע עד חנוכה תשפ\"ז",
    ],
    badge: "הכי פופולרי",
    highlight: true,
  },
  {
    id: "tier-220",
    price: 220,
    name: "הזוג",
    tagline: "ספר לי וספר לחבר",
    includes: [
      "2 ספרים פיזיים + משלוח",
      "ספר אחד לכם, ספר אחד במתנה",
    ],
  },
  {
    id: "tier-360",
    price: 360,
    name: "המקדיש",
    tagline: "להנצחה / לסבא / לרב",
    includes: [
      "2 ספרים פיזיים + משלוח",
      "הקדשה אישית בכתב יד של הרב יואב",
    ],
  },
  {
    id: "tier-600",
    price: 600,
    name: "המשפחה",
    tagline: "מתנה לקהילה",
    includes: [
      "5 ספרים פיזיים + משלוח",
      "הקדשה אישית",
      "שיעור זום פרטי 30 דקות עם הרב יואב",
    ],
  },
  {
    id: "tier-1500",
    price: 1500,
    name: "השותף",
    tagline: "שותפי דרך",
    includes: [
      "10 ספרים פיזיים + משלוח",
      "הקדשה אישית",
      "שיעור פרטי שעה עם הרב יואב",
      "שמך בעמוד «השותפים שלנו»",
    ],
  },
  {
    id: "tier-3600",
    price: 3600,
    name: "הפטרון",
    tagline: "תומכי כתר",
    includes: [
      "25 ספרים + הקדשה",
      "מפגש פיזי 1:1 עם הרב יואב לאחר שחרורו",
      "שמך בהקדשת הספר הרשמית",
    ],
    limit: 5,
  },
];

const STRETCH_GOALS = [
  { amount: 120000, title: "3 קליפי «מאחורי הקלעים» מהכתיבה", icon: "▶" },
  { amount: 150000, title: "אודיובוק — הרב יואב קורא את הספר", icon: "🎧" },
  { amount: 200000, title: "12 שיעורי וידאו על הספר (חינם לתומכים)", icon: "📚" },
];

const TESTIMONIALS = [
  {
    text: "מביא מבט חדש לכל התנ״ך שלא מצאתי בשום מקום אחר.",
    name: "משתתפת בלחיות תנ״ך",
  },
  {
    text: "השיעור מרתק, מעמיק, ומחבר את אירועי התנ״ך לאירועים הגדולים שאנחנו חווים בדור שלנו. זה לא רק שיעור תנ״ך — אלא ממש שיעור באמונה.",
    name: "חנה יצחקי",
  },
  {
    text: "השיעורים של הרב יואב מאירים כל פרק באור מיוחד — גם פרקים שנראים כרשימות טכניות מקבלים חיים.",
    name: "בני מרואני",
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "מתי הקמפיין נפתח?",
    a: "הקמפיין מתוכנן לחצי השני של יוני 2026 — ברגע שהרב יואב חוזר משחרור. לרשומים כאן נשלח הודעה יום-יומיים לפני ההשקה.",
  },
  {
    q: "מה המחיר המיוחד של ה-48 שעות?",
    a: "200 התומכים הראשונים מקבלים את הספר ב-90 ₪ במקום 120 ₪ — חיסכון של 25%. מחיר זה זמין רק ב-48 השעות הראשונות של הקמפיין, ורק עד שייגמרו 200 העותקים.",
  },
  {
    q: "מה זה מימון המונים בכלל?",
    a: "הדסטארט היא פלטפורמה שדרכה תוכלו לבחור חבילה ולשלם בכרטיס אשראי. אם הקמפיין מגיע ליעד — הספר יוצא לדפוס וכל התומכים מקבלים אותו. אם לא — הכל חוזר אליכם. אין סיכון.",
  },
  {
    q: "מה אם אני לא יכול לתמוך עכשיו?",
    a: "ההרשמה כאן לא מחייבת אתכם בכלום. רק נשלח לכם הודעה כשהקמפיין נפתח. אם תחליטו אז שזה מתאים — מצוין. אם לא — גם בסדר.",
  },
  {
    q: "האם יש אפשרות להקדיש את הספר לאדם אהוב?",
    a: "כן. ב-Tier «המקדיש» (₪360) ומעלה הרב יואב כותב הקדשה אישית בכתב ידו — להנצחה, לסבא, לרב, לחייל. ציינו את שם הנמען ברשומת התמיכה.",
  },
];

const CAMPAIGN_PHASES = [
  { label: "בניית הקמפיין", sub: "מאי 2026", done: true },
  { label: "רישום מוקדם", sub: "מאי–יוני 2026", done: true, current: true },
  { label: "השקה", sub: "יוני 2026", done: false },
  { label: "35 ימי גיוס", sub: "יוני–יולי 2026", done: false },
  { label: "יציאה לדפוס", sub: "אוגוסט 2026", done: false },
  { label: "ספר בידיכם", sub: "חנוכה תשפ\"ז", done: false },
];

// Simulated recent backers (in a live Headstart page these are real)
const RECENT_BACKERS = [
  { name: "א.ל.", tier: "הקורא", time: "לפני 2 ד'" },
  { name: "מ.כ.", tier: "המקדיש", time: "לפני 5 ד'" },
  { name: "ר.ש.", tier: "הזוג", time: "לפני 11 ד'" },
  { name: "ד.א.", tier: "המעודד", time: "לפני 18 ד'" },
  { name: "נ.ה.", tier: "המשפחה", time: "לפני 23 ד'" },
];

/* ─── Sub-components ─────────────────────────────────────── */

function StickyBar({ scrolled }: { scrolled: boolean }) {
  const GOAL = 80000;
  const RAISED = 0; // pre-launch
  const pct = Math.round((RAISED / GOAL) * 100);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        left: 0,
        zIndex: 50,
        background: scrolled ? "hsl(215 55% 16% / 0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid hsl(38 75% 55% / 0.2)" : "none",
        transition: "all 0.3s ease",
        padding: scrolled ? "10px 20px" : "0",
      }}
    >
      {scrolled && (
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "hsl(38 85% 75%)", fontWeight: 700, fontSize: 14 }}>
              ספר יהושע — הרב יואב אוריאל
            </span>
            <span
              style={{
                background: "hsl(38 75% 55%)",
                color: "hsl(215 55% 15%)",
                borderRadius: 99,
                padding: "2px 10px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              טרום השקה
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 13, color: "white" }}>
              <span style={{ fontWeight: 700 }}>יעד:</span>{" "}
              <span style={{ color: "hsl(38 85% 70%)" }}>₪80,000</span>
            </div>
            <a
              href="#signup"
              style={{
                background: "hsl(38 75% 55%)",
                color: "hsl(215 55% 15%)",
                borderRadius: 99,
                padding: "6px 18px",
                fontWeight: 700,
                fontSize: 13,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              שמרו לי מקום
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function TierCard({ tier }: { tier: Tier }) {
  const isEarlyBird = tier.badge === "early-bird";
  const isPopular = tier.badge === "הכי פופולרי";

  return (
    <div
      className={`tier-card ${tier.highlight ? "tier-card-popular" : ""}`}
      style={{
        position: "relative",
        background: tier.highlight
          ? "linear-gradient(160deg, hsl(215 55% 18%) 0%, hsl(215 50% 24%) 100%)"
          : isEarlyBird
          ? "linear-gradient(160deg, hsl(38 60% 14%) 0%, hsl(215 50% 18%) 100%)"
          : "white",
        border: tier.highlight
          ? "2px solid hsl(38 75% 55%)"
          : isEarlyBird
          ? "2px solid hsl(38 75% 55% / 0.6)"
          : "1.5px solid hsl(215 15% 88%)",
        borderRadius: 18,
        padding: tier.highlight ? "30px 22px 22px" : "26px 20px 20px",
        color: tier.highlight || isEarlyBird ? "white" : "hsl(215 40% 12%)",
        boxShadow: tier.highlight
          ? "0 16px 44px -8px hsl(38 75% 50% / 0.35), 0 0 0 1px hsl(38 75% 55% / 0.4)"
          : isEarlyBird
          ? "0 8px 24px -6px hsl(38 75% 50% / 0.18)"
          : "0 2px 10px hsl(215 15% 60% / 0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Badge — centered on top edge (works in RTL via inset+transform combo) */}
      {tier.badge && (
        <div
          style={{
            position: "absolute",
            top: -13,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, hsl(43 85% 60%), hsl(38 75% 50%))",
            color: "hsl(215 55% 12%)",
            fontSize: 11,
            fontWeight: 800,
            padding: "4px 14px",
            borderRadius: 99,
            whiteSpace: "nowrap",
            letterSpacing: "0.03em",
            boxShadow: "0 4px 12px hsl(38 75% 50% / 0.3)",
            border: "1.5px solid hsl(215 55% 16%)",
          }}
        >
          {isEarlyBird ? "⚡ Early-Bird · 48 שעות בלבד" : "★ הכי פופולרי"}
        </div>
      )}

      {/* Price */}
      <div>
        <span
          style={{
            fontSize: 36,
            fontWeight: 900,
            lineHeight: 1,
            color: tier.highlight || isEarlyBird ? "hsl(38 85% 70%)" : "hsl(215 55% 25%)",
          }}
        >
          ₪{tier.price.toLocaleString()}
        </span>
      </div>

      {/* Name + tagline */}
      <div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            marginBottom: 2,
            color: tier.highlight || isEarlyBird ? "white" : "hsl(215 55% 20%)",
          }}
        >
          {tier.name}
        </div>
        <div
          style={{
            fontSize: 13,
            color: tier.highlight || isEarlyBird ? "hsl(38 85% 75%)" : "hsl(215 30% 45%)",
            fontStyle: "italic",
          }}
        >
          {tier.tagline}
        </div>
      </div>

      {/* Includes */}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {tier.includes.map((item, i) => (
          <li
            key={i}
            style={{
              fontSize: 13,
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              color: tier.highlight || isEarlyBird ? "hsl(215 10% 88%)" : "hsl(215 30% 30%)",
            }}
          >
            <span style={{ color: "hsl(38 75% 55%)", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
            {item}
          </li>
        ))}
      </ul>

      {/* Limit badge */}
      {tier.limit && !tier.soldOut && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "hsl(38 85% 60%)",
            background: "hsl(38 75% 55% / 0.12)",
            borderRadius: 8,
            padding: "4px 10px",
            textAlign: "center",
          }}
        >
          מוגבל ל-{tier.limit} תומכים
        </div>
      )}

      {/* CTA */}
      <a
        href="#signup"
        style={{
          marginTop: "auto",
          display: "block",
          textAlign: "center",
          padding: "10px 0",
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 14,
          textDecoration: "none",
          background: tier.highlight || isEarlyBird ? "hsl(38 75% 55%)" : "hsl(215 55% 25%)",
          color: tier.highlight || isEarlyBird ? "hsl(215 55% 15%)" : "white",
          transition: "opacity 0.15s",
        }}
        onMouseOver={(e) => ((e.target as HTMLElement).style.opacity = "0.88")}
        onMouseOut={(e) => ((e.target as HTMLElement).style.opacity = "1")}
      >
        {isEarlyBird ? "אני ב-200 הראשונים" : "בחרו tier זה"}
      </a>
    </div>
  );
}

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            background: "white",
            border: "1.5px solid hsl(215 15% 88%)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: "100%",
              padding: "16px 20px",
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
            <span
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: "hsl(215 55% 22%)",
                flex: 1,
              }}
            >
              {item.q}
            </span>
            <span
              style={{
                color: "hsl(38 75% 45%)",
                fontSize: 22,
                fontWeight: 300,
                flexShrink: 0,
                transform: open === i ? "rotate(45deg)" : "none",
                transition: "transform 0.2s",
              }}
            >
              +
            </span>
          </button>
          {open === i && (
            <div
              style={{
                padding: "0 20px 16px",
                color: "hsl(215 30% 30%)",
                fontSize: 15,
                lineHeight: 1.7,
                borderTop: "1px solid hsl(215 15% 92%)",
              }}
            >
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StickyMobileBar() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "hsl(215 55% 16% / 0.97)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid hsl(38 75% 55% / 0.25)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
      className="md-hide"
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            color: "hsl(38 85% 70%)",
            fontWeight: 700,
            marginBottom: 3,
          }}
        >
          טרום השקה · יוני 2026
        </div>
        <div
          style={{
            height: 4,
            background: "hsl(215 20% 35%)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "0%",
              background: "hsl(38 75% 55%)",
              borderRadius: 4,
            }}
          />
        </div>
      </div>
      <a
        href="#signup"
        style={{
          background: "hsl(38 75% 55%)",
          color: "hsl(215 55% 15%)",
          borderRadius: 99,
          padding: "10px 20px",
          fontWeight: 800,
          fontSize: 14,
          textDecoration: "none",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        שמרו מקום
      </a>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function DesignPreviewYehoshuaCampaign() {
  const [scrolled, setScrolled] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const signupRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormSubmitted(true);
  }

  return (
    <div
      dir="rtl"
      style={{
        fontFamily: "'Paamon', 'Heebo', sans-serif",
        background: "hsl(38 35% 96%)",
        color: "hsl(215 40% 12%)",
        minHeight: "100vh",
      }}
    >
      {/* Google Font fallback */}
      <style>{`
        @font-face { font-family: 'Paamon'; src: url('https://bneyzion.vercel.app/fonts/paamon-bold-aaa.otf') format('opentype'); font-weight: 700; font-display: swap; }
        @font-face { font-family: 'Paamon'; src: url('https://bneyzion.vercel.app/fonts/paamon-regular-aaa.otf') format('opentype'); font-weight: 400; font-display: swap; }
        @font-face { font-family: 'Paamon'; src: url('https://bneyzion.vercel.app/fonts/paamon-black-aaa.otf') format('opentype'); font-weight: 900; font-display: swap; }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        a { color: inherit; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scrollX { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .fade-up { animation: fadeUp 0.65s ease-out both; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.2s; }
        .fade-up-3 { animation-delay: 0.3s; }
        .fade-up-4 { animation-delay: 0.45s; }
        .fade-up-5 { animation-delay: 0.6s; }
        .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.7s ease-out, transform 0.7s ease-out; }
        .reveal.in { opacity: 1; transform: translateY(0); }
        .tier-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 18px; align-items: stretch; }
        .tier-card-popular { transform: translateY(-8px); }
        .tier-card-popular:hover { transform: translateY(-12px); }
        .tier-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .tier-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px hsl(215 40% 20% / 0.18); }
        .signup-input:focus { border-color: hsl(38 75% 55%) !important; box-shadow: 0 0 0 3px hsl(38 75% 55% / 0.18); }
        h2 { letter-spacing: -0.02em; }
        .cta-pulse { box-shadow: 0 8px 24px hsl(38 75% 50% / 0.35), 0 0 0 0 hsl(38 75% 55% / 0.5); animation: ctaPulse 2.6s ease-out infinite; }
        @keyframes ctaPulse { 0% { box-shadow: 0 8px 24px hsl(38 75% 50% / 0.35), 0 0 0 0 hsl(38 75% 55% / 0.5); } 70% { box-shadow: 0 8px 24px hsl(38 75% 50% / 0.35), 0 0 0 14px hsl(38 75% 55% / 0); } 100% { box-shadow: 0 8px 24px hsl(38 75% 50% / 0.35), 0 0 0 0 hsl(38 75% 55% / 0); } }
        .gold-rule { display: inline-block; width: 48px; height: 3px; background: hsl(38 75% 55%); border-radius: 2px; margin-bottom: 14px; }
        @media (max-width: 640px) {
          .tier-grid { grid-template-columns: 1fr; }
          .tier-card-popular { transform: none; }
          .md-hide { display: flex !important; }
          .desktop-only { display: none !important; }
          .hero-grid { display: block !important; }
          .about-grid { display: block !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .phases-grid { gap: 6px !important; }
        }
        @media (min-width: 641px) {
          .md-hide { display: none !important; }
        }
        .backer-scroll { display: flex; gap: 12px; animation: scrollX 22s linear infinite; }
        .backer-scroll:hover { animation-play-state: paused; }
      `}</style>

      {/* Sticky top bar */}
      <StickyBar scrolled={scrolled} />

      {/* Sticky mobile bottom bar */}
      <StickyMobileBar />

      {/* ── TOP NAV ── */}
      <nav
        style={{
          background: "hsl(215 55% 16%)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a
          href="https://bneyzion.co.il"
          style={{
            color: "hsl(38 85% 75%)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          חזרה לאתר בני ציון
          <span style={{ fontSize: 16, marginInlineStart: 4 }}>←</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="https://bneyzion.vercel.app/logo.svg"
            alt="בני ציון"
            style={{ height: 28 }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span
            style={{
              color: "white",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            תנועת בני ציון
          </span>
        </div>
      </nav>

      {/* ─────────────────────────────────────────
          HERO
      ───────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(160deg, hsl(215 55% 16%) 0%, hsl(215 50% 26%) 55%, hsl(215 40% 30%) 100%)",
          padding: "60px 24px 72px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* background glow blobs */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: "10%",
            width: 380,
            height: 380,
            background: "hsl(38 75% 55% / 0.07)",
            borderRadius: "50%",
            filter: "blur(100px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "5%",
            width: 280,
            height: 280,
            background: "hsl(215 60% 50% / 0.1)",
            borderRadius: "50%",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />

        <div
          className="hero-grid"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* COPY */}
          <div style={{ textAlign: "right" }}>
            {/* Eyebrow */}
            <div
              className="fade-up fade-up-1"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 99,
                background: "hsl(38 75% 55% / 0.12)",
                border: "1px solid hsl(38 75% 55% / 0.28)",
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: "hsl(38 75% 55%)",
                  borderRadius: "50%",
                }}
              />
              <span
                style={{
                  color: "hsl(38 85% 72%)",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                קמפיין הדסטארט · השקה יוני 2026
              </span>
            </div>

            {/* H1 — kicker + display + tail for hierarchy */}
            <h1
              className="fade-up fade-up-2"
              style={{
                fontWeight: 900,
                lineHeight: 1.05,
                color: "white",
                marginBottom: 22,
                letterSpacing: "-0.02em",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "clamp(15px, 1.6vw, 19px)",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: "hsl(215 15% 78%)",
                  marginBottom: 8,
                  textTransform: "none",
                }}
              >
                ספר חדש של הרב יואב אוריאל
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "clamp(40px, 6.5vw, 78px)",
                  background: "linear-gradient(135deg, hsl(43 90% 70%), hsl(38 75% 50%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.025em",
                  lineHeight: 1,
                }}
              >
                ספר יהושע
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "clamp(22px, 3vw, 34px)",
                  fontWeight: 700,
                  color: "white",
                  marginTop: 6,
                  letterSpacing: "-0.015em",
                }}
              >
                נכתב מהשטח.
              </span>
            </h1>

            {/* Subhead */}
            <p
              className="fade-up fade-up-3"
              style={{
                fontSize: 17,
                color: "hsl(215 15% 88%)",
                lineHeight: 1.7,
                marginBottom: 12,
              }}
            >
              240 עמודים על סיפור כיבוש הארץ — נכתבו פרק אחר פרק{" "}
              <strong style={{ color: "white" }}>
                בעוד הרב יואב עצמו בסבב מילואים שישי, בעומק סוריה.
              </strong>
            </p>
            <p
              className="fade-up fade-up-3"
              style={{
                fontSize: 15,
                color: "hsl(215 10% 72%)",
                lineHeight: 1.65,
                marginBottom: 28,
              }}
            >
              הספר מוכן. אבל בלי העזרה שלכם — הוא יישאר על הלפטופ של יואב.
              הקמפיין נפתח בהדסטארט ביוני. הירשמו עכשיו וקבלו את הקישור ראשונים
              — עם מחיר מיוחד ל-200 התומכים הראשונים בלבד.
            </p>

            {/* ── SIGNUP FORM ── */}
            <div
              id="signup"
              ref={(el) => {
                signupRef.current = el as HTMLElement | null;
              }}
              className="fade-up fade-up-4"
            >
              {!formSubmitted ? (
                <form
                  onSubmit={handleSubmit}
                  style={{
                    background: "hsl(215 30% 12% / 0.7)",
                    backdropFilter: "blur(16px)",
                    borderRadius: 16,
                    padding: "20px",
                    border: "1px solid hsl(215 20% 30%)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <input
                    type="text"
                    placeholder="שם מלא"
                    required
                    className="signup-input"
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid hsl(215 15% 30%)",
                      background: "hsl(215 30% 16%)",
                      color: "white",
                      fontSize: 15,
                      textAlign: "right",
                      outline: "none",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                  />
                  <input
                    type="email"
                    placeholder="כתובת אימייל"
                    required
                    className="signup-input"
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid hsl(215 15% 30%)",
                      background: "hsl(215 30% 16%)",
                      color: "white",
                      fontSize: 15,
                      textAlign: "right",
                      outline: "none",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                  />
                  <input
                    type="tel"
                    placeholder="טלפון (לא חובה — לעדכון WhatsApp)"
                    className="signup-input"
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid hsl(215 15% 30%)",
                      background: "hsl(215 30% 16%)",
                      color: "white",
                      fontSize: 15,
                      textAlign: "right",
                      outline: "none",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "13px",
                      borderRadius: 10,
                      background: "hsl(38 75% 55%)",
                      color: "hsl(215 55% 15%)",
                      fontWeight: 800,
                      fontSize: 15,
                      border: "none",
                      cursor: "pointer",
                      letterSpacing: "0.01em",
                    }}
                  >
                    שמרו לי מקום בין 200 הראשונים
                  </button>
                  <p
                    style={{
                      fontSize: 12,
                      color: "hsl(215 10% 55%)",
                      textAlign: "center",
                      marginTop: 2,
                    }}
                  >
                    ללא התחייבות · נעדכן אתכם רק כשהקמפיין נפתח
                  </p>
                </form>
              ) : (
                <div
                  style={{
                    background: "hsl(215 30% 12% / 0.7)",
                    backdropFilter: "blur(16px)",
                    borderRadius: 16,
                    padding: "24px 20px",
                    border: "1.5px solid hsl(38 75% 55%)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                  <p style={{ color: "white", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                    תודה. שמרנו את מקומכם.
                  </p>
                  <p style={{ color: "hsl(215 10% 65%)", fontSize: 14 }}>
                    תקבלו הודעה ראשונים כשהקמפיין נפתח.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* VISUAL */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", maxWidth: 400, width: "100%" }}>
              {/* Floating milui badge */}
              <div
                style={{
                  position: "absolute",
                  top: -16,
                  left: -16,
                  background: "hsl(38 75% 55%)",
                  color: "hsl(215 55% 15%)",
                  borderRadius: 14,
                  padding: "8px 14px",
                  transform: "rotate(-4deg)",
                  zIndex: 2,
                  boxShadow: "0 4px 16px hsl(38 75% 50% / 0.35)",
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 700, margin: 0 }}>סבב מילואים</p>
                <p style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, margin: 0 }}>6</p>
              </div>

              {/* Image frame */}
              <div
                style={{
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "2px solid hsl(38 75% 55% / 0.35)",
                  boxShadow: "0 16px 48px hsl(38 75% 50% / 0.15)",
                  position: "relative",
                }}
              >
                <img
                  src="https://club.bneyzion.co.il/wp-content/uploads/2026/04/rav-yoav.jpg"
                  alt="הרב יואב אוריאל"
                  style={{ width: "100%", display: "block" }}
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.src =
                      "https://via.placeholder.com/400x500/14263F/C8A45A?text=%D7%94%D7%A8%D7%91+%D7%99%D7%95%D7%90%D7%91+%D7%90%D7%95%D7%A8%D7%99%D7%90%D7%9C";
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    left: 0,
                    background:
                      "linear-gradient(to top, hsl(215 55% 15% / 0.88) 0%, transparent 100%)",
                    padding: "20px 16px 16px",
                  }}
                >
                  <p
                    style={{
                      color: "hsl(38 85% 72%)",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      marginBottom: 2,
                    }}
                  >
                    המחבר
                  </p>
                  <p style={{ color: "white", fontWeight: 800, fontSize: 20 }}>
                    הרב יואב אוריאל
                  </p>
                  <p style={{ color: "hsl(215 10% 70%)", fontSize: 12, marginTop: 2 }}>
                    תנועת בני ציון · לחיות תנ״ך
                  </p>
                </div>
              </div>

              {/* Campaign goal badge — ₪80K dominant, others smaller */}
              <div
                style={{
                  marginTop: 16,
                  background: "hsl(215 30% 14% / 0.85)",
                  backdropFilter: "blur(12px)",
                  borderRadius: 14,
                  padding: "16px 18px",
                  border: "1px solid hsl(215 20% 28%)",
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1px 1fr 1px 1fr",
                  gap: 12,
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: "hsl(38 90% 68%)",
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    ₪80,000
                  </div>
                  <div style={{ fontSize: 11, color: "hsl(215 10% 60%)", marginTop: 4, fontWeight: 600 }}>
                    יעד הקמפיין
                  </div>
                </div>
                <div style={{ height: 32, background: "hsl(215 20% 30%)" }} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "white", lineHeight: 1 }}>
                    35 יום
                  </div>
                  <div style={{ fontSize: 11, color: "hsl(215 10% 55%)", marginTop: 4 }}>
                    משך הקמפיין
                  </div>
                </div>
                <div style={{ height: 32, background: "hsl(215 20% 30%)" }} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "white", lineHeight: 1 }}>
                    200
                  </div>
                  <div style={{ fontSize: 11, color: "hsl(215 10% 55%)", marginTop: 4 }}>
                    Early-Bird
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          RECENT BACKERS SCROLL (pre-launch simulation)
      ───────────────────────────────────────── */}
      <div
        style={{
          background: "hsl(215 55% 14%)",
          borderTop: "1px solid hsl(38 75% 55% / 0.15)",
          padding: "12px 0",
          overflow: "hidden",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div className="backer-scroll">
            {[...RECENT_BACKERS, ...RECENT_BACKERS].map((b, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 18px",
                  borderInlineStart: "1px solid hsl(215 20% 28%)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    background: "hsl(38 75% 55% / 0.15)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "hsl(38 85% 70%)",
                    flexShrink: 0,
                  }}
                >
                  {b.name[0]}
                </div>
                <div>
                  <span style={{ color: "white", fontSize: 12, fontWeight: 600 }}>
                    {b.name}
                  </span>
                  <span style={{ color: "hsl(215 10% 55%)", fontSize: 12 }}>
                    {" "}
                    בחר/ה «{b.tier}»
                  </span>
                  <span style={{ color: "hsl(215 10% 45%)", fontSize: 11, marginRight: 6 }}>
                    {b.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────
          THE STORY
      ───────────────────────────────────────── */}
      <section
        style={{
          background: "hsl(38 35% 96%)",
          padding: "64px 24px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p
            style={{
              color: "hsl(38 75% 42%)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            הסיפור
          </p>
          <h2
            style={{
              fontSize: "clamp(26px, 4vw, 42px)",
              fontWeight: 900,
              color: "hsl(215 55% 22%)",
              lineHeight: 1.15,
              marginBottom: 28,
            }}
          >
            ספר על כיבוש הארץ —{" "}
            <span style={{ color: "hsl(38 75% 42%)" }}>נכתב מתוך כיבוש הארץ.</span>
          </h2>

          <div
            style={{
              fontSize: 17,
              lineHeight: 1.75,
              color: "hsl(215 35% 18%)",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <p>
              הרב יואב אוריאל מלמד את הפרק השבועי כבר 15 שנה. בשנה האחרונה, בין סבב מילואים
              לסבב, הוא ישב בכל זמן פנוי שהיה לו וכתב ספר שלם על ספר יהושע. פרק אחר פרק.
            </p>
            <p>
              לא פירוש אקדמי. לא ספר היסטוריה.{" "}
              <strong>
                פירוש שמסתכל על ספר יהושע מהמקום שיואב נמצא בו עכשיו — לוחם שמכיר את
                האדמה, את הגבול, את האחריות.
              </strong>
            </p>
            <p>
              הספר הזה הוא התשובה של יואב לשאלה שהוא מקבל הכי הרבה מתלמידיו השנה:{" "}
              <em>«מה אני אמור ללמד את הילדים שלי על הימים האלה?»</em>
            </p>
            <p>
              התשובה — ספר יהושע. כי שם הסיפור התחיל. וכי שם הסיפור הזה ממשיך, אצלנו, היום.
            </p>

            {/* Pull quote */}
            <blockquote
              style={{
                borderInlineEnd: "5px solid hsl(38 75% 55%)",
                paddingInlineEnd: 20,
                marginInlineEnd: 0,
                marginInlineStart: 0,
                marginBlock: 8,
                fontStyle: "italic",
                fontSize: 18,
                color: "hsl(215 50% 22%)",
                fontWeight: 600,
              }}
            >
              «הספר מוכן. 240 עמודים, 24 פרקים, עברו עריכה. אבל בלי העזרה של הציבור הוא
              יישאר על הלפטופ שלי — כי אני בסוריה, לא במשרד של הוצאה לאור.»
              <cite
                style={{
                  display: "block",
                  fontSize: 13,
                  fontStyle: "normal",
                  fontWeight: 400,
                  color: "hsl(215 25% 45%)",
                  marginTop: 10,
                }}
              >
                — הרב יואב אוריאל, סבב מילואים 6
              </cite>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          WHY THIS BOOK — 3 cards
      ───────────────────────────────────────── */}
      <section style={{ background: "white", padding: "64px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p
              style={{
                color: "hsl(38 75% 42%)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              למה הספר הזה
            </p>
            <h2
              style={{
                fontSize: "clamp(24px, 3.5vw, 38px)",
                fontWeight: 900,
                color: "hsl(215 55% 22%)",
                lineHeight: 1.2,
              }}
            >
              לא עוד ספר על יהושע.{" "}
              <span style={{ color: "hsl(38 75% 42%)" }}>הספר שצריך עכשיו.</span>
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            {[
              {
                num: "01",
                title: "פירוש שלם של 24 פרקים",
                body: "כל פרק נפתח לעומק — לא הערות, לא קיצורים. ספר עיון מלא של 240 עמודים.",
              },
              {
                num: "02",
                title: "קריאה שמדברת לדור",
                body: "כיבוש הארץ, אחריות עם, גבול. שאלות שיהושע הפעיל לפני 3,300 שנה — ושאנחנו מפעילים שוב היום.",
              },
              {
                num: "03",
                title: "לכל בית בישראל",
                body: "לא ספר לתלמידי חכמים בלבד. ספר שאפשר לקרוא בסלון עם הילדים, ולהביא לשיעור בכיתה.",
              },
            ].map((card) => (
              <div
                key={card.title}
                style={{
                  background: "linear-gradient(180deg, hsl(38 40% 97%) 0%, hsl(38 35% 95%) 100%)",
                  border: "1px solid hsl(38 50% 86%)",
                  borderRadius: 18,
                  padding: "28px 22px",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    color: "hsl(38 75% 42%)",
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span>{card.num}</span>
                  <span style={{ flex: 1, height: 1, background: "hsl(38 50% 78%)" }} />
                </div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: "hsl(215 55% 22%)",
                    marginBottom: 8,
                  }}
                >
                  {card.title}
                </h3>
                <p style={{ fontSize: 14, color: "hsl(215 30% 32%)", lineHeight: 1.65 }}>
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          ABOUT YOAV
      ───────────────────────────────────────── */}
      <section style={{ background: "hsl(215 15% 97%)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div
            className="about-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 3fr",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  borderRadius: 18,
                  overflow: "hidden",
                  border: "2px solid hsl(38 50% 85%)",
                  boxShadow: "0 8px 32px hsl(38 50% 55% / 0.1)",
                }}
              >
                <img
                  src="https://club.bneyzion.co.il/wp-content/uploads/2026/04/rav-yoav.jpg"
                  alt="הרב יואב אוריאל"
                  style={{ width: "100%", display: "block" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/380x480/1A2744/C8A45A?text=%D7%94%D7%A8%D7%91+%D7%99%D7%95%D7%90%D7%91";
                  }}
                />
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  color: "hsl(38 75% 42%)",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  marginBottom: 8,
                }}
              >
                מי כותב
              </p>
              <h2
                style={{
                  fontSize: "clamp(24px, 3vw, 38px)",
                  fontWeight: 900,
                  color: "hsl(215 55% 22%)",
                  marginBottom: 16,
                }}
              >
                הרב יואב אוריאל
              </h2>

              <div
                style={{
                  fontSize: 15,
                  lineHeight: 1.75,
                  color: "hsl(215 35% 22%)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <p>
                  ראש תנועת בני ציון ללימוד תנ״ך. בוגר ישיבת מרכז הרב. מלמד את הפרק השבועי כבר{" "}
                  <strong>15 שנה</strong>. בתכנית <strong>«לחיות תנ״ך»</strong> לומדים איתו יחד
                  250+ אנשים — סטודנטים, אברכים, רופאים, מורים, מהנדסי הייטק. גברים ונשים, מכל
                  גווני הקשת.
                </p>
                <p>
                  סבב המילואים השישי שלו עכשיו, בעומק סוריה. בין משימה למשימה הוא עורך את הפרקים
                  האחרונים של הספר. עם השחרור — הספר ייכנס לדפוס.
                </p>
              </div>

              {/* Stats */}
              <div
                className="stats-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 16,
                  marginTop: 28,
                  paddingTop: 24,
                  borderTop: "1px solid hsl(215 15% 85%)",
                }}
              >
                {[
                  { val: "15+", label: "שנות הוראה" },
                  { val: "250+", label: "לומדים פעילים" },
                  { val: "300+", label: "שיעורים בארכיון" },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 900,
                        color: "hsl(38 75% 42%)",
                        lineHeight: 1,
                      }}
                    >
                      {s.val}
                    </div>
                    <div style={{ fontSize: 12, color: "hsl(215 25% 42%)", marginTop: 4 }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          TIERS
      ───────────────────────────────────────── */}
      <section
        style={{
          background: "hsl(215 15% 96%)",
          padding: "64px 24px 80px",
        }}
        id="tiers"
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p
              style={{
                color: "hsl(38 75% 42%)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              תמיכה
            </p>
            <h2
              style={{
                fontSize: "clamp(24px, 3.5vw, 38px)",
                fontWeight: 900,
                color: "hsl(215 55% 22%)",
                lineHeight: 1.2,
                marginBottom: 8,
              }}
            >
              בחרו את רמת התמיכה שלכם
            </h2>
            <p style={{ color: "hsl(215 25% 42%)", fontSize: 15, maxWidth: 520, margin: "0 auto" }}>
              כל tier עונה על profile שונה. ה-200 הראשונים מקבלים מחיר מיוחד ב-48 השעות הראשונות.
            </p>
          </div>

          <div className="tier-grid">
            {TIERS.map((tier) => (
              <TierCard key={tier.id} tier={tier} />
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          STRETCH GOALS
      ───────────────────────────────────────── */}
      <section
        style={{
          background: "hsl(215 55% 16%)",
          padding: "56px 24px",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <p
              style={{
                color: "hsl(38 85% 70%)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              יעדי stretch
            </p>
            <h2
              style={{
                fontSize: "clamp(22px, 3vw, 34px)",
                fontWeight: 900,
                color: "white",
                marginBottom: 8,
              }}
            >
              ככל שמגייסים יותר — כולם מרוויחים
            </h2>
            <p style={{ color: "hsl(215 10% 60%)", fontSize: 14 }}>
              Stretch goals ישוחררו בפומבי אחרי הגעה ל-100% מהיעד
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {STRETCH_GOALS.map((goal, i) => (
              <div
                key={i}
                style={{
                  background: "hsl(215 40% 22% / 0.6)",
                  border: "1px solid hsl(215 20% 32%)",
                  borderRadius: 14,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: "hsl(38 75% 55% / 0.15)",
                    border: "1px solid hsl(38 75% 55% / 0.3)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {goal.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "hsl(38 85% 68%)",
                      fontWeight: 800,
                      fontSize: 14,
                      marginBottom: 2,
                    }}
                  >
                    ₪{goal.amount.toLocaleString()}
                  </div>
                  <div style={{ color: "hsl(215 10% 75%)", fontSize: 14 }}>{goal.title}</div>
                </div>
                <div
                  style={{
                    width: 80,
                    height: 6,
                    background: "hsl(215 20% 35%)",
                    borderRadius: 6,
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ height: "100%", width: "0%", background: "hsl(38 75% 55%)", borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          CAMPAIGN TIMELINE
      ───────────────────────────────────────── */}
      <section style={{ background: "white", padding: "56px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <p
              style={{
                color: "hsl(38 75% 42%)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              ציר זמן
            </p>
            <h2
              style={{
                fontSize: "clamp(22px, 3vw, 34px)",
                fontWeight: 900,
                color: "hsl(215 55% 22%)",
              }}
            >
              מה קורה מתי
            </h2>
          </div>

          <div
            className="phases-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 4,
              position: "relative",
            }}
          >
            {/* connector line */}
            <div
              style={{
                position: "absolute",
                top: 20,
                right: "8%",
                left: "8%",
                height: 2,
                background: "hsl(215 15% 85%)",
                zIndex: 0,
              }}
            />

            {CAMPAIGN_PHASES.map((phase, i) => (
              <div
                key={i}
                style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 4px" }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: phase.done
                      ? "hsl(38 75% 55%)"
                      : phase.current
                      ? "hsl(38 75% 55%)"
                      : "white",
                    border: `2px solid ${
                      phase.done || phase.current ? "hsl(38 75% 55%)" : "hsl(215 15% 80%)"
                    }`,
                    margin: "0 auto 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    color: phase.done || phase.current ? "hsl(215 55% 15%)" : "hsl(215 15% 65%)",
                    fontWeight: 700,
                    boxShadow: phase.current ? "0 0 0 4px hsl(38 75% 55% / 0.2)" : "none",
                  }}
                >
                  {phase.done ? "✓" : i + 1}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: phase.current ? 700 : 600,
                    color: phase.current ? "hsl(215 55% 22%)" : "hsl(215 30% 35%)",
                    marginBottom: 3,
                    lineHeight: 1.3,
                  }}
                >
                  {phase.label}
                </div>
                <div style={{ fontSize: 11, color: "hsl(215 20% 52%)" }}>{phase.sub}</div>
                {phase.current && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "hsl(38 75% 45%)",
                      background: "hsl(38 75% 55% / 0.1)",
                      borderRadius: 99,
                      padding: "1px 6px",
                      display: "inline-block",
                    }}
                  >
                    אנחנו כאן
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          TESTIMONIALS
      ───────────────────────────────────────── */}
      <section style={{ background: "hsl(38 35% 96%)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <p
              style={{
                color: "hsl(38 75% 42%)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              מה אומרים על השיעורים של הרב יואב
            </p>
            <h2
              style={{
                fontSize: "clamp(22px, 3vw, 34px)",
                fontWeight: 900,
                color: "hsl(215 55% 22%)",
              }}
            >
              הקול של הקהילה.
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                style={{
                  background: "white",
                  borderInlineEnd: "5px solid hsl(38 75% 55%)",
                  borderRadius: "0 12px 12px 0",
                  padding: "18px 20px 18px 16px",
                  boxShadow: "0 2px 8px hsl(215 15% 60% / 0.08)",
                }}
              >
                <p
                  style={{
                    fontSize: 16,
                    color: "hsl(215 45% 22%)",
                    lineHeight: 1.65,
                    marginBottom: 8,
                    fontStyle: "italic",
                  }}
                >
                  «{t.text}»
                </p>
                <p style={{ fontSize: 13, color: "hsl(215 25% 48%)", fontWeight: 600 }}>
                  — {t.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          FAQ
      ───────────────────────────────────────── */}
      <section style={{ background: "hsl(215 15% 97%)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <p
              style={{
                color: "hsl(38 75% 42%)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              שאלות שאתם שואלים
            </p>
            <h2
              style={{
                fontSize: "clamp(22px, 3vw, 34px)",
                fontWeight: 900,
                color: "hsl(215 55% 22%)",
              }}
            >
              הכל מה שצריך לדעת
            </h2>
          </div>
          <FaqAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* ─────────────────────────────────────────
          FINAL CTA
      ───────────────────────────────────────── */}
      <section
        style={{
          background:
            "linear-gradient(160deg, hsl(215 55% 16%) 0%, hsl(215 50% 26%) 55%, hsl(215 40% 30%) 100%)",
          padding: "72px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 40,
            width: 280,
            height: 280,
            background: "hsl(38 75% 55% / 0.08)",
            borderRadius: "50%",
            filter: "blur(80px)",
          }}
        />

        <div style={{ maxWidth: 620, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <h2
            style={{
              fontSize: "clamp(28px, 4.5vw, 48px)",
              fontWeight: 900,
              color: "white",
              lineHeight: 1.1,
              marginBottom: 16,
            }}
          >
            רוצים להיות חלק מזה?
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "hsl(215 10% 75%)",
              lineHeight: 1.65,
              marginBottom: 32,
            }}
          >
            רישום עכשיו = הודעה ראשונים כשהקמפיין נפתח + מחיר מיוחד ל-200 הראשונים שייכנסו
            ב-48 השעות הראשונות.
          </p>
          <a
            href="#signup"
            className="cta-pulse"
            style={{
              display: "inline-block",
              padding: "18px 40px",
              background: "linear-gradient(135deg, hsl(43 85% 60%), hsl(38 75% 50%))",
              color: "hsl(215 55% 12%)",
              fontWeight: 800,
              fontSize: 18,
              borderRadius: 99,
              textDecoration: "none",
              letterSpacing: "0.01em",
            }}
          >
            שמרו לי מקום בין 200 הראשונים
          </a>
          <p
            style={{
              marginTop: 28,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "hsl(215 10% 50%)",
            }}
          >
            בכוח התנ״ך ננצח
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          FOOTER
      ───────────────────────────────────────── */}
      <footer
        style={{
          background: "hsl(215 55% 12%)",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "white", fontWeight: 700, marginBottom: 8 }}>
          תנועת בני ציון ללימוד תנ״ך
        </p>
        <p style={{ fontSize: 13, color: "hsl(215 10% 50%)" }}>
          <a
            href="mailto:office@bneyzion.co.il"
            style={{ color: "hsl(38 75% 60%)", textDecoration: "none" }}
          >
            office@bneyzion.co.il
          </a>
          {" · "}
          <a
            href="https://bneyzion.co.il"
            style={{ color: "hsl(38 75% 60%)", textDecoration: "none" }}
          >
            bneyzion.co.il
          </a>
        </p>
        <p style={{ fontSize: 11, color: "hsl(215 10% 35%)", marginTop: 16 }}>
          בני ציון · לחיות תנ״ך · 2026 · דף זה הוא sandbox בלבד — לאישור יואב לפני פרסום
        </p>
      </footer>

      {/* Bottom padding to clear sticky mobile bar */}
      <div style={{ height: 64 }} className="md-hide" />
    </div>
  );
}
