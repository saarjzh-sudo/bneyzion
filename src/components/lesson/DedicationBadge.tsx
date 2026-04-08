import { Heart, Flame } from "lucide-react";
import { useLessonDedications } from "@/hooks/useLessonDedications";

const typeLabels: Record<string, string> = {
  iluy_neshama: "לעילוי נשמת",
  refua: "לרפואה שלמה",
  memory: "לזכרון",
};

export default function DedicationBadge({ lessonId }: { lessonId: string }) {
  const { data: dedications } = useLessonDedications(lessonId);

  if (!dedications?.length) return null;

  return (
    <div className="space-y-2">
      {dedications.slice(0, 3).map((d) => (
        <div
          key={d.id}
          className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-sm"
        >
          <Flame className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="text-muted-foreground">{typeLabels[d.dedication_type] || d.dedication_type}</span>{" "}
            <span className="font-display text-foreground">{d.dedicated_name}</span>
            {d.dedicator_name && (
              <span className="text-muted-foreground text-xs block">מאת {d.dedicator_name}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
