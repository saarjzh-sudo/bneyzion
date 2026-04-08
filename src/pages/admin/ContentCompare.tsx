import { useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, Loader2, Play, RefreshCw, Link2, BookOpen, GraduationCap, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookNode {
  umbracoId: number;
  umbracoName: string;
  hasChildren: boolean;
  childCount: number;
  ourSeriesId: string | null;
  ourSeriesTitle: string | null;
  ourMatchCandidates?: { id: string; title: string; parentId?: string }[];
  compareResult?: CompareResult | null;
  comparing?: boolean;
}

interface CategoryNode {
  umbracoId: number;
  umbracoName: string;
  hasChildren: boolean;
  books: BookNode[];
  ourSeriesId: string | null;
  ourSeriesTitle: string | null;
  ourMatchCandidates?: { id: string; title: string }[];
  compareResult?: CompareResult | null;
  comparing?: boolean;
}

interface CompareResult {
  ourSeriesCount: number;
  ourLessonCount: number;
  ourTotalTitles: number;
  umbracoTotalTitles: number;
  matchedCount: number;
  missingCount: number;
  extraCount: number;
  matched: string[];
  missing: string[];
  extra: string[];
}

interface SectionState {
  tree: CategoryNode[];
  discovering: boolean;
  discovered: boolean;
  containerName: string;
  comparingAll: boolean;
  compareAllProgress: { done: number; total: number };
  summaryReport: SummaryReport | null;
}

interface SummaryReport {
  totalCompared: number;
  totalMatched: number;
  totalMissing: number;
  totalExtra: number;
  totalUmbracoItems: number;
  totalOurLessons: number;
  missingByNode: { name: string; missing: string[] }[];
}

const INITIAL_STATE: SectionState = {
  tree: [],
  discovering: false,
  discovered: false,
  containerName: "",
  comparingAll: false,
  compareAllProgress: { done: 0, total: 0 },
  summaryReport: null,
};

export default function ContentCompare() {
  const { toast } = useToast();
  const [seriesState, setSeriesState] = useState<SectionState>({ ...INITIAL_STATE });
  const [teachersState, setTeachersState] = useState<SectionState>({ ...INITIAL_STATE });

  const discoverTree = useCallback(async (section: "series" | "teachers") => {
    const setState = section === "series" ? setSeriesState : setTeachersState;
    setState(prev => ({ ...prev, discovering: true, summaryReport: null }));

    try {
      const { data, error } = await supabase.functions.invoke("compare-content", {
        body: { action: "discover-tree", section },
      });
      if (error) throw error;

      setState({
        ...INITIAL_STATE,
        tree: data.tree || [],
        discovered: true,
        containerName: data.containerName || "",
      });

      const totalBooks = (data.tree || []).reduce((s: number, c: any) => s + (c.books?.length || 0), 0);
      const matchedBooks = (data.tree || []).reduce((s: number, c: any) =>
        s + (c.books || []).filter((b: any) => b.ourSeriesId).length, 0);

      toast({
        title: `עץ ${section === "teachers" ? "אגף המורים" : "מאגר השיעורים"} נטען`,
        description: `${data.tree?.length} קטגוריות, ${totalBooks} ספרים (${matchedBooks} מותאמים)`,
      });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
      setState(prev => ({ ...prev, discovering: false }));
    }
  }, [toast]);

  const compareNode = useCallback(async (
    section: "series" | "teachers",
    seriesId: string,
    umbracoNodeId: number,
    catIdx: number,
    bookIdx?: number
  ): Promise<CompareResult | null> => {
    const setState = section === "series" ? setSeriesState : setTeachersState;

    setState(prev => {
      const next = structuredClone(prev);
      if (bookIdx !== undefined) next.tree[catIdx].books[bookIdx].comparing = true;
      else next.tree[catIdx].comparing = true;
      return next;
    });

    try {
      const { data, error } = await supabase.functions.invoke("compare-content", {
        body: { action: "compare-node", seriesId, umbracoNodeId, depth: 3 },
      });
      if (error) throw error;

      setState(prev => {
        const next = structuredClone(prev);
        if (bookIdx !== undefined) {
          next.tree[catIdx].books[bookIdx].comparing = false;
          next.tree[catIdx].books[bookIdx].compareResult = data;
        } else {
          next.tree[catIdx].comparing = false;
          next.tree[catIdx].compareResult = data;
        }
        return next;
      });
      return data as CompareResult;
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
      setState(prev => {
        const next = structuredClone(prev);
        if (bookIdx !== undefined) next.tree[catIdx].books[bookIdx].comparing = false;
        else next.tree[catIdx].comparing = false;
        return next;
      });
      return null;
    }
  }, [toast]);

  const compareAll = useCallback(async (section: "series" | "teachers") => {
    const setState = section === "series" ? setSeriesState : setTeachersState;
    const state = section === "series" ? seriesState : teachersState;

    // Collect all matched nodes
    const jobs: { seriesId: string; umbracoId: number; catIdx: number; bookIdx?: number; name: string }[] = [];
    state.tree.forEach((cat, catIdx) => {
      if (cat.ourSeriesId) {
        jobs.push({ seriesId: cat.ourSeriesId, umbracoId: cat.umbracoId, catIdx, name: cat.umbracoName });
      }
      cat.books.forEach((book, bookIdx) => {
        if (book.ourSeriesId) {
          jobs.push({ seriesId: book.ourSeriesId, umbracoId: book.umbracoId, catIdx, bookIdx, name: book.umbracoName });
        }
      });
    });

    if (jobs.length === 0) {
      toast({ title: "אין פריטים מותאמים להשוואה" });
      return;
    }

    setState(prev => ({ ...prev, comparingAll: true, compareAllProgress: { done: 0, total: jobs.length }, summaryReport: null }));

    const results: { name: string; result: CompareResult | null }[] = [];

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const result = await compareNode(section, job.seriesId, job.umbracoId, job.catIdx, job.bookIdx);
      results.push({ name: job.name, result });
      setState(prev => ({ ...prev, compareAllProgress: { done: i + 1, total: jobs.length } }));
    }

    // Build summary
    const summary: SummaryReport = {
      totalCompared: results.filter(r => r.result).length,
      totalMatched: results.reduce((s, r) => s + (r.result?.matchedCount || 0), 0),
      totalMissing: results.reduce((s, r) => s + (r.result?.missingCount || 0), 0),
      totalExtra: results.reduce((s, r) => s + (r.result?.extraCount || 0), 0),
      totalUmbracoItems: results.reduce((s, r) => s + (r.result?.umbracoTotalTitles || 0), 0),
      totalOurLessons: results.reduce((s, r) => s + (r.result?.ourLessonCount || 0), 0),
      missingByNode: results
        .filter(r => r.result && r.result.missingCount > 0)
        .map(r => ({ name: r.name, missing: r.result!.missing })),
    };

    setState(prev => ({ ...prev, comparingAll: false, summaryReport: summary }));

    toast({
      title: "השוואה הושלמה",
      description: `${summary.totalCompared} צמתים נבדקו — ${summary.totalMissing} חסרים, ${summary.totalMatched} תואמים`,
    });
  }, [seriesState, teachersState, compareNode, toast]);

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-heading gradient-teal">השוואת תוכן: Umbraco → אצלנו</h1>
          <p className="text-muted-foreground text-sm mt-1">
            מתחיל מעץ הסיידבר של האתר המקורי ובודק מה קיים / חסר אצלנו
          </p>
        </div>

        <Tabs defaultValue="series" dir="rtl">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="series" className="gap-2">
              <BookOpen className="h-4 w-4" />
              מאגר שיעורים
            </TabsTrigger>
            <TabsTrigger value="teachers" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              אגף המורים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="series" className="space-y-4 mt-4">
            <SectionView
              section="series"
              label="מאגר השיעורים"
              state={seriesState}
              onDiscover={() => discoverTree("series")}
              onCompare={(sId, uId, cIdx, bIdx) => compareNode("series", sId, uId, cIdx, bIdx)}
              onCompareAll={() => compareAll("series")}
            />
          </TabsContent>

          <TabsContent value="teachers" className="space-y-4 mt-4">
            <SectionView
              section="teachers"
              label="אגף המורים"
              state={teachersState}
              onDiscover={() => discoverTree("teachers")}
              onCompare={(sId, uId, cIdx, bIdx) => compareNode("teachers", sId, uId, cIdx, bIdx)}
              onCompareAll={() => compareAll("teachers")}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function SectionView({
  section,
  label,
  state,
  onDiscover,
  onCompare,
  onCompareAll,
}: {
  section: string;
  label: string;
  state: SectionState;
  onDiscover: () => void;
  onCompare: (seriesId: string, umbracoNodeId: number, catIdx: number, bookIdx?: number) => void;
  onCompareAll: () => void;
}) {
  const { tree, discovering, discovered, containerName, comparingAll, compareAllProgress, summaryReport } = state;

  const totalBooks = tree.reduce((s, c) => s + c.books.length, 0);
  const matchedCats = tree.filter(c => c.ourSeriesId).length;
  const matchedBooks = tree.reduce((s, c) => s + c.books.filter(b => b.ourSeriesId).length, 0);
  const unmatchedBooks = totalBooks - matchedBooks;
  const totalMatchedNodes = matchedCats + matchedBooks;

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          {discovered && containerName && (
            <p className="text-sm text-muted-foreground">
              מקור Umbraco: <span className="font-medium">{containerName}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {discovered && totalMatchedNodes > 0 && (
            <Button onClick={onCompareAll} disabled={comparingAll} size="lg" variant="secondary">
              {comparingAll ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <PlayCircle className="h-4 w-4 ml-2" />}
              השווה הכל ({totalMatchedNodes})
            </Button>
          )}
          <Button onClick={onDiscover} disabled={discovering} size="lg">
            {discovering ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <RefreshCw className="h-4 w-4 ml-2" />}
            {discovered ? "רענן" : `טען עץ ${label}`}
          </Button>
        </div>
      </div>

      {comparingAll && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">משווה {compareAllProgress.done} מתוך {compareAllProgress.total}...</span>
            </div>
            <Progress value={(compareAllProgress.done / compareAllProgress.total) * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {summaryReport && <SummaryReportView report={summaryReport} />}

      {!discovered && !discovering && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-lg mb-2">לחץ "טען עץ {label}" כדי להתחיל</p>
            <p className="text-muted-foreground text-sm">
              המערכת תיכנס ל-Umbraco, תטען את סיידבר {label} שלהם, ותחפש התאמות ב-DB שלנו
            </p>
          </CardContent>
        </Card>
      )}

      {discovering && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">מתחבר ל-Umbraco וטוען עץ {label}... (20-30 שניות)</p>
          </CardContent>
        </Card>
      )}

      {discovered && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="קטגוריות Umbraco" value={tree.length} />
            <StatCard label="ספרים/פריטים" value={totalBooks} />
            <StatCard label="קטגוריות מותאמות" value={matchedCats} color="green" />
            <StatCard label="ספרים מותאמים" value={matchedBooks} color="green" />
            <StatCard label="לא נמצאו" value={unmatchedBooks} color={unmatchedBooks > 0 ? "red" : "green"} />
          </div>

          {tree.map((cat, catIdx) => (
            <Card key={cat.umbracoId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <CardTitle className="text-lg font-display">{cat.umbracoName}</CardTitle>
                    <Badge variant="outline" className="font-mono text-xs">#{cat.umbracoId}</Badge>
                    <MatchBadge ourId={cat.ourSeriesId} ourTitle={cat.ourSeriesTitle} />
                    <StatusBadge result={cat.compareResult} comparing={cat.comparing} />
                  </div>
                  {cat.ourSeriesId && (
                    <Button size="sm" variant="outline"
                      onClick={() => onCompare(cat.ourSeriesId!, cat.umbracoId, catIdx)}
                      disabled={cat.comparing}
                    >
                      {cat.comparing ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Play className="h-3 w-3 ml-1" />}
                      השווה
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {cat.compareResult && <CompareResultView result={cat.compareResult} />}

                {cat.books.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>פריט ב-Umbraco</TableHead>
                        <TableHead>מזהה</TableHead>
                        <TableHead>התאמה אצלנו</TableHead>
                        <TableHead>סטטוס</TableHead>
                        <TableHead>פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cat.books.map((book, bookIdx) => (
                        <Collapsible key={book.umbracoId} asChild>
                          <>
                            <TableRow className={!book.ourSeriesId ? "bg-destructive/5" : ""}>
                              <TableCell className="font-medium">{book.umbracoName}</TableCell>
                              <TableCell><span className="font-mono text-xs text-muted-foreground">#{book.umbracoId}</span></TableCell>
                              <TableCell><MatchBadge ourId={book.ourSeriesId} ourTitle={book.ourSeriesTitle} /></TableCell>
                              <TableCell><StatusBadge result={book.compareResult} comparing={book.comparing} /></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {book.ourSeriesId && (
                                    <Button size="sm" variant="ghost"
                                      onClick={() => onCompare(book.ourSeriesId!, book.umbracoId, catIdx, bookIdx)}
                                      disabled={book.comparing}
                                      title="השווה"
                                    >
                                      {book.comparing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                                    </Button>
                                  )}
                                  {book.compareResult && (
                                    <CollapsibleTrigger asChild>
                                      <Button size="sm" variant="ghost"><ChevronDown className="h-3 w-3" /></Button>
                                    </CollapsibleTrigger>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                            {book.compareResult && (
                              <CollapsibleContent asChild>
                                <tr><td colSpan={5} className="p-4 bg-muted/30">
                                  <CompareResultView result={book.compareResult} />
                                </td></tr>
                              </CollapsibleContent>
                            )}
                          </>
                        </Collapsible>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </>
  );
}

function SummaryReportView({ report }: { report: SummaryReport }) {
  const coveragePercent = report.totalUmbracoItems > 0
    ? Math.round((report.totalMatched / report.totalUmbracoItems) * 100)
    : 100;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          דוח סיכום השוואה
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatCard label="צמתים שנבדקו" value={report.totalCompared} small />
          <StatCard label="פריטים ב-Umbraco" value={report.totalUmbracoItems} small />
          <StatCard label="שיעורים אצלנו" value={report.totalOurLessons} small />
          <StatCard label="תואמים" value={report.totalMatched} color="green" small />
          <StatCard label="חסרים" value={report.totalMissing} color={report.totalMissing > 0 ? "red" : "green"} small />
          <StatCard label="כיסוי" value={coveragePercent} color={coveragePercent >= 90 ? "green" : coveragePercent >= 70 ? undefined : "red"} small suffix="%" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">כיסוי כולל:</span>
          <Progress value={coveragePercent} className="h-3 flex-1" />
          <span className="text-sm font-bold">{coveragePercent}%</span>
        </div>

        {report.missingByNode.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive gap-1">
                <ChevronDown className="h-3 w-3" />
                {report.totalMissing} פריטים חסרים ב-{report.missingByNode.length} צמתים
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              {report.missingByNode.map((node, i) => (
                <div key={i} className="bg-destructive/10 rounded-lg p-3">
                  <p className="font-medium text-sm mb-2">{node.name} ({node.missing.length} חסרים)</p>
                  <div className="space-y-1 max-h-32 overflow-auto">
                    {node.missing.map((t, j) => <p key={j} className="text-xs text-destructive">• {t}</p>)}
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {report.totalMissing === 0 && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">כיסוי מלא! כל הפריטים מ-Umbraco קיימים אצלנו</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MatchBadge({ ourId, ourTitle }: { ourId: string | null; ourTitle: string | null }) {
  if (ourId) return <span className="text-sm text-green-600 flex items-center gap-1"><Link2 className="h-3 w-3" />{ourTitle}</span>;
  return <span className="text-sm text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" />לא נמצא</span>;
}

function StatusBadge({ result, comparing }: { result?: CompareResult | null; comparing?: boolean }) {
  if (comparing) return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />בודק...</Badge>;
  if (!result) return null;
  if (result.missingCount === 0) return <Badge className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" />תואם ({result.matchedCount})</Badge>;
  return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{result.missingCount} חסרים מתוך {result.umbracoTotalTitles}</Badge>;
}

function CompareResultView({ result }: { result: CompareResult }) {
  return (
    <div className="space-y-3 mb-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatCard label="סדרות אצלנו" value={result.ourSeriesCount} small />
        <StatCard label="שיעורים אצלנו" value={result.ourLessonCount} small />
        <StatCard label="פריטים ב-Umbraco" value={result.umbracoTotalTitles} small />
        <StatCard label="תואמים" value={result.matchedCount} color="green" small />
        <StatCard label="חסרים אצלנו" value={result.missingCount} color={result.missingCount > 0 ? "red" : "green"} small />
      </div>
      {result.missing.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive">
              <ChevronDown className="h-3 w-3 ml-1" />{result.missing.length} חסרים אצלנו
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="bg-destructive/10 rounded p-3 space-y-1 max-h-48 overflow-auto">
              {result.missing.map((t, i) => <p key={i} className="text-sm text-destructive">• {t}</p>)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      {result.extra.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronDown className="h-3 w-3 ml-1" />{result.extra.length} עודפים (רק אצלנו)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="bg-accent/50 rounded p-3 space-y-1 max-h-48 overflow-auto">
              {result.extra.map((t, i) => <p key={i} className="text-sm text-accent-foreground">• {t}</p>)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function StatCard({ label, value, color, small, suffix }: { label: string; value: number; color?: string; small?: boolean; suffix?: string }) {
  const colorClass = color === "green" ? "text-green-600" : color === "red" ? "text-destructive" : "";
  return (
    <div className={`bg-muted/50 rounded-lg ${small ? "p-2" : "p-3"} text-center`}>
      <p className={`${small ? "text-lg" : "text-2xl"} font-bold ${colorClass}`}>{value}{suffix || ""}</p>
      <p className={`${small ? "text-[10px]" : "text-xs"} text-muted-foreground`}>{label}</p>
    </div>
  );
}
