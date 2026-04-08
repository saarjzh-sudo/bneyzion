export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="h-16 bg-muted/40 w-full" />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="h-8 bg-muted/40 rounded w-1/3" />
        <div className="h-4 bg-muted/40 rounded w-2/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted/40 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
