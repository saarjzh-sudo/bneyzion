import { sanitizeHtml } from "@/lib/sanitize";
import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Headphones, ScrollText, ChevronLeft, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useParasha } from "@/hooks/useParasha";
import { getParashaVerse } from "@/lib/parashaCalendar";
import LessonDialog from "@/components/lesson/LessonDialog";

const ParashaSection = () => {
  const { parasha, chumash, articleSeries, audioLessons, lessons, isLoading } = useParasha();
  const verse = getParashaVerse(parasha);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const articlesWithContent = articleSeries.filter(s => s.lessonContent);
  const firstArticle = articlesWithContent[0];
  const allContent = [...audioLessons, ...lessons].slice(0, 4);

  return (
    <section className="py-20 section-gradient-warm">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-heading gradient-warm">
                פרשת השבוע: {parasha}
              </h2>
              <p className="text-sm text-muted-foreground">
                {chumash ? `חומש ${chumash} • ` : ""}שיעורים, מאמרים ועזרי הוראה לפרשה
              </p>
            </div>
          </div>
          <Link
            to="/parasha"
            className="hidden md:flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            לדף הפרשה המלא
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Featured verse */}
        {verse && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="glass-card-gold rounded-2xl px-6 py-5 mb-8 max-w-3xl mx-auto"
          >
            <blockquote className="text-center text-lg md:text-xl font-serif text-foreground/80 leading-relaxed">
              "{verse.text}"
              <span className="block text-sm text-muted-foreground mt-2">[{verse.reference}]</span>
            </blockquote>
          </motion.div>
        )}

        {/* Inline article preview - like the full parasha page */}
        {firstArticle && (
          <motion.article
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card-light rounded-2xl p-6 md:p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-accent/20">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-heading text-foreground">{firstArticle.title}</h3>
                <p className="text-xs text-muted-foreground">{firstArticle.rabbi}</p>
              </div>
            </div>

            {/* Show truncated content preview */}
            <div
              className="prose prose-sm max-w-none leading-relaxed line-clamp-6
                prose-p:mb-3 prose-p:text-[#000000]
                prose-strong:text-[#000000] prose-strong:font-bold"
              dir="rtl"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(firstArticle.lessonContent ?? "") }}
            />

            <Link
              to="/parasha"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              המשך קריאה בדף הפרשה
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </motion.article>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Articles list */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">מאמרים לפרשה</h3>
            <div className="space-y-2">
              {articleSeries.slice(firstArticle ? 1 : 0, 5).map((series, i) => (
                <motion.div
                  key={series.title}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  {series.seriesId ? (
                    <Link
                      to={`/series/${series.seriesId}`}
                      className="flex items-center justify-between px-4 py-2.5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-md transition-all group"
                    >
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                        {series.title} | {series.rabbi}
                      </span>
                      <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                    </Link>
                  ) : (
                    <div className="flex items-center px-4 py-2.5 bg-card border border-border rounded-xl opacity-50">
                      <span className="text-sm text-foreground">{series.title} | {series.rabbi}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Audio/content list */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">שיעורי שמע ותכנים</h3>
            <div className="space-y-2">
              {allContent.map((lesson, i) => (
                <motion.div
                  key={lesson.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <button
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-md transition-all group text-right"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {lesson.source_type === "audio" ? (
                        <Headphones className="h-4 w-4 text-primary" />
                      ) : (
                        <ScrollText className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground group-hover:text-primary transition-colors truncate">{lesson.title}</p>
                      {lesson.rabbi_name && (
                        <p className="text-xs text-muted-foreground">{lesson.rabbi_name}</p>
                      )}
                    </div>
                  </button>
                </motion.div>
              ))}

              {isLoading && [1, 2].map(i => (
                <div key={i} className="h-12 bg-card border border-border rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center md:hidden">
          <Link
            to="/parasha"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
          >
            לדף הפרשה המלא
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Lesson dialog */}
      {selectedLessonId && (
        <LessonDialog
          lessonId={selectedLessonId}
          open={!!selectedLessonId}
          onOpenChange={(open) => !open && setSelectedLessonId(null)}
        />
      )}
    </section>
  );
};

export default ParashaSection;
