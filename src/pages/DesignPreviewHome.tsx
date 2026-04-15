import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLessons } from "@/hooks/useLessons";
import { useSeries } from "@/hooks/useSeries";
import { usePublicRabbis } from "@/hooks/useRabbis";

// ── Design tokens ──────────────────────────────────────────────────────────
const GOLD_DARK = "#8B6F47";
const GOLD_LIGHT = "#C4A265";
const GOLD_SHIMMER = "#E8D5A0";
const PARCHMENT = "#FAF6F0";
const PARCHMENT_DARK = "#F5F0E8";
const TEXT_DARK = "#2D1F0E";
const TEXT_MUTED = "#6B5C4A";
const TEXT_SUBTLE = "#A69882";
const OLIVE_DARK = "#4A5A2E";
const OLIVE_MAIN = "#5B6E3A";
const OLIVE_BG = "#F4F5EF";

// ── DesignNavBar ───────────────────────────────────────────────────────────
function DesignNavBar() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navStyle: React.CSSProperties = scrolled
    ? {
        background: "rgba(250,246,240,0.85)",
        backdropFilter: "blur(20px) saturate(180%)",
        borderBottom: `1px solid rgba(139,111,71,0.15)`,
        boxShadow: "0 2px 20px rgba(45,31,14,0.06)",
      }
    : {
        background: "transparent",
      };

  const linkColor = scrolled ? TEXT_MUTED : "white";

  return (
    <nav
      dir="rtl"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        transition: "all 0.35s ease",
        ...navStyle,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 1.5rem",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <span
          style={{
            fontFamily: "Kedem, Frank Ruhl Libre, serif",
            fontWeight: 900,
            fontSize: "1.5rem",
            letterSpacing: "0.05em",
            background: `linear-gradient(135deg, ${TEXT_DARK}, ${GOLD_DARK}, ${GOLD_LIGHT})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            cursor: "pointer",
          }}
          onClick={() => navigate("/")}
        >
          בני ציון
        </span>

        {/* Nav links (desktop) */}
        <div
          className="hidden md:flex"
          style={{ gap: "2rem", alignItems: "center" }}
        >
          {["ראשי", "סדרות", "רבנים", "תנ״ך"].map((label) => (
            <span
              key={label}
              style={{
                fontFamily: "Ploni, sans-serif",
                fontSize: "0.9rem",
                color: linkColor,
                cursor: "pointer",
                transition: "color 0.2s",
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            style={{
              padding: "0.45rem 1.1rem",
              border: `1.5px solid ${GOLD_LIGHT}`,
              borderRadius: "0.75rem",
              background: "transparent",
              color: scrolled ? TEXT_DARK : "white",
              fontFamily: "Ploni, sans-serif",
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            כניסה
          </button>
          <button
            style={{
              padding: "0.45rem 1.1rem",
              borderRadius: "0.75rem",
              border: "none",
              background: `linear-gradient(135deg, ${OLIVE_DARK}, ${OLIVE_MAIN})`,
              color: "white",
              fontFamily: "Ploni, sans-serif",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            הצטרף חינם
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── DesignHero ─────────────────────────────────────────────────────────────
function DesignHero() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: "90vh",
        minHeight: 650,
        overflow: "hidden",
        position: "relative",
        marginTop: -64, // pull behind the sticky nav
      }}
    >
      {/* Video bg */}
      <video
        autoPlay
        muted
        loop
        playsInline
        src="/video/hero-bg.mp4"
        style={{
          filter: "brightness(0.7) contrast(1.1) saturate(1.15)",
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scale(1.05)",
        }}
      />

      {/* Overlay 1 — directional fade */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      {/* Overlay 2 — radial vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center 40%, transparent 0%, rgba(0,0,0,0.4) 100%)",
        }}
      />
      {/* Overlay 3 — bottom parchment fade */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 288,
          background: `linear-gradient(to top, ${PARCHMENT}, rgba(250,246,240,0.8) 30%, transparent)`,
        }}
      />

      {/* Grain texture */}
      <svg
        style={{ position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none" }}
        width="100%"
        height="100%"
      >
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* Content */}
      <div
        dir="rtl"
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 1.5rem",
          paddingTop: 64,
        }}
      >
        {/* Site name shimmer */}
        <div
          className="animate-shimmer"
          style={{
            fontFamily: "Kedem, Frank Ruhl Libre, serif",
            fontWeight: 900,
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            letterSpacing: "0.3em",
            backgroundImage: `linear-gradient(135deg, ${GOLD_SHIMMER}, ${GOLD_LIGHT}, ${GOLD_DARK}, ${GOLD_LIGHT}, ${GOLD_SHIMMER})`,
            backgroundSize: "300% 300%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "0.5rem",
          }}
        >
          בני ציון
        </div>

        {/* H1 */}
        <h1
          className="animate-fade-in-up"
          style={{
            fontFamily: "Kedem, Frank Ruhl Libre, serif",
            fontWeight: 900,
            fontSize: "clamp(1.8rem, 4vw, 3rem)",
            color: "white",
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            margin: "0 0 1.25rem",
            lineHeight: 1.2,
          }}
        >
          אתר התנ״ך של ישראל
        </h1>

        {/* Gold divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ width: 60, height: 1, background: GOLD_LIGHT }} />
          <div
            style={{
              width: 8,
              height: 8,
              background: GOLD_LIGHT,
              transform: "rotate(45deg)",
            }}
          />
          <div style={{ width: 60, height: 1, background: GOLD_LIGHT }} />
        </div>

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => navigate("/series")}
            style={{
              padding: "0.85rem 2rem",
              borderRadius: "1rem",
              border: "none",
              background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
              color: "white",
              fontFamily: "Paamon, serif",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(139,111,71,0.35)",
            }}
          >
            התחילו ללמוד 📖
          </button>
          <button
            onClick={() => navigate("/series")}
            style={{
              padding: "0.85rem 2rem",
              borderRadius: "1rem",
              border: "1.5px solid rgba(255,255,255,0.4)",
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
              color: "white",
              fontFamily: "Ploni, sans-serif",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            גלה את הסדרות
          </button>
        </div>

        {/* Scroll indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 140,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.25rem",
            opacity: 0.6,
          }}
        >
          <div
            style={{
              width: 22,
              height: 34,
              border: "1.5px solid white",
              borderRadius: 12,
              display: "flex",
              justifyContent: "center",
              paddingTop: 5,
            }}
          >
            <div
              className="animate-bounce"
              style={{
                width: 4,
                height: 8,
                background: "white",
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PopularLessonsSection ──────────────────────────────────────────────────
function PopularLessonsSection() {
  const { data: lessonsRaw } = useLessons();
  const navigate = useNavigate();

  const lessons = (lessonsRaw || []).slice(0, 4);

  const placeholderGradient = (sourceType: string) => {
    if (sourceType === "video") return "linear-gradient(135deg, #92400e, #b45309)";
    if (sourceType === "audio") return "linear-gradient(135deg, #0f766e, #0d9488)";
    return "linear-gradient(135deg, #4d7c0f, #65a30d)";
  };

  return (
    <section style={{ background: PARCHMENT, padding: "5rem 1.5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Header */}
        <div
          dir="rtl"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2.5rem",
          }}
        >
          <h2
            style={{
              fontFamily: "Kedem, Frank Ruhl Libre, serif",
              fontWeight: 900,
              fontSize: "1.875rem",
              color: TEXT_DARK,
              margin: 0,
            }}
          >
            שיעורים פופולריים
          </h2>
          <span
            style={{
              fontFamily: "Ploni, sans-serif",
              fontSize: "0.9rem",
              color: GOLD_DARK,
              cursor: "pointer",
            }}
            onClick={() => navigate("/lessons")}
          >
            הצג הכל ←
          </span>
        </div>

        {/* Grid */}
        <div
          dir="rtl"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {lessons.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: "1rem",
                    overflow: "hidden",
                    border: `1px solid rgba(139,111,71,0.12)`,
                    background: PARCHMENT_DARK,
                    height: 260,
                    animation: "pulse 2s infinite",
                  }}
                />
              ))
            : lessons.map((lesson: any) => (
                <div
                  key={lesson.id}
                  onClick={() => navigate(`/lessons/${lesson.id}`)}
                  style={{
                    borderRadius: "1rem",
                    overflow: "hidden",
                    border: `1px solid rgba(139,111,71,0.12)`,
                    background: "white",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 2px 8px rgba(45,31,14,0.04)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 12px 40px rgba(45,31,14,0.14)";
                    (e.currentTarget as HTMLElement).style.borderColor = GOLD_DARK;
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 2px 8px rgba(45,31,14,0.04)";
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "rgba(139,111,71,0.12)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  {/* Image area */}
                  <div
                    style={{
                      height: 176,
                      overflow: "hidden",
                      position: "relative",
                      background: placeholderGradient(lesson.source_type || "video"),
                    }}
                  >
                    {lesson.thumbnail_url ? (
                      <img
                        src={lesson.thumbnail_url}
                        alt={lesson.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform 0.5s ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLImageElement).style.transform = "scale(1.1)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLImageElement).style.transform = "scale(1)";
                        }}
                      />
                    ) : null}
                    {/* Gradient overlay */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)",
                      }}
                    />
                    {/* Badge */}
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        padding: "0.2rem 0.6rem",
                        borderRadius: "0.5rem",
                        background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
                        color: "white",
                        fontFamily: "Ploni, sans-serif",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                      }}
                    >
                      פופולרי
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: "1rem" }}>
                    {lesson.rabbis?.name && (
                      <div
                        style={{
                          fontFamily: "Ploni, sans-serif",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          color: GOLD_DARK,
                          marginBottom: "0.3rem",
                        }}
                      >
                        {lesson.rabbis.name}
                      </div>
                    )}
                    <div
                      style={{
                        fontFamily: "Kedem, Frank Ruhl Libre, serif",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        color: TEXT_DARK,
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {lesson.title}
                    </div>
                    {lesson.duration && (
                      <div
                        style={{
                          fontFamily: "Ploni, sans-serif",
                          fontSize: "0.75rem",
                          color: TEXT_SUBTLE,
                        }}
                      >
                        {Math.floor(lesson.duration / 60)} דקות
                      </div>
                    )}
                  </div>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}

// ── TopSeriesSection ───────────────────────────────────────────────────────
function TopSeriesSection() {
  const { data: seriesRaw } = useSeries();
  const navigate = useNavigate();
  const series = (seriesRaw || []).slice(0, 4);

  return (
    <section
      style={{
        background: `linear-gradient(135deg, ${OLIVE_BG} 0%, ${PARCHMENT} 50%, ${OLIVE_BG} 100%)`,
        padding: "5rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Header */}
        <div
          dir="rtl"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2.5rem",
          }}
        >
          <h2
            style={{
              fontFamily: "Kedem, Frank Ruhl Libre, serif",
              fontWeight: 900,
              fontSize: "1.875rem",
              color: TEXT_DARK,
              margin: 0,
            }}
          >
            סדרות מובילות
          </h2>
          <span
            style={{
              fontFamily: "Ploni, sans-serif",
              fontSize: "0.9rem",
              color: GOLD_DARK,
              cursor: "pointer",
            }}
            onClick={() => navigate("/series")}
          >
            כל הסדרות ←
          </span>
        </div>

        {/* Grid */}
        <div
          dir="rtl"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {series.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: "1rem",
                    height: 120,
                    background: PARCHMENT_DARK,
                    border: `1px solid rgba(139,111,71,0.1)`,
                  }}
                />
              ))
            : series.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/series/${s.id}`)}
                  style={{
                    borderRadius: "1rem",
                    overflow: "hidden",
                    border: `1px solid rgba(139,111,71,0.12)`,
                    display: "flex",
                    background: "white",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 2px 8px rgba(45,31,14,0.04)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 8px 30px rgba(45,31,14,0.1)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 2px 8px rgba(45,31,14,0.04)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  {/* Image / placeholder */}
                  <div
                    style={{
                      width: "40%",
                      flexShrink: 0,
                      background: `linear-gradient(135deg, ${GOLD_DARK}, ${OLIVE_MAIN})`,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {s.image_url && (
                      <img
                        src={s.image_url}
                        alt={s.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: "1.25rem", flex: 1 }}>
                    <div
                      style={{
                        fontFamily: "Kedem, Frank Ruhl Libre, serif",
                        fontWeight: 900,
                        fontSize: "1rem",
                        color: TEXT_DARK,
                        marginBottom: "0.4rem",
                        lineHeight: 1.3,
                      }}
                    >
                      {s.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "Ploni, sans-serif",
                        fontSize: "0.75rem",
                        color: TEXT_SUBTLE,
                        marginBottom: "0.75rem",
                      }}
                    >
                      {s.lesson_count ?? 0} שיעורים
                    </div>

                    {/* Progress bar */}
                    <div
                      style={{
                        height: 4,
                        background: "rgba(139,111,71,0.1)",
                        borderRadius: 2,
                        marginBottom: "0.75rem",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: "30%",
                          background: `linear-gradient(90deg, ${OLIVE_DARK}, ${OLIVE_MAIN})`,
                          borderRadius: 2,
                        }}
                      />
                    </div>

                    <button
                      style={{
                        padding: "0.4rem 1rem",
                        borderRadius: "0.75rem",
                        border: "none",
                        background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
                        color: "white",
                        fontFamily: "Paamon, serif",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      התחל ללמוד
                    </button>
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
  const rabbis = (rabbisRaw || []).slice(0, 6);

  return (
    <section style={{ background: PARCHMENT, padding: "5rem 1.5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <h2
          dir="rtl"
          style={{
            fontFamily: "Kedem, Frank Ruhl Libre, serif",
            fontWeight: 900,
            fontSize: "1.875rem",
            color: TEXT_DARK,
            textAlign: "center",
            marginBottom: "3rem",
          }}
        >
          הרבנים שלנו
        </h2>

        <div
          dir="rtl"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: "2rem",
          }}
        >
          {(rabbis.length === 0 ? Array.from({ length: 6 }) : rabbis).map(
            (rabbi: any, i: number) => (
              <div
                key={rabbi?.id ?? i}
                onClick={() => rabbi?.id && navigate(`/rabbis/${rabbi.id}`)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "0.5rem",
                  cursor: rabbi?.id ? "pointer" : "default",
                }}
              >
                {/* Avatar circle */}
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: `2.5px solid rgba(139,111,71,0.25)`,
                    background: rabbi?.image_url
                      ? "transparent"
                      : `linear-gradient(135deg, ${GOLD_DARK}, ${OLIVE_MAIN})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.25s ease, box-shadow 0.25s ease",
                    boxShadow: "0 2px 12px rgba(45,31,14,0.08)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 6px 24px rgba(139,111,71,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 2px 12px rgba(45,31,14,0.08)";
                  }}
                >
                  {rabbi?.image_url ? (
                    <img
                      src={rabbi.image_url}
                      alt={rabbi.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span
                      style={{
                        fontFamily: "Kedem, Frank Ruhl Libre, serif",
                        fontWeight: 900,
                        fontSize: "2rem",
                        color: "white",
                      }}
                    >
                      {rabbi?.name ? rabbi.name[0] : "?"}
                    </span>
                  )}
                </div>

                {rabbi?.name && (
                  <div
                    style={{
                      fontFamily: "Kedem, Frank Ruhl Libre, serif",
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      color: TEXT_DARK,
                    }}
                  >
                    {rabbi.name}
                  </div>
                )}
                {rabbi?.lesson_count !== undefined && (
                  <div
                    style={{
                      fontFamily: "Ploni, sans-serif",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: OLIVE_MAIN,
                    }}
                  >
                    {rabbi.lesson_count} שיעורים
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}

// ── WhatsAppCTASection ─────────────────────────────────────────────────────
function WhatsAppCTASection() {
  return (
    <section style={{ background: PARCHMENT_DARK, padding: "4rem 1.5rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div
          dir="rtl"
          style={{
            borderRadius: "1.5rem",
            padding: "3rem",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            background: `linear-gradient(135deg, ${OLIVE_DARK} 0%, ${OLIVE_MAIN} 60%, #4A5A2E 100%)`,
            boxShadow: "0 16px 60px rgba(74,90,46,0.25)",
          }}
        >
          {/* Dot pattern overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative" }}>
            <h2
              style={{
                fontFamily: "Kedem, Frank Ruhl Libre, serif",
                fontWeight: 900,
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                color: "white",
                marginBottom: "0.75rem",
              }}
            >
              הצטרפו לקהילת הוואטסאפ
            </h2>
            <p
              style={{
                fontFamily: "Ploni, sans-serif",
                fontSize: "1rem",
                color: "rgba(255,255,255,0.7)",
                marginBottom: "2rem",
              }}
            >
              שיעורים יומיים, חידושי תורה ועדכונים ישירות לנייד שלכם
            </p>

            <button
              style={{
                padding: "0.85rem 2.5rem",
                borderRadius: "1rem",
                border: "none",
                background: "white",
                color: OLIVE_DARK,
                fontFamily: "Paamon, serif",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                marginBottom: "2.5rem",
              }}
            >
              הצטרפו עכשיו
            </button>

            {/* Pasuk */}
            <div>
              <div
                style={{
                  width: 40,
                  height: 1,
                  background: `rgba(255,255,255,0.3)`,
                  margin: "0 auto 0.75rem",
                }}
              />
              <blockquote
                style={{
                  fontFamily: "Kedem, Frank Ruhl Libre, serif",
                  fontWeight: 400,
                  fontSize: "1rem",
                  color: TEXT_DARK,
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                "הנה לא ינום ולא יישן שומר ישראל"
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
  return (
    <footer
      dir="rtl"
      style={{
        background: `linear-gradient(180deg, ${TEXT_DARK}, #1A1208)`,
        padding: "4rem 1.5rem 2rem",
        color: "white",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "3rem",
          marginBottom: "3rem",
        }}
      >
        {/* Column 1 — Brand */}
        <div>
          <div
            style={{
              fontFamily: "Kedem, Frank Ruhl Libre, serif",
              fontWeight: 900,
              fontSize: "1.5rem",
              background: `linear-gradient(135deg, ${GOLD_SHIMMER}, ${GOLD_LIGHT})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "0.75rem",
            }}
          >
            בני ציון
          </div>
          <div
            style={{
              fontFamily: "Ploni, sans-serif",
              fontSize: "0.8rem",
              color: "rgba(255,255,255,0.4)",
              lineHeight: 1.7,
            }}
          >
            לעילוי נשמת
            <br />
            כל נשמות ישראל
          </div>
        </div>

        {/* Column 2 */}
        <div>
          <div
            style={{
              fontFamily: "Kedem, Frank Ruhl Libre, serif",
              fontWeight: 700,
              color: GOLD_LIGHT,
              marginBottom: "1rem",
              fontSize: "0.9rem",
            }}
          >
            תוכן
          </div>
          {["שיעורים", "סדרות", "רבנים", "פרשת שבוע"].map((l) => (
            <div
              key={l}
              style={{
                fontFamily: "Ploni, sans-serif",
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.4)",
                marginBottom: "0.5rem",
                cursor: "pointer",
              }}
            >
              {l}
            </div>
          ))}
        </div>

        {/* Column 3 */}
        <div>
          <div
            style={{
              fontFamily: "Kedem, Frank Ruhl Libre, serif",
              fontWeight: 700,
              color: GOLD_LIGHT,
              marginBottom: "1rem",
              fontSize: "0.9rem",
            }}
          >
            אודות
          </div>
          {["אודותינו", "המשימה שלנו", "צוות", "מפת האתר"].map((l) => (
            <div
              key={l}
              style={{
                fontFamily: "Ploni, sans-serif",
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.4)",
                marginBottom: "0.5rem",
                cursor: "pointer",
              }}
            >
              {l}
            </div>
          ))}
        </div>

        {/* Column 4 */}
        <div>
          <div
            style={{
              fontFamily: "Kedem, Frank Ruhl Libre, serif",
              fontWeight: 700,
              color: GOLD_LIGHT,
              marginBottom: "1rem",
              fontSize: "0.9rem",
            }}
          >
            צור קשר
          </div>
          {["צור קשר", "תמיכה", "שאלות נפוצות"].map((l) => (
            <div
              key={l}
              style={{
                fontFamily: "Ploni, sans-serif",
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.4)",
                marginBottom: "0.5rem",
                cursor: "pointer",
              }}
            >
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          paddingTop: "1.5rem",
          textAlign: "center",
          fontFamily: "Ploni, sans-serif",
          fontSize: "0.75rem",
          color: "rgba(255,255,255,0.25)",
        }}
      >
        © {new Date().getFullYear()} בני ציון — כל הזכויות שמורות
      </div>
    </footer>
  );
}

// ── Page component ─────────────────────────────────────────────────────────
export default function DesignPreviewHome() {
  return (
    <div
      dir="rtl"
      style={{ background: PARCHMENT, minHeight: "100vh", fontFamily: "Ploni, sans-serif" }}
    >
      <DesignNavBar />
      <DesignHero />
      <PopularLessonsSection />
      <TopSeriesSection />
      <RabbisSection />
      <WhatsAppCTASection />
      <DesignFooter />
    </div>
  );
}
