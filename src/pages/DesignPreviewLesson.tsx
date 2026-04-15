import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLesson } from "@/hooks/useLesson";
import { sanitizeHtml } from "@/lib/sanitize";

// ── Design tokens ──────────────────────────────────────────────────────────
const GOLD_DARK = "#8B6F47";
const GOLD_LIGHT = "#C4A265";
const GOLD_SHIMMER = "#E8D5A0";
const PARCHMENT = "#FAF6F0";
const TEXT_DARK = "#2D1F0E";
const TEXT_MUTED = "#6B5C4A";
const TEXT_SUBTLE = "#A69882";
const OLIVE_DARK = "#4A5A2E";
const OLIVE_MAIN = "#5B6E3A";

const FALLBACK_ID = "2aaca142-085f-49fc-a220-66d6883b30b1";

// ── DesignNavBar (self-contained copy) ────────────────────────────────────
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
        background: "rgba(0,0,0,0.35)",
      };

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

        <div className="hidden md:flex" style={{ gap: "2rem", alignItems: "center" }}>
          {["ראשי", "סדרות", "רבנים", "תנ״ך"].map((label) => (
            <span
              key={label}
              style={{
                fontFamily: "Ploni, sans-serif",
                fontSize: "0.9rem",
                color: scrolled ? TEXT_MUTED : "white",
                cursor: "pointer",
              }}
            >
              {label}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
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

// ── LessonHero ─────────────────────────────────────────────────────────────
function LessonHero({ lesson }: { lesson: any }) {
  const seriesTitle = lesson?.series?.title ?? "";
  const rabbiName = lesson?.rabbis?.name ?? "";
  const duration = lesson?.duration ? `${Math.floor(lesson.duration / 60)} דקות` : null;
  const sourceType = lesson?.source_type ?? "video";

  const typeBadgeColor =
    sourceType === "video"
      ? `linear-gradient(135deg, #92400e, #b45309)`
      : sourceType === "audio"
      ? `linear-gradient(135deg, #0f766e, #0d9488)`
      : `linear-gradient(135deg, ${OLIVE_DARK}, ${OLIVE_MAIN})`;

  const typeLabel =
    sourceType === "video" ? "וידאו" : sourceType === "audio" ? "אודיו" : "טקסט";

  return (
    <div
      dir="rtl"
      style={{
        background: `linear-gradient(180deg, ${TEXT_DARK} 0%, #3D2A14 60%, ${PARCHMENT} 100%)`,
        minHeight: "50vh",
        position: "relative",
        marginTop: -64,
        paddingTop: 64,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "calc(64px + 3rem) 1.5rem 4rem",
        overflow: "hidden",
      }}
    >
      {/* Thumbnail overlay */}
      {lesson?.thumbnail_url && (
        <>
          <img
            src={lesson.thumbnail_url}
            alt=""
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.2,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, ${TEXT_DARK}cc 0%, #3D2A14cc 60%, ${PARCHMENT} 100%)`,
            }}
          />
        </>
      )}

      <div style={{ position: "relative", maxWidth: 800, width: "100%" }}>
        {/* Breadcrumbs */}
        <div
          style={{
            fontFamily: "Mugrabi, sans-serif",
            fontSize: "0.8rem",
            color: `rgba(196,162,101,0.6)`,
            marginBottom: "1.25rem",
            direction: "rtl",
          }}
        >
          ראשי{seriesTitle ? ` > סדרות > ${seriesTitle}` : ""}
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "Kedem, Frank Ruhl Libre, serif",
            fontWeight: 900,
            fontSize: "clamp(1.75rem, 4vw, 3rem)",
            color: "white",
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            marginBottom: "1.5rem",
            lineHeight: 1.25,
          }}
        >
          {lesson?.title ?? "טוען..."}
        </h1>

        {/* Meta row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          {rabbiName && (
            <span
              style={{
                fontFamily: "Ploni, sans-serif",
                fontWeight: 700,
                fontSize: "0.9rem",
                color: GOLD_LIGHT,
              }}
            >
              {rabbiName}
            </span>
          )}
          {duration && (
            <span
              style={{
                fontFamily: "Ploni, sans-serif",
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              · {duration}
            </span>
          )}
          <span
            style={{
              padding: "0.2rem 0.7rem",
              borderRadius: "0.5rem",
              background: typeBadgeColor,
              color: "white",
              fontFamily: "Ploni, sans-serif",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            {typeLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Custom audio player card ───────────────────────────────────────────────
function AudioPlayerCard({ audioUrl }: { audioUrl: string }) {
  const [playing, setPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef) return;
    if (playing) {
      audioRef.pause();
      setPlaying(false);
    } else {
      audioRef.play();
      setPlaying(true);
    }
  };

  return (
    <div
      style={{
        border: `2px solid ${GOLD_LIGHT}`,
        borderRadius: "1.25rem",
        padding: "2rem",
        background: "white",
        boxShadow: `0 8px 30px rgba(139,111,71,0.12)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      <audio
        src={audioUrl}
        ref={(el) => setAudioRef(el)}
        onEnded={() => setPlaying(false)}
        style={{ display: "none" }}
      />

      {/* Play button */}
      <button
        onClick={toggle}
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          border: "none",
          background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
          color: "white",
          fontSize: "1.75rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 4px 20px rgba(139,111,71,0.3)`,
          transition: "transform 0.15s ease",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.transform = "scale(1.07)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.transform = "scale(1)")
        }
      >
        {playing ? "⏸" : "▶"}
      </button>

      <div
        style={{
          fontFamily: "Ploni, sans-serif",
          fontSize: "0.85rem",
          color: TEXT_SUBTLE,
        }}
      >
        {playing ? "מנגן..." : "לחץ להפעלה"}
      </div>

      {/* Native controls as fallback */}
      <audio src={audioUrl} controls style={{ width: "100%", opacity: 0.7 }} />
    </div>
  );
}

// ── LessonContent ──────────────────────────────────────────────────────────
function LessonContent({ lesson }: { lesson: any }) {
  const navigate = useNavigate();
  const content = (lesson as any)?.content ?? null;

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "3rem 1.5rem 5rem",
      }}
    >
      {/* Video player */}
      {lesson?.video_url && (
        <div style={{ marginBottom: "3rem" }}>
          <video
            controls
            src={lesson.video_url}
            style={{
              width: "100%",
              borderRadius: "1.25rem",
              boxShadow: "0 16px 64px rgba(0,0,0,0.15)",
              display: "block",
            }}
          />
        </div>
      )}

      {/* Audio player */}
      {!lesson?.video_url && lesson?.audio_url && (
        <div style={{ marginBottom: "3rem" }}>
          <AudioPlayerCard audioUrl={lesson.audio_url} />
        </div>
      )}

      {/* Text content */}
      {content && (
        <div
          className="design-content"
          style={{
            fontFamily: "Ploni, sans-serif",
            lineHeight: 2,
            color: TEXT_DARK,
            fontSize: "1.05rem",
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
        />
      )}

      {/* No media fallback */}
      {!lesson?.video_url && !lesson?.audio_url && !content && lesson && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: TEXT_SUBTLE,
            fontFamily: "Ploni, sans-serif",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📖</div>
          <div>אין מדיה זמינה לשיעור זה</div>
        </div>
      )}

      {/* Back button */}
      <div style={{ textAlign: "center", marginTop: "3rem" }}>
        <button
          onClick={() => navigate("/series")}
          style={{
            padding: "0.85rem 2.5rem",
            borderRadius: "1rem",
            border: "none",
            background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
            color: "white",
            fontFamily: "Paamon, serif",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: "pointer",
            boxShadow: `0 4px 20px rgba(139,111,71,0.25)`,
          }}
        >
          ← חזרה לסדרות
        </button>
      </div>
    </div>
  );
}

// ── DesignFooter (self-contained copy) ────────────────────────────────────
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

        {[
          { title: "תוכן", links: ["שיעורים", "סדרות", "רבנים", "פרשת שבוע"] },
          { title: "אודות", links: ["אודותינו", "המשימה שלנו", "צוות"] },
          { title: "צור קשר", links: ["צור קשר", "תמיכה", "שאלות נפוצות"] },
        ].map(({ title, links }) => (
          <div key={title}>
            <div
              style={{
                fontFamily: "Kedem, Frank Ruhl Libre, serif",
                fontWeight: 700,
                color: GOLD_LIGHT,
                marginBottom: "1rem",
                fontSize: "0.9rem",
              }}
            >
              {title}
            </div>
            {links.map((l) => (
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
        ))}
      </div>

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
export default function DesignPreviewLesson() {
  const { id } = useParams<{ id: string }>();
  const lessonId = id ?? FALLBACK_ID;
  const { data: lesson, isLoading } = useLesson(lessonId);

  return (
    <div
      dir="rtl"
      style={{ background: PARCHMENT, minHeight: "100vh", fontFamily: "Ploni, sans-serif" }}
    >
      <DesignNavBar />

      {isLoading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
          }}
        >
          <div
            className="animate-spin"
            style={{
              width: 40,
              height: 40,
              border: `3px solid rgba(139,111,71,0.2)`,
              borderTopColor: GOLD_DARK,
              borderRadius: "50%",
            }}
          />
        </div>
      ) : (
        <>
          <LessonHero lesson={lesson} />
          <LessonContent lesson={lesson} />
          <DesignFooter />
        </>
      )}
    </div>
  );
}
