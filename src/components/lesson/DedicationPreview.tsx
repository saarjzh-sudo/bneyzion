import { Heart, Flame, BookOpen } from "lucide-react";
import { DEDICATION_TYPE_LABELS, type DedicationType } from "@/hooks/useLessonDedications";

const TYPE_ICON: Record<string, typeof Flame> = {
  iluy_neshama: Flame,
  refua: Heart,
  memory: BookOpen,
};

export interface DedicationPreviewData {
  dedication_type: DedicationType | string;
  dedicated_name: string;
  dedicator_name?: string | null;
  message?: string | null;
}

/**
 * הבאנר "מוקדש ל..." — מקור אמת יחיד.
 * משמש גם כ-Preview בדיאלוג ההקדשה (לפני תשלום) וגם כתצוגה החיה
 * (DedicationBadge) על השיעור/הסדרה בפועל. שינוי כאן משפיע על שניהם.
 */
export default function DedicationPreview({
  data,
  variant = "live",
}: {
  data: DedicationPreviewData;
  /** "preview" = מסגרת מקווקוות + תווית "כך ייראה", "live" = הצגה רגילה. */
  variant?: "preview" | "live";
}) {
  const Icon = TYPE_ICON[data.dedication_type] || Flame;
  const label = DEDICATION_TYPE_LABELS[data.dedication_type] || data.dedication_type;
  const hasName = !!data.dedicated_name?.trim();

  return (
    <div
      className={
        variant === "preview"
          ? "rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-3"
          : ""
      }
    >
      {variant === "preview" && (
        <p className="text-xs font-display text-primary mb-2 flex items-center gap-1.5">
          <Heart className="h-3 w-3" />
          כך תיראה ההקדשה בשיעור
        </p>
      )}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-sm">
        <Icon className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <span className="text-muted-foreground">{label}</span>{" "}
          <span className="font-display text-foreground">
            {hasName ? data.dedicated_name : "שם המוקדש"}
          </span>
          {data.dedicator_name?.trim() && (
            <span className="text-muted-foreground text-xs block">מאת {data.dedicator_name}</span>
          )}
          {data.message?.trim() && (
            <span className="text-muted-foreground text-xs block mt-0.5">{data.message}</span>
          )}
        </div>
      </div>
    </div>
  );
}
