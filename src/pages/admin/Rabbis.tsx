import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useRabbis, useCreateRabbi, useUpdateRabbi, useDeleteRabbi } from "@/hooks/useRabbis";
import { useToast } from "@/hooks/use-toast";

export default function Rabbis() {
  const { data: rabbis, isLoading } = useRabbis();
  const createRabbi = useCreateRabbi();
  const updateRabbi = useUpdateRabbi();
  const deleteRabbi = useDeleteRabbi();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", title: "", bio: "", image_url: "", specialty: "", status: "active" });

  const resetForm = () => { setForm({ name: "", title: "", bio: "", image_url: "", specialty: "", status: "active" }); setEditing(null); };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ name: r.name, title: r.title || "", bio: r.bio || "", image_url: r.image_url || "", specialty: r.specialty || "", status: r.status });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = { name: form.name, title: form.title || null, bio: form.bio || null, image_url: form.image_url || null, specialty: form.specialty || null, status: form.status };
    try {
      if (editing) { await updateRabbi.mutateAsync({ id: editing.id, ...payload }); toast({ title: "הרב עודכן" }); }
      else { await createRabbi.mutateAsync(payload); toast({ title: "הרב נוסף" }); }
      setDialogOpen(false); resetForm();
    } catch (e: any) { toast({ title: "שגיאה", description: e.message, variant: "destructive" }); }
  };

  const filtered = rabbis?.filter((r) => r.name.includes(search) || r.specialty?.includes(search));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading gradient-teal">ניהול רבנים</h1>
            <p className="text-muted-foreground mt-1">הוספה ועריכה של רבנים</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="font-display"><Plus className="h-4 w-4 ml-1" />רב חדש</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" dir="rtl">
              <DialogHeader><DialogTitle className="font-heading">{editing ? "עריכת רב" : "רב חדש"}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div><Label>שם *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>תואר</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>התמחות</Label><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
                <div><Label>ביוגרפיה</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} /></div>
                <div><Label>קישור תמונה</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
                <div>
                  <Label>סטטוס</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">פעיל</SelectItem>
                      <SelectItem value="inactive">לא פעיל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmit} disabled={!form.name} className="font-display">{editing ? "עדכן" : "הוסף רב"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="חיפוש רבנים..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-center py-8 text-muted-foreground">טוען...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">רב</TableHead>
                    <TableHead className="text-right">תואר</TableHead>
                    <TableHead className="text-right">התמחות</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">שיעורים</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8"><AvatarImage src={r.image_url || ""} /><AvatarFallback className="text-xs">{r.name[0]}</AvatarFallback></Avatar>
                          <span className="font-medium">{r.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{r.title || "—"}</TableCell>
                      <TableCell>{r.specialty || "—"}</TableCell>
                      <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status === "active" ? "פעיל" : "לא פעיל"}</Badge></TableCell>
                      <TableCell>{r.lesson_count}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("למחוק?")) deleteRabbi.mutate(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">אין רבנים</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
