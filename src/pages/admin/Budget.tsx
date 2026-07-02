/**
 * Admin · מנויים — Monday — /admin/budget
 *
 * דשבורד מנויי הפרק-השבועי מתוך לוח ה-Monday של בני ציון.
 * הגרפים שהרב יואב מציג לצוות: צמיחת מנויים, חדשים מול עזבו, MRR, אחוז נטישה.
 * נתונים חיים דרך edge `monday-insights` (טוקן server-side). אין mock.
 *
 * ⚠️ דורש: (1) route ב-App.tsx (אזור T14), (2) deploy של edge `monday-insights`
 * + secret MONDAY_API_TOKEN. עד אז מוצג מסך-הקמה. ראה _DONE.md.
 */

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, Banknote, UserPlus, UserMinus, PlugZap, Loader2, TrendingUp,
  HeartHandshake, Gift, AlertTriangle,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useMondayInsights, type MonthPoint } from "@/hooks/useMondayInsights";

const C = {
  navy: "#1A2744",
  gold: "#8B6F47",
  goldLight: "#C4A265",
  goldShimmer: "#E8D5A0",
  parchment: "#FAF6F0",
  text: "#2D1F0E",
  textMuted: "#6B5C4A",
  textSubtle: "#A69882",
  green: "#059669",
  red: "#b91c1c",
  teal: "#2D7D7D",
};

const shekel = (n: number) => `₪${(n ?? 0).toLocaleString()}`;
/** "2026-06" → "יוני 26" */
const HE_MONTHS = ["ינ׳","פבר׳","מרץ","אפר׳","מאי","יוני","יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"];
const heMonth = (iso: string) => {
  const [y, m] = iso.split("-");
  return `${HE_MONTHS[Number(m) - 1] ?? m} ${y.slice(2)}`;
};

const tooltipStyle = {
  borderRadius: 12, border: `1px solid ${C.goldShimmer}`,
  background: C.parchment, color: C.navy, direction: "rtl" as const, fontFamily: "Ploni",
};

function Kpi({ label, value, icon: Icon, accent, bg = C.parchment }: {
  label: string; value: string; icon: React.ElementType; accent: string; bg?: string;
}) {
  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-2"
      style={{
        background: bg, borderColor: C.goldShimmer,
        borderInlineStartWidth: "4px", borderInlineStartColor: accent, borderInlineStartStyle: "solid",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-ploni" style={{ color: C.textMuted }}>{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accent + "18" }}>
          <Icon className="w-4.5 h-4.5" style={{ color: accent }} aria-hidden />
        </div>
      </div>
      <span className="text-3xl font-kedem font-bold" style={{ color: C.text }}>{value}</span>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-kedem" style={{ color: C.navy }}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">{children as any}</ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function SetupScreen() {
  return (
    <div className="rounded-3xl border p-8 max-w-2xl" style={{ background: C.parchment, borderColor: C.goldShimmer }} dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: C.gold + "18" }}>
          <PlugZap className="w-6 h-6" style={{ color: C.gold }} aria-hidden />
        </div>
        <h2 className="text-2xl font-kedem font-bold" style={{ color: C.navy }}>חיבור Monday עדיין לא פעיל</h2>
      </div>
      <p className="font-ploni leading-relaxed mb-4" style={{ color: C.textMuted }}>
        הטוקן כבר נשמר. כדי שהנתונים החיים יופיעו כאן צריך לפרוס את ה-edge-function ולהגדיר את הסוד (פעם אחת):
      </p>
      <div className="rounded-xl p-4 font-mono text-xs leading-relaxed mb-4" style={{ background: "#fff", border: `1px solid ${C.goldShimmer}`, color: C.text, direction: "ltr" }}>
        supabase secrets set MONDAY_API_TOKEN=&lt;token&gt;<br />
        supabase functions deploy monday-insights
      </div>
      <p className="font-ploni text-sm" style={{ color: C.textSubtle }}>
        מקור הנתונים: לוח "היסטוריית מנויים חודשית" (5094769002). ברגע שה-edge יעלה — המסך יתחלף בגרפים החיים, ללא שינוי קוד.
      </p>
    </div>
  );
}

export default function Budget() {
  const { data, isLoading, error } = useMondayInsights();
  const months: MonthPoint[] = data?.months ?? [];
  const cur = data?.current;
  const donations = data?.donations;

  const chartData = months.map((m) => ({ ...m, label: heMonth(m.month) }));
  const campaignColor: Record<string, string> = { yehoshua: C.navy, saadia: C.teal, other: C.textSubtle };

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12" dir="rtl">
        <div>
          <h1 className="text-3xl font-kedem font-bold" style={{ color: C.navy }}>נתוני Monday — מנויים ותרומות</h1>
          <p className="font-ploni mt-1" style={{ color: C.textMuted }}>
            צמיחת מנויים, הכנסה חוזרת, נטישה וסיכום תרומות — חי מלוחות ה-Monday של בני ציון
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 py-16 justify-center" style={{ color: C.textMuted }}>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            <span className="font-ploni">טוען נתונים מ-Monday…</span>
          </div>
        ) : error || !cur ? (
          <SetupScreen />
        ) : (
          <>
            {/* KPIs — current month */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Kpi label="מנויים פעילים" value={cur.active.toLocaleString()} icon={Users} accent={C.green} bg="#f0fdf4" />
              <Kpi label="הכנסה חודשית (MRR)" value={shekel(cur.mrr)} icon={Banknote} accent={C.gold} />
              <Kpi label="חדשים החודש" value={cur.newSubs.toLocaleString()} icon={UserPlus} accent={C.teal} />
              <Kpi label="אחוז נטישה" value={`${cur.churn}%`} icon={UserMinus} accent={cur.churn >= 12 ? C.red : C.goldLight} />
            </div>

            {/* Growth + MRR */}
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="צמיחת מנויים פעילים">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.green} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.goldShimmer} opacity={0.5} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: C.textMuted, fontSize: 11, fontFamily: "Ploni" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: C.textMuted, fontSize: 11, fontFamily: "Ploni" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="active" name="סהכ פעיל" stroke={C.green} strokeWidth={2.5} fill="url(#gActive)" />
                </AreaChart>
              </ChartCard>

              <ChartCard title="הכנסה חודשית חוזרת (MRR ₪)">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.gold} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={C.gold} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.goldShimmer} opacity={0.5} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: C.textMuted, fontSize: 11, fontFamily: "Ploni" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: C.textMuted, fontSize: 11, fontFamily: "Ploni" }} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => shekel(v)} />
                  <Area type="monotone" dataKey="mrr" name="MRR" stroke={C.gold} strokeWidth={2.5} fill="url(#gMrr)" />
                </AreaChart>
              </ChartCard>
            </div>

            {/* New vs Left + Churn */}
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="מצטרפים מול עוזבים">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.goldShimmer} opacity={0.5} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: C.textMuted, fontSize: 11, fontFamily: "Ploni" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: C.textMuted, fontSize: 11, fontFamily: "Ploni" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontFamily: "Ploni", fontSize: 12 }} />
                  <Bar dataKey="newSubs" name="הצטרפו" fill={C.teal} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="left" name="עזבו" fill={C.red} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartCard>

              <ChartCard title="אחוז נטישה חודשי">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.goldShimmer} opacity={0.5} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: C.textMuted, fontSize: 11, fontFamily: "Ploni" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: C.textMuted, fontSize: 11, fontFamily: "Ploni" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="churn" name="נטישה" stroke={C.navy} strokeWidth={2.5} dot={{ r: 3, fill: C.navy }} />
                </LineChart>
              </ChartCard>
            </div>

            {/* ── Donations by campaign ── */}
            {donations && donations.count > 0 && (
              <div className="pt-4">
                <h2 className="text-2xl font-kedem font-bold flex items-center gap-2 mb-1" style={{ color: C.navy }}>
                  <HeartHandshake className="w-6 h-6" style={{ color: C.gold }} aria-hidden />
                  תרומות לפי קמפיין
                </h2>
                <p className="font-ploni mb-4" style={{ color: C.textMuted }}>
                  סך {donations.count.toLocaleString()} תרומות · ₪{donations.total.toLocaleString()} — מלוח ה-Grow ב-Monday
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  {donations.campaigns
                    .filter((c) => c.count > 0)
                    .map((c) => (
                      <div
                        key={c.key}
                        className="rounded-2xl border p-5 flex flex-col gap-2"
                        style={{
                          background: C.parchment, borderColor: C.goldShimmer,
                          borderInlineStartWidth: "4px",
                          borderInlineStartColor: campaignColor[c.key] ?? C.gold,
                          borderInlineStartStyle: "solid",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-ploni" style={{ color: C.textMuted }}>{c.label}</span>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: (campaignColor[c.key] ?? C.gold) + "18" }}>
                            <Gift className="w-4.5 h-4.5" style={{ color: campaignColor[c.key] ?? C.gold }} aria-hidden />
                          </div>
                        </div>
                        <span className="text-3xl font-kedem font-bold" style={{ color: C.text }}>{shekel(c.total)}</span>
                        <span className="text-xs font-ploni" style={{ color: C.textSubtle }}>{c.count.toLocaleString()} תרומות</span>
                      </div>
                    ))}
                </div>

                {/* Sync-gap flag: Saadia lives in Grow+Monday but not in the site DB */}
                {donations.campaigns.some((c) => c.key === "saadia" && c.total > 0) && (
                  <div
                    className="flex items-start gap-3 rounded-xl p-4"
                    style={{ background: "#FEF3C7", border: `1px solid ${C.goldShimmer}` }}
                    dir="rtl"
                  >
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.gold }} aria-hidden />
                    <p className="text-sm font-ploni leading-relaxed" style={{ color: "#92400E" }}>
                      <strong>שים לב לפער-סנכרון:</strong> תרומות קמפיין סעדיה נכנסות ל-Grow ומופיעות כאן (מ-Monday),
                      אך <strong>אינן נשמרות בטבלת ה-donations של האתר</strong> (שם רק קמפיין יהושע). כדי לאחד — צריך לחווט
                      את מוצר-הסליקה של סעדיה ל-webhook של האתר (<code>payment_products</code>).
                    </p>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs font-ploni text-center flex items-center justify-center gap-1.5" style={{ color: C.textSubtle }}>
              <TrendingUp className="w-3.5 h-3.5" aria-hidden />
              מקור: Monday · מנויים ({months.length} חודשים) + תרומות (Grow live)
            </p>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
