/**
 * DesignPreviewYehoshuaAdmin — Sandbox
 * Route: /design-yehoshua-admin
 *
 * Admin dashboard for the yehoshua-campaign donations.
 * Sandbox only — no auth gate (will be added before production rollout).
 *
 * Features:
 * - 4 KPI cards: total raised, donors, average, remaining to goal
 * - Full donations table with: date, name, amount, tier, asmachta, payment_id, status
 * - Filter by date range (from/to) and by status (all / completed / pending)
 * - CSV export of filtered completed records
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

const GOAL = 80_000;
const PRODUCT = "yehoshua-campaign";

interface DonationRow {
  id: string;
  created_at: string;
  donor_name: string | null;
  amount: number;
  description: string | null;
  asmachta: string | null;
  payment_id: string | null;
  payment_status: string;
}

/* ─── Helpers ───────────────────────────────────────────── */
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtILS(n: number) {
  return "₪" + n.toLocaleString("he-IL");
}

function statusColor(s: string): string {
  if (s === "completed") return "hsl(142 55% 42%)";
  if (s === "pending") return "hsl(38 80% 48%)";
  if (s === "failed") return "hsl(0 65% 50%)";
  return "hsl(215 20% 50%)";
}

function statusLabel(s: string): string {
  if (s === "completed") return "הושלם";
  if (s === "pending") return "ממתין";
  if (s === "failed") return "נכשל";
  return s;
}

function exportCSV(rows: DonationRow[]) {
  const headers = ["תאריך", "שם", "סכום", "Tier", "אסמכתא", "Payment ID", "סטטוס"];
  const lines = rows.map((r) => [
    fmtDate(r.created_at),
    r.donor_name ?? "",
    r.amount,
    r.description ?? "",
    r.asmachta ?? "",
    r.payment_id ?? "",
    r.payment_status,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = "﻿" + [headers.join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yehoshua-campaign-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── KPI Card ───────────────────────────────────────────── */
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

/* ─── Main ───────────────────────────────────────────────── */
export default function DesignPreviewYehoshuaAdmin() {
  const [rows, setRows] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");

  // Fetch all campaign donations (no server-side filter — simple enough for sandbox)
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("donations")
        .select(
          "id, created_at, donor_name, amount, description, asmachta, payment_id, payment_status"
        )
        .eq("product", PRODUCT)
        .order("created_at", { ascending: false });
      if (err) {
        setError(err.message);
      } else {
        setRows((data || []) as DonationRow[]);
      }
      setLoading(false);
    }
    fetchAll();

    // Realtime: refresh when a row changes
    const channel = supabase
      .channel("yehoshua-admin-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "donations",
          filter: `product=eq.${PRODUCT}`,
        },
        () => fetchAll()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Client-side filtering
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.payment_status !== statusFilter) return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (new Date(r.created_at) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(r.created_at) > to) return false;
      }
      return true;
    });
  }, [rows, statusFilter, dateFrom, dateTo]);

  // KPI values — always based on ALL completed (not filtered)
  const completed = rows.filter((r) => r.payment_status === "completed");
  const totalRaised = completed.reduce((s, r) => s + r.amount, 0);
  const donorCount = completed.length;
  const avg = donorCount > 0 ? Math.round(totalRaised / donorCount) : 0;
  const remaining = Math.max(0, GOAL - totalRaised);

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
        table { border-collapse: collapse; width: 100%; }
        th { text-align: right; }
        tr:hover td { background: hsl(38 40% 96%); }
      `}</style>

      {/* ── Header bar ── */}
      <div
        style={{
          background: "hsl(215 55% 15%)",
          padding: "18px 28px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href="/design-yehoshua-campaign"
            style={{
              color: "hsl(38 85% 68%)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ← קמפיין יהושע
          </a>
          <span style={{ color: "hsl(215 20% 35%)" }}>|</span>
          <h1
            style={{
              color: "white",
              fontWeight: 900,
              fontSize: 18,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            ניהול תרומות — ספר יהושע
          </h1>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "hsl(215 10% 50%)",
            background: "hsl(215 40% 10%)",
            padding: "3px 10px",
            borderRadius: 99,
          }}
        >
          sandbox only — אין auth
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── KPI Cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBlockEnd: 32,
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
            label="תרומה ממוצעת"
            value={avg ? fmtILS(avg) : "—"}
            accent="hsl(215 45% 35%)"
          />
          <KpiCard
            label="נשאר ליעד"
            value={fmtILS(remaining)}
            sub={`${Math.min(100, Math.round((totalRaised / GOAL) * 100))}% הושג`}
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBlockEnd: 10,
              fontSize: 13,
              fontWeight: 600,
              color: "hsl(215 30% 35%)",
            }}
          >
            <span>התקדמות לעבר היעד</span>
            <span style={{ color: "hsl(38 75% 40%)", fontWeight: 800 }}>
              {Math.min(100, Math.round((totalRaised / GOAL) * 100))}%
            </span>
          </div>
          <div
            style={{
              height: 10,
              background: "hsl(215 15% 88%)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, Math.round((totalRaised / GOAL) * 100))}%`,
                background: "linear-gradient(90deg, hsl(43 85% 62%), hsl(38 75% 48%))",
                borderRadius: 10,
                transition: "width 0.8s ease-out",
              }}
            />
          </div>
        </div>

        {/* ── Filters row ── */}
        <div
          style={{
            background: "white",
            border: "1.5px solid hsl(215 15% 88%)",
            borderRadius: 14,
            padding: "16px 20px",
            marginBlockEnd: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "hsl(215 30% 35%)",
              flexShrink: 0,
            }}
          >
            סינון:
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "hsl(215 20% 50%)" }}>מתאריך</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                border: "1.5px solid hsl(215 15% 82%)",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 13,
                color: "hsl(215 40% 20%)",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "hsl(215 20% 50%)" }}>עד תאריך</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                border: "1.5px solid hsl(215 15% 82%)",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 13,
                color: "hsl(215 40% 20%)",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "hsl(215 20% 50%)" }}>סטטוס</label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "completed" | "pending")
              }
              style={{
                border: "1.5px solid hsl(215 15% 82%)",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 13,
                color: "hsl(215 40% 20%)",
                outline: "none",
              }}
            >
              <option value="all">הכל</option>
              <option value="completed">הושלם</option>
              <option value="pending">ממתין</option>
            </select>
          </div>

          {(dateFrom || dateTo || statusFilter !== "all") && (
            <button
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setStatusFilter("all");
              }}
              style={{
                background: "none",
                border: "1.5px solid hsl(215 20% 75%)",
                borderRadius: 8,
                padding: "5px 12px",
                fontSize: 12,
                color: "hsl(215 30% 42%)",
                cursor: "pointer",
              }}
            >
              נקה סינון
            </button>
          )}

          <div style={{ flex: 1 }} />

          <button
            onClick={() =>
              exportCSV(filtered.filter((r) => r.payment_status === "completed"))
            }
            disabled={filtered.filter((r) => r.payment_status === "completed").length === 0}
            style={{
              background: filtered.filter((r) => r.payment_status === "completed").length > 0
                ? "linear-gradient(135deg, hsl(43 85% 62%), hsl(38 75% 48%))"
                : "hsl(215 15% 78%)",
              color: filtered.filter((r) => r.payment_status === "completed").length > 0
                ? "hsl(215 55% 12%)"
                : "hsl(215 20% 55%)",
              border: "none",
              borderRadius: 10,
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: filtered.filter((r) => r.payment_status === "completed").length > 0
                ? "pointer"
                : "not-allowed",
              flexShrink: 0,
            }}
          >
            ייצוא CSV ({filtered.filter((r) => r.payment_status === "completed").length})
          </button>
        </div>

        {/* ── Table ── */}
        <div
          style={{
            background: "white",
            border: "1.5px solid hsl(215 15% 88%)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {/* Table header */}
          <div
            style={{
              padding: "14px 20px",
              borderBlockEnd: "1.5px solid hsl(215 15% 90%)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "hsl(215 35% 22%)" }}>
              רשומות ({filtered.length})
            </span>
            {loading && (
              <span style={{ fontSize: 12, color: "hsl(215 20% 55%)" }}>טוען...</span>
            )}
            {error && (
              <span style={{ fontSize: 12, color: "hsl(0 65% 50%)" }}>שגיאה: {error}</span>
            )}
          </div>

          {filtered.length === 0 && !loading ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "hsl(215 20% 55%)",
                fontSize: 14,
              }}
            >
              אין רשומות לתצוגה
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr
                    style={{
                      background: "hsl(215 15% 97%)",
                      borderBlockEnd: "1.5px solid hsl(215 15% 90%)",
                    }}
                  >
                    {[
                      "תאריך",
                      "שם",
                      "סכום",
                      "Tier",
                      "אסמכתא",
                      "Payment ID",
                      "סטטוס",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 16px",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "hsl(215 25% 40%)",
                          letterSpacing: "0.03em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      style={{
                        borderBlockEnd: "1px solid hsl(215 15% 93%)",
                      }}
                    >
                      <td
                        style={{
                          padding: "11px 16px",
                          fontSize: 13,
                          color: "hsl(215 30% 30%)",
                          whiteSpace: "nowrap",
                          direction: "ltr",
                          textAlign: "left",
                        }}
                      >
                        {fmtDate(r.created_at)}
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "hsl(215 40% 18%)",
                        }}
                      >
                        {r.donor_name ?? "—"}
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "hsl(38 75% 38%)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtILS(r.amount)}
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          fontSize: 12,
                          color: "hsl(215 25% 42%)",
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={r.description ?? ""}
                      >
                        {r.description ?? "—"}
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          fontSize: 12,
                          color: "hsl(215 25% 42%)",
                          fontFamily: "monospace",
                          direction: "ltr",
                          textAlign: "left",
                        }}
                      >
                        {r.asmachta ?? "—"}
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          fontSize: 11,
                          color: "hsl(215 25% 50%)",
                          fontFamily: "monospace",
                          direction: "ltr",
                          textAlign: "left",
                          maxWidth: 130,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={r.payment_id ?? ""}
                      >
                        {r.payment_id ?? "—"}
                      </td>
                      <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 700,
                            color: statusColor(r.payment_status),
                            background: `${statusColor(r.payment_status)}18`,
                            padding: "3px 10px",
                            borderRadius: 99,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              background: statusColor(r.payment_status),
                              borderRadius: "50%",
                              flexShrink: 0,
                            }}
                          />
                          {statusLabel(r.payment_status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div
          style={{
            marginBlockStart: 16,
            fontSize: 11,
            color: "hsl(215 20% 55%)",
            textAlign: "center",
          }}
        >
          sandbox — ללא אימות · מציג רשומות product = '{PRODUCT}' · מתעדכן realtime
        </div>
      </div>
    </div>
  );
}
