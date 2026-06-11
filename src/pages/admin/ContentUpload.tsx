/**
 * ContentUpload.tsx — Guided content upload wizard
 * Batch A upgrade: Feature 1 (smart book autocomplete), Feature 2 (visual location picker),
 * Feature 4 (search inside picker). Orphan parent_id bug fixed.
 * Batch B upgrade: Feature 3 (multi-rabbi selector + inline add), Feature 5 (AI cover gen).
 *
 * Flow:
 *   Admin  → "פרסם עכשיו" or "שמור כטיוטה"
 *   Creator → "שלח לאישור" (status=pending_review)
 *
 * Steps:
 *   1. סוג תוכן + כותרת + רבנים (multi) + ספר (autocomplete)
 *   2. שיוך — ContentLocationPicker + נושא + audience tags
 *   3. מדיה — אודיו/וידאו/קובץ + תמונת כיסוי (+ AI gen) + drive URL
 *   4. סקירה ושליחה
 */

import { useState, useRef, useEffect } from "react";
import {
  Upload, FileText, Headphones, Video, Loader2,
  ChevronLeft, ChevronRight, CheckCircle2, BookOpen,
  Tag, Image, FolderOpen, Users, AlertCircle, BookMarked,
  Sparkles,
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
import { useContentSidebar } from "@/hooks/useContentSidebar";
import { ContentLocationPicker, type SelectedLocation } from "@/components/admin/ContentLocationPicker";
import { MultiRabbiSelector } from "@/components/admin/MultiRabbiSelector";
import { useLessonRabbis } from "@/hooks/useRabbiMultiSelect";

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
  rabbiId:     string;    // primary rabbi — backward compat with lessons.rabbi_id
  rabbiIds:    string[];  // Feature 3: multi-select, index 0 = primary
  // step 2
  seriesId:          string;
  newSeriesTitle:    string;
  newSeriesParentId: string;   // parent_id for createSeries — from picker node (fix: was always empty)
  topicId:           string;
  audienceTags:      string[];
  // step 3
  audioFile:    File | null;
  videoFile:    File | null;
  pdfFile:      File | null;
  coverFile:    File | null;
  videoUrl:     string;
  driveFolderUrl: string;
  // step 1 extra
  bibleBook:       string;
  bibleChapter:    string;
  bookCategoryId:  string;   // book-node id from sidebar — used for picker pre-expand ONLY (critique I/L)
}

const EMPTY: FormState = {
  title: "", description: "", sourceType: "audio", rabbiId: "", rabbiIds: [],
  seriesId: "", newSeriesTitle: "", newSeriesParentId: "", topicId: "", audienceTags: ["general"],
  audioFile: null, videoFile: null, pdfFile: null, coverFile: null,
  videoUrl: "", driveFolderUrl: "",
  bibleBook: "", bibleChapter: "", bookCategoryId: "",
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

  // Feature 2 — location picker state (separate from FormState — not serializable)
  const [locationValue, setLocationValue] = useState<SelectedLocation | null>(null);

  // Feature 5 — AI cover generation state
  const [generatingCover, setGeneratingCover] = useState(false);
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState<string | null>(null);

  // Feature 1 — book autocomplete state
  const [bookInput, setBookInput] = useState("");
  const [bookDropdownOpen, setBookDropdownOpen] = useState(false);
  const bookInputRef = useRef<HTMLInputElement>(null);
  const bookDropdownRef = useRef<HTMLDivElement>(null);

  // Feature 3 — multi-rabbi hook
  const { insertLessonRabbis } = useLessonRabbis();

  // ── sidebar data (feature 1 + 2) ────────────────────────────────
  const { categories } = useContentSidebar();

  // Feature 1: flat list of book nodes only (critique K — no series titles)
  const allBookNodes = categories.flatMap(cat =>
    cat.books.map(b => ({ id: b.id, title: b.title, category: cat.title }))
  );

  const filteredBooks = bookInput.length >= 1
    ? allBookNodes.filter(b => b.title.includes(bookInput) || b.title.toLowerCase().includes(bookInput.toLowerCase()))
    : [];

  // Close book dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        bookDropdownRef.current && !bookDropdownRef.current.contains(e.target as Node) &&
        bookInputRef.current && !bookInputRef.current.contains(e.target as Node)
      ) {
        setBookDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── data queries ─────────────────────────────────────────────────
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
    mutationFn: async ({ title, parentId }: { title: string; parentId: string }) => {
      const { data, error } = await supabase
        .from("series")
        .insert({
          title,
          status: "draft",
          audience_tags: form.audienceTags,
          // Fix: attach parent_id from the picker node — previously always missing (orphan bug)
          parent_id: parentId || null,
        } as any)
        .select("id, title")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newSeries) => {
      queryClient.invalidateQueries({ queryKey: ["admin-series-list"] });
      set("seriesId", newSeries.id);
      set("newSeriesTitle", "");
      set("newSeriesParentId", "");
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
      // Feature 5: use AI-generated cover if no manual cover uploaded
      if (!form.coverFile && generatedCoverUrl) {
        thumbnailUrl = generatedCoverUrl;
      }

      // Determine effective seriesId — if new series needs to be created first, do it now
      let effectiveSeriesId = form.seriesId || null;
      if (
        locationValue?.mode === "new_series_in_node" &&
        locationValue.seriesTitle?.trim() &&
        !form.seriesId
      ) {
        const newSeries = await createSeries.mutateAsync({
          title: locationValue.seriesTitle.trim(),
          parentId: locationValue.parentNodeId || "",
        });
        effectiveSeriesId = newSeries.id;
      }

      const payload: Record<string, unknown> = {
        title:          form.title.trim(),
        description:    form.description || null,
        series_id:      effectiveSeriesId,
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

      const { data: insertedLesson, error } = await supabase
        .from("lessons")
        .insert(payload as any)
        .select("id")
        .single();
      if (error) throw error;

      const lessonId = insertedLesson?.id;

      // Feature 3: populate lesson_rabbis join table (all selected rabbis)
      if (lessonId && form.rabbiIds.length > 0) {
        await insertLessonRabbis.mutateAsync({ lessonId, rabbiIds: form.rabbiIds });
      }

      // link topic if chosen (use returned ID — not title search to avoid dup race)
      if (form.topicId && lessonId) {
        await supabase.from("lesson_topics").insert({
          lesson_id: lessonId,
          topic_id:  form.topicId,
        });
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

  const resetAll = () => {
    setForm(EMPTY);
    setStep(1);
    setDone(false);
    setStepErrors({});
    setLocationValue(null);
    setBookInput("");
    setGeneratedCoverUrl(null);
  };

  // Feature 5 — AI cover generation handler
  const handleGenerateCover = async () => {
    if (!form.title.trim()) {
      toast({ title: "נא להזין כותרת תחילה", variant: "destructive" });
      return;
    }
    setGeneratingCover(true);
    setGeneratedCoverUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover", {
        body: {
          title: form.title.trim(),
          series_id: form.seriesId || undefined,
        },
      });
      if (error) throw error;
      if (!data?.image_url) throw new Error("לא התקבל URL תמונה מהשרת");
      setGeneratedCoverUrl(data.image_url as string);
      toast({ title: "תמונת כיסוי נוצרה" });
    } catch (e: any) {
      toast({ title: "שגיאה ביצירת תמונה", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingCover(false);
    }
  };

  // ── location picker handler ──────────────────────────────────────
  const handleLocationSelect = (loc: SelectedLocation) => {
    setLocationValue(loc);
    if (loc.mode === "existing_series") {
      set("seriesId", loc.seriesId!);
      set("newSeriesParentId", "");
      set("newSeriesTitle", "");
      setCreatingNewSeries(false);
    } else if (loc.mode === "new_series_in_node") {
      set("seriesId", "");
      set("newSeriesParentId", loc.parentNodeId!);
      set("newSeriesTitle", loc.seriesTitle || "");
      setCreatingNewSeries(true);
    } else {
      // standalone
      set("seriesId", "");
      set("newSeriesParentId", "");
      set("newSeriesTitle", "");
      setCreatingNewSeries(false);
    }
  };

  // ── book autocomplete handler ────────────────────────────────────
  const handleBookSelect = (bookId: string, bookTitle: string, _categoryTitle: string) => {
    setBookInput(bookTitle);
    set("bibleBook", bookTitle);
    set("bookCategoryId", bookId);
    setBookDropdownOpen(false);
  };

  // Derive badge text from current selection
  const selectedBookNode = allBookNodes.find(b => b.id === form.bookCategoryId);


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
              STEP 1 — סוג תוכן + כותרת + רב + ספר (autocomplete)
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

              {/* Feature 3 — multi-rabbi selector */}
              <div>
                <label className="block text-sm font-display mb-1.5" style={{ color: TXT }}>
                  רב / יוצר
                  <span className="font-normal text-xs mr-1" style={{ color: TXT_M }}>(ניתן לבחור כמה)</span>
                </label>
                <MultiRabbiSelector
                  rabbisList={rabbisList?.map(r => ({ id: r.id, name: r.name, entity_type: null })) ?? []}
                  selectedIds={form.rabbiIds}
                  onChange={ids => {
                    set("rabbiIds", ids);
                    // Keep rabbiId (primary) in sync for backward compat
                    set("rabbiId", ids[0] ?? "");
                  }}
                  onRabbiCreated={r => {
                    // Add to rabbiIds after creation
                    set("rabbiIds", [...form.rabbiIds, r.id]);
                    set("rabbiId", form.rabbiIds[0] ?? r.id);
                  }}
                />
              </div>

              {/* ── Feature 1: bible book autocomplete ─────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-display mb-1.5" style={{ color: TXT }}>
                    ספר בתנ"ך
                  </label>
                  <Input
                    ref={bookInputRef}
                    value={bookInput}
                    onChange={e => {
                      setBookInput(e.target.value);
                      set("bibleBook", e.target.value);
                      // Clear bookCategoryId if user types manually without picking
                      if (form.bookCategoryId && e.target.value !== selectedBookNode?.title) {
                        set("bookCategoryId", "");
                      }
                      setBookDropdownOpen(true);
                    }}
                    onFocus={() => bookInput.length >= 1 && setBookDropdownOpen(true)}
                    placeholder="בראשית, יהושע..."
                    style={{ direction: "rtl" }}
                    autoComplete="off"
                  />

                  {/* dropdown */}
                  {bookDropdownOpen && filteredBooks.length > 0 && (
                    <div
                      ref={bookDropdownRef}
                      className="absolute z-30 mt-1 w-full rounded-xl shadow-lg overflow-hidden"
                      style={{ background: "#fff", border: `1px solid ${GOLD_S}`, top: "100%" }}
                    >
                      {filteredBooks.slice(0, 8).map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onMouseDown={e => {
                            e.preventDefault(); // prevent blur before click
                            handleBookSelect(b.id, b.title, b.category);
                          }}
                          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-right hover:bg-amber-50 transition-colors"
                        >
                          <span className="text-sm font-display" style={{ color: TXT }}>{b.title}</span>
                          <span className="text-xs" style={{ color: TXT_M }}>{b.category}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* badge — shown when a book node is selected (critique K) */}
                  {selectedBookNode && (
                    <div
                      className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-display"
                      style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD_S}` }}
                    >
                      <span style={{ color: TXT_M }}>{selectedBookNode.category}</span>
                      <span>›</span>
                      <span>{selectedBookNode.title}</span>
                    </div>
                  )}
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
              STEP 2 — שיוך: ContentLocationPicker + נושא + audience tags
          ═══════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-6">
              <StepTitle icon={Tag} title="שיוך ותיוג" step={2} />

              {/* ── Feature 2: visual location picker ────────────── */}
              <div>
                <label className="block text-sm font-display mb-2" style={{ color: TXT }}>
                  מיקום בעץ התוכן
                </label>
                <ContentLocationPicker
                  audienceTags={form.audienceTags}
                  initialBookId={form.bookCategoryId || undefined}
                  value={locationValue}
                  onSelect={handleLocationSelect}
                />
                {/* new series title input — shown when mode=new_series_in_node */}
                {locationValue?.mode === "new_series_in_node" && (
                  <div className="mt-3">
                    <label className="block text-xs font-display mb-1" style={{ color: TXT_M }}>
                      שם הסדרה החדשה <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <Input
                      value={form.newSeriesTitle}
                      onChange={e => set("newSeriesTitle", e.target.value)}
                      placeholder="הזן שם לסדרה החדשה"
                      style={{ direction: "rtl" }}
                    />
                    <p className="text-xs mt-1" style={{ color: TXT_M }}>
                      הסדרה תיווצר אוטומטית תחת "{locationValue.parentNodeTitle}" בעת שמירת השיעור.
                    </p>
                  </div>
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

              {/* Feature 5 — AI cover generation */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-display" style={{ color: TXT }}>
                    תמונת כיסוי (אופציונלי)
                  </label>
                  <button
                    type="button"
                    disabled={generatingCover || !form.title.trim()}
                    onClick={handleGenerateCover}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display transition-opacity"
                    style={{
                      background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_L} 100%)`,
                      color: "#fff",
                      opacity: (!form.title.trim() || generatingCover) ? 0.5 : 1,
                    }}
                  >
                    {generatingCover
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />מייצר...</>
                      : <><Sparkles className="h-3.5 w-3.5" />ג׳נרוט ב-AI</>
                    }
                  </button>
                </div>

                {/* AI-generated preview */}
                {generatedCoverUrl && !form.coverFile && (
                  <div
                    className="mb-2 rounded-xl overflow-hidden border"
                    style={{ borderColor: GOLD_S }}
                  >
                    <img
                      src={generatedCoverUrl}
                      alt="תמונת כיסוי שנוצרה"
                      className="w-full h-40 object-cover"
                    />
                    <div
                      className="flex items-center justify-between px-3 py-2"
                      style={{ background: PARCH_D }}
                    >
                      <span className="text-xs font-display" style={{ color: TXT_M }}>
                        תמונה שנוצרה ב-AI
                      </span>
                      <button
                        type="button"
                        onClick={() => setGeneratedCoverUrl(null)}
                        className="text-xs font-display"
                        style={{ color: "#DC2626" }}
                      >
                        הסר
                      </button>
                    </div>
                  </div>
                )}

                <FileDropZone
                  id="cover-upload"
                  accept="image/*"
                  label=""
                  hint="JPG, PNG — 1200×630 מומלץ (מחליף תמונת AI)"
                  file={form.coverFile}
                  onChange={f => {
                    set("coverFile", f);
                    if (f) setGeneratedCoverUrl(null); // manual upload overrides AI
                  }}
                  icon={Image}
                  preview
                />
              </div>

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
                {/* Feature 2: dynamic location summary (critique I/L) */}
                <SummaryRow label="מיקום"    value={
                  locationValue?.mode === "existing_series"
                    ? `סדרה: ${locationValue.seriesTitle ?? ""}`
                    : locationValue?.mode === "new_series_in_node"
                      ? `תחת: ${locationValue.parentNodeTitle ?? ""} (סדרה חדשה: ${form.newSeriesTitle || "—"})`
                      : "ללא שיוך (שיעור עצמאי)"
                } />
                <SummaryRow label="קהל יעד"  value={
                  form.audienceTags
                    .map(t => AUDIENCE_TAGS.find(a => a.value === t)?.label ?? t)
                    .join(", ")
                } />
                <SummaryRow label="תמונה"    value={
                  form.coverFile
                    ? form.coverFile.name
                    : generatedCoverUrl
                      ? "תמונת AI (נוצרה)"
                      : "ללא"
                } />
                <SummaryRow label="שמע"      value={form.audioFile ? form.audioFile.name : form.videoUrl || "ללא"} />
                <SummaryRow label="מסמך"     value={form.pdfFile ? form.pdfFile.name : "ללא"} />
                {form.bibleBook && (
                  <SummaryRow label="ספר"    value={`${form.bibleBook}${form.bibleChapter ? ` פרק ${form.bibleChapter}` : ""}`} />
                )}
              </div>

              {/* standalone warning */}
              {locationValue?.mode === "standalone" && (
                <div
                  className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
                >
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#D97706" }} />
                  <p className="text-sm" style={{ color: "#92400E" }}>
                    שיעור ללא סדרה לא יופיע בעץ הניווט של האתר. ניתן להוסיף לסדרה מאוחר יותר.
                  </p>
                </div>
              )}

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
