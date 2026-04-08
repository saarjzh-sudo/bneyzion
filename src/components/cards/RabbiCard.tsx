import { memo } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface RabbiCardProps {
  id: string;
  name: string;
  title?: string | null;
  specialty?: string | null;
  imageUrl?: string | null;
  lessonCount: number;
}

const RabbiCard = memo(function RabbiCard({ id, name, title, specialty, imageUrl, lessonCount }: RabbiCardProps) {
  return (
    <Link to={`/rabbis/${id}`}>
      <Card className="hover:shadow-md transition-shadow h-full group text-center">
        <CardContent className="p-6 flex flex-col items-center">
          <Avatar className="h-20 w-20 mb-4 border-2 border-primary/10">
            <AvatarImage src={imageUrl || undefined} alt={name} />
            <AvatarFallback className="text-xl font-heading bg-primary/10 text-primary">
              {name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-heading text-foreground group-hover:text-primary transition-colors">{name}</h3>
          {title && <span className="text-xs text-muted-foreground mt-1">{title}</span>}
          {specialty && <span className="text-xs text-accent mt-1">{specialty}</span>}
          <span className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
            <BookOpen className="h-3 w-3" />
            {lessonCount} שיעורים
          </span>
        </CardContent>
      </Card>
    </Link>
  );
});

export default RabbiCard;
