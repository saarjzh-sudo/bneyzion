import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { History, Clock, BookOpen, Volume2, Video, CheckCircle2 } from "lucide-react";
import PageHero from "@/components/layout/PageHero";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useHistory } from "@/hooks/useHistory";
import LessonDialog from "@/components/lesson/LessonDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import SmartAuthCTA from "@/components/auth/SmartAuthCTA";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)} דקות`;
}

function formatDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "היום";
  if (diffDays === 1) return "אתמול";
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

const HistoryPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { data: history, isLoading } = useHistory();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  if (authLoading) return null;
  if (!user) {
    return (
      <Layout>
        <PageHero
          title="היסטוריית צפייה"
          icon={<History className="h-7 w-7" />}
        />
        <section className="py-16 min-h-[40vh]">
          <div className="container max-w-lg">
            <SmartAuthCTA variant="progress" />
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHero
        title="היסטוריית צפייה"
        subtitle={history?.length ? `${history.length} שיעורים` : undefined}
        icon={<History className="h-7 w-7" />}
      />

      <section className="py-10 section-gradient-warm min-h-[50vh]">
        <div className="container max-w-4xl">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : history && history.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {history.map((item, i) => {
                const lesson = item.lesson;
                if (!lesson) return null;
                const rabbi = lesson.rabbis as any;
                const hasVideo = !!lesson.video_url;
                const hasAudio = !!lesson.audio_url;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-card-light rounded-xl p-4 flex items-center gap-4 group hover:border-primary/20 transition-all cursor-pointer"
                    onClick={() => setSelectedLessonId(lesson.id)}
                  >
                    {/* Media indicator */}
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 relative">
                      {hasVideo ? (
                        <Video className="h-5 w-5 text-primary" />
                      ) : hasAudio ? (
                        <Volume2 className="h-5 w-5 text-primary" />
                      ) : (
                        <BookOpen className="h-5 w-5 text-primary" />
                      )}
                      {item.completed && (
                        <CheckCircle2 className="h-4 w-4 text-primary absolute -top-1 -right-1 fill-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-display text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {lesson.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {rabbi?.name && <span>{rabbi.name}</span>}
                        {formatDuration(lesson.duration) && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {formatDuration(lesson.duration)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground shrink-0">
                      {formatDate(item.watched_at)}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="text-center py-20">
              <History className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-display">אין היסטוריית צפייה עדיין</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                שיעורים שתצפו בהם יופיעו כאן
              </p>
              <Link to="/" className="text-primary text-sm hover:underline mt-4 inline-block">
                חזרה לדף הראשי
              </Link>
            </div>
          )}
        </div>
      </section>

      <LessonDialog
        lessonId={selectedLessonId}
        open={!!selectedLessonId}
        onOpenChange={(open) => !open && setSelectedLessonId(null)}
      />
    </Layout>
  );
};

export default HistoryPage;
