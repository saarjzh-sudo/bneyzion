import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useMigrationStats } from "@/hooks/useMigrationStats";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Package, CheckCircle2, Clock, XCircle, SkipForward, ExternalLink, Activity, MousePointerClick, Search, Play, Loader2, ScanSearch, Sparkles, Square, Link, Unlink } from "lucide-react";
import { SOURCE_TYPE_LABELS, type SourceType } from "@/types/migration";
import { toast } from "sonner";
import { HtmlMigrationButton } from "./HtmlMigrationButton";

const STATUS_COLORS = {
  completed: "hsl(168, 45%, 30%)",
  in_progress: "hsl(36, 55%, 48%)",
  pending: "hsl(34, 18%, 70%)",
  failed: "hsl(0, 65%, 50%)",
  skipped: "hsl(20, 10%, 48%)",
};

export function MigrationOverview() {
  const { data: stats, isLoading } = useMigrationStats();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [deepScanning, setDeepScanning] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [generatingRedirects, setGeneratingRedirects] = useState(false);
  const [linkingSeries, setLinkingSeries] = useState(false);
  const [deepScanProgress, setDeepScanProgress] = useState<{ current: number; total: number; phase: string } | null>(null);
  const cancelRef = useRef(false);
  const queryClient = useQueryClient();

  const handleScan = async () => {
    setScanning(true);
    try {
      let hasMore = true;
      let totalStats = { rabbis: 0, lessons: 0, series: 0, qa: 0, categories: 0 };
      let round = 0;

      while (hasMore) {
        round++;
        const { data, error } = await supabase.functions.invoke("migrate-content", {
          body: { action: "scan" },
        });
        if (error) throw error;

        totalStats.rabbis += data.rabbis || 0;
        totalStats.lessons += data.lessons || 0;
        totalStats.series += data.series || 0;
        totalStats.qa += data.qa || 0;
        totalStats.categories += data.categories || 0;
        hasMore = data.hasMore === true;

        if (hasMore) {
          toast.info(`סבב ${round}: +${data.lessons} שיעורים, +${data.series} סדרות. נותרו ${data.queueRemaining} ענפים...`);
          queryClient.invalidateQueries({ queryKey: ["migration-stats"] });
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      toast.success(`סריקה הושלמה: ${totalStats.rabbis} רבנים, ${totalStats.lessons} שיעורים, ${totalStats.series} סדרות, ${totalStats.qa} שו"ת`);
      queryClient.invalidateQueries({ queryKey: ["migration-stats"] });
      queryClient.invalidateQueries({ queryKey: ["migration-items"] });
      queryClient.invalidateQueries({ queryKey: ["migration-batches"] });
      queryClient.invalidateQueries({ queryKey: ["migration-logs"] });
    } catch (err: any) {
      toast.error(`שגיאה בסריקה: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    cancelRef.current = false;
    try {
      let round = 0;
      let totalCompleted = 0;
      let totalFailed = 0;
      let hasMore = true;

      while (hasMore && !cancelRef.current) {
        round++;
        const { data, error } = await supabase.functions.invoke("migrate-content", {
          body: { action: "process" },
        });
        if (error) throw error;

        totalCompleted += data.completed || 0;
        totalFailed += data.failed || 0;
        hasMore = (data.completed || 0) > 0 || (data.hasMore === true);

        queryClient.invalidateQueries({ queryKey: ["migration-stats"] });
        queryClient.invalidateQueries({ queryKey: ["migration-items"] });

        if (hasMore && !cancelRef.current) {
          toast.info(`סבב ${round}: ${data.completed} הצליחו, ${data.failed} נכשלו. ממשיך...`);
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      if (cancelRef.current) {
        toast.info(`עיבוד נעצר ידנית אחרי ${round} סבבים: ${totalCompleted} הצליחו, ${totalFailed} נכשלו`);
      } else {
        toast.success(`עיבוד הושלם: ${totalCompleted} הצליחו, ${totalFailed} נכשלו (${round} סבבים)`);
      }
      queryClient.invalidateQueries({ queryKey: ["migration-batches"] });
      queryClient.invalidateQueries({ queryKey: ["migration-logs"] });
    } catch (err: any) {
      toast.error(`שגיאה בעיבוד: ${err.message}`);
    } finally {
      setProcessing(false);
      cancelRef.current = false;
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
    toast.info("עוצר אחרי הסבב הנוכחי...");
  };

  const handleGenerateRedirects = async () => {
    setGeneratingRedirects(true);
    try {
      const { data, error } = await supabase.functions.invoke("migrate-content", {
        body: { action: "generate-redirects" },
      });
      if (error) throw error;
      toast.success(`הפניות SEO: ${data.created} נוצרו, ${data.skipped} כבר קיימות`);
      queryClient.invalidateQueries({ queryKey: ["migration-stats"] });
    } catch (err: any) {
      toast.error(`שגיאה ביצירת הפניות: ${err.message}`);
    } finally {
      setGeneratingRedirects(false);
    }
  };

  const handleLinkSeries = async () => {
    setLinkingSeries(true);
    cancelRef.current = false;
    try {
      let round = 0;
      let totalLinked = 0;
      let hasMore = true;
      let offset = 0;

      while (hasMore && !cancelRef.current) {
        round++;
        const { data, error } = await supabase.functions.invoke("migrate-content", {
          body: { action: "link-series", options: { batchSize: 50, offset } },
        });
        if (error) throw error;

        totalLinked += data.linked || 0;
        hasMore = data.hasMore === true;
        offset = data.nextOffset || offset + 50;

        queryClient.invalidateQueries({ queryKey: ["migration-stats"] });
        queryClient.invalidateQueries({ queryKey: ["migration-items"] });

        if (hasMore && !cancelRef.current) {
          toast.info(`סבב ${round}: ${data.linked} שיעורים קושרו (${data.seriesProcessed} סדרות). ממשיך...`);
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (cancelRef.current) {
        toast.info(`קישור סדרות נעצר: ${totalLinked} שיעורים קושרו (${round} סבבים)`);
      } else {
        toast.success(`קישור סדרות הושלם: ${totalLinked} שיעורים קושרו (${round} סבבים)`);
      }
    } catch (err: any) {
      toast.error(`שגיאה בקישור סדרות: ${err.message}`);
    } finally {
      setLinkingSeries(false);
      cancelRef.current = false;
    }
  };

  const handleDeepScan = async () => {
    setDeepScanning(true);
    setDeepScanProgress({ current: 0, total: 0, phase: "מתחיל סריקה מעמיקה..." });
    try {
      const { data, error } = await supabase.functions.invoke("migrate-content", {
        body: { action: "deep-scan" },
      });
      if (error) throw error;

      const discovered = data?.discovered ?? 0;
      const added = data?.added ?? 0;
      setDeepScanProgress({ current: discovered, total: discovered, phase: "הושלם" });
      toast.success(`סריקה מעמיקה הושלמה: ${discovered} פריטים נמצאו, ${added} נוספו`);
      queryClient.invalidateQueries({ queryKey: ["migration-stats"] });
      queryClient.invalidateQueries({ queryKey: ["migration-items"] });
      queryClient.invalidateQueries({ queryKey: ["migration-batches"] });
      queryClient.invalidateQueries({ queryKey: ["migration-logs"] });
    } catch (err: any) {
      toast.error(`שגיאה בסריקה מעמיקה: ${err.message}`);
    } finally {
      setDeepScanning(false);
      setTimeout(() => setDeepScanProgress(null), 3000);
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    cancelRef.current = false;
    try {
      let round = 0;
      let totalEnriched = 0;
      let totalRabbis = 0;
      let hasMore = true;

      while (hasMore && !cancelRef.current) {
        round++;
        const { data, error } = await supabase.functions.invoke("migrate-content", {
          body: { action: "enrich", options: { batchSize: 50 } },
        });
        if (error) throw error;

        totalEnriched += data.enriched || 0;
        totalRabbis += data.rabbisDiscovered || 0;
        hasMore = data.hasMore === true;

        queryClient.invalidateQueries({ queryKey: ["migration-stats"] });
        queryClient.invalidateQueries({ queryKey: ["migration-items"] });

        if (hasMore && !cancelRef.current) {
          toast.info(`סבב ${round}: ${data.enriched} הועשרו, נותרו ${data.remaining}. ממשיך...`);
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (cancelRef.current) {
        toast.info(`העשרה נעצרה ידנית אחרי ${round} סבבים: ${totalEnriched} הועשרו, ${totalRabbis} רבנים חדשים`);
      } else {
        toast.success(`העשרה הושלמה: ${totalEnriched} הועשרו, ${totalRabbis} רבנים חדשים (${round} סבבים)`);
      }
      queryClient.invalidateQueries({ queryKey: ["migration-batches"] });
      queryClient.invalidateQueries({ queryKey: ["migration-logs"] });
    } catch (err: any) {
      toast.error(`שגיאה בהעשרה: ${err.message}`);
    } finally {
      setEnriching(false);
      cancelRef.current = false;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6 h-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const completionPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const pieData = [
    { name: "הושלמו", value: stats.completed, color: STATUS_COLORS.completed },
    { name: "בתהליך", value: stats.in_progress, color: STATUS_COLORS.in_progress },
    { name: "ממתינים", value: stats.pending, color: STATUS_COLORS.pending },
    { name: "נכשלו", value: stats.failed, color: STATUS_COLORS.failed },
    { name: "דילוגים", value: stats.skipped, color: STATUS_COLORS.skipped },
  ].filter((d) => d.value > 0);

  const typeData = Object.entries(stats.byType).map(([type, count]) => ({
    name: SOURCE_TYPE_LABELS[type as SourceType] || type,
    count,
  }));

  const statCards = [
    { label: "סה״כ פריטים", value: stats.total, icon: Package, color: "text-foreground" },
    { label: "הושלמו", value: stats.completed, icon: CheckCircle2, color: "text-primary" },
    { label: "בתהליך", value: stats.in_progress, icon: Clock, color: "text-accent" },
    { label: "נכשלו", value: stats.failed, icon: XCircle, color: "text-destructive" },
    { label: "דילוגים", value: stats.skipped, icon: SkipForward, color: "text-muted-foreground" },
    { label: "הפניות SEO", value: stats.redirectsTotal, icon: ExternalLink, color: "text-primary" },
    { label: "הפניות פעילות", value: stats.redirectsActive, icon: Activity, color: "text-primary" },
    { label: "סה״כ פגיעות", value: stats.totalHits, icon: MousePointerClick, color: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      {/* HTML Full Migration - Single Button */}
      <HtmlMigrationButton />

      {/* Migration Actions */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Button onClick={handleScan} disabled={scanning || processing || deepScanning || enriching} className="gap-2">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {scanning ? "סורק API..." : "סרוק דרך Umbraco API"}
            </Button>
            <Button onClick={handleDeepScan} disabled={scanning || processing || deepScanning || enriching} variant="outline" className="gap-2 border-primary/40 text-primary hover:bg-primary/10">
              {deepScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
              {deepScanning ? "סורק לעומק..." : "סריקה מעמיקה"}
            </Button>
            <Button onClick={handleProcess} disabled={scanning || processing || deepScanning || enriching} variant="secondary" className="gap-2">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {processing ? "מעבד..." : "עבד פריטים ממתינים"}
            </Button>
            {(processing || enriching || linkingSeries) && (
              <Button onClick={handleCancel} variant="destructive" size="sm" className="gap-2">
                <Square className="h-3 w-3" />
                עצור
              </Button>
            )}
            <Button onClick={handleEnrich} disabled={scanning || processing || deepScanning || enriching} variant="outline" className="gap-2 border-accent/40 text-accent hover:bg-accent/10">
              {enriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {enriching ? "מעשיר..." : "העשר פרטים + גלה רבנים"}
            </Button>
            <Button onClick={handleGenerateRedirects} disabled={scanning || processing || deepScanning || enriching || generatingRedirects || linkingSeries} variant="outline" className="gap-2 border-primary/40 text-primary hover:bg-primary/10">
              {generatingRedirects ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
              {generatingRedirects ? "יוצר הפניות..." : "צור הפניות SEO"}
            </Button>
            <Button onClick={handleLinkSeries} disabled={scanning || processing || deepScanning || enriching || generatingRedirects || linkingSeries} variant="outline" className="gap-2 border-accent/40 text-accent hover:bg-accent/10">
              {linkingSeries ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
              {linkingSeries ? "מקשר סדרות..." : "קשר שיעורים לסדרות"}
            </Button>
            <span className="text-sm text-muted-foreground">סרוק → העשר → עבד → קשר סדרות → צור הפניות</span>
          </div>

          {deepScanProgress && (
            <div className="space-y-2 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="font-display flex items-center gap-2">
                  {deepScanning && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                  {deepScanProgress.phase}
                </span>
                {deepScanProgress.total > 0 && (
                  <span className="text-muted-foreground">{deepScanProgress.current} / {deepScanProgress.total}</span>
                )}
              </div>
              <Progress
                value={deepScanProgress.total > 0 ? (deepScanProgress.current / deepScanProgress.total) * 100 : deepScanning ? 0 : 100}
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-lg">התקדמות כללית</span>
            <span className="font-display text-2xl text-primary">{completionPercent}%</span>
          </div>
          <Progress value={completionPercent} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {stats.completed} מתוך {stats.total} פריטים הושלמו
          </p>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <card.icon className={`h-8 w-8 ${card.color}`} />
              <div>
                <p className="text-2xl font-display">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pieData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">התפלגות לפי סטטוס</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {typeData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">פריטים לפי סוג</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(168, 45%, 30%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
