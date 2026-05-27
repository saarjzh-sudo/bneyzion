/**
 * TeacherSidebar — sidebar for the Teachers Wing production pages.
 *
 * 3 tabs matching old site bneyzion.co.il/מאגר-עזרי-הלמידה/:
 *   ראשי      — Torah / Nevi'im / Ketuvim accordion tree
 *   סוג תוכן  — content type filters with lesson counts
 *   יוצרים    — split: רבנים / יוצרי תוכן with lesson counts
 *
 * Iron rules:
 *  - RTL logical CSS only
 *  - Gold/olive primary banner
 *  - Mobile: off-canvas drawer from right
 *  - localStorage key: bnz.teacher-sidebar.collapsed
 *
 * Selection callbacks:
 *  - onBookSelect(seriesId, title) — navigates to /teachers/series/:id
 *  - onContentTypeSelect(type)     — drives content area in TeachersWingPage
 *  - onCreatorSelect(creatorId, name) — drives content area in TeachersWingPage
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Tag,
  Users,
  ChevronDown,
  ChevronLeft,
  Search,
  X,
  GraduationCap,
  FileText,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { colors, fonts, radii, shadows } from "@/lib/designTokens";
import { useTeacherSidebar } from "@/hooks/useTeacherSidebar";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL_RUNTIME } from "@/integrations/supabase/client";

// ─── Constants ──────────────────────────────────────────────────────────────
const STORAGE_KEY   = "bnz.teacher-sidebar.collapsed";
const SIDEBAR_W_EXP = 300;
const SIDEBAR_W_COL = 64;

type Tab = "rashim" | "sogTochn" | "yotzrim";

// ─── Content type counts hook ────────────────────────────────────────────────
interface ContentTypeCount {
  content_type: string;
  cnt: number;
}

function getAnonKey(): string {
  return atob("ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CNmRtMTNabVY0WldseWRXVnNkMmwxYW5odUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpVMU5UTTFOelVzSW1WNGNDSTZNakE1TVRFeU9UVTNOWDAuVTVhZ0xrZjZqZkxVZzdVamZkblRKZmF2VXN4LWR5enhzMmZ4SmdXQXA4bw==");
}

function useContentTypeCounts() {
  return useQuery<ContentTypeCount[]>({
    queryKey: ["tw-sidebar-content-type-counts"],
    queryFn: async () => {
      const anonKey = getAnonKey();
      const url = `${SUPABASE_URL_RUNTIME}/rest/v1/lessons?select=content_type&audience_tags=cs.%7Bteachers%7D&status=eq.published&content_type=not.is.null&limit=20000`;
      const resp = await fetch(url, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      });
      if (!resp.ok) return [];
      const rows: Array<{ content_type: string }> = await resp.json();
      const map = new Map<string, number>();
      for (const row of rows) {
        if (row.content_type) {
          map.set(row.content_type, (map.get(row.content_type) || 0) + 1);
        }
      }
      return Array.from(map.entries())
        .map(([content_type, cnt]) => ({ content_type, cnt }))
        .sort((a, b) => b.cnt - a.cnt);
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Creators hook ────────────────────────────────────────────────────────────
interface CreatorEntry {
  id: string;
  name: string;
  entity_type: "rabbi" | "content_creator";
  cnt: number;
}

function useCreatorsByType() {
  return useQuery<CreatorEntry[]>({
    queryKey: ["tw-sidebar-creators-by-type"],
    queryFn: async () => {
      const { data: lessonRabbis } = await supabase
        .from("lessons")
        .select("rabbi_id")
        .contains("audience_tags", ["teachers"])
        .eq("status", "published")
        .not("rabbi_id", "is", null)
        .limit(20000);

      if (!lessonRabbis || lessonRabbis.length === 0) return [];

      const rabbiIdCount = new Map<string, number>();
      for (const row of lessonRabbis) {
        if (row.rabbi_id) {
          rabbiIdCount.set(row.rabbi_id, (rabbiIdCount.get(row.rabbi_id) || 0) + 1);
        }
      }

      const anonKey = getAnonKey();
      const rabbiIds = Array.from(rabbiIdCount.keys());
      const url = `${SUPABASE_URL_RUNTIME}/rest/v1/rabbis?select=id,name,entity_type&id=in.(${rabbiIds.join(",")})&limit=200`;
      const resp = await fetch(url, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      });
      if (!resp.ok) return [];
      const rabbisInfo: Array<{ id: string; name: string; entity_type: string | null }> = await resp.json();

      return rabbisInfo
        .map(r => ({
          id: r.id,
          name: r.name,
          entity_type: (r.entity_type === "content_creator" ? "content_creator" : "rabbi") as "rabbi" | "content_creator",
          cnt: rabbiIdCount.get(r.id) || 0,
        }))
        .sort((a, b) => b.cnt - a.cnt);
    },
    staleTime: 1000 * 60 * 10,
  });
}

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
export interface TeacherSidebarSelection {
  type: "book" | "content_type" | "creator";
  id: string;
  label: string;
}

interface TeacherSidebarProps {
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
  /** Active series ID for highlighting */
  activeSeriesId?: string;
  /** Called when user selects a book/content-type/creator — drives content area */
  onSelect?: (sel: TeacherSidebarSelection) => void;
  /** Currently selected item (for highlighting) */
  selection?: TeacherSidebarSelection | null;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function TeacherSidebar({
  drawerOpen,
  onDrawerClose,
  activeSeriesId,
  onSelect,
  selection,
}: TeacherSidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [activeTab, setActiveTab] = useState<Tab>("rashim");
  const [search, setSearch] = useState("");
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set(["torah"]));

  const isMobile   = useMobileViewport();
  const isDrawer   = isMobile;
  const drawerVis  = isDrawer && !!drawerOpen;
  const navigate   = useNavigate();

  const { torahBooks, neviimBooks, ketuvimBooks, isLoading } = useTeacherSidebar();
  const contentTypeQ = useContentTypeCounts();
  const creatorsQ    = useCreatorsByType();

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

  const handleBookSelect = useCallback(
    (seriesId: string, title: string) => {
      if (onSelect) {
        onSelect({ type: "book", id: seriesId, label: title });
      } else {
        // Default: navigate directly (series pages, lesson pages)
        onDrawerClose?.();
        navigate(`/teachers/series/${seriesId}`);
      }
    },
    [onSelect, onDrawerClose, navigate],
  );

  const handleContentTypeSelect = useCallback(
    (type: string) => {
      onSelect?.({ type: "content_type", id: type, label: type });
    },
    [onSelect],
  );

  const handleCreatorSelect = useCallback(
    (creatorId: string, name: string) => {
      onSelect?.({ type: "creator", id: creatorId, label: name });
    },
    [onSelect],
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

  // ─── Render books accordion ───────────────────────────────────────────────
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
              const isActive = selection?.type === "book" && selection.id === book.id
                || activeSeriesId === book.id;

              return (
                <div key={book.id}>
                  <button
                    onClick={() => {
                      if (hasChildren) {
                        toggleExpand(setExpandedBooks, bookKey);
                      } else {
                        handleBookSelect(book.id, book.title);
                      }
                    }}
                    style={{
                      ...itemStyle(isActive),
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
                            onClick={() => handleBookSelect(child.id, child.title)}
                            style={{
                              ...itemStyle(
                                (selection?.type === "book" && selection.id === child.id)
                                || activeSeriesId === child.id
                              ),
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
    switch (activeTab) {
      case "rashim":
        if (isLoading) {
          return (
            <div style={{ padding: "1.5rem", display: "flex", justifyContent: "center" }}>
              <Loader2 size={20} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
            </div>
          );
        }
        return (
          <div>
            {renderBookGroup("תורה",    "torah",   torahBooks)}
            {renderBookGroup("נביאים",  "neviim",  neviimBooks)}
            {renderBookGroup("כתובים",  "ketuvim", ketuvimBooks)}
            {torahBooks.length === 0 && neviimBooks.length === 0 && ketuvimBooks.length === 0 && (
              <div style={{ padding: "1rem 0.75rem", color: colors.textSubtle, fontSize: "0.8rem" }}>
                לא נמצאו ספרים
              </div>
            )}
          </div>
        );

      case "sogTochn":
        if (contentTypeQ.isLoading) {
          return (
            <div style={{ padding: "1.5rem", display: "flex", justifyContent: "center" }}>
              <Loader2 size={20} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
            </div>
          );
        }
        return (
          <div>
            {(contentTypeQ.data || [])
              .filter((ct) => matchSearch(ct.content_type))
              .map(({ content_type, cnt }) => {
                const isActive = selection?.type === "content_type" && selection.id === content_type;
                return (
                  <button
                    key={content_type}
                    onClick={() => handleContentTypeSelect(content_type)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "0.45rem 0.75rem",
                      background: isActive ? "rgba(74,90,46,0.12)" : "transparent",
                      border: "none",
                      borderInlineStart: isActive ? `3px solid ${colors.oliveDark}` : "3px solid transparent",
                      borderBottom: `1px solid rgba(139,111,71,0.06)`,
                      cursor: "pointer",
                      fontFamily: fonts.body,
                      fontSize: "0.8rem",
                      color: isActive ? colors.oliveDark : colors.textMid,
                      fontWeight: isActive ? 700 : 500,
                      textAlign: "right",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = "rgba(139,111,71,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span>{content_type}</span>
                    <span style={{
                      fontFamily: fonts.body,
                      fontSize: "0.75rem", /* P3 fix: was 0.68rem → 0.75rem (12px) minimum */
                      color: isActive ? colors.oliveDark : colors.textSubtle,
                      background: isActive ? "rgba(74,90,46,0.1)" : colors.parchmentDeep,
                      padding: "0.1rem 0.45rem",
                      borderRadius: radii.pill,
                      flexShrink: 0,
                    }}>
                      {cnt.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            {contentTypeQ.data?.length === 0 && (
              <div style={{ padding: "1rem 0.75rem", color: colors.textSubtle, fontSize: "0.8rem" }}>
                לא נמצאו סוגי תוכן
              </div>
            )}
          </div>
        );

      case "yotzrim": {
        if (creatorsQ.isLoading) {
          return (
            <div style={{ padding: "1.5rem", display: "flex", justifyContent: "center" }}>
              <Loader2 size={20} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} />
            </div>
          );
        }
        const all = creatorsQ.data || [];
        const rabbis = all.filter(c => c.entity_type === "rabbi");
        const contentCreators = all.filter(c => c.entity_type === "content_creator");

        const renderCreatorList = (list: CreatorEntry[], accentColor: string) =>
          list
            .filter((c) => matchSearch(c.name))
            .map((creator) => {
              const isActive = selection?.type === "creator" && selection.id === creator.id;
              return (
                <button
                  key={creator.id}
                  onClick={() => handleCreatorSelect(creator.id, creator.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "0.42rem 0.75rem",
                    background: isActive ? "rgba(139,111,71,0.08)" : "transparent",
                    border: "none",
                    borderInlineStart: isActive ? `3px solid ${accentColor}` : "3px solid transparent",
                    cursor: "pointer",
                    fontFamily: fonts.body,
                    fontSize: "0.8rem",
                    color: isActive ? accentColor : colors.textMid,
                    fontWeight: isActive ? 700 : 500,
                    textAlign: "right",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "rgba(139,111,71,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>{creator.name}</span>
                  <span style={{
                    fontFamily: fonts.body,
                    fontSize: "0.75rem", /* P3 fix: was 0.68rem → 0.75rem (12px) minimum */
                    color: colors.textSubtle,
                    flexShrink: 0,
                  }}>
                    {creator.cnt}
                  </span>
                </button>
              );
            });

        return (
          <div>
            {/* Rabbis section */}
            {rabbis.length > 0 && (
              <div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.6rem 0.75rem 0.4rem",
                  borderBottom: `1px solid rgba(139,111,71,0.15)`,
                  marginBottom: "0.2rem",
                }}>
                  <GraduationCap size={13} style={{ color: colors.goldDark, flexShrink: 0 }} />
                  <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.8rem", color: colors.textDark }}>
                    רבנים
                  </span>
                  <span style={{ fontFamily: fonts.body, fontSize: "0.75rem", /* P3 fix: was 0.68rem → 0.75rem (12px) minimum */ color: colors.textSubtle, marginInlineStart: "auto" }}>
                    ({rabbis.length})
                  </span>
                </div>
                {renderCreatorList(rabbis, colors.goldDark)}
              </div>
            )}

            {/* Content creators section */}
            {contentCreators.length > 0 && (
              <div style={{ marginTop: "0.75rem" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.6rem 0.75rem 0.4rem",
                  borderBottom: `1px solid rgba(139,111,71,0.15)`,
                  marginBottom: "0.2rem",
                }}>
                  <FileText size={13} style={{ color: colors.oliveDark, flexShrink: 0 }} />
                  <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.8rem", color: colors.textDark }}>
                    יוצרי תוכן
                  </span>
                  <span style={{ fontFamily: fonts.body, fontSize: "0.75rem", /* P3 fix: was 0.68rem → 0.75rem (12px) minimum */ color: colors.textSubtle, marginInlineStart: "auto" }}>
                    ({contentCreators.length})
                  </span>
                </div>
                {renderCreatorList(contentCreators, colors.oliveDark)}
              </div>
            )}

            {all.length === 0 && (
              <div style={{ padding: "1rem 0.75rem", color: colors.textSubtle, fontSize: "0.8rem" }}>
                לא נמצאו יוצרים
              </div>
            )}
          </div>
        );
      }
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
          { tab: "rashim" as Tab,   icon: <BookOpen size={18} />,  title: "ראשי" },
          { tab: "sogTochn" as Tab, icon: <Tag size={18} />,       title: "סוג תוכן" },
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
          visibility: isDrawer && !drawerVis ? "hidden" : "visible", /* P2: hide from hit-testing + prevent horizontal scroll trigger */
          transition: "transform 0.28s ease, width 0.22s ease, visibility 0s linear 0.28s",
          ...(isDrawer && drawerVis ? { transition: "transform 0.28s ease, width 0.22s ease, visibility 0s" } : {}),
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

        {/* Olive/green banner — Teachers Wing identity */}
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
                אגף המורים
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

        {/* 3 Tabs: ראשי / סוג תוכן / יוצרים */}
        {/* P1 fix: overflow-x scroll prevents tabs from overflowing 375px viewport */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid rgba(139,111,71,0.15)`,
            flexShrink: 0,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {[
            { tab: "rashim" as Tab,   label: "ראשי",      icon: <BookOpen size={13} /> },
            { tab: "sogTochn" as Tab, label: "סוג תוכן",  icon: <Tag size={13} /> },
            { tab: "yotzrim" as Tab,  label: "יוצרים",    icon: <Users size={13} /> },
          ].map(({ tab, label, icon }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: "1 0 auto",    /* P1: flex-shrink:0 prevents squashing below min-content */
                minWidth: "4.5rem",  /* P1: explicit minimum so each tab stays readable at 375px */
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.2rem",
                padding: "0.6rem 0.35rem 0.5rem",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab
                  ? `2px solid ${colors.goldDark}`
                  : "2px solid transparent",
                cursor: "pointer",
                color: activeTab === tab ? colors.goldDark : colors.textSubtle,
                fontSize: "0.75rem", /* P3 fix: was 0.68rem (10.9px) → 0.75rem (12px) WCAG minimum */
                fontFamily: fonts.body,
                transition: "color 0.15s, border-color 0.15s",
                scrollSnapAlign: "start",
                whiteSpace: "nowrap",
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
