/**
 * DesignSidebar v5 — accordion tree pulled from Supabase via useContentSidebar.
 *
 * v5 changes (2026-06-02):
 *   - Removed all SeriesInlineList rendering from ContentTree and ExtraSectionBlock.
 *     Instead every node click navigates to a full page:
 *       book title / chevron  →  toggle accordion (+ navigate to /category/:id on text click)
 *       "כל השיעורים ב-X"    →  navigate('/category/:bookId')
 *       child (parasha/ch.)  →  navigate('/series/:childId')
 *       extra section child  →  navigate('/series/:childId')
 *       "הכל ב..." button    →  navigate('/category/:sectionId')
 *       חידות לילדים        →  navigate('/series/:riddlesId')
 *     "כל השיעורים ב-X" is hidden when the book has only 1 child (no need for
 *     a category overview when there is exactly one sub-series).
 *
 * Mirrors the live SeriesList sidebar 1:1:
 *   - 3 accordion levels: Category → Book → Child (parasha/chapter)
 *   - Tabs: ראשי / נושאים / רבנים
 *   - Gold primary banner + search + sticky
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
  ChevronLeft,
  Flame,
  X,
  Filter,
  Sparkles,
  GraduationCap,
  Heart,
  Home,
  CalendarDays,
  Headphones,
  BookOpenText,
  FileText,
  Telescope,
  Tag,
} from "lucide-react";

import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useContentSidebar } from "@/hooks/useContentSidebar";
import type { SidebarCategory, ExtraSection } from "@/hooks/useContentSidebar";
import { usePublicRabbis } from "@/hooks/useRabbis";
import { useTopicsSidebar } from "@/hooks/useTopicsSidebar";
import type { TopicSidebarItem } from "@/hooks/useTopicsSidebar";
import { useBasicThemesSidebar } from "@/hooks/useBasicThemesSidebar";
import type { BasicThemeItem } from "@/hooks/useBasicThemesSidebar";
import { useLearningStyleTopics } from "@/hooks/useLearningStyleTopics";
import type { LearningStyleTopic } from "@/hooks/useLearningStyleTopics";
import RolePanel from "@/components/auth/RolePanel";

// ────────────────────────────────────────────────────────────────────────
// bookAliasLabel — produce the old-site-exact "כל השיעורים ב..." label per book.
// Rules (scraped from old_sidebar_tree.json):
//   Torah chumashim → "כל השיעורים בחומש X"
//   Megillot (איכה, קהלת) → "כל השיעורים במגילת X"
//   Esther → "כל השיעורים על מגילת X"
//   Daniel → "כל התכנים בספר X"
//   Ezra+Nehemia (combined) → "כל עזרא ונחמיה"
//   Everything else → "כל השיעורים בספר X"
// Books whose old-site sidebar had NO "כל השיעורים" alias row at all
const BOOKS_WITHOUT_ALIAS = new Set(["איוב", "שיר השירים", "אסתר"]);

// Nested section children that DID have a "כל ..." alias row on the old site
const NESTED_WITH_ALIAS = new Set(["הפטרות המועדים"]);

function bookAliasLabel(catTitle: string, bookTitle: string): string {
  if (catTitle === "תורה") return `כל השיעורים בחומש ${bookTitle}`;
  if (bookTitle === "איכה" || bookTitle === "קהלת") return `כל השיעורים במגילת ${bookTitle}`;
  if (bookTitle === "אסתר") return `כל השיעורים על מגילת ${bookTitle}`;
  if (bookTitle === "דניאל") return `כל התכנים בספר ${bookTitle}`;
  if (bookTitle === "עזרא ונחמיה") return `כל עזרא ונחמיה`;
  return `כל השיעורים בספר ${bookTitle}`;
}

// sectionAliasLabel — exact old-site alias wording per section; null = old site had NO alias row.
const SECTION_ALIAS: Record<string, string | null> = {
  'נושאים כלליים בתנ"ך': "כל השיעורים בנושאים הכלליים",
  "מועדים": "כל השיעורים על המועדים",
  'ימי עיון בתנ"ך': "כל השיעורים מימי עיון בתנך",
  "הפטרות": null,
  "כלי עזר - טבלאות זמני המאורעות ומפות": null,
  'ליווי ת"תים': null,
  'פרוייקט התנ"ך המוקלט - מתעדכן': null,
};

const STORAGE_KEY = "bnz.sidebar.collapsed";
const SIDEBAR_W_EXPANDED = 290;
const SIDEBAR_W_COLLAPSED = 68;
// R6 6.7.2026: synthetic key for the "תכנים מיוחדים" accordion group (not a real series id,
// so it can safely share the expandedExtras Set with real section UUIDs).
const SPECIAL_CONTENT_KEY = "__special-content__";

type Tab = "main" | "topics" | "rabbis";

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
  const [expandedMain, setExpandedMain] = useState<Set<string>>(new Set(["torah"]));
  const [expandedExtras, setExpandedExtras] = useState<Set<string>>(new Set());
  // R7 6.7.2026: "עוד נושאים" (the pre-existing 126-topic full list) collapsed by default —
  // the curated 40 "נושאים בסיסיים" show first/prominent per Rav Yoav's request.
  const [showMoreTopics, setShowMoreTopics] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const isMobile = useMobileViewport();
  const isDrawer = isMobile;
  const drawerVisible = isDrawer && !!drawerOpen;

  const { categories, extraSections, riddlesSeriesId, isLoading } = useContentSidebar();
  const { data: rabbisRaw = [] } = usePublicRabbis();
  const { data: thematicTopics = [], isLoading: topicsLoading } = useTopicsSidebar();
  const { data: basicThemes = [], isLoading: basicThemesLoading } = useBasicThemesSidebar();
  // רמה 20 (יואב 16.7): תגיות אופי-הלימוד שיואב מסמן באדמין (topics.is_learning_style)
  const { data: learningStyleTopics = [] } = useLearningStyleTopics();

  // רמה 20 (יואב 16.7 14:15): מיון רשימת הנושאים — לפי כמות תכנים (ברירת-מחדל) / א-ב
  type TopicSort = "count" | "alpha";
  const [topicSort, setTopicSort] = useState<TopicSort>("count");
  const sortTopicList = useCallback(
    <T extends { name: string; lessonCount: number }>(list: T[]): T[] =>
      [...list].sort((a, b) =>
        topicSort === "alpha"
          ? a.name.localeCompare(b.name, "he")
          : b.lessonCount - a.lessonCount || a.name.localeCompare(b.name, "he")
      ),
    [topicSort]
  );
  const sortedBasicThemes = useMemo(() => sortTopicList(basicThemes), [basicThemes, sortTopicList]);
  const sortedThematicTopics = useMemo(
    () => sortTopicList(thematicTopics),
    [thematicTopics, sortTopicList]
  );

  // §2.7: full rabbi list — old sidebar showed ~153 rabbis; cap-30 was a known regression (R-SB2).
  // 7.7.2026 (הרב יואב, הערה ב-2): מיון ברירת-מחדל = לפי מספר שיעורים, עם בורר 3 מיונים:
  // כמות שיעורים / א-ב / דומיננטיות גולשים (views_total — יתמלא כשמעקב-צפיות יצטבר;
  // עד אז שובר-שוויון לפי שיעורים כדי שלא ייראה שרירותי).
  type RabbiSort = "lessons" | "alpha" | "views";
  const [rabbiSort, setRabbiSort] = useState<RabbiSort>("lessons");
  const topRabbis = useMemo(() => {
    const list = (rabbisRaw as {
      id: string; slug?: string; name?: string; lesson_count?: number; views_total?: number;
    }[]).filter((r) => r.name);
    switch (rabbiSort) {
      case "alpha":
        return list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "he"));
      case "views":
        return list.sort(
          (a, b) =>
            (b.views_total ?? 0) - (a.views_total ?? 0) ||
            (b.lesson_count ?? 0) - (a.lesson_count ?? 0)
        );
      default:
        return list.sort((a, b) => (b.lesson_count ?? 0) - (a.lesson_count ?? 0));
    }
  }, [rabbisRaw, rabbiSort]);

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

  const handleNavigate = useCallback(
    (path: string) => {
      onDrawerClose?.();
      navigate(path);
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

        {/* R6 6.7.2026 (Saar): the 3-link quick-box above the tabs was removed.
            The sidebar now starts directly at the tabs. Its 3 links relocated:
            - "ניווט באתר לפי ספר ופרק" (/bible) → gold button at the top of the "ראשי" tree (below).
            - "פרשת השבוע" (/parasha) → stays as the existing top gold link inside the tree.
            - "איך לומדים תנ״ך" (/category/...) → stays as a tree item inside "ראשי" (below תורה/נביאים/כתובים). */}

        {/* Search removed from sidebar — R3 15.6.2026 (Saar). The `search` state stays
            inert (always ""), so matchesSearch is a no-op and the tree shows everything. */}

        {/* Tabs */}
        {(!collapsed || isDrawer) && (
          <div
            style={{
              padding: "0.4rem 0.85rem 0.5rem",
              borderBottom: `1px solid rgba(139,111,71,0.08)`,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
              {(
                [
                  { key: "main" as Tab, label: "ראשי", icon: Library },
                  { key: "rabbis" as Tab, label: "רבנים", icon: Users },
                  { key: "topics" as Tab, label: "נושאים בתנ״ך", icon: Filter },
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
              learningStyleTopics={learningStyleTopics}
              expanded={expandedMain}
              expandedExtras={expandedExtras}
              onToggle={(key) => toggle(setExpandedMain, key)}
              onToggleExtra={(key) => toggle(setExpandedExtras, key)}
              collapsed={collapsed && !isDrawer}
              search={search}
              matchesSearch={matchesSearch}
              onNavigate={handleNavigate}
            />
          )}

          {/* ═══ TOPICS tab — curated 40 "נושאים בסיסיים" (Rav Yoav, 5.7.2026) first,
                then the pre-existing 126-topic full taxonomy below, collapsed by default ═══ */}
          {activeTab === "topics" && (!collapsed || isDrawer) && (
            <>
              {/* בורר מיון (הרב יואב 16.7): כמות תכנים (ברירת-מחדל) / א-ב */}
              <div
                style={{ display: "flex", gap: 4, padding: "0.15rem 0.45rem 0.45rem" }}
                role="group"
                aria-label="מיון רשימת הנושאים"
              >
                {(
                  [
                    { key: "count", label: "לפי כמות תכנים" },
                    { key: "alpha", label: "א-ב" },
                  ] as { key: typeof topicSort; label: string }[]
                ).map((opt) => {
                  const active = topicSort === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setTopicSort(opt.key)}
                      aria-pressed={active}
                      style={{
                        flex: 1,
                        border: `1px solid ${active ? colors.goldDark : "rgba(139,111,71,0.25)"}`,
                        background: active ? "rgba(196,162,101,0.14)" : "transparent",
                        color: active ? colors.goldDark : colors.textSubtle,
                        fontFamily: fonts.body,
                        fontSize: "0.68rem",
                        fontWeight: active ? 700 : 500,
                        borderRadius: 999,
                        padding: "0.28rem 0.3rem",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <TopicsTab
                topics={sortedBasicThemes}
                isLoading={basicThemesLoading}
                search={search}
                matchesSearch={matchesSearch}
                onNavigate={handleNavigate}
              />

              {!search.trim() && (
                <button
                  onClick={() => setShowMoreTopics((v) => !v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    marginTop: "0.6rem",
                    padding: "0.5rem 0.7rem",
                    borderRadius: radii.sm,
                    border: `1px solid rgba(139,111,71,0.15)`,
                    background: "rgba(139,111,71,0.04)",
                    cursor: "pointer",
                    fontFamily: fonts.body,
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    color: colors.textMuted,
                  }}
                >
                  <span>עוד נושאים</span>
                  {showMoreTopics ? <ChevronDown size={13} /> : <ChevronLeft size={13} />}
                </button>
              )}

              {(showMoreTopics || search.trim()) && (
                <div style={{ marginTop: "0.4rem" }}>
                  <TopicsTab
                    topics={sortedThematicTopics}
                    isLoading={topicsLoading}
                    search={search}
                    matchesSearch={matchesSearch}
                    onNavigate={handleNavigate}
                  />
                </div>
              )}
            </>
          )}

          {/* ═══ RABBIS tab ═══ */}
          {activeTab === "rabbis" && (!collapsed || isDrawer) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {/* בורר מיון (הרב יואב 7.7.2026): שיעורים (ברירת-מחדל) / א-ב / צפיות */}
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  padding: "0.15rem 0.45rem 0.45rem",
                }}
                role="group"
                aria-label="מיון רשימת הרבנים"
              >
                {(
                  [
                    { key: "lessons", label: "לפי שיעורים" },
                    { key: "alpha", label: "א-ב" },
                    { key: "views", label: "לפי צפיות" },
                  ] as { key: typeof rabbiSort; label: string }[]
                ).map((opt) => {
                  const active = rabbiSort === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setRabbiSort(opt.key)}
                      aria-pressed={active}
                      style={{
                        flex: 1,
                        border: `1px solid ${active ? colors.goldDark : "rgba(139,111,71,0.25)"}`,
                        background: active ? "rgba(196,162,101,0.14)" : "transparent",
                        color: active ? colors.goldDark : colors.textSubtle,
                        fontFamily: fonts.body,
                        fontSize: "0.68rem",
                        fontWeight: active ? 700 : 500,
                        borderRadius: 999,
                        padding: "0.28rem 0.3rem",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {topRabbis
                .filter((r) => !search.trim() || r.name?.includes(search.trim()))
                .map((r) => (
                  <Link
                    key={r.id}
                    to={`/rabbis/${r.slug ?? r.id}`}
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
          {/* תפקיד + קיצורי-ניהול — לבעלי-תפקיד בלבד (T06, שיבוץ 2.7.2026) */}
          {(!collapsed || isDrawer) && <RolePanel staffOnly className="mb-1" />}

          {/* יואב 13.7: "תכנית הפרק השבועי" ו"תרומות" הוסרו מפוטר הסיידבר (החלטת סער).
              נשאר רק כפתור "צמצם". */}
          <div
            style={{
              display: "flex",
              gap: "0.3rem",
              alignItems: "stretch",
              flexDirection: collapsed && !isDrawer ? "column" : "row",
            }}
          >
            {!isDrawer && (
              <button
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? "הרחב" : "צמצם"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  justifyContent: "center",
                  padding: collapsed ? "0.5rem" : "0.5rem 0.7rem",
                  borderRadius: radii.md,
                  background: "transparent",
                  border: `1px solid rgba(139,111,71,0.18)`,
                  color: colors.textMuted,
                  fontFamily: fonts.body,
                  fontSize: "0.74rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
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
// ContentTree — the full 3-level accordion tree.
// Navigation model (v5):
//   book text click  → navigate('/category/:bookId') + toggle accordion
//   book chevron     → toggle accordion only
//   "כל השיעורים"   → navigate('/category/:bookId') — hidden if ≤1 child
//   child click      → navigate('/series/:childId')
//   חידות לילדים    → navigate('/series/:riddlesId')
// ────────────────────────────────────────────────────────────────────────
interface ContentTreeProps {
  categories: SidebarCategory[];
  extraSections: ExtraSection[];
  riddlesSeriesId: string;
  expanded: Set<string>;
  expandedExtras: Set<string>;
  onToggle: (key: string) => void;
  onToggleExtra: (key: string) => void;
  collapsed: boolean;
  search: string;
  matchesSearch: (t: string) => boolean;
  onNavigate: (path: string) => void;
  learningStyleTopics: LearningStyleTopic[];
}

// (יואב 9.7) ניווט לפי אופי-הלימוד — 4 מסלולים קבועים, כמו אגף-המורים שוויתר על תגיות.
// המיפוי דטרמיניסטי ב-RPC get_learning_style_series (ראה LearningStylePage).
const LEARNING_STYLES = [
  { key: "muklat", label: "מוקלט", Icon: Headphones },
  { key: "muklat-perush", label: "מוקלט + פירוש", Icon: BookOpenText },
  { key: "pdf-perush", label: "PDF + פירוש", Icon: FileText },
  { key: "mabatim", label: "מבטים רחבים", Icon: Telescope },
] as const;

function ContentTree({
  categories,
  extraSections,
  riddlesSeriesId,
  expanded,
  expandedExtras,
  onToggle,
  onToggleExtra,
  collapsed,
  search,
  matchesSearch,
  onNavigate,
  learningStyleTopics,
}: ContentTreeProps) {
  const [learningStyleOpen, setLearningStyleOpen] = useState(false);

  if (collapsed) {
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
      {/* R6 6.7.2026 (Saar): "ניווט על פי ספר ופרק" — relocated here from the removed
          quick-links box above the tabs. Gold, prominent, first item in "ראשי". */}
      <Link
        to="/bible"
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
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        <span>ניווט על פי ספר ופרק</span>
        <ChevronRight size={13} />
      </Link>

      {/* ─── (יואב 9.7 + 16.7) ניווט לפי אופי הלימוד — מעוצב בדיוק כמו "ניווט על פי
          ספר ופרק" שמעליו (בקשת הרב יואב 16.7 13:59). הרשימה: 4 מסלולים קבועים +
          ימי-עיון + תגיות שיואב מסמן באדמין (topics.is_learning_style). ─── */}
      <div style={{ marginBottom: "0.25rem" }}>
        <button
          onClick={() => setLearningStyleOpen((v) => !v)}
          aria-expanded={learningStyleOpen}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.5rem 0.75rem",
            marginBottom: "0.25rem",
            borderRadius: radii.md,
            border: "none",
            cursor: "pointer",
            background: gradients.goldButton,
            color: "white",
            fontFamily: fonts.body,
            fontSize: "0.82rem",
            fontWeight: 700,
          }}
        >
          <span>ניווט לפי אופי הלימוד</span>
          {learningStyleOpen ? <ChevronDown size={13} /> : <ChevronLeft size={13} />}
        </button>
        {learningStyleOpen && (
          <div style={{ padding: "0.15rem 0" }}>
            {LEARNING_STYLES.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => onNavigate(`/learning-style/${key}`)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.42rem 1.1rem",
                  background: "transparent",
                  border: "none",
                  borderInlineStart: "3px solid transparent",
                  cursor: "pointer",
                  color: colors.textMid,
                  fontSize: "0.8rem",
                  fontFamily: fonts.body,
                  textAlign: "right",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,111,71,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <Icon size={13} style={{ color: colors.goldDark, flexShrink: 0 }} />
                {label}
              </button>
            ))}
            {/* ימי עיון בתנ"ך — תוכן-סדרות מבני (לא תגית), מפנה לעמוד הקטגוריה */}
            <button
              onClick={() => onNavigate("/category/f4040001-0001-4000-8000-000000000000")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.42rem 1.1rem",
                background: "transparent",
                border: "none",
                borderInlineStart: "3px solid transparent",
                cursor: "pointer",
                color: colors.textMid,
                fontSize: "0.8rem",
                fontFamily: fonts.body,
                textAlign: "right",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,111,71,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <CalendarDays size={13} style={{ color: colors.goldDark, flexShrink: 0 }} />
              ימי עיון בתנ"ך
            </button>
            {/* תגיות אופי-לימוד שיואב סימן באדמין (עריכת תוכן ← נושאים ← "אופי הלימוד") */}
            {learningStyleTopics.map((t) => (
              <button
                key={t.id}
                onClick={() => onNavigate(`/topic/${t.slug}`)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.42rem 1.1rem",
                  background: "transparent",
                  border: "none",
                  borderInlineStart: "3px solid transparent",
                  cursor: "pointer",
                  color: colors.textMid,
                  fontSize: "0.8rem",
                  fontFamily: fonts.body,
                  textAlign: "right",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,111,71,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <Tag size={13} style={{ color: colors.goldDark, flexShrink: 0 }} />
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* פרשת השבוע + "איך לומדים תנ״ך" — הועברו לתוך "תכנים מיוחדים" (סער 6.7),
          כדי שלא יהיו חופשיים בשורש של "ראשי". ראה קבוצת SPECIAL_CONTENT_KEY למטה. */}

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
            {/* Category row: title navigates to /category/:id + opens accordion; chevron toggles only */}
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.5rem 0.75rem",
                borderRadius: radii.sm,
                background: catOpen ? "rgba(196,162,101,0.12)" : "rgba(139,111,71,0.06)",
                color: catOpen ? colors.goldDark : colors.textMid,
              }}
            >
              {/* תורה / נביאים / כתובים are ROOTS — the old site has no root landing page;
                  the title toggles the books accordion only (no navigation to an empty /category). */}
              <button
                onClick={() => onToggle(cat.id)}
                aria-expanded={catOpen}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  color: "inherit",
                  fontFamily: fonts.display,
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "right",
                  padding: 0,
                }}
              >
                {cat.title}
              </button>
              <button
                onClick={() => onToggle(cat.id)}
                aria-label={catOpen ? "כווץ" : "הרחב"}
                aria-expanded={catOpen}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 0 0 0.25rem",
                }}
              >
                <ChevronDown
                  size={13}
                  style={{
                    transition: "transform 0.18s",
                    transform: catOpen ? "rotate(180deg)" : "rotate(0deg)",
                    color: catOpen ? colors.goldDark : colors.textSubtle,
                  }}
                />
              </button>
            </div>

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
                    // §2.5 tree CA8: חידות לילדים — synthetic 6th Torah entry, navigate /series/:id
                    if (book.id === riddlesSeriesId) {
                      if (!matchesSearch(book.title) && search.trim()) return null;
                      return (
                        <div key={book.id} style={{ marginBottom: "0.1rem" }}>
                          <button
                            onClick={() => onNavigate(`/series/${riddlesSeriesId}`)}
                            style={{
                              width: "100%",
                              textAlign: "right",
                              padding: "0.4rem 0.65rem",
                              borderRadius: radii.sm,
                              background: "transparent",
                              border: "none",
                              color: colors.textMuted,
                              fontFamily: fonts.body,
                              fontSize: "0.82rem",
                              fontWeight: 500,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(139,111,71,0.05)"; e.currentTarget.style.color = colors.goldDark; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = colors.textMuted; }}
                          >
                            <Sparkles size={11} style={{ flexShrink: 0, opacity: 0.7 }} />
                            {book.title}
                          </button>
                        </div>
                      );
                    }
                    const bookKey = `${cat.id}::${book.id}`;
                    const bookOpen = expanded.has(bookKey);
                    return (
                      <div key={book.id} style={{ marginBottom: "0.1rem" }}>
                        {/* Book row: text navigates to category, chevron toggles */}
                        <div
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.4rem 0.65rem",
                            borderRadius: radii.sm,
                            background: bookOpen ? "rgba(196,162,101,0.09)" : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!bookOpen)
                              (e.currentTarget as HTMLDivElement).style.background = "rgba(139,111,71,0.05)";
                          }}
                          onMouseLeave={(e) => {
                            if (!bookOpen) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                          }}
                        >
                          {/* Book title — navigates to /category/:id */}
                          <button
                            onClick={() => {
                              onToggle(bookKey);
                              onNavigate(`/category/${book.id}`);
                            }}
                            style={{
                              flex: 1,
                              background: "none",
                              border: "none",
                              color: bookOpen ? colors.goldDark : colors.textMuted,
                              fontFamily: fonts.body,
                              fontSize: "0.82rem",
                              fontWeight: bookOpen ? 600 : 500,
                              cursor: "pointer",
                              textAlign: "right",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              padding: 0,
                            }}
                          >
                            <BookOpen size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
                            {book.title}
                          </button>
                          {/* Chevron — toggle only */}
                          {book.children.length > 0 && (
                            <button
                              onClick={() => onToggle(bookKey)}
                              aria-label={bookOpen ? "סגור" : "פתח"}
                              aria-expanded={bookOpen}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "0 0.15rem",
                                color: colors.textSubtle,
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <ChevronDown
                                size={11}
                                style={{
                                  transition: "transform 0.15s",
                                  transform: bookOpen ? "rotate(180deg)" : "rotate(0deg)",
                                }}
                              />
                            </button>
                          )}
                        </div>

                        {bookOpen && (
                          <div
                            style={{
                              paddingInlineStart: "0.75rem",
                              paddingTop: "0.1rem",
                              paddingBottom: "0.2rem",
                            }}
                          >
                            {/* "כל השיעורים בספר/בחומש/במגילת" — only where the old site had it */}
                            {book.children.length > 1 && !BOOKS_WITHOUT_ALIAS.has(book.title) && (
                              <button
                                onClick={() => onNavigate(`/category/${book.id}`)}
                                style={{
                                  width: "100%",
                                  textAlign: "right",
                                  padding: "0.35rem 0.55rem",
                                  marginBottom: "0.15rem",
                                  borderRadius: radii.sm,
                                  background: "rgba(196,162,101,0.10)",
                                  border: "none",
                                  color: colors.goldDark,
                                  fontFamily: fonts.body,
                                  fontSize: "0.74rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background = "rgba(196,162,101,0.18)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = "rgba(196,162,101,0.10)")
                                }
                              >
                                {bookAliasLabel(cat.title, book.title)}
                              </button>
                            )}

                            {/* Children (parshiot / chapters) — navigate to /series/:id */}
                            {book.children
                              .filter((c) => !search.trim() || matchesSearch(c.title))
                              .map((child) => (
                                <button
                                  key={child.id}
                                  onClick={() => onNavigate(`/series/${child.id}`)}
                                  style={{
                                    width: "100%",
                                    textAlign: "right",
                                    padding: "0.32rem 0.55rem",
                                    borderRadius: radii.sm,
                                    background: "transparent",
                                    border: "none",
                                    color: colors.textMuted,
                                    fontFamily: fonts.body,
                                    fontSize: "0.76rem",
                                    fontWeight: 400,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(139,111,71,0.05)";
                                    e.currentTarget.style.color = colors.goldDark;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.color = colors.textMuted;
                                  }}
                                >
                                  <span>{child.title}</span>
                                  <ChevronRight
                                    size={10}
                                    style={{ color: colors.textSubtle, flexShrink: 0 }}
                                  />
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
      })}

      {/* ─── תכנים מיוחדים — R6 6.7.2026 (Saar): every extra section except "איך לומדים"
          (נושאים כלליים בתנ"ך, מועדים, הפטרות, ימי עיון בתנ"ך, כלי עזר, פרוייקט המוקלט,
          ליווי ת"תים) now lives inside this one collapsible group, instead of sitting
          at ראשי's root level. ─── */}
      {(() => {
        const specialSections = extraSections; // כולל "איך לומדים תנ״ך" (סער 6.7)
        if (specialSections.length === 0) return null;
        const specialOpen = expandedExtras.has(SPECIAL_CONTENT_KEY);
        const specialVisible =
          !search.trim() ||
          specialSections.some(
            (s) => matchesSearch(s.title) || s.children.some((c) => matchesSearch(c.title))
          );
        if (!specialVisible) return null;
        return (
          <div style={{ marginBottom: "0.2rem" }}>
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.5rem 0.75rem",
                borderRadius: radii.sm,
                background: specialOpen ? "rgba(196,162,101,0.12)" : "rgba(139,111,71,0.06)",
                color: specialOpen ? colors.goldDark : colors.textMid,
              }}
            >
              <button
                onClick={() => onToggleExtra(SPECIAL_CONTENT_KEY)}
                aria-expanded={specialOpen}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  color: "inherit",
                  fontFamily: fonts.display,
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "right",
                  padding: 0,
                }}
              >
                תכנים מיוחדים
              </button>
              <button
                onClick={() => onToggleExtra(SPECIAL_CONTENT_KEY)}
                aria-label={specialOpen ? "כווץ" : "הרחב"}
                aria-expanded={specialOpen}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 0 0 0.25rem",
                }}
              >
                <ChevronDown
                  size={13}
                  style={{
                    transition: "transform 0.18s",
                    transform: specialOpen ? "rotate(180deg)" : "rotate(0deg)",
                    color: specialOpen ? colors.goldDark : colors.textSubtle,
                  }}
                />
              </button>
            </div>

            {specialOpen && (
              <div style={{ paddingInlineStart: "0.5rem", paddingTop: "0.15rem" }}>
                {/* פרשת השבוע — בתוך "תכנים מיוחדים" (סער 6.7) */}
                <Link
                  to="/parasha"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.45rem 0.6rem",
                    marginBottom: "0.15rem",
                    borderRadius: radii.sm,
                    color: colors.textMid,
                    fontFamily: fonts.body,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <span>פרשת השבוע</span>
                  <ChevronRight size={13} />
                </Link>
                {specialSections.map((section) => (
                  <ExtraSectionBlock
                    key={section.id}
                    section={section}
                    isExpanded={expandedExtras.has(section.id)}
                    onToggle={() => onToggleExtra(section.id)}
                    matchesSearch={matchesSearch}
                    variant="neutral"
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* רמה 20 (יואב 15:00 + חידודי-סער 17.7): תחתית הסיידבר — "לתרומות" מקוצר
          (בלי אייקונים) ואחריו "תכנית הפרק השבועי". שניהם navy+זהב, מובחנים מהקטגוריות. */}
      <div
        style={{
          marginTop: "0.6rem",
          paddingTop: "0.6rem",
          borderTop: `1px solid rgba(139,111,71,0.12)`,
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        <button
          onClick={() => onNavigate("/donate")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.62rem 0.75rem",
            borderRadius: radii.md,
            border: "1px solid rgba(196,162,101,0.55)",
            background: "linear-gradient(135deg, #1A2744 0%, #24335A 100%)",
            color: "#E8D5A0",
            fontFamily: fonts.body,
            fontSize: "0.88rem",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(26,39,68,0.25)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(26,39,68,0.35)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "none";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 10px rgba(26,39,68,0.25)";
          }}
        >
          <span>לתרומות</span>
          <ChevronLeft size={13} />
        </button>
        <button
          onClick={() => onNavigate("/chapter-weekly")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.62rem 0.75rem",
            borderRadius: radii.md,
            border: "1px solid rgba(196,162,101,0.4)",
            background: "rgba(26,39,68,0.06)",
            color: colors.goldDark,
            fontFamily: fonts.body,
            fontSize: "0.85rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(26,39,68,0.11)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(26,39,68,0.06)";
          }}
        >
          <span>תכנית הפרק השבועי</span>
          <ChevronLeft size={13} />
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// ExtraSectionBlock — collapsible section with children.
// Navigation model (v5):
//   section header  → toggle accordion
//   "הכל ב..."      → navigate('/category/:sectionId')
//   child click     → navigate('/series/:childId')
// ────────────────────────────────────────────────────────────────────────
// Nested second-level child inside an extra section (old-site depth-3: e.g. הפטרות → הפטרות-בראשית → הפטרת-X)
function NestedSectionChild({
  child,
  matchesSearch,
  onNavigate,
}: {
  child: { id: string; title: string; children?: { id: string; title: string }[] };
  matchesSearch: (t: string) => boolean;
  onNavigate: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          textAlign: "right",
          padding: "0.32rem 0.55rem",
          borderRadius: radii.sm,
          background: "transparent",
          border: "none",
          color: open ? colors.goldDark : colors.textMuted,
          fontFamily: fonts.body,
          fontSize: "0.76rem",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{child.title}</span>
        {open ? (
          <ChevronDown size={10} style={{ color: colors.goldDark, flexShrink: 0 }} />
        ) : (
          <ChevronLeft size={10} style={{ color: colors.textSubtle, flexShrink: 0 }} />
        )}
      </button>
      {open && (
        <div style={{ paddingInlineStart: "0.7rem" }}>
          {NESTED_WITH_ALIAS.has(child.title) && (
          <button
            onClick={() => onNavigate(`/series/${child.id}`)}
            style={{
              width: "100%",
              textAlign: "right",
              padding: "0.28rem 0.5rem",
              borderRadius: radii.sm,
              background: "rgba(196,162,101,0.08)",
              border: "none",
              color: colors.goldDark,
              fontFamily: fonts.body,
              fontSize: "0.73rem",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "0.1rem",
            }}
          >
            כל {child.title}
          </button>
          )}
          {(child.children || [])
            .filter((g) => matchesSearch(g.title))
            .map((g) => (
              <button
                key={g.id}
                onClick={() => onNavigate(`/series/${g.id}`)}
                style={{
                  width: "100%",
                  textAlign: "right",
                  padding: "0.26rem 0.5rem",
                  borderRadius: radii.sm,
                  background: "transparent",
                  border: "none",
                  color: colors.textMuted,
                  fontFamily: fonts.body,
                  fontSize: "0.73rem",
                  fontWeight: 400,
                  cursor: "pointer",
                }}
              >
                {g.title}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function ExtraSectionBlock({
  section,
  isExpanded,
  onToggle,
  matchesSearch,
  variant,
  onNavigate,
}: {
  section: ExtraSection;
  isExpanded: boolean;
  onToggle: () => void;
  matchesSearch: (t: string) => boolean;
  variant: "gold" | "neutral";
  onNavigate: (path: string) => void;
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
      {/* Section row: title navigates to /category/:id + opens accordion; chevron toggles only */}
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.45rem 0.75rem",
          borderRadius: radii.sm,
          background: bg,
          color: isExpanded ? colors.goldDark : colors.textMid,
        }}
      >
        <button
          onClick={() => {
            if (!isExpanded) onToggle();
            // R3 14.6.2026 (Saar): "כלי עזר" (tools root) holds 10 PUBLIC lessons (tables/timelines)
            // directly on the node — not series children. /category/ shows series-children (empty for
            // public after the strict teacher filter), so route it to /series/ which shows the direct
            // public lessons. Teacher maps stay hidden (filtered) in the teacher wing.
            const TOOLS_ROOT = "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7";
            onNavigate(section.id === TOOLS_ROOT ? `/series/${section.id}` : `/category/${section.id}`);
          }}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            color: "inherit",
            fontFamily: fonts.body,
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "right",
            padding: 0,
          }}
        >
          {section.title}
        </button>
        <button
          onClick={onToggle}
          aria-label={isExpanded ? "כווץ" : "הרחב"}
          aria-expanded={isExpanded}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: "0 0 0 0.25rem",
          }}
        >
          <ChevronDown
            size={12}
            style={{
              transition: "transform 0.15s",
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              color: colors.textSubtle,
            }}
          />
        </button>
      </div>

      {isExpanded && section.children.length > 0 && (
        <div style={{ paddingInlineStart: "0.75rem", paddingTop: "0.1rem" }}>
          {/* "כל השיעורים..." — exact old wording; hidden where the old site had none */}
          {SECTION_ALIAS[section.title] !== null && (
          <button
            onClick={() => onNavigate(`/category/${section.id}`)}
            style={{
              width: "100%",
              textAlign: "right",
              padding: "0.32rem 0.55rem",
              borderRadius: radii.sm,
              background: "rgba(196,162,101,0.10)",
              border: "none",
              color: colors.goldDark,
              fontFamily: fonts.body,
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "0.15rem",
            }}
          >
            {SECTION_ALIAS[section.title] ?? `כל השיעורים ב${section.title}`}
          </button>
          )}
          {/* Children — leafs navigate to /series/:id; children-with-children nest (old depth-3: הפטרות/מועדים) */}
          {section.children
            .filter((c) => matchesSearch(c.title))
            .map((child) =>
              child.children && child.children.length > 0 ? (
                <NestedSectionChild
                  key={child.id}
                  child={child}
                  matchesSearch={matchesSearch}
                  onNavigate={onNavigate}
                />
              ) : (
              <button
                key={child.id}
                onClick={() => onNavigate(`/series/${child.id}`)}
                style={{
                  width: "100%",
                  textAlign: "right",
                  padding: "0.32rem 0.55rem",
                  borderRadius: radii.sm,
                  background: "transparent",
                  border: "none",
                  color: colors.textMuted,
                  fontFamily: fonts.body,
                  fontSize: "0.76rem",
                  fontWeight: 400,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139,111,71,0.04)";
                  e.currentTarget.style.color = colors.goldDark;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = colors.textMuted;
                }}
              >
                <span>{child.title}</span>
                <ChevronRight
                  size={10}
                  style={{ color: colors.textSubtle, flexShrink: 0 }}
                />
              </button>
              ),
            )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// TopicsTab — thematic taxonomy (children of themes-root), real DB data
// ────────────────────────────────────────────────────────────────────────
function TopicsTab({
  topics,
  isLoading,
  search,
  matchesSearch,
  onNavigate,
}: {
  topics: TopicSidebarItem[];
  isLoading: boolean;
  search: string;
  matchesSearch: (t: string) => boolean;
  onNavigate: (path: string) => void;
}) {
  void search; // used via matchesSearch closure

  const visible = topics.filter((t) => matchesSearch(t.name));

  if (isLoading) {
    return (
      <div
        style={{
          padding: "1.5rem 0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            style={{
              height: "2rem",
              borderRadius: radii.sm,
              background: "rgba(139,111,71,0.08)",
              animation: "pulse 1.5s ease-in-out infinite",
              opacity: 1 - i * 0.1,
            }}
          />
        ))}
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div
        style={{
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: fonts.body,
          fontSize: "0.8rem",
          color: colors.textSubtle,
        }}
      >
        {topics.length === 0 ? "לא נמצאו נושאים" : "אין תוצאות"}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {visible.map((topic) => (
        <button
          key={topic.id}
          onClick={() => onNavigate(`/topic/${topic.slug}`)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "0.45rem 0.7rem",
            borderRadius: radii.sm,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontFamily: fonts.body,
            fontSize: "0.78rem",
            color: colors.textMuted,
            textAlign: "start",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(139,111,71,0.06)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {topic.name}
          </span>
          {topic.lessonCount > 0 && (
            <span
              style={{
                fontSize: "0.65rem",
                color: colors.textSubtle,
                flexShrink: 0,
                marginInlineStart: "0.4rem",
              }}
            >
              ({topic.lessonCount})
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
