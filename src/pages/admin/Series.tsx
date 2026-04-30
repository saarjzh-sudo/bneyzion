import { useState } from "react";
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
import { Plus, Search, Pencil, Trash2, Tag, GraduationCap, Users } from "lucide-react";
import { useSeries, useCreateSeries, useUpdateSeries, useDeleteSeries } from "@/hooks/useSeries";
import { useRabbis } from "@/hooks/useRabbis";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

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

type AudienceFilter = "all" | "teachers" | "general";

export default function SeriesPage() {
  const { data: seriesList, isLoading } = useSeries();
  const { data: rabbis } = useRabbis();
  const createSeries = useCreateSeries();
  const updateSeries = useUpdateSeries();
  const deleteSeries = useDeleteSeries();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", description: "", rabbi_id: "", parent_id: "",
    image_url: "", status: "draft",
    audience_tags: ["general"] as string[],
  });

  // Bulk-tag state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagging, setBulkTagging] = useState(false);

  const resetForm = () => {
    setForm({ title: "", description: "", rabbi_id: "", parent_id: "", image_url: "", status: "draft", audience_tags: ["general"] });
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
      toast({ title: `${selectedIds.size} סדרות תויגו כ"מורים"` });
      setSelectedIds(new Set());
    } catch (e: any) {
      toast({ title: "שגיאה בעדכון", description: e.message, variant: "destructive" });
    } finally {
      setBulkTagging(false);
    }
  };

  // Filtering: audience + search
  const filtered = (seriesList ?? []).filter((s: any) => {
    const matchSearch = s.title.includes(search);
    if (!matchSearch) return false;
    if (audienceFilter === "all") return true;
    const tags: string[] = s.audience_tags ?? ["general"];
    if (audienceFilter === "teachers") return tags.includes("teachers");
    if (audienceFilter === "general") return !tags.includes("teachers");
    return true;
  });

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

  const teachersCount = (seriesList ?? []).filter((s: any) =>
    (s.audience_tags ?? []).includes("teachers")
  ).length;

  return (
    <AdminLayout>
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
            <DialogContent className="max-w-lg" dir="rtl">
              <DialogHeader>
                <DialogTitle className="font-heading">{editing ? "עריכת סדרה" : "סדרה חדשה"}</DialogTitle>
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
                  <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v === "_none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="ללא — סדרה עליונה" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">ללא — סדרה עליונה</SelectItem>
                      {seriesList?.filter((s: any) => s.id !== editing?.id).map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>קישור תמונה</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
                <div>
                  <Label>סטטוס</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">טיוטה</SelectItem>
                      <SelectItem value="active">פעילה</SelectItem>
                      <SelectItem value="completed">הושלמה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                all: `הכל (${(seriesList ?? []).length})`,
                teachers: `מורים (${teachersCount})`,
                general: `כללי (${(seriesList ?? []).length - teachersCount})`,
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

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש סדרות..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                          <Badge variant={s.status === "active" ? "default" : "secondary"}>
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => { if (confirm("למחוק?")) deleteSeries.mutate(s.id); }}
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
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">אין סדרות</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
