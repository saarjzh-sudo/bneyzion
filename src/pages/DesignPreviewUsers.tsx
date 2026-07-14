/**
 * /design-users — רמה 17: עמוד "משתמשים" מאוחד (סנדבוקס).
 *
 * רשומת-אדם אחת לכל email, עם דגלים (מנוי / תורם / קונה / חשבון / לא-פעיל /
 * חינמי) ואינדיקטור מקור-אמת: ירוק = חויב ב-Grow בחלון 35 יום · אמבר = tag
 * פעיל בלי חיוב מאומת (רק Monday) · אפור = ללא הו"ק.
 *
 * נבנה מהמוקאפ המאושר (Artifact 57ad0833). read-only מה-DB דרך
 * admin_unified_users(); פעולות כתיבה (הענקת גישה / סיום מנוי) יחוברו בשלב
 * המיזוג — הדיאלוג קיים אך מסומן כלא-פעיל.
 *
 * מצב תצוגה בלי DB: ‎?mock=1‎ טוען נתוני-דוגמה (לאימות עיצוב לפני יצירת ה-RPC).
 */
import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Download, UserPlus, X, ChevronLeft, KeyRound, Mail, AlertTriangle,
} from "lucide-react";
import {
  useUnifiedUsers, useUserDetail, truthStatus, userFlags,
  type UnifiedUser, type UserFlag, type TruthStatus,
} from "@/hooks/useUnifiedUsers";

// ── פלטה (שפת האתר — קרם חם, נייבי, זהב) ─────────────────────────────────
const C = {
  ground: "#F4EFE6", panel: "#ffffff", panel2: "#FAF6F0",
  ink: "#241a0c", muted: "#6B5C4A", faint: "#A69882",
  navy: "#1A2744", navy2: "#243158", gold: "#8B6F47", gold2: "#C4A265", glow: "#E8D5A0",
  line: "rgba(139,111,71,.18)", line2: "rgba(139,111,71,.34)",
  ok: "#15803d", okBg: "#e3f2e8", warn: "#b45309", warnBg: "#fbeed7",
  bad: "#b1361f", badBg: "#f7e4df", info: "#1e40af", infoBg: "#e2e9fb",
  purple: "#6d28d9", purpleBg: "#ece3fb", chip: "#efe9df",
  sh: "0 1px 2px rgba(36,26,12,.05), 0 6px 20px rgba(36,26,12,.07)",
  shLg: "0 20px 60px rgba(36,26,12,.22)",
};

const FLAG_META: Record<UserFlag, { label: string; bg: string; fg: string }> = {
  sub: { label: "מנוי פעיל", bg: C.okBg, fg: C.ok },
  don: { label: "תורם", bg: C.warnBg, fg: C.warn },
  buyer: { label: "קונה", bg: C.infoBg, fg: C.info },
  account: { label: "חשבון אתר", bg: C.purpleBg, fg: C.purple },
  inactive: { label: "לא-פעיל", bg: C.badBg, fg: C.bad },
  free: { label: "חינמי", bg: C.chip, fg: C.muted },
};

type FilterKey = "all" | UserFlag;

const AVATAR_COLORS = [C.gold, C.navy2, "#b45309", "#15803d", "#1e40af", "#6d28d9", "#b1361f"];
const avatarColor = (email: string) =>
  AVATAR_COLORS[[...email].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];

const initials = (name: string | null, email: string) => {
  const src = (name || "").trim() || email;
  const parts = src.split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2);
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "2-digit" }) : "—";

const daysAgo = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);

function truthText(u: UnifiedUser, t: TruthStatus): string {
  if (t === "live") {
    const n = daysAgo(u.last_sub_charge!);
    return n === 0 ? "חויב היום" : n === 1 ? "חויב אתמול" : n === 2 ? "חויב לפני יומיים" : `חויב לפני ${n} ימים`;
  }
  if (t === "stale") return "רק ב-Monday";
  if (u.last_sub_charge) return `הו"ק פגה (${fmtDate(u.last_sub_charge)})`;
  return "ללא הו״ק";
}

// ── נתוני-דוגמה ל-‎?mock=1 (לפני יצירת ה-RPC) ─────────────────────────────
const MOCK: UnifiedUser[] = [
  { email: "miriam.s@gmail.com", full_name: "מרים שטרן", phone: "0521111111", user_id: null, has_account: false, tags: [{ tag: "program:weekly-chapter", source: "webhook", granted_at: "2026-04-02", valid_until: "2026-08-12", cancelled_at: null, active: true }], is_subscriber_active: true, was_subscriber: true, donation_total: 271, donation_count: 1, last_donation_date: "2026-06-12", has_monthly_donation: false, purchase_count: 3, purchase_total: 267, purchased_products: ["weekly-chapter-subscription"], last_sub_charge: "2026-07-08", last_any_charge: "2026-07-08", first_seen: "2026-04-02" },
  { email: "e.barnes@walla.co.il", full_name: "אליהו ברנס", phone: null, user_id: null, has_account: false, tags: [{ tag: "program:weekly-chapter", source: "monday_reconcile", granted_at: "2026-05-10", valid_until: null, cancelled_at: null, active: true }], is_subscriber_active: true, was_subscriber: true, donation_total: 0, donation_count: 0, last_donation_date: null, has_monthly_donation: false, purchase_count: 0, purchase_total: 0, purchased_products: [], last_sub_charge: null, last_any_charge: null, first_seen: "2026-05-10" },
  { email: "ruth.azoulay@gmail.com", full_name: "רות אזולאי", phone: "0522222222", user_id: null, has_account: false, tags: [], is_subscriber_active: false, was_subscriber: false, donation_total: 1800, donation_count: 1, last_donation_date: "2026-06-18", has_monthly_donation: false, purchase_count: 0, purchase_total: 0, purchased_products: [], last_sub_charge: null, last_any_charge: null, first_seen: "2026-06-18" },
  { email: "yonatanl@gmail.com", full_name: "יונתן לוי", phone: "0523333333", user_id: "00000000-0000-0000-0000-000000000001", has_account: true, tags: [{ tag: "program:weekly-chapter", source: "webhook", granted_at: "2026-04-15", valid_until: "2026-08-16", cancelled_at: null, active: true }], is_subscriber_active: true, was_subscriber: true, donation_total: 540, donation_count: 2, last_donation_date: "2026-05-03", has_monthly_donation: false, purchase_count: 4, purchase_total: 476, purchased_products: ["weekly-chapter-subscription", "store-order"], last_sub_charge: "2026-07-12", last_any_charge: "2026-07-12", first_seen: "2026-04-15" },
  { email: "davidp@gmail.com", full_name: "דוד פרץ", phone: null, user_id: null, has_account: false, tags: [{ tag: "program:weekly-chapter", source: "monday_cancelled", granted_at: "2026-03-08", valid_until: "2026-06-01", cancelled_at: "2026-06-01", active: false }], is_subscriber_active: false, was_subscriber: true, donation_total: 0, donation_count: 0, last_donation_date: null, has_monthly_donation: false, purchase_count: 2, purchase_total: 178, purchased_products: ["weekly-chapter-subscription"], last_sub_charge: "2026-04-01", last_any_charge: "2026-04-01", first_seen: "2026-03-08" },
  { email: "naama.edri@gmail.com", full_name: "נעמה אדרי", phone: null, user_id: "00000000-0000-0000-0000-000000000002", has_account: true, tags: [], is_subscriber_active: false, was_subscriber: false, donation_total: 0, donation_count: 0, last_donation_date: null, has_monthly_donation: false, purchase_count: 0, purchase_total: 0, purchased_products: [], last_sub_charge: null, last_any_charge: null, first_seen: "2026-07-01" },
  { email: "s.gold@gmail.com", full_name: "שמואל גולד", phone: "0524444444", user_id: null, has_account: false, tags: [], is_subscriber_active: false, was_subscriber: false, donation_total: 360, donation_count: 3, last_donation_date: "2026-07-01", has_monthly_donation: true, purchase_count: 0, purchase_total: 0, purchased_products: [], last_sub_charge: null, last_any_charge: null, first_seen: "2026-05-01" },
  { email: "hana.m@gmail.com", full_name: "חנה מזרחי", phone: "0525555555", user_id: null, has_account: false, tags: [{ tag: "program:eicha-monday", source: "eicha_cohort", granted_at: "2026-06-22", valid_until: "2026-08-09", cancelled_at: null, active: true }], is_subscriber_active: true, was_subscriber: true, donation_total: 250, donation_count: 1, last_donation_date: "2026-06-30", has_monthly_donation: false, purchase_count: 1, purchase_total: 49, purchased_products: ["weekly-chapter-subscription"], last_sub_charge: "2026-07-05", last_any_charge: "2026-07-05", first_seen: "2026-06-22" },
  { email: "a.nachum@gmail.com", full_name: "אברהם נחום", phone: null, user_id: null, has_account: false, tags: [], is_subscriber_active: false, was_subscriber: false, donation_total: 0, donation_count: 0, last_donation_date: null, has_monthly_donation: false, purchase_count: 1, purchase_total: 89, purchased_products: ["store-order"], last_sub_charge: null, last_any_charge: "2026-06-10", first_seen: "2026-06-10" },
];

// ── רכיבי-משנה ─────────────────────────────────────────────────────────────
function Beacon({ status }: { status: TruthStatus }) {
  const map = {
    live: { bg: C.ok, ring: C.okBg, label: "חויב ב-Grow" },
    stale: { bg: C.warn, ring: C.warnBg, label: "רק ב-Monday — ללא חיוב מאומת" },
    none: { bg: C.faint, ring: C.chip, label: "ללא הוראת-קבע" },
  }[status];
  return (
    <span
      role="img"
      aria-label={map.label}
      title={map.label}
      style={{
        width: 9, height: 9, borderRadius: 99, flex: "none", display: "inline-block",
        background: map.bg, boxShadow: `0 0 0 3px ${map.ring}`,
      }}
    />
  );
}

function FlagChips({ flags }: { flags: UserFlag[] }) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {flags.map((f) => (
        <span key={f} style={{
          fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 7,
          whiteSpace: "nowrap", background: FLAG_META[f].bg, color: FLAG_META[f].fg,
        }}>
          {FLAG_META[f].label}
        </span>
      ))}
    </div>
  );
}

// ── העמוד ──────────────────────────────────────────────────────────────────
export default function DesignPreviewUsers() {
  const [params] = useSearchParams();
  const mock = params.get("mock") === "1";

  const query = useUnifiedUsers(!mock);
  const users: UnifiedUser[] = mock ? MOCK : (query.data ?? []);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const [grantFor, setGrantFor] = useState<UnifiedUser | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpenEmail(null); setGrantFor(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const enriched = useMemo(
    () => users.map((u) => ({ u, flags: userFlags(u), truth: truthStatus(u) })),
    [users],
  );

  const kpis = useMemo(() => ({
    all: enriched.length,
    sub: enriched.filter((e) => e.flags.includes("sub")).length,
    don: enriched.filter((e) => e.flags.includes("don")).length,
    buyer: enriched.filter((e) => e.flags.includes("buyer")).length,
    account: enriched.filter((e) => e.u.has_account).length,
    donTotal: enriched.reduce((s, e) => s + Number(e.u.donation_total || 0), 0),
  }), [enriched]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return enriched
      .filter((e) => filter === "all" || e.flags.includes(filter))
      .filter((e) =>
        !needle ||
        e.u.email.includes(needle) ||
        (e.u.full_name || "").toLowerCase().includes(needle) ||
        (e.u.phone || "").includes(needle))
      .sort((a, b) => {
        const la = a.u.last_any_charge || a.u.last_donation_date || a.u.first_seen || "";
        const lb = b.u.last_any_charge || b.u.last_donation_date || b.u.first_seen || "";
        return lb.localeCompare(la);
      });
  }, [enriched, q, filter]);

  const exportCsv = useCallback(() => {
    const head = "email,name,phone,flags,truth,last_sub_charge,donation_total,purchase_total\n";
    const rows = list.map(({ u, flags, truth }) =>
      [u.email, `"${(u.full_name || "").replace(/"/g, "'")}"`, u.phone || "", flags.join("|"),
        truth, u.last_sub_charge || "", u.donation_total, u.purchase_total].join(","));
    const blob = new Blob(["﻿" + head + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bneyzion-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setToast(`יוצאו ${list.length} רשומות ל-CSV`);
  }, [list]);

  const openUser = openEmail ? enriched.find((e) => e.u.email === openEmail) ?? null : null;

  const KPI_DEFS: Array<{ key: FilterKey; cap: string; v: number; sub: string; stripe: string }> = [
    { key: "all", cap: "סה״כ אנשים", v: kpis.all, sub: "רשומת-אדם אחת לכל אימייל", stripe: C.navy },
    { key: "sub", cap: "מנוי פעיל", v: kpis.sub, sub: "פרק שבועי + איכה", stripe: C.ok },
    { key: "don", cap: "תורמים", v: kpis.don, sub: `₪${Math.round(kpis.donTotal).toLocaleString()} מצטבר`, stripe: C.gold2 },
    { key: "buyer", cap: "קונים", v: kpis.buyer, sub: "רכישות מעבר להו״ק", stripe: C.info },
    { key: "account", cap: "עם חשבון אתר", v: kpis.account, sub: "נכנסים בפועל", stripe: C.purple },
  ];

  const CHIP_DEFS: Array<{ key: FilterKey; label: string; dot?: string }> = [
    { key: "all", label: "הכל" },
    { key: "sub", label: "מנויים", dot: C.ok },
    { key: "don", label: "תורמים", dot: C.gold2 },
    { key: "buyer", label: "קונים", dot: C.info },
    { key: "inactive", label: "לא-פעילים", dot: C.bad },
    { key: "free", label: "חינמי", dot: C.faint },
  ];

  return (
    <div dir="rtl" style={{ background: C.ground, color: C.ink, minHeight: "100vh", padding: "clamp(14px,3vw,30px)", lineHeight: 1.5 }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: C.gold, fontWeight: 700 }}>
              בני ציון · דשבורד ניהול
            </div>
            <h1 className="font-heading" style={{ margin: 0, fontSize: "clamp(24px,3.4vw,32px)", color: C.navy }}>משתמשים</h1>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>
              {mock ? "מצב הדגמה (mock) — נתוני-דוגמה בלבד" : "סנדבוקס · קריאה בלבד · מחליף את ״מנויים״"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={exportCsv} style={btnStyle(false)}>
              <Download size={15} /> ייצוא
            </button>
            <button onClick={() => setToast("הוספת משתמש תחובר בשלב המיזוג")} style={btnStyle(true)}>
              <UserPlus size={15} /> משתמש חדש
            </button>
          </div>
        </div>

        {/* Loading / error */}
        {!mock && query.isLoading && (
          <div style={{ ...cardStyle, padding: 40, textAlign: "center", color: C.muted }}>טוען משתמשים מה-DB…</div>
        )}
        {!mock && query.isError && (
          <div style={{ ...cardStyle, padding: 28, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <AlertTriangle size={20} color={C.warn} style={{ flex: "none", marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700 }}>אין גישה לנתונים</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                העמוד קורא את admin_unified_users() — פונקציה לאדמין בלבד. אם ההתחברות תקינה,
                ייתכן שה-RPC עדיין לא נוצר ב-DB (ממתין לאישור). לתצוגת-עיצוב: ‎?mock=1‎.
              </div>
              <div style={{ fontSize: 12, color: C.faint, marginTop: 6, direction: "ltr", textAlign: "right" }}>{query.error.message}</div>
            </div>
          </div>
        )}

        {(mock || query.isSuccess) && (
          <>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 11 }}>
              {KPI_DEFS.map((k) => (
                <button
                  key={k.key}
                  onClick={() => setFilter(filter === k.key ? "all" : k.key)}
                  aria-pressed={filter === k.key}
                  style={{
                    ...cardStyle, padding: "15px 16px", position: "relative", overflow: "hidden",
                    cursor: "pointer", textAlign: "right", fontFamily: "inherit", border: "1px solid",
                    borderColor: filter === k.key ? C.gold2 : C.line,
                    boxShadow: filter === k.key ? `0 0 0 1.5px ${C.gold2}, ${C.sh}` : C.sh,
                  }}
                >
                  <span style={{ position: "absolute", insetBlock: 0, insetInlineStart: 0, width: 4, background: k.stripe }} />
                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{k.cap}</div>
                  <div className="font-heading" style={{ fontSize: 31, fontWeight: 700, color: C.navy, lineHeight: 1, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
                    {k.v.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>{k.sub}</div>
                </button>
              ))}
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 400 }}>
                <Search size={16} color={C.faint} style={{ position: "absolute", insetInlineEnd: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="חיפוש לפי שם, אימייל או טלפון…"
                  aria-label="חיפוש משתמשים"
                  style={{
                    width: "100%", border: `1.5px solid ${C.line2}`, background: C.panel, borderRadius: 12,
                    padding: "10px 38px 10px 14px", fontSize: 14, color: C.ink, fontFamily: "inherit",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {CHIP_DEFS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setFilter(c.key)}
                    aria-pressed={filter === c.key}
                    style={{
                      border: `1.5px solid ${filter === c.key ? C.navy : C.line}`, borderRadius: 99,
                      padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: filter === c.key ? C.navy : C.panel,
                      color: filter === c.key ? "#fff" : C.muted,
                    }}
                  >
                    {c.dot && <span style={{ width: 8, height: 8, borderRadius: 99, background: c.dot }} />}
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div style={{ ...cardStyle, overflow: "hidden", padding: 0 }}>
              <div style={{ ...rowGrid, background: C.panel2, borderBottom: `1px solid ${C.line}` }}>
                <span style={thStyle}>משתמש</span>
                <span style={thStyle}>גישות ודגלים</span>
                <span style={thStyle}>מקור-אמת · חיוב</span>
                <span style={thStyle}>תרם</span>
                <span style={{ ...thStyle, textAlign: "left" }}>פעולות</span>
              </div>
              {list.slice(0, 200).map(({ u, flags, truth }) => (
                <div
                  key={u.email}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenEmail(u.email)}
                  onKeyDown={(e) => e.key === "Enter" && setOpenEmail(u.email)}
                  style={{ ...rowGrid, borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.panel2)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    <div className="font-heading" aria-hidden style={{
                      width: 38, height: 38, borderRadius: "50%", flex: "none", display: "flex",
                      alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14,
                      color: "#fff", background: avatarColor(u.email),
                    }}>
                      {initials(u.full_name, u.email)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.full_name || "—"}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.faint, direction: "ltr", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.email}
                      </div>
                    </div>
                  </div>
                  <FlagChips flags={flags} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Beacon status={truth} />
                    <span style={{ fontSize: 11.5, color: C.muted }}>
                      {truth === "live" ? <b style={{ color: C.ink }}>{truthText(u, truth)}</b> : truthText(u, truth)}
                    </span>
                  </div>
                  <div>
                    {u.donation_total > 0 ? (
                      <span className="font-heading" style={{ fontWeight: 700, fontSize: 15, color: C.gold }}>
                        ₪{Number(u.donation_total).toLocaleString()}
                        {u.has_monthly_donation && <span style={{ fontSize: 10, color: C.faint }}> /ח׳</span>}
                      </span>
                    ) : (
                      <span style={{ color: C.faint, fontSize: 12 }}>—</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button
                      title="תן גישה"
                      aria-label={`הענקת גישה ל-${u.full_name || u.email}`}
                      onClick={(e) => { e.stopPropagation(); setGrantFor(u); }}
                      style={iconBtnStyle}
                    >
                      <KeyRound size={15} />
                    </button>
                    <button
                      title="פרופיל"
                      aria-label={`פרופיל של ${u.full_name || u.email}`}
                      onClick={(e) => { e.stopPropagation(); setOpenEmail(u.email); }}
                      style={iconBtnStyle}
                    >
                      <ChevronLeft size={15} />
                    </button>
                  </div>
                </div>
              ))}
              {list.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: C.faint }}>אין תוצאות</div>
              )}
            </div>
            <div style={{ fontSize: 12, color: C.faint, textAlign: "center", padding: 6 }}>
              מציג {Math.min(list.length, 200).toLocaleString()} מתוך {list.length.toLocaleString()} תוצאות · {kpis.all.toLocaleString()} אנשים בסך הכל
              {list.length > 200 && " · מוצגות 200 הראשונות — אפשר לצמצם בחיפוש"}
            </div>
          </>
        )}
      </div>

      {/* Drawer */}
      {openUser && (
        <>
          <div
            onClick={() => setOpenEmail(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(20,14,6,.5)", zIndex: 40 }}
          />
          <UserDrawer
            u={openUser.u}
            flags={openUser.flags}
            truth={openUser.truth}
            mock={mock}
            onClose={() => setOpenEmail(null)}
            onGrant={() => setGrantFor(openUser.u)}
            notify={setToast}
          />
        </>
      )}

      {/* Grant dialog (שלב-מיזוג — עדיין לא פעיל) */}
      {grantFor && (
        <div
          onClick={(e) => e.target === e.currentTarget && setGrantFor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,14,6,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 18 }}
        >
          <div role="dialog" aria-modal="true" aria-label="הענקת גישה" style={{ background: C.ground, borderRadius: 18, boxShadow: C.shLg, width: "min(420px,96vw)", padding: 22, border: `1px solid ${C.line2}` }}>
            <h3 className="font-heading" style={{ margin: "0 0 4px", fontSize: 19, color: C.navy, display: "flex", alignItems: "center", gap: 8 }}>
              <KeyRound size={18} /> הענקת גישה
            </h3>
            <p style={{ margin: "0 0 15px", fontSize: 13, color: C.muted }}>
              ל-<b>{grantFor.full_name || grantFor.email}</b>
            </p>
            <div style={{ marginBottom: 13 }}>
              <label htmlFor="grant-type" style={labelStyle}>סוג גישה</label>
              <select id="grant-type" style={inputStyle} defaultValue="program:weekly-chapter">
                <option value="program:weekly-chapter">מנוי הפרק השבועי</option>
                <option value="program:eicha-monday">איכה — ימי שני</option>
                <option value="donor">סימון כתורם</option>
              </select>
            </div>
            <div style={{ marginBottom: 13 }}>
              <label htmlFor="grant-until" style={labelStyle}>תוקף עד (ריק = ללא הגבלה)</label>
              <input id="grant-until" type="date" style={inputStyle} />
            </div>
            <div style={{ background: C.warnBg, border: `1px solid ${C.line}`, borderRadius: 11, padding: "11px 13px", fontSize: 12.5, color: C.warn, fontWeight: 600 }}>
              שלב קריאה-בלבד: ההענקה (כולל סנכרון ל-user_access_tags / Smoove / Monday) תחובר בשלב המיזוג, אחרי אישור.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setGrantFor(null)} style={btnStyle(false)}>סגירה</button>
              <button disabled style={{ ...btnStyle(true), opacity: 0.45, cursor: "not-allowed" }}>הענק גישה</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed", insetInline: 0, bottom: 26, margin: "auto", width: "max-content", maxWidth: "90vw",
          background: C.navy, color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 600,
          boxShadow: C.shLg, zIndex: 60, pointerEvents: "none",
          opacity: toast ? 1 : 0, transform: toast ? "translateY(0)" : "translateY(12px)",
          transition: "opacity .2s, transform .2s",
        }}
      >
        {toast}
      </div>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────
function UserDrawer({ u, flags, truth, mock, onClose, onGrant, notify }: {
  u: UnifiedUser; flags: UserFlag[]; truth: TruthStatus; mock: boolean;
  onClose: () => void; onGrant: () => void; notify: (m: string) => void;
}) {
  const detail = useUserDetail(mock ? null : u.email);

  const timeline: Array<{ date: string | null; text: string; amount: string | null }> = useMemo(() => {
    if (mock || !detail.data) {
      return [
        ...(u.last_sub_charge ? [{ date: u.last_sub_charge, text: "חיוב הו״ק אחרון", amount: null }] : []),
        ...(u.last_donation_date ? [{ date: u.last_donation_date, text: "תרומה אחרונה", amount: `₪${Number(u.donation_total).toLocaleString()}` }] : []),
      ];
    }
    const orders = detail.data.orders.map((o) => ({
      date: o.date,
      text: `${o.description || o.product || "עסקה"}${o.status === "refunded" ? " · הוחזר" : ""}`,
      amount: o.total != null ? `₪${Number(o.total).toLocaleString()}` : null,
    }));
    const donations = detail.data.donations.map((d) => ({
      date: d.date,
      text: d.is_monthly ? "תרומה חודשית (הו״ק)" : "תרומה",
      amount: d.amount != null ? `₪${Number(d.amount).toLocaleString()}` : null,
    }));
    return [...orders, ...donations]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 30);
  }, [mock, detail.data, u]);

  return (
    <aside
      aria-label={`פרופיל של ${u.full_name || u.email}`}
      style={{
        position: "fixed", insetBlock: 0, insetInlineStart: 0, width: "min(460px,94vw)", background: C.ground,
        boxShadow: C.shLg, zIndex: 41, display: "flex", flexDirection: "column", overflowY: "auto", direction: "rtl",
      }}
    >
      <div style={{ background: C.navy, color: "#fff", padding: 22, position: "sticky", top: 0, zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: C.glow, fontWeight: 700 }}>פרופיל משתמש</span>
          <button onClick={onClose} aria-label="סגירה" style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: "rgba(255,255,255,.14)", color: "#fff", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginTop: 14 }}>
          <div className="font-heading" aria-hidden style={{ width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 19, color: "#fff", background: avatarColor(u.email) }}>
            {initials(u.full_name, u.email)}
          </div>
          <div>
            <div className="font-heading" style={{ fontSize: 20, fontWeight: 700 }}>{u.full_name || "—"}</div>
            <div style={{ fontSize: 12.5, color: C.glow, direction: "ltr", opacity: 0.85 }}>{u.email}</div>
            {u.phone && <div style={{ fontSize: 12, color: C.glow, direction: "ltr", opacity: 0.7 }}>{u.phone}</div>}
            <div style={{ marginTop: 7 }}><FlagChips flags={flags} /></div>
          </div>
        </div>
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
        <section>
          <div style={secHeadStyle}>מקור-אמת</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: "11px 13px" }}>
            <Beacon status={truth} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                {truth === "live" && `מנוי חי — ${truthText(u, truth)} ב-Grow`}
                {truth === "stale" && "רק ב-Monday — ללא חיוב Grow מאומת"}
                {truth === "none" && (u.has_account ? "חשבון אתר, ללא הוראת-קבע" : "ללא הוראת-קבע")}
              </div>
              <div style={{ fontSize: 11.5, color: C.muted }}>
                {truth === "stale"
                  ? "מומלץ לאמת מול Grow שההו״ק פעילה"
                  : `נראה לראשונה: ${fmtDate(u.first_seen)}`}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div style={secHeadStyle}>גישות תוכן</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {u.tags.length === 0 && (
              <div style={{ fontSize: 13, color: C.faint }}>אין גישות פעילות — משתמש חינמי</div>
            )}
            {u.tags.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: "11px 13px" }}>
                <span style={{
                  width: 10, height: 10, borderRadius: 99, flex: "none",
                  background: t.active ? C.ok : C.bad,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                    {t.tag === "program:weekly-chapter" ? "מנוי הפרק השבועי"
                      : t.tag === "program:eicha-monday" ? "איכה — ימי שני"
                      : t.tag}
                    {!t.active && " · לא פעיל"}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.muted, direction: "ltr", textAlign: "right" }}>
                    {t.source || "—"}{t.valid_until ? ` · עד ${fmtDate(t.valid_until)}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div style={secHeadStyle}>היסטוריית תשלומים ותרומות</div>
          {!mock && detail.isLoading && <div style={{ fontSize: 13, color: C.faint }}>טוען היסטוריה…</div>}
          {!mock && detail.isError && <div style={{ fontSize: 12.5, color: C.warn }}>ההיסטוריה זמינה אחרי יצירת admin_user_detail()‏.</div>}
          <div style={{ position: "relative", paddingInlineStart: 18 }}>
            <span style={{ position: "absolute", insetBlock: 6, insetInlineStart: 4, width: 2, background: C.line2 }} />
            {timeline.length === 0 && !detail.isLoading && (
              <div style={{ fontSize: 13, color: C.faint }}>אין עסקאות רשומות</div>
            )}
            {timeline.map((x, i) => (
              <div key={i} style={{ position: "relative", paddingBottom: 14 }}>
                <span style={{ position: "absolute", insetInlineStart: -17, top: 4, width: 9, height: 9, borderRadius: 99, background: C.gold2, boxShadow: `0 0 0 3px ${C.ground}` }} />
                <div style={{ fontSize: 11, color: C.faint }}>{fmtDate(x.date)}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {x.text}
                  {x.amount && <> · <span className="font-heading" style={{ color: C.gold, fontWeight: 700 }}>{x.amount}</span></>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
          <button onClick={onGrant} style={btnStyle(true)}><KeyRound size={14} /> תן גישה</button>
          <button onClick={() => notify("שליחת מייל תחובר בשלב המיזוג")} style={btnStyle(false)}><Mail size={14} /> שלח מייל</button>
        </div>
      </div>
    </aside>
  );
}

// ── סגנונות משותפים ───────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, boxShadow: C.sh,
};
const rowGrid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "2.4fr 2fr 1.5fr 1fr 1.1fr", gap: 12, alignItems: "center", padding: "12px 18px",
};
const thStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: C.muted };
const secHeadStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 9,
};
const iconBtnStyle: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel,
  cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.muted,
};
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 700, color: C.muted, marginBottom: 5 };
const inputStyle: React.CSSProperties = {
  width: "100%", border: `1.5px solid ${C.line2}`, background: C.panel, borderRadius: 10,
  padding: "9px 12px", fontSize: 14, color: C.ink, fontFamily: "inherit",
};
function btnStyle(primary: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13,
    padding: "9px 15px", borderRadius: 11, cursor: "pointer", fontFamily: "inherit",
    border: `1.5px solid ${primary ? C.navy : C.line2}`,
    background: primary ? C.navy : C.panel,
    color: primary ? "#fff" : C.gold,
  };
}
