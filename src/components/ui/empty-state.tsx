import { BookOpen, Search, Heart, FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  icon?: "book" | "search" | "heart" | "folder";
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

const icons = {
  book: BookOpen,
  search: Search,
  heart: Heart,
  folder: FolderOpen,
};

export function EmptyState({ icon = "book", title, description, actionLabel, actionHref }: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" dir="rtl">
      <div className="bg-primary/10 p-4 rounded-2xl mb-4">
        <Icon className="h-8 w-8 text-primary/60" />
      </div>
      <h3 className="text-lg font-heading text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {actionLabel && actionHref && (
        <Link
          to={actionHref}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-display hover:bg-primary/90 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
