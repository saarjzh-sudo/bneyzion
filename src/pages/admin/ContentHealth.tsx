import { useState, useMemo, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, FileText, Music, Video, Paperclip, ExternalLink, Download, Wrench, Loader2 } from "lucide-react";
import { toast } from "sonner";

type GapType = "no_media" | "no_content" | "no_attachment" | "completely_empty";

const GAP_LABELS: Record<GapType, string> = {
  completely_empty: "ריק לחלוטין",
  no_media: "חסר מדיה (וידאו/אודיו)",
  no_content: "חסר תוכן טקסטואלי",
  no_attachment: "חסר קובץ מצורף",
};

export default function ContentHealth() {
  const [filter, setFilter] = useState<GapType | "all">("completely_empty");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [fixing, setFixing] = useState(false);
  const [fixProgress, setFixProgress] = useState({ done: 0, total: 0, fixed: 0, skipped: 0 });
  const PAGE_SIZE = 50;
  const queryClient = useQueryClient();

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["content-health-report"],
    queryFn: async () => {
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("lessons")
          .select("id, title, rabbi_id, series_id, duration, video_url, audio_url, content, attachment_url, published_at, rabbis(name), series(title)")
          .eq("status", "published")
          .or("video_url.is.null,audio_url.is.null,content.is.null,attachment_url.is.null")
          .order("title", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data || []);
        hasMore = (data?.length || 0) === PAGE;
        from += PAGE;
      }
      return all;
    },
  });

  const enriched = useMemo(() => {
    if (!lessons) return [];
    return lessons.map((l) => {
      const hasMedia = !!(l.video_url || l.audio_url);
      const hasContent = !!(l.content && l.content.trim().length > 0);
      const hasAttachment = !!(l.attachment_url && l.attachment_url.trim().length > 0);
      const gaps: GapType[] = [];
      if (!hasMedia && !hasContent && !hasAttachment) gaps.push("completely_empty");
      if (!hasMedia) gaps.push("no_media");
      if (!hasContent) gaps.push("no_content");
      if (!hasAttachment) gaps.push("no_attachment");
      return { ...l, hasMedia, hasContent, hasAttachment, gaps };
    });
  }, [lessons]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filter !== "all") {
      list = list.filter((l) => l.gaps.includes(filter));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.rabbis as any)?.name?.toLowerCase().includes(q) ||
          (l.series as any)?.title?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enriched, filter, search]);

  const stats = useMemo(() => {
    if (!enriched.length) return null;
    return {
      total: enriched.length,
      completelyEmpty: enriched.filter((l) => l.gaps.includes("completely_empty")).length,
      noMedia: enriched.filter((l) => l.gaps.includes("no_media")).length,
      noContent: enriched.filter((l) => l.gaps.includes("no_content")).length,
      noAttachment: enriched.filter((l) => l.gaps.includes("no_attachment")).length,
    };
  }, [enriched]);

  // Bulk fix: match completely empty lessons against migration_items by title
  const bulkFixFromMigration = useCallback(async () => {
    const emptyLessons = enriched.filter((l) => l.gaps.includes("completely_empty"));
    if (!emptyLessons.length) {
      toast.info("אין שיעורים ריקים לחלוטין לתיקון");
      return;
    }

    setFixing(true);
    setFixProgress({ done: 0, total: emptyLessons.length, fixed: 0, skipped: 0 });

    let fixed = 0;
    let skipped = 0;

    // Process in batches of 5 for performance
    for (let i = 0; i < emptyLessons.length; i++) {
      const lesson = emptyLessons[i];

      try {
        // Find matching migration item by title
        const { data: migItems } = await supabase
          .from("migration_items")
          .select("source_data, source_title")
          .eq("source_title", lesson.title)
          .limit(1);

        if (migItems && migItems.length > 0) {
          const sd = migItems[0].source_data as any;
          if (!sd) { skipped++; continue; }

          const updates: { content?: string; audio_url?: string; video_url?: string; attachment_url?: string } = {};
          if (sd.full_content && !lesson.content) updates.content = sd.full_content;
          if (sd.audio_url && !lesson.audio_url) updates.audio_url = sd.audio_url;
          if (sd.video_url && !lesson.video_url) updates.video_url = sd.video_url;
          if (sd.pdf_url && !lesson.attachment_url) updates.attachment_url = sd.pdf_url;

          if (Object.keys(updates).length > 0) {
            const { error } = await supabase
              .from("lessons")
              .update(updates)
              .eq("id", lesson.id);
            if (!error) { fixed++; } else { skipped++; }
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }

      setFixProgress({ done: i + 1, total: emptyLessons.length, fixed, skipped });
    }

    setFixing(false);
    toast.success(`תיקון הושלם: ${fixed} תוקנו, ${skipped} דולגו`);
    queryClient.invalidateQueries({ queryKey: ["content-health-report"] });
  }, [enriched, queryClient]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const exportCSV = () => {
    const bom = "\uFEFF";
    const header = "כותרת,רב,סדרה,חסר מדיה,חסר תוכן,חסר קובץ,ריק לחלוטין\n";
    const rows = filtered
      .map((l) =>
        [
          `"${l.title}"`,
          `"${(l.rabbis as any)?.name || ""}"`,
          `"${(l.series as any)?.title || ""}"`,
          l.hasMedia ? "לא" : "כן",
          l.hasContent ? "לא" : "כן",
          l.hasAttachment ? "לא" : "כן",
          l.gaps.includes("completely_empty") ? "כן" : "לא",
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-health-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-heading gradient-teal">בריאות תוכן</h1>
            <p className="text-muted-foreground mt-1">שיעורים מפורסמים עם תוכן חסר</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={bulkFixFromMigration}
              disabled={fixing || !stats?.completelyEmpty}
            >
              {fixing ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Wrench className="h-4 w-4 ml-2" />}
              תקן ריקים מנתוני מיגרציה ({stats?.completelyEmpty || 0})
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filtered.length}>
              <Download className="h-4 w-4 ml-2" />
              ייצוא CSV
            </Button>
          </div>
        </div>

        {/* Fix progress */}
        {fixing && (
          <div className="bg-card border rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>מתקן שיעורים ריקים...</span>
              <span>{fixProgress.done} / {fixProgress.total} ({fixProgress.fixed} תוקנו, {fixProgress.skipped} דולגו)</span>
            </div>
            <Progress value={(fixProgress.done / fixProgress.total) * 100} />
          </div>
        )}

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "סה״כ עם חוסרים", value: stats.total, color: "text-foreground", filterVal: "all" as const },
              { label: "ריקים לחלוטין", value: stats.completelyEmpty, color: "text-destructive", filterVal: "completely_empty" as const },
              { label: "חסר מדיה", value: stats.noMedia, color: "text-orange-500", filterVal: "no_media" as const },
              { label: "חסר תוכן", value: stats.noContent, color: "text-yellow-600", filterVal: "no_content" as const },
              { label: "חסר קובץ", value: stats.noAttachment, color: "text-muted-foreground", filterVal: "no_attachment" as const },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => { setFilter(s.filterVal); setPage(0); }}
                className={`bg-card rounded-lg border p-4 text-center transition-all hover:border-primary/50 ${filter === s.filterVal ? "ring-2 ring-primary border-primary" : ""}`}
              >
                <div className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Select value={filter} onValueChange={(v) => { setFilter(v as any); setPage(0); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="סינון לפי סוג חוסר" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              {Object.entries(GAP_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="חיפוש לפי כותרת / רב / סדרה..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-64"
          />
          <span className="text-sm text-muted-foreground self-center">
            {filtered.length.toLocaleString()} תוצאות
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">טוען נתונים...</div>
        ) : (
          <>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">כותרת</TableHead>
                    <TableHead className="text-right">רב</TableHead>
                    <TableHead className="text-right">סדרה</TableHead>
                    <TableHead className="text-center w-20">
                      <Video className="h-4 w-4 mx-auto" />
                    </TableHead>
                    <TableHead className="text-center w-20">
                      <Music className="h-4 w-4 mx-auto" />
                    </TableHead>
                    <TableHead className="text-center w-20">
                      <FileText className="h-4 w-4 mx-auto" />
                    </TableHead>
                    <TableHead className="text-center w-20">
                      <Paperclip className="h-4 w-4 mx-auto" />
                    </TableHead>
                    <TableHead className="text-center w-20">סטטוס</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((l) => (
                    <TableRow key={l.id} className={l.gaps.includes("completely_empty") ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium max-w-[200px] truncate">{l.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{(l.rabbis as any)?.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">{(l.series as any)?.title || "—"}</TableCell>
                      <TableCell className="text-center">{l.video_url ? "✅" : "❌"}</TableCell>
                      <TableCell className="text-center">{l.audio_url ? "✅" : "❌"}</TableCell>
                      <TableCell className="text-center">{l.hasContent ? "✅" : "❌"}</TableCell>
                      <TableCell className="text-center">{l.hasAttachment ? "✅" : "❌"}</TableCell>
                      <TableCell className="text-center">
                        {l.gaps.includes("completely_empty") ? (
                          <Badge variant="destructive" className="text-[10px]">ריק</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">חלקי</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <a href={`/lessons/${l.id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  הקודם
                </Button>
                <span className="text-sm text-muted-foreground">
                  עמוד {page + 1} מתוך {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  הבא
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
