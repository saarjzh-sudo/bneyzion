/**
 * /design-donate — Donation page, redesign v4 (Yehoshua-grade).
 *
 * Sandbox preview that lifts the donate experience to the quality bar set by
 * DesignPreviewYehoshuaCampaign: an emotional, narrative-driven fundraising
 * page built around one truth — every lesson on the site is built by hand and
 * funded by people who believe Torah should be open to all.
 *
 * Structure (persuasion-first, CTA repeated):
 *   sticky bar → hero + anchor quote → live proof strip → impact tiers
 *   (click-to-fund) → 2-col story / sticky live form → transparency →
 *   recent donors (real data) → FAQ accordion → final dark CTA.
 *
 * Everything is real: DonateForm wires to Grow, proof strip + recent donors
 * read live Supabase data. No mock arrays. RTL throughout, keyboard + screen
 * reader friendly, prefers-reduced-motion respected.
 */
import { useEffect, useState } from "react";
import {
  Heart, Flame, BookOpen, Users, Mic, ShieldCheck, Award,
  CheckCircle2, ArrowLeft, Plus, ChevronDown, Sparkles,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useRecentDonations } from "@/hooks/useDonations";
import DonateForm from "@/components/donate/DonateForm";
import { useScrollReveal } from "@/components/donate/useScrollReveal";
import { useDonationStats } from "@/components/donate/useDonationStats";
import { IMPACT_TIERS, ALLOCATION, DONATE_FAQS } from "@/components/donate/donateData";
import type { ImpactTier } from "@/components/donate/donateData";

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────

function scrollToForm() {
  document.getElementById("donate-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "לפני דקות";
  if (hours < 24) {
    if (hours === 1) return "לפני שעה";
    if (hours === 2) return "לפני שעתיים";
    return `לפני ${hours} שעות`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return "לפני יום";
  if (days === 2) return "לפני יומיים";
  return `לפני ${days} ימים`;
}

const typeLabels: Record<string, string> = {
  iluy_neshama: "לעילוי נשמת",
  refua: "לרפואת",
  regular: "",
};

// ───────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────

export default function DesignPreviewDonate() {
  const [amount, setAmount] = useState<number>(180);
  const [showBar, setShowBar] = useState(false);

  const stats = useDonationStats();
  const { data: recentDonations } = useRecentDonations();

  // Sticky CTA bar appears once the hero scrolls away.
  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > 560);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const pickTier = (tier: ImpactTier) => {
    setAmount(tier.amount);
    scrollToForm();
  };

  return (
    <DesignLayout sidebar={false}>
      <PageStyles />

      {/* ── Sticky CTA bar ───────────────────────────── */}
      <div
        className="donate-sticky-bar"
        dir="rtl"
        style={{
          position: "fixed",
          insetInlineStart: 0,
          insetInlineEnd: 0,
          bottom: 0,
          zIndex: 60,
          transform: showBar ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.35s ease",
          background: "rgba(26,39,68,0.97)",
          backdropFilter: "blur(8px)",
          borderTop: `1px solid rgba(196,162,101,0.35)`,
          padding: "0.75rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: fonts.body, fontSize: "0.9rem", color: "rgba(255,255,255,0.85)" }}>
          תורה פתוחה לכולם — בזכותכם
        </span>
        <button
          type="button"
          onClick={scrollToForm}
          style={{
            padding: "0.55rem 1.5rem",
            borderRadius: radii.pill,
            border: "none",
            background: gradients.goldButton,
            color: "white",
            fontFamily: fonts.accent,
            fontWeight: 800,
            fontSize: "0.95rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <Heart size={15} fill="currentColor" aria-hidden="true" /> אני תורם
        </button>
      </div>

      {/* ── Hero ─────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          background: `linear-gradient(160deg, ${colors.navyDeep} 0%, #0F1A30 55%, ${colors.mahogany} 100%)`,
          padding: "5.5rem 2rem 5rem",
          textAlign: "center",
          color: "white",
          overflow: "hidden",
        }}
        dir="rtl"
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute", top: "-30%", insetInlineStart: "-10%",
            width: 420, height: 420, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(196,162,101,0.16), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
          <span
            className="hero-fade hero-fade-1"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.45rem",
              padding: "0.3rem 1rem", borderRadius: radii.pill,
              border: `1px solid rgba(196,162,101,0.4)`, color: colors.goldShimmer,
              fontFamily: fonts.body, fontSize: "0.75rem", fontWeight: 700,
              letterSpacing: "0.14em", marginBottom: "1.5rem",
            }}
          >
            <span className="pulse-dot" aria-hidden="true" /> תורמים מאמינים
          </span>

          <h1
            className="hero-fade hero-fade-2"
            style={{
              fontFamily: fonts.display, fontWeight: 900,
              fontSize: "clamp(2.1rem, 5vw, 3.4rem)", lineHeight: 1.22,
              margin: "0 0 1.5rem", color: "white",
            }}
          >
            כל שיעור באתר נבנה
            <br />
            <span style={{ color: colors.goldShimmer }}>בידי מי שאיכפת לו</span>
          </h1>

          {/* Anchor quote — the emotional core */}
          <p
            className="hero-fade hero-fade-3"
            style={{
              fontFamily: fonts.display, fontStyle: "italic", fontWeight: 700,
              fontSize: "clamp(1.15rem, 2.4vw, 1.5rem)", lineHeight: 1.6,
              color: colors.goldShimmer, margin: "0 auto 1.5rem", maxWidth: 600,
            }}
          >
            «תורה לא צריכה להיות מאחורי תשלום. היא צריכה להיות פתוחה — כמו שתמיד הייתה.»
          </p>

          <p
            className="hero-fade hero-fade-4"
            style={{
              fontFamily: fonts.body, fontSize: "clamp(1rem, 1.8vw, 1.15rem)",
              lineHeight: 1.85, color: "rgba(255,255,255,0.74)",
              margin: "0 auto 2.25rem", maxWidth: 560,
            }}
          >
            האתר פועל בזכות אנשים פרטיים שמאמינים בלימוד תנ"ך — בלי פרסומות, בלי
            מנויים, בלי תשלום בכניסה. התרומה שלכם היא מה שמחזיק את הדלת פתוחה.
          </p>

          <button
            type="button"
            onClick={scrollToForm}
            className="hero-fade hero-fade-5 cta-glow"
            style={{
              padding: "1rem 2.5rem", borderRadius: radii.pill, border: "none",
              background: gradients.goldButton, color: "white",
              fontFamily: fonts.accent, fontWeight: 800, fontSize: "1.15rem",
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem",
            }}
          >
            <Heart size={18} fill="currentColor" aria-hidden="true" /> אני רוצה לתמוך
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="scroll-cue" aria-hidden="true" style={{ marginTop: "2.5rem" }}>
          <ChevronDown size={22} style={{ color: "rgba(255,255,255,0.5)" }} />
        </div>
      </section>

      {/* ── Live proof strip ─────────────────────────── */}
      <ProofStrip stats={stats} />

      {/* ── Impact tiers (click-to-fund) ─────────────── */}
      <ImpactSection amount={amount} onPick={pickTier} />

      {/* ── 2-column: story + sticky form ────────────── */}
      <section style={{ background: colors.parchment, padding: "4.5rem 2rem 5rem" }} dir="rtl">
        <div
          className="donate-grid"
          style={{
            maxWidth: 1100, margin: "0 auto", display: "grid",
            gridTemplateColumns: "1fr minmax(360px, 420px)", gap: "3.5rem", alignItems: "start",
          }}
        >
          {/* Story column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2.75rem" }}>
            <StoryBlock />
            <WhyDonate />
            <MemorialCard />
            <TransparencyBlock />
            <TrustRow />
            <RecentDonors donations={recentDonations} />
          </div>

          {/* Sticky live form */}
          <div className="donate-form-col" style={{ position: "sticky", top: "5.5rem" }}>
            <DonateForm amount={amount} onAmount={setAmount} source="donate-page" />
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────── */}
      <FaqSection />

      {/* ── Final dark CTA ───────────────────────────── */}
      <FinalCta />
    </DesignLayout>
  );
}

// ───────────────────────────────────────────────────────────
// Proof strip
// ───────────────────────────────────────────────────────────

function ProofStrip({ stats }: { stats: ReturnType<typeof useDonationStats> }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""}`}
      style={{ background: "white", borderBottom: `1px solid ${colors.parchmentDeep}`, padding: "1.75rem 2rem" }}
      dir="rtl"
    >
      <div
        style={{
          maxWidth: 1000, margin: "0 auto", display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1.5rem", textAlign: "center",
        }}
      >
        <Stat icon={<BookOpen size={20} />} value="+11,000" label="שיעורים פתוחים לכולם" />
        <Stat icon={<Users size={20} />} value="+200" label="רבנים ומרצים" />
        <Stat icon={<Mic size={20} />} value="+1,300" label="סדרות לימוד" />
        {stats.ready && stats.donorCount > 0 ? (
          <Stat icon={<Heart size={20} />} value={`+${stats.donorCount.toLocaleString("he-IL")}`} label="תורמים שכבר הצטרפו" />
        ) : (
          <Stat icon={<Heart size={20} />} value="0₪" label="פרסומות באתר" />
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Impact tiers
// ───────────────────────────────────────────────────────────

function ImpactSection({ amount, onPick }: { amount: number; onPick: (t: ImpactTier) => void }) {
  const { ref, visible } = useScrollReveal();
  return (
    <section style={{ background: colors.parchmentDark, padding: "4.5rem 2rem" }} dir="rtl">
      <div ref={ref} className={`reveal ${visible ? "is-visible" : ""}`} style={{ maxWidth: 1100, margin: "0 auto" }}>
        <SectionHead eyebrow="מה התרומה בונה" title="כל סכום הופך לשיעור" />
        <p
          style={{
            fontFamily: fonts.body, fontSize: "1.05rem", lineHeight: 1.8,
            color: colors.textMid, textAlign: "center", maxWidth: 620,
            margin: "0 auto 2.75rem",
          }}
        >
          בחרו את הסכום שמתאים לכם — ותראו בדיוק מה הוא מפיק. לחיצה על כרטיס תעדכן
          את הטופס מיד.
        </p>

        <div
          style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {IMPACT_TIERS.map((tier) => {
            const active = amount === tier.amount;
            return (
              <button
                key={tier.amount}
                type="button"
                onClick={() => onPick(tier)}
                aria-pressed={active}
                className="impact-card"
                style={{
                  textAlign: "right",
                  background: tier.highlight
                    ? `linear-gradient(160deg, ${colors.navyDeep}, #0F1A30)`
                    : "white",
                  color: tier.highlight ? "white" : colors.textDark,
                  borderRadius: radii.xl,
                  padding: "1.75rem 1.5rem",
                  border: active
                    ? `2px solid ${colors.goldDark}`
                    : tier.highlight
                    ? `2px solid ${colors.goldShimmer}`
                    : `1.5px solid rgba(139,111,71,0.16)`,
                  boxShadow: tier.highlight ? shadows.goldGlow : shadows.cardSoft,
                  cursor: "pointer",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                {tier.highlight && (
                  <span
                    style={{
                      position: "absolute", top: -13, insetInlineEnd: 18,
                      padding: "0.25rem 0.85rem", borderRadius: radii.pill,
                      background: gradients.goldButton, color: "white",
                      fontFamily: fonts.body, fontSize: "0.68rem", fontWeight: 800,
                      letterSpacing: "0.08em", display: "inline-flex", alignItems: "center", gap: "0.3rem",
                    }}
                  >
                    <Sparkles size={11} aria-hidden="true" /> הכי עוזר לנו
                  </span>
                )}

                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem" }}>
                  <span style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.9rem", color: tier.highlight ? colors.goldShimmer : colors.goldDark }}>
                    {tier.amount.toLocaleString("he-IL")}₪
                  </span>
                  <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1rem", opacity: 0.9 }}>
                    {tier.name}
                  </span>
                </div>

                <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: "0.98rem", lineHeight: 1.5 }}>
                  {tier.impact}
                </div>
                <div
                  style={{
                    fontFamily: fonts.body, fontSize: "0.85rem", lineHeight: 1.6,
                    color: tier.highlight ? "rgba(255,255,255,0.7)" : colors.textMuted,
                  }}
                >
                  {tier.detail}
                </div>

                <span
                  aria-hidden="true"
                  style={{
                    marginTop: "0.4rem", display: "inline-flex", alignItems: "center", gap: "0.35rem",
                    fontFamily: fonts.body, fontSize: "0.82rem", fontWeight: 700,
                    color: tier.highlight ? colors.goldShimmer : colors.goldDark,
                  }}
                >
                  {active ? "נבחר ✓" : "בחרו סכום זה"} <ArrowLeft size={14} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Story + why + memorial + transparency
// ───────────────────────────────────────────────────────────

function StoryBlock() {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? "is-visible" : ""}`}>
      <SectionHead eyebrow="הסיפור" title="למה האתר חי מתרומות" align="right" />
      <p style={pStyle}>
        אנחנו לא ארגון ממומן ולא חברה מסחרית. כל שיעור שעולה לאתר עובר דרך ארוכה —
        הקלטה, עריכה, איורים, קריינות וקידוד — תהליך שדורש זמן וכסף אמיתיים.
      </p>
      <p style={pStyle}>
        בחרנו לא לסגור את התוכן מאחורי תשלום. כל אחד, מכל מקום, יכול להיכנס וללמוד
        בחינם. הדרך היחידה להחזיק את זה היא יחד — תרומה אחר תרומה, שיעור אחר שיעור.
      </p>
      <div
        style={{
          borderInlineStart: `3px solid ${colors.goldDark}`,
          paddingInlineStart: "1.1rem", margin: "0.5rem 0",
        }}
      >
        <p style={{ ...pStyle, margin: 0, fontFamily: fonts.display, fontStyle: "italic", fontWeight: 700, color: colors.textDark }}>
          התוכן כבר כאן. ההצטרפות שלכם היא מה שמאפשרת לו להמשיך לגדול.
        </p>
      </div>
    </div>
  );
}

const WHY_CARDS = [
  { n: "01", title: "פתוח לכל אחד", desc: "בלי מנוי, בלי תשלום בכניסה, בלי פרסומות. תנ\"ך שנמצא במרחק לחיצה מכל בית בישראל." },
  { n: "02", title: "נבנה ביד", desc: "מאחורי כל שיעור עומדים אנשים — מקליטים, עורכים, מאיירים ומקריינים. לא אלגוריתם." },
  { n: "03", title: "נשאר לתמיד", desc: "שיעור שנתרם פעם אחת ממשיך ללמד שנים. התרומה שלכם עובדת הרבה אחרי שתרמתם." },
];

function WhyDonate() {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? "is-visible" : ""}`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
      {WHY_CARDS.map((c) => (
        <div
          key={c.n}
          style={{
            background: "white", borderRadius: radii.lg, padding: "1.5rem 1.25rem",
            border: `1px solid rgba(139,111,71,0.12)`, boxShadow: shadows.cardSoft,
          }}
        >
          <div
            style={{
              width: 40, height: 40, borderRadius: radii.md, marginBottom: "0.85rem",
              background: gradients.goldButton, color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: fonts.display, fontWeight: 900, fontSize: "1rem",
            }}
            aria-hidden="true"
          >
            {c.n}
          </div>
          <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.05rem", color: colors.textDark, margin: "0 0 0.4rem" }}>
            {c.title}
          </h3>
          <p style={{ fontFamily: fonts.body, fontSize: "0.88rem", lineHeight: 1.65, color: colors.textMuted, margin: 0 }}>
            {c.desc}
          </p>
        </div>
      ))}
    </div>
  );
}

function MemorialCard() {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""}`}
      style={{
        background: `linear-gradient(135deg, ${colors.navyDeep}, #0F1A30)`,
        borderRadius: radii.xl, padding: "2.25rem", color: "white",
      }}
    >
      <Flame size={28} style={{ color: colors.goldShimmer, marginBottom: "1rem" }} aria-hidden="true" />
      <h3
        style={{
          fontFamily: fonts.display, fontWeight: 700, fontSize: "1.2rem", fontStyle: "italic",
          color: "white", margin: "0 0 0.75rem", lineHeight: 1.5,
        }}
      >
        לעילוי נשמת בן ציון חיים הנמן הי"ד
        <br />
        וסעדיה יעקב בן חיים הי"ד
      </h3>
      <p style={{ fontFamily: fonts.body, fontSize: "0.92rem", lineHeight: 1.75, color: "rgba(255,255,255,0.66)", margin: 0 }}>
        האתר מוקדש לזכר חללי בני ציון שנפלו על קידוש השם. כל שיעור שנבנה בזכות
        תרומה נצרב כשעת לימוד לעילוי נשמתם — וממשיך את דרכם.
      </p>
    </div>
  );
}

function TransparencyBlock() {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? "is-visible" : ""}`}>
      <SectionHead eyebrow="שקיפות מלאה" title="לאן הולך כל שקל" align="right" />
      <div
        style={{
          background: "white", borderRadius: radii.xl, padding: "1.75rem",
          border: `1px solid rgba(139,111,71,0.12)`, boxShadow: shadows.cardSoft,
          display: "flex", flexDirection: "column", gap: "1.1rem",
        }}
      >
        {ALLOCATION.map((slice) => (
          <div key={slice.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <span style={{ fontFamily: fonts.body, fontSize: "0.92rem", fontWeight: 600, color: colors.textDark }}>
                {slice.label}
              </span>
              <span style={{ fontFamily: fonts.display, fontSize: "0.95rem", fontWeight: 800, color: colors.goldDark }}>
                {slice.percent}%
              </span>
            </div>
            <div
              role="presentation"
              style={{ height: 8, borderRadius: radii.pill, background: colors.parchmentDeep, overflow: "hidden" }}
            >
              <div
                className={`alloc-bar ${visible ? "is-visible" : ""}`}
                style={{ height: "100%", borderRadius: radii.pill, background: gradients.goldButton, width: visible ? `${slice.percent}%` : "0%" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustRow() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
      <TrustCard icon={<ShieldCheck size={20} />} label="תשלום מאובטח" sub="SSL / PCI" />
      <TrustCard icon={<CheckCircle2 size={20} />} label="זיכוי מס סעיף 46" sub="עמותה מוכרת" />
      <TrustCard icon={<Award size={20} />} label="קבלה מיידית" sub="למייל שלכם" />
    </div>
  );
}

function RecentDonors({ donations }: { donations: ReturnType<typeof useRecentDonations>["data"] }) {
  if (!donations || donations.length === 0) return null;
  return (
    <div
      style={{
        background: "white", borderRadius: radii.xl, padding: "1.75rem",
        border: `1px solid rgba(139,111,71,0.1)`, boxShadow: shadows.cardSoft,
      }}
    >
      <h3 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1.05rem", color: colors.textDark, margin: "0 0 1.1rem" }}>
        תורמים אחרונים
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {donations.slice(0, 5).map((d) => (
          <div key={d.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.88rem" }}>
            <Heart size={14} style={{ color: colors.goldDark, marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.textDark }}>
                {d.donor_name || "אנונימי"}
              </span>
              <span style={{ color: colors.textMuted }}> תרמ/ה </span>
              <span style={{ fontFamily: fonts.display, fontWeight: 800, color: colors.goldDark }}>
                ₪{Number(d.amount).toLocaleString()}
              </span>
              {d.dedication_name && (
                <span style={{ color: colors.textSubtle, fontSize: "0.78rem", display: "block" }}>
                  {typeLabels[d.dedication_type]} {d.dedication_name}
                </span>
              )}
            </div>
            <span style={{ fontSize: "0.72rem", color: colors.textSubtle, flexShrink: 0 }}>
              {timeAgo(d.created_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// FAQ
// ───────────────────────────────────────────────────────────

function FaqSection() {
  const { ref, visible } = useScrollReveal();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section style={{ background: colors.parchment, padding: "4.5rem 2rem" }} dir="rtl">
      <div ref={ref} className={`reveal ${visible ? "is-visible" : ""}`} style={{ maxWidth: 720, margin: "0 auto" }}>
        <SectionHead eyebrow="שאלות נפוצות" title="כל מה שרציתם לדעת" />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "2rem" }}>
          {DONATE_FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                style={{
                  background: "white", borderRadius: radii.lg,
                  border: `1px solid rgba(139,111,71,0.14)`, overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-q-${i}`}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: "1rem", padding: "1.15rem 1.4rem", background: "transparent", border: "none",
                    cursor: "pointer", textAlign: "right",
                    fontFamily: fonts.display, fontWeight: 700, fontSize: "1.05rem", color: colors.textDark,
                  }}
                >
                  {faq.q}
                  <Plus
                    size={18}
                    aria-hidden="true"
                    style={{
                      flexShrink: 0, color: colors.goldDark,
                      transform: isOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s",
                    }}
                  />
                </button>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                  hidden={!isOpen}
                  style={{ padding: isOpen ? "0 1.4rem 1.3rem" : "0 1.4rem" }}
                >
                  <p style={{ fontFamily: fonts.body, fontSize: "0.95rem", lineHeight: 1.8, color: colors.textMid, margin: 0 }}>
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Final CTA
// ───────────────────────────────────────────────────────────

function FinalCta() {
  const { ref, visible } = useScrollReveal();
  return (
    <section
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""}`}
      style={{
        position: "relative", overflow: "hidden",
        background: `linear-gradient(160deg, ${colors.navyDeep} 0%, #0F1A30 100%)`,
        padding: "5rem 2rem", textAlign: "center", color: "white",
      }}
      dir="rtl"
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute", bottom: "-40%", insetInlineEnd: "-10%",
          width: 480, height: 480, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(196,162,101,0.14), transparent 70%)",
        }}
      />
      <div style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
        <span
          style={{
            display: "inline-block", padding: "0.3rem 1rem", borderRadius: radii.pill,
            border: `1px solid rgba(196,162,101,0.4)`, color: colors.goldShimmer,
            fontFamily: fonts.body, fontSize: "0.72rem", fontWeight: 700,
            letterSpacing: "0.12em", marginBottom: "1.5rem",
          }}
        >
          הדלת פתוחה בזכותכם
        </span>
        <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.8rem, 4vw, 2.6rem)", lineHeight: 1.3, margin: "0 0 1.25rem" }}>
          תורה פתוחה לכולם — מתחילה בכם
        </h2>
        <p style={{ fontFamily: fonts.body, fontSize: "1.1rem", lineHeight: 1.85, color: "rgba(255,255,255,0.74)", margin: "0 auto 2.25rem", maxWidth: 520 }}>
          תרומה אחת מחזיקה שיעור. הוראת קבע מחזיקה סדרה שלמה. בחרו את הדרך שלכם
          להיות שותפים.
        </p>
        <button
          type="button"
          onClick={scrollToForm}
          className="cta-glow"
          style={{
            padding: "1rem 2.5rem", borderRadius: radii.pill, border: "none",
            background: gradients.goldButton, color: "white",
            fontFamily: fonts.accent, fontWeight: 800, fontSize: "1.15rem",
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem",
          }}
        >
          <Heart size={18} fill="currentColor" aria-hidden="true" /> לתרומה
        </button>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Small shared bits
// ───────────────────────────────────────────────────────────

function SectionHead({ eyebrow, title, align = "center" }: { eyebrow: string; title: string; align?: "center" | "right" }) {
  return (
    <div style={{ textAlign: align, marginBottom: align === "center" ? "0.5rem" : "1.1rem" }}>
      <span
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          fontFamily: fonts.body, fontSize: "0.75rem", fontWeight: 800,
          letterSpacing: "0.12em", color: colors.goldDark, marginBottom: "0.6rem",
        }}
      >
        <span className="pulse-dot pulse-dot-gold" aria-hidden="true" /> {eyebrow}
      </span>
      <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.5rem, 2.8vw, 2.05rem)", color: colors.textDark, margin: 0 }}>
        {title}
      </h2>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
      <span style={{ color: colors.goldDark }} aria-hidden="true">{icon}</span>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.6rem", color: colors.textDark, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted }}>{label}</div>
    </div>
  );
}

function TrustCard({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem",
        padding: "1rem 0.75rem", background: colors.parchmentDark, borderRadius: radii.lg, textAlign: "center",
      }}
    >
      <span style={{ color: colors.goldDark }} aria-hidden="true">{icon}</span>
      <div style={{ fontFamily: fonts.body, fontSize: "0.8rem", fontWeight: 700, color: colors.textDark }}>{label}</div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textSubtle }}>{sub}</div>
    </div>
  );
}

const pStyle: React.CSSProperties = {
  fontFamily: fonts.body, fontSize: "1rem", lineHeight: 1.85, color: colors.textMid, margin: "0 0 1.1rem",
};

// ───────────────────────────────────────────────────────────
// Page-level styles (animations + responsive)
// ───────────────────────────────────────────────────────────

function PageStyles() {
  return (
    <style>{`
      @keyframes donateFadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes donatePulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } }
      @keyframes donateBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
      @keyframes donateGlow { 0%,100% { box-shadow: 0 4px 24px rgba(196,162,101,0.35); } 50% { box-shadow: 0 6px 34px rgba(196,162,101,0.6); } }

      .hero-fade { opacity: 0; animation: donateFadeUp 0.7s ease-out both; }
      .hero-fade-1 { animation-delay: 0.1s; }
      .hero-fade-2 { animation-delay: 0.22s; }
      .hero-fade-3 { animation-delay: 0.34s; }
      .hero-fade-4 { animation-delay: 0.46s; }
      .hero-fade-5 { animation-delay: 0.58s; }

      .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: ${colors.goldShimmer}; display: inline-block; animation: donatePulse 2s ease-in-out infinite; }
      .pulse-dot-gold { background: ${colors.goldDark}; }

      .scroll-cue { animation: donateBounce 2.2s ease-in-out infinite; }
      .cta-glow { animation: donateGlow 2.8s ease-in-out infinite; }
      .cta-glow:hover { animation: none; }

      .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.7s ease, transform 0.7s ease; }
      .reveal.is-visible { opacity: 1; transform: translateY(0); }

      .alloc-bar { transition: width 1s ease 0.2s; }

      .impact-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
      .impact-card:hover { transform: translateY(-4px); }

      @media (max-width: 768px) {
        .donate-grid { grid-template-columns: 1fr !important; }
        .donate-grid > .donate-form-col { order: -1; }
        .donate-grid > .donate-form-col > div { position: static !important; }
      }

      @media (prefers-reduced-motion: reduce) {
        .hero-fade, .pulse-dot, .scroll-cue, .cta-glow, .reveal, .alloc-bar, .impact-card { animation: none !important; transition: none !important; opacity: 1 !important; transform: none !important; }
      }
    `}</style>
  );
}
