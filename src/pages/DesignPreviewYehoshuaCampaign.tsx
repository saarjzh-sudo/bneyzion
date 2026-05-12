/**
 * DesignPreviewYehoshuaCampaign — Sandbox only
 * Route: /design-yehoshua-campaign
 *
 * Headstart-style pre-launch page for "ספר יהושע" by Rabbi Yoav Uriel.
 * Content from STRATEGY.md + landing-page-prelaunch-v2.html — no invention.
 *
 * v2 changes (12.5.2026):
 * 1. Removed signup form — no longer on this page
 * 2. Added large Progress Bar after Hero (₪7K/₪80K, 23 donors, days remaining)
 * 3. Grow payment integration on all tier CTAs (type=product → "עם קבלה" merchant)
 * 4. Removed "חזרה לאתר" button from nav
 * 5. Toast notifications — recent donors, every ~8s
 * 6. Paamon font throughout (already was — kept and cleaned up)
 * 7. Hebrew dates corrected (launch ~כ"ח סיון תשפ"ו, end ~כ"ט תמוז תשפ"ו)
 * 8. Stretch Goals section removed
 * 9. Testimonials section removed
 * 10. New 7-tier structure: ₪90/₪120/₪220/₪400/₪800/₪1200/₪2000 with limits
 * 11. Tiers moved above story — right after Progress Bar
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useGrowPayment } from "@/hooks/useGrowPayment";

/* ─── Date calculations ──────────────────────────────────── */
// Launch: ~כ"ח סיון תשפ"ו  ≈ 2026-06-24 (Tuesday)
// End:    35 days later     ≈ 2026-07-29 = כ"ד תמוז תשפ"ו
const LAUNCH_DATE = new Date("2026-06-24T14:00:00+03:00");
const END_DATE = new Date("2026-07-29T23:59:59+03:00");
const NOW = new Date();
const msLeft = END_DATE.getTime() - NOW.getTime();
const DAYS_REMAINING = msLeft > 0 ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : 35;

/* ─── Campaign numbers (pre-launch simulation) ────────────── */
const CAMPAIGN_GOAL = 80000;
const RAISED_SO_FAR = 7000;   // ₪7,000 — "שנרגיש טוב עם עצמנו"
const DONOR_COUNT = 23;
const PROGRESS_PCT = Math.round((RAISED_SO_FAR / CAMPAIGN_GOAL) * 100);

/* ─── Types ─────────────────────────────────────────────── */
interface Tier {
  id: string;
  price: number;
  name: string;
  tagline: string;
  includes: string[];
  badge?: string;
  limit: number;
  claimed: number;  // simulated claimed spots
  highlight?: boolean;
}

interface FaqItem {
  q: string;
  a: string;
}

interface ToastMsg {
  id: number;
  text: string;
}

/* ─── Tier data (new 7-tier structure per Saar's brief) ──── */
const TIERS: Tier[] = [
  {
    id: "tier-90",
    price: 90,
    name: 'מחיר Early-Bird ל-200 הראשונים',
    tagline: "ספר יהושע פיזי עד הבית",
    includes: [
      "ספר יהושע פיזי עד הבית",
      "חיסכון של ₪30 — מחיר מיוחד בלבד",
      "זמין ל-200 הראשונים בלבד",
    ],
    badge: "early-bird",
    limit: 200,
    claimed: 5,
    highlight: false,
  },
  {
    id: "tier-120",
    price: 120,
    name: "ספר יהושע עם הקדשה",
    tagline: "ספר פיזי + הקדשה אישית",
    includes: [
      "ספר יהושע פיזי עד הבית",
      "הקדשה אישית בכתב יד של הרב יואב",
    ],
    limit: 150,
    claimed: 3,
  },
  {
    id: "tier-220",
    price: 220,
    name: "שני ספרים פיזיים",
    tagline: "ספר לי וספר לחבר",
    includes: [
      "שני ספרי יהושע פיזיים עד הבית",
      "מתנה מושלמת לחבר, לרב, לבן משפחה",
    ],
    limit: 100,
    claimed: 2,
  },
  {
    id: "tier-400",
    price: 400,
    name: "הסט המלא של בני ציון",
    tagline: "ספר יהושע + כל ספרי בני ציון",
    includes: [
      "ספר יהושע פיזי",
      "הסט המלא של ספרי ומפות בני ציון",
      "משלוח לביתכם",
    ],
    badge: "הכי פופולרי",
    limit: 50,
    claimed: 8,
    highlight: true,
  },
  {
    id: "tier-800",
    price: 800,
    name: "שני סטים מלאים",
    tagline: "לשתי משפחות — מתנה יוצאת דופן",
    includes: [
      "שני סטים מלאים של בני ציון",
      "שני ספרי יהושע פיזיים",
      "משלוח לביתכם",
    ],
    limit: 30,
    claimed: 1,
  },
  {
    id: "tier-1200",
    price: 1200,
    name: "שלושה סטים מלאים",
    tagline: "לשלוש משפחות — לחלק, להנציח, לחנך",
    includes: [
      "שלושה סטים מלאים של בני ציון",
      "שלושה ספרי יהושע פיזיים",
      "משלוח לביתכם",
    ],
    limit: 15,
    claimed: 0,
  },
  {
    id: "tier-2000",
    price: 2000,
    name: "שיעור פרטי עם הרב יואב",
    tagline: "60 דקות סטודיו — לכם בלבד",
    includes: [
      "שיעור פרטי 60 דקות עם הרב יואב (זום / פנים)",
      "ניתן להגיע עם קבוצה קטנה (עד 5 איש)",
      "מתואם לפי לוח הזמנים שלכם אחרי השחרור",
    ],
    limit: 10,
    claimed: 2,
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "מתי הקמפיין נפתח?",
    a: 'הקמפיין מתוכנן לסביבות כ"ח סיון תשפ"ו (24 ביוני 2026) — ברגע שהרב יואב חוזר משחרור. לרשומים כאן נשלח הודעה יום-יומיים לפני ההשקה.',
  },
  {
    q: "מה זה ה-Early Bird?",
    a: "200 התומכים הראשונים מקבלים את הספר ב-₪90 במקום ₪120 — חיסכון של 25%. מחיר זה זמין רק ב-48 השעות הראשונות של הקמפיין, ורק עד שייגמרו 200 העותקים.",
  },
  {
    q: 'מה זה "הסט המלא של בני ציון"?',
    a: "סט ספרי בני ציון כולל את ספרי הפרשנות, המפות, וחוברות הלימוד שיצאו לאור עד כה — ביחד עם ספר יהושע החדש. מספר הפריטים בסט יפורסם עם תחילת הקמפיין.",
  },
  {
    q: "מה זה מימון המונים בכלל?",
    a: "הדסטארט היא פלטפורמה שדרכה תוכלו לבחור חבילה ולשלם בכרטיס אשראי. אם הקמפיין מגיע ליעד — הספר יוצא לדפוס וכל התומכים מקבלים אותו. אם לא — הכל חוזר אליכם. אין סיכון.",
  },
  {
    q: "מתי הספר יגיע?",
    a: 'אם נגיע ליעד — הספר יוצא לדפוס מיד ויגיע לידי התומכים עד חנוכה תשפ"ז (כ-5 חודשים).',
  },
  {
    q: "האם ניתן להקדיש את הספר לאדם אהוב?",
    a: "כן. ב-Tier ₪120 ומעלה הרב יואב כותב הקדשה אישית בכתב ידו — להנצחה, לסבא, לרב, לחייל. ציינו את שם הנמען ברשומת התמיכה.",
  },
];

const CAMPAIGN_PHASES = [
  { label: "בניית הקמפיין", sub: "מאי 2026", done: true },
  { label: "רישום מוקדם", sub: "מאי–יוני 2026", done: true, current: true },
  { label: "השקה", sub: 'כ"ח סיון תשפ"ו', done: false },
  { label: "35 ימי גיוס", sub: "יוני–יולי 2026", done: false },
  { label: "יציאה לדפוס", sub: "אוגוסט 2026", done: false },
  { label: "ספר בידיכם", sub: 'חנוכה תשפ"ז', done: false },
];

/* ─── Toast data ─────────────────────────────────────────── */
const TOAST_MESSAGES = [
  "שרה כ. תרמה זה עתה ₪120",
  "דוד מ. תרם זה עתה ₪400",
  "משפחת לוי תרמה זה עתה ₪220",
  "רחל א. תרמה זה עתה ₪90",
  "יוסף ב. תרם זה עתה ₪800",
  "נועה ש. תרמה זה עתה ₪120",
  "אבי ו. תרם זה עתה ₪2,000",
  "משפחת כהן תרמה זה עתה ₪400",
  "מרים פ. תרמה זה עתה ₪90",
  "אורי ג. תרם זה עתה ₪1,200",
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
              {RAISED_SO_FAR > 0 ? `${PROGRESS_PCT}% ממומן` : "טרום השקה"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 13, color: "white" }}>
              <span style={{ fontWeight: 700 }}>יעד:</span>{" "}
              <span style={{ color: "hsl(38 85% 70%)" }}>₪{CAMPAIGN_GOAL.toLocaleString()}</span>
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
              תרמו עכשיו
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Progress Bar Section ──────────────────────────────── */
function ProgressSection() {
  const [animWidth, setAnimWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimWidth(PROGRESS_PCT), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      style={{
        background: "hsl(215 55% 14%)",
        padding: "32px 24px 28px",
        borderBottom: "1px solid hsl(38 75% 55% / 0.18)",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Top row: raised + goal */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 900,
                color: "hsl(38 90% 68%)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              ₪{RAISED_SO_FAR.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: "hsl(215 10% 55%)", marginTop: 4, fontWeight: 600 }}>
              גויסו מתוך ₪{CAMPAIGN_GOAL.toLocaleString()} יעד
            </div>
          </div>
          <div style={{ display: "flex", gap: 28, textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "white", lineHeight: 1 }}>
                {DONOR_COUNT}
              </div>
              <div style={{ fontSize: 12, color: "hsl(215 10% 55%)", marginTop: 4 }}>תורמים</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "white", lineHeight: 1 }}>
                {DAYS_REMAINING}
              </div>
              <div style={{ fontSize: 12, color: "hsl(215 10% 55%)", marginTop: 4 }}>ימים נותרו</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 14,
            background: "hsl(215 20% 30%)",
            borderRadius: 99,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${animWidth}%`,
              background: "linear-gradient(90deg, hsl(38 75% 45%), hsl(43 85% 62%))",
              borderRadius: 99,
              transition: "width 1.4s cubic-bezier(0.22, 1, 0.36, 1)",
              boxShadow: "0 0 16px hsl(38 75% 55% / 0.5)",
            }}
          />
        </div>

        {/* % label + Hebrew dates */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 10,
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: "hsl(38 85% 65%)" }}>
            {PROGRESS_PCT}% ממומן
          </span>
          <span style={{ fontSize: 12, color: "hsl(215 10% 45%)" }}>
            {'השקה: כ"ח סיון תשפ"ו'} · {'סיום: כ"ד תמוז תשפ"ו'}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─── Tier Card ──────────────────────────────────────────── */
function TierCard({ tier, onPledge }: { tier: Tier; onPledge: (t: Tier) => void }) {
  const isEarlyBird = tier.badge === "early-bird";
  const isPopular = tier.badge === "הכי פופולרי";
  const remaining = tier.limit - tier.claimed;
  const soldOut = remaining <= 0;

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
        opacity: soldOut ? 0.55 : 1,
      }}
    >
      {/* Badge */}
      {tier.badge && !soldOut && (
        <div
          style={{
            position: "absolute",
            top: -13,
            left: "50%",
            transform: "translateX(-50%)",
            background: isPopular
              ? "linear-gradient(135deg, hsl(43 85% 60%), hsl(38 75% 50%))"
              : "hsl(38 75% 50%)",
            color: "hsl(215 55% 12%)",
            fontSize: 11,
            fontWeight: 800,
            padding: "4px 14px",
            borderRadius: 99,
            whiteSpace: "nowrap",
            letterSpacing: "0.03em",
            boxShadow: "0 4px 12px hsl(38 75% 50% / 0.3)",
          }}
        >
          {isEarlyBird ? "Early-Bird · מחיר מיוחד ל-200 ראשונים" : "הכי פופולרי"}
        </div>
      )}

      {/* Price — prominent but paired with what you get */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span
            style={{
              fontSize: 38,
              fontWeight: 900,
              lineHeight: 1,
              color: tier.highlight || isEarlyBird ? "hsl(38 85% 70%)" : "hsl(215 55% 25%)",
            }}
          >
            ₪{tier.price.toLocaleString()}
          </span>
        </div>
        {isEarlyBird && (
          <div style={{ fontSize: 12, color: "hsl(38 75% 65%)", marginTop: 2, fontWeight: 600 }}>
            במקום ₪120 — חיסכון של ₪30
          </div>
        )}
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

      {/* Availability indicator */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: soldOut
            ? "hsl(0 55% 55%)"
            : remaining <= 5
            ? "hsl(20 85% 55%)"
            : tier.highlight || isEarlyBird
            ? "hsl(38 85% 65%)"
            : "hsl(215 25% 45%)",
          background: soldOut
            ? "hsl(0 55% 55% / 0.1)"
            : remaining <= 5
            ? "hsl(20 85% 55% / 0.12)"
            : "hsl(38 75% 55% / 0.1)",
          borderRadius: 8,
          padding: "5px 10px",
          textAlign: "center",
        }}
      >
        {soldOut
          ? "נגמר — אזל מהמלאי"
          : remaining <= 10
          ? `נשארו ${remaining} מקומות בלבד מתוך ${tier.limit}`
          : `${tier.claimed} מתוך ${tier.limit} תומכים כבר בחרו`}
      </div>

      {/* CTA */}
      <button
        disabled={soldOut}
        onClick={() => !soldOut && onPledge(tier)}
        style={{
          marginTop: "auto",
          display: "block",
          width: "100%",
          textAlign: "center",
          padding: "12px 0",
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 15,
          border: "none",
          cursor: soldOut ? "not-allowed" : "pointer",
          background: soldOut
            ? "hsl(215 10% 75%)"
            : tier.highlight || isEarlyBird
            ? "hsl(38 75% 55%)"
            : "hsl(215 55% 25%)",
          color: soldOut
            ? "hsl(215 20% 45%)"
            : tier.highlight || isEarlyBird
            ? "hsl(215 55% 15%)"
            : "white",
          transition: "opacity 0.15s",
          fontFamily: "inherit",
        }}
        onMouseOver={(e) => !soldOut && ((e.target as HTMLElement).style.opacity = "0.88")}
        onMouseOut={(e) => ((e.target as HTMLElement).style.opacity = "1")}
      >
        {soldOut ? "אזל" : "תרמו עכשיו"}
      </button>
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
              fontFamily: "inherit",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 16, color: "hsl(215 55% 22%)", flex: 1 }}>
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
        <div style={{ fontSize: 11, color: "hsl(38 85% 70%)", fontWeight: 700, marginBottom: 3 }}>
          {PROGRESS_PCT}% ממומן · {DAYS_REMAINING} ימים נותרו
        </div>
        <div style={{ height: 4, background: "hsl(215 20% 35%)", borderRadius: 4, overflow: "hidden" }}>
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
        תרמו עכשיו
      </a>
    </div>
  );
}

/* ─── Toast Notifications ─────────────────────────────── */
function ToastNotifications() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const nextId = useRef(0);
  const msgIndex = useRef(0);

  const addToast = useCallback(() => {
    const id = nextId.current++;
    const text = TOAST_MESSAGES[msgIndex.current % TOAST_MESSAGES.length];
    msgIndex.current++;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    // First toast after 3s, then every 8s
    const initial = setTimeout(addToast, 3000);
    const interval = setInterval(addToast, 8000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [addToast]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        insetInlineStart: 16,
        zIndex: 60,
        display: "flex",
        flexDirection: "column-reverse",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: "hsl(215 55% 16% / 0.96)",
            backdropFilter: "blur(12px)",
            border: "1px solid hsl(38 75% 55% / 0.35)",
            borderRadius: 12,
            padding: "10px 16px",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 4px 20px hsl(38 75% 40% / 0.2)",
            animation: "toastIn 0.35s ease-out both",
            whiteSpace: "nowrap",
            pointerEvents: "auto",
          }}
        >
          <span style={{ color: "hsl(38 85% 65%)", marginInlineEnd: 8 }}>●</span>
          {toast.text}
        </div>
      ))}
    </div>
  );
}

/* ─── Payment Modal ──────────────────────────────────────── */
function PaymentModal({
  tier,
  onClose,
}: {
  tier: Tier;
  onClose: () => void;
}) {
  const { startPayment, isLoading, error } = useGrowPayment();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  function handlePay(e: React.FormEvent) {
    e.preventDefault();
    startPayment({
      sum: tier.price,
      description: `תמיכה בקמפיין ספר יהושע — ${tier.name}`,
      fullName: name,
      phone,
      email,
      type: "product",
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "hsl(215 55% 8% / 0.82)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: "32px 28px",
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 24px 64px hsl(215 55% 10% / 0.4)",
          position: "relative",
          direction: "rtl",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            insetInlineStart: 14,
            background: "none",
            border: "none",
            fontSize: 22,
            cursor: "pointer",
            color: "hsl(215 20% 55%)",
            fontFamily: "inherit",
          }}
        >
          ×
        </button>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "hsl(38 75% 42%)", letterSpacing: "0.08em", marginBottom: 4 }}>
            תמיכה בקמפיין
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: "hsl(215 55% 18%)", margin: 0 }}>
            {tier.name}
          </h3>
          <div style={{ fontSize: 28, fontWeight: 900, color: "hsl(38 75% 42%)", marginTop: 4 }}>
            ₪{tier.price.toLocaleString()}
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "hsl(0 75% 96%)",
              border: "1px solid hsl(0 60% 85%)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "hsl(0 60% 40%)",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handlePay} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם מלא"
            required
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1.5px solid hsl(215 15% 80%)",
              fontSize: 15,
              textAlign: "right",
              outline: "none",
              fontFamily: "inherit",
              color: "hsl(215 40% 12%)",
            }}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="טלפון"
            type="tel"
            required
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1.5px solid hsl(215 15% 80%)",
              fontSize: 15,
              textAlign: "right",
              outline: "none",
              fontFamily: "inherit",
              color: "hsl(215 40% 12%)",
            }}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="אימייל (לאישור)"
            type="email"
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1.5px solid hsl(215 15% 80%)",
              fontSize: 15,
              textAlign: "right",
              outline: "none",
              fontFamily: "inherit",
              color: "hsl(215 40% 12%)",
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: "14px",
              borderRadius: 10,
              background: isLoading ? "hsl(215 15% 75%)" : "hsl(38 75% 50%)",
              color: "hsl(215 55% 15%)",
              fontWeight: 800,
              fontSize: 16,
              border: "none",
              cursor: isLoading ? "wait" : "pointer",
              fontFamily: "inherit",
              transition: "opacity 0.15s",
            }}
          >
            {isLoading ? "מתחבר לסליקה..." : `המשך לתשלום ₪${tier.price.toLocaleString()}`}
          </button>
          <p style={{ fontSize: 11, color: "hsl(215 15% 55%)", textAlign: "center", margin: 0 }}>
            סליקה מאובטחת — Grow · אשראי, ביט, Apple Pay
          </p>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function DesignPreviewYehoshuaCampaign() {
  const [scrolled, setScrolled] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      {/* Fonts + global styles */}
      <style>{`
        @font-face { font-family: 'Paamon'; src: url('https://bneyzion.vercel.app/fonts/paamon-bold-aaa.otf') format('opentype'); font-weight: 700; font-display: swap; }
        @font-face { font-family: 'Paamon'; src: url('https://bneyzion.vercel.app/fonts/paamon-regular-aaa.otf') format('opentype'); font-weight: 400; font-display: swap; }
        @font-face { font-family: 'Paamon'; src: url('https://bneyzion.vercel.app/fonts/paamon-black-aaa.otf') format('opentype'); font-weight: 900; font-display: swap; }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        a { color: inherit; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes ctaPulse { 0% { box-shadow: 0 8px 24px hsl(38 75% 50% / 0.35), 0 0 0 0 hsl(38 75% 55% / 0.5); } 70% { box-shadow: 0 8px 24px hsl(38 75% 50% / 0.35), 0 0 0 14px hsl(38 75% 55% / 0); } 100% { box-shadow: 0 8px 24px hsl(38 75% 50% / 0.35), 0 0 0 0 hsl(38 75% 55% / 0); } }
        .fade-up { animation: fadeUp 0.65s ease-out both; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.2s; }
        .fade-up-3 { animation-delay: 0.3s; }
        .fade-up-4 { animation-delay: 0.45s; }
        .tier-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 20px; align-items: stretch; }
        .tier-card-popular { transform: translateY(-8px); }
        .tier-card-popular:hover { transform: translateY(-12px); }
        .tier-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .tier-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px hsl(215 40% 20% / 0.18); }
        .cta-pulse { animation: ctaPulse 2.6s ease-out infinite; }
        h2 { letter-spacing: -0.02em; }
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
      `}</style>

      {/* Floating components */}
      <StickyBar scrolled={scrolled} />
      <StickyMobileBar />
      <ToastNotifications />
      {selectedTier && (
        <PaymentModal tier={selectedTier} onClose={() => setSelectedTier(null)} />
      )}

      {/* ── TOP NAV (no "חזרה לאתר" button) ── */}
      <nav
        style={{
          background: "hsl(215 55% 16%)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <img
          src="https://bneyzion.vercel.app/logo.svg"
          alt="בני ציון"
          style={{ height: 26 }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>
          תנועת בני ציון · קמפיין ספר יהושע
        </span>
      </nav>

      {/* ─────────────────────────────────────────
          HERO (slightly smaller — room for Progress Bar)
      ───────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(160deg, hsl(215 55% 16%) 0%, hsl(215 50% 26%) 55%, hsl(215 40% 30%) 100%)",
          padding: "44px 24px 52px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: "10%",
            width: 320,
            height: 320,
            background: "hsl(38 75% 55% / 0.07)",
            borderRadius: "50%",
            filter: "blur(100px)",
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
                marginBottom: 18,
              }}
            >
              <span style={{ width: 8, height: 8, background: "hsl(38 75% 55%)", borderRadius: "50%" }} />
              <span style={{ color: "hsl(38 85% 72%)", fontSize: 13, fontWeight: 600, letterSpacing: "0.04em" }}>
                {'קמפיין הדסטארט · השקה כ"ח סיון תשפ"ו'}
              </span>
            </div>

            <h1
              className="fade-up fade-up-2"
              style={{ fontWeight: 900, lineHeight: 1.05, color: "white", marginBottom: 18, letterSpacing: "-0.02em" }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "clamp(15px, 1.6vw, 19px)",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: "hsl(215 15% 78%)",
                  marginBottom: 8,
                }}
              >
                ספר חדש של הרב יואב אוריאל
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "clamp(40px, 6.5vw, 74px)",
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
                  fontSize: "clamp(20px, 2.8vw, 32px)",
                  fontWeight: 700,
                  color: "white",
                  marginTop: 6,
                  letterSpacing: "-0.015em",
                }}
              >
                נכתב מהשטח.
              </span>
            </h1>

            <p className="fade-up fade-up-3" style={{ fontSize: 17, color: "hsl(215 15% 88%)", lineHeight: 1.7, marginBottom: 10 }}>
              240 עמודים על סיפור כיבוש הארץ — נכתבו פרק אחר פרק{" "}
              <strong style={{ color: "white" }}>
                בעוד הרב יואב עצמו בסבב מילואים שישי, בעומק סוריה.
              </strong>
            </p>
            <p className="fade-up fade-up-3" style={{ fontSize: 15, color: "hsl(215 10% 72%)", lineHeight: 1.65, marginBottom: 0 }}>
              הספר מוכן. בחרו tier למטה — הכסף ישר לקמפיין. אם נגיע ליעד — הספר יוצא לדפוס.
            </p>

            <div className="fade-up fade-up-4" style={{ marginTop: 24 }}>
              <a
                href="#tiers"
                className="cta-pulse"
                style={{
                  display: "inline-block",
                  padding: "14px 32px",
                  background: "linear-gradient(135deg, hsl(43 85% 60%), hsl(38 75% 50%))",
                  color: "hsl(215 55% 12%)",
                  fontWeight: 800,
                  fontSize: 16,
                  borderRadius: 99,
                  textDecoration: "none",
                  letterSpacing: "0.01em",
                }}
              >
                ראו את חבילות התמיכה
              </a>
            </div>
          </div>

          {/* VISUAL */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", maxWidth: 380, width: "100%" }}>
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
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/400x500/14263F/C8A45A?text=%D7%94%D7%A8%D7%91+%D7%99%D7%95%D7%90%D7%91";
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    left: 0,
                    background: "linear-gradient(to top, hsl(215 55% 15% / 0.88) 0%, transparent 100%)",
                    padding: "20px 16px 16px",
                  }}
                >
                  <p style={{ color: "hsl(38 85% 72%)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 2 }}>
                    המחבר
                  </p>
                  <p style={{ color: "white", fontWeight: 800, fontSize: 20 }}>הרב יואב אוריאל</p>
                  <p style={{ color: "hsl(215 10% 70%)", fontSize: 12, marginTop: 2 }}>
                    תנועת בני ציון · לחיות תנ״ך
                  </p>
                </div>
              </div>

              {/* Campaign goal mini-stats */}
              <div
                style={{
                  marginTop: 14,
                  background: "hsl(215 30% 14% / 0.85)",
                  backdropFilter: "blur(12px)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  border: "1px solid hsl(215 20% 28%)",
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1px 1fr 1px 1fr",
                  gap: 10,
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "hsl(38 90% 68%)", lineHeight: 1 }}>
                    ₪80,000
                  </div>
                  <div style={{ fontSize: 11, color: "hsl(215 10% 60%)", marginTop: 3 }}>יעד הקמפיין</div>
                </div>
                <div style={{ height: 28, background: "hsl(215 20% 30%)" }} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "white", lineHeight: 1 }}>35 יום</div>
                  <div style={{ fontSize: 11, color: "hsl(215 10% 55%)", marginTop: 3 }}>משך הקמפיין</div>
                </div>
                <div style={{ height: 28, background: "hsl(215 20% 30%)" }} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "white", lineHeight: 1 }}>240</div>
                  <div style={{ fontSize: 11, color: "hsl(215 10% 55%)", marginTop: 3 }}>עמודים</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          PROGRESS BAR — prominent, full width
      ───────────────────────────────────────── */}
      <ProgressSection />

      {/* ─────────────────────────────────────────
          TIERS — right after Progress Bar
      ───────────────────────────────────────── */}
      <section
        style={{ background: "hsl(215 15% 96%)", padding: "56px 24px 72px" }}
        id="tiers"
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <p style={{ color: "hsl(38 75% 42%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", marginBottom: 8 }}>
              חבילות תמיכה
            </p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 900, color: "hsl(215 55% 22%)", lineHeight: 1.2, marginBottom: 10 }}>
              בחרו מה שנכון לכם
            </h2>
            <p style={{ color: "hsl(215 25% 42%)", fontSize: 15, maxWidth: 560, margin: "0 auto" }}>
              כל tier מוגבל במספר תומכים. ה-Early Bird (₪90) מוגבל ל-200 ראשונים.
              הסט המלא (₪400) הוא הבחירה הנפוצה ביותר.
            </p>
          </div>

          <div className="tier-grid">
            {TIERS.map((tier) => (
              <TierCard key={tier.id} tier={tier} onPledge={setSelectedTier} />
            ))}
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: "hsl(215 20% 52%)", marginTop: 24 }}>
            סליקה מאובטחת — Grow · אשראי, ביט, Apple Pay, Google Pay · All-or-Nothing: אם לא נגיע ליעד — הכל חוזר אליכם
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          THE STORY
      ───────────────────────────────────────── */}
      <section style={{ background: "hsl(38 35% 96%)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ color: "hsl(38 75% 42%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            הסיפור
          </p>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 900, color: "hsl(215 55% 22%)", lineHeight: 1.15, marginBottom: 28 }}>
            ספר על כיבוש הארץ —{" "}
            <span style={{ color: "hsl(38 75% 42%)" }}>נכתב מתוך כיבוש הארץ.</span>
          </h2>

          <div style={{ fontSize: 17, lineHeight: 1.75, color: "hsl(215 35% 18%)", display: "flex", flexDirection: "column", gap: 18 }}>
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
              <cite style={{ display: "block", fontSize: 13, fontStyle: "normal", fontWeight: 400, color: "hsl(215 25% 45%)", marginTop: 10 }}>
                — הרב יואב אוריאל, סבב מילואים 6
              </cite>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          WHY THIS BOOK
      ───────────────────────────────────────── */}
      <section style={{ background: "white", padding: "64px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p style={{ color: "hsl(38 75% 42%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", marginBottom: 8 }}>
              למה הספר הזה
            </p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 900, color: "hsl(215 55% 22%)", lineHeight: 1.2 }}>
              לא עוד ספר על יהושע.{" "}
              <span style={{ color: "hsl(38 75% 42%)" }}>הספר שצריך עכשיו.</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
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
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", color: "hsl(38 75% 42%)", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <span>{card.num}</span>
                  <span style={{ flex: 1, height: 1, background: "hsl(38 50% 78%)" }} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "hsl(215 55% 22%)", marginBottom: 8 }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: 14, color: "hsl(215 30% 32%)", lineHeight: 1.65 }}>{card.body}</p>
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
            style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 40, alignItems: "center" }}
          >
            <div>
              <div style={{ borderRadius: 18, overflow: "hidden", border: "2px solid hsl(38 50% 85%)", boxShadow: "0 8px 32px hsl(38 50% 55% / 0.1)" }}>
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
              <p style={{ color: "hsl(38 75% 42%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", marginBottom: 8 }}>
                מי כותב
              </p>
              <h2 style={{ fontSize: "clamp(24px, 3vw, 38px)", fontWeight: 900, color: "hsl(215 55% 22%)", marginBottom: 16 }}>
                הרב יואב אוריאל
              </h2>

              <div style={{ fontSize: 15, lineHeight: 1.75, color: "hsl(215 35% 22%)", display: "flex", flexDirection: "column", gap: 12 }}>
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
                    <div style={{ fontSize: 28, fontWeight: 900, color: "hsl(38 75% 42%)", lineHeight: 1 }}>
                      {s.val}
                    </div>
                    <div style={{ fontSize: 12, color: "hsl(215 25% 42%)", marginTop: 4 }}>{s.label}</div>
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
            <p style={{ color: "hsl(38 75% 42%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", marginBottom: 8 }}>
              ציר זמן
            </p>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 900, color: "hsl(215 55% 22%)" }}>
              מה קורה מתי
            </h2>
          </div>

          <div className="phases-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, position: "relative" }}>
            <div style={{ position: "absolute", top: 20, right: "8%", left: "8%", height: 2, background: "hsl(215 15% 85%)", zIndex: 0 }} />
            {CAMPAIGN_PHASES.map((phase, i) => (
              <div key={i} style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 4px" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: phase.done || phase.current ? "hsl(38 75% 55%)" : "white",
                    border: `2px solid ${phase.done || phase.current ? "hsl(38 75% 55%)" : "hsl(215 15% 80%)"}`,
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
                <div style={{ fontSize: 12, fontWeight: phase.current ? 700 : 600, color: phase.current ? "hsl(215 55% 22%)" : "hsl(215 30% 35%)", marginBottom: 3, lineHeight: 1.3 }}>
                  {phase.label}
                </div>
                <div style={{ fontSize: 11, color: "hsl(215 20% 52%)" }}>{phase.sub}</div>
                {phase.current && (
                  <div style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: "hsl(38 75% 45%)", background: "hsl(38 75% 55% / 0.1)", borderRadius: 99, padding: "1px 6px", display: "inline-block" }}>
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
            <p style={{ color: "hsl(38 75% 42%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", marginBottom: 8 }}>
              שאלות שאתם שואלים
            </p>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 900, color: "hsl(215 55% 22%)" }}>
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
          background: "linear-gradient(160deg, hsl(215 55% 16%) 0%, hsl(215 50% 26%) 55%, hsl(215 40% 30%) 100%)",
          padding: "72px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 20, right: 40, width: 280, height: 280, background: "hsl(38 75% 55% / 0.08)", borderRadius: "50%", filter: "blur(80px)" }} />

        <div style={{ maxWidth: 620, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <h2 style={{ fontSize: "clamp(28px, 4.5vw, 48px)", fontWeight: 900, color: "white", lineHeight: 1.1, marginBottom: 16 }}>
            רוצים להיות חלק מזה?
          </h2>
          <p style={{ fontSize: 17, color: "hsl(215 10% 75%)", lineHeight: 1.65, marginBottom: 32 }}>
            כל שקל עוזר להוציא את הספר לאור. ה-200 הראשונים מקבלים מחיר Early-Bird. הסט המלא (₪400) הוא הבחירה שאנשים אוהבים הכי הרבה.
          </p>
          <a
            href="#tiers"
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
            ראו את חבילות התמיכה
          </a>
          <p style={{ marginTop: 28, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: "hsl(215 10% 50%)" }}>
            בכוח התנ״ך ננצח
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          FOOTER
      ───────────────────────────────────────── */}
      <footer style={{ background: "hsl(215 55% 12%)", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ color: "white", fontWeight: 700, marginBottom: 8 }}>
          תנועת בני ציון ללימוד תנ״ך
        </p>
        <p style={{ fontSize: 13, color: "hsl(215 10% 50%)" }}>
          <a href="mailto:office@bneyzion.co.il" style={{ color: "hsl(38 75% 60%)", textDecoration: "none" }}>
            office@bneyzion.co.il
          </a>
          {" · "}
          <a href="https://bneyzion.co.il" style={{ color: "hsl(38 75% 60%)", textDecoration: "none" }}>
            bneyzion.co.il
          </a>
        </p>
        <p style={{ fontSize: 11, color: "hsl(215 10% 35%)", marginTop: 16 }}>
          בני ציון · לחיות תנ״ך · 2026 · sandbox — לאישור יואב לפני פרסום
        </p>
      </footer>

      {/* Bottom padding for sticky mobile bar */}
      <div style={{ height: 64 }} className="md-hide" />
    </div>
  );
}
