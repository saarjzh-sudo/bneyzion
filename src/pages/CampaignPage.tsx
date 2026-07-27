/**
 * CampaignPage — רמה 30 (27.7.2026): דף קמפיין גיוס גנרי, מונע-DB.
 * Route: /campaign/:slug
 *
 * הכללה של DesignPreviewYehoshuaCampaign: אותה שפה עיצובית (נייבי+זהב,
 * הירו כהה, פס-התקדמות, חבילות תמיכה עם ספירת-מלאי חיה, צ'קאאוט inline
 * של Grow) — אבל כל התוכן מגיע מטבלאות campaigns / campaign_tiers.
 *
 * סליקה: meta.product = campaigns.slug (שורת payment_products מסונכרנת
 * בטריגר DB) → אותה צנרת create-payment/webhook של קמפיין יהושע, כולל
 * charge_date וה-dedup בפיד החשבונאי. donations.source/tier_id נכתבים זהה.
 *
 * הדף הישן /design-yehoshua-campaign לא תלוי בקובץ הזה — נשאר כגיבוי חי.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useGrowPayment } from "@/hooks/useGrowPayment";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  useCampaignBySlug,
  useLiveCampaignStats,
  useLiveTierCounts,
  type CampaignRow,
  type CampaignTierRow,
} from "@/hooks/useCampaigns";
import { sanitizeHtml } from "@/lib/sanitize";
import { X, Loader2, ShieldCheck, CheckCircle2, CreditCard } from "lucide-react";

/* ─── helpers ───────────────────────────────────────────── */
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
    // בדפדפנים מסוננים IntersectionObserver לא יורה (לקח LazyHeroVideo) — fallback
    const fallback = setTimeout(() => setVisible(true), 2500);
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
          clearTimeout(fallback);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      clearTimeout(fallback);
    };
  }, [threshold]);
  return { ref, visible };
}

const GOLD_GRAD = "linear-gradient(135deg, hsl(43 85% 62%), hsl(38 75% 48%))";

/* ─── Sticky nav ────────────────────────────────────────── */
function StickyNav({
  scrolled,
  title,
  progressPct,
  onSupportClick,
}: {
  scrolled: boolean;
  title: string;
  progressPct: number;
  onSupportClick: () => void;
}) {
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

        {scrolled && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>{title}</span>
            <div style={{ width: 90, height: 4, background: "hsl(215 20% 32%)", borderRadius: 4, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, hsl(43 85% 62%), hsl(38 75% 48%))",
                  borderRadius: 4,
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: "hsl(38 85% 68%)", fontWeight: 700 }}>{progressPct}%</span>
          </div>
        )}

        <button
          onClick={onSupportClick}
          style={{
            background: GOLD_GRAD,
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
        >
          לתמיכה בקמפיין ↓
        </button>
      </div>
    </div>
  );
}

/* ─── Hero ──────────────────────────────────────────────── */
function HeroSection({
  campaign,
  raised,
  supporters,
  progressPct,
  onSupportClick,
}: {
  campaign: CampaignRow;
  raised: number;
  supporters: number;
  progressPct: number;
  onSupportClick: () => void;
}) {
  return (
    <section
      style={{
        position: "relative",
        minHeight: "88vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "hsl(215 55% 10%)" }}>
        {campaign.hero_image_url && (
          <img
            src={campaign.hero_image_url}
            alt={campaign.hero_title || campaign.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 25%", opacity: 0.48 }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, hsl(215 55% 12% / 0.2) 0%, hsl(215 55% 12% / 0.55) 40%, hsl(215 55% 12% / 0.95) 100%)",
          }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "90px 24px 56px", width: "100%" }}>
        {campaign.hero_eyebrow && (
          <div
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
            <span style={{ width: 6, height: 6, background: "hsl(38 75% 62%)", borderRadius: "50%" }} />
            <span style={{ color: "hsl(38 85% 74%)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" }}>
              {campaign.hero_eyebrow}
            </span>
          </div>
        )}

        <h1 style={{ margin: "0 0 20px", lineHeight: 1 }}>
          {campaign.hero_title_small && (
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
              {campaign.hero_title_small}
            </span>
          )}
          <span
            style={{
              display: "block",
              fontSize: "clamp(48px, 7vw, 88px)",
              fontWeight: 900,
              background: "linear-gradient(135deg, hsl(43 90% 72%) 0%, hsl(38 75% 52%) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.03em",
              lineHeight: 0.95,
            }}
          >
            {campaign.hero_title || campaign.title}
          </span>
        </h1>

        {campaign.hero_subtitle && (
          <p style={{ fontSize: "clamp(17px, 2.2vw, 22px)", color: "hsl(215 10% 82%)", lineHeight: 1.5, maxWidth: 580, margin: "0 0 10px", fontWeight: 500 }}>
            {campaign.hero_subtitle}
          </p>
        )}
        {campaign.hero_subtitle_bold && (
          <p style={{ fontSize: "clamp(17px, 2.2vw, 22px)", color: "white", lineHeight: 1.5, maxWidth: 580, margin: "0 0 32px", fontWeight: 700 }}>
            {campaign.hero_subtitle_bold}
          </p>
        )}

        {campaign.hero_quote && (
          <blockquote style={{ margin: "0 0 36px", borderInlineEnd: "4px solid hsl(38 75% 55%)", paddingInlineEnd: 20, maxWidth: 520 }}>
            <p style={{ fontStyle: "italic", fontSize: "clamp(18px, 2vw, 22px)", fontWeight: 700, color: "hsl(38 85% 74%)", margin: 0, lineHeight: 1.4 }}>
              {campaign.hero_quote}
            </p>
            {campaign.hero_quote_cite && (
              <cite style={{ display: "block", fontStyle: "normal", fontSize: 13, color: "hsl(215 10% 55%)", marginBlockStart: 8 }}>
                {campaign.hero_quote_cite}
              </cite>
            )}
          </blockquote>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBlockEnd: 8, gap: 8 }}>
              <span style={{ color: "hsl(38 85% 70%)", fontWeight: 900, fontSize: 22 }}>₪{raised.toLocaleString()}</span>
              {campaign.goal_amount > 0 && (
                <span style={{ color: "hsl(215 10% 48%)", fontSize: 13 }}>מתוך ₪{Number(campaign.goal_amount).toLocaleString()}</span>
              )}
              <span style={{ color: "hsl(38 85% 68%)", fontWeight: 700, fontSize: 13 }}>{supporters} תומכים</span>
            </div>
            <div style={{ height: 6, background: "hsl(215 20% 28%)", borderRadius: 6, overflow: "hidden" }}>
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
            {campaign.goal_amount > 0 && (
              <div style={{ fontSize: 11, color: "hsl(215 10% 40%)", marginBlockStart: 4 }}>{progressPct}% מהיעד</div>
            )}
          </div>

          <button
            onClick={onSupportClick}
            style={{
              padding: "14px 34px",
              background: GOLD_GRAD,
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
            תמכו בקמפיין ↓
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─── Video ─────────────────────────────────────────────── */
function VideoSection({ campaign }: { campaign: CampaignRow }) {
  if (!campaign.video_url) return null;
  const isEmbed = /youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com/.test(campaign.video_url);
  return (
    <section style={{ background: "hsl(215 55% 12%)", padding: "64px 24px 56px", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      {campaign.video_title && (
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "hsl(38 85% 66%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", margin: "0 0 8px" }}>סרטון הקמפיין</p>
          <h2 style={{ fontSize: "clamp(20px, 2.6vw, 30px)", fontWeight: 900, color: "white", margin: 0, lineHeight: 1.2 }}>{campaign.video_title}</h2>
        </div>
      )}
      <div style={{ width: "100%", maxWidth: 760, borderRadius: 18, overflow: "hidden", border: "1px solid hsl(38 75% 55% / 0.25)", boxShadow: "0 24px 64px hsl(215 55% 5% / 0.6)" }}>
        {isEmbed ? (
          <div style={{ position: "relative", paddingBlockEnd: "56.25%" }}>
            <iframe
              src={campaign.video_url}
              title={campaign.video_title || "סרטון הקמפיין"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
            />
          </div>
        ) : (
          <video controls playsInline preload="metadata" poster={campaign.video_poster_url || undefined} style={{ width: "100%", display: "block", background: "black" }}>
            <source src={campaign.video_url} type="video/mp4" />
          </video>
        )}
      </div>
    </section>
  );
}

/* ─── Proof strip ───────────────────────────────────────── */
function ProofStrip({ campaign, supporters }: { campaign: CampaignRow; supporters: number }) {
  const { ref, visible } = useInView();
  const stats = [
    ...(Array.isArray(campaign.proof_stats) ? campaign.proof_stats : []),
    { val: String(supporters), label: "תומכים כבר הצטרפו", icon: "🙌" },
  ];
  return (
    <div ref={ref} style={{ background: "hsl(215 55% 14%)", borderBlockEnd: "1px solid hsl(38 75% 55% / 0.12)", padding: "28px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 0 }}>
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{
              textAlign: "center",
              padding: "16px 12px",
              borderInlineEnd: i < stats.length - 1 ? "1px solid hsl(215 20% 25%)" : "none",
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(12px)",
              transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`,
            }}
          >
            {s.icon && <div style={{ fontSize: 28, marginBlockEnd: 4 }}>{s.icon}</div>}
            <div style={{ fontSize: 30, fontWeight: 900, color: "hsl(38 85% 68%)", lineHeight: 1, letterSpacing: "-0.02em" }}>{s.val}</div>
            <div style={{ fontSize: 12, color: "hsl(215 10% 52%)", marginBlockStart: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Tier card ─────────────────────────────────────────── */
function TierCard({ tier, sold, onSupport }: { tier: CampaignTierRow; sold: number; onSupport: (t: CampaignTierRow) => void }) {
  const limited = tier.tier_limit != null && tier.tier_limit > 0;
  const remaining = limited ? Math.max(0, (tier.tier_limit as number) - sold) : Infinity;
  const isSoldOut = limited && remaining === 0;
  const remainingPct = limited ? Math.round((remaining / (tier.tier_limit as number)) * 100) : 100;
  const almostGone = limited && remainingPct <= 25 && !isSoldOut;

  return (
    <div
      style={{
        position: "relative",
        background: tier.highlight ? "linear-gradient(155deg, hsl(215 55% 18%) 0%, hsl(215 48% 24%) 100%)" : "white",
        border: tier.highlight ? "2px solid hsl(38 75% 55%)" : "1.5px solid hsl(215 15% 88%)",
        borderRadius: 18,
        padding: tier.highlight ? "32px 22px 24px" : "26px 20px 22px",
        color: tier.highlight ? "white" : "hsl(215 40% 12%)",
        boxShadow: tier.highlight ? "0 20px 48px -8px hsl(38 75% 50% / 0.3)" : "0 2px 12px hsl(215 15% 60% / 0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        opacity: isSoldOut ? 0.55 : 1,
        transform: tier.highlight ? "translateY(-6px)" : "none",
        transition: "transform 0.25s ease",
      }}
    >
      {tier.badge && !isSoldOut && (
        <div
          style={{
            position: "absolute",
            top: -14,
            left: "50%",
            transform: "translateX(-50%)",
            background: GOLD_GRAD,
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
        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "hsl(215 15% 52%)", color: "white", fontSize: 11, fontWeight: 800, padding: "4px 14px", borderRadius: 99 }}>
          אזל
        </div>
      )}

      {tier.image_url && (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 10, overflow: "hidden", background: tier.highlight ? "hsl(215 30% 22%)" : "hsl(38 25% 96%)" }}>
          <img src={tier.image_url} alt={tier.image_alt || tier.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          {tier.image_badge && (
            <div style={{ position: "absolute", top: 10, insetInlineEnd: 10, background: GOLD_GRAD, color: "hsl(215 55% 12%)", fontSize: 20, fontWeight: 900, padding: "4px 12px", borderRadius: 99, border: "2px solid white" }}>
              {tier.image_badge}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, color: tier.highlight ? "hsl(38 85% 72%)" : "hsl(215 55% 22%)", letterSpacing: "-0.02em" }}>
            ₪{Number(tier.price).toLocaleString()}
          </div>
          {tier.note && <div style={{ fontSize: 11, color: tier.highlight ? "hsl(215 10% 60%)" : "hsl(215 20% 50%)", marginBlockStart: 3 }}>{tier.note}</div>}
        </div>
        <div style={{ textAlign: "start", flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: tier.highlight ? "white" : "hsl(215 55% 18%)", lineHeight: 1.25 }}>{tier.name}</div>
          {tier.headline && (
            <div style={{ fontSize: 13, fontWeight: 500, color: tier.highlight ? "hsl(38 85% 76%)" : "hsl(215 35% 38%)", marginBlockStart: 3 }}>{tier.headline}</div>
          )}
        </div>
      </div>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
        {tier.perks.map((item, i) => (
          <li key={i} style={{ fontSize: 14, display: "flex", alignItems: "flex-start", gap: 7, color: tier.highlight ? "hsl(215 10% 86%)" : "hsl(215 30% 28%)" }}>
            <span style={{ color: "hsl(38 75% 55%)", fontWeight: 700, flexShrink: 0, marginBlockStart: 1 }}>✓</span>
            {item}
          </li>
        ))}
      </ul>

      {limited && (
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
            ? `⚡ נשארו רק ${remaining} מתוך ${tier.tier_limit}`
            : `נשארו ${remaining} מתוך ${tier.tier_limit}`}
        </div>
      )}

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
            background: tier.highlight ? GOLD_GRAD : "hsl(215 55% 24%)",
            color: tier.highlight ? "hsl(215 55% 12%)" : "white",
            letterSpacing: "0.01em",
          }}
        >
          אני תומך
        </button>
      )}
    </div>
  );
}

/* ─── Tiers section (+ custom amount) ───────────────────── */
function TiersSection({
  campaign,
  tiers,
  tierCounts,
  onSupport,
}: {
  campaign: CampaignRow;
  tiers: CampaignTierRow[];
  tierCounts: Record<string, number>;
  onSupport: (t: CampaignTierRow) => void;
}) {
  const [customAmount, setCustomAmount] = useState("");
  const minCustom = Number(campaign.min_custom_amount) || 18;

  function submitCustom() {
    const num = parseInt(customAmount, 10);
    if (!num || num < minCustom) return;
    onSupport({
      id: "custom",
      campaign_id: campaign.id,
      tier_key: "tier-custom",
      price: num,
      name: "סכום חופשי",
      headline: `תרומה של ₪${num.toLocaleString()}`,
      badge: null,
      note: null,
      perks: ["תמיכה בקמפיין"],
      tier_limit: null,
      image_url: campaign.hero_image_url,
      image_alt: null,
      image_badge: null,
      highlight: false,
      needs_shipping: false,
      max_installments: 1,
      is_active: true,
      sort_order: 999,
    });
  }

  return (
    <section id="tiers" style={{ background: "hsl(38 30% 96%)", padding: "72px 24px 80px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBlockEnd: 48 }}>
          <p style={{ color: "hsl(38 75% 40%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", marginBlockEnd: 8 }}>חבילות תמיכה</p>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 900, color: "hsl(215 55% 20%)", margin: "0 0 10px", lineHeight: 1.2 }}>
            בחרו את רמת התמיכה שלכם
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 22, alignItems: "stretch" }}>
          {tiers
            .filter((t) => t.is_active)
            .map((tier) => (
              <TierCard key={tier.id} tier={tier} sold={tierCounts[tier.tier_key] || 0} onSupport={onSupport} />
            ))}
        </div>

        {campaign.allow_custom_amount && (
          <div
            style={{
              marginBlockStart: 40,
              background: "white",
              border: "1.5px solid hsl(215 15% 88%)",
              borderRadius: 16,
              padding: "24px 22px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <div style={{ flex: "1 1 240px" }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "hsl(215 55% 20%)" }}>רוצים לתמוך בסכום אחר?</div>
              <div style={{ fontSize: 13, color: "hsl(215 25% 40%)", marginBlockStart: 3 }}>
                כל תרומה — גדולה או קטנה — מקדמת את הקמפיין. (מינימום ₪{minCustom})
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                min={minCustom}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder={`₪${minCustom}+`}
                dir="ltr"
                style={{ width: 110, padding: "10px 12px", borderRadius: 10, border: "1.5px solid hsl(38 30% 78%)", fontSize: 15, fontWeight: 700, outline: "none" }}
              />
              <button
                onClick={submitCustom}
                style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: "hsl(215 55% 24%)", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
              >
                תמכו ←
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Story / Why / Author / Timeline / FAQ ─────────────── */
function StorySection({ campaign }: { campaign: CampaignRow }) {
  const { ref, visible } = useInView(0.1);
  if (!campaign.story_html) return null;
  return (
    <section ref={ref} style={{ background: "white", padding: "80px 24px" }}>
      <div
        className="campaign-story-grid"
        style={{
          maxWidth: 980,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: campaign.story_image_url ? "3fr 2fr" : "1fr",
          gap: 48,
          alignItems: "center",
          opacity: visible ? 1 : 0,
          transform: visible ? "none" : "translateY(20px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        <div>
          <p style={{ color: "hsl(38 75% 40%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", marginBlockEnd: 8 }}>הסיפור</p>
          <div
            className="campaign-rich-text"
            style={{ fontSize: 16, color: "hsl(215 30% 24%)", lineHeight: 1.8 }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(campaign.story_html) }}
          />
        </div>
        {campaign.story_image_url && (
          <div style={{ borderRadius: 20, overflow: "hidden", border: "2px solid hsl(38 75% 55% / 0.3)", boxShadow: "0 16px 48px hsl(215 55% 8% / 0.25)" }}>
            <img src={campaign.story_image_url} alt="" style={{ width: "100%", display: "block" }} />
          </div>
        )}
      </div>
    </section>
  );
}

function WhySection({ campaign }: { campaign: CampaignRow }) {
  const { ref, visible } = useInView(0.1);
  const cards = Array.isArray(campaign.why_cards) ? campaign.why_cards : [];
  if (!cards.length) return null;
  return (
    <section ref={ref} style={{ background: "hsl(38 30% 96%)", padding: "80px 24px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBlockEnd: 40 }}>
          <p style={{ color: "hsl(38 75% 40%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", marginBlockEnd: 8 }}>למה דווקא עכשיו</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 }}>
          {cards.map((card, i) => (
            <div
              key={i}
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
                    background: GOLD_GRAD,
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
                  {card.num || String(i + 1).padStart(2, "0")}
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "hsl(215 55% 20%)", lineHeight: 1.3 }}>{card.title}</h3>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "hsl(215 30% 30%)", lineHeight: 1.7 }}>{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AuthorSection({ campaign }: { campaign: CampaignRow }) {
  const { ref, visible } = useInView(0.1);
  if (!campaign.author_html && !campaign.author_name) return null;
  return (
    <section ref={ref} style={{ background: "hsl(215 55% 14%)", padding: "80px 24px" }}>
      <div
        className="campaign-author-grid"
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: campaign.author_image_url ? "2fr 3fr" : "1fr",
          gap: 48,
          alignItems: "center",
        }}
      >
        {campaign.author_image_url && (
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              border: "2px solid hsl(38 75% 55% / 0.3)",
              boxShadow: "0 16px 48px hsl(215 55% 8% / 0.5)",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.7s ease",
            }}
          >
            <img src={campaign.author_image_url} alt={campaign.author_name || ""} style={{ width: "100%", display: "block" }} />
          </div>
        )}
        <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.7s ease 0.15s" }}>
          <p style={{ color: "hsl(38 85% 66%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", marginBlockEnd: 8 }}>מי מאחורי הקמפיין</p>
          {campaign.author_name && (
            <h2 style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 900, color: "white", margin: "0 0 16px" }}>{campaign.author_name}</h2>
          )}
          {campaign.author_html && (
            <div
              className="campaign-rich-text-dark"
              style={{ fontSize: 15, color: "hsl(215 10% 78%)", lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(campaign.author_html) }}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function TimelineSection({ campaign }: { campaign: CampaignRow }) {
  const phases = Array.isArray(campaign.phases) ? campaign.phases : [];
  if (!phases.length) return null;
  return (
    <section style={{ background: "white", padding: "72px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBlockEnd: 40 }}>
          <p style={{ color: "hsl(38 75% 40%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", marginBlockEnd: 8 }}>ציר זמן</p>
          <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 900, color: "hsl(215 55% 20%)", margin: 0 }}>מה קורה מתי</h2>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 0, justifyContent: "center" }}>
          {phases.map((p, i) => (
            <div key={i} style={{ flex: "1 1 130px", minWidth: 120, textAlign: "center", position: "relative", padding: "0 8px 8px" }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  margin: "0 auto 10px",
                  background: p.done ? "hsl(150 55% 42%)" : p.current ? GOLD_GRAD : "hsl(215 15% 86%)",
                  border: p.current ? "3px solid hsl(38 75% 70%)" : "none",
                  boxShadow: p.current ? "0 0 0 4px hsl(38 75% 55% / 0.2)" : "none",
                }}
              />
              <div style={{ fontWeight: 800, fontSize: 13.5, color: p.current ? "hsl(38 65% 38%)" : "hsl(215 45% 24%)", lineHeight: 1.3 }}>{p.label}</div>
              {p.sub && <div style={{ fontSize: 11.5, color: "hsl(215 15% 55%)", marginBlockStart: 3 }}>{p.sub}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection({ campaign }: { campaign: CampaignRow }) {
  const items = Array.isArray(campaign.faq) ? campaign.faq : [];
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (!items.length) return null;
  return (
    <section style={{ background: "hsl(38 30% 96%)", padding: "72px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBlockEnd: 32 }}>
          <p style={{ color: "hsl(38 75% 40%)", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", marginBlockEnd: 8 }}>שאלות ותשובות</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item, i) => (
            <div key={i} style={{ background: "white", border: "1.5px solid hsl(215 15% 89%)", borderRadius: 14, overflow: "hidden" }}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                style={{
                  width: "100%",
                  textAlign: "start",
                  padding: "16px 18px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 15,
                  color: "hsl(215 55% 20%)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontFamily: "inherit",
                }}
              >
                {item.q}
                <span style={{ color: "hsl(38 75% 45%)", flexShrink: 0 }}>{openIdx === i ? "−" : "+"}</span>
              </button>
              {openIdx === i && (
                <div style={{ padding: "0 18px 16px", fontSize: 14, color: "hsl(215 25% 32%)", lineHeight: 1.7 }}>{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ supporters, progressPct, onSupportClick }: { supporters: number; progressPct: number; onSupportClick: () => void }) {
  return (
    <section style={{ background: "hsl(215 55% 12%)", padding: "72px 24px", textAlign: "center" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(24px, 3.4vw, 38px)", fontWeight: 900, color: "white", margin: "0 0 12px", lineHeight: 1.25 }}>
          {supporters} תומכים כבר הצטרפו — {progressPct}% מהיעד
        </h2>
        <p style={{ fontSize: 16, color: "hsl(215 10% 70%)", margin: "0 0 28px" }}>כל תמיכה מקרבת אותנו לסיום.</p>
        <button
          onClick={onSupportClick}
          style={{ padding: "15px 40px", background: GOLD_GRAD, color: "hsl(215 55% 12%)", border: "none", borderRadius: 99, fontWeight: 900, fontSize: 17, cursor: "pointer" }}
        >
          תמכו בקמפיין ↑
        </button>
      </div>
    </section>
  );
}

/* ─── Inline checkout modal (Grow) ──────────────────────── */
function InlineCheckoutModal({ campaign, tier, onClose }: { campaign: CampaignRow; tier: CampaignTierRow; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { startPayment, isReady: paymentReady, isLoading: paymentLoading, error: paymentError } = useGrowPayment();

  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);

  const needsShipping = tier.needs_shipping;
  const [shippingStreet, setShippingStreet] = useState("");
  const [shippingHouseNumber, setShippingHouseNumber] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");

  const [sdkTimedOut, setSdkTimedOut] = useState(false);
  useEffect(() => {
    if (paymentReady) return;
    const timer = setTimeout(() => setSdkTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [paymentReady]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const fallbackUrl = `/donate?amount=${tier.price}&source=${campaign.slug}&tier=${tier.tier_key}&type=donation`;

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
        description: `תרומה — ${campaign.title}`,
        fullName: donorName,
        phone: donorPhone,
        email: donorEmail,
        type: "donation",
        thankYouType: "donation",
        installments: tier.max_installments,
        meta: {
          product: campaign.slug,
          tos_accepted: true,
          tos_accepted_at: new Date().toISOString(),
        },
        donationMeta: {
          is_monthly: false,
          donor_email: donorEmail || undefined,
          user_id: user?.id,
          // @ts-expect-error — שדות קמפיין מועברים ל-create-payment (source/tier_id/shipping)
          source: campaign.slug,
          tier_id: tier.tier_key,
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
      toast({ title: "שגיאה בפתיחת חלון התשלום", description: err.message, variant: "destructive" });
    }
  }, [donorName, donorPhone, donorEmail, tosAccepted, tier, campaign, user, startPayment, toast, onClose, needsShipping, shippingStreet, shippingHouseNumber, shippingCity, shippingZip, shippingNotes]);

  const isProcessing = paymentLoading;
  const addressOk = !needsShipping || (!!shippingStreet.trim() && !!shippingHouseNumber.trim() && !!shippingCity.trim());
  const canSubmit = !isProcessing && (paymentReady || sdkTimedOut) && tosAccepted && !!donorName && !!donorPhone && addressOk;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1.5px solid hsl(38 30% 82%)",
    fontFamily: "inherit",
    fontSize: 14,
    color: "hsl(215 40% 14%)",
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "hsl(215 30% 42%)", marginBlockEnd: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "hsl(215 55% 8% / 0.75)", backdropFilter: "blur(4px)" }} />

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

        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBlockEnd: 16, borderBlockEnd: "1px solid hsl(38 30% 88%)" }}>
          {tier.image_url && (
            <img
              src={tier.image_url}
              alt={tier.image_alt || ""}
              style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: "1.5px solid hsl(38 50% 84%)" }}
            />
          )}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "hsl(38 65% 45%)", letterSpacing: "0.1em", marginBlockEnd: 3 }}>{tier.name}</div>
            {tier.headline && <div style={{ fontWeight: 900, fontSize: 17, color: "hsl(215 55% 16%)", lineHeight: 1.25 }}>{tier.headline}</div>}
            <div style={{ fontSize: 20, fontWeight: 900, color: "hsl(38 75% 42%)", marginBlockStart: 2 }}>₪{Number(tier.price).toLocaleString("he-IL")}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {tier.perks.map((perk) => (
            <div key={perk} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "hsl(215 30% 30%)" }}>
              <CheckCircle2 size={14} style={{ color: "hsl(38 75% 45%)", flexShrink: 0 }} />
              {perk}
            </div>
          ))}
        </div>

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
          {tier.max_installments > 1 ? `ניתן לפצל עד ${tier.max_installments} תשלומים — ללא ריבית` : "תשלום אחד בלבד"}
        </div>

        {!paymentReady && !sdkTimedOut && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "hsl(38 60% 96%)", borderRadius: 10, fontSize: 13, color: "hsl(215 40% 35%)", border: "1px solid hsl(38 50% 86%)" }}>
            <Loader2 size={14} className="animate-spin" style={{ color: "hsl(38 65% 48%)", flexShrink: 0 }} />
            טוען מערכת תשלום מאובטחת...
          </div>
        )}

        {sdkTimedOut && !paymentReady && (
          <div style={{ padding: "12px 16px", background: "hsl(38 60% 96%)", borderRadius: 10, fontSize: 13, color: "hsl(215 40% 35%)", border: "1px solid hsl(38 50% 84%)", lineHeight: 1.6 }}>
            <strong>מערכת התשלום לא נטענה.</strong> ניתן להמשיך לדף התשלום:
            <a
              href={fallbackUrl}
              style={{
                display: "block",
                marginBlockStart: 8,
                padding: "9px 16px",
                background: GOLD_GRAD,
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

        {paymentError && (
          <div style={{ padding: "10px 14px", background: "hsl(0 65% 96%)", border: "1px solid hsl(0 60% 85%)", borderRadius: 10, fontSize: 13, color: "hsl(0 65% 42%)" }}>
            {paymentError}
          </div>
        )}

        <div>
          <label style={labelStyle}>שם מלא *</label>
          <input type="text" value={donorName} onChange={(e) => setDonorName(e.target.value)} placeholder="שם פרטי ומשפחה..." dir="rtl" style={inputStyle} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>טלפון *</label>
            <input type="tel" value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} placeholder="05XXXXXXXX" dir="ltr" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>אימייל</label>
            <input type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} placeholder="email@..." dir="ltr" style={inputStyle} />
          </div>
        </div>

        {needsShipping && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "hsl(215 30% 42%)", paddingBlockEnd: 4, borderBlockEnd: "1px solid hsl(38 30% 88%)" }}>
              כתובת למשלוח
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <div>
                <label style={labelStyle}>רחוב *</label>
                <input type="text" value={shippingStreet} onChange={(e) => setShippingStreet(e.target.value)} placeholder="שם הרחוב" dir="rtl" style={inputStyle} />
              </div>
              <div style={{ width: 72 }}>
                <label style={labelStyle}>מס׳ *</label>
                <input type="text" value={shippingHouseNumber} onChange={(e) => setShippingHouseNumber(e.target.value)} placeholder="12" dir="ltr" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <div>
                <label style={labelStyle}>עיר *</label>
                <input type="text" value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} placeholder="שם היישוב" dir="rtl" style={inputStyle} />
              </div>
              <div style={{ width: 96 }}>
                <label style={labelStyle}>מיקוד</label>
                <input type="text" value={shippingZip} onChange={(e) => setShippingZip(e.target.value)} placeholder="7 ספרות" dir="ltr" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>הערות משלוח (דירה, קומה, קוד כניסה...)</label>
              <textarea value={shippingNotes} onChange={(e) => setShippingNotes(e.target.value)} placeholder="לא חובה" dir="rtl" rows={2} style={{ ...inputStyle, fontSize: 13, resize: "vertical" }} />
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <input
            id="campaign-tos"
            type="checkbox"
            checked={tosAccepted}
            onChange={(e) => setTosAccepted(e.target.checked)}
            style={{ marginBlockStart: 2, accentColor: "hsl(38 75% 45%)", flexShrink: 0 }}
          />
          <label htmlFor="campaign-tos" style={{ fontSize: 12, color: "hsl(215 20% 48%)", lineHeight: 1.6, cursor: "pointer" }}>
            אני מאשר/ת את{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "hsl(38 65% 42%)", textDecoration: "underline" }}>
              תקנון האתר
            </a>{" "}
            ומדיניות הפרטיות, ואני מעל גיל 18.
          </label>
        </div>

        <button
          onClick={sdkTimedOut && !paymentReady ? undefined : handleSubmit}
          disabled={!canSubmit}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            border: "none",
            background: canSubmit ? GOLD_GRAD : "hsl(38 30% 78%)",
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
            <>
              <Loader2 size={16} className="animate-spin" />
              מעבד תשלום...
            </>
          ) : (
            <>תמוך ב-₪{Number(tier.price).toLocaleString("he-IL")}</>
          )}
        </button>

        <p style={{ margin: 0, textAlign: "center", fontSize: 11, color: "hsl(215 20% 52%)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <ShieldCheck size={11} />
          סליקה מאובטחת באמצעות Grow — אשראי, ביט, Apple Pay, Google Pay
        </p>
      </div>
    </div>
  );
}

/* ─── עמוד ──────────────────────────────────────────────── */
export default function CampaignPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useCampaignBySlug(slug);
  const { raised, supporters } = useLiveCampaignStats(data?.campaign ? slug : undefined);
  const tierCounts = useLiveTierCounts(data?.campaign ? slug : undefined);
  const scrollY = useScrollY();
  const [checkoutTier, setCheckoutTier] = useState<CampaignTierRow | null>(null);

  useEffect(() => {
    if (data?.campaign) document.title = `${data.campaign.title} · בני ציון`;
  }, [data?.campaign]);

  const scrollToTiers = useCallback(() => {
    document.getElementById("tiers")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (isLoading) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "hsl(215 55% 12%)", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(38 85% 70%)", fontWeight: 700 }}>
        טוען את הקמפיין…
      </div>
    );
  }

  // RLS מסתיר קמפיין כבוי מהציבור → "לא נמצא" = לא קיים או שהסתיים
  if (!data?.campaign) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "hsl(215 55% 12%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>🕊️</div>
        <h1 style={{ color: "white", fontWeight: 900, fontSize: "clamp(22px, 3vw, 32px)", margin: 0 }}>הקמפיין הסתיים או שאינו זמין</h1>
        <p style={{ color: "hsl(215 10% 65%)", margin: 0, fontSize: 15 }}>תודה לכל התומכים! אפשר להמשיך לתמוך בפעילות בני ציון בדף התרומות.</p>
        <div style={{ display: "flex", gap: 12, marginBlockStart: 8 }}>
          <Link to="/donate" style={{ padding: "11px 24px", background: GOLD_GRAD, color: "hsl(215 55% 12%)", borderRadius: 99, fontWeight: 800, textDecoration: "none", fontSize: 14 }}>
            לדף התרומות
          </Link>
          <Link to="/" style={{ padding: "11px 24px", border: "1.5px solid hsl(215 20% 40%)", color: "hsl(215 10% 75%)", borderRadius: 99, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
            לאתר בני ציון
          </Link>
        </div>
      </div>
    );
  }

  const { campaign, tiers } = data;
  const goal = Number(campaign.goal_amount) || 0;
  const progressPct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

  return (
    <div dir="rtl" style={{ fontFamily: "'Ploni', 'Heebo', system-ui, sans-serif", background: "hsl(215 55% 12%)" }}>
      <style>{`
        @media (max-width: 760px) {
          .campaign-story-grid, .campaign-author-grid { grid-template-columns: 1fr !important; }
        }
        .campaign-rich-text p { margin: 0 0 14px; }
        .campaign-rich-text p:last-child { margin-block-end: 0; }
        .campaign-rich-text-dark p { margin: 0 0 14px; }
        .campaign-rich-text-dark p:last-child { margin-block-end: 0; }
      `}</style>

      <StickyNav scrolled={scrollY > 80} title={campaign.hero_title || campaign.title} progressPct={progressPct} onSupportClick={scrollToTiers} />

      {checkoutTier && <InlineCheckoutModal campaign={campaign} tier={checkoutTier} onClose={() => setCheckoutTier(null)} />}

      <HeroSection campaign={campaign} raised={raised} supporters={supporters} progressPct={progressPct} onSupportClick={scrollToTiers} />
      <VideoSection campaign={campaign} />
      <ProofStrip campaign={campaign} supporters={supporters} />
      <TiersSection campaign={campaign} tiers={tiers} tierCounts={tierCounts} onSupport={setCheckoutTier} />
      <StorySection campaign={campaign} />
      <WhySection campaign={campaign} />
      <AuthorSection campaign={campaign} />
      <TimelineSection campaign={campaign} />
      <FaqSection campaign={campaign} />
      <FinalCTA supporters={supporters} progressPct={progressPct} onSupportClick={scrollToTiers} />

      <footer style={{ background: "hsl(215 55% 11%)", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ color: "white", fontWeight: 700, margin: "0 0 8px" }}>תנועת בני ציון ללימוד תנ"ך</p>
        <p style={{ fontSize: 13, color: "hsl(215 10% 48%)", margin: 0 }}>
          <a href="mailto:office@bneyzion.co.il" style={{ color: "hsl(38 75% 58%)", textDecoration: "none" }}>
            office@bneyzion.co.il
          </a>
          {" · "}
          <a href="https://bneyzion.co.il" style={{ color: "hsl(38 75% 58%)", textDecoration: "none" }}>
            bneyzion.co.il
          </a>
        </p>
      </footer>
    </div>
  );
}
