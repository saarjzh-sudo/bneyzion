import { useLessonDedications, useSeriesDedications } from "@/hooks/useLessonDedications";
import DedicationPreview from "@/components/lesson/DedicationPreview";

/**
 * הבאנר החי "מוקדש ל..." על שיעור או סדרה.
 * ספק בדיוק אחד מ-lessonId / seriesId. אם השיעור עצמו שייך לסדרה מוקדשת,
 * אפשר להעביר את שניהם — מציג את שתי ההקדשות (שיעור ואז סדרה).
 */
export default function DedicationBadge({
  lessonId,
  seriesId,
}: {
  lessonId?: string;
  seriesId?: string;
}) {
  const { data: lessonDedications } = useLessonDedications(lessonId);
  const { data: seriesDedications } = useSeriesDedications(seriesId);

  const all = [...(lessonDedications ?? []), ...(seriesDedications ?? [])];

  if (!all.length) return null;

  return (
    <div className="space-y-2">
      {all.slice(0, 3).map((d) => (
        <DedicationPreview
          key={d.id}
          variant="live"
          data={{
            dedication_type: d.dedication_type,
            dedicated_name: d.dedicated_name,
            dedicator_name: d.dedicator_name,
            message: d.message,
          }}
        />
      ))}
    </div>
  );
}
