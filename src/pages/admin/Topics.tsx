import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useTopics, useCreateTopic, useUpdateTopic, useDeleteTopic } from "@/hooks/useTopics";
import { useToast } from "@/hooks/use-toast";

export default function Topics() {
  const { data: topics, isLoading } = useTopics();
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", parent_id: "" });

  const resetForm = () => { setForm({ name: "", slug: "", description: "", parent_id: "" }); setEditing(null); };

  const openEdit = (t: any) => {
    setEditing(t);
    setForm({ name: t.name, slug: t.slug, description: t.description || "", parent_id: t.parent_id || "" });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = { name: form.name, slug: form.slug, description: form.description || null, parent_id: form.parent_id || null };
    try {
      if (editing) { await updateTopic.mutateAsync({ id: editing.id, ...payload }); toast({ title: "הנושא עודכן" }); }
      else { await createTopic.mutateAsync(payload); toast({ title: "הנושא נוצר" }); }
      setDialogOpen(false); resetForm();
    } catch (e: any) { toast({ title: "שגיאה", description: e.message, variant: "destructive" }); }
  };

  const filtered = topics?.filter((t) => t.name.includes(search) || t.slug.includes(search));

  const getParentName = (parentId: string | null) => {
    if (!parentId) return "—";
    return topics?.find((t) => t.id === parentId)?.name || "—";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading gradient-teal">ניהול נושאים</h1>
            <p className="text-muted-foreground mt-1">ניהול תגיות ונושאים לשיעורים</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="font-display"><Plus className="h-4 w-4 ml-1" />נושא חדש</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" dir="rtl">
              <DialogHeader><DialogTitle className="font-heading">{editing ? "עריכת נושא" : "נושא חדש"}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div><Label>שם *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Slug *</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" /></div>
                <div><Label>תיאור</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
                <div>
                  <Label>נושא אב</Label>
                  <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ללא</SelectItem>
                      {topics?.filter((t) => t.id !== editing?.id).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmit} disabled={!form.name || !form.slug} className="font-display">{editing ? "עדכן" : "צור נושא"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="חיפוש נושאים..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-center py-8 text-muted-foreground">טוען...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-right">Slug</TableHead>
                    <TableHead className="text-right">נושא אב</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell dir="ltr" className="text-left">{t.slug}</TableCell>
                      <TableCell>{getParentName(t.parent_id)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("למחוק?")) deleteTopic.mutate(t.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">אין נושאים</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
