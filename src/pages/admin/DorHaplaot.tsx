/**
 * DorHaplaot (admin) — ניהול תוכן "דור הפלאות".
 *
 * מנהל את הטבלאות שהעמוד הציבורי (src/pages/DorHaplaot.tsx) קורא מהן:
 *   • miracles         — 70 פלאות (כותרת, פרק, גוף, פסוק, תמונה, סטטוס, תזמון)
 *   • dor_site_content — בלוקי-תוכן של הדף (הקדמה וכו')
 * המדיה (image_url) יושבת ב-Supabase storage; כאן עורכים את הקישור + תצוגה מקדימה.
 */
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const miraclesTable = () => (supabase as any).from("miracles");
const contentTable = () => (supabase as any).from("dor_site_content");

interface Miracle {
  number: number;
  title: string | null;
  chapter_number: number | null;
  body_intro: string | null;
  body_miracle: string | null;
  body_biblical: string | null;
  body_personal: string | null;
  verse_text: string | null;
  verse_source: string | null;
  cta_text: string | null;
  status: string | null;
  image_url: string | null;
  publish_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  published: "פורסם",
  draft: "טיוטה",
  scheduled: "מתוזמן",
};

function useMiracles() {
  return useQuery({
    queryKey: ["admin-miracles"],
    queryFn: async (): Promise<Miracle[]> => {
      const { data, error } = await miraclesTable()
        .select("number, title, chapter_number, body_intro, body_miracle, body_biblical, body_personal, verse_text, verse_source, cta_text, status, image_url, publish_at")
        .order("number", { ascending: true });
      if (error) throw error;
      return data as Miracle[];
    },
  });
}

const FIELDS: { key: keyof Miracle; label: string; textarea?: boolean }[] = [
  { key: "title", label: "כותרת" },
  { key: "chapter_number", label: "מספר פרק" },
  { key: "status", label: "סטטוס" },
  { key: "image_url", label: "קישור תמונה" },
  { key: "verse_text", label: "פסוק", textarea: true },
  { key: "verse_source", label: "מקור הפסוק" },
  { key: "body_intro", label: "פתיחה", textarea: true },
  { key: "body_miracle", label: "הפלא", textarea: true },
  { key: "body_biblical", label: "בתנ״ך", textarea: true },
  { key: "body_personal", label: "אישי", textarea: true },
  { key: "cta_text", label: "קריאה לפעולה" },
];

function MiracleDialog({ miracle, onClose }: { miracle: Miracle; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Miracle>(miracle);

  const save = useMutation({
    mutationFn: async () => {
      const { number, ...rest } = form;
      const payload = { ...rest, chapter_number: rest.chapter_number ? Number(rest.chapter_number) : null };
      const { error } = await miraclesTable().update(payload).eq("number", number);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-miracles"] });
      toast.success(`פלא ${form.number} נשמר`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "השמירה נכשלה"),
  });

  const set = (k: keyof Miracle, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>עריכת פלא #{form.number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {form.image_url && (
            <img src={form.image_url} alt="" className="w-full h-36 object-cover rounded-lg border border-border/60" />
          )}
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`m-${f.key}`}>{f.label}</Label>
              {f.key === "status" ? (
                <Select value={String(form.status ?? "draft")} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger id="m-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(STATUS_LABELS).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.textarea ? (
                <Textarea id={`m-${f.key}`} rows={3} value={String(form[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
              ) : (
                <Input id={`m-${f.key}`} dir={f.key === "image_url" ? "ltr" : "rtl"} value={String(form[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>ביטול</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "שומר…" : "שמירה"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// DorHaplaotContent = הליבה בלי AdminLayout — מוטמעת גם ב"עריכת תוכן" (/admin/content).
export function DorHaplaotContent() {
  const { data: miracles, isLoading } = useMiracles();
  const [editing, setEditing] = useState<Miracle | null>(null);

  return (
    <>
      <div dir="rtl" className="space-y-6">
        <div>
          <h1 className="text-2xl font-display text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
            דור הפלאות
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ניהול הפלאות, הפסוקים והמדיה של הדף. עריכה מתעדכנת מיד באתר החי.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">הפלאות {miracles ? `(${miracles.length})` : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">טוען…</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">כותרת</TableHead>
                    <TableHead className="text-right">פרק</TableHead>
                    <TableHead className="text-right">תמונה</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {miracles?.map((m) => (
                    <TableRow key={m.number}>
                      <TableCell>{m.number}</TableCell>
                      <TableCell className="max-w-[260px] truncate font-medium">{m.title || "(ללא כותרת)"}</TableCell>
                      <TableCell>{m.chapter_number ?? "—"}</TableCell>
                      <TableCell>
                        {m.image_url ? (
                          <img src={m.image_url} alt="" className="h-9 w-14 object-cover rounded" />
                        ) : (
                          <span className="text-xs text-muted-foreground">חסר</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.status === "published" ? "default" : "secondary"}>
                          {STATUS_LABELS[m.status ?? "draft"] ?? m.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setEditing(m)} aria-label="עריכה">
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {editing && <MiracleDialog miracle={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

// עמוד עצמאי — /admin/dor-haplaot (העטיפה היחידה שמוסיפה AdminLayout)
export default function DorHaplaot() {
  return (
    <AdminLayout>
      <DorHaplaotContent />
    </AdminLayout>
  );
}
