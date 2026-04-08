import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronLeft, Clock, Headphones, Video, FileText, Volume2, Search } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useBibleBook, useBibleChapterLessons } from "@/hooks/useBible";
import { useSEO } from "@/hooks/useSEO";
import { usePlayer } from "@/contexts/PlayerContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import LessonDialog from "@/components/lesson/LessonDialog";

// Chapter counts for known books (for display when no data)
const BOOK_CHAPTER_COUNTS: Record<string, number> = {
  "בראשית": 50, "שמות": 40, "ויקרא": 27, "במדבר": 36, "דברים": 34,
  "יהושע": 24, "שופטים": 21, "שמואל א": 31, "שמואל ב": 24,
  "מלכים א": 22, "מלכים ב": 25, "ישעיהו": 66, "ירמיהו": 52,
  "יחזקאל": 48, "הושע": 14, "יואל": 4, "עמוס": 9, "עובדיה": 1,
  "יונה": 4, "מיכה": 7, "נחום": 3, "חבקוק": 3, "צפניה": 3,
  "חגי": 2, "זכריה": 14, "מלאכי": 3, "תהלים": 150, "משלי": 31,
  "איוב": 42, "שיר השירים": 8, "רות": 4, "איכה": 5, "קהלת": 12,
  "אסתר": 10, "דניאל": 12, "עזרא": 10, "נחמיה": 13,
  "דברי הימים א": 29, "דברי הימים ב": 36,
};

const TORAH_BOOKS = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"];

function getBookCategory(book: string) {
  if (TORAH_BOOKS.includes(book)) return "תורה";
  const neviim = ["יהושע", "שופטים", "שמואל א", "שמואל ב", "מלכים א", "מלכים ב",
    "ישעיהו", "ירמיהו", "יחזקאל", "הושע", "יואל", "עמוס", "עובדיה",
    "יונה", "מיכה", "נחום", "חבקוק", "צפניה", "חגי", "זכריה", "מלאכי"];
  if (neviim.includes(book)) return "נביאים";
  return "כתובים";
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)} דק׳`;
}

const BibleBookPage = () => {
  const { book } = useParams<{ book: string }>();
  const decodedBook = book ? decodeURIComponent(book) : "";
  const { data, isLoading } = useBibleBook(decodedBook);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: chapterLessons, isLoading: lessonsLoading } = useBibleChapterLessons(
    decodedBook,
    selectedChapter ?? undefined
  );
  const { play } = usePlayer();

  const category = getBookCategory(decodedBook);
  const maxChapters = BOOK_CHAPTER_COUNTS[decodedBook] || 0;

  useSEO({
    title: `${decodedBook} – שיעורים לפי פרק | בני ציון`,
    description: `${data?.total || 0} שיעורים בספר ${decodedBook} – ניווט לפי פרקים ופסוקים`,
  });

  const chaptersWithCounts = data?.chapters || [];
  const chapterCountMap = new Map(chaptersWithCounts.map((c) => [c.chapter, c.count]));

  return (
    <Layout>
      <div dir="rtl">
        {/* Breadcrumb */}
        <div className="container pt-6 pb-2">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">ראשי</Link>
            <ChevronLeft className="h-3 w-3" />
            <Link to="/series" className="hover:text-primary transition-colors">מאגר התוכן</Link>
            <ChevronLeft className="h-3 w-3" />
            <span className="text-muted-foreground">{category}</span>
            <ChevronLeft className="h-3 w-3" />
            <span className="text-foreground font-medium">{decodedBook}</span>
            {selectedChapter && (
              <>
                <ChevronLeft className="h-3 w-3" />
                <span className="text-foreground font-medium">פרק {selectedChapter}</span>
              </>
            )}
          </nav>
        </div>

        {/* Hero */}
        <section className="container pb-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 py-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-heading text-foreground">{decodedBook}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <Badge variant="secondary" className="text-xs">{category}</Badge>
                {data && <span>{data.total} שיעורים</span>}
                {maxChapters > 0 && <span>{maxChapters} פרקים</span>}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Search within page */}
        <section className="container pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש פרק (הקלד מספר)..."
              className="w-full bg-card/60 border border-border/60 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            />
          </div>
        </section>

        {/* Chapter Grid */}
        <section className="container pb-8">
          {isLoading ? (
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
              {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
              {Array.from({ length: maxChapters || Math.max(...(chaptersWithCounts.map((c) => c.chapter) || [0])) }).map((_, i) => {
                const chap = i + 1;
                const count = chapterCountMap.get(chap) || 0;
                const isSelected = selectedChapter === chap;
                const hasContent = count > 0;
                const matchesSearch = !searchQuery || String(chap).includes(searchQuery.trim());
                if (!matchesSearch) return null;

                return (
                  <motion.button
                    key={chap}
                    whileHover={hasContent ? { scale: 1.08 } : undefined}
                    whileTap={hasContent ? { scale: 0.95 } : undefined}
                    onClick={() => hasContent && setSelectedChapter(isSelected ? null : chap)}
                    className={`relative h-14 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? "border-primary bg-primary/15 text-primary shadow-sm"
                        : hasContent
                        ? "border-border/60 bg-card/80 hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                        : "border-border/30 bg-secondary/20 text-muted-foreground/40 cursor-default"
                    }`}
                    disabled={!hasContent}
                  >
                    <span className={`text-sm font-heading ${isSelected ? "text-primary" : hasContent ? "text-foreground" : ""}`}>
                      {chap}
                    </span>
                    {hasContent && (
                      <span className={`text-[9px] mt-0.5 ${isSelected ? "text-primary/70" : "text-muted-foreground"}`}>
                        {count} שיעורים
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>

        {/* Chapter Lessons */}
        <AnimatePresence>
          {selectedChapter && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="container pb-16 overflow-hidden"
            >
              <div className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                  <h2 className="font-heading text-foreground text-lg">
                    {decodedBook} — פרק {selectedChapter}
                  </h2>
                  <Badge variant="outline" className="text-xs">
                    {chapterCountMap.get(selectedChapter) || 0} שיעורים
                  </Badge>
                </div>

                {lessonsLoading ? (
                  <div className="p-5 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {chapterLessons?.map((lesson) => {
                      const rabbi = lesson.rabbis as { id: string; name: string; title: string | null } | null;
                      const rabbiLabel = rabbi?.title ? `${rabbi.title} ${rabbi.name}` : rabbi?.name;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLessonId(lesson.id)}
                          className="w-full text-right px-5 py-3.5 hover:bg-primary/5 transition-colors flex items-center gap-4 group"
                        >
                          {/* Verse badge */}
                          {lesson.bible_verse && (
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-xs font-heading text-primary">
                              {lesson.bible_verse}
                            </div>
                          )}
                          {!lesson.bible_verse && (
                            <div className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                              {lesson.source_type === "video" ? (
                                <Video className="h-4 w-4 text-muted-foreground" />
                              ) : lesson.source_type === "audio" ? (
                                <Headphones className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {lesson.title}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              {rabbiLabel && <span>{rabbiLabel}</span>}
                              {formatDuration(lesson.duration) && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(lesson.duration)}
                                </span>
                              )}
                            </div>
                          </div>

                          {lesson.audio_url && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                play({
                                  id: lesson.id,
                                  title: lesson.title,
                                  audioUrl: lesson.audio_url!,
                                  rabbiName: rabbiLabel || undefined,
                                });
                              }}
                              className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                            >
                              <Volume2 className="h-4 w-4" />
                            </button>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* No chapters message */}
        {!isLoading && data?.chapters.length === 0 && (
          <div className="container pb-16 text-center">
            <p className="text-muted-foreground">
              אין שיעורים מסווגים לפי פרקים בספר זה עדיין.
            </p>
            <Link to="/series" className="text-primary hover:underline text-sm mt-2 inline-block">
              חפשו במאגר הסדרות →
            </Link>
          </div>
        )}
      </div>

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

export default BibleBookPage;
