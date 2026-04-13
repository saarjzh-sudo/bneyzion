import { Star } from "lucide-react";
import { usePoints } from "@/hooks/usePoints";
import { Link } from "react-router-dom";

const PointsBadge = () => {
  const { points, isLoggedIn, isLoading } = usePoints();

  if (!isLoggedIn || isLoading) return null;

  const total = points?.total_points ?? 0;

  return (
    <Link
      to="/profile"
      className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/15 text-accent-foreground hover:bg-accent/25 transition-colors"
      title="הנקודות שלי"
    >
      <Star className="h-3.5 w-3.5 text-accent fill-accent" />
      <span className="text-xs font-display font-semibold">{total}</span>
    </Link>
  );
};

export default PointsBadge;
