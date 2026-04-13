import { memo } from "react";
import { Link } from "react-router-dom";
import { BookOpen, FolderOpen } from "lucide-react";

interface SeriesCardProps {
  id: string;
  title: string;
  lessonCount: number;
  rabbiName?: string | null;
  imageUrl?: string | null;
  onClick?: () => void;
}

const SeriesCard = memo(function SeriesCard({ id, title, lessonCount, rabbiName, imageUrl, onClick }: SeriesCardProps) {
  const content = (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <div className="relative z-10 flex items-start gap-3">
        {imageUrl ? (
          <img src={imageUrl} alt="" width={48} height={48} className="w-12 h-12 rounded-xl object-cover shrink-0" loading="lazy" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center shrink-0">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            {rabbiName && <span>{rabbiName}</span>}
            {rabbiName && lessonCount > 0 && <span className="text-border">·</span>}
            {lessonCount > 0 && (
              <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded-md">
                <BookOpen className="h-3 w-3" />
                {lessonCount} שיעורים
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return <div onClick={onClick}>{content}</div>;
  }

  return <Link to={`/series/${id}`}>{content}</Link>;
});

export default SeriesCard;
