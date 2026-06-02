/**
 * Admin Payments — /admin/payments
 *
 * Unified payments dashboard: Orders + Donations + Payment Products config.
 * KPI cards from live data (this-month window).
 * CSV export per tab.
 * Row-click → drawer with full details + raw_payload preview.
 *
 * Gold/parchment/navy palette aligned with DesignPreviewYehoshuaAdmin quality bar.
 * RTL throughout (dir="rtl" on every container, logical CSS).
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  ShoppingBag,
  Heart,
  TrendingUp,
  Search,
  Download,
  ChevronDown,
  X,
  Repeat2,
  Package,
  FileText,
  Pencil,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL_RUNTIME, SUPABASE_ANON_KEY_RUNTIME } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* ─── Color tokens (gold / parchment / navy — mirrors design system) ─── */
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

/* ─── Types ─────────────────────────────────────────────────────────── */
interface Order {
  id: string;
  created_at: string;
  order_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  total: number | null;
  subtotal: number | null;
  discount: number | null;
  currency: string | null;
  installments: number | null;
  payment_id: string | null;
  payment_method: string | null;
  payment_status: string | null;
  status: string | null;
  invoice_url: string | null;
  invoice_number: string | null;
  asmachta: string | null;
  card_suffix: string | null;
  product: string | null;
  smoove_list_id: number | null;
  smoove_subscribed: boolean | null;
  raw_payload: Record<string, unknown> | null;
}

interface Donation {
  id: string;
  created_at: string;
  amount: number | null;
  donor_name: string | null;
  donor_email: string | null;
  phone: string | null;
  dedication_name: string | null;
  dedication_type: string | null;
  payment_status: string | null;
  is_monthly: boolean | null;
  payment_id: string | null;
  asmachta: string | null;
  card_suffix: string | null;
  product: string | null;
  source: string | null;
  tier_id: string | null;
  tier_name: string | null;
  tier_perks: Record<string, unknown> | null;
  shipping_street: string | null;
  shipping_house_number: string | null;
  shipping_city: string | null;
  shipping_zip: string | null;
  shipping_notes: string | null;
  invoice_url: string | null;
  smoove_list_id: number | null;
  raw_payload: Record<string, unknown> | null;
}

interface PaymentProduct {
  id: string;
  display_name: string | null;
  type: string | null;
  page_code_env: string | null;
  default_amount: number | null;
  max_installments: number | null;
  active: boolean | null;
  smoove_list_id: number | null;
  target_table: string | null;
}

/* ─── Helpers ─────────────────────────────────────────────────────── */
function fmtILS(n: number | null | undefined) {
  if (n == null) return "—";
  return "₪" + Number(n).toLocaleString("he-IL");
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateShort(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function isThisMonth(iso: string | null | undefined) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

/* ─── Status badge ─────────────────────────────────────────────── */
type BadgeVariant = "green" | "amber" | "red" | "blue" | "grey";

function paymentStatusBadge(status: string | null) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    completed: { variant: "green", label: "שולם" },
    paid: { variant: "green", label: "שולם" },
    pending: { variant: "amber", label: "ממתין" },
    failed: { variant: "red", label: "נכשל" },
    cancelled: { variant: "red", label: "בוטל" },
    refunded: { variant: "blue", label: "זוכה" },
  };
  const s = map[status ?? ""] ?? { variant: "grey" as BadgeVariant, label: status ?? "—" };
  return <StatusBadge variant={s.variant}>{s.label}</StatusBadge>;
}

function orderStatusBadge(status: string | null) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    pending: { variant: "amber", label: "ממתין" },
    paid: { variant: "green", label: "שולם" },
    shipped: { variant: "blue", label: "נשלח" },
    completed: { variant: "green", label: "הושלם" },
    cancelled: { variant: "red", label: "בוטל" },
  };
  const s = map[status ?? ""] ?? { variant: "grey" as BadgeVariant, label: status ?? "—" };
  return <StatusBadge variant={s.variant}>{s.label}</StatusBadge>;
}

function productTypeBadge(type: string | null) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    subscription: { variant: "blue", label: "מנוי" },
    product: { variant: "green", label: "מוצר" },
    donation: { variant: "amber", label: "תרומה" },
  };
  const s = map[type ?? ""] ?? { variant: "grey" as BadgeVariant, label: type ?? "—" };
  return <StatusBadge variant={s.variant}>{s.label}</StatusBadge>;
}

function StatusBadge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  const styles: Record<BadgeVariant, { bg: string; color: string }> = {
    green: { bg: C.greenBg, color: C.green },
    amber: { bg: C.amberBg, color: C.amber },
    red: { bg: C.redBg, color: C.red },
    blue: { bg: C.blueBg, color: C.blue },
    grey: { bg: "#f1f5f9", color: "#475569" },
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
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

/* ─── CSV export ─────────────────────────────────────────────────── */
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

function exportOrders(orders: Order[]) {
  const headers = [
    "תאריך", "מס׳ הזמנה", "לקוח", "אימייל", "טלפון", "מוצר",
    "סכום", "הנחה", "תשלומים", "סטטוס", "סטטוס תשלום",
    "כרטיס", "אסמכתא", "מזהה תשלום", "חשבונית",
  ];
  const rows = orders.map((o) => [
    fmtDate(o.created_at),
    o.order_number,
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    o.product,
    o.total,
    o.discount,
    o.installments,
    o.status,
    o.payment_status,
    o.card_suffix ? `****${o.card_suffix}` : "",
    o.asmachta,
    o.payment_id,
    o.invoice_url,
  ]);
  downloadCSV(headers, rows, `orders-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportDonations(donations: Donation[]) {
  const headers = [
    "תאריך", "שם תורם", "אימייל", "טלפון", "סכום", "מקור", "קמפיין",
    "tier", "הקדשה", "חוזר?", "סטטוס",
    "רחוב", "מספר בית", "עיר", "מיקוד", "הערות", "אסמכתא", "חשבונית",
  ];
  const rows = donations.map((d) => [
    fmtDate(d.created_at),
    d.donor_name,
    d.donor_email,
    d.phone,
    d.amount,
    d.source,
    d.product,
    d.tier_name ?? d.tier_id,
    d.dedication_name,
    d.is_monthly ? "כן" : "לא",
    d.payment_status,
    d.shipping_street,
    d.shipping_house_number,
    d.shipping_city,
    d.shipping_zip,
    d.shipping_notes,
    d.asmachta,
    d.invoice_url,
  ]);
  downloadCSV(headers, rows, `donations-${new Date().toISOString().slice(0, 10)}.csv`);
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
      {/* Gold accent stripe */}
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
          paddingRight: 8,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: C.textSubtle, paddingRight: 8 }}>{sub}</div>
      )}
    </div>
  );
}

/* ─── JSON viewer for raw_payload ──────────────────────────────── */
function JsonBlock({ data }: { data: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false);
  if (!data) return <span style={{ color: C.textSubtle, fontSize: 12 }}>—</span>;
  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          color: C.gold,
          fontWeight: 700,
          background: C.parchment,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "4px 12px",
          cursor: "pointer",
        }}
      >
        {open ? "סגור" : "הצג payload"}
        <ChevronDown
          size={12}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>
      {open && (
        <pre
          dir="ltr"
          style={{
            marginTop: 8,
            background: "#1e2433",
            color: "#a8d8a8",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 11,
            overflowX: "auto",
            maxHeight: 260,
            lineHeight: 1.6,
            fontFamily: "monospace",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ─── Order drawer ─────────────────────────────────────────────── */
function OrderDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-full max-w-xl overflow-y-auto" dir="rtl">
        <SheetHeader className="border-b pb-4 mb-4">
          <SheetTitle style={{ fontFamily: "var(--font-display, serif)", color: C.navy }}>
            הזמנה #{order.order_number ?? order.id.slice(0, 8)}
          </SheetTitle>
          <SheetClose asChild>
            <button
              onClick={onClose}
              style={{ position: "absolute", left: 16, top: 16, cursor: "pointer" }}
            >
              <X size={18} />
            </button>
          </SheetClose>
        </SheetHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "0 4px" }}>
          <Section title="פרטי לקוח">
            <Row label="שם" value={order.customer_name} />
            <Row label="אימייל" value={order.customer_email} dir="ltr" />
            <Row label="טלפון" value={order.customer_phone} />
          </Section>

          <Section title="פרטי עסקה">
            <Row label="מוצר" value={order.product} />
            <Row label="סכום" value={fmtILS(order.total)} />
            <Row label="מחיר לפני הנחה" value={fmtILS(order.subtotal)} />
            <Row label="הנחה" value={order.discount ? fmtILS(order.discount) : "—"} />
            <Row label="מטבע" value={order.currency ?? "ILS"} />
            <Row label="תשלומים" value={order.installments ? `${order.installments} תשלומים` : "חד-פעמי"} />
          </Section>

          <Section title="פרטי תשלום">
            <Row label="סטטוס" value={paymentStatusBadge(order.payment_status)} />
            <Row label="מצב הזמנה" value={orderStatusBadge(order.status)} />
            <Row label="שיטת תשלום" value={order.payment_method} />
            <Row label="4 ספרות כרטיס" value={order.card_suffix ? `****${order.card_suffix}` : "—"} />
            <Row label="אסמכתא" value={order.asmachta} />
            <Row label="מזהה תשלום" value={order.payment_id} />
          </Section>

          {order.invoice_url && (
            <Section title="חשבונית">
              <Row
                label="חשבונית"
                value={
                  <a href={order.invoice_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: C.gold, textDecoration: "underline", fontSize: 13 }}>
                    {order.invoice_number ?? "פתח חשבונית"}
                  </a>
                }
              />
            </Section>
          )}

          <Section title="Smoove">
            <Row label="רשימה" value={order.smoove_list_id} />
            <Row label="נרשם?" value={order.smoove_subscribed ? "כן" : "לא"} />
          </Section>

          <Section title="Payload גולמי">
            <JsonBlock data={order.raw_payload} />
          </Section>

          <div style={{ fontSize: 11, color: C.textSubtle, marginTop: 4 }}>
            נוצר: {fmtDate(order.created_at)}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Donation drawer ────────────────────────────────────────── */
function DonationDrawer({ donation, onClose }: { donation: Donation; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-full max-w-xl overflow-y-auto" dir="rtl">
        <SheetHeader className="border-b pb-4 mb-4">
          <SheetTitle style={{ fontFamily: "var(--font-display, serif)", color: C.navy }}>
            תרומה — {donation.donor_name ?? "אנונימי"}
          </SheetTitle>
          <SheetClose asChild>
            <button onClick={onClose} style={{ position: "absolute", left: 16, top: 16, cursor: "pointer" }}>
              <X size={18} />
            </button>
          </SheetClose>
        </SheetHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "0 4px" }}>
          <Section title="פרטי תורם">
            <Row label="שם" value={donation.donor_name} />
            <Row label="אימייל" value={donation.donor_email} dir="ltr" />
            <Row label="טלפון" value={donation.phone} />
          </Section>

          <Section title="פרטי תרומה">
            <Row label="סכום" value={fmtILS(donation.amount)} />
            <Row label="מקור" value={donation.source} />
            <Row label="קמפיין" value={donation.product} />
            <Row label="Tier" value={donation.tier_name ?? donation.tier_id} />
            <Row label="חוזר?" value={donation.is_monthly ? <StatusBadge variant="blue">מנוי חוזר</StatusBadge> : "חד-פעמי"} />
          </Section>

          {donation.dedication_name && (
            <Section title="הקדשה">
              <Row label="שם" value={donation.dedication_name} />
              <Row label="סוג" value={donation.dedication_type} />
            </Section>
          )}

          {(donation.shipping_city || donation.shipping_street) && (
            <Section title="כתובת משלוח">
              <Row label="רחוב" value={`${donation.shipping_street ?? ""} ${donation.shipping_house_number ?? ""}`} />
              <Row label="עיר" value={donation.shipping_city} />
              <Row label="מיקוד" value={donation.shipping_zip} />
              <Row label="הערות" value={donation.shipping_notes} />
            </Section>
          )}

          <Section title="פרטי תשלום">
            <Row label="סטטוס" value={paymentStatusBadge(donation.payment_status)} />
            <Row label="4 ספרות כרטיס" value={donation.card_suffix ? `****${donation.card_suffix}` : "—"} />
            <Row label="אסמכתא" value={donation.asmachta} />
            <Row label="מזהה תשלום" value={donation.payment_id} />
          </Section>

          {donation.invoice_url && (
            <Section title="חשבונית">
              <Row
                label="חשבונית"
                value={
                  <a href={donation.invoice_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: C.gold, textDecoration: "underline", fontSize: 13 }}>
                    פתח חשבונית
                  </a>
                }
              />
            </Section>
          )}

          {donation.smoove_list_id && (
            <Section title="Smoove">
              <Row label="רשימה" value={donation.smoove_list_id} />
            </Section>
          )}

          <Section title="Payload גולמי">
            <JsonBlock data={donation.raw_payload} />
          </Section>

          <div style={{ fontSize: 11, color: C.textSubtle, marginTop: 4 }}>
            נוצר: {fmtDate(donation.created_at)}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Drawer sub-components ────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: C.gold,
          marginBottom: 8,
          paddingBottom: 4,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  dir: d,
}: {
  label: string;
  value: React.ReactNode;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span
        style={{
          fontSize: 12,
          color: C.textMuted,
          minWidth: 110,
          flexShrink: 0,
          paddingTop: 1,
        }}
      >
        {label}
      </span>
      <span
        dir={d}
        style={{
          fontSize: 13,
          color: C.text,
          fontWeight: 500,
          wordBreak: "break-all",
        }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

/* ─── Supabase hooks ─────────────────────────────────────────── */
function useOrders() {
  return useQuery<Order[]>({
    queryKey: ["admin-payments-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, created_at, order_number, customer_name, customer_email, customer_phone, total, subtotal, discount, currency, installments, payment_id, payment_method, payment_status, status, invoice_url, invoice_number, asmachta, card_suffix, product, smoove_list_id, smoove_subscribed, raw_payload"
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });
}

function useDonations() {
  return useQuery<Donation[]>({
    queryKey: ["admin-payments-donations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select(
          "id, created_at, amount, donor_name, donor_email, phone, dedication_name, dedication_type, payment_status, is_monthly, payment_id, asmachta, card_suffix, product, source, tier_id, tier_name, tier_perks, shipping_street, shipping_house_number, shipping_city, shipping_zip, shipping_notes, invoice_url, smoove_list_id, raw_payload"
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Donation[];
    },
  });
}

function usePaymentProducts() {
  return useQuery<PaymentProduct[]>({
    queryKey: ["admin-payments-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_products")
        .select(
          "id, display_name, type, page_code_env, default_amount, max_installments, active, smoove_list_id, target_table"
        )
        .order("display_name");
      if (error) throw error;
      return (data ?? []) as PaymentProduct[];
    },
  });
}

/* ─── Mutation: toggle payment_product.active ────────────────────────── */
function useToggleProductActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("payment_products")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payments-products"] }),
  });
}

/* ─── Mutation: update payment_product fields ────────────────────────── */
function useUpdatePaymentProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      display_name,
      default_amount,
      max_installments,
    }: {
      id: string;
      display_name: string;
      default_amount: number | null;
      max_installments: number;
    }) => {
      const { error } = await supabase
        .from("payment_products")
        .update({ display_name, default_amount, max_installments })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payments-products"] }),
  });
}

/* ─── Mutation: issue Paperless invoice ──────────────────────────────── */
function useIssuePaperlessInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      source_table,
      record_id,
    }: {
      source_table: "orders" | "donations";
      record_id: string;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("לא מחובר");

      const res = await fetch(
        `${SUPABASE_URL_RUNTIME}/functions/v1/issue-paperless-invoice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON_KEY_RUNTIME,
          },
          body: JSON.stringify({ source_table, record_id }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      return json as { ok: true; invoice_number: string | null; invoice_url: string };
    },
    onSuccess: (_data, { source_table }) => {
      // Invalidate the relevant query so the table refreshes
      if (source_table === "orders") {
        qc.invalidateQueries({ queryKey: ["admin-payments-orders"] });
      } else {
        qc.invalidateQueries({ queryKey: ["admin-payments-donations"] });
      }
    },
  });
}

/* ─── Empty / Loading / Error ────────────────────────────────── */
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
                  background: "linear-gradient(90deg, #f0ece6 25%, #e8e0d4 50%, #f0ece6 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.4s infinite",
                  width: j === 0 ? 80 : j === 1 ? 120 : "100%",
                }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyRow({ cols, msg }: { cols: number; msg?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center py-12" style={{ color: C.textMuted }}>
        {msg ?? "אין רשומות"}
      </TableCell>
    </TableRow>
  );
}

/* ─── Invoice button ────────────────────────────────────────── */
function InvoiceButton({
  sourceTable,
  recordId,
  existingUrl,
}: {
  sourceTable: "orders" | "donations";
  recordId: string;
  existingUrl: string | null;
}) {
  const mutation = useIssuePaperlessInvoice();
  const [done, setDone] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  if (existingUrl) {
    return (
      <a
        href={existingUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{ color: C.gold, fontSize: 12, textDecoration: "underline" }}
      >
        פתח
      </a>
    );
  }

  if (done) {
    return <StatusBadge variant="green">הופקה</StatusBadge>;
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {errMsg && (
        <div style={{ fontSize: 10, color: C.red, marginBottom: 4, maxWidth: 140, wordBreak: "break-word" }}>
          {errMsg}
        </div>
      )}
      <button
        disabled={mutation.isPending}
        onClick={async (e) => {
          e.stopPropagation();
          setErrMsg(null);
          try {
            await mutation.mutateAsync({ source_table: sourceTable, record_id: recordId });
            setDone(true);
          } catch (err: unknown) {
            setErrMsg(err instanceof Error ? err.message : "שגיאה");
          }
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: mutation.isPending ? "#f0ece6" : C.parchment,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "3px 10px",
          fontSize: 11,
          fontWeight: 700,
          color: C.gold,
          cursor: mutation.isPending ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {mutation.isPending ? (
          <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <FileText size={10} />
        )}
        הפק
      </button>
    </div>
  );
}

/* ─── ORDERS TAB ────────────────────────────────────────────── */
function OrdersTab({ orders, loading, error }: { orders: Order[]; loading: boolean; error: Error | null }) {
  const [search, setSearch] = useState("");
  const [payFilter, setPayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (payFilter !== "all" && o.payment_status !== payFilter) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_email?.toLowerCase().includes(q) ||
          o.order_number?.toLowerCase().includes(q) ||
          o.product?.toLowerCase().includes(q) ||
          o.asmachta?.toLowerCase().includes(q) || false
        );
      }
      return true;
    });
  }, [orders, search, payFilter, statusFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 340 }}>
          <Search
            size={14}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }}
          />
          <Input
            placeholder="חיפוש: שם, אימייל, מס׳ הזמנה..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingRight: 32, direction: "rtl" }}
          />
        </div>
        <Select value={payFilter} onValueChange={setPayFilter}>
          <SelectTrigger style={{ width: 150 }}>
            <SelectValue placeholder="סטטוס תשלום" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="paid">שולם</SelectItem>
            <SelectItem value="completed">הושלם</SelectItem>
            <SelectItem value="pending">ממתין</SelectItem>
            <SelectItem value="failed">נכשל</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger style={{ width: 150 }}>
            <SelectValue placeholder="מצב הזמנה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המצבים</SelectItem>
            <SelectItem value="paid">שולם</SelectItem>
            <SelectItem value="pending">ממתין</SelectItem>
            <SelectItem value="shipped">נשלח</SelectItem>
            <SelectItem value="completed">הושלם</SelectItem>
            <SelectItem value="cancelled">בוטל</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => exportOrders(filtered)}
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
      </div>

      {error && (
        <div style={{ background: C.redBg, color: C.red, borderRadius: 10, padding: "10px 16px", fontSize: 13 }}>
          שגיאה בטעינה: {error.message}
        </div>
      )}

      <Card style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow style={{ background: C.parchment }}>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>תאריך</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>מס׳ הזמנה</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>לקוח</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>מוצר</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>סכום</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>תשלומים</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>סטטוס</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>כרטיס</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>חשבונית</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <LoadingRows cols={9} />
              ) : filtered.length === 0 ? (
                <EmptyRow cols={9} msg="אין הזמנות תואמות" />
              ) : (
                filtered.map((o) => (
                  <TableRow
                    key={o.id}
                    onClick={() => setSelected(o)}
                    style={{
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    className="hover:bg-amber-50/60"
                  >
                    <TableCell style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>
                      {fmtDateShort(o.created_at)}
                    </TableCell>
                    <TableCell style={{ fontFamily: "monospace", fontSize: 12, color: C.textMuted }}>
                      {o.order_number ?? o.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{o.customer_name || "—"}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, direction: "ltr", textAlign: "right" }}>
                        {o.customer_email || ""}
                      </div>
                    </TableCell>
                    <TableCell style={{ fontSize: 12, color: C.textMuted, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {o.product || "—"}
                    </TableCell>
                    <TableCell style={{ fontWeight: 700, color: C.navy, whiteSpace: "nowrap" }}>
                      {fmtILS(o.total)}
                    </TableCell>
                    <TableCell style={{ fontSize: 12, color: C.textMuted }}>
                      {o.installments ? `${o.installments}×` : "חד"}
                    </TableCell>
                    <TableCell>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {paymentStatusBadge(o.payment_status)}
                        {o.status && o.status !== o.payment_status && (
                          <span>{orderStatusBadge(o.status)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell style={{ fontFamily: "monospace", fontSize: 11, color: C.textMuted }}>
                      {o.card_suffix ? `····${o.card_suffix}` : "—"}
                    </TableCell>
                    <TableCell>
                      <InvoiceButton
                        sourceTable="orders"
                        recordId={o.id}
                        existingUrl={o.invoice_url}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ─── DONATIONS TAB ─────────────────────────────────────────── */
function DonationsTab({ donations, loading, error }: { donations: Donation[]; loading: boolean; error: Error | null }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthlyFilter, setMonthlyFilter] = useState("all");
  const [selected, setSelected] = useState<Donation | null>(null);

  const filtered = useMemo(() => {
    return donations.filter((d) => {
      if (statusFilter !== "all" && d.payment_status !== statusFilter) return false;
      if (monthlyFilter === "monthly" && !d.is_monthly) return false;
      if (monthlyFilter === "once" && d.is_monthly) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          d.donor_name?.toLowerCase().includes(q) ||
          d.donor_email?.toLowerCase().includes(q) ||
          d.product?.toLowerCase().includes(q) ||
          d.tier_name?.toLowerCase().includes(q) ||
          d.asmachta?.toLowerCase().includes(q) ||
          d.dedication_name?.toLowerCase().includes(q) || false
        );
      }
      return true;
    });
  }, [donations, search, statusFilter, monthlyFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 340 }}>
          <Search
            size={14}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }}
          />
          <Input
            placeholder="חיפוש: שם, אימייל, קמפיין..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingRight: 32, direction: "rtl" }}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger style={{ width: 150 }}>
            <SelectValue placeholder="סטטוס תשלום" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="completed">הושלם</SelectItem>
            <SelectItem value="pending">ממתין</SelectItem>
            <SelectItem value="failed">נכשל</SelectItem>
          </SelectContent>
        </Select>
        <Select value={monthlyFilter} onValueChange={setMonthlyFilter}>
          <SelectTrigger style={{ width: 140 }}>
            <SelectValue placeholder="סוג" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="monthly">חוזר</SelectItem>
            <SelectItem value="once">חד-פעמי</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => exportDonations(filtered)}
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
      </div>

      {error && (
        <div style={{ background: C.redBg, color: C.red, borderRadius: 10, padding: "10px 16px", fontSize: 13 }}>
          שגיאה בטעינה: {error.message}
        </div>
      )}

      <Card style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow style={{ background: C.parchment }}>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>תאריך</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>תורם</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>סכום</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>קמפיין / tier</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>הקדשה</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>סוג</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>סטטוס</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>כרטיס</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>חשבונית</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <LoadingRows cols={9} />
              ) : filtered.length === 0 ? (
                <EmptyRow cols={9} msg="אין תרומות תואמות" />
              ) : (
                filtered.map((d) => (
                  <TableRow
                    key={d.id}
                    onClick={() => setSelected(d)}
                    style={{ cursor: "pointer" }}
                    className="hover:bg-amber-50/60"
                  >
                    <TableCell style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>
                      {fmtDateShort(d.created_at)}
                    </TableCell>
                    <TableCell>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>
                        {d.donor_name || "אנונימי"}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, direction: "ltr", textAlign: "right" }}>
                        {d.donor_email || ""}
                      </div>
                    </TableCell>
                    <TableCell style={{ fontWeight: 700, color: C.navy, whiteSpace: "nowrap" }}>
                      {fmtILS(d.amount)}
                    </TableCell>
                    <TableCell style={{ fontSize: 12, color: C.textMuted }}>
                      <div>{d.product || "—"}</div>
                      {d.tier_name && (
                        <div style={{ fontSize: 11, color: C.textSubtle }}>{d.tier_name}</div>
                      )}
                    </TableCell>
                    <TableCell style={{ fontSize: 12, color: C.textMuted }}>
                      {d.dedication_name || "—"}
                    </TableCell>
                    <TableCell>
                      {d.is_monthly ? (
                        <StatusBadge variant="blue">חוזר</StatusBadge>
                      ) : (
                        <StatusBadge variant="grey">חד</StatusBadge>
                      )}
                    </TableCell>
                    <TableCell>{paymentStatusBadge(d.payment_status)}</TableCell>
                    <TableCell style={{ fontFamily: "monospace", fontSize: 11, color: C.textMuted }}>
                      {d.card_suffix ? `····${d.card_suffix}` : "—"}
                    </TableCell>
                    <TableCell>
                      <InvoiceButton
                        sourceTable="donations"
                        recordId={d.id}
                        existingUrl={d.invoice_url}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && <DonationDrawer donation={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ─── Edit product dialog ────────────────────────────────────── */
interface EditProductState {
  id: string;
  display_name: string;
  default_amount: string;
  max_installments: string;
}

function EditProductDialog({
  product,
  onClose,
}: {
  product: PaymentProduct;
  onClose: () => void;
}) {
  const updateMutation = useUpdatePaymentProduct();
  const [form, setForm] = useState<EditProductState>({
    id: product.id,
    display_name: product.display_name ?? "",
    default_amount: product.default_amount != null ? String(product.default_amount) : "",
    max_installments: product.max_installments != null ? String(product.max_installments) : "1",
  });
  const [err, setErr] = useState<string | null>(null);

  const isDirectDebit = product.page_code_env?.toLowerCase().includes("subscription") ||
    product.page_code_env === "b1dc5e695089";

  async function handleSave() {
    setErr(null);
    if (!form.display_name.trim()) {
      setErr("שם תצוגה חובה");
      return;
    }
    const defaultAmount = form.default_amount ? Number(form.default_amount) : null;
    const maxInstallments = Number(form.max_installments) || 1;
    if (defaultAmount !== null && isNaN(defaultAmount)) {
      setErr("סכום ברירת מחדל חייב להיות מספר");
      return;
    }
    if (isNaN(maxInstallments) || maxInstallments < 1 || maxInstallments > 36) {
      setErr("מקסימום תשלומים: 1–36");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: form.id,
        display_name: form.display_name.trim(),
        default_amount: defaultAmount,
        max_installments: maxInstallments,
      });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "שגיאת שמירה");
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" style={{ maxWidth: 460 }}>
        <DialogHeader>
          <DialogTitle style={{ color: C.navy }}>עריכת מוצר תשלום</DialogTitle>
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* ID — read-only */}
          <div>
            <Label style={{ fontSize: 12, color: C.textMuted }}>מזהה (לא ניתן לשינוי)</Label>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: C.textSubtle,
                background: "#f8f8f8",
                borderRadius: 8,
                padding: "6px 10px",
                marginTop: 4,
              }}
            >
              {product.id}
            </div>
          </div>

          {/* page_code_env warning for non-tech admins */}
          <div
            style={{
              background: C.amberBg,
              border: `1px solid ${C.goldShimmer}`,
              borderRadius: 8,
              padding: "8px 12px",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <AlertTriangle size={14} color={C.amber} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: C.amber, lineHeight: 1.5 }}>
              <strong>page_code_env:</strong>{" "}
              <code style={{ fontFamily: "monospace", background: "#fef3c7", padding: "1px 4px", borderRadius: 4 }}>
                {product.page_code_env ?? "—"}
              </code>
              {" "}— שדה זה קריטי לניתוב בגרו. השינוי נעשה ישירות ב-DB ודורש אישור מהמפתח.
              {isDirectDebit && (
                <div style={{ marginTop: 4, fontWeight: 700 }}>
                  זהו מוצר directDebit (הוראת קבע/מנוי). אל תחליף את page_code_env ל-wallet!
                </div>
              )}
            </div>
          </div>

          {/* display_name */}
          <div>
            <Label style={{ fontSize: 12, color: C.text }}>שם תצוגה</Label>
            <Input
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              style={{ marginTop: 4, direction: "rtl" }}
              placeholder="שם הפונציה/מוצר"
            />
          </div>

          {/* default_amount */}
          <div>
            <Label style={{ fontSize: 12, color: C.text }}>סכום ברירת מחדל (₪)</Label>
            <Input
              type="number"
              min={0}
              value={form.default_amount}
              onChange={(e) => setForm((f) => ({ ...f, default_amount: e.target.value }))}
              style={{ marginTop: 4, direction: "ltr" }}
              placeholder="ריק = ללא ברירת מחדל"
            />
          </div>

          {/* max_installments */}
          <div>
            <Label style={{ fontSize: 12, color: C.text }}>מקסימום תשלומים</Label>
            <Input
              type="number"
              min={1}
              max={36}
              value={form.max_installments}
              onChange={(e) => setForm((f) => ({ ...f, max_installments: e.target.value }))}
              style={{ marginTop: 4, direction: "ltr" }}
            />
            {isDirectDebit && (
              <p style={{ fontSize: 11, color: C.textSubtle, marginTop: 4 }}>
                directDebit — בד"כ 1 (חיוב חוזר ללא סיום)
              </p>
            )}
          </div>

          {err && (
            <div
              style={{
                background: C.redBg,
                color: C.red,
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 13,
              }}
            >
              {err}
            </div>
          )}
        </div>

        <DialogFooter style={{ flexDirection: "row", gap: 8, justifyContent: "flex-start" }}>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            style={{
              background: C.gold,
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "8px 20px",
              fontWeight: 700,
              fontSize: 13,
              cursor: updateMutation.isPending ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {updateMutation.isPending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
            שמור שינויים
          </button>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              padding: "8px 16px",
              fontWeight: 600,
              fontSize: 13,
              color: C.textMuted,
              cursor: "pointer",
            }}
          >
            ביטול
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── PAYMENT PRODUCTS TAB ───────────────────────────────────── */
function PaymentProductsTab({ products, loading, error }: { products: PaymentProduct[]; loading: boolean; error: Error | null }) {
  const toggleMutation = useToggleProductActive();
  const [editProduct, setEditProduct] = useState<PaymentProduct | null>(null);
  const [toggleErr, setToggleErr] = useState<Record<string, string>>({});

  async function handleToggle(p: PaymentProduct) {
    setToggleErr((e) => ({ ...e, [p.id]: "" }));
    try {
      await toggleMutation.mutateAsync({ id: p.id, active: !p.active });
    } catch (err: unknown) {
      setToggleErr((e) => ({
        ...e,
        [p.id]: err instanceof Error ? err.message : "שגיאה",
      }));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: "#eff6ff",
          borderRadius: 10,
          border: "1px solid #bfdbfe",
        }}
      >
        <Package size={15} color={C.blue} />
        <span style={{ fontSize: 13, color: C.blue, fontWeight: 600 }}>
          לחץ על שורה לעריכת שם / סכום / תשלומים. Toggle לביטול/הפעלה מיידי.{" "}
          <strong>page_code_env</strong> — אל תשנה בלי אישור מפתח (ראה הסבר בדיאלוג).
        </span>
      </div>

      {error && (
        <div style={{ background: C.redBg, color: C.red, borderRadius: 10, padding: "10px 16px", fontSize: 13 }}>
          שגיאה בטעינה: {error.message}
        </div>
      )}

      <Card style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow style={{ background: C.parchment }}>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>שם תצוגה</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>סוג</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>page_code_env</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>סכום ברירת מחדל</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>תשלומים</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>טבלת יעד</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>פעיל</TableHead>
                <TableHead className="text-right" style={{ color: C.textMuted, fontWeight: 700, fontSize: 12 }}>עריכה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <LoadingRows cols={8} />
              ) : products.length === 0 ? (
                <EmptyRow cols={8} msg="אין הגדרות תשלום" />
              ) : (
                products.map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-amber-50/60"
                    style={{ cursor: "default" }}
                  >
                    <TableCell style={{ fontWeight: 600, fontSize: 13, color: C.text }}>
                      {p.display_name || "—"}
                    </TableCell>
                    <TableCell>{productTypeBadge(p.type)}</TableCell>
                    <TableCell>
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.textMuted }}>
                        {p.page_code_env || "—"}
                      </div>
                      {/* Warn if this is the directDebit page code */}
                      {p.page_code_env === "b1dc5e695089" && (
                        <div style={{ fontSize: 10, color: C.amber, marginTop: 2 }}>directDebit ←</div>
                      )}
                      {p.page_code_env === "efbda303565a" && (
                        <div style={{ fontSize: 10, color: C.blue, marginTop: 2 }}>wallet ←</div>
                      )}
                    </TableCell>
                    <TableCell style={{ fontWeight: 600, color: C.navy, whiteSpace: "nowrap" }}>
                      {p.default_amount != null ? fmtILS(p.default_amount) : "—"}
                    </TableCell>
                    <TableCell style={{ fontSize: 13, color: C.textMuted }}>
                      {p.max_installments != null ? `${p.max_installments}` : "—"}
                    </TableCell>
                    <TableCell style={{ fontFamily: "monospace", fontSize: 11, color: C.textMuted }}>
                      {p.target_table || "—"}
                    </TableCell>
                    <TableCell>
                      {/* Toggle switch */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <button
                          onClick={() => handleToggle(p)}
                          disabled={toggleMutation.isPending}
                          style={{
                            width: 44,
                            height: 22,
                            borderRadius: 99,
                            background: p.active ? "#15803d" : "#94a3b8",
                            border: "none",
                            cursor: toggleMutation.isPending ? "not-allowed" : "pointer",
                            position: "relative",
                            transition: "background 0.2s",
                          }}
                          title={p.active ? "לחץ לכיבוי" : "לחץ להפעלה"}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: 3,
                              right: p.active ? 3 : undefined,
                              left: p.active ? undefined : 3,
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              background: "white",
                              transition: "all 0.2s",
                            }}
                          />
                        </button>
                        {toggleErr[p.id] && (
                          <div style={{ fontSize: 10, color: C.red }}>{toggleErr[p.id]}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setEditProduct(p)}
                        style={{
                          background: C.parchment,
                          border: `1px solid ${C.border}`,
                          borderRadius: 8,
                          padding: "4px 10px",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          color: C.gold,
                          cursor: "pointer",
                        }}
                      >
                        <Pencil size={11} />
                        ערוך
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editProduct && (
        <EditProductDialog
          product={editProduct}
          onClose={() => setEditProduct(null)}
        />
      )}
    </div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────────── */
export default function Payments() {
  const ordersQ = useOrders();
  const donationsQ = useDonations();
  const productsQ = usePaymentProducts();

  const orders = ordersQ.data ?? [];
  const donations = donationsQ.data ?? [];

  /* KPIs — this-month only */
  const monthOrders = orders.filter((o) => isThisMonth(o.created_at) && (o.payment_status === "paid" || o.payment_status === "completed"));
  const monthDonations = donations.filter((d) => isThisMonth(d.created_at) && (d.payment_status === "completed" || d.payment_status === "paid"));

  const totalRevenue =
    monthOrders.reduce((s, o) => s + (Number(o.total) || 0), 0) +
    monthDonations.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const totalTransactions = monthOrders.length + monthDonations.length;
  const totalDonations = monthDonations.length;
  const totalMonthly = donations.filter((d) => d.is_monthly && (d.payment_status === "completed" || d.payment_status === "paid")).length;

  const kpiLoading = ordersQ.isLoading || donationsQ.isLoading;

  return (
    <AdminLayout>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
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
              סליקות ותשלומים
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: C.textMuted }}>
              הזמנות, תרומות, והגדרות תשלום — ניהול מרכזי
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: C.parchment,
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              padding: "6px 14px",
              fontSize: 12,
              color: C.textMuted,
              fontWeight: 600,
            }}
          >
            <CreditCard size={14} color={C.gold} />
            חודש שוטף · {new Date().toLocaleDateString("he-IL", { month: "long", year: "numeric" })}
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
            icon={TrendingUp}
            label="סך הכנסות החודש"
            value={kpiLoading ? "..." : fmtILS(totalRevenue)}
            sub="הזמנות + תרומות שולמו"
            accent={C.gold}
          />
          <KpiCard
            icon={CreditCard}
            label="עסקאות החודש"
            value={kpiLoading ? "..." : totalTransactions}
            sub="הזמנות + תרומות"
            accent={C.navyMid}
          />
          <KpiCard
            icon={Heart}
            label="תרומות החודש"
            value={kpiLoading ? "..." : totalDonations}
            sub="תרומות שהושלמו"
            accent="#dc2626"
          />
          <KpiCard
            icon={Repeat2}
            label="מנויים חוזרים"
            value={kpiLoading ? "..." : totalMonthly}
            sub="תרומות חוזרות פעילות"
            accent={C.goldLight}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" dir="rtl">
          <TabsList
            style={{
              background: C.parchmentDark,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "4px",
              height: "auto",
              gap: 4,
            }}
          >
            <TabsTrigger
              value="orders"
              style={{ borderRadius: 9, padding: "8px 20px", fontSize: 14, fontWeight: 700 }}
            >
              <ShoppingBag size={15} style={{ marginLeft: 6 }} />
              הזמנות
              {!ordersQ.isLoading && (
                <span
                  style={{
                    marginRight: 6,
                    background: C.goldShimmer,
                    color: C.gold,
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "1px 7px",
                  }}
                >
                  {orders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="donations"
              style={{ borderRadius: 9, padding: "8px 20px", fontSize: 14, fontWeight: 700 }}
            >
              <Heart size={15} style={{ marginLeft: 6 }} />
              תרומות
              {!donationsQ.isLoading && (
                <span
                  style={{
                    marginRight: 6,
                    background: C.goldShimmer,
                    color: C.gold,
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "1px 7px",
                  }}
                >
                  {donations.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="products"
              style={{ borderRadius: 9, padding: "8px 20px", fontSize: 14, fontWeight: 700 }}
            >
              <Package size={15} style={{ marginLeft: 6 }} />
              הגדרות תשלום
            </TabsTrigger>
          </TabsList>

          <div style={{ marginTop: 20 }}>
            <TabsContent value="orders">
              <OrdersTab
                orders={orders}
                loading={ordersQ.isLoading}
                error={ordersQ.error as Error | null}
              />
            </TabsContent>
            <TabsContent value="donations">
              <DonationsTab
                donations={donations}
                loading={donationsQ.isLoading}
                error={donationsQ.error as Error | null}
              />
            </TabsContent>
            <TabsContent value="products">
              <PaymentProductsTab
                products={productsQ.data ?? []}
                loading={productsQ.isLoading}
                error={productsQ.error as Error | null}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
