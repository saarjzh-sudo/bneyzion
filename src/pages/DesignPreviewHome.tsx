import { useState, useEffect, useMemo, useRef } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link, useNavigate } from "react-router-dom";
import { useLessons } from "@/hooks/useLessons";
import { useSeries } from "@/hooks/useSeries";
import { usePublicRabbis } from "@/hooks/useRabbis";
import { useParasha } from "@/hooks/useParasha";
import { useFamilyCards } from "@/hooks/useCommunity";
import { useSiteCopy } from "@/hooks/useSiteSettings";
import { getParashaVerse } from "@/lib/parashaCalendar";
import { getUpcomingHoliday } from "@/lib/holidays";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAccess } from "@/hooks/useUserAccess";
import logoColor from "@/assets/logo-horizontal-color.png";
import logoBright from "@/assets/logo-horizontal-bright.png";
import DesignHeader from "@/components/layout-v2/DesignHeader";
import CampaignBanner from "@/components/common/CampaignBanner";
import HomeCampaignStrip from "@/components/home/HomeCampaignStrip";
import DesignFooter from "@/components/layout-v2/DesignFooter";
import DesignMobileBottomNav from "@/components/layout-v2/DesignMobileBottomNav";
import { PromoProvider } from "@/components/promo";
import ImageBannerSlot from "@/components/promo/ImageBannerSlot";
import AccessibilityWidget from "@/components/a11y/AccessibilityWidget";
import DesignSidebar from "@/components/layout-v2/DesignSidebar";
import LazyHeroVideo from "@/components/performance/LazyHeroVideo";
import CustomSlidersSlot from "@/components/common/CustomSlidersSlot";
import TrialStrip from "@/components/common/TrialStrip";

// ── Design tokens ──────────────────────────────────────────────────────────
const GOLD_DARK    = "#8B6F47";
const GOLD_LIGHT   = "#C4A265";
const GOLD_SHIMMER = "#E8D5A0";
const PARCHMENT    = "#FAF6F0";
const PARCHMENT_DARK = "#F5F0E8";
const TEXT_DARK    = "#2D1F0E";
const TEXT_MUTED   = "#6B5C4A";
const TEXT_SUBTLE  = "#A69882";
const OLIVE_DARK   = "#4A5A2E";
const OLIVE_MAIN   = "#5B6E3A";
const OLIVE_BG     = "#F4F5EF";
const NAVY_DEEP    = "#1A2744";
const TEAL_MAIN    = "#2D7D7D";

// ── DesignNavBar ───────────────────────────────────────────────────────────
// Nav updated 2026-05-27 per Saar: חנות | פרשת השבוע | אגף המורים | אודותינו
const FULL_NAV_LINKS: { label: string; path: string; external?: boolean }[] = [
  { label: "חנות",           path: "/store"            },
  { label: "פרשת השבוע",     path: "/parasha"          },
  { label: "אגף המורים",     path: "/teachers"         },
  { label: "אודותינו",       path: "/about"            },
];

function DesignNavBar() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navBg = scrolled
    ? { background: "rgba(250,246,240,0.92)", backdropFilter: "blur(20px) saturate(180%)",
        borderBottom: `1px solid rgba(139,111,71,0.15)`,
        boxShadow: "0 2px 24px rgba(45,31,14,0.07)" }
    : { background: "transparent" };

  const linkColor = scrolled ? TEXT_MUTED : "rgba(255,255,255,0.9)";

  return (
    <nav dir="rtl" style={{ position: "sticky", top: 0, zIndex: 50, transition: "all 0.3s ease", ...navBg }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", paddingInlineStart: "1.5rem",
                    paddingInlineEnd: 0, height: 96,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: "1rem" }}>
        {/* Logo — RIGHT side (start in RTL) */}
        <div onClick={() => navigate("/")} style={{ cursor: "pointer", flexShrink: 0 }}>
          <img
            src={logoColor}
            alt="בני ציון"
            style={{ height: 64, width: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Nav links — packed toward left (flex-end = left in RTL layout) */}
        <div className="hidden md:flex" style={{ flex: 1, justifyContent: "flex-end",
                    gap: "1.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {FULL_NAV_LINKS.map(({ label, path }) => (
            <span key={label} onClick={() => navigate(path)}
              style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.85rem", color: linkColor,
                       cursor: "pointer", transition: "color 0.2s",
                       borderBottom: `1.5px solid transparent`, whiteSpace: "nowrap" }}
              onMouseEnter={e => (e.currentTarget.style.color = scrolled ? GOLD_DARK : "white")}
              onMouseLeave={e => (e.currentTarget.style.color = linkColor)}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Buttons — LEFT side (end in RTL) */}
        <div style={{ display: "flex", gap: "0.65rem", alignItems: "center", flexShrink: 0 }}>
          {!user ? (
            <button onClick={handleSignIn} disabled={signingIn || authLoading}
              style={{ padding: "0.4rem 1rem", border: `1.5px solid ${scrolled ? GOLD_DARK : "rgba(255,255,255,0.5)"}`,
                       borderRadius: "0.75rem", background: "transparent",
                       color: scrolled ? TEXT_DARK : "white", fontFamily: "Ploni, sans-serif",
                       fontSize: "0.82rem", cursor: signingIn ? "wait" : "pointer",
                       transition: "all 0.2s", whiteSpace: "nowrap",
                       opacity: signingIn || authLoading ? 0.6 : 1 }}>
              {signingIn ? "מתחבר..." : "כניסה"}
            </button>
          ) : (
            <div style={{ position: "relative" }}>
              <button onClick={() => setMenuOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", gap: "0.4rem",
                         padding: "0.25rem 0.5rem 0.25rem 0.25rem",
                         borderRadius: "999px", border: "none", cursor: "pointer",
                         background: scrolled ? "rgba(139,111,71,0.08)" : "rgba(255,255,255,0.15)",
                         backdropFilter: "blur(8px)" }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} referrerPolicy="no-referrer"
                    style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover",
                             border: `1.5px solid ${scrolled ? GOLD_DARK : "rgba(255,255,255,0.6)"}` }} />
                ) : (
                  <div style={{ width: 30, height: 30, borderRadius: "50%",
                                background: `linear-gradient(135deg, ${OLIVE_DARK}, ${OLIVE_MAIN})`,
                                color: "white", display: "flex", alignItems: "center",
                                justifyContent: "center", fontSize: "0.8rem", fontWeight: 600 }}>
                    {displayName?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </button>
              {menuOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0,
                              minWidth: 200, background: "white",
                              border: "1px solid rgba(139,111,71,0.18)", borderRadius: "0.75rem",
                              boxShadow: "0 8px 32px rgba(45,31,14,0.12)", overflow: "hidden",
                              zIndex: 60, fontFamily: "Ploni, sans-serif" }}>
                  <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(139,111,71,0.12)" }}>
                    <div style={{ fontSize: "0.85rem", color: TEXT_DARK, fontWeight: 600 }}>{displayName}</div>
                    <div style={{ fontSize: "0.72rem", color: TEXT_MUTED, marginTop: 2 }}>{user.email}</div>
                  </div>
                  <button onClick={() => { setMenuOpen(false); navigate("/portal"); }}
                    style={{ display: "block", width: "100%", textAlign: "right",
                             padding: "0.6rem 1rem", border: "none", background: "transparent",
                             color: TEXT_DARK, fontSize: "0.82rem", cursor: "pointer" }}>
                    האזור האישי
                  </button>
                  <button onClick={() => { setMenuOpen(false); navigate("/favorites"); }}
                    style={{ display: "block", width: "100%", textAlign: "right",
                             padding: "0.6rem 1rem", border: "none", background: "transparent",
                             color: TEXT_DARK, fontSize: "0.82rem", cursor: "pointer" }}>
                    שיעורים שמורים
                  </button>
                  <button onClick={async () => { setMenuOpen(false); await signOut(); }}
                    style={{ display: "block", width: "100%", textAlign: "right",
                             padding: "0.6rem 1rem", border: "none",
                             borderTop: "1px solid rgba(139,111,71,0.12)",
                             background: "transparent", color: "#a23a3a",
                             fontSize: "0.82rem", cursor: "pointer" }}>
                    התנתקות
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── DesignHero ─────────────────────────────────────────────────────────────
function DesignHero() {
  const navigate = useNavigate();
  // רמה 13 (מרכז שליטה): נוסחי ההירו נערכים מ-/admin/control-center;
  // ה-fallback = הנוסח המקודד, אפס שינוי עד עריכה בפועל.
  const copy = useSiteCopy();
  // הערת אביה 13.8: מנוי שלוחץ על הכפתור השני נחת בדף השיווק של התכנית
  // ונאלץ לחפש את הדרך פנימה דרך "הקורסים שלי". למנוי הכפתור מוביל ישר
  // לספריית התכנית; לכל השאר הוא נשאר כפתור השיווק.
  const { hasAccess: isSubscriber } = useUserAccess("program:weekly-chapter");

  const scrollToLearn = () => {
    document.getElementById("learn-start")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ height: "56vh", minHeight: 420, maxHeight: 520, overflow: "hidden",
                  position: "relative", marginTop: -96 }}>
      {/* Video — poster-first, lazily loaded (T11 perf) */}
      <LazyHeroVideo
        videoSrc="/video/hero-watercolor.mp4"
        poster="/video/hero-watercolor-poster.jpg"
        posterAlt="חומות ירושלים באקוורל מוזהב"
        mediaStyle={{ objectPosition: "center 40%",
                      /* רמה 20 (יואב 16.7): "להוסיף צבעוניות לאנימציה העליונה" — חיזוק רוויה עדין */
                      filter: "contrast(1.05) saturate(1.28)", transform: "scale(1.04)" }}
      />

      {/* Overlays — light watercolor video: soft cream veil + warm base so dark text stays readable */}
      <div style={{ position: "absolute", inset: 0,
                    background: "linear-gradient(180deg, rgba(255,252,245,0.30) 0%, rgba(255,252,245,0.05) 35%, rgba(62,47,30,0.16) 100%)" }} />
      <div style={{ position: "absolute", inset: 0,
                    background: "radial-gradient(ellipse at 50% 45%, transparent 30%, rgba(139,111,71,0.14) 100%)" }} />

      {/* Grain */}
      <svg style={{ position: "absolute", inset: 0, opacity: 0.025, pointerEvents: "none" }} width="100%" height="100%">
        <filter id="grain2"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#grain2)" />
      </svg>

      {/* Content — centered with slight top offset for nav */}
      <div dir="rtl" style={{ position: "relative", height: "100%", display: "flex",
                               flexDirection: "column", alignItems: "center", justifyContent: "center",
                               textAlign: "center", padding: "0 1.5rem",
                               paddingTop: "48px" }}>
        {/* Logo shimmer */}
        <div className="animate-shimmer"
          style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                   fontSize: "clamp(2.5rem, 6vw, 5rem)", letterSpacing: "0.25em",
                   backgroundImage: `linear-gradient(135deg, ${GOLD_SHIMMER}, ${GOLD_LIGHT}, ${GOLD_DARK}, ${GOLD_LIGHT}, ${GOLD_SHIMMER})`,
                   backgroundSize: "300% 300%", WebkitBackgroundClip: "text",
                   WebkitTextFillColor: "transparent", lineHeight: 1.05, marginBottom: "0.4rem" }}>
          בני ציון
        </div>

        {/* Gold divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.5rem" }}>
          <div style={{ width: 50, height: 1, background: `rgba(196,162,101,0.6)` }} />
          <div style={{ width: 7, height: 7, background: GOLD_LIGHT, transform: "rotate(45deg)" }} />
          <div style={{ width: 50, height: 1, background: `rgba(196,162,101,0.6)` }} />
        </div>

        {/* H1 */}
        <h1 className="animate-fade-in-up"
          style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
                   fontSize: "clamp(2rem, 4.5vw, 3.2rem)", color: "#4A3823",
                   textShadow: "0 1px 14px rgba(255,252,245,0.55)", margin: "0 0 0.5rem",
                   lineHeight: 1.3, fontStyle: "italic" }}>
          {copy("copy.home.hero_title", "אתר התנ״ך של ישראל")}
        </h1>

        {/* CTAs */}
        <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={scrollToLearn}
            style={{ padding: "0.75rem 1.8rem", borderRadius: "1rem", border: "none",
                     background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
                     color: "white", fontFamily: "Paamon, serif", fontWeight: 700,
                     fontSize: "1rem", cursor: "pointer",
                     boxShadow: "0 4px 24px rgba(139,111,71,0.4)" }}>
            {copy("copy.home.hero_cta_primary", "התחילו ללמוד")}
          </button>
          <button onClick={() => navigate(isSubscriber ? "/program/weekly-chapter" : "/chapter-weekly")}
            style={{ padding: "0.75rem 1.8rem", borderRadius: "1rem",
                     border: "1.5px solid rgba(74,56,35,0.35)",
                     background: "rgba(255,255,255,0.38)", backdropFilter: "blur(8px)",
                     color: "#4A3823", fontFamily: "Paamon, serif", fontSize: "0.95rem",
                     fontWeight: 700, cursor: "pointer" }}>
            {isSubscriber
              ? "לאזור הלימוד שלי"
              : copy("copy.home.hero_cta_secondary", "לתכנית הפרק השבועי")}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── StatsBar ───────────────────────────────────────────────────────────────
function StatsBar() {
  // רמה 13 (מרכז שליטה): המספרים והתוויות נערכים מ-/admin/control-center
  const copy = useSiteCopy();
  const stats = [
    { num: copy("copy.home.stat1_num", "+11,000"), label: copy("copy.home.stat1_label", "שיעורים ומאמרים") },
    { num: copy("copy.home.stat2_num", "+200"),    label: copy("copy.home.stat2_label", "רבנים ומרצים") },
    { num: copy("copy.home.stat3_num", "+1,300"),  label: copy("copy.home.stat3_label", "סדרות לימוד") },
  ];
  return (
    <div dir="rtl" style={{ background: "linear-gradient(180deg, rgba(32,79,73,0.88) 0%, rgba(18,48,44,0.94) 100%), url('/family-bible/deep-texture.jpg') center / cover", padding: "1.25rem 1.5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex",
                    justifyContent: "center", gap: "clamp(2rem, 6vw, 5rem)", flexWrap: "wrap" }}>
        {stats.map(({ num, label }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                          fontSize: "1.5rem",
                          background: `linear-gradient(135deg, ${GOLD_SHIMMER}, ${GOLD_LIGHT})`,
                          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {num}
            </div>
            <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.75rem",
                          color: "rgba(255,255,255,0.45)", marginTop: "0.15rem" }}>
              {label}
            </div>
          </div>
        ))}
      </div>
      {/* רמה 20 (הרב יואב 16.7 13:53): שורת הנצחה קבועה — נערכת ממרכז השליטה */}
      <div style={{ maxWidth: 1280, margin: "0.9rem auto 0", paddingTop: "0.75rem",
                    borderTop: "1px solid rgba(232,213,160,0.22)", textAlign: "center" }}>
        <Link to="/memorial/saadia" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
                         fontSize: "0.95rem", color: "#E8D5A0", letterSpacing: "0.04em" }}>
            {copy("copy.home.memorial_line", "האתר מוקדש לזכר סעדיה דרעי ז״ל")}
          </span>
        </Link>
      </div>
    </div>
  );
}

// ── FamilyBibleSection — lesson-card watercolor design ────────────────────
// Replaces TanachLemishpachaSection (2026-05-27); chapel-arch → lesson-card 11.7.2026.
//
// 7.7.2026 (סער): דור-הפלאות הוחלף בחדשות-התנ״ך (הטור היומי) והפודקאסט הופעל —
// שניהם חיים עם תוכן אמיתי שנקלט מקבוצות "בכוח התנ״ך ננצח".
// 11.7.2026 (סער): הכרטיסים מנוהלים מהאדמין — טבלת family_cards (show_on_home=true),
// כולל כותרת/תיאור/תמונה/לינק/סדר. העיצוב הוחלף לשפת כרטיסי-השיעורים עם תמונות
// אקוורל צבעוניות 16:9 מ-storage (product-images/family-cards/).
// FAMILY_BIBLE_CARDS נשאר fallback בלבד — שהסקשן לא יעלה ריק אם השליפה נכשלה.
const FAMILY_BIBLE_CARDS = [
  {
    id: "tanach-news",
    title: "חדשות תנכיות",
    desc: "מאורעות השעה לאור התנ\"ך",
    href: "/tanach-news",
    image: "/family-bible/card-tanach-news.jpg",
    disabled: false,
  },
  {
    id: "daily-verse",
    title: "תנ\"ך לחיים",
    desc: "פסוק אחד ביום",
    href: "/daily-verse",
    image: "/family-bible/card-daily-verse.jpg",
    disabled: false,
  },
  {
    id: "kids-podcast",
    title: "סיפורי התנ\"ך לילדים",
    desc: "פודקאסט לילדים · פרק חדש בכל יום שלישי",
    href: "/series/bc1d97b9-e0a5-4b88-8169-5705120bc20c",
    image: "/family-bible/card-kids-podcast.jpg",
    disabled: false,
  },
];

function FamilyBibleSection() {
  const navigate = useNavigate();
  const { data: familyCards } = useFamilyCards();
  // רמה 29ב (יואב 26.7): כותרת הסקשן עריכה ממרכז השליטה
  const copy = useSiteCopy();

  // תוכן מהאדמין: רק כרטיסים פעילים שסומנו show_on_home, לפי sort_order.
  // home_title/home_description גוברים על הכותרת/תיאור של עמוד /family-tanach.
  const fromDb = (familyCards ?? [])
    .filter((c) => c.show_on_home)
    .map((c) => ({
      id: c.card_key,
      title: c.home_title ?? c.title,
      desc: c.home_description ?? c.description ?? "",
      href: c.href,
      image:
        c.image_url ??
        FAMILY_BIBLE_CARDS.find((f) => f.id === c.card_key)?.image ??
        "",
      disabled: false,
    }));
  const cards = fromDb.length ? fromDb : FAMILY_BIBLE_CARDS;

  return (
    <section dir="rtl" style={{ background: PARCHMENT, padding: "5.5rem 1.5rem", position: "relative", overflow: "hidden" }}>

      {/* SVG filigree decorations */}
      <svg aria-hidden style={{ position: "absolute", top: 24, insetInlineStart: "50%", transform: "translateX(-50%)", pointerEvents: "none", opacity: 0.15 }} width="600" height="28" viewBox="0 0 600 28">
        <line x1="0" y1="14" x2="220" y2="14" stroke="#C4A265" strokeWidth="1" />
        <circle cx="240" cy="14" r="3" fill="none" stroke="#C4A265" strokeWidth="1" />
        <circle cx="300" cy="14" r="5" fill="none" stroke="#C4A265" strokeWidth="1.2" />
        <circle cx="360" cy="14" r="3" fill="none" stroke="#C4A265" strokeWidth="1" />
        <line x1="380" y1="14" x2="600" y2="14" stroke="#C4A265" strokeWidth="1" />
      </svg>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Section header — "תנ"ך למשפחה" gold shimmer logo */}
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          {/* Dividers + title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "0.5rem" }}>
            <div style={{ flex: 1, maxWidth: 140, height: 1, background: `linear-gradient(to left, ${GOLD_LIGHT}, transparent)` }} />
            <h2
              style={{
                fontFamily: "Kedem, Frank Ruhl Libre, serif",
                fontWeight: 900,
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                margin: 0,
                lineHeight: 1.1,
                background: "linear-gradient(135deg, #C4A265 0%, #E8D89A 50%, #C4A265 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "0.02em",
              }}
            >
              {copy("copy.home.family_title", "תנ״ך למשפחה")}
            </h2>
            <div style={{ flex: 1, maxWidth: 140, height: 1, background: `linear-gradient(to right, ${GOLD_LIGHT}, transparent)` }} />
          </div>
          <p style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.9rem", color: TEXT_MUTED, margin: 0 }}>
            {copy("copy.home.family_subtitle", "הלימוד היומי")}
          </p>
        </div>

        {/* Lesson-card style grid — 16:9 watercolor, RTL, mobile 1-col */}
        <style>{`
          .family-bible-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
          @media (max-width: 900px) { .family-bible-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 600px) { .family-bible-grid { grid-template-columns: 1fr; gap: 1rem; } }
        `}</style>

        <div className="family-bible-grid" style={{ position: "relative" }}>

          {/* Gold ribbon flow — absolute SVG connector between cards */}
          <svg
            aria-hidden
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="ribbon-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C4A265" stopOpacity="0" />
                <stop offset="30%" stopColor="#E8D5A0" stopOpacity="0.35" />
                <stop offset="70%" stopColor="#E8D5A0" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#C4A265" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect x="0" y="35%" width="100%" height="4" rx="2" fill="url(#ribbon-grad)" />
          </svg>

          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => !card.disabled && navigate(card.href)}
              disabled={card.disabled}
              aria-label={`${card.title}, ${card.desc}`}
              className="group block w-full text-start bg-card border border-border rounded-2xl overflow-hidden
                hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
                cursor-pointer disabled:opacity-55 disabled:cursor-default disabled:hover:translate-y-0
                focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-primary focus-visible:outline-offset-2"
              style={{ position: "relative", zIndex: 1 }}
            >
              {/* אקוורל צבעוני 16:9 — אותה שפה כמו כרטיסי השיעורים */}
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
              </div>

              <div style={{ padding: "1rem 1.1rem 1.2rem", textAlign: "center" }}>
                <div style={{
                  fontFamily: "Kedem, Frank Ruhl Libre, serif",
                  fontWeight: 900,
                  fontSize: "clamp(1.05rem, 2.2vw, 1.25rem)",
                  marginBottom: "0.3rem",
                  lineHeight: 1.25,
                }} className="text-foreground group-hover:text-primary transition-colors">
                  {card.title}
                </div>
                <div style={{
                  fontFamily: "Ploni, sans-serif",
                  fontSize: "0.85rem",
                  color: TEXT_MUTED,
                  lineHeight: 1.5,
                }}>
                  {card.desc}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 10.7 (סער): כפתור מתחת בצד — לכל תכני תנ״ך למשפחה */}
        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => navigate("/family-tanach")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1.5rem",
              borderRadius: "1rem",
              border: `1.5px solid ${GOLD_DARK}`,
              background: "transparent",
              color: GOLD_DARK,
              fontFamily: "Paamon, serif",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = GOLD_DARK;
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = GOLD_DARK;
            }}
          >
            לכל תכני תנ״ך למשפחה
            <span aria-hidden>←</span>
          </button>
        </div>

        {/* Memorial line — יואב 18.7: מודגשת יותר (הייתה קטנה וחיוורת) */}
        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.55rem",
              padding: "0.55rem 1.4rem",
              borderRadius: 999,
              border: "1px solid rgba(196,162,101,0.5)",
              background: "rgba(196,162,101,0.1)",
              fontFamily: "Frank Ruhl Libre, serif",
              fontSize: "1.02rem",
              fontWeight: 700,
              color: "#8B6F47",
              letterSpacing: "0.04em",
            }}
          >
            <span aria-hidden style={{ fontSize: "0.95rem" }}>🕯</span>
            לעילוי נשמת מעיין פלסר ז״ל
          </span>
        </div>
      </div>
    </section>
  );
}

// ── DesignParashaHolidaySection ────────────────────────────────────────────
// seriesId = ID of the matching series in Supabase (for navigation)
// imageUrl = optional cover image (used if present)
//
// Section images (generated by flyer-creator, gpt-image-2):
// יואב 25.7 22:56: תמונת המגילה מכרטיס "פרשת השבוע" בתנ"ך-למשפחה — גם בדף הבית
const PARASHA_PLACEHOLDER_IMG = "/family-bible/parasha-scroll.jpg";
// יואב 5.8 (נשלחה שוב 6.8): התמונה המעוצבת שלו למועדים — גביע, רימון וענף זית באקוורל
const MOED_PLACEHOLDER_IMG    = "/family-bible/moed-yoav-watercolor.webp";
// לוח המועדים מחושב אוטומטית מ-@hebcal — ראה src/lib/holidays.ts
// (החליף רשימה מקודדת-ידנית שהתיישנה: י"ז בתמוז הוצג בתאריך שגוי גם אחרי שעבר)

const YOMHAATZMAOUT = "יום העצמאות";
const ISRAEL_BLUE   = "#003F8A";

function DesignParashaHolidaySection() {
  const { parasha, chumash, articleSeries } = useParasha();
  const verse = getParashaVerse(parasha);
  const navigate = useNavigate();

  const holiday = useMemo(() => getUpcomingHoliday(60), []);

  const isYomHaatzmaout = holiday?.name === YOMHAATZMAOUT;

  const daysUntil = holiday
    ? Math.ceil((holiday.date.getTime() - Date.now()) / 864e5)
    : 0;

  const { data: holidaySeries = [] } = useQuery({
    queryKey: ["design-holiday-series", holiday?.name],
    enabled: !!holiday,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      if (!holiday) return [];
      const seen = new Set<string>();
      const out: Array<{ id: string; title: string; lesson_count: number; rabbi_name: string | null }> = [];
      for (const term of holiday.terms) {
        const { data } = await supabase
          .from("series").select("id, title, lesson_count, rabbis!series_rabbi_id_fkey(name)")
          .eq("status", "active").gt("lesson_count", 0)
          .ilike("title", `%${term}%`).limit(5);
        for (const s of data ?? []) {
          if (!seen.has(s.id)) {
            seen.add(s.id);
            out.push({ id: s.id, title: s.title, lesson_count: s.lesson_count,
              rabbi_name: (s.rabbis as any)?.name ?? null });
          }
        }
      }
      return out.sort((a, b) => b.lesson_count - a.lesson_count).slice(0, 6);
    },
  });

  const firstArticle = articleSeries.find(s => s.lessonContent);

  // Holiday accent color — blue for Yom Haatzmaout, gold otherwise
  const holidayAccentLight = isYomHaatzmaout ? "#6ba3e8" : GOLD_LIGHT;

  // קטע-שיעור למועד (יואב 27.7: "קטע טקסט קטן מתוך אחד השיעורים — שישווה לפרשת שבוע").
  // תיקון-שורש: המיון היה על order_index שלא קיימת ב-lessons (העמודה היא sort_order)
  // → השאילתה נכשלה בשקט והבלוק לא הוצג באף מועד. עכשיו: קודם הסדרה המוצמדת
  // (holiday.seriesId), אחרת הסדרה שנמצאה בחיפוש; ובוחרים שיעור שיש בו טקסט ממשי.
  const firstHolidaySeries = holidaySeries[0];
  const previewSeriesId = holiday?.seriesId || firstHolidaySeries?.id || null;
  const { data: holidayLessonPreview } = useQuery({
    queryKey: ["holiday-lesson-preview", previewSeriesId],
    enabled: !!previewSeriesId,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, title, content, rabbis!lessons_rabbi_id_fkey(name)")
        .eq("series_id", previewSeriesId!)
        .eq("status", "published")
        .not("content", "is", null)
        .order("sort_order")
        .limit(8);
      const withText = (data ?? []).find(
        (l) => (l.content ?? "").replace(/<[^>]+>/g, " ").trim().length >= 200
      );
      return withText ?? null;
    },
  });

  // Parchment section — light background (Yom Haatzmaout stays navy)
  const sectionBg = isYomHaatzmaout
    ? `linear-gradient(160deg, #0d1f3d 0%, #142d5c 45%, #0d1f3d 100%)`
    : PARCHMENT_DARK;
  const onDark = isYomHaatzmaout;

  return (
    <section dir="rtl" style={{
      background: sectionBg,
      padding: "5rem 1.5rem", position: "relative", overflow: "hidden",
      borderTop: onDark ? "none" : `1px solid rgba(139,111,71,0.1)`,
      borderBottom: onDark ? "none" : `1px solid rgba(139,111,71,0.1)`,
    }}>
      {/* Israeli flag top band for Yom Haatzmaout */}
      {isYomHaatzmaout && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, display: "flex" }}>
          <div style={{ flex: 1, background: ISRAEL_BLUE }} />
          <div style={{ flex: 1, background: "white" }} />
          <div style={{ flex: 1, background: ISRAEL_BLUE }} />
        </div>
      )}

      <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative" }}>
        {/* Section header — mirrors TanachLemishpacha header pattern */}
        <div style={{ display: "flex", alignItems: "flex-end",
          justifyContent: "space-between", marginBottom: "2.5rem",
          flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.78rem", fontWeight: 700,
              color: onDark ? GOLD_LIGHT : GOLD_DARK, letterSpacing: "0.15em",
              textTransform: "uppercase", marginBottom: "0.3rem" }}>
              בני ציון · תנ״ך
            </div>
            <h2 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
              fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
              color: onDark ? "white" : TEXT_DARK,
              margin: "0 0 0.3rem", lineHeight: 1.15 }}>
              פרשת השבוע ומועדים
            </h2>
            <p style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.85rem",
              color: onDark ? "rgba(255,255,255,0.55)" : TEXT_MUTED,
              margin: 0 }}>
              שיעורים, מאמרים ותכנים לשולחן שבת ולחגי ישראל
            </p>
          </div>
        </div>

        {/* יואב 26.7: stretch (לא start) — במחשב שני הכרטיסים באותו גובה, ה-CTA נצמד לתחתית */}
        <div className="parasha-holiday-grid" style={{ display: "grid", gridTemplateColumns: holiday && holidaySeries.length > 0 ? "1fr 1fr" : "1fr",
                      gap: "2rem", alignItems: "stretch" }}>

          {/* ── RIGHT (first in RTL): Holiday ── */}
          {holiday && holidaySeries.length > 0 && (
            <div style={{ borderRadius: "1.5rem", overflow: "hidden",
              display: "flex", flexDirection: "column",
              background: onDark ? "transparent" : "white",
              border: onDark ? "none" : "1px solid rgba(139,111,71,0.1)",
              boxShadow: onDark ? "none" : "0 2px 16px rgba(45,31,14,0.06)" }}>

              {/* Image header — 160px tall, same as TanachLemishpacha cards.
                  רמה 20 (יואב 16.7): צבעוניות — רוויה מוגברת + פס אקוורל צבעוני עליון */}
              <div style={{ height: 160, position: "relative", overflow: "hidden",
                background: isYomHaatzmaout
                  ? `linear-gradient(135deg, #0d1f3d, #1a3566)`
                  : `linear-gradient(135deg, ${GOLD_DARK}, #B4682F)` }}>
                {isYomHaatzmaout ? (
                  <img src="/images/yom-haatzmaut-hero.webp"
                    alt="יום העצמאות"
                    style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9,
                             filter: "saturate(1.18)" }} />
                ) : (holiday.imageUrl || MOED_PLACEHOLDER_IMG) ? (
                  <img src={holiday.imageUrl || MOED_PLACEHOLDER_IMG}
                    alt={holiday.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9,
                             filter: "saturate(1.18)" }} />
                ) : null}
                <div style={{ position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)" }} />
                {!isYomHaatzmaout && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4,
                    background: "linear-gradient(90deg, #2E6E65, #C4A265, #B4682F)" }} />
                )}
                {/* Badge top-right */}
                <div style={{ position: "absolute", top: 12, right: 12,
                  padding: "0.15rem 0.65rem", borderRadius: "1rem",
                  background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
                  fontFamily: "Ploni, sans-serif", fontSize: "0.68rem",
                  fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
                  {holiday.hebrewDate}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: "1.25rem 1.4rem 1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Header */}
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.72rem", fontWeight: 700,
                    letterSpacing: "0.18em",
                    color: onDark ? holidayAccentLight : GOLD_DARK,
                    textTransform: "uppercase", marginBottom: "0.35rem" }}>
                    המועד הקרוב
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <h2 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                      fontSize: "clamp(1.4rem, 2.5vw, 2rem)",
                      color: onDark ? "white" : TEXT_DARK,
                      margin: 0, lineHeight: 1.15 }}>
                      {isYomHaatzmaout ? "🇮🇱 " : ""}{holiday.name}
                    </h2>
                    {/* "עוד X ימים" pill — gold dot, not green */}
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem",
                      padding: "0.2rem 0.65rem", borderRadius: "2rem",
                      background: isYomHaatzmaout ? "rgba(0,63,138,0.12)" : "rgba(139,111,71,0.1)",
                      border: `1px solid ${isYomHaatzmaout ? "rgba(0,63,138,0.35)" : "rgba(139,111,71,0.25)"}` }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%",
                        background: isYomHaatzmaout ? "#6ba3e8" : GOLD_LIGHT,
                        boxShadow: isYomHaatzmaout ? "0 0 5px rgba(107,163,232,0.6)" : `0 0 5px rgba(196,162,101,0.5)` }} />
                      <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.7rem",
                        fontWeight: 700,
                        color: onDark ? holidayAccentLight : GOLD_DARK }}>
                        עוד {daysUntil} ימים
                      </span>
                    </div>
                  </div>
                  <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.8rem",
                    color: onDark ? "rgba(255,255,255,0.5)" : TEXT_MUTED,
                    marginTop: "0.2rem" }}>
                    {holiday.hebrewDate} • שיעורים והכנה לחג
                  </div>
                </div>

                {/* Holiday lesson preview — parchment card on light, glass on dark */}
                {holidayLessonPreview && (
                  <div
                    onClick={() => navigate(`/lessons/${holidayLessonPreview.id}`)}
                    style={{
                      background: onDark ? "rgba(255,255,255,0.06)" : PARCHMENT,
                      borderRadius: "0.9rem",
                      border: onDark
                        ? `1px solid ${isYomHaatzmaout ? "rgba(0,63,138,0.2)" : "rgba(232,213,160,0.12)"}`
                        : "1px solid rgba(139,111,71,0.12)",
                      padding: "1rem 1.1rem", marginBottom: "1.25rem", cursor: "pointer",
                      transition: "all 0.22s" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = onDark
                        ? "rgba(255,255,255,0.1)" : "#F0EAE0";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = onDark
                        ? "rgba(255,255,255,0.06)" : PARCHMENT;
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
                      fontSize: "0.92rem",
                      color: onDark ? (isYomHaatzmaout ? "#6ba3e8" : GOLD_SHIMMER) : TEXT_DARK,
                      marginBottom: "0.3rem" }}>
                      {holidayLessonPreview.title}
                    </div>
                    {(holidayLessonPreview.rabbis as any)?.name && (
                      <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.78rem",
                        color: onDark ? "rgba(255,255,255,0.5)" : TEXT_SUBTLE,
                        marginBottom: "0.4rem" }}>
                        מאת {(holidayLessonPreview.rabbis as any).name}
                      </div>
                    )}
                    <div
                      className="line-clamp-3"
                      style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.82rem",
                        color: onDark ? "rgba(255,255,255,0.65)" : TEXT_MUTED,
                        lineHeight: 1.65,
                        display: "-webkit-box", WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(
                        holidayLessonPreview.content?.replace(/<[^>]+>/g, " ").slice(0, 200) ?? ""
                      ) }}
                    />
                    <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.75rem",
                      color: onDark ? holidayAccentLight : GOLD_DARK,
                      fontWeight: 600, marginTop: "0.45rem", display: "inline-block" }}>
                      לשיעור המלא ←
                    </span>
                  </div>
                )}

                {/* CTA */}
                <button onClick={() =>
                  // סדרה מוצמדת → אליה; אחרת הסדרה הכי עשירה שנמצאה לפי מונחי-המועד; ורק אם אין — הקטלוג
                  holiday.seriesId
                    ? navigate(`/series/${holiday.seriesId}`)
                    : firstHolidaySeries
                      ? navigate(`/series/${firstHolidaySeries.id}`)
                      : navigate("/series")
                }
                  style={{ padding: "0.75rem 1.75rem", borderRadius: "0.85rem",
                    border: "none", marginTop: "auto", alignSelf: "flex-start",
                    background: isYomHaatzmaout
                      ? `linear-gradient(135deg, ${ISRAEL_BLUE}, #1a5fb4)`
                      : `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
                    color: "white", fontFamily: "Paamon, serif", fontWeight: 700,
                    fontSize: "0.92rem", cursor: "pointer",
                    boxShadow: isYomHaatzmaout ? "0 4px 16px rgba(0,63,138,0.3)" : "0 4px 16px rgba(139,111,71,0.3)" }}>
                  כל שיעורי {holiday.name} ←
                </button>
              </div>
            </div>
          )}

          {/* ── LEFT (second in RTL): Parasha ── */}
          <div style={{ borderRadius: "1.5rem", overflow: "hidden",
            display: "flex", flexDirection: "column",
            background: onDark ? "transparent" : "white",
            border: onDark ? "none" : "1px solid rgba(139,111,71,0.1)",
            boxShadow: onDark ? "none" : "0 2px 16px rgba(45,31,14,0.06)" }}>

            {/* Parasha visual header — 160px. רמה 20 (יואב 16.7): צבעוניות —
                גרדיאנט יער→זהב + רוויה מוגברת + פס אקוורל צבעוני עליון */}
            <div style={{ height: 160, position: "relative", overflow: "hidden",
              background: `linear-gradient(135deg, #2E6E65, ${GOLD_DARK})` }}>
              {PARASHA_PLACEHOLDER_IMG && (
                <img src={PARASHA_PLACEHOLDER_IMG}
                  alt={`פרשת ${parasha}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9,
                           filter: "saturate(1.18)" }} />
              )}
              <div style={{ position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)" }} />
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4,
                background: "linear-gradient(90deg, #2E6E65, #C4A265, #B4682F)" }} />
              {/* Badge */}
              <div style={{ position: "absolute", top: 12, right: 12,
                padding: "0.15rem 0.65rem", borderRadius: "1rem",
                background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
                fontFamily: "Ploni, sans-serif", fontSize: "0.68rem",
                fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
                {chumash || "תורה"}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "1.25rem 1.4rem 1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Header */}
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.72rem", fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: onDark ? GOLD_LIGHT : GOLD_DARK,
                  textTransform: "uppercase", marginBottom: "0.35rem" }}>
                  הדף לשולחן שבת
                </div>
                <h2 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                  fontSize: "clamp(1.4rem, 2.5vw, 2rem)",
                  color: onDark ? "white" : TEXT_DARK,
                  margin: "0 0 0.2rem", lineHeight: 1.15 }}>
                  פרשת {parasha || "..."}
                </h2>
                {chumash && (
                  <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.8rem",
                    color: onDark ? "rgba(255,255,255,0.5)" : TEXT_MUTED }}>
                    חומש {chumash}
                  </div>
                )}
              </div>

              {/* Verse blockquote */}
              {verse && (
                <div style={{ borderInlineEnd: `3px solid ${GOLD_LIGHT}`, paddingInlineEnd: "1.1rem",
                  marginBottom: "1.25rem" }}>
                  <blockquote style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 400,
                    fontSize: "1rem", fontStyle: "italic",
                    color: onDark ? "rgba(255,255,255,0.85)" : TEXT_DARK,
                    margin: 0, lineHeight: 1.7 }}>
                    ״{verse.text}״
                  </blockquote>
                  <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.7rem",
                    color: onDark ? "rgba(255,255,255,0.35)" : TEXT_SUBTLE,
                    marginTop: "0.35rem" }}>
                    [{verse.reference}]
                  </div>
                </div>
              )}

              {/* Article preview — parchment card on light, glass on dark */}
              {firstArticle && (
                <div
                  onClick={() => firstArticle.lessonId && navigate(`/lessons/${firstArticle.lessonId}`)}
                  style={{
                    background: onDark ? "rgba(255,255,255,0.06)" : PARCHMENT,
                    borderRadius: "0.9rem",
                    border: onDark ? "1px solid rgba(232,213,160,0.12)" : "1px solid rgba(139,111,71,0.12)",
                    padding: "1rem 1.1rem",
                    marginBottom: "1.25rem",
                    cursor: firstArticle.lessonId ? "pointer" : "default",
                    transition: "all 0.22s" }}
                  onMouseEnter={e => {
                    if (firstArticle.lessonId) {
                      (e.currentTarget as HTMLElement).style.background = onDark
                        ? "rgba(255,255,255,0.1)" : "#F0EAE0";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = onDark
                      ? "rgba(255,255,255,0.06)" : PARCHMENT;
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
                    fontSize: "0.92rem",
                    color: onDark ? GOLD_SHIMMER : TEXT_DARK,
                    marginBottom: "0.3rem" }}>
                    {firstArticle.title}
                  </div>
                  <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.78rem",
                    color: onDark ? "rgba(255,255,255,0.5)" : TEXT_SUBTLE,
                    marginBottom: "0.4rem" }}>
                    מאת {firstArticle.rabbi}
                  </div>
                  <div
                    className="line-clamp-3"
                    style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.82rem",
                      color: onDark ? "rgba(255,255,255,0.65)" : TEXT_MUTED,
                      lineHeight: 1.65,
                      display: "-webkit-box", WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(
                      firstArticle.lessonContent?.replace(/<[^>]+>/g, " ").slice(0, 200) ?? ""
                    ) }}
                  />
                  {firstArticle.lessonId && (
                    <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.75rem",
                      color: onDark ? GOLD_LIGHT : GOLD_DARK,
                      fontWeight: 600, marginTop: "0.45rem", display: "inline-block" }}>
                      לשיעור המלא ←
                    </span>
                  )}
                </div>
              )}

              {/* Dual CTAs */}
              <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginTop: "auto" }}>
                <button onClick={() => navigate("/parasha")}
                  style={{ padding: "0.75rem 1.75rem", borderRadius: "0.85rem", border: "none",
                    background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
                    color: "white", fontFamily: "Paamon, serif", fontWeight: 700,
                    fontSize: "0.92rem", cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(139,111,71,0.3)" }}>
                  לדף פרשת השבוע ←
                </button>
                {firstArticle?.seriesId && (
                  <button onClick={() => navigate(`/series/${firstArticle.seriesId}`)}
                    style={{ padding: "0.75rem 1.75rem", borderRadius: "0.85rem",
                      border: `1.5px solid ${onDark ? GOLD_LIGHT : GOLD_DARK}`,
                      background: "transparent",
                      color: onDark ? GOLD_LIGHT : GOLD_DARK,
                      fontFamily: "Paamon, serif", fontWeight: 700,
                      fontSize: "0.92rem", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = onDark
                        ? "rgba(196,162,101,0.1)" : "rgba(139,111,71,0.08)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    לסדרה ←
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Fallback miracles ─────────────────────────────────────────────────────
const FALLBACK_MIRACLES = [
  { number: 1, title: "הברית הישראלית שלא ניתנת לקריעה", body_intro: "דמיינו את שולחנות החג והשבת בחודשים שקדמו לשמחת תורה...", image_url: "" },
  { number: 2, title: "נס הפתיחה המוקדמת של המערכה", body_intro: "רק המחשבה על כך מעבירה צמרמורת: תוכנית האויב האמיתית הייתה...", image_url: "" },
  { number: 3, title: "גבורת המעטים שעמדו בפרץ", body_intro: "שש וחצי בבוקר, בעיצומו של חג ושבת קודש. אלפי מחבלים חמושים...", image_url: "" },
  { number: 4, title: "הרקטה שלא התפוצצה", body_intro: "רקטה ישירה לבית כנסת מלא מתפללים — ולא התפוצצה. הנדסאים שבדקו אותה לא הצליחו להסביר למה...", image_url: "" },
];

// ── WarMiraclesSection ─────────────────────────────────────────────────────
function WarMiraclesSection() {
  const navigate = useNavigate();
  // יואב 18.7: כל טקסטי הרצועה עריכים ממרכז השליטה (copy.home.miracles_*)
  const copy = useSiteCopy();

  const { data: realMiracles = [] } = useQuery({
    queryKey: ["design-war-miracles"],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("miracles")
        .select("number, title, body_intro, image_url")
        .eq("status", "published")
        .order("number")
        .limit(4);
      return data ?? [];
    },
  });

  const miracles = realMiracles.length > 0 ? realMiracles : FALLBACK_MIRACLES;

  return (
    <section style={{ background: NAVY_DEEP, padding: "5.5rem 1.5rem", position: "relative", overflow: "hidden" }}>
      {/* Background image with overlay */}
      <div style={{ position: "absolute", inset: 0 }}>
        <img src="/images/war-miracles-bg.jpg" alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.22 }} />
        <div style={{ position: "absolute", inset: 0,
                      background: "linear-gradient(135deg, rgba(26,39,68,0.92) 0%, rgba(26,39,68,0.85) 100%)" }} />
      </div>

      {/* Dot pattern */}
      <div style={{ position: "absolute", inset: 0,
                    backgroundImage: "radial-gradient(circle, rgba(196,162,101,0.06) 1px, transparent 1px)",
                    backgroundSize: "28px 28px", pointerEvents: "none" }} />

      <div dir="rtl" style={{ maxWidth: 1280, margin: "0 auto", position: "relative" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.78rem", fontWeight: 700,
                        letterSpacing: "0.2em", color: GOLD_LIGHT, textTransform: "uppercase",
                        marginBottom: "0.75rem" }}>
            {copy("copy.home.miracles_eyebrow", "ניסי המלחמה")}
          </div>
          <h2 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                        fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", color: "white", margin: "0 0 1rem" }}>
            {copy("copy.home.miracles_title", "דור הפלאות — נסים מהמלחמה")}
          </h2>
          <p style={{ fontFamily: "Ploni, sans-serif", fontSize: "1rem", color: "rgba(255,255,255,0.55)",
                      maxWidth: 520, margin: "0 auto" }}>
            {copy("copy.home.miracles_subtitle", "מאות סיפורים מתועדים של נסים גלויים שהתרחשו בשדות הקרב ובעורף")}
          </p>
        </div>

        {/* Miracle cards — horizontal scroll */}
        <div style={{ display: "flex", gap: "1.5rem", marginBottom: "3rem",
                      overflowX: "auto", scrollSnapType: "x mandatory",
                      paddingBottom: "0.5rem", WebkitOverflowScrolling: "touch" }}>
          {miracles.map((miracle: typeof FALLBACK_MIRACLES[number], i: number) => (
            <div key={miracle.number ?? i}
              onClick={() => navigate("/dor-haplaot")}
              style={{ borderRadius: "1.25rem", overflow: "hidden", minWidth: 300, maxWidth: 320,
                       flexShrink: 0, scrollSnapAlign: "start",
                       background: "rgba(255,255,255,0.06)", border: "1px solid rgba(196,162,101,0.2)",
                       backdropFilter: "blur(8px)", cursor: "pointer", transition: "all 0.28s ease" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
                (e.currentTarget as HTMLElement).style.borderColor = `rgba(196,162,101,0.45)`;
                (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,162,101,0.2)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              {/* Image on top */}
              {miracle.image_url ? (
                <div style={{ height: 140, overflow: "hidden", position: "relative" }}>
                  <img src={miracle.image_url} alt={miracle.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0,
                                background: "linear-gradient(to top, rgba(26,39,68,0.6) 0%, transparent 60%)" }} />
                </div>
              ) : (
                <div style={{ height: 140, background: "linear-gradient(135deg, rgba(26,39,68,0.8), rgba(45,61,92,0.8))",
                              display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                                  fontSize: "3rem", opacity: 0.15, color: "white" }}>✦</span>
                </div>
              )}

              {/* Card body */}
              <div style={{ padding: "1.25rem 1.5rem 1.75rem" }}>
                {/* Gold number */}
                <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                              fontSize: "2rem", lineHeight: 1,
                              background: `linear-gradient(135deg, ${GOLD_SHIMMER}, ${GOLD_LIGHT})`,
                              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                              marginBottom: "0.4rem" }}>
                  {String(miracle.number ?? i + 1).padStart(2, "0")}
                </div>
                <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.7rem", fontWeight: 700,
                              color: GOLD_LIGHT, letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
                  נס מס' {miracle.number ?? i + 1}
                </div>
                <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
                              fontSize: "1.05rem", color: "white", marginBottom: "0.65rem",
                              lineHeight: 1.35 }}>
                  {miracle.title}
                </div>
                <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.83rem",
                              color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                  {miracle.body_intro?.slice(0, 110)}...
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <button onClick={() => navigate("/dor-haplaot")}
            style={{ padding: "0.9rem 2.5rem", borderRadius: "1rem", border: `1.5px solid ${GOLD_LIGHT}`,
                     background: "transparent", color: GOLD_LIGHT, fontFamily: "Paamon, serif",
                     fontWeight: 700, fontSize: "1rem", cursor: "pointer", transition: "all 0.2s",
                     letterSpacing: "0.03em" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = `rgba(196,162,101,0.12)`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            לכל ניסי המלחמה ←
          </button>
        </div>
      </div>
    </section>
  );
}

// ── PopularLessonsSection ──────────────────────────────────────────────────
function PopularLessonsSection() {
  const { data: lessonsRaw } = useLessons();
  const navigate = useNavigate();
  const lessons = ((lessonsRaw || []) as any[]).filter((l: any) => l.status === "published").slice(0, 4);

  const LESSON_IMAGES = ["/images/lesson-audio.webp", "/images/lesson-video.webp", "/images/lesson-text.webp", "/images/series-middot.webp"];
  const getLessonImage = (lesson: any, index: number) => {
    if (lesson?.thumbnail_url) return lesson.thumbnail_url;
    return LESSON_IMAGES[index % LESSON_IMAGES.length];
  };

  const typeLabel = (t: string) =>
    t === "video" ? "וידאו" : t === "audio" ? "אודיו" : "טקסט";

  return (
    <section style={{ background: PARCHMENT, padding: "5rem 1.5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div dir="rtl" style={{ display: "flex", alignItems: "flex-end",
                                 justifyContent: "space-between", marginBottom: "2.75rem" }}>
          <div>
            <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.78rem", fontWeight: 700,
                          color: GOLD_DARK, letterSpacing: "0.15em", textTransform: "uppercase",
                          marginBottom: "0.3rem" }}>
              מה לומדים עכשיו
            </div>
            <h2 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                          fontSize: "clamp(1.5rem, 3vw, 2.1rem)", color: TEXT_DARK, margin: 0 }}>
              שיעורים פופולריים
            </h2>
          </div>
          <span onClick={() => navigate("/series")}
            style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.88rem", color: GOLD_DARK,
                     cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem",
                     borderBottom: `1px solid ${GOLD_DARK}`, paddingBottom: "1px" }}>
            הצג הכל ←
          </span>
        </div>

        <div dir="rtl" style={{ display: "grid",
                                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.5rem" }}>
          {(lessons.length === 0 ? Array.from({ length: 4 }) : lessons).map((lesson: any, i: number) => (
            <div key={lesson?.id ?? i}
              onClick={() => lesson?.id && navigate(`/lessons/${lesson.id}`)}
              style={{ borderRadius: "1.25rem", overflow: "hidden",
                       border: `1px solid rgba(139,111,71,0.1)`, background: "white",
                       cursor: lesson?.id ? "pointer" : "default",
                       transition: "all 0.28s ease",
                       boxShadow: "0 2px 12px rgba(45,31,14,0.05)" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 48px rgba(45,31,14,0.12)";
                (e.currentTarget as HTMLElement).style.borderColor = GOLD_DARK;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(45,31,14,0.05)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,111,71,0.1)";
              }}
            >
              {/* Thumbnail */}
              <div style={{ height: 180, overflow: "hidden", position: "relative",
                            background: PARCHMENT_DARK,
                            display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src={getLessonImage(lesson, i)}
                  alt={lesson?.title || ""}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", inset: 0,
                              background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)" }} />
                {lesson && (
                  <span style={{ position: "absolute", top: 10, right: 10,
                                 padding: "0.2rem 0.65rem", borderRadius: "0.5rem",
                                 background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
                                 color: "white", fontFamily: "Ploni, sans-serif",
                                 fontSize: "0.68rem", fontWeight: 700 }}>
                    {typeLabel(lesson.source_type || "audio")}
                  </span>
                )}
                {!lesson && (
                  <div style={{ position: "absolute", inset: 0,
                                background: "linear-gradient(135deg, rgba(139,111,71,0.15), rgba(91,110,58,0.15))" }} />
                )}
              </div>
              {/* Body */}
              <div style={{ padding: "1rem 1.1rem 1.25rem" }}>
                {lesson?.rabbis?.name && (
                  <div style={{ fontFamily: "Ploni, sans-serif", fontWeight: 700,
                                fontSize: "0.72rem", color: GOLD_DARK, marginBottom: "0.3rem" }}>
                    {lesson.rabbis.name}
                  </div>
                )}
                <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
                              fontSize: "0.9rem", color: TEXT_DARK, lineHeight: 1.45,
                              display: "-webkit-box", WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "0.5rem" }}>
                  {lesson?.title ?? "טוען..."}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {lesson?.duration && (
                    <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.72rem", color: TEXT_SUBTLE }}>
                      {Math.floor(lesson.duration / 60)} דקות
                    </span>
                  )}
                  {lesson?.id && (
                    <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.72rem",
                                   color: GOLD_DARK, fontWeight: 600 }}>
                      האזן ←
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Series fallback images by keyword ─────────────────────────────────────
const SERIES_IMAGE_MAP: [RegExp, string][] = [
  [/תנ.?ך|ננצח|כוח/i, "/images/series-tanach-victory.webp"],
  [/לשון|קודש|עברית/i, "/images/series-lashon-hakodesh.webp"],
  [/איוב/i, "/images/series-iyov.webp"],
  [/מידות|מוסר|middot/i, "/images/series-middot.webp"],
  [/משלי/i, "/images/series-iyov.webp"],
  [/שמות|בראשית|ויקרא|במדבר|דברים/i, "/images/series-lashon-hakodesh.webp"],
  [/פרשה|פרשת/i, "/images/series-tanach-victory.webp"],
];
function getSeriesImage(title: string, index: number): string {
  for (const [re, img] of SERIES_IMAGE_MAP) {
    if (re.test(title)) return img;
  }
  const fallbacks = ["/images/series-tanach-victory.webp", "/images/series-lashon-hakodesh.webp",
                     "/images/series-iyov.webp", "/images/series-middot.webp"];
  return fallbacks[index % fallbacks.length];
}

// ── TopSeriesSection ───────────────────────────────────────────────────────
function TopSeriesSection() {
  const { data: seriesRaw } = useSeries();
  const navigate = useNavigate();
  // Pick series with most lessons, skip very short ones
  const series = ((seriesRaw || []) as any[])
    .filter((s: any) => s.lesson_count > 10)
    .sort((a: any, b: any) => (b.lesson_count || 0) - (a.lesson_count || 0))
    .slice(0, 4);

  return (
    <section style={{ background: PARCHMENT_DARK, padding: "5rem 1.5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div dir="rtl" style={{ display: "flex", alignItems: "flex-end",
                                 justifyContent: "space-between", marginBottom: "2.75rem" }}>
          <div>
            <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.78rem", fontWeight: 700,
                          color: OLIVE_MAIN, letterSpacing: "0.15em", textTransform: "uppercase",
                          marginBottom: "0.3rem" }}>
              לומדים לפי נושא
            </div>
            <h2 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                          fontSize: "clamp(1.5rem, 3vw, 2.1rem)", color: TEXT_DARK, margin: 0 }}>
              סדרות מובילות
            </h2>
          </div>
          <span onClick={() => navigate("/series")}
            style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.88rem", color: OLIVE_MAIN,
                     cursor: "pointer", borderBottom: `1px solid ${OLIVE_MAIN}`, paddingBottom: "1px" }}>
            כל הסדרות ←
          </span>
        </div>

        <div dir="rtl" className="top-series-grid" style={{ display: "grid",
                                  gridTemplateColumns: "repeat(auto-fill, minmax(min(420px, 100%), 1fr))", gap: "1.25rem" }}>
          {(series.length === 0 ? Array.from({ length: 4 }) : series).map((s: any, i: number) => (
            <div key={s?.id ?? i}
              onClick={() => s?.id && navigate(`/series/${s.id}`)}
              style={{ borderRadius: "1.25rem", overflow: "hidden", display: "flex",
                       background: "white", border: `1px solid rgba(139,111,71,0.1)`,
                       cursor: s?.id ? "pointer" : "default", transition: "all 0.28s ease",
                       boxShadow: "0 2px 12px rgba(45,31,14,0.04)", minHeight: 110 }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 36px rgba(45,31,14,0.1)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(45,31,14,0.04)";
              }}
            >
              {/* Image */}
              <div style={{ width: "38%", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                <img src={s?.image_url || getSeriesImage(s?.title || "", i)} alt={s?.title || ""}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              {/* Info */}
              <div style={{ padding: "1.1rem 1.25rem", flex: 1, display: "flex",
                            flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                                fontSize: "0.95rem", color: TEXT_DARK, marginBottom: "0.3rem",
                                lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {s?.title ?? "טוען..."}
                  </div>
                  <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.72rem",
                                color: TEXT_SUBTLE }}>
                    {s?.lesson_count ?? 0} שיעורים
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                              marginTop: "0.75rem" }}>
                  <div style={{ height: 3, flex: 1, marginLeft: "0.75rem",
                                background: "rgba(139,111,71,0.1)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "25%",
                                  background: `linear-gradient(90deg, ${OLIVE_DARK}, ${OLIVE_MAIN})`,
                                  borderRadius: 2 }} />
                  </div>
                  <button style={{ padding: "0.3rem 0.9rem", borderRadius: "0.65rem", border: "none",
                                   background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
                                   color: "white", fontFamily: "Paamon, serif", fontWeight: 700,
                                   fontSize: "0.75rem", cursor: "pointer", flexShrink: 0 }}>
                    התחל ללמוד
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── RabbisSection ──────────────────────────────────────────────────────────
function RabbisSection() {
  const { data: rabbisRaw } = usePublicRabbis();
  const navigate = useNavigate();
  const rabbis = ((rabbisRaw || []) as any[]).slice(0, 8);

  return (
    <section style={{ background: OLIVE_BG, padding: "5rem 1.5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.78rem", fontWeight: 700,
                        color: OLIVE_MAIN, letterSpacing: "0.15em", textTransform: "uppercase",
                        marginBottom: "0.4rem" }}>
            המורים שלנו
          </div>
          <h2 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                        fontSize: "clamp(1.5rem, 3vw, 2.1rem)", color: TEXT_DARK, margin: 0 }}>
            הרבנים שלנו
          </h2>
        </div>

        <div dir="rtl" style={{ display: "grid",
                                  gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "1.75rem" }}>
          {(rabbis.length === 0 ? Array.from({ length: 8 }) : rabbis).map((rabbi: any, i: number) => (
            <div key={rabbi?.id ?? i}
              onClick={() => rabbi?.id && navigate(`/rabbis/${rabbi.id}`)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center",
                       textAlign: "center", gap: "0.5rem",
                       cursor: rabbi?.id ? "pointer" : "default" }}>
              <div
                style={{ width: 88, height: 88, borderRadius: "50%", overflow: "hidden",
                         border: `2.5px solid rgba(139,111,71,0.2)`,
                         background: rabbi?.image_url ? "transparent"
                           : `linear-gradient(135deg, ${GOLD_DARK}, ${OLIVE_MAIN})`,
                         display: "flex", alignItems: "center", justifyContent: "center",
                         transition: "transform 0.25s ease, box-shadow 0.25s ease",
                         boxShadow: "0 2px 16px rgba(45,31,14,0.1)" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1.08)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(139,111,71,0.28)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 16px rgba(45,31,14,0.1)";
                }}
              >
                {rabbi?.image_url ? (
                  <img src={rabbi.image_url} alt={rabbi.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                                  fontSize: "1.75rem", color: "white" }}>
                    {rabbi?.name ? rabbi.name.replace("הרב ", "")[0] : "?"}
                  </span>
                )}
              </div>
              {rabbi?.name && (
                <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
                              fontSize: "0.82rem", color: TEXT_DARK, lineHeight: 1.3 }}>
                  {rabbi.name}
                </div>
              )}
              {rabbi?.lesson_count !== undefined && (
                <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.7rem",
                              fontWeight: 600, color: OLIVE_MAIN }}>
                  {rabbi.lesson_count} שיעורים
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <button onClick={() => navigate("/rabbis")}
            style={{ padding: "0.75rem 2.2rem", borderRadius: "1rem",
                     border: `1.5px solid ${OLIVE_MAIN}`, background: "transparent",
                     color: OLIVE_MAIN, fontFamily: "Paamon, serif", fontWeight: 700,
                     fontSize: "0.9rem", cursor: "pointer" }}>
            כל הרבנים ←
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Slider arrows (משותף לסליידרים) ────────────────────────────────────────
function SliderArrows({ onPrev, onNext, accent }: { onPrev: () => void; onNext: () => void; accent: string }) {
  const enter = (e: any) => { e.currentTarget.style.background = accent; e.currentTarget.style.color = "white"; };
  const leave = (e: any) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = accent; };
  const base = { width: 38, height: 38, borderRadius: "50%", border: `1.5px solid ${accent}`, background: "transparent", color: accent, cursor: "pointer", fontSize: "1.05rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.18s ease" } as const;
  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <button aria-label="הקודם" onClick={onPrev} onMouseEnter={enter} onMouseLeave={leave} style={base}>→</button>
      <button aria-label="הבא" onClick={onNext} onMouseEnter={enter} onMouseLeave={leave} style={base}>←</button>
    </div>
  );
}

// ── SelectedLessonsSlider (יואב 13.7) — סליידר "שיעורים נבחרים" בשפת-האתר ────
// הוחזר לבקשת הרב יואב (הוסר 27.5). "נבחרים" = פורסמו לאחרונה; מיון-צפיות
// יופעל כשמעקב-הצפיות יצטבר — בלי מספרי-צפיות מומצאים.
// יואב 17.7: בלי חדשות-תנ"כיות (יש להן ארכיון משלהן), מקסימום 2 לכל סדרה כדי
// שהסליידר יגוון, ותווית פעולה לפי סוג התוכן (קרא/האזן/צפה) — לא "האזן" גורף.
const NEWS_SERIES_ID = "5d111b52-b421-4150-adfd-df256950117c";

function SelectedLessonsSlider() {
  const { data: lessonsRaw } = useQuery({
    queryKey: ["home-selected-lessons"],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, thumbnail_url, source_type, duration, series_id, rabbis!lessons_rabbi_id_fkey(name)")
        .eq("status", "published")
        .neq("series_id", NEWS_SERIES_ID)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data;
    },
  });
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  // גיוון: לא יותר מ-2 שיעורים מאותה סדרה
  const lessons = (() => {
    const perSeries: Record<string, number> = {};
    const out: any[] = [];
    for (const l of (lessonsRaw || []) as any[]) {
      const key = l.series_id || l.id;
      perSeries[key] = (perSeries[key] || 0) + 1;
      if (perSeries[key] <= 2) out.push(l);
      if (out.length >= 12) break;
    }
    return out;
  })();
  const LESSON_IMAGES = ["/images/lesson-audio.webp", "/images/lesson-video.webp", "/images/lesson-text.webp", "/images/series-middot.webp"];
  const getLessonImage = (lesson: any, index: number) => lesson?.thumbnail_url || LESSON_IMAGES[index % LESSON_IMAGES.length];
  const typeLabel = (t: string) => (t === "video" ? "וידאו" : t === "audio" ? "אודיו" : "טקסט");
  const actionLabel = (t: string) => (t === "video" ? "צפה" : t === "audio" ? "האזן" : "קרא");
  const nudge = (dir: number) => scroller.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  if (lessons.length === 0) return null;
  return (
    <section style={{ background: PARCHMENT, padding: "5rem 1.5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div dir="rtl" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "2.25rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.78rem", fontWeight: 700, color: GOLD_DARK, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>מה לומדים עכשיו</div>
            <h2 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900, fontSize: "clamp(1.5rem, 3vw, 2.1rem)", color: TEXT_DARK, margin: 0 }}>שיעורים נבחרים</h2>
          </div>
          <div dir="rtl" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <SliderArrows onPrev={() => nudge(1)} onNext={() => nudge(-1)} accent={GOLD_DARK} />
            <span onClick={() => navigate("/series")} style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.88rem", color: GOLD_DARK, cursor: "pointer", borderBottom: `1px solid ${GOLD_DARK}`, paddingBottom: "1px", whiteSpace: "nowrap" }}>הצג הכל ←</span>
          </div>
        </div>
        <div ref={scroller} className="scrollbar-hide" dir="rtl" style={{ display: "flex", gap: "1.35rem", overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: "0.4rem" }}>
          {lessons.map((lesson: any, i: number) => (
            <div key={lesson.id} onClick={() => navigate(`/lessons/${lesson.id}`)}
              style={{ scrollSnapAlign: "start", flex: "0 0 auto", width: 264, borderRadius: "1.25rem", overflow: "hidden", border: "1px solid rgba(139,111,71,0.1)", background: "white", cursor: "pointer", transition: "all 0.28s ease", boxShadow: "0 2px 12px rgba(45,31,14,0.05)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 48px rgba(45,31,14,0.12)"; (e.currentTarget as HTMLElement).style.borderColor = GOLD_DARK; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(45,31,14,0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,111,71,0.1)"; }}>
              <div style={{ height: 170, overflow: "hidden", position: "relative", background: PARCHMENT_DARK }}>
                <img src={getLessonImage(lesson, i)} alt={lesson?.title || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)" }} />
                <span style={{ position: "absolute", top: 10, right: 10, padding: "0.2rem 0.65rem", borderRadius: "0.5rem", background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`, color: "white", fontFamily: "Ploni, sans-serif", fontSize: "0.68rem", fontWeight: 700 }}>{typeLabel(lesson.source_type || "audio")}</span>
              </div>
              <div style={{ padding: "1rem 1.1rem 1.25rem" }}>
                {lesson?.rabbis?.name && (<div style={{ fontFamily: "Ploni, sans-serif", fontWeight: 700, fontSize: "0.72rem", color: GOLD_DARK, marginBottom: "0.3rem" }}>{lesson.rabbis.name}</div>)}
                <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700, fontSize: "0.9rem", color: TEXT_DARK, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "0.5rem", minHeight: "2.6em" }}>{lesson?.title ?? ""}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {lesson?.duration ? (<span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.72rem", color: TEXT_SUBTLE }}>{Math.floor(lesson.duration / 60)} דקות</span>) : <span />}
                  <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.72rem", color: GOLD_DARK, fontWeight: 600 }}>{actionLabel(lesson.source_type || "audio")} ←</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── RabbisSlider (יואב 13.7) — סליידר "הרבנים שלנו" בשפת-האתר ────────────────
function RabbisSlider() {
  const { data: rabbisRaw } = usePublicRabbis();
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  const rabbis = ((rabbisRaw || []) as any[]).slice(0, 16);
  const nudge = (dir: number) => scroller.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  if (rabbis.length === 0) return null;
  return (
    <section style={{ background: OLIVE_BG, padding: "5rem 1.5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div dir="rtl" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "2.25rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.78rem", fontWeight: 700, color: OLIVE_MAIN, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>המורים שלנו</div>
            <h2 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900, fontSize: "clamp(1.5rem, 3vw, 2.1rem)", color: TEXT_DARK, margin: 0 }}>הרבנים שלנו</h2>
          </div>
          <div dir="rtl" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <SliderArrows onPrev={() => nudge(1)} onNext={() => nudge(-1)} accent={OLIVE_MAIN} />
            <span onClick={() => navigate("/rabbis")} style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.88rem", color: OLIVE_MAIN, cursor: "pointer", borderBottom: `1px solid ${OLIVE_MAIN}`, paddingBottom: "1px", whiteSpace: "nowrap" }}>כל הרבנים ←</span>
          </div>
        </div>
        <div ref={scroller} className="scrollbar-hide" dir="rtl" style={{ display: "flex", gap: "1.5rem", overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: "0.5rem" }}>
          {rabbis.map((rabbi: any) => (
            <div key={rabbi.id} onClick={() => navigate(`/rabbis/${rabbi.slug ?? rabbi.id}`)}
              style={{ scrollSnapAlign: "start", flex: "0 0 auto", width: 150, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "0.65rem", cursor: "pointer", padding: "1.35rem 0.75rem", borderRadius: "1.25rem", background: "white", border: "1px solid rgba(139,111,71,0.1)", boxShadow: "0 2px 12px rgba(45,31,14,0.05)", transition: "all 0.25s ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 14px 40px rgba(74,90,46,0.18)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(45,31,14,0.05)"; }}>
              <div style={{ width: 92, height: 92, borderRadius: "50%", overflow: "hidden", border: "2.5px solid rgba(139,111,71,0.2)", background: rabbi?.image_url ? "transparent" : `linear-gradient(135deg, ${GOLD_DARK}, ${OLIVE_MAIN})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {rabbi?.image_url ? (<img src={rabbi.image_url} alt={rabbi.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : (<span style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900, fontSize: "1.75rem", color: "white" }}>{rabbi?.name ? rabbi.name.replace("הרב ", "")[0] : "?"}</span>)}
              </div>
              <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700, fontSize: "0.85rem", color: TEXT_DARK, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{rabbi.name}</div>
              {rabbi?.lesson_count !== undefined && (<div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.7rem", fontWeight: 600, color: OLIVE_MAIN }}>{rabbi.lesson_count} שיעורים</div>)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── NewsletterSection ──────────────────────────────────────────────────────
// redesign 2026-05-27: side-by-side inputs + checkbox consent + new copy
// 12.7.2026 (סער): נוסף כפתור הצטרפות לקבוצת הוואטסאפ לצד ההרשמה — באותו סגנון
// כמו בעמוד תנ״ך למשפחה. היעד: קבוצה 8 של "בכוח התנ״ך ננצח" (אותו קישור
// כמו COMMUNITY_WA_LINK ב-FamilyTanach.tsx).
const NEWSLETTER_WA_LINK = "https://chat.whatsapp.com/GVy0Gg0PCXBKouJmWVm8wY";

function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrMsg("רגע, צריך כתובת מייל אמיתית");
      return;
    }
    if (!agreed) {
      setErrMsg("יש לאשר את תנאי השימוש לפני הצטרפות");
      return;
    }
    setStatus("submitting");
    setErrMsg("");
    try {
      const { error } = await supabase
        .from("newsletter_subscribers" as any)
        .insert({
          email: email.trim().toLowerCase(),
          first_name: firstName.trim() || null,
          consent_at: new Date().toISOString(),
          source: "homepage",
          agreed_to_terms: true,
        });
      if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrMsg(err.message || "משהו השתבש. נסה שוב בעוד רגע.");
    }
  }

  return (
    <section
      dir="rtl"
      style={{
        background: `linear-gradient(135deg, ${PARCHMENT} 0%, ${PARCHMENT_DARK} 100%)`,
        padding: "5rem 1.5rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative dots */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle, ${GOLD_LIGHT}22 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          opacity: 0.4,
          pointerEvents: "none",
        }}
      />

      <style>{`
        @media (max-width: 600px) {
          .newsletter-inputs-row { flex-direction: column !important; }
        }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto", position: "relative", zIndex: 1, textAlign: "center" }}>
        {/* Eyebrow */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.3rem 0.9rem",
            borderRadius: "2rem",
            background: `${GOLD_DARK}15`,
            border: `1px solid ${GOLD_DARK}35`,
            marginBottom: "1.25rem",
          }}
        >
          <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.78rem", fontWeight: 700, color: GOLD_DARK, letterSpacing: "0.05em" }}>
            ספר הספרים
          </span>
        </div>

        {/* H2 */}
        <h2
          style={{
            fontFamily: "Kedem, Frank Ruhl Libre, serif",
            fontWeight: 900,
            fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
            color: TEXT_DARK,
            margin: "0 0 0.75rem",
            lineHeight: 1.2,
          }}
        >
          רוצים <span style={{ background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>מסרים מרוממים</span> מספר הספרים?
        </h2>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "Ploni, sans-serif",
            fontSize: "1.05rem",
            color: `${TEXT_DARK}cc`,
            lineHeight: 1.65,
            maxWidth: 540,
            margin: "0 auto 2rem",
          }}
        >
          הצטרפו לתפוצה — מנת תנ"ך שבועית, ישר למייל.
        </p>

        {status === "success" ? (
          <div
            style={{
              padding: "1.5rem 1.25rem",
              background: "white",
              borderRadius: "1rem",
              border: `2px solid ${GOLD_LIGHT}`,
              boxShadow: "0 4px 24px rgba(196,162,101,0.18)",
            }}
          >
            <div style={{ fontFamily: "Kedem, serif", fontSize: "1.35rem", fontWeight: 800, color: GOLD_DARK, marginBottom: "0.4rem" }}>
              נרשמת. ברוך תהיה!
            </div>
            <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.95rem", color: `${TEXT_DARK}aa`, lineHeight: 1.5 }}>
              שלחנו לך מייל אישור — רק תאשר ונתחיל לדבר אחת לשבוע.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 520, margin: "0 auto" }}>
            {/* Side-by-side inputs row */}
            <div
              className="newsletter-inputs-row"
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "1rem",
              }}
            >
              <input
                type="text"
                placeholder="שם פרטי (לא חובה)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{
                  flex: 1,
                  padding: "0.95rem 1.1rem",
                  borderRadius: "0.85rem",
                  border: `1.5px solid ${GOLD_DARK}33`,
                  background: "white",
                  fontFamily: "Ploni, sans-serif",
                  fontSize: "1rem",
                  color: TEXT_DARK,
                  outline: "none",
                  transition: "border-color 0.2s",
                  textAlign: "right",
                  boxSizing: "border-box",
                  minWidth: 0,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = GOLD_DARK)}
                onBlur={(e) => (e.currentTarget.style.borderColor = `${GOLD_DARK}33`)}
              />
              <input
                type="email"
                placeholder="כתובת המייל שלך"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  padding: "0.95rem 1.1rem",
                  borderRadius: "0.85rem",
                  border: `1.5px solid ${GOLD_DARK}33`,
                  background: "white",
                  fontFamily: "Ploni, sans-serif",
                  fontSize: "1rem",
                  color: TEXT_DARK,
                  outline: "none",
                  transition: "border-color 0.2s",
                  textAlign: "right",
                  boxSizing: "border-box",
                  minWidth: 0,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = GOLD_DARK)}
                onBlur={(e) => (e.currentTarget.style.borderColor = `${GOLD_DARK}33`)}
              />
            </div>

            {/* Terms checkbox — הערת סוקר 2.8: הקובייה לא הייתה סימטרית לכיוון;
                עכשיו השורה ממורכזת וב-RTL מפורש כך שהקובייה צמודה מימין לטקסט */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                direction: "rtl",
                gap: "0.6rem",
                cursor: "pointer",
                textAlign: "right",
              }}
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{
                  width: 18,
                  height: 18,
                  accentColor: GOLD_DARK,
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              />
              <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.82rem", color: TEXT_MUTED, lineHeight: 1.55 }}>
                קראתי ואני מסכים ל
                <a href="/terms" target="_blank" rel="noopener noreferrer"
                  style={{ color: GOLD_DARK, textDecoration: "underline", textUnderlineOffset: "2px" }}>
                  תנאי השימוש
                </a>
              </span>
            </label>

            {errMsg && (
              <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.85rem", color: "#a52727", textAlign: "right" }}>
                {errMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              style={{
                padding: "1rem 1.5rem",
                borderRadius: "0.85rem",
                border: "none",
                background: status === "submitting" ? `${GOLD_DARK}88` : `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
                color: "white",
                fontFamily: "Paamon, serif",
                fontWeight: 700,
                fontSize: "1.05rem",
                cursor: status === "submitting" ? "wait" : "pointer",
                boxShadow: "0 6px 24px rgba(139,111,71,0.35)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                if (status !== "submitting") {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(139,111,71,0.45)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 6px 24px rgba(139,111,71,0.35)";
              }}
            >
              {status === "submitting" ? "רגע אחד..." : "הצטרף"}
            </button>

            <div
              style={{
                fontFamily: "Ploni, sans-serif",
                fontSize: "0.78rem",
                color: `${TEXT_DARK}88`,
                lineHeight: 1.5,
                marginTop: "0.25rem",
                textAlign: "center",
              }}
            >
              אפשר לבטל מנוי בכל מייל.
            </div>
          </form>
        )}

        {/* הצטרפות לקבוצת הוואטסאפ — לצד הדיוור, כמו בעמוד תנ"ך למשפחה (הערת סער 12.7) */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", maxWidth: 520, margin: "1.5rem auto 0" }}>
          <div aria-hidden style={{ flex: 1, height: 1, background: `${GOLD_DARK}30` }} />
          <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.85rem", color: TEXT_MUTED }}>או</span>
          <div aria-hidden style={{ flex: 1, height: 1, background: `${GOLD_DARK}30` }} />
        </div>
        <a
          href={NEWSLETTER_WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            marginTop: "1rem",
            padding: "0.9rem 1.6rem",
            borderRadius: "0.85rem",
            border: "1.5px solid #25D36655",
            background: "linear-gradient(135deg, #128C7E, #25D366)",
            color: "white",
            fontFamily: "Ploni, sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            textDecoration: "none",
            boxShadow: "0 6px 24px rgba(18,140,126,0.3)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(18,140,126,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 6px 24px rgba(18,140,126,0.3)";
          }}
        >
          <span aria-hidden style={{ fontSize: "1.15rem" }}>💬</span>
          מצטרפים לקבוצת הוואטסאפ "בכוח התנ"ך ננצח"
        </a>
      </div>
    </section>
  );
}

// ── AskRabbiStrip ──────────────────────────────────────────────────────────
// רמה 20 (הרב יואב 16.7 15:01): "שאל את הרב לא דחוף לי... אפשר לשים אותו כרגע
// בדף הבית, ולא בנדל"ן היקר של הסיידבר" — רצועה צרה במקום הכפתור שהוסר.
function AskRabbiStrip() {
  const navigate = useNavigate();
  return (
    <section dir="rtl" style={{ background: "white", padding: "2.25rem 1.5rem",
      borderTop: "1px solid rgba(139,111,71,0.1)", borderBottom: "1px solid rgba(139,111,71,0.1)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center",
        justifyContent: "center", gap: "1.25rem", flexWrap: "wrap", textAlign: "center" }}>
        <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
          fontSize: "1.15rem", color: TEXT_DARK }}>
          יש לכם שאלה בתנ״ך?
        </div>
        <button onClick={() => navigate("/ask-rabbi")}
          style={{ padding: "0.6rem 1.6rem", borderRadius: "0.85rem",
            border: `1.5px solid rgba(139,111,71,0.35)`, background: "transparent",
            color: GOLD_DARK, fontFamily: "Paamon, serif", fontWeight: 700,
            fontSize: "0.95rem", cursor: "pointer", transition: "all 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(196,162,101,0.1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
          שאל את הרב ←
        </button>
      </div>
    </section>
  );
}

// ── WhatsAppCTASection ─────────────────────────────────────────────────────
function WhatsAppCTASection() {
  return (
    <section style={{ background: PARCHMENT_DARK, padding: "4.5rem 1.5rem" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div dir="rtl"
          style={{ borderRadius: "2rem", padding: "3.5rem 2.5rem", textAlign: "center",
                   position: "relative", overflow: "hidden",
                   background: `linear-gradient(135deg, ${OLIVE_DARK} 0%, ${OLIVE_MAIN} 60%, #4A5A2E 100%)`,
                   boxShadow: "0 20px 70px rgba(74,90,46,0.28)" }}>
          <div style={{ position: "absolute", inset: 0,
                        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
                        backgroundSize: "22px 22px", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            {/* WA icon */}
            <div style={{ width: 56, height: 56, borderRadius: "50%",
                          background: "rgba(255,255,255,0.1)", display: "flex",
                          alignItems: "center", justifyContent: "center",
                          margin: "0 auto 1.5rem", fontSize: "1.75rem" }}>
              💬
            </div>
            <h2 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                          fontSize: "clamp(1.4rem, 3vw, 1.9rem)", color: "white", marginBottom: "0.65rem" }}>
              הצטרפו לקהילת הוואטסאפ
            </h2>
            <p style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.95rem",
                        color: "rgba(255,255,255,0.65)", marginBottom: "2rem",
                        maxWidth: 380, margin: "0 auto 2rem" }}>
              שיעורים יומיים, חידושי תורה ועדכונים ישירות לנייד שלכם
            </p>
            <button
              style={{ padding: "0.9rem 2.8rem", borderRadius: "1.1rem", border: "none",
                       background: "white", color: OLIVE_DARK, fontFamily: "Paamon, serif",
                       fontWeight: 700, fontSize: "1.05rem", cursor: "pointer",
                       boxShadow: "0 6px 24px rgba(0,0,0,0.15)", marginBottom: "2.5rem" }}>
              הצטרפו עכשיו
            </button>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)",
                          paddingTop: "1.5rem", marginTop: "0.5rem" }}>
              <blockquote style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 400,
                                   fontSize: "0.95rem", color: "rgba(255,255,255,0.5)",
                                   fontStyle: "italic", margin: 0 }}>
                "הִנֵּה לֹא יָנוּם וְלֹא יִישָׁן שׁוֹמֵר יִשְׂרָאֵל"
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── LegacyDesignFooter ─────────────────────────────────────────────────────
// Kept for reference — no longer rendered. Replaced by DesignFooter from layout-v2.
function LegacyDesignFooter() {
  const navigate = useNavigate();

  const cols = [
    { title: "תוכן",  links: [
      { label: "שיעורים",    path: "/series"   },
      { label: "סדרות",      path: "/series"   },
      { label: "רבנים",      path: "/rabbis"   },
      { label: "פרשת שבוע", path: "/parasha"  },
    ]},
    { title: "אודות", links: [
      { label: "אודותינו",   path: "/about"    },
      { label: "המשימה שלנו",path: "/about"    },
      { label: "כנס",        path: "/kenes"    },
      { label: "דור הפלאות", path: "/dor-haplaot" },
    ]},
    { title: "צור קשר", links: [
      { label: "צור קשר",   path: "/contact"  },
      { label: "תמיכה",     path: "/contact"  },
      { label: "קהילה",     path: "/community"},
    ]},
  ];

  return (
    <footer dir="rtl" style={{ background: `linear-gradient(180deg, ${TEXT_DARK}, #1A1208)`,
                                padding: "4rem 1.5rem 2rem", color: "white" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto",
                    display: "grid", gridTemplateColumns: "1.5fr repeat(3, 1fr)",
                    gap: "3rem", marginBottom: "3rem" }}>
        {/* Brand column */}
        <div>
          <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                        fontSize: "1.6rem",
                        background: `linear-gradient(135deg, ${GOLD_SHIMMER}, ${GOLD_LIGHT})`,
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        marginBottom: "0.75rem" }}>
            בני ציון
          </div>
          <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.82rem",
                        color: "rgba(255,255,255,0.4)", lineHeight: 1.8, marginBottom: "1.5rem",
                        maxWidth: 220 }}>
            אתר התנ״ך הגדול בישראל — 11,000+ שיעורים מ-200+ רבנים, בגישה חינמית מלאה.
          </div>
          <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.75rem",
                        color: "rgba(255,255,255,0.25)", lineHeight: 1.7 }}>
            לעילוי נשמת<br />כל נשמות ישראל
          </div>
        </div>

        {/* Link columns */}
        {cols.map(({ title, links }) => (
          <div key={title}>
            <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
                          color: GOLD_LIGHT, marginBottom: "1rem", fontSize: "0.88rem" }}>
              {title}
            </div>
            {links.map(({ label, path }) => (
              <div key={label} onClick={() => navigate(path)}
                style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.83rem",
                         color: "rgba(255,255,255,0.38)", marginBottom: "0.55rem",
                         cursor: "pointer", transition: "color 0.15s" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.38)")}
              >
                {label}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    paddingTop: "1.5rem", textAlign: "center",
                    fontFamily: "Ploni, sans-serif", fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.2)" }}>
        © {new Date().getFullYear()} בני ציון — כל הזכויות שמורות
      </div>
    </footer>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
//
// Layout strategy (Saar, 30.4.2026):
//   Hero = full-width, no sidebar beside it.
//   Everything below Hero starts at #learn-start with inline sidebar on the right (RTL).
//   Mobile: sidebar is a drawer triggered from DesignHeader burger.
//   Desktop: sidebar is sticky inline column (290px) beside the content.
//
export default function DesignPreviewHome() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useSEO({
    description: "פורטל מרכזי ללימוד תנ״ך – שיעורים, סדרות, רבנים ועוד. למעלה מ-11,000 שיעורים חינמיים בספרי נביאים, כתובים, תורה ומועדים.",
    url: "https://bneyzion.co.il/",
  });

  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", minHeight: "100vh",
                             background: PARCHMENT, fontFamily: "Ploni, sans-serif" }}>
      {/* רמה 27 (יואב 16:31): רצועת "האתר בהרצה" — בדף הבית מעל ההדר, כי ההירו
          חופף להדר (marginTop:-96) ורצועה ביניהם הייתה נבלעת בו. */}
      <TrialStrip />

      {/* פס הקמפיין (25.8) — מעל ההדר, מתחת לרצועת ההרצה */}
      <CampaignBanner />

      {/* Global header — transparent over hero, burger opens drawer sidebar.
          10.7 (סער): ההירו בהיר (וידאו-אקוורל) → שורת ההדר בטקסט כהה, לא לבן */}
      <DesignHeader
        transparentOnTop={true}
        transparentDarkText={true}
        onSidebarToggle={() => setDrawerOpen((v) => !v)}
      />

      {/* Hero — full-width (comes right after header, overlaps it with marginTop:-96) */}
      <DesignHero />

      {/* Stats bar — full-width, no sidebar */}
      <StatsBar />

      {/* סקשן הקמפיין (26.8ב) — הפניה משמעותית לקמפיין המדוגל */}
      <HomeCampaignStrip />

      {/* 8.7 (סער): באנר-תמונה — אחרי שורת המספרים ולפני התוכן */}
      <ImageBannerSlot placement="home" />

      {/*
        #learn-start anchor — CTA button in Hero scrolls here.
        From this point down, the sidebar appears on the right (RTL = inline-start).
        Desktop: sidebar is sticky inline. Mobile: sidebar is the drawer.
      */}
      <div id="learn-start" style={{ display: "flex", flex: 1, alignItems: "flex-start" }}>
        {/* Sidebar — inline on desktop, drawer on mobile */}
        <DesignSidebar
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
        />

        {/* Main content area */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* 27.5.2026 — KenesBanner removed (outdated 19.4 event) */}
          <FamilyBibleSection />
          <DesignParashaHolidaySection />
          {/* יואב 13.7: סליידר שיעורים נבחרים — הוחזר בשפת-האתר (הוסר 27.5) */}
          <SelectedLessonsSlider />
          {/* רמה 26ד (יואב 22.7 13:25): סליידרים שיואב יוצר לבד ב-/admin/sliders */}
          <div style={{ padding: "0 1.5rem", maxWidth: 1200, margin: "0 auto" }}>
            <CustomSlidersSlot placement="home" />
          </div>
          <WarMiraclesSection />
          {/* יואב 13.7: סליידר רבנים — הוחזר בשפת-האתר (הוסר 27.5; TopSeries+WhatsAppCTA נשארו בחוץ) */}
          <RabbisSlider />
          {/* רמה 20 (יואב 16.7 15:01): "שאל את הרב" עבר מהסיידבר לדף הבית */}
          <AskRabbiStrip />
          <NewsletterSection />
        </main>
      </div>

      <DesignFooter />
      {/* 7.7.2026 (הרב יואב): 'ניווט' בשורה התחתונה פותח את סיידבר-הניווט במובייל */}
      <DesignMobileBottomNav onNavigatorOpen={() => setDrawerOpen(true)} />

      {/* 8.7.2026: פופאפים + לשונית נגישות גם בדף הבית (היו רק ב-Layout הישן) */}
      <PromoProvider />
      <AccessibilityWidget />

      {/* Mobile responsive fixes for Home page sections */}
      <style>{`
        @media (max-width: 767px) {
          .parasha-holiday-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
          .top-series-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
