/**
 * Rabbis (admin) — /admin/rabbis — "רבנים ויוצרים"
 *
 * 10.7.2026 (הוראת סער): הפאנל מנהל גם רבנים וגם יוצרי-תוכן/מוסדות
 * (rabbis.entity_type = 'rabbi' | 'content_creator'):
 *   • פילטר בולט: רבנים / יוצרי תוכן / הכל
 *   • תגית סוג על כל שורה
 *   • entity_type + תואר (title) נערכים בטופס — התואר מופיע לפני השם באתר,
 *     ריק = בלי תואר (התיקון של "הרב סיוון רהב-מאיר" נעשה ב-DB; כאן ה-UI שמונע הישנות).
 */
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Pencil, Trash2, Users2, PenTool } from "lucide-react";
import { useRabbis, useCreateRabbi, useUpdateRabbi, useDeleteRabbi } from "@/hooks/useRabbis";
import { useToast } from "@/hooks/use-toast";
import { InlineEditField } from "@/components/admin/InlineEditField";

type EntityFilter = "all" | "rabbi" | "content_creator";

const ENTITY_LABELS: Record<string, string> = {
  rabbi: "רב",
  content_creator: "יוצר תוכן",
};

/** entity_type ריק ב-DB = רב (ברירת המחדל ההיסטורית) */
const entityOf = (r: any): "rabbi" | "content_creator" =>
  r?.entity_type === "content_creator" ? "content_creator" : "rabbi";

function EntityBadge({ type }: { type: "rabbi" | "content_creator" }) {
  return type === "content_creator" ? (
    <Badge className="bg-purple-50 text-purple-700 border border-purple-200 gap-1 hover:bg-purple-50">
      <PenTool className="h-2.5 w-2.5" />
      יוצר תוכן
    </Badge>
  ) : (
    <Badge className="bg-blue-50 text-blue-700 border border-blue-200 gap-1 hover:bg-blue-50">
      <Users2 className="h-2.5 w-2.5" />
      רב
    </Badge>
  );
}

export default function Rabbis() {
  const { data: rabbis, isLoading } = useRabbis();
  const createRabbi = useCreateRabbi();
  const updateRabbi = useUpdateRabbi();
  const deleteRabbi = useDeleteRabbi();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<EntityFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", title: "", bio: "", image_url: "", specialty: "",
    status: "active", entity_type: "rabbi",
  });

  const resetForm = () => {
    setForm({ name: "", title: "", bio: "", image_url: "", specialty: "", status: "active", entity_type: "rabbi" });
    setEditing(null);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      name: r.name,
      title: r.title || "",
      bio: r.bio || "",
      image_url: r.image_url || "",
      specialty: r.specialty || "",
      status: r.status,
      entity_type: entityOf(r),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      name: form.name,
      title: form.title.trim() || null,
      bio: form.bio || null,
      image_url: form.image_url || null,
      specialty: form.specialty || null,
      status: form.status,
      entity_type: form.entity_type,
    };
    try {
      if (editing) {
        await updateRabbi.mutateAsync({ id: editing.id, ...payload } as any);
        toast({ title: "הפרטים עודכנו" });
      } else {
        await createRabbi.mutateAsync(payload as any);
        toast({ title: form.entity_type === "content_creator" ? "יוצר התוכן נוסף" : "הרב נוסף" });
      }
      setDialogOpen(false);
      resetForm();
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const rabbiCount = rabbis?.filter((r) => entityOf(r) === "rabbi").length ?? 0;
  const creatorCount = rabbis?.filter((r) => entityOf(r) === "content_creator").length ?? 0;

  const filtered = rabbis
    ?.filter((r) => entityFilter === "all" || entityOf(r) === entityFilter)
    .filter((r) => r.name.includes(search) || r.specialty?.includes(search));

  const FILTER_TABS: { id: EntityFilter; label: string }[] = [
    { id: "all", label: `הכל (${(rabbis?.length ?? 0)})` },
    { id: "rabbi", label: `רבנים (${rabbiCount})` },
    { id: "content_creator", label: `יוצרי תוכן (${creatorCount})` },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading gradient-teal">רבנים ויוצרים</h1>
            <p className="text-muted-foreground mt-1">הוספה ועריכה של רבנים ויוצרי תוכן — כולל התואר שמופיע לפני השם</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="font-display"><Plus className="h-4 w-4 ml-1" />רב / יוצר חדש</Button>
            </DialogTrigger>
            {/* יואב 23.7 23:12: הטופס עבר את גובה המסך בלי גלילה */}
            <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto" dir="rtl">
              <DialogHeader><DialogTitle className="font-heading">{editing ? "עריכת רב / יוצר" : "רב / יוצר חדש"}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label>סוג *</Label>
                  <Select value={form.entity_type} onValueChange={(v) => setForm({ ...form, entity_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rabbi">רב</SelectItem>
                      <SelectItem value="content_creator">יוצר תוכן</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    יוצרי תוכן (מרצות, מכונים, מוסדות) לא מופיעים ברשימת הרבנים הציבורית — רק באגף המורים.
                  </p>
                </div>
                <div><Label>שם *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div>
                  <Label>תואר</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={form.entity_type === "rabbi" ? "הרב" : ""}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    התואר שמופיע לפני השם — ריק = בלי תואר
                  </p>
                </div>
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
                <Button onClick={handleSubmit} disabled={!form.name} className="font-display">{editing ? "עדכן" : "הוסף"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Entity-type filter — בולט, מעל הטבלה */}
        <div className="flex items-center rounded-lg border bg-card overflow-hidden w-fit">
          {FILTER_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setEntityFilter(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                entityFilter === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.id === "rabbi" && <Users2 className="h-3.5 w-3.5" />}
              {t.id === "content_creator" && <PenTool className="h-3.5 w-3.5" />}
              {t.label}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="חיפוש לפי שם או התמחות..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-center py-8 text-muted-foreground">טוען...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-right">סוג</TableHead>
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
                          <InlineEditField
                            value={r.name}
                            ariaLabel="שם"
                            onSave={(v) => updateRabbi.mutateAsync({ id: r.id, name: v })}
                          />
                        </div>
                      </TableCell>
                      <TableCell><EntityBadge type={entityOf(r)} /></TableCell>
                      <TableCell>
                        <InlineEditField
                          value={r.title || ""}
                          ariaLabel="תואר — מופיע לפני השם, ריק = בלי תואר"
                          allowEmpty
                          placeholder="—"
                          onSave={(v) => updateRabbi.mutateAsync({ id: r.id, title: v })}
                        />
                      </TableCell>
                      <TableCell>{r.specialty || "—"}</TableCell>
                      <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status === "active" ? "פעיל" : "לא פעיל"}</Badge></TableCell>
                      <TableCell>{r.lesson_count}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="עריכה"><Pencil className="h-4 w-4" /></Button>
                          <Button
                            variant="ghost" size="icon" aria-label="מחיקה / הסתרה מהאתר"
                            onClick={async () => {
                              const hasLessons = (r.lesson_count ?? 0) > 0;
                              const msg = hasLessons
                                ? `ל"${r.name}" יש ${r.lesson_count} שיעורים ולכן לא ניתן למחוק לצמיתות. להסתיר אותו מהאתר? (השיעורים יישמרו; ניתן להחזיר דרך עריכת סטטוס)`
                                : `למחוק את "${r.name}" (${ENTITY_LABELS[entityOf(r)]})?`;
                              if (!confirm(msg)) return;
                              try {
                                const res = await deleteRabbi.mutateAsync(r.id);
                                toast({
                                  title: res.hidden
                                    ? `"${r.name}" הוסתר מהאתר`
                                    : `"${r.name}" נמחק`,
                                });
                              } catch (e: any) {
                                toast({ title: "הפעולה נכשלה", description: e.message, variant: "destructive" });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">אין תוצאות לפילטר הנוכחי</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
