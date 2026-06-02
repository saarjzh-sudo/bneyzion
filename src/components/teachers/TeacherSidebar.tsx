/**
 * TeacherSidebar — sidebar for the Teachers Wing production pages.
 *
 * Structure mirrors DesignSidebar (3-tab + gold banner pattern)
 * but is scoped to teacher content only.
 *
 * Tabs:
 *   ספרים   — Torah / Nevi'im / Ketuvim accordion tree
 *   כלים    — tools sections (כלי עזר / מפות / ליווי ת"תים / איך מלמדים / חידות)
 *   יוצרים  — rabbis with teacher-tagged content
 *
 * Iron rules:
 *  - RTL logical CSS only (padding-inline-*, border-inline-*, inset-inline-*)
 *  - Gold primary banner required
 *  - Mobile: off-canvas drawer (RTL slide from right)
 *  - localStorage key: bnz.teacher-sidebar.collapsed
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Layers,
  Users,
  ChevronDown,
  ChevronLeft,
  Search,
  X,
  GraduationCap,
} from "lucide-react";
import { colors, fonts, radii, shadows } from "@/lib/designTokens";
import { useTeacherSidebar } from "@/hooks/useTeacherSidebar";
import { SUPABASE_URL_RUNTIME } from "@/integrations/supabase/client";

// ─── Helper: get anon key (same pattern as DesignPreviewTeachersWingV2) ──────
function getAnonKey(): string {
  return atob("ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CNmRtMTNabVY0WldseWRXVnNkMmwxYW5odUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpVMU5UTTFOelVzSW1WNGNDSTZNakE1TVRFeU9UVTNOWDAuVTVhZ0xrZjZqZkxVZzdVamZkblRKZmF2VXN4LWR5enhzMmZ4SmdXQXA4bw==");
}

// ─── Hook: content_type counts (real, full count) ────────────────────────────
// Counts ALL published teacher lessons per content_type. NO dedup, NO series_id
// filter: per Saar (2026-06-02), teacher content legitimately appears in many
// places ("מורים בתוך מורים") and null-series items are real content, not junk.
// PostgREST caps a single response at 1000 rows → must paginate via Range header.
interface ContentTypeCount { content_type: string; cnt: number; }

function useContentTypeCountsDeduped() {
  return useQuery<ContentTypeCount[]>({
    queryKey: ["teacher-sidebar-content-type-counts-v2"],
    queryFn: async () => {
      const anonKey = getAnonKey();
      const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
      const base = `${SUPABASE_URL_RUNTIME}/rest/v1/lessons?select=content_type&audience_tags=cs.%7Bteachers%7D&status=eq.published&content_type=not.is.null`;
      const map = new Map<string, number>();
      const PAGE = 1000;
      for (let start = 0; ; start += PAGE) {
        const resp = await fetch(base, {
          headers: { ...headers, Range: `${start}-${start + PAGE - 1}` },
        });
        if (!resp.ok) break;
        const rows: Array<{ content_type: string }> = await resp.json();
        for (const row of rows) {
          map.set(row.content_type, (map.get(row.content_type) || 0) + 1);
        }
        if (rows.length < PAGE) break; // last page reached
      }
      return Array.from(map.entries())
        .map(([content_type, cnt]) => ({ content_type, cnt }))
        .sort((a, b) => b.cnt - a.cnt);
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Constants ──────────────────────────────────────────────────────────────
const STORAGE_KEY   = "bnz.teacher-sidebar.collapsed";
const SIDEBAR_W_EXP = 280;
const SIDEBAR_W_COL = 64;

// ד2: tabs renamed — ספרים→ראשי, כלים→סוג תוכן, יוצרים unchanged
type Tab = "books" | "sogTochn" | "yotzrim";

// ─── useMobileViewport ───────────────────────────────────────────────────────
function useMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface TeacherSidebarProps {
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
  /** Active series ID for highlighting */
  activeSeriesId?: string;
  /** Active lesson ID for highlighting */
  activeLessonId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function TeacherSidebar({
  drawerOpen,
  onDrawerClose,
  activeSeriesId,
}: TeacherSidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [activeTab, setActiveTab] = useState<Tab>("books");
  const [search, setSearch] = useState("");
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set(["torah"]));
  // ד2: expandedTools kept for sogTochn accordion (content types don't expand, but pattern reused)
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [activeContentType, setActiveContentType] = useState<string | null>(null);

  const isMobile   = useMobileViewport();
  const isDrawer   = isMobile;
  const drawerVis  = isDrawer && !!drawerOpen;
  const navigate   = useNavigate();

  const { torahBooks, neviimBooks, ketuvimBooks, toolsSections, yotzrimRabbis, isLoading } =
    useTeacherSidebar();
  const contentTypesQ = useContentTypeCountsDeduped();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const matchSearch = useCallback(
    (text: string) => !search.trim() || text.includes(search.trim()),
    [search],
  );

  const toggleExpand = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    key: string,
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSeriesClick = useCallback(
    (seriesId: string) => {
      onDrawerClose?.();
      navigate(`/teachers/series/${seriesId}`);
    },
    [navigate, onDrawerClose],
  );

  const handleRabbiClick = useCallback(
    (rabbiId: string) => {
      onDrawerClose?.();
      navigate(`/rabbis/${rabbiId}`);
    },
    [navigate, onDrawerClose],
  );

  const sidebarW = isDrawer
    ? SIDEBAR_W_EXP
    : collapsed
      ? SIDEBAR_W_COL
      : SIDEBAR_W_EXP;

  // ─── Shared item style ─────────────────────────────────────────────────────
  const itemStyle = (active?: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.42rem 0.75rem",
    borderRadius: radii.sm,
    cursor: "pointer",
    background: active ? "rgba(139,111,71,0.10)" : "transparent",
    borderInlineStart: active ? `3px solid ${colors.goldDark}` : "3px solid transparent",
    color: active ? colors.goldDark : colors.textMuted,
    fontSize: "0.82rem",
    fontFamily: fonts.body,
    transition: "background 0.15s, color 0.15s",
    textAlign: "right" as const,
  });

  // ─── Render books accordion (shared between torah/neviim/ketuvim) ──────────
  const renderBookGroup = (
    label: string,
    groupKey: string,
    bookList: typeof torahBooks,
  ) => {
    const isGroupOpen = expandedBooks.has(groupKey);
    const visible = bookList.filter((b) => matchSearch(b.title));
    if (visible.length === 0) return null;

    return (
      <div key={groupKey}>
        {/* Group header */}
        <button
          onClick={() => toggleExpand(setExpandedBooks, groupKey)}
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.5rem 0.75rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: colors.textDark,
            fontFamily: fonts.display,
            fontSize: "0.85rem",
            fontWeight: 700,
          }}
        >
          <span>{label}</span>
          {isGroupOpen ? (
            <ChevronDown size={14} style={{ color: colors.goldDark }} />
          ) : (
            <ChevronLeft size={14} style={{ color: colors.textSubtle }} />
          )}
        </button>

        {isGroupOpen && (
          <div style={{ paddingInlineStart: "0.5rem" }}>
            {visible.map((book) => {
              const bookKey = `${groupKey}::${book.id}`;
              const isBookOpen = expandedBooks.has(bookKey);
              const hasChildren = book.children.length > 0;

              return (
                <div key={book.id}>
                  <button
                    onClick={() => {
                      if (hasChildren) {
                        toggleExpand(setExpandedBooks, bookKey);
                      } else {
                        handleSeriesClick(book.id);
                      }
                    }}
                    style={{
                      ...itemStyle(activeSeriesId === book.id),
                      width: "100%",
                      border: "none",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{book.title}</span>
                    {hasChildren &&
                      (isBookOpen ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronLeft size={12} />
                      ))}
                  </button>

                  {isBookOpen && hasChildren && (
                    <div style={{ paddingInlineStart: "0.75rem" }}>
                      {book.children
                        .filter((c) => matchSearch(c.title))
                        .map((child) => (
                          <button
                            key={child.id}
                            onClick={() => handleSeriesClick(child.id)}
                            style={{
                              ...itemStyle(activeSeriesId === child.id),
                              width: "100%",
                              border: "none",
                              fontSize: "0.78rem",
                            }}
                          >
                            {child.title}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─── Tab content ────────────────────────────────────────────────────────────
  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div style={{ padding: "1.5rem", textAlign: "center", color: colors.textSubtle, fontSize: "0.8rem" }}>
          טוען...
        </div>
      );
    }

    switch (activeTab) {
      case "books":
        return (
          <div>
            {renderBookGroup("תורה", "torah", torahBooks)}
            {renderBookGroup("נביאים", "neviim", neviimBooks)}
            {renderBookGroup("כתובים", "ketuvim", ketuvimBooks)}
            {torahBooks.length === 0 && neviimBooks.length === 0 && ketuvimBooks.length === 0 && (
              <div style={{ padding: "1rem 0.75rem", color: colors.textSubtle, fontSize: "0.8rem" }}>
                לא נמצאו ספרים
              </div>
            )}
          </div>
        );

      // ד2: "סוג תוכן" tab — content_type list with deduped counts
      case "sogTochn":
        if (contentTypesQ.isLoading) {
          return (
            <div style={{ padding: "1.5rem", textAlign: "center", color: colors.textSubtle, fontSize: "0.8rem" }}>
              טוען סוגי תוכן...
            </div>
          );
        }
        if (!contentTypesQ.data || contentTypesQ.data.length === 0) {
          return (
            <div style={{ padding: "1rem 0.75rem", color: colors.textSubtle, fontSize: "0.8rem" }}>
              לא נמצאו סוגי תוכן
            </div>
          );
        }
        return (
          <div style={{ padding: "0.25rem 0" }}>
            {/* "הכל" option */}
            <button
              onClick={() => setActiveContentType(null)}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.42rem 0.75rem",
                background: activeContentType === null ? "rgba(139,111,71,0.10)" : "transparent",
                border: "none",
                borderInlineStart: activeContentType === null ? `3px solid ${colors.goldDark}` : "3px solid transparent",
                cursor: "pointer",
                color: activeContentType === null ? colors.goldDark : colors.textMid,
                fontSize: "0.82rem",
                fontFamily: fonts.body,
                borderBottom: `1px solid rgba(139,111,71,0.06)`,
              }}
            >
              <span>הכל</span>
              <span style={{ fontSize: "0.72rem", color: colors.textSubtle }}>
                {contentTypesQ.data.reduce((s, c) => s + c.cnt, 0)}
              </span>
            </button>
            {contentTypesQ.data
              .filter((ct) => !search.trim() || ct.content_type.includes(search.trim()))
              .map((ct) => (
                <button
                  key={ct.content_type}
                  onClick={() => setActiveContentType(ct.content_type)}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.42rem 0.75rem",
                    background: activeContentType === ct.content_type ? "rgba(139,111,71,0.10)" : "transparent",
                    border: "none",
                    borderInlineStart: activeContentType === ct.content_type ? `3px solid ${colors.goldDark}` : "3px solid transparent",
                    cursor: "pointer",
                    color: activeContentType === ct.content_type ? colors.goldDark : colors.textMid,
                    fontSize: "0.82rem",
                    fontFamily: fonts.body,
                    borderBottom: `1px solid rgba(139,111,71,0.06)`,
                  }}
                >
                  <span>{ct.content_type}</span>
                  <span style={{ fontSize: "0.72rem", color: colors.textSubtle }}>{ct.cnt}</span>
                </button>
              ))}
          </div>
        );

      case "yotzrim":
        return (
          <div style={{ padding: "0.25rem 0" }}>
            {yotzrimRabbis
              .filter((r) => matchSearch(r.name))
              .map((rabbi) => (
                <button
                  key={rabbi.id}
                  onClick={() => handleRabbiClick(rabbi.id)}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.42rem 0.75rem",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: colors.textMid,
                    fontSize: "0.82rem",
                    fontFamily: fonts.body,
                    borderBottom: `1px solid rgba(139,111,71,0.06)`,
                  }}
                >
                  <span>{rabbi.name}</span>
                  <span style={{ fontSize: "0.72rem", color: colors.textSubtle }}>
                    {rabbi.lessonCount}
                  </span>
                </button>
              ))}
          </div>
        );
    }
  };

  // ─── Collapsed (icon-only) state ────────────────────────────────────────────
  if (!isDrawer && collapsed) {
    return (
      <aside
        dir="rtl"
        style={{
          width: SIDEBAR_W_COL,
          flexShrink: 0,
          position: "sticky",
          top: 96,
          height: "calc(100vh - 96px)",
          background: colors.parchment,
          borderInlineStart: `1px solid rgba(139,111,71,0.12)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "1rem",
          gap: "0.75rem",
          zIndex: 30,
          overflowY: "auto",
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          title="הרחב תפריט"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.5rem",
            borderRadius: radii.sm,
            color: colors.goldDark,
          }}
        >
          <GraduationCap size={22} />
        </button>
        {[
          { tab: "books" as Tab,    icon: <BookOpen size={18} />,  title: "ראשי" },
          { tab: "sogTochn" as Tab, icon: <Layers size={18} />,    title: "סוג תוכן" },
          { tab: "yotzrim" as Tab,  icon: <Users size={18} />,     title: "יוצרים" },
        ].map(({ tab, icon, title }) => (
          <button
            key={tab}
            onClick={() => { setCollapsed(false); setActiveTab(tab); }}
            title={title}
            style={{
              background: activeTab === tab ? "rgba(139,111,71,0.10)" : "none",
              border: "none",
              cursor: "pointer",
              padding: "0.5rem",
              borderRadius: radii.sm,
              color: activeTab === tab ? colors.goldDark : colors.textMuted,
            }}
          >
            {icon}
          </button>
        ))}
      </aside>
    );
  }

  // ─── Full sidebar ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Drawer backdrop */}
      {drawerVis && (
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
        style={{
          width: sidebarW,
          flexShrink: 0,
          position: isDrawer ? "fixed" : "sticky",
          top: isDrawer ? 0 : 96,
          insetInlineEnd: isDrawer ? 0 : undefined,
          height: isDrawer ? "100vh" : "calc(100vh - 96px)",
          zIndex: isDrawer ? 70 : 30,
          transform: isDrawer && !drawerVis ? "translateX(100%)" : "translateX(0)",
          transition: "transform 0.28s ease, width 0.22s ease",
          background: colors.parchment,
          borderInlineStart: `1px solid rgba(139,111,71,0.12)`,
          boxShadow: isDrawer && drawerVis ? shadows.card : "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Close button (drawer only) */}
        {isDrawer && (
          <div style={{ display: "flex", justifyContent: "flex-start", padding: "0.85rem 1rem 0" }}>
            <button
              onClick={onDrawerClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.4rem",
                color: colors.textMuted,
              }}
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Gold banner */}
        <div
          style={{
            background: `linear-gradient(135deg, ${colors.oliveDark}, ${colors.oliveMain})`,
            padding: collapsed ? "0.75rem 0" : "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: "0.5rem",
            flexShrink: 0,
          }}
        >
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <GraduationCap size={16} style={{ color: "#E8D5A0" }} />
              <span
                style={{
                  color: "#E8D5A0",
                  fontSize: "0.78rem",
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  lineHeight: 1.3,
                }}
              >
                ניווט באגף המורים לפי ספר
              </span>
            </div>
          )}
          {/* Collapse toggle (desktop only) */}
          {!isDrawer && (
            <button
              onClick={() => setCollapsed((v) => !v)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#E8D5A0",
                padding: "0.2rem",
                lineHeight: 0,
              }}
              title={collapsed ? "הרחב" : "כווץ"}
            >
              <ChevronLeft
                size={16}
                style={{
                  transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.22s",
                }}
              />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid rgba(139,111,71,0.15)`,
            flexShrink: 0,
          }}
        >
          {/* ד2: tabs renamed — ראשי / סוג תוכן / יוצרים */}
          {[
            { tab: "books" as Tab,    label: "ראשי",      icon: <BookOpen size={14} /> },
            { tab: "sogTochn" as Tab, label: "סוג תוכן",  icon: <Layers size={14} /> },
            { tab: "yotzrim" as Tab,  label: "יוצרים",    icon: <Users size={14} /> },
          ].map(({ tab, label, icon }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.2rem",
                padding: "0.6rem 0.25rem 0.5rem",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab
                  ? `2px solid ${colors.goldDark}`
                  : "2px solid transparent",
                cursor: "pointer",
                color: activeTab === tab ? colors.goldDark : colors.textSubtle,
                fontSize: "0.72rem",
                fontFamily: fonts.body,
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ padding: "0.6rem 0.75rem", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: colors.parchmentDark,
              border: `1px solid rgba(139,111,71,0.18)`,
              borderRadius: radii.sm,
              padding: "0.35rem 0.6rem",
            }}
          >
            <Search size={13} style={{ color: colors.textSubtle, flexShrink: 0 }} />
            <input
              type="text"
              placeholder="חיפוש..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                fontSize: "0.8rem",
                fontFamily: fonts.body,
                color: colors.textDark,
                direction: "rtl",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}
              >
                <X size={12} style={{ color: colors.textSubtle }} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: "2rem" }}>
          {renderTabContent()}
        </div>
      </aside>
    </>
  );
}
