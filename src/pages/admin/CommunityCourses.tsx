import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ImageUpload } from "@/components/admin/ImageUpload";
// רמה 18 (יואב 14.7): עורך ויזואלי לתוכן השיעור — לא HTML גולמי
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, BookOpen, ChevronRight, GripVertical,
  Eye, EyeOff, Video, Headphones, Paperclip, GraduationCap,
  Users, BarChart3, ArrowRight, Sparkles, FileText, Star,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Course = Tables<"community_courses">;
type Lesson = Tables<"community_course_lessons">;

/* ── Stats Card ─────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string | number; accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent || "bg-primary/10 text-primary"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/* ── Course Form ────────────────────────────────────────── */
function CourseForm({ course, onSave, onCancel, isPending }: {
  course?: Course;
  onSave: (data: Partial<Course>) => void;
  onCancel: () => void;
  isPending?: boolean;
}) {
  const [title, setTitle] = useState(course?.title || "");
  const [description, setDescription] = useState(course?.description || "");
  const [imageUrl, setImageUrl] = useState(course?.image_url || "");
  // יואב 14.7: עריכת קורס ברמת החנות — מחיר, רב-יוצר וסטטוס באותו טופס
  const [price, setPrice] = useState(course?.price != null ? String(course.price) : "0");
  const [rabbiId, setRabbiId] = useState(course?.rabbi_id || "");
  const [status, setStatus] = useState(course?.status || "active");
  const [salesContent, setSalesContent] = useState((course as any)?.sales_content || "");

  const { data: rabbis = [] } = useQuery({
    queryKey: ["admin-rabbis-for-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rabbis").select("id, name").eq("status", "active").order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">כותרת הקורס <span className="text-destructive">*</span></label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="לדוגמה: יסודות האמונה" className="h-11" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">תיאור</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="כמה מילים שמופיעות על כרטיס הקורס, למשל: לימוד ספר דניאל באופן יסודי, פרק אחרי פרק" rows={3} className="resize-none" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">טקסט דף המכירה</label>
        <Textarea value={salesContent} onChange={(e) => setSalesContent(e.target.value)} placeholder="דברי ההסבר שמופיעים בדף המכירה של הקורס — למה ללמוד, מה מיוחד, למי זה מתאים. אפשר כמה פסקאות." rows={6} />
        <p className="text-xs text-muted-foreground">מוצג למי שעוד לא רכש, תחת "על הקורס". אם ריק — נלקח אוטומטית מטקסט ההקדמה.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">מחיר (₪)</label>
          <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="h-11" />
          <p className="text-xs text-muted-foreground">מחיר גדול מ-0 מציג כפתור רכישה בעמוד הקורס ובקטלוג. 0 = לא נמכר בנפרד.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">הרב המלמד</label>
          <select
            value={rabbiId}
            onChange={(e) => setRabbiId(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">הרב יואב אוריאל (ברירת מחדל)</option>
            {rabbis.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">מוצג על הכרטיס: "מאת {rabbis.find((r: any) => r.id === rabbiId)?.name || "הרב יואב אוריאל"}"</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">סטטוס</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="active">פעיל — מוצג בקטלוג</option>
            <option value="draft">טיוטה — מוסתר</option>
            <option value="archived">בארכיון — מוסתר (שחזור = החזרה לפעיל)</option>
          </select>
        </div>
      </div>
      {/* יואב 14.7: העלאת תמונה כמו בחנות — לא שדה קישור */}
      <ImageUpload value={imageUrl} onChange={setImageUrl} folder="courses" label="תמונת כיסוי" />
      <Separator />
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} className="min-w-[80px]">ביטול</Button>
        <Button
          onClick={() => onSave({
            title, description, image_url: imageUrl || null,
            price: Number(price) || 0,
            rabbi_id: rabbiId || null,
            status,
            sales_content: salesContent || null,
          } as any)}
          disabled={!title.trim() || isPending}
          className="min-w-[100px]"
        >
          {isPending ? <span className="animate-pulse">שומר...</span> : course ? "שמור שינויים" : "צור קורס"}
        </Button>
      </div>
    </div>
  );
}

/* ── Lesson Form ────────────────────────────────────────── */
function LessonForm({ lesson, courseId, nextNumber, onSave, onCancel, isPending }: {
  lesson?: Lesson;
  courseId: string;
  nextNumber: number;
  onSave: (data: Partial<Lesson>) => void;
  onCancel: () => void;
  isPending?: boolean;
}) {
  const [title, setTitle] = useState(lesson?.title || "");
  const [description, setDescription] = useState(lesson?.description || "");
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url || "");
  const [audioUrl, setAudioUrl] = useState(lesson?.audio_url || "");
  const [attachmentUrl, setAttachmentUrl] = useState(lesson?.attachment_url || "");
  const [contentHtml, setContentHtml] = useState(lesson?.content_html || "");
  const [lessonNumber, setLessonNumber] = useState(lesson?.lesson_number ?? nextNumber);
  // סער 14.7: שיוך לפרק ולשכבה — כך השיעור מסתדר במבנה שהלומד רואה
  const [bibleChapter, setBibleChapter] = useState((lesson as any)?.bible_chapter != null ? String((lesson as any).bible_chapter) : "");
  const [layerType, setLayerType] = useState((lesson as any)?.layer_type || "base");

  return (
    <div className="space-y-5">
      {/* Basic info */}
      <div className="grid grid-cols-[1fr_100px] gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">כותרת השיעור <span className="text-destructive">*</span></label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="שם השיעור" className="h-11" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">מספר</label>
          <Input type="number" value={lessonNumber} onChange={(e) => setLessonNumber(Number(e.target.value))} className="h-11 text-center" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">תיאור</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="תיאור קצר של השיעור" rows={2} className="resize-none" />
      </div>

      {/* שיוך במבנה הקורס: פרק + שכבה */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">פרק</label>
          <Input type="number" min="0" value={bibleChapter} onChange={(e) => setBibleChapter(e.target.value)} placeholder="ריק = כללי/הקדמה" className="h-11" />
          <p className="text-xs text-muted-foreground">קובע תחת איזה פרק החומר מופיע ללומד.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">שכבה</label>
          <select
            value={layerType}
            onChange={(e) => setLayerType(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="base">תכני הבסיס</option>
            <option value="enrichment">הרחבה</option>
            <option value="weekly">השיעור והסיכום</option>
            <option value="intro">הקדמה</option>
            <option value="resources">תכנים נוספים</option>
          </select>
        </div>
      </div>

      {/* Media section */}
      <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> מדיה וקבצים
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Video className="h-3 w-3" /> וידאו</label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." dir="ltr" className="h-9 text-xs font-mono" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Headphones className="h-3 w-3" /> אודיו</label>
            <Input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://..." dir="ltr" className="h-9 text-xs font-mono" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1"><Paperclip className="h-3 w-3" /> קובץ מצורף</label>
          <Input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="https://..." dir="ltr" className="h-9 text-xs font-mono" />
        </div>
      </div>

      {/* Content — רמה 18 (יואב 14.7): עורך ויזואלי במקום HTML גולמי */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5"><FileText className="h-4 w-4" /> תוכן השיעור</label>
        <RichTextEditor
          value={contentHtml}
          onChange={setContentHtml}
          placeholder="תוכן כתוב של השיעור — טקסט, כותרות, רשימות ותמונות"
          minHeight={160}
        />
      </div>

      <Separator />
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} className="min-w-[80px]">ביטול</Button>
        <Button onClick={() => onSave({
          title, description, video_url: videoUrl || null, audio_url: audioUrl || null,
          attachment_url: attachmentUrl || null, content_html: contentHtml || null,
          lesson_number: lessonNumber, course_id: courseId,
          bible_chapter: bibleChapter !== "" ? Number(bibleChapter) : null,
          layer_type: layerType,
        } as any)} disabled={!title.trim() || isPending} className="min-w-[100px]">
          {isPending ? <span className="animate-pulse">שומר...</span> : lesson ? "שמור שינויים" : "הוסף שיעור"}
        </Button>
      </div>
    </div>
  );
}

/* ── Media Indicator Dot ────────────────────────────────── */
function MediaDot({ has, icon: Icon, label }: { has: boolean; icon: React.ElementType; label: string }) {
  if (!has) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-3 w-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

/* ── Main Component ─────────────────────────────────────── */
export default function CommunityCourses() {
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | undefined>();
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>();

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["admin-community-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("community_courses").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["admin-community-lessons", selectedCourse?.id],
    enabled: !!selectedCourse,
    queryFn: async () => {
      const { data, error } = await supabase.from("community_course_lessons").select("*").eq("course_id", selectedCourse!.id).order("lesson_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // ── Mutations ──
  const upsertCourse = useMutation({
    mutationFn: async (data: Partial<Course> & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from("community_courses").update(data).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("community_courses").insert({
          title: data.title!, description: data.description, image_url: data.image_url,
          price: data.price ?? 0, rabbi_id: data.rabbi_id ?? null, status: data.status ?? "active",
          sales_content: (data as any).sales_content ?? null,
          sort_order: courses.length,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-community-courses"] });
      setCourseDialogOpen(false);
      setEditingCourse(undefined);
      toast.success("הקורס נשמר בהצלחה");
    },
    onError: (e) => toast.error("שגיאה: " + e.message),
  });

  const deleteCourse = useMutation({
    // מחיקה אמיתית נחסמת ב-FK כשיש לקורס שיעורים/מפגשים/נרשמים (אותה מלכודת
    // כמו מחיקת-רב, 16.5) → נופלים לארכוב רך: הקורס נעלם מהאתר, ההיסטוריה נשמרת.
    mutationFn: async (id: string): Promise<"deleted" | "archived"> => {
      const { data: delRows, error } = await supabase.from("community_courses").delete().eq("id", id).select("id");
      if (!error) {
        // רמה 18: RLS שחסם בשקט (0 שורות, בלי שגיאה) ≠ מחיקה מוצלחת
        if (!delRows?.length) throw new Error("המחיקה לא בוצעה — אין הרשאת מחיקה (RLS).");
        return "deleted";
      }
      const isFk = (error as any).code === "23503" || /foreign key/i.test(error.message);
      if (!isFk) throw error;
      const { error: archiveErr } = await supabase
        .from("community_courses").update({ status: "archived" }).eq("id", id);
      if (archiveErr) throw archiveErr;
      return "archived";
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-community-courses"] });
      if (selectedCourse) setSelectedCourse(null);
      toast.success(
        result === "deleted"
          ? "הקורס נמחק"
          : "לקורס יש שיעורים או נרשמים — הועבר לארכיון והוסר מהאתר (אפשר לשחזר דרך עריכה → סטטוס)",
      );
    },
    onError: (e) => toast.error("שגיאה: " + e.message),
  });

  const updateCourseStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase.from("community_courses").update({ status }).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("העדכון לא נשמר — אין הרשאת עריכה (RLS).");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-community-courses"] });
      toast.success("סטטוס עודכן");
    },
  });

  const upsertLesson = useMutation({
    mutationFn: async (data: Partial<Lesson> & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from("community_course_lessons").update(data).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("community_course_lessons").insert({
          title: data.title!, course_id: data.course_id!, description: data.description,
          video_url: data.video_url, audio_url: data.audio_url, attachment_url: data.attachment_url,
          content_html: data.content_html, lesson_number: data.lesson_number ?? 0,
          status: "published",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-community-lessons"] });
      if (selectedCourse) {
        supabase.from("community_course_lessons").select("id", { count: "exact" }).eq("course_id", selectedCourse.id)
          .then(({ count }) => {
            if (count !== null) {
              supabase.from("community_courses").update({ total_lessons: count }).eq("id", selectedCourse.id)
                .then(() => queryClient.invalidateQueries({ queryKey: ["admin-community-courses"] }));
            }
          });
      }
      setLessonDialogOpen(false);
      setEditingLesson(undefined);
      toast.success("השיעור נשמר בהצלחה");
    },
    onError: (e) => toast.error("שגיאה: " + e.message),
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { data: delRows, error } = await supabase.from("community_course_lessons").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!delRows?.length) throw new Error("המחיקה לא בוצעה — אין הרשאת מחיקה (RLS).");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-community-lessons"] });
      toast.success("השיעור נמחק");
    },
    onError: (e) => toast.error("שגיאה: " + e.message),
  });

  const toggleLessonStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "published" ? "draft" : "published";
      const { error } = await supabase.from("community_course_lessons").update({
        status: newStatus,
        published_at: newStatus === "published" ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-community-lessons"] });
      toast.success("סטטוס עודכן");
    },
  });

  // ── set-current-book mutation ──────────────────────────────────────────────
  // Sets is_current=true on the selected book and false on all others.
  // Mutually exclusive: only one book can be "current" at a time.
  const setCurrentBook = useMutation({
    mutationFn: async (id: string) => {
      // First clear all
      const { error: clearErr } = await (supabase as any)
        .from("community_courses")
        .update({ is_current: false })
        .eq("in_weekly_program", true);
      if (clearErr) throw clearErr;
      // Then set this one
      const { error: setErr } = await (supabase as any)
        .from("community_courses")
        .update({ is_current: true })
        .eq("id", id);
      if (setErr) throw setErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-community-courses"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-books"] });
      toast.success("הספר הנוכחי עודכן — כניסה ל-/program/weekly-chapter תנתב אליו");
    },
    onError: (e: Error) => toast.error("שגיאה: " + e.message),
  });

  /* ════════════════════════════════════════════════════════
   *  LESSONS VIEW
   * ════════════════════════════════════════════════════════ */
  if (selectedCourse) {
    const publishedCount = lessons.filter(l => l.status === "published").length;
    const draftCount = lessons.filter(l => l.status === "draft").length;

    return (
      <AdminLayout>
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedCourse(null)} className="group flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              <span>קורסים</span>
            </button>
            <span className="text-muted-foreground/40">/</span>
            <h1 className="text-lg font-bold truncate">{selectedCourse.title}</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={BookOpen} label="סה״כ שיעורים" value={lessons.length} />
            <StatCard icon={Eye} label="מפורסמים" value={publishedCount} accent="bg-emerald-500/10 text-emerald-600" />
            <StatCard icon={EyeOff} label="טיוטות" value={draftCount} accent="bg-amber-500/10 text-amber-600" />
          </div>

          {/* Add lesson button */}
          <div className="flex justify-end">
            <Dialog open={lessonDialogOpen} onOpenChange={(open) => { setLessonDialogOpen(open); if (!open) setEditingLesson(undefined); }}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2 shadow-md">
                  <Plus className="h-4 w-4" /> הוסף שיעור
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">{editingLesson ? "עריכת שיעור" : "שיעור חדש"}</DialogTitle>
                  <DialogDescription>
                    {editingLesson ? "ערוך את פרטי השיעור" : `הוסף שיעור חדש לקורס "${selectedCourse.title}"`}
                  </DialogDescription>
                </DialogHeader>
                <LessonForm
                  lesson={editingLesson}
                  courseId={selectedCourse.id}
                  nextNumber={(lessons.length > 0 ? Math.max(...lessons.map(l => l.lesson_number)) : 0) + 1}
                  onSave={(data) => upsertLesson.mutate({ ...data, id: editingLesson?.id })}
                  onCancel={() => { setLessonDialogOpen(false); setEditingLesson(undefined); }}
                  isPending={upsertLesson.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Lessons list */}
          {lessonsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl border border-border/50 bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : lessons.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 py-16 text-center">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
              <p className="text-lg font-medium text-muted-foreground/70">אין עדיין שיעורים בקורס</p>
              <p className="text-sm text-muted-foreground/50 mt-1">לחץ על "הוסף שיעור" כדי להתחיל</p>
            </motion.div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm">
              <AnimatePresence>
                {/* סער 14.7: השיעורים מקובצים לפי פרק — כמו שהלומד רואה אותם.
                    בתוך כל פרק: השכבה (בסיס/הרחבה/שיעור) + סוג כל חומר. */}
                {(() => {
                  const groups: Array<{ key: string; label: string; items: typeof lessons }> = [];
                  const byKey = new Map<string, (typeof lessons)[number][]>();
                  for (const l of lessons) {
                    const ch = (l as any).bible_chapter;
                    const key = ch != null ? `ch-${ch}` : "general";
                    if (!byKey.has(key)) {
                      byKey.set(key, []);
                      groups.push({ key, label: ch != null ? `פרק ${ch}` : "כללי / הקדמה", items: byKey.get(key)! as any });
                    }
                    byKey.get(key)!.push(l);
                  }
                  groups.sort((a, b) => {
                    if (a.key === "general") return -1;
                    if (b.key === "general") return 1;
                    return Number(a.key.slice(3)) - Number(b.key.slice(3));
                  });
                  const LAYER_LABEL: Record<string, string> = { base: "בסיס", enrichment: "הרחבה", weekly: "שיעור ושיכום" };
                  return groups.map((g) => (
                    <div key={g.key}>
                      {groups.length > 1 && (
                        <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 border-b border-border/30">
                          <span className="text-xs font-bold text-foreground">{g.label}</span>
                          <span className="text-[10px] text-muted-foreground">{g.items.length} פריטים</span>
                        </div>
                      )}
                      {g.items.map((lesson: any, index: number) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`group flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors border-b border-border/30`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0 cursor-grab group-hover:text-muted-foreground/60 transition-colors" />

                    {/* Lesson number circle */}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/5 text-xs font-bold text-primary border border-primary/10">
                      {lesson.lesson_number}
                    </span>

                    {/* Title & description */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{lesson.title}</p>
                      {lesson.description && (
                        <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{lesson.description}</p>
                      )}
                    </div>

                    {/* שכבה (בסיס/הרחבה/שיעור) */}
                    {lesson.layer_type && LAYER_LABEL[lesson.layer_type] && (
                      <Badge variant="outline" className="text-[10px] shrink-0 border-border/60 text-muted-foreground">
                        {LAYER_LABEL[lesson.layer_type]}
                      </Badge>
                    )}

                    {/* Media indicators — סוג כל חומר: וידאו / שמע / קובץ / טקסט */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <MediaDot has={!!lesson.video_url} icon={Video} label="וידאו" />
                      <MediaDot has={!!lesson.audio_url} icon={Headphones} label="שמע" />
                      <MediaDot has={!!lesson.attachment_url} icon={Paperclip} label="קובץ" />
                      <MediaDot has={!!lesson.content_html} icon={FileText} label="טקסט" />
                    </div>

                    {/* Status badge */}
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium shrink-0 ${
                        lesson.status === "published"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
                      }`}
                    >
                      {lesson.status === "published" ? "פורסם" : "טיוטה"}
                    </Badge>

                    {/* Actions */}
                    <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleLessonStatus.mutate({ id: lesson.id, status: lesson.status })}>
                            {lesson.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{lesson.status === "published" ? "העבר לטיוטה" : "פרסם"}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingLesson(lesson); setLessonDialogOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>ערוך</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm("למחוק את השיעור?")) deleteLesson.mutate(lesson.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>מחק</TooltipContent>
                      </Tooltip>
                    </div>
                  </motion.div>
                      ))}
                    </div>
                  ));
                })()}
              </AnimatePresence>
            </div>
          )}
        </div>
      </AdminLayout>
    );
  }

  /* ════════════════════════════════════════════════════════
   *  COURSES LIST VIEW
   * ════════════════════════════════════════════════════════ */
  const activeCourses = courses.filter(c => c.status === "active").length;
  const totalLessons = courses.reduce((sum, c) => sum + c.total_lessons, 0);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
              <GraduationCap className="h-7 w-7 text-primary" />
              קורסים — קהילת לומדים
            </h1>
            <p className="text-sm text-muted-foreground mt-1">ניהול קורסים ושיעורים עבור חברי הקהילה</p>
          </div>
          <Dialog open={courseDialogOpen} onOpenChange={(open) => { setCourseDialogOpen(open); if (!open) setEditingCourse(undefined); }}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 shadow-md">
                <Plus className="h-4 w-4" /> קורס חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl">{editingCourse ? "עריכת קורס" : "קורס חדש"}</DialogTitle>
                <DialogDescription>
                  {editingCourse ? "ערוך את פרטי הקורס" : "צור קורס חדש עבור חברי הקהילה"}
                </DialogDescription>
              </DialogHeader>
              <CourseForm
                course={editingCourse}
                onSave={(data) => upsertCourse.mutate({ ...data, id: editingCourse?.id })}
                onCancel={() => { setCourseDialogOpen(false); setEditingCourse(undefined); }}
                isPending={upsertCourse.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={GraduationCap} label="סה״כ קורסים" value={courses.length} />
          <StatCard icon={BarChart3} label="קורסים פעילים" value={activeCourses} accent="bg-emerald-500/10 text-emerald-600" />
          <StatCard icon={BookOpen} label="סה״כ שיעורים" value={totalLessons} accent="bg-blue-500/10 text-blue-600" />
        </div>

        {/* Courses grid */}
        {coursesLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-56 rounded-2xl border border-border/50 bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 py-20 text-center">
            <GraduationCap className="h-20 w-20 mx-auto mb-5 text-muted-foreground/15" />
            <p className="text-xl font-medium text-muted-foreground/60">אין עדיין קורסים</p>
            <p className="text-sm text-muted-foreground/40 mt-2">לחץ על "קורס חדש" כדי ליצור את הקורס הראשון</p>
          </motion.div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {courses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="group relative overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedCourse(course)}
                  >
                    {/* Image */}
                    <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
                      {course.image_url ? (
                        <img src={course.image_url} alt={course.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <GraduationCap className="h-12 w-12 text-primary/20" />
                        </div>
                      )}
                      {/* Status overlay */}
                      <div className="absolute top-3 left-3">
                        <Badge
                          variant="outline"
                          className={`backdrop-blur-sm text-[10px] font-semibold ${
                            course.status === "active"
                              ? "border-emerald-300/50 bg-emerald-500/80 text-white"
                              : course.status === "completed"
                              ? "border-blue-300/50 bg-blue-500/80 text-white"
                              : "border-amber-300/50 bg-amber-500/80 text-white"
                          }`}
                        >
                          {course.status === "active" ? "פעיל" : course.status === "completed" ? "הסתיים" : "טיוטה"}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{course.title}</h3>
                        {course.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">{course.description}</p>
                        )}
                      </div>

                      <Separator />

                      {/* רמה 18 (יואב 14.7): "לא ראיתי שום מקום בו אני יכול לערוך את תוכן
                          הקורס" — כפתור מפורש וגלוי-תמיד לעריכת הפרקים והשיעורים,
                          במקום להסתמך על לחיצה על גוף הכרטיס. */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full font-display gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                        onClick={(e) => { e.stopPropagation(); setSelectedCourse(course); }}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        עריכת פרקים, שיעורים ותכנים
                      </Button>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          {course.total_lessons} שיעורים
                        </span>

                        {/* is_current toggle — only for weekly-program books */}
                        {(course as any).in_weekly_program && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!(course as any).is_current) {
                                    setCurrentBook.mutate(course.id);
                                  }
                                }}
                                title={(course as any).is_current ? "הספר הנוכחי" : "הגדר כספר הנוכחי"}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: (course as any).is_current ? "default" : "pointer",
                                  padding: "0.2rem 0.4rem",
                                  borderRadius: "0.375rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  color: (course as any).is_current ? "#8B6F47" : "#9CA3AF",
                                }}
                              >
                                <Star
                                  size={13}
                                  fill={(course as any).is_current ? "#C4A265" : "none"}
                                  color={(course as any).is_current ? "#8B6F47" : "#9CA3AF"}
                                />
                                {(course as any).is_current ? "נוכחי" : ""}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {(course as any).is_current
                                ? "ספר זה הוא הנוכחי — /program/weekly-chapter מנתב אליו"
                                : "הגדר כספר הנלמד כעת — ינתב את הכניסה לתכנית אוטומטית"}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Select value={course.status} onValueChange={(val) => updateCourseStatus.mutate({ id: course.id, status: val })}>
                            <SelectTrigger className="h-7 w-[90px] text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">פעיל</SelectItem>
                              <SelectItem value="draft">טיוטה</SelectItem>
                              <SelectItem value="completed">הסתיים</SelectItem>
                              <SelectItem value="archived">בארכיון</SelectItem>
                            </SelectContent>
                          </Select>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditingCourse(course); setCourseDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>ערוך</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { if (confirm("למחוק את הקורס וכל השיעורים שלו?")) deleteCourse.mutate(course.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>מחק</TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Arrow indicator */}
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-[-4px] transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}