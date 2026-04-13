import { useState, useMemo } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";
import { TOOLS_ORDER, getOrderIndex } from "@/lib/sidebarOrder";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  FileText,
  Video,
  Headphones,
  Search,
  Sparkles,
  FolderOpen,
  Download,
  Library,
  Users,
  Filter,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageHero from "@/components/layout/PageHero";
import { useContentSidebar } from "@/hooks/useContentSidebar";
import type { LessonRow } from "@/hooks/useContentSidebar";
import { useSeriesMixedContent, type MixedContentRow } from "@/hooks/useSeriesMixedContent";
import { Input } from "@/components/ui/input";
import LessonDialog from "@/components/lesson/LessonDialog";

type MediaFilter = "all" | "video" | "audio" | "text";

// All categories use the same brand styling
const getCategoryColor = (_title: string) => ({
  bg: "bg-secondary/40", text: "text-foreground", border: "border-transparent"
});

const SeriesList = () => {
  useSEO({
    title: "מאגר שיעורים ומאמרים",
    description: "אלפי שיעורים ומאמרים בתנ״ך – תורה, נביאים, כתובים, מועדים, פרשת השבוע ועוד. חינם לגמרי.",
    url: "https://bneyzion.co.il/series",
  });
  const {
    categories,
    extraSections,
    rabbis,
    riddlesSeriesId,
    isLoading,
    useSeriesForNode,
    useLessonsForNode,
    useSeriesForRabbi,
  } = useContentSidebar();

  // Default to פרשת נח | ו-יא
  const DEFAULT_NODE = "52540731-cd46-483d-9514-cb17ae6ca6c8";
  const DEFAULT_TITLE = "פרשת נח | ו-יא";

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [expandedExtra, setExpandedExtra] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(DEFAULT_NODE);
  const [selectedRabbi, setSelectedRabbi] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>(DEFAULT_TITLE);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"books" | "topics" | "creators">("books");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const TOOLS_ROOT_ID = "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7";
  const isToolsSection = selectedNode === TOOLS_ROOT_ID;

  const seriesQuery = useSeriesForNode(selectedRabbi ? null : selectedNode);
  const lessonsQuery = useLessonsForNode(selectedRabbi ? null : selectedNode);
  const rabbiSeriesQuery = useSeriesForRabbi(selectedRabbi);
  const mixedQuery = useSeriesMixedContent(selectedRabbi ? undefined : (selectedNode ?? undefined));

  const seriesList = selectedRabbi ? (rabbiSeriesQuery.data || []) : (seriesQuery.data || []);
  const lessonsList = lessonsQuery.data || [];
  const mixedContent = mixedQuery.data || [];
  const useMixed = !selectedRabbi && !!selectedNode && !isToolsSection;
  const isSeriesLoading = selectedRabbi
    ? rabbiSeriesQuery.isLoading
    : useMixed
      ? mixedQuery.isLoading
      : (seriesQuery.isLoading || lessonsQuery.isLoading);
  const hasSelection = !!(selectedNode || selectedRabbi);

  const toggleCategory = (title: string) => setExpandedCategory(expandedCategory === title ? null : title);
  const toggleBook = (bookId: string) => setExpandedBook(expandedBook === bookId ? null : bookId);
  const toggleExtra = (id: string) => setExpandedExtra(expandedExtra === id ? null : id);

  const selectNode = (id: string, title: string) => {
    setSelectedNode(id);
    setSelectedRabbi(null);
    setSelectedTitle(title);
  };

  const selectRabbi = (id: string, name: string) => {
    setSelectedRabbi(id);
    setSelectedNode(null);
    setSelectedTitle(`סדרות של ${name}`);
  };

  const getMediaType = (title: string): "video" | "audio" | "text" => {
    if (title.includes("מוקלט") || title.includes("אודיו") || title.includes("קריאה בטעמים")) return "audio";
    if (title.includes("מאמר") || title.includes("דפי עבודה") || title.includes("חוברת") || title.includes("טקסט") || title.includes("דף עבודה")) return "text";
    return "video";
  };

  const getMediaIcon = (title: string) => {
    const type = getMediaType(title);
    if (type === "audio") return <Headphones className="h-3.5 w-3.5" />;
    if (type === "text") return <FileText className="h-3.5 w-3.5" />;
    return <Video className="h-3.5 w-3.5" />;
  };


  // For tools section, use sidebar children as fallback (since tools items may have 0 lessons)
  const toolsChildren = useMemo(() => {
    if (!isToolsSection) return [];
    const toolsExtra = extraSections.find((s) => s.id === TOOLS_ROOT_ID);
    if (!toolsExtra) return [];
    return toolsExtra.children.map((c) => ({
      id: c.id,
      title: c.title,
      lessonCount: 0,
      rabbiName: null,
      sourceType: null,
      description: null,
    }));
  }, [isToolsSection, extraSections]);

  // Merge sidebar children with query results for tools
  const effectiveSeriesList = useMemo(() => {
    if (!isToolsSection) return seriesList;
    const merged = [...seriesList];
    const existingIds = new Set(seriesList.map((s) => s.id));
    for (const tc of toolsChildren) {
      if (!existingIds.has(tc.id)) {
        merged.push(tc as any);
      }
    }
    // Exclude the tools root series itself from the list
    return merged.filter((s) => s.id !== TOOLS_ROOT_ID);
  }, [isToolsSection, seriesList, toolsChildren]);

  const filteredSeries = effectiveSeriesList.filter((s) => {
    if (mediaFilter !== "all" && getMediaType(s.title) !== mediaFilter) return false;
    if (searchQuery && !s.title.includes(searchQuery) && !(s.rabbiName && s.rabbiName.includes(searchQuery))) return false;
    return true;
  });

  const filteredLessons = useMemo(() => lessonsList.filter((l) => {
    if (mediaFilter !== "all") {
      const lType = l.sourceType === "audio" ? "audio" : l.sourceType === "text" ? "text" : "video";
      if (lType !== mediaFilter) return false;
    }
    if (searchQuery && !l.title.includes(searchQuery) && !(l.rabbiName && l.rabbiName.includes(searchQuery))) return false;
    return true;
  }), [lessonsList, mediaFilter, searchQuery]);

  // For tools section: build a single interleaved list sorted by TOOLS_ORDER
  const toolsMixedItems = useMemo(() => {
    if (!isToolsSection) return [];
    // For tools section: only show lessons directly under the tools root (not from child series)
    const directLessons = filteredLessons.filter((l) => l.seriesId === TOOLS_ROOT_ID);
    const items: { type: "series" | "lesson"; title: string; id: string; rabbiName: string | null; lessonCount?: number; sourceType?: string; duration?: number | null; description?: string | null; audioUrl?: string | null; attachmentUrl?: string | null }[] = [];
    for (const s of filteredSeries) {
      items.push({ type: "series", title: s.title, id: s.id, rabbiName: s.rabbiName, lessonCount: s.lessonCount });
    }
    for (const l of directLessons) {
      items.push({ type: "lesson", title: l.title, id: l.id, rabbiName: l.rabbiName, sourceType: l.sourceType, duration: l.duration, description: l.description, audioUrl: l.audioUrl, attachmentUrl: l.attachmentUrl });
    }
    // Sort by TOOLS_ORDER
    items.sort((a, b) => {
      const idxA = getOrderIndex(a.title, TOOLS_ORDER);
      const idxB = getOrderIndex(b.title, TOOLS_ORDER);
      if (idxA === Infinity && idxB === Infinity) return a.title.localeCompare(b.title, "he");
      return idxA - idxB;
    });
    return items;
  }, [isToolsSection, filteredSeries, filteredLessons]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.round(seconds / 60);
    if (mins < 1) return "פחות מדקה";
    return `${mins} דק'`;
  };

  const getLessonMediaIcon = (sourceType: string) => {
    if (sourceType === "audio") return <Headphones className="h-3.5 w-3.5" />;
    if (sourceType === "text" || sourceType === "pdf" || sourceType === "article") return <FileText className="h-3.5 w-3.5" />;
    return <Video className="h-3.5 w-3.5" />;
  };

  const contentTypes = [
    { key: "all" as MediaFilter, label: "כל הסוגים", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { key: "video" as MediaFilter, label: "וידאו", icon: <Video className="h-3.5 w-3.5" /> },
    { key: "audio" as MediaFilter, label: "אודיו", icon: <Headphones className="h-3.5 w-3.5" /> },
    { key: "text" as MediaFilter, label: "טקסט/PDF", icon: <FileText className="h-3.5 w-3.5" /> },
  ];

  const tabs = [
    { key: "books" as const, label: "ראשי", icon: <Library className="h-3.5 w-3.5" /> },
    { key: "topics" as const, label: "נושאים", icon: <Filter className="h-3.5 w-3.5" /> },
    { key: "creators" as const, label: "רבנים", icon: <Users className="h-3.5 w-3.5" /> },
  ];

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        dir="rtl"
      >
        <PageHero title="מאגר השיעורים" subtitle="ניווט באתר לפי ספר ופרק" />

        <section className="py-6 md:py-8">
          <div className="container">
            <div className="flex flex-col md:flex-row-reverse gap-6">

              {/* ─── Sidebar ─── */}
              <aside className="w-full md:w-60 lg:w-64 shrink-0">
                <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-20">
                  {/* Tabs */}
                  <div className="flex border-b border-border">
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                          activeTab === tab.key
                            ? "border-primary text-primary bg-primary/5"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="p-2">
                    <div className="relative">
                      <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="חיפוש..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pr-8 text-xs bg-secondary/30 border-0"
                      />
                    </div>
                  </div>

                  {/* Scrollable nav */}
                  <div className="max-h-[65vh] overflow-y-auto px-2 pb-2">

                    {/* ═══ Books tab (ראשי) ═══ */}
                    {activeTab === "books" && (
                      <nav className="space-y-0.5">
                        {/* ניווט באתר לפי ספר ופרק - header */}
                        <div className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium text-center">
                          ניווט באתר לפי ספר ופרק
                        </div>

                        {/* פרשת השבוע */}
                        <Link
                          to="/parasha"
                          className="flex items-center justify-between px-3 py-2 bg-primary/80 text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                        >
                          פרשת השבוע
                          <ChevronLeft className="h-3 w-3" />
                        </Link>

                        {/* איך לומדים תנ"ך */}
                        {extraSections
                          .filter((s) => s.title.includes("איך לומדים"))
                          .map((section) => (
                            <div key={section.id}>
                              <button
                                onClick={() => {
                                  toggleExtra(section.id);
                                  selectNode(section.id, section.title);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                  expandedExtra === section.id
                                    ? "bg-primary/10 text-primary"
                                    : "bg-primary/70 text-primary-foreground hover:opacity-90"
                                }`}
                              >
                                <span>{section.title}</span>
                                <ChevronDown className={`h-3 w-3 transition-transform ${expandedExtra === section.id ? "rotate-180" : ""}`} />
                              </button>
                              <AnimatePresence initial={false}>
                                {expandedExtra === section.id && (
                                  <motion.div
                                    key={`extra-${section.id}`}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="py-0.5 space-y-px">
                                      <button
                                        onClick={() => selectNode(section.id, `הכל - ${section.title}`)}
                                        className={`w-full text-right px-3 py-1.5 text-xs rounded transition-colors font-medium ${
                                          selectedNode === section.id
                                            ? "bg-primary/15 text-primary"
                                            : "bg-primary/5 text-primary hover:bg-primary/10"
                                        }`}
                                      >
                                        הכל
                                      </button>
                                      {section.children.map((child) => (
                                        <button
                                          key={child.id}
                                          onClick={() => selectNode(child.id, child.title)}
                                          className={`w-full text-right px-3 py-1.5 text-xs rounded transition-colors ${
                                            selectedNode === child.id
                                              ? "bg-primary/15 text-primary font-medium"
                                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                          }`}
                                        >
                                          {child.title}
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}

                        {/* תורה / נביאים / כתובים */}
                        {categories.map((cat) => {
                          const colors = getCategoryColor(cat.title);
                          return (
                          <div key={cat.id}>
                            <button
                              onClick={() => {
                                toggleCategory(cat.title);
                                selectNode(cat.id, cat.title);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                                expandedCategory === cat.title
                                  ? `${colors.bg} ${colors.text} ${colors.border}`
                                  : `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`
                              }`}
                            >
                              <span>{cat.title}</span>
                              <ChevronDown className={`h-3 w-3 transition-transform ${expandedCategory === cat.title ? "rotate-180" : ""}`} />
                            </button>
                            <AnimatePresence initial={false}>
                              {expandedCategory === cat.title && (
                                <motion.div
                                  key={`cat-${cat.id}`}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="overflow-hidden"
                                >
                                  <div className="py-0.5 space-y-px">
                                    {cat.books.map((book) => (
                                      <div key={book.id}>
                                        <button
                                          onClick={() => {
                                            toggleBook(book.id);
                                            selectNode(book.id, book.title);
                                          }}
                                          className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded transition-colors ${
                                            selectedNode === book.id || expandedBook === book.id
                                              ? "bg-primary/10 text-primary font-medium"
                                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                                          }`}
                                        >
                                          <span>{book.title}</span>
                                          {book.children.length > 0 && (
                                            <ChevronDown className={`h-2.5 w-2.5 transition-transform ${expandedBook === book.id ? "rotate-180" : ""}`} />
                                          )}
                                        </button>
                                        <AnimatePresence initial={false}>
                                          {expandedBook === book.id && book.children.length > 0 && (
                                            <motion.div
                                              key={`book-${book.id}`}
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: "auto", opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              transition={{ duration: 0.15 }}
                                              className="overflow-hidden"
                                            >
                                              <div className="pr-3 py-0.5 space-y-px">
                                                {/* כל השיעורים בספר/בחומש */}
                                                <button
                                                  onClick={() => selectNode(book.id, `כל השיעורים ${cat.title === "תורה" ? "בחומש" : "בספר"} ${book.title}`)}
                                                  className={`w-full text-right px-2 py-1.5 text-[11px] rounded-md transition-colors font-medium ${
                                                    selectedNode === book.id
                                                      ? "bg-primary text-primary-foreground"
                                                      : "bg-primary/10 text-primary hover:bg-primary/20"
                                                  }`}
                                                >
                                                  כל השיעורים {cat.title === "תורה" ? "בחומש" : "בספר"} {book.title}
                                                </button>
                                                {/* Children (parshiot / chapters) */}
                                                {book.children.map((child) => (
                                                  <button
                                                    key={child.id}
                                                    onClick={() => selectNode(child.id, child.title)}
                                                    className={`w-full text-right px-2 py-1.5 text-[11px] rounded-md transition-colors ${
                                                      selectedNode === child.id
                                                        ? "bg-primary/15 text-primary font-medium"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                                                    }`}
                                                  >
                                                    {child.title}
                                                  </button>
                                                ))}
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    ))}

                                    {/* חידות לילדים פ"ש - inside Torah, after the 5 chumashim */}
                                    {cat.title === "תורה" && (
                                      <button
                                        onClick={() => selectNode(riddlesSeriesId, "חידות לילדים – פרשת השבוע")}
                                        className={`w-full flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                                          selectedNode === riddlesSeriesId
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                                        }`}
                                      >
                                        <Sparkles className="h-3 w-3" />
                                        חידות לילדים פ״ש
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          );
                        })}

                        {/* Remaining extra sections (נושאים כלליים, מועדים, הפטרות, כלי עזר, ליווי ת"תים) */}
                        {extraSections
                          .filter((s) => !s.title.includes("איך לומדים"))
                          .map((section) => {
                            const colors = getCategoryColor(section.title);
                            return (
                            <div key={section.id}>
                              <button
                                onClick={() => {
                                  // For tools section, don't expand children - just select directly
                                  if (section.id !== TOOLS_ROOT_ID && section.children.length > 0) {
                                    toggleExtra(section.id);
                                  }
                                  selectNode(section.id, section.title);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors border ${
                                  expandedExtra === section.id || selectedNode === section.id
                                    ? `${colors.bg} ${colors.text} ${colors.border}`
                                    : `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`
                                }`}
                              >
                                <span>{section.title}</span>
                                {section.id !== TOOLS_ROOT_ID && section.children.length > 0 ? (
                                  <ChevronDown className={`h-3 w-3 transition-transform ${expandedExtra === section.id ? "rotate-180" : ""}`} />
                                ) : (
                                  <ChevronLeft className="h-3 w-3" />
                                )}
                              </button>
                              {section.id !== TOOLS_ROOT_ID && section.children.length > 0 && (
                                <AnimatePresence initial={false}>
                                  {expandedExtra === section.id && (
                                    <motion.div
                                      key={`extra-${section.id}`}
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.15 }}
                                      className="overflow-hidden"
                                    >
                                       <div className="py-0.5 space-y-px">
                                        <button
                                          onClick={() => selectNode(section.id, section.title)}
                                          className={`w-full text-right px-3 py-1.5 text-xs rounded transition-colors font-medium ${
                                            selectedNode === section.id
                                              ? "bg-primary/15 text-primary"
                                              : "bg-primary/5 text-primary hover:bg-primary/10"
                                          }`}
                                        >
                                          הכל ב{section.title}
                                        </button>
                                        {section.children.map((child) => (
                                          <button
                                            key={child.id}
                                            onClick={() => selectNode(child.id, child.title)}
                                            className={`w-full text-right px-3 py-1.5 text-xs rounded transition-colors ${
                                              selectedNode === child.id
                                                ? "bg-primary/15 text-primary font-medium"
                                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                            }`}
                                          >
                                            {child.title}
                                          </button>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              )}
                            </div>
                            );
                          })}


                        {isLoading && (
                          <div className="space-y-1.5 pt-1">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="h-8 bg-secondary/50 rounded animate-pulse" />
                            ))}
                          </div>
                        )}
                      </nav>
                    )}

                    {/* ═══ Topics tab ═══ */}
                    {activeTab === "topics" && (
                      <div className="space-y-0.5">
                        {contentTypes.map((ct) => (
                          <button
                            key={ct.key}
                            onClick={() => setMediaFilter(ct.key)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${
                              mediaFilter === ct.key
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                            }`}
                          >
                            {ct.icon}
                            {ct.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ═══ Rabbis tab ═══ */}
                    {activeTab === "creators" && (
                      <div className="space-y-px">
                        {rabbis.length === 0 && !isLoading && (
                          <p className="text-xs text-muted-foreground text-center py-6">לא נמצאו רבנים</p>
                        )}
                        {rabbis.map((rabbi) => (
                          <button
                            key={rabbi.id}
                            onClick={() => selectRabbi(rabbi.id, rabbi.name)}
                            className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded transition-colors ${
                              selectedRabbi === rabbi.id
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                            }`}
                          >
                            <span>{rabbi.name}</span>
                            <span className="text-[10px] opacity-60">({rabbi.lessonCount})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </aside>

              {/* ─── Main content area ─── */}
              <div className="flex-1 min-w-0">
                {!hasSelection ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-20"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                      <BookOpen className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-heading text-foreground mb-2">
                      ברוכים הבאים למאגר השיעורים
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      בחרו ספר או נושא מהתפריט בצד כדי לצפות בסדרות השיעורים
                    </p>
                  </motion.div>
                ) : isSeriesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-14 bg-secondary/30 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (useMixed ? mixedContent.length === 0 : (filteredSeries.length === 0 && filteredLessons.length === 0)) ? (
                  <div className="text-center py-20">
                    <p className="text-sm text-muted-foreground">לא נמצאו תכנים עבור הבחירה הזו</p>
                  </div>
                ) : (
                  <motion.div
                    key={selectedTitle}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                      <h2 className="text-xl md:text-2xl font-heading text-foreground">{selectedTitle}</h2>
                      {/* Media filter pills */}
                      <div className="flex gap-1 flex-wrap">
                        <span className="text-[11px] text-muted-foreground ml-1 self-center">בחר סוג מדיה:</span>
                        {contentTypes.map((type) => (
                          <button
                            key={type.key}
                            onClick={() => setMediaFilter(type.key)}
                            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                              mediaFilter === type.key
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                            }`}
                          >
                            {type.icon}
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── Content table ── */}
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        {useMixed ? mixedContent.length : (filteredSeries.length + filteredLessons.length)} פריטים
                      </p>
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="hidden md:grid grid-cols-12 gap-3 bg-primary text-primary-foreground px-4 py-2.5 text-xs font-medium">
                          <div className="col-span-1 text-center">סוג מדיה</div>
                          <div className="col-span-5">שם השיעור</div>
                          <div className="col-span-3">מאת</div>
                          <div className="col-span-2">כמות</div>
                          <div className="col-span-1 text-center">להורדה</div>
                        </div>

                        {useMixed ? (
                          /* Mixed content view - same as /series/:id */
                          mixedContent.map((row, i) => 
                            row.type === "series" ? (
                              <Link
                                key={`s-${row.id}`}
                                to={`/series/${row.id}`}
                                className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-2.5 text-xs transition-colors hover:bg-primary/5 ${
                                  i % 2 === 0 ? "bg-card" : "bg-secondary/15"
                                } border-b border-border/50 last:border-b-0`}
                              >
                                <div className="col-span-1 flex items-center justify-center gap-2 text-muted-foreground">
                                  <FolderOpen className="h-3.5 w-3.5" />
                                  <span className="md:hidden font-medium text-foreground text-sm">{row.title}</span>
                                </div>
                                <div className="hidden md:flex col-span-5 items-center font-medium text-foreground">
                                  {row.title}
                                </div>
                                <div className="col-span-3 flex items-center text-muted-foreground">
                                  {row.rabbiName || "—"}
                                </div>
                                <div className="col-span-2 flex items-center text-muted-foreground">
                                  {`${row.totalLessons} שיעורים`}
                                </div>
                                <div className="col-span-1 flex items-center justify-center">
                                  <span className="text-[10px] text-primary font-medium">סדרה</span>
                                </div>
                              </Link>
                            ) : (
                              <button
                                key={`l-${row.id}`}
                                onClick={() => setSelectedLessonId(row.id)}
                                className={`w-full text-right grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-2.5 text-xs transition-colors hover:bg-primary/5 ${
                                  i % 2 === 0 ? "bg-card" : "bg-secondary/15"
                                } border-b border-border/50 last:border-b-0`}
                              >
                                <div className="col-span-1 flex items-center justify-center gap-2 text-muted-foreground">
                                  {getLessonMediaIcon(row.sourceType)}
                                  <span className="md:hidden font-medium text-foreground text-sm">{row.title}</span>
                                </div>
                                <div className="hidden md:flex col-span-5 items-center">
                                  <div>
                                    <span className="font-medium text-foreground">{row.title}</span>
                                    {row.description && (
                                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{row.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="col-span-3 flex items-center text-muted-foreground">
                                  {row.rabbiName || "—"}
                                </div>
                                <div className="col-span-2 flex items-center text-muted-foreground">
                                  {formatDuration(row.duration) || "—"}
                                </div>
                                <div className="col-span-1 flex items-center justify-center">
                                  {(row.audioUrl || row.sourceType === "article") ? (
                                    <Download className="h-3.5 w-3.5 text-primary/60" />
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  )}
                                </div>
                              </button>
                            )
                          )
                        ) : isToolsSection ? (
                          /* Tools section: interleaved by custom order */
                          toolsMixedItems.map((item, i) =>
                            item.type === "series" ? (
                              <Link
                                key={`s-${item.id}`}
                                to={`/series/${item.id}`}
                                className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-2.5 text-xs transition-colors hover:bg-primary/5 ${
                                  i % 2 === 0 ? "bg-card" : "bg-secondary/15"
                                } border-b border-border/50 last:border-b-0`}
                              >
                                <div className="col-span-1 flex items-center justify-center gap-2 text-muted-foreground">
                                  <FolderOpen className="h-3.5 w-3.5" />
                                  <span className="md:hidden font-medium text-foreground text-sm">{item.title}</span>
                                </div>
                                <div className="hidden md:flex col-span-5 items-center font-medium text-foreground">
                                  {item.title}
                                </div>
                                <div className="col-span-3 flex items-center text-muted-foreground">
                                  {item.rabbiName || "—"}
                                </div>
                                <div className="col-span-2 flex items-center text-muted-foreground">
                                  {item.title.includes("מפות עזר לספר יהושע") ? "14 מפות"
                                    : item.title.includes("מפות עזר לספר שופטים") ? "10 מפות"
                                    : item.title.includes("ציר זמן - תקופת המלכים") ? "3 מפות"
                                    : item.title.includes("מפות עזר לתנ") ? "2 מפות"
                                    : `${item.lessonCount ?? 0} שיעורים`}
                                </div>
                                <div className="col-span-1 flex items-center justify-center">
                                  <span className="text-[10px] text-primary font-medium">סדרה</span>
                                </div>
                              </Link>
                            ) : (
                              <button
                                key={`l-${item.id}`}
                                onClick={() => setSelectedLessonId(item.id)}
                                className={`w-full text-right grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-2.5 text-xs transition-colors hover:bg-primary/5 ${
                                  i % 2 === 0 ? "bg-card" : "bg-secondary/15"
                                } border-b border-border/50 last:border-b-0`}
                              >
                                <div className="col-span-1 flex items-center justify-center gap-2 text-muted-foreground">
                                  {getLessonMediaIcon(item.sourceType || "video")}
                                  <span className="md:hidden font-medium text-foreground text-sm">{item.title}</span>
                                </div>
                                <div className="hidden md:flex col-span-5 items-center">
                                  <div>
                                    <span className="font-medium text-foreground">{item.title}</span>
                                    {item.description && (
                                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="col-span-3 flex items-center text-muted-foreground">
                                  {item.rabbiName || "—"}
                                </div>
                                <div className="col-span-2 flex items-center text-muted-foreground">
                                  {formatDuration(item.duration ?? null) || "—"}
                                </div>
                                <div className="col-span-1 flex items-center justify-center">
                                  {(item.attachmentUrl || item.audioUrl || item.sourceType === "pdf" || item.sourceType === "article") ? (
                                    <a
                                      href={item.attachmentUrl || item.audioUrl || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => {
                                        if (!item.attachmentUrl && !item.audioUrl) {
                                          e.preventDefault();
                                          setSelectedLessonId(item.id);
                                        }
                                        e.stopPropagation();
                                      }}
                                    >
                                      <Download className="h-3.5 w-3.5 text-primary/60 hover:text-primary" />
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  )}
                                </div>
                              </button>
                            )
                          )
                        ) : (
                          /* Default: series first, then lessons */
                          <>
                            {filteredSeries.map((series, i) => (
                              <Link
                                key={`s-${series.id}`}
                                to={`/series/${series.id}`}
                                className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-2.5 text-xs transition-colors hover:bg-primary/5 ${
                                  i % 2 === 0 ? "bg-card" : "bg-secondary/15"
                                } border-b border-border/50 last:border-b-0`}
                              >
                                <div className="col-span-1 flex items-center justify-center gap-2 text-muted-foreground">
                                  <FolderOpen className="h-3.5 w-3.5" />
                                  <span className="md:hidden font-medium text-foreground text-sm">{series.title}</span>
                                </div>
                                <div className="hidden md:flex col-span-5 items-center font-medium text-foreground">
                                  {series.title}
                                </div>
                                <div className="col-span-3 flex items-center text-muted-foreground">
                                  {series.rabbiName || "—"}
                                </div>
                                <div className="col-span-2 flex items-center text-muted-foreground">
                                  {`${series.lessonCount} שיעורים`}
                                </div>
                                <div className="col-span-1 flex items-center justify-center">
                                  <span className="text-[10px] text-primary font-medium">סדרה</span>
                                </div>
                              </Link>
                            ))}
                            {filteredLessons.map((lesson, i) => {
                              const rowIdx = filteredSeries.length + i;
                              return (
                                <button
                                  key={`l-${lesson.id}`}
                                  onClick={() => setSelectedLessonId(lesson.id)}
                                  className={`w-full text-right grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-2.5 text-xs transition-colors hover:bg-primary/5 ${
                                    rowIdx % 2 === 0 ? "bg-card" : "bg-secondary/15"
                                  } border-b border-border/50 last:border-b-0`}
                                >
                                  <div className="col-span-1 flex items-center justify-center gap-2 text-muted-foreground">
                                    {getLessonMediaIcon(lesson.sourceType)}
                                    <span className="md:hidden font-medium text-foreground text-sm">{lesson.title}</span>
                                  </div>
                                  <div className="hidden md:flex col-span-5 items-center">
                                    <div>
                                      <span className="font-medium text-foreground">{lesson.title}</span>
                                      {lesson.description && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{lesson.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="col-span-3 flex items-center text-muted-foreground">
                                    {lesson.rabbiName || "—"}
                                  </div>
                                  <div className="col-span-2 flex items-center text-muted-foreground">
                                    {formatDuration(lesson.duration) || "—"}
                                  </div>
                                  <div className="col-span-1 flex items-center justify-center">
                                    {(lesson.audioUrl || lesson.attachmentUrl) ? (
                                      <Download className="h-3.5 w-3.5 text-primary/60" />
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground">—</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </section>
      </motion.div>

      {selectedLessonId && (
        <LessonDialog
          lessonId={selectedLessonId}
          open={!!selectedLessonId}
          onOpenChange={(open) => !open && setSelectedLessonId(null)}
        />
      )}
    </Layout>
  );
};

export default SeriesList;
