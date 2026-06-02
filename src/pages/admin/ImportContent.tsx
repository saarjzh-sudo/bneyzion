/**
 * /admin/import-content
 * M7: ייבוא תוכן הפרק השבועי
 *
 * Discovery: תוכן השיעורים יושב בטבלת `lessons` הרגילה תחת סדרות
 * "לב הפרק" ושות'. `community_course_lessons` ריקה לחלוטין.
 * הכלי הזה מאפשר לבחור סדרת מקור → community_course יעד →
 * לראות preview מלא → dry-run → ולאשר ייבוא אמיתי.
 *
 * Iron rules:
 * - Dry-run תמיד קודם. ייבוא אמיתי רק אחרי אישור מפורש.
 * - אין שינוי בטבלת `lessons` — רק INSERT ל-community_course_lessons.
 * - שדות week_number / bible_book / bible_chapter ממופים מהלסון המקורי.
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  BookOpen, ArrowLeft, CheckCircle2, AlertCircle, FileAudio,
  FileVideo, Info, Download, Loader2, Eye, RefreshCw, ChevronRight,
} from "lucide-react";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface LessonRow {
  id: string;
  title: string;
  audio_url: string | null;
  video_url: string | null;
  attachment_url: string | null;
  bible_book: string | null;
  bible_chapter: number | null;
  duration: number | null;
  status: string;
}

interface SeriesRow {
  id: string;
  title: string;
  status: string;
  lesson_count: number;
}

interface CourseRow {
  id: string;
  title: string;
  status: string;
  total_lessons: number;
}

interface ImportPreviewItem {
  lesson_id: string;
  title: string;
  lesson_number: number;
  audio_url: string | null;
  video_url: string | null;
  attachment_url: string | null;
  bible_book: string | null;
  bible_chapter: number | null;
  media_type: "audio+video" | "audio" | "video" | "pdf" | "none";
  already_imported: boolean;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function deriveMediaType(l: LessonRow): ImportPreviewItem["media_type"] {
  if (l.audio_url && l.video_url) return "audio+video";
  if (l.audio_url) return "audio";
  if (l.video_url) return "video";
  if (l.attachment_url) return "pdf";
  return "none";
}

function formatDuration(sec: number | null): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`;
}

const MEDIA_BADGE: Record<ImportPreviewItem["media_type"], string> = {
  "audio+video": "bg-emerald-100 text-emerald-800",
  audio: "bg-blue-100 text-blue-800",
  video: "bg-purple-100 text-purple-800",
  pdf: "bg-amber-100 text-amber-800",
  none: "bg-gray-100 text-gray-500",
};

// ──────────────────────────────────────────────
// Hooks
// ──────────────────────────────────────────────

function useWeeklyChapterSeries() {
  return useQuery({
    queryKey: ["import-content-series"],
    queryFn: async (): Promise<SeriesRow[]> => {
      // fetch series that look like "לב הפרק" (weekly chapter content)
      const { data, error } = await supabase
        .from("series")
        .select("id, title, status")
        .or("title.ilike.%לב הפרק%,title.ilike.%מגילת אסתר%,title.ilike.%חגי%,title.ilike.%קהלת%")
        .in("status", ["active", "published", "category"])
        .order("title");
      if (error) throw error;
      // attach lesson_count
      const ids = (data ?? []).map((s) => s.id);
      if (!ids.length) return [];
      const { data: counts } = await supabase
        .from("lessons")
        .select("series_id")
        .in("series_id", ids)
        .eq("status", "published");
      const countMap: Record<string, number> = {};
      (counts ?? []).forEach((c) => {
        countMap[c.series_id] = (countMap[c.series_id] ?? 0) + 1;
      });
      return (data ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        lesson_count: countMap[s.id] ?? 0,
      })).filter((s) => s.lesson_count > 0);
    },
    staleTime: 60_000,
  });
}

function useCommunityCourses() {
  return useQuery({
    queryKey: ["import-content-courses"],
    queryFn: async (): Promise<CourseRow[]> => {
      const { data, error } = await supabase
        .from("community_courses")
        .select("id, title, status, total_lessons")
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

function useLessonsForSeries(seriesId: string | null) {
  return useQuery({
    queryKey: ["import-content-lessons", seriesId],
    queryFn: async (): Promise<LessonRow[]> => {
      if (!seriesId) return [];
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, audio_url, video_url, attachment_url, bible_book, bible_chapter, duration, status")
        .eq("series_id", seriesId)
        .eq("status", "published")
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!seriesId,
    staleTime: 60_000,
  });
}

function useExistingCourseLesson(courseId: string | null) {
  return useQuery({
    queryKey: ["import-content-existing", courseId],
    queryFn: async (): Promise<Set<string>> => {
      if (!courseId) return new Set();
      // use raw select — the extra columns added by migration may not be in types.ts yet
      const { data, error } = await (supabase as any)
        .from("community_course_lessons")
        .select("title, audio_url")
        .eq("course_id", courseId);
      if (error) throw error;
      // deduplicate by title (title-based match, since source lesson IDs aren't stored)
      const set = new Set<string>();
      (data ?? []).forEach((r: { title: string }) => set.add(r.title));
      return set;
    },
    enabled: !!courseId,
    staleTime: 30_000,
  });
}

// ──────────────────────────────────────────────
// Preview builder
// ──────────────────────────────────────────────

function buildPreview(
  lessons: LessonRow[],
  existingTitles: Set<string>,
): ImportPreviewItem[] {
  return lessons.map((l, idx) => ({
    lesson_id: l.id,
    title: l.title,
    lesson_number: idx + 1,
    audio_url: l.audio_url,
    video_url: l.video_url,
    attachment_url: l.attachment_url,
    bible_book: l.bible_book,
    bible_chapter: l.bible_chapter,
    media_type: deriveMediaType(l),
    already_imported: existingTitles.has(l.title),
  }));
}

// ──────────────────────────────────────────────
// DryRunReport component
// ──────────────────────────────────────────────

function DryRunReport({
  preview,
  courseTitle,
  onConfirm,
  isImporting,
}: {
  preview: ImportPreviewItem[];
  courseTitle: string;
  onConfirm: () => void;
  isImporting: boolean;
}) {
  const toImport = preview.filter((p) => !p.already_imported);
  const skipped = preview.filter((p) => p.already_imported);
  const withMedia = toImport.filter((p) => p.media_type !== "none");
  const noMedia = toImport.filter((p) => p.media_type === "none");

  return (
    <Card className="border-2 border-primary/20 bg-card/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-display">תוצאת בדיקת dry-run</CardTitle>
            <p className="text-sm text-muted-foreground">לקורס: {courseTitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "ייובאו", value: toImport.length, color: "text-emerald-600" },
            { label: "כבר קיימים", value: skipped.length, color: "text-amber-600" },
            { label: "עם מדיה", value: withMedia.length, color: "text-blue-600" },
            { label: "ללא מדיה", value: noMedia.length, color: "text-gray-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border bg-background p-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Preview list — to import */}
        {toImport.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              שיעורים שייובאו ({toImport.length})
            </p>
            <div className="max-h-72 overflow-y-auto rounded-xl border divide-y">
              {toImport.map((item) => (
                <div key={item.lesson_id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                  <span className="text-xs text-muted-foreground w-6 shrink-0 text-left">
                    {item.lesson_number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {(item.bible_book || item.bible_chapter) && (
                      <p className="text-xs text-muted-foreground">
                        {item.bible_book} {item.bible_chapter ? `פרק ${item.bible_chapter}` : ""}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MEDIA_BADGE[item.media_type]}`}>
                    {item.media_type === "none" ? "ללא מדיה" : item.media_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skipped list */}
        {skipped.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-4 w-4" />
              שיעורים קיימים (יידלגו — {skipped.length})
            </p>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-amber-200 divide-y">
              {skipped.map((item) => (
                <div key={item.lesson_id} className="flex items-center gap-3 p-2.5 bg-amber-50/50">
                  <span className="text-xs text-amber-600 w-full truncate">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {noMedia.length > 0 && (
          <div className="flex gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{noMedia.length} שיעורים ייובאו ללא קבצי מדיה — ניתן להוסיף מאוחר יותר דרך "קורסים - קהילה".</span>
          </div>
        )}

        <Separator />

        {/* Confirm button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {toImport.length === 0
              ? "אין שיעורים חדשים לייבוא — הכל כבר קיים."
              : `ייובאו ${toImport.length} שיעורים. ניתן לערוך אחרי ייבוא דרך "קורסים - קהילה".`}
          </p>
          <Button
            onClick={onConfirm}
            disabled={toImport.length === 0 || isImporting}
            className="gap-2 min-w-[140px]"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                מייבא...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                אשר ייבוא ({toImport.length})
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export default function ImportContent() {
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [dryRunDone, setDryRunDone] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  const qc = useQueryClient();

  const seriesQuery = useWeeklyChapterSeries();
  const coursesQuery = useCommunityCourses();
  const lessonsQuery = useLessonsForSeries(selectedSeriesId);
  const existingQuery = useExistingCourseLesson(selectedCourseId);

  const selectedSeries = seriesQuery.data?.find((s) => s.id === selectedSeriesId) ?? null;
  const selectedCourse = coursesQuery.data?.find((c) => c.id === selectedCourseId) ?? null;

  const preview: ImportPreviewItem[] | null =
    lessonsQuery.data && existingQuery.data
      ? buildPreview(lessonsQuery.data, existingQuery.data)
      : null;

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (items: ImportPreviewItem[]) => {
      const toImport = items.filter((p) => !p.already_imported);
      if (!selectedCourseId) throw new Error("לא נבחר קורס יעד");
      if (toImport.length === 0) return { imported: 0, skipped: items.length };

      // Build rows — cast to any because the types.ts predates the migration columns
      const rows = toImport.map((item) => ({
        course_id: selectedCourseId,
        title: item.title,
        lesson_number: item.lesson_number,
        audio_url: item.audio_url ?? null,
        video_url: item.video_url ?? null,
        attachment_url: item.attachment_url ?? null,
        // extra columns from migration (not in auto-generated types yet)
        bible_book: item.bible_book ?? null,
        bible_chapter: item.bible_chapter ?? null,
        layer_type: "base",
        status: "published",
        published_at: new Date().toISOString(),
      }));

      const { error } = await (supabase as any)
        .from("community_course_lessons")
        .insert(rows);
      if (error) throw error;

      return { imported: toImport.length, skipped: items.length - toImport.length };
    },
    onSuccess: (result) => {
      setImportResult(result);
      qc.invalidateQueries({ queryKey: ["import-content-existing", selectedCourseId] });
      toast.success(`יובאו ${result.imported} שיעורים בהצלחה`);
    },
    onError: (err: Error) => {
      toast.error(`שגיאה בייבוא: ${err.message}`);
    },
  });

  const handleDryRun = useCallback(() => {
    if (!selectedSeriesId || !selectedCourseId) return;
    setDryRunDone(true);
    setImportResult(null);
  }, [selectedSeriesId, selectedCourseId]);

  const handleReset = useCallback(() => {
    setDryRunDone(false);
    setImportResult(null);
    setSelectedSeriesId(null);
    setSelectedCourseId(null);
  }, []);

  const readyForDryRun =
    selectedSeriesId &&
    selectedCourseId &&
    lessonsQuery.data &&
    existingQuery.data &&
    !lessonsQuery.isLoading &&
    !existingQuery.isLoading;

  // ──────────────────────────────────────────────
  // Success screen
  // ──────────────────────────────────────────────
  if (importResult) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">הייבוא הושלם</h1>
            <p className="text-muted-foreground mt-2">
              {importResult.imported} שיעורים יובאו לקורס "{selectedCourse?.title}".
              {importResult.skipped > 0 && ` ${importResult.skipped} שיעורים נדלגו (היו קיימים).`}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              ייבוא נוסף
            </Button>
            <Button asChild>
              <a href="/admin/community-courses" className="gap-2 inline-flex items-center">
                <BookOpen className="h-4 w-4" />
                עבור לניהול קורסים
              </a>
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ──────────────────────────────────────────────
  // Main UI
  // ──────────────────────────────────────────────
  return (
    <AdminLayout>
      <div dir="rtl" className="max-w-3xl mx-auto space-y-8 py-6 px-4 sm:px-6">

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <a href="/admin" className="hover:text-foreground transition-colors">ניהול</a>
            <ChevronRight className="h-3 w-3" />
            <span>ייבוא תוכן</span>
          </div>
          <h1 className="text-2xl font-display font-bold">ייבוא תוכן הפרק השבועי</h1>
          <p className="text-muted-foreground text-sm">
            מקשר שיעורים קיימים מטבלת הסדרות אל קורסי הקהילה (community_course_lessons).
          </p>
        </div>

        {/* Discovery note */}
        <div className="flex gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">מקור התוכן: סדרות `lessons` ב-S3</p>
            <p>
              כל שיעורי "לב הפרק" יושבים בטבלת הסדרות הרגילה עם audio_url + video_url ב-S3.
              הטבלה <code className="bg-blue-100 px-1 rounded">community_course_lessons</code> ריקה —
              ייבוא זה ייצור את הרשומות שם לראשונה.
            </p>
          </div>
        </div>

        {/* Step 1 — Choose source series */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
              בחר סדרת מקור
            </CardTitle>
          </CardHeader>
          <CardContent>
            {seriesQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                טוען סדרות...
              </div>
            ) : (
              <Select value={selectedSeriesId ?? ""} onValueChange={(v) => {
                setSelectedSeriesId(v || null);
                setDryRunDone(false);
                setImportResult(null);
              }}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="בחר סדרה מהרשימה..." />
                </SelectTrigger>
                <SelectContent>
                  {(seriesQuery.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span>{s.title}</span>
                        <Badge variant="outline" className="text-xs mr-1">
                          {s.lesson_count} שיעורים
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedSeries && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <FileAudio className="h-4 w-4 text-blue-500" />
                <span>
                  {lessonsQuery.isLoading
                    ? "טוען שיעורים..."
                    : `${lessonsQuery.data?.length ?? 0} שיעורים פורסמו`}
                </span>
                {lessonsQuery.data && (
                  <>
                    <span className="mx-1">·</span>
                    <FileVideo className="h-4 w-4 text-purple-500" />
                    <span>
                      {lessonsQuery.data.filter((l) => l.video_url).length} עם וידאו
                    </span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2 — Choose target course */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
              בחר קורס יעד (community_course)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coursesQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                טוען קורסים...
              </div>
            ) : (
              <Select value={selectedCourseId ?? ""} onValueChange={(v) => {
                setSelectedCourseId(v || null);
                setDryRunDone(false);
                setImportResult(null);
              }}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="בחר קורס יעד..." />
                </SelectTrigger>
                <SelectContent>
                  {(coursesQuery.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span>{c.title}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs mr-1 ${c.status === "active" ? "border-emerald-400 text-emerald-700" : ""}`}
                        >
                          {c.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedCourse && existingQuery.data && existingQuery.data.size > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {existingQuery.data.size} שיעורים כבר קיימים בקורס זה — יידלגו בייבוא.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dry Run button */}
        {!dryRunDone && (
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleDryRun}
              disabled={!readyForDryRun}
              className="gap-2 px-8"
            >
              {lessonsQuery.isLoading || existingQuery.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              הצג dry-run
              {selectedSeries && selectedCourse && (
                <ArrowLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Dry Run result */}
        {dryRunDone && preview && selectedCourse && (
          <DryRunReport
            preview={preview}
            courseTitle={selectedCourse.title}
            onConfirm={() => importMutation.mutate(preview)}
            isImporting={importMutation.isPending}
          />
        )}

        {/* Reset */}
        {dryRunDone && (
          <div className="flex justify-start">
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              התחל מחדש
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
