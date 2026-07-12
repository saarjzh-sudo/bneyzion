/**
 * DesignPreviewYehoshuaAdmin — Admin Dashboard
 * Route: /design-yehoshua-admin
 *
 * Auth: simple password gate (default "123456", overridable via the
 * YEHOSHUA_ADMIN_PASSWORD env on the endpoint).
 *
 * WHY a server endpoint instead of a direct Supabase read:
 *   The donor rows carry PII (name, email, phone, shipping address) and the
 *   `donations` table RLS is fail-closed — anon cannot SELECT it. So the
 *   password-gated page does NOT read Supabase directly; it POSTs the password
 *   to /api/yehoshua/donations, which checks it server-side and returns the
 *   rows using the service-role key. The DB stays locked to anon; only the
 *   endpoint (behind the password) exposes the data. See that file for detail.
 */

import { useState, useEffect, useCallback, useMemo } from "react";

const GOAL = 80_000;
const API_ENDPOINT = "/api/yehoshua/donations";
const PW_STORAGE_KEY = "yehoshua_admin_pw";

/* ─── Types ────────────────────────────────────────────────── */
interface CampaignStatsRow {
  supporters: number;
  raised: number;
}

// Tier-id → human-readable name (mirrors TIERS in campaign page)
const TIER_NAMES: Record<string, string> = {
  "tier-90":   "ספר יהושע — 200 ראשונים",
  "tier-120":  "ספר + הקדשה",
  "tier-220":  "הזוג",
  "tier-yehoshua-shoftim": "יהושע + שופטים",
  "tier-400":  "הסט המלא",
  "tier-800":  "השותף",
  "tier-1200": "השותף הבכיר",
  "tier-2000": "שיעור בקהילה",
  "tier-custom": "סכום חופשי",
};

interface DonationRow {
  id: string;
  created_at: string;
  donor_name: string | null;
  donor_email: string | null;
  phone: string | null;
  amount: number;
  asmachta: string | null;
  payment_id: string | null;
  payment_status: string;
  product: string | null;
  payment_method: string | null;
  card_suffix: string | null;
  tier_id: string | null;
  description: string | null;
  shipping_street: string | null;
  shipping_house_number: string | null;
  shipping_city: string | null;
  shipping_zip: string | null;
  shipping_notes: string | null;
}

interface AdminData {
  stats: CampaignStatsRow;
  donations: DonationRow[];
}

/* ─── Helpers ───────────────────────────────────────────────── */
function fmtILS(n: number) {
  return "₪" + n.toLocaleString("he-IL");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    completed: { bg: "hsl(142 55% 92%)", color: "hsl(142 55% 28%)", label: "שולם" },
    pending: { bg: "hsl(38 85% 92%)", color: "hsl(38 75% 35%)", label: "ממתין" },
    failed: { bg: "hsl(0 65% 92%)", color: "hsl(0 55% 38%)", label: "נכשל" },
  };
  const s = map[status] ?? { bg: "hsl(215 15% 90%)", color: "hsl(215 20% 40%)", label: status };
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
      }}
    >
      {s.label}
    </span>
  );
}

/* ─── KPI Card ───────────────────────────────────────────────── */
function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "1.5px solid hsl(215 15% 88%)",
        borderRadius: 16,
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "hsl(215 20% 50%)",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 34,
          fontWeight: 900,
          color: accent ?? "hsl(215 55% 20%)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "hsl(215 20% 52%)" }}>{sub}</div>
      )}
    </div>
  );
}

/* ─── Password Screen ────────────────────────────────────────── */
function PasswordScreen({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (pw: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [pw, setPw] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.trim()) onSubmit(pw.trim());
  };

  return (
    <div
      dir="rtl"
      style={{
        fontFamily: "'Heebo', sans-serif",
        background: "hsl(215 55% 15%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          background: "white",
          borderRadius: 20,
          padding: "48px 40px",
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            background: "hsl(38 85% 68%)",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 20px",
          }}
        >
          🔒
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "hsl(215 55% 15%)",
            margin: "0 0 8px",
          }}
        >
          ניהול תרומות
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "hsl(215 20% 50%)",
            margin: "0 0 28px",
            lineHeight: 1.6,
          }}
        >
          כניסה מוגבלת למנהל בלבד.
          <br />
          הזן את הסיסמה כדי להיכנס.
        </p>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="סיסמה"
          autoFocus
          dir="ltr"
          style={{
            width: "100%",
            border: "1.5px solid hsl(215 15% 85%)",
            borderRadius: 12,
            padding: "13px 16px",
            fontSize: 16,
            textAlign: "center",
            letterSpacing: "0.1em",
            color: "hsl(215 40% 15%)",
            marginBottom: 14,
            fontFamily: "inherit",
          }}
        />
        {error && (
          <div
            style={{
              color: "hsl(0 65% 45%)",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !pw.trim()}
          style={{
            width: "100%",
            background: loading || !pw.trim() ? "hsl(215 15% 88%)" : "hsl(215 55% 20%)",
            color: loading || !pw.trim() ? "hsl(215 20% 55%)" : "white",
            border: "none",
            borderRadius: 12,
            padding: "14px 24px",
            fontSize: 15,
            fontWeight: 700,
            cursor: loading || !pw.trim() ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {loading ? "מאמת..." : "כניסה"}
        </button>
      </form>
    </div>
  );
}

/* ─── CSV Export ─────────────────────────────────────────────── */
function exportCSV(rows: DonationRow[]) {
  const HEADERS = [
    "תאריך",
    "שם תורם",
    "אימייל",
    "טלפון",
    "סכום",
    "מה רכש",
    "רחוב",
    "מספר בית",
    "עיר",
    "מיקוד",
    "הערות משלוח",
    "אסמכתא",
    "מזהה תשלום",
    "שיטת תשלום",
    "4 ספרות כרטיס",
    "סטטוס",
  ];
  const escape = (v: string | number | null | undefined) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    HEADERS.join(","),
    ...rows.map((r) =>
      [
        r.created_at ? fmtDate(r.created_at) : "",
        r.donor_name,
        r.donor_email,
        r.phone,
        r.amount,
        r.tier_id ? (TIER_NAMES[r.tier_id] ?? r.tier_id) : (r.description ?? ""),
        r.shipping_street,
        r.shipping_house_number,
        r.shipping_city,
        r.shipping_zip,
        r.shipping_notes,
        r.asmachta,
        r.payment_id,
        r.payment_method,
        r.card_suffix,
        r.payment_status,
      ]
        .map(escape)
        .join(",")
    ),
  ];
  const BOM = "﻿"; // UTF-8 BOM for Excel Hebrew support
  const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yehoshua-donations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Main Admin View ────────────────────────────────────────── */
function AdminView({
  data,
  loading,
  error,
  onRefresh,
  onSignOut,
}: {
  data: AdminData;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSignOut: () => void;
}) {
  // Filters (applied in-memory over the full row set from the endpoint)
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const donations = useMemo(() => {
    return data.donations.filter((d) => {
      if (dateFrom && d.created_at < dateFrom) return false;
      if (dateTo && d.created_at > dateTo + "T23:59:59") return false;
      if (statusFilter !== "all" && d.payment_status !== statusFilter) return false;
      return true;
    });
  }, [data.donations, dateFrom, dateTo, statusFilter]);

  const totalRaised = data.stats.raised;
  const donorCount = data.stats.supporters;
  const remaining = Math.max(0, GOAL - totalRaised);
  const progressPct = Math.min(100, Math.round((totalRaised / GOAL) * 100));
  const avgDonation = donorCount > 0 ? Math.round(totalRaised / donorCount) : 0;

  return (
    <div
      dir="rtl"
      style={{
        fontFamily: "'Heebo', sans-serif",
        background: "hsl(38 18% 96%)",
        minHeight: "100vh",
        color: "hsl(215 40% 12%)",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        input, select { font-family: inherit; }
        .donation-row:hover { background: hsl(38 40% 97%) !important; }
        @media (max-width: 700px) {
          .admin-table-wrap { overflow-x: auto; }
          .filters-row { flex-direction: column !important; }
        }
      `}</style>

      {/* ── Header bar ── */}
      <div
        style={{
          background: "hsl(215 55% 15%)",
          padding: "18px 28px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href="/design-yehoshua-campaign"
            style={{ color: "hsl(38 85% 68%)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
          >
            ← קמפיין יהושע
          </a>
          <span style={{ color: "hsl(215 20% 35%)" }}>|</span>
          <h1 style={{ color: "white", fontWeight: 900, fontSize: 18, margin: 0, letterSpacing: "-0.01em" }}>
            ניהול תרומות — ספר יהושע
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              background: "hsl(215 40% 22%)",
              color: "hsl(38 60% 78%)",
              border: "1px solid hsl(215 30% 30%)",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "מרענן..." : "↻ רענן"}
          </button>
          <button
            onClick={onSignOut}
            style={{
              background: "hsl(215 40% 22%)",
              color: "hsl(215 10% 75%)",
              border: "1px solid hsl(215 30% 30%)",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            התנתק
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {error && (
          <div style={{ textAlign: "center", color: "hsl(0 65% 50%)", padding: "16px", fontSize: 13, background: "hsl(0 65% 97%)", borderRadius: 12, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBlockEnd: 28,
          }}
        >
          <KpiCard
            label={'סה"כ נגבה'}
            value={fmtILS(totalRaised)}
            sub={`מתוך ${fmtILS(GOAL)} יעד`}
            accent="hsl(38 75% 40%)"
          />
          <KpiCard
            label="מספר תורמים"
            value={String(donorCount)}
            sub="תשלומים שהושלמו"
            accent="hsl(215 55% 30%)"
          />
          <KpiCard
            label="ממוצע תרומה"
            value={fmtILS(avgDonation)}
            sub="לתורם"
            accent="hsl(215 45% 40%)"
          />
          <KpiCard
            label="נשאר ליעד"
            value={fmtILS(remaining)}
            sub={`${progressPct}% הושג`}
            accent={remaining === 0 ? "hsl(142 55% 42%)" : "hsl(0 55% 45%)"}
          />
        </div>

        {/* ── Progress bar ── */}
        <div
          style={{
            background: "white",
            border: "1.5px solid hsl(215 15% 88%)",
            borderRadius: 14,
            padding: "18px 20px",
            marginBlockEnd: 28,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBlockEnd: 10, fontSize: 13, fontWeight: 600, color: "hsl(215 30% 35%)" }}>
            <span>התקדמות לעבר היעד</span>
            <span style={{ color: "hsl(38 75% 40%)", fontWeight: 800 }}>{progressPct}%</span>
          </div>
          <div style={{ height: 10, background: "hsl(215 15% 88%)", borderRadius: 10, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, hsl(43 85% 62%), hsl(38 75% 48%))",
                borderRadius: 10,
                transition: "width 0.8s ease-out",
              }}
            />
          </div>
        </div>

        {/* ── Filters + Export ── */}
        <div
          className="filters-row"
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 12,
            marginBlockEnd: 16,
            flexWrap: "wrap",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "hsl(215 20% 45%)" }}>
            מתאריך
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                border: "1.5px solid hsl(215 15% 85%)",
                borderRadius: 8,
                padding: "7px 10px",
                fontSize: 13,
                background: "white",
                color: "hsl(215 40% 15%)",
              }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "hsl(215 20% 45%)" }}>
            עד תאריך
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                border: "1.5px solid hsl(215 15% 85%)",
                borderRadius: 8,
                padding: "7px 10px",
                fontSize: 13,
                background: "white",
                color: "hsl(215 40% 15%)",
              }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "hsl(215 20% 45%)" }}>
            סטטוס
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                border: "1.5px solid hsl(215 15% 85%)",
                borderRadius: 8,
                padding: "7px 10px",
                fontSize: 13,
                background: "white",
                color: "hsl(215 40% 15%)",
                minWidth: 110,
              }}
            >
              <option value="all">הכל</option>
              <option value="completed">שולם</option>
              <option value="pending">ממתין</option>
              <option value="failed">נכשל</option>
            </select>
          </label>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => exportCSV(donations)}
            disabled={donations.length === 0}
            style={{
              background: donations.length === 0 ? "hsl(215 15% 88%)" : "hsl(142 55% 42%)",
              color: donations.length === 0 ? "hsl(215 20% 55%)" : "white",
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 700,
              cursor: donations.length === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "background 0.2s",
            }}
          >
            ⬇ ייצוא CSV ({donations.length})
          </button>
        </div>

        {/* ── Donations Table ── */}
        <div
          className="admin-table-wrap"
          style={{
            background: "white",
            border: "1.5px solid hsl(215 15% 88%)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              minWidth: 1300,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "hsl(215 40% 14%)",
                  color: "hsl(38 85% 72%)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {[
                  "תאריך",
                  "שם תורם",
                  "אימייל",
                  "טלפון",
                  "סכום",
                  "מה רכש",
                  "כתובת",
                  "מיקוד",
                  "הערות",
                  "אסמכתא",
                  "Payment ID",
                  "סטטוס",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 14px",
                      textAlign: "right",
                      whiteSpace: "nowrap",
                      borderBottom: "1px solid hsl(215 30% 22%)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && donations.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "hsl(215 20% 55%)",
                      fontSize: 14,
                    }}
                  >
                    לא נמצאו תרומות עם הפילטרים הנוכחיים
                  </td>
                </tr>
              )}
              {donations.map((d, i) => (
                <tr
                  key={d.id}
                  className="donation-row"
                  style={{
                    background: i % 2 === 0 ? "white" : "hsl(215 12% 98%)",
                    borderBottom: "1px solid hsl(215 15% 93%)",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "hsl(215 20% 45%)", fontSize: 12 }}>
                    {fmtDate(d.created_at)}
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "hsl(215 55% 18%)" }}>
                    {d.donor_name ?? "—"}
                  </td>
                  <td style={{ padding: "10px 14px", direction: "ltr", color: "hsl(215 30% 40%)", fontSize: 12 }}>
                    {d.donor_email ?? "—"}
                  </td>
                  <td style={{ padding: "10px 14px", direction: "ltr", color: "hsl(215 30% 40%)", fontSize: 12 }}>
                    {d.phone ?? "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 800, color: "hsl(38 75% 38%)" }}>
                    {fmtILS(Number(d.amount))}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "hsl(215 35% 28%)", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.tier_id ? (TIER_NAMES[d.tier_id] ?? d.tier_id) : (d.description ?? "—")}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "hsl(215 30% 35%)", whiteSpace: "nowrap" }}>
                    {d.shipping_street
                      ? `${d.shipping_street} ${d.shipping_house_number ?? ""}, ${d.shipping_city}`
                      : <span style={{ color: "hsl(215 15% 65%)" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "hsl(215 30% 45%)", direction: "ltr" }}>
                    {d.shipping_zip ?? "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "hsl(215 30% 45%)", maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.shipping_notes ?? "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: "hsl(215 30% 45%)" }}>
                    {d.asmachta ?? "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: "hsl(215 30% 45%)" }}>
                    {d.payment_id ?? "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {statusBadge(d.payment_status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginBlockStart: 12, fontSize: 11, color: "hsl(215 20% 60%)", display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span>KPIs: <code>yehoshua_campaign_stats</code></span>
          <span>פירוט: <code>donations</code> (דרך endpoint מאובטח)</span>
          <span>מתרענן כל 45 שניות</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Root ───────────────────────────────────────────────────── */
export default function DesignPreviewYehoshuaAdmin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Attempt silent login if a password was stored from a previous visit.
  const [booting, setBooting] = useState(
    () => typeof window !== "undefined" && !!localStorage.getItem(PW_STORAGE_KEY)
  );

  const load = useCallback(async (pw: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.status === 401) {
        localStorage.removeItem(PW_STORAGE_KEY);
        setData(null);
        setError("סיסמה שגויה");
        return;
      }
      if (!res.ok) {
        setError("שגיאה בטעינת הנתונים. נסה שוב.");
        return;
      }
      const json = (await res.json()) as AdminData;
      localStorage.setItem(PW_STORAGE_KEY, pw);
      setData(json);
      setError(null);
    } catch {
      setError("שגיאת רשת. בדוק חיבור ונסה שוב.");
    } finally {
      setLoading(false);
      setBooting(false);
    }
  }, []);

  // Silent re-auth on mount if we already have a stored password.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(PW_STORAGE_KEY) : null;
    if (stored) load(stored, { silent: true });
  }, [load]);

  // Periodic refresh while logged in.
  useEffect(() => {
    if (!data) return;
    const id = setInterval(() => {
      const pw = localStorage.getItem(PW_STORAGE_KEY);
      if (pw) load(pw, { silent: true });
    }, 45_000);
    return () => clearInterval(id);
  }, [data, load]);

  const signOut = () => {
    localStorage.removeItem(PW_STORAGE_KEY);
    setData(null);
    setError(null);
  };

  const refresh = () => {
    const pw = localStorage.getItem(PW_STORAGE_KEY);
    if (pw) load(pw);
  };

  if (booting) {
    return (
      <div
        style={{
          fontFamily: "'Heebo', sans-serif",
          background: "hsl(215 55% 15%)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid hsl(215 30% 30%)",
            borderTopColor: "hsl(38 85% 68%)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) {
    return <PasswordScreen onSubmit={(pw) => load(pw)} loading={loading} error={error} />;
  }

  return (
    <AdminView
      data={data}
      loading={loading}
      error={error}
      onRefresh={refresh}
      onSignOut={signOut}
    />
  );
}
