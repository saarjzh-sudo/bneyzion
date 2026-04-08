import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Search, Eye, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const statusLabels: Record<string, string> = { pending: "ממתין", paid: "שולם", shipped: "נשלח", completed: "הושלם", cancelled: "בוטל" };
const statusColors: Record<string, string> = { pending: "bg-muted text-muted-foreground", paid: "bg-primary/10 text-primary", shipped: "bg-accent/10 text-accent", completed: "bg-primary/10 text-primary", cancelled: "bg-destructive/10 text-destructive" };

function useAdminOrders() {
  return useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(count)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}

export default function Orders() {
  const { data: orders, isLoading } = useAdminOrders();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = (orders ?? []).filter((o: any) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search && !(o.customer_name?.includes(search) || o.customer_email?.includes(search) || o.order_number?.includes(search))) return false;
    return true;
  });

  const totalRevenue = filtered.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading gradient-teal">ניהול הזמנות</h1>
          <p className="text-muted-foreground mt-1">מעקב ואישור הזמנות</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-foreground">{filtered.length}</p><p className="text-xs text-muted-foreground">הזמנות</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-foreground">₪{totalRevenue.toLocaleString()}</p><p className="text-xs text-muted-foreground">סה״כ הכנסות</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-foreground">{(orders ?? []).filter((o: any) => o.status === "pending").length}</p><p className="text-xs text-muted-foreground">ממתינים</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-foreground">{(orders ?? []).filter((o: any) => o.payment_status === "paid").length}</p><p className="text-xs text-muted-foreground">שולמו</p></CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="חיפוש לפי שם, אימייל או מספר הזמנה..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><Filter className="h-3.5 w-3.5 ml-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="pending">ממתין</SelectItem>
              <SelectItem value="paid">שולם</SelectItem>
              <SelectItem value="shipped">נשלח</SelectItem>
              <SelectItem value="completed">הושלם</SelectItem>
              <SelectItem value="cancelled">בוטל</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? <p className="text-center py-8 text-muted-foreground">טוען...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">מספר הזמנה</TableHead>
                    <TableHead className="text-right">לקוח</TableHead>
                    <TableHead className="text-right">אימייל</TableHead>
                    <TableHead className="text-right">סכום</TableHead>
                    <TableHead className="text-right">תשלום</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">תאריך</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                      <TableCell className="font-medium">{o.customer_name || "—"}</TableCell>
                      <TableCell dir="ltr" className="text-left text-sm">{o.customer_email || "—"}</TableCell>
                      <TableCell className="font-bold">₪{Number(o.total).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={o.payment_status === "paid" ? "bg-primary/10 text-primary border-0" : "bg-muted text-muted-foreground border-0"}>
                          {o.payment_status === "paid" ? "שולם" : "ממתין"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[o.status] || "bg-muted text-muted-foreground"} border-0`}>
                          {statusLabels[o.status] || o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString("he-IL")}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">אין הזמנות</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
