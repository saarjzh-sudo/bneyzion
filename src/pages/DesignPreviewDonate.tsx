/**
 * /design-donate — Donation page, redesigned.
 */
import { useState } from "react";
import { Heart, Flame, Shield, Award, CheckCircle2, Sparkles } from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";

const PRESETS = [50, 100, 180, 360, 540, 1000];

export default function DesignPreviewDonate() {
  const [amount, setAmount] = useState<number>(180);
  const [recurring, setRecurring] = useState(false);
  const [dedication, setDedication] = useState("");

  return (
    <DesignLayout>
      <DesignPageHero
        variant="navy"
        eyebrow="תורמים מאמינים"
        title="כל שיעור באתר נבנה בידי מי שאיכפת לו"
        subtitle="האתר שלנו לא תלוי בפרסומות, לא במנויים, ולא בארגון מסודר. הוא פועל בזכות תרומות של אנשים פרטיים שמאמינים שתורה צריכה להיות נגישה לכולם."
      >
        <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button style={{ padding: "0.85rem 2rem", borderRadius: radii.lg, border: "none", background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "1rem", cursor: "pointer", boxShadow: shadows.goldGlow, display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <Heart size={16} fill="currentColor" /> תרום עכשיו
          </button>
          <button style={{ padding: "0.85rem 1.6rem", borderRadius: radii.lg, border: "1.5px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", color: "white", fontFamily: fonts.accent, fontSize: "0.95rem", fontWeight: 700, cursor: "pointer" }}>
            עוד על התמיכה
          </button>
        </div>
      </DesignPageHero>

      {/* Donate form */}
      <section style={{ background: colors.parchment, padding: "4rem 1.5rem 3rem" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }} dir="rtl">
          <div
            style={{
              background: "white",
              borderRadius: radii.xl,
              padding: "2rem",
              border: `1px solid rgba(139,111,71,0.12)`,
              boxShadow: "0 12px 40px rgba(45,31,14,0.08)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.85rem", borderRadius: radii.pill, background: "rgba(196,162,101,0.12)", color: colors.goldDark, fontFamily: fonts.body, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.85rem" }}>
                <Flame size={11} /> תרומה לאתר
              </div>
              <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.4rem, 2.8vw, 2rem)", color: colors.textDark, margin: 0 }}>
                בחר את גובה התרומה
              </h2>
            </div>

            {/* Recurring toggle */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
              <div style={{ display: "inline-flex", padding: 4, background: colors.parchmentDark, borderRadius: radii.md }}>
                <button
                  onClick={() => setRecurring(false)}
                  style={{
                    padding: "0.55rem 1.25rem",
                    borderRadius: radii.sm,
                    border: "none",
                    background: !recurring ? "white" : "transparent",
                    color: !recurring ? colors.textDark : colors.textMuted,
                    fontFamily: fonts.body,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: !recurring ? shadows.cardSoft : "none",
                  }}
                >
                  חד פעמי
                </button>
                <button
                  onClick={() => setRecurring(true)}
                  style={{
                    padding: "0.55rem 1.25rem",
                    borderRadius: radii.sm,
                    border: "none",
                    background: recurring ? "white" : "transparent",
                    color: recurring ? colors.textDark : colors.textMuted,
                    fontFamily: fonts.body,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: recurring ? shadows.cardSoft : "none",
                  }}
                >
                  הוראת קבע חודשית
                </button>
              </div>
            </div>

            {/* Preset amounts */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.65rem", marginBottom: "1.25rem" }}>
              {PRESETS.map((p) => {
                const active = amount === p;
                return (
                  <button
                    key={p}
                    onClick={() => setAmount(p)}
                    style={{
                      padding: "1.1rem 0.5rem",
                      borderRadius: radii.lg,
                      border: active ? `2px solid ${colors.goldDark}` : `1.5px solid rgba(139,111,71,0.2)`,
                      background: active ? "rgba(196,162,101,0.08)" : "white",
                      color: active ? colors.goldDark : colors.textDark,
                      fontFamily: fonts.display,
                      fontWeight: 800,
                      fontSize: "1.4rem",
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
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                או בחר סכום אחר
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", fontFamily: fonts.display, fontSize: "1.1rem", color: colors.textMuted }}>
                  ₪
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  style={{
                    width: "100%",
                    padding: "0.85rem 2rem 0.85rem 1rem",
                    borderRadius: radii.md,
                    border: `1.5px solid ${colors.parchmentDeep}`,
                    background: "white",
                    fontFamily: fonts.display,
                    fontWeight: 700,
                    fontSize: "1.2rem",
                    color: colors.textDark,
                    outline: "none",
                    direction: "rtl",
                  }}
                />
              </div>
            </div>

            {/* Dedication */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                הקדש את התרומה (לא חובה)
              </label>
              <input
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
                placeholder="למשל: לעילוי נשמת ..."
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  borderRadius: radii.md,
                  border: `1.5px solid ${colors.parchmentDeep}`,
                  background: "white",
                  fontFamily: fonts.body,
                  fontSize: "0.95rem",
                  color: colors.textDark,
                  outline: "none",
                  direction: "rtl",
                }}
              />
            </div>

            <button
              style={{
                width: "100%",
                padding: "1.05rem",
                borderRadius: radii.lg,
                border: "none",
                background: gradients.goldButton,
                color: "white",
                fontFamily: fonts.accent,
                fontWeight: 800,
                fontSize: "1.1rem",
                cursor: "pointer",
                boxShadow: shadows.goldGlow,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <Heart size={18} fill="currentColor" />
              תרום {amount.toLocaleString("he-IL")}₪{recurring ? " לחודש" : ""}
            </button>

            <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
              <Trust icon={<Shield size={14} />} label="מאובטח" />
              <Trust icon={<CheckCircle2 size={14} />} label="זיכוי 46%" />
              <Trust icon={<Award size={14} />} label="קבלה מיידית" />
            </div>
          </div>
        </div>
      </section>

      {/* What your donation does */}
      <section style={{ background: colors.parchmentDark, padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }} dir="rtl">
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <Sparkles style={{ width: 28, height: 28, color: colors.goldDark, margin: "0 auto 0.5rem" }} />
            <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              למה זה הולך
            </div>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)", color: colors.textDark, margin: 0 }}>
              התרומה שלך נכנסת ישירות לקלטה ולעריכה
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
            <Impact amount="50₪" desc="הקלטה ועריכה של שיעור אחד" />
            <Impact amount="180₪" desc="עריכת מצגת שיעור עם איורים" />
            <Impact amount="360₪" desc="הסבת שיעור לתסריט וקריינות" />
            <Impact amount="1,000₪" desc="הפקת פרק שלם בקורס דיגיטלי" />
          </div>
        </div>
      </section>

      {/* Memorial appeal */}
      <section style={{ background: gradients.warmDark, padding: "4rem 1.5rem", color: "white" }} dir="rtl">
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <Flame style={{ width: 32, height: 32, color: colors.goldShimmer, margin: "0 auto 1rem" }} />
          <h2 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1.6rem", margin: "0 0 1rem", fontStyle: "italic" }}>
            לעילוי נשמת בן ציון חיים הנמן הי״ד וסעדיה יעקב בן חיים הי״ד
          </h2>
          <p style={{ fontFamily: fonts.body, fontSize: "1rem", lineHeight: 1.85, color: "rgba(255,255,255,0.7)" }}>
            האתר מוקדש לזכרם של חיילי בני ציון שנפלו על קידוש השם.
            כל שיעור שתורמים נצרב כשעת לימוד לעילוי נשמתם.
          </p>
        </div>
      </section>
    </DesignLayout>
  );
}

function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "center", padding: "0.55rem", background: "rgba(196,162,101,0.06)", borderRadius: radii.sm, fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted, fontWeight: 600 }}>
      <span style={{ color: colors.goldDark }}>{icon}</span>
      {label}
    </div>
  );
}

function Impact({ amount, desc }: { amount: string; desc: string }) {
  return (
    <div style={{ background: "white", borderRadius: radii.lg, padding: "1.5rem", border: `1px solid rgba(139,111,71,0.1)`, textAlign: "center", boxShadow: shadows.cardSoft }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.8rem", color: colors.goldDark, marginBottom: "0.5rem" }}>
        {amount}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.88rem", lineHeight: 1.6, color: colors.textMid }}>
        {desc}
      </div>
    </div>
  );
}
