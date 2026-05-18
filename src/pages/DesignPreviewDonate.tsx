/**
 * /design-donate — Donation page, redesigned v3.
 *
 * Layout philosophy: destination page — no sidebar, full canvas.
 * Desktop: 2-column. Left (RTL: right) = story + impact + trust.
 *          Right (RTL: left) = sticky form card.
 * Mobile:  single column, form first.
 */
import { useState } from "react";
import { Heart, Flame, Shield, Award, CheckCircle2, Users, BookOpen, Mic } from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";

const PRESETS = [50, 100, 180, 360, 540, 1000];

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function DesignPreviewDonate() {
  const [amount, setAmount] = useState<number>(180);
  const [recurring, setRecurring] = useState(false);
  const [dedication, setDedication] = useState("");

  return (
    <DesignLayout sidebar={false}>
      {/* ── Hero ──────────────────────────────────── */}
      <section
        style={{
          background: `linear-gradient(160deg, ${colors.navyDeep} 0%, #0F1A30 55%, ${colors.mahogany} 100%)`,
          padding: "5rem 2rem 4.5rem",
          textAlign: "center",
          color: "white",
        }}
        dir="rtl"
      >
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <span
            style={{
              display: "inline-block",
              padding: "0.3rem 1rem",
              borderRadius: radii.pill,
              border: `1px solid rgba(196,162,101,0.4)`,
              color: colors.goldShimmer,
              fontFamily: fonts.body,
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "1.5rem",
            }}
          >
            תורמים מאמינים
          </span>

          <h1
            style={{
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: "clamp(2rem, 4.5vw, 3rem)",
              lineHeight: 1.25,
              margin: "0 0 1.25rem",
              color: "white",
            }}
          >
            כל שיעור באתר נבנה
            <br />
            <span style={{ color: colors.goldShimmer }}>בידי מי שאיכפת לו</span>
          </h1>

          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "clamp(1rem, 1.8vw, 1.15rem)",
              lineHeight: 1.85,
              color: "rgba(255,255,255,0.72)",
              margin: "0 auto",
              maxWidth: 560,
            }}
          >
            האתר פועל בזכות תרומות של אנשים פרטיים שמאמינים שתורה צריכה
            להיות נגישה לכולם — ללא פרסומות, ללא מנויים.
          </p>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────── */}
      <div
        style={{
          background: "white",
          borderBottom: `1px solid ${colors.parchmentDeep}`,
          padding: "1.25rem 2rem",
        }}
        dir="rtl"
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            justifyContent: "center",
            gap: "clamp(2rem, 6vw, 5rem)",
            flexWrap: "wrap",
          }}
        >
          <Stat icon={<BookOpen size={18} />} value="11,800+" label="שיעורים באתר" />
          <Stat icon={<Users size={18} />} value="200+" label="רבנים ומרצים" />
          <Stat icon={<Mic size={18} />} value="שנות" label="הקלטה ועריכה" />
        </div>
      </div>

      {/* ── Main 2-column section ─────────────────── */}
      <section
        style={{
          background: colors.parchment,
          padding: "4.5rem 2rem 5rem",
        }}
        dir="rtl"
      >
        <div
          style={{
            maxWidth: 1060,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr minmax(340px, 400px)",
            gap: "3.5rem",
            alignItems: "start",
          }}
          className="donate-grid"
        >
          {/* ─── Left column: story + impact ──────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
            {/* Why donate */}
            <div>
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: "clamp(1.5rem, 2.8vw, 2rem)",
                  color: colors.textDark,
                  margin: "0 0 1rem",
                }}
              >
                למה כדאי לתמוך?
              </h2>
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: "1rem",
                  lineHeight: 1.85,
                  color: colors.textMid,
                  margin: "0 0 1.5rem",
                }}
              >
                אנחנו לא ארגון ממומן. כל שיעור שעולה לאתר עבר הקלטה, עריכה,
                וקידוד — תהליך שעולה זמן וכסף. התרומה שלך מאפשרת לנו להמשיך
                לבנות, לשדרג, ולהנגיש תוכן לכלל ישראל.
              </p>

              {/* Impact blocks */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <ImpactRow amount="50₪" desc="הקלטה ועריכה של שיעור אחד" />
                <ImpactRow amount="180₪" desc="עריכת מצגת שיעור עם איורים" />
                <ImpactRow amount="360₪" desc="הסבת שיעור לתסריט וקריינות" />
                <ImpactRow amount="1,000₪" desc="הפקת פרק שלם בקורס דיגיטלי" />
              </div>
            </div>

            {/* Memorial */}
            <div
              style={{
                background: `linear-gradient(135deg, ${colors.navyDeep}, #0F1A30)`,
                borderRadius: radii.xl,
                padding: "2.25rem",
                color: "white",
              }}
            >
              <Flame size={28} style={{ color: colors.goldShimmer, marginBottom: "1rem" }} />
              <h3
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: "1.2rem",
                  fontStyle: "italic",
                  color: "white",
                  margin: "0 0 0.75rem",
                }}
              >
                לעילוי נשמת בן ציון חיים הנמן הי״ד
                <br />
                וסעדיה יעקב בן חיים הי״ד
              </h3>
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.92rem",
                  lineHeight: 1.75,
                  color: "rgba(255,255,255,0.65)",
                  margin: 0,
                }}
              >
                האתר מוקדש לזכרם של חיילי בני ציון שנפלו על קידוש השם.
                כל שיעור שתורמים נצרב כשעת לימוד לעילוי נשמתם.
              </p>
            </div>

            {/* Trust signals */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
              }}
            >
              <TrustCard icon={<Shield size={20} />} label="תשלום מאובטח" sub="SSL / PCI" />
              <TrustCard icon={<CheckCircle2 size={20} />} label="זיכוי מס 46%" sub="עמותה מוכרת" />
              <TrustCard icon={<Award size={20} />} label="קבלה מיידית" sub="למייל שלך" />
            </div>
          </div>

          {/* ─── Right column: sticky form ──────────── */}
          <div style={{ position: "sticky", top: "5.5rem" }}>
            <DonateForm
              amount={amount}
              recurring={recurring}
              dedication={dedication}
              onAmount={setAmount}
              onRecurring={setRecurring}
              onDedication={setDedication}
            />
          </div>
        </div>
      </section>

      {/* Mobile responsive: stack form above story */}
      <style>{`
        @media (max-width: 768px) {
          .donate-grid {
            grid-template-columns: 1fr !important;
          }
          .donate-grid > div:last-child {
            order: -1;
          }
          .donate-grid > div:last-child > div {
            position: static !important;
          }
        }
      `}</style>
    </DesignLayout>
  );
}

// ─────────────────────────────────────────────
// DonateForm — isolated sticky card
// ─────────────────────────────────────────────
interface DonateFormProps {
  amount: number;
  recurring: boolean;
  dedication: string;
  onAmount: (n: number) => void;
  onRecurring: (b: boolean) => void;
  onDedication: (s: string) => void;
}

function DonateForm({
  amount,
  recurring,
  dedication,
  onAmount,
  onRecurring,
  onDedication,
}: DonateFormProps) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: radii.xl,
        padding: "2.5rem 2rem",
        border: `1px solid rgba(139,111,71,0.14)`,
        boxShadow: "0 20px 60px rgba(45,31,14,0.10), 0 4px 16px rgba(45,31,14,0.06)",
      }}
      dir="rtl"
    >
      {/* Form header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.3rem 0.9rem",
            borderRadius: radii.pill,
            background: `rgba(196,162,101,0.12)`,
            color: colors.goldDark,
            fontFamily: fonts.body,
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: "0.75rem",
          }}
        >
          <Flame size={11} /> תרומה לאתר
        </div>
        <h2
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: "1.55rem",
            color: colors.textDark,
            margin: 0,
          }}
        >
          בחר את גובה התרומה
        </h2>
      </div>

      {/* Recurring toggle */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
        <div
          style={{
            display: "inline-flex",
            padding: 4,
            background: colors.parchmentDark,
            borderRadius: radii.md,
          }}
        >
          {[
            { label: "חד פעמי", val: false },
            { label: "הוראת קבע", val: true },
          ].map(({ label, val }) => {
            const active = recurring === val;
            return (
              <button
                key={label}
                onClick={() => onRecurring(val)}
                style={{
                  padding: "0.55rem 1.25rem",
                  borderRadius: radii.sm,
                  border: "none",
                  background: active ? "white" : "transparent",
                  color: active ? colors.textDark : colors.textMuted,
                  fontFamily: fonts.body,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: active ? shadows.cardSoft : "none",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.65rem",
          marginBottom: "1.25rem",
        }}
      >
        {PRESETS.map((p) => {
          const active = amount === p;
          return (
            <button
              key={p}
              onClick={() => onAmount(p)}
              style={{
                padding: "1rem 0.5rem",
                borderRadius: radii.lg,
                border: active
                  ? `2px solid ${colors.goldDark}`
                  : `1.5px solid rgba(139,111,71,0.2)`,
                background: active ? `rgba(196,162,101,0.09)` : "white",
                color: active ? colors.goldDark : colors.textDark,
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: "1.35rem",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {p.toLocaleString("he-IL")}₪
            </button>
          );
        })}
      </div>

      {/* Custom amount */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label
          style={{
            fontFamily: fonts.body,
            fontSize: "0.82rem",
            color: colors.textMuted,
            fontWeight: 600,
            display: "block",
            marginBottom: "0.4rem",
          }}
        >
          או הקלד סכום אחר
        </label>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              insetInlineEnd: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontFamily: fonts.display,
              fontSize: "1.1rem",
              color: colors.textMuted,
              pointerEvents: "none",
            }}
          >
            ₪
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => onAmount(Number(e.target.value) || 0)}
            style={{
              width: "100%",
              padding: "0.85rem 1rem 0.85rem 2.5rem",
              borderRadius: radii.md,
              border: `1.5px solid ${colors.parchmentDeep}`,
              background: "white",
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "1.15rem",
              color: colors.textDark,
              outline: "none",
              direction: "rtl",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Dedication */}
      <div style={{ marginBottom: "1.75rem" }}>
        <label
          style={{
            fontFamily: fonts.body,
            fontSize: "0.82rem",
            color: colors.textMuted,
            fontWeight: 600,
            display: "block",
            marginBottom: "0.4rem",
          }}
        >
          הקדש את התרומה (לא חובה)
        </label>
        <input
          value={dedication}
          onChange={(e) => onDedication(e.target.value)}
          placeholder="למשל: לעילוי נשמת ..."
          style={{
            width: "100%",
            padding: "0.85rem 1rem",
            borderRadius: radii.md,
            border: `1.5px solid ${colors.parchmentDeep}`,
            background: "white",
            fontFamily: fonts.body,
            fontSize: "0.92rem",
            color: colors.textDark,
            outline: "none",
            direction: "rtl",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* CTA */}
      <button
        style={{
          width: "100%",
          padding: "1.1rem",
          borderRadius: radii.lg,
          border: "none",
          background: gradients.goldButton,
          color: "white",
          fontFamily: fonts.accent,
          fontWeight: 800,
          fontSize: "1.15rem",
          cursor: "pointer",
          boxShadow: shadows.goldGlow,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          letterSpacing: "0.01em",
        }}
      >
        <Heart size={18} fill="currentColor" />
        תרום {amount.toLocaleString("he-IL")}₪{recurring ? " לחודש" : ""}
      </button>

      <p
        style={{
          textAlign: "center",
          fontFamily: fonts.body,
          fontSize: "0.75rem",
          color: colors.textSubtle,
          margin: "1rem 0 0",
        }}
      >
        תשלום מאובטח · קבלה מיידית למייל · זיכוי מס 46%
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.65rem",
        color: colors.textMid,
      }}
    >
      <span style={{ color: colors.goldDark }}>{icon}</span>
      <div>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: "1.3rem",
            color: colors.textDark,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: "0.8rem",
            color: colors.textMuted,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function ImpactRow({ amount, desc }: { amount: string; desc: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "1rem 1.25rem",
        background: "white",
        borderRadius: radii.lg,
        border: `1px solid rgba(139,111,71,0.1)`,
        boxShadow: shadows.cardSoft,
      }}
    >
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: "1.4rem",
          color: colors.goldDark,
          minWidth: "4.5rem",
          flexShrink: 0,
        }}
      >
        {amount}
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: "0.92rem",
          lineHeight: 1.6,
          color: colors.textMid,
        }}
      >
        {desc}
      </div>
    </div>
  );
}

function TrustCard({
  icon,
  label,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.35rem",
        padding: "1rem 0.75rem",
        background: colors.parchmentDark,
        borderRadius: radii.lg,
        textAlign: "center",
      }}
    >
      <span style={{ color: colors.goldDark }}>{icon}</span>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: "0.8rem",
          fontWeight: 700,
          color: colors.textDark,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: "0.72rem",
          color: colors.textSubtle,
        }}
      >
        {sub}
      </div>
    </div>
  );
}
