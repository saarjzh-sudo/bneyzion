import { sanitizeHtml } from "@/lib/sanitize";
import { motion } from "framer-motion";
import { FileText, ChevronLeft, BookOpen, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useParasha } from "@/hooks/useParasha";
import { getParashaVerse } from "@/lib/parashaCalendar";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";


// ——— Holiday logic ———
interface Holiday {
  name: string;
  hebrewDate: string;
  gregorianDate: Date;
  seriesSearchTerms: string[];
  icon: typeof Star;
}

const HOLIDAYS_5786: Holiday[] = [
  { name: "פורים", hebrewDate: "י״ד אדר", gregorianDate: new Date(2026, 2, 3), seriesSearchTerms: ["פורים", "אסתר"], icon: Star },
  { name: "פסח", hebrewDate: "ט״ו ניסן", gregorianDate: new Date(2026, 3, 2), seriesSearchTerms: ["פסח", "הגדה"], icon: Star },
  { name: "יום העצמאות", hebrewDate: "ה׳ אייר", gregorianDate: new Date(2026, 3, 22), seriesSearchTerms: ["יום העצמאות", "עצמאות"], icon: Star },
  { name: "ל״ג בעומר", hebrewDate: "י״ח אייר", gregorianDate: new Date(2026, 4, 5), seriesSearchTerms: ["ל\"ג בעומר"], icon: Star },
  { name: "שבועות", hebrewDate: "ו׳ סיוון", gregorianDate: new Date(2026, 4, 22), seriesSearchTerms: ["שבועות", "רות", "מגילת רות"], icon: Star },
  { name: "תשעה באב", hebrewDate: "ט׳ באב", gregorianDate: new Date(2026, 6, 23), seriesSearchTerms: ["תשעה באב", "שלושת השבועות", "איכה"], icon: Star },
  { name: "ראש השנה", hebrewDate: "א׳ תשרי", gregorianDate: new Date(2026, 8, 12), seriesSearchTerms: ["ראש השנה"], icon: Star },
  { name: "יום כיפור", hebrewDate: "י׳ תשרי", gregorianDate: new Date(2026, 8, 21), seriesSearchTerms: ["יום כיפור", "יום הכיפורים", "כיפור"], icon: Star },
  { name: "סוכות", hebrewDate: "ט״ו תשרי", gregorianDate: new Date(2026, 8, 26), seriesSearchTerms: ["סוכות"], icon: Star },
  { name: "חנוכה", hebrewDate: "כ״ה כסלו", gregorianDate: new Date(2026, 11, 5), seriesSearchTerms: ["חנוכה"], icon: Star },
];

function getUpcomingHoliday(daysAhead = 45): Holiday | null {
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  for (const holiday of HOLIDAYS_5786) {
    if (holiday.gregorianDate >= now && holiday.gregorianDate <= cutoff) return holiday;
  }
  return null;
}

function getDaysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ——— Component ———
const ParashaHolidaySection = () => {
  const { parasha, chumash, articleSeries, isLoading } = useParasha();
  const verse = getParashaVerse(parasha);
  const holiday = getUpcomingHoliday(45);

  const articlesWithContent = articleSeries.filter(s => s.lessonContent);
  const firstArticle = articlesWithContent[0];

  const { data: holidaySeries } = useQuery({
    queryKey: ["holiday-series-with-rabbi", holiday?.name],
    queryFn: async () => {
      if (!holiday) return [];
      const allResults: Array<{ id: string; title: string; lesson_count: number; rabbi_name: string | null }> = [];
      
      for (const term of holiday.seriesSearchTerms) {
        const { data } = await supabase
          .from("series")
          .select("id, title, lesson_count, rabbi_id, rabbis(name)")
          .eq("status", "active")
          .gt("lesson_count", 0)
          .ilike("title", `%${term}%`)
          .limit(5);
        if (data) {
          for (const s of data) {
            if (!allResults.find(r => r.id === s.id)) {
              let rabbiName = (s.rabbis as any)?.name || null;
              
              // If no rabbi on series, try to get the most common rabbi from its lessons
              if (!rabbiName) {
                const { data: lessonRabbi } = await supabase
                  .from("lessons")
                  .select("rabbis(name)")
                  .eq("series_id", s.id)
                  .not("rabbi_id", "is", null)
                  .limit(1);
                if (lessonRabbi?.[0]) {
                  rabbiName = (lessonRabbi[0].rabbis as any)?.name || null;
                }
              }
              
              allResults.push({
                id: s.id,
                title: s.title,
                lesson_count: s.lesson_count,
                rabbi_name: rabbiName,
              });
            }
          }
        }
      }
      return allResults.sort((a, b) => b.lesson_count - a.lesson_count).slice(0, 8);
    },
    enabled: !!holiday,
    staleTime: 1000 * 60 * 60,
  });

  const hasHoliday = !!holiday && holidaySeries && holidaySeries.length > 0;

  return (
    <section className="py-16 md:py-20 section-gradient-warm">
      <div className="container">
        {/* Main grid: parasha left (or full), holiday right */}
        <div className={`grid gap-8 ${hasHoliday ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
          
          {/* ===== PARASHA COLUMN ===== */}
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/90 to-primary/70 flex items-center justify-center shadow-sm shadow-primary/10">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-heading gradient-warm">
                  פרשת {parasha}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {chumash ? `חומש ${chumash} • ` : ""}הדף לשולחן שבת
                </p>
              </div>
            </div>

            {/* Verse */}
            {verse && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="glass-card-gold rounded-2xl px-5 py-4"
              >
                <blockquote className="text-center text-base md:text-lg font-serif text-foreground/80 leading-relaxed">
                  "{verse.text}"
                  <span className="block text-xs text-muted-foreground mt-1">[{verse.reference}]</span>
                </blockquote>
              </motion.div>
            )}

            {/* Inline article preview — "הפרשה במבט רחב" only */}
            {firstArticle && (
              <motion.article
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-card-light rounded-2xl p-5 md:p-6"
              >
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-accent/20">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-heading text-foreground">{firstArticle.title}</h3>
                    <p className="text-xs text-muted-foreground">מאת {firstArticle.rabbi}</p>
                  </div>
                </div>
                <div
                  className="prose prose-sm max-w-none leading-relaxed line-clamp-5
                    prose-p:mb-2 prose-p:text-foreground
                    prose-strong:text-foreground prose-strong:font-bold"
                  dir="rtl"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(firstArticle.lessonContent ?? "") }}
                />
                <Link
                  to="/parasha"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  המשך קריאה בדף הפרשה
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Link>
              </motion.article>
            )}

            {/* CTA to full parasha page */}
            <div className="text-center">
              <Link
                to="/parasha"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-display text-sm hover:bg-primary/90 transition-colors"
              >
                <FileText className="h-4 w-4" />
                לדף פרשת השבוע המלא
              </Link>
            </div>
          </div>

          {/* ===== HOLIDAY COLUMN ===== */}
          {hasHoliday && holiday && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                  <holiday.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl md:text-3xl font-heading gradient-sunset">
                      {holiday.name}
                    </h2>
                    <span className="text-xs bg-accent/15 text-accent-foreground px-2.5 py-0.5 rounded-full font-display">
                      עוד {getDaysUntil(holiday.gregorianDate)} ימים
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{holiday.hebrewDate} • שיעורים והכנה לחג</p>
                </div>
              </div>

              {/* Holiday series list with rabbi names */}
              <div className="space-y-2">
                {holidaySeries!.map((series, i) => (
                  <motion.div
                    key={series.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to={`/series/${series.id}`}
                      className="flex items-center gap-3 px-4 py-3 glass-spring rounded-xl hover:border-accent/30 hover:shadow-md transition-all group"
                    >
                      <Star className="h-4 w-4 text-accent shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {series.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {series.rabbi_name && <span>מאת {series.rabbi_name}</span>}
                          {series.rabbi_name && <span>•</span>}
                          <span>{series.lesson_count} שיעורים</span>
                        </div>
                      </div>
                      <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>


    </section>
  );
};

export default ParashaHolidaySection;
