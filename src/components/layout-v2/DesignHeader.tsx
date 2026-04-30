/**
 * DesignHeader — sandbox header for the v2 redesign.
 *
 * Visual chrome from `DesignPreviewHome`'s `DesignNavBar`, but wraps the real
 * production sub-components (UserMenu, CartButton, NotificationBell, DarkModeToggle,
 * GlobalSearch) so the sandbox uses live functionality, not mocks.
 *
 * Behavior:
 *  - Sticky top, 96px tall.
 *  - When `transparentOnTop=true` AND scroll < 60px → transparent + bright logo.
 *  - Otherwise → parchment with backdrop-blur + colored logo.
 *
 * Pages decide:
 *  - Home / pages with dark hero overlap → `transparentOnTop` + `overlapHero`
 *  - All other pages → solid (default)
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Search, Flame } from "lucide-react";

import logoColor from "@/assets/logo-horizontal-color.png";
import logoBright from "@/assets/logo-horizontal-bright.png";
import GlobalSearch from "@/components/search/GlobalSearch";
import UserMenu from "@/components/layout/UserMenu";
import CartButton from "@/components/cart/CartButton";
import NotificationBell from "@/components/layout/NotificationBell";
import DarkModeToggle from "@/components/ui/dark-mode-toggle";

import { colors, fonts, gradients, shadows } from "@/lib/designTokens";

// Hidden 30.4.2026 per Saar — pending deletion decision: { label: "אגף המורים", href: "/teachers" }
const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "ראשי", href: "/" },
  { label: "רבנים", href: "/rabbis" },
  { label: "סדרות", href: "/series" },
  { label: "תנ״ך", href: "/bible/בראשית" },
  { label: "קהילה", href: "/community" },
  { label: "חנות", href: "/store" },
  { label: "פרשת השבוע", href: "/parasha" },
  { label: "אודותינו", href: "/about" },
];

interface DesignHeaderProps {
  /** When true, header is transparent before scroll (use on pages with a dark hero). */
  transparentOnTop?: boolean;
  /** When provided, shows a sidebar-toggle burger that calls this on click.
   *  On desktop, the sidebar is always visible; the burger is only useful on
   *  mobile. We render it whenever sidebar mode is enabled and let CSS hide
   *  it on desktop. */
  onSidebarToggle?: () => void;
}

export default function DesignHeader({
  transparentOnTop = false,
  onSidebarToggle,
}: DesignHeaderProps) {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isTransparent = transparentOnTop && !scrolled;

  const navStyle: React.CSSProperties = isTransparent
    ? { background: "transparent", borderBottom: "1px solid transparent" }
    : {
        background: "rgba(250,246,240,0.92)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: `1px solid rgba(139,111,71,0.15)`,
        boxShadow: shadows.navScroll,
      };

  const linkColor = isTransparent ? "rgba(255,255,255,0.9)" : colors.textMuted;
  const linkHover = isTransparent ? "#fff" : colors.goldDark;

  return (
    <header
      dir="rtl"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        transition: "all 0.3s ease",
        ...navStyle,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 1.5rem",
          height: 96,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        {/* Logo — RIGHT in RTL */}
        <Link to="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <img
            src={isTransparent ? logoBright : logoColor}
            alt="בני ציון"
            style={{
              height: 64,
              width: "auto",
              objectFit: "contain",
              transition: "all 0.3s ease",
            }}
          />
        </Link>

        {/* Nav — CENTER (hidden on mobile; always visible on desktop even when sidebar is active).
             Previously `display: onSidebarToggle ? "none" : undefined` would hide the entire
             nav whenever a sidebar was present — that hid the logo/nav on desktop too.
             Fix: never hide on desktop; the sidebar is a separate panel that doesn't
             conflict with the header nav. */}
        <nav
          className="hidden md:flex"
          style={{
            gap: "1.25rem",
            alignItems: "center",
            flex: 1,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {NAV_ITEMS.map(({ label, href }) => {
            const isActive =
              href === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(href);
            return (
              <Link
                key={href}
                to={href}
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.85rem",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive
                    ? isTransparent
                      ? "#fff"
                      : colors.goldDark
                    : linkColor,
                  textDecoration: "none",
                  transition: "color 0.2s",
                  borderBottom: isActive
                    ? `1.5px solid ${isTransparent ? "rgba(255,255,255,0.7)" : colors.goldDark}`
                    : "1.5px solid transparent",
                  paddingBottom: 2,
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = linkHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isActive
                    ? isTransparent
                      ? "#fff"
                      : colors.goldDark
                    : linkColor;
                }}
              >
                {label}
              </Link>
            );
          })}
          {/* Memorial flame link — preserved from production header */}
          <Link
            to="/memorial/saadia"
            style={{
              fontFamily: fonts.body,
              fontSize: "0.85rem",
              color: isTransparent ? "rgba(232,213,160,0.95)" : colors.goldDark,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              whiteSpace: "nowrap",
            }}
          >
            <Flame style={{ width: 14, height: 14 }} />
            לזכר סעדיה הי״ד
          </Link>
        </nav>

        {/* Actions — LEFT in RTL */}
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="חיפוש"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: "none",
              background: "transparent",
              color: isTransparent ? "rgba(255,255,255,0.85)" : colors.textMuted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isTransparent
                ? "rgba(255,255,255,0.12)"
                : "rgba(139,111,71,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Search style={{ width: 18, height: 18 }} />
          </button>
          <DarkModeToggle isTransparent={isTransparent} />
          <NotificationBell isTransparent={isTransparent} />
          <CartButton isTransparent={isTransparent} />
          <UserMenu isTransparent={isTransparent} />
          <button
            className="design-header-burger"
            onClick={() => {
              if (onSidebarToggle) onSidebarToggle();
              else setMobileOpen((v) => !v);
            }}
            aria-label="תפריט"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: "none",
              background: "transparent",
              color: isTransparent ? "rgba(255,255,255,0.85)" : colors.textMuted,
              cursor: "pointer",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mobileOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
          </button>
        </div>
      </div>

      {/* Mobile expand panel */}
      {mobileOpen && (
        <nav
          className="md:hidden"
          style={{
            background: "rgba(250,246,240,0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: `1px solid rgba(139,111,71,0.15)`,
            padding: "0.75rem 1rem 1rem",
          }}
        >
          {NAV_ITEMS.map(({ label, href }) => (
            <Link
              key={href}
              to={href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "block",
                fontFamily: fonts.body,
                fontSize: "0.95rem",
                color: colors.textMuted,
                padding: "0.65rem 0.75rem",
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              {label}
            </Link>
          ))}
          <Link
            to="/memorial/saadia"
            onClick={() => setMobileOpen(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: fonts.body,
              fontSize: "0.95rem",
              color: colors.goldDark,
              padding: "0.65rem 0.75rem",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            <Flame style={{ width: 16, height: 16 }} />
            לזכר סעדיה הי״ד
          </Link>
        </nav>
      )}

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      <style>{`
        .design-header-burger { display: inline-flex; }
        @media (min-width: 768px) {
          .design-header-burger { display: none !important; }
        }
      `}</style>
    </header>
  );
}

// Re-export gradients for callers that want to use them inline.
export { gradients };
