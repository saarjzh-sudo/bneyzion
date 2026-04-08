import { motion } from "framer-motion";
import { Flame, Play, BookOpen, ArrowLeft, Clock, Trophy, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { useLearningDashboard } from "@/hooks/useLearningDashboard";
import { usePlayer } from "@/contexts/PlayerContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import LessonDialog from "@/components/lesson/LessonDialog";

function formatSeconds(s: number | null | undefined): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  return `${m} דק׳`;
}

const LearningDashboard = () => {
  const { lastWatched, enrollments, streak, activityDays, isLoggedIn } = useLearningDashboard();
  const { play } = usePlayer();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  if (!isLoggedIn) return null;

  const hasContent = lastWatched || (enrollments && enrollments.length > 0) || streak > 0;
  if (!hasContent) return null;

  // Build last 7 days for mini heatmap
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const activity = activityDays?.find((a: any) => a.activity_date === dateStr);
    return {
      date: dateStr,
      day: d.toLocaleDateString("he-IL", { weekday: "narrow" }),
      active: !!activity,
      minutes: activity?.minutes_learned || 0,
    };
  });

  // Calculate total stats
  const totalMinutes = activityDays?.reduce((sum: number, d: any) => sum + (d.minutes_learned || 0), 0) || 0;
  const totalLessons = activityDays?.reduce((sum: number, d: any) => sum + (d.lessons_completed || 0), 0) || 0;

  return (
    <section className="py-8 md:py-12" dir="rtl">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-5 md:p-7 space-y-5"
        >
          {/* Header with streak & stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg md:text-xl font-heading text-foreground">המשך ללמוד</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Personal stats badges */}
              {totalMinutes > 0 && (
                <div className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">{totalMinutes} דק׳ למידה</span>
                </div>
              )}
              {totalLessons > 0 && (
                <div className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5">
                  <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">{totalLessons} שיעורים</span>
                </div>
              )}

              {/* Mini heatmap */}
              <div className="hidden sm:flex items-center gap-1">
                {last7.map((d) => (
                  <div key={d.date} className="flex flex-col items-center gap-0.5">
                    <div
                      className={`w-5 h-5 rounded-sm transition-colors ${
                        d.active ? "bg-primary/80" : "bg-muted"
                      }`}
                      title={`${d.date}: ${d.minutes} דקות`}
                    />
                    <span className="text-[10px] text-muted-foreground">{d.day}</span>
                  </div>
                ))}
              </div>

              {/* Streak badge */}
              {streak > 0 && (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-1.5"
                >
                  <Flame className="h-4 w-4" />
                  <span className="text-sm font-bold tabular-nums">{streak}</span>
                  <span className="text-xs">ימים רצופים</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Continue where you left off */}
          {lastWatched && (
            <div className="flex items-center gap-4 bg-gradient-to-l from-primary/5 via-muted/50 to-muted/50 rounded-xl p-4 border border-primary/10">
              <div className="shrink-0">
                {lastWatched.lesson?.thumbnail_url ? (
                  <img
                    src={lastWatched.lesson.thumbnail_url}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Play className="h-6 w-6 text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary font-medium mb-0.5 flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  המשך מאיפה שהפסקת
                </p>
                <p className="text-sm font-semibold text-foreground truncate">
                  {lastWatched.lesson?.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {lastWatched.lesson?.rabbis?.name && (
                    <span>{lastWatched.lesson.rabbis.name}</span>
                  )}
                  {lastWatched.progress_seconds != null && lastWatched.progress_seconds > 0 && (
                    <span>• {formatSeconds(lastWatched.progress_seconds)} שנצפו</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {lastWatched.lesson?.audio_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      play({
                        id: lastWatched.lesson.id,
                        title: lastWatched.lesson.title,
                        audioUrl: lastWatched.lesson.audio_url!,
                        rabbiName: lastWatched.lesson.rabbis?.name,
                        duration: lastWatched.lesson.duration,
                        thumbnailUrl: lastWatched.lesson.thumbnail_url,
                      });
                    }}
                  >
                    <Play className="h-3.5 w-3.5" />
                    השמע
                  </Button>
                )}
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setSelectedLessonId(lastWatched.lesson_id)}
                >
                  המשך
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Active enrollments */}
          {enrollments && enrollments.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  קורסים פעילים
                </h3>
                <Link to="/profile" className="text-xs text-primary hover:text-primary/80">
                  הכל ←
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {enrollments.map((e: any) => {
                  const progress = e.series?.lesson_count
                    ? Math.round((e.completed_lessons / e.series.lesson_count) * 100)
                    : 0;
                  return (
                    <Link
                      key={e.id}
                      to={`/series/${e.series_id}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary truncate">
                          {e.series?.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                            {progress}%
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
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

export default LearningDashboard;
