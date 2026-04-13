import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonCardProps {
  /** Show a circular avatar instead of a rectangular image area */
  avatar?: boolean;
  /** Number of text lines below the title (default: 1) */
  lines?: number;
  /** Additional class names on the outer wrapper */
  className?: string;
}

/** Card-shaped skeleton with image placeholder, title bar, and subtitle bars */
export function SkeletonCard({ avatar = false, lines = 1, className = "" }: SkeletonCardProps) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 space-y-4 ${className}`}>
      {avatar ? (
        <Skeleton className="h-20 w-20 rounded-full mx-auto" />
      ) : (
        <Skeleton className="h-32 w-full rounded-lg" />
      )}
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-3/4 mx-auto rounded" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-3 rounded mx-auto ${i === 0 ? "w-1/2" : "w-2/5"}`}
          />
        ))}
      </div>
    </div>
  );
}

/** Horizontal skeleton row for list items (series/lessons) */
export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 bg-card border border-border rounded-lg p-4 ${className}`}>
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/5 rounded" />
        <Skeleton className="h-3 w-2/5 rounded" />
      </div>
      <Skeleton className="h-6 w-14 rounded-full shrink-0" />
    </div>
  );
}

/** Sidebar navigation skeleton */
export function SkeletonSidebar() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2">
          <Skeleton className="h-4 w-4 rounded shrink-0" />
          <Skeleton className={`h-3 rounded ${i % 2 === 0 ? "w-24" : "w-16"}`} />
        </div>
      ))}
    </div>
  );
}

/** Lesson card skeleton for horizontal scrolling sections */
export function SkeletonLessonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-5 space-y-3 ${className}`}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-4/5 rounded" />
          <Skeleton className="h-3 w-3/5 rounded" />
          <Skeleton className="h-3 w-2/5 rounded" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
    </div>
  );
}
