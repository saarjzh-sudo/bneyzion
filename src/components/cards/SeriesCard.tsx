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
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group">
      <div className="flex items-start gap-3">
        {imageUrl ? (
          <img src={imageUrl} alt="" width={48} height={48} className="w-12 h-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            {rabbiName && <span>{rabbiName}</span>}
            <span className="flex items-center gap-0.5">
              <BookOpen className="h-3 w-3" />
              {lessonCount} שיעורים
            </span>
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
