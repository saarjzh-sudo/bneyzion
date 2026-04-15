import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Wand2, ImageOff, ExternalLink } from "lucide-react";
import { useLessons, useCreateLesson, useUpdateLesson, useDeleteLesson } from "@/hooks/useLessons";
import { useRabbis } from "@/hooks/useRabbis";
import { useSeries } from "@/hooks/useSeries";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-primary/10 text-primary",
  archived: "bg-destructive/10 text-destructive",
};

export default function Lessons() {
  const { data: lessons, isLoading } = useLessons();
  const { data: rabbis } = useRabbis();
  const { data: seriesList } = useSeries();
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  const [form, setForm] = useState({
    title: "", description: "", rabbi_id: "", series_id: "", video_url: "", audio_url: "",
    duration: "", source_type: "video", status: "draft", bible_book: "", bible_chapter: "", bible_verse: "",
    thumbnail_url: "",
  });
  const [generatingImage, setGeneratingImage] = useState(false);

  const resetForm = () => {
    setForm({ title: "", description: "", rabbi_id: "", series_id: "", video_url: "", audio_url: "", duration: "", source_type: "video", status: "draft", bible_book: "", bible_chapter: "", bible_verse: "", thumbnail_url: "" });
    setEditingLesson(null);
  };

  const openEdit = (lesson: any) => {
    setEditingLesson(lesson);
    setForm({
      title: lesson.title, description: lesson.description || "", rabbi_id: lesson.rabbi_id || "",
      series_id: lesson.series_id || "", video_url: lesson.video_url || "", audio_url: lesson.audio_url || "",
      duration: lesson.duration?.toString() || "", source_type: lesson.source_type, status: lesson.status,
      bible_book: lesson.bible_book || "", bible_chapter: lesson.bible_chapter?.toString() || "", bible_verse: lesson.bible_verse?.toString() || "",
      thumbnail_url: lesson.thumbnail_url || "",
    });
    setDialogOpen(true);
  };

  const generateImage = async () => {
    if (!form.title) return toast({ title: "יש להזין כותרת קודם", variant: "destructive" });
    setGeneratingImage(true);
    try {
      const res = await fetch("/api/generate-lesson-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, description: form.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בייצור תמונה");
      setForm(f => ({ ...f, thumbnail_url: data.url }));
      toast({ title: "התמונה נוצרה בהצלחה ✨" });
    } catch (e: any) {
      toast({ title: "שגיאה בייצור תמונה", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSubmit = async () => {
    const payload: any = {
      title: form.title, description: form.description || null,
      rabbi_id: form.rabbi_id || null, series_id: form.series_id || null,
      video_url: form.video_url || null, audio_url: form.audio_url || null,
      duration: form.duration ? parseInt(form.duration) : null,
      source_type: form.source_type, status: form.status,
      bible_book: form.bible_book || null,
      bible_chapter: form.bible_chapter ? parseInt(form.bible_chapter) : null,
      bible_verse: form.bible_verse ? parseInt(form.bible_verse) : null,
      thumbnail_url: form.thumbnail_url || null,
    };
    try {
      if (editingLesson) {
        await updateLesson.mutateAsync({ id: editingLesson.id, ...payload });
        toast({ title: "השיעור עודכן בהצלחה" });
      } else {
        await createLesson.mutateAsync(payload);
        toast({ title: "השיעור נוצר בהצלחה" });
      }
      setDialogOpen(false);
      resetForm();
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const filtered = lessons?.filter((l: any) => {
    const matchSearch = l.title.includes(search) || l.description?.includes(search);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading gradient-teal">ניהול שיעורים</h1>
            <p className="text-muted-foreground mt-1">הוספה, עריכה ומחיקה של שיעורים</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="font-display"><Plus className="h-4 w-4 ml-1" />שיעור חדש</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle className="font-heading">{editingLesson ? "עריכת שיעור" : "שיעור חדש"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>כותרת *</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>תיאור</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                  </div>

                  {/* ── Thumbnail ──────────────────────────────────────── */}
                  <div className="col-span-2 space-y-2">
                    <Label>תמונה ממוזערת (thumbnail)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.thumbnail_url}
                        onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                        placeholder="https://... או לחץ על ״צור תמונה AI״"
                        className="flex-1 text-xs"
                        dir="ltr"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateImage}
                        disabled={generatingImage || !form.title}
                        className="shrink-0 gap-1.5 font-display text-xs"
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        {generatingImage ? "מייצר..." : "צור תמונה AI"}
                      </Button>
                    </div>

                    {/* Preview */}
                    {form.thumbnail_url ? (
                      <div className="relative rounded-lg overflow-hidden border border-border bg-muted h-32 w-full">
                        <img
                          src={form.thumbnail_url}
                          alt="thumbnail preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <a
                          href={form.thumbnail_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-2 left-2 bg-black/50 text-white rounded p-1 hover:bg-black/70 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, thumbnail_url: "" }))}
                          className="absolute top-2 right-2 bg-black/50 text-white rounded p-1 hover:bg-destructive transition-colors text-xs leading-none"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border bg-muted/40 h-16 flex items-center justify-center gap-2 text-muted-foreground text-xs">
                        <ImageOff className="h-4 w-4" />
                        אין תמונה — הכנס URL או לחץ ״צור תמונה AI״
                      </div>
                    )}
                  </div>
                  {/* ────────────────────────────────────────────────────── */}

                  <div>
                    <Label>רב</Label>
                    <Select value={form.rabbi_id} onValueChange={(v) => setForm({ ...form, rabbi_id: v })}>
                      <SelectTrigger><SelectValue placeholder="בחר רב" /></SelectTrigger>
                      <SelectContent>{rabbis?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>סדרה</Label>
                    <Select value={form.series_id} onValueChange={(v) => setForm({ ...form, series_id: v })}>
                      <SelectTrigger><SelectValue placeholder="בחר סדרה" /></SelectTrigger>
                      <SelectContent>{seriesList?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>סוג מקור</Label>
                    <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">וידאו</SelectItem>
                        <SelectItem value="audio">אודיו</SelectItem>
                        <SelectItem value="text">טקסט</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>סטטוס</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">טיוטה</SelectItem>
                        <SelectItem value="published">פורסם</SelectItem>
                        <SelectItem value="archived">בארכיון</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>קישור וידאו</Label><Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></div>
                  <div><Label>קישור אודיו</Label><Input value={form.audio_url} onChange={(e) => setForm({ ...form, audio_url: e.target.value })} /></div>
                  <div><Label>משך (שניות)</Label><Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
                  <div><Label>ספר בתנ"ך</Label><Input value={form.bible_book} onChange={(e) => setForm({ ...form, bible_book: e.target.value })} /></div>
                  <div><Label>פרק</Label><Input type="number" value={form.bible_chapter} onChange={(e) => setForm({ ...form, bible_chapter: e.target.value })} /></div>
                  <div><Label>פסוק</Label><Input type="number" value={form.bible_verse} onChange={(e) => setForm({ ...form, bible_verse: e.target.value })} /></div>
                </div>
                <Button onClick={handleSubmit} disabled={!form.title || createLesson.isPending || updateLesson.isPending} className="font-display">
                  {editingLesson ? "עדכן" : "צור שיעור"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="חיפוש שיעורים..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="draft">טיוטה</SelectItem>
                  <SelectItem value="published">פורסם</SelectItem>
                  <SelectItem value="archived">בארכיון</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-center py-8 text-muted-foreground">טוען...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-12">🖼</TableHead>
                    <TableHead className="text-right">כותרת</TableHead>
                    <TableHead className="text-right">רב</TableHead>
                    <TableHead className="text-right">סדרה</TableHead>
                    <TableHead className="text-right">סוג</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.map((lesson: any) => (
                    <TableRow key={lesson.id}>
                      <TableCell>
                        {lesson.thumbnail_url
                          ? <img src={lesson.thumbnail_url} alt="" className="w-10 h-7 rounded object-cover" />
                          : <div className="w-10 h-7 rounded bg-muted flex items-center justify-center"><ImageOff className="h-3 w-3 text-muted-foreground" /></div>
                        }
                      </TableCell>
                      <TableCell className="font-medium">{lesson.title}</TableCell>
                      <TableCell>{lesson.rabbis?.name || "—"}</TableCell>
                      <TableCell>{lesson.series?.title || "—"}</TableCell>
                      <TableCell>{lesson.source_type}</TableCell>
                      <TableCell><Badge className={statusColors[lesson.status]}>{lesson.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(lesson)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("למחוק?")) deleteLesson.mutate(lesson.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered?.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">אין שיעורים</TableCell></TableRow>
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
