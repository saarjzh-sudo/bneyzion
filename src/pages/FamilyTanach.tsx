/**
 * /family-tanach — "תנ״ך למשפחה" lobby page.
 *
 * A standalone gateway (requested by Rabbi Yoav Uriel + Saar, 7.7.2026) that gathers every
 * daily/family learning experience under one warm, premium hub — accessible from the top nav,
 * not buried as a homepage section.
 *
 * Reuses the existing FamilyBibleSection chapel-arch card language from DesignPreviewHome.tsx
 * (same /public/family-bible/*.webp assets) but expands it into a full page: hero + 6 cards +
 * a closing CTA. Wrapped in the production <Layout> (header + sidebar + footer), matching
 * ParashaPage.tsx's pattern.
 *
 * Real data only — card content is admin-managed via the family_cards table.
 * (12.7.2026, סער: כרטיס "חידות לשולחן השבת" כובה — is_active=false, נשאר באדמין.)
 *
 * SHARED-FILE PATCHES NEEDED (not applied here — see report to Saar):
 *  1. src/App.tsx — lazy import + <Route path="/family-tanach">
 *  2. src/components/layout-v2/DesignHeader.tsx — NAV_ITEMS entry "תנ״ך למשפחה"
 *  3. src/pages/DesignPreviewHome.tsx — FamilyBibleSection "הלימוד היומי" header should link here
 */

import { useState, type FormEvent, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { useFamilyCards } from "@/hooks/useCommunity";
import Layout from "@/components/layout/Layout";
import { colors, fonts, gradients, shadows } from "@/lib/designTokens";

// 7.7.2026 — הפינות היומיות (נקלטו מקבוצות "בכוח התנ״ך ננצח", רב יואב):
const TANACH_NEWS_SERIES_ID = "5d111b52-b421-4150-adfd-df256950117c";
const KIDS_PODCAST_SERIES_ID = "bc1d97b9-e0a5-4b88-8169-5705120bc20c";
void TANACH_NEWS_SERIES_ID; // הכרטיס מפנה ל-/tanach-news; הקבוע נשמר לתיעוד הסדרה

// 12.7.2026 (סער): כרטיס "חידות לשולחן השבת" כובה — is_active=false ב-family_cards
// (נשאר באדמין להפעלה עתידית). הוסר גם מה-fallback הסטטי כאן, כולל hook ספירת
// החידות (useRiddlesSeries) שכבר אין לו צרכן.

interface LobbyCard {
  id: string;
  title: string;
  desc: string;
  href: string;
  image: string;
  badge?: string;
  disabled?: boolean;
}

// 11.7.2026 (סער): תוכן הכרטיסיות עבר לטבלת family_cards ב-Supabase וניתן לשליטה
// מהאדמין (/admin/content?tab=family). BASE_CARDS נשאר כ-fallback בלבד — מוצג רק
// אם הטבלה ריקה או שהשליפה נכשלה, כדי שהעמוד לעולם לא יעלה ריק.
const BASE_CARDS: LobbyCard[] = [
  {
    id: "parasha",
    title: "פרשת השבוע",
    desc: "מאמר, שיעורי אודיו ווידאו על פרשת השבוע, כל שבוע מחדש",
    href: "/parasha",
    image: "/family-bible/card-parasha.jpg",
    badge: "מתעדכן שבועית",
  },
  {
    id: "chapter-weekly",
    title: "הפרק השבועי",
    desc: "עם הרב יואב אוריאל, לומדים תנ״ך פרק אחרי פרק, כל השנה",
    href: "/chapter-weekly",
    image: "/family-bible/card-chapter-weekly.jpg",
    badge: "התוכנית המרכזית",
  },
  {
    id: "daily-verse",
    title: "פסוק אחד ביום",
    desc: "תנ״ך לחיים, פסוק קצר להתחיל איתו את היום, לכל הגילאים",
    href: "/daily-verse",
    image: "/family-bible/card-daily-verse.jpg",
  },
  {
    id: "dor-haplaot",
    title: "דור הפלאות",
    desc: "70 ניסי מלחמת חרבות ברזל, סיפורי הצלה והשגחה שלא ישכחו",
    href: "/dor-haplaot",
    image: "/family-bible/card-dor-haplaot.jpg",
  },
  // חדשות תנכיות — הטור היומי של הרב יואב. חוּוט 7.7.2026: הארכיון (10 טורים)
  // נקלט מקבוצות "בכוח התנ״ך ננצח" לסדרה ייעודית.
  {
    id: "tanach-news",
    title: "חדשות תנכיות",
    desc: "מאורעות השעה לאור התנ״ך, טור יומי מאת הרב יואב אוריאל",
    href: "/tanach-news",
    image: "/family-bible/card-tanach-news.jpg",
    badge: "מתעדכן יומית",
  },
  // הניוזלטר — ארכיון מיילי-התוכן של הרב יואב, נמשך מהמייל (10.7.2026)
  {
    id: "newsletter",
    title: "הניוזלטר של בני ציון",
    desc: "מכתבי עומק תנ״כיים מאת הרב יואב אוריאל, ישירות מהמייל, כל הגיליונות",
    href: "/newsletter",
    image: "/family-bible/card-newsletter.jpg",
  },
  // ילדי התנ״ך — פודקאסט שבועי לילדים (הושק 7.7.2026, פרק חדש בכל יום שלישי)
  {
    id: "kids-podcast",
    title: "ילדי התנ״ך",
    desc: "פודקאסט סיפורי התנ״ך לילדים, פרק חדש בכל יום שלישי, מגיל 6 ומעלה",
    href: `/series/${KIDS_PODCAST_SERIES_ID}`,
    image: "/family-bible/card-kids-podcast.jpg",
    badge: "חדש!",
  },
];

function FamilyTanachHero() {
  return (
    <section
      dir="rtl"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(251,246,236,0.50) 0%, rgba(251,246,236,0.32) 45%, rgba(237,229,208,0.72) 100%), url('/family-bible/hero-watercolor-family.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center 30%",
        padding: "6rem 1.5rem 7rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* soft gold vignette */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 20%, rgba(232,213,160,0.18) 0%, transparent 62%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.4rem 1.1rem",
            borderRadius: 999,
            border: `1px solid rgba(139,111,71,0.4)`,
            color: "#8B6F47",
            background: "rgba(255,252,245,0.5)",
            fontFamily: fonts.body,
            fontSize: "0.85rem",
            marginBottom: "1.5rem",
          }}
        >
          שער חדש באתר בני ציון
        </div>

        <h1
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: "clamp(2.4rem, 6vw, 4rem)",
            lineHeight: 1.12,
            margin: "0 0 1.1rem",
            color: "#1E3B36",
            textShadow: "0 1px 14px rgba(255,252,245,0.6)",
          }}
        >
          תנ״ך למשפחה
        </h1>

        <p
          style={{
            fontFamily: fonts.body,
            fontSize: "clamp(1.05rem, 2.2vw, 1.3rem)",
            lineHeight: 1.7,
            color: "rgba(30,59,54,0.88)",
            maxWidth: 620,
            margin: "0 auto",
          }}
        >
          כמה דקות ביום, וכל בית הופך לבית תנ״ך. מגיל הגן ועד סבא וסבתא, מקום אחד
          שמביא את התנ״ך הביתה, כל יום מחדש.
        </p>

        {/* הקדשת השער — יואב 18.7: מודגשת יותר (הייתה קטנה וחיוורת) */}
        <p style={{ marginTop: "1.6rem", marginBottom: 0 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.55rem",
              padding: "0.55rem 1.4rem",
              borderRadius: 999,
              border: "1px solid rgba(196,162,101,0.5)",
              background: "rgba(196,162,101,0.12)",
              fontFamily: fonts.body,
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "#8B6F47",
              letterSpacing: "0.03em",
            }}
          >
            <span aria-hidden style={{ fontSize: "0.95rem" }}>🕯</span>
            לעילוי נשמת מעיין פלסר ז״ל
          </span>
        </p>
      </div>
    </section>
  );
}

/* 11.7.2026 (סער): הכרטיס עוצב מחדש בשפת כרטיסי-השיעורים של האתר
   (src/components/cards/LessonCard.tsx — bg-card, border-border, rounded-2xl,
   hover עדין של הרמה+צל, כותרת שמצטבעת ב-primary). התמונות הן אקוורל צבעוני
   בסגנון תמונות-השיעורים (סדרה 3 ב-DESIGN-IMAGE-STYLES.md), 16:9. */
function LobbyCardTile({ card, onClick }: { card: LobbyCard; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={card.disabled}
      aria-label={`${card.title}, ${card.desc}`}
      className="group block w-full text-start bg-card border border-border rounded-2xl overflow-hidden
        hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
        cursor-pointer disabled:opacity-55 disabled:cursor-default disabled:hover:translate-y-0
        focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-primary focus-visible:outline-offset-2"
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        {card.image && (
          <img
            src={card.image}
            alt=""
            aria-hidden
            loading="lazy"
            className="w-full h-full object-cover block group-hover:scale-105 transition-transform duration-500"
          />
        )}
        {card.badge && (
          <span className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm text-primary border border-gold/40 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
            {card.badge}
          </span>
        )}
      </div>

      <div className="p-4 pb-5 space-y-1.5">
        <h3 className="font-heading text-lg text-foreground group-hover:text-primary transition-colors leading-snug">
          {card.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
        {!card.disabled && (
          <span className="inline-flex items-center gap-1.5 pt-1.5 text-sm font-bold text-primary">
            להיכנס
            <span aria-hidden>←</span>
          </span>
        )}
      </div>
    </button>
  );
}

// 12.7.2026 (סער): הקישור הקודם הפנה לקבוצה שגויה. היעד הנכון — קבוצה 8 של
// "בכוח התנ״ך ננצח" (יש בה מקום, 635 חברים). אותו קישור משמש גם בסקשן הדיוור בדף הבית.
const COMMUNITY_WA_LINK = "https://chat.whatsapp.com/GVy0Gg0PCXBKouJmWVm8wY";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** הישארו מחוברים — הצטרפות לקבוצת הווטסאפ + הרשמה לעדכוני מייל.
 *  ההרשמה כותבת ל-newsletter_subscribers (source='family-tanach'), אותו מנגנון
 *  עובד של טופס דף-הבית. */
function StayConnectedSection() {
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setErrMsg("רגע, צריך כתובת מייל אמיתית");
      setStatus("error");
      return;
    }
    // 12.7.2026 (סער): אישור דיוור — אותו מנגנון בדיוק כמו NewsletterSection בדף הבית
    // (checkbox חובה, אותו נוסח; agreed_to_terms + consent_at כבר נשמרים ב-insert).
    if (!agreed) {
      setErrMsg("יש לאשר את תנאי השימוש לפני הצטרפות");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setErrMsg("");
    try {
      const { error } = await supabase
        .from("newsletter_subscribers" as never)
        .insert({
          email: email.trim().toLowerCase(),
          consent_at: new Date().toISOString(),
          source: "family-tanach",
          agreed_to_terms: true,
        } as never);
      if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrMsg((err as { message?: string })?.message || "משהו השתבש. נסו שוב בעוד רגע.");
    }
  }

  const cardStyle: CSSProperties = {
    background: "#fff",
    border: `1px solid rgba(139,111,71,0.18)`,
    borderRadius: "1rem",
    padding: "1.7rem",
    textAlign: "center",
    boxShadow: shadows.cardSoft,
  };
  const h3Style: CSSProperties = {
    fontFamily: fonts.display, fontWeight: 800, fontSize: "1.3rem",
    color: colors.textDark, margin: "0 0 0.4rem",
  };
  const pStyle: CSSProperties = {
    fontFamily: fonts.body, fontSize: "0.94rem", lineHeight: 1.6,
    color: colors.textMuted, margin: "0 0 1.2rem",
  };

  return (
    <section dir="rtl" style={{ background: colors.parchment, padding: "1rem 1.5rem 4rem" }}>
      <div className="family-connect-grid" style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: "1.25rem", gridTemplateColumns: "1fr 1fr" }}>
        {/* WhatsApp */}
        <div style={cardStyle}>
          <h3 style={h3Style}>קבוצת הווטסאפ שלנו</h3>
          <p style={pStyle}>תוכן יומי קצר ישר לנייד, יחד עם קהילת הלומדים של בני ציון.</p>
          <a
            href={COMMUNITY_WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              background: "hsl(142 68% 34%)", color: "#fff", fontFamily: fonts.body, fontWeight: 700,
              fontSize: "0.98rem", borderRadius: "0.7rem", padding: "0.8rem 1.9rem", textDecoration: "none",
            }}
          >
            להצטרפות לקבוצה
          </a>
        </div>

        {/* Email */}
        <div style={cardStyle}>
          <h3 style={h3Style}>עדכונים למייל</h3>
          {status === "success" ? (
            <p style={{ fontFamily: fonts.body, fontSize: "0.98rem", color: colors.oliveDark, margin: "1rem 0 0.4rem", fontWeight: 600 }}>
              נרשמתם בהצלחה. נשמח ללוות אתכם בלימוד 🙏
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={pStyle}>השאירו מייל ונעדכן אתכם בתוכן חדש ובלימוד המשותף.</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="כתובת המייל שלכם"
                  aria-label="כתובת מייל"
                  dir="ltr"
                  style={{
                    flex: "1 1 190px", minWidth: 0, padding: "0.75rem 0.9rem", borderRadius: "0.65rem",
                    border: `1px solid rgba(139,111,71,0.3)`, fontFamily: fonts.body, fontSize: "0.95rem", textAlign: "center",
                  }}
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  style={{
                    background: gradients.goldButton, color: "#fff", fontFamily: fonts.body, fontWeight: 700,
                    fontSize: "0.95rem", border: "none", borderRadius: "0.65rem", padding: "0.75rem 1.6rem",
                    cursor: status === "submitting" ? "default" : "pointer",
                  }}
                >
                  {status === "submitting" ? "רגע..." : "הרשמה"}
                </button>
              </div>

              {/* אישור דיוור — נוסח זהה לטופס בדף הבית (NewsletterSection) */}
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  gap: "0.6rem",
                  cursor: "pointer",
                  textAlign: "right",
                  marginTop: "0.75rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{
                    marginTop: "0.15rem",
                    width: 18,
                    height: 18,
                    accentColor: "#8B6F47",
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                />
                <span style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted, lineHeight: 1.55 }}>
                  קראתי ואני מסכים ל
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#8B6F47", textDecoration: "underline", textUnderlineOffset: "2px" }}
                  >
                    תנאי השימוש
                  </a>
                </span>
              </label>

              {status === "error" && (
                <p style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: "#9B2C2C", margin: "0.7rem 0 0" }}>{errMsg}</p>
              )}
            </form>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 640px){ .family-connect-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

export default function FamilyTanach() {
  useSEO({
    title: "תנ״ך למשפחה",
    description:
      "לימוד תנ״ך יומי ומשפחתי, פרשת השבוע, הפרק השבועי, פסוק יומי, דור הפלאות וחידות לשולחן השבת. מקום אחד לכל המשפחה.",
  });

  const navigate = useNavigate();
  const { data: dbCards } = useFamilyCards();

  // מקור ראשי = family_cards (בשליטת האדמין). BASE_CARDS = fallback בלבד,
  // כדי שהעמוד לעולם לא יעלה ריק אם הטבלה ריקה או שהשליפה נכשלה.
  const fromDb: LobbyCard[] = (dbCards ?? []).map((c) => ({
    id: c.card_key,
    title: c.title,
    desc: c.description ?? "",
    href: c.href,
    image:
      c.image_url ??
      BASE_CARDS.find((b) => b.id === c.card_key)?.image ??
      "",
    badge: c.badge ?? undefined,
  }));

  // כשהתוכן מגיע מהטבלה — התיאור של האדמין הוא הקובע, בלי דריסה.
  const cards: LobbyCard[] = fromDb.length ? fromDb : BASE_CARDS;

  return (
    <Layout>
      <FamilyTanachHero />

      <section
        dir="rtl"
        style={{
          background: colors.parchment,
          padding: "3.5rem 1.5rem 5rem",
        }}
      >
        <div style={{ maxWidth: 1140, margin: "-4rem auto 0" }}>
          <style>{`
            .family-tanach-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1.5rem;
            }
            @media (max-width: 960px) {
              .family-tanach-grid { grid-template-columns: repeat(2, 1fr); }
            }
            @media (max-width: 600px) {
              .family-tanach-grid { grid-template-columns: 1fr; }
            }
            .family-tanach-card:hover:not(:disabled) {
              transform: translateY(-4px);
              box-shadow: 0 16px 48px rgba(45,31,14,0.14);
            }
            .family-tanach-card {
              transition: transform 0.25s ease, box-shadow 0.25s ease;
            }
            .family-tanach-card:focus-visible {
              outline: 3px solid ${colors.goldLight};
              outline-offset: 2px;
            }
          `}</style>

          <div className="family-tanach-grid">
            {cards.map((card) => (
              <LobbyCardTile
                key={card.id}
                card={card}
                onClick={() => !card.disabled && navigate(card.href)}
              />
            ))}
          </div>
        </div>
      </section>

      <StayConnectedSection />

      {/* Closing CTA — ties back to the main subscription program */}
      <section
        dir="rtl"
        style={{
          background: colors.parchmentDark,
          borderTop: `1px solid rgba(139,111,71,0.15)`,
          padding: "3.5rem 1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
              color: colors.textDark,
              margin: "0 0 0.75rem",
            }}
          >
            רוצים ללמוד יחד כל השנה?
          </h2>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "1rem",
              lineHeight: 1.7,
              color: colors.textMuted,
              margin: "0 0 1.75rem",
            }}
          >
            הצטרפו לתוכנית הפרק השבועי עם הרב יואב אוריאל, ולמדו תנ״ך יחד עם אלפי
            משפחות בכל רחבי הארץ.
          </p>
          <button
            type="button"
            onClick={() => navigate("/chapter-weekly")}
            style={{
              background: gradients.goldButton,
              color: "#fff",
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: "1rem",
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.9rem 2.2rem",
              cursor: "pointer",
              boxShadow: shadows.goldGlowSoft,
            }}
          >
            להצטרפות לתוכנית הפרק השבועי
          </button>
        </div>
      </section>
    </Layout>
  );
}
