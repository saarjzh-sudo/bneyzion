/**
 * DesignSidebar v4 — accordion tree pulled from Supabase via useContentSidebar.
 *
 * Mirrors the live SeriesList sidebar 1:1:
 *   - 3 accordion levels: Category → Book → Child (parasha/chapter)
 *   - 4th level: series list rendered inline on child click
 *   - No navigation to /bible/* — all interaction stays inside the sidebar
 *   - Tabs: ראשי / נושאים / רבנים / מורים
 *   - Gold primary banner + search + sticky
 *
 * Tabs: "main" | "topics" | "rabbis" | "teachers"
 * The "teachers" tab renders the same tree (same data) — future audience_tags
 * filter will be added once the DB column exists.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Library,
  Users,
  BookOpen,
  Search,
  ChevronRight,
  ChevronDown,
  Flame,
  X,
  Filter,
  Sparkles,
  GraduationCap,
  FolderOpen,
  Loader2,
  Heart,
  Home,
  CalendarDays,
} from "lucide-react";
import { TeacherContentBadge } from "@/components/ui/TeacherContentBadge";

import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useContentSidebar } from "@/hooks/useContentSidebar";
import type { SidebarCategory, ExtraSection } from "@/hooks/useContentSidebar";
import { usePublicRabbis } from "@/hooks/useRabbis";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// ────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "bnz.sidebar.collapsed";
const SIDEBAR_W_EXPANDED = 290;
const SIDEBAR_W_COLLAPSED = 68;

type Tab = "main" | "topics" | "rabbis" | "teachers";

// ────────────────────────────────────────────────────────────────────────
// Hook: series for a specific node ID (book or child)
function useSeriesForNodeLocal(nodeId: string | null) {
  return useQuery({
    queryKey: ["dsb-series", nodeId],
    queryFn: async () => {
      if (!nodeId) return [];
      const { data: descendants } = await supabase.rpc("get_series_descendant_ids", {
        root_id: nodeId,
      });
      const allIds = [nodeId, ...(descendants || []).map((d: { series_id: string }) => d.series_id)];
      const { data: series } = await supabase
        .from("series")
        .select("id, title, lesson_count, rabbi_id, audience_tags")
        .in("id", allIds)
        .gt("lesson_count", 0)
        .order("lesson_count", { ascending: false })
        .limit(80);
      if (!series || series.length === 0) return [];
      const rabbiIds = [...new Set(series.filter((s) => s.rabbi_id).map((s) => s.rabbi_id!))];
      let rabbiMap = new Map<string, string>();
      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase.from("rabbis").select("id, name").in("id", rabbiIds);
        rabbiMap = new Map(rabbis?.map((r) => [r.id, r.name]) || []);
      }
      return series.map((s) => ({
        id: s.id,
        title: s.title,
        lessonCount: s.lesson_count ?? 0,
        rabbiName: s.rabbi_id ? rabbiMap.get(s.rabbi_id) || null : null,
        audienceTags: (s.audience_tags as string[] | null) ?? null,
      }));
    },
    enabled: !!nodeId,
    staleTime: 1000 * 60 * 5,
  });
}

// ────────────────────────────────────────────────────────────────────────
interface DesignSidebarProps {
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}

export default function DesignSidebar({ drawerOpen, onDrawerClose }: DesignSidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [activeTab, setActiveTab] = useState<Tab>("main");
  const [search, setSearch] = useState("");

  // Accordion state (separate per tab so tabs don't clash)
  // Format: "categoryId" | "categoryId::bookId" | "categoryId::bookId::childId"
  const [expandedMain, setExpandedMain] = useState<Set<string>>(new Set(["torah"]));
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set(["torah"]));
  const [expandedExtras, setExpandedExtras] = useState<Set<string>>(new Set());

  // Which child node is showing its series list inline
  const [openSeriesNode, setOpenSeriesNode] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const isMobile = useMobileViewport();
  const isDrawer = isMobile;
  const drawerVisible = isDrawer && !!drawerOpen;

  const { categories, extraSections, rabbis, riddlesSeriesId, isLoading } = useContentSidebar();
  const { data: rabbisRaw = [] } = usePublicRabbis();

  const topRabbis = useMemo(() => {
    const list = (rabbisRaw as { id: string; name?: string; lesson_count?: number }[])
      .filter((r) => r.name)
      .sort((a, b) => (b.lesson_count || 0) - (a.lesson_count || 0));
    return list.slice(0, 30);
  }, [rabbisRaw]);

  // ── Helper: toggle a key in a Set ──
  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Search filter ──
  const matchesSearch = useCallback(
    (text: string) => !search.trim() || text.includes(search.trim()),
    [search]
  );

  const navigate = useNavigate();

  const handleSeriesClick = useCallback(
    (seriesId: string) => {
      onDrawerClose?.();
      navigate(`/series/${seriesId}`);
    },
    [navigate, onDrawerClose]
  );

  // ────────────────────────────────────────────────────────────────────────
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

        {/* Quick links — above the tree */}
        {(!collapsed || isDrawer) && (
          <div style={{ padding: "0.65rem 0.85rem 0.3rem" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                padding: "0.35rem",
                background: "rgba(196,162,101,0.07)",
                borderRadius: radii.md,
                border: `1px solid rgba(139,111,71,0.1)`,
              }}
            >
              {[
                { to: "/", label: "ראשי", icon: Home },
                { to: "/design-chapter-weekly", label: "תכנית הפרק השבועי", icon: CalendarDays },
              ].map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={onDrawerClose}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.38rem 0.6rem",
                    borderRadius: radii.sm,
                    fontFamily: fonts.body,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: colors.textMid,
                    textDecoration: "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(139,111,71,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Icon size={13} style={{ color: colors.goldDark, flexShrink: 0 }} />
                  {label}
                </Link>
              ))}
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 2 }}>
              {(
                [
                  { key: "main" as Tab, label: "ראשי", icon: Library },
                  { key: "topics" as Tab, label: "נושאים", icon: Filter },
                  { key: "rabbis" as Tab, label: "רבנים", icon: Users },
                  { key: "teachers" as Tab, label: "מורים", icon: GraduationCap },
                ] as const
              ).map((t) => {
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
              <Search
                style={{
                  position: "absolute",
                  insetInlineEnd: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 13,
                  height: 13,
                  color: colors.textSubtle,
                }}
              />
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

        {/* Scrollable nav */}
        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            padding: collapsed && !isDrawer ? "0.5rem 0.4rem" : "0.4rem 0.85rem 0.85rem",
          }}
        >
          {/* ═══ Loading skeleton ═══ */}
          {isLoading && (!collapsed || isDrawer) && (
            <div style={{ paddingTop: "0.5rem" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 28,
                    marginBottom: 4,
                    borderRadius: radii.sm,
                    background: "rgba(139,111,71,0.07)",
                    animation: "pulse 1.5s ease infinite",
                  }}
                />
              ))}
            </div>
          )}

          {/* ═══ MAIN tab — real accordion tree ═══ */}
          {activeTab === "main" && !isLoading && (
            <ContentTree
              categories={categories}
              extraSections={extraSections}
              riddlesSeriesId={riddlesSeriesId}
              expanded={expandedMain}
              expandedExtras={expandedExtras}
              onToggle={(key) => toggle(setExpandedMain, key)}
              onToggleExtra={(key) => toggle(setExpandedExtras, key)}
              openSeriesNode={openSeriesNode}
              onOpenSeriesNode={setOpenSeriesNode}
              onSeriesClick={handleSeriesClick}
              collapsed={collapsed && !isDrawer}
              search={search}
              matchesSearch={matchesSearch}
              onDrawerClose={onDrawerClose}
            />
          )}

          {/* ═══ TOPICS tab — extra sections only (no book tree) ═══ */}
          {activeTab === "topics" && !isLoading && (!collapsed || isDrawer) && (
            <TopicsTab
              extraSections={extraSections}
              expandedExtras={expandedExtras}
              onToggleExtra={(key) => toggle(setExpandedExtras, key)}
              openSeriesNode={openSeriesNode}
              onOpenSeriesNode={setOpenSeriesNode}
              onSeriesClick={handleSeriesClick}
              search={search}
              matchesSearch={matchesSearch}
            />
          )}

          {/* ═══ TEACHERS tab — same tree, teacher-context banner ═══ */}
          {activeTab === "teachers" && !isLoading && (!collapsed || isDrawer) && (
            <div>
              <div
                style={{
                  padding: "0.6rem 0.75rem",
                  marginBottom: "0.5rem",
                  borderRadius: radii.md,
                  background:
                    "linear-gradient(135deg, rgba(74,90,46,0.12) 0%, rgba(196,162,101,0.1) 100%)",
                  border: `1px solid rgba(74,90,46,0.2)`,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <GraduationCap size={14} style={{ color: colors.goldDark, flexShrink: 0 }} />
                <div>
                  <div
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      color: colors.textDark,
                    }}
                  >
                    תכנים למורים
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.body,
                      fontSize: "0.67rem",
                      color: colors.textMuted,
                      marginTop: "0.1rem",
                    }}
                  >
                    אותו עץ ניווט — סדרות לפי ספר
                  </div>
                </div>
              </div>
              <ContentTree
                categories={categories}
                extraSections={extraSections}
                riddlesSeriesId={riddlesSeriesId}
                expanded={expandedTeachers}
                expandedExtras={expandedExtras}
                onToggle={(key) => toggle(setExpandedTeachers, key)}
                onToggleExtra={(key) => toggle(setExpandedExtras, key)}
                openSeriesNode={openSeriesNode}
                onOpenSeriesNode={setOpenSeriesNode}
                onSeriesClick={handleSeriesClick}
                collapsed={false}
                search={search}
                matchesSearch={matchesSearch}
                onDrawerClose={onDrawerClose}
              />
            </div>
          )}

          {/* ═══ RABBIS tab ═══ */}
          {activeTab === "rabbis" && (!collapsed || isDrawer) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {topRabbis
                .filter((r) => !search.trim() || r.name?.includes(search.trim()))
                .map((r) => (
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
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(139,111,71,0.06)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        color: colors.textSubtle,
                        flexShrink: 0,
                        marginInlineStart: "0.4rem",
                      }}
                    >
                      ({(r as { lesson_count?: number }).lesson_count || 0})
                    </span>
                  </Link>
                ))}
              {topRabbis.length === 0 && (
                <div
                  style={{
                    padding: "1.5rem",
                    textAlign: "center",
                    fontFamily: fonts.body,
                    fontSize: "0.8rem",
                    color: colors.textSubtle,
                  }}
                >
                  טוען רבנים...
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Footer chrome — donate + memorial */}
        <div
          style={{
            borderTop: `1px solid rgba(139,111,71,0.1)`,
            padding: collapsed && !isDrawer ? "0.6rem 0.4rem" : "0.5rem 0.85rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
          }}
        >
          {/* תרומות */}
          <Link
            to="/design-donate"
            onClick={onDrawerClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.55rem",
              padding: collapsed && !isDrawer ? "0.45rem" : "0.45rem 0.7rem",
              borderRadius: radii.md,
              fontFamily: fonts.body,
              fontSize: "0.8rem",
              color: "white",
              fontWeight: 600,
              textDecoration: "none",
              justifyContent: collapsed && !isDrawer ? "center" : "flex-start",
              background: gradients.goldButton,
              boxShadow: shadows.goldGlowSoft,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Heart size={13} style={{ flexShrink: 0 }} />
            {(!collapsed || isDrawer) && <span>תרומות</span>}
          </Link>

          {/* לזכר סעדיה */}
          <Link
            to="/memorial/saadia"
            onClick={onDrawerClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: collapsed && !isDrawer ? "0.45rem" : "0.45rem 0.7rem",
              borderRadius: radii.md,
              fontFamily: fonts.body,
              fontSize: "0.78rem",
              color: colors.goldDark,
              fontWeight: 600,
              textDecoration: "none",
              justifyContent: collapsed && !isDrawer ? "center" : "flex-start",
            }}
          >
            <Flame size={14} style={{ flexShrink: 0 }} />
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
                <ChevronRight size={14} />
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
        .design-sidebar nav::-webkit-scrollbar { width: 5px; }
        .design-sidebar nav::-webkit-scrollbar-thumb {
          background: rgba(139,111,71,0.18);
          border-radius: 3px;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// ContentTree — the full 3-level (+ series) accordion tree
// ────────────────────────────────────────────────────────────────────────
interface ContentTreeProps {
  categories: SidebarCategory[];
  extraSections: ExtraSection[];
  riddlesSeriesId: string;
  expanded: Set<string>;
  expandedExtras: Set<string>;
  onToggle: (key: string) => void;
  onToggleExtra: (key: string) => void;
  openSeriesNode: string | null;
  onOpenSeriesNode: (id: string | null) => void;
  onSeriesClick: (id: string) => void;
  collapsed: boolean;
  search: string;
  matchesSearch: (t: string) => boolean;
  onDrawerClose?: () => void;
}

function ContentTree({
  categories,
  extraSections,
  riddlesSeriesId,
  expanded,
  expandedExtras,
  onToggle,
  onToggleExtra,
  openSeriesNode,
  onOpenSeriesNode,
  onSeriesClick,
  collapsed,
  search,
  matchesSearch,
  onDrawerClose,
}: ContentTreeProps) {
  if (collapsed) {
    // Collapsed mode: show category dividers only
    return (
      <div>
        {categories.map((cat) => (
          <div
            key={cat.id}
            style={{
              height: 1,
              background: "rgba(139,111,71,0.12)",
              margin: "0.5rem 0.5rem",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* פרשת השבוע — top link */}
      <Link
        to="/parasha"
        onClick={onDrawerClose}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 0.75rem",
          marginBottom: "0.25rem",
          borderRadius: radii.md,
          background: gradients.goldButton,
          color: "white",
          fontFamily: fonts.body,
          fontSize: "0.82rem",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        <span>פרשת השבוע</span>
        <ChevronRight size={13} />
      </Link>

      {/* איך לומדים — first extra section */}
      {extraSections
        .filter((s) => s.title.includes("איך לומדים"))
        .map((section) => (
          <ExtraSectionBlock
            key={section.id}
            section={section}
            isExpanded={expandedExtras.has(section.id)}
            onToggle={() => onToggleExtra(section.id)}
            openSeriesNode={openSeriesNode}
            onOpenSeriesNode={onOpenSeriesNode}
            onSeriesClick={onSeriesClick}
            matchesSearch={matchesSearch}
            variant="gold"
          />
        ))}

      {/* ─── תורה / נביאים / כתובים ─── */}
      {categories.map((cat) => {
        const catOpen = expanded.has(cat.id);
        const catVisible =
          !search.trim() ||
          cat.books.some(
            (b) =>
              matchesSearch(b.title) ||
              b.children.some((c) => matchesSearch(c.title))
          );
        if (!catVisible) return null;
        return (
          <div key={cat.id} style={{ marginBottom: "0.2rem" }}>
            <button
              onClick={() => onToggle(cat.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.5rem 0.75rem",
                borderRadius: radii.sm,
                background: catOpen ? "rgba(196,162,101,0.12)" : "rgba(139,111,71,0.06)",
                border: "none",
                color: catOpen ? colors.goldDark : colors.textMid,
                fontFamily: fonts.display,
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "right",
              }}
            >
              <span>{cat.title}</span>
              <ChevronDown
                size={13}
                style={{
                  transition: "transform 0.18s",
                  transform: catOpen ? "rotate(180deg)" : "rotate(0deg)",
                  color: catOpen ? colors.goldDark : colors.textSubtle,
                }}
              />
            </button>

            {catOpen && (
              <div style={{ paddingInlineStart: "0.5rem", paddingTop: "0.15rem" }}>
                {cat.books
                  .filter(
                    (b) =>
                      !search.trim() ||
                      matchesSearch(b.title) ||
                      b.children.some((c) => matchesSearch(c.title))
                  )
                  .map((book) => {
                    const bookKey = `${cat.id}::${book.id}`;
                    const bookOpen = expanded.has(bookKey);
                    return (
                      <div key={book.id} style={{ marginBottom: "0.1rem" }}>
                        <button
                          onClick={() => onToggle(bookKey)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.4rem 0.65rem",
                            borderRadius: radii.sm,
                            background: bookOpen
                              ? "rgba(196,162,101,0.09)"
                              : "transparent",
                            border: "none",
                            color: bookOpen ? colors.goldDark : colors.textMuted,
                            fontFamily: fonts.body,
                            fontSize: "0.82rem",
                            fontWeight: bookOpen ? 600 : 500,
                            cursor: "pointer",
                            textAlign: "right",
                          }}
                          onMouseEnter={(e) => {
                            if (!bookOpen)
                              e.currentTarget.style.background =
                                "rgba(139,111,71,0.05)";
                          }}
                          onMouseLeave={(e) => {
                            if (!bookOpen) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <BookOpen size={12} style={{ opacity: 0.6 }} />
                            {book.title}
                          </span>
                          {book.children.length > 0 && (
                            <ChevronDown
                              size={11}
                              style={{
                                transition: "transform 0.15s",
                                transform: bookOpen ? "rotate(180deg)" : "rotate(0deg)",
                                color: colors.textSubtle,
                              }}
                            />
                          )}
                        </button>

                        {bookOpen && (
                          <div
                            style={{
                              paddingInlineStart: "0.75rem",
                              paddingTop: "0.1rem",
                              paddingBottom: "0.2rem",
                            }}
                          >
                            {/* "כל השיעורים בספר/בחומש" */}
                            <button
                              onClick={() => {
                                const nodeId = book.id;
                                onOpenSeriesNode(openSeriesNode === `ALL::${nodeId}` ? null : `ALL::${nodeId}`);
                              }}
                              style={{
                                width: "100%",
                                textAlign: "right",
                                padding: "0.35rem 0.55rem",
                                marginBottom: "0.15rem",
                                borderRadius: radii.sm,
                                background:
                                  openSeriesNode === `ALL::${book.id}`
                                    ? gradients.goldButton
                                    : "rgba(196,162,101,0.10)",
                                border: "none",
                                color: openSeriesNode === `ALL::${book.id}` ? "white" : colors.goldDark,
                                fontFamily: fonts.body,
                                fontSize: "0.74rem",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              כל השיעורים {cat.title === "תורה" ? "בחומש" : "בספר"} {book.title}
                            </button>

                            {/* Inline series list for "כל" */}
                            {openSeriesNode === `ALL::${book.id}` && (
                              <SeriesInlineList
                                nodeId={book.id}
                                onSeriesClick={onSeriesClick}
                              />
                            )}

                            {/* Children (parshiot / chapters) */}
                            {book.children
                              .filter((c) => !search.trim() || matchesSearch(c.title))
                              .map((child) => {
                                const childKey = child.id;
                                const childOpen = openSeriesNode === childKey;
                                return (
                                  <div key={child.id}>
                                    <button
                                      onClick={() =>
                                        onOpenSeriesNode(childOpen ? null : childKey)
                                      }
                                      style={{
                                        width: "100%",
                                        textAlign: "right",
                                        padding: "0.32rem 0.55rem",
                                        borderRadius: radii.sm,
                                        background: childOpen
                                          ? "rgba(196,162,101,0.14)"
                                          : "transparent",
                                        border: "none",
                                        color: childOpen ? colors.goldDark : colors.textMuted,
                                        fontFamily: fonts.body,
                                        fontSize: "0.76rem",
                                        fontWeight: childOpen ? 600 : 400,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!childOpen)
                                          e.currentTarget.style.background =
                                            "rgba(139,111,71,0.05)";
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!childOpen)
                                          e.currentTarget.style.background = "transparent";
                                      }}
                                    >
                                      <span>{child.title}</span>
                                      <ChevronDown
                                        size={10}
                                        style={{
                                          transition: "transform 0.15s",
                                          transform: childOpen ? "rotate(180deg)" : "rotate(0deg)",
                                          color: colors.textSubtle,
                                          flexShrink: 0,
                                        }}
                                      />
                                    </button>
                                    {childOpen && (
                                      <SeriesInlineList
                                        nodeId={child.id}
                                        onSeriesClick={onSeriesClick}
                                      />
                                    )}
                                  </div>
                                );
                              })}

                            {/* חידות לילדים — only under Torah */}
                            {cat.title === "תורה" &&
                              book.title === "בראשית" /* show once under first book */ && (
                                <button
                                  onClick={() =>
                                    onOpenSeriesNode(
                                      openSeriesNode === riddlesSeriesId ? null : riddlesSeriesId
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    textAlign: "right",
                                    padding: "0.32rem 0.55rem",
                                    borderRadius: radii.sm,
                                    background:
                                      openSeriesNode === riddlesSeriesId
                                        ? "rgba(196,162,101,0.14)"
                                        : "transparent",
                                    border: "none",
                                    color:
                                      openSeriesNode === riddlesSeriesId
                                        ? colors.goldDark
                                        : colors.textMuted,
                                    fontFamily: fonts.body,
                                    fontSize: "0.76rem",
                                    fontWeight:
                                      openSeriesNode === riddlesSeriesId ? 600 : 400,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                    marginTop: "0.1rem",
                                  }}
                                >
                                  <Sparkles size={10} />
                                  חידות לילדים פ״ש
                                </button>
                              )}
                            {openSeriesNode === riddlesSeriesId && cat.title === "תורה" && (
                              <SeriesInlineList
                                nodeId={riddlesSeriesId}
                                onSeriesClick={onSeriesClick}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}

      {/* ─── Extra sections (מועדים, הפטרות, כלי עזר, ליווי ת"תים...) ─── */}
      {extraSections
        .filter((s) => !s.title.includes("איך לומדים"))
        .map((section) => (
          <ExtraSectionBlock
            key={section.id}
            section={section}
            isExpanded={expandedExtras.has(section.id)}
            onToggle={() => onToggleExtra(section.id)}
            openSeriesNode={openSeriesNode}
            onOpenSeriesNode={onOpenSeriesNode}
            onSeriesClick={onSeriesClick}
            matchesSearch={matchesSearch}
            variant="neutral"
          />
        ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// ExtraSectionBlock — collapsible section with children + inline series
// ────────────────────────────────────────────────────────────────────────
function ExtraSectionBlock({
  section,
  isExpanded,
  onToggle,
  openSeriesNode,
  onOpenSeriesNode,
  onSeriesClick,
  matchesSearch,
  variant,
}: {
  section: ExtraSection;
  isExpanded: boolean;
  onToggle: () => void;
  openSeriesNode: string | null;
  onOpenSeriesNode: (id: string | null) => void;
  onSeriesClick: (id: string) => void;
  matchesSearch: (t: string) => boolean;
  variant: "gold" | "neutral";
}) {
  const bg =
    variant === "gold"
      ? isExpanded
        ? "rgba(196,162,101,0.12)"
        : "rgba(196,162,101,0.07)"
      : isExpanded
      ? "rgba(139,111,71,0.08)"
      : "rgba(139,111,71,0.04)";

  const visible =
    !section.title ||
    matchesSearch(section.title) ||
    section.children.some((c) => matchesSearch(c.title));
  if (!visible) return null;

  return (
    <div style={{ marginBottom: "0.2rem" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.45rem 0.75rem",
          borderRadius: radii.sm,
          background: bg,
          border: "none",
          color: isExpanded ? colors.goldDark : colors.textMid,
          fontFamily: fonts.body,
          fontSize: "0.82rem",
          fontWeight: 600,
          cursor: "pointer",
          textAlign: "right",
        }}
      >
        <span>{section.title}</span>
        <ChevronDown
          size={12}
          style={{
            transition: "transform 0.15s",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            color: colors.textSubtle,
          }}
        />
      </button>

      {isExpanded && (
        <div style={{ paddingInlineStart: "0.75rem", paddingTop: "0.1rem" }}>
          {/* "הכל ב..." button */}
          <button
            onClick={() =>
              onOpenSeriesNode(
                openSeriesNode === `ALL::${section.id}` ? null : `ALL::${section.id}`
              )
            }
            style={{
              width: "100%",
              textAlign: "right",
              padding: "0.32rem 0.55rem",
              marginBottom: "0.1rem",
              borderRadius: radii.sm,
              background:
                openSeriesNode === `ALL::${section.id}`
                  ? "rgba(196,162,101,0.14)"
                  : "rgba(196,162,101,0.07)",
              border: "none",
              color: colors.goldDark,
              fontFamily: fonts.body,
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            הכל ב{section.title}
          </button>
          {openSeriesNode === `ALL::${section.id}` && (
            <SeriesInlineList nodeId={section.id} onSeriesClick={onSeriesClick} />
          )}

          {/* Children */}
          {section.children
            .filter((c) => matchesSearch(c.title))
            .map((child) => {
              const childOpen = openSeriesNode === child.id;
              return (
                <div key={child.id}>
                  <button
                    onClick={() => onOpenSeriesNode(childOpen ? null : child.id)}
                    style={{
                      width: "100%",
                      textAlign: "right",
                      padding: "0.32rem 0.55rem",
                      borderRadius: radii.sm,
                      background: childOpen ? "rgba(196,162,101,0.12)" : "transparent",
                      border: "none",
                      color: childOpen ? colors.goldDark : colors.textMuted,
                      fontFamily: fonts.body,
                      fontSize: "0.76rem",
                      fontWeight: childOpen ? 600 : 400,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onMouseEnter={(e) => {
                      if (!childOpen)
                        e.currentTarget.style.background = "rgba(139,111,71,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!childOpen) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span>{child.title}</span>
                    <ChevronDown
                      size={10}
                      style={{
                        transition: "transform 0.15s",
                        transform: childOpen ? "rotate(180deg)" : "rotate(0deg)",
                        color: colors.textSubtle,
                        flexShrink: 0,
                      }}
                    />
                  </button>
                  {childOpen && (
                    <SeriesInlineList nodeId={child.id} onSeriesClick={onSeriesClick} />
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// TopicsTab — shows extra sections as the "topics" view
// ────────────────────────────────────────────────────────────────────────
function TopicsTab({
  extraSections,
  expandedExtras,
  onToggleExtra,
  openSeriesNode,
  onOpenSeriesNode,
  onSeriesClick,
  matchesSearch,
}: {
  extraSections: ExtraSection[];
  expandedExtras: Set<string>;
  onToggleExtra: (key: string) => void;
  openSeriesNode: string | null;
  onOpenSeriesNode: (id: string | null) => void;
  onSeriesClick: (id: string) => void;
  search: string;
  matchesSearch: (t: string) => boolean;
}) {
  return (
    <div>
      {extraSections.map((section) => (
        <ExtraSectionBlock
          key={section.id}
          section={section}
          isExpanded={expandedExtras.has(section.id)}
          onToggle={() => onToggleExtra(section.id)}
          openSeriesNode={openSeriesNode}
          onOpenSeriesNode={onOpenSeriesNode}
          onSeriesClick={onSeriesClick}
          matchesSearch={matchesSearch}
          variant="neutral"
        />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// SeriesInlineList — fetches and renders series for a node, inline
// ────────────────────────────────────────────────────────────────────────
function SeriesInlineList({
  nodeId,
  onSeriesClick,
}: {
  nodeId: string;
  onSeriesClick: (id: string) => void;
}) {
  const { data: series = [], isLoading } = useSeriesForNodeLocal(nodeId);

  if (isLoading) {
    return (
      <div
        style={{
          padding: "0.5rem 0.55rem",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          color: colors.textSubtle,
          fontFamily: fonts.body,
          fontSize: "0.72rem",
        }}
      >
        <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
        טוען סדרות...
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div
        style={{
          padding: "0.4rem 0.55rem",
          color: colors.textSubtle,
          fontFamily: fonts.body,
          fontSize: "0.72rem",
        }}
      >
        אין סדרות
      </div>
    );
  }

  return (
    <div
      style={{
        paddingInlineStart: "0.4rem",
        paddingBottom: "0.2rem",
        borderInlineStart: `2px solid rgba(196,162,101,0.25)`,
        marginInlineStart: "0.3rem",
        marginBottom: "0.2rem",
      }}
    >
      {series.map((s) => (
        <button
          key={s.id}
          onClick={() => onSeriesClick(s.id)}
          title={s.rabbiName ? `${s.title} — ${s.rabbiName}` : s.title}
          style={{
            width: "100%",
            textAlign: "right",
            padding: "0.28rem 0.5rem",
            borderRadius: radii.sm,
            background: "transparent",
            border: "none",
            color: colors.textMuted,
            fontFamily: fonts.body,
            fontSize: "0.72rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            lineHeight: 1.4,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(139,111,71,0.06)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <FolderOpen size={11} style={{ flexShrink: 0, opacity: 0.6 }} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.title}
          </span>
          <TeacherContentBadge tags={(s as { audienceTags?: string[] | null }).audienceTags} variant="small" />
          {s.lessonCount > 0 && (
            <span
              style={{
                fontSize: "0.62rem",
                color: colors.textSubtle,
                flexShrink: 0,
                marginInlineStart: "0.2rem",
              }}
            >
              {s.lessonCount}
            </span>
          )}
        </button>
      ))}
    </div>
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
