/**
 * Admin · קמפיינים — /admin/campaigns (רמה 30, 27.7.2026)
 *
 * רשימת קמפייני-גיוס: יצירה, הפעלה/כיבוי, כניסה לדשבורד-קמפיין.
 * דפוס זהה ל-Kenes.tsx (טבלת events). דאטה: campaigns + view campaign_stats.
 *
 * ⚠️ כיבוי קמפיין מכבה גם את הסליקה שלו (טריגר DB מסנכרן payment_products.active
 * → create-payment מחזיר 403). לכן הכיבוי עובר דיאלוג אישור מפורש.
 * קמפיין חדש נוצר כבוי (is_active=false) — הסליקה נפתחת רק בהפעלה מפורשת.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Target, Plus, Power, ExternalLink, LayoutDashboard, Users2 } from "lucide-react";
import { useCampaignsAdmin, useCampaignStatsMap, useUpsertCampaign, useDeleteCampaign, type CampaignRow } from "@/hooks/useCampaigns";
import { useToast } from "@/hooks/use-toast";

const C = { navy: "#1A2744", gold: "#8B6F47", goldShimmer: "#E8D5A0", text: "#2D1F0E", textMuted: "#6B5C4A", green: "#059669", red: "#b91c1c" };

export default function Campaigns() {
  const navigate = useNavigate();
  const { data: campaigns, isLoading } = useCampaignsAdmin();
  const { data: statsMap } = useCampaignStatsMap();
  const upsert = useUpsertCampaign();
  const del = useDeleteCampaign();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [toggleTarget, setToggleTarget] = useState<CampaignRow | null>(null);

  const rows = campaigns ?? [];

  const create = async () => {
    const slug = newSlug.trim().toLowerCase();
    if (!newTitle.trim() || !slug) {
      toast({ title: "חסר", description: "שם ומזהה (slug) חובה", variant: "destructive" });
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      toast({ title: "מזהה לא תקין", description: "אותיות לטיניות קטנות, ספרות ומקפים בלבד", variant: "destructive" });
      return;
    }
    try {
      await upsert.mutateAsync({
        slug,
        title: newTitle.trim(),
        goal_amount: Number(newGoal) || 0,
        is_active: false, // הסליקה נפתחת רק בהפעלה מפורשת
      });
      toast({ title: "הקמפיין נוצר (כבוי)", description: "עכשיו אפשר להגדיר תוכן וחבילות, ואז להפעיל" });
      setCreateOpen(false);
      setNewTitle(""); setNewSlug(""); setNewGoal("");
      navigate(`/admin/campaigns/${slug}`);
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const confirmToggle = async () => {
    if (!toggleTarget) return;
    try {
      await upsert.mutateAsync({ id: toggleTarget.id, is_active: !toggleTarget.is_active });
      toast({ title: toggleTarget.is_active ? "הקמפיין כובה — הסליקה שלו נעצרה" : "הקמפיין הופעל — הדף והסליקה חיים" });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    } finally {
      setToggleTarget(null);
    }
  };

  const remove = async (c: CampaignRow) => {
    const stats = statsMap?.[c.slug];
    if (stats && (stats.supporters > 0 || stats.pending_count > 0)) {
      toast({
        title: "אי אפשר למחוק קמפיין עם תרומות",
        description: "יש רשומות תרומה שמצביעות עליו. כבו אותו במקום למחוק.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`למחוק את "${c.title}"? (שורת הסליקה תכובה, לא תימחק)`)) return;
    try {
      await del.mutateAsync(c.id);
      toast({ title: "הקמפיין נמחק" });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-kedem font-bold flex items-center gap-2" style={{ color: C.navy }}>
              <Target className="w-7 h-7" style={{ color: C.gold }} aria-hidden />
              קמפיינים
            </h1>
            <p className="font-ploni mt-1" style={{ color: C.textMuted }}>
              קמפייני גיוס — דף ציבורי, חבילות תמיכה, סליקה ותרומות · הכל ממקום אחד
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="font-ploni gap-1.5" style={{ background: C.navy, color: "#fff" }}>
            <Plus className="h-4 w-4" /> קמפיין חדש
          </Button>
        </div>

        <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
          <CardHeader className="pb-2">
            <CardTitle className="font-kedem text-lg" style={{ color: C.navy }}>הקמפיינים ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-10 font-ploni" style={{ color: C.textMuted }}>טוען…</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right font-ploni">קמפיין</TableHead>
                    <TableHead className="text-right font-ploni">מזהה</TableHead>
                    <TableHead className="text-right font-ploni">גויס</TableHead>
                    <TableHead className="text-right font-ploni">תומכים</TableHead>
                    <TableHead className="text-right font-ploni">סטטוס</TableHead>
                    <TableHead className="text-right font-ploni">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => {
                    const stats = statsMap?.[c.slug];
                    const raised = stats?.raised ?? 0;
                    const goal = Number(c.goal_amount) || 0;
                    const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : null;
                    return (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/admin/campaigns/${c.slug}`)}>
                        <TableCell className="font-medium" style={{ color: C.text }}>
                          {c.title}
                          {c.subtitle && <div className="text-xs" style={{ color: C.textMuted }}>{c.subtitle}</div>}
                        </TableCell>
                        <TableCell dir="ltr" className="text-left text-xs" style={{ color: C.textMuted }}>{c.slug}</TableCell>
                        <TableCell>
                          <div className="text-sm font-bold" style={{ color: C.navy }}>₪{raised.toLocaleString()}</div>
                          {goal > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ background: "#e5e0d5" }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#E8C97A,#B98A3C)" }} />
                              </div>
                              <span className="text-xs" style={{ color: C.textMuted }}>{pct}% מ-₪{goal.toLocaleString()}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-sm">
                            <Users2 className="h-3.5 w-3.5" style={{ color: C.gold }} />
                            {stats?.supporters ?? 0}
                            {stats && stats.pending_count > 0 && (
                              <span className="text-xs" style={{ color: C.textMuted }}>(+{stats.pending_count} ממתינים)</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge style={{ background: c.is_active ? "#dcfce7" : "#f1f5f9", color: c.is_active ? C.green : "#64748b" }}>
                            {c.is_active ? "פעיל" : "כבוי"}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="דשבורד הקמפיין" onClick={() => navigate(`/admin/campaigns/${c.slug}`)}>
                              <LayoutDashboard className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="פתח את הדף הציבורי" onClick={() => window.open(`/campaign/${c.slug}`, "_blank")}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={c.is_active ? "כבה (עוצר סליקה!)" : "הפעל"} onClick={() => setToggleTarget(c)}>
                              <Power className="h-4 w-4" style={{ color: c.is_active ? C.green : "#94a3b8" }} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 font-ploni" style={{ color: C.textMuted }}>
                        אין קמפיינים עדיין — צרו קמפיין חדש
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <p className="text-xs font-ploni" style={{ color: C.textMuted }}>
          מחיקת קמפיין אפשרית רק כשאין עליו תרומות. קמפיין שהסתיים — לכבות, לא למחוק (הנתונים נשארים בסליקות ובדשבורד).
        </p>
      </div>

      {/* דיאלוג יצירה */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-kedem">קמפיין חדש</DialogTitle>
            <DialogDescription className="font-ploni">
              הקמפיין נוצר כבוי. מגדירים תוכן וחבילות בדשבורד — ואז מפעילים (דף + סליקה).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>שם הקמפיין *</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="mt-1" placeholder='למשל: קמפיין ספר שופטים' />
            </div>
            <div>
              <Label>מזהה (slug) *</Label>
              <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} dir="ltr" className="mt-1" placeholder="shoftim-campaign" />
              <p className="text-xs mt-1" style={{ color: C.textMuted }}>
                הכתובת תהיה ‎/campaign/‏{newSlug || "…"} — המזהה משמש גם את הסליקה, לא ניתן לשינוי אחר כך.
              </p>
            </div>
            <div>
              <Label>יעד גיוס (₪)</Label>
              <Input type="number" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} dir="ltr" className="mt-1" placeholder="80000" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">ביטול</Button></DialogClose>
            <Button size="sm" onClick={create} disabled={upsert.isPending} style={{ background: C.navy, color: "#fff" }}>
              {upsert.isPending ? "יוצר…" : "צור קמפיין"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* דיאלוג אישור הפעלה/כיבוי — כיבוי עוצר סליקה */}
      <Dialog open={!!toggleTarget} onOpenChange={(o) => !o && setToggleTarget(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-kedem">
              {toggleTarget?.is_active ? `לכבות את "${toggleTarget?.title}"?` : `להפעיל את "${toggleTarget?.title}"?`}
            </DialogTitle>
            <DialogDescription className="font-ploni leading-relaxed">
              {toggleTarget?.is_active ? (
                <>
                  כיבוי מסתיר את הדף הציבורי <b>ועוצר את הסליקה</b> של הקמפיין — כל ניסיון תשלום חדש
                  (כולל מדפים ישנים שמפנים אליו) יידחה. תרומות שכבר בוצעו לא נפגעות.
                </>
              ) : (
                <>הפעלה פותחת את הדף הציבורי ב-‎/campaign/‏{toggleTarget?.slug} ומדליקה את הסליקה שלו.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setToggleTarget(null)}>ביטול</Button>
            <Button
              size="sm"
              onClick={confirmToggle}
              disabled={upsert.isPending}
              style={{ background: toggleTarget?.is_active ? C.red : C.green, color: "#fff" }}
            >
              {toggleTarget?.is_active ? "כבה קמפיין וסליקה" : "הפעל קמפיין"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
