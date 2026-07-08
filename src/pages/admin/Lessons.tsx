import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Search, Pencil, Trash2, Wand2, ImageOff, ExternalLink,
  CheckCircle, RotateCcw, Clock, MessageSquare,
} from "lucide-react";
import { useCreateLesson, useUpdateLesson, useDeleteLesson } from "@/hooks/useLessons";
import { RichTextEditor, type UploadedMedia } from "@/components/admin/RichTextEditor";
import { useRabbis } from "@/hooks/useRabbis";
import {
  useAdminLessonsPage, useAdminLessonCounts, useDebouncedValue,
  fetchLessonById, ADMIN_PAGE_SIZE, type AdminLessonStatus,
} from "@/hooks/useAdminContent";
import { SeriesCombobox } from "@/components/admin/SeriesCombobox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// ── status design tokens ─────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:          { label: "טיוטה",        bg: "bg-slate-100",   text: "text-slate-600",   dot: "#94A3B8" },
  pending_review: { label: "ממתין לאישור", bg: "bg-amber-50",    text: "text-amber-700",   dot: "#D97706" },
  published:      { label: "פורסם",        bg: "bg-emerald-50",  text: "text-emerald-700", dot: "#059669" },
  archived:       { label: "בארכיון",      bg: "bg-red-50",      text: "text-red-600",     dot: "#DC2626" },
};

// ── StatusBadge ──────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-display ${cfg.bg} ${cfg.text}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
};

// ── useApproveLesson ─────────────────────────────────────────────────
function useApproveLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, note, reviewerId }: {
      id: string;
      action: "approve" | "return";
      note?: string;
      reviewerId: string;
    }) => {
      const updates: Record<string, unknown> =
        action === "approve"
          ? { status: "published", reviewed_by: reviewerId, published_at: new Date().toISOString(), updated_at: new Date().toISOString() }
          : { status: "draft",     reviewed_by: reviewerId, review_note: note ?? null,              updated_at: new Date().toISOString() };
      const { error } = await supabase.from("lessons").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      qc.invalidateQueries({ queryKey: ["admin-lessons"] });
      qc.invalidateQueries({ queryKey: ["admin-lesson-counts"] });
    },
  });
}

// ── ReturnDialog ─────────────────────────────────────────────────────
const ReturnDialog = ({
  lesson,
  onReturn,
}: {
  lesson: any;
  onReturn: (id: string, note: string) => void;
}) => {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs font-display text-amber-700 hover:bg-amber-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          החזר ליוצר
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-right">החזרת תוכן ליוצר</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">"{lesson.title}"</p>
          <div>
            <Label>הערה ליוצר (אופציונלי)</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="מה צריך לתקן?"
              rows={3}
              dir="rtl"
              className="mt-1.5"
            />
          </div>
          <Button
            className="w-full font-display"
            variant="outline"
            onClick={() => { onReturn(lesson.id, note); setOpen(false); setNote(""); }}
          >
            <RotateCcw className="h-4 w-4 ml-1.5" />
            שלח חזרה ליוצר
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── main component ───────────────────────────────────────────────────
export default function Lessons() {
  const { user, isAdmin } = useAuth();
  const { data: rabbis } = useRabbis();
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();
  const approveLesson = useApproveLesson();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch]           = useState("");
  const [activeTab, setActiveTab]     = useState<AdminLessonStatus>("all");
  const [page, setPage]               = useState(1);
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  // חיפוש + סינון + דפדוף בצד השרת — הטבלה מכילה 23K+ שיעורים,
  // שליפת-הכל נחתכת בתקרת 1000 השורות של PostgREST (הבאג הישן).
  const debouncedSearch = useDebouncedValue(search, 350);
  const { data: lessonsPage, isLoading } = useAdminLessonsPage({
    search: debouncedSearch, status: activeTab, page,
  });
  const { data: counts } = useAdminLessonCounts();
  const lessons = lessonsPage?.rows;
  const total   = lessonsPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  const invalidateAdminLessons = () => {
    qc.invalidateQueries({ queryKey: ["admin-lessons"] });
    qc.invalidateQueries({ queryKey: ["admin-lesson-counts"] });
  };

  const [form, setForm] = useState({
    title: "", description: "", rabbi_id: "", series_id: "", video_url: "", audio_url: "",
    duration: "", source_type: "video", status: "draft", bible_book: "", bible_chapter: "", bible_verse: "",
    thumbnail_url: "", content: "", attachment_url: "",
  });

  const resetForm = () => {
    setForm({ title: "", description: "", rabbi_id: "", series_id: "", video_url: "", audio_url: "",
      duration: "", source_type: "video", status: "draft", bible_book: "", bible_chapter: "", bible_verse: "",
      thumbnail_url: "", content: "", attachment_url: "" });
    setEditingLesson(null);
  };

  const openEdit = async (row: any) => {
    // הרשימה לא נושאת content/קבצים — שולפים את השיעור המלא לפני עריכה,
    // אחרת שמירה הייתה דורסת את גוף המאמר בערך ריק.
    let lesson = row;
    try {
      lesson = await fetchLessonById(row.id);
    } catch (e: any) {
      toast({ title: "שגיאה בטעינת השיעור לעריכה", description: e?.message, variant: "destructive" });
      return;
    }
    setEditingLesson(lesson);
    setForm({
      title: lesson.title, description: lesson.description || "", rabbi_id: lesson.rabbi_id || "",
      series_id: lesson.series_id || "", video_url: lesson.video_url || "", audio_url: lesson.audio_url || "",
      duration: lesson.duration?.toString() || "", source_type: lesson.source_type, status: lesson.status,
      bible_book: lesson.bible_book || "", bible_chapter: lesson.bible_chapter?.toString() || "", bible_verse: lesson.bible_verse?.toString() || "",
      thumbnail_url: lesson.thumbnail_url || "",
      content: lesson.content || "", attachment_url: lesson.attachment_url || "",
    });
    setDialogOpen(true);
  };

  // חזרה לעמוד 1 בכל שינוי חיפוש/לשונית
  useEffect(() => { setPage(1); }, [debouncedSearch, activeTab]);

  // קובץ שנגרר לעורך התוכן → ממלא את שדה השיעור המתאים
  const handleEditorMedia = (media: UploadedMedia) => {
    if (media.kind === "audio") setForm(f => ({ ...f, audio_url: media.url }));
    else if (media.kind === "video") setForm(f => ({ ...f, video_url: media.url }));
    else setForm(f => ({ ...f, attachment_url: media.url }));
  };

  const generateImage = async () => {
    if (!form.title) return toast({ title: "יש להזין כותרת קודם", variant: "destructive" });
    setGeneratingImage(true);
    try {
      const res = await fetch("/api/generate-lesson-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, description: form.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בייצור תמונה");
      setForm(f => ({ ...f, thumbnail_url: data.url }));
      toast({ title: "התמונה נוצרה" });
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
      content: form.content || null,
      attachment_url: form.attachment_url || null,
    };
    try {
      if (editingLesson) {
        await updateLesson.mutateAsync({ id: editingLesson.id, ...payload });
        toast({ title: "השיעור עודכן" });
      } else {
        await createLesson.mutateAsync(payload);
        toast({ title: "השיעור נוצר" });
      }
      setDialogOpen(false);
      resetForm();
      invalidateAdminLessons();
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const handleApprove = async (lessonId: string) => {
    if (!user?.id) return;
    try {
      await approveLesson.mutateAsync({ id: lessonId, action: "approve", reviewerId: user.id });
      toast({ title: "השיעור פורסם" });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const handleReturn = async (lessonId: string, note: string) => {
    if (!user?.id) return;
    try {
      await approveLesson.mutateAsync({ id: lessonId, action: "return", note, reviewerId: user.id });
      toast({ title: "התוכן הוחזר ליוצר" });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  // ── counts (מדויקים, מה-DB — לא מהעמוד הנוכחי) ────────────────────
  const pendingCount = counts?.pending_review ?? 0;

  // הסינון והחיפוש נעשים בצד השרת — העמוד הנוכחי הוא כבר התוצאה
  const filtered = lessons;

  // ── tabs ──────────────────────────────────────────────────────────
  const TABS = [
    { id: "all",            label: "כל השיעורים", count: counts?.all },
    { id: "pending_review", label: "ממתין לאישור", count: pendingCount, highlight: pendingCount > 0 },
    { id: "draft",          label: "טיוטות",       count: counts?.draft },
    { id: "published",      label: "פורסמו",       count: counts?.published },
    { id: "archived",       label: "בארכיון",      count: counts?.archived },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* ── header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading gradient-teal">ניהול שיעורים</h1>
            <p className="text-muted-foreground mt-1">הוספה, עריכה ואישור שיעורים</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="font-display gap-1.5">
                <Plus className="h-4 w-4" />שיעור חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle className="font-heading">{editingLesson ? "עריכת שיעור" : "שיעור חדש"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>כותרת *</Label>
                    <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>תיאור</Label>
                    <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                  </div>

                  {/* content — עורך המאמר (רמה 11) */}
                  <div className="col-span-2 space-y-1.5">
                    <Label>תוכן המאמר</Label>
                    <RichTextEditor
                      value={form.content}
                      onChange={html => setForm(f => ({ ...f, content: html }))}
                      onMediaUploaded={handleEditorMedia}
                    />
                    <p className="text-xs text-muted-foreground">
                      גרירת תמונה — משתבצת בגוף המאמר · גרירת שמע / וידאו / PDF — מתחברת אוטומטית לשדות השיעור
                    </p>
                  </div>

                  {/* thumbnail */}
                  <div className="col-span-2 space-y-2">
                    <Label>תמונה ממוזערת</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.thumbnail_url}
                        onChange={e => setForm({ ...form, thumbnail_url: e.target.value })}
                        placeholder="https://... או לחץ על ״צור תמונה AI״"
                        className="flex-1 text-xs"
                        dir="ltr"
                      />
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={generateImage}
                        disabled={generatingImage || !form.title}
                        className="shrink-0 gap-1.5 font-display text-xs"
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        {generatingImage ? "מייצר..." : "צור AI"}
                      </Button>
                    </div>
                    {form.thumbnail_url ? (
                      <div className="relative rounded-lg overflow-hidden border border-border bg-muted h-32 w-full">
                        <img src={form.thumbnail_url} alt="thumbnail" className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <a href={form.thumbnail_url} target="_blank" rel="noopener noreferrer"
                          className="absolute top-2 left-2 bg-black/50 text-white rounded p-1 hover:bg-black/70">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <button type="button" onClick={() => setForm(f => ({ ...f, thumbnail_url: "" }))}
                          className="absolute top-2 right-2 bg-black/50 text-white rounded p-1 hover:bg-destructive text-xs leading-none">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border bg-muted/40 h-16 flex items-center justify-center gap-2 text-muted-foreground text-xs">
                        <ImageOff className="h-4 w-4" />אין תמונה
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>רב</Label>
                    <Select value={form.rabbi_id} onValueChange={v => setForm({ ...form, rabbi_id: v === "_none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="בחר רב" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">ללא רב</SelectItem>
                        {rabbis?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>סדרה</Label>
                    <SeriesCombobox
                      value={form.series_id}
                      onChange={id => setForm(f => ({ ...f, series_id: id }))}
                      placeholder="חפש ובחר סדרה"
                    />
                  </div>
                  <div>
                    <Label>סוג מקור</Label>
                    <Select value={form.source_type} onValueChange={v => setForm({ ...form, source_type: v })}>
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
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">טיוטה</SelectItem>
                        <SelectItem value="pending_review">ממתין לאישור</SelectItem>
                        <SelectItem value="published">פורסם</SelectItem>
                        <SelectItem value="archived">בארכיון</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>קישור וידאו</Label><Input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} /></div>
                  <div><Label>קישור אודיו</Label><Input value={form.audio_url} onChange={e => setForm({ ...form, audio_url: e.target.value })} /></div>
                  <div className="col-span-2"><Label>קובץ מצורף (PDF / Word)</Label><Input value={form.attachment_url} onChange={e => setForm({ ...form, attachment_url: e.target.value })} dir="ltr" placeholder="https://... או גררו קובץ לעורך למעלה" /></div>
                  <div><Label>משך (שניות)</Label><Input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} /></div>
                  <div><Label>ספר בתנ"ך</Label><Input value={form.bible_book} onChange={e => setForm({ ...form, bible_book: e.target.value })} /></div>
                  <div><Label>פרק</Label><Input type="number" value={form.bible_chapter} onChange={e => setForm({ ...form, bible_chapter: e.target.value })} /></div>
                  <div><Label>פסוק</Label><Input type="number" value={form.bible_verse} onChange={e => setForm({ ...form, bible_verse: e.target.value })} /></div>
                </div>
                <Button onClick={handleSubmit} disabled={!form.title || createLesson.isPending || updateLesson.isPending} className="font-display">
                  {editingLesson ? "עדכן" : "צור שיעור"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── pending review banner ────────────────────────────────── */}
        {isAdmin && pendingCount > 0 && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-display text-amber-800">
                {pendingCount === 1
                  ? "שיעור אחד ממתין לאישורך"
                  : `${pendingCount} שיעורים ממתינים לאישורך`
                }
              </p>
              <p className="text-xs text-amber-600 mt-0.5">לחץ על הטאב "ממתין לאישור" לצפייה</p>
            </div>
            <button
              onClick={() => setActiveTab("pending_review")}
              className="text-xs font-display px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
            >
              צפה עכשיו
            </button>
          </div>
        )}

        <Card>
          <CardHeader className="pb-0">
            {/* ── tabs ──────────────────────────────────────────── */}
            <div className="flex gap-1 border-b border-border pb-0 -mb-px overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className="flex items-center gap-1.5 px-4 py-3 text-sm font-display border-b-2 whitespace-nowrap transition-colors"
                  style={{
                    borderColor: activeTab === tab.id
                      ? (tab.id === "pending_review" ? "#D97706" : "hsl(var(--primary))")
                      : "transparent",
                    color: activeTab === tab.id
                      ? (tab.id === "pending_review" ? "#B45309" : "hsl(var(--primary))")
                      : "hsl(var(--muted-foreground))",
                  }}
                >
                  {tab.id === "pending_review" && <Clock className="h-3.5 w-3.5" />}
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className="rounded-full text-xs px-1.5 py-0.5 leading-none"
                      style={{
                        background: (tab as any).highlight ? "#FDE68A" : "hsl(var(--muted))",
                        color:      (tab as any).highlight ? "#92400E"  : "hsl(var(--muted-foreground))",
                        fontWeight: (tab as any).highlight ? 700 : 400,
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── search ────────────────────────────────────────── */}
            <div className="flex gap-3 pt-4 pb-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש שיעורים..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">טוען...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-12"></TableHead>
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
                    <TableRow
                      key={lesson.id}
                      className={lesson.status === "pending_review" ? "bg-amber-50/50" : ""}
                    >
                      <TableCell>
                        {lesson.thumbnail_url
                          ? <img src={lesson.thumbnail_url} alt="" className="w-10 h-7 rounded object-cover" />
                          : <div className="w-10 h-7 rounded bg-muted flex items-center justify-center">
                              <ImageOff className="h-3 w-3 text-muted-foreground" />
                            </div>
                        }
                      </TableCell>
                      <TableCell className="font-medium max-w-[260px]">
                        <div className="truncate">
                          {lesson.title}
                          {lesson.review_note && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <MessageSquare className="h-3 w-3 text-amber-600 shrink-0" />
                              <span className="text-xs text-amber-700 truncate max-w-[200px]">
                                {lesson.review_note}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{lesson.rabbis?.name || "—"}</TableCell>
                      <TableCell className="max-w-[120px] truncate">{lesson.series?.title || "—"}</TableCell>
                      <TableCell>{lesson.source_type}</TableCell>
                      <TableCell><StatusBadge status={lesson.status} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {isAdmin && lesson.status === "pending_review" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(lesson.id)}
                                disabled={approveLesson.isPending}
                                className="gap-1.5 text-xs font-display text-emerald-700 hover:bg-emerald-50"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                אשר ופרסם
                              </Button>
                              <ReturnDialog lesson={lesson} onReturn={handleReturn} />
                            </>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openEdit(lesson)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => {
                              if (!confirm(`למחוק לצמיתות את "${lesson.title}"?\nאם הכוונה רק להסתיר מהאתר — עדיף להעביר לארכיון (בעריכת השיעור).`)) return;
                              deleteLesson.mutate(lesson.id, {
                                onSuccess: invalidateAdminLessons,
                                onError: (e: any) => toast({
                                  title: "המחיקה נחסמה",
                                  description: /foreign key|violates/i.test(e?.message ?? "")
                                    ? "לשיעור יש קישורים במערכת (נושאים / היסטוריית צפייה). במקום מחיקה — העבירו לארכיון בעריכת השיעור."
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
                  ))}
                  {filtered?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        {activeTab === "pending_review"
                          ? "אין שיעורים ממתינים לאישור"
                          : "אין שיעורים התואמים את החיפוש"}
                      </TableCell>
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
    </AdminLayout>
  );
}
