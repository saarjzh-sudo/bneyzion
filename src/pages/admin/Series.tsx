import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useSeries, useCreateSeries, useUpdateSeries, useDeleteSeries } from "@/hooks/useSeries";
import { useRabbis } from "@/hooks/useRabbis";
import { useToast } from "@/hooks/use-toast";

export default function SeriesPage() {
  const { data: seriesList, isLoading } = useSeries();
  const { data: rabbis } = useRabbis();
  const createSeries = useCreateSeries();
  const updateSeries = useUpdateSeries();
  const deleteSeries = useDeleteSeries();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", rabbi_id: "", parent_id: "", image_url: "", status: "draft" });

  const resetForm = () => { setForm({ title: "", description: "", rabbi_id: "", parent_id: "", image_url: "", status: "draft" }); setEditing(null); };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ title: s.title, description: s.description || "", rabbi_id: s.rabbi_id || "", parent_id: s.parent_id || "", image_url: s.image_url || "", status: s.status });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = { title: form.title, description: form.description || null, rabbi_id: form.rabbi_id || null, parent_id: form.parent_id || null, image_url: form.image_url || null, status: form.status };
    try {
      if (editing) { await updateSeries.mutateAsync({ id: editing.id, ...payload }); toast({ title: "הסדרה עודכנה" }); }
      else { await createSeries.mutateAsync(payload); toast({ title: "הסדרה נוצרה" }); }
      setDialogOpen(false); resetForm();
    } catch (e: any) { toast({ title: "שגיאה", description: e.message, variant: "destructive" }); }
  };

  const filtered = seriesList?.filter((s: any) => s.title.includes(search));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading gradient-teal">ניהול סדרות</h1>
            <p className="text-muted-foreground mt-1">הוספה ועריכה של סדרות שיעורים</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="font-display"><Plus className="h-4 w-4 ml-1" />סדרה חדשה</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" dir="rtl">
              <DialogHeader><DialogTitle className="font-heading">{editing ? "עריכת סדרה" : "סדרה חדשה"}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div><Label>כותרת *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>תיאור</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <div>
                  <Label>רב</Label>
                  <Select value={form.rabbi_id} onValueChange={(v) => setForm({ ...form, rabbi_id: v })}>
                    <SelectTrigger><SelectValue placeholder="בחר רב" /></SelectTrigger>
                    <SelectContent>{rabbis?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>סדרת אב (היררכיה)</Label>
                  <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v === "_none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="ללא — סדרה עליונה" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">ללא — סדרה עליונה</SelectItem>
                      {seriesList?.filter((s: any) => s.id !== editing?.id).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>קישור תמונה</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
                <div>
                  <Label>סטטוס</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">טיוטה</SelectItem>
                      <SelectItem value="active">פעילה</SelectItem>
                      <SelectItem value="completed">הושלמה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmit} disabled={!form.title} className="font-display">{editing ? "עדכן" : "צור סדרה"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="חיפוש סדרות..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-center py-8 text-muted-foreground">טוען...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">כותרת</TableHead>
                    <TableHead className="text-right">רב</TableHead>
                    <TableHead className="text-right">שיעורים</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell>{s.rabbis?.name || "—"}</TableCell>
                      <TableCell>{s.lesson_count}</TableCell>
                      <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("למחוק?")) deleteSeries.mutate(s.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">אין סדרות</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
