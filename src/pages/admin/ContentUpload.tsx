/**
 * ContentUpload.tsx — Guided content upload wizard
 * Gal 2 of admin-overhaul: approval workflow
 *
 * Flow:
 *   Admin  → "פרסם עכשיו" or "שמור כטיוטה"
 *   Creator → "שלח לאישור" (status=pending_review)
 *
 * Steps:
 *   1. סוג תוכן + כותרת + יוצר/רב
 *   2. שיוך — קטגוריה/נושא + סדרה + audience tags
 *   3. מדיה — אודיו/וידאו/קובץ + תמונת כיסוי + drive URL
 *   4. סקירה ושליחה
 */

import { useState } from "react";
import {
  Upload, FileText, Headphones, Video, Loader2,
  ChevronLeft, ChevronRight, CheckCircle2, BookOpen,
  Tag, Image, FolderOpen, Users, AlertCircle, BookMarked,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// ─── design tokens ──────────────────────────────────────────────────
const GOLD   = "#8B6F47";
const GOLD_L = "#C4A265";
const GOLD_S = "#E8D5A0";
const PARCH  = "#FAF6F0";
const PARCH_D = "#F5F0E8";
const NAVY   = "#1A2744";
const TXT    = "#2D1F0E";
const TXT_M  = "#6B5C4A";

// ─── constants ──────────────────────────────────────────────────────
const SOURCE_TYPES = [
  { value: "audio",   label: "שיעור שמע",     icon: Headphones },
  { value: "video",   label: "שיעור וידאו",   icon: Video },
  { value: "text",    label: "מאמר / דף תורה", icon: FileText },
  { value: "document",label: "מסמך / דף עבודה", icon: BookOpen },
];

const AUDIENCE_TAGS = [
  { value: "general",  label: "כללי",     color: "#64748B" },
  { value: "teachers", label: "מורים",    color: "#4A5A2E" },
  { value: "youth",    label: "נוער",     color: "#1D4ED8" },
  { value: "advanced", label: "מתקדמים",  color: "#92400E" },
];

const STEPS = [
  { id: 1, label: "סוג ויוצר",  icon: FileText  },
  { id: 2, label: "שיוך",       icon: Tag       },
  { id: 3, label: "מדיה",       icon: Image     },
  { id: 4, label: "סקירה",      icon: CheckCircle2 },
];

// ─── types ──────────────────────────────────────────────────────────
interface FormState {
  // step 1
  title:       string;
  description: string;
  sourceType:  string;
  rabbiId:     string;
  // step 2
  seriesId:       string;
  newSeriesTitle: string;
  topicId:        string;
  audienceTags:   string[];
  // step 3
  audioFile:    File | null;
  videoFile:    File | null;
  pdfFile:      File | null;
  coverFile:    File | null;
  videoUrl:     string;
  driveFolderUrl: string;
  // step 1 extra
  bibleBook:    string;
  bibleChapter: string;
}

const EMPTY: FormState = {
  title: "", description: "", sourceType: "audio", rabbiId: "",
  seriesId: "", newSeriesTitle: "", topicId: "", audienceTags: ["general"],
  audioFile: null, videoFile: null, pdfFile: null, coverFile: null,
  videoUrl: "", driveFolderUrl: "",
  bibleBook: "", bibleChapter: "",
};

// ─── helper ─────────────────────────────────────────────────────────
const uploadToStorage = async (file: File, folder: string): Promise<string> => {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("lesson-files").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("lesson-files").getPublicUrl(path);
  return data.publicUrl;
};

// ─── component ──────────────────────────────────────────────────────
const ContentUpload = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});
  const [creatingNewSeries, setCreatingNewSeries] = useState(false);

  // ── data queries ─────────────────────────────────────────────────
  const { data: seriesList } = useQuery({
    queryKey: ["admin-series-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("series")
        .select("id, title")
        .in("status", ["active", "published", "draft"])
        .order("title")
        .limit(500);
      return data ?? [];
    },
  });

  const { data: rabbisList } = useQuery({
    queryKey: ["admin-rabbis-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rabbis")
        .select("id, name")
        .order("name")
        .limit(500);
      return data ?? [];
    },
  });

  const { data: topicsList } = useQuery({
    queryKey: ["admin-topics-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, title, slug")
        .order("title")
        .limit(300);
      return data ?? [];
    },
  });

  // ── mutations ───────────────────────────────────────────────────
  const createSeries = useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await supabase
        .from("series")
        .insert({ title, status: "draft", audience_tags: form.audienceTags } as any)
        .select("id, title")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newSeries) => {
      queryClient.invalidateQueries({ queryKey: ["admin-series-list"] });
      set("seriesId", newSeries.id);
      set("newSeriesTitle", "");
      setCreatingNewSeries(false);
      toast({ title: `סדרה "${newSeries.title}" נוצרה` });
    },
  });

  const submitLesson = useMutation({
    mutationFn: async (intentStatus: "draft" | "pending_review" | "published") => {
      setUploading(true);
      let audioUrl: string | null = null;
      let videoUrl: string | null = form.videoUrl || null;
      let attachmentUrl: string | null = null;
      let thumbnailUrl: string | null = null;

      if (form.audioFile)  audioUrl      = await uploadToStorage(form.audioFile,  "audio");
      if (form.videoFile)  videoUrl      = await uploadToStorage(form.videoFile,  "video");
      if (form.pdfFile)    attachmentUrl = await uploadToStorage(form.pdfFile,    "pdf");
      if (form.coverFile)  thumbnailUrl  = await uploadToStorage(form.coverFile,  "covers");

      const payload: Record<string, unknown> = {
        title:          form.title.trim(),
        description:    form.description || null,
        series_id:      form.seriesId   || null,
        rabbi_id:       form.rabbiId    || null,
        source_type:    form.sourceType,
        audio_url:      audioUrl,
        video_url:      videoUrl,
        attachment_url: attachmentUrl,
        thumbnail_url:  thumbnailUrl,
        status:         intentStatus,
        audience_tags:  form.audienceTags,
        bible_book:     form.bibleBook    || null,
        bible_chapter:  form.bibleChapter ? parseInt(form.bibleChapter) : null,
        submitted_by:   intentStatus === "pending_review" ? user?.id : null,
        submitted_at:   intentStatus === "pending_review" ? new Date().toISOString() : null,
        published_at:   intentStatus === "published" ? new Date().toISOString() : null,
      };

      const { error } = await supabase.from("lessons").insert(payload as any);
      if (error) throw error;

      // link topic if chosen
      if (form.topicId) {
        const { data: lesson } = await supabase
          .from("lessons")
          .select("id")
          .eq("title", form.title.trim())
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (lesson) {
          await supabase.from("lesson_topics").insert({
            lesson_id: lesson.id,
            topic_id:  form.topicId,
          });
        }
      }
    },
    onSuccess: () => {
      setUploading(false);
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
    },
    onError: (err: unknown) => {
      setUploading(false);
      const msg = err instanceof Error ? err.message : "שגיאה לא ידועה";
      toast({ title: "שגיאה בהעלאה", description: msg, variant: "destructive" });
    },
  });

  // ── helpers ──────────────────────────────────────────────────────
  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const toggleTag = (tag: string) => {
    setForm(f => ({
      ...f,
      audienceTags: f.audienceTags.includes(tag)
        ? f.audienceTags.filter(t => t !== tag)
        : [...f.audienceTags, tag],
    }));
  };

  const validateStep = (s: number): boolean => {
    if (s === 1 && !form.title.trim()) {
      setStepErrors(e => ({ ...e, 1: "נא להזין כותרת" }));
      return false;
    }
    setStepErrors(e => { const n = { ...e }; delete n[s]; return n; });
    return true;
  };

  const next = () => { if (validateStep(step)) setStep(s => Math.min(s + 1, 4)); };
  const back = () => setStep(s => Math.max(s - 1, 1));

  const resetAll = () => { setForm(EMPTY); setStep(1); setDone(false); setStepErrors({}); };

  // ── success screen ───────────────────────────────────────────────
  if (done) {
    return (
      <AdminLayout>
        <div
          className="max-w-xl mx-auto text-center py-16 space-y-6"
          style={{ direction: "rtl" }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_L} 100%)` }}
          >
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-heading" style={{ color: NAVY }}>
            {isAdmin ? "התוכן הועלה בהצלחה" : "התוכן נשלח לאישור"}
          </h2>
          <p style={{ color: TXT_M }}>
            {isAdmin
              ? "השיעור פורסם ויופיע באתר."
              : "המנהל יקבל התראה ויאשר את התוכן לפני הפרסום."}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={resetAll}
              className="px-6 py-2.5 rounded-xl text-sm font-display transition-colors"
              style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_L} 100%)`, color: "#fff" }}
            >
              העלה תוכן נוסף
            </button>
            <a
              href="/admin/lessons"
              className="px-6 py-2.5 rounded-xl border text-sm font-display transition-colors"
              style={{ borderColor: GOLD_L, color: GOLD }}
            >
              צפה ברשימת שיעורים
            </a>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ── main wizard ──────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div style={{ maxWidth: 720, margin: "0 auto", direction: "rtl" }}>

        {/* ── page header ─────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading mb-1" style={{ color: NAVY }}>
            העלאת תוכן חדש
          </h1>
          <p style={{ color: TXT_M, fontSize: 14 }}>
            {isAdmin
              ? "כאדמין תוכל לפרסם ישירות או לשמור כטיוטה"
              : "התוכן יישלח לאישור מנהל לפני פרסום"}
          </p>

          {/* ── progress steps ───────────────────────────────────── */}
          <div className="flex items-center gap-0 mt-6">
            {STEPS.map((s, idx) => {
              const active = s.id === step;
              const isDone = s.id < step;
              const Icon   = s.icon;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <button
                    onClick={() => isDone && setStep(s.id)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0"
                    style={{ cursor: isDone ? "pointer" : "default", minWidth: 64 }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: isDone
                          ? `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_L} 100%)`
                          : active
                            ? `linear-gradient(135deg, ${NAVY} 0%, #2A3D6E 100%)`
                            : PARCH_D,
                        boxShadow: active ? `0 0 0 3px ${GOLD_S}` : "none",
                      }}
                    >
                      {isDone
                        ? <CheckCircle2 className="h-5 w-5 text-white" />
                        : <Icon className="h-5 w-5" style={{ color: active ? "#fff" : TXT_M }} />
                      }
                    </div>
                    <span
                      className="text-xs font-display whitespace-nowrap"
                      style={{ color: active ? NAVY : isDone ? GOLD : TXT_M, fontWeight: active ? 700 : 400 }}
                    >
                      {s.label}
                    </span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div
                      className="flex-1 h-0.5 mx-2 mb-5"
                      style={{ background: s.id < step ? GOLD_L : PARCH_D }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── step card ───────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-8 shadow-sm"
          style={{ background: PARCH, border: `1px solid ${GOLD_S}` }}
        >

          {/* ═══════════════════════════════════════════════════════
              STEP 1 — סוג תוכן + כותרת + רב
          ═══════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-6">
              <StepTitle icon={FileText} title="סוג תוכן, כותרת ויוצר" step={1} />

              {/* source type — visual tiles */}
              <div>
                <label className="block text-sm font-display mb-3" style={{ color: TXT }}>
                  סוג תוכן
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SOURCE_TYPES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("sourceType", value)}
                      className="flex items-center gap-3 p-4 rounded-xl border-2 text-right transition-all"
                      style={{
                        borderColor: form.sourceType === value ? GOLD : GOLD_S,
                        background:  form.sourceType === value
                          ? `linear-gradient(135deg, ${GOLD}18 0%, ${GOLD_L}0D 100%)`
                          : "#fff",
                        color: form.sourceType === value ? GOLD : TXT,
                      }}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="font-display text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* title */}
              <div>
                <label className="block text-sm font-display mb-1.5" style={{ color: TXT }}>
                  כותרת השיעור <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={e => set("title", e.target.value)}
                  placeholder="לדוגמה: פרשת בראשית — בריאת העולם ומשמעותה"
                  className="text-base"
                  style={{ direction: "rtl" }}
                />
                {stepErrors[1] && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#DC2626" }}>
                    <AlertCircle className="h-3 w-3" />{stepErrors[1]}
                  </p>
                )}
              </div>

              {/* description */}
              <div>
                <label className="block text-sm font-display mb-1.5" style={{ color: TXT }}>
                  תיאור קצר
                </label>
                <Textarea
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  placeholder="תיאור קצר שיופיע בכרטיסיית השיעור"
                  rows={3}
                  style={{ direction: "rtl" }}
                />
              </div>

              {/* rabbi */}
              <div>
                <label className="block text-sm font-display mb-1.5" style={{ color: TXT }}>
                  רב / יוצר
                </label>
                <Select value={form.rabbiId} onValueChange={v => set("rabbiId", v)}>
                  <SelectTrigger style={{ direction: "rtl" }}>
                    <SelectValue placeholder="בחר רב (אופציונלי)" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {rabbisList?.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* bible ref */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-display mb-1.5" style={{ color: TXT }}>
                    ספר בתנ"ך
                  </label>
                  <Input
                    value={form.bibleBook}
                    onChange={e => set("bibleBook", e.target.value)}
                    placeholder="בראשית"
                    style={{ direction: "rtl" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-display mb-1.5" style={{ color: TXT }}>
                    פרק
                  </label>
                  <Input
                    type="number"
                    value={form.bibleChapter}
                    onChange={e => set("bibleChapter", e.target.value)}
                    placeholder="1"
                    min={1}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 2 — שיוך: סדרה + נושא + audience tags
          ═══════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-6">
              <StepTitle icon={Tag} title="שיוך ותיוג" step={2} />

              {/* series */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-display" style={{ color: TXT }}>
                    סדרה
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreatingNewSeries(v => !v)}
                    className="text-xs font-display underline"
                    style={{ color: GOLD }}
                  >
                    {creatingNewSeries ? "בחר סדרה קיימת" : "+ סדרה חדשה"}
                  </button>
                </div>

                {creatingNewSeries ? (
                  <div className="flex gap-2">
                    <Input
                      value={form.newSeriesTitle}
                      onChange={e => set("newSeriesTitle", e.target.value)}
                      placeholder="שם הסדרה החדשה"
                      className="flex-1"
                      style={{ direction: "rtl" }}
                    />
                    <button
                      type="button"
                      onClick={() => form.newSeriesTitle.trim() && createSeries.mutate(form.newSeriesTitle.trim())}
                      disabled={!form.newSeriesTitle.trim() || createSeries.isPending}
                      className="px-4 py-2 rounded-lg text-sm font-display"
                      style={{ background: GOLD, color: "#fff", opacity: form.newSeriesTitle.trim() ? 1 : 0.5 }}
                    >
                      {createSeries.isPending ? "יוצר..." : "צור"}
                    </button>
                  </div>
                ) : (
                  <Select value={form.seriesId} onValueChange={v => set("seriesId", v)}>
                    <SelectTrigger style={{ direction: "rtl" }}>
                      <SelectValue placeholder="בחר סדרה (אופציונלי)" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {seriesList?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* topic */}
              <div>
                <label className="block text-sm font-display mb-1.5" style={{ color: TXT }}>
                  נושא
                </label>
                <Select value={form.topicId} onValueChange={v => set("topicId", v)}>
                  <SelectTrigger style={{ direction: "rtl" }}>
                    <SelectValue placeholder="בחר נושא (אופציונלי)" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {topicsList?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* audience tags */}
              <div>
                <label className="block text-sm font-display mb-2" style={{ color: TXT }}>
                  קהל יעד <span className="font-normal text-xs" style={{ color: TXT_M }}>(בחר אחד או יותר)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_TAGS.map(tag => {
                    const active = form.audienceTags.includes(tag.value);
                    return (
                      <button
                        key={tag.value}
                        type="button"
                        onClick={() => toggleTag(tag.value)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-display transition-all"
                        style={{
                          borderColor:  active ? tag.color : GOLD_S,
                          background:   active ? tag.color + "18" : "#fff",
                          color:        active ? tag.color : TXT_M,
                          fontWeight:   active ? 700 : 400,
                        }}
                      >
                        <Users className="h-3.5 w-3.5" />
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 3 — מדיה
          ═══════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-6">
              <StepTitle icon={Image} title="מדיה וקבצים" step={3} />

              {form.sourceType === "audio" && (
                <FileDropZone
                  id="audio-upload"
                  accept="audio/*"
                  label="קובץ שמע"
                  hint="MP3, M4A, WAV — עד 200MB"
                  file={form.audioFile}
                  onChange={f => set("audioFile", f)}
                  icon={Headphones}
                />
              )}

              {form.sourceType === "video" && (
                <div className="space-y-3">
                  <FileDropZone
                    id="video-upload"
                    accept="video/*"
                    label="קובץ וידאו"
                    hint="MP4, MOV — עד 2GB"
                    file={form.videoFile}
                    onChange={f => set("videoFile", f)}
                    icon={Video}
                  />
                  <div className="flex items-center gap-2 text-xs" style={{ color: TXT_M }}>
                    <div className="flex-1 h-px" style={{ background: GOLD_S }} />
                    <span>או</span>
                    <div className="flex-1 h-px" style={{ background: GOLD_S }} />
                  </div>
                  <div>
                    <label className="block text-sm font-display mb-1.5" style={{ color: TXT }}>
                      קישור YouTube / Vimeo
                    </label>
                    <Input
                      value={form.videoUrl}
                      onChange={e => set("videoUrl", e.target.value)}
                      placeholder="https://youtu.be/..."
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              <FileDropZone
                id="pdf-upload"
                accept=".pdf,.doc,.docx"
                label="קובץ מצורף (אופציונלי)"
                hint="PDF, Word — מצגת, דף מקורות, תרשים"
                file={form.pdfFile}
                onChange={f => set("pdfFile", f)}
                icon={BookMarked}
              />

              <FileDropZone
                id="cover-upload"
                accept="image/*"
                label="תמונת כיסוי (אופציונלי)"
                hint="JPG, PNG — 1200×630 מומלץ"
                file={form.coverFile}
                onChange={f => set("coverFile", f)}
                icon={Image}
                preview
              />

              <div>
                <label className="block text-sm font-display mb-1.5" style={{ color: TXT }}>
                  <FolderOpen className="h-4 w-4 inline ml-1" />
                  תיקיית Drive (אופציונלי)
                </label>
                <Input
                  value={form.driveFolderUrl}
                  onChange={e => set("driveFolderUrl", e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  dir="ltr"
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 4 — סקירה ושליחה
          ═══════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-6">
              <StepTitle icon={CheckCircle2} title="סקירה ושליחה" step={4} />

              <div
                className="rounded-xl p-5 space-y-3"
                style={{ background: PARCH_D, border: `1px solid ${GOLD_S}` }}
              >
                <SummaryRow label="כותרת"    value={form.title || "—"} />
                <SummaryRow label="סוג"      value={SOURCE_TYPES.find(t => t.value === form.sourceType)?.label ?? form.sourceType} />
                <SummaryRow label="רב"       value={rabbisList?.find(r => r.id === form.rabbiId)?.name ?? "לא נבחר"} />
                <SummaryRow label="סדרה"     value={seriesList?.find((s: any) => s.id === form.seriesId)?.title ?? "לא שויך"} />
                <SummaryRow label="קהל יעד"  value={
                  form.audienceTags
                    .map(t => AUDIENCE_TAGS.find(a => a.value === t)?.label ?? t)
                    .join(", ")
                } />
                <SummaryRow label="תמונה"    value={form.coverFile ? form.coverFile.name : "ללא"} />
                <SummaryRow label="שמע"      value={form.audioFile ? form.audioFile.name : form.videoUrl || "ללא"} />
                <SummaryRow label="מסמך"     value={form.pdfFile ? form.pdfFile.name : "ללא"} />
                {form.bibleBook && (
                  <SummaryRow label="ספר"    value={`${form.bibleBook}${form.bibleChapter ? ` פרק ${form.bibleChapter}` : ""}`} />
                )}
              </div>

              {!isAdmin && (
                <div
                  className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}
                >
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#C2410C" }} />
                  <p className="text-sm" style={{ color: "#9A3412" }}>
                    התוכן יישלח לתור האישור. המנהל יקבל התראה ויפרסם אחרי בדיקה.
                    תוכל לעקוב אחרי הסטטוס ברשימת השיעורים שלך.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                {isAdmin ? (
                  <>
                    <ActionButton
                      onClick={() => submitLesson.mutate("published")}
                      loading={uploading}
                      primary
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      פרסם עכשיו
                    </ActionButton>
                    <ActionButton
                      onClick={() => submitLesson.mutate("draft")}
                      loading={uploading}
                    >
                      שמור כטיוטה
                    </ActionButton>
                  </>
                ) : (
                  <ActionButton
                    onClick={() => submitLesson.mutate("pending_review")}
                    loading={uploading}
                    primary
                  >
                    <Upload className="h-4 w-4" />
                    שלח לאישור
                  </ActionButton>
                )}
              </div>
            </div>
          )}

          {/* ── nav row ───────────────────────────────────────────── */}
          {step < 4 && (
            <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: `1px solid ${GOLD_S}` }}>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={back}
                  className="flex items-center gap-1.5 text-sm font-display transition-colors"
                  style={{ color: TXT_M }}
                >
                  <ChevronRight className="h-4 w-4" />
                  חזור
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-display transition-colors"
                style={{
                  background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_L} 100%)`,
                  color: "#fff",
                }}
              >
                המשך
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${GOLD_S}` }}>
              <button
                type="button"
                onClick={back}
                className="flex items-center gap-1.5 text-sm font-display"
                style={{ color: TXT_M }}
              >
                <ChevronRight className="h-4 w-4" />
                חזור לשלב הקודם
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

// ─── sub-components ──────────────────────────────────────────────────

const StepTitle = ({ icon: Icon, title, step }: { icon: React.ElementType; title: string; step: number }) => (
  <div className="flex items-center gap-3 pb-2 mb-2" style={{ borderBottom: `1px solid ${GOLD_S}` }}>
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_L} 100%)` }}
    >
      <Icon className="h-4 w-4 text-white" />
    </div>
    <div>
      <p className="text-xs font-display" style={{ color: GOLD_L }}>שלב {step} מתוך 4</p>
      <h2 className="text-lg font-heading leading-tight" style={{ color: NAVY }}>{title}</h2>
    </div>
  </div>
);

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 text-sm">
    <span className="font-display shrink-0" style={{ color: TXT_M, minWidth: 80 }}>{label}:</span>
    <span className="text-right" style={{ color: TXT }}>{value}</span>
  </div>
);

interface ActionButtonProps {
  onClick: () => void;
  loading?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}
const ActionButton = ({ onClick, loading, primary, children }: ActionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-display transition-colors disabled:opacity-50"
    style={primary
      ? { background: `linear-gradient(135deg, ${NAVY} 0%, #2A3D6E 100%)`, color: "#fff" }
      : { background: "#fff", color: TXT, border: `1px solid ${GOLD_S}` }
    }
  >
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
  </button>
);

interface FileDropZoneProps {
  id: string;
  accept: string;
  label: string;
  hint: string;
  file: File | null;
  onChange: (f: File | null) => void;
  icon: React.ElementType;
  preview?: boolean;
}
const FileDropZone = ({ id, accept, label, hint, file, onChange, icon: Icon, preview }: FileDropZoneProps) => (
  <div>
    <label className="block text-sm font-display mb-1.5" style={{ color: TXT }}>{label}</label>
    <div
      className="rounded-xl transition-colors"
      style={{
        border: `2px dashed ${file ? GOLD : GOLD_S}`,
        background: file ? `${GOLD}08` : "#fff",
      }}
    >
      <input
        type="file"
        accept={accept}
        onChange={e => onChange(e.target.files?.[0] ?? null)}
        className="hidden"
        id={id}
      />
      <label htmlFor={id} className="flex flex-col items-center py-6 cursor-pointer gap-2">
        {preview && file ? (
          <img
            src={URL.createObjectURL(file)}
            alt="preview"
            className="h-24 rounded-lg object-cover mb-1"
          />
        ) : (
          <Icon className="h-7 w-7" style={{ color: file ? GOLD : TXT_M }} />
        )}
        <p className="text-sm font-display" style={{ color: file ? GOLD : TXT_M }}>
          {file ? file.name : "לחץ לבחירת קובץ"}
        </p>
        <p className="text-xs" style={{ color: TXT_M }}>{hint}</p>
        {file && (
          <button
            type="button"
            onClick={e => { e.preventDefault(); onChange(null); }}
            className="text-xs px-3 py-1 rounded-lg"
            style={{ background: "#FEE2E2", color: "#DC2626" }}
          >
            הסר
          </button>
        )}
      </label>
    </div>
  </div>
);

export default ContentUpload;
