/**
 * Admin Dashboard — /admin
 *
 * תמונת מצב ברורה במבט אחד למנהל לא-טכנולוגי.
 * 10.7.2026 (סער): איחוד דשבורדים — סקשן ה-Monday (לשעבר /admin/budget) מוטמע
 * כאן, וכל מדד נושא תגית מקור ("מקור: Monday / Supabase / Grow").
 * KPI cards גדולים ולחיצים → quick-action links.
 * Gold/parchment/navy — בדיוק כמו Payments.tsx ו-Subscribers.tsx.
 * RTL מלא. CSS-only micro-interactions. ללא framer-motion.
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useMondayInsights } from "@/hooks/useMondayInsights";
import { MondayInsightsSection } from "@/components/admin/MondayInsightsSection";
import { SourceBadge } from "@/components/admin/SourceBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen, Users2, Clock, TrendingUp, Crown,
  ChevronLeft, Upload, UserCheck, BarChart3, Database,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

/* ─── color tokens (mirrors Payments.tsx) ──────────────────────── */
const C = {
  navy:        "#1A2744",
  navyMid:     "#243158",
  gold:        "#8B6F47",
  goldLight:   "#C4A265",
  goldShimmer: "#E8D5A0",
  parchment:   "#FAF6F0",
  parchmentDk: "#F5F0E8",
  text:        "#2D1F0E",
  textMuted:   "#6B5C4A",
  textSubtle:  "#A69882",
  green:       "#15803d",
  greenBg:     "#dcfce7",
  amber:       "#92400e",
  amberBg:     "#fef3c7",
};

/* ─── KPI card ─────────────────────────────────────────────────── */
interface KpiProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  to: string;
  accent: string;    // left-border + icon color
  bg: string;        // card bg
  /** תגית מקור-הנתונים — Monday / Supabase / Grow */
  source: string;
}

function KpiCard({ title, value, sub, icon: Icon, to, accent, bg, source }: KpiProps) {
  return (
    <Link to={to} className="block group">
      <div
        className="rounded-2xl border p-5 h-full flex flex-col gap-3 transition-all duration-200
                   group-hover:-translate-y-0.5 group-hover:shadow-lg cursor-pointer"
        style={{
          background: bg,
          borderColor: C.goldShimmer,
          borderInlineStartWidth: "4px",
          borderInlineStartColor: accent,
          borderInlineStartStyle: "solid",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-ploni" style={{ color: C.textMuted }}>{title}</p>
            <p className="text-3xl font-kedem font-bold mt-0.5" style={{ color: C.text }}>
              {value}
            </p>
            {sub && (
              <p className="text-xs font-ploni mt-1" style={{ color: C.textSubtle }}>{sub}</p>
            )}
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: accent + "18" }}
          >
            <Icon className="w-5 h-5" style={{ color: accent }} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 mt-auto">
          <div
            className="flex items-center gap-1 text-xs font-ploni"
            style={{ color: accent }}
          >
            <span>מעבר לניהול</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </div>
          <SourceBadge source={source} />
        </div>
      </div>
    </Link>
  );
}

/* ─── main component ────────────────────────────────────────────── */
export default function Dashboard() {
  const { data: monday } = useMondayInsights();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-v2"],
    queryFn: async () => {
      const [published, pending, rabbis, series, members, orders, activity, topRabbis] =
        await Promise.all([
          supabase.from("lessons").select("*", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("lessons").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
          supabase.from("rabbis").select("*", { count: "exact", head: true }),
          supabase.from("series").select("*", { count: "exact", head: true }),
          supabase
            .from("user_access_tags" as never)
            .select("*", { count: "exact", head: true })
            .eq("tag" as never, "program:weekly-chapter")
            // פעיל = ללא תוקף (לכל החיים) או תוקף עתידי. הסינון הקודם
            // .gt("valid_until") פספס את מנויי-לכל-החיים (valid_until=null).
            .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}` as never),
          supabase
            .from("orders")
            .select("total, created_at")
            .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
          supabase
            .from("user_daily_activity")
            .select("activity_date, lessons_completed")
            .gte("activity_date", new Date(Date.now() - 13 * 86400000).toISOString().split("T")[0]),
          supabase
            .from("rabbis")
            .select("id, name, lesson_count, image_url")
            .order("lesson_count", { ascending: false })
            .limit(4),
        ]);

      const monthlyRevenue = (orders.data ?? []).reduce(
        (s, o: any) => s + (Number(o.total) || 0),
        0,
      );

      const chartMap = new Map<string, number>();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
        chartMap.set(d, 0);
      }
      (activity.data ?? []).forEach((a: any) => {
        chartMap.set(a.activity_date, (chartMap.get(a.activity_date) || 0) + (a.lessons_completed || 0));
      });
      const chartData = Array.from(chartMap.entries()).map(([date, val]) => ({
        date: date.slice(5),
        שיעורים: val,
      }));

      return {
        published: published.count ?? 0,
        pending: pending.count ?? 0,
        rabbis: rabbis.count ?? 0,
        series: series.count ?? 0,
        subscribers: members.count ?? 0,
        monthlyRevenue,
        chartData,
        topRabbis: topRabbis.data ?? [],
      };
    },
  });

  /* ── loading skeleton ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3" style={{ color: C.goldLight }}>
            <Database size={40} className="animate-pulse" />
            <p className="font-ploni text-sm" style={{ color: C.textMuted }}>טוען נתונים…</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const kpis: KpiProps[] = [
    {
      title:  "שיעורים פעילים",
      value:  (stats?.published ?? 0).toLocaleString(),
      sub:    `${stats?.series ?? 0} סדרות · ${stats?.rabbis ?? 0} רבנים`,
      icon:   BookOpen,
      to:     "/admin/lessons",
      accent: C.navy,
      bg:     C.parchment,
      source: "Supabase",
    },
    {
      title:  "ממתינים לאישור",
      value:  stats?.pending ?? 0,
      sub:    stats?.pending ? "דורש טיפול עכשיו" : "הכול מאושר",
      icon:   Clock,
      to:     "/admin/lessons?tab=pending_review",
      accent: stats?.pending ? "#D97706" : C.gold,
      bg:     stats?.pending ? C.amberBg : C.parchment,
      source: "Supabase",
    },
    {
      // 8.7.2026 (סער): המספר הרשמי = לוח Monday של יואב. זה המקור, לא מעקב מקומי.
      title:  "מנויי פרק שבועי",
      value:  monday?.current?.active ?? "…",
      sub:    "המספר הרשמי — לוח Monday",
      icon:   UserCheck,
      to:     "/admin/subscribers",
      accent: "#059669",
      bg:     "#f0fdf4",
      source: "Monday",
    },
    {
      title:  "הכנסות החודש",
      value:  `₪${(stats?.monthlyRevenue ?? 0).toLocaleString()}`,
      sub:    "30 הימים האחרונים · הזמנות באתר",
      icon:   TrendingUp,
      to:     "/admin/payments",
      accent: C.gold,
      bg:     C.parchment,
      source: "Grow",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12" dir="rtl">

        {/* ─── Page header ──────────────────────────────────────── */}
        <div
          className="rounded-3xl p-7 border overflow-hidden relative"
          style={{ background: C.navy, borderColor: C.goldLight + "40" }}
        >
          {/* subtle shimmer line */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `linear-gradient(135deg, transparent 40%, ${C.goldShimmer} 60%, transparent 80%)`,
            }}
          />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1
                className="text-3xl font-kedem font-bold"
                style={{ color: C.goldShimmer }}
              >
                שלום, יואב
              </h1>
              <p className="font-ploni mt-1" style={{ color: C.goldLight + "cc" }}>
                כאן תמצא את כל מה שקורה באתר במבט אחד
              </p>
            </div>
            <Link
              to="/admin/upload"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-ploni font-bold text-sm transition-all
                         hover:brightness-110 active:scale-95"
              style={{ background: C.goldLight, color: C.navy }}
            >
              <Upload className="w-4 h-4" />
              העלאת תוכן חדש
            </Link>
          </div>
        </div>

        {/* ─── KPI cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.title} {...kpi} />
          ))}
        </div>

        {/* ─── Charts + top rabbis ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Activity chart */}
          <Card
            className="col-span-1 lg:col-span-2 shadow-sm rounded-2xl border"
            style={{ borderColor: C.goldShimmer }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle
                  className="font-kedem text-xl flex items-center gap-2"
                  style={{ color: C.navy }}
                >
                  <BarChart3 className="w-5 h-5" style={{ color: C.goldLight }} />
                  למידה פעילה — 14 ימים אחרונים
                </CardTitle>
                <SourceBadge source="Supabase" note="פעילות יומית" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.chartData ?? []}>
                    <defs>
                      <linearGradient id="gradShiur" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.goldLight} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={C.goldLight} stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.goldShimmer} opacity={0.4} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: C.textMuted, fontSize: 12, fontFamily: "Ploni" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: C.textMuted, fontSize: 12, fontFamily: "Ploni" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: `1px solid ${C.goldShimmer}`,
                        background: C.parchment,
                        color: C.navy,
                        direction: "rtl",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="שיעורים"
                      stroke={C.goldLight}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#gradShiur)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top rabbis */}
          <Card
            className="col-span-1 shadow-sm rounded-2xl border"
            style={{ borderColor: C.goldShimmer }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle
                  className="font-kedem text-xl flex items-center gap-2"
                  style={{ color: C.navy }}
                >
                  <Crown className="w-5 h-5" style={{ color: C.goldLight }} />
                  רבנים מובילים
                </CardTitle>
                <SourceBadge source="Supabase" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(stats?.topRabbis ?? []).map((rabbi: any, i: number) => (
                <div
                  key={rabbi.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl transition-colors"
                  style={{ background: i === 0 ? C.parchmentDk : "transparent" }}
                >
                  <span
                    className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold shrink-0"
                    style={{
                      background: i === 0 ? C.goldLight : C.goldShimmer,
                      color:      i === 0 ? "#fff"      : C.textMuted,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div
                    className="w-9 h-9 rounded-full overflow-hidden shrink-0 border-2"
                    style={{ borderColor: C.goldShimmer }}
                  >
                    {rabbi.image_url ? (
                      <img src={rabbi.image_url} alt={rabbi.name} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ background: C.navy }}
                      >
                        {rabbi.name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-ploni font-bold text-sm truncate" style={{ color: C.text }}>
                      {rabbi.name}
                    </p>
                    <p className="font-ploni text-xs" style={{ color: C.textSubtle }}>
                      {rabbi.lesson_count} שיעורים
                    </p>
                  </div>
                </div>
              ))}
              <Link
                to="/admin/rabbis"
                className="flex items-center justify-center gap-1.5 pt-2 text-xs font-ploni transition-colors"
                style={{ color: C.goldLight }}
              >
                <span>כל הרבנים</span>
                <ChevronLeft className="w-3 h-3" />
              </Link>
            </CardContent>
          </Card>

        </div>

        {/* ─── Monday section — איחוד הדשבורדים (לשעבר /admin/budget) ── */}
        <MondayInsightsSection />

        {/* ─── Quick actions row ────────────────────────────────── */}
        <div>
          <h2 className="font-kedem text-lg mb-4" style={{ color: C.text }}>
            פעולות מהירות
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "שיעורים ממתינים", to: "/admin/lessons?tab=pending_review", icon: Clock,    color: "#D97706" },
              { label: "מנויים פעילים",   to: "/admin/subscribers",               icon: UserCheck, color: "#059669" },
              { label: "תשלומים",         to: "/admin/payments",                  icon: TrendingUp, color: C.gold  },
              { label: "העלאת תוכן",      to: "/admin/upload",                    icon: Upload,     color: C.navy  },
            ].map(({ label, to, icon: Icon, color }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: C.parchment, borderColor: C.goldShimmer }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: color + "18" }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <span className="text-xs font-ploni font-medium" style={{ color: C.text }}>
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
