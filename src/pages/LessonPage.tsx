import { useEffect } from "react";
import { sanitizeHtml } from "@/lib/sanitize";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, BookOpen, Calendar, ChevronLeft, Volume2, Headphones, ListPlus, LogIn } from "lucide-react";
import { useSeriesBreadcrumb } from "@/hooks/useSeriesHierarchy";
import Layout from "@/components/layout/Layout";
import { useLesson, useSeriesLessons } from "@/hooks/useLesson";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSEO } from "@/hooks/useSEO";
import SmartAuthCTA from "@/components/auth/SmartAuthCTA";
import LessonComments from "@/components/lesson/LessonComments";
import AIChatWidget from "@/components/ai/AIChatWidget";
import DedicationDialog from "@/components/lesson/DedicationDialog";
import DedicationBadge from "@/components/lesson/DedicationBadge";
import { useMediaProgress } from "@/hooks/useMediaProgress";
import { saveLocalLastLesson } from "@/hooks/useLastLesson";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)} דקות`;
}

function isDirectVideo(url: string): boolean {
  const lower = url.toLowerCase();
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/.test(lower);
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
}

function LessonBreadcrumbs({ lesson, series }: { lesson: any; series: { id: string; title: string } | null }) {
  const { data: breadcrumb } = useSeriesBreadcrumb(series?.id);
  
  return (
    <div className="container pt-6 pb-2">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Link to="/" className="hover:text-primary transition-colors">ראשי</Link>
        <ChevronLeft className="h-3 w-3" />
        <Link to="/series" className="hover:text-primary transition-colors">מאגר השיעורים</Link>
        {breadcrumb && breadcrumb.length > 0 && breadcrumb.map((ancestor) => (
          <span key={ancestor.id} className="flex items-center gap-2">
            <ChevronLeft className="h-3 w-3" />
            <Link to={`/series/${ancestor.id}`} className="hover:text-primary transition-colors">
              {ancestor.title}
            </Link>
          </span>
        ))}
        {lesson.bible_book && (
          <>
            <ChevronLeft className="h-3 w-3" />
            <Link to={`/bible/${encodeURIComponent(lesson.bible_book)}`} className="hover:text-primary transition-colors">
              {lesson.bible_book}
            </Link>
            {lesson.bible_chapter && (
              <>
                <ChevronLeft className="h-3 w-3" />
                <span className="text-muted-foreground">פרק {lesson.bible_chapter}</span>
              </>
            )}
          </>
        )}
        <ChevronLeft className="h-3 w-3" />
        <span className="text-foreground truncate max-w-[200px]">{lesson.title}</span>
      </nav>
    </div>
  );
}

const LessonPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: lesson, isLoading } = useLesson(id);
  const { data: relatedLessons } = useSeriesLessons(lesson?.series_id, id);
  const { play, addToQueue, currentTrack } = usePlayer();
  const { user, signInWithGoogle } = useAuth();
  const mediaProgressRef = useMediaProgress(id);
  const rabbi = lesson?.rabbis as { id: string; name: string; image_url: string | null; title: string | null } | null;

  const rabbiName = rabbi?.title ? `${rabbi.title} ${rabbi.name}` : rabbi?.name;

  // Save last lesson to localStorage for non-authenticated users (continue where you left off)
  useEffect(() => {
    if (!lesson || user) return;
    saveLocalLastLesson({
      lessonId: lesson.id,
      title: lesson.title,
      rabbiName: rabbiName || null,
      progressSeconds: null,
      duration: lesson.duration,
      timestamp: Date.now(),
    });
  }, [lesson, user, rabbiName]);

  useSEO({
    title: lesson?.title,
    description: lesson?.description ?? undefined,
    image: lesson?.thumbnail_url ?? undefined,
    type: "article",
    jsonLd: lesson ? {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: lesson.title,
      description: lesson.description || undefined,
      image: lesson.thumbnail_url || undefined,
      author: rabbiName ? { "@type": "Person", name: rabbiName } : undefined,
      publisher: { "@type": "Organization", name: "בני ציון" },
      datePublished: lesson.published_at || undefined,
    } : undefined,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 space-y-6" dir="rtl">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Layout>
    );
  }

  if (!lesson) {
    return (
      <Layout>
        <div className="container py-24 text-center" dir="rtl">
          <h1 className="text-2xl font-heading text-foreground">השיעור לא נמצא</h1>
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">חזרה לדף הראשי</Link>
        </div>
      </Layout>
    );
  }

  const series = lesson.series as { id: string; title: string } | null;

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        dir="rtl"
      >
        {/* Breadcrumbs */}
        <LessonBreadcrumbs lesson={lesson} series={series} />

        <div className="container pb-16">
          <div className="max-w-3xl mt-4 space-y-6">
            {/* Title & meta */}
            <div>
              <h1 className="text-2xl md:text-3xl font-heading text-foreground leading-tight">{lesson.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
                {rabbi && (
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">מאת</span>
                    <Link to={`/rabbis/${rabbi.id}`} className="text-primary font-semibold hover:underline">
                      {rabbi.title ? `${rabbi.title} ${rabbi.name}` : rabbi.name}
                    </Link>
                  </span>
                )}
                {formatDuration(lesson.duration) && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(lesson.duration)}
                  </span>
                )}
                {formatDate(lesson.published_at) && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(lesson.published_at)}
                  </span>
                )}
              </div>
              {series && (
                <Link to={`/series/${series.id}`}>
                  <Badge variant="secondary" className="mt-3">{series.title}</Badge>
                </Link>
              )}
            </div>

            {/* Dedication */}
            <div className="flex items-center gap-3 flex-wrap">
              <DedicationDialog lessonId={lesson.id} lessonTitle={lesson.title} />
              <DedicationBadge lessonId={lesson.id} />
            </div>

            <Separator />

            {/* Compact media player */}
            {lesson.video_url ? (
              isDirectVideo(lesson.video_url) ? (
                <div className="aspect-video rounded-lg overflow-hidden bg-foreground/5 border border-border max-w-2xl">
                  <video
                    ref={mediaProgressRef}
                    src={lesson.video_url}
                    controls
                    className="w-full h-full"
                    poster={lesson.thumbnail_url || undefined}
                    controlsList="nodownload"
                    preload="metadata"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-lg overflow-hidden bg-foreground/5 border border-border max-w-2xl">
                  <iframe
                    src={lesson.video_url}
                    className="w-full h-full"
                    loading="lazy"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )
            ) : lesson.audio_url ? (
              <div className="space-y-3 max-w-xl">
                <div className="rounded-lg bg-secondary/40 border border-border p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Volume2 className="h-5 w-5 text-primary" />
                  </div>
                  <audio ref={mediaProgressRef} controls src={lesson.audio_url} className="w-full h-10" />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => play({
                      id: lesson.id,
                      title: lesson.title,
                      audioUrl: lesson.audio_url!,
                      rabbiName: rabbiName || undefined,
                      seriesTitle: (lesson.series as any)?.title || undefined,
                      duration: lesson.duration,
                      thumbnailUrl: lesson.thumbnail_url,
                    })}
                  >
                    <Headphones className="h-3.5 w-3.5" />
                    {currentTrack?.id === lesson.id ? "מושמע כעת" : "השמע ברקע"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => addToQueue({
                      id: lesson.id,
                      title: lesson.title,
                      audioUrl: lesson.audio_url!,
                      rabbiName: rabbiName || undefined,
                      seriesTitle: (lesson.series as any)?.title || undefined,
                      duration: lesson.duration,
                      thumbnailUrl: lesson.thumbnail_url,
                    })}
                  >
                    <ListPlus className="h-3.5 w-3.5" />
                    הוסף לרשימה
                  </Button>
                </div>
              </div>
            ) : null}

            {/* PDF Viewer for attachment_url */}
            {(lesson as any).attachment_url && String((lesson as any).attachment_url).toLowerCase().includes('.pdf') && (
              <div className="rounded-lg overflow-hidden border border-border bg-foreground/5">
                <div className="flex items-center justify-between bg-secondary/40 px-4 py-2 border-b border-border">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    צפייה במסמך
                  </span>
                  <a
                    href={(lesson as any).attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    פתח בחלון חדש ↗
                  </a>
                </div>
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent((lesson as any).attachment_url)}&embedded=true`}
                  className="w-full border-0"
                  style={{ height: "75vh", minHeight: "500px" }}
                  loading="lazy"
                  title="PDF Viewer"
                />
              </div>
            )}

            {/* Content - full HTML or plain description */}
            {(lesson as any).content ? (
              <div
                className="prose prose-sm md:prose-base max-w-none text-foreground leading-[1.9]
                  [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-heading [&_h2]:font-bold [&_h2]:text-primary [&_h2]:mt-10 [&_h2]:mb-4
                  [&_h3]:text-xl [&_h3]:md:text-2xl [&_h3]:font-heading [&_h3]:font-bold [&_h3]:text-primary [&_h3]:mt-8 [&_h3]:mb-3
                  [&_h4]:text-lg [&_h4]:md:text-xl [&_h4]:font-display [&_h4]:font-bold [&_h4]:text-foreground [&_h4]:mt-6 [&_h4]:mb-2
                  [&_p]:text-foreground [&_p]:mb-4 [&_p]:leading-[1.9]
                  [&_strong]:text-foreground [&_strong]:font-bold
                  [&_a]:text-primary [&_a]:underline
                  [&_blockquote]:border-r-4 [&_blockquote]:border-primary/30 [&_blockquote]:pr-4 [&_blockquote]:mr-0 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml((lesson as any).content ?? "") }}
              />
            ) : lesson.description ? (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{lesson.description}</p>
            ) : null}

            {/* Bible reference */}
            {(lesson.bible_book || lesson.bible_chapter) && (
              <div className="bg-secondary/40 rounded-lg p-4 border border-border max-w-sm">
                <h3 className="text-sm font-semibold text-foreground mb-1">מקור</h3>
                <p className="text-sm text-muted-foreground">
                  {[lesson.bible_book, lesson.bible_chapter && `פרק ${lesson.bible_chapter}`, lesson.bible_verse && `פסוק ${lesson.bible_verse}`].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
          </div>

          {/* Auth CTA for saving progress */}
          {!user ? (
            <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-center gap-4 max-w-3xl">
              <div className="shrink-0 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                <LogIn className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm md:text-base font-display text-foreground">נהנית מהשיעור? תמשיך מאיפה שעצרת</p>
                <p className="text-xs text-muted-foreground mt-0.5">התחבר ונשמור לך את המקום — בכל מכשיר, בכל זמן</p>
              </div>
              <Button size="sm" onClick={signInWithGoogle} className="shrink-0 gap-1.5">
                <LogIn className="h-3.5 w-3.5" />
                התחברות
              </Button>
            </div>
          ) : null}

          {/* Comments */}
          {lesson && (
            <section className="mt-12">
              <LessonComments lessonId={lesson.id} />
            </section>
          )}

          {/* AI Chat Widget */}
          <AIChatWidget context={`שיעור: ${lesson?.title}${rabbi ? ` מאת ${rabbiName}` : ""}`} />

          {/* Related Lessons */}
          {relatedLessons && relatedLessons.length > 0 && (
            <section className="mt-16">
              <h2 className="text-xl font-heading text-foreground mb-6">שיעורים נוספים מהסדרה</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {relatedLessons.map((l) => (
                  <Link key={l.id} to={`/lessons/${l.id}`}>
                    <Card className="hover:shadow-md transition-shadow group">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-2">{l.title}</h3>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {(l as any).rabbis?.name && <span>מאת {(l as any).rabbis.name}</span>}
                          {formatDuration(l.duration) && <span>{(l as any).rabbis?.name ? "•" : ""} {formatDuration(l.duration)}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </motion.div>
    </Layout>
  );
};

export default LessonPage;
