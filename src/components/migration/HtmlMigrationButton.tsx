import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Play, Square, Globe, CheckCircle2, SkipForward, AlertTriangle } from "lucide-react";

interface MigrationState {
  phase: "idle" | "discovering" | "processing" | "done" | "error";
  batchId: string | null;
  totalUrls: number;
  processedUrls: number;
  imported: number;
  skipped: number;
  errors: number;
  message: string;
}

export function HtmlMigrationButton() {
  const [state, setState] = useState<MigrationState>({
    phase: "idle",
    batchId: null,
    totalUrls: 0,
    processedUrls: 0,
    imported: 0,
    skipped: 0,
    errors: 0,
    message: "",
  });
  const cancelRef = useRef(false);
  const queryClient = useQueryClient();

  const progress = state.totalUrls > 0
    ? Math.round((state.processedUrls / state.totalUrls) * 100)
    : 0;

  const runFullMigration = useCallback(async () => {
    cancelRef.current = false;
    setState(s => ({ ...s, phase: "discovering", message: "מגלה דפים באתר הישן...", imported: 0, skipped: 0, errors: 0, processedUrls: 0 }));

    try {
      // Phase 1: Discover
      const { data: discoverData, error: discoverError } = await supabase.functions.invoke("migrate-html", {
        body: { action: "discover" },
      });
      if (discoverError) throw new Error(discoverError.message);
      if (!discoverData?.success) throw new Error(discoverData?.error || "Discovery failed");

      const batchId = discoverData.batchId;
      const totalUrls = discoverData.newUrls;

      if (totalUrls === 0) {
        setState(s => ({
          ...s,
          phase: "done",
          message: `כל ${discoverData.totalFound} הדפים כבר קיימים במערכת! אין מה לייבא.`,
          totalUrls: discoverData.totalFound,
          processedUrls: discoverData.totalFound,
          skipped: discoverData.alreadyExists,
        }));
        toast.success("כל התכנים כבר קיימים!");
        return;
      }

      setState(s => ({
        ...s,
        phase: "processing",
        batchId,
        totalUrls,
        message: `נמצאו ${totalUrls} דפים חדשים (מתוך ${discoverData.totalFound}). מתחיל ייבוא...`,
      }));

      toast.info(`נמצאו ${totalUrls} דפים חדשים לייבוא`);

      // Phase 2: Process in loops of 3
      let offset = 0;
      let hasMore = true;
      let totalImported = 0;
      let totalSkipped = discoverData.alreadyExists || 0;
      let totalErrors = 0;
      let round = 0;

      while (hasMore && !cancelRef.current) {
        round++;
        const { data, error } = await supabase.functions.invoke("migrate-html", {
          body: { action: "process-batch", batchId, offset },
        });

        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error || "Processing failed");

        totalImported += data.imported || 0;
        totalSkipped += data.skipped || 0;
        totalErrors += data.errors || 0;
        offset = data.nextOffset || offset + 3;
        hasMore = data.hasMore === true;

        setState(s => ({
          ...s,
          processedUrls: Math.min(offset, totalUrls),
          imported: totalImported,
          skipped: totalSkipped,
          errors: totalErrors,
          message: `סבב ${round}: ${data.imported} יובאו, ${data.skipped} דולגו (${data.progress || 0}%)`,
        }));

        queryClient.invalidateQueries({ queryKey: ["migration-stats"] });

        if (hasMore && !cancelRef.current) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      setState(s => ({
        ...s,
        phase: "done",
        processedUrls: totalUrls,
        message: cancelRef.current
          ? `נעצר ידנית: ${totalImported} יובאו, ${totalSkipped} דולגו, ${totalErrors} שגיאות`
          : `הושלם: ${totalImported} יובאו, ${totalSkipped} דולגו, ${totalErrors} שגיאות`,
      }));

      queryClient.invalidateQueries({ queryKey: ["migration-stats"] });
      queryClient.invalidateQueries({ queryKey: ["migration-items"] });
      queryClient.invalidateQueries({ queryKey: ["migration-batches"] });
      queryClient.invalidateQueries({ queryKey: ["migration-logs"] });

      if (cancelRef.current) {
        toast.info(`מיגרציה נעצרה: ${totalImported} תכנים יובאו`);
      } else {
        toast.success(`מיגרציה הושלמה! ${totalImported} תכנים חדשים יובאו`);
      }
    } catch (err: any) {
      setState(s => ({
        ...s,
        phase: "error",
        message: `שגיאה: ${err.message}`,
      }));
      toast.error(`שגיאת מיגרציה: ${err.message}`);
    }
  }, [queryClient]);

  const handleCancel = () => {
    cancelRef.current = true;
    toast.info("עוצר אחרי הסבב הנוכחי...");
  };

  const isRunning = state.phase === "discovering" || state.phase === "processing";

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          מיגרציה מלאה מ-HTML
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          סורק את האתר הישן דרך HTML, מזהה תכנים חסרים, ומייבא אותם אוטומטית.
          תכנים קיימים ידולגו.
        </p>

        <div className="flex items-center gap-3">
          <Button
            onClick={runFullMigration}
            disabled={isRunning}
            className="gap-2"
            size="lg"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? "מייבא..." : "התחל מיגרציה מלאה"}
          </Button>

          {isRunning && (
            <Button onClick={handleCancel} variant="destructive" size="sm" className="gap-2">
              <Square className="h-3 w-3" />
              עצור
            </Button>
          )}
        </div>

        {state.phase !== "idle" && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                {state.phase === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                {state.phase === "error" && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                {state.message}
              </span>
              {state.totalUrls > 0 && (
                <span className="text-muted-foreground font-mono">
                  {state.processedUrls}/{state.totalUrls}
                </span>
              )}
            </div>

            <Progress value={progress} className="h-2.5" />

            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                {state.imported} יובאו
              </span>
              <span className="flex items-center gap-1">
                <SkipForward className="h-3 w-3" />
                {state.skipped} דולגו
              </span>
              {state.errors > 0 && (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                  {state.errors} שגיאות
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
