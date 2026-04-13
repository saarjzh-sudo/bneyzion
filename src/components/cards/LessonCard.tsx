import { memo } from "react";
import { Play, Volume2, BookOpen, Clock } from "lucide-react";

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

const LessonCard = memo(function LessonCard({
  title, thumbnailUrl, audioUrl, videoUrl, duration, viewsCount, rabbiName, rabbiImageUrl, onClick, onPlay,
}: LessonCardProps) {
  const hasAudio = !!audioUrl;
  const hasVideo = !!videoUrl;

  return (
    <div
      className="snap-start shrink-0 w-72 md:w-80 bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group relative overflow-hidden"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">
        <div className="flex items-start gap-3 mb-3">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="" width={64} height={64} className="w-16 h-16 rounded-xl object-cover shrink-0" loading="lazy" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {hasVideo ? <Play className="h-6 w-6 text-primary" /> : hasAudio ? <Volume2 className="h-6 w-6 text-primary" /> : <BookOpen className="h-6 w-6 text-primary" />}
            </div>
          )}
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
              <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{formatDuration(duration)}</span>
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
