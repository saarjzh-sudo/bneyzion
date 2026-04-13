import { memo } from "react";
import { Play, Headphones, Video, FileText, Clock } from "lucide-react";
import LessonThumbnail from "./LessonThumbnail";

interface LessonCardProps {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  duration?: number | null;
  viewsCount?: number;
  rabbiName?: string | null;
  rabbiImageUrl?: string | null;
  onClick?: () => void;
  onPlay?: () => void;
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)} דק׳`;
}

function getMediaType(hasVideo: boolean, hasAudio: boolean): { icon: typeof Headphones; label: string; sourceType: string } {
  if (hasVideo) return { icon: Video, label: "וידאו", sourceType: "video" };
  if (hasAudio) return { icon: Headphones, label: "שמע", sourceType: "audio" };
  return { icon: FileText, label: "טקסט", sourceType: "article" };
}

const LessonCard = memo(function LessonCard({
  title, thumbnailUrl, audioUrl, videoUrl, duration, viewsCount, rabbiName, rabbiImageUrl, onClick, onPlay,
}: LessonCardProps) {
  const hasAudio = !!audioUrl;
  const hasVideo = !!videoUrl;
  const media = getMediaType(hasVideo, hasAudio);
  const MediaIcon = media.icon;

  return (
    <div
      className="snap-start shrink-0 w-72 md:w-80 bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group relative overflow-hidden"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <div className="relative z-10">
        <div className="flex items-start gap-3 mb-3">
          <div className="relative shrink-0">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="" width={64} height={64} className="w-16 h-16 rounded-xl object-cover" loading="lazy" />
            ) : (
              <LessonThumbnail
                title={title}
                rabbiName={rabbiName}
                sourceType={media.sourceType}
                className="w-16 h-16"
              />
            )}
            {/* Media type badge */}
            <div className="absolute -top-1.5 -right-1.5 bg-card border border-border rounded-full p-1 shadow-sm">
              <MediaIcon className="h-3 w-3 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
            {rabbiName && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {rabbiImageUrl && <img src={rabbiImageUrl} alt="" width={16} height={16} className="w-4 h-4 rounded-full object-cover" loading="lazy" />}
                <span className="text-xs text-muted-foreground">{rabbiName}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {formatDuration(duration) && (
              <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded-md">
                <Clock className="h-3 w-3" />{formatDuration(duration)}
              </span>
            )}
            {(viewsCount ?? 0) > 0 && <span>{viewsCount!.toLocaleString()} צפיות</span>}
          </div>
          {hasAudio && onPlay && (
            <button
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); onPlay(); }}
            >
              <Play className="h-3 w-3" />השמע
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default LessonCard;
