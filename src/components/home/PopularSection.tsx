import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Flame, ChevronRight, ChevronLeft, Play, Volume2, Clock, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import LessonDialog from "@/components/lesson/LessonDialog";
import { SkeletonLessonCard } from "@/components/ui/skeleton-card";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)} דק׳`;
}

const PopularSection = () => {
  const { user } = useAuth();
  const { play } = usePlayer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["popular-lessons"],
    enabled: !user,
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, title, duration, audio_url, video_url, thumbnail_url, source_type, views_count, rabbis(id, name, image_url), series(id, title)")
        .eq("status", "published")
        .order("views_count", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  // Only show for non-logged-in users
  if (user) return null;
  if (!isLoading && (!lessons || lessons.length === 0)) return null;

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="py-10 md:py-14" dir="rtl">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-destructive" />
              <h2 className="text-lg md:text-xl font-heading text-foreground">פופולרי השבוע 🔥</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => scroll("right")}
                className="h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => scroll("left")}
                className="h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonLessonCard key={i} className="w-72 md:w-80 shrink-0" />
              ))}
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {lessons?.map((lesson: any, i: number) => {
                const rabbi = lesson.rabbis;
                const hasAudio = !!lesson.audio_url;
                const hasVideo = !!lesson.video_url;

                return (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                    className="snap-start shrink-0 w-72 md:w-80 bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group relative overflow-hidden"
                    onClick={() => setSelectedLessonId(lesson.id)}
                  >
                    {/* Sparkle gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10">
                      <div className="flex items-start gap-3 mb-3">
                        {lesson.thumbnail_url ? (
                          <img
                            src={lesson.thumbnail_url}
                            alt=""
                            width={64}
                            height={64}
                            className="w-16 h-16 rounded-xl object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            {hasVideo ? (
                              <Play className="h-6 w-6 text-primary" />
                            ) : hasAudio ? (
                              <Volume2 className="h-6 w-6 text-primary" />
                            ) : (
                              <BookOpen className="h-6 w-6 text-primary" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {lesson.title}
                          </h3>
                          {rabbi?.name && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              {rabbi.image_url && (
                                <img src={rabbi.image_url} alt="" width={16} height={16} className="w-4 h-4 rounded-full object-cover" loading="lazy" />
                              )}
                              <span className="text-xs text-muted-foreground">{rabbi.name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {formatDuration(lesson.duration) && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {formatDuration(lesson.duration)}
                            </span>
                          )}
                          {lesson.views_count > 0 && (
                            <span>{lesson.views_count.toLocaleString()} צפיות</span>
                          )}
                        </div>

                        {hasAudio && (
                          <button
                            className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              play({
                                id: lesson.id,
                                title: lesson.title,
                                audioUrl: lesson.audio_url!,
                                rabbiName: rabbi?.name,
                                duration: lesson.duration,
                                thumbnailUrl: lesson.thumbnail_url,
                              });
                            }}
                          >
                            <Play className="h-3 w-3" />
                            השמע
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

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

export default PopularSection;
