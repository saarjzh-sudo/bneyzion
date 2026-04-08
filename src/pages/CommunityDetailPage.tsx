import { useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Video, Play, Lock, Clock, Users, BookOpen, ArrowRight, CheckCircle2, ChevronLeft, Headphones, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCourseDetail, useCourseSessions, useCourseEnrollment, useEnrollInCourse } from "@/hooks/useCourseEnrollment";
import { useCourseLessons, useMemberAccess } from "@/hooks/useCommunity";
import Layout from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSEO } from "@/hooks/useSEO";
import { toast } from "sonner";
import SmartAuthCTA from "@/components/auth/SmartAuthCTA";

const CommunityDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: course, isLoading: courseLoading } = useCourseDetail(id);
  const { data: sessions = [] } = useCourseSessions(id);
  const { data: lessons = [] } = useCourseLessons(id);
  const { data: enrollment } = useCourseEnrollment(id);
  const { data: member } = useMemberAccess(user?.email ?? undefined);
  const enrollMutation = useEnrollInCourse();
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);

  const isMember = !!member && member.status === "active";
  const isEnrolled = !!enrollment;

  useSEO({
    title: course?.title,
    description: course?.description ?? undefined,
    image: course?.image_url ?? undefined,
  });

  const rabbi = course?.rabbis as any;
  const upcomingSessions = sessions.filter((s: any) => s.status === "upcoming" && new Date(s.session_date) >= new Date());
  const pastSessions = sessions.filter((s: any) => s.is_recorded || s.status === "completed");

  const handleEnroll = () => {
    if (!user) return;
    enrollMutation.mutate(id!, {
      onSuccess: () => toast.success("נרשמת בהצלחה לקורס!"),
      onError: () => toast.error("שגיאה בהרשמה"),
    });
  };

  if (courseLoading) {
    return (
      <Layout>
        <div className="container py-16 space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Layout>
    );
  }

  if (!course) return <Navigate to="/community" replace />;

  return (
    <Layout>
      {/* Course Hero */}
      <section className="relative overflow-hidden py-14 md:py-20">
        <div className="absolute inset-0">
          {course.image_url ? (
            <img src={course.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
        </div>
        <div className="container relative z-10">
          <Link to="/community" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6 transition-colors">
            <ArrowRight className="h-3.5 w-3.5" /> חזרה לקורסים
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                {course.course_type === "weekly" ? "🎥 שבועי זום" : "🎧 מוקלט"}
              </Badge>
              {isEnrolled && (
                <Badge className="bg-primary text-primary-foreground border-0">
                  <CheckCircle2 className="h-3 w-3 ml-1" /> נרשמת
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading text-white mb-3">{course.title}</h1>
            {course.description && (
              <p className="text-lg text-white/80 max-w-2xl mb-4">{course.description}</p>
            )}

            {/* Rabbi info */}
            <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm mb-6">
              {rabbi && (
                <div className="flex items-center gap-2">
                  {rabbi.image_url ? (
                    <img src={rabbi.image_url} alt="" className="h-8 w-8 rounded-full object-cover border-2 border-white/30" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">{rabbi.name?.[0]}</div>
                  )}
                  <span className="text-white/90 font-medium">{rabbi.title} {rabbi.name}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" /> {course.total_lessons} שיעורים
              </div>
              {upcomingSessions.length > 0 && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {upcomingSessions.length} מפגשים קרובים
                </div>
              )}
            </div>

            {/* Enroll CTA */}
            {!isEnrolled && user && (
              <Button size="lg" onClick={handleEnroll} disabled={enrollMutation.isPending} className="gap-2 text-base px-8">
                <Users className="h-4 w-4" />
                {course.price && course.price > 0 ? `הירשם — ₪${course.price}` : "הירשם חינם"}
              </Button>
            )}
            {!user && (
              <SmartAuthCTA variant="enroll" compact />
            )}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <div className="container py-8">
        <Tabs defaultValue={upcomingSessions.length > 0 ? "schedule" : "lessons"} dir="rtl">
          <TabsList className="mb-6 bg-muted/50">
            {upcomingSessions.length > 0 && (
              <TabsTrigger value="schedule" className="gap-1.5"><Calendar className="h-3.5 w-3.5" />המפגשים הקרובים</TabsTrigger>
            )}
            <TabsTrigger value="lessons" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />שיעורים מוקלטים</TabsTrigger>
            {pastSessions.length > 0 && (
              <TabsTrigger value="recordings" className="gap-1.5"><Video className="h-3.5 w-3.5" />הקלטות</TabsTrigger>
            )}
          </TabsList>

          {/* Schedule */}
          <TabsContent value="schedule" className="space-y-3">
            {upcomingSessions.map((s: any, i: number) => (
              <SessionCard key={s.id} session={s} index={i} isEnrolled={isEnrolled} />
            ))}
          </TabsContent>

          {/* Lessons */}
          <TabsContent value="lessons" className="space-y-2">
            <LessonsList
              lessons={lessons}
              isEnrolled={isEnrolled}
              isMember={isMember}
              user={user}
              onSelect={setSelectedLesson}
              onEnroll={handleEnroll}
              enrollPending={enrollMutation.isPending}
            />
          </TabsContent>

          {/* Recordings */}
          <TabsContent value="recordings" className="space-y-3">
            {pastSessions.map((s: any, i: number) => (
              <RecordingCard key={s.id} session={s} index={i} isEnrolled={isEnrolled} />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Lesson Dialog */}
      <Dialog open={!!selectedLesson} onOpenChange={(open) => !open && setSelectedLesson(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          {selectedLesson && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-heading">{selectedLesson.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedLesson.video_url && (
                  <div className="aspect-video rounded-xl overflow-hidden bg-black">
                    <iframe src={selectedLesson.video_url} className="w-full h-full" allowFullScreen />
                  </div>
                )}
                {selectedLesson.audio_url && (
                  <audio controls className="w-full" src={selectedLesson.audio_url} />
                )}
                {selectedLesson.content_html && (
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedLesson.content_html }} />
                )}
                {selectedLesson.description && !selectedLesson.content_html && (
                  <p className="text-muted-foreground">{selectedLesson.description}</p>
                )}
                {selectedLesson.attachment_url && (
                  <a href={selectedLesson.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline text-sm">
                    <FileText className="h-4 w-4" /> הורד חומרי לימוד
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

/* ───────── Sub-components ───────── */

const SessionCard = ({ session: s, index: i, isEnrolled }: { session: any; index: number; isEnrolled: boolean }) => (
  <motion.div
    initial={{ opacity: 0, x: 15 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: i * 0.06 }}
    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/20 transition-all"
  >
    <div className="h-12 w-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
      <span className="text-lg font-bold text-primary leading-none">{new Date(s.session_date).getDate()}</span>
      <span className="text-[10px] text-primary">{new Date(s.session_date).toLocaleDateString("he-IL", { month: "short" })}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-heading text-foreground">{s.title}</p>
      <p className="text-xs text-muted-foreground">
        {new Date(s.session_date).toLocaleDateString("he-IL", { weekday: "long" })} · {new Date(s.session_date).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
        {s.duration_minutes && ` · ${s.duration_minutes} דק'`}
      </p>
    </div>
    {isEnrolled && s.zoom_link ? (
      <a href={s.zoom_link} target="_blank" rel="noopener noreferrer">
        <Button size="sm" className="gap-1.5">
          <Video className="h-3.5 w-3.5" /> כניסה לזום
        </Button>
      </a>
    ) : !isEnrolled ? (
      <Lock className="h-4 w-4 text-muted-foreground" />
    ) : null}
  </motion.div>
);

const RecordingCard = ({ session: s, index: i, isEnrolled }: { session: any; index: number; isEnrolled: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.04 }}
    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
  >
    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
      <Play className="h-4 w-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground">{s.title}</p>
      <p className="text-xs text-muted-foreground">
        {new Date(s.session_date).toLocaleDateString("he-IL")}
        {s.duration_minutes && ` · ${s.duration_minutes} דק'`}
      </p>
    </div>
    {isEnrolled && s.recording_url ? (
      <a href={s.recording_url} target="_blank" rel="noopener noreferrer">
        <Button size="sm" variant="outline" className="gap-1.5">
          <Play className="h-3.5 w-3.5" /> צפה
        </Button>
      </a>
    ) : (
      <Lock className="h-4 w-4 text-muted-foreground" />
    )}
  </motion.div>
);

const LessonsList = ({ lessons, isEnrolled, isMember, user, onSelect, onEnroll, enrollPending }: any) => {
  const canAccess = isEnrolled || isMember;

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookOpen className="h-10 w-10 mx-auto mb-2 text-border" />
        <p>שיעורים בהכנה...</p>
      </div>
    );
  }

  return (
    <>
      {lessons.map((lesson: any, i: number) => (
        <motion.button
          key={lesson.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => canAccess && onSelect(lesson)}
          disabled={!canAccess}
          className={`w-full flex items-center gap-3 p-4 rounded-xl border text-right transition-all ${
            canAccess ? "bg-card border-border hover:border-primary/30 hover:shadow-md cursor-pointer" : "bg-muted/30 border-border/50 opacity-60"
          }`}
        >
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
            {lesson.lesson_number}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
            {lesson.description && <p className="text-xs text-muted-foreground truncate">{lesson.description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lesson.video_url && <Video className="h-3.5 w-3.5 text-muted-foreground" />}
            {lesson.audio_url && <Headphones className="h-3.5 w-3.5 text-muted-foreground" />}
            {lesson.attachment_url && <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
            {!canAccess && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            {canAccess && <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        </motion.button>
      ))}

      {!canAccess && (
        <div className="mt-6 text-center p-6 bg-muted/30 rounded-2xl border border-border">
          <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-foreground font-heading mb-1">תוכן זה זמין לחברי קהילה בלבד</p>
          <p className="text-sm text-muted-foreground mb-4">הירשם לקורס או הצטרף לקהילה לגישה מלאה</p>
          {user ? (
            <Button onClick={onEnroll} disabled={enrollPending}>הירשם לקורס</Button>
          ) : (
            <SmartAuthCTA variant="enroll" />
          )}
        </div>
      )}
    </>
  );
};

export default CommunityDetailPage;
