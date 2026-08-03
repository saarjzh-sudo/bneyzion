import { sanitizeHtml, isDuplicatePromo } from "@/lib/sanitize";
import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import { Clock, Calendar, BookOpen, Volume2, Video, Printer, Share2, FileDown, Heart, LogIn, ChevronLeft } from "lucide-react";
import { colors, fonts } from "@/lib/designTokens";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLesson } from "@/hooks/useLesson";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiteSetting } from "@/hooks/useSiteSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useIsFavorite, useAddFavorite, useRemoveFavorite } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { useAwardPoints } from "@/hooks/usePoints";
import { useMediaProgress } from "@/hooks/useMediaProgress";
import { useSeriesBreadcrumb } from "@/hooks/useSeriesHierarchy";
import { formatRabbiName } from "@/lib/rabbi-name";
import DedicationDialog from "@/components/lesson/DedicationDialog";
import { pdfEmbedSrc } from "@/lib/pdfEmbed";
import DedicationBadge from "@/components/lesson/DedicationBadge";
import { formatLessonDate } from "@/lib/lessonDate";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)} דקות`;
}

function isDirectVideo(url: string): boolean {
  const lower = url.toLowerCase();
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/.test(lower);
}

function formatDate(d: string | null) {
  // תאריך עתידי (ארטיפקט ייבוא) לא מוצג — ראו lessonDate.ts
  return formatLessonDate(d);
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  );
}

interface LessonDialogProps {
  lessonId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LessonDialog = ({ lessonId, open, onOpenChange }: LessonDialogProps) => {
  const { data: lesson, isLoading } = useLesson(lessonId ?? undefined);
  const { data: dedicationText } = useSiteSetting("print_dedication");
  const { user, signInWithGoogle } = useAuth();
  const { data: favoriteRecord } = useIsFavorite(lessonId ?? undefined);
  const addFavorite = useAddFavorite();
  const removeFav = useRemoveFavorite();
  const isFavorited = !!favoriteRecord;
  const awardPoints = useAwardPoints();
  const { mediaRef: mediaProgressRef } = useMediaProgress(lessonId);

  // Update URL for SEO when dialog opens/closes
  useEffect(() => {
    if (open && lessonId) {
      const currentPath = window.location.pathname;
      window.history.replaceState({ previousPath: currentPath }, "", `/lessons/${lessonId}`);
    }
    return () => {
      if (open && lessonId) {
        const state = window.history.state;
        const previousPath = state?.previousPath || window.location.pathname.replace(`/lessons/${lessonId}`, "");
        if (previousPath && previousPath !== `/lessons/${lessonId}`) {
          window.history.replaceState(null, "", previousPath);
        }
      }
    };
  }, [open, lessonId]);

  // Auto-track view in user_history + record daily activity for streak
  useEffect(() => {
    if (!open || !lessonId || !user) return;
    const track = async () => {
      // Upsert: update watched_at if already exists, otherwise insert
      const { data: existing } = await supabase
        .from("user_history")
        .select("id")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      if (existing) {
        await supabase.from("user_history").update({ watched_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("user_history").insert({ user_id: user.id, lesson_id: lessonId });
      }

      // Record daily activity for streak tracking
      const today = new Date().toISOString().split("T")[0];
      const { data: activityRecord } = await supabase
        .from("user_daily_activity")
        .select("id, lessons_completed, minutes_learned")
        .eq("user_id", user.id)
        .eq("activity_date", today)
        .maybeSingle();
      if (activityRecord) {
        await supabase.from("user_daily_activity").update({
          lessons_completed: (activityRecord.lessons_completed || 0) + 1,
        }).eq("id", activityRecord.id);
      } else {
        await supabase.from("user_daily_activity").insert({
          user_id: user.id,
          activity_date: today,
          lessons_completed: 1,
          minutes_learned: 0,
        });
      }

      // Award lesson_view points
      awardPoints.mutate({ action: "lesson_view", referenceId: lessonId });

      // Award streak bonus if first activity today
      if (!activityRecord) {
        awardPoints.mutate({ action: "streak_bonus" });
      }
    };
    track();
  }, [open, lessonId, user]);

  const rabbi = lesson?.rabbis as { id: string; name: string; image_url: string | null; title: string | null } | null;
  const series = lesson?.series as { id: string; title: string } | null;
  const { data: breadcrumb } = useSeriesBreadcrumb(series?.id);

  const lessonUrl = `${window.location.origin}/lessons/${lessonId}`;
  const shareText = lesson ? `${lesson.title}${rabbi ? ` - ${rabbi.name}` : ""}` : "";

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !lesson) return;
    const content = (lesson as any).content || lesson.description || "";
    const logoUrl = `${window.location.origin}/assets/logo-horizontal-color.png`;
    const rabbiLine = rabbi ? `מאת: ${formatRabbiName(rabbi)}` : "";
    const dateLine = formatDate(lesson.published_at) || "";
    const durationLine = formatDuration(lesson.duration) || "";
    const metaParts = [rabbiLine, dateLine, durationLine].filter(Boolean).join(" · ");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="utf-8" />
        <title>${lesson.title}</title>
        <style>
          @font-face { font-family: 'Kedem'; src: url('${window.location.origin}/fonts/kedem-bold.otf') format('opentype'); font-weight: 700; }
          @font-face { font-family: 'Kedem'; src: url('${window.location.origin}/fonts/kedem-black.otf') format('opentype'); font-weight: 900; }
          @font-face { font-family: 'Ploni'; src: url('${window.location.origin}/fonts/ploni-regular.otf') format('opentype'); font-weight: 400; }
          @font-face { font-family: 'Ploni'; src: url('${window.location.origin}/fonts/ploni-bold.otf') format('opentype'); font-weight: 700; }

          :root {
            --primary: #3D8B7A;
            --gold: #B8860B;
            --bg: #FDF8F0;
          }

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Ploni', 'David', serif;
            max-width: 750px;
            margin: 0 auto;
            padding: 0 32px;
            color: #1a1a1a;
            line-height: 1.9;
            background: white;
          }

          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 24px 0 20px;
            border-bottom: 3px solid var(--primary);
            margin-bottom: 28px;
          }

          .header img {
            height: 56px;
          }

          .header .site-name {
            font-family: 'Kedem', serif;
            font-weight: 900;
            font-size: 14px;
            color: var(--primary);
            letter-spacing: 0.05em;
          }

          h1 {
            font-family: 'Kedem', serif;
            font-weight: 900;
            font-size: 26px;
            color: var(--primary);
            margin-bottom: 8px;
            line-height: 1.3;
          }

          .meta {
            color: #666;
            font-size: 13px;
            margin-bottom: 6px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e5e0d8;
          }

          .topics-badge {
            display: inline-block;
            background: var(--primary);
            color: white;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 14px;
            border-radius: 20px;
            margin-bottom: 24px;
          }

          .content {
            font-size: 15px;
            line-height: 2;
          }

          .content h2, .content h3 {
            font-family: 'Kedem', serif;
            font-weight: 700;
            color: var(--primary);
            margin-top: 28px;
            margin-bottom: 8px;
          }

          .content h2 { font-size: 20px; }
          .content h3 { font-size: 17px; }

          .content p { margin-bottom: 12px; text-align: justify; }

          .content strong {
            font-weight: 700;
            color: #111;
          }

          .content blockquote {
            border-right: 4px solid var(--gold);
            padding: 8px 16px;
            margin: 16px 0;
            background: #faf6ee;
            border-radius: 4px;
            font-style: italic;
            color: #444;
          }

          .footer {
            margin-top: 40px;
            padding: 20px 0;
            border-top: 2px solid var(--primary);
            text-align: center;
            color: #999;
            font-size: 11px;
          }

          .footer .dedication {
            font-family: 'Kedem', serif;
            font-size: 13px;
            color: var(--gold);
            margin-bottom: 4px;
          }

          .footer .url {
            color: var(--primary);
            font-size: 10px;
          }

          @media print {
            body { padding: 0 16px; }
            .header { padding-top: 8px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="site-name">בני ציון – אתר התנ״ך של ישראל</div>
          <img src="${logoUrl}" alt="בני ציון" onerror="this.style.display='none'" />
        </div>

        <h1>${lesson.title}</h1>
        <div class="meta">${metaParts}</div>

        ${series ? `<span class="topics-badge">${(series as any).title}</span>` : ""}

        <div class="content">${content}</div>

        <div class="footer">
          <div class="dedication">${dedicationText || ""}</div>
          <div>בני ציון – אתר התנ״ך של ישראל</div>
          <div class="url">${lessonUrl}</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${lessonUrl}`)}`, "_blank");
  };

  const handleGmail = () => {
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText}\n\n${lessonUrl}`)}`,
      "_blank"
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[85vh] overflow-y-auto"
        dir="rtl"
        style={{
          background: colors.parchment,
          borderRadius: 16,
          border: `1px solid rgba(139,111,71,0.18)`,
          boxShadow: "0 24px 64px rgba(45,31,14,0.18)",
          fontFamily: fonts.body,
        }}
      >
        {isLoading ? (
          <div className="space-y-4 p-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : lesson ? (
          <div className="space-y-5">
            <DialogHeader className="text-right">
              <div className="flex items-start justify-between gap-4 flex-row-reverse">
                {/* Action buttons - left side in RTL */}
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${isFavorited ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
                        onClick={() => {
                          if (!user) {
                            signInWithGoogle();
                            return;
                          }
                          if (isFavorited) {
                            removeFav.mutate(favoriteRecord!.id);
                          } else if (lessonId) {
                            addFavorite.mutate(lessonId);
                          }
                        }}
                      >
                        <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{!user ? "התחבר לשמירת מועדפים" : isFavorited ? "הסר מהמועדפים" : "שמור במועדפים"}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={handlePrint}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>הדפסה</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#25D366]" onClick={handleWhatsApp}>
                        <WhatsAppIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>שיתוף בוואצאפ</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#EA4335]" onClick={handleGmail}>
                        <GmailIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>שליחה במייל</TooltipContent>
                  </Tooltip>
                </div>
                <DialogTitle
                  className="text-xl leading-tight flex-1 text-right"
                  style={{ fontFamily: fonts.display, color: colors.textDark, fontWeight: 700 }}
                >{lesson.title}</DialogTitle>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm" style={{ color: colors.textMuted }}>
                {rabbi && (
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">מאת</span>
                    <Link
                      to={`/rabbis/${rabbi.id}`}
                      className="text-primary font-semibold hover:underline"
                      onClick={() => onOpenChange(false)}
                    >
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
                <Link to={`/series/${series.id}`} onClick={() => onOpenChange(false)}>
                  <span
                    className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium transition-colors"
                    style={{
                      background: `rgba(139,111,71,0.10)`,
                      color: colors.goldDark,
                      border: `1px solid rgba(139,111,71,0.22)`,
                      fontFamily: fonts.body,
                    }}
                  >{series.title}</span>
                </Link>
              )}
            </DialogHeader>

            {/* (סער 10.7) הקדשת שיעור — זמינה גם מהפופאפ, למעלה, לא רק מדף השיעור */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <DedicationDialog
                  lessonId={lesson.id}
                  lessonTitle={lesson.title}
                  seriesId={series?.id}
                  seriesTitle={series?.title}
                />
              </div>
              <DedicationBadge lessonId={lesson.id} seriesId={series?.id} />
            </div>

            {/* Breadcrumbs */}
            <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
              <Link to="/" className="hover:text-primary transition-colors" onClick={() => onOpenChange(false)}>ראשי</Link>
              <ChevronLeft className="h-3 w-3" />
              {/* 27.5.2026 — /series removed. Link to homepage parsha section. */}
              <Link to="/parasha" className="hover:text-primary transition-colors" onClick={() => onOpenChange(false)}>פרשת השבוע</Link>
              {breadcrumb && breadcrumb.length > 0 && breadcrumb.map((ancestor) => (
                <span key={ancestor.id} className="flex items-center gap-1.5">
                  <ChevronLeft className="h-3 w-3" />
                  <Link to={`/series/${ancestor.id}`} className="hover:text-primary transition-colors" onClick={() => onOpenChange(false)}>
                    {ancestor.title}
                  </Link>
                </span>
              ))}
              {/* bible_book crumb removed (Rav Yoav 3.7.2026): metadata is noisy — series chain is the verified path */}
              <ChevronLeft className="h-3 w-3" />
              <span className="text-foreground truncate max-w-[200px]">{lesson.title}</span>
            </nav>

            <Separator />

            {/* Compact media player */}
            {lesson.video_url ? (
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
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )
            ) : lesson.audio_url ? (
              <div
                className="rounded-xl p-4 flex items-center gap-4"
                style={{
                  background: `linear-gradient(135deg, rgba(139,111,71,0.08), rgba(196,162,101,0.04))`,
                  border: `1px solid rgba(139,111,71,0.18)`,
                }}
              >
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `rgba(139,111,71,0.14)` }}
                >
                  <Volume2 className="h-5 w-5" style={{ color: colors.goldDark }} />
                </div>
                <audio ref={mediaProgressRef} controls src={lesson.audio_url} className="w-full h-10" />
              </div>
            ) : null}

            {/* Attachment viewer — R-DLG1: aligned with LessonPage (PDF/Word/fallback) */}
            {(lesson as any).attachment_url && (() => {
              const url: string = String((lesson as any).attachment_url);
              const lower = url.toLowerCase();
              const isPdf = lower.includes(".pdf");
              const isWord = lower.includes(".doc") || lower.includes(".docx");
              const encoded = encodeURIComponent(url);

              if (isPdf) {
                return (
                  <div className="rounded-lg overflow-hidden border border-border bg-muted/20">
                    <div className="flex items-center justify-between bg-secondary/40 px-4 py-2 border-b border-border">
                      <span className="text-sm font-semibold text-foreground">קובץ מצורף</span>
                      <div className="flex items-center gap-3">
                        <a href={url} download className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md font-semibold hover:opacity-90 transition-opacity">
                          ↓ הורד PDF
                        </a>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          פתח בחלון חדש ↗
                        </a>
                      </div>
                    </div>
                    <iframe
                      src={pdfEmbedSrc(url)}
                      className="w-full border-0"
                      style={{ height: "60vh", minHeight: "400px" }}
                      loading="lazy"
                      title="PDF Viewer"
                    />
                  </div>
                );
              }

              if (isWord) {
                return (
                  <div className="rounded-lg overflow-hidden border border-border bg-muted/20">
                    <div className="flex items-center justify-between bg-secondary/40 px-4 py-2 border-b border-border">
                      <span className="text-sm font-semibold text-foreground">קובץ Word מצורף</span>
                      <div className="flex items-center gap-3">
                        <a href={url} download className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md font-semibold hover:opacity-90 transition-opacity">
                          ↓ הורד קובץ
                        </a>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          פתח בחלון חדש ↗
                        </a>
                      </div>
                    </div>
                    <iframe
                      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`}
                      className="w-full border-0"
                      style={{ height: "60vh", minHeight: "400px" }}
                      loading="lazy"
                      title="Word Viewer"
                    />
                  </div>
                );
              }

              // Fallback — unknown type (Google Drive / other): download button only, no blank iframe
              return (
                <div className="rounded-lg border border-border bg-secondary/20 px-5 py-4 flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileDown className="h-4 w-4 text-primary" />
                    קובץ מצורף
                  </span>
                  <a
                    href={url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity"
                  >
                    ↓ פתח / הורד קובץ
                  </a>
                </div>
              );
            })()}

            {/* Promo teaser — "תיאור קצר" מוצג גם בפופאפ, לא רק בדף השיעור (יואב 20.7) */}
            {lesson.description && (lesson as any).content &&
              !isDuplicatePromo(lesson.description, (lesson as any).content) ? (
              <div className="rounded-lg bg-secondary/30 border border-border p-4">
                <p className="text-foreground leading-relaxed whitespace-pre-line font-display">{lesson.description}</p>
              </div>
            ) : null}

            {/* Full content */}
            {(lesson as any).content ? (
              <div
                className="prose prose-sm md:prose-base max-w-none text-foreground leading-[1.9]
                  [&_h2]:text-2xl [&_h2]:font-heading [&_h2]:font-bold [&_h2]:text-primary [&_h2]:mt-10 [&_h2]:mb-4
                  [&_h3]:text-xl [&_h3]:font-heading [&_h3]:font-bold [&_h3]:text-primary [&_h3]:mt-8 [&_h3]:mb-3
                  [&_h4]:text-lg [&_h4]:font-display [&_h4]:font-bold [&_h4]:text-foreground [&_h4]:mt-6 [&_h4]:mb-2
                  [&_p]:text-foreground [&_p]:mb-4 [&_p]:leading-[1.9] [&_p]:text-justify
                  [&_strong]:text-foreground [&_strong]:font-bold
                  [&_ol]:list-decimal [&_ol]:ps-6 [&_ol]:mb-4 [&_ul]:list-disc [&_ul]:ps-6 [&_ul]:mb-4 [&_li]:mb-1 [&_li]:leading-[1.8]
                  [&_blockquote]:border-r-4 [&_blockquote]:border-primary/30 [&_blockquote]:pr-4 [&_blockquote]:mr-0 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml((lesson as any).content ?? "") }}
              />
            ) : lesson.description ? (
              <div className="rounded-lg bg-secondary/30 border border-border p-4">
                <p className="text-foreground text-sm leading-relaxed whitespace-pre-line">{lesson.description}</p>
              </div>
            ) : null}

            {/* Bible reference */}
            {(lesson.bible_book || lesson.bible_chapter) && (
              <div className="bg-secondary/40 rounded-lg p-3 border border-border">
                <h3 className="text-xs font-semibold text-foreground mb-1">מקור</h3>
                <p className="text-sm text-muted-foreground">
                  {[lesson.bible_book, lesson.bible_chapter && `פרק ${lesson.bible_chapter}`, lesson.bible_verse && `פסוק ${lesson.bible_verse}`].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}

            {/* Auth CTA for non-logged-in users */}
            {!user && (
              <div
                className="rounded-xl p-4 flex items-center gap-4"
                style={{
                  background: `linear-gradient(135deg, rgba(45,125,125,0.07), rgba(45,125,125,0.03))`,
                  border: `1px solid rgba(45,125,125,0.18)`,
                }}
              >
                <div
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `rgba(45,125,125,0.14)` }}
                >
                  <LogIn className="h-5 w-5" style={{ color: "#2D7D7D" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ fontFamily: fonts.display, color: colors.textDark }}>
                    נהנית מהשיעור? תמשיך מאיפה שעצרת
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: colors.textMuted, fontFamily: fonts.body }}>
                    התחבר ונשמור לך את המקום — בכל מכשיר, בכל זמן
                  </p>
                </div>
                <button
                  onClick={() => signInWithGoogle()}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${colors.goldDark}, ${colors.goldLight})`,
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: fonts.body,
                  }}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  התחברות
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">השיעור לא נמצא</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LessonDialog;
