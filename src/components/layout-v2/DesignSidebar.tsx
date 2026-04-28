/**
 * DesignSidebar — unified collapsible side navigation for the v2 redesign.
 *
 * Replaces the horizontal nav links in the header AND the secondary sidebar
 * on TeachersWing-style pages. One nav surface, RTL (so it sits on the
 * RIGHT edge), three states:
 *
 *   - Expanded (default desktop, width 280px): icons + labels + sub-sections
 *   - Collapsed (toggle by user, width 64px): icons only, hover to reveal
 *   - Drawer (mobile, width 280px overlay): hidden by default, opens via
 *     the header burger
 *
 * Collapsed state persists in localStorage. Active route highlighted with
 * a gold left-edge stripe and gold-tinted background.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Library,
  Users,
  BookOpen,
  Calendar,
  Sparkles,
  ShoppingBag,
  GraduationCap,
  Heart,
  Mail,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Flame,
  X,
  Trophy,
  PenTool,
  FileText,
  Puzzle,
  Music,
} from "lucide-react";

import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";

// ────────────────────────────────────────────────────────────────────────
// Sidebar nav structure — single source of truth
// ────────────────────────────────────────────────────────────────────────
type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<any>; // lucide icons have many extra props
  badge?: string;
  children?: NavItem[];
};

const NAV: { section?: string; items: NavItem[] }[] = [
  {
    section: undefined,
    items: [{ label: "ראשי", href: "/", icon: Home }],
  },
  {
    section: "תוכן",
    items: [
      { label: "סדרות", href: "/series", icon: Library, badge: "1,300+" },
      {
        label: "תנ״ך",
        href: "/bible/בראשית",
        icon: BookOpen,
        children: [
          { label: "בראשית", href: "/bible/בראשית", icon: BookOpen },
          { label: "שמות", href: "/bible/שמות", icon: BookOpen },
          { label: "ויקרא", href: "/bible/ויקרא", icon: BookOpen },
          { label: "במדבר", href: "/bible/במדבר", icon: BookOpen },
          { label: "דברים", href: "/bible/דברים", icon: BookOpen },
          { label: "נביאים", href: "/bible/יהושע", icon: BookOpen },
          { label: "כתובים", href: "/bible/תהילים", icon: BookOpen },
        ],
      },
      { label: "פרשת השבוע", href: "/parasha", icon: Calendar },
      { label: "התכנית השבועית", href: "/chapter-weekly", icon: Sparkles },
      { label: "רבנים", href: "/rabbis", icon: Users, badge: "200+" },
    ],
  },
  {
    section: "קהילה",
    items: [
      { label: "קהילת לומדים", href: "/community", icon: Heart },
      {
        label: "אגף המורים",
        href: "/teachers",
        icon: GraduationCap,
        children: [
          { label: "תכנים אטומיים", href: "/teachers#atomic", icon: PenTool },
          { label: "חידות", href: "/teachers#riddles", icon: Puzzle },
          { label: "קורסים", href: "/teachers#courses", icon: BookOpen },
          { label: "מאמרים", href: "/teachers#articles", icon: FileText },
          { label: "כלי הוראה", href: "/teachers#tools", icon: Music },
        ],
      },
      { label: "כנס ההודאה", href: "/kenes", icon: Trophy },
      { label: "דור הפלאות", href: "/dor-haplaot", icon: Sparkles },
    ],
  },
  {
    section: "חנות ותרומה",
    items: [
      { label: "חנות", href: "/store", icon: ShoppingBag },
      { label: "תרומה", href: "/donate", icon: Heart },
    ],
  },
  {
    section: "אודות",
    items: [
      { label: "אודותינו", href: "/about", icon: Info },
      { label: "צור קשר", href: "/contact", icon: Mail },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────
interface DesignSidebarProps {
  /** Forces drawer mode (used when triggered by mobile burger). */
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}

const STORAGE_KEY = "bnz.sidebar.collapsed";
const SIDEBAR_W_EXPANDED = 280;
const SIDEBAR_W_COLLAPSED = 68;

export default function DesignSidebar({ drawerOpen, onDrawerClose }: DesignSidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const isMobile = useMobileViewport();
  const isDrawer = isMobile;
  const drawerVisible = isDrawer && !!drawerOpen;

  return (
    <>
      {/* Drawer backdrop (mobile only) */}
      {drawerVisible && (
        <div
          onClick={onDrawerClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(45,31,14,0.55)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 60,
          }}
        />
      )}

      <aside
        dir="rtl"
        className="design-sidebar"
        data-collapsed={collapsed ? "1" : "0"}
        data-drawer={isDrawer ? "1" : "0"}
        data-drawer-open={drawerVisible ? "1" : "0"}
        style={{
          // Width
          width: isDrawer
            ? SIDEBAR_W_EXPANDED
            : collapsed
            ? SIDEBAR_W_COLLAPSED
            : SIDEBAR_W_EXPANDED,
          flexShrink: 0,
          // Position — drawer (mobile) is fixed; desktop is sticky
          position: isDrawer ? "fixed" : "sticky",
          top: isDrawer ? 0 : 96,
          right: isDrawer ? 0 : undefined,
          height: isDrawer ? "100vh" : "calc(100vh - 96px)",
          zIndex: isDrawer ? 70 : 30,
          // Visibility (drawer)
          transform: isDrawer && !drawerVisible ? "translateX(100%)" : "translateX(0)",
          transition: "transform 0.28s ease, width 0.22s ease",
          // Visuals
          background: colors.parchment,
          borderInlineStart: `1px solid rgba(139,111,71,0.12)`,
          boxShadow: isDrawer && drawerVisible ? "-8px 0 32px rgba(45,31,14,0.18)" : "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Drawer close button */}
        {isDrawer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              padding: "0.85rem 1rem 0",
            }}
          >
            <button
              onClick={onDrawerClose}
              aria-label="סגור"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "none",
                background: "rgba(139,111,71,0.08)",
                color: colors.textMuted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Scrollable nav body */}
        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            padding: collapsed && !isDrawer ? "0.85rem 0.5rem" : "0.85rem 0.85rem",
          }}
        >
          {NAV.map((group, gi) => (
            <div key={gi} style={{ marginBottom: gi === NAV.length - 1 ? 0 : "1.25rem" }}>
              {group.section && (!collapsed || isDrawer) && (
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.66rem",
                    fontWeight: 700,
                    color: colors.textSubtle,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    padding: "0.35rem 0.75rem 0.55rem",
                  }}
                >
                  {group.section}
                </div>
              )}
              {group.section && collapsed && !isDrawer && (
                <div
                  style={{
                    height: 1,
                    background: "rgba(139,111,71,0.12)",
                    margin: "0.5rem 0.5rem 0.6rem",
                  }}
                />
              )}
              {group.items.map((item) => (
                <SidebarItem
                  key={item.href}
                  item={item}
                  collapsed={collapsed && !isDrawer}
                  expanded={expandedItem === item.href}
                  onToggleExpand={() =>
                    setExpandedItem((e) => (e === item.href ? null : item.href))
                  }
                  onNavigate={onDrawerClose}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Footer: collapse toggle + memorial + toggle */}
        <div
          style={{
            borderTop: `1px solid rgba(139,111,71,0.1)`,
            padding: collapsed && !isDrawer ? "0.6rem 0.5rem" : "0.65rem 0.85rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <Link
            to="/memorial/saadia"
            onClick={onDrawerClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: collapsed && !isDrawer ? "0.55rem" : "0.55rem 0.75rem",
              borderRadius: radii.md,
              fontFamily: fonts.body,
              fontSize: "0.85rem",
              color: colors.goldDark,
              fontWeight: 600,
              textDecoration: "none",
              justifyContent: collapsed && !isDrawer ? "center" : "flex-start",
            }}
          >
            <Flame size={16} style={{ flexShrink: 0 }} />
            {(!collapsed || isDrawer) && <span>לזכר סעדיה הי״ד</span>}
          </Link>

          {!isDrawer && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "הרחב תפריט" : "צמצם תפריט"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                padding: collapsed ? "0.55rem" : "0.55rem 0.75rem",
                borderRadius: radii.md,
                background: "transparent",
                border: `1px solid rgba(139,111,71,0.18)`,
                color: colors.textMuted,
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                cursor: "pointer",
                justifyContent: collapsed ? "center" : "space-between",
              }}
            >
              {collapsed ? (
                <ChevronLeft size={16} />
              ) : (
                <>
                  <span>צמצם</span>
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          )}
        </div>
      </aside>

      <style>{`
        .design-sidebar nav::-webkit-scrollbar { width: 6px; }
        .design-sidebar nav::-webkit-scrollbar-thumb {
          background: rgba(139,111,71,0.18);
          border-radius: 3px;
        }
      `}</style>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
function SidebarItem({
  item,
  collapsed,
  expanded,
  onToggleExpand,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const Icon = item.icon;
  const isActive =
    item.href === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(item.href);
  const hasChildren = !!item.children?.length;

  return (
    <>
      <div style={{ position: "relative" }}>
        {isActive && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 4,
              bottom: 4,
              right: 0,
              width: 3,
              background: gradients.goldButton,
              borderRadius: 2,
            }}
          />
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <Link
            to={item.href}
            onClick={onNavigate}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
              padding: collapsed ? "0.6rem" : "0.6rem 0.75rem",
              borderRadius: radii.md,
              background: isActive ? "rgba(196,162,101,0.12)" : "transparent",
              color: isActive ? colors.goldDark : colors.textMid,
              fontFamily: fonts.body,
              fontSize: "0.9rem",
              fontWeight: isActive ? 700 : 500,
              textDecoration: "none",
              transition: "background 0.15s",
              justifyContent: collapsed ? "center" : "flex-start",
              minWidth: 0,
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = "rgba(139,111,71,0.06)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = "transparent";
            }}
            title={collapsed ? item.label : undefined}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            {!collapsed && (
              <>
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    style={{
                      padding: "0.1rem 0.45rem",
                      borderRadius: radii.pill,
                      background: isActive ? gradients.goldButton : "rgba(196,162,101,0.18)",
                      color: isActive ? "white" : colors.goldDark,
                      fontFamily: fonts.body,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
          {hasChildren && !collapsed && (
            <button
              onClick={onToggleExpand}
              aria-label={expanded ? "צמצם" : "הרחב"}
              style={{
                width: 28,
                height: 28,
                marginInlineStart: 4,
                borderRadius: radii.sm,
                border: "none",
                background: "transparent",
                color: colors.textSubtle,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ChevronDown
                size={14}
                style={{
                  transition: "transform 0.2s",
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
          )}
        </div>
      </div>

      {hasChildren && expanded && !collapsed && (
        <div
          style={{
            paddingInlineStart: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.15rem",
            marginTop: "0.15rem",
          }}
        >
          {item.children!.map((child) => {
            const ChildIcon = child.icon;
            const childActive = location.pathname === child.href;
            return (
              <Link
                key={child.href}
                to={child.href}
                onClick={onNavigate}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.55rem",
                  padding: "0.4rem 0.75rem",
                  borderRadius: radii.sm,
                  background: childActive ? "rgba(196,162,101,0.10)" : "transparent",
                  color: childActive ? colors.goldDark : colors.textMuted,
                  fontFamily: fonts.body,
                  fontSize: "0.82rem",
                  fontWeight: childActive ? 700 : 500,
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  if (!childActive) e.currentTarget.style.background = "rgba(139,111,71,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (!childActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <ChildIcon size={14} />
                <span>{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
function useMobileViewport() {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  });
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}
