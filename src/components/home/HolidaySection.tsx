import { motion } from "framer-motion";
import { Calendar, ChevronLeft, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Holiday {
  name: string;
  hebrewDate: string;
  gregorianDate: Date;
  seriesSearchTerms: string[];
  icon: string;
}

// Jewish holidays with approximate 5786 dates
const HOLIDAYS_5786: Holiday[] = [
  { name: "פורים", hebrewDate: "י״ד אדר", gregorianDate: new Date(2026, 2, 3), seriesSearchTerms: ["פורים", "אסתר"], icon: "🎭" },
  { name: "פסח", hebrewDate: "ט״ו ניסן", gregorianDate: new Date(2026, 3, 2), seriesSearchTerms: ["פסח", "הגדה"], icon: "🍷" },
  { name: "יום העצמאות", hebrewDate: "ה׳ אייר", gregorianDate: new Date(2026, 3, 22), seriesSearchTerms: ["יום העצמאות", "עצמאות"], icon: "🇮🇱" },
  { name: "ל״ג בעומר", hebrewDate: "י״ח אייר", gregorianDate: new Date(2026, 4, 5), seriesSearchTerms: ["ל\"ג בעומר"], icon: "🔥" },
  { name: "שבועות", hebrewDate: "ו׳ סיוון", gregorianDate: new Date(2026, 4, 22), seriesSearchTerms: ["שבועות", "רות", "מגילת רות"], icon: "📜" },
  { name: "תשעה באב", hebrewDate: "ט׳ באב", gregorianDate: new Date(2026, 6, 23), seriesSearchTerms: ["תשעה באב", "שלושת השבועות", "איכה"], icon: "🕯️" },
  { name: "ראש השנה", hebrewDate: "א׳ תשרי", gregorianDate: new Date(2026, 8, 12), seriesSearchTerms: ["ראש השנה"], icon: "🍯" },
  { name: "יום כיפור", hebrewDate: "י׳ תשרי", gregorianDate: new Date(2026, 8, 21), seriesSearchTerms: ["יום כיפור", "יום הכיפורים", "כיפור"], icon: "🙏" },
  { name: "סוכות", hebrewDate: "ט״ו תשרי", gregorianDate: new Date(2026, 8, 26), seriesSearchTerms: ["סוכות"], icon: "🌿" },
  { name: "חנוכה", hebrewDate: "כ״ה כסלו", gregorianDate: new Date(2026, 11, 5), seriesSearchTerms: ["חנוכה"], icon: "🕎" },
];

function getUpcomingHoliday(daysAhead = 45): Holiday | null {
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  
  for (const holiday of HOLIDAYS_5786) {
    if (holiday.gregorianDate >= now && holiday.gregorianDate <= cutoff) {
      return holiday;
    }
  }
  return null;
}

function getDaysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const HolidaySection = () => {
  const holiday = getUpcomingHoliday(45);

  const { data: holidaySeries } = useQuery({
    queryKey: ["holiday-series", holiday?.name],
    queryFn: async () => {
      if (!holiday) return [];
      
      // Search for series matching holiday terms
      const results: Array<{ id: string; title: string; lesson_count: number }> = [];
      
      for (const term of holiday.seriesSearchTerms) {
        const { data } = await supabase
          .from("series")
          .select("id, title, lesson_count")
          .eq("status", "active")
          .gt("lesson_count", 0)
          .ilike("title", `%${term}%`)
          .limit(5);
        
        if (data) {
          for (const s of data) {
            if (!results.find(r => r.id === s.id)) {
              // Check if there's a matching topic with tagged lessons
              const { data: topic } = await supabase
                .from("topics")
                .select("id")
                .eq("name", s.title)
                .maybeSingle();
              
              let totalCount = s.lesson_count;
              if (topic) {
                const { count } = await supabase
                  .from("lesson_topics")
                  .select("lesson_id", { count: "exact", head: true })
                  .eq("topic_id", topic.id);
                totalCount = Math.max(s.lesson_count, (count ?? 0) + s.lesson_count);
              }
              
              results.push({ ...s, lesson_count: totalCount });
            }
          }
        }
      }
      
      return results.sort((a, b) => b.lesson_count - a.lesson_count).slice(0, 6);
    },
    enabled: !!holiday,
    staleTime: 1000 * 60 * 60,
  });

  if (!holiday) return null;

  const daysUntil = getDaysUntil(holiday.gregorianDate);

  return (
    <section className="py-16 section-gradient-cool">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-2xl">
              {holiday.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl md:text-3xl font-heading gradient-sunset">
                  {holiday.name} מתקרב!
                </h2>
                <span className="text-sm bg-accent/15 text-accent-foreground px-3 py-1 rounded-full font-display">
                  עוד {daysUntil} ימים
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{holiday.hebrewDate} • שיעורים ותכנים להכנה לחג</p>
            </div>
          </div>

          {/* Holiday series grid */}
          {holidaySeries && holidaySeries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {holidaySeries.map((series, i) => (
                <motion.div
                  key={series.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/series/${series.id}`}
                    className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-md transition-all group"
                  >
                    <Star className="h-4 w-4 text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {series.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{series.lesson_count} שיעורים</p>
                    </div>
                    <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default HolidaySection;
