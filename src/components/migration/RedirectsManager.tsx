import { useState, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRedirects, useDeleteRedirect, useImportRedirectsCsv } from "@/hooks/useRedirects";
import { REDIRECT_STATUS_LABELS, REDIRECT_PRIORITY_LABELS, type RedirectStatus, type RedirectPriority } from "@/types/migration";
import { AddRedirectDialog } from "./AddRedirectDialog";
import { Search, Plus, Upload, Download, Trash2, Pencil, Shield, FileText, Map, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "destructive",
  high: "default",
  normal: "secondary",
  low: "outline",
};

export function RedirectsManager() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editRedirect, setEditRedirect] = useState<any>(null);
  const [seedingCritical, setSeedingCritical] = useState(false);
  const [page, setPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useRedirects({ status: statusFilter, search, priority: priorityFilter, page, pageSize: 50 });
  const deleteRedirect = useDeleteRedirect();
  const importCsv = useImportRedirectsCsv();

  const redirects = data?.redirects;
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  const handleFilterChange = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setPage(1);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const count = await importCsv.mutateAsync(text);
      toast.success(`יובאו ${count} הפניות בהצלחה`);
    } catch (err: any) {
      toast.error(err.message || "שגיאה בייבוא");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleExportNginx = () => {
    if (!redirects?.length) return;
    const lines = redirects
      .filter((r) => r.status === "active")
      .map((r) => `rewrite ^${r.old_path}$ ${r.new_path || "/"} permanent;`);
    downloadText(lines.join("\n"), "redirects-nginx.conf", "text/plain");
  };

  const handleExportSitemap = () => {
    if (!redirects?.length) return;
    const baseUrl = "https://bneyzion.vercel.app";
    const urls = redirects
      .filter((r) => r.status === "active" && r.new_path)
      .map((r) => {
        const priority = r.priority === "critical" ? "1.0" : r.priority === "high" ? "0.8" : r.priority === "low" ? "0.4" : "0.6";
        return `  <url>\n    <loc>${baseUrl}${r.new_path}</loc>\n    <priority>${priority}</priority>\n    <changefreq>monthly</changefreq>\n  </url>`;
      });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
    downloadText(xml, "sitemap.xml", "application/xml");
  };

  const handleExportCsv = () => {
    if (!redirects?.length) return;
    const csv = "old_path,new_path,status,redirect_type,priority,meta_title,meta_description,hit_count\n" +
      redirects.map((r) =>
        `"${r.old_path}","${r.new_path}","${r.status}",${r.redirect_type},"${r.priority}","${r.meta_title || ""}","${r.meta_description || ""}",${r.hit_count}`
      ).join("\n");
    downloadText(csv, "redirects-export.csv", "text/csv");
  };

  const handleSeedCritical = async () => {
    setSeedingCritical(true);
    try {
      const { data, error } = await supabase.functions.invoke("migrate-content", {
        body: { action: "seed-critical-redirects" },
      });
      if (error) throw error;
      toast.success(`נוספו ${data?.added || 0} הפניות קריטיות`);
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהוספת הפניות קריטיות");
    } finally {
      setSeedingCritical(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Action bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי נתיב או כותרת..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pr-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="סטטוס" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            {Object.entries(REDIRECT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={handleFilterChange(setPriorityFilter)}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="עדיפות" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל העדיפויות</SelectItem>
            {Object.entries(REDIRECT_PRIORITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{total.toLocaleString()} הפניות</span>
      </div>

      {/* Buttons row */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="h-4 w-4 ml-1" />
          הוסף הפניה
        </Button>
        <Button variant="outline" size="sm" onClick={handleSeedCritical} disabled={seedingCritical}>
          <Shield className="h-4 w-4 ml-1" />
          {seedingCritical ? "מוסיף..." : "הפניות קריטיות"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4 ml-1" />
          ייבוא CSV
        </Button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!redirects?.length}>
          <Download className="h-4 w-4 ml-1" />
          ייצוא CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportNginx} disabled={!redirects?.length}>
          <FileText className="h-4 w-4 ml-1" />
          ייצוא Nginx
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportSitemap} disabled={!redirects?.length}>
          <Map className="h-4 w-4 ml-1" />
          ייצוא Sitemap
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">נתיב ישן</TableHead>
                <TableHead className="text-right">נתיב חדש</TableHead>
                <TableHead className="text-right">סוג</TableHead>
                <TableHead className="text-right">עדיפות</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">כותרת SEO</TableHead>
                <TableHead className="text-right">פגיעות</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">טוען...</TableCell>
                </TableRow>
              ) : !redirects?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">אין הפניות</TableCell>
                </TableRow>
              ) : (
                redirects.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate" dir="ltr">{r.old_path}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate" dir="ltr">{r.new_path || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.redirect_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={PRIORITY_COLORS[r.priority] as any || "secondary"}>
                        {REDIRECT_PRIORITY_LABELS[r.priority as RedirectPriority] || r.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "active" ? "default" : r.status === "broken" ? "destructive" : "outline"}>
                        {REDIRECT_STATUS_LABELS[r.status as RedirectStatus] || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      {r.meta_title ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs truncate block cursor-help">{r.meta_title}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[300px] text-right" dir="rtl">
                            <p className="font-semibold">{r.meta_title}</p>
                            {r.meta_description && <p className="text-xs mt-1 text-muted-foreground">{r.meta_description}</p>}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{r.hit_count}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditRedirect(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            if (confirm("למחוק הפניה זו?")) deleteRedirect.mutate(r.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TooltipProvider>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            עמוד {page} מתוך {totalPages} ({total.toLocaleString()} הפניות)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronRight className="h-4 w-4" />
              הקודם
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              הבא
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AddRedirectDialog open={showAdd} onOpenChange={setShowAdd} />
      {editRedirect && (
        <AddRedirectDialog
          open={!!editRedirect}
          onOpenChange={(v) => !v && setEditRedirect(null)}
          editData={editRedirect}
        />
      )}
    </div>
  );
}

function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
