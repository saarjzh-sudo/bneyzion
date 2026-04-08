import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, AlertTriangle, CheckCircle, XCircle, Download } from "lucide-react";
import { toast } from "sonner";

interface GapItem {
  umbracoId: number;
  umbracoName: string;
  umbracoType: string;
  parentName: string;
  status: "missing" | "empty" | "partial";
  dbSeriesId?: string;
  dbLessonCount?: number;
  umbracoChildCount?: number;
  path: string;
}

interface ScanResult {
  summary: {
    totalUmbracoNodes: number;
    totalDbSeries: number;
    totalGaps: number;
    missing: number;
    empty: number;
    partial: number;
  };
  gaps: GapItem[];
  scannedAt: string;
}

interface ImportResult {
  seriesName: string;
  status: string;
  lessonsCreated?: number;
  lessonsSkipped?: number;
  errors?: number;
}

export default function UmbracoGapScan() {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);

  const runScan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-umbraco-gaps", {
        body: { maxDepth: 6 },
      });
      if (error) throw error;
      setResult(data);
      toast.success(`סריקה הושלמה – נמצאו ${data.summary.totalGaps} פערים`);
    } catch (e: any) {
      toast.error(e.message || "שגיאה בסריקה");
    } finally {
      setLoading(false);
    }
  };

  const [importProgress, setImportProgress] = useState("");
  const [stopRequested, setStopRequested] = useState(false);
  const stopRef = { current: false };

  const runImport = async () => {
    setImporting(true);
    setStopRequested(false);
    stopRef.current = false;
    const allResults: ImportResult[] = [];

    try {
      let loopCount = 0;
      while (!stopRef.current) {
        loopCount++;

        // Get empty series each loop (some may have been filled)
        const { data: emptySeries, error: seriesErr } = await supabase
          .from("series")
          .select("id, title")
          .eq("lesson_count", 0)
          .eq("status", "active")
          .limit(100);

        if (seriesErr) throw seriesErr;
        if (!emptySeries?.length) {
          toast.success("כל הסדרות מלאות! אין עוד מה לייבא.");
          break;
        }

        const mappings = emptySeries.map((s) => ({
          seriesName: s.title,
          targetSeriesId: s.id,
        }));

        setImportProgress(`לופ ${loopCount}: ${emptySeries.length} סדרות ריקות נותרו`);

        // Process in batches of 3 (smaller to avoid timeouts)
        for (let i = 0; i < mappings.length && !stopRef.current; i += 3) {
          const batch = mappings.slice(i, i + 3);
          setImportProgress(`לופ ${loopCount}: מייבא ${i + 1}-${Math.min(i + 3, mappings.length)} מתוך ${mappings.length}...`);

          try {
            const { data, error } = await supabase.functions.invoke("import-series-content", {
              body: { action: "find-and-import", mappings: batch },
            });

            if (error) {
              console.error("Import batch error:", error);
              continue;
            }

            if (data?.results) {
              allResults.push(...data.results);
              setImportResults([...allResults]);
            }
          } catch (batchErr: any) {
            console.error("Batch error:", batchErr);
            // Continue to next batch
          }
        }

        // Check if we actually imported anything in this loop
        const thisLoopImported = allResults.filter(
          (r) => r.status === "imported" && (r.lessonsCreated || 0) > 0
        ).length;

        toast.info(`לופ ${loopCount} הושלם. סה"כ ${thisLoopImported} סדרות עודכנו. ממשיך...`);

        // Small delay between loops
        await new Promise((r) => setTimeout(r, 1000));
      }

      const totalImported = allResults.filter((r) => r.status === "imported" && (r.lessonsCreated || 0) > 0);
      toast.success(`ייבוא הושלם: ${totalImported.length} סדרות עודכנו עם תוכן חדש`);
      setImportProgress("");
    } catch (e: any) {
      toast.error(e.message || "שגיאה בייבוא");
    } finally {
      setImporting(false);
      setImportProgress("");
    }
  };

  const stopImport = () => {
    stopRef.current = true;
    setStopRequested(true);
    toast.info("עוצר אחרי הבאץ' הנוכחי...");
  };

  const statusConfig = {
    missing: { label: "חסר לחלוטין", color: "destructive" as const, icon: XCircle },
    empty: { label: "סדרה ריקה", color: "secondary" as const, icon: AlertTriangle },
    partial: { label: "חלקי", color: "outline" as const, icon: AlertTriangle },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={runScan} disabled={loading || importing} size="lg">
          {loading ? <Loader2 className="animate-spin ml-2 h-4 w-4" /> : <Search className="ml-2 h-4 w-4" />}
          סרוק פערים מול Umbraco
        </Button>
        {!importing ? (
          <Button onClick={runImport} disabled={loading} size="lg" variant="secondary">
            <Download className="ml-2 h-4 w-4" />
            ייבא תוכן לסדרות ריקות (לופ אוטומטי)
          </Button>
        ) : (
          <Button onClick={stopImport} variant="destructive" size="lg">
            <XCircle className="ml-2 h-4 w-4" />
            {stopRequested ? "עוצר..." : "עצור ייבוא"}
          </Button>
        )}
        {importProgress && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin h-4 w-4" />
            <span>{importProgress}</span>
          </div>
        )}
        {result && !importing && (
          <span className="text-sm text-muted-foreground">
            סריקה אחרונה: {new Date(result.scannedAt).toLocaleString("he-IL")}
          </span>
        )}
      </div>

      {/* Import results */}
      {importResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">תוצאות ייבוא</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {importResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 rounded border">
                  {r.status === "imported" && (r.lessonsCreated || 0) > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : r.status === "not_found" ? (
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  )}
                  <span className="font-medium">{r.seriesName}</span>
                  {r.status === "imported" && (
                    <span className="text-muted-foreground">
                      +{r.lessonsCreated} שיעורים, {r.lessonsSkipped} דילוגים
                      {(r.errors || 0) > 0 && `, ${r.errors} שגיאות`}
                    </span>
                  )}
                  {r.status === "not_found" && (
                    <span className="text-muted-foreground">לא נמצא ב-Umbraco</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{result.summary.totalUmbracoNodes}</div>
                <div className="text-xs text-muted-foreground">צמתים ב-Umbraco</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{result.summary.totalDbSeries}</div>
                <div className="text-xs text-muted-foreground">סדרות ב-DB</div>
              </CardContent>
            </Card>
            <Card className="border-destructive">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-destructive">{result.summary.missing}</div>
                <div className="text-xs text-muted-foreground">חסרים לחלוטין</div>
              </CardContent>
            </Card>
            <Card className="border-orange-400">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-orange-500">{result.summary.empty}</div>
                <div className="text-xs text-muted-foreground">סדרות ריקות</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{result.summary.partial}</div>
                <div className="text-xs text-muted-foreground">חלקיים</div>
              </CardContent>
            </Card>
          </div>

          {/* Gap list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">פערים שנמצאו ({result.gaps.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {result.gaps.map((gap, i) => {
                  const cfg = statusConfig[gap.status];
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${gap.status === "missing" ? "text-destructive" : "text-orange-500"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{gap.umbracoName}</span>
                          <Badge variant={cfg.color}>{cfg.label}</Badge>
                          {gap.umbracoChildCount != null && (
                            <span className="text-xs text-muted-foreground">{gap.umbracoChildCount} פריטים ב-Umbraco</span>
                          )}
                          {gap.dbLessonCount != null && (
                            <span className="text-xs text-muted-foreground">• {gap.dbLessonCount} שיעורים ב-DB</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate" dir="ltr">{gap.path}</div>
                      </div>
                    </div>
                  );
                })}
                {result.gaps.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <span>לא נמצאו פערים! כל התוכן מסונכרן.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
