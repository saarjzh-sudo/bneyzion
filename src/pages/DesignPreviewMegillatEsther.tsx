/**
 * /design-megilat-esther — Subscription sales page, redesigned.
 *
 * The Megillat Esther landing already drives subscription signups in
 * production. This page sharpens the design + adds a clear path for
 * EXISTING subscribers to log in to their personal area.
 *
 * Design departure from default sandbox: this page uses an immersive
 * scrollytelling layout (NOT the standard parchment+hero pattern) so it
 * feels distinct from the rest of the site — a marketing surface, not
 * an article.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  BookOpen,
  Calendar,
  CheckCircle2,
  Sparkles,
  Users,
  ArrowLeft,
  Quote,
  Crown,
  ShieldCheck,
  Zap,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";

const HERO_IMAGE = "/images/series-tanach-victory.png";

const TIERS = [
  {
    id: "monthly",
    label: "מנוי חודשי",
    price: 36,
    period: "₪ לחודש",
    bestFor: "להתחיל בלי התחייבות",
    features: [
      "פרק תנ״ך אחד בשבוע — וידאו של 30-50 דקות",
      "מאמר העומק של הפרק",
      "חידת השבוע",
      "קבוצת WhatsApp ייעודית",
      "גישה מלאה לקטלוג השיעורים",
    ],
    cta: "התחל מנוי חודשי",
    highlighted: false,
  },
  {
    id: "annual",
    label: "מנוי שנתי",
    price: 360,
    period: "₪ לשנה",
    bestFor: "הכי משתלם — חיסכון 18%",
    features: [
      "כל מה שיש במנוי החודשי",
      "10% הנחה בחנות לכל השנה",
      "כל הקורסים הדיגיטליים בחינם",
      "ספר מתנה לבחירה",
      "גישה מוקדמת לפרקים חדשים",
      "הזמנה לכנס השנתי",
    ],
    cta: "התחל מנוי שנתי",
    highlighted: true,
    save: "חסוך 72₪",
  },
  {
    id: "lifetime",
    label: "חבר כסיל לחיים",
    price: 1800,
    period: "₪ חד-פעמי",
    bestFor: "תמיכה ארוכת-טווח באתר",
    features: [
      "גישה לכל החיים — לעולם לא מסתיים",
      "תג 'חבר כסיל לחיים' באזור האישי",
      "כל הקורסים הקיימים והעתידיים",
      "ספרי המנוי כל שנה",
      "ייעוץ אישי לבחירת מסלול לימוד",
      "הקדשה אישית בעמוד התומכים",
    ],
    cta: "אני בפנים",
    highlighted: false,
  },
];

const TESTIMONIALS = [
  {
    quote: "תוכנית הפרק השבועי שינתה לי את כל ההתייחסות לתנ״ך. מתחיל עם פרק אחד, ושעה אחר כך אני בעוד 4.",
    name: "אבי כהן",
    role: "אבא ל-3, רעננה",
  },
  {
    quote: "הקדשתי שיעורים לעילוי נשמת אבא ז״ל. כל שבוע אני יודע שמישהו לומד בזכותו. זה מה שעוטף אותי.",
    name: "תמר בנימין",
    role: "מורה לתנ״ך, ירושלים",
  },
  {
    quote: "מנוי כסיל לחיים — היה ההחלטה הכי טובה שלי השנה. הילדים גדלים על השיעורים האלה.",
    name: "יואב אברהם",
    role: "ראש ישיבה, גוש עציון",
  },
];

const FAQS = [
  { q: "מה ההבדל בין הפרקים החינמיים לתוכנית?", a: "התוכנית מציעה ליווי שבועי שלם — שיעור + מאמר + חידה + קבוצת WhatsApp פעילה. החינמיים הם השיעורים בלבד, בלי הקונטקסט המורחב." },
  { q: "אפשר לעבור בין מסלולים?", a: "כן, בכל זמן. אפשר לשדרג / לבטל / לשנות מהאזור האישי, בלי כל שאלה." },
  { q: "מה קורה אם אני לא מספיק?", a: "הכל נשמר באזור האישי — כל פרק שלא הספקת ימתין לך. אפשר לחזור אחרי חודש, אחרי שנה. הספרים בלתי-מתפוגגים." },
  { q: "תרומה במקום מנוי?", a: "אפשר! אם אתה רוצה לתרום בלי לקבל גישה — יש כפתור תרומה ייעודי בעמוד התרומה." },
];

export default function DesignPreviewMegillatEsther() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  return (
    <DesignLayout transparentHeader overlapHero>
      {/* ─── Hero — magazine cover style ─── */}
      <div
        style={{
          position: "relative",
          minHeight: 720,
          overflow: "hidden",
          marginTop: -96,
          background: gradients.warmDark,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${HERO_IMAGE})`,
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
            opacity: 0.32,
            filter: "brightness(0.7) saturate(1.1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 20% 50%, rgba(232,213,160,0.15) 0%, transparent 55%), linear-gradient(180deg, rgba(45,31,14,0.5) 0%, rgba(15,8,2,0.85) 100%)",
          }}
        />

        <div
          dir="rtl"
          style={{
            position: "relative",
            minHeight: 720,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
            gap: "3rem",
            alignItems: "center",
            padding: "150px 1.5rem 4rem",
            maxWidth: 1200,
            margin: "0 auto",
          }}
          className="megillat-hero"
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.4rem 0.85rem",
                borderRadius: radii.pill,
                background: "rgba(232,213,160,0.15)",
                border: "1px solid rgba(232,213,160,0.3)",
                color: colors.goldShimmer,
                fontFamily: fonts.body,
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: "1.5rem",
                backdropFilter: "blur(8px)",
              }}
            >
              <Sparkles size={11} />
              תוכנית הפרק השבועי
            </div>

            <h1
              style={{
                fontFamily: fonts.display,
                fontWeight: 700,
                fontSize: "clamp(2.6rem, 6vw, 4.5rem)",
                color: "rgba(255,255,255,0.97)",
                textShadow: "0 4px 30px rgba(0,0,0,0.5)",
                margin: "0 0 1.25rem",
                lineHeight: 1.05,
              }}
            >
              פרק <em style={{ color: colors.goldShimmer, fontStyle: "italic" }}>אחד</em> בשבוע<br />
              ב<em style={{ color: colors.goldShimmer, fontStyle: "italic" }}>לחיים</em>
            </h1>

            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "1.15rem",
                lineHeight: 1.85,
                color: "rgba(255,255,255,0.78)",
                maxWidth: 540,
                margin: "0 0 2rem",
              }}
            >
              תוכנית שיטתית, חמה וקהילתית ללימוד תנ״ך לאורך 6 שנים. <strong style={{ color: "rgba(255,255,255,0.95)" }}>פרק אחד — שיעור, מאמר, חידה וחברותא דיגיטלית.</strong> 9,300+ לומדים פעילים.
            </p>

            <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", alignItems: "center" }}>
              <a
                href="#tiers"
                style={{
                  padding: "1rem 2rem",
                  borderRadius: radii.lg,
                  border: "none",
                  background: gradients.goldButton,
                  color: "white",
                  fontFamily: fonts.accent,
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  cursor: "pointer",
                  boxShadow: "0 8px 32px rgba(139,111,71,0.45)",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Heart size={16} fill="currentColor" />
                התחל מנוי
              </a>

              {/* CRITICAL: existing-subscriber login path */}
              <Link
                to="/design-portal-subscriber"
                style={{
                  padding: "1rem 1.5rem",
                  borderRadius: radii.lg,
                  border: "1.5px solid rgba(232,213,160,0.4)",
                  background: "rgba(232,213,160,0.08)",
                  color: colors.goldShimmer,
                  fontFamily: fonts.accent,
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  backdropFilter: "blur(8px)",
                }}
              >
                <ArrowLeft size={14} />
                כבר מנוי? התחבר לאזור האישי
              </Link>
            </div>

            {/* Trust strip */}
            <div style={{ display: "flex", gap: "2rem", marginTop: "3rem", flexWrap: "wrap", color: "rgba(255,255,255,0.6)", fontFamily: fonts.body, fontSize: "0.82rem" }}>
              <TrustItem icon={<Users size={14} />} label="9,300+ לומדים" />
              <TrustItem icon={<Calendar size={14} />} label="6 שנות פעילות" />
              <TrustItem icon={<ShieldCheck size={14} />} label="ביטול בכל זמן" />
            </div>
          </div>

          {/* Right: bento of program elements */}
          <div className="megillat-hero-bento" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <BentoTile big icon={<BookOpen size={18} />} title="שיעור הפרק" desc="30-50 דקות וידאו עם הרב" highlight />
            <BentoTile icon={<Zap size={18} />} title="מאמר העומק" desc="קריאה של 10 דקות" />
            <BentoTile icon={<Sparkles size={18} />} title="חידת השבוע" desc="מאתגרת ומשחקית" />
            <BentoTile big icon={<Users size={18} />} title="קבוצת WhatsApp" desc="9,300+ לומדים פעילים" />
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .megillat-hero { grid-template-columns: 1fr !important; }
            .megillat-hero-bento { display: none; }
          }
        `}</style>
      </div>

      {/* ─── Sticky CTA bar (desktop only) ─── */}

      {/* ─── Tiers ─── */}
      <section id="tiers" style={{ background: colors.parchment, padding: "5rem 1.5rem 4rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }} dir="rtl">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              מסלולים
            </div>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", color: colors.textDark, margin: 0, lineHeight: 1.2 }}>
              איך תרצה להצטרף?
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {TIERS.map((t) => (
              <div
                key={t.id}
                style={{
                  background: t.highlighted ? "white" : colors.parchmentDark,
                  borderRadius: radii.xl,
                  padding: "2rem 1.75rem",
                  border: t.highlighted ? `2px solid ${colors.goldDark}` : `1px solid rgba(139,111,71,0.12)`,
                  boxShadow: t.highlighted ? "0 12px 40px rgba(139,111,71,0.18), 0 0 0 4px rgba(196,162,101,0.1)" : shadows.cardSoft,
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {t.highlighted && (
                  <div
                    style={{
                      position: "absolute",
                      top: -14,
                      insetInlineStart: "50%",
                      transform: "translateX(50%)",
                      padding: "0.35rem 1rem",
                      borderRadius: radii.pill,
                      background: gradients.goldButton,
                      color: "white",
                      fontFamily: fonts.body,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      boxShadow: shadows.goldGlow,
                      whiteSpace: "nowrap",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <Crown size={11} />
                    הכי פופולרי
                  </div>
                )}

                <div style={{ marginBottom: "1.25rem" }}>
                  <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.3rem", color: colors.textDark, margin: "0 0 0.3rem" }}>
                    {t.label}
                  </h3>
                  <div style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted }}>
                    {t.bestFor}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginBottom: "0.4rem" }}>
                  <span style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "2.6rem", color: colors.goldDark, lineHeight: 1 }}>
                    {t.price.toLocaleString("he-IL")}
                  </span>
                  <span style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted }}>
                    {t.period}
                  </span>
                </div>
                {t.save && (
                  <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: "#a52a2a", fontWeight: 700, marginBottom: "1.25rem" }}>
                    {t.save}
                  </div>
                )}
                {!t.save && <div style={{ height: "1.25rem" }} />}

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", flex: 1 }}>
                  {t.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        fontFamily: fonts.body,
                        fontSize: "0.88rem",
                        color: colors.textMid,
                        padding: "0.5rem 0",
                        borderBottom: `1px solid rgba(139,111,71,0.05)`,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.55rem",
                        lineHeight: 1.55,
                      }}
                    >
                      <CheckCircle2 size={14} style={{ color: colors.goldDark, flexShrink: 0, marginTop: "0.18rem" }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  style={{
                    width: "100%",
                    padding: "0.95rem 1.5rem",
                    borderRadius: radii.lg,
                    border: t.highlighted ? "none" : `1.5px solid ${colors.goldDark}`,
                    background: t.highlighted ? gradients.goldButton : "transparent",
                    color: t.highlighted ? "white" : colors.goldDark,
                    fontFamily: fonts.accent,
                    fontWeight: 700,
                    fontSize: "1rem",
                    cursor: "pointer",
                    boxShadow: t.highlighted ? shadows.goldGlow : "none",
                  }}
                >
                  {t.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Existing subscriber callout */}
          <div
            style={{
              marginTop: "2.5rem",
              padding: "1.25rem 1.75rem",
              background: "white",
              borderRadius: radii.lg,
              border: `1px dashed rgba(139,111,71,0.3)`,
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              maxWidth: 700,
              margin: "2.5rem auto 0",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.95rem", color: colors.textDark, marginBottom: "0.2rem" }}>
                כבר מנוי?
              </div>
              <div style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted }}>
                התחבר לאזור האישי שלך — שם תראה את כל הפרקים שלמדת ואת הספרים שלך.
              </div>
            </div>
            <Link
              to="/design-portal-subscriber"
              style={{
                padding: "0.7rem 1.3rem",
                borderRadius: radii.md,
                background: gradients.warmDark,
                color: colors.goldShimmer,
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "0.85rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <ArrowLeft size={13} />
              לאזור האישי
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section style={{ background: colors.parchmentDark, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }} dir="rtl">
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.oliveMain, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              מה אומרים הלומדים
            </div>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "clamp(1.5rem, 2.8vw, 2.1rem)", color: colors.textDark, margin: 0 }}>
              מאות סיפורים, אלפי שעות לימוד
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                style={{
                  background: "white",
                  borderRadius: radii.xl,
                  padding: "1.75rem",
                  border: `1px solid rgba(139,111,71,0.1)`,
                  boxShadow: shadows.cardSoft,
                }}
              >
                <Quote size={20} style={{ color: colors.goldDark, opacity: 0.5, marginBottom: "0.85rem" }} />
                <p style={{ fontFamily: fonts.display, fontSize: "1rem", lineHeight: 1.85, color: colors.textDark, margin: "0 0 1.25rem", fontStyle: "italic" }}>
                  "{t.quote}"
                </p>
                <div
                  style={{
                    paddingTop: "0.85rem",
                    borderTop: `1px solid rgba(139,111,71,0.08)`,
                    fontFamily: fonts.display,
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: colors.textDark,
                  }}
                >
                  {t.name}
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted }}>
                  {t.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section style={{ background: colors.parchment, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }} dir="rtl">
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              שאלות ותשובות
            </div>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "clamp(1.5rem, 2.8vw, 2.1rem)", color: colors.textDark, margin: 0 }}>
              דברים ששואלים הרבה
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {FAQS.map((f, i) => (
              <button
                key={i}
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                style={{
                  background: "white",
                  borderRadius: radii.lg,
                  padding: "1.1rem 1.5rem",
                  border: `1px solid rgba(139,111,71,0.1)`,
                  textAlign: "right",
                  cursor: "pointer",
                  fontFamily: fonts.body,
                  width: "100%",
                  transition: "border-color 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                  <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1rem", color: colors.textDark }}>
                    {f.q}
                  </span>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: activeFaq === i ? gradients.goldButton : "rgba(139,111,71,0.08)",
                      color: activeFaq === i ? "white" : colors.goldDark,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontFamily: fonts.display,
                      fontWeight: 800,
                      transition: "all 0.15s",
                    }}
                  >
                    {activeFaq === i ? "−" : "+"}
                  </span>
                </div>
                {activeFaq === i && (
                  <p style={{ marginTop: "0.85rem", paddingTop: "0.85rem", borderTop: `1px solid rgba(139,111,71,0.08)`, fontFamily: fonts.body, fontSize: "0.92rem", lineHeight: 1.85, color: colors.textMuted, marginBottom: 0 }}>
                    {f.a}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section style={{ background: gradients.warmDark, padding: "5rem 1.5rem", color: "white", textAlign: "center" }} dir="rtl">
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <Sparkles style={{ width: 32, height: 32, color: colors.goldShimmer, margin: "0 auto 1rem" }} />
          <h2 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "clamp(1.6rem, 3vw, 2.2rem)", margin: "0 0 1rem", fontStyle: "italic", lineHeight: 1.3 }}>
            בנה הרגל. גלה תורה. לא לבד.
          </h2>
          <p style={{ fontFamily: fonts.body, fontSize: "1rem", lineHeight: 1.85, color: "rgba(255,255,255,0.7)", marginBottom: "2rem" }}>
            הצטרף לקהילת 9,300 הלומדים — והפוך את התנ״ך לחלק מהשבוע שלך.
          </p>
          <a
            href="#tiers"
            style={{
              padding: "1rem 2.5rem",
              borderRadius: radii.lg,
              border: "none",
              background: gradients.goldButton,
              color: "white",
              fontFamily: fonts.accent,
              fontWeight: 700,
              fontSize: "1.1rem",
              cursor: "pointer",
              boxShadow: shadows.goldGlow,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Heart size={18} fill="currentColor" />
            התחל מנוי עכשיו
          </a>
        </div>
      </section>
    </DesignLayout>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
      <span style={{ color: colors.goldShimmer }}>{icon}</span>
      {label}
    </div>
  );
}

function BentoTile({ big = false, icon, title, desc, highlight = false }: { big?: boolean; icon: React.ReactNode; title: string; desc: string; highlight?: boolean }) {
  return (
    <div
      style={{
        gridColumn: big ? "span 2" : "span 1",
        padding: "1.25rem",
        background: highlight ? gradients.goldButton : "rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderRadius: radii.xl,
        border: `1px solid ${highlight ? "rgba(232,213,160,0.4)" : "rgba(255,255,255,0.1)"}`,
        color: "white",
        boxShadow: highlight ? shadows.goldGlow : "none",
      }}
    >
      <div style={{ marginBottom: "0.6rem", color: highlight ? "white" : colors.goldShimmer }}>{icon}</div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "0.95rem", marginBottom: "0.25rem" }}>
        {title}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
        {desc}
      </div>
    </div>
  );
}
