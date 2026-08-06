/**
 * Admin Orders — /admin/orders — טבלת רוכשים למעקב משלוחים (יואב 14.7, רמה 17).
 *
 * מציג לכל הזמנה: לקוח, טלפון, מייל, מוצרים (order_items), כתובת משלוח,
 * סכום, סטטוס תשלום ומסירת-קובץ — עם חיפוש, פילטר וייצוא CSV.
 *
 * ⚠️ payment_status ב-DB = 'completed' (לא 'paid') — הבדיקה הישנה החמיצה
 * את כל התשלומים.
 */
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, FileText, Package } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const statusLabels: Record<string, string> = { pending: "ממתין", confirmed: "אושר", paid: "שולם", shipped: "נשלח", completed: "הושלם", cancelled: "בוטל", refunded: "הוחזר" };
const statusColors: Record<string, string> = { pending: "bg-muted text-muted-foreground", confirmed: "bg-primary/10 text-primary", paid: "bg-primary/10 text-primary", shipped: "bg-accent/10 text-accent", completed: "bg-primary/10 text-primary", cancelled: "bg-destructive/10 text-destructive", refunded: "bg-destructive/10 text-destructive" };

const isPaid = (o: any) => o.payment_status === "completed" || o.payment_status === "paid";

function useAdminOrders() {
  return useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(title, quantity)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });
}

function itemsText(o: any): string {
  const items = (o.order_items ?? []) as Array<{ title: string; quantity: number }>;
  if (items.length) {
    return items.map((i) => (i.quantity > 1 ? `${i.title} ×${i.quantity}` : i.title)).join(", ");
  }
  return o.description || o.product || "—";
}

function shippingText(o: any): string {
  if (o.shipping_address) return `${o.shipping_address}${o.shipping_city ? ", " + o.shipping_city : ""}${o.shipping_zip ? " " + o.shipping_zip : ""}`;
  if (o.raw_payload?.digital_delivered_at) return "דיגיטלי — נשלח במייל";
  return "—";
}

export default function Orders() {
  const { data: orders, isLoading } = useAdminOrders();
  const queryClient = useQueryClient();
  // יואב 22.7 (07:30): אביה מסמנת מה כבר נשלח — עדכון סטטוס טיפול ישירות מהטבלה.
  // RLS: דורש את policy ‏orders_admin_all (מיגרציה 20260722) — בלעדיה
  // העדכון חוזר עם 0 שורות ומוצגת שגיאה ברורה.
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // אודיט M11: עד כה נכתב `status` בלבד. `payment_status` נשאר 'completed',
      // ולכן הזמנה שבוטלה/הוחזרה המשיכה להנפיק קישורי-הורדה חתומים מ-
      // /api/store/order-download, ותגית-הגישה לקורס נשארה פעילה.
      const isRevocation = ["cancelled", "canceled", "refunded"].includes(status);
      const patch = isRevocation
        ? { status, payment_status: "refunded" }
        : { status };

      const { data, error } = await supabase
        .from("orders").update(patch).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("העדכון לא נשמר — אין הרשאת עריכה (RLS)");

      if (isRevocation) {
        // ביטול תגיות-הגישה שההזמנה הזו העניקה. מסמנים cancelled_at ולא מוחקים —
        // כך נשמר תיעוד, ושומר-45-הימים ב-webhook ממשיך לעבוד.
        // `as never` — cancelled_at / cancel_note קיימות בטבלה (webhook.ts כותב
        // אליהן), אבל טרם נוצרו מחדש ב-src/integrations/supabase/types.ts.
        const { error: tagErr } = await supabase
          .from("user_access_tags")
          .update({
            cancelled_at: new Date().toISOString(),
            cancel_note: `בוטל אוטומטית עם ביטול/החזר ההזמנה ${id}`,
          } as never)
          .like("notes", `%orderId=${id}%`)
          .is("cancelled_at" as never, null);
        // לא חוסם את עדכון הסטטוס — אבל האדמין חייב לדעת שהגישה לא בוטלה.
        if (tagErr) {
          throw new Error(
            `הסטטוס עודכן, אך ביטול הגישה לקורס נכשל (${tagErr.message}) — יש לבטל ידנית`
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("סטטוס הטיפול עודכן");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onlyStore, setOnlyStore] = useState(true);

  const filtered = (orders ?? []).filter((o: any) => {
    // ברירת-מחדל: רק הזמנות-חנות (עם פריטים) — בלי 700 חיובי-ההו"ק של המנוי
    if (onlyStore && !(o.order_items?.length)) return false;
    if (statusFilter === "paid" && !isPaid(o)) return false;
    if (statusFilter === "pending" && isPaid(o)) return false;
    if (search) {
      const hay = `${o.customer_name || ""} ${o.customer_email || ""} ${o.customer_phone || ""} ${o.order_number || ""} ${itemsText(o)}`;
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const totalRevenue = filtered.filter(isPaid).reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);

  function exportCsv() {
    const head = "order_number,date,name,phone,email,items,total,paid,shipping\n";
    const rows = filtered.map((o: any) =>
      [
        o.order_number || o.id,
        new Date(o.created_at).toLocaleDateString("he-IL"),
        `"${(o.customer_name || "").replace(/"/g, "'")}"`,
        o.customer_phone || "",
        o.customer_email || "",
        `"${itemsText(o).replace(/"/g, "'")}"`,
        o.total,
        isPaid(o) ? "yes" : "no",
        `"${shippingText(o).replace(/"/g, "'")}"`,
      ].join(","),
    );
    const blob = new Blob(["﻿" + head + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bneyzion-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-heading gradient-teal">ניהול הזמנות</h1>
            <p className="text-muted-foreground mt-1">טבלת הרוכשים למעקב משלוחים — מוצרים, כתובת וטלפון לכל הזמנה</p>
          </div>
          <Button variant="outline" onClick={exportCsv} className="font-display">
            <Download className="h-4 w-4 ml-1" /> ייצוא CSV
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-foreground">{filtered.length}</p><p className="text-xs text-muted-foreground">הזמנות בתצוגה</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-foreground">₪{totalRevenue.toLocaleString()}</p><p className="text-xs text-muted-foreground">הכנסות (ששולמו)</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-foreground">{filtered.filter((o: any) => isPaid(o) && o.shipping_address).length}</p><p className="text-xs text-muted-foreground">ממתינות למשלוח</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-foreground">{filtered.filter((o: any) => o.raw_payload?.digital_delivered_at).length}</p><p className="text-xs text-muted-foreground">קבצים דיגיטליים נמסרו</p></CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="חיפוש: שם, טלפון, מייל, מוצר..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><Filter className="h-3.5 w-3.5 ml-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="paid">שולמו</SelectItem>
              <SelectItem value="pending">ממתינים לתשלום</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={onlyStore ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlyStore(!onlyStore)}
            className="font-display"
            title="בברירת מחדל מוצגות הזמנות-חנות בלבד; כיבוי מציג גם את חיובי המנוי החודשיים"
          >
            <Package className="h-3.5 w-3.5 ml-1" />
            {onlyStore ? "הזמנות חנות בלבד" : "כל ההזמנות (כולל מנויים)"}
          </Button>
        </div>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? <p className="text-center py-8 text-muted-foreground">טוען...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">לקוח</TableHead>
                    <TableHead className="text-right">טלפון</TableHead>
                    <TableHead className="text-right">מוצרים</TableHead>
                    <TableHead className="text-right">משלוח</TableHead>
                    <TableHead className="text-right">סכום</TableHead>
                    <TableHead className="text-right">תשלום</TableHead>
                    <TableHead className="text-right">טיפול</TableHead>
                    <TableHead className="text-right">תאריך</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <div className="font-medium">{o.customer_name || "—"}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr" style={{ textAlign: "right" }}>{o.customer_email || ""}</div>
                      </TableCell>
                      <TableCell dir="ltr" className="text-left text-sm whitespace-nowrap">{o.customer_phone || "—"}</TableCell>
                      <TableCell className="text-sm max-w-[260px]">
                        {itemsText(o)}
                        {o.raw_payload?.digital_delivered_at && (
                          <Badge className="bg-primary/10 text-primary border-0 mr-2 text-[10px]"><FileText className="h-3 w-3 ml-0.5" />קובץ נשלח</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm max-w-[220px]">{shippingText(o)}</TableCell>
                      <TableCell className="font-bold whitespace-nowrap">₪{Number(o.total).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={`${isPaid(o) ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"} border-0`}>
                          {isPaid(o) ? "שולם" : "ממתין"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {/* סטטוס טיפול/משלוח — נערך בשטח ע"י המשרד (אביה) */}
                        <Select
                          value={["pending", "confirmed", "shipped", "completed", "cancelled"].includes(o.status) ? o.status : "pending"}
                          onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}
                        >
                          <SelectTrigger className={`h-8 w-[120px] text-xs border-0 ${statusColors[o.status] || "bg-muted"}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">ממתין לטיפול</SelectItem>
                            <SelectItem value="confirmed">בטיפול</SelectItem>
                            <SelectItem value="shipped">נשלח 📦</SelectItem>
                            <SelectItem value="completed">הושלם ✓</SelectItem>
                            <SelectItem value="cancelled">בוטל</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(o.created_at).toLocaleDateString("he-IL")}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">אין הזמנות</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
