import { Link } from "react-router-dom";
import { X, Play } from "lucide-react";
import { useState } from "react";
import { useLastLesson } from "@/hooks/useLastLesson";

const DISMISS_KEY = "bneyzion_dismiss_continue";

const ContinueLearningBar = () => {
  const { lastLesson, isLoading } = useLastLesson();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "1"
  );

  if (isLoading || !lastLesson || dismissed) return null;

  const progress =
    lastLesson.progressSeconds && lastLesson.duration && lastLesson.duration > 0
      ? Math.min((lastLesson.progressSeconds / lastLesson.duration) * 100, 100)
      : 0;

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      dir="rtl"
      className="sticky top-16 z-30 border-b border-primary/10 bg-[#fdf8f0] shadow-sm"
    >
      <div className="container py-2.5 flex items-center gap-3">
        {/* Play icon */}
        <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <Play className="h-4 w-4 text-primary fill-primary" />
        </div>

        {/* Text + progress */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-display text-foreground truncate">
            <span className="text-muted-foreground ml-1">המשך מאיפה שהפסקת:</span>
            {lastLesson.title}
          </p>
          {lastLesson.rabbiName && (
            <p className="text-xs text-muted-foreground truncate">{lastLesson.rabbiName}</p>
          )}
          {progress > 0 && (
            <div className="mt-1 h-1 w-full max-w-[200px] rounded-full bg-primary/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* CTA button */}
        <Link
          to={`/lessons/${lastLesson.lessonId}`}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          המשך
        </Link>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="סגור"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ContinueLearningBar;
