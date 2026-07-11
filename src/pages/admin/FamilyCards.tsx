/**
 * FamilyCards (admin) — ניהול כרטיסיות "תנ״ך למשפחה".
 *
 * 11.7.2026 (הערת סער): תוכן הכרטיסיות עבר מ-hardcoded בקוד לטבלת family_cards,
 * והאדמין שולט בו מכאן — כותרת, תיאור, תמונה (URL), לינק, סדר, הפעלה/כיבוי,
 * והאם הכרטיס מופיע גם בסקשן דף-הבית (show_on_home, עם כותרת/תיאור חלופיים).
 *
 * צרכני הטבלה: /family-tanach (כל הפעילים) + סקשן "תנ״ך למשפחה" בדף הבית
 * (רק show_on_home=true). RLS: קריאה ציבורית לפעילים בלבד, כתיבה לאדמין
 * (admin_write_level14) — לכן העריכה כאן עובדת רק למשתמש עם role=admin.
 * התמונות: אקוורל 16:9 ב-storage product-images/family-cards/
 * (נוצרות ב-scripts/gen_family_card_images.py).
 */
import { useState } from "react";
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
import { BookHeart, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const cardsTable = () => (supabase as any).from("family_cards");

interface FamilyCardRow {
  id: string;
  card_key: string;
  title: string;
  description: string | null;
  href: string;
  image_url: string | null;
  badge: string | null;
  home_title: string | null;
  home_description: string | null;
  show_on_home: boolean;
  sort_order: number;
  is_active: boolean;
}

function useAdminFamilyCards() {
  return useQuery({
    queryKey: ["admin-family-cards"],
    queryFn: async (): Promise<FamilyCardRow[]> => {
      const { data, error } = await cardsTable()
        .select("id, card_key, title, description, href, image_url, badge, home_title, home_description, show_on_home, sort_order, is_active")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as FamilyCardRow[];
    },
  });
}

// אחרי כל שינוי מרעננים גם את השאילתות הציבוריות — הדף והבית מתעדכנים מיד.
const PUBLIC_KEYS = [["admin-family-cards"], ["family-cards"]] as const;

const FIELDS: { key: keyof FamilyCardRow; label: string; textarea?: boolean; ltr?: boolean; hint?: string }[] = [
  { key: "title", label: "כותרת" },
  { key: "description", label: "תיאור", textarea: true },
  { key: "href", label: "לינק (נתיב באתר)", ltr: true, hint: "למשל /parasha או /series/{id}" },
  { key: "image_url", label: "קישור תמונה", ltr: true },
  { key: "badge", label: "תגית (badge)", hint: "למשל: מתעדכן שבועית. ריק = בלי תגית" },
  { key: "home_title", label: "כותרת לדף הבית", hint: "ריק = הכותרת הרגילה" },
  { key: "home_description", label: "תיאור לדף הבית", textarea: true, hint: "ריק = התיאור הרגיל" },
];

function FamilyCardDialog({ card, onClose }: { card: FamilyCardRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FamilyCardRow>(card);

  const save = useMutation({
    mutationFn: async () => {
      const { id, card_key: _key, ...rest } = form;
      // שדות-טקסט ריקים נשמרים כ-NULL (ה-UI מציג אז את ברירת-המחדל)
      const payload: Record<string, unknown> = { ...rest };
      for (const k of ["description", "image_url", "badge", "home_title", "home_description"] as const) {
        if (typeof payload[k] === "string" && !(payload[k] as string).trim()) payload[k] = null;
      }
      const { error } = await cardsTable().update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      PUBLIC_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [...k] }));
      toast.success(`"${form.title}" נשמר`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "השמירה נכשלה"),
  });

  const set = (k: keyof FamilyCardRow, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>עריכת כרטיס — {card.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {form.image_url && (
            <img src={form.image_url} alt="" className="w-full aspect-video object-cover rounded-lg border border-border/60" />
          )}
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`fc-${f.key}`}>{f.label}</Label>
              {f.textarea ? (
                <Textarea id={`fc-${f.key}`} rows={2} value={String(form[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
              ) : (
                <Input id={`fc-${f.key}`} dir={f.ltr ? "ltr" : "rtl"} value={String(form[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
              )}
              {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
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

// FamilyCardsContent = הליבה בלי AdminLayout — מוטמעת ב"עריכת תוכן" (/admin/content?tab=family).
export function FamilyCardsContent() {
  const qc = useQueryClient();
  const { data: cards, isLoading } = useAdminFamilyCards();
  const [editing, setEditing] = useState<FamilyCardRow | null>(null);

  const invalidate = () => PUBLIC_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [...k] }));

  const toggle = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: "is_active" | "show_on_home"; value: boolean }) => {
      const { error } = await cardsTable().update({ [field]: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message || "העדכון נכשל"),
  });

  // הזזה בסדר: החלפת sort_order עם השכן (שני עדכונים עוקבים)
  const move = useMutation({
    mutationFn: async ({ row, dir }: { row: FamilyCardRow; dir: -1 | 1 }) => {
      const sorted = [...(cards ?? [])].sort((a, b) => a.sort_order - b.sort_order);
      const idx = sorted.findIndex((c) => c.id === row.id);
      const other = sorted[idx + dir];
      if (!other) return;
      const { error: e1 } = await cardsTable().update({ sort_order: other.sort_order }).eq("id", row.id);
      if (e1) throw e1;
      const { error: e2 } = await cardsTable().update({ sort_order: row.sort_order }).eq("id", other.id);
      if (e2) throw e2;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message || "שינוי הסדר נכשל"),
  });

  return (
    <>
      <div dir="rtl" className="space-y-6">
        <div>
          <h1 className="text-2xl font-display text-foreground flex items-center gap-2">
            <BookHeart className="h-6 w-6 text-primary" aria-hidden="true" />
            תנ״ך למשפחה
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            הכרטיסיות של עמוד תנ״ך למשפחה וסקשן דף הבית. עריכה מתעדכנת מיד באתר החי.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">כרטיסיות {cards ? `(${cards.length})` : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">טוען…</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">סדר</TableHead>
                    <TableHead className="text-right">תמונה</TableHead>
                    <TableHead className="text-right">כותרת</TableHead>
                    <TableHead className="text-right">לינק</TableHead>
                    <TableHead className="text-right">תגית</TableHead>
                    <TableHead className="text-right">בדף הבית</TableHead>
                    <TableHead className="text-right">פעיל</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards?.map((c, i) => (
                    <TableRow key={c.id} className={c.is_active ? "" : "opacity-55"}>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6"
                            disabled={i === 0 || move.isPending}
                            onClick={() => move.mutate({ row: c, dir: -1 })}
                            aria-label={`העלאת "${c.title}" בסדר`}
                          >
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6"
                            disabled={i === (cards?.length ?? 0) - 1 || move.isPending}
                            onClick={() => move.mutate({ row: c, dir: 1 })}
                            aria-label={`הורדת "${c.title}" בסדר`}
                          >
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.image_url ? (
                          <img src={c.image_url} alt="" className="h-9 w-16 object-cover rounded" />
                        ) : (
                          <span className="text-xs text-muted-foreground">חסרה</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate font-medium">{c.title}</TableCell>
                      <TableCell dir="ltr" className="max-w-[180px] truncate text-xs text-muted-foreground">{c.href}</TableCell>
                      <TableCell>
                        {c.badge ? <Badge variant="secondary">{c.badge}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={c.show_on_home}
                          onCheckedChange={(v) => toggle.mutate({ id: c.id, field: "show_on_home", value: v })}
                          aria-label={`הצגת "${c.title}" בדף הבית`}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={c.is_active}
                          onCheckedChange={(v) => toggle.mutate({ id: c.id, field: "is_active", value: v })}
                          aria-label={`הפעלת "${c.title}"`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setEditing(c)} aria-label={`עריכת "${c.title}"`}>
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

      {editing && <FamilyCardDialog card={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

// עמוד עצמאי (לא מחוּוט כרגע ל-App.tsx — הגישה דרך /admin/content?tab=family)
export default function FamilyCards() {
  return (
    <AdminLayout>
      <FamilyCardsContent />
    </AdminLayout>
  );
}
