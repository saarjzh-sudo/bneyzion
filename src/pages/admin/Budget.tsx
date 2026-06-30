/**
 * Admin Budget — /admin/budget
 *
 * מעקב תקציבי מלוח Monday של בני ציון.
 * כשאין חיבור (אין token/board) — מציג מסך-הקמה ידידותי עם מה שצריך מסער.
 * כשמחובר — KPI + טבלת סעיפים חיה.
 *
 * ⚠️ דורש רישום route ב-App.tsx (אזור T14) — ראה _DONE.md.
 */

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown, PlugZap, Loader2, AlertCircle } from "lucide-react";
import { useMondayBudget } from "@/hooks/useMondayBudget";

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
};

const shekel = (n: number) => `₪${(n ?? 0).toLocaleString()}`;

function SetupScreen() {
  return (
    <div
      className="rounded-3xl border p-8 max-w-2xl"
      style={{ background: C.parchment, borderColor: C.goldShimmer }}
      dir="rtl"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: C.gold + "18" }}>
          <PlugZap className="w-6 h-6" style={{ color: C.gold }} aria-hidden />
        </div>
        <h2 className="text-2xl font-kedem font-bold" style={{ color: C.navy }}>
          חיבור מעקב התקציב
        </h2>
      </div>
      <p className="font-ploni leading-relaxed mb-4" style={{ color: C.textMuted }}>
        כאן יוצג מעקב התקציב מלוח ה-Monday של בני ציון — סעיפים, מתוקצב מול נוצל, ויתרה.
        כדי להפעיל את החיבור, צריך שני פרטים:
      </p>
      <ul className="space-y-2.5 mb-5">
        {[
          "Monday API token (אישי, ממשתמש עם הרשאת צפייה בלוח התקציב)",
          "מזהה הלוח (Board ID) של התקציב",
        ].map((t) => (
          <li key={t} className="flex items-start gap-2 font-ploni" style={{ color: C.text }}>
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.goldLight }} />
            {t}
          </li>
        ))}
      </ul>
      <div
        className="rounded-xl p-4 font-ploni text-sm leading-relaxed"
        style={{ background: "#fff", border: `1px solid ${C.goldShimmer}`, color: C.textMuted }}
      >
        מטעמי אבטחה ה-token לא נשמר בצד-הלקוח אלא ב-edge-function ייעודי
        (<code style={{ background: C.parchment, padding: "1px 6px", borderRadius: 4 }}>monday-budget</code>).
        ברגע שהפרטים יוגדרו, המסך הזה יתחלף בנתונים החיים — אין צורך לשנות קוד.
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ElementType; accent: string }) {
  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-2"
      style={{
        background: C.parchment, borderColor: C.goldShimmer,
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

export default function Budget() {
  const { configured, data, isLoading, error } = useMondayBudget();

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12" dir="rtl">
        <div>
          <h1 className="text-3xl font-kedem font-bold" style={{ color: C.navy }}>מעקב תקציב</h1>
          <p className="font-ploni mt-1" style={{ color: C.textMuted }}>
            תקציב בני ציון מתוך לוח ה-Monday
          </p>
        </div>

        {!configured ? (
          <SetupScreen />
        ) : isLoading ? (
          <div className="flex items-center gap-3 py-16 justify-center" style={{ color: C.textMuted }}>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            <span className="font-ploni">טוען נתוני תקציב…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-xl p-4 font-ploni" style={{ background: "#fee2e2", color: C.red }}>
            <AlertCircle className="w-5 h-5" aria-hidden />
            שגיאה בטעינת התקציב: {(error as Error).message}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Kpi label="תקציב מאושר" value={shekel(data!.totalBudgeted)} icon={Wallet} accent={C.navy} />
              <Kpi label="נוצל" value={shekel(data!.totalSpent)} icon={TrendingDown} accent={C.gold} />
              <Kpi
                label="יתרה"
                value={shekel(data!.totalBudgeted - data!.totalSpent)}
                icon={TrendingUp}
                accent={data!.totalBudgeted - data!.totalSpent >= 0 ? C.green : C.red}
              />
            </div>

            <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-kedem" style={{ color: C.navy }}>סעיפי תקציב</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" dir="rtl">
                    <thead>
                      <tr style={{ color: C.textMuted, borderBottom: `1px solid ${C.goldShimmer}` }}>
                        <th className="text-right py-2 px-3 font-ploni font-bold">סעיף</th>
                        <th className="text-right py-2 px-3 font-ploni font-bold">מתוקצב</th>
                        <th className="text-right py-2 px-3 font-ploni font-bold">נוצל</th>
                        <th className="text-right py-2 px-3 font-ploni font-bold">יתרה</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data!.lines.map((l) => (
                        <tr key={l.id} style={{ borderBottom: `1px solid ${C.goldShimmer}66` }}>
                          <td className="py-2.5 px-3 font-ploni font-medium" style={{ color: C.text }}>{l.name}</td>
                          <td className="py-2.5 px-3 font-ploni" style={{ color: C.textMuted }}>{shekel(l.budgeted)}</td>
                          <td className="py-2.5 px-3 font-ploni" style={{ color: C.textMuted }}>{shekel(l.spent)}</td>
                          <td className="py-2.5 px-3 font-ploni font-bold" style={{ color: l.budgeted - l.spent >= 0 ? C.green : C.red }}>
                            {shekel(l.budgeted - l.spent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
