import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Ticket, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function useCoupons() {
  return useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

const emptyForm = { code: "", discount_percent: "10", max_uses: "", valid_until: "" };

export default function Coupons() {
  const { data: coupons, isLoading } = useCoupons();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const createMutation = useMutation({
    mutationFn: async (values: typeof emptyForm) => {
      const { error } = await supabase.from("coupons").insert({
        code: values.code.toUpperCase().trim(),
        discount_percent: parseInt(values.discount_percent) || 10,
        max_uses: values.max_uses ? parseInt(values.max_uses) : null,
        valid_until: values.valid_until || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("קופון נוצר בהצלחה");
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("קופון נמחק");
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading gradient-teal">ניהול קופונים</h1>
            <p className="text-muted-foreground mt-1">יצירה וניהול קודי הנחה</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> צור קופון
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? <p className="text-center py-8 text-muted-foreground">טוען...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">קוד</TableHead>
                    <TableHead className="text-right">אחוז הנחה</TableHead>
                    <TableHead className="text-right">שימושים</TableHead>
                    <TableHead className="text-right">מקסימום</TableHead>
                    <TableHead className="text-right">תוקף</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(coupons ?? []).map((c: any) => {
                    const expired = c.valid_until && new Date(c.valid_until) < new Date();
                    const maxed = c.max_uses && c.used_count >= c.max_uses;
                    const isActive = c.status === "active" && !expired && !maxed;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-bold">{c.code}</TableCell>
                        <TableCell>{c.discount_percent}%</TableCell>
                        <TableCell>{c.used_count}</TableCell>
                        <TableCell>{c.max_uses ?? "ללא הגבלה"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.valid_until ? new Date(c.valid_until).toLocaleDateString("he-IL") : "ללא הגבלה"}
                        </TableCell>
                        <TableCell>
                          <Badge className={isActive ? "bg-primary/10 text-primary border-0" : "bg-destructive/10 text-destructive border-0"}>
                            {isActive ? "פעיל" : expired ? "פג תוקף" : maxed ? "מוצה" : "לא פעיל"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => { if (confirm("למחוק קופון?")) deleteMutation.mutate(c.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!coupons || coupons.length === 0) && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">אין קופונים</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>צור קופון חדש</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>קוד קופון</Label>
                <Input placeholder="SAVE20" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="font-mono" dir="ltr" />
              </div>
              <div>
                <Label>אחוז הנחה</Label>
                <Input type="number" min="1" max="100" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
              </div>
              <div>
                <Label>מקסימום שימושים (ריק = ללא הגבלה)</Label>
                <Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
              </div>
              <div>
                <Label>תוקף עד (ריק = ללא הגבלה)</Label>
                <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} dir="ltr" />
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={!form.code || createMutation.isPending}>
                {createMutation.isPending ? "יוצר..." : "צור קופון"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
