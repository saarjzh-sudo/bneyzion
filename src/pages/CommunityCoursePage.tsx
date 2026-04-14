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

const CommunityCoursePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { data: member, isLoading: memberLoading } = useMemberAccess(user?.email ?? undefined);
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["community-course", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("community_courses").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: lessons, isLoading: lessonsLoading } = useCourseLessons(id);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);

  useSEO({
    title: course?.title,
    description: course?.description ?? undefined,
    image: course?.image_url ?? undefined,
  });

  if (!authLoading && !user) return <Navigate to="/auth?redirect=/portal" replace />;

  const isMember = !!member && member.status === "active";
  const isLoading = authLoading || memberLoading || courseLoading || lessonsLoading;

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
        <Card className="max-w-md border-2 border-primary/30">
          <CardContent className="p-8 text-center space-y-4">
            <Lock className="w-12 h-12 mx-auto text-primary/50" />
            <h2 className="text-xl font-bold text-primary">אזור סגור לחברי הקהילה</h2>
            <Button asChild><Link to="/chapter-weekly">הצטרפו לתכנית</Link></Button>
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
            <Card
              className="hover:shadow-md transition-all cursor-pointer border hover:border-primary/30 group"
              onClick={() => setSelectedLesson(lesson)}
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

              {selectedLesson.attachment_url && (
                <a
                  href={selectedLesson.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Paperclip className="h-4 w-4" />
                  הורד קובץ מצורף
                </a>
              )}

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
