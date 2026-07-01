/**
 * Admin · כנסים — /admin/kenes
 *
 * ניהול דפי-כנס: יצירה/עריכה/הפעלה, כולל נתוני נרשמים+צפיות.
 * דאטה חי מטבלת `events` (RLS: ציבור קורא is_active, admin הכל).
 * שפת-האתר: gold/parchment/navy · Kedem/Ploni · RTL.
 *
 * ⚠️ דורש route ב-App.tsx (אזור T14) — ראה _DONE.md.
 */

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { CalendarDays, Plus, Pencil, Trash2, Eye, Users2, Power } from "lucide-react";
import { useEvents, useUpsertEvent, useDeleteEvent, type EventRow } from "@/hooks/useEvents";
import { useToast } from "@/hooks/use-toast";

const C = { navy: "#1A2744", gold: "#8B6F47", goldShimmer: "#E8D5A0", parchment: "#FAF6F0", text: "#2D1F0E", textMuted: "#6B5C4A", green: "#059669", red: "#b91c1c" };

const emptyForm = (): Partial<EventRow> => ({
  slug: "", title: "", subtitle: "", event_date: "", location: "", hero_url: "", body: "",
  is_active: true, sort_order: 0,
});

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function Kenes() {
  const { data: events, isLoading } = useEvents();
  const upsert = useUpsertEvent();
  const del = useDeleteEvent();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<EventRow>>(emptyForm());

  const set = <K extends keyof EventRow>(k: K, v: EventRow[K]) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => { setForm(emptyForm()); setOpen(true); };
  const openEdit = (e: EventRow) => { setForm({ ...e, event_date: e.event_date?.slice(0, 10) ?? "" }); setOpen(true); };

  const save = async () => {
    if (!form.slug?.trim() || !form.title?.trim()) {
      toast({ title: "חסר", description: "מזהה (slug) וכותרת חובה", variant: "destructive" });
      return;
    }
    try {
      await upsert.mutateAsync({
        ...form,
        event_date: form.event_date || null,
      });
      toast({ title: form.id ? "הכנס עודכן" : "כנס נוצר" });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const toggleActive = async (e: EventRow) => {
    try {
      await upsert.mutateAsync({ id: e.id, is_active: !e.is_active });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  };

  const rows = events ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-kedem font-bold flex items-center gap-2" style={{ color: C.navy }}>
              <CalendarDays className="w-7 h-7" style={{ color: C.gold }} aria-hidden />
              ניהול כנסים
            </h1>
            <p className="font-ploni mt-1" style={{ color: C.textMuted }}>
              יצירה, עריכה והפעלה של דפי-כנס · נרשמים וצפיות
            </p>
          </div>
          <Button onClick={openNew} className="font-ploni gap-1.5" style={{ background: C.navy, color: "#fff" }}>
            <Plus className="h-4 w-4" /> כנס חדש
          </Button>
        </div>

        <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
          <CardHeader className="pb-2">
            <CardTitle className="font-kedem text-lg" style={{ color: C.navy }}>הכנסים ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-10 font-ploni" style={{ color: C.textMuted }}>טוען…</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right font-ploni">כותרת</TableHead>
                    <TableHead className="text-right font-ploni">מזהה</TableHead>
                    <TableHead className="text-right font-ploni">תאריך</TableHead>
                    <TableHead className="text-right font-ploni">נרשמים</TableHead>
                    <TableHead className="text-right font-ploni">צפיות</TableHead>
                    <TableHead className="text-right font-ploni">סטטוס</TableHead>
                    <TableHead className="text-right font-ploni">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium" style={{ color: C.text }}>
                        {e.title}
                        {e.subtitle && <div className="text-xs" style={{ color: C.textMuted }}>{e.subtitle}</div>}
                      </TableCell>
                      <TableCell dir="ltr" className="text-left text-xs" style={{ color: C.textMuted }}>{e.slug}</TableCell>
                      <TableCell className="text-sm" style={{ color: C.textMuted }}>{fmtDate(e.event_date)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm"><Users2 className="h-3.5 w-3.5" style={{ color: C.gold }} />{e.registrations_count}</span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm"><Eye className="h-3.5 w-3.5" style={{ color: C.gold }} />{e.views_count}</span>
                      </TableCell>
                      <TableCell>
                        <Badge style={{ background: e.is_active ? "#dcfce7" : "#f1f5f9", color: e.is_active ? C.green : "#64748b" }}>
                          {e.is_active ? "פעיל" : "כבוי"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(e)} title={e.is_active ? "כבה" : "הפעל"}>
                            <Power className="h-4 w-4" style={{ color: e.is_active ? C.green : "#94a3b8" }} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm(`למחוק את "${e.title}"?`)) del.mutate(e.id); }}>
                            <Trash2 className="h-4 w-4" style={{ color: C.red }} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 font-ploni" style={{ color: C.textMuted }}>אין כנסים עדיין — צור כנס חדש</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-kedem">{form.id ? "עריכת כנס" : "כנס חדש"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>כותרת *</Label><Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} className="mt-1" /></div>
              <div><Label>מזהה (slug) *</Label><Input value={form.slug ?? ""} onChange={(e) => set("slug", e.target.value)} dir="ltr" className="mt-1" placeholder="kenes-2026-07" /></div>
            </div>
            <div><Label>כותרת משנה</Label><Input value={form.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>תאריך</Label><Input type="date" value={form.event_date ?? ""} onChange={(e) => set("event_date", e.target.value)} dir="ltr" className="mt-1" /></div>
              <div><Label>מיקום</Label><Input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} className="mt-1" /></div>
            </div>
            <div><Label>תמונת הירו (URL)</Label><Input value={form.hero_url ?? ""} onChange={(e) => set("hero_url", e.target.value)} dir="ltr" className="mt-1" /></div>
            <div><Label>תוכן</Label><Textarea value={form.body ?? ""} onChange={(e) => set("body", e.target.value)} rows={4} className="mt-1" /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => set("is_active", e.target.checked)} />
              פעיל (מוצג באתר)
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">ביטול</Button></DialogClose>
            <Button size="sm" onClick={save} disabled={upsert.isPending} style={{ background: C.navy, color: "#fff" }}>
              {upsert.isPending ? "שומר…" : form.id ? "עדכן" : "צור כנס"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
