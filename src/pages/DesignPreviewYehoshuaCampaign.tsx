/**
 * DesignPreviewYehoshuaCampaign — Sandbox only
 * Route: /design-yehoshua-campaign
 *
 * Campaign page for "ספר יהושע" by Rabbi Yoav Uriel.
 *
 * Rebuild 2026-05-15 — Saar's full structural vision applied:
 * - Headstart framing (not "מימון המונים")
 * - Progress bar under hero: ₪7K / ₪80K + supporter count
 * - Tiers MOVED UP (right after hero/progress)
 * - Saar's 7-tier ladder (₪90 EarlyBird → ₪2000 studio lesson)
 * - No pre-launch name/email/WA form anywhere
 * - Stretch Goals removed entirely
 * - Fake testimonials (קול הקהילה) removed — section removed
 * - CTA links to /donate with amount param (Grow קבלת-תרומה merchant)
 * - Bell-icon donation success toast (visual mock)
 * - Hebrew months only in timeline
 * - Consistent typography on all section headlines (single sans style)
 *
 * Yoav's factual fixes preserved:
 * - 480 עמודים
 * - "הספר יצא לאור"
 * - "בגבול סוריה" (not "בעומק")
 * - "הרב יואב" everywhere
 * - "300 לומדים"
 * - No "בוגר מרכז הרב"
 * - No "כל הלפטופ שלי, אני בסוריה"
 * - "מלמד תנ"ך 15 שנה"
 * - Hero image placeholder (TODO: pending from Yoav)
 */

import { useState, useEffect } from "react";

/* ─── Campaign constants (easy to update) ────────────────── */
const GOAL = 80000;
const RAISED = 7000;
const SUPPORTER_COUNT = 47;
const PROGRESS_PCT = Math.min(100, Math.round((RAISED / GOAL) * 100));

/* ─── Types ─────────────────────────────────────────────── */
interface Tier {
  id: string;
  price: number;
  name: string;
  headline: string;
  badge?: string;
  limit: number;
  remaining: number; // mock — hardcoded
  highlight?: boolean;
  perks: string[];
  note?: string;
}

interface FaqItem {
  q: string;
  a: string;
}

/* ─── Tier data (Saar's exact structure) ─────────────────── */
const TIERS: Tier[] = [
  {
    id: "tier-90",
    price: 90,
    name: "מחיר מיוחד — 200 ראשונים",
    headline: "ספר יהושע פיזי עד הבית",
    badge: "Early Bird",
    limit: 200,
    remaining: 153,
    highlight: true,
    perks: ["ספר יהושע פיזי", "משלוח עד הבית"],
  },
  {
    id: "tier-120",
    price: 120,
    name: "ספר + הקדשה",
    headline: "ספר פיזי עד הבית עם הקדשה אישית",
    limit: 300,
    remaining: 287,
    perks: ["ספר יהושע פיזי", "הקדשה אישית מהרב יואב", "משלוח"],
  },
  {
    id: "tier-220",
    price: 220,
    name: "הזוג",
    headline: "שני ספרים פיזיים עד הבית",
    limit: 150,
    remaining: 143,
    perks: ["2 ספרי יהושע", "משלוח"],
  },
  {
    id: "tier-400",
    price: 400,
    name: "הסט המלא",
    headline: "סט מלא — חמש מגילות + יהושע + שופטים",
    limit: 100,
    remaining: 97,
    perks: [
      "סט מלא של בני ציון",
      "כולל הספר החדש: יהושע",
      "כולל פירוש על שופטים",
      "משלוח",
    ],
  },
  {
    id: "tier-800",
    price: 800,
    name: "השותף",
    headline: "שני סטים מלאים",
    limit: 50,
    remaining: 48,
    perks: ["2× סטים מלאים", "הקדשה אישית", "משלוח"],
  },
  {
    id: "tier-1200",
    price: 1200,
    name: "השותף הבכיר",
    headline: "שלושה סטים מלאים",
    limit: 30,
    remaining: 29,
    perks: ["3× סטים מלאים", "הקדשה אישית", "משלוח"],
  },
  {
    id: "tier-2000",
    price: 2000,
    name: "שיעור של הרב יואב",
    headline: "שיעור פיזי של הרב יואב בקהילה שלכם",
    note: "שיעור בלבד — בלי ספר",
    limit: 10,
    remaining: 9,
    perks: ["שיעור פיזי בקהילה / בית כנסת"],
  },
];

const CAMPAIGN_PHASES = [
  { label: "בניית הקמפיין", sub: "אייר תשפ\"ו", done: true },
  { label: "השקה", sub: "סיון תשפ\"ו", done: false, current: true },
  { label: "יעד ראשון — ₪40K", sub: "תמוז תשפ\"ו", done: false },
  { label: "יעד מלא — ₪80K", sub: "אב תשפ\"ו", done: false },
  { label: "הדפסה ומשלוח", sub: "אלול תשפ\"ו", done: false },
  { label: "הספר אצלכם", sub: "עד החגים — תשרי תשפ\"ז", done: false },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "מתי הספר יגיע?",
    a: "הספר צפוי להגיע עד החגים — תשרי תשפ\"ז.",
  },
  {
    q: "מה כולל הסט המלא?",
    a: "הסט המלא כולל פירוש על חמש מגילות ועל יהושע ושופטים — ספרים שהרב יואב כתב לאורך השנים.",
  },
  {
    q: "מה אם אני לא יכול לתמוך עכשיו?",
    a: "אפשר להצטרף לכל אורך הקמפיין. כל תמיכה — גדולה או קטנה — עוזרת להוציא את הספר לאור.",
  },
  {
    q: "האם יש אפשרות להקדיש את הספר לאדם אהוב?",
    a: "כן. במסלול «ספר + הקדשה» (₪120) ומעלה הרב יואב כותב הקדשה אישית — להנצחה, לסבא, לרב, לחייל. ציינו את שם הנמען בהערת ההזמנה.",
  },
  {
    q: "מה זה Headstart?",
    a: "Headstart היא פלטפורמת מימון ציבורי ישראלית. בוחרים חבילה, משלמים בכרטיס אשראי, ומקבלים את הספר. הפרויקט יתפרסם שם רשמית — הדף הזה הוא טרום-השקה.",
  },
];

// Simulated recent backers
const RECENT_BACKERS = [
  { name: "א.ל.", tier: "מחיר מיוחד — 200 ראשונים", time: "לפני 2 ד'" },
  { name: "מ.כ.", tier: "ספר + הקדשה", time: "לפני 5 ד'" },
  { name: "ר.ש.", tier: "הזוג", time: "לפני 11 ד'" },
  { name: "ד.א.", tier: "מחיר מיוחד — 200 ראשונים", time: "לפני 18 ד'" },
  { name: "נ.ה.", tier: "הסט המלא", time: "לפני 23 ד'" },
];

/* ─── Sub-components ─────────────────────────────────────── */

function StickyBar({ scrolled }: { scrolled: boolean }) {
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
              Headstart
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Mini progress */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 80,
                  height: 4,
                  background: "hsl(215 20% 35%)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${PROGRESS_PCT}%`,
                    background: "hsl(38 75% 55%)",
                    borderRadius: 4,
                  }}
                />
              </div>
              <span style={{ fontSize: 12, color: "hsl(38 85% 70%)", fontWeight: 700 }}>
                {PROGRESS_PCT}%
              </span>
            </div>
            <a
              href="#tiers"
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
              לתמיכה בספר
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressBlock() {
  return (
    <div
      style={{
        background: "hsl(215 55% 13%)",
        borderTop: "1px solid hsl(38 75% 55% / 0.2)",
        padding: "28px 24px",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Numbers row */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 10,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "hsl(38 85% 68%)",
                lineHeight: 1,
              }}
            >
              ₪{RAISED.toLocaleString()}
            </span>
            <span style={{ fontSize: 14, color: "hsl(215 10% 55%)", fontWeight: 500 }}>
              מתוך ₪{GOAL.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "hsl(215 10% 60%)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ color: "hsl(38 85% 68%)", fontWeight: 700 }}>{SUPPORTER_COUNT}</span>
            {" תומכים"}
          </div>
        </div>

        {/* Bar */}
        <div
          style={{
            height: 10,
            background: "hsl(215 20% 28%)",
            borderRadius: 10,
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${PROGRESS_PCT}%`,
              background: "linear-gradient(90deg, hsl(43 85% 58%), hsl(38 75% 50%))",
              borderRadius: 10,
              transition: "width 1.2s ease-out",
            }}
          />
        </div>

        {/* Labels */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "hsl(215 10% 48%)",
          }}
        >
          <span style={{ color: "hsl(38 75% 55%)", fontWeight: 700 }}>
            {PROGRESS_PCT}% מהיעד
          </span>
          <span>
            <a href="#tiers" style={{ color: "hsl(38 75% 55%)", textDecoration: "none", fontWeight: 600 }}>
              הצטרפו לקמפיין ↓
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}

function TierCard({
  tier,
  onSupport,
}: {
  tier: Tier;
  onSupport: (tier: Tier) => void;
}) {
  const isEarlyBird = tier.badge === "Early Bird";
  const isSoldOut = tier.remaining === 0;
  const remainingPct = Math.round((tier.remaining / tier.limit) * 100);
  const almostGone = remainingPct <= 25 && !isSoldOut;

  return (
    <div
      style={{
        position: "relative",
        background: tier.highlight
          ? "linear-gradient(160deg, hsl(215 55% 18%) 0%, hsl(215 50% 24%) 100%)"
          : "white",
        border: tier.highlight
          ? "2px solid hsl(38 75% 55%)"
          : "1.5px solid hsl(215 15% 88%)",
        borderRadius: 18,
        padding: tier.highlight ? "32px 22px 22px" : "26px 20px 20px",
        color: tier.highlight ? "white" : "hsl(215 40% 12%)",
        boxShadow: tier.highlight
          ? "0 16px 44px -8px hsl(38 75% 50% / 0.35), 0 0 0 1px hsl(38 75% 55% / 0.4)"
          : "0 2px 10px hsl(215 15% 60% / 0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        opacity: isSoldOut ? 0.6 : 1,
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
      }}
      className={tier.highlight ? "tier-card tier-card-popular" : "tier-card"}
    >
      {/* Badge */}
      {tier.badge && !isSoldOut && (
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
            letterSpacing: "0.04em",
            boxShadow: "0 4px 12px hsl(38 75% 50% / 0.3)",
            border: "1.5px solid hsl(215 55% 16%)",
          }}
        >
          ★ {tier.badge}
        </div>
      )}

      {isSoldOut && (
        <div
          style={{
            position: "absolute",
            top: -13,
            left: "50%",
            transform: "translateX(-50%)",
            background: "hsl(215 15% 55%)",
            color: "white",
            fontSize: 11,
            fontWeight: 800,
            padding: "4px 14px",
            borderRadius: 99,
            whiteSpace: "nowrap",
          }}
        >
          אזל
        </div>
      )}

      {/* Price + name — equal visual weight */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              lineHeight: 1,
              color: tier.highlight ? "hsl(38 85% 70%)" : "hsl(215 55% 25%)",
              letterSpacing: "-0.02em",
            }}
          >
            ₪{tier.price.toLocaleString()}
          </div>
          {tier.note && (
            <div
              style={{
                fontSize: 11,
                color: tier.highlight ? "hsl(215 10% 65%)" : "hsl(215 20% 52%)",
                marginTop: 3,
              }}
            >
              {tier.note}
            </div>
          )}
        </div>
        <div style={{ textAlign: "start", flex: 1 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: tier.highlight ? "white" : "hsl(215 55% 20%)",
              lineHeight: 1.25,
            }}
          >
            {tier.name}
          </div>
        </div>
      </div>

      {/* Headline */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: tier.highlight ? "hsl(38 85% 78%)" : "hsl(215 40% 30%)",
          lineHeight: 1.4,
          paddingBottom: 10,
          borderBottom: `1px solid ${tier.highlight ? "hsl(215 20% 32%)" : "hsl(215 15% 90%)"}`,
        }}
      >
        {tier.headline}
      </div>

      {/* Perks */}
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: 7,
          flex: 1,
        }}
      >
        {tier.perks.map((item, i) => (
          <li
            key={i}
            style={{
              fontSize: 14,
              display: "flex",
              alignItems: "flex-start",
              gap: 7,
              color: tier.highlight ? "hsl(215 10% 88%)" : "hsl(215 30% 30%)",
            }}
          >
            <span
              style={{
                color: "hsl(38 75% 55%)",
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>

      {/* Remaining count */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: almostGone
            ? "hsl(20 85% 55%)"
            : tier.highlight
            ? "hsl(38 85% 68%)"
            : "hsl(38 65% 45%)",
          background: almostGone
            ? "hsl(20 85% 55% / 0.1)"
            : "hsl(38 75% 55% / 0.1)",
          borderRadius: 8,
          padding: "5px 10px",
          textAlign: "center",
        }}
      >
        {isSoldOut
          ? "אזל — אין יותר מקומות"
          : almostGone
          ? `⚡ נשארו רק ${tier.remaining} מתוך ${tier.limit}`
          : `נשארו ${tier.remaining} מתוך ${tier.limit}`}
      </div>

      {/* CTA */}
      {isSoldOut ? (
        <div
          style={{
            display: "block",
            textAlign: "center",
            padding: "10px 0",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            background: "hsl(215 15% 80%)",
            color: "hsl(215 20% 45%)",
            cursor: "not-allowed",
          }}
        >
          אזל
        </div>
      ) : (
        <button
          onClick={() => onSupport(tier)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "center",
            padding: "11px 0",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
            background: tier.highlight
              ? "hsl(38 75% 55%)"
              : "hsl(215 55% 25%)",
            color: tier.highlight ? "hsl(215 55% 15%)" : "white",
            transition: "opacity 0.15s",
          }}
          onMouseOver={(e) =>
            ((e.target as HTMLElement).style.opacity = "0.88")
          }
          onMouseOut={(e) => ((e.target as HTMLElement).style.opacity = "1")}
        >
          אני תומך
        </button>
      )}
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
          קמפיין Headstart · ספר יהושע
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
              width: `${PROGRESS_PCT}%`,
              background: "hsl(38 75% 55%)",
              borderRadius: 4,
            }}
          />
        </div>
      </div>
      <a
        href="#tiers"
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
        לתמיכה בספר
      </a>
    </div>
  );
}

/* Bell toast — visual mock of post-donation confirmation */
function DonationToast({
  tier,
  onClose,
}: {
  tier: Tier;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        insetInlineEnd: 20,
        zIndex: 100,
        background: "hsl(215 55% 18%)",
        border: "1.5px solid hsl(38 75% 55% / 0.5)",
        borderRadius: 16,
        padding: "16px 18px",
        maxWidth: 300,
        boxShadow: "0 12px 36px hsl(215 55% 10% / 0.45)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        animation: "slideInToast 0.35s ease-out both",
      }}
    >
      {/* Bell icon */}
      <div
        style={{
          width: 36,
          height: 36,
          background: "hsl(38 75% 55% / 0.15)",
          border: "1px solid hsl(38 75% 55% / 0.35)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 18,
        }}
      >
        🔔
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "white", marginBottom: 4 }}>
          תודה על התמיכה!
        </div>
        <div style={{ fontSize: 13, color: "hsl(38 85% 72%)", fontWeight: 600, marginBottom: 2 }}>
          {tier.name} — ₪{tier.price.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: "hsl(215 10% 55%)" }}>
          הספר יגיע אליכם עד החגים.
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "hsl(215 10% 50%)",
          cursor: "pointer",
          fontSize: 16,
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function DesignPreviewYehoshuaCampaign() {
  const [scrolled, setScrolled] = useState(false);
  const [toastTier, setToastTier] = useState<Tier | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleSupport(tier: Tier) {
    // In production: navigate to /donate?amount=PRICE&source=yehoshua-campaign&tier=TIER_ID
    // For sandbox: show the toast mock
    setToastTier(tier);
    // Uncomment when Grow integration is wired:
    // window.location.href = `/donate?amount=${tier.price}&source=yehoshua-campaign&tier=${tier.id}`;
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
      <style>{`
        @font-face { font-family: 'Paamon'; src: url('https://bneyzion.vercel.app/fonts/paamon-bold-aaa.otf') format('opentype'); font-weight: 700; font-display: swap; }
        @font-face { font-family: 'Paamon'; src: url('https://bneyzion.vercel.app/fonts/paamon-regular-aaa.otf') format('opentype'); font-weight: 400; font-display: swap; }
        @font-face { font-family: 'Paamon'; src: url('https://bneyzion.vercel.app/fonts/paamon-black-aaa.otf') format('opentype'); font-weight: 900; font-display: swap; }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        a { color: inherit; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scrollX { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes slideInToast { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.65s ease-out both; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.2s; }
        .fade-up-3 { animation-delay: 0.3s; }
        .fade-up-4 { animation-delay: 0.45s; }
        .tier-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 18px; align-items: stretch; }
        .tier-card-popular { transform: translateY(-8px); }
        .tier-card-popular:hover { transform: translateY(-12px); }
        .tier-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .tier-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px hsl(215 40% 20% / 0.18); }
        h2 { letter-spacing: -0.02em; margin: 0; }
        h3 { letter-spacing: -0.01em; margin: 0; }
        .cta-pulse { box-shadow: 0 8px 24px hsl(38 75% 50% / 0.35), 0 0 0 0 hsl(38 75% 55% / 0.5); animation: ctaPulse 2.6s ease-out infinite; }
        @keyframes ctaPulse { 0% { box-shadow: 0 8px 24px hsl(38 75% 50% / 0.35), 0 0 0 0 hsl(38 75% 55% / 0.5); } 70% { box-shadow: 0 8px 24px hsl(38 75% 50% / 0.35), 0 0 0 14px hsl(38 75% 55% / 0); } 100% { box-shadow: 0 8px 24px hsl(38 75% 50% / 0.35), 0 0 0 0 hsl(38 75% 55% / 0); } }
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

      {/* Donation toast */}
      {toastTier && (
        <DonationToast tier={toastTier} onClose={() => setToastTier(null)} />
      )}

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
          <span style={{ color: "white", fontSize: 13, fontWeight: 700 }}>
            תנועת בני ציון
          </span>
          <span
            style={{
              background: "hsl(38 75% 55% / 0.15)",
              border: "1px solid hsl(38 75% 55% / 0.4)",
              color: "hsl(38 85% 72%)",
              borderRadius: 99,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            Headstart
          </span>
        </div>
      </nav>

      {/* ─────────────────────────────────────────
          HERO (reduced size per Saar)
      ───────────────────────────────────────── */}
      <section
        style={{
          background:
            "linear-gradient(160deg, hsl(215 55% 16%) 0%, hsl(215 50% 26%) 55%, hsl(215 40% 30%) 100%)",
          padding: "44px 24px 48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* background glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: "10%",
            width: 320,
            height: 320,
            background: "hsl(38 75% 55% / 0.07)",
            borderRadius: "50%",
            filter: "blur(90px)",
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
            gap: 40,
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
                padding: "5px 12px",
                borderRadius: 99,
                background: "hsl(38 75% 55% / 0.12)",
                border: "1px solid hsl(38 75% 55% / 0.28)",
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  background: "hsl(38 75% 55%)",
                  borderRadius: "50%",
                }}
              />
              <span
                style={{
                  color: "hsl(38 85% 72%)",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                קמפיין תמיכה · Headstart · השקה סיון תשפ"ו
              </span>
            </div>

            {/* H1 */}
            <h1
              className="fade-up fade-up-2"
              style={{
                fontWeight: 900,
                lineHeight: 1.05,
                color: "white",
                marginBottom: 18,
                letterSpacing: "-0.02em",
                margin: "0 0 18px",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "clamp(13px, 1.4vw, 17px)",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: "hsl(215 15% 78%)",
                  marginBottom: 6,
                }}
              >
                ספר חדש של הרב יואב אוריאל
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "clamp(36px, 5.5vw, 66px)",
                  background:
                    "linear-gradient(135deg, hsl(43 90% 70%), hsl(38 75% 50%))",
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
                  fontSize: "clamp(18px, 2.5vw, 28px)",
                  fontWeight: 700,
                  color: "white",
                  marginTop: 5,
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
                fontSize: 16,
                color: "hsl(215 15% 88%)",
                lineHeight: 1.7,
                marginBottom: 10,
              }}
            >
              480 עמודים על סיפור כיבוש הארץ — נכתבו פרק אחר פרק{" "}
              <strong style={{ color: "white" }}>
                בעוד הרב יואב עצמו בסבב מילואים, בגבול סוריה.
              </strong>
            </p>
            <p
              style={{
                fontSize: 14,
                color: "hsl(215 10% 72%)",
                lineHeight: 1.65,
                margin: "0 0 20px",
              }}
            >
              הספר יצא לאור. הצטרפו לקמפיין ותמכו בהוצאתו לציבור — וקבלו
              את הספר ישירות לבית.
            </p>

            <a
              href="#tiers"
              className="fade-up fade-up-4 cta-pulse"
              style={{
                display: "inline-block",
                padding: "13px 30px",
                background:
                  "linear-gradient(135deg, hsl(43 85% 60%), hsl(38 75% 50%))",
                color: "hsl(215 55% 12%)",
                fontWeight: 800,
                fontSize: 16,
                borderRadius: 99,
                textDecoration: "none",
                letterSpacing: "0.01em",
              }}
            >
              לתמיכה בספר ↓
            </a>
          </div>

          {/* VISUAL */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", maxWidth: 360, width: "100%" }}>
              {/* Floating milui badge */}
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  left: -14,
                  background: "hsl(38 75% 55%)",
                  color: "hsl(215 55% 15%)",
                  borderRadius: 12,
                  padding: "7px 12px",
                  transform: "rotate(-4deg)",
                  zIndex: 2,
                  boxShadow: "0 4px 16px hsl(38 75% 50% / 0.35)",
                }}
              >
                <p style={{ fontSize: 10, fontWeight: 700, margin: 0 }}>מילואים</p>
                <p style={{ fontSize: 18, fontWeight: 900, lineHeight: 1, margin: 0 }}>סוריה</p>
              </div>

              {/* Image frame */}
              <div
                style={{
                  borderRadius: 18,
                  overflow: "hidden",
                  border: "2px solid hsl(38 75% 55% / 0.35)",
                  boxShadow: "0 16px 48px hsl(38 75% 50% / 0.15)",
                  position: "relative",
                }}
              >
                <img
                  src="/images/yoav-campaign/yoav-with-shoftim-book.jpg"
                  alt="הרב יואב אוריאל אוחז בספר שופטים, מהמילואים בגבול סוריה"
                  style={{ width: "100%", display: "block" }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    left: 0,
                    background:
                      "linear-gradient(to top, hsl(215 55% 15% / 0.88) 0%, transparent 100%)",
                    padding: "18px 16px 14px",
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
                  <p style={{ color: "white", fontWeight: 800, fontSize: 18, margin: 0 }}>
                    הרב יואב אוריאל
                  </p>
                  <p style={{ color: "hsl(215 10% 70%)", fontSize: 12, marginTop: 2 }}>
                    תנועת בני ציון · לחיות תנ״ך
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          PROGRESS BAR (Headstart style)
      ───────────────────────────────────────── */}
      <ProgressBlock />

      {/* ─────────────────────────────────────────
          RECENT BACKERS SCROLL
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
                    width: 26,
                    height: 26,
                    background: "hsl(38 75% 55% / 0.15)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
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
                    {" "}בחר/ה «{b.tier}»
                  </span>
                  <span
                    style={{
                      color: "hsl(215 10% 45%)",
                      fontSize: 11,
                      marginInlineEnd: 6,
                    }}
                  >
                    {" "}{b.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────
          TIERS — moved up, right after hero+progress
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
              חבילות תמיכה
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
            <p
              style={{
                color: "hsl(215 25% 42%)",
                fontSize: 15,
                maxWidth: 520,
                margin: "0 auto",
              }}
            >
              מחיר מיוחד ל-200 הראשונים. לאחר מכן המחיר יעלה.
            </p>
          </div>

          <div className="tier-grid">
            {TIERS.map((tier) => (
              <TierCard key={tier.id} tier={tier} onSupport={handleSupport} />
            ))}
          </div>
        </div>
      </section>

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
            <span style={{ color: "hsl(38 75% 42%)" }}>
              נכתב תוך כדי כיבוש הארץ.
            </span>
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
            <p style={{ margin: 0 }}>
              הרב יואב מלמד תנ״ך כבר 15 שנה. בשנתיים האחרונות — תוך כדי
              המילואים ובין הסבבים — ישב וכתב ספר על יהושע. פירוש שמסתכל
              על ספר יהושע מהמקום שהרב יואב נמצא בו.
            </p>
            <p style={{ margin: 0 }}>
              לא פירוש אקדמי. לא ספר היסטוריה.{" "}
              <strong>
                פירוש שמסתכל על ספר יהושע מהמקום שהרב יואב נמצא בו — לוחם
                שמכיר את האדמה, את הגבול, את האחריות.
              </strong>
            </p>
            <p style={{ margin: 0 }}>
              הספר הזה מדבר להרבה אנשים — לא דווקא תלמידים — ועוזר להבין
              את הגודל של הרגע שאנחנו חיים בו, כשהמלחמה הזאת היא חלק
              מהסיפור.
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
              «ספר על כיבוש הארץ נכתב תוך כדי כיבוש הארץ.»
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
                — הרב יואב אוריאל
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
              <span style={{ color: "hsl(38 75% 42%)" }}>
                הספר שצריך עכשיו.
              </span>
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
                body: "480 עמודים — כל פרק נפתח לעומק. לא הערות, לא קיצורים. ספר שפותח חלון חדש ללמוד תנ״ך, פרק אחר פרק, כמו שהרב יואב מלמד בהרצאות ובשיעורי «לחיות תנ״ך».",
              },
              {
                num: "02",
                title: "רגע ההיסטוריה שלנו",
                body: "כיבוש הארץ, אחריות עם, גבול. שאלות שיהושע הפעיל לפני 3,300 שנה — ושאנחנו מפעילים שוב היום. הספר עוזר להבין את הגודל של הרגע שאנחנו חיים בו.",
              },
              {
                num: "03",
                title: "לא רק לתלמידים — לכולם",
                body: "ספר שאפשר לקרוא בסלון עם הילדים, ולהביא לשיעור בכיתה. לא רק לתלמידי חכמים — לכל מי שרוצה להבין מה קורה פה ולמה ספר יהושע הוא הסיפור שלנו.",
              },
            ].map((card) => (
              <div
                key={card.title}
                style={{
                  background:
                    "linear-gradient(180deg, hsl(38 40% 97%) 0%, hsl(38 35% 95%) 100%)",
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
                  <span
                    style={{ flex: 1, height: 1, background: "hsl(38 50% 78%)" }}
                  />
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
                <p
                  style={{
                    fontSize: 14,
                    color: "hsl(215 30% 32%)",
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
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
                  src="/images/yoav-campaign/yoav-writing-on-tank.jpg"
                  alt="הרב יואב אוריאל כותב על הטנק, מהמילואים בגבול סוריה"
                  style={{ width: "100%", display: "block" }}
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
                <p style={{ margin: 0 }}>
                  ראש תנועת בני ציון ללימוד תנ״ך. מלמד תנ״ך כבר{" "}
                  <strong>15 שנה</strong>. בתכנית{" "}
                  <strong>«לחיות תנ״ך»</strong> לומדים איתו יחד 300+ אנשים
                  — סטודנטים, אברכים, רופאים, מורים, מהנדסי הייטק. גברים
                  ונשים, מכל גווני הקשת.
                </p>
                <p style={{ margin: 0 }}>
                  ערך וכתב את הספר במהלך המילואים — פרק אחר פרק, בין סבב
                  לסבב. הספר יצא לאור.
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
                  { val: "300+", label: "לומדים פעילים" },
                  { val: "480", label: "עמודים בספר" },
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
                    <div
                      style={{ fontSize: 12, color: "hsl(215 25% 42%)", marginTop: 4 }}
                    >
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
              gridTemplateColumns: `repeat(${CAMPAIGN_PHASES.length}, 1fr)`,
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
                style={{
                  textAlign: "center",
                  position: "relative",
                  zIndex: 1,
                  padding: "0 4px",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: phase.done || phase.current
                      ? "hsl(38 75% 55%)"
                      : "white",
                    border: `2px solid ${
                      phase.done || phase.current
                        ? "hsl(38 75% 55%)"
                        : "hsl(215 15% 80%)"
                    }`,
                    margin: "0 auto 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    color:
                      phase.done || phase.current
                        ? "hsl(215 55% 15%)"
                        : "hsl(215 15% 65%)",
                    fontWeight: 700,
                    boxShadow: phase.current
                      ? "0 0 0 4px hsl(38 75% 55% / 0.2)"
                      : "none",
                  }}
                >
                  {phase.done ? "✓" : i + 1}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: phase.current ? 700 : 600,
                    color: phase.current
                      ? "hsl(215 55% 22%)"
                      : "hsl(215 30% 35%)",
                    marginBottom: 3,
                    lineHeight: 1.3,
                  }}
                >
                  {phase.label}
                </div>
                <div style={{ fontSize: 11, color: "hsl(215 20% 52%)" }}>
                  {phase.sub}
                </div>
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

        <div
          style={{
            maxWidth: 620,
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
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
            כל תמיכה עוזרת להוציא את הספר לציבור. הספר יגיע אליכם עד
            החגים — תשרי תשפ"ז.
          </p>
          <a
            href="#tiers"
            className="cta-pulse"
            style={{
              display: "inline-block",
              padding: "18px 40px",
              background:
                "linear-gradient(135deg, hsl(43 85% 60%), hsl(38 75% 50%))",
              color: "hsl(215 55% 12%)",
              fontWeight: 800,
              fontSize: 18,
              borderRadius: 99,
              textDecoration: "none",
              letterSpacing: "0.01em",
            }}
          >
            לבחירת חבילת תמיכה ↑
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
        <p style={{ fontSize: 13, color: "hsl(215 10% 50%)", margin: "0 0 16px" }}>
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
        <p style={{ fontSize: 11, color: "hsl(215 10% 35%)", margin: 0 }}>
          בני ציון · לחיות תנ״ך · 2026 · דף זה הוא sandbox בלבד — לאישור
          יואב לפני פרסום
        </p>
      </footer>

      {/* Bottom padding to clear sticky mobile bar */}
      <div style={{ height: 64 }} className="md-hide" />
    </div>
  );
}
