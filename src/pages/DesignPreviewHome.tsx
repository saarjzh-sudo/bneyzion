import { useState, useEffect, useMemo } from "react";
import { useSEO } from "@/hooks/useSEO";
import { useNavigate } from "react-router-dom";
import { useLessons } from "@/hooks/useLessons";
import { useSeries } from "@/hooks/useSeries";
import { usePublicRabbis } from "@/hooks/useRabbis";
import { useParasha } from "@/hooks/useParasha";
import { getParashaVerse } from "@/lib/parashaCalendar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize";
import { useAuth } from "@/contexts/AuthContext";
import logoColor from "@/assets/logo-horizontal-color.png";
import logoBright from "@/assets/logo-horizontal-bright.png";

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
const FULL_NAV_LINKS: { label: string; path: string }[] = [
  { label: "ראשי",           path: "/"                 },
  { label: "פרשת השבוע",     path: "/parasha"          },
  { label: "אודותינו",       path: "/about"            },
  { label: "לזכר סעדיה הי״ד", path: "/memorial/saadia" },
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
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 1.5rem", height: 96,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    position: "relative" }}>
        {/* Logo — RIGHT side (start in RTL) */}
        <div onClick={() => navigate("/")} style={{ cursor: "pointer", flexShrink: 0 }}>
          <img
            src={scrolled ? logoColor : logoBright}
            alt="בני ציון"
            style={{ height: 64, width: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Nav links — absolutely centered to viewport */}
        <div className="hidden md:flex" style={{ position: "absolute", left: "50%",
                    top: "50%", transform: "translate(-50%, -50%)",
                    gap: "1.75rem", alignItems: "center" }}>
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

        {/* Buttons + search — LEFT side (end in RTL) */}
        <div style={{ display: "flex", gap: "0.65rem", alignItems: "center", flexShrink: 0 }}>
          {/* Search icon */}
          <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex",
                        alignItems: "center", justifyContent: "center", cursor: "pointer",
                        color: scrolled ? TEXT_MUTED : "rgba(255,255,255,0.75)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

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
                  <button onClick={() => { setMenuOpen(false); navigate("/profile"); }}
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

  return (
    <div style={{ height: "56vh", minHeight: 420, maxHeight: 520, overflow: "hidden",
                  position: "relative", marginTop: -96 }}>
      {/* Video */}
      <video autoPlay muted loop playsInline src="/video/hero-bg.mp4"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
                 objectFit: "cover", objectPosition: "center 40%",
                 filter: "brightness(0.72) contrast(1.08) saturate(1.1)", transform: "scale(1.04)" }} />

      {/* Overlays */}
      <div style={{ position: "absolute", inset: 0,
                    background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.55) 100%)" }} />
      <div style={{ position: "absolute", inset: 0,
                    background: "radial-gradient(ellipse at 50% 45%, transparent 20%, rgba(0,0,0,0.38) 100%)" }} />

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
                   fontSize: "clamp(2rem, 4.5vw, 3.2rem)", color: "rgba(255,255,255,0.92)",
                   textShadow: "0 2px 16px rgba(0,0,0,0.45)", margin: "0 0 0.5rem",
                   lineHeight: 1.3, fontStyle: "italic" }}>
          אתר התנ״ך של ישראל
        </h1>

        {/* CTAs */}
        <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => navigate("/series")}
            style={{ padding: "0.75rem 1.8rem", borderRadius: "1rem", border: "none",
                     background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
                     color: "white", fontFamily: "Paamon, serif", fontWeight: 700,
                     fontSize: "1rem", cursor: "pointer",
                     boxShadow: "0 4px 24px rgba(139,111,71,0.4)" }}>
            התחילו ללמוד
          </button>
          <button onClick={() => navigate("/series")}
            style={{ padding: "0.75rem 1.8rem", borderRadius: "1rem",
                     border: "1.5px solid rgba(255,255,255,0.35)",
                     background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
                     color: "white", fontFamily: "Paamon, serif", fontSize: "0.95rem",
                     fontWeight: 700, cursor: "pointer" }}>
            גלה את הסדרות
          </button>
        </div>

      </div>
    </div>
  );
}

// ── StatsBar ───────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { num: "+11,000", label: "שיעורים ומאמרים" },
    { num: "+200",    label: "רבנים ומרצים"     },
    { num: "+1,300",  label: "סדרות לימוד"      },
  ];
  return (
    <div dir="rtl" style={{ background: TEXT_DARK, padding: "1.25rem 1.5rem" }}>
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
    </div>
  );
}

// ── KenesBanner ────────────────────────────────────────────────────────────
function KenesBanner() {
  const navigate = useNavigate();

  const speakers = [
    "הרב חגי לונדין", "הרב חנאל אתרוג", "הרב יהושע שפירא",
    "הרב דני לביא", "הרב יואב אוריאל", "הרב אליעזר קשתיאל", "הרב שמואל אליהו",
  ];

  return (
    <section style={{ background: PARCHMENT, padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div dir="rtl"
          onClick={() => navigate("/kenes")}
          style={{
            borderRadius: "1.75rem", overflow: "hidden", position: "relative",
            display: "flex", alignItems: "center", gap: "2.5rem",
            padding: "2.5rem", cursor: "pointer",
            background: "linear-gradient(135deg, #1a2744 0%, #2d3d5c 100%)",
            boxShadow: "0 8px 48px rgba(26,39,68,0.25)",
            transition: "transform 0.3s ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.005)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          {/* Background texture */}
          <div style={{ position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(196,162,101,0.05) 1px, transparent 1px)",
            backgroundSize: "24px 24px", pointerEvents: "none" }} />

          {/* Poster image */}
          <div style={{ width: 200, flexShrink: 0, borderRadius: "1rem", overflow: "hidden",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
                        border: "2px solid rgba(196,162,101,0.25)", position: "relative", zIndex: 1 }}>
            <img src="/images/kenes-yom-haatzmaut.png" alt="כנס מעצמה תנ״כית"
              style={{ width: "100%", height: "auto", display: "block" }} />
          </div>

          {/* Content */}
          <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
            {/* Date badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem",
                          padding: "0.25rem 0.85rem", borderRadius: "2rem",
                          background: "rgba(196,162,101,0.15)", border: `1px solid rgba(196,162,101,0.35)`,
                          marginBottom: "1rem" }}>
              <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.75rem",
                             fontWeight: 700, color: GOLD_LIGHT, letterSpacing: "0.06em" }}>
                יום ראשון 19.4 • ב׳ אייר תשפ״ו • 20:00 • ללא עלות
              </span>
            </div>

            <h3 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                          fontSize: "clamp(1.4rem, 2.5vw, 2rem)", color: "white",
                          margin: "0 0 0.3rem", lineHeight: 1.2 }}>
              מעצמה תנ״כית
            </h3>
            <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.9rem",
                          color: "rgba(255,255,255,0.6)", marginBottom: "1.25rem" }}>
              כנס העצמאות והגאולה של בני ציון
            </div>

            <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.78rem",
                          color: "rgba(255,255,255,0.42)", lineHeight: 1.9, marginBottom: "1.5rem" }}>
              {speakers.join(" • ")}
            </div>

            <button
              style={{ padding: "0.75rem 2rem", borderRadius: "0.9rem", border: "none",
                       background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
                       color: "white", fontFamily: "Paamon, serif", fontWeight: 700,
                       fontSize: "0.95rem", cursor: "pointer",
                       boxShadow: "0 4px 20px rgba(139,111,71,0.4)" }}>
              לפרטים והרשמה ←
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── DesignParashaHolidaySection ────────────────────────────────────────────
const HOLIDAYS_5786 = [
  { name: "פורים",         hebrewDate: "י״ד אדר",  date: new Date(2026, 2, 3),  terms: ["פורים","אסתר"] },
  { name: "פסח",           hebrewDate: "ט״ו ניסן", date: new Date(2026, 3, 2),  terms: ["פסח","הגדה"] },
  { name: "יום העצמאות",   hebrewDate: "ה׳ אייר",  date: new Date(2026, 3, 22), terms: ["יום העצמאות","עצמאות"] },
  { name: "ל״ג בעומר",     hebrewDate: "י״ח אייר", date: new Date(2026, 4, 5),  terms: ["ל\"ג בעומר"] },
  { name: "שבועות",        hebrewDate: "ו׳ סיוון", date: new Date(2026, 4, 22), terms: ["שבועות","רות"] },
  { name: "תשעה באב",      hebrewDate: "ט׳ באב",   date: new Date(2026, 6, 23), terms: ["תשעה באב","איכה"] },
  { name: "ראש השנה",      hebrewDate: "א׳ תשרי",  date: new Date(2026, 8, 12), terms: ["ראש השנה"] },
  { name: "יום כיפור",     hebrewDate: "י׳ תשרי",  date: new Date(2026, 8, 21), terms: ["יום כיפור","כיפור"] },
  { name: "סוכות",         hebrewDate: "ט״ו תשרי", date: new Date(2026, 8, 26), terms: ["סוכות"] },
  { name: "חנוכה",         hebrewDate: "כ״ה כסלו", date: new Date(2026, 11, 5), terms: ["חנוכה"] },
];

const YOMHAATZMAOUT = "יום העצמאות";
const ISRAEL_BLUE   = "#003F8A";

function DesignParashaHolidaySection() {
  const { parasha, chumash, articleSeries } = useParasha();
  const verse = getParashaVerse(parasha);
  const navigate = useNavigate();

  const holiday = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 45 * 864e5);
    return HOLIDAYS_5786.find(h => h.date >= now && h.date <= cutoff) ?? null;
  }, []);

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
          .from("series").select("id, title, lesson_count, rabbis(name)")
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

  // Fetch first lesson content for holiday preview
  const firstHolidaySeries = holidaySeries[0];
  const { data: holidayLessonPreview } = useQuery({
    queryKey: ["holiday-lesson-preview", firstHolidaySeries?.id],
    enabled: !!firstHolidaySeries,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      if (!firstHolidaySeries) return null;
      const { data } = await supabase
        .from("lessons")
        .select("id, title, content, rabbis(name)")
        .eq("series_id", firstHolidaySeries.id)
        .eq("status", "published")
        .order("order_index")
        .limit(1)
        .single();
      return data;
    },
  });

  return (
    <section dir="rtl" style={{
      background: isYomHaatzmaout
        ? `linear-gradient(160deg, #0d1f3d 0%, #142d5c 45%, #0d1f3d 100%)`
        : `linear-gradient(160deg, #2C3A1E 0%, #3A4D28 45%, #2C3A1E 100%)`,
      padding: "5.5rem 1.5rem", position: "relative", overflow: "hidden",
    }}>
      {/* Israeli flag top band for Yom Haatzmaout */}
      {isYomHaatzmaout && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, display: "flex" }}>
          <div style={{ flex: 1, background: ISRAEL_BLUE }} />
          <div style={{ flex: 1, background: "white" }} />
          <div style={{ flex: 1, background: ISRAEL_BLUE }} />
        </div>
      )}

      {/* Grain texture */}
      <svg style={{ position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none" }} width="100%" height="100%">
        <filter id="g3"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#g3)" />
      </svg>
      {/* Subtle dot pattern */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(232,213,160,0.07) 1px, transparent 1px)",
        backgroundSize: "30px 30px" }} />

      <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: holiday && holidaySeries.length > 0 ? "1fr 1fr" : "1fr",
                      gap: "4rem", alignItems: "start" }}>

          {/* ── RIGHT (first in RTL): Holiday ── */}
          {holiday && holidaySeries.length > 0 && (
            <div>
              {/* Flag image header for Yom Haatzmaout */}
              {isYomHaatzmaout && (
                <div style={{ marginBottom: "1.5rem", borderRadius: "1rem", overflow: "hidden",
                  border: "2px solid rgba(0,63,138,0.3)", position: "relative", height: 140 }}>
                  <img src="/images/yom-haatzmaut-hero.png"
                    alt="יום העצמאות"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0,
                    background: "linear-gradient(to top, rgba(13,31,61,0.6) 0%, transparent 50%)" }} />
                </div>
              )}

              {/* Header */}
              <div style={{ marginBottom: "2rem" }}>
                <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.75rem", fontWeight: 700,
                  letterSpacing: "0.2em", color: holidayAccentLight,
                  textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  החג הקרוב
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
                  <h2 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                    fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: "white", margin: 0,
                    lineHeight: 1.15 }}>
                    {isYomHaatzmaout ? "🇮🇱 " : ""}{holiday.name}
                  </h2>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem",
                    padding: "0.2rem 0.65rem", borderRadius: "2rem",
                    background: isYomHaatzmaout ? "rgba(0,63,138,0.25)" : "rgba(196,162,101,0.15)",
                    border: `1px solid ${isYomHaatzmaout ? "rgba(0,63,138,0.6)" : "rgba(196,162,101,0.4)"}` }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e",
                      boxShadow: "0 0 6px #22c55e" }} />
                    <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.7rem",
                      fontWeight: 700, color: holidayAccentLight }}>
                      עוד {daysUntil} ימים
                    </span>
                  </div>
                </div>
                <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.82rem",
                  color: "rgba(255,255,255,0.45)", marginTop: "0.25rem" }}>
                  {holiday.hebrewDate} • שיעורים והכנה לחג
                </div>
              </div>

              {/* Holiday lesson preview */}
              {holidayLessonPreview && (
                <div
                  onClick={() => navigate(`/lessons/${holidayLessonPreview.id}`)}
                  style={{ background: "rgba(255,255,255,0.06)", borderRadius: "1.1rem",
                    border: `1px solid ${isYomHaatzmaout ? "rgba(0,63,138,0.2)" : "rgba(232,213,160,0.12)"}`,
                    padding: "1.25rem 1.5rem", marginBottom: "1.75rem", cursor: "pointer",
                    transition: "all 0.2s" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                  }}
                >
                  <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
                    fontSize: "0.95rem", color: isYomHaatzmaout ? "#6ba3e8" : GOLD_SHIMMER,
                    marginBottom: "0.4rem" }}>
                    {holidayLessonPreview.title}
                  </div>
                  {(holidayLessonPreview.rabbis as any)?.name && (
                    <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.82rem",
                      color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem" }}>
                      מאת {(holidayLessonPreview.rabbis as any).name}
                    </div>
                  )}
                  <div
                    className="line-clamp-3"
                    style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.85rem",
                      color: "rgba(255,255,255,0.65)", lineHeight: 1.7,
                      display: "-webkit-box", WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(
                      holidayLessonPreview.content?.replace(/<[^>]+>/g, " ").slice(0, 200) ?? ""
                    ) }}
                  />
                  <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.78rem",
                    color: holidayAccentLight, fontWeight: 600, marginTop: "0.5rem", display: "inline-block" }}>
                    לשיעור המלא ←
                  </span>
                </div>
              )}

              {/* Single CTA — all holiday lessons */}
              <button onClick={() => navigate("/series")}
                style={{ padding: "0.8rem 2rem", borderRadius: "0.9rem",
                  border: "none",
                  background: isYomHaatzmaout
                    ? `linear-gradient(135deg, ${ISRAEL_BLUE}, #1a5fb4)`
                    : `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
                  color: "white", fontFamily: "Paamon, serif", fontWeight: 700,
                  fontSize: "0.95rem", cursor: "pointer",
                  boxShadow: isYomHaatzmaout ? "0 4px 20px rgba(0,63,138,0.35)" : "0 4px 20px rgba(139,111,71,0.35)" }}>
                כל שיעורי {holiday.name} ←
              </button>
            </div>
          )}

          {/* ── LEFT (second in RTL): Parasha ── */}
          <div>
            {/* Header */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.75rem", fontWeight: 700,
                letterSpacing: "0.2em", color: GOLD_LIGHT, textTransform: "uppercase",
                marginBottom: "0.5rem" }}>
                הדף לשולחן שבת
              </div>
              <h2 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: "white", margin: "0 0 0.25rem",
                lineHeight: 1.15 }}>
                פרשת {parasha || "..."}
              </h2>
              {chumash && (
                <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.82rem",
                  color: "rgba(255,255,255,0.45)" }}>חומש {chumash}</div>
              )}
            </div>

            {/* Verse blockquote */}
            {verse && (
              <div style={{ borderRight: `3px solid ${GOLD_LIGHT}`, paddingRight: "1.25rem",
                marginBottom: "1.75rem" }}>
                <blockquote style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 400,
                  fontSize: "1.05rem", fontStyle: "italic", color: "rgba(255,255,255,0.85)",
                  margin: 0, lineHeight: 1.7 }}>
                  ״{verse.text}״
                </blockquote>
                <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.72rem",
                  color: "rgba(255,255,255,0.35)", marginTop: "0.4rem" }}>
                  [{verse.reference}]
                </div>
              </div>
            )}

            {/* Article preview */}
            {firstArticle && (
              <div
                onClick={() => firstArticle.lessonId && navigate(`/lessons/${firstArticle.lessonId}`)}
                style={{ background: "rgba(255,255,255,0.06)", borderRadius: "1.1rem",
                  border: "1px solid rgba(232,213,160,0.12)", padding: "1.25rem 1.5rem",
                  marginBottom: "1.75rem", cursor: firstArticle.lessonId ? "pointer" : "default",
                  transition: "all 0.2s" }}
                onMouseEnter={e => {
                  if (firstArticle.lessonId) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                }}
              >
                <div style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
                  fontSize: "0.95rem", color: GOLD_SHIMMER, marginBottom: "0.4rem" }}>
                  {firstArticle.title}
                </div>
                <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.82rem",
                  color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem" }}>
                  מאת {firstArticle.rabbi}
                </div>
                <div
                  className="line-clamp-3"
                  style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.65)", lineHeight: 1.7,
                    display: "-webkit-box", WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical", overflow: "hidden" }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(
                    firstArticle.lessonContent?.replace(/<[^>]+>/g, " ").slice(0, 200) ?? ""
                  ) }}
                />
                {firstArticle.lessonId && (
                  <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.78rem",
                    color: GOLD_LIGHT, fontWeight: 600, marginTop: "0.5rem", display: "inline-block" }}>
                    לשיעור המלא ←
                  </span>
                )}
              </div>
            )}

            {/* Dual CTAs */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/parasha")}
                style={{ padding: "0.8rem 2rem", borderRadius: "0.9rem", border: "none",
                  background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
                  color: "white", fontFamily: "Paamon, serif", fontWeight: 700,
                  fontSize: "0.95rem", cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(139,111,71,0.35)" }}>
                לדף פרשת השבוע ←
              </button>
              {firstArticle?.seriesId && (
                <button onClick={() => navigate(`/series/${firstArticle.seriesId}`)}
                  style={{ padding: "0.8rem 2rem", borderRadius: "0.9rem",
                    border: `1.5px solid ${GOLD_LIGHT}`, background: "transparent",
                    color: GOLD_LIGHT, fontFamily: "Paamon, serif", fontWeight: 700,
                    fontSize: "0.95rem", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(196,162,101,0.1)";
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
            ניסי המלחמה
          </div>
          <h2 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
                        fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", color: "white", margin: "0 0 1rem" }}>
            דור הפלאות — נסים מהמלחמה
          </h2>
          <p style={{ fontFamily: "Ploni, sans-serif", fontSize: "1rem", color: "rgba(255,255,255,0.55)",
                      maxWidth: 520, margin: "0 auto" }}>
            מאות סיפורים מתועדים של נסים גלויים שהתרחשו בשדות הקרב ובעורף
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

  const LESSON_IMAGES = ["/images/lesson-audio.png", "/images/lesson-video.png", "/images/lesson-text.png", "/images/series-middot.png"];
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
  [/תנ.?ך|ננצח|כוח/i, "/images/series-tanach-victory.png"],
  [/לשון|קודש|עברית/i, "/images/series-lashon-hakodesh.png"],
  [/איוב/i, "/images/series-iyov.png"],
  [/מידות|מוסר|middot/i, "/images/series-middot.png"],
  [/משלי/i, "/images/series-iyov.png"],
  [/שמות|בראשית|ויקרא|במדבר|דברים/i, "/images/series-lashon-hakodesh.png"],
  [/פרשה|פרשת/i, "/images/series-tanach-victory.png"],
];
function getSeriesImage(title: string, index: number): string {
  for (const [re, img] of SERIES_IMAGE_MAP) {
    if (re.test(title)) return img;
  }
  const fallbacks = ["/images/series-tanach-victory.png", "/images/series-lashon-hakodesh.png",
                     "/images/series-iyov.png", "/images/series-middot.png"];
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

        <div dir="rtl" style={{ display: "grid",
                                  gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "1.25rem" }}>
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

// ── DesignFooter ───────────────────────────────────────────────────────────
function DesignFooter() {
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
export default function DesignPreviewHome() {
  useSEO({
    description: "פורטל מרכזי ללימוד תנ״ך – שיעורים, סדרות, רבנים ועוד. למעלה מ-11,000 שיעורים חינמיים בספרי נביאים, כתובים, תורה ומועדים.",
    url: "https://bneyzion.co.il/",
  });

  return (
    <div dir="rtl" style={{ background: PARCHMENT, minHeight: "100vh",
                             fontFamily: "Ploni, sans-serif" }}>
      <DesignNavBar />
      <DesignHero />
      <StatsBar />
      <KenesBanner />
      <DesignParashaHolidaySection />
      <PopularLessonsSection />
      <WarMiraclesSection />
      <TopSeriesSection />
      <RabbisSection />
      <WhatsAppCTASection />
      <DesignFooter />
    </div>
  );
}
