/**
 * Admin · הקדשות — /admin/dedications
 *
 * ניהול "הקדשת שיעור/סדרה": טבלת כל ההקדשות (active/pending/archived),
 * seeding ידני (הקדשה בלי תשלום — לקרובי משפחה, ע"פ בקשת סער/יואב),
 * ועריכת המחירים (dedication_settings — שיעור/סדרה).
 *
 * ⚠️ דורש route ב-App.tsx + פריט ב-AdminSidebar (ראה תיעוד בסוף העבודה).
 * דגם: src/pages/admin/Kenes.tsx (gold/navy/parchment, Kedem/Ploni, RTL).
 */

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Heart, Plus, Trash2, CheckCircle2, Clock, Archive, Settings2, Download } from "lucide-react";
import {
  useAllDedications,
  useCreateDedication,
  useUpdateDedication,
  useDeleteDedication,
  useDedicationSettings,
  useUpdateDedicationSettings,
  DEDICATION_TYPE_LABELS,
  type LessonDedication,
  type DedicationScope,
  type DedicationType,
} from "@/hooks/useLessonDedications";
import { useToast } from "@/hooks/use-toast";

const C = {
  navy: "#1A2744",
  gold: "#8B6F47",
  goldShimmer: "#E8D5A0",
  parchment: "#FAF6F0",
  text: "#2D1F0E",
  textMuted: "#6B5C4A",
  green: "#059669",
  amber: "#b45309",
  red: "#b91c1c",
  slate: "#64748b",
};

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  active: { label: "פעיל", color: C.green, bg: "#dcfce7", icon: CheckCircle2 },
  pending: { label: "ממתין לתשלום", color: C.amber, bg: "#fef3c7", icon: Clock },
  archived: { label: "בארכיון", color: C.slate, bg: "#f1f5f9", icon: Archive },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const emptySeedForm = () => ({
  scope: "lesson" as DedicationScope,
  lesson_id: "",
  series_id: "",
  dedication_type: "iluy_neshama" as DedicationType,
  dedicated_name: "",
  dedicator_name: "",
  message: "",
});

export default function Dedications() {
  const { data: dedications, isLoading } = useAllDedications();
  const updateDedication = useUpdateDedication();
  const deleteDedication = useDeleteDedication();
  const createDedication = useCreateDedication();
  const { data: settings } = useDedicationSettings();
  const updateSettings = useUpdateDedicationSettings();
  const { toast } = useToast();

  const [seedOpen, setSeedOpen] = useState(false);
  const [seedForm, setSeedForm] = useState(emptySeedForm());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lessonPrice, setLessonPrice] = useState(settings?.lesson_price ?? 600);
  const [seriesPrice, setSeriesPrice] = useState(settings?.series_price ?? 1800);
  // רמה 18 (אודיט הקדשות): התמחור הדיפרנציאלי שהשרת אוכף — עכשיו גם עריך מהאדמין
  const [lessonPricePopular, setLessonPricePopular] = useState(settings?.lesson_price_popular ?? 900);
  const [popularMinLessons, setPopularMinLessons] = useState(settings?.popular_rabbi_min_lessons ?? 100);
  const [seriesPriceMid, setSeriesPriceMid] = useState(settings?.series_price_mid ?? 2400);
  const [seriesPriceLarge, setSeriesPriceLarge] = useState(settings?.series_price_large ?? 3200);
  const [seriesMidThreshold, setSeriesMidThreshold] = useState(settings?.series_mid_threshold ?? 21);
  const [seriesLargeThreshold, setSeriesLargeThreshold] = useState(settings?.series_large_threshold ?? 61);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const rows = dedications ?? [];
  const filtered = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((d) => d.status === statusFilter)),
    [rows, statusFilter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { active: 0, pending: 0, archived: 0 };
    for (const d of rows) c[d.status] = (c[d.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const openSettings = () => {
    setLessonPrice(settings?.lesson_price ?? 600);
    setSeriesPrice(settings?.series_price ?? 1800);
    setLessonPricePopular(settings?.lesson_price_popular ?? 900);
    setPopularMinLessons(settings?.popular_rabbi_min_lessons ?? 100);
    setSeriesPriceMid(settings?.series_price_mid ?? 2400);
    setSeriesPriceLarge(settings?.series_price_large ?? 3200);
    setSeriesMidThreshold(settings?.series_mid_threshold ?? 21);
    setSeriesLargeThreshold(settings?.series_large_threshold ?? 61);
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    try {
      await updateSettings.mutateAsync({
        lesson_price: lessonPrice,
        series_price: seriesPrice,
        lesson_price_popular: lessonPricePopular,
        popular_rabbi_min_lessons: popularMinLessons,
        series_price_mid: seriesPriceMid,
        series_price_large: seriesPriceLarge,
        series_mid_threshold: seriesMidThreshold,
        series_large_threshold: seriesLargeThreshold,
      });
      toast({ title: "המחירים עודכנו" });
      setSettingsOpen(false);
    } catch (e: any) {
      toast({ title: "שגיאה בשמירת מחירים", description: e.message, variant: "destructive" });
    }
  };

  // רמה 18: ייצוא CSV — היה חסר רק בעמוד הזה (יש בהזמנות ובתרומות)
  const exportCsv = () => {
    const headers = ["תאריך", "סוג", "שם מוקדש", "שם מקדיש", "טלפון", "אימייל", "היקף", "סכום", "סטטוס"];
    const typeLabel: Record<string, string> = {
      iluy_neshama: "לעילוי נשמת", refua: "לרפואה", hatzlacha: "להצלחה", memory: "לזכר",
    };
    const csvRows = filtered.map((d) => [
      d.created_at ? new Date(d.created_at).toLocaleDateString("he-IL") : "",
      typeLabel[d.dedication_type] || d.dedication_type,
      d.dedicated_name || "",
      d.dedicator_name || "",
      (d as any).dedicator_phone || "",
      (d as any).dedicator_email || "",
      d.scope === "series" ? "סדרה" : "שיעור",
      (d as any).amount ?? "",
      d.status,
    ]);
    const csv = [headers, ...csvRows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dedications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveSeed = async () => {
    if (!seedForm.dedicated_name.trim()) {
      toast({ title: "חסר", description: "נא למלא שם מוקדש", variant: "destructive" });
      return;
    }
    if (seedForm.scope === "lesson" && !seedForm.lesson_id.trim()) {
      toast({ title: "חסר", description: "נא למלא מזהה שיעור (lesson_id)", variant: "destructive" });
      return;
    }
    if (seedForm.scope === "series" && !seedForm.series_id.trim()) {
      toast({ title: "חסר", description: "נא למלא מזהה סדרה (series_id)", variant: "destructive" });
      return;
    }
    try {
      await createDedication.mutateAsync({
        scope: seedForm.scope,
        lesson_id: seedForm.scope === "lesson" ? seedForm.lesson_id.trim() : undefined,
        series_id: seedForm.scope === "series" ? seedForm.series_id.trim() : undefined,
        dedication_type: seedForm.dedication_type,
        dedicated_name: seedForm.dedicated_name.trim(),
        dedicator_name: seedForm.dedicator_name.trim() || undefined,
        message: seedForm.message.trim() || undefined,
        status: "active", // seeding ידני = מאושר מיד, בלי תשלום
      });
      toast({ title: "ההקדשה נוצרה ופעילה" });
      setSeedOpen(false);
      setSeedForm(emptySeedForm());
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const approve = async (d: LessonDedication) => {
    try {
      await updateDedication.mutateAsync({ id: d.id, status: "active" });
      toast({ title: "ההקדשה אושרה" });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const archive = async (d: LessonDedication) => {
    if (!confirm(`להעביר את ההקדשה עבור "${d.dedicated_name}" לארכיון? (לא נמחק, אפשר לשחזר)`)) return;
    try {
      await deleteDedication.mutateAsync(d.id);
      toast({ title: "הועבר לארכיון" });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-kedem font-bold flex items-center gap-2" style={{ color: C.navy }}>
              <Heart className="w-7 h-7" style={{ color: C.gold }} aria-hidden />
              הקדשות
            </h1>
            <p className="font-ploni mt-1" style={{ color: C.textMuted }}>
              {counts.active ?? 0} פעילות · {counts.pending ?? 0} ממתינות לתשלום · {counts.archived ?? 0} בארכיון
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportCsv}
              className="font-ploni gap-1.5"
              style={{ borderColor: C.goldShimmer, color: C.navy }}
            >
              <Download className="h-4 w-4" /> ייצוא CSV ({filtered.length})
            </Button>
            <Button
              variant="outline"
              onClick={openSettings}
              className="font-ploni gap-1.5"
              style={{ borderColor: C.goldShimmer, color: C.navy }}
            >
              <Settings2 className="h-4 w-4" /> מחירים
            </Button>
            <Button
              onClick={() => setSeedOpen(true)}
              className="font-ploni gap-1.5"
              style={{ background: C.navy, color: "#fff" }}
            >
              <Plus className="h-4 w-4" /> הקדשה ידנית
            </Button>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "pending", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-full text-xs font-ploni border transition-colors"
              style={{
                borderColor: statusFilter === s ? C.navy : C.goldShimmer,
                background: statusFilter === s ? C.navy : "#fff",
                color: statusFilter === s ? "#fff" : C.textMuted,
              }}
            >
              {s === "all" ? `הכל (${rows.length})` : `${STATUS_LABEL[s].label} (${counts[s] ?? 0})`}
            </button>
          ))}
        </div>

        <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
          <CardHeader className="pb-2">
            <CardTitle className="font-kedem text-lg" style={{ color: C.navy }}>
              רשימת ההקדשות ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-10 font-ploni" style={{ color: C.textMuted }}>
                טוען…
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right font-ploni">מוקדש ל</TableHead>
                    <TableHead className="text-right font-ploni">סוג</TableHead>
                    <TableHead className="text-right font-ploni">היקף</TableHead>
                    <TableHead className="text-right font-ploni">מקדיש</TableHead>
                    <TableHead className="text-right font-ploni">סכום</TableHead>
                    <TableHead className="text-right font-ploni">אסמכתא</TableHead>
                    <TableHead className="text-right font-ploni">תאריך</TableHead>
                    <TableHead className="text-right font-ploni">סטטוס</TableHead>
                    <TableHead className="text-right font-ploni">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => {
                    const statusInfo = STATUS_LABEL[d.status] ?? STATUS_LABEL.pending;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium" style={{ color: C.text }}>
                          {d.dedicated_name}
                          {d.message && (
                            <div className="text-xs max-w-[220px] truncate" style={{ color: C.textMuted }} title={d.message}>
                              {d.message}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: C.textMuted }}>
                          {DEDICATION_TYPE_LABELS[d.dedication_type] || d.dedication_type}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-ploni">
                            {d.scope === "series" ? "סדרה" : "שיעור"}
                          </Badge>
                          <div dir="ltr" className="text-[10px] mt-1 truncate max-w-[140px]" style={{ color: C.textMuted }}>
                            {d.scope === "series" ? d.series_id : d.lesson_id}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: C.textMuted }}>
                          {d.dedicator_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: C.text }}>
                          {d.amount ? `₪${d.amount.toLocaleString("he-IL")}` : "—"}
                        </TableCell>
                        <TableCell dir="ltr" className="text-left text-xs" style={{ color: C.textMuted }}>
                          {d.payment_asmachta || "—"}
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: C.textMuted }}>
                          {fmtDate(d.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge style={{ background: statusInfo.bg, color: statusInfo.color }} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {d.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="אשר ידנית (למשל אם התשלום התקבל בערוץ אחר)"
                                onClick={() => approve(d)}
                              >
                                <CheckCircle2 className="h-4 w-4" style={{ color: C.green }} />
                              </Button>
                            )}
                            {d.status !== "archived" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="העבר לארכיון"
                                onClick={() => archive(d)}
                              >
                                <Trash2 className="h-4 w-4" style={{ color: C.red }} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 font-ploni" style={{ color: C.textMuted }}>
                        אין הקדשות להצגה
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manual seeding dialog */}
      <Dialog open={seedOpen} onOpenChange={setSeedOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-kedem">הקדשה ידנית (ללא תשלום)</DialogTitle>
          </DialogHeader>
          <p className="text-xs font-ploni -mt-2" style={{ color: C.textMuted }}>
            לשימוש עבור קרובי משפחה / הקדשות שאושרו מחוץ למערכת. נוצרת מיד כ"פעיל".
          </p>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSeedForm((f) => ({ ...f, scope: "lesson" }))}
                className="py-2 rounded-lg text-sm font-ploni border"
                style={{
                  borderColor: seedForm.scope === "lesson" ? C.navy : C.goldShimmer,
                  background: seedForm.scope === "lesson" ? "#eef2ff" : "#fff",
                  color: C.text,
                }}
              >
                שיעור בודד
              </button>
              <button
                type="button"
                onClick={() => setSeedForm((f) => ({ ...f, scope: "series" }))}
                className="py-2 rounded-lg text-sm font-ploni border"
                style={{
                  borderColor: seedForm.scope === "series" ? C.navy : C.goldShimmer,
                  background: seedForm.scope === "series" ? "#eef2ff" : "#fff",
                  color: C.text,
                }}
              >
                סדרה שלמה
              </button>
            </div>

            {seedForm.scope === "lesson" ? (
              <div>
                <Label>מזהה שיעור (lesson_id) *</Label>
                <Input
                  dir="ltr"
                  value={seedForm.lesson_id}
                  onChange={(e) => setSeedForm((f) => ({ ...f, lesson_id: e.target.value }))}
                  placeholder="UUID מטבלת lessons"
                  className="mt-1"
                />
              </div>
            ) : (
              <div>
                <Label>מזהה סדרה (series_id) *</Label>
                <Input
                  dir="ltr"
                  value={seedForm.series_id}
                  onChange={(e) => setSeedForm((f) => ({ ...f, series_id: e.target.value }))}
                  placeholder="UUID מטבלת series"
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label>סוג הקדשה</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(Object.keys(DEDICATION_TYPE_LABELS) as DedicationType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSeedForm((f) => ({ ...f, dedication_type: t }))}
                    className="py-2 rounded-lg text-xs font-ploni border"
                    style={{
                      borderColor: seedForm.dedication_type === t ? C.navy : C.goldShimmer,
                      background: seedForm.dedication_type === t ? "#eef2ff" : "#fff",
                      color: C.text,
                    }}
                  >
                    {DEDICATION_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>שם המוקדש *</Label>
              <Input
                value={seedForm.dedicated_name}
                onChange={(e) => setSeedForm((f) => ({ ...f, dedicated_name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>שם המקדיש (רשות)</Label>
              <Input
                value={seedForm.dedicator_name}
                onChange={(e) => setSeedForm((f) => ({ ...f, dedicator_name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>הודעה (רשות)</Label>
              <Textarea
                value={seedForm.message}
                onChange={(e) => setSeedForm((f) => ({ ...f, message: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                ביטול
              </Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={saveSeed}
              disabled={createDedication.isPending}
              style={{ background: C.navy, color: "#fff" }}
            >
              {createDedication.isPending ? "יוצר…" : "צור הקדשה פעילה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price settings dialog — רמה 18: כולל התמחור הדיפרנציאלי שהשרת אוכף */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-kedem">מחירי הקדשה</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>שיעור בודד (₪)</Label>
                <Input
                  type="number"
                  min={0}
                  value={lessonPrice}
                  onChange={(e) => setLessonPrice(Number(e.target.value))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>שיעור של רב מבוקש (₪)</Label>
                <Input
                  type="number"
                  min={0}
                  value={lessonPricePopular}
                  onChange={(e) => setLessonPricePopular(Number(e.target.value))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>רב נחשב "מבוקש" החל מ- (מספר שיעורים)</Label>
              <Input
                type="number"
                min={0}
                value={popularMinLessons}
                onChange={(e) => setPopularMinLessons(Number(e.target.value))}
                dir="ltr"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>סדרה רגילה (₪)</Label>
                <Input
                  type="number"
                  min={0}
                  value={seriesPrice}
                  onChange={(e) => setSeriesPrice(Number(e.target.value))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>סדרה בינונית (₪)</Label>
                <Input
                  type="number"
                  min={0}
                  value={seriesPriceMid}
                  onChange={(e) => setSeriesPriceMid(Number(e.target.value))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>סדרה גדולה (₪)</Label>
                <Input
                  type="number"
                  min={0}
                  value={seriesPriceLarge}
                  onChange={(e) => setSeriesPriceLarge(Number(e.target.value))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>סדרה "בינונית" החל מ- (שיעורים)</Label>
                <Input
                  type="number"
                  min={0}
                  value={seriesMidThreshold}
                  onChange={(e) => setSeriesMidThreshold(Number(e.target.value))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>סדרה "גדולה" החל מ- (שיעורים)</Label>
                <Input
                  type="number"
                  min={0}
                  value={seriesLargeThreshold}
                  onChange={(e) => setSeriesLargeThreshold(Number(e.target.value))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-xs font-ploni" style={{ color: C.textMuted }}>
              המחירים נאכפים בשרת בזמן התשלום — מה שמוגדר כאן הוא מה שנגבה בפועל.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                ביטול
              </Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={saveSettings}
              disabled={updateSettings.isPending}
              style={{ background: C.navy, color: "#fff" }}
            >
              {updateSettings.isPending ? "שומר…" : "שמור מחירים"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
