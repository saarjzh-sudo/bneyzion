/**
 * /design-donate — Donation page, redesign v5 (warm bet-midrash edition).
 *
 * A real request from a house of Torah study — not a sales page. Illuminated,
 * inviting, human: a video-lit hero, real photos of Rav Yoav, real learner
 * testimonials from the weekly-chapter program, and the Saadia memorial.
 *
 * Structure:
 *   sticky join-bar → video hero → proof strip → impact tiers (click-to-fund)
 *   → story + Rav Yoav photo / sticky live form → Rav Yoav reel → why (3) →
 *   testimonials → Saadia memorial → transparency → FAQ → warm final CTA.
 *
 * Everything real: DonateForm wires to Grow; proof strip + recent donors read
 * live Supabase. Copy voice + memorial by Saar. RTL, keyboard/SR friendly,
 * prefers-reduced-motion respected.
 */
import { useEffect, useState } from "react";
import {
  Heart, Flame, BookOpen, Users, Mic, ShieldCheck, Award, CheckCircle2,
  ArrowLeft, Plus, ChevronDown, Quote, DoorOpen,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useRecentDonations } from "@/hooks/useDonations";
import DonateForm from "@/components/donate/DonateForm";
import { useScrollReveal } from "@/components/donate/useScrollReveal";
import { useDonationStats } from "@/components/donate/useDonationStats";
import {
  IMPACT_TIERS, ALLOCATION, DONATE_FAQS, WHY_CARDS, TESTIMONIALS, IMAGES,
} from "@/components/donate/donateData";
import type { ImpactTier } from "@/components/donate/donateData";

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
}
const scrollToForm = () => scrollTo("donate-form");

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
  simcha: "לכבוד",
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

  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > 620);
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

      {/* ── Sticky join bar ──────────────────────────── */}
      <div
        className="donate-sticky-bar"
        dir="rtl"
        style={{
          position: "fixed", insetInlineStart: 0, insetInlineEnd: 0, bottom: 0, zIndex: 60,
          transform: showBar ? "translateY(0)" : "translateY(130%)",
          transition: "transform 0.35s ease",
          background: "rgba(26,39,68,0.97)", backdropFilter: "blur(8px)",
          borderTop: `1px solid rgba(196,162,101,0.35)`,
          padding: "0.7rem 1.25rem",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", flexWrap: "wrap",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: fonts.body, fontSize: "0.92rem", color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
            התנ"ך פתוח לכולם — בזכות השותפים שלנו
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: "rgba(255,255,255,0.55)" }}>
            סליקה מאובטחת · מוכר לזיכוי מס סעיף 46
          </div>
        </div>
        <button
          type="button"
          onClick={scrollToForm}
          style={{
            padding: "0.6rem 1.6rem", borderRadius: radii.pill, border: "none",
            background: gradients.goldButton, color: "white",
            fontFamily: fonts.accent, fontWeight: 800, fontSize: "0.98rem", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap",
          }}
        >
          <Heart size={15} fill="currentColor" aria-hidden="true" /> אני מצטרף
        </button>
      </div>

      {/* ── Video hero ───────────────────────────────── */}
      <VideoHero />

      {/* ── Proof strip ──────────────────────────────── */}
      <ProofStrip stats={stats} />

      {/* ── Impact tiers ─────────────────────────────── */}
      <ImpactSection amount={amount} onPick={pickTier} />

      {/* ── Story + form ─────────────────────────────── */}
      <section style={{ background: colors.parchment, padding: "4.5rem 2rem 5rem" }} dir="rtl">
        <div
          className="donate-grid"
          style={{
            maxWidth: 1120, margin: "0 auto", display: "grid",
            gridTemplateColumns: "1fr minmax(360px, 420px)", gap: "3.5rem", alignItems: "start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "2.75rem" }}>
            <StoryWithImage />
            <WhySection />
          </div>

          <div className="donate-form-col" style={{ position: "sticky", top: "5.5rem" }}>
            <DonateForm amount={amount} onAmount={setAmount} source="donate-page" />
          </div>
        </div>
      </section>

      {/* ── Rav Yoav reel ────────────────────────────── */}
      <ReelSection />

      {/* ── Testimonials ─────────────────────────────── */}
      <TestimonialsSection />

      {/* ── Saadia memorial ──────────────────────────── */}
      <MemorialSaadia />

      {/* ── Transparency ─────────────────────────────── */}
      <TransparencySection />

      {/* ── Recent donors (real) ─────────────────────── */}
      <RecentDonorsSection donations={recentDonations} />

      {/* ── FAQ ──────────────────────────────────────── */}
      <FaqSection />

      {/* ── Final CTA ────────────────────────────────── */}
      <FinalCta />
    </DesignLayout>
  );
}

// ───────────────────────────────────────────────────────────
// Video hero
// ───────────────────────────────────────────────────────────

function VideoHero() {
  return (
    <section
      style={{ position: "relative", overflow: "hidden", minHeight: "82vh", display: "flex", flexDirection: "column", justifyContent: "center" }}
      dir="rtl"
    >
      {/* Illuminated background video */}
      <video
        autoPlay muted loop playsInline aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: colors.navyDeep }}
      >
        <source src={IMAGES.heroVideo} type="video/mp4" />
      </video>
      {/* Warm readable overlay + fade to cream at the bottom */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,16,10,0.55) 0%, rgba(26,30,44,0.42) 40%, rgba(20,16,10,0.62) 100%)" }} />
      <div aria-hidden="true" style={{ position: "absolute", insetInline: 0, bottom: 0, height: 160, background: `linear-gradient(to top, ${colors.parchment}, transparent)` }} />

      <div style={{ position: "relative", maxWidth: 780, margin: "0 auto", padding: "6rem 2rem 5rem", textAlign: "center", color: "white" }}>
        <span
          className="hero-fade hero-fade-1"
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.45rem",
            padding: "0.3rem 1rem", borderRadius: radii.pill,
            border: `1px solid rgba(232,213,160,0.5)`, color: colors.goldShimmer,
            fontFamily: fonts.body, fontSize: "0.75rem", fontWeight: 700,
            letterSpacing: "0.14em", marginBottom: "1.5rem",
            background: "rgba(20,16,10,0.25)", backdropFilter: "blur(4px)",
          }}
        >
          <span className="pulse-dot" aria-hidden="true" /> שותפים לבית התנ"ך
        </span>

        <h1
          className="hero-fade hero-fade-2"
          style={{
            fontFamily: fonts.display, fontWeight: 900,
            fontSize: "clamp(2.3rem, 5.5vw, 3.7rem)", lineHeight: 1.18,
            margin: "0 0 1.25rem", color: "white",
            textShadow: "0 4px 30px rgba(0,0,0,0.4)",
          }}
        >
          פותחים את התנ"ך
          <br />
          <span style={{ color: colors.goldShimmer }}>לכל בית בישראל</span>
        </h1>

        <p
          className="hero-fade hero-fade-3"
          style={{
            fontFamily: fonts.display, fontStyle: "italic", fontWeight: 700,
            fontSize: "clamp(1.15rem, 2.4vw, 1.55rem)", lineHeight: 1.55,
            color: colors.goldShimmer, margin: "0 auto 1.5rem", maxWidth: 620,
            textShadow: "0 2px 18px rgba(0,0,0,0.4)",
          }}
        >
          התורה לא צריכה להיעצר בשער.
          <br />
          היא צריכה להיות פתוחה לכל מי שמבקש ללמוד.
        </p>

        <p
          className="hero-fade hero-fade-4"
          style={{
            fontFamily: fonts.body, fontSize: "clamp(1rem, 1.8vw, 1.12rem)",
            lineHeight: 1.85, color: "rgba(255,255,255,0.82)",
            margin: "0 auto 2.25rem", maxWidth: 580, textShadow: "0 1px 12px rgba(0,0,0,0.5)",
          }}
        >
          מאחורי כל שיעור באתר יש אנשים שעובדים: רבנים, עורכים, מקליטים, מתמללים,
          מאיירים ומפתחים. התרומה שלכם עוזרת לעוד שיעור לעלות לאוויר — ולהישאר
          פתוח לכל עם ישראל.
        </p>

        <div className="hero-fade hero-fade-5" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <button
            type="button"
            onClick={scrollToForm}
            className="cta-glow"
            style={{
              padding: "1rem 2.6rem", borderRadius: radii.pill, border: "none",
              background: gradients.goldButton, color: "white",
              fontFamily: fonts.accent, fontWeight: 800, fontSize: "1.15rem",
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem",
            }}
          >
            <Heart size={18} fill="currentColor" aria-hidden="true" /> אני רוצה להיות שותף
          </button>
          <button
            type="button"
            onClick={() => scrollTo("impact")}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: fonts.body, fontSize: "0.9rem", color: "rgba(255,255,255,0.8)",
              display: "inline-flex", alignItems: "center", gap: "0.35rem",
            }}
          >
            מה התרומה שלי בונה? <ChevronDown size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
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
      style={{ background: "white", borderBottom: `1px solid ${colors.parchmentDeep}`, padding: "1.85rem 2rem" }}
      dir="rtl"
    >
      <div
        style={{
          maxWidth: 1000, margin: "0 auto", display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1.5rem", textAlign: "center",
        }}
      >
        <Stat icon={<BookOpen size={20} />} value="+11,000" label="שיעורים ותכנים פתוחים" />
        <Stat icon={<Users size={20} />} value="+200" label="רבנים ומרצים" />
        <Stat icon={<Mic size={20} />} value="+1,300" label="סדרות לימוד" />
        {stats.ready && stats.donorCount > 0 ? (
          <Stat icon={<Heart size={20} />} value={`+${stats.donorCount.toLocaleString("he-IL")}`} label="שותפים שכבר הצטרפו" />
        ) : (
          <Stat icon={<DoorOpen size={20} />} value="פתוח לכולם" label="בלי מנוי ובלי חומת תשלום" />
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
    <section id="impact" style={{ background: colors.parchmentDark, padding: "4.5rem 2rem" }} dir="rtl">
      <div ref={ref} className={`reveal ${visible ? "is-visible" : ""}`} style={{ maxWidth: 1120, margin: "0 auto" }}>
        <SectionHead eyebrow="מה התרומה בונה" title="כל סכום פותח עוד שער ללימוד" />
        <p style={{ fontFamily: fonts.body, fontSize: "1.05rem", lineHeight: 1.8, color: colors.textMid, textAlign: "center", maxWidth: 640, margin: "0 auto 2.75rem" }}>
          בחרו את הסכום שמתאים לכם. כל תרומה הופכת לעוד שיעור, עוד סדרה, עוד אדם
          שמתחבר לתנ"ך.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(255px, 1fr))", gap: "1.25rem" }}>
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
                    ? "linear-gradient(160deg, #FFFDF8, rgba(196,162,101,0.12))"
                    : "white",
                  color: colors.textDark,
                  borderRadius: radii.xl,
                  padding: "1.75rem 1.5rem",
                  border: active
                    ? `2px solid ${colors.goldDark}`
                    : tier.highlight
                    ? `2px solid ${colors.goldLight}`
                    : `1.5px solid rgba(139,111,71,0.16)`,
                  boxShadow: tier.highlight ? shadows.goldGlowSoft : shadows.cardSoft,
                  cursor: "pointer", position: "relative",
                  display: "flex", flexDirection: "column", gap: "0.55rem",
                }}
              >
                {tier.highlight && tier.tag && (
                  <span
                    style={{
                      position: "absolute", top: -13, insetInlineEnd: 18,
                      padding: "0.25rem 0.85rem", borderRadius: radii.pill,
                      background: gradients.goldButton, color: "white",
                      fontFamily: fonts.body, fontSize: "0.66rem", fontWeight: 800,
                      letterSpacing: "0.06em", whiteSpace: "nowrap",
                    }}
                  >
                    {tier.tag}
                  </span>
                )}

                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem" }}>
                  <span style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.9rem", color: colors.goldDark }}>
                    {tier.amount.toLocaleString("he-IL")}₪
                  </span>
                  <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.05rem" }}>
                    {tier.name}
                  </span>
                </div>

                <div style={{ fontFamily: fonts.body, fontSize: "0.9rem", lineHeight: 1.65, color: colors.textMuted }}>
                  {tier.impact}
                </div>

                <span
                  aria-hidden="true"
                  style={{
                    marginTop: "0.4rem", display: "inline-flex", alignItems: "center", gap: "0.35rem",
                    fontFamily: fonts.body, fontSize: "0.85rem", fontWeight: 700, color: colors.goldDark,
                  }}
                >
                  {active ? "נבחר ✓" : `בחרו ${tier.amount.toLocaleString("he-IL")}₪`} <ArrowLeft size={14} />
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
// Story + Rav Yoav image
// ───────────────────────────────────────────────────────────

function StoryWithImage() {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? "is-visible" : ""}`}>
      <SectionHead eyebrow="הסיפור שלנו" title="למה אנחנו מבקשים את השותפות שלכם?" align="right" />

      {/* Rav Yoav photo */}
      <figure style={{ margin: "0 0 1.75rem", borderRadius: 20, overflow: "hidden", border: `2px solid ${colors.parchmentDeep}`, boxShadow: "0 12px 40px rgba(139,111,71,0.16)", position: "relative" }}>
        <img
          src={IMAGES.yoavTeaching}
          alt="הרב יואב אוריאל אוחז בסט ספרי בני ציון — מאחורי כל שיעור עומדים אנשים"
          loading="lazy"
          style={{ width: "100%", display: "block" }}
        />
        <figcaption
          style={{
            position: "absolute", insetBlockEnd: 0, insetInline: 0,
            background: "linear-gradient(to top, rgba(26,39,68,0.9), transparent)",
            padding: "1.5rem 1.25rem 1rem", color: "white",
          }}
        >
          <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", color: colors.goldShimmer, marginBottom: 3 }}>
            מאחורי הקלעים
          </div>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1.05rem" }}>
            יש פה אנשים אמיתיים שבונים תורה
          </div>
        </figcaption>
      </figure>

      <p style={pStyle}>
        בני ציון נולדה מתוך אמונה פשוטה: התנ"ך הוא לא רק ספר של פעם. הוא הלב של
        עם ישראל. הוא מספר לנו מי אנחנו, מאיפה באנו, לאן אנחנו הולכים — ואיך חיים
        חיים של אמונה, אחריות ושליחות.
      </p>
      <p style={pStyle}>
        בשנים האחרונות נבנה כאן בית גדול ללימוד תנ"ך: שיעורים, סדרות, ספרי מכלל
        יופי, קורסים, תשובות לשאלות, וכלים למורים, הורים ולומדים. אבל כדי שכל זה
        יישאר פתוח באמת — צריך להחזיק אותו.
      </p>
      <p style={pStyle}>
        כל שיעור שעולה לאתר עובר דרך ארוכה: הכנה, צילום או הקלטה, עריכה, תמלול,
        סידור, עיצוב, העלאה ותחזוקה. מבחוץ זה נראה פשוט. בפנים זו עבודה גדולה.
      </p>

      <p style={{ ...pStyle, marginBottom: "0.4rem", fontWeight: 700, color: colors.textDark }}>
        יכולנו לסגור את התוכן מאחורי תשלום. לעשות מנוי. לתת גישה רק למי שמשלם.
      </p>
      <p style={{ ...pStyle, fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: colors.goldDark }}>
        אבל בחרנו אחרת.
      </p>

      <p style={pStyle}>
        התנ"ך שייך לעם ישראל. ולכן אנחנו רוצים שהוא יישאר פתוח לכל יהודי — ילד,
        מורה, חייל, הורה, תלמיד ישיבה, אישה שלומדת בבית, וכל מי שמחפש שער להיכנס
        דרכו.
      </p>

      <div style={{ borderInlineStart: `3px solid ${colors.goldDark}`, paddingInlineStart: "1.1rem", margin: "1.5rem 0 0" }}>
        <p style={{ ...pStyle, margin: 0, fontFamily: fonts.display, fontStyle: "italic", fontWeight: 700, color: colors.textDark, fontSize: "1.1rem" }}>
          התרומה שלכם היא לא "תרומה לאתר". היא עוד שיעור שילד יפגוש. עוד סדרה
          שמורה ילמד ממנה. עוד אדם שיפתח תנ"ך וירגיש שהוא נכנס הביתה.
        </p>
      </div>
    </div>
  );
}

function WhySection() {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? "is-visible" : ""}`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
      {WHY_CARDS.map((c) => (
        <div key={c.n} style={{ background: "white", borderRadius: radii.lg, padding: "1.5rem 1.25rem", border: `1px solid rgba(139,111,71,0.12)`, boxShadow: shadows.cardSoft }}>
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

// ───────────────────────────────────────────────────────────
// Rav Yoav reel
// ───────────────────────────────────────────────────────────

function ReelSection() {
  const { ref, visible } = useScrollReveal();
  return (
    <section style={{ background: colors.parchment, padding: "1rem 2rem 4.5rem" }} dir="rtl">
      <div
        ref={ref}
        className={`reveal ${visible ? "is-visible" : ""} reel-grid`}
        style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(280px, 340px) 1fr", gap: "3rem", alignItems: "center" }}
      >
        <div style={{ borderRadius: 22, overflow: "hidden", boxShadow: shadows.cardHover, border: `2px solid ${colors.parchmentDeep}`, background: "#000" }}>
          <video
            controls playsInline preload="metadata"
            poster={IMAGES.reelPoster}
            aria-label="הרב יואב אוריאל מספר על לימוד התנ״ך"
            style={{ width: "100%", display: "block", aspectRatio: "9 / 16", objectFit: "cover" }}
          >
            <source src={IMAGES.reelVideo} type="video/mp4" />
          </video>
        </div>

        <div>
          <SectionHead eyebrow="ממש מהשטח" title="הרב יואב מספר" align="right" />
          <p style={pStyle}>
            הרב יואב אוריאל מלמד תנ"ך כבר שנים, ומגיע לעשרות אלפי לומדים. בסרטון
            הקצר הזה הוא מספר בעצמו על החזון — למה חשוב שלימוד התנ"ך יישאר פתוח,
            חי ונגיש לכל בית בישראל.
          </p>
          <p style={{ ...pStyle, marginBottom: 0, fontFamily: fonts.display, fontWeight: 700, color: colors.textDark }}>
            השותפות שלכם היא מה שמאפשרת לזה להמשיך.
          </p>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Testimonials (real, from weekly-chapter program)
// ───────────────────────────────────────────────────────────

function TestimonialsSection() {
  const { ref, visible } = useScrollReveal();
  return (
    <section style={{ background: colors.parchmentDark, padding: "4.5rem 2rem" }} dir="rtl">
      <div ref={ref} className={`reveal ${visible ? "is-visible" : ""}`} style={{ maxWidth: 1080, margin: "0 auto" }}>
        <SectionHead eyebrow="מה אומרים הלומדים" title="חוויות אמיתיות מהשטח" />
        <div
          style={{ marginTop: "2.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}
        >
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={i}
              style={{
                margin: 0, position: "relative", background: "white", borderRadius: radii.xl,
                padding: "2rem 1.75rem 1.5rem", border: `1px solid rgba(139,111,71,0.14)`,
                boxShadow: shadows.cardSoft, display: "flex", flexDirection: "column", gap: "1.1rem",
              }}
            >
              <Quote size={26} aria-hidden="true" style={{ color: "rgba(196,162,101,0.4)" }} />
              <blockquote style={{ margin: 0, fontFamily: fonts.body, fontSize: "0.95rem", lineHeight: 1.8, color: colors.textMid, flex: 1 }}>
                {t.text}
              </blockquote>
              <figcaption style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                    background: gradients.goldButton, color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: fonts.display, fontWeight: 800, fontSize: "1.1rem",
                  }}
                >
                  {t.name.charAt(0)}
                </span>
                <div>
                  <div style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.textDark }}>{t.name}</div>
                  {t.role && <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.goldDark }}>{t.role}</div>}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Saadia memorial — light, quiet, dignified
// ───────────────────────────────────────────────────────────

function MemorialSaadia() {
  const { ref, visible } = useScrollReveal();
  return (
    <section style={{ background: colors.parchment, padding: "4.5rem 2rem" }} dir="rtl">
      <div
        ref={ref}
        className={`reveal ${visible ? "is-visible" : ""}`}
        style={{
          maxWidth: 720, margin: "0 auto", textAlign: "center",
          background: "#FFFDF8", borderRadius: radii.xl, padding: "3.5rem 2.5rem",
          border: `1px solid rgba(196,162,101,0.3)`, boxShadow: shadows.cardSoft,
        }}
      >
        <Flame size={30} aria-hidden="true" style={{ color: colors.goldDark, marginBottom: "1.25rem" }} />
        <span style={{ display: "block", fontFamily: fonts.body, fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.12em", color: colors.goldDark, marginBottom: "0.85rem" }}>
          לזכרו
        </span>
        <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.5rem, 2.8vw, 2rem)", color: colors.textDark, margin: "0 0 1.5rem" }}>
          ממשיכים את האור של סעדיה
        </h2>
        <p style={{ fontFamily: fonts.body, fontSize: "1.02rem", lineHeight: 1.9, color: colors.textMid, margin: "0 auto 1.1rem", maxWidth: 560 }}>
          האתר נבנה לזכרו של רס"ל במיל׳ סעדיה יעקב דרעי הי"ד, שנפל בהגנה על עם
          ישראל.
        </p>
        <p style={{ fontFamily: fonts.body, fontSize: "1.02rem", lineHeight: 1.9, color: colors.textMid, margin: "0 auto 1.1rem", maxWidth: 560 }}>
          המשפחה ביקשה להמשיך את האור שלו בדרך חיה — לא רק בזיכרון, אלא בלימוד.
          בבית של תורה. במקום שבו עוד ועוד יהודים פותחים תנ"ך, לומדים, שואלים,
          מעמיקים וממשיכים את שרשרת החיים של עם ישראל.
        </p>
        <p style={{ fontFamily: fonts.display, fontStyle: "italic", fontWeight: 700, fontSize: "1.1rem", lineHeight: 1.7, color: colors.textDark, margin: "0 auto", maxWidth: 520 }}>
          כל שיעור שעולה לאתר בזכות התרומה שלכם הוא עוד אור קטן שממשיך להאיר.
        </p>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Transparency (verbal)
// ───────────────────────────────────────────────────────────

function TransparencySection() {
  const { ref, visible } = useScrollReveal();
  return (
    <section style={{ background: "white", padding: "4.5rem 2rem", borderTop: `1px solid ${colors.parchmentDeep}` }} dir="rtl">
      <div ref={ref} className={`reveal ${visible ? "is-visible" : ""}`} style={{ maxWidth: 1000, margin: "0 auto" }}>
        <SectionHead eyebrow="שקיפות" title="לאן הולכת התרומה?" />
        <p style={{ fontFamily: fonts.body, fontSize: "1.05rem", lineHeight: 1.8, color: colors.textMid, textAlign: "center", maxWidth: 600, margin: "0 auto 2.75rem" }}>
          התרומה שלכם הולכת ישירות לבניית התורה באתר:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2.5rem" }}>
          {ALLOCATION.map((item) => (
            <div key={item.title} style={{ background: colors.parchment, borderRadius: radii.lg, padding: "1.5rem 1.35rem", border: `1px solid rgba(139,111,71,0.12)` }}>
              <CheckCircle2 size={20} aria-hidden="true" style={{ color: colors.goldDark, marginBottom: "0.7rem" }} />
              <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.05rem", color: colors.textDark, margin: "0 0 0.4rem" }}>
                {item.title}
              </h3>
              <p style={{ fontFamily: fonts.body, fontSize: "0.88rem", lineHeight: 1.6, color: colors.textMuted, margin: 0 }}>
                {item.detail}
              </p>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", maxWidth: 760, margin: "0 auto" }}>
          <TrustCard icon={<ShieldCheck size={20} />} label="סליקה מאובטחת" sub="SSL / PCI" />
          <TrustCard icon={<Award size={20} />} label="קבלה מיידית" sub="למייל שלכם" />
          <TrustCard icon={<CheckCircle2 size={20} />} label="זיכוי מס סעיף 46" sub={'עמותת מכלל יופי (ע"ר)'} />
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Recent donors (real)
// ───────────────────────────────────────────────────────────

function RecentDonorsSection({ donations }: { donations: ReturnType<typeof useRecentDonations>["data"] }) {
  if (!donations || donations.length === 0) return null;
  return (
    <section style={{ background: colors.parchment, padding: "0 2rem 4.5rem" }} dir="rtl">
      <div style={{ maxWidth: 720, margin: "0 auto", background: "white", borderRadius: radii.xl, padding: "2rem", border: `1px solid rgba(139,111,71,0.1)`, boxShadow: shadows.cardSoft }}>
        <h3 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1.15rem", color: colors.textDark, margin: "0 0 1.25rem", textAlign: "center" }}>
          שותפים שהצטרפו לאחרונה
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem 1.5rem" }}>
          {donations.slice(0, 6).map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.88rem" }}>
              <Heart size={14} style={{ color: colors.goldDark, marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.textDark }}>{d.donor_name || "אנונימי"}</span>
                <span style={{ color: colors.textMuted }}> תרמ/ה </span>
                <span style={{ fontFamily: fonts.display, fontWeight: 800, color: colors.goldDark }}>₪{Number(d.amount).toLocaleString()}</span>
                {d.dedication_name && (
                  <span style={{ color: colors.textSubtle, fontSize: "0.78rem", display: "block" }}>
                    {typeLabels[d.dedication_type]} {d.dedication_name}
                  </span>
                )}
              </div>
              <span style={{ fontSize: "0.72rem", color: colors.textSubtle, flexShrink: 0 }}>{timeAgo(d.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// FAQ
// ───────────────────────────────────────────────────────────

function FaqSection() {
  const { ref, visible } = useScrollReveal();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section style={{ background: "white", padding: "4.5rem 2rem", borderTop: `1px solid ${colors.parchmentDeep}` }} dir="rtl">
      <div ref={ref} className={`reveal ${visible ? "is-visible" : ""}`} style={{ maxWidth: 720, margin: "0 auto" }}>
        <SectionHead eyebrow="שאלות נפוצות" title="כל מה שרציתם לדעת" />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "2rem" }}>
          {DONATE_FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ background: colors.parchment, borderRadius: radii.lg, border: `1px solid rgba(139,111,71,0.14)`, overflow: "hidden" }}>
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
                  <Plus size={18} aria-hidden="true" style={{ flexShrink: 0, color: colors.goldDark, transform: isOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                </button>
                <div id={`faq-panel-${i}`} role="region" aria-labelledby={`faq-q-${i}`} hidden={!isOpen} style={{ padding: isOpen ? "0 1.4rem 1.3rem" : "0 1.4rem" }}>
                  <p style={{ fontFamily: fonts.body, fontSize: "0.95rem", lineHeight: 1.8, color: colors.textMid, margin: 0 }}>{faq.a}</p>
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
// Final CTA — warm
// ───────────────────────────────────────────────────────────

function FinalCta() {
  const { ref, visible } = useScrollReveal();
  return (
    <section
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""}`}
      style={{
        position: "relative", overflow: "hidden",
        background: `linear-gradient(155deg, ${colors.mahogany} 0%, #2D1810 55%, ${colors.goldDeep} 140%)`,
        padding: "5rem 2rem", textAlign: "center", color: "white",
      }}
      dir="rtl"
    >
      <div aria-hidden="true" style={{ position: "absolute", top: "-35%", insetInlineStart: "-8%", width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,213,160,0.2), transparent 70%)" }} />
      <div style={{ maxWidth: 660, margin: "0 auto", position: "relative" }}>
        <span style={{ display: "inline-block", padding: "0.3rem 1rem", borderRadius: radii.pill, border: `1px solid rgba(232,213,160,0.45)`, color: colors.goldShimmer, fontFamily: fonts.body, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", marginBottom: "1.5rem" }}>
          הדלת פתוחה בזכותכם
        </span>
        <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.8rem, 4vw, 2.7rem)", lineHeight: 1.3, margin: "0 0 1.5rem" }}>
          תורה פתוחה לכולם —
          <br />
          מתחילה בשותפות שלכם
        </h2>
        <p style={{ fontFamily: fonts.body, fontSize: "1.1rem", lineHeight: 1.85, color: "rgba(255,255,255,0.82)", margin: "0 auto 2.25rem", maxWidth: 500 }}>
          תרומה אחת יכולה לבנות שיעור. הוראת קבע יכולה לבנות סדרה. שותפות קבועה
          יכולה להחזיק בית שלם של תורה לדורות.
        </p>
        <button
          type="button"
          onClick={scrollToForm}
          className="cta-glow"
          style={{
            padding: "1rem 2.6rem", borderRadius: radii.pill, border: "none",
            background: gradients.goldButton, color: "white",
            fontFamily: fonts.accent, fontWeight: 800, fontSize: "1.15rem", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
          }}
        >
          <Heart size={18} fill="currentColor" aria-hidden="true" /> אני מצטרף עכשיו
        </button>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Shared bits
// ───────────────────────────────────────────────────────────

function SectionHead({ eyebrow, title, align = "center" }: { eyebrow: string; title: string; align?: "center" | "right" }) {
  return (
    <div style={{ textAlign: align, marginBottom: align === "center" ? "0.5rem" : "1.1rem" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontFamily: fonts.body, fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.12em", color: colors.goldDark, marginBottom: "0.6rem" }}>
        <span className="pulse-dot pulse-dot-gold" aria-hidden="true" /> {eyebrow}
      </span>
      <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.5rem, 2.8vw, 2.05rem)", color: colors.textDark, margin: 0, lineHeight: 1.25 }}>
        {title}
      </h2>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
      <span style={{ color: colors.goldDark }} aria-hidden="true">{icon}</span>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.55rem", color: colors.textDark, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted, textAlign: "center" }}>{label}</div>
    </div>
  );
}

function TrustCard({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", padding: "1rem 0.75rem", background: colors.parchmentDark, borderRadius: radii.lg, textAlign: "center" }}>
      <span style={{ color: colors.goldDark }} aria-hidden="true">{icon}</span>
      <div style={{ fontFamily: fonts.body, fontSize: "0.82rem", fontWeight: 700, color: colors.textDark }}>{label}</div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textSubtle }}>{sub}</div>
    </div>
  );
}

const pStyle: React.CSSProperties = {
  fontFamily: fonts.body, fontSize: "1rem", lineHeight: 1.85, color: colors.textMid, margin: "0 0 1.1rem",
};

// ───────────────────────────────────────────────────────────
// Page styles
// ───────────────────────────────────────────────────────────

function PageStyles() {
  return (
    <style>{`
      @keyframes donateFadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes donatePulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } }
      @keyframes donateGlow { 0%,100% { box-shadow: 0 4px 24px rgba(196,162,101,0.35); } 50% { box-shadow: 0 6px 34px rgba(196,162,101,0.6); } }

      .hero-fade { opacity: 0; animation: donateFadeUp 0.7s ease-out both; }
      .hero-fade-1 { animation-delay: 0.1s; }
      .hero-fade-2 { animation-delay: 0.22s; }
      .hero-fade-3 { animation-delay: 0.34s; }
      .hero-fade-4 { animation-delay: 0.46s; }
      .hero-fade-5 { animation-delay: 0.58s; }

      .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: ${colors.goldShimmer}; display: inline-block; animation: donatePulse 2s ease-in-out infinite; }
      .pulse-dot-gold { background: ${colors.goldDark}; }

      .cta-glow { animation: donateGlow 2.8s ease-in-out infinite; }
      .cta-glow:hover { animation: none; }

      .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.7s ease, transform 0.7s ease; }
      .reveal.is-visible { opacity: 1; transform: translateY(0); }

      .impact-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
      .impact-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(45,31,14,0.12); }

      @media (max-width: 860px) {
        .reel-grid { grid-template-columns: 1fr !important; max-width: 380px !important; }
      }
      @media (max-width: 768px) {
        .donate-grid { grid-template-columns: 1fr !important; }
        .donate-grid > .donate-form-col { order: -1; }
        .donate-grid > .donate-form-col > div { position: static !important; }
      }

      @media (prefers-reduced-motion: reduce) {
        .hero-fade, .pulse-dot, .cta-glow, .reveal, .impact-card { animation: none !important; transition: none !important; opacity: 1 !important; transform: none !important; }
      }
    `}</style>
  );
}
