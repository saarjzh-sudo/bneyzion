import { useEffect } from "react";
import { sanitizeHtml, isDuplicatePromo } from "@/lib/sanitize";
import { useParams, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, BookOpen, Calendar, ChevronLeft, Volume2, Headphones, ListPlus, LogIn, Share2, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSeriesBreadcrumb } from "@/hooks/useSeriesHierarchy";
import Layout from "@/components/layout/Layout";
import { useLesson, useSeriesLessons } from "@/hooks/useLesson";
import { useSeriesDetail } from "@/hooks/useSeriesDetail";
import { getSeriesCoverImage } from "@/lib/designTokens";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSEO } from "@/hooks/useSEO";
import { formatRabbiName } from "@/lib/rabbi-name";
import SmartAuthCTA from "@/components/auth/SmartAuthCTA";
import AIChatWidget from "@/components/ai/AIChatWidget";
import DedicationDialog from "@/components/lesson/DedicationDialog";
import DedicationBadge from "@/components/lesson/DedicationBadge";
import { useMediaProgress } from "@/hooks/useMediaProgress";
import { saveLocalLastLesson } from "@/hooks/useLastLesson";
import { pdfEmbedSrc } from "@/lib/pdfEmbed";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)} דקות`;
}

function isDirectVideo(url: string): boolean {
  const lower = url.toLowerCase();
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/.test(lower);
}

// רמה 20 — פודקאסט: המרת קישורי-שיתוף להטמעה (iframe)
function toYouTubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}
function toSpotifyEmbed(url: string): string | null {
  const m = url.match(/open\.spotify\.com\/(episode|show|track)\/([\w]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
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
        {/* bible_book crumb removed (Rav Yoav 3.7.2026): metadata is noisy (wrong/duplicate books
            like שבת חזון→רות, איכה→איכה); the series chain above is the verified 1:1 path */}
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
  // ג4: fetch series for image_url (useLesson only returns id+title for series)
  const { data: seriesDetail } = useSeriesDetail(lesson?.series_id ?? undefined);
  // Rav Yoav 3.7.2026: bible_book metadata is noisy — show the "מקור" box only when the
  // book is confirmed by the verified series chain (same data the breadcrumb renders)
  const { data: chainForSource } = useSeriesBreadcrumb(lesson?.series_id ?? undefined);
  const bibleBookVerified = Boolean(
    lesson?.bible_book && chainForSource?.some((a) => a.title.includes(lesson.bible_book!))
  );
  const { play, addToQueue, currentTrack } = usePlayer();
  const { user, signInWithGoogle } = useAuth();
  const { mediaRef: mediaProgressRef, flushPosition } = useMediaProgress(id);
  const { toast } = useToast();
  const rabbi = lesson?.rabbis as { id: string; name: string; image_url: string | null; title: string | null } | null;

  const rabbiName = formatRabbiName(rabbi);

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

  const lessonUrl = lesson?.id ? `https://bneyzion.co.il/lessons/${lesson.id}` : undefined;
  const hasVideo = Boolean(lesson?.video_url);

  useSEO({
    title: lesson?.title,
    description: lesson?.description ?? undefined,
    image: lesson?.thumbnail_url ?? undefined,
    url: lessonUrl,
    type: hasVideo ? "video.other" : "article",
    jsonLd: lesson ? {
      "@context": "https://schema.org",
      "@type": hasVideo ? "VideoObject" : "Article",
      ...(hasVideo
        ? {
            name: lesson.title,
            description: lesson.description || undefined,
            thumbnailUrl: lesson.thumbnail_url || undefined,
            contentUrl: lesson.video_url || undefined,
            uploadDate: lesson.published_at || undefined,
          }
        : {
            headline: lesson.title,
            description: lesson.description || undefined,
            image: lesson.thumbnail_url || undefined,
            datePublished: lesson.published_at || undefined,
          }),
      url: lessonUrl,
      inLanguage: "he",
      author: rabbiName ? { "@type": "Person", name: rabbiName } : undefined,
      publisher: { "@type": "Organization", name: "בני ציון", url: "https://bneyzion.co.il" },
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

  // R-LES1: teachers-ONLY lessons must not render on the public /lessons/:id URL.
  // §0.3: dual-tagged ['general','teachers'] lessons stay on public URL (they belong on both).
  // Only pure teachers-only lessons (no 'general' tag) redirect to /teachers/lesson/:id.
  const lessonAudienceTags = (lesson as any).audience_tags;
  const lessonIsTeachersOnly = Array.isArray(lessonAudienceTags) &&
    lessonAudienceTags.includes("teachers") &&
    !lessonAudienceTags.includes("general");
  if (lessonIsTeachersOnly) {
    return <Navigate to={`/teachers/lesson/${lesson.id}`} replace />;
  }

  const series = lesson.series as { id: string; title: string } | null;

  // ג4: hero image chain — lesson thumbnail → series image → cover by bible_book/title → default
  const heroImage =
    lesson.thumbnail_url ||
    seriesDetail?.image_url ||
    (series ? getSeriesCoverImage(series.title) : null) ||
    "/images/series-default.webp";

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        dir="rtl"
      >
        {/* ג4: Hero image — 240px, sits above breadcrumbs */}
        <div
          style={{
            width: "100%",
            height: 240,
            overflow: "hidden",
            position: "relative",
            background: "#2d2010",
          }}
        >
          <img
            src={heroImage}
            alt={lesson.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 35%",
              opacity: 0.7,
              filter: "brightness(0.85) saturate(0.9)",
            }}
            onError={(e) => { (e.target as HTMLImageElement).src = "/images/series-default.webp"; }}
          />
          {/* Bottom gradient for text readability */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "60%",
              background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)",
            }}
          />
        </div>

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
                      {formatRabbiName(rabbi)}
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

            {/* Dedication + share/print (רמה 20 — יואב 16.7: "לא מוצא את אפשרות השיתוף וההדפסה") */}
            <div className="flex items-center gap-3 flex-wrap print:hidden">
              <DedicationDialog lessonId={lesson.id} lessonTitle={lesson.title} seriesId={series?.id} seriesTitle={series?.title} />
              {/* יואב 16.7: שיעור בתוך סדרה מוקדשת מציג גם את הקדשת-הסדרה */}
              <DedicationBadge lessonId={lesson.id} seriesId={series?.id} />
              <div className="flex items-center gap-1.5 mr-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={async () => {
                    const url = window.location.href;
                    const shareData = { title: lesson.title, text: `${lesson.title} — בני ציון`, url };
                    if (navigator.share) {
                      try { await navigator.share(shareData); } catch { /* המשתמש ביטל */ }
                    } else {
                      await navigator.clipboard.writeText(url);
                      toast({ title: "הקישור הועתק", description: "אפשר להדביק ולשלוח לכל מקום" });
                    }
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  שיתוף
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3.5 w-3.5" />
                  הדפסה
                </Button>
              </div>
            </div>

            <Separator />

            {/* רמה 20 — פודקאסט "ילדי התנ״ך": הטמעת ספוטיפי + יוטיוב (קדימות על נגן רגיל) */}
            {((lesson as any).spotify_url || (lesson as any).youtube_url) ? (
              <div className="space-y-4">
                {(lesson as any).spotify_url && toSpotifyEmbed((lesson as any).spotify_url) && (
                  <iframe
                    title="האזנה בספוטיפיי"
                    src={toSpotifyEmbed((lesson as any).spotify_url)!}
                    className="w-full rounded-xl border border-border"
                    style={{ height: 232 }}
                    loading="lazy"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  />
                )}
                {(lesson as any).youtube_url && toYouTubeEmbed((lesson as any).youtube_url) && (
                  <div className="aspect-video rounded-xl overflow-hidden bg-black border border-border">
                    <iframe
                      title="צפייה ביוטיוב"
                      src={toYouTubeEmbed((lesson as any).youtube_url)!}
                      className="w-full h-full"
                      loading="lazy"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                )}
              </div>
            ) : lesson.video_url ? (
              isDirectVideo(lesson.video_url) ? (
                <div className="aspect-video rounded-lg overflow-hidden bg-black border border-border">
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
                <div className="aspect-video rounded-lg overflow-hidden bg-black border border-border">
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
                    onClick={() => {
                      // Handoff: save the inline position (and pause) so the
                      // floating player resumes from the exact same point
                      flushPosition({ pause: true });
                      play({
                        id: lesson.id,
                        title: lesson.title,
                        audioUrl: lesson.audio_url!,
                        rabbiName: rabbiName || undefined,
                        seriesTitle: (lesson.series as any)?.title || undefined,
                        duration: lesson.duration,
                        thumbnailUrl: lesson.thumbnail_url,
                      });
                    }}
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

            {/* Attachment viewer — PDF / Word / other */}
            {(lesson as any).attachment_url && (() => {
              const url: string = String((lesson as any).attachment_url);
              const lower = url.toLowerCase();
              const isPdf = lower.includes('.pdf');
              const isWord = lower.includes('.doc') || lower.includes('.docx');
              const encoded = encodeURIComponent(url);

              if (isPdf) {
                return (
                  <div className="rounded-lg overflow-hidden border border-border bg-foreground/5">
                    <div className="flex items-center justify-between bg-secondary/40 px-4 py-2 border-b border-border">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        צפייה במסמך
                      </span>
                      <div className="flex items-center gap-3">
                        <a
                          href={url}
                          download
                          className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md font-semibold hover:opacity-90 transition-opacity flex items-center gap-1"
                        >
                          ↓ הורד PDF
                        </a>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          פתח בחלון חדש ↗
                        </a>
                      </div>
                    </div>
                    <iframe
                      src={pdfEmbedSrc(url)}
                      className="w-full border-0"
                      style={{ height: "75vh", minHeight: "500px" }}
                      loading="lazy"
                      title="PDF Viewer"
                    />
                  </div>
                );
              }

              if (isWord) {
                return (
                  <div className="rounded-lg overflow-hidden border border-border bg-foreground/5">
                    <div className="flex items-center justify-between bg-secondary/40 px-4 py-2 border-b border-border">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        קובץ Word מצורף
                      </span>
                      <div className="flex items-center gap-3">
                        <a
                          href={url}
                          download
                          className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md font-semibold hover:opacity-90 transition-opacity flex items-center gap-1"
                        >
                          ↓ הורד קובץ
                        </a>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          פתח בחלון חדש ↗
                        </a>
                      </div>
                    </div>
                    <iframe
                      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`}
                      className="w-full border-0"
                      style={{ height: "75vh", minHeight: "500px" }}
                      loading="lazy"
                      title="Word Viewer"
                    />
                  </div>
                );
              }

              // Fallback — unknown attachment type: show prominent download button only
              return (
                <div className="rounded-lg border border-border bg-secondary/20 px-5 py-4 flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    קובץ מצורף
                  </span>
                  <a
                    href={url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity flex items-center gap-1"
                  >
                    ↓ הורד קובץ
                  </a>
                </div>
              );
            })()}

            {/* Additional attachments — extra files beyond the primary attachment_url */}
            {(() => {
              const extras: string[] = (lesson as any).additional_attachments || [];
              if (extras.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-2 pt-1">
                  {extras.map((url: string, i: number) => {
                    const lower = url.toLowerCase();
                    const isPdf = lower.includes('.pdf');
                    const isWord = lower.includes('.doc') || lower.includes('.docx');
                    const label = isPdf ? `קובץ PDF נוסף ${i + 1}` : isWord ? `קובץ Word נוסף ${i + 1}` : `קובץ מצורף נוסף ${i + 1}`;
                    return (
                      <a
                        key={url}
                        href={url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-secondary text-foreground px-3 py-2 rounded-md font-semibold hover:opacity-80 transition-opacity flex items-center gap-1 border border-border"
                      >
                        ↓ {label}
                      </a>
                    );
                  })}
                </div>
              );
            })()}

            {/* Promo teaser — the old site's lessonPromo, shown above the content (Rav Yoav 3.7.2026).
                7.7.2026 (הערה ד'): suppressed when the description is just the copied opening
                of the article body (migration artifact) — otherwise the reader sees it twice. */}
            {lesson.description && (lesson as any).content &&
              !isDuplicatePromo(lesson.description, (lesson as any).content) ? (
              <div className="rounded-lg bg-secondary/30 border border-border p-5 max-w-3xl">
                <p className="text-foreground leading-relaxed whitespace-pre-line font-display">{lesson.description}</p>
              </div>
            ) : null}

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
              <div className="rounded-lg bg-secondary/30 border border-border p-5 max-w-3xl">
                <p className="text-foreground leading-relaxed whitespace-pre-line">{lesson.description}</p>
              </div>
            ) : null}

            {/* Bible reference — only when verified against the series chain */}
            {bibleBookVerified && (
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
              <Button size="sm" onClick={() => signInWithGoogle()} className="shrink-0 gap-1.5">
                <LogIn className="h-3.5 w-3.5" />
                התחברות
              </Button>
            </div>
          ) : null}

          {/* Comments removed per Rav Yoav (12.5.2026, re-applied 3.7.2026) — the site has no comments */}

          {/* AI Chat Widget */}
          {/* <AIChatWidget context={`שיעור: ${lesson?.title}${rabbi ? ` מאת ${rabbiName}` : ""}`} /> */}

          {/* ג5: Related Lessons — with hero images (same chain as LessonCard/LessonPopup) */}
          {relatedLessons && relatedLessons.length > 0 && (
            <section className="mt-16">
              <h2 className="text-xl font-heading text-foreground mb-6">שיעורים נוספים מהסדרה</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {relatedLessons.map((l) => {
                  const lImg =
                    (l as any).thumbnail_url ||
                    seriesDetail?.image_url ||
                    (series ? getSeriesCoverImage(series.title) : null) ||
                    "/images/series-default.webp";
                  return (
                    <Link key={l.id} to={`/lessons/${l.id}`}>
                      <Card className="hover:shadow-md transition-shadow group overflow-hidden">
                        {/* Thumbnail */}
                        <div className="h-28 overflow-hidden">
                          <img
                            src={lImg}
                            alt={l.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/images/series-default.webp"; }}
                          />
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-2">{l.title}</h3>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            {(l as any).rabbis?.name && <span>מאת {(l as any).rabbis.name}</span>}
                            {formatDuration(l.duration) && <span>{(l as any).rabbis?.name ? "•" : ""} {formatDuration(l.duration)}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </motion.div>
      {/* רמה 20: הדפסת שיעור נקייה — מסתירים ניווט/סיידבר/נגן/וידג'טים */}
      <style>{`
        @media print {
          header, footer, nav, aside,
          [data-radix-popper-content-wrapper],
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </Layout>
  );
};

export default LessonPage;
