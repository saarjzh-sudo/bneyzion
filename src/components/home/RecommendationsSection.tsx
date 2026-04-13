import { useState } from "react";
import { motion } from "framer-motion";
import { Target, Play, Volume2, Clock, BookOpen } from "lucide-react";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import LessonDialog from "@/components/lesson/LessonDialog";
import { SkeletonLessonCard } from "@/components/ui/skeleton-card";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)} דק׳`;
}

const RecommendationsSection = () => {
  const { user } = useAuth();
  const { data, isLoading } = useRecommendations(6);
  const { play } = usePlayer();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  if (!user) return null;
  if (!isLoading && (!data?.lessons || data.lessons.length === 0)) return null;

  return (
    <section className="py-8 md:py-12" dir="rtl">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-lg md:text-xl font-heading text-foreground">בשבילך</h2>
            {data?.source === "popular" && (
              <span className="text-xs text-muted-foreground mr-2">שיעורים פופולריים</span>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonLessonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.lessons.map((lesson: any, i: number) => {
                const rabbi = lesson.rabbis;
                const series = lesson.series;
                const hasAudio = !!lesson.audio_url;
                const hasVideo = !!lesson.video_url;

                return (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => setSelectedLessonId(lesson.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail or icon */}
                      {lesson.thumbnail_url ? (
                        <img
                          src={lesson.thumbnail_url}
                          alt=""
                          width={56}
                          height={56}
                          className="w-14 h-14 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          {hasVideo ? (
                            <Play className="h-5 w-5 text-primary" />
                          ) : hasAudio ? (
                            <Volume2 className="h-5 w-5 text-primary" />
                          ) : (
                            <BookOpen className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {lesson.title}
                        </h3>

                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          {rabbi?.name && (
                            <span className="flex items-center gap-1">
                              {rabbi.image_url && (
                                <img src={rabbi.image_url} alt="" width={16} height={16} className="w-4 h-4 rounded-full object-cover" loading="lazy" />
                              )}
                              {rabbi.name}
                            </span>
                          )}
                          {formatDuration(lesson.duration) && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {formatDuration(lesson.duration)}
                            </span>
                          )}
                        </div>

                        {series?.title && (
                          <p className="text-[11px] text-muted-foreground/70 mt-1 truncate">
                            {series.title}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quick play button for audio */}
                    {hasAudio && (
                      <button
                        className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
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
                        השמע עכשיו
                      </button>
                    )}
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

export default RecommendationsSection;
