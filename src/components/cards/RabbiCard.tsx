import { memo } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface RabbiCardProps {
  id: string;
  slug?: string | null;
  name: string;
  title?: string | null;
  specialty?: string | null;
  imageUrl?: string | null;
  lessonCount: number;
}

// Warm gradient backgrounds for rabbis without photos
const avatarGradients = [
  "from-[hsl(30,40%,45%)] to-[hsl(38,50%,35%)]",   // warm brown-gold
  "from-[hsl(180,25%,40%)] to-[hsl(180,30%,30%)]",  // teal
  "from-[hsl(25,35%,50%)] to-[hsl(30,45%,38%)]",    // amber-brown
  "from-[hsl(38,45%,48%)] to-[hsl(30,35%,38%)]",    // gold-brown
  "from-[hsl(180,20%,45%)] to-[hsl(200,25%,35%)]",  // teal-slate
];

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarGradients[Math.abs(hash) % avatarGradients.length];
}

// 27.5.2026 — skip "הרב " prefix so each rabbi gets a distinct initial (not all "ה")
function getRabbiInitial(name: string): string {
  const cleanName = name.replace(/^הרב\s+/, "").trim();
  return cleanName.charAt(0) || name.charAt(0);
}

const RabbiCard = memo(function RabbiCard({ id, slug, name, title, specialty, imageUrl, lessonCount }: RabbiCardProps) {
  return (
    <Link to={`/rabbis/${slug ?? id}`}>
      <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full group text-center border-border">
        <CardContent className="p-6 flex flex-col items-center">
          {imageUrl ? (
            <Avatar className="h-20 w-20 mb-4 border-2 border-primary/10">
              <AvatarImage src={imageUrl} alt={name} />
              <AvatarFallback className="text-xl font-heading bg-primary/10 text-primary">
                {getRabbiInitial(name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={`h-20 w-20 mb-4 rounded-full bg-gradient-to-br ${getGradient(name)} flex items-center justify-center border-2 border-white/20 shadow-inner`}>
              <span className="text-2xl font-heading text-white/90 drop-shadow-sm">
                {getRabbiInitial(name)}
              </span>
            </div>
          )}
          <h3 className="font-heading text-foreground group-hover:text-primary transition-colors">{name}</h3>
          {title && <span className="text-xs text-muted-foreground mt-1">{title}</span>}
          {specialty && <span className="text-xs text-accent mt-1">{specialty}</span>}
          <span className="flex items-center gap-1 text-xs text-muted-foreground mt-3 bg-muted/50 px-2 py-0.5 rounded-md">
            <BookOpen className="h-3 w-3" />
            {lessonCount} שיעורים
          </span>
        </CardContent>
      </Card>
    </Link>
  );
});

export default RabbiCard;
