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

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const GOAL = 80_000;
const PRODUCT = "yehoshua-campaign";

// NOTE (sandbox): Admin shows aggregates only — same view as public campaign page.
// Donor name / asmachta / payment_id columns require authenticated admin access
// which will be wired in production. Showing donor PII to anon is intentionally
// blocked via RLS on the donations table.
interface CampaignStatsRow {
  supporters: number;
  raised: number;
}

/* ─── Helpers ───────────────────────────────────────────── */
function fmtILS(n: number) {
  return "₪" + n.toLocaleString("he-IL");
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
// SANDBOX NOTE: This admin shows aggregate KPIs only (from yehoshua_campaign_stats view).
// Donor detail rows (name, asmachta, payment_id) require authenticated admin access — NOT
// available to anon. Will be wired in production via Supabase auth + admin role check.
// Until then: no PII is exposed — safer than showing an empty table that implies "no donors".
export default function DesignPreviewYehoshuaAdmin() {
  const [stats, setStats] = useState<CampaignStatsRow>({ supporters: 0, raised: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("yehoshua_campaign_stats")
        .select("*")
        .single();
      if (err) {
        setError(err.message);
      } else if (data) {
        setStats({ supporters: Number(data.supporters) || 0, raised: Number(data.raised) || 0 });
      }
      setLoading(false);
    }
    fetchStats();

    // Realtime on donations table — refetch the view on any change
    const channel = supabase
      .channel("yehoshua-admin-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "donations", filter: `product=eq.${PRODUCT}` },
        () => fetchStats()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalRaised = stats.raised;
  const donorCount = stats.supporters;
  const remaining = Math.max(0, GOAL - totalRaised);
  const progressPct = Math.min(100, Math.round((totalRaised / GOAL) * 100));

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
      <style>{`* { box-sizing: border-box; } input, select { font-family: inherit; }`}</style>

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
            style={{ color: "hsl(38 85% 68%)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
          >
            ← קמפיין יהושע
          </a>
          <span style={{ color: "hsl(215 20% 35%)" }}>|</span>
          <h1 style={{ color: "white", fontWeight: 900, fontSize: 18, margin: 0, letterSpacing: "-0.01em" }}>
            ניהול תרומות — ספר יהושע
          </h1>
        </div>
        <div style={{ fontSize: 11, color: "hsl(215 10% 50%)", background: "hsl(215 40% 10%)", padding: "3px 10px", borderRadius: 99 }}>
          sandbox only — אין auth
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        {loading && (
          <div style={{ textAlign: "center", color: "hsl(215 20% 55%)", padding: "32px", fontSize: 14 }}>טוען...</div>
        )}
        {error && (
          <div style={{ textAlign: "center", color: "hsl(0 65% 50%)", padding: "16px", fontSize: 13 }}>שגיאה: {error}</div>
        )}

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

        {/* ── Sandbox notice ── */}
        <div
          style={{
            background: "hsl(215 40% 14%)",
            border: "1.5px solid hsl(215 30% 28%)",
            borderRadius: 14,
            padding: "20px 24px",
            marginBlockEnd: 20,
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 800, color: "hsl(38 85% 68%)" }}>
            פירוט תורמים — ב-production בלבד
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "hsl(215 10% 65%)", lineHeight: 1.6 }}>
            טבלת שמות תורמים, אסמכתאות ומזהי תשלום תוצג לאדמין מחובר בלבד.
            ב-sandbox הגישה ל-<code style={{ background: "hsl(215 30% 22%)", padding: "1px 6px", borderRadius: 4 }}>donations</code> חסומה ל-anon דרך RLS —
            כך PII של תורמים לא נחשף.
          </p>
        </div>

        {/* Footer note */}
        <div style={{ marginBlockStart: 16, fontSize: 11, color: "hsl(215 20% 55%)", textAlign: "center" }}>
          sandbox · נתונים מ-<code>yehoshua_campaign_stats</code> view · מתעדכן realtime
        </div>
      </div>
    </div>
  );
}
