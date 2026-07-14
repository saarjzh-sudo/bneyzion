import { sanitizeHtml } from "@/lib/sanitize";
import { useParams, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCourseLessons, useMemberAccess } from "@/hooks/useCommunity";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Lock, Play, FileText, Headphones, Paperclip, ChevronLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/useSEO";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// רמה 18 (יואב 14.7): מעקב התקדמות — סימון "נלמד" אישי לכל שיעור
import { useCourseProgress, useToggleLessonComplete } from "@/hooks/useCourseProgress";
import { Circle } from "lucide-react";

const CommunityCoursePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["community-course", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("community_courses").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
  // גישה לפי הקורס עצמו (2.7.2026, החלטת סער): קורס פתוח — לכל משתמש מחובר;
  // קורס סגור — לפי הרשמה (course_enrollments) של הקורס הזה. לא לפי חברות
  // בפרק השבועי — הקורסים והתכנית נפרדים, לכל קורס דף ומכירה משלו.
  const { data: enrollment, isLoading: enrollLoading } = useQuery({
    queryKey: ["course-enrollment", id, user?.id],
    enabled: !!id && !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_enrollments")
        .select("id")
        .eq("course_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: lessons, isLoading: lessonsLoading } = useCourseLessons(id);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  // רמה 18: מעקב התקדמות אישי — הסימונים נשמרים לכל לומד בנפרד
  const { completedIds, canTrack } = useCourseProgress(id);
  const toggleComplete = useToggleLessonComplete(id);

  useSEO({
    title: course?.title,
    description: course?.description ?? undefined,
    image: course?.image_url ?? undefined,
  });

  // סער 14.7: קורס-ספר (יש לו program_slug) נלמד בדף הספר המסודר-לפי-פרקים —
  // הדף השטוח הזה נשאר רק לקורסי-קהילה חופשיים בלי מבנה פרקים.
  // הסדר קריטי: קודם מחכים לקורס ומפנים (גם אורח מגיע לדף-המכירה של הספר),
  // ורק אחר-כך דורשים התחברות עבור קורסי-הקהילה שנשארים כאן.
  if (courseLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="max-w-4xl mx-auto p-8 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }
  if (course && (course as any).program_slug) {
    return <Navigate to={`/course/${(course as any).program_slug}`} replace />;
  }

  if (!authLoading && !user) return <Navigate to="/auth?redirect=/portal" replace />;

  const courseIsOpen = !course?.access_type || course.access_type === "open";
  const isMember = courseIsOpen || !!enrollment;
  const isLoading = authLoading || courseLoading || lessonsLoading || (!courseIsOpen && enrollLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="max-w-4xl mx-auto p-8 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-20 w-full" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Card className="max-w-md border-2 border-gold/30 shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-gold/15 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-gold" />
            </div>
            <h2 className="text-xl font-heading text-primary">הקורס עוד לא פתוח לך</h2>
            <p className="text-sm text-muted-foreground">אפשר להכיר את הקורס ולהצטרף אליו בדף הקורס</p>
            <Button asChild><Link to={`/community/${id}`}>לדף הקורס</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/20 to-background" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-primary to-primary/80 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link to="/portal" className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground text-sm mb-4 transition-colors">
            <ArrowRight className="h-4 w-4" />
            חזרה לפורטל
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">{course?.title}</h1>
          {course?.description && (
            <p className="text-primary-foreground/80 mt-2">{course.description}</p>
          )}
          <Badge className="mt-3 bg-accent/20 text-primary-foreground">{course?.total_lessons} שיעורים</Badge>
          {/* רמה 18: התקדמות אישית */}
          {canTrack && (lessons?.length ?? 0) > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 w-40 rounded-full bg-primary-foreground/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${Math.min(100, Math.round((completedIds.size / (lessons?.length || 1)) * 100))}%` }}
                />
              </div>
              <span className="text-xs text-primary-foreground/80">
                סימנת {completedIds.size} מתוך {lessons?.length} שיעורים כנלמדו
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Lessons List */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-3">
        {lessons?.map((lesson, i) => (
          <motion.div
            key={lesson.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <div className="flex items-center gap-2">
              <Card
                className="flex-1 hover:shadow-md transition-all cursor-pointer border hover:border-gold/40 group"
                onClick={() => setSelectedLesson(lesson)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedLesson(lesson); } }}
                aria-label={`פתיחת שיעור: ${lesson.title}`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {lesson.lesson_number || i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{lesson.title}</h3>
                    {lesson.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{lesson.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lesson.video_url && <Play className="h-4 w-4 text-primary/60" />}
                    {lesson.audio_url && <Headphones className="h-4 w-4 text-accent/60" />}
                    {lesson.attachment_url && <Paperclip className="h-4 w-4 text-muted-foreground/60" />}
                    <ChevronLeft className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
              {/* רמה 18: סימון "נלמד" — אח של הכרטיס (לא פקד בתוך פקד) */}
              {canTrack && (
                <button
                  type="button"
                  title={completedIds.has(lesson.id) ? "סומן כנלמד — לחיצה מבטלת" : "סמן שלמדתי את השיעור"}
                  aria-label={completedIds.has(lesson.id) ? `בטל סימון נלמד — ${lesson.title}` : `סמן כנלמד — ${lesson.title}`}
                  aria-pressed={completedIds.has(lesson.id)}
                  onClick={() =>
                    toggleComplete.mutate({ lessonId: lesson.id, completed: !completedIds.has(lesson.id) })
                  }
                  className={`shrink-0 p-1.5 transition-colors ${completedIds.has(lesson.id) ? "text-green-700" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
                >
                  {completedIds.has(lesson.id) ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lesson Dialog */}
      <Dialog open={!!selectedLesson} onOpenChange={(open) => { if (!open) setSelectedLesson(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" dir="rtl">
          {selectedLesson && (
            <>
              <DialogHeader className="text-right">
                <DialogTitle className="text-xl font-heading">{selectedLesson.title}</DialogTitle>
                {selectedLesson.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedLesson.description}</p>
                )}
              </DialogHeader>

              {selectedLesson.video_url && (
                <div className="aspect-video rounded-lg overflow-hidden bg-black border border-border">
                  <iframe src={selectedLesson.video_url} className="w-full h-full" allowFullScreen />
                </div>
              )}

              {selectedLesson.audio_url && (
                <div className="rounded-lg bg-secondary/40 border border-border p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Headphones className="h-5 w-5 text-primary" />
                  </div>
                  <audio controls src={selectedLesson.audio_url} className="w-full h-10" />
                </div>
              )}

              {selectedLesson.attachment_url && (() => {
                const url: string = String(selectedLesson.attachment_url);
                const lower = url.toLowerCase();
                const isPdf = lower.includes('.pdf');
                const isWord = lower.includes('.doc') || lower.includes('.docx');
                const encoded = encodeURIComponent(url);
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Paperclip className="h-4 w-4 text-primary" />
                        {isPdf ? 'PDF מצורף' : isWord ? 'Word מצורף' : 'קובץ מצורף'}
                      </span>
                      <div className="flex gap-2">
                        <a href={url} download className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md font-semibold hover:opacity-90 transition-opacity">
                          ↓ הורד
                        </a>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 border border-primary text-primary rounded-md font-semibold hover:opacity-80 transition-opacity">
                          פתח בלשונית ↗
                        </a>
                      </div>
                    </div>
                    {(isPdf || isWord) && (
                      <div className="rounded-lg overflow-hidden border border-border">
                        <iframe
                          src={isPdf
                            ? url
                            : `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`
                          }
                          className="w-full border-0"
                          style={{ height: "60vh", minHeight: "400px" }}
                          loading="lazy"
                          title={isPdf ? 'PDF Viewer' : 'Word Viewer'}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {selectedLesson.content_html && (
                <div
                  className="prose prose-sm md:prose-base max-w-none text-foreground prose-headings:font-heading prose-headings:text-primary leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedLesson.content_html ?? "") }}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommunityCoursePage;
