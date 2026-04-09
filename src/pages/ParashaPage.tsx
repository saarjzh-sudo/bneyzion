import { sanitizeHtml } from "@/lib/sanitize";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Headphones, ScrollText, Printer, Sparkles } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useParasha } from "@/hooks/useParasha";
import { getParashaVerse } from "@/lib/parashaCalendar";
import LessonDialog from "@/components/lesson/LessonDialog";
import { useState, useMemo } from "react";
import { useSEO } from "@/hooks/useSEO";

/** Extract the first meaningful sentence from HTML content for a pull-quote */
function extractPullQuote(html: string): string | null {
  const text = html.replace(/<[^>]+>/g, "").trim();
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if (s.length > 40 && s.length < 250) return s;
  }
  return sentences[0]?.substring(0, 200) || null;
}

/** Split HTML content roughly in half by paragraphs, returning [firstHalf, secondHalf] */
function splitContentInHalf(html: string): [string, string] {
  // Split by closing paragraph/div tags to find natural break points
  const parts = html.split(/(?<=<\/p>|<\/div>|<\/h[2-6]>)/gi).filter(p => p.trim());
  if (parts.length <= 2) return [html, ""];
  const mid = Math.ceil(parts.length / 2);
  return [parts.slice(0, mid).join(""), parts.slice(mid).join("")];
}

const ParashaPage = () => {
  const { parasha, chumash, lessons, audioLessons, articleSeries, riddle, isLoading } = useParasha();

  useSEO({
    title: `פרשת ${parasha}`,
    description: `דף פרשת ${parasha} – מאמרים, שיעורי אודיו, חידות ותוכן לשולחן השבת`,
  });
  const verse = getParashaVerse(parasha);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const articlesWithContent = useMemo(
    () => articleSeries.filter(s => s.lessonContent),
    [articleSeries]
  );
  

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.round(seconds / 60);
    return `${mins} דק'`;
  };

  const handlePrint = () => window.print();

  return (
    <Layout>
      {/* ═══ Narrow Hero with biblical landscape ═══ */}
      <section className="relative overflow-hidden py-8 md:py-10 print:py-4 print:border-none">
        <div className="absolute inset-0">
          <img
            src="/images/hero-biblical-landscape.jpg"
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        </div>

        <div className="container max-w-4xl relative z-10">
          {/* Breadcrumb + print */}
          <div className="flex items-center justify-between mb-4 print:mb-2">
            <p className="text-sm text-white/60 print:hidden">
              <Link to="/" className="hover:text-white/90 transition-colors">דף הבית</Link>
              {" ◂ "}
              <span>פרשת {parasha}</span>
            </p>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors print:hidden"
            >
              <Printer className="h-4 w-4" />
              הדפסה
            </button>
          </div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-3xl md:text-5xl font-heading text-white hero-text-shadow mb-1 print:text-3xl">
              פרשת {parasha}
            </h1>
            {chumash && (
              <p className="text-base text-white/70 font-sans">חומש {chumash}</p>
            )}
          </motion.div>

          {/* Featured verse */}
          {verse && (
            <motion.blockquote
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-5 max-w-2xl mx-auto text-center text-base md:text-lg text-white/80 font-serif leading-relaxed print:mt-3"
            >
              "{verse.text}"
              <span className="block text-xs text-white/50 mt-1">[{verse.reference}]</span>
            </motion.blockquote>
          )}
        </div>
      </section>

      {/* ═══ Articles — the Shabbat sheet body ═══ */}
      <section className="py-10 md:py-14 section-gradient-warm print:py-4 print:bg-transparent">
        <div className="container max-w-3xl">

          {articlesWithContent.map((article, i) => (
            <motion.article
              key={article.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
              className="mb-2 print:break-inside-avoid"
            >
              {/* Ornamental divider between articles */}
              {i > 0 && (
                <div className="ornamental-divider my-10 print:my-4" aria-hidden>
                  ◆
                </div>
              )}

              {/* Section header with accent bar */}
              <header className="flex items-center gap-3 mb-5 border-b-2 border-accent/20 pb-3 print:border-b print:pb-2">
                <div className="w-1 h-10 rounded-full bg-accent shrink-0 print:hidden" />
                <div>
                  <h2 className="text-xl md:text-2xl font-heading text-foreground leading-tight">
                    {article.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{article.rabbi}</p>
                </div>
              </header>

              {/* Article body with pull-quote embedded in the middle */}
              {(() => {
                const quote = extractPullQuote(article.lessonContent!);
                const [firstHalf, secondHalf] = splitContentInHalf(article.lessonContent!);
                return (
                  <>
                    <div
                      className="parasha-drop-cap prose prose-xl max-w-none leading-loose
                        prose-headings:font-heading prose-headings:text-foreground prose-headings:mt-8 prose-headings:mb-3
                        prose-p:mb-5 prose-p:text-foreground
                        prose-strong:text-foreground prose-strong:font-bold
                        prose-blockquote:border-accent/40 prose-blockquote:text-foreground/80 prose-blockquote:font-serif
                        print:prose-base print:leading-snug"
                      dir="rtl"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(firstHalf) }}
                    />
                    {quote && secondHalf && (
                      <aside className="pull-quote print:border-r-2 print:bg-transparent my-6" aria-label="ציטוט מודגש">
                        {quote}
                      </aside>
                    )}
                    {secondHalf && (
                      <div
                        className="prose prose-xl max-w-none leading-loose
                          prose-headings:font-heading prose-headings:text-foreground prose-headings:mt-8 prose-headings:mb-3
                          prose-p:mb-5 prose-p:text-foreground
                          prose-strong:text-foreground prose-strong:font-bold
                          prose-blockquote:border-accent/40 prose-blockquote:text-foreground/80 prose-blockquote:font-serif
                          print:prose-base print:leading-snug"
                        dir="rtl"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(secondHalf) }}
                      />
                    )}
                  </>
                );
              })()}
            </motion.article>
          ))}

          {/* ═══ Riddle section ═══ */}
          {riddle && riddle.content && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 print:break-inside-avoid"
            >
              <div className="ornamental-divider my-10 print:my-4" aria-hidden>◆</div>
              <header className="flex items-center gap-3 mb-5 border-b-2 border-accent/20 pb-3 print:border-b print:pb-2">
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-heading text-foreground leading-tight">
                    חידות לילדים
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">פרשת {parasha}</p>
                </div>
              </header>
              <div
                className="prose prose-xl max-w-none leading-loose
                  prose-headings:font-heading prose-headings:text-foreground prose-headings:mt-8 prose-headings:mb-3
                  prose-p:mb-5 prose-p:text-foreground
                  prose-strong:text-foreground prose-strong:font-bold
                  prose-ol:pr-6 prose-ul:pr-6
                  print:prose-base print:leading-snug"
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(riddle.content ?? "") }}
              />
            </motion.div>
          )}


          {/* Audio & additional lessons */}
          {(audioLessons.length > 0 || lessons.length > 0) && (
            <div className="mt-10 pt-8 border-t border-accent/15 print:hidden">
              <h3 className="text-lg font-heading text-foreground mb-4 flex items-center gap-2">
                <Headphones className="h-5 w-5 text-accent" />
                שיעורי שמע ותכנים נוספים
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...audioLessons, ...lessons].map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className="flex items-center gap-3 px-4 py-3 glass-card-teal rounded-xl hover:glow-teal transition-all group text-right"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-secondary/50 to-sage/30 flex items-center justify-center shrink-0">
                      {lesson.source_type === "audio" ? (
                        <Headphones className="h-4 w-4 text-foreground" />
                      ) : (
                        <ScrollText className="h-4 w-4 text-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">
                        {lesson.title}
                      </p>
                      {lesson.rabbi_name && (
                        <p className="text-xs text-muted-foreground">{lesson.rabbi_name}</p>
                      )}
                    </div>
                    {lesson.duration && (
                      <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded-md text-muted-foreground shrink-0">
                        {formatDuration(lesson.duration)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="space-y-8 mt-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-8 bg-muted rounded w-1/3 mb-4" />
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                    <div className="h-4 bg-muted rounded w-4/6" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!isLoading && articlesWithContent.length === 0 && audioLessons.length === 0 && lessons.length === 0 && (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">אין תכנים זמינים כרגע לפרשת {parasha}</p>
            </div>
          )}
        </div>
      </section>

      {/* Lesson dialog */}
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

export default ParashaPage;
