import { Headphones, Video, FileText, BookOpen } from "lucide-react";

interface LessonThumbnailProps {
  title: string;
  rabbiName?: string | null;
  sourceType?: string;
  thumbnailUrl?: string | null;
  className?: string;
}

const typeConfig: Record<string, { icon: typeof Headphones; gradient: string }> = {
  audio: { icon: Headphones, gradient: "from-[hsl(180,30%,35%)] to-[hsl(180,30%,25%)]" },
  video: { icon: Video, gradient: "from-[hsl(30,30%,35%)] to-[hsl(30,30%,25%)]" },
  article: { icon: FileText, gradient: "from-[hsl(38,40%,40%)] to-[hsl(38,40%,30%)]" },
  text: { icon: BookOpen, gradient: "from-[hsl(220,20%,35%)] to-[hsl(220,20%,25%)]" },
};

const LessonThumbnail = ({ title, rabbiName, sourceType = "text", thumbnailUrl, className = "" }: LessonThumbnailProps) => {
  if (thumbnailUrl) {
    return (
      <div className={`relative overflow-hidden rounded-lg ${className}`}>
        <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
        {sourceType && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1.5">
            {(() => {
              const Icon = typeConfig[sourceType]?.icon || BookOpen;
              return <Icon className="h-3 w-3 text-white" />;
            })()}
          </div>
        )}
      </div>
    );
  }

  const config = typeConfig[sourceType] || typeConfig.text;
  const Icon = config.icon;

  return (
    <div className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${config.gradient} flex flex-col items-center justify-center p-4 ${className}`}>
      <Icon className="h-8 w-8 text-white/40 mb-2" />
      <p className="text-white/80 text-xs font-display text-center line-clamp-2 leading-tight max-w-[90%]">
        {title}
      </p>
      {rabbiName && (
        <p className="text-white/50 text-[10px] mt-1 font-display">{rabbiName}</p>
      )}
    </div>
  );
};

export default LessonThumbnail;
