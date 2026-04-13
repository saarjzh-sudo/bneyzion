import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Play, Clock, Volume2, BookOpen, Sparkles, Flame, RefreshCw, ScrollText, Heart, Crown, HandHeart, Gem } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/contexts/PlayerContext";
import LessonDialog from "@/components/lesson/LessonDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const TOPICS = [
  { id: "אמונה", label: "אמונה", Icon: Flame, gradient: "from-amber-500 to-orange-400" },
  { id: "תשובה", label: "תשובה", Icon: RefreshCw, gradient: "from-sky-500 to-blue-400" },
  { id: "תורה", label: "תורה", Icon: ScrollText, gradient: "from-emerald-500 to-teal-400" },
  { id: "שבת", label: "שבת", Icon: Sparkles, gradient: "from-violet-500 to-purple-400" },
  { id: "חגים", label: "חגים", Icon: Heart, gradient: "from-rose-500 to-pink-400" },
  { id: "הנהגה", label: "הנהגה", Icon: Crown, gradient: "from-yellow-500 to-amber-400" },
  { id: "תפילה", label: "תפילה", Icon: HandHeart, gradient: "from-cyan-500 to-sky-400" },
  { id: "ערכים", label: "ערכים", Icon: Gem, gradient: "from-teal-500 to-emerald-400" },
];

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)} דק׳`;
}

const WhatToLearnDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [step, setStep] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedRabbiId, setSelectedRabbiId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const { play } = usePlayer();

  const { data: rabbis } = useQuery({
    queryKey: ["quiz-rabbis"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("rabbis")
        .select("id, name, image_url, specialty")
        .eq("status", "active")
        .order("lesson_count", { ascending: false })
        .limit(8);
      return data || [];
    },
  });

  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ["quiz-results", selectedTopic, selectedRabbiId],
    enabled: step === 2 && !!selectedTopic,
    queryFn: async () => {
      let query = supabase
        .from("lessons")
        .select("id, title, duration, audio_url, video_url, thumbnail_url, source_type, description, rabbis(id, name, image_url), series(id, title)")
        .eq("status", "published")
        .order("views_count", { ascending: false })
        .limit(4);

      if (selectedRabbiId) query = query.eq("rabbi_id", selectedRabbiId);
      if (selectedTopic) query = query.or(`title.ilike.%${selectedTopic}%,description.ilike.%${selectedTopic}%`);

      const { data } = await query;
      
      if (!data || data.length < 2) {
        const fallbackQuery = supabase
          .from("lessons")
          .select("id, title, duration, audio_url, video_url, thumbnail_url, source_type, description, rabbis(id, name, image_url), series(id, title)")
          .eq("status", "published")
          .order("views_count", { ascending: false })
          .limit(4);

        if (selectedRabbiId) {
          const { data: fbData } = await fallbackQuery.eq("rabbi_id", selectedRabbiId);
          return fbData || [];
        }
        const { data: fbData } = await fallbackQuery;
        return fbData || [];
      }
      return data;
    },
  });

  const reset = () => {
    setStep(0);
    setSelectedTopic(null);
    setSelectedRabbiId(null);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg md:max-w-2xl p-0 overflow-hidden border-0 shadow-2xl shadow-primary/10 rounded-3xl" dir="rtl">
          {/* Elegant header with gradient */}
          <div className="relative overflow-hidden px-7 pt-8 pb-6">
            <div className="absolute inset-0 bg-gradient-to-bl from-primary/15 via-accent/10 to-primary/5" />
            <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
            
            <div className="relative">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Sparkles className="h-4.5 w-4.5 text-primary" />
                </div>
                <h2 className="text-2xl font-heading text-foreground">מה נלמד היום?</h2>
              </div>
              <p className="text-sm text-muted-foreground mr-[46px]">
                {step === 0 && "בחר נושא שמעניין אותך"}
                {step === 1 && "רוצה רב מסוים? (אופציונלי)"}
                {step === 2 && "הנה מה שנבחר בשבילך"}
              </p>
              
              {/* Elegant progress bar */}
              <div className="flex gap-1.5 mt-5">
                {[0, 1, 2].map((s) => (
                  <div
                    key={s}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      s <= step ? "bg-primary flex-[2]" : "bg-border flex-1"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="px-7 pb-7 min-h-[300px]">
            <AnimatePresence mode="wait">
              {/* Step 0: Choose topic */}
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                >
                  {TOPICS.map((topic, i) => (
                    <motion.button
                      key={topic.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04, type: "spring", stiffness: 400 }}
                      whileHover={{ scale: 1.06, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedTopic(topic.id);
                        setStep(1);
                      }}
                      className="relative p-5 rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all text-center group overflow-hidden hover:shadow-lg"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${topic.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                      <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <topic.Icon className="h-5 w-5 text-foreground/70" />
                      </div>
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors relative">
                        {topic.label}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* Step 1: Choose rabbi */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    {rabbis?.map((rabbi: any, i: number) => (
                      <motion.button
                        key={rabbi.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04, type: "spring", stiffness: 400 }}
                        whileHover={{ scale: 1.05, y: -3 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedRabbiId(rabbi.id);
                          setStep(2);
                        }}
                        className={`p-4 rounded-2xl border transition-all text-center group overflow-hidden hover:shadow-lg ${
                          selectedRabbiId === rabbi.id
                            ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                            : "border-border/50 bg-card hover:border-primary/30"
                        }`}
                      >
                        {rabbi.image_url ? (
                          <img
                            src={rabbi.image_url}
                            alt={rabbi.name}
                            className="w-14 h-14 rounded-full mx-auto mb-2.5 object-cover ring-2 ring-border group-hover:ring-primary/30 transition-all"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full mx-auto mb-2.5 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-2 ring-border group-hover:ring-primary/30 transition-all">
                            <span className="text-base font-bold text-primary">{rabbi.name[0]}</span>
                          </div>
                        )}
                        <span className="text-xs font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {rabbi.name}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-primary rounded-xl"
                    onClick={() => setStep(2)}
                  >
                    דלג — הפתע אותי
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Results */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                >
                  {resultsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-2xl" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {results?.map((lesson: any, i: number) => {
                        const rabbi = lesson.rabbis;
                        const hasAudio = !!lesson.audio_url;
                        const hasVideo = !!lesson.video_url;

                        return (
                          <motion.div
                            key={lesson.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => {
                              setSelectedLessonId(lesson.id);
                              handleClose(false);
                            }}
                          >
                            {lesson.thumbnail_url ? (
                              <img src={lesson.thumbnail_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" loading="lazy" />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center shrink-0">
                                {hasVideo ? <Play className="h-5 w-5 text-primary" /> : hasAudio ? <Volume2 className="h-5 w-5 text-primary" /> : <BookOpen className="h-5 w-5 text-primary" />}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                {lesson.title}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                {rabbi?.name && <span>{rabbi.name}</span>}
                                {formatDuration(lesson.duration) && (
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(lesson.duration)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {hasAudio && (
                              <button
                                className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center"
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
                                  handleClose(false);
                                }}
                              >
                                <Play className="h-4 w-4" />
                              </button>
                            )}
                          </motion.div>
                        );
                      })}

                      <div className="pt-3 flex items-center justify-between">
                        <Button variant="ghost" size="sm" onClick={reset} className="rounded-xl text-muted-foreground hover:text-primary">
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          התחל מחדש
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      {selectedLessonId && (
        <LessonDialog
          lessonId={selectedLessonId}
          open={!!selectedLessonId}
          onOpenChange={(open) => !open && setSelectedLessonId(null)}
        />
      )}
    </>
  );
};

export default WhatToLearnDialog;
