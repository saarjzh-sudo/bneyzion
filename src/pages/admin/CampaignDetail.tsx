/**
 * Admin · דשבורד קמפיין — /admin/campaigns/:slug (רמה 30, 27.7.2026)
 *
 * שלוש לשוניות:
 *   דשבורד — KPI (גויס/יעד/תומכים/ממתינים), פירוט לפי חבילה, טבלת תורמים
 *             מלאה (כולל משלוח) + ייצוא CSV. מחליף את הצורך באדמין-הסיסמה
 *             החיצוני של יהושע (/design-yehoshua-admin נשאר כגיבוי בלבד).
 *   חבילות — CRUD לחבילות התמיכה (campaign_tiers).
 *   הגדרות — כל תוכן הדף הציבורי + הפעלה/כיבוי.
 *
 * תורמים נקראים ישירות מ-donations דרך policy admin_select_donations
 * (סער+יואב) — בלי סיסמת 123456 ובלי endpoint עם service-role.
 */

import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ArrowRight, Download, ExternalLink, Pencil, Plus, Search, Target, Trash2 } from "lucide-react";
import {
  useCampaignBySlug,
  useLiveCampaignStats,
  useCampaignDonations,
  useUpsertCampaign,
  useUpsertCampaignTier,
  useDeleteCampaignTier,
  type CampaignRow,
  type CampaignTierRow,
  type CampaignDonationRow,
} from "@/hooks/useCampaigns";
import { useToast } from "@/hooks/use-toast";

const C = { navy: "#1A2744", gold: "#8B6F47", goldShimmer: "#E8D5A0", text: "#2D1F0E", textMuted: "#6B5C4A", green: "#059669", red: "#b91c1c" };

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  completed: { label: "שולם", bg: "#dcfce7", color: "#059669" },
  pending: { label: "ממתין", bg: "#fef9c3", color: "#a16207" },
  failed: { label: "נכשל", bg: "#fee2e2", color: "#b91c1c" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/* ─── ייצוא CSV (BOM ל-Excel עברית — דפוס אדמין-יהושע) ─── */
function exportCSV(slug: string, rows: CampaignDonationRow[], tierNames: Record<string, string>) {
  const header = ["תאריך", "שם", "טלפון", "אימייל", "סכום", "חבילה", "סטטוס", "אסמכתא", "חשבונית", "רחוב", "מס' בית", "עיר", "מיקוד", "הערות משלוח"];
  const lines = rows.map((d) =>
    [
      fmtDate(d.created_at),
      d.donor_name ?? "",
      d.phone ?? "",
      d.donor_email ?? "",
      String(d.amount ?? ""),
      d.tier_id ? tierNames[d.tier_id] || d.tier_id : "",
      STATUS_LABEL[d.payment_status ?? ""]?.label ?? d.payment_status ?? "",
      d.asmachta ?? "",
      d.invoice_number ?? "",
      d.shipping_street ?? "",
      d.shipping_house_number ?? "",
      d.shipping_city ?? "",
      d.shipping_zip ?? "",
      (d.shipping_notes ?? "").replace(/\n/g, " "),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = "﻿" + [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}-donations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── לשונית דשבורד ─────────────────────────────────────── */
function DashboardTab({ campaign, tiers }: { campaign: CampaignRow; tiers: CampaignTierRow[] }) {
  const { raised, supporters } = useLiveCampaignStats(campaign.slug);
  const { data: donations, isLoading } = useCampaignDonations(campaign.slug);
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("completed");
  // הערת יואב 27.7: שורת חיפוש תורם ספציפי לפני רשימת התורמים
  const [search, setSearch] = useState("");

  const tierNames = useMemo(() => {
    const m: Record<string, string> = { "tier-custom": "סכום חופשי" };
    for (const t of tiers) m[t.tier_key] = t.name;
    return m;
  }, [tiers]);

  const all = donations ?? [];
  const completed = all.filter((d) => d.payment_status === "completed");
  const pending = all.filter((d) => d.payment_status === "pending");
  const avg = completed.length ? Math.round(completed.reduce((s, d) => s + Number(d.amount || 0), 0) / completed.length) : 0;
  const goal = Number(campaign.goal_amount) || 0;
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : null;

  const perTier = useMemo(() => {
    const m: Record<string, { sold: number; revenue: number }> = {};
    for (const d of completed) {
      const key = d.tier_id || "—";
      m[key] = m[key] || { sold: 0, revenue: 0 };
      m[key].sold += 1;
      m[key].revenue += Number(d.amount || 0);
    }
    return m;
  }, [completed]);

  const byStatus = statusFilter === "all" ? all : statusFilter === "completed" ? completed : pending;
  const q = search.trim().toLowerCase();
  const visible = !q
    ? byStatus
    : byStatus.filter((d) =>
        [d.donor_name, d.donor_email, d.phone, d.asmachta, d.shipping_city, d.tier_id ? tierNames[d.tier_id] : null]
          .some((v) => v && v.toLowerCase().includes(q))
      );

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
          <CardContent className="pt-5 pb-4">
            <div className="text-xs font-ploni" style={{ color: C.textMuted }}>גויס</div>
            <div className="text-2xl font-bold" style={{ color: C.navy }}>₪{raised.toLocaleString()}</div>
            {pct !== null && (
              <>
                <div className="h-1.5 w-full rounded-full overflow-hidden mt-2" style={{ background: "#e5e0d5" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#E8C97A,#B98A3C)" }} />
                </div>
                <div className="text-xs mt-1" style={{ color: C.textMuted }}>{pct}% מיעד של ₪{goal.toLocaleString()}</div>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
          <CardContent className="pt-5 pb-4">
            <div className="text-xs font-ploni" style={{ color: C.textMuted }}>תומכים (שולם)</div>
            <div className="text-2xl font-bold" style={{ color: C.navy }}>{supporters}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
          <CardContent className="pt-5 pb-4">
            <div className="text-xs font-ploni" style={{ color: C.textMuted }}>ממתינים (לא הושלם)</div>
            <div className="text-2xl font-bold" style={{ color: "#a16207" }}>{pending.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
          <CardContent className="pt-5 pb-4">
            <div className="text-xs font-ploni" style={{ color: C.textMuted }}>ממוצע לתרומה</div>
            <div className="text-2xl font-bold" style={{ color: C.navy }}>₪{avg.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* פירוט לפי חבילה */}
      <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
        <CardHeader className="pb-2">
          <CardTitle className="font-kedem text-lg" style={{ color: C.navy }}>לפי חבילה</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right font-ploni">חבילה</TableHead>
                <TableHead className="text-right font-ploni">מחיר</TableHead>
                <TableHead className="text-right font-ploni">נמכרו</TableHead>
                <TableHead className="text-right font-ploni">נשארו</TableHead>
                <TableHead className="text-right font-ploni">הכנסה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((t) => {
                const p = perTier[t.tier_key] || { sold: 0, revenue: 0 };
                const remaining = t.tier_limit != null ? Math.max(0, t.tier_limit - p.sold) : null;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium" style={{ color: C.text }}>{t.name}</TableCell>
                    <TableCell>₪{Number(t.price).toLocaleString()}</TableCell>
                    <TableCell>{p.sold}{t.tier_limit != null && <span className="text-xs" style={{ color: C.textMuted }}> / {t.tier_limit}</span>}</TableCell>
                    <TableCell>{remaining ?? "∞"}</TableCell>
                    <TableCell className="font-bold" style={{ color: C.navy }}>₪{p.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
              {perTier["tier-custom"] && (
                <TableRow>
                  <TableCell className="font-medium" style={{ color: C.text }}>סכום חופשי</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>{perTier["tier-custom"].sold}</TableCell>
                  <TableCell>∞</TableCell>
                  <TableCell className="font-bold" style={{ color: C.navy }}>₪{perTier["tier-custom"].revenue.toLocaleString()}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* תורמים */}
      <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
        <CardHeader className="pb-2 flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-kedem text-lg" style={{ color: C.navy }}>
            תורמים ({visible.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: C.goldShimmer }}>
              {([["completed", "שולם"], ["pending", "ממתינים"], ["all", "הכל"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className="px-3 py-1.5 text-xs font-ploni"
                  style={{
                    background: statusFilter === key ? C.navy : "transparent",
                    color: statusFilter === key ? "#fff" : C.textMuted,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 font-ploni" onClick={() => exportCSV(campaign.slug, visible, tierNames)}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* הערת יואב 27.7: חיפוש תורם ספציפי לפני הרשימה */}
          <div className="relative mb-4" style={{ maxWidth: 360 }}>
            <Search className="h-4 w-4 absolute top-1/2 -translate-y-1/2" style={{ insetInlineStart: 12, color: C.textMuted }} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש תורם: שם, טלפון, אימייל, אסמכתא, עיר…"
              dir="rtl"
              style={{ paddingInlineStart: 36 }}
            />
          </div>
          {isLoading ? (
            <p className="text-center py-10 font-ploni" style={{ color: C.textMuted }}>טוען…</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right font-ploni">תאריך</TableHead>
                    <TableHead className="text-right font-ploni">שם</TableHead>
                    <TableHead className="text-right font-ploni">טלפון</TableHead>
                    <TableHead className="text-right font-ploni">סכום</TableHead>
                    <TableHead className="text-right font-ploni">חבילה</TableHead>
                    <TableHead className="text-right font-ploni">סטטוס</TableHead>
                    <TableHead className="text-right font-ploni">משלוח</TableHead>
                    <TableHead className="text-right font-ploni">אסמכתא</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((d) => {
                    const st = STATUS_LABEL[d.payment_status ?? ""] ?? { label: d.payment_status ?? "—", bg: "#f1f5f9", color: "#64748b" };
                    const address = [d.shipping_street && `${d.shipping_street} ${d.shipping_house_number ?? ""}`.trim(), d.shipping_city].filter(Boolean).join(", ");
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs whitespace-nowrap" style={{ color: C.textMuted }}>{fmtDate(d.created_at)}</TableCell>
                        <TableCell className="font-medium" style={{ color: C.text }}>
                          {d.donor_name ?? "—"}
                          {d.donor_email && <div className="text-xs" dir="ltr" style={{ color: C.textMuted }}>{d.donor_email}</div>}
                        </TableCell>
                        <TableCell dir="ltr" className="text-left text-xs">{d.phone ?? "—"}</TableCell>
                        <TableCell className="font-bold" style={{ color: C.navy }}>₪{Number(d.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{d.tier_id ? tierNames[d.tier_id] || d.tier_id : "—"}</TableCell>
                        <TableCell><Badge style={{ background: st.bg, color: st.color }}>{st.label}</Badge></TableCell>
                        <TableCell className="text-xs" style={{ color: C.textMuted }}>
                          {address || "—"}
                          {d.shipping_notes && <div className="text-[11px]">{d.shipping_notes}</div>}
                        </TableCell>
                        <TableCell className="text-xs" dir="ltr">
                          {d.asmachta ?? "—"}
                          {d.invoice_url && (
                            <a href={d.invoice_url} target="_blank" rel="noopener noreferrer" className="block underline" style={{ color: C.gold }}>
                              חשבונית
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {visible.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 font-ploni" style={{ color: C.textMuted }}>אין תרומות בסינון הזה</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── לשונית חבילות ─────────────────────────────────────── */
const emptyTier = (campaignId: string, nextSort: number): Partial<CampaignTierRow> => ({
  campaign_id: campaignId,
  tier_key: "",
  price: 0,
  name: "",
  headline: "",
  badge: "",
  note: "",
  perks: [],
  tier_limit: null,
  image_url: "",
  image_alt: "",
  image_badge: "",
  highlight: false,
  needs_shipping: true,
  max_installments: 1,
  is_active: true,
  sort_order: nextSort,
});

function TiersTab({ campaign, tiers }: { campaign: CampaignRow; tiers: CampaignTierRow[] }) {
  const upsert = useUpsertCampaignTier();
  const del = useDeleteCampaignTier();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<CampaignTierRow>>(emptyTier(campaign.id, tiers.length + 1));
  const [perksText, setPerksText] = useState("");

  const set = <K extends keyof CampaignTierRow>(k: K, v: CampaignTierRow[K]) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm(emptyTier(campaign.id, tiers.length + 1));
    setPerksText("");
    setOpen(true);
  };
  const openEdit = (t: CampaignTierRow) => {
    setForm({ ...t });
    setPerksText((t.perks || []).join("\n"));
    setOpen(true);
  };

  const save = async () => {
    if (!form.tier_key?.trim() || !form.name?.trim() || !form.price) {
      toast({ title: "חסר", description: "מזהה חבילה, שם ומחיר חובה", variant: "destructive" });
      return;
    }
    try {
      await upsert.mutateAsync({
        ...form,
        tier_key: form.tier_key!.trim(),
        price: Number(form.price),
        tier_limit: form.tier_limit ? Number(form.tier_limit) : null,
        max_installments: Number(form.max_installments) || 1,
        perks: perksText.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      toast({ title: form.id ? "החבילה עודכנה" : "חבילה נוצרה" });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="font-kedem text-lg" style={{ color: C.navy }}>חבילות תמיכה ({tiers.length})</CardTitle>
        <Button size="sm" onClick={openNew} className="gap-1.5 font-ploni" style={{ background: C.navy, color: "#fff" }}>
          <Plus className="h-4 w-4" /> חבילה חדשה
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right font-ploni">#</TableHead>
              <TableHead className="text-right font-ploni">חבילה</TableHead>
              <TableHead className="text-right font-ploni">מחיר</TableHead>
              <TableHead className="text-right font-ploni">מכסה</TableHead>
              <TableHead className="text-right font-ploni">משלוח</TableHead>
              <TableHead className="text-right font-ploni">תשלומים</TableHead>
              <TableHead className="text-right font-ploni">סטטוס</TableHead>
              <TableHead className="text-right font-ploni">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-xs" style={{ color: C.textMuted }}>{t.sort_order}</TableCell>
                <TableCell className="font-medium" style={{ color: C.text }}>
                  {t.name}
                  <div className="text-xs" dir="ltr" style={{ color: C.textMuted }}>{t.tier_key}</div>
                </TableCell>
                <TableCell>₪{Number(t.price).toLocaleString()}</TableCell>
                <TableCell>{t.tier_limit ?? "∞"}</TableCell>
                <TableCell>{t.needs_shipping ? "כן" : "לא"}</TableCell>
                <TableCell>{t.max_installments}</TableCell>
                <TableCell>
                  <Badge style={{ background: t.is_active ? "#dcfce7" : "#f1f5f9", color: t.is_active ? C.green : "#64748b" }}>
                    {t.is_active ? "פעילה" : "מוסתרת"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (confirm(`למחוק את "${t.name}"? (תרומות קיימות על החבילה נשארות)`)) del.mutate(t.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" style={{ color: C.red }} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {tiers.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 font-ploni" style={{ color: C.textMuted }}>אין חבילות עדיין</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-kedem">{form.id ? "עריכת חבילה" : "חבילה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>שם *</Label><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} className="mt-1" /></div>
              <div>
                <Label>מזהה (tier_key) *</Label>
                <Input value={form.tier_key ?? ""} onChange={(e) => set("tier_key", e.target.value)} dir="ltr" className="mt-1" placeholder="tier-90" disabled={!!form.id} />
              </div>
              <div><Label>מחיר (₪) *</Label><Input type="number" value={form.price || ""} onChange={(e) => set("price", Number(e.target.value))} dir="ltr" className="mt-1" /></div>
            </div>
            <div><Label>שורת תיאור</Label><Input value={form.headline ?? ""} onChange={(e) => set("headline", e.target.value)} className="mt-1" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>תג (badge)</Label><Input value={form.badge ?? ""} onChange={(e) => set("badge", e.target.value)} className="mt-1" placeholder="הכי מבוקש" /></div>
              <div><Label>הערה קטנה</Label><Input value={form.note ?? ""} onChange={(e) => set("note", e.target.value)} className="mt-1" /></div>
              <div><Label>מכסה (ריק = ללא הגבלה)</Label><Input type="number" value={form.tier_limit ?? ""} onChange={(e) => set("tier_limit", e.target.value ? Number(e.target.value) : (null as any))} dir="ltr" className="mt-1" /></div>
            </div>
            <div>
              <Label>מה מקבלים (שורה לכל פריט)</Label>
              <Textarea value={perksText} onChange={(e) => setPerksText(e.target.value)} rows={3} className="mt-1" placeholder={"ספר פיזי עד הבית\nמשלוח"} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>תמונה (URL)</Label><Input value={form.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} dir="ltr" className="mt-1" /></div>
              <div><Label>תיאור תמונה (alt)</Label><Input value={form.image_alt ?? ""} onChange={(e) => set("image_alt", e.target.value)} className="mt-1" /></div>
              <div><Label>תג על התמונה</Label><Input value={form.image_badge ?? ""} onChange={(e) => set("image_badge", e.target.value)} className="mt-1" placeholder="×2" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>מקס' תשלומים</Label><Input type="number" min={1} max={12} value={form.max_installments ?? 1} onChange={(e) => set("max_installments", Number(e.target.value))} dir="ltr" className="mt-1" /></div>
              <div><Label>סדר תצוגה</Label><Input type="number" value={form.sort_order ?? 0} onChange={(e) => set("sort_order", Number(e.target.value))} dir="ltr" className="mt-1" /></div>
            </div>
            <div className="flex flex-wrap gap-5 pt-1">
              <label className="flex items-center gap-2 text-sm font-ploni">
                <input type="checkbox" checked={form.needs_shipping ?? true} onChange={(e) => set("needs_shipping", e.target.checked)} />
                דורשת כתובת משלוח
              </label>
              <label className="flex items-center gap-2 text-sm font-ploni">
                <input type="checkbox" checked={form.highlight ?? false} onChange={(e) => set("highlight", e.target.checked)} />
                חבילה מודגשת (כרטיס כהה)
              </label>
              <label className="flex items-center gap-2 text-sm font-ploni">
                <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => set("is_active", e.target.checked)} />
                מוצגת בדף
              </label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">ביטול</Button></DialogClose>
            <Button size="sm" onClick={save} disabled={upsert.isPending} style={{ background: C.navy, color: "#fff" }}>
              {upsert.isPending ? "שומר…" : form.id ? "עדכן" : "צור חבילה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ─── לשונית הגדרות ─────────────────────────────────────── */
function jsonField(value: unknown): string {
  try {
    return JSON.stringify(value ?? [], null, 2);
  } catch {
    return "[]";
  }
}

function SettingsTab({ campaign }: { campaign: CampaignRow }) {
  const upsert = useUpsertCampaign();
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<CampaignRow>>({ ...campaign });
  const [whyJson, setWhyJson] = useState(jsonField(campaign.why_cards));
  const [phasesJson, setPhasesJson] = useState(jsonField(campaign.phases));
  const [faqJson, setFaqJson] = useState(jsonField(campaign.faq));
  const [proofJson, setProofJson] = useState(jsonField(campaign.proof_stats));

  const set = <K extends keyof CampaignRow>(k: K, v: CampaignRow[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    let why, phases, faq, proof;
    try {
      why = JSON.parse(whyJson || "[]");
      phases = JSON.parse(phasesJson || "[]");
      faq = JSON.parse(faqJson || "[]");
      proof = JSON.parse(proofJson || "[]");
      if (![why, phases, faq, proof].every(Array.isArray)) throw new Error("כל שדות ה-JSON חייבים להיות מערכים []");
    } catch (e: any) {
      toast({ title: "JSON לא תקין", description: e.message, variant: "destructive" });
      return;
    }
    try {
      await upsert.mutateAsync({
        id: campaign.id,
        title: form.title,
        subtitle: form.subtitle,
        goal_amount: Number(form.goal_amount) || 0,
        hero_eyebrow: form.hero_eyebrow,
        hero_title: form.hero_title,
        hero_title_small: form.hero_title_small,
        hero_subtitle: form.hero_subtitle,
        hero_subtitle_bold: form.hero_subtitle_bold,
        hero_image_url: form.hero_image_url,
        hero_quote: form.hero_quote,
        hero_quote_cite: form.hero_quote_cite,
        video_url: form.video_url,
        video_poster_url: form.video_poster_url,
        video_title: form.video_title,
        story_html: form.story_html,
        story_image_url: form.story_image_url,
        author_html: form.author_html,
        author_name: form.author_name,
        author_image_url: form.author_image_url,
        allow_custom_amount: form.allow_custom_amount,
        min_custom_amount: Number(form.min_custom_amount) || 18,
        why_cards: why,
        phases,
        faq,
        proof_stats: proof,
      });
      toast({ title: "ההגדרות נשמרו" });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const field = (label: string, key: keyof CampaignRow, opts?: { dir?: string; placeholder?: string }) => (
    <div>
      <Label>{label}</Label>
      <Input
        value={(form[key] as string) ?? ""}
        onChange={(e) => set(key, e.target.value as any)}
        dir={opts?.dir}
        placeholder={opts?.placeholder}
        className="mt-1"
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
        <CardHeader className="pb-2"><CardTitle className="font-kedem text-lg" style={{ color: C.navy }}>בסיס</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {field("שם הקמפיין", "title")}
          <div>
            <Label>מזהה (קבוע)</Label>
            <Input value={campaign.slug} disabled dir="ltr" className="mt-1" />
          </div>
          {field("כותרת משנה", "subtitle")}
          <div>
            <Label>יעד גיוס (₪)</Label>
            <Input type="number" value={form.goal_amount ?? 0} onChange={(e) => set("goal_amount", Number(e.target.value) as any)} dir="ltr" className="mt-1" />
          </div>
          <div className="flex items-center gap-5 md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-ploni">
              <input type="checkbox" checked={form.allow_custom_amount ?? true} onChange={(e) => set("allow_custom_amount", e.target.checked as any)} />
              לאפשר תרומה בסכום חופשי
            </label>
            <div className="flex items-center gap-2">
              <Label className="text-sm">מינימום ₪</Label>
              <Input type="number" value={form.min_custom_amount ?? 18} onChange={(e) => set("min_custom_amount", Number(e.target.value) as any)} dir="ltr" className="w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
        <CardHeader className="pb-2"><CardTitle className="font-kedem text-lg" style={{ color: C.navy }}>הירו</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {field("שורת eyebrow", "hero_eyebrow", { placeholder: 'קמפיין תמיכה · השקה סיון תשפ"ו' })}
          {field("כותרת גדולה", "hero_title")}
          {field("שורה קטנה מעל הכותרת", "hero_title_small")}
          {field("תמונת רקע (URL)", "hero_image_url", { dir: "ltr" })}
          {field("שורת פתיחה", "hero_subtitle")}
          {field("שורת פתיחה מודגשת", "hero_subtitle_bold")}
          {field("ציטוט", "hero_quote")}
          {field("מקור הציטוט", "hero_quote_cite")}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
        <CardHeader className="pb-2"><CardTitle className="font-kedem text-lg" style={{ color: C.navy }}>וידאו + סיפור + כותב</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            {field("וידאו (mp4 / YouTube / Drive)", "video_url", { dir: "ltr" })}
            {field("פוסטר לוידאו", "video_poster_url", { dir: "ltr" })}
            {field("כותרת הוידאו", "video_title")}
          </div>
          <div>
            <Label>הסיפור (HTML — פסקאות {"<p>"})</Label>
            <Textarea value={form.story_html ?? ""} onChange={(e) => set("story_html", e.target.value as any)} rows={5} dir="rtl" className="mt-1 font-mono text-xs" />
          </div>
          {field("תמונת הסיפור (URL)", "story_image_url", { dir: "ltr" })}
          <div className="grid gap-3 md:grid-cols-2">
            {field("שם הכותב/היוזם", "author_name")}
            {field("תמונת הכותב (URL)", "author_image_url", { dir: "ltr" })}
          </div>
          <div>
            <Label>על הכותב (HTML)</Label>
            <Textarea value={form.author_html ?? ""} onChange={(e) => set("author_html", e.target.value as any)} rows={4} dir="rtl" className="mt-1 font-mono text-xs" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
        <CardHeader className="pb-2">
          <CardTitle className="font-kedem text-lg" style={{ color: C.navy }}>סקשנים מובנים (JSON)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>שורת הוכחה — proof_stats [{"{val,label,icon}"}]</Label>
            <Textarea value={proofJson} onChange={(e) => setProofJson(e.target.value)} rows={6} dir="ltr" className="mt-1 font-mono text-xs" />
          </div>
          <div>
            <Label>למה עכשיו — why_cards [{"{num,title,body}"}]</Label>
            <Textarea value={whyJson} onChange={(e) => setWhyJson(e.target.value)} rows={6} dir="ltr" className="mt-1 font-mono text-xs" />
          </div>
          <div>
            <Label>ציר זמן — phases [{"{label,sub,done,current}"}]</Label>
            <Textarea value={phasesJson} onChange={(e) => setPhasesJson(e.target.value)} rows={6} dir="ltr" className="mt-1 font-mono text-xs" />
          </div>
          <div>
            <Label>שאלות ותשובות — faq [{"{q,a}"}]</Label>
            <Textarea value={faqJson} onChange={(e) => setFaqJson(e.target.value)} rows={6} dir="ltr" className="mt-1 font-mono text-xs" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={upsert.isPending} style={{ background: C.navy, color: "#fff" }}>
          {upsert.isPending ? "שומר…" : "שמור הגדרות"}
        </Button>
      </div>
    </div>
  );
}

/* ─── עמוד ──────────────────────────────────────────────── */
export default function CampaignDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useCampaignBySlug(slug);

  if (isLoading) {
    return (
      <AdminLayout>
        <p className="text-center py-16 font-ploni" style={{ color: C.textMuted }}>טוען קמפיין…</p>
      </AdminLayout>
    );
  }

  if (!data?.campaign) {
    return (
      <AdminLayout>
        <div className="text-center py-16 space-y-3" dir="rtl">
          <p className="font-ploni" style={{ color: C.textMuted }}>הקמפיין לא נמצא.</p>
          <Link to="/admin/campaigns" className="underline font-ploni" style={{ color: C.gold }}>חזרה לרשימת הקמפיינים</Link>
        </div>
      </AdminLayout>
    );
  }

  const { campaign, tiers } = data;

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link to="/admin/campaigns" className="inline-flex items-center gap-1 text-sm font-ploni mb-1" style={{ color: C.textMuted }}>
              <ArrowRight className="h-3.5 w-3.5" /> כל הקמפיינים
            </Link>
            <h1 className="text-3xl font-kedem font-bold flex items-center gap-2" style={{ color: C.navy }}>
              <Target className="w-7 h-7" style={{ color: C.gold }} aria-hidden />
              {campaign.title}
              <Badge style={{ background: campaign.is_active ? "#dcfce7" : "#f1f5f9", color: campaign.is_active ? C.green : "#64748b" }}>
                {campaign.is_active ? "פעיל" : "כבוי"}
              </Badge>
            </h1>
          </div>
          <Button variant="outline" className="gap-1.5 font-ploni" onClick={() => window.open(`/campaign/${campaign.slug}`, "_blank")}>
            <ExternalLink className="h-4 w-4" /> לדף הציבורי
          </Button>
        </div>

        <Tabs defaultValue="dashboard" dir="rtl">
          <TabsList>
            <TabsTrigger value="dashboard" className="font-ploni">דשבורד</TabsTrigger>
            <TabsTrigger value="tiers" className="font-ploni">חבילות</TabsTrigger>
            <TabsTrigger value="settings" className="font-ploni">הגדרות</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-5">
            <DashboardTab campaign={campaign} tiers={tiers} />
          </TabsContent>
          <TabsContent value="tiers" className="mt-5">
            <TiersTab campaign={campaign} tiers={tiers} />
          </TabsContent>
          <TabsContent value="settings" className="mt-5">
            <SettingsTab campaign={campaign} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
