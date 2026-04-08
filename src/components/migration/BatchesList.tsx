import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMigrationBatches } from "@/hooks/useMigrationBatches";
import { BATCH_STATUS_LABELS, SOURCE_TYPE_LABELS, type BatchStatus, type SourceType } from "@/types/migration";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  running: "secondary",
  pending: "outline",
  failed: "destructive",
};

export function BatchesList() {
  const { data: batches, isLoading } = useMigrationBatches();

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">טוען...</div>;
  }

  if (!batches?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">אין הרצות מיגרציה עדיין</p>
        <p className="text-sm mt-1">הרצות חדשות יופיעו כאן כשתתחיל תהליך מיגרציה</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {batches.map((batch) => {
        const progress = batch.total_items > 0
          ? Math.round((batch.completed_items / batch.total_items) * 100)
          : 0;

        return (
          <Card key={batch.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-display">{batch.name}</CardTitle>
                <Badge variant={STATUS_VARIANT[batch.status] || "outline"}>
                  {BATCH_STATUS_LABELS[batch.status as BatchStatus] || batch.status}
                </Badge>
              </div>
              {batch.description && (
                <p className="text-sm text-muted-foreground">{batch.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {batch.source_type && (
                <Badge variant="outline">
                  {SOURCE_TYPE_LABELS[batch.source_type as SourceType] || batch.source_type}
                </Badge>
              )}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{batch.completed_items} / {batch.total_items}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              {batch.failed_items > 0 && (
                <p className="text-xs text-destructive">{batch.failed_items} פריטים נכשלו</p>
              )}
              <div className="flex gap-4 text-xs text-muted-foreground">
                {batch.started_at && (
                  <span>התחלה: {new Date(batch.started_at).toLocaleDateString("he-IL")}</span>
                )}
                {batch.completed_at && (
                  <span>סיום: {new Date(batch.completed_at).toLocaleDateString("he-IL")}</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
