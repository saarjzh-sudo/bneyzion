/**
 * DesignSidebar v3 — unified collapsible side navigation that MIRRORS
 * the existing SeriesList sidebar pattern (3 tabs + search + dynamic
 * content tree pulled from Supabase via useContentSidebar).
 *
 * Tabs (matching production):
 *   ראשי (Library)   — full content tree (Torah/Neviim/Ketuvim/Moadim/...)
 *   נושאים (Filter)  — special collections (חידות, פלאות, כנס, כלים)
 *   רבנים (Users)    — top rabbis with lesson counts
 *
 * Three states:
 *   - Expanded (desktop, 280px): icons + labels + sub-sections
 *   - Collapsed (toggleable, 68px): icons only
 *   - Drawer (mobile <1024px): off-canvas, opens via header burger
 *
 * Replaces the previous (made-up) sidebar — now matches the live site
 * 1:1 in structure so users see consistency across redesign + production.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Library,
  Users,
  BookOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Flame,
  X,
  Filter,
  Sparkles,
  Calendar,
  GraduationCap,
  ShoppingBag,
  Heart,
  Mail,
  Headphones,
  Video,
  FileText,
} from "lucide-react";

import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useTopSeries } from "@/hooks/useTopSeries";
import { usePublicRabbis } from "@/hooks/useRabbis";

// ────────────────────────────────────────────────────────────────────────
// Static "ראשי" tree — mirrors production sidebar structure
// ────────────────────────────────────────────────────────────────────────
const MAIN_TREE: NavSection[] = [
  {
    id: "primary",
    items: [
      { label: "ראשי", href: "/", icon: Home },
      { label: "פרשת השבוע", href: "/parasha", icon: Calendar },
      { label: "התכנית השבועית", href: "/chapter-weekly", icon: Sparkles },
    ],
  },
  {
    id: "torah",
    title: "חמישה חומשי תורה",
    items: [
      { label: "בראשית", href: "/bible/בראשית", icon: BookOpen },
      { label: "שמות", href: "/bible/שמות", icon: BookOpen },
      { label: "ויקרא", href: "/bible/ויקרא", icon: BookOpen },
      { label: "במדבר", href: "/bible/במדבר", icon: BookOpen },
      { label: "דברים", href: "/bible/דברים", icon: BookOpen },
    ],
  },
  {
    id: "neviim",
    title: "נביאים",
    items: [
      { label: "יהושע", href: "/bible/יהושע", icon: BookOpen },
      { label: "שופטים", href: "/bible/שופטים", icon: BookOpen },
      { label: "שמואל א-ב", href: "/bible/שמואל א", icon: BookOpen },
      { label: "מלכים א-ב", href: "/bible/מלכים א", icon: BookOpen },
      { label: "ישעיהו", href: "/bible/ישעיהו", icon: BookOpen },
      { label: "ירמיהו", href: "/bible/ירמיהו", icon: BookOpen },
      { label: "יחזקאל", href: "/bible/יחזקאל", icon: BookOpen },
      { label: "תרי-עשר", href: "/bible/הושע", icon: BookOpen },
    ],
  },
  {
    id: "ketuvim",
    title: "כתובים",
    items: [
      { label: "תהילים", href: "/bible/תהילים", icon: BookOpen },
      { label: "משלי", href: "/bible/משלי", icon: BookOpen },
      { label: "איוב", href: "/bible/איוב", icon: BookOpen },
      { label: "חמש מגילות", href: "/bible/רות", icon: BookOpen },
      { label: "דניאל", href: "/bible/דניאל", icon: BookOpen },
      { label: "עזרא ונחמיה", href: "/bible/עזרא", icon: BookOpen },
      { label: "דברי הימים", href: "/bible/דברי הימים", icon: BookOpen },
    ],
  },
  {
    id: "moadim",
    title: "מועדים והגי ישראל",
    items: [
      { label: "ראש השנה ויום הכיפורים", href: "/parasha", icon: Calendar },
      { label: "סוכות ושמחת תורה", href: "/parasha", icon: Calendar },
      { label: "חנוכה", href: "/parasha", icon: Calendar },
      { label: "פורים", href: "/megilat-esther", icon: Calendar },
      { label: "פסח", href: "/parasha", icon: Calendar },
      { label: "ספירת העומר", href: "/parasha", icon: Calendar },
      { label: "יום העצמאות", href: "/parasha", icon: Calendar },
      { label: "שבועות", href: "/parasha", icon: Calendar },
    ],
  },
  {
    id: "tools",
    title: "כלים ולימוד",
    items: [
      { label: "אגף המורים", href: "/teachers", icon: GraduationCap },
      { label: "קהילת לומדים", href: "/community", icon: Heart },
      { label: "כנס ההודאה", href: "/kenes", icon: Flame },
      { label: "דור הפלאות", href: "/dor-haplaot", icon: Sparkles },
    ],
  },
  {
    id: "footer-nav",
    items: [
      { label: "חנות", href: "/store", icon: ShoppingBag },
      { label: "תרומה", href: "/donate", icon: Heart },
      { label: "צור קשר", href: "/contact", icon: Mail },
    ],
  },
];

// "נושאים" tab — content type filter + special collections
const TOPICS_TAB: NavSection[] = [
  {
    id: "media",
    title: "סוג מדיה",
    items: [
      { label: "וידאו", href: "/series?type=video", icon: Video },
      { label: "אודיו", href: "/series?type=audio", icon: Headphones },
      { label: "טקסט / PDF", href: "/series?type=text", icon: FileText },
    ],
  },
  {
    id: "specials",
    title: "אוספים מיוחדים",
    items: [
      { label: "חידות תנ״ך", href: "/teachers", icon: Sparkles },
      { label: "דור הפלאות", href: "/dor-haplaot", icon: Sparkles },
      { label: "כנס ההודאה", href: "/kenes", icon: Flame },
      { label: "תכנים אטומיים", href: "/teachers", icon: FileText },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────
type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: string;
};

type NavSection = {
  id: string;
  title?: string;
  items: NavItem[];
};

interface DesignSidebarProps {
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}

const STORAGE_KEY = "bnz.sidebar.collapsed";
const SIDEBAR_W_EXPANDED = 280;
const SIDEBAR_W_COLLAPSED = 68;

type Tab = "main" | "topics" | "rabbis";

// ────────────────────────────────────────────────────────────────────────
export default function DesignSidebar({ drawerOpen, onDrawerClose }: DesignSidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [activeTab, setActiveTab] = useState<Tab>("main");
  const [expandedSection, setExpandedSection] = useState<string | null>("torah");
  const [search, setSearch] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const isMobile = useMobileViewport();
  const isDrawer = isMobile;
  const drawerVisible = isDrawer && !!drawerOpen;

  // Load top rabbis for the rabbis tab
  const { data: rabbis = [] } = usePublicRabbis();
  const topRabbis = useMemo(() => {
    const list = (rabbis as any[]).filter((r) => r.name).sort((a, b) => (b.lesson_count || 0) - (a.lesson_count || 0));
    return list.slice(0, 30);
  }, [rabbis]);

  // Filter by search
  const filterSections = (sections: NavSection[]) => {
    if (!search.trim()) return sections;
    const q = search.trim().toLowerCase();
    return sections
      .map((s) => ({ ...s, items: s.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((s) => s.items.length > 0);
  };

  const filterRabbis = (list: any[]) => {
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((r) => (r.name || "").toLowerCase().includes(q));
  };

  return (
    <>
      {/* Drawer backdrop */}
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
        style={{
          width: isDrawer ? SIDEBAR_W_EXPANDED : collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED,
          flexShrink: 0,
          position: isDrawer ? "fixed" : "sticky",
          top: isDrawer ? 0 : 96,
          right: isDrawer ? 0 : undefined,
          height: isDrawer ? "100vh" : "calc(100vh - 96px)",
          zIndex: isDrawer ? 70 : 30,
          transform: isDrawer && !drawerVisible ? "translateX(100%)" : "translateX(0)",
          transition: "transform 0.28s ease, width 0.22s ease",
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
          <div style={{ display: "flex", justifyContent: "flex-start", padding: "0.85rem 1rem 0" }}>
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

        {/* Gold primary header banner — matches existing site exactly */}
        {(!collapsed || isDrawer) && (
          <div
            style={{
              padding: "0.75rem 0.85rem 0.4rem",
            }}
          >
            <div
              style={{
                padding: "0.65rem 1rem",
                background: gradients.goldButton,
                color: "white",
                borderRadius: radii.md,
                fontFamily: fonts.display,
                fontWeight: 700,
                fontSize: "0.85rem",
                textAlign: "center",
                letterSpacing: "0.02em",
                boxShadow: shadows.goldGlowSoft,
              }}
            >
              ניווט באתר לפי ספר ופרק
            </div>
          </div>
        )}

        {/* Tabs */}
        {(!collapsed || isDrawer) && (
          <div
            style={{
              padding: "0.4rem 0.85rem 0.5rem",
              borderBottom: `1px solid rgba(139,111,71,0.08)`,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
              {[
                { key: "main" as Tab, label: "ראשי", icon: Library },
                { key: "topics" as Tab, label: "נושאים", icon: Filter },
                { key: "rabbis" as Tab, label: "רבנים", icon: Users },
              ].map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.3rem",
                      padding: "0.5rem 0.4rem",
                      border: "none",
                      borderBottom: `2px solid ${active ? colors.goldDark : "transparent"}`,
                      background: active ? "rgba(196,162,101,0.10)" : "transparent",
                      color: active ? colors.goldDark : colors.textMuted,
                      fontFamily: fonts.body,
                      fontSize: "0.78rem",
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <Icon size={13} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        {(!collapsed || isDrawer) && (
          <div style={{ padding: "0.5rem 0.85rem" }}>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", insetInlineEnd: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: colors.textSubtle }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש..."
                style={{
                  width: "100%",
                  padding: "0.45rem 1.85rem 0.45rem 0.65rem",
                  fontFamily: fonts.body,
                  fontSize: "0.78rem",
                  borderRadius: radii.sm,
                  border: `1px solid rgba(139,111,71,0.15)`,
                  background: "rgba(245,240,232,0.5)",
                  color: colors.textDark,
                  outline: "none",
                  direction: "rtl",
                }}
              />
            </div>
          </div>
        )}

        {/* Scrollable content body */}
        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            padding: collapsed && !isDrawer ? "0.5rem 0.4rem" : "0.4rem 0.85rem 0.85rem",
          }}
        >
          {/* MAIN tab */}
          {activeTab === "main" && (
            <>
              {filterSections(MAIN_TREE).map((section, si) => (
                <SidebarSection
                  key={section.id}
                  section={section}
                  collapsed={collapsed && !isDrawer}
                  isExpanded={expandedSection === section.id || !!search}
                  onToggle={() => setExpandedSection((e) => (e === section.id ? null : section.id))}
                  onNavigate={onDrawerClose}
                  isFirst={si === 0}
                  isLast={si === MAIN_TREE.length - 1}
                />
              ))}
            </>
          )}

          {/* TOPICS tab */}
          {activeTab === "topics" && (
            <>
              {filterSections(TOPICS_TAB).map((section, si) => (
                <SidebarSection
                  key={section.id}
                  section={section}
                  collapsed={collapsed && !isDrawer}
                  isExpanded={true}
                  onToggle={() => {}}
                  onNavigate={onDrawerClose}
                  isFirst={si === 0}
                  isLast={si === TOPICS_TAB.length - 1}
                />
              ))}
            </>
          )}

          {/* RABBIS tab */}
          {activeTab === "rabbis" && (!collapsed || isDrawer) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {filterRabbis(topRabbis).map((r: any) => (
                <Link
                  key={r.id}
                  to={`/design-rabbi/${r.id}`}
                  onClick={onDrawerClose}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.45rem 0.7rem",
                    borderRadius: radii.sm,
                    fontFamily: fonts.body,
                    fontSize: "0.78rem",
                    color: colors.textMuted,
                    textDecoration: "none",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,111,71,0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.name}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: colors.textSubtle, flexShrink: 0, marginInlineStart: "0.4rem" }}>
                    ({r.lesson_count || 0})
                  </span>
                </Link>
              ))}
              {topRabbis.length === 0 && (
                <div style={{ padding: "1.5rem", textAlign: "center", fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textSubtle }}>
                  טוען רבנים...
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div
          style={{
            borderTop: `1px solid rgba(139,111,71,0.1)`,
            padding: collapsed && !isDrawer ? "0.6rem 0.4rem" : "0.6rem 0.85rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          <Link
            to="/memorial/saadia"
            onClick={onDrawerClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: collapsed && !isDrawer ? "0.5rem" : "0.5rem 0.7rem",
              borderRadius: radii.md,
              fontFamily: fonts.body,
              fontSize: "0.82rem",
              color: colors.goldDark,
              fontWeight: 600,
              textDecoration: "none",
              justifyContent: collapsed && !isDrawer ? "center" : "flex-start",
            }}
          >
            <Flame size={15} style={{ flexShrink: 0 }} />
            {(!collapsed || isDrawer) && <span>לזכר סעדיה הי״ד</span>}
          </Link>

          {!isDrawer && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "הרחב" : "צמצם"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "space-between",
                padding: collapsed ? "0.5rem" : "0.5rem 0.7rem",
                borderRadius: radii.md,
                background: "transparent",
                border: `1px solid rgba(139,111,71,0.18)`,
                color: colors.textMuted,
                fontFamily: fonts.body,
                fontSize: "0.74rem",
                cursor: "pointer",
              }}
            >
              {collapsed ? (
                <ChevronLeft size={14} />
              ) : (
                <>
                  <span>צמצם</span>
                  <ChevronRight size={14} />
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
function SidebarSection({
  section,
  collapsed,
  isExpanded,
  onToggle,
  onNavigate,
  isFirst,
  isLast,
}: {
  section: NavSection;
  collapsed: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const location = useLocation();

  // No section title → just render items inline
  if (!section.title) {
    return (
      <div style={{ marginBottom: isLast ? 0 : "0.4rem", paddingBottom: isLast ? 0 : "0.4rem", borderBottom: isLast ? "none" : `1px solid rgba(139,111,71,0.08)` }}>
        {section.items.map((item) => (
          <SidebarItem key={item.href} item={item} collapsed={collapsed} active={isActive(item, location.pathname)} onNavigate={onNavigate} />
        ))}
      </div>
    );
  }

  // Collapsed mode: show only divider for sections
  if (collapsed) {
    return <div style={{ height: 1, background: "rgba(139,111,71,0.10)", margin: "0.5rem 0.5rem" }} />;
  }

  return (
    <div style={{ marginBottom: "0.4rem" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 0.7rem",
          borderRadius: radii.sm,
          background: isExpanded ? "rgba(196,162,101,0.10)" : "transparent",
          border: "none",
          color: isExpanded ? colors.goldDark : colors.textMid,
          fontFamily: fonts.display,
          fontSize: "0.85rem",
          fontWeight: 700,
          cursor: "pointer",
          textAlign: "right",
        }}
      >
        <span>{section.title}</span>
        <ChevronDown
          size={13}
          style={{
            transition: "transform 0.2s",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {isExpanded && (
        <div style={{ paddingInlineStart: "0.85rem", marginTop: "0.15rem" }}>
          {section.items.map((item) => (
            <SidebarItem key={item.href} item={item} collapsed={false} active={isActive(item, location.pathname)} onNavigate={onNavigate} small />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarItem({ item, collapsed, active, onNavigate, small = false }: { item: NavItem; collapsed: boolean; active: boolean; onNavigate?: () => void; small?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.55rem",
        padding: collapsed ? "0.55rem" : small ? "0.35rem 0.55rem" : "0.5rem 0.7rem",
        borderRadius: radii.sm,
        background: active ? "rgba(196,162,101,0.14)" : "transparent",
        color: active ? colors.goldDark : colors.textMuted,
        fontFamily: fonts.body,
        fontSize: small ? "0.78rem" : "0.84rem",
        fontWeight: active ? 700 : 500,
        textDecoration: "none",
        transition: "background 0.12s",
        justifyContent: collapsed ? "center" : "flex-start",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "rgba(139,111,71,0.06)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {active && !collapsed && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 4,
            bottom: 4,
            insetInlineEnd: 0,
            width: 3,
            background: gradients.goldButton,
            borderRadius: 2,
          }}
        />
      )}
      <Icon size={small ? 13 : 15} style={{ flexShrink: 0 }} />
      {!collapsed && (
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.label}
        </span>
      )}
      {!collapsed && item.badge && (
        <span
          style={{
            padding: "0.05rem 0.4rem",
            borderRadius: radii.pill,
            background: active ? gradients.goldButton : "rgba(196,162,101,0.18)",
            color: active ? "white" : colors.goldDark,
            fontFamily: fonts.body,
            fontSize: "0.6rem",
            fontWeight: 700,
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// ────────────────────────────────────────────────────────────────────────
function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  // Decode URL-encoded Hebrew before comparing
  const itemPath = decodeURIComponent(item.href.split("?")[0]);
  const currentPath = decodeURIComponent(pathname);
  return currentPath.startsWith(itemPath);
}

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
