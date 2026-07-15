import { useState, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, FolderOpen, Sparkles, Loader2, MapPin } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { ImageUpload } from "@/components/admin/ImageUpload";
// רמה 18 (יואב 14.7): עריכת תוכן מוצר בעורך ויזואלי — לא HTML גולמי
import { RichTextEditor } from "@/components/admin/RichTextEditor";
// רמה 18 (יואב 14.7): ניהול משלוחים אוחד לכאן — טאב "משלוח ואיסוף"
import { ShippingOptionsEditor } from "@/components/admin/ShippingOptionsEditor";
import { useProductCategories } from "@/hooks/useProducts";
import { useSalePoints, useCreateSalePoint, useUpdateSalePoint, useDeleteSalePoint, type SalePoint } from "@/hooks/useSalePoints";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function useAdminProducts() {
  return useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name)")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

const emptyForm = {
  title: "", slug: "", description: "", content: "", price: "0", original_price: "",
  image_url: "", category_id: "", product_type: "physical", is_digital: false,
  status: "active", featured: false, page_count: "", sort_order: "0", source_url: "",
  digital_file_url: "",
};

const emptyCatForm = { name: "", slug: "", description: "", image_url: "", sort_order: "0" };

function CategoriesManager() {
  const { data: categories, isLoading } = useProductCategories();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyCatForm);

  const resetForm = () => { setForm(emptyCatForm); setEditing(null); };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      image_url: c.image_url || "",
      sort_order: String(c.sort_order),
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        slug: form.slug || form.name.replace(/\s+/g, "-"),
        description: form.description || null,
        image_url: form.image_url || null,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing) {
        const { data, error } = await supabase.from("product_categories").update(payload).eq("id", editing.id).select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("העדכון לא נשמר — אין הרשאת עריכה (RLS). פנה לסער.");
      } else {
        const { error } = await supabase.from("product_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast({ title: editing ? "הקטגוריה עודכנה" : "הקטגוריה נוצרה" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Pre-check: a category that still has products cannot be deleted (FK).
      // Surface a clear Hebrew message instead of a raw constraint error.
      const { count, error: countErr } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        throw new Error(`יש ${count} מוצרים בקטגוריה הזו. יש להעביר אותם לקטגוריה אחרת לפני המחיקה.`);
      }
      // .select() so RLS silent-failure (0 rows) is caught instead of a false success toast
      const { data, error } = await supabase.from("product_categories").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("המחיקה לא בוצעה — אין הרשאת מחיקה (RLS). פנה לסער.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast({ title: "הקטגוריה נמחקה" });
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <h2 className="font-heading text-lg">קטגוריות מוצרים</h2>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="font-display"><Plus className="h-4 w-4 ml-1" />קטגוריה חדשה</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle className="font-heading">{editing ? "עריכת קטגוריה" : "קטגוריה חדשה"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>שם *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="אוטומטי מהשם" dir="ltr" /></div>
              <div><Label>תיאור</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              <ImageUpload value={form.image_url} onChange={url => setForm({ ...form, image_url: url })} folder="categories" label="תמונת קטגוריה" />
              <div><Label>סדר מיון</Label><Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} /></div>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending} className="font-display">
                {saveMutation.isPending ? "שומר..." : editing ? "עדכן" : "צור קטגוריה"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-center py-8 text-muted-foreground">טוען...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">Slug</TableHead>
                <TableHead className="text-right">תיאור</TableHead>
                <TableHead className="text-right">סדר</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {c.image_url && <img src={c.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell dir="ltr" className="text-muted-foreground text-sm">{c.slug}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{c.description || "—"}</TableCell>
                  <TableCell>{c.sort_order}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("למחוק קטגוריה זו?")) deleteMutation.mutate(c.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {categories?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">אין קטגוריות</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// יואב 13.7: ניהול נקודות-מכירה / איסוף-עצמי. פעילה/לא-פעילה בטוגל אחד; רק פעילות מוצגות לרוכשים.
const emptySalePointForm = { name: "", address: "", city: "", contact: "", notes: "", sort_order: "0", is_active: true };

function SalePointsManager() {
  const { data: points, isLoading } = useSalePoints();
  const createSP = useCreateSalePoint();
  const updateSP = useUpdateSalePoint();
  const deleteSP = useDeleteSalePoint();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptySalePointForm);

  const resetForm = () => { setForm(emptySalePointForm); setEditing(null); };
  const openEdit = (p: SalePoint) => {
    setEditing(p);
    setForm({ name: p.name, address: p.address || "", city: p.city || "", contact: p.contact || "", notes: p.notes || "", sort_order: String(p.sort_order), is_active: p.is_active });
    setDialogOpen(true);
  };
  const save = async () => {
    const payload = { name: form.name, address: form.address || null, city: form.city || null, contact: form.contact || null, notes: form.notes || null, sort_order: Number(form.sort_order) || 0, is_active: form.is_active };
    try {
      if (editing) { await updateSP.mutateAsync({ id: editing.id, ...payload } as any); toast({ title: "נקודת המכירה עודכנה" }); }
      else { await createSP.mutateAsync(payload as any); toast({ title: "נקודת המכירה נוספה" }); }
      setDialogOpen(false); resetForm();
    } catch (e: any) { toast({ title: "שגיאה", description: e.message, variant: "destructive" }); }
  };
  const toggleActive = async (p: SalePoint) => {
    try { await updateSP.mutateAsync({ id: p.id, is_active: !p.is_active }); toast({ title: !p.is_active ? "הנקודה הופעלה — מוצגת לרוכשים" : "הנקודה הוסתרה מהרוכשים" }); }
    catch (e: any) { toast({ title: "שגיאה", description: e.message, variant: "destructive" }); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <h2 className="font-heading text-lg">נקודות מכירה ואיסוף עצמי</h2>
          <p className="text-xs text-muted-foreground mt-1">רק נקודות "פעילות" מוצגות לרוכשים בסליקה, תחת "איסוף עצמי".</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button size="sm" className="font-display"><Plus className="h-4 w-4 ml-1" />נקודה חדשה</Button></DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle className="font-heading">{editing ? "עריכת נקודה" : "נקודת מכירה חדשה"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>שם הנקודה *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="למשל: איסוף עצמי - צ'יטה, רמות" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>כתובת</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                <div><Label>עיר</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              </div>
              <div><Label>איש קשר / טלפון</Label><Input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} dir="ltr" /></div>
              <div><Label>הערות (שעות פעילות וכו')</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div><Label>סדר מיון</Label><Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} /></div>
                <div className="flex items-center gap-2 pb-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>פעילה (מוצגת לרוכשים)</Label></div>
              </div>
              <Button onClick={save} disabled={!form.name || createSP.isPending || updateSP.isPending} className="font-display">{editing ? "עדכן" : "צור נקודה"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-center py-8 text-muted-foreground">טוען...</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-right">שם</TableHead>
              <TableHead className="text-right">כתובת</TableHead>
              <TableHead className="text-right">איש קשר</TableHead>
              <TableHead className="text-right">פעילה</TableHead>
              <TableHead className="text-right">פעולות</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {points?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{[p.address, p.city].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground" dir="ltr">{p.contact || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={p.is_active} disabled={updateSP.isPending} onCheckedChange={() => toggleActive(p)} />
                      <span className={`text-xs ${p.is_active ? "text-primary" : "text-muted-foreground"}`}>{p.is_active ? "פעילה" : "מוסתרת"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm(`למחוק את "${p.name}"?`)) deleteSP.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {points?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">אין נקודות מכירה עדיין — הוסף אחת כדי שתופיע לרוכשים באיסוף עצמי</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function EnrichProductsButton({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleEnrich = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-products");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");
      sonnerToast.success(`העשרת מוצרים הושלמה: ${data.updated} עודכנו, ${data.skipped} דולגו`);
      onDone();
    } catch (err: any) {
      sonnerToast.error(`שגיאה: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [onDone]);

  return (
    <Button onClick={handleEnrich} disabled={loading} variant="outline" className="gap-2 border-accent/40 text-accent hover:bg-accent/10">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {loading ? "מעשיר תיאורים..." : "העשר תיאורים מהאתר הישן"}
    </Button>
  );
}

export default function AdminProducts() {
  const { data: products, isLoading } = useAdminProducts();
  const { data: categories } = useProductCategories();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const resetForm = () => { setForm(emptyForm); setEditing(null); };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      title: p.title, slug: p.slug, description: p.description || "",
      content: p.content || "", price: String(p.price), original_price: p.original_price ? String(p.original_price) : "",
      image_url: p.image_url || "", category_id: p.category_id || "",
      product_type: p.product_type, is_digital: p.is_digital, status: p.status,
      featured: p.featured, page_count: p.page_count ? String(p.page_count) : "",
      sort_order: String(p.sort_order), source_url: p.source_url || "",
      digital_file_url: p.digital_file_url || "",
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        slug: form.slug || form.title.replace(/\s+/g, "-").toLowerCase(),
        description: form.description || null,
        content: form.content || null,
        price: Number(form.price) || 0,
        original_price: form.original_price ? Number(form.original_price) : null,
        image_url: form.image_url || null,
        category_id: form.category_id || null,
        product_type: form.product_type,
        is_digital: form.is_digital,
        status: form.status,
        featured: form.featured,
        page_count: form.page_count ? Number(form.page_count) : null,
        sort_order: Number(form.sort_order) || 0,
        source_url: form.source_url || null,
        digital_file_url: form.digital_file_url || null,
      };
      if (editing) {
        const { data, error } = await supabase.from("products").update(payload).eq("id", editing.id).select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("העדכון לא נשמר — אין הרשאת עריכה (RLS). פנה לסער.");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: editing ? "המוצר עודכן" : "המוצר נוצר" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  // רמה 18 (יואב 14.7): מוצר שכבר נרכש אי-פעם אי-אפשר למחוק (FK מ-order_items) —
  // במקום שגיאת constraint באנגלית, הוא עובר לארכיון (יורד מהחנות, ההזמנות נשמרות).
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { count, error: countErr } = await supabase
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .eq("product_id", id);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        const { data, error } = await supabase
          .from("products")
          .update({ status: "archived" })
          .eq("id", id)
          .select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("הארכוב לא בוצע — אין הרשאת עריכה (RLS). פנה לסער.");
        return "archived" as const;
      }
      // .select() so RLS silent-failure (0 rows) is caught instead of a false success toast
      const { data, error } = await supabase.from("products").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("המחיקה לא בוצעה — אין הרשאת מחיקה (RLS). פנה לסער.");
      return "deleted" as const;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({
        title: result === "archived" ? "המוצר הועבר לארכיון" : "המוצר נמחק",
        description:
          result === "archived"
            ? "יש רכישות קיימות על המוצר, לכן אי-אפשר למחוק אותו לגמרי — הוא הוסתר מהחנות וההזמנות נשמרו."
            : undefined,
      });
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  // Inline activate/hide from the list (Yoav: "שיהיה אפשר לשנות האם המוצר פעיל — מהתפריט הכללי")
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase
        .from("products")
        .update({ status: active ? "active" : "draft" })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("העדכון לא נשמר — אין הרשאת עריכה (RLS). פנה לסער.");
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: vars.active ? "המוצר הופעל — מוצג בחנות" : "המוצר הוסתר מהחנות" });
    },
    onError: (e: any) => toast({ title: "שגיאה", description: e.message, variant: "destructive" }),
  });

  const filtered = products?.filter((p: any) => p.title.includes(search));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading gradient-teal">ניהול מוצרים</h1>
          <p className="text-muted-foreground mt-1">הוספה ועריכה של מוצרים וקטגוריות</p>
        </div>

        <Tabs defaultValue="products" dir="rtl">
          <TabsList>
            <TabsTrigger value="products" className="font-display">מוצרים</TabsTrigger>
            <TabsTrigger value="categories" className="font-display flex items-center gap-1.5">
              <FolderOpen className="h-4 w-4" />
              קטגוריות
            </TabsTrigger>
            <TabsTrigger value="salepoints" className="font-display flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              משלוח ואיסוף
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4 mt-4">
            <EnrichProductsButton onDone={() => queryClient.invalidateQueries({ queryKey: ["admin-products"] })} />
            <div className="flex justify-end">
              <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="font-display"><Plus className="h-4 w-4 ml-1" />מוצר חדש</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
                  <DialogHeader><DialogTitle className="font-heading">{editing ? "עריכת מוצר" : "מוצר חדש"}</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>כותרת *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                      <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="אוטומטי מהכותרת" dir="ltr" /></div>
                    </div>
                    <div>
                      <Label>תיאור</Label>
                      <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
                      <p className="text-xs text-muted-foreground mt-1">תיאור קצר בטקסט רגיל — מופיע בכרטיס המוצר בחנות.</p>
                    </div>
                    <div>
                      <Label>תוכן מורחב</Label>
                      <RichTextEditor
                        value={form.content}
                        onChange={(html) => setForm({ ...form, content: html })}
                        placeholder="תיאור מורחב שמופיע בעמוד המוצר — כותרות, הדגשות ורשימות"
                        minHeight={140}
                      />
                      <p className="text-xs text-muted-foreground mt-1">מופיע בעמוד המוצר מתחת לכפתורי הרכישה. עריכה רגילה — מודגש, כותרות ורשימות מסרגל הכלים.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div><Label>מחיר *</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                      <div><Label>מחיר מקורי</Label><Input type="number" value={form.original_price} onChange={e => setForm({ ...form, original_price: e.target.value })} /></div>
                      <div><Label>מספר עמודים</Label><Input type="number" value={form.page_count} onChange={e => setForm({ ...form, page_count: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>קטגוריה</Label>
                        <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
                          <SelectTrigger><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                          <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      {/* יואב 15.7: היו שני שדות "דיגיטלי" (סוג-מוצר + מתג) — אוחדו.
                          המתג "מוצר דיגיטלי" למטה הוא המקור היחיד; product_type לא
                          בשימוש בשום מקום (כל המוצרים 'simple'). */}
                    </div>
                    <ImageUpload value={form.image_url} onChange={url => setForm({ ...form, image_url: url })} folder="products" label="תמונת מוצר" />
                    <div>
                      <Label>קישור קובץ דיגיטלי</Label>
                      <Input value={form.digital_file_url} onChange={e => setForm({ ...form, digital_file_url: e.target.value })} dir="ltr" />
                      <p className="text-xs text-muted-foreground mt-1">
                        למוצר דיגיטלי — הקובץ שהרוכש מקבל במייל אחרי התשלום. ערך שמתחיל ב-<span dir="ltr">storage:</span> = קובץ מאובטח במערכת (מנוהל אוטומטית — לא לשנות ידנית). קובץ חדש או מהדורה מעודכנת? שולחים לסער והוא מעלה. למוצר פיזי משאירים ריק.
                      </p>
                    </div>
                    <div>
                      <Label>קישור מקור</Label>
                      <Input value={form.source_url} onChange={e => setForm({ ...form, source_url: e.target.value })} dir="ltr" />
                      <p className="text-xs text-muted-foreground mt-1">כתובת המוצר באתר הישן (club.bneyzion) — לשימוש פנימי בלבד, לא מוצג לרוכשים.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>סטטוס</Label>
                        <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">פעיל</SelectItem>
                            <SelectItem value="draft">טיוטה</SelectItem>
                            <SelectItem value="archived">ארכיון</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>סדר מיון</Label>
                        <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} />
                        <p className="text-xs text-muted-foreground mt-1">קובע את סדר הופעת המוצרים בחנות — מספר נמוך מופיע קודם.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch checked={form.featured} onCheckedChange={v => setForm({ ...form, featured: v })} />
                        <Label>מוצר מומלץ</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={form.is_digital} onCheckedChange={v => setForm({ ...form, is_digital: v })} />
                        <div>
                          <Label>מוצר דיגיטלי (קובץ להורדה)</Label>
                          <p className="text-xs text-muted-foreground">מופעל = הרוכש מקבל קישור הורדה במייל ובדף התודה (מהשדה "קובץ דיגיטלי")</p>
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending} className="font-display">
                      {saveMutation.isPending ? "שומר..." : editing ? "עדכן" : "צור מוצר"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="חיפוש מוצרים..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? <p className="text-center py-8 text-muted-foreground">טוען...</p> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">מוצר</TableHead>
                        <TableHead className="text-right">קטגוריה</TableHead>
                        <TableHead className="text-right">מחיר</TableHead>
                        <TableHead className="text-right">סוג</TableHead>
                        <TableHead className="text-right">סטטוס</TableHead>
                        <TableHead className="text-right">פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered?.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {p.image_url && <img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover" />}
                              <div>
                                <span className="font-medium">{p.title}</span>
                                {p.featured && <Badge variant="secondary" className="mr-2 text-xs">מומלץ</Badge>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{(p as any).product_categories?.name || "—"}</TableCell>
                          <TableCell>₪{p.price}</TableCell>
                          <TableCell><Badge variant="outline">{p.is_digital ? "דיגיטלי" : "פיזי"}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={p.status === "active"}
                                disabled={toggleStatusMutation.isPending}
                                onCheckedChange={(v) => toggleStatusMutation.mutate({ id: p.id, active: v })}
                              />
                              <span className={`text-xs ${p.status === "active" ? "text-primary" : "text-muted-foreground"}`}>
                                {p.status === "active" ? "פעיל" : p.status === "archived" ? "ארכיון" : "מוסתר"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm("למחוק?")) deleteMutation.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">אין מוצרים</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <CategoriesManager />
          </TabsContent>

          <TabsContent value="salepoints" className="mt-4 space-y-6">
            <ShippingOptionsEditor />
            <SalePointsManager />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
