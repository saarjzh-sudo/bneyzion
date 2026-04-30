/**
 * DesignFooter — sandbox footer for the v2 redesign.
 *
 * Visual chrome from `DesignPreviewHome`'s `DesignFooter`, expanded with the
 * production footer's full information density (4 columns, memorials, social
 * icons, stats bar, install-prompt button) but in the new dark gradient style.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, Mail, Smartphone, Heart } from "lucide-react";

import logoBright from "@/assets/logo-horizontal-bright.png";
import { colors, fonts, gradients } from "@/lib/designTokens";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function YouTubeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      aria-hidden
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const COLUMNS: { title: string; links: { label: string; href: string; flame?: boolean }[] }[] = [
  {
    title: "התנ״ך",
    links: [
      { label: "סדרות", href: "/series" },
      { label: "רבנים", href: "/rabbis" },
      { label: "פרשת השבוע", href: "/parasha" },
      { label: "ספרי התנ״ך", href: "/bible/בראשית" },
      { label: "חנות", href: "/store" },
    ],
  },
  {
    title: "אודותינו",
    links: [
      { label: "החזון", href: "/about" },
      { label: "קהילת לומדים", href: "/community" },
      // Hidden 30.4.2026 per Saar — pending deletion decision: { label: "אגף המורים", href: "/teachers" }
      { label: "כנס ההודאה", href: "/kenes" },
      { label: "דור הפלאות", href: "/dor-haplaot" },
      { label: "מסלולים ומחירים", href: "/pricing" },
    ],
  },
  {
    title: "צור קשר",
    links: [
      { label: "טופס יצירת קשר", href: "/contact" },
      { label: "תרומה", href: "/donate" },
      { label: "לזכר סעדיה הי״ד", href: "/memorial/saadia", flame: true },
    ],
  },
];

const STATS = [
  { value: "11,000+", label: "שיעורים" },
  { value: "200+", label: "רבנים" },
  { value: "1,300+", label: "סדרות" },
  { value: "24/7", label: "גישה חופשית" },
];

export default function DesignFooter() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  const linkBase: React.CSSProperties = {
    fontFamily: fonts.body,
    fontSize: "0.83rem",
    color: "rgba(255,255,255,0.42)",
    textDecoration: "none",
    transition: "color 0.15s",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
  };

  return (
    <footer
      dir="rtl"
      style={{
        background: gradients.warmDark,
        color: "#fff",
        padding: "3.5rem 1.5rem 1.5rem",
        marginTop: "auto",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Top: brand + 3 columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr repeat(3, 1fr)",
            gap: "2.5rem",
            marginBottom: "2.5rem",
          }}
          className="footer-grid"
        >
          {/* Brand column */}
          <div>
            <img
              src={logoBright}
              alt="בני ציון"
              style={{ height: 56, width: "auto", marginBottom: "1rem" }}
            />
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "0.85rem",
                lineHeight: 1.75,
                color: "rgba(255,255,255,0.55)",
                maxWidth: 280,
                marginBottom: "1.25rem",
              }}
            >
              אתר התנ״ך הגדול בישראל — שיעורים, סדרות, ופרשנות מ-200+ רבנים, בגישה חופשית.
            </p>

            {/* Memorial block */}
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                color: "rgba(255,255,255,0.42)",
                lineHeight: 1.85,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  color: colors.goldShimmer,
                  fontFamily: fonts.accent,
                  fontSize: "0.78rem",
                  marginBottom: "0.4rem",
                }}
              >
                <Flame style={{ width: 12, height: 12 }} />
                לעילוי נשמת
                <Flame style={{ width: 12, height: 12 }} />
              </div>
              <div>
                <Link to="/memorial" style={{ ...linkBase, display: "block" }}>
                  בן ציון חיים הנמן הי״ד
                </Link>
                <Link to="/memorial/saadia" style={{ ...linkBase, display: "block" }}>
                  סעדיה יעקב בן חיים הי״ד
                </Link>
                <span style={{ ...linkBase, display: "block" }}>
                  מעין פלסר ז״ל
                </span>
              </div>
            </div>

            {installPrompt && (
              <button
                onClick={handleInstall}
                style={{
                  marginTop: "1.25rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.55rem 1rem",
                  borderRadius: 12,
                  border: `1px solid rgba(232,213,160,0.3)`,
                  background: "rgba(232,213,160,0.08)",
                  color: colors.goldShimmer,
                  fontFamily: fonts.body,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                <Smartphone style={{ width: 14, height: 14 }} />
                הוסף לסלולר
              </button>
            )}
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  color: colors.goldLight,
                  marginBottom: "0.9rem",
                  fontSize: "0.95rem",
                  letterSpacing: "0.02em",
                }}
              >
                {col.title}
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.55rem",
                }}
              >
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      style={linkBase}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = colors.goldShimmer;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "rgba(255,255,255,0.42)";
                      }}
                    >
                      {link.flame && <Flame style={{ width: 12, height: 12 }} />}
                      {link.label}
                    </Link>
                  </li>
                ))}
                {col.title === "צור קשר" && (
                  <>
                    <li>
                      <a
                        href="mailto:office@bneyzion.co.il"
                        style={linkBase}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = colors.goldShimmer;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "rgba(255,255,255,0.42)";
                        }}
                      >
                        <Mail style={{ width: 12, height: 12 }} />
                        office@bneyzion.co.il
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://wa.me/972527368607"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={linkBase}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = colors.goldShimmer;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "rgba(255,255,255,0.42)";
                        }}
                      >
                        <WhatsAppIcon size={12} />
                        052-736-8607
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://www.youtube.com/channel/UC-gctfj7VsEGFuznbq2y2jw"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={linkBase}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = colors.goldShimmer;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "rgba(255,255,255,0.42)";
                        }}
                      >
                        <YouTubeIcon size={12} />
                        ערוץ היוטיוב
                      </a>
                    </li>
                  </>
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div
          style={{
            borderTop: "1px solid rgba(232,213,160,0.08)",
            padding: "1.5rem 0",
            display: "flex",
            justifyContent: "center",
            gap: "3rem",
            flexWrap: "wrap",
          }}
        >
          {STATS.map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: "1.4rem",
                  background: gradients.goldText,
                  backgroundSize: "300% 300%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  marginBottom: "0.15rem",
                }}
                className="animate-shimmer"
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.72rem",
                  color: "rgba(255,255,255,0.45)",
                  letterSpacing: "0.05em",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid rgba(232,213,160,0.06)",
            paddingTop: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
            fontFamily: fonts.body,
            fontSize: "0.72rem",
            color: "rgba(255,255,255,0.32)",
          }}
        >
          <span>© {new Date().getFullYear()} בני ציון — כל הזכויות שמורות</span>
          <span>
            נבנה ב<Heart style={{ width: 10, height: 10, display: "inline", color: colors.goldShimmer, margin: "0 0.25rem" }} />ע״י{" "}
            <a
              href="https://wa.me/972526018772"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(232,213,160,0.7)", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              סער חלק
            </a>
          </span>
        </div>
      </div>

      {/* Mobile responsive: collapse columns on small screens */}
      <style>{`
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 1.5rem !important;
          }
        }
        @media (max-width: 480px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
