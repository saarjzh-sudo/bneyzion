import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, X, ListMusic, ChevronUp, ChevronDown } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SPEED_OPTIONS = [1, 1.25, 1.5, 2] as const;

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Skip backward icon with "15" label */
const SkipBack15Icon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0-8 8" />
    <polyline points="3 7 3 3 7 3" />
    <path d="M3 3l4 4" />
    <text x="9" y="14.5" fontSize="7" fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="system-ui">15</text>
  </svg>
);

/** Skip forward icon with "15" label */
const SkipFwd15Icon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 19a8 8 0 1 1 0-16 8 8 0 0 1 8 8" />
    <polyline points="21 7 21 3 17 3" />
    <path d="M21 3l-4 4" />
    <text x="15" y="14.5" fontSize="7" fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="system-ui">15</text>
  </svg>
);

const FloatingPlayer = () => {
  const { currentTrack, isPlaying, currentTime, duration, queue, playbackRate, resumeTime, togglePlay, seek, skipForward, skipBackward, setPlaybackRate, playNext, close, clearResumeTime } = usePlayer();
  const [expanded, setExpanded] = useState(false);
  const [showResumeToast, setShowResumeToast] = useState(false);

  // Show resume toast for 3 seconds when resuming from a saved position
  useEffect(() => {
    if (resumeTime && resumeTime > 0) {
      setShowResumeToast(true);
      const timer = setTimeout(() => {
        setShowResumeToast(false);
        clearResumeTime();
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowResumeToast(false);
    }
  }, [resumeTime, clearResumeTime]);

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border shadow-2xl",
          expanded ? "rounded-t-2xl" : ""
        )}
        dir="rtl"
      >
        {/* Progress bar - clickable */}
        <div
          className="h-1.5 bg-muted cursor-pointer group relative"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            // RTL: progress goes right-to-left
            const clickX = rect.right - e.clientX;
            const pct = clickX / rect.width;
            seek(pct * duration);
          }}
        >
          <div
            className="h-full bg-primary transition-all duration-150"
            style={{ width: `${progress}%`, float: "right" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ right: `${progress}%`, transform: `translate(50%, -50%)` }}
          />
        </div>

        {/* Resume toast */}
        <AnimatePresence>
          {showResumeToast && resumeTime && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-t-md shadow-md z-10"
            >
              ממשיך מ-{formatTime(resumeTime)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main player bar */}
        <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3">
          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{currentTrack.title}</p>
            <div className="flex items-center gap-2">
              {currentTrack.rabbiName && (
                <p className="text-xs text-muted-foreground truncate">{currentTrack.rabbiName}</p>
              )}
              <span className="text-[10px] text-muted-foreground tabular-nums sm:hidden">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Time - desktop */}
          <span className="text-xs text-muted-foreground tabular-nums hidden sm:block">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Playback controls */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Skip backward 15s */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={skipBackward}
              title="15 שניות אחורה"
            >
              <SkipBack15Icon className="h-5 w-5" />
            </Button>

            {/* Play / Pause */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 mr-[-2px]" />}
            </Button>

            {/* Skip forward 15s */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={skipForward}
              title="15 שניות קדימה"
            >
              <SkipFwd15Icon className="h-5 w-5" />
            </Button>

            {queue.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hidden sm:flex"
                onClick={playNext}
              >
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Speed pills */}
            <div className="flex items-center gap-0.5 mr-1 sm:mr-2">
              {SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackRate(speed)}
                  className={cn(
                    "h-6 px-1.5 sm:px-2 rounded-full text-[10px] sm:text-xs font-semibold tabular-nums transition-all duration-150",
                    playbackRate === speed
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title={`מהירות ${speed}x`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {queue.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setExpanded(e => !e)}
              >
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                {queue.length > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {queue.length}
                  </span>
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
              onClick={close}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Expanded queue */}
        <AnimatePresence>
          {expanded && queue.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border"
            >
              <div className="px-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <ListMusic className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">רשימת השמעה ({queue.length})</span>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {queue.map((track, i) => (
                    <div key={track.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 text-sm">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-foreground">{track.title}</p>
                        {track.rabbiName && <p className="text-xs text-muted-foreground truncate">{track.rabbiName}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingPlayer;
