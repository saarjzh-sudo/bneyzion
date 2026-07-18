/**
 * Promos — ניהול באנרים / פופאפים / רצועות-כנס (מסך אדמין ל-T09).
 *
 * הטבלה `public.promos` מוגדרת במיגרציית T09 (20260701_promos.sql).
 * הצד הציבורי (PromoProvider) קורא רק is_active=true; המסך הזה מנהל הכל.
 * ⚠️ פופאפ מדוכא כברירת-מחדל בדפי מוצר ולמידה (suppress_on_product/learning).
 */
import { useRef, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Plus, Trash2, Pencil, UploadCloud, Loader2, Film, Image as ImageIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { PAGE_TYPES, AUDIENCES } from "@/components/promo/targeting";

// ── העלאת מדיה לפופאפ (תמונה/וידאו) — אותו bucket כמו שיעורים ──────
const uploadPromoMedia = async (file: File): Promise<string> => {
  const ext = file.name.split(".").pop();
  const path = `promos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("lesson-files").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("lesson-files").getPublicUrl(path);
  return data.publicUrl;
};

// הטבלה promos נוצרה אחרי חילול הטיפוסים — עוקפים את הסכמה המקומפלת.
const promosTable = () => (supabase as any).from("promos");

interface PromoRow {
  id: string;
  type: "banner" | "popup" | "conference";
  title: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  video_url: string | null;
  placement: "home" | "content" | null;
  mobile_image_url: string | null;
  page_types: string[] | null;
  audiences: string[] | null;
  priority: number;
  frequency: "always" | "session" | "once" | "daily";
  dismissible: boolean;
  suppress_on_product: boolean;
  suppress_on_learning: boolean;
  theme: "gold" | "olive" | "navy";
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<PromoRow["type"], string> = {
  banner: "באנר תמונה",
  popup: "פופאפ",
  conference: "רצועת כנס",
};

const FREQ_LABELS: Record<PromoRow["frequency"], string> = {
  always: "בכל ביקור",
  session: "פעם בביקור",
  once: "פעם אחת בלבד",
  daily: "פעם ביום",
};

const THEME_LABELS: Record<PromoRow["theme"], string> = {
  gold: "זהב",
  olive: "זית",
  navy: "כחול עמוק",
};

interface PromoForm {
  type: PromoRow["type"];
  title: string;
  body: string;
  cta_label: string;
  cta_url: string;
  image_url: string;
  video_url: string;
  placement: "home" | "content";
  mobile_image_url: string;
  page_types: string[];
  audiences: string[];
  priority: string;
  popup_delay_seconds: string;
  frequency: PromoRow["frequency"];
  dismissible: boolean;
  suppress_on_product: boolean;
  suppress_on_learning: boolean;
  theme: PromoRow["theme"];
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

const emptyForm: PromoForm = {
  type: "popup",
  title: "",
  body: "",
  cta_label: "",
  cta_url: "",
  image_url: "",
  video_url: "",
  placement: "content",
  mobile_image_url: "",
  page_types: [],
  audiences: [],
  priority: "0",
  popup_delay_seconds: "3",
  frequency: "session",
  dismissible: true,
  suppress_on_product: true,
  suppress_on_learning: true,
  theme: "gold",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

function rowToForm(row: PromoRow): PromoForm {
  const toLocal = (ts: string | null) => (ts ? ts.slice(0, 16) : "");
  return {
    type: row.type,
    title: row.title ?? "",
    body: row.body ?? "",
    cta_label: row.cta_label ?? "",
    cta_url: row.cta_url ?? "",
    image_url: row.image_url ?? "",
    video_url: row.video_url ?? "",
    placement: row.placement ?? "content",
    mobile_image_url: row.mobile_image_url ?? "",
    page_types: row.page_types ?? [],
    audiences: row.audiences ?? [],
    priority: String(row.priority ?? 0),
    popup_delay_seconds: String((row as any).popup_delay_seconds ?? 3),
    frequency: row.frequency,
    dismissible: row.dismissible,
    suppress_on_product: row.suppress_on_product,
    suppress_on_learning: row.suppress_on_learning,
    theme: row.theme,
    starts_at: toLocal(row.starts_at),
    ends_at: toLocal(row.ends_at),
    is_active: row.is_active,
  };
}

function formToPayload(form: PromoForm) {
  return {
    type: form.type,
    title: form.title.trim() || null,
    body: form.body.trim() || null,
    cta_label: form.cta_label.trim() || null,
    cta_url: form.cta_url.trim() || null,
    image_url: form.image_url.trim() || null,
    video_url: form.video_url.trim() || null,
    placement: form.placement,
    mobile_image_url: form.mobile_image_url.trim() || null,
    page_types: form.page_types,
    audiences: form.audiences,
    priority: parseInt(form.priority) || 0,
    popup_delay_seconds: Math.max(0, parseInt(form.popup_delay_seconds) || 3),
    frequency: form.frequency,
    dismissible: form.dismissible,
    suppress_on_product: form.suppress_on_product,
    suppress_on_learning: form.suppress_on_learning,
    theme: form.theme,
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    is_active: form.is_active,
  };
}

/**
 * PromoMediaField — גוררים תמונה או וידאו (או לוחצים לבחירה) → עולה ל-Storage
 * ומתמלא image_url / video_url אוטומטית. וידאו + תמונה ביחד = התמונה משמשת poster.
 */
function PromoMediaField({ imageUrl, videoUrl, onImage, onVideo, mobileImageUrl, onMobileImage, bannerMode }: {
  imageUrl: string;
  videoUrl: string;
  onImage: (url: string) => void;
  onVideo: (url: string) => void;
  /** מצב באנר: בלי וידאו, עם נכס מובייל נפרד (יחס ~3:1) */
  mobileImageUrl?: string;
  onMobileImage?: (url: string) => void;
  bannerMode?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // יואב 17.7 + סער: "אסדר שלא יהיה אפשר להעלות באנר במידה לא נכונה" —
  // באנר = רצועה נמוכה ורחבה, יחס רוחב:גובה של לפחות 2.5:1.
  const checkBannerRatio = (file: File): Promise<boolean> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        URL.revokeObjectURL(url);
        if (ratio < 2.5) {
          toast.error(
            `התמונה ${img.width}×${img.height} גבוהה מדי לבאנר — צריך רצועה רחבה ונמוכה (יחס לפחות 2.5:1, למשל 1280×360)`,
          );
          resolve(false);
        } else resolve(true);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(true); };
      img.src = url;
    });

  const handleFiles = async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          if (bannerMode && !(await checkBannerRatio(file))) continue;
          onImage(await uploadPromoMedia(file));
          toast.success("התמונה הועלתה");
        } else if (file.type.startsWith("video/") && !bannerMode) {
          onVideo(await uploadPromoMedia(file));
          toast.success("הווידאו הועלה");
        } else {
          toast.error(bannerMode ? `באנר = תמונה בלבד — ${file.name}` : `רק תמונה או וידאו — ${file.name}`);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ההעלאה נכשלה");
    } finally {
      setUploading(false);
    }
  };

  const handleMobileFile = async (file: File | undefined) => {
    if (!file || !onMobileImage) return;
    if (!file.type.startsWith("image/")) { toast.error("תמונה בלבד"); return; }
    if (!(await checkBannerRatio(file))) return;
    setUploading(true);
    try {
      onMobileImage(await uploadPromoMedia(file));
      toast.success("תמונת המובייל הועלתה");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ההעלאה נכשלה");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{bannerMode ? "תמונת הבאנר (רוחבית, ~1600×280)" : "מדיה לפופאפ — תמונה או וידאו"}</Label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(Array.from(e.dataTransfer.files ?? []));
        }}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-colors ${
          dragging ? "border-amber-500 bg-amber-50" : "border-border bg-muted/30 hover:bg-muted/60"
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-amber-600" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">מעלה…</span>
          </>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium">
              {dragging ? "שחררו כאן" : "גררו תמונה או וידאו — או לחצו לבחירה"}
            </span>
            <span className="text-xs text-muted-foreground">וידאו + תמונה ביחד: התמונה תוצג עד שהווידאו נטען</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={bannerMode ? "image/*" : "image/*,video/*"}
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {(imageUrl || videoUrl) && (
        <div className="grid grid-cols-2 gap-2">
          {imageUrl && (
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img src={imageUrl} alt="תמונת הפופאפ" className="w-full h-24 object-cover" />
              <span className="absolute bottom-1 right-1 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                <ImageIcon className="h-3 w-3" aria-hidden="true" />תמונה
              </span>
              <button type="button" onClick={() => onImage("")} aria-label="הסרת התמונה"
                className="absolute top-1 left-1 h-6 w-6 rounded-full bg-black/60 text-white text-xs leading-none hover:bg-destructive">
                ✕
              </button>
            </div>
          )}
          {videoUrl && (
            <div className="relative rounded-lg overflow-hidden border border-border bg-black">
              <video src={videoUrl} muted playsInline className="w-full h-24 object-cover" />
              <span className="absolute bottom-1 right-1 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                <Film className="h-3 w-3" aria-hidden="true" />וידאו
              </span>
              <button type="button" onClick={() => onVideo("")} aria-label="הסרת הווידאו"
                className="absolute top-1 left-1 h-6 w-6 rounded-full bg-black/60 text-white text-xs leading-none hover:bg-destructive">
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {bannerMode && onMobileImage && (
        <div className="flex items-center gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={() => mobileInputRef.current?.click()} disabled={uploading}>
            {mobileImageUrl ? "החלפת תמונת מובייל" : "העלאת תמונת מובייל (~900×280)"}
          </Button>
          {mobileImageUrl && (
            <>
              <img src={mobileImageUrl} alt="תמונת מובייל" className="h-9 w-24 object-cover rounded border border-border" />
              <button type="button" onClick={() => onMobileImage("")} aria-label="הסרת תמונת המובייל"
                className="h-6 w-6 rounded-full bg-black/60 text-white text-xs leading-none hover:bg-destructive">✕</button>
            </>
          )}
          <input ref={mobileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { void handleMobileFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      )}
    </div>
  );
}

function usePromosAdmin() {
  return useQuery({
    queryKey: ["admin-promos"],
    queryFn: async (): Promise<PromoRow[]> => {
      const { data, error } = await promosTable()
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PromoRow[];
    },
  });
}

export default function Promos() {
  const { data: promos, isLoading } = usePromosAdmin();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromoForm>(emptyForm);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-promos"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = formToPayload(form);
      if (!payload.image_url && !payload.video_url) throw new Error("חסרה מדיה — פופאפ/באנר הם תמונה (או וידאו) לחיצה");
      if (!payload.title) throw new Error("חסר שם פנימי לפרסום (לזיהוי ברשימה)");
      const { error } = editingId
        ? await promosTable().update(payload).eq("id", editingId)
        : await promosTable().insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(editingId ? "הפרסום עודכן" : "הפרסום נוצר");
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message || "השמירה נכשלה"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await promosTable().update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("עדכון הסטטוס נכשל"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: delRows, error } = await promosTable().delete().eq("id", id).select("id");
      if (error) throw error;
      if (!delRows?.length) throw new Error("המחיקה לא בוצעה — אין הרשאת מחיקה (RLS).");
    },
    onSuccess: () => {
      invalidate();
      toast.success("הפרסום נמחק");
    },
    onError: () => toast.error("המחיקה נכשלה"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: PromoRow) => {
    setEditingId(row.id);
    setForm(rowToForm(row));
    setDialogOpen(true);
  };

  const set = <K extends keyof PromoForm>(key: K, value: PromoForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <AdminLayout>
      <div dir="rtl" className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-display text-foreground flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" aria-hidden="true" />
              פופאפים
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              פופאפ תמונה או וידאו בכל דפי האתר (החלטת סער 8.7: בלי באנרים). לא קופץ בדפי מוצר ולמידה, אלא אם מבטלים את הדיכוי.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden="true" />
            פרסום חדש
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">כל הפרסומים {promos ? `(${promos.length})` : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">טוען…</p>
            ) : !promos?.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                אין עדיין פרסומים. "פרסום חדש" יוצר באנר, פופאפ או רצועת כנס שיופיעו באתר מיד.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">סוג</TableHead>
                    <TableHead className="text-right">כותרת</TableHead>
                    <TableHead className="text-right">תדירות</TableHead>
                    <TableHead className="text-right">תזמון</TableHead>
                    <TableHead className="text-right">פעיל</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promos.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Badge variant={row.type === "popup" ? "default" : "secondary"}>
                          {TYPE_LABELS[row.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="truncate font-medium">{row.title || "(ללא כותרת)"}</div>
                        {row.body && (
                          <div className="truncate text-xs text-muted-foreground">{row.body}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{FREQ_LABELS[row.frequency]}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {row.starts_at || row.ends_at ? (
                          <>
                            {row.starts_at ? new Date(row.starts_at).toLocaleDateString("he-IL") : "—"}
                            {" ← "}
                            {row.ends_at ? new Date(row.ends_at).toLocaleDateString("he-IL") : "ללא סוף"}
                          </>
                        ) : (
                          "תמידי"
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={row.is_active}
                          onCheckedChange={(v) => toggleMutation.mutate({ id: row.id, is_active: v })}
                          aria-label={`הפעלת ${row.title || TYPE_LABELS[row.type]}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="עריכה">
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm("למחוק את הפרסום הזה לצמיתות?")) deleteMutation.mutate(row.id);
                            }}
                            aria-label="מחיקה"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "עריכת פרסום" : "פרסום חדש"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="promo-type">סוג</Label>
                  <Select value={form.type} onValueChange={(v) => set("type", v as PromoForm["type"])}>
                    <SelectTrigger id="promo-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popup">פופאפ — תמונה לחיצה</SelectItem>
                      <SelectItem value="banner">באנר תמונה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.type === "banner" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="promo-placement">מיקום</Label>
                    <Select value={form.placement} onValueChange={(v) => set("placement", v as PromoForm["placement"])}>
                      <SelectTrigger id="promo-placement"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="content">עמודי התוכן (רצועה עליונה מתחת להדר)</SelectItem>
                        <SelectItem value="home">דף הבית (מתחת להירו)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="promo-theme">צבע</Label>
                    <Select value={form.theme} onValueChange={(v) => set("theme", v as PromoForm["theme"])}>
                      <SelectTrigger id="promo-theme"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(THEME_LABELS) as PromoRow["theme"][]).map((t) => (
                          <SelectItem key={t} value={t}>{THEME_LABELS[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* יואב 17.7: פופאפ/באנר = תמונה + כפתור בלבד. הכותרת נשארת כשם
                  פנימי לרשימה, שדה "גוף ההודעה" הוסר (לא מוצג באתר ורק בלבל). */}
              <div className="space-y-1.5">
                <Label htmlFor="promo-title">שם הפרסום (פנימי — לא מוצג באתר)</Label>
                <Input id="promo-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="למשל: קמפיין ספר יהושע" />
                <p className="text-xs text-muted-foreground">מה שהגולש רואה: התמונה/וידאו + כפתור מתחתיה. אין כותרת או טקסט על הפופאפ.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="promo-cta-label">טקסט כפתור</Label>
                  <Input id="promo-cta-label" value={form.cta_label} onChange={(e) => set("cta_label", e.target.value)} placeholder="להרשמה" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="promo-cta-url">קישור הכפתור</Label>
                  <Input id="promo-cta-url" dir="ltr" value={form.cta_url} onChange={(e) => set("cta_url", e.target.value)} placeholder="/kenes" />
                </div>
              </div>

              {form.type === "popup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="promo-delay">אחרי כמה שניות לקפוץ</Label>
                  <Input
                    id="promo-delay"
                    type="number"
                    min={0}
                    max={120}
                    value={form.popup_delay_seconds}
                    onChange={(e) => set("popup_delay_seconds", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">שלא יקפוץ מיד — נותנים לגולש רגע לראות את הדף (מומלץ 3–8 שניות).</p>
                </div>
              )}

              <PromoMediaField
                imageUrl={form.image_url}
                videoUrl={form.video_url}
                onImage={(url) => set("image_url", url)}
                onVideo={(url) => set("video_url", url)}
                mobileImageUrl={form.type === "banner" ? form.mobile_image_url : undefined}
                onMobileImage={form.type === "banner" ? ((url) => set("mobile_image_url", url)) : undefined}
                bannerMode={form.type === "banner"}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="promo-freq">תדירות הופעה</Label>
                  <Select value={form.frequency} onValueChange={(v) => set("frequency", v as PromoForm["frequency"])}>
                    <SelectTrigger id="promo-freq"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FREQ_LABELS) as PromoRow["frequency"][]).map((f) => (
                        <SelectItem key={f} value={f}>{FREQ_LABELS[f]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="promo-priority">עדיפות (גבוה מנצח)</Label>
                  <Input id="promo-priority" type="number" value={form.priority} onChange={(e) => set("priority", e.target.value)} />
                </div>
              </div>

              {/* ── טרגוט חכם (8.7): סוגי דפים + סוגי גולשים — ריק = כולם ── */}
              <div className="space-y-2 rounded-lg border border-border/60 p-3">
                <Label className="font-semibold">באילו דפים להציג? <span className="font-normal text-xs text-muted-foreground">(בלי סימון = בכל האתר)</span></Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PAGE_TYPES.map((pt) => (
                    <label key={pt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.page_types.includes(pt.value)}
                        onCheckedChange={(v) => set("page_types", v
                          ? [...form.page_types, pt.value]
                          : form.page_types.filter((x) => x !== pt.value))}
                      />
                      {pt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-border/60 p-3">
                <Label className="font-semibold">לאילו גולשים להציג? <span className="font-normal text-xs text-muted-foreground">(בלי סימון = לכולם)</span></Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {AUDIENCES.map((a) => (
                    <label key={a.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.audiences.includes(a.value)}
                        onCheckedChange={(v) => set("audiences", v
                          ? [...form.audiences, a.value]
                          : form.audiences.filter((x) => x !== a.value))}
                      />
                      {a.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="promo-start">מתחיל</Label>
                  <Input id="promo-start" type="datetime-local" dir="ltr" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="promo-end">מסתיים</Label>
                  <Input id="promo-end" type="datetime-local" dir="ltr" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
                </div>
              </div>

              <div className="space-y-2.5 rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="promo-dismissible" className="font-normal">אפשר לסגור</Label>
                  <Switch id="promo-dismissible" checked={form.dismissible} onCheckedChange={(v) => set("dismissible", v)} />
                </div>
                {form.type === "popup" && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="promo-sup-product" className="font-normal">לא לקפוץ בדפי מוצר</Label>
                      <Switch id="promo-sup-product" checked={form.suppress_on_product} onCheckedChange={(v) => set("suppress_on_product", v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="promo-sup-learning" className="font-normal">לא לקפוץ בדפי למידה</Label>
                      <Switch id="promo-sup-learning" checked={form.suppress_on_learning} onCheckedChange={(v) => set("suppress_on_learning", v)} />
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <Label htmlFor="promo-active" className="font-normal">פעיל</Label>
                  <Switch id="promo-active" checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "שומר…" : editingId ? "עדכון" : "יצירה"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
