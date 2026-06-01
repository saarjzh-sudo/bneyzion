/**
 * DesignHeader — sandbox header for the v2 redesign.
 *
 * Visual chrome from `DesignPreviewHome`'s `DesignNavBar`, but wraps the real
 * production sub-components (UserMenu, CartButton, NotificationBell, GlobalSearch)
 * so the sandbox uses live functionality, not mocks.
 *
 * Behavior:
 *  - Sticky top, 96px tall.
 *  - When `transparentOnTop=true` AND scroll < 60px → transparent + bright logo.
 *  - Otherwise → parchment (cream warm rgba(250,246,240,0.92)) with backdrop-blur.
 *
 * Pages decide:
 *  - Home / pages with dark hero overlap → `transparentOnTop` + `overlapHero`
 *  - All other pages → solid (default)
 *
 * Search scope: סדרות, שיעורים, ספרים, נושאים — לא תוכן מורים.
 * סינון מורים נעשה ב-useGlobalSearch ע"י .not("audience_tags", "cs", '{"teachers"}').
 *
 * Dark mode הוסר בכוונה (2026-06-01) — הרקע cream warm תמידי.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, GraduationCap, Search } from "lucide-react";

import logoColor from "@/assets/logo-horizontal-color.png";
import UserMenu from "@/components/layout/UserMenu";
import CartButton from "@/components/cart/CartButton";
import NotificationBell from "@/components/layout/NotificationBell";
import GlobalSearch from "@/components/search/GlobalSearch";

import { colors, fonts, gradients, shadows } from "@/lib/designTokens";

// Nav items — updated 2026-05-27 per Saar (second pass):
// Order (RTL: first item = rightmost, closest to logo):
// אגף המורים | פרשת השבוע | הקורסים שלי | חנות | אודותינו | לזכר סעדיה (text-only, no flame icon)
const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "אגף המורים", href: "/teachers" },
  { label: "פרשת השבוע", href: "/parasha" },
  { label: "הקורסים שלי", href: "/design-my-courses" },
  { label: "חנות", href: "/store" },
  { label: "אודותינו", href: "/about" },
];

// Teacher-context nav: same items minus "אגף המורים" (replaced by the context chip)
const TEACHER_NAV_ITEMS: { label: string; href: string }[] = [
  { label: "פרשת השבוע", href: "/parasha" },
  { label: "חנות", href: "/store" },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Teacher-context mode: activate on /design-teachers-* routes
  const isTeacherContext = location.pathname.startsWith("/design-teachers-");
  const activeNavItems = isTeacherContext ? TEACHER_NAV_ITEMS : NAV_ITEMS;

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
        className="design-header-inner"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          // padding-right: 0 aligns the logo flush with the sidebar's right edge.
          // padding-left: 1rem gives breathing room on the actions (left) side.
          paddingInlineStart: "1rem",
          paddingInlineEnd: 0,
          height: 96,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}
      >
        {/* Logo — RIGHT in RTL — always logoColor (same asset on home + inner pages) */}
        <Link to="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <img
            src={logoColor}
            alt="בני ציון"
            className="h-16 md:h-20"
            style={{
              width: "auto",
              objectFit: "contain",
              transition: "all 0.3s ease",
            }}
          />
        </Link>

        {/* Nav — packed toward LEFT (flex-end in LTR = visual left in RTL direction).
             flex:1 + justifyContent:"flex-end" pushes nav items toward the left side,
             leaving empty space between the logo (right) and the nav cluster. */}
        <nav
          className="hidden md:flex"
          style={{
            gap: "1.25rem",
            alignItems: "center",
            flex: 1,
            justifyContent: "flex-end",
            flexWrap: "wrap",
            // נדחף מעט ימינה (לכיוון הלוגו) + מעט למטה לאיזון אסתטי (Saar 2026-06-01)
            transform: "translate(22px, 6px)",
          }}
        >
          {/* Teacher context chip — shown instead of the 4 hidden items */}
          {isTeacherContext && (
            <Link
              to="/design-teachers-wing-v2"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.35rem 0.9rem",
                borderRadius: "999px",
                background: location.pathname === "/design-teachers-wing-v2"
                  ? "#4A5A2E"
                  : "rgba(74,90,46,0.12)",
                color: location.pathname === "/design-teachers-wing-v2"
                  ? "#fff"
                  : "#4A5A2E",
                fontFamily: fonts.body,
                fontSize: "0.82rem",
                fontWeight: 700,
                textDecoration: "none",
                border: "1.5px solid rgba(74,90,46,0.35)",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              <GraduationCap style={{ width: 14, height: 14 }} />
              אגף המורים
            </Link>
          )}

          {activeNavItems.map(({ label, href }) => {
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
          {/* Memorial link — text only, no icon (per Saar 2026-05-27) */}
          <Link
            to="/memorial/saadia"
            style={{
              fontFamily: fonts.body,
              fontSize: "0.85rem",
              color: isTransparent ? "rgba(232,213,160,0.95)" : colors.goldDark,
              textDecoration: "none",
              whiteSpace: "nowrap",
              paddingBottom: 2,
              borderBottom: "1.5px solid transparent",
            }}
          >
            לזכר סעדיה הי״ד
          </Link>
        </nav>

        {/* Actions — LEFT in RTL */}
        <div
          className="design-header-actions"
          style={{
            display: "flex",
            gap: "0.25rem",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {/* Search trigger button */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="חיפוש (Ctrl+K)"
            title="חיפוש (Ctrl+K)"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: isTransparent ? "1px solid rgba(255,255,255,0.25)" : `1px solid rgba(139,111,71,0.2)`,
              background: isTransparent ? "rgba(255,255,255,0.08)" : "rgba(250,246,240,0.7)",
              color: isTransparent ? "rgba(255,255,255,0.85)" : colors.textMuted,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
          >
            <Search style={{ width: 18, height: 18 }} />
          </button>
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
              display: "block",
              fontFamily: fonts.body,
              fontSize: "0.95rem",
              color: colors.goldDark,
              padding: "0.65rem 0.75rem",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            לזכר סעדיה הי״ד
          </Link>
        </nav>
      )}

      <style>{`
        .design-header-burger { display: inline-flex; }
        @media (min-width: 768px) {
          .design-header-burger { display: none !important; }
        }
        /* Mobile: shrink header height from 96px to 64px */
        @media (max-width: 767px) {
          .design-header-inner {
            height: 64px !important;
            padding: 0 0.85rem !important;
          }
          /* Mobile: hide NotificationBell (2nd) and CartButton (3rd) to reduce clutter.
             Search (1st) stays visible. DarkModeToggle removed — no offset needed. */
          .design-header-actions > *:nth-child(2),
          .design-header-actions > *:nth-child(3) {
            display: none !important;
          }
        }
      `}</style>

      {/* GlobalSearch dialog — scope: סדרות, שיעורים, ספרים (ללא תוכן מורים) */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

// Re-export gradients for callers that want to use them inline.
export { gradients };
