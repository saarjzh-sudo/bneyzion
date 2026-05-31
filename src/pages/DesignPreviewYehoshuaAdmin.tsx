/**
 * DesignPreviewYehoshuaAdmin — Admin Dashboard
 * Route: /design-yehoshua-admin
 *
 * Auth-gated: Google OAuth. Allowlist: saar.j.z.h@gmail.com only.
 * Authenticated admin sees full donations table (PII included) + CSV export.
 * KPI cards are served from yehoshua_campaign_stats view (faster, no RLS issue).
 * Full rows fetched from donations table via authenticated Supabase client.
 *
 * Security model:
 *   - anon: can INSERT (Grow webhook), cannot SELECT (no SELECT policy for anon)
 *   - authenticated (saar only): can SELECT via admin_select_donations policy
 *   - Non-saar authenticated: policy USING clause returns false → 0 rows
 *   - Frontend: checks user.email after auth — shows "no permission" screen for non-saar
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const GOAL = 80_000;
const PRODUCT = "yehoshua-campaign";
const ADMIN_EMAIL = "saar.j.z.h@gmail.com";

/* ─── Types ────────────────────────────────────────────────── */
interface CampaignStatsRow {
  supporters: number;
  raised: number;
}

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

/* ─── Login Screen ───────────────────────────────────────────── */
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/design-yehoshua-admin`,
      },
    });
    // Navigation happens automatically after OAuth round-trip
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
      <div
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
            margin: "0 0 32px",
            lineHeight: 1.6,
          }}
        >
          כניסה מוגבלת למנהל בלבד.
          <br />
          התחבר עם חשבון Google המורשה.
        </p>
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            background: loading ? "hsl(215 15% 88%)" : "hsl(215 55% 20%)",
            color: loading ? "hsl(215 20% 55%)" : "white",
            border: "none",
            borderRadius: 12,
            padding: "14px 24px",
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "background 0.2s",
          }}
        >
          {loading ? (
            <span>מעבד...</span>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              כניסה עם Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Unauthorized Screen ────────────────────────────────────── */
function UnauthorizedScreen({ email, onSignOut }: { email: string; onSignOut: () => void }) {
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
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: "48px 40px",
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>⛔</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "hsl(0 55% 40%)", margin: "0 0 8px" }}>
          אין הרשאה
        </h2>
        <p style={{ fontSize: 14, color: "hsl(215 20% 50%)", margin: "0 0 8px", lineHeight: 1.6 }}>
          המשתמש <strong>{email}</strong> אינו מורשה לעמוד זה.
        </p>
        <p style={{ fontSize: 13, color: "hsl(215 20% 60%)", margin: "0 0 28px" }}>
          פנה למנהל המערכת להוספת הרשאה.
        </p>
        <button
          onClick={onSignOut}
          style={{
            background: "hsl(215 55% 20%)",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          התנתק
        </button>
      </div>
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
function AdminView({ userEmail, onSignOut }: { userEmail: string; onSignOut: () => void }) {
  const [stats, setStats] = useState<CampaignStatsRow>({ supporters: 0, raised: 0 });
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // KPIs from view (fast, no RLS issue)
    const { data: statsData, error: statsErr } = await supabase
      .from("yehoshua_campaign_stats")
      .select("*")
      .single();
    if (statsErr) {
      setError("שגיאה בטעינת סטטיסטיקות: " + statsErr.message);
      setLoading(false);
      return;
    }
    if (statsData) {
      const s = statsData as { raised: number; supporters: number };
      setStats({ supporters: Number(s.supporters) || 0, raised: Number(s.raised) || 0 });
    }

    // Full donations from table (authenticated — RLS allows saar only)
    let query = supabase
      .from("donations")
      .select(
        "id, created_at, donor_name, donor_email, phone, amount, asmachta, payment_id, payment_status, product, payment_method, card_suffix"
      )
      .eq("product", PRODUCT)
      .order("created_at", { ascending: false });

    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");
    if (statusFilter !== "all") query = query.eq("payment_status", statusFilter);

    const { data: donationsData, error: donationsErr } = await query;
    if (donationsErr) {
      setError("שגיאה בטעינת תרומות: " + donationsErr.message);
      setLoading(false);
      return;
    }
    setDonations((donationsData as DonationRow[]) || []);
    setLoading(false);
  }, [dateFrom, dateTo, statusFilter]);

  useEffect(() => {
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel("yehoshua-admin-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "donations", filter: `product=eq.${PRODUCT}` },
        () => fetchData()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const totalRaised = stats.raised;
  const donorCount = stats.supporters;
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "hsl(38 60% 70%)" }}>{userEmail}</span>
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

        {loading && (
          <div style={{ textAlign: "center", color: "hsl(215 20% 55%)", padding: "32px", fontSize: 14 }}>
            טוען...
          </div>
        )}
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
              minWidth: 900,
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
                    colSpan={8}
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

        <div style={{ marginBlockStart: 12, fontSize: 11, color: "hsl(215 20% 60%)", display: "flex", gap: 16 }}>
          <span>KPIs: <code>yehoshua_campaign_stats</code> view</span>
          <span>פירוט: <code>donations</code> table (RLS: admin only)</span>
          <span>מתעדכן: realtime</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Root ───────────────────────────────────────────────────── */
export default function DesignPreviewYehoshuaAdmin() {
  const { user, isLoading, signOut } = useAuth();

  // Auth state machine
  if (isLoading) {
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

  if (!user) {
    return <LoginScreen onLogin={() => {}} />;
  }

  const userEmail = user.email ?? "";

  if (userEmail !== ADMIN_EMAIL) {
    return (
      <UnauthorizedScreen
        email={userEmail}
        onSignOut={async () => {
          await signOut();
        }}
      />
    );
  }

  return (
    <AdminView
      userEmail={userEmail}
      onSignOut={async () => {
        await signOut();
      }}
    />
  );
}
