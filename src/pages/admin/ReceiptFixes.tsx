/**
 * Admin · תיקון קבלות — /admin/receipt-fixes
 *
 * תור העבודה של אביה: תרומות-האתר (יהושע/סעדיה/דף-תרומה) שהתורם מסר להן ת"ז
 * (דרך /receipt או בטופס התרומה) ועדיין לא הופקה להן קבלה מתוקנת בממשק Grow.
 * אין API ב-Grow לתיקון קבלה — הפעולה ידנית: לאתר את העסקה לפי אסמכתא/מזהה,
 * לבטל את הקבלה ולהפיק חדשה עם הת"ז, ואז ללחוץ "תוקן". רקע: תיקון קבלות 6.9.2026.
 */
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Receipt, Download, Search, CheckCircle2, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const C = { navy: "#1A2744", gold: "#8B6F47", text: "#2D1F0E", muted: "#6B5C4A" };

interface Row {
  id: string; created_at: string; donor_name: string | null; donor_email: string | null; phone: string | null;
  amount: string | number; source: string | null; asmachta: string | null; payment_id: string | null;
  invoice_number: string | null; donor_tax_id: string | null; tax_id_submitted_at: string | null;
  receipt_fixed_at: string | null; receipt_fixed_by: string | null;
}
type Filter = "todo" | "done" | "no_tax_id" | "all";
const SOURCE_LABEL: Record<string, string> = { "yehoshua-campaign": "יהושע", saadia: "סעדיה", "donate-page": "דף תרומה" };

async function callApi(body: Record<string, unknown>) {
  const { data: s } = await supabase.auth.getSession();
  const res = await fetch("/api/donations/receipt-fixes", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(s.session?.access_token ? { Authorization: `Bearer ${s.session.access_token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "שגיאה");
  return data;
}

export default function ReceiptFixes() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("todo");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try { setRows((await callApi({ action: "list" })).donations); }
    catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const counts = useMemo(() => ({
    todo: rows.filter((r) => r.donor_tax_id && !r.receipt_fixed_at).length,
    done: rows.filter((r) => r.receipt_fixed_at).length,
    no_tax_id: rows.filter((r) => !r.donor_tax_id).length,
    all: rows.length,
  }), [rows]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "todo" && !(r.donor_tax_id && !r.receipt_fixed_at)) return false;
      if (filter === "done" && !r.receipt_fixed_at) return false;
      if (filter === "no_tax_id" && r.donor_tax_id) return false;
      if (!needle) return true;
      return [r.donor_name, r.donor_email, r.phone, r.asmachta, r.payment_id, r.donor_tax_id].some((v) => String(v || "").toLowerCase().includes(needle));
    });
  }, [rows, filter, q]);

  const mark = async (r: Row, fixed: boolean) => {
    try {
      await callApi({ action: "mark", id: r.id, fixed });
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, receipt_fixed_at: fixed ? new Date().toISOString() : null } : x)));
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  };

  const exportCsv = () => {
    const head = ["תאריך", "שם", "מייל", "טלפון", "סכום", "קמפיין", "אסמכתא", "מזהה עסקה Grow", "מס' קבלה", "ת\"ז", "תוקן"];
    const lines = visible.map((r) => [
      new Date(r.created_at).toLocaleDateString("he-IL"), r.donor_name, r.donor_email, r.phone, r.amount,
      SOURCE_LABEL[r.source || ""] || r.source, r.asmachta, r.payment_id, r.invoice_number, r.donor_tax_id, r.receipt_fixed_at ? "כן" : "",
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `receipt-fixes-${filter}.csv`; a.click();
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "todo", label: `לתיקון בגרואו (${counts.todo})` },
    { key: "done", label: `תוקנו (${counts.done})` },
    { key: "no_tax_id", label: `בלי ת"ז עדיין (${counts.no_tax_id})` },
    { key: "all", label: `הכול (${counts.all})` },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-kedem font-bold flex items-center gap-2" style={{ color: C.navy }}>
              <Receipt className="w-7 h-7" style={{ color: C.gold }} aria-hidden /> תיקון קבלות (ת"ז)
            </h1>
            <p className="text-sm mt-1" style={{ color: C.muted }}>
              תרומות דרך האתר שיצאו לגרואו בלי ת"ז. כשתורם מוסר ת"ז (בעמוד /receipt) הוא נכנס לכאן.
              התיקון בממשק גרואו: לאתר את העסקה לפי האסמכתא, לבטל את הקבלה ולהפיק חדשה עם הת"ז, ואז ללחוץ "תוקן".
            </p>
          </div>
          <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 ml-2" /> ייצוא CSV</Button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {filters.map((f) => (
            <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>{f.label}</Button>
          ))}
          <div className="relative mr-auto">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש שם / טלפון / אסמכתא / ת״ז" className="pr-9 w-72" />
          </div>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>תאריך</TableHead><TableHead>שם</TableHead><TableHead>טלפון / מייל</TableHead><TableHead>סכום</TableHead>
                  <TableHead>קמפיין</TableHead><TableHead>אסמכתא</TableHead><TableHead>מזהה Grow</TableHead><TableHead>ת"ז</TableHead><TableHead>מצב</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8" style={{ color: C.muted }}>טוען...</TableCell></TableRow>
                ) : visible.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8" style={{ color: C.muted }}>אין שורות בסינון הזה</TableCell></TableRow>
                ) : visible.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("he-IL")}</TableCell>
                    <TableCell className="font-medium" style={{ color: C.text }}>{r.donor_name}</TableCell>
                    <TableCell className="text-xs" dir="ltr" style={{ color: C.muted }}>{r.phone}<br />{r.donor_email}</TableCell>
                    <TableCell className="whitespace-nowrap">₪{Number(r.amount).toLocaleString("he-IL")}</TableCell>
                    <TableCell>{SOURCE_LABEL[r.source || ""] || r.source}</TableCell>
                    <TableCell dir="ltr" className="font-mono text-xs">{r.asmachta}</TableCell>
                    <TableCell dir="ltr" className="font-mono text-xs">{r.payment_id}</TableCell>
                    <TableCell dir="ltr" className="font-mono">{r.donor_tax_id || <span style={{ color: C.muted }}>—</span>}</TableCell>
                    <TableCell>
                      {r.receipt_fixed_at ? <Badge className="bg-emerald-600">תוקן</Badge>
                        : r.donor_tax_id ? <Badge className="bg-amber-600">לתיקון</Badge>
                        : <Badge variant="outline">אין ת"ז</Badge>}
                    </TableCell>
                    <TableCell>
                      {r.donor_tax_id && (r.receipt_fixed_at
                        ? <Button size="sm" variant="ghost" onClick={() => mark(r, false)}><Undo2 className="w-4 h-4 ml-1" /> בטל סימון</Button>
                        : <Button size="sm" onClick={() => mark(r, true)}><CheckCircle2 className="w-4 h-4 ml-1" /> תוקן בגרואו</Button>)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
