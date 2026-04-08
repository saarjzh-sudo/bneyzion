import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, X, ListMusic, ChevronUp, ChevronDown, RotateCcw, RotateCw } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const FloatingPlayer = () => {
  const { currentTrack, isPlaying, currentTime, duration, queue, playbackRate, togglePlay, seek, skipForward, skipBackward, setPlaybackRate, playNext, close } = usePlayer();
  const [expanded, setExpanded] = useState(false);

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
          className="h-1 bg-muted cursor-pointer group relative"
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

        {/* Mini player bar */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{currentTrack.title}</p>
            {currentTrack.rabbiName && (
              <p className="text-xs text-muted-foreground truncate">{currentTrack.rabbiName}</p>
            )}
          </div>

          {/* Time */}
          <span className="text-xs text-muted-foreground tabular-nums hidden sm:block">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Controls */}
          <div className="flex items-center gap-1">
            {/* Skip backward 15s */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hidden sm:flex"
              onClick={skipBackward}
              title="15 שניות אחורה"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 mr-[-1px]" />}
            </Button>

            {/* Skip forward 15s */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hidden sm:flex"
              onClick={skipForward}
              title="15 שניות קדימה"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </Button>

            {queue.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={playNext}
              >
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Playback speed */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 rounded-full text-xs font-mono tabular-nums text-muted-foreground hover:text-foreground"
              onClick={() => {
                const idx = SPEED_OPTIONS.indexOf(playbackRate);
                const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
                setPlaybackRate(next);
              }}
              title="מהירות השמעה"
            >
              {playbackRate}x
            </Button>

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
