/**
 * Admin Subscribers — /admin/subscribers
 *
 * Manages user_access_tags with tag='program:weekly-chapter'.
 * Gold/parchment/navy palette — same design system as Payments.tsx.
 * RTL throughout. Admin-only.
 *
 * Features:
 *  - KPI cards: active, linked, pending, expired
 *  - Table with search + status filter
 *  - Add subscriber dialog (INSERT with source='admin')
 *  - End subscription per row (SET valid_until=NOW())
 *  - Import from Smoove placeholder (UI only, no live import)
 *  - CSV export
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCheck,
  Users,
  Clock,
  AlertCircle,
  Search,
  Download,
  Plus,
  X,
  Upload,
  CheckCircle2,
  Link2,
  Link2Off,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useMondayInsights } from "@/hooks/useMondayInsights";
import { RefreshCw, AlertTriangle } from "lucide-react";

/* ─── Color tokens — same as Payments.tsx ─────────────────────── */
const C = {
  gold: "#8B6F47",
  goldLight: "#C4A265",
  goldShimmer: "#E8D5A0",
  parchment: "#FAF6F0",
  parchmentDark: "#F5F0E8",
  navy: "#1A2744",
  navyMid: "#243158",
  text: "#2D1F0E",
  textMuted: "#6B5C4A",
  textSubtle: "#A69882",
  border: "rgba(139,111,71,0.18)",
  green: "#15803d",
  greenBg: "#dcfce7",
  red: "#b91c1c",
  redBg: "#fee2e2",
  amber: "#92400e",
  amberBg: "#fef3c7",
  blue: "#1e40af",
  blueBg: "#dbeafe",
};

/* ─── Types ─────────────────────────────────────────────────────── */
interface SubscriberRow {
  id: string;
  user_id: string | null;
  email: string | null;
  display_name: string | null;
  tag: string;
  valid_until: string | null;
  source: string | null;
  grow_order_id: string | null;
  pending_user_link: boolean | null;
  created_at: string;
}

type StatusFilter = "all" | "active" | "linked" | "pending" | "expired";

/* ─── Helpers ─────────────────────────────────────────────────── */
function isExpired(row: SubscriberRow): boolean {
  if (!row.valid_until) return false;
  return new Date(row.valid_until) < new Date();
}

function isActive(row: SubscriberRow): boolean {
  return !isExpired(row);
}

function isLinked(row: SubscriberRow): boolean {
  return row.user_id != null && !row.pending_user_link;
}

function isPending(row: SubscriberRow): boolean {
  return !!row.pending_user_link;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── Status badge ─────────────────────────────────────────────── */
type BadgeVariant = "green" | "amber" | "red" | "blue" | "grey";

function StatusBadge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  const styles: Record<BadgeVariant, { bg: string; color: string }> = {
    green: { bg: C.greenBg,  color: C.green  },
    amber: { bg: C.amberBg,  color: C.amber  },
    red:   { bg: C.redBg,    color: C.red    },
    blue:  { bg: C.blueBg,   color: C.blue   },
    grey:  { bg: "#f1f5f9",  color: "#475569" },
  };
  const s = styles[variant];
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: 99,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {children}
    </span>
  );
}

function rowBadge(row: SubscriberRow) {
  if (isExpired(row)) return <StatusBadge variant="red">פג תוקף</StatusBadge>;
  if (isPending(row)) return <StatusBadge variant="amber"><Clock size={10} />ממתין לקישור</StatusBadge>;
  if (isLinked(row))  return <StatusBadge variant="green"><Link2 size={10} />מקושר</StatusBadge>;
  return <StatusBadge variant="blue"><Link2Off size={10} />לא מקושר</StatusBadge>;
}

/* ─── KPI Card ─────────────────────────────────────────────────── */
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = C.gold,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "white",
        border: `1.5px solid ${C.border}`,
        borderRadius: 16,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 4,
          height: "100%",
          background: accent,
          borderRadius: "0 16px 16px 0",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            background: C.parchment,
            borderRadius: 10,
            padding: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={18} color={accent} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>{label}</span>
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          color: C.navy,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          paddingInlineEnd: 8,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.textSubtle, paddingInlineEnd: 8 }}>{sub}</div>}
    </div>
  );
}

/* ─── Loading shimmer rows ──────────────────────────────────────── */
function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          {[...Array(cols)].map((_, j) => (
            <TableCell key={j}>
              <div
                style={{
                  height: 14,
                  borderRadius: 6,
                  background:
                    "linear-gradient(90deg, #f0ece6 25%, #e8e0d4 50%, #f0ece6 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.4s infinite",
                  width: j === 0 ? 140 : "80%",
                }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/* ─── CSV export ──────────────────────────────────────────────── */
const esc = (v: unknown) => {
  if (v == null) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};

function downloadCSV(headers: string[], rows: unknown[][], filename: string) {
  const BOM = "﻿";
  const lines = [headers.join(","), ...rows.map((r) => r.map(esc).join(","))];
  const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportSubscribers(rows: SubscriberRow[]) {
  const headers = ["אימייל", "סטטוס", "קישור user_id", "תוקף עד", "מקור", "grow_order_id", "תאריך הוספה"];
  const data = rows.map((r) => [
    r.email || r.display_name || "",
    isExpired(r) ? "פג תוקף" : isPending(r) ? "ממתין" : isLinked(r) ? "מקושר" : "לא מקושר",
    r.user_id ?? "",
    r.valid_until ? fmtDate(r.valid_until) : "ללא הגבלה",
    r.source ?? "",
    r.grow_order_id ?? "",
    fmtDateTime(r.created_at),
  ]);
  downloadCSV(headers, data, `subscribers-${new Date().toISOString().slice(0, 10)}.csv`);
}

/* ─── Supabase query ─────────────────────────────────────────── */
const WEEKLY_TAG = "program:weekly-chapter";

// תכניות מנויים מקבילות (2.7.2026). הפרק השבועי = הראשית; איכה-שני = מקבילה
// שתתמזג בעתיד. שתיהן מנוהלות באותו מסך.
const PROGRAMS = [
  { tag: WEEKLY_TAG, label: "הפרק השבועי" },
  { tag: "program:eicha-monday", label: "איכה — ימי שני" },
] as const;
const PROGRAM_TAGS = PROGRAMS.map((p) => p.tag);
const programLabel = (tag: string) => PROGRAMS.find((p) => p.tag === tag)?.label ?? tag;

function useSubscribers() {
  return useQuery<SubscriberRow[]>({
    queryKey: ["admin-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_access_tags" as never)
        .select("id, user_id, email, display_name, tag, valid_until, source, grow_order_id, pending_user_link, created_at")
        .in("tag" as never, PROGRAM_TAGS as never)
        .order("created_at" as never, { ascending: false });
      if (error) throw error;
      return (data ?? []) as SubscriberRow[];
    },
  });
}

/* ─── Add subscriber dialog ─────────────────────────────────── */
function AddSubscriberDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [program, setProgram] = useState<string>(WEEKLY_TAG);

  const add = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        email: email.trim().toLowerCase(),
        tag: program,
        source: "admin",
        pending_user_link: false,
      };
      if (validUntil) payload.valid_until = new Date(validUntil).toISOString();

      const { error } = await supabase
        .from("user_access_tags" as never)
        .insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscribers"] });
      toast.success(`מנוי נוסף: ${email}`);
      setEmail("");
      setValidUntil("");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(`שגיאה: ${err.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-display, serif)", color: C.navy }}>
            הוספת מנוי ידנית
          </DialogTitle>
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <Label>תכנית</Label>
            <Select value={program} onValueChange={setProgram}>
              <SelectTrigger style={{ marginTop: 4 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROGRAMS.map((p) => (
                  <SelectItem key={p.tag} value={p.tag}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>אימייל *</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              dir="ltr"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Label>תוקף עד (ריק = ללא הגבלה)</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              style={{ marginTop: 4 }}
              dir="ltr"
            />
          </div>
          <div
            style={{
              background: C.parchment,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 12,
              color: C.textMuted,
            }}
          >
            המנוי יתווסף עם <strong>source='admin'</strong>. אם יש משתמש רשום עם האימייל הזה, הוא יקושר אוטומטית בכניסה הבאה שלו.
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">ביטול</Button>
          </DialogClose>
          <Button
            size="sm"
            disabled={!email.trim() || add.isPending}
            onClick={() => add.mutate()}
            style={{ background: C.navy, color: "white" }}
          >
            {add.isPending ? "מוסיף..." : "הוסף מנוי"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Smoove import placeholder dialog ──────────────────────── */
function SmooveImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-display, serif)", color: C.navy }}>
            ייבוא מ-Smoove
          </DialogTitle>
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: C.amberBg,
              border: `1px solid ${C.goldShimmer}`,
              borderRadius: 12,
              padding: "14px 16px",
              fontSize: 13,
              color: C.amber,
              lineHeight: 1.6,
            }}
          >
            <strong>ייבוא Smoove</strong> — 288 מנויי הרשימה ייובאו ל-user_access_tags עם tag='program:weekly-chapter'.
            <br /><br />
            הייבוא יורץ ע"י סאר ידנית כדי לאמת שהרשימה עדכנית לפני ייבוא.
            <br /><br />
            מנויים שכבר קיימים ב-DB לא ייובאו כפולים (upsert on email+tag).
          </div>

          <Button
            disabled
            size="lg"
            style={{
              background: "#e2e8f0",
              color: "#94a3b8",
              cursor: "not-allowed",
              width: "100%",
            }}
          >
            <Upload size={16} style={{ marginLeft: 8 }} />
            ייבא 288 מנויים מ-Smoove (דורש אישור סאר — יורץ ידנית)
          </Button>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">סגור</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── End subscription mutation ────────────────────────────────── */
function useEndSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_access_tags" as never)
        .update({ valid_until: new Date().toISOString() } as never)
        .eq("id" as never, id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscribers"] });
      toast.success("המנוי הסתיים");
    },
    onError: (err: Error) => {
      toast.error(`שגיאה: ${err.message}`);
    },
  });
}

/* ─── MAIN PAGE ─────────────────────────────────────────────── */
export default function Subscribers() {
  const { data, isLoading, error } = useSubscribers();
  const endSub = useEndSubscription();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [smooveOpen, setSmooveOpen] = useState(false);
  const [endConfirm, setEndConfirm] = useState<string | null>(null);

  const allRows = data ?? [];
  const rows = programFilter === "all" ? allRows : allRows.filter((r) => r.tag === programFilter);

  /* KPIs */
  const kpiActive  = rows.filter(isActive).length;
  const kpiLinked  = rows.filter(isLinked).length;
  const kpiPending = rows.filter(isPending).length;
  const kpiExpired = rows.filter(isExpired).length;
  const kpiNewMonth = rows.filter(
    (r) => new Date(r.created_at).getTime() >= Date.now() - 30 * 86400000,
  ).length;

  /* ── Source reconciliation: Monday vs DB vs Smoove ── */
  const qc = useQueryClient();
  const { data: monday } = useMondayInsights();
  const mondayActive = monday?.current?.active ?? null;
  const smooveOrigin = rows.filter((r) => (r.source ?? "").startsWith("smoove") && isActive(r)).length;
  const growOrigin   = rows.filter((r) => (r.source ?? "").startsWith("grow") && isActive(r)).length;
  const adminOrigin  = rows.filter((r) => (r.source ?? "") === "admin" && isActive(r)).length;
  const mondayGap = mondayActive != null ? mondayActive - kpiActive : null;
  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-subscribers"] });
    qc.invalidateQueries({ queryKey: ["monday-insights"] });
    toast.success("הנתונים רועננו מ-DB ו-Monday");
  };

  /* Filtered table */
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter === "active"  && !isActive(r))  return false;
      if (statusFilter === "linked"  && !isLinked(r))  return false;
      if (statusFilter === "pending" && !isPending(r)) return false;
      if (statusFilter === "expired" && !isExpired(r)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.email?.toLowerCase().includes(q) ||
          r.display_name?.toLowerCase().includes(q) ||
          r.source?.toLowerCase().includes(q) ||
          r.grow_order_id?.toLowerCase().includes(q) || false
        );
      }
      return true;
    });
  }, [rows, search, statusFilter]);

  return (
    <AdminLayout>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 900,
                color: C.navy,
                fontFamily: "var(--font-display, serif)",
                letterSpacing: "-0.02em",
              }}
            >
              מנויי תכנית הפרק השבועי
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: C.textMuted }}>
              ניהול מנויים פעילים ·{" "}
              <code style={{ fontSize: 12, background: C.parchment, padding: "1px 6px", borderRadius: 4 }}>
                {WEEKLY_TAG}
              </code>
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => setSmooveOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: C.parchment,
                border: `1.5px solid ${C.border}`,
                borderRadius: 10,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                color: C.gold,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Upload size={14} />
              ייבא מ-Smoove
            </button>

            <button
              onClick={() => exportSubscribers(filtered)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: C.parchment,
                border: `1.5px solid ${C.border}`,
                borderRadius: 10,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                color: C.gold,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Download size={14} />
              ייצוא CSV ({filtered.length})
            </button>

            <button
              onClick={() => setAddOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: C.navy,
                border: "none",
                borderRadius: 10,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                color: "white",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Plus size={14} />
              הוסף מנוי
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
          }}
        >
          <KpiCard
            icon={UserCheck}
            label="מנויים פעילים"
            value={isLoading ? "..." : kpiActive}
            sub="valid_until ריק או עתידי"
            accent={C.gold}
          />
          <KpiCard
            icon={Plus}
            label="חדשים החודש"
            value={isLoading ? "..." : kpiNewMonth}
            sub="נוספו ב-30 הימים האחרונים"
            accent={C.blue}
          />
          <KpiCard
            icon={CheckCircle2}
            label="מקושרים"
            value={isLoading ? "..." : kpiLinked}
            sub="user_id קיים + לא pending"
            accent={C.green}
          />
          <KpiCard
            icon={Clock}
            label="ממתינים לקישור"
            value={isLoading ? "..." : kpiPending}
            sub="pending_user_link = true"
            accent={C.amber}
          />
          <KpiCard
            icon={AlertCircle}
            label="פג תוקף"
            value={isLoading ? "..." : kpiExpired}
            sub="valid_until עבר"
            accent={C.red}
          />
        </div>

        {/* ── Source reconciliation: Monday vs DB vs Smoove ── */}
        <div
          style={{
            background: "white", border: `1.5px solid ${C.border}`, borderRadius: 16,
            padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.navy, fontFamily: "var(--font-display, serif)" }}>פיוס מקורות — מנויים פעילים</span>
            </div>
            <button
              onClick={refreshAll}
              style={{ display: "flex", alignItems: "center", gap: 6, background: C.parchment, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "6px 14px", fontSize: 13, fontWeight: 700, color: C.gold, cursor: "pointer" }}
            >
              <RefreshCw size={14} /> רענן
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {[
              { label: "Monday (רשמי)", value: mondayActive ?? "—", note: monday ? "לוח יואב" : "edge לא פרוס", accent: C.navy },
              { label: "DB (אתר)", value: isLoading ? "…" : kpiActive, note: "user_access_tags", accent: C.gold },
              { label: "מקור Smoove", value: isLoading ? "…" : smooveOrigin, note: "ייבוא/סנכרון", accent: C.green },
              { label: "מקור Grow", value: isLoading ? "…" : growOrigin, note: "תשלום ישיר", accent: C.blue },
              { label: "מקור אדמין", value: isLoading ? "…" : adminOrigin, note: "הוזן ידנית", accent: C.amber },
            ].map((s) => (
              <div key={s.label} style={{ background: C.parchment, borderRadius: 12, padding: "12px 14px", borderInlineStart: `3px solid ${s.accent}` }}>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: C.navy, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.textSubtle, marginTop: 3 }}>{s.note}</div>
              </div>
            ))}
          </div>

          {mondayGap != null && Math.abs(mondayGap) >= 5 && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: C.amberBg, border: `1px solid ${C.goldShimmer}`, borderRadius: 10, padding: "10px 14px" }}>
              <AlertTriangle size={18} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: C.amber, lineHeight: 1.5 }}>
                פער של <strong>{Math.abs(mondayGap)}</strong> בין Monday ({mondayActive}) ל-DB ({kpiActive}).
                Monday מתוחזק ידנית ע"י יואב; ה-DB משקף את סנכרון-Smoove (מנויים שפג-תוקפם סומנו soft-delete).
                החלט מי המספר הרשמי — או השווה מול רשימת Smoove (288) ליישוב.
              </span>
            </div>
          )}
          {monday == null && (
            <div style={{ fontSize: 12, color: C.textSubtle }}>
              נתוני Monday יופיעו כאן לאחר פריסת edge <code>monday-insights</code>. הסנכרון מ-Smoove רץ אוטומטית מדי שעה (cron).
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 360 }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                insetInlineEnd: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: C.textMuted,
              }}
            />
            <Input
              placeholder="חיפוש: אימייל, מקור, grow ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingInlineEnd: 32, direction: "rtl" }}
            />
          </div>

          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger style={{ width: 180 }}>
              <SelectValue placeholder="תכנית" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל התכניות</SelectItem>
              {PROGRAMS.map((p) => (
                <SelectItem key={p.tag} value={p.tag}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger style={{ width: 170 }}>
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="active">פעיל</SelectItem>
              <SelectItem value="linked">מקושר</SelectItem>
              <SelectItem value="pending">ממתין לקישור</SelectItem>
              <SelectItem value="expired">פג תוקף</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: C.redBg,
              color: C.red,
              borderRadius: 10,
              padding: "10px 16px",
              fontSize: 13,
            }}
          >
            שגיאה בטעינה: {(error as Error).message}
          </div>
        )}

        {/* Table */}
        <Card style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow style={{ background: C.parchment }}>
                  <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>אימייל</TableHead>
                  <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>סטטוס קישור</TableHead>
                  <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>תוקף עד</TableHead>
                  <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>מקור</TableHead>
                  <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>תאריך הוספה</TableHead>
                  <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <LoadingRows cols={6} />
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12" style={{ color: C.textMuted }}>
                      {rows.length === 0
                        ? "אין מנויים עדיין — הוסף ידנית או ייבא מ-Smoove"
                        : "אין תוצאות לפילטר הנוכחי"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow
                      key={row.id}
                      className="hover:bg-amber-50/60"
                      style={{ opacity: isExpired(row) ? 0.6 : 1 }}
                    >
                      <TableCell>
                        {row.email ? (
                          <span dir="ltr" style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                            {row.email}
                          </span>
                        ) : (
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                            {row.display_name || "(ללא זיהוי)"}
                            <span style={{ fontSize: 10, color: C.textSubtle, display: "block" }}>
                              מ-Monday, בלי מייל — להשלים ידנית
                            </span>
                          </span>
                        )}
                        {row.grow_order_id && (
                          <div style={{ fontSize: 10, color: C.textSubtle, fontFamily: "monospace", marginTop: 2 }}>
                            Grow: {row.grow_order_id}
                          </div>
                        )}
                        {row.tag !== WEEKLY_TAG && (
                          <div style={{ fontSize: 10, color: C.gold, marginTop: 2 }}>
                            {programLabel(row.tag)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{rowBadge(row)}</TableCell>
                      <TableCell style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>
                        {row.valid_until ? (
                          <span style={{ color: isExpired(row) ? C.red : C.text }}>
                            {fmtDate(row.valid_until)}
                          </span>
                        ) : (
                          <span style={{ color: C.textSubtle }}>ללא הגבלה</span>
                        )}
                      </TableCell>
                      <TableCell style={{ fontSize: 12, color: C.textMuted }}>{row.source ?? "—"}</TableCell>
                      <TableCell style={{ fontSize: 11, color: C.textSubtle, whiteSpace: "nowrap" }}>
                        {fmtDateTime(row.created_at)}
                      </TableCell>
                      <TableCell>
                        {!isExpired(row) && (
                          <button
                            onClick={() => setEndConfirm(row.id)}
                            style={{
                              background: C.redBg,
                              color: C.red,
                              border: "none",
                              borderRadius: 8,
                              padding: "4px 12px",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <X size={12} />
                            סיים מנוי
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div style={{ fontSize: 12, color: C.textSubtle, textAlign: "center" }}>
          מציג {filtered.length} מתוך {rows.length} מנויים
        </div>
      </div>

      {/* ── Dialogs ── */}
      <AddSubscriberDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <SmooveImportDialog open={smooveOpen} onClose={() => setSmooveOpen(false)} />

      {/* End-subscription confirmation */}
      <Dialog open={!!endConfirm} onOpenChange={(v) => !v && setEndConfirm(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle style={{ color: C.red }}>סיום מנוי</DialogTitle>
          </DialogHeader>
          <p style={{ fontSize: 14, color: C.text }}>
            האם לסיים את המנוי עכשיו? ה-valid_until יוגדר לרגע זה ולמשתמש לא תהיה גישה מיידית.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEndConfirm(null)}>
              ביטול
            </Button>
            <Button
              size="sm"
              style={{ background: C.red, color: "white" }}
              disabled={endSub.isPending}
              onClick={() => {
                if (endConfirm) {
                  endSub.mutate(endConfirm);
                  setEndConfirm(null);
                }
              }}
            >
              {endSub.isPending ? "מסיים..." : "סיים מנוי"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
