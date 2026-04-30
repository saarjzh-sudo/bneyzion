/**
 * /design-megilat-esther — Subscription sales page v2.
 *
 * Updated to reflect the confirmed subscription model:
 *   - Single tier only: ₪5 intro → ₪110/month auto direct-debit (הוראת קבע)
 *   - No annual / no lifetime tiers
 *   - Payment via useGrowPayment (direct debit, not wallet)
 *   - Content: חגי + זכריה + מלאכי (from Drive scan — Drive ID 0AFz55knVlI2BUk9PVA)
 *   - Existing subscribers → /design-portal-subscriber (with real access check)
 *
 * Iron rules respected:
 *   - Sandbox only (/design-* route)
 *   - No mock payment — useGrowPayment calls real API
 *   - No vercel.json redirects
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
  ShieldCheck,
  Loader2,
  ChevronDown,
  ChevronUp,
  Play,
  FileText,
  Headphones,
  Presentation,
  Star,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useGrowPayment } from "@/hooks/useGrowPayment";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useAuth } from "@/contexts/AuthContext";

// ── Drive-scan derived content structure for חגי / זכריה / מלאכי ──────────
const PROGRAM_BOOKS = [
  {
    name: "חגי",
    chapters: 2,
    description: "ספר קצר ועוצמתי — נבואות בית שני, קריאה לחידוש ביהמ\"ק, ורוח גאולה בוקעת.",
    chapterList: ["פרק א", "פרק ב"],
  },
  {
    name: "זכריה",
    chapters: 14,
    description: "14 פרקים של חזיונות, מלאכים, ומסרים נצחיים על גאולה, מלחמת גוג ומגוג, ויום ה'.",
    chapterList: ["פרק א", "פרק ב", "פרק ג", "פרק ד", "פרק ה", "פרק ו", "פרק ז", "פרק ח", "פרק ט", "פרק י", "פרק יא", "פרק יב", "פרק יג", "פרק יד"],
  },
  {
    name: "מלאכי",
    chapters: 3,
    description: "הנביא האחרון — ביקורת חריפה, אהבת ה' לישראל, ונבואת אליהו לפני יום ה' הגדול.",
    chapterList: ["פרק א", "פרק ב", "פרק ג"],
  },
];

// ── What each chapter includes (from Drive scan) ──────────────────────────
const CHAPTER_LAYERS = [
  { icon: <Play size={14} />, label: "שיעור וידאו של הרב יואב", type: "video" },
  { icon: <Headphones size={14} />, label: "קריאה מוקלטת עם ביאור", type: "audio" },
  { icon: <FileText size={14} />, label: "דף הכוונה + ביאור ושננתם", type: "pdf" },
  { icon: <Presentation size={14} />, label: "מצגת הפרק", type: "slides" },
  { icon: <BookOpen size={14} />, label: "מאמר הרחבה של הרב יואב", type: "article" },
];

// ── Testimonials ──────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "תוכנית הפרק השבועי שינתה לי את כל ההתייחסות לתנ״ך. מתחיל עם פרק אחד, ושעה אחר כך אני בעוד 4.",
    name: "אבי כהן",
    role: "אבא ל-3, רעננה",
  },
  {
    quote: "הקדשתי שיעורים לעילוי נשמת אבא ז״ל. כל שבוע אני יודע שמישהו לומד בזכותו.",
    name: "תמר בנימין",
    role: "מורה לתנ״ך, ירושלים",
  },
  {
    quote: "₪5 לחודש הראשון? חשבתי שזה ניסוי — נשארתי כבר שנתיים. שווה כל שקל.",
    name: "יואב אברהם",
    role: "לומד פרטי, גוש עציון",
  },
];

// ── FAQ ───────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "מה זה ₪5 לחודש הראשון?",
    a: "מבצע כניסה לחדשים: החודש הראשון עולה ₪5 בלבד (הוראת קבע). מחודש שני ואילך — ₪110 לחודש. ביטול אפשרי בכל עת.",
  },
  {
    q: "מה זה הוראת קבע — זה מחייב?",
    a: "הוראת קבע (direct debit) אוטומטי — החיוב קורה כל חודש ב-Grow (Meshulam). ביטול פשוט: כותבים לנו בוואטסאפ ואנחנו מבטלים תוך 24 שעות.",
  },
  {
    q: "כמה פרקים יהיו? מה אורך התוכנית?",
    a: "19 פרקים: חגי (2), זכריה (14), מלאכי (3). קצב: פרק אחד בשבוע — כ-4.5 חודשים. לאחר מכן ממשיכים לספר הבא.",
  },
  {
    q: "מה ההבדל בין תכני הבסיס לתכני ההרחבה?",
    a: "תכני בסיס: קריאה מוקלטת ודף הכוונה — פתוחים לכולם. תכני הרחבה: שיעור וידאו מלא + מאמר + מצגת — למנויים בלבד.",
  },
  {
    q: "כמה זמן בשבוע מצריך?",
    a: "מינימום: 10-15 דקות (דף הכוונה + קריאה מוקלטת). מלא: שעה (שיעור + מאמר + מצגת). הכל שמור — אפשר לפרוס על כמה ימים.",
  },
];

export default function DesignPreviewMegillatEsther() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [paymentStep, setPaymentStep] = useState<"idle" | "form" | "processing" | "success">("idle");
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" });
  const [formError, setFormError] = useState("");
  const [expandedBook, setExpandedBook] = useState<number | null>(null);

  const { startPayment, isLoading: payLoading, error: payError } = useGrowPayment();
  const { hasAccess, isLoading: accessLoading, isAuthenticated } = useUserAccess("program:weekly-chapter");
  const { user } = useAuth();

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim() || !formData.phone.trim()) {
      setFormError("שם ומספר טלפון נדרשים.");
      return;
    }

    setPaymentStep("processing");

    try {
      await startPayment({
        sum: 5,
        description: "הפרק השבועי — מנוי ₪5 להתחלה",
        fullName: formData.name,
        phone: formData.phone,
        email: formData.email || user?.email || "",
        type: "directDebit",
        meta: {
          product: "weekly-chapter-subscription",
          user_id: user?.id,
        },
      });
      setPaymentStep("success");
    } catch {
      setPaymentStep("form");
      setFormError(payError || "אירעה שגיאה בתהליך התשלום. נסה שוב.");
    }
  };

  return (
    <DesignLayout transparentHeader overlapHero sidebar={false}>
      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          minHeight: 740,
          overflow: "hidden",
          marginTop: -96,
          background: gradients.warmDark,
        }}
      >
        {/* Background image — חגי/זכריה/מלאכי theme: Second Temple era */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url(/images/series-tanach-victory.png)",
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
            opacity: 0.28,
            filter: "brightness(0.6) saturate(1.2)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 15% 50%, rgba(232,213,160,0.12) 0%, transparent 55%), " +
              "linear-gradient(180deg, rgba(45,31,14,0.45) 0%, rgba(10,5,2,0.9) 100%)",
          }}
        />

        <div
          dir="rtl"
          style={{
            position: "relative",
            minHeight: 740,
            display: "grid",
            gridTemplateColumns: "1fr min(480px, 45%)",
            gap: "3rem",
            alignItems: "center",
            padding: "160px 1.5rem 5rem",
            maxWidth: 1240,
            margin: "0 auto",
          }}
          className="megillat-hero-grid"
        >
          {/* Left: copy */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.4rem 0.9rem",
                borderRadius: radii.pill,
                background: "rgba(232,213,160,0.12)",
                border: "1px solid rgba(232,213,160,0.28)",
                color: colors.goldShimmer,
                fontFamily: fonts.body,
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "1.5rem",
                backdropFilter: "blur(8px)",
              }}
            >
              <Sparkles size={11} />
              הפרק השבועי בתנ"ך
            </div>

            <h1
              style={{
                fontFamily: fonts.display,
                fontWeight: 700,
                fontSize: "clamp(2.5rem, 5.5vw, 4.2rem)",
                color: "rgba(255,255,255,0.97)",
                textShadow: "0 4px 30px rgba(0,0,0,0.6)",
                margin: "0 0 1.25rem",
                lineHeight: 1.08,
              }}
            >
              חגי, זכריה ומלאכי —<br />
              <em style={{ color: colors.goldShimmer, fontStyle: "italic" }}>פרק אחד בשבוע</em>
            </h1>

            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "1.1rem",
                lineHeight: 1.9,
                color: "rgba(255,255,255,0.75)",
                maxWidth: 520,
                margin: "0 0 2rem",
              }}
            >
              תוכנית ליווי שבועית: שיעור וידאו, קריאה מוקלטת, דף הכוונה ומאמר הרחבה.
              <strong style={{ color: "rgba(255,255,255,0.95)" }}> 19 פרקים. פרק אחד בשבוע.</strong>
            </p>

            <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", alignItems: "center" }}>
              <a
                href="#subscribe"
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
                התחל ב-₪5 לחודש הראשון
              </a>

              {/* Existing subscriber */}
              <Link
                to="/design-portal-subscriber"
                style={{
                  padding: "1rem 1.5rem",
                  borderRadius: radii.lg,
                  border: "1.5px solid rgba(232,213,160,0.35)",
                  background: "rgba(232,213,160,0.08)",
                  color: colors.goldShimmer,
                  fontFamily: fonts.accent,
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  backdropFilter: "blur(8px)",
                }}
              >
                <ArrowLeft size={13} />
                כבר מנוי? לאזור האישי
              </Link>
            </div>

            {/* Trust strip */}
            <div
              style={{
                display: "flex",
                gap: "2rem",
                marginTop: "3rem",
                flexWrap: "wrap",
                color: "rgba(255,255,255,0.55)",
                fontFamily: fonts.body,
                fontSize: "0.8rem",
              }}
            >
              <TrustItem icon={<Users size={13} />} label="280+ מנויים פעילים" />
              <TrustItem icon={<Calendar size={13} />} label="19 פרקים" />
              <TrustItem icon={<ShieldCheck size={13} />} label="ביטול בכל זמן" />
              <TrustItem icon={<Star size={13} />} label="₪5 לחודש הראשון" />
            </div>
          </div>

          {/* Right: price card */}
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: radii.xl,
              border: "1.5px solid rgba(232,213,160,0.2)",
              padding: "2rem 1.75rem",
              color: "white",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
            }}
            className="megillat-price-card"
          >
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: colors.goldShimmer,
                marginBottom: "1rem",
              }}
            >
              מנוי חודשי — הוראת קבע
            </div>

            {/* Price display */}
            <div style={{ marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
                <span
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 900,
                    fontSize: "3.8rem",
                    color: colors.goldShimmer,
                    lineHeight: 1,
                  }}
                >
                  ₪5
                </span>
                <span style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
                  לחודש הראשון
                </span>
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.85rem",
                  color: "rgba(255,255,255,0.55)",
                  marginTop: "0.3rem",
                }}
              >
                לאחר מכן ₪110 לחודש — ביטול בכל זמן
              </div>
            </div>

            <div
              style={{
                height: 1,
                background: "rgba(232,213,160,0.15)",
                margin: "1.25rem 0",
              }}
            />

            {/* What's included */}
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {[
                "שיעור וידאו מלא של הרב יואב אוריאל",
                "קריאה מוקלטת עם ביאור לכל פרק",
                "דף הכוונה + ביאור ושננתם",
                "מאמר הרחבה על הפרק",
                "מצגת הפרק (PDF להורדה)",
                "גישה לכל הפרקים הקודמים",
              ].map((item) => (
                <li
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.6rem",
                    fontFamily: fonts.body,
                    fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.8)",
                    lineHeight: 1.5,
                  }}
                >
                  <CheckCircle2 size={14} style={{ color: colors.goldShimmer, flexShrink: 0, marginTop: 2 }} />
                  {item}
                </li>
              ))}
            </ul>

            <a
              href="#subscribe"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                width: "100%",
                padding: "1rem",
                borderRadius: radii.lg,
                border: "none",
                background: gradients.goldButton,
                color: "white",
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "1.05rem",
                cursor: "pointer",
                boxShadow: shadows.goldGlow,
                textDecoration: "none",
              }}
            >
              <Heart size={16} fill="currentColor" />
              התחל עכשיו
            </a>

            <div
              style={{
                marginTop: "0.85rem",
                textAlign: "center",
                fontFamily: fonts.body,
                fontSize: "0.73rem",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              100% מאובטח · Grow (Meshulam) · ביטול בוואטסאפ
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .megillat-hero-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
            .megillat-price-card { display: none; }
          }
        `}</style>
      </div>

      {/* ─── Program content: books + chapters ────────────────────────────── */}
      <section style={{ background: colors.parchment, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }} dir="rtl">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.75rem",
                fontWeight: 700,
                color: colors.goldDark,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "0.5rem",
              }}
            >
              מה לומדים
            </div>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                color: colors.textDark,
                margin: "0 0 0.75rem",
              }}
            >
              חגי, זכריה ומלאכי — 19 פרקים
            </h2>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "0.95rem",
                color: colors.textMuted,
                maxWidth: 560,
                margin: "0 auto",
                lineHeight: 1.75,
              }}
            >
              שלושת הנביאים של תקופת שיבת ציון — ספרים שמדברים ישירות לדורנו.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {PROGRAM_BOOKS.map((book, idx) => (
              <div
                key={book.name}
                style={{
                  background: "white",
                  borderRadius: radii.xl,
                  border: `1px solid rgba(139,111,71,0.1)`,
                  boxShadow: expandedBook === idx ? "0 8px 32px rgba(139,111,71,0.12)" : shadows.cardSoft,
                  overflow: "hidden",
                  transition: "box-shadow 0.2s",
                }}
              >
                <button
                  onClick={() => setExpandedBook(expandedBook === idx ? null : idx)}
                  style={{
                    width: "100%",
                    padding: "1.5rem 1.75rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "right",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: radii.md,
                        background: gradients.goldButton,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: shadows.goldGlow,
                      }}
                    >
                      <BookOpen size={20} style={{ color: "white" }} />
                    </div>
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <div
                        style={{
                          fontFamily: fonts.display,
                          fontWeight: 800,
                          fontSize: "1.2rem",
                          color: colors.textDark,
                          marginBottom: "0.25rem",
                        }}
                      >
                        {book.name}
                      </div>
                      <div style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted }}>
                        {book.chapters} פרקים · {book.description.slice(0, 60)}...
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: expandedBook === idx ? gradients.goldButton : "rgba(139,111,71,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: expandedBook === idx ? "white" : colors.goldDark,
                      transition: "all 0.18s",
                    }}
                  >
                    {expandedBook === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {expandedBook === idx && (
                  <div
                    style={{
                      padding: "0 1.75rem 1.75rem",
                      borderTop: `1px solid rgba(139,111,71,0.06)`,
                    }}
                  >
                    <p
                      style={{
                        fontFamily: fonts.body,
                        fontSize: "0.9rem",
                        lineHeight: 1.8,
                        color: colors.textMid,
                        margin: "1rem 0 1.25rem",
                      }}
                    >
                      {book.description}
                    </p>

                    {/* What each chapter includes */}
                    <div style={{ marginBottom: "1.5rem" }}>
                      <div
                        style={{
                          fontFamily: fonts.body,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: colors.textMuted,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          marginBottom: "0.75rem",
                        }}
                      >
                        כל פרק כולל:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {CHAPTER_LAYERS.map((layer) => (
                          <div
                            key={layer.label}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              padding: "0.35rem 0.75rem",
                              borderRadius: radii.pill,
                              background: colors.parchment,
                              border: `1px solid rgba(139,111,71,0.12)`,
                              fontFamily: fonts.body,
                              fontSize: "0.78rem",
                              color: colors.textMid,
                            }}
                          >
                            <span style={{ color: colors.goldDark }}>{layer.icon}</span>
                            {layer.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Chapter list */}
                    <div>
                      <div
                        style={{
                          fontFamily: fonts.body,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: colors.textMuted,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          marginBottom: "0.75rem",
                        }}
                      >
                        פרקים
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {book.chapterList.map((ch) => (
                          <span
                            key={ch}
                            style={{
                              display: "inline-flex",
                              padding: "0.25rem 0.65rem",
                              borderRadius: radii.pill,
                              background: colors.parchmentDark,
                              fontFamily: fonts.body,
                              fontSize: "0.78rem",
                              color: colors.textMid,
                              border: `1px solid rgba(139,111,71,0.08)`,
                            }}
                          >
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Subscription form (anchor: #subscribe) ──────────────────────── */}
      <section id="subscribe" style={{ background: colors.parchmentDark, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }} dir="rtl">
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.75rem",
                fontWeight: 700,
                color: colors.goldDark,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "0.5rem",
              }}
            >
              הצטרף עכשיו
            </div>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: "clamp(1.6rem, 2.8vw, 2.2rem)",
                color: colors.textDark,
                margin: "0 0 0.5rem",
              }}
            >
              התחל ב-₪5 לחודש הראשון
            </h2>
            <p style={{ fontFamily: fonts.body, fontSize: "0.9rem", color: colors.textMuted }}>
              הוראת קבע. מחודש שני: ₪110/חודש. ביטול חופשי.
            </p>
          </div>

          {/* Access check for existing subscribers */}
          {!accessLoading && isAuthenticated && hasAccess ? (
            <div
              style={{
                background: "white",
                borderRadius: radii.xl,
                padding: "2.5rem",
                border: `2px solid rgba(91,110,58,0.3)`,
                boxShadow: shadows.cardSoft,
                textAlign: "center",
              }}
            >
              <CheckCircle2 size={40} style={{ color: colors.oliveMain, margin: "0 auto 1rem" }} />
              <h3
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: "1.3rem",
                  color: colors.textDark,
                  margin: "0 0 0.5rem",
                }}
              >
                אתה כבר מנוי פעיל
              </h3>
              <p style={{ fontFamily: fonts.body, fontSize: "0.9rem", color: colors.textMuted, marginBottom: "1.5rem" }}>
                לאזור האישי שלך יש גישה לכל תכני התוכנית.
              </p>
              <Link
                to="/design-portal-subscriber"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.85rem 1.75rem",
                  borderRadius: radii.lg,
                  background: gradients.goldButton,
                  color: "white",
                  fontFamily: fonts.accent,
                  fontWeight: 700,
                  fontSize: "1rem",
                  textDecoration: "none",
                  boxShadow: shadows.goldGlow,
                }}
              >
                <ArrowLeft size={16} />
                לאזור האישי
              </Link>
            </div>
          ) : paymentStep === "success" ? (
            <div
              style={{
                background: "white",
                borderRadius: radii.xl,
                padding: "2.5rem",
                border: `2px solid rgba(91,110,58,0.3)`,
                boxShadow: shadows.cardSoft,
                textAlign: "center",
              }}
            >
              <CheckCircle2 size={48} style={{ color: colors.oliveMain, margin: "0 auto 1rem" }} />
              <h3
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: "1.4rem",
                  color: colors.textDark,
                  margin: "0 0 0.5rem",
                }}
              >
                ברוך הבא לתוכנית!
              </h3>
              <p style={{ fontFamily: fonts.body, fontSize: "0.92rem", color: colors.textMuted, marginBottom: "1.5rem", lineHeight: 1.75 }}>
                הצטרפת בהצלחה. שלחנו לך אימייל עם פרטי הגישה. תוך 24 שעות תתווסף לקבוצת הוואטסאפ.
              </p>
              <Link
                to="/design-portal-subscriber"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.85rem 1.75rem",
                  borderRadius: radii.lg,
                  background: gradients.goldButton,
                  color: "white",
                  fontFamily: fonts.accent,
                  fontWeight: 700,
                  fontSize: "1rem",
                  textDecoration: "none",
                  boxShadow: shadows.goldGlow,
                }}
              >
                <ArrowLeft size={16} />
                לאזור האישי
              </Link>
            </div>
          ) : (
            <div
              style={{
                background: "white",
                borderRadius: radii.xl,
                padding: "2.5rem",
                border: `1px solid rgba(139,111,71,0.12)`,
                boxShadow: "0 8px 32px rgba(45,31,14,0.1)",
              }}
            >
              {paymentStep === "idle" && (
                <button
                  onClick={() => setPaymentStep("form")}
                  style={{
                    width: "100%",
                    padding: "1.1rem",
                    borderRadius: radii.lg,
                    border: "none",
                    background: gradients.goldButton,
                    color: "white",
                    fontFamily: fonts.accent,
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    cursor: "pointer",
                    boxShadow: shadows.goldGlow,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <Heart size={18} fill="currentColor" />
                  להצטרפות — ₪5 לחודש הראשון
                </button>
              )}

              {paymentStep === "form" && (
                <form onSubmit={handleStartPayment} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontFamily: fonts.body,
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: colors.textDark,
                        marginBottom: "0.35rem",
                      }}
                    >
                      שם מלא *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="ישראל ישראלי"
                      required
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: radii.md,
                        border: `1px solid rgba(139,111,71,0.2)`,
                        fontFamily: fonts.body,
                        fontSize: "0.95rem",
                        color: colors.textDark,
                        background: colors.parchment,
                        boxSizing: "border-box",
                        outline: "none",
                        textAlign: "right",
                        direction: "rtl",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontFamily: fonts.body,
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: colors.textDark,
                        marginBottom: "0.35rem",
                      }}
                    >
                      טלפון *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="05X-XXXXXXX"
                      required
                      dir="ltr"
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: radii.md,
                        border: `1px solid rgba(139,111,71,0.2)`,
                        fontFamily: fonts.body,
                        fontSize: "0.95rem",
                        color: colors.textDark,
                        background: colors.parchment,
                        boxSizing: "border-box",
                        outline: "none",
                        textAlign: "left",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontFamily: fonts.body,
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: colors.textDark,
                        marginBottom: "0.35rem",
                      }}
                    >
                      אימייל (אופציונלי)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      placeholder={user?.email ?? "you@example.com"}
                      dir="ltr"
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: radii.md,
                        border: `1px solid rgba(139,111,71,0.2)`,
                        fontFamily: fonts.body,
                        fontSize: "0.95rem",
                        color: colors.textDark,
                        background: colors.parchment,
                        boxSizing: "border-box",
                        outline: "none",
                        textAlign: "left",
                      }}
                    />
                  </div>

                  {formError && (
                    <div
                      style={{
                        padding: "0.65rem 1rem",
                        borderRadius: radii.md,
                        background: "rgba(165,42,42,0.08)",
                        border: "1px solid rgba(165,42,42,0.2)",
                        color: "#a52a2a",
                        fontFamily: fonts.body,
                        fontSize: "0.85rem",
                      }}
                    >
                      {formError}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    <button
                      type="submit"
                      disabled={payLoading}
                      style={{
                        padding: "1rem",
                        borderRadius: radii.lg,
                        border: "none",
                        background: gradients.goldButton,
                        color: "white",
                        fontFamily: fonts.accent,
                        fontWeight: 700,
                        fontSize: "1.05rem",
                        cursor: payLoading ? "not-allowed" : "pointer",
                        boxShadow: shadows.goldGlow,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        opacity: payLoading ? 0.75 : 1,
                      }}
                    >
                      {payLoading ? (
                        <>
                          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                          מעבד תשלום...
                        </>
                      ) : (
                        <>
                          <Heart size={16} fill="currentColor" />
                          הצטרף — ₪5 עכשיו
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentStep("idle")}
                      style={{
                        padding: "0.6rem",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: fonts.body,
                        fontSize: "0.82rem",
                        color: colors.textMuted,
                        textDecoration: "underline",
                      }}
                    >
                      חזור
                    </button>
                  </div>
                </form>
              )}

              {paymentStep === "processing" && (
                <div
                  style={{
                    padding: "3rem 0",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <Loader2 size={40} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
                  <div style={{ fontFamily: fonts.body, fontSize: "0.95rem", color: colors.textMuted }}>
                    מחכה לאישור התשלום...
                  </div>
                </div>
              )}

              <div
                style={{
                  marginTop: "1.25rem",
                  paddingTop: "1rem",
                  borderTop: `1px solid rgba(139,111,71,0.06)`,
                  display: "flex",
                  justifyContent: "center",
                  gap: "1.5rem",
                  flexWrap: "wrap",
                }}
              >
                <TrustBadge label="תשלום מאובטח" />
                <TrustBadge label="ביטול חינמי" />
                <TrustBadge label="Grow · Meshulam" />
              </div>

              {/* Existing subscriber link in form area */}
              <div style={{ marginTop: "1rem", textAlign: "center", fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted }}>
                כבר מנוי?{" "}
                <Link to="/design-portal-subscriber" style={{ color: colors.goldDark, fontWeight: 700 }}>
                  התחבר לאזור האישי
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Testimonials ────────────────────────────────────────────────── */}
      <section style={{ background: colors.parchment, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }} dir="rtl">
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.75rem",
                fontWeight: 700,
                color: colors.oliveMain,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "0.5rem",
              }}
            >
              מה אומרים המנויים
            </div>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: "clamp(1.5rem, 2.8vw, 2rem)",
                color: colors.textDark,
                margin: 0,
              }}
            >
              280 מנויים פעילים מספרים
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
                  border: `1px solid rgba(139,111,71,0.09)`,
                  boxShadow: shadows.cardSoft,
                }}
              >
                <Quote size={18} style={{ color: colors.goldDark, opacity: 0.4, marginBottom: "0.75rem" }} />
                <p
                  style={{
                    fontFamily: fonts.display,
                    fontSize: "0.95rem",
                    lineHeight: 1.85,
                    color: colors.textDark,
                    margin: "0 0 1.25rem",
                    fontStyle: "italic",
                  }}
                >
                  "{t.quote}"
                </p>
                <div
                  style={{
                    paddingTop: "0.75rem",
                    borderTop: `1px solid rgba(139,111,71,0.07)`,
                    fontFamily: fonts.display,
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    color: colors.textDark,
                  }}
                >
                  {t.name}
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted }}>
                  {t.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────────────────── */}
      <section style={{ background: colors.parchmentDark, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }} dir="rtl">
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.75rem",
                fontWeight: 700,
                color: colors.goldDark,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "0.5rem",
              }}
            >
              שאלות ותשובות
            </div>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)",
                color: colors.textDark,
                margin: 0,
              }}
            >
              תשובות לשאלות הנפוצות
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {FAQS.map((f, i) => (
              <div
                key={i}
                style={{
                  background: "white",
                  borderRadius: radii.lg,
                  border: `1px solid rgba(139,111,71,0.1)`,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  style={{
                    width: "100%",
                    padding: "1.1rem 1.5rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "right",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      color: colors.textDark,
                    }}
                  >
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
                      fontSize: "1rem",
                      transition: "all 0.15s",
                    }}
                  >
                    {activeFaq === i ? "−" : "+"}
                  </span>
                </button>
                {activeFaq === i && (
                  <div
                    style={{
                      padding: "0 1.5rem 1.25rem",
                      fontFamily: fonts.body,
                      fontSize: "0.9rem",
                      lineHeight: 1.85,
                      color: colors.textMuted,
                    }}
                  >
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────────────────────── */}
      <section style={{ background: gradients.warmDark, padding: "5rem 1.5rem", color: "white", textAlign: "center" }} dir="rtl">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <Sparkles style={{ width: 28, height: 28, color: colors.goldShimmer, margin: "0 auto 1rem" }} />
          <h2
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "clamp(1.6rem, 3vw, 2.1rem)",
              margin: "0 0 1rem",
              fontStyle: "italic",
              lineHeight: 1.3,
            }}
          >
            חגי, זכריה ומלאכי ממתינים לך
          </h2>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "0.95rem",
              lineHeight: 1.85,
              color: "rgba(255,255,255,0.65)",
              marginBottom: "2rem",
            }}
          >
            פרק אחד בשבוע — ₪5 לחודש הראשון.
          </p>
          <a
            href="#subscribe"
            style={{
              padding: "1rem 2.5rem",
              borderRadius: radii.lg,
              border: "none",
              background: gradients.goldButton,
              color: "white",
              fontFamily: fonts.accent,
              fontWeight: 700,
              fontSize: "1.05rem",
              cursor: "pointer",
              boxShadow: shadows.goldGlow,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Heart size={16} fill="currentColor" />
            הצטרף עכשיו
          </a>
        </div>
      </section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DesignLayout>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
      <span style={{ color: colors.goldShimmer }}>{icon}</span>
      {label}
    </div>
  );
}

function TrustBadge({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        fontFamily: fonts.body,
        fontSize: "0.73rem",
        color: colors.textMuted,
      }}
    >
      <ShieldCheck size={12} style={{ color: colors.oliveMain }} />
      {label}
    </div>
  );
}
