/**
 * DesignMobileBottomNav — sandbox mobile bottom nav for the v2 redesign.
 *
 * Same 4-tab structure as production (Home / Search / Favorites / Menu)
 * but in the new parchment + gold language.
 */
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, Heart, Menu, X, Flame, Compass } from "lucide-react";

import GlobalSearch from "@/components/search/GlobalSearch";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { colors, fonts } from "@/lib/designTokens";

// Menu items mirror the desktop header exactly — single source of truth in
// src/config/navigation.ts (level 13 fix: this file used to hold a stale copy).
// רמה 13: useNavItems = הקונפיג + override נערך-מאדמין (copy.nav.items).
// "ראשי" is prepended locally: the drawer needs it, the desktop logo covers it.
import { useNavItems } from "@/hooks/useNavItems";

interface DesignMobileBottomNavProps {
  /** 7.7.2026 (הרב יואב, תמונה 2): פותח את סיידבר-הניווט (drawer). כשלא מסופק —
   *  כפתור 'ניווט' לא מוצג (עמודים בלי סיידבר). */
  onNavigatorOpen?: () => void;
}

export default function DesignMobileBottomNav({ onNavigatorOpen }: DesignMobileBottomNavProps = {}) {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // יואב 17.7: תפריט פתוח = הדף מאחור נעול, לא נגלל
  useBodyScrollLock(menuOpen);
  const siteNavItems = useNavItems();
  const NAV_ITEMS: { label: string; href: string }[] = [
    { label: "ראשי", href: "/" },
    ...siteNavItems,
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const tabBase: React.CSSProperties = {
    flex: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: 500,
    color: colors.textSubtle,
    textDecoration: "none",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    transition: "color 0.15s",
  };

  return (
    <>
      {menuOpen && (
        <div
          dir="rtl"
          className="md:hidden"
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
        >
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(45,31,14,0.5)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          />
          <nav
            style={{
              position: "absolute",
              bottom: 64,
              left: 0,
              right: 0,
              background: colors.parchment,
              borderTop: `1px solid rgba(139,111,71,0.15)`,
              padding: "0.75rem 1rem",
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            {NAV_ITEMS.map(({ label, href }) => (
              <Link
                key={href}
                to={href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "block",
                  padding: "0.7rem 0.85rem",
                  fontFamily: fonts.body,
                  fontSize: "0.95rem",
                  color: isActive(href) ? colors.goldDark : colors.textMuted,
                  fontWeight: isActive(href) ? 700 : 500,
                  borderRadius: 10,
                  textDecoration: "none",
                  background: isActive(href) ? "rgba(196,162,101,0.10)" : "transparent",
                  marginBottom: 2,
                }}
              >
                {label}
              </Link>
            ))}
            <Link
              to="/memorial/saadia"
              onClick={() => setMenuOpen(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.7rem 0.85rem",
                fontFamily: fonts.body,
                fontSize: "0.95rem",
                color: colors.goldDark,
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              <Flame style={{ width: 16, height: 16 }} />
              לזכר סעדיה הי״ד
            </Link>
          </nav>
        </div>
      )}

      <nav
        dir="rtl"
        className="design-mobile-bottom-nav"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          zIndex: 50,
          background: "rgba(250,246,240,0.95)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: `1px solid rgba(139,111,71,0.15)`,
          display: "flex",
          alignItems: "center",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <Link
          to="/"
          style={{
            ...tabBase,
            color: isActive("/") && !menuOpen ? colors.goldDark : colors.textSubtle,
          }}
        >
          <Home style={{ width: 20, height: 20 }} />
          <span>ראשי</span>
        </Link>

        <button
          onClick={() => setSearchOpen(true)}
          style={tabBase}
        >
          <Search style={{ width: 20, height: 20 }} />
          <span>חיפוש</span>
        </button>

        <Link
          to="/favorites"
          style={{
            ...tabBase,
            color: isActive("/favorites") && !menuOpen ? colors.goldDark : colors.textSubtle,
          }}
        >
          <Heart style={{ width: 20, height: 20 }} />
          <span>מועדפים</span>
        </Link>

        {/* ניווט — פותח את סיידבר הניווט (ספר ופרק / רבנים / נושאים). הרב יואב, תמונה 2. */}
        {onNavigatorOpen && (
          <button
            onClick={() => {
              setMenuOpen(false);
              onNavigatorOpen();
            }}
            style={tabBase}
            aria-label="פתיחת סיידבר הניווט"
          >
            <Compass style={{ width: 20, height: 20 }} />
            <span>ניווט</span>
          </button>
        )}

        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            ...tabBase,
            color: menuOpen ? colors.goldDark : colors.textSubtle,
          }}
        >
          {menuOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
          <span>תפריט</span>
        </button>
      </nav>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      <style>{`
        .design-mobile-bottom-nav { display: flex; }
        @media (min-width: 768px) {
          .design-mobile-bottom-nav { display: none !important; }
        }
      `}</style>
    </>
  );
}
