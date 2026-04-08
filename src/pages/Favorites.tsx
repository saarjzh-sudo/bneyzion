import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Trash2, Clock, BookOpen, Volume2, Video } from "lucide-react";
import PageHero from "@/components/layout/PageHero";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites, useRemoveFavorite } from "@/hooks/useFavorites";
import LessonDialog from "@/components/lesson/LessonDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SmartAuthCTA from "@/components/auth/SmartAuthCTA";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)} דקות`;
}

const Favorites = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { data: favorites, isLoading } = useFavorites();
  const removeFavorite = useRemoveFavorite();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  if (authLoading) return null;
  if (!user) {
    return (
      <Layout>
        <PageHero
          title="שיעורים שמורים"
          icon={<Heart className="h-7 w-7 fill-current" />}
        />
        <section className="py-16 min-h-[40vh]">
          <div className="container max-w-lg">
            <SmartAuthCTA variant="favorites" />
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHero
        title="שיעורים שמורים"
        subtitle={favorites?.length ? `${favorites.length} שיעורים שמורים` : undefined}
        icon={<Heart className="h-7 w-7 fill-current" />}
      />

      <section className="py-10 section-gradient-warm min-h-[50vh]">
        <div className="container max-w-4xl">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : favorites && favorites.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {favorites.map((fav, i) => {
                const lesson = fav.lesson;
                if (!lesson) return null;
                const rabbi = lesson.rabbis as any;
                const hasVideo = !!lesson.video_url;
                const hasAudio = !!lesson.audio_url;

                return (
                  <motion.div
                    key={fav.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-card-light rounded-xl p-4 flex items-center gap-4 group hover:border-primary/20 transition-all cursor-pointer"
                    onClick={() => setSelectedLessonId(lesson.id)}
                  >
                    {/* Media indicator */}
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {hasVideo ? (
                        <Video className="h-5 w-5 text-primary" />
                      ) : hasAudio ? (
                        <Volume2 className="h-5 w-5 text-primary" />
                      ) : (
                        <BookOpen className="h-5 w-5 text-primary" />
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

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite.mutate(fav.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="text-center py-20">
              <Heart className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-display">אין שיעורים שמורים עדיין</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                לחץ על ❤️ בשיעור כדי לשמור אותו כאן
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

export default Favorites;
