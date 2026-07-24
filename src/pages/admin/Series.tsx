import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Pencil, Trash2, Tag, GraduationCap, Users, CheckCircle, RotateCcw, Clock, AlertCircle, ListTree, List as ListIcon, ChevronLeft, FolderOpen, Home } from "lucide-react";
import { useCreateSeries, useUpdateSeries, useDeleteSeries } from "@/hooks/useSeries";
import {
  useAdminSeriesPage, useAdminSeriesCounts, useDebouncedValue, useSeriesTreeLevel,
  ADMIN_PAGE_SIZE, type AdminSeriesTab, type AdminAudienceFilter, type SeriesTreeRow,
} from "@/hooks/useAdminContent";
import { SeriesCombobox } from "@/components/admin/SeriesCombobox";
import { useRabbis } from "@/hooks/useRabbis";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// ── Feature 6: status design tokens (mirrors Lessons.tsx) ──────────────────
const SERIES_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:          { label: "טיוטה",        bg: "bg-slate-100",   text: "text-slate-600",   dot: "#94A3B8" },
  pending_review: { label: "ממתין לאישור", bg: "bg-amber-50",    text: "text-amber-700",   dot: "#D97706" },
  active:         { label: "פעילה",        bg: "bg-emerald-50",  text: "text-emerald-700", dot: "#059669" },
  // published = ירושת מיגרציה, שקולה ל"פעילה" בכל שאילתות הצד הציבורי
  published:      { label: "פורסמה",       bg: "bg-emerald-50",  text: "text-emerald-700", dot: "#059669" },
  completed:      { label: "הושלמה",       bg: "bg-blue-50",     text: "text-blue-700",    dot: "#2563EB" },
  category:       { label: "קטגוריה",      bg: "bg-purple-50",   text: "text-purple-700",  dot: "#7C3AED" },
  archived:       { label: "בארכיון",      bg: "bg-red-50",      text: "text-red-600",     dot: "#DC2626" },
};

const SeriesStatusBadge = ({ status }: { status: string }) => {
  const cfg = SERIES_STATUS_CONFIG[status] ?? SERIES_STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-display ${cfg.bg} ${cfg.text}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
};

// ── ניווט-עץ (יואב 23.7 22:12: "לנווט כאילו בתוך עץ האתר, כמו באתר הישן") ──
function SeriesTreeBrowser({ path, onPathChange, onEdit }: {
  path: { id: string; title: string }[];
  onPathChange: (p: { id: string; title: string }[]) => void;
  onEdit: (s: SeriesTreeRow) => void;
}) {
  const current = path.length ? path[path.length - 1] : null;
  const { data: rows = [], isLoading } = useSeriesTreeLevel(current?.id ?? null);

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-1 text-sm">
        <button
          onClick={() => onPathChange([])}
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
            path.length === 0 ? "font-bold text-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Home className="h-3.5 w-3.5" />
          ראש העץ
        </button>
        {path.map((node, i) => (
          <span key={node.id} className="flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              onClick={() => onPathChange(path.slice(0, i + 1))}
              className={`px-2 py-1 rounded-md transition-colors max-w-[220px] truncate ${
                i === path.length - 1 ? "font-bold text-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {node.title}
            </button>
          </span>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center py-8 text-muted-foreground">טוען...</p>
      ) : rows.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">אין סדרות תחת הצומת הזה.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40">
              {r.hasChildren ? (
                <button
                  onClick={() => onPathChange([...path, { id: r.id, title: r.title }])}
                  className="flex items-center gap-2 flex-1 min-w-0 text-right"
                  title="פתיחת הצומת"
                >
                  <FolderOpen className="h-4 w-4 text-purple-600 shrink-0" />
                  <span className="font-medium truncate">{r.title}</span>
                  <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-4 shrink-0" />
                  <span className="font-medium truncate">{r.title}</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground w-32 truncate hidden md:block">{r.rabbis?.name || "—"}</span>
              <span className="text-xs text-muted-foreground w-16 hidden sm:block">{r.lesson_count ?? 0} שיעורים</span>
              <SeriesStatusBadge status={r.status} />
              <Button variant="ghost" size="icon" onClick={() => onEdit(r)} aria-label="עריכה">
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Feature 6: useApproveSeries mutation ────────────────────────────────────
function useApproveSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, action, note, reviewerId,
    }: {
      id: string;
      action: "approve" | "return";
      note?: string;
      reviewerId: string;
    }) => {
      // 🐛 תוקן 10.7.2026: לטבלת series אין עמודת updated_at (אומת מול
      // information_schema) — שליחתה גרמה ל-PGRST204 וכל אישור/החזרה נכשל.
      const updates: Record<string, unknown> =
        action === "approve"
          ? {
              status:      "active",
              reviewed_by: reviewerId,
              published_at: new Date().toISOString(),
            }
          : {
              status:      "draft",
              reviewed_by: reviewerId,
              review_note: note ?? null,
            };
      const { error } = await supabase.from("series").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["series"] });
      qc.invalidateQueries({ queryKey: ["admin-series"] });
      qc.invalidateQueries({ queryKey: ["admin-series-counts"] });
    },
  });
}

// ── Feature 6: ReturnSeriesDialog ───────────────────────────────────────────
const ReturnSeriesDialog = ({
  series,
  onReturn,
}: {
  series: any;
  onReturn: (id: string, note: string) => void;
}) => {
  const [note, setNote]   = useState("");
  const [open, setOpen]   = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-display text-amber-700 hover:bg-amber-50">
          <RotateCcw className="h-3.5 w-3.5" />
          החזר
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-right">החזרת סדרה ליוצר</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">"{series.title}"</p>
          <div>
            <Label>הערה ליוצר (אופציונלי)</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="מה צריך לתקן?" rows={3} dir="rtl" className="mt-1.5" />
          </div>
          <Button className="w-full font-display" variant="outline"
            onClick={() => { onReturn(series.id, note); setOpen(false); setNote(""); }}>
            <RotateCcw className="h-4 w-4 ml-1.5" />
            שלח חזרה ליוצר
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Available audience tags — extend here as needed
const AUDIENCE_TAG_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "general",  label: "כללי",          color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "teachers", label: "מורים",         color: "bg-olive-100 text-green-800 border-green-200" },
  { value: "youth",    label: "נוער",           color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "advanced", label: "מתקדמים",       color: "bg-amber-50 text-amber-800 border-amber-200" },
];

const TAG_COLORS: Record<string, string> = {
  general:  "bg-slate-100 text-slate-700",
  teachers: "bg-green-100 text-green-800",
  youth:    "bg-blue-100 text-blue-700",
  advanced: "bg-amber-100 text-amber-800",
};

const TAG_LABELS: Record<string, string> = {
  general:  "כללי",
  teachers: "מורים",
  youth:    "נוער",
  advanced: "מתקדמים",
};

type AudienceFilter = AdminAudienceFilter;

type SeriesTab = AdminSeriesTab;

// SeriesContent = הליבה בלי AdminLayout — מוטמעת גם ב"עריכת תוכן" (/admin/content).
export function SeriesContent() {
  const { user, isAdmin } = useAuth();
  const { data: rabbis } = useRabbis();
  const createSeries = useCreateSeries();
  const updateSeries = useUpdateSeries();
  const deleteSeries = useDeleteSeries();
  const approveSeries = useApproveSeries();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");
  const [activeTab, setActiveTab] = useState<SeriesTab>("all");
  const [page, setPage] = useState(1);
  // יואב 23.7 22:12: ניווט-עץ כמו באתר הישן — "רשימה" (ברירת-מחדל) / "עץ"
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");
  const [treePath, setTreePath] = useState<{ id: string; title: string }[]>([]);

  // חיפוש + סינון + דפדוף בצד השרת — יש 1,750+ סדרות ב-DB,
  // שליפת-הכל נחתכה בתקרת 1000 השורות של PostgREST (751 סדרות ותיקות נעלמו מהאדמין).
  const debouncedSearch = useDebouncedValue(search, 350);
  const { data: seriesPage, isLoading } = useAdminSeriesPage({
    search: debouncedSearch, tab: activeTab, audience: audienceFilter, page,
  });
  const { data: counts } = useAdminSeriesCounts();
  const seriesList = seriesPage?.rows;
  const total = seriesPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  const invalidateAdminSeries = () => {
    qc.invalidateQueries({ queryKey: ["admin-series"] });
    qc.invalidateQueries({ queryKey: ["admin-series-counts"] });
    qc.invalidateQueries({ queryKey: ["admin-series-picker"] });
  };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", description: "", rabbi_id: "", parent_id: "",
    image_url: "", status: "draft",
    audience_tags: ["general"] as string[],
    show_in_parasha: false,
  });

  // Bulk-tag state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagging, setBulkTagging] = useState(false);

  // Feature 6: pending count (מדויק מה-DB, לא מהעמוד הנוכחי)
  const pendingCount = counts?.pending_review ?? 0;

  // חזרה לעמוד 1 בכל שינוי חיפוש/לשונית/קהל
  useEffect(() => { setPage(1); }, [debouncedSearch, activeTab, audienceFilter]);

  // Feature 6: approve/return handlers
  const handleApprove = async (seriesId: string) => {
    if (!user?.id) return;
    try {
      await approveSeries.mutateAsync({ id: seriesId, action: "approve", reviewerId: user.id });
      toast({ title: "הסדרה פורסמה" });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const handleReturn = async (seriesId: string, note: string) => {
    if (!user?.id) return;
    try {
      await approveSeries.mutateAsync({ id: seriesId, action: "return", note, reviewerId: user.id });
      toast({ title: "הסדרה הוחזרה ליוצר" });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setForm({ title: "", description: "", rabbi_id: "", parent_id: "", image_url: "", status: "draft", audience_tags: ["general"], show_in_parasha: false });
    setEditing(null);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      title: s.title,
      description: s.description || "",
      rabbi_id: s.rabbi_id || "",
      parent_id: s.parent_id || "",
      image_url: s.image_url || "",
      status: s.status,
      audience_tags: (s.audience_tags as string[]) ?? ["general"],
      show_in_parasha: s.show_in_parasha === true,
    });
    setDialogOpen(true);
  };

  const toggleTag = (tag: string) => {
    setForm((prev) => {
      const has = prev.audience_tags.includes(tag);
      const next = has
        ? prev.audience_tags.filter((t) => t !== tag)
        : [...prev.audience_tags, tag];
      return { ...prev, audience_tags: next.length === 0 ? ["general"] : next };
    });
  };

  const handleSubmit = async () => {
    const payload = {
      title: form.title,
      description: form.description || null,
      rabbi_id: form.rabbi_id || null,
      parent_id: form.parent_id || null,
      image_url: form.image_url || null,
      status: form.status,
      audience_tags: form.audience_tags,
      show_in_parasha: form.show_in_parasha,
    };
    try {
      if (editing) {
        await updateSeries.mutateAsync({ id: editing.id, ...payload });
        toast({ title: "הסדרה עודכנה" });
      } else {
        await createSeries.mutateAsync(payload);
        toast({ title: "הסדרה נוצרה" });
      }
      setDialogOpen(false);
      resetForm();
      invalidateAdminSeries();
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  // Bulk tag: add "teachers" to all selected series
  const handleBulkTeachers = async () => {
    if (selectedIds.size === 0) return;
    setBulkTagging(true);
    try {
      // For each selected series, merge "teachers" into existing tags
      const toUpdate = (seriesList ?? []).filter((s) => selectedIds.has(s.id));
      for (const s of toUpdate) {
        const existing: string[] = s.audience_tags ?? ["general"];
        if (!existing.includes("teachers")) {
          const merged = [...existing, "teachers"];
          await supabase.from("series").update({ audience_tags: merged }).eq("id", s.id);
        }
      }
      await qc.invalidateQueries({ queryKey: ["series"] });
      invalidateAdminSeries();
      toast({ title: `${selectedIds.size} סדרות תויגו כ"מורים"` });
      setSelectedIds(new Set());
    } catch (e: any) {
      toast({ title: "שגיאה בעדכון", description: e.message, variant: "destructive" });
    } finally {
      setBulkTagging(false);
    }
  };

  // הסינון (קהל/סטטוס/חיפוש) נעשה בצד השרת — העמוד הנוכחי הוא כבר התוצאה
  const filtered = seriesList ?? [];

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s: any) => s.id)));
    }
  };

  const teachersCount = counts?.teachers ?? 0;

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading gradient-teal">ניהול סדרות</h1>
            <p className="text-muted-foreground mt-1">
              הוספה ועריכה של סדרות שיעורים · תיוג קהל יעד
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="font-display"><Plus className="h-4 w-4 ml-1" />סדרה חדשה</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle className="font-heading flex items-center gap-3">
                  {editing ? "עריכת סדרה" : "סדרה חדשה"}
                  {/* יואב 19.7: קישור מהעריכה אל העמוד החי — לראות מה עוד צריך לערוך */}
                  {editing && (
                    <a
                      href={`/series/${editing.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-normal text-primary hover:underline"
                    >
                      צפייה בדף הסדרה באתר ↗
                    </a>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div><Label>כותרת *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>תיאור</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <div>
                  <Label>רב</Label>
                  <Select value={form.rabbi_id} onValueChange={(v) => setForm({ ...form, rabbi_id: v })}>
                    <SelectTrigger><SelectValue placeholder="בחר רב" /></SelectTrigger>
                    <SelectContent>{rabbis?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>סדרת אב (היררכיה)</Label>
                  <SeriesCombobox
                    value={form.parent_id}
                    onChange={id => setForm(f => ({ ...f, parent_id: id }))}
                    includeCategories
                    excludeId={editing?.id}
                    placeholder="ללא — סדרה עליונה"
                    clearLabel="ללא — סדרה עליונה"
                  />
                </div>
                <div><Label>קישור תמונה</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
                <div>
                  <Label>סטטוס</Label>
                  {/* Feature 6: non-admin sees only draft/pending_review */}
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">טיוטה</SelectItem>
                      {!isAdmin && (
                        <SelectItem value="pending_review">שלח לאישור</SelectItem>
                      )}
                      {isAdmin && <SelectItem value="active">פעילה</SelectItem>}
                      {isAdmin && <SelectItem value="completed">הושלמה</SelectItem>}
                      {isAdmin && <SelectItem value="archived">בארכיון (מוסתר מהאתר)</SelectItem>}
                      {/* סטטוסים ירושת-מיגרציה — מוצגים רק אם זה הסטטוס הנוכחי של הסדרה,
                          כדי שעריכת סדרה "פורסמה"/"קטגוריה" לא תציג שדה ריק ולא תשנה סטטוס בטעות */}
                      {editing?.status === "published" && <SelectItem value="published">פורסמה (ירושת מיגרציה)</SelectItem>}
                      {editing?.status === "category" && <SelectItem value="category">קטגוריה (צומת עץ הניווט)</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                {/* יואב 21.7 (Y6): סדרה קבועה בפינת פרשת השבוע — בשליטת יואב */}
                {isAdmin && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3">
                    <Checkbox
                      id="show-in-parasha"
                      checked={form.show_in_parasha}
                      onCheckedChange={(v) => setForm({ ...form, show_in_parasha: v === true })}
                    />
                    <div>
                      <Label htmlFor="show-in-parasha" className="cursor-pointer">מופיעה תמיד בפינת פרשת השבוע</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        בכל שבוע יוצג מתוכה המאמר של הפרשה הנוכחית (לפי שם הפרשה בכותרת השיעור).
                      </p>
                    </div>
                  </div>
                )}

                {/* Audience tags multi-select */}
                <div>
                  <Label className="flex items-center gap-1.5 mb-2">
                    <Tag className="h-3.5 w-3.5" />
                    קהל יעד
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {AUDIENCE_TAG_OPTIONS.map((opt) => {
                      const active = form.audience_tags.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleTag(opt.value)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                            active
                              ? opt.color + " ring-2 ring-offset-1 ring-current"
                              : "bg-gray-50 text-gray-400 border-gray-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    ניתן לבחור כמה תגיות. ברירת מחדל: "כללי".
                  </p>
                </div>

                <Button onClick={handleSubmit} disabled={!form.title} className="font-display">
                  {editing ? "עדכן" : "צור סדרה"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Audience filter bar + bulk action */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter tabs */}
          <div className="flex items-center rounded-lg border bg-card overflow-hidden">
            {(["all", "teachers", "general"] as AudienceFilter[]).map((f) => {
              const labels: Record<AudienceFilter, string> = {
                all: `הכל (${counts?.all ?? "…"})`,
                teachers: `מורים (${teachersCount})`,
                general: `כללי (${counts?.general ?? "…"})`,
              };
              const icons: Record<AudienceFilter, React.ReactNode> = {
                all: <Users className="h-3.5 w-3.5" />,
                teachers: <GraduationCap className="h-3.5 w-3.5" />,
                general: null,
              };
              return (
                <button
                  key={f}
                  onClick={() => setAudienceFilter(f)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                    audienceFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {icons[f]}
                  {labels[f]}
                </button>
              );
            })}
          </div>

          {/* Bulk-tag button (visible only when rows selected) */}
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkTeachers}
              disabled={bulkTagging}
              className="gap-1.5 border-green-300 text-green-800 hover:bg-green-50"
            >
              <GraduationCap className="h-4 w-4" />
              תייג {selectedIds.size} כ"מורים"
            </Button>
          )}
        </div>

        {/* Feature 6: Pending review banner (admin only) */}
        {isAdmin && pendingCount > 0 && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
          >
            <AlertCircle className="h-5 w-5 shrink-0" style={{ color: "#D97706" }} />
            <p className="text-sm font-display" style={{ color: "#92400E" }}>
              {pendingCount} סדרות ממתינות לאישור
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("pending_review")}
              className="mr-auto text-xs font-display underline"
              style={{ color: "#92400E" }}
            >
              הצג
            </button>
          </div>
        )}

        {/* Feature 6: Status tabs — כולל קטגוריות/ארכיון בנפרד, שלא יציפו את רשימת העבודה */}
        <div className="flex items-center rounded-lg border bg-card overflow-x-auto w-fit max-w-full">
          {([
            { id: "all",            label: `הכל (${counts?.all ?? "…"})` },
            { id: "pending_review", label: `ממתין (${pendingCount})`, highlight: pendingCount > 0 },
            { id: "active",         label: `פעילות (${counts?.active ?? "…"})` },
            { id: "published",      label: `פורסמו (${counts?.published ?? "…"})` },
            { id: "draft",          label: `טיוטות (${counts?.draft ?? "…"})` },
            { id: "category",       label: `קטגוריות-עץ (${counts?.category ?? "…"})` },
            { id: "archived",       label: `ארכיון (${counts?.archived ?? "…"})` },
          ] as { id: SeriesTab; label: string; highlight?: boolean }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : tab.highlight
                    ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                    : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.id === "pending_review" && <Clock className="h-3.5 w-3.5" />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש לפי שם סדרה או שם רב..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
              {/* יואב 23.7 22:12: מצב עץ — ניווט בסדרות כמו בעץ האתר */}
              <div className="flex items-center rounded-lg border overflow-hidden shrink-0">
                {([
                  { id: "list", label: "רשימה", Icon: ListIcon },
                  { id: "tree", label: "עץ", Icon: ListTree },
                ] as const).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setViewMode(id)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                      viewMode === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === "tree" ? (
              <SeriesTreeBrowser
                path={treePath}
                onPathChange={setTreePath}
                onEdit={openEdit}
              />
            ) : isLoading ? (
              <p className="text-center py-8 text-muted-foreground">טוען...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-right">
                      <Checkbox
                        checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-right">כותרת</TableHead>
                    <TableHead className="text-right">ממוקמת תחת</TableHead>
                    <TableHead className="text-right">רב</TableHead>
                    <TableHead className="text-right">שיעורים</TableHead>
                    <TableHead className="text-right">קהל יעד</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s: any) => {
                    const tags: string[] = s.audience_tags ?? ["general"];
                    return (
                      <TableRow key={s.id} className={selectedIds.has(s.id) ? "bg-muted/40" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(s.id)}
                            onCheckedChange={() => toggleSelectRow(s.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{s.title}</TableCell>
                        <TableCell className="max-w-[140px] truncate text-muted-foreground">{s.parent?.title || "—"}</TableCell>
                        <TableCell>{s.rabbis?.name || "—"}</TableCell>
                        <TableCell>{s.lesson_count}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TAG_COLORS[tag] ?? "bg-gray-100 text-gray-600"}`}
                              >
                                {TAG_LABELS[tag] ?? tag}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <SeriesStatusBadge status={s.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 items-center">
                            {/* Feature 6: approve/return for pending_review */}
                            {isAdmin && s.status === "pending_review" && (
                              <>
                                <Button
                                  variant="ghost" size="sm"
                                  className="gap-1.5 text-xs font-display text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => handleApprove(s.id)}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  אשר
                                </Button>
                                <ReturnSeriesDialog series={s} onReturn={handleReturn} />
                              </>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => {
                                if ((s.lesson_count ?? 0) > 0) {
                                  toast({
                                    title: "לא ניתן למחוק סדרה עם שיעורים",
                                    description: `בסדרה "${s.title}" יש ${s.lesson_count} שיעורים. כדי להסתיר אותה מהאתר — העבירו לסטטוס "בארכיון" בעריכה.`,
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                if (!confirm(`למחוק לצמיתות את הסדרה "${s.title}"?`)) return;
                                deleteSeries.mutate(s.id, {
                                  onSuccess: invalidateAdminSeries,
                                  onError: (e: any) => toast({
                                    title: "המחיקה נחסמה",
                                    description: /foreign key|violates/i.test(e?.message ?? "")
                                      ? "לסדרה יש קישורים במערכת (תתי-סדרות / הקדשות / הרשמות). במקום מחיקה — העבירו לארכיון בעריכה."
                                      : e?.message,
                                    variant: "destructive",
                                  }),
                                });
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">אין סדרות</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {/* ── pagination ─────────────────────────────────────── */}
            {total > ADMIN_PAGE_SIZE && (
              <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                <p className="text-xs text-muted-foreground">
                  מציג {(page - 1) * ADMIN_PAGE_SIZE + 1}–{Math.min(page * ADMIN_PAGE_SIZE, total)} מתוך {total.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="font-display"
                    disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    הקודם
                  </Button>
                  <span className="text-xs text-muted-foreground">עמוד {page} מתוך {totalPages.toLocaleString()}</span>
                  <Button variant="outline" size="sm" className="font-display"
                    disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    הבא
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}

// עמוד עצמאי — /admin/series (העטיפה היחידה שמוסיפה AdminLayout)
export default function SeriesPage() {
  return (
    <AdminLayout>
      <SeriesContent />
    </AdminLayout>
  );
}
