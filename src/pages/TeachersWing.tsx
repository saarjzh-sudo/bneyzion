import { useState, useMemo } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
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
import { useTeachersWing } from "@/hooks/useTeachersWing";
import type { LessonRow } from "@/hooks/useTeachersWing";
import { Input } from "@/components/ui/input";
import LessonDialog from "@/components/lesson/LessonDialog";
import AITeacherTools from "@/components/teachers/AITeacherTools";

type MediaFilter = "all" | "video" | "audio" | "text";
type ContentTypeFilter = "all" | "tests" | "worksheets" | "vocabulary" | "lessonPlans" | "recorded";

const CONTENT_TYPE_CHIPS: { key: ContentTypeFilter; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "tests", label: "מבחנים" },
  { key: "worksheets", label: "דפי עבודה" },
  { key: "vocabulary", label: "ביאורי מילים" },
  { key: "lessonPlans", label: "מערכי שיעור" },
  { key: "recorded", label: "שיעורים מוקלטים" },
];

function matchesContentType(
  title: string,
  sourceType: string | null,
  filter: ContentTypeFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "tests":
      return title.includes("מבחן") || title.includes("שאלות חזרה");
    case "worksheets":
      return title.includes("דף עבודה") || title.includes("דפי עבודה");
    case "vocabulary":
      return title.includes("ביאורי מילים");
    case "lessonPlans":
      return title.includes("מערך שיעור");
    case "recorded":
      return sourceType === "audio" || sourceType === "video";
    default:
      return true;
  }
}

const TeachersWing = () => {
  useSEO({
    title: "אגף המורים",
    description: "חומרי לימוד, עזרי הוראה ותכנים למורי תנ״ך – דפי עבודה, מבחנים, מאגר שיעורים ועוד.",
    url: "https://bneyzion.co.il/teachers",
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
  } = useTeachersWing();

  const [expandedCategory, setExpandedCategory] = useState<string | null>("תורה");
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [expandedExtra, setExpandedExtra] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedRabbi, setSelectedRabbi] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("מאגר עזרי הלמידה");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"books" | "topics" | "creators">("books");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [worksheetMode, setWorksheetMode] = useState(false);
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>("all");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const seriesQuery = useSeriesForNode(selectedRabbi ? null : selectedNode);
  const lessonsQuery = useLessonsForNode(selectedRabbi ? null : selectedNode);
  const rabbiSeriesQuery = useSeriesForRabbi(selectedRabbi);

  const seriesList = selectedRabbi
    ? (rabbiSeriesQuery.data || [])
    : (seriesQuery.data || []);
  const lessonsList = lessonsQuery.data || [];
  const isSeriesLoading = selectedRabbi ? rabbiSeriesQuery.isLoading : (seriesQuery.isLoading || lessonsQuery.isLoading);
  const hasSelection = !!(selectedNode || selectedRabbi);

  const toggleCategory = (title: string) => {
    setExpandedCategory(expandedCategory === title ? null : title);
  };

  const toggleBook = (bookId: string) => {
    setExpandedBook(expandedBook === bookId ? null : bookId);
  };

  const toggleExtra = (id: string) => {
    setExpandedExtra(expandedExtra === id ? null : id);
  };

  const selectNode = (id: string, title: string) => {
    setSelectedNode(id);
    setSelectedRabbi(null);
    setSelectedTitle(title);
    setWorksheetMode(false);
    setContentTypeFilter("all");
  };

  const selectRabbi = (id: string, name: string) => {
    setSelectedRabbi(id);
    setSelectedNode(null);
    setSelectedTitle(`סדרות של ${name}`);
    setContentTypeFilter("all");
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

  const WORKSHEET_KEYWORDS = ["דפי עבודה", "דף עבודה", "חוברת עבודה", "חוברת", "חידות"];
  const isWorksheetRelated = (title: string) => WORKSHEET_KEYWORDS.some(kw => title.includes(kw));

  const filteredSeries = seriesList.filter((s) => {
    if (worksheetMode && !isWorksheetRelated(s.title)) return false;
    if (contentTypeFilter !== "all" && !matchesContentType(s.title, s.sourceType, contentTypeFilter)) return false;
    if (mediaFilter !== "all" && getMediaType(s.title) !== mediaFilter) return false;
    if (searchQuery && !s.title.includes(searchQuery) && !(s.rabbiName && s.rabbiName.includes(searchQuery))) return false;
    return true;
  });

  const filteredLessons = useMemo(() => lessonsList.filter((l) => {
    if (worksheetMode && !isWorksheetRelated(l.title)) return false;
    if (contentTypeFilter !== "all" && !matchesContentType(l.title, l.sourceType, contentTypeFilter)) return false;
    if (mediaFilter !== "all") {
      const lType = l.sourceType === "audio" ? "audio" : l.sourceType === "text" ? "text" : "video";
      if (lType !== mediaFilter) return false;
    }
    if (searchQuery && !l.title.includes(searchQuery) && !(l.rabbiName && l.rabbiName.includes(searchQuery))) return false;
    return true;
  }), [lessonsList, mediaFilter, searchQuery, worksheetMode, contentTypeFilter]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.round(seconds / 60);
    if (mins < 1) return "פחות מדקה";
    return `${mins} דק'`;
  };

  const getLessonMediaIcon = (sourceType: string) => {
    if (sourceType === "audio") return <Headphones className="h-3.5 w-3.5" />;
    if (sourceType === "text") return <FileText className="h-3.5 w-3.5" />;
    return <Video className="h-3.5 w-3.5" />;
  };

  const getLessonMediaLabel = (sourceType: string) => {
    if (sourceType === "audio") return "שיעור";
    if (sourceType === "text") return "שיעור";
    return "שיעור";
  };

  const contentTypes = [
    { key: "all" as MediaFilter, label: "הכל", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { key: "video" as MediaFilter, label: "וידאו", icon: <Video className="h-3.5 w-3.5" /> },
    { key: "audio" as MediaFilter, label: "אודיו", icon: <Headphones className="h-3.5 w-3.5" /> },
    { key: "text" as MediaFilter, label: "טקסט", icon: <FileText className="h-3.5 w-3.5" /> },
  ];

  const tabs = [
    { key: "books" as const, label: "ספרים", icon: <Library className="h-3.5 w-3.5" /> },
    { key: "topics" as const, label: "סוג תוכן", icon: <Filter className="h-3.5 w-3.5" /> },
    { key: "creators" as const, label: "יוצרים", icon: <Users className="h-3.5 w-3.5" /> },
  ];

  return (
    <Layout>
      {/* Compact Hero */}
      <section className="relative py-10 md:py-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-l from-[#2D1F0E] via-[#5B3A1A] to-[#8B6F47]" />
        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full mb-3">
            <GraduationCap className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs text-white/80">אגף המורים</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-heading text-white mb-2 hero-text-shadow">
            מאגר עזרי הלמידה
          </h1>
          <p className="text-sm md:text-base text-white/70 max-w-lg mx-auto">
            שיעורי וידאו, אודיו, מאמרים ודפי עבודה — הכל מרוכז במקום אחד
          </p>
        </div>
      </section>

      {/* Main content */}
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

                  {/* ═══ Books tab ═══ */}
                  {activeTab === "books" && (
                    <nav className="space-y-0.5">
                      {/* פרשת השבוע */}
                      <Link
                        to="/parasha"
                        className="flex items-center justify-between px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                      >
                        פרשת השבוע
                        <ChevronLeft className="h-3 w-3" />
                      </Link>

                      {/* איך מלמדים תנ"ך */}
                      {extraSections
                        .filter((s) => s.title.includes("איך מלמדים"))
                        .map((section) => (
                          <div key={section.id}>
                            <button
                              onClick={() => {
                                toggleExtra(section.id);
                                selectNode(section.id, section.title);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 bg-primary/90 text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                            >
                              <span>איך מלמדים תנ״ך</span>
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
                      {categories.map((cat) => (
                        <div key={cat.id}>
                          <button
                            onClick={() => {
                              toggleCategory(cat.title);
                              selectNode(cat.id, cat.title);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                              expandedCategory === cat.title
                                ? "bg-primary/10 text-primary"
                                : "bg-secondary/40 text-foreground hover:bg-secondary/70"
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
                                              {/* כל התכנים בחומש */}
                                              <button
                                                onClick={() => selectNode(book.id, `כל התכנים בחומש ${book.title}`)}
                                                className={`w-full text-right px-2 py-1.5 text-[11px] rounded-md transition-colors font-medium ${
                                                  selectedNode === book.id && !worksheetMode
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-primary/10 text-primary hover:bg-primary/20"
                                                }`}
                                              >
                                                כל התכנים בחומש {book.title}
                                              </button>
                                              {/* דפי עבודה - always show */}
                                              <button
                                                onClick={() => {
                                                  setSelectedNode(book.id);
                                                  setSelectedRabbi(null);
                                                  setSelectedTitle(`דפי עבודה - ${book.title}`);
                                                  setWorksheetMode(true);
                                                }}
                                                className={`w-full text-right px-2 py-1.5 text-[11px] rounded-md transition-colors font-medium ${
                                                  worksheetMode && selectedNode === book.id
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-primary/10 text-primary hover:bg-primary/20"
                                                }`}
                                              >
                                                דפי עבודה - {book.title}
                                              </button>
                                              {/* פרשיות בלבד - מזוהות לפי הדפוס "פרשת X | ..." */}
                                              {book.children
                                                .filter((c) => /^פרשת\s/.test(c.title) && c.title.includes("|"))
                                                .map((child) => (
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
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}

                      {/* חידות לילדים */}
                      <button
                        onClick={() => selectNode(riddlesSeriesId, "חידות לילדים – פרשת השבוע")}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                          selectedNode === riddlesSeriesId
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary/40 text-foreground hover:bg-secondary/70"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3" />
                          חידות לילדים פ״ש
                        </span>
                        <ChevronLeft className="h-3 w-3" />
                      </button>

                      {/* מועדים, הפטרות, נושאים כלליים, כלי עזר, ליווי ת"תים */}
                      {extraSections
                        .filter((s) => !s.title.includes("איך מלמדים"))
                        .map((section) => (
                          <div key={section.id}>
                            <button
                              onClick={() => {
                                if (section.children.length > 0) {
                                  toggleExtra(section.id);
                                }
                                selectNode(section.id, section.title);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                                expandedExtra === section.id || selectedNode === section.id
                                  ? "bg-primary/10 text-primary"
                                  : "bg-secondary/40 text-foreground hover:bg-secondary/70"
                              }`}
                            >
                              <span>{section.title}</span>
                              {section.children.length > 0 ? (
                                <ChevronDown className={`h-3 w-3 transition-transform ${expandedExtra === section.id ? "rotate-180" : ""}`} />
                              ) : (
                                <ChevronLeft className="h-3 w-3" />
                              )}
                            </button>
                            {section.children.length > 0 && (
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
                        ))}

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

                  {/* ═══ Creators tab ═══ */}
                  {activeTab === "creators" && (
                    <div className="space-y-px">
                      {rabbis.length === 0 && !isLoading && (
                        <p className="text-xs text-muted-foreground text-center py-6">לא נמצאו יוצרים</p>
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
                /* Welcome state */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <BookOpen className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-heading text-foreground mb-2">
                    ברוכים הבאים למאגר עזרי הלמידה
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
              ) : filteredSeries.length === 0 && filteredLessons.length === 0 ? (
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
                  {/* Content type filter chips */}
                  <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-1 px-1">
                    {CONTENT_TYPE_CHIPS.map((chip) => (
                      <button
                        key={chip.key}
                        onClick={() => setContentTypeFilter(chip.key)}
                        className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                          contentTypeFilter === chip.key
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <h2 className="text-xl md:text-2xl font-heading text-foreground">{selectedTitle}</h2>
                    {/* Inline media filter pills */}
                    <div className="flex gap-1 flex-wrap">
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

                  {/* ── Series table ── */}
                  {filteredSeries.length > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        {filteredSeries.length} סדרות
                      </p>
                      <div className="border border-border rounded-xl overflow-hidden mb-8">
                        <div className="hidden md:grid grid-cols-12 gap-3 bg-primary text-primary-foreground px-4 py-2.5 text-xs font-medium">
                          <div className="col-span-1 text-center">סוג</div>
                          <div className="col-span-5">שם הסדרה</div>
                          <div className="col-span-3">מאת</div>
                          <div className="col-span-2">שיעורים</div>
                          <div className="col-span-1 text-center">צפה</div>
                        </div>
                        {filteredSeries.map((series, i) => (
                          <Link
                            key={series.id}
                            to={`/series/${series.id}`}
                            className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-2.5 text-xs transition-colors hover:bg-primary/5 ${
                              i % 2 === 0 ? "bg-card" : "bg-secondary/15"
                            } border-b border-border/50 last:border-b-0`}
                          >
                            <div className="col-span-1 flex items-center justify-center gap-2 text-muted-foreground">
                              {getMediaIcon(series.title)}
                              <span className="md:hidden font-medium text-foreground text-sm">{series.title}</span>
                            </div>
                            <div className="hidden md:flex col-span-5 items-center font-medium text-foreground">
                              {series.title}
                            </div>
                            <div className="col-span-3 flex items-center text-muted-foreground">
                              {series.rabbiName || "—"}
                            </div>
                            <div className="col-span-2 flex items-center text-muted-foreground">
                              {series.lessonCount}
                            </div>
                            <div className="col-span-1 flex items-center justify-center">
                              <FolderOpen className="h-3.5 w-3.5 text-primary/60 hover:text-primary transition-colors" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}


                  {/* ── Lessons table ── */}
                  {filteredLessons.length > 0 && (
                    <>
                      {filteredSeries.length > 0 && (
                        <p className="text-xs text-muted-foreground mb-2 mt-6">
                          {filteredLessons.length} שיעורים
                        </p>
                      )}
                      {filteredSeries.length === 0 && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {filteredLessons.length} שיעורים
                        </p>
                      )}
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="hidden md:grid grid-cols-12 gap-3 bg-primary text-primary-foreground px-4 py-2.5 text-xs font-medium">
                          <div className="col-span-1 text-center">סוג מדיה</div>
                          <div className="col-span-5">שם השיעור</div>
                          <div className="col-span-3">מאת</div>
                          <div className="col-span-2">אורך</div>
                          <div className="col-span-1 text-center">להורדה</div>
                        </div>
                        {filteredLessons.map((lesson, i) => (
                          <button
                            key={lesson.id}
                            onClick={() => setSelectedLessonId(lesson.id)}
                            className={`w-full text-right grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-2.5 text-xs transition-colors hover:bg-primary/5 ${
                              i % 2 === 0 ? "bg-card" : "bg-secondary/15"
                            } border-b border-border/50 last:border-b-0`}
                          >
                            <div className="col-span-1 flex items-center justify-center gap-2 text-muted-foreground">
                              {getLessonMediaIcon(lesson.sourceType)}
                              <span className="hidden">{getLessonMediaLabel(lesson.sourceType)}</span>
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
                              {(lesson.audioUrl || lesson.attachmentUrl) && (
                                <Download className="h-3.5 w-3.5 text-primary/60" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* AI Tools Section */}
      <section className="py-12 section-gradient-warm" dir="rtl">
        <div className="container max-w-3xl">
          <AITeacherTools />
        </div>
      </section>

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

export default TeachersWing;
