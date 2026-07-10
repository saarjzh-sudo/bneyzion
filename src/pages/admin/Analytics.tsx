/**
 * Admin Analytics — /admin/analytics
 *
 * 10.7.2026 (איחוד דשבורדים, הוראת סער): העמוד מתמקד אך ורק בניתוח
 * תוכן ומעורבות — שיעורים/סדרות/רבנים פופולריים, צפיות, מועדפים והיסטוריה.
 * מדדי מנויים, נטישה והכנסות עברו לדשבורד הראשי (/admin) ואינם כאן.
 * כל מדד נושא תגית מקור. שפת-העיצוב: gold/parchment/navy · RTL · CSS-only.
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SourceBadge } from "@/components/admin/SourceBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Eye, TrendingUp, Users, BookOpen, Star, BarChart3, ChevronLeft,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

/* ─── color tokens (mirror Dashboard.tsx) ──────────────────────── */
const C = {
  navy:        "#1A2744",
  gold:        "#8B6F47",
  goldLight:   "#C4A265",
  goldShimmer: "#E8D5A0",
  parchment:   "#FAF6F0",
  parchmentDk: "#F5F0E8",
  text:        "#2D1F0E",
  textMuted:   "#6B5C4A",
  textSubtle:  "#A69882",
  green:       "#059669",
  red:         "#b91c1c",
  amber:       "#D97706",
};

const PIE_COLORS = [C.goldLight, C.navy, C.green, C.gold, C.amber];
const DAY = 86400000;

/* ─── KPI card ─────────────────────────────────────────────────── */
interface KpiProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  bg?: string;
  source?: string;
}
function KpiCard({ title, value, sub, icon: Icon, accent, bg = C.parchment, source }: KpiProps) {
  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-2"
      style={{
        background: bg,
        borderColor: C.goldShimmer,
        borderInlineStartWidth: "4px",
        borderInlineStartColor: accent,
        borderInlineStartStyle: "solid",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-ploni" style={{ color: C.textMuted }}>{title}</p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: accent + "18" }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color: accent }} aria-hidden />
        </div>
      </div>
      <p className="text-3xl font-kedem font-bold" style={{ color: C.text }}>{value}</p>
      {sub && <p className="text-xs font-ploni" style={{ color: C.textSubtle }}>{sub}</p>}
      {source && <SourceBadge source={source} />}
    </div>
  );
}

export default function Analytics() {
  /* ── content-engagement stats (מדדי מנויים/הכנסות — בדשבורד הראשי) ── */
  const { data: stats, isLoading } = useQuery({
    queryKey: ["analytics-kpis-v3-content"],
    queryFn: async () => {
      const [lessons, rabbis, series, users, history, favorites, viewsData] =
        await Promise.all([
          supabase.from("lessons").select("*", { count: "exact", head: true }),
          supabase.from("rabbis").select("*", { count: "exact", head: true }),
          supabase.from("series").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("user_history").select("*", { count: "exact", head: true }),
          supabase.from("user_favorites").select("*", { count: "exact", head: true }),
          // רק שיעורים עם צפיות בפועל — אחרת נשלפים 23K שיעורים ונחתכים ב-1000
          // (סכום-צפיות שגוי כשמעקב-הצפיות יצטבר). היום 0 שורות; יגדל לאט.
          supabase.from("lessons").select("views_count").gt("views_count", 0).limit(1000),
        ]);

      const totalViews = (viewsData.data ?? []).reduce((s, l: any) => s + (l.views_count || 0), 0);

      return {
        lessons: lessons.count ?? 0,
        rabbis: rabbis.count ?? 0,
        series: series.count ?? 0,
        users: users.count ?? 0,
        historyEntries: history.count ?? 0,
        favorites: favorites.count ?? 0,
        totalViews,
      };
    },
  });

  /* ── 14-day viewing activity ─────────────────────────────────── */
  const { data: recentHistory } = useQuery({
    queryKey: ["analytics-recent-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_history")
        .select("watched_at")
        .order("watched_at", { ascending: false })
        .limit(800);
      if (error) throw error;

      const groups: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const key = new Date(Date.now() - i * DAY).toLocaleDateString("he-IL", { month: "short", day: "numeric" });
        groups[key] = 0;
      }
      (data ?? []).forEach((h) => {
        const day = new Date(h.watched_at).toLocaleDateString("he-IL", { month: "short", day: "numeric" });
        if (day in groups) groups[day] += 1;
      });
      return Object.entries(groups).map(([date, count]) => ({ date, count }));
    },
  });

  /* ── top lessons + top rabbis ────────────────────────────────── */
  const { data: topLessons } = useQuery({
    queryKey: ["analytics-top-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, views_count, rabbis!lessons_rabbi_id_fkey(name)")
        .order("views_count", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: topRabbis } = useQuery({
    queryKey: ["analytics-top-rabbis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rabbis")
        .select("id, name, lesson_count")
        .order("lesson_count", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const fmt = (n: number) => (n ?? 0).toLocaleString();
  const dash = isLoading ? "…" : undefined;

  const contentKpis: KpiProps[] = [
    { title: "סך צפיות", value: dash ?? fmt(stats?.totalViews ?? 0), icon: Eye, accent: C.navy, source: "Supabase" },
    { title: "משתמשים רשומים", value: dash ?? fmt(stats?.users ?? 0), icon: Users, accent: C.gold, source: "Supabase" },
    { title: "שיעורים", value: dash ?? fmt(stats?.lessons ?? 0), icon: BookOpen, accent: C.navy, source: "Supabase" },
    { title: "סדרות", value: dash ?? fmt(stats?.series ?? 0), icon: TrendingUp, accent: C.goldLight, source: "Supabase" },
    { title: "צפיות בהיסטוריה", value: dash ?? fmt(stats?.historyEntries ?? 0), icon: BarChart3, accent: C.gold, source: "Supabase" },
    { title: "מועדפים", value: dash ?? fmt(stats?.favorites ?? 0), icon: Star, accent: C.amber, source: "Supabase" },
  ];

  const lessonsChart = (topLessons ?? []).map((l: any) => ({
    name: l.title.length > 24 ? l.title.slice(0, 24) + "…" : l.title,
    views: l.views_count,
  }));
  const pieData = (topRabbis ?? []).map((r: any) => ({ name: r.name, value: r.lesson_count }));

  const tooltipStyle = {
    borderRadius: 12,
    border: `1px solid ${C.goldShimmer}`,
    background: C.parchment,
    color: C.navy,
    direction: "rtl" as const,
    fontFamily: "Ploni",
  };

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12" dir="rtl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-kedem font-bold" style={{ color: C.navy }}>אנליטיקס — תוכן ומעורבות</h1>
            <p className="font-ploni mt-1" style={{ color: C.textMuted }}>
              מה נצפה, מה אהוב ומי מוביל — נתונים חיים <SourceBadge source="Supabase" />
            </p>
          </div>
          <Link
            to="/admin"
            className="flex items-center gap-1.5 text-sm font-ploni rounded-xl border px-4 py-2 transition-colors hover:bg-amber-50/60"
            style={{ borderColor: C.goldShimmer, color: C.gold }}
          >
            מדדי מנויים והכנסות — בדשבורד הראשי
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        {/* Content-engagement KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {contentKpis.map((k) => <KpiCard key={k.title} {...k} />)}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg font-kedem flex items-center gap-2" style={{ color: C.navy }}>
                  <BarChart3 className="w-5 h-5" style={{ color: C.goldLight }} aria-hidden />
                  פעילות צפייה — 14 ימים אחרונים
                </CardTitle>
                <SourceBadge source="Supabase" note="היסטוריית צפייה" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recentHistory ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.goldShimmer} opacity={0.5} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: C.textMuted, fontSize: 11, fontFamily: "Ploni" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: C.textMuted, fontSize: 11, fontFamily: "Ploni" }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill={C.goldLight} radius={[4, 4, 0, 0]} name="צפיות" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg font-kedem flex items-center gap-2" style={{ color: C.navy }}>
                  <Users className="w-5 h-5" style={{ color: C.goldLight }} aria-hidden />
                  רבנים מובילים (לפי מספר שיעורים)
                </CardTitle>
                <SourceBadge source="Supabase" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82}
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      style={{ fontFamily: "Ploni", fontSize: 11 }}
                    >
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top lessons table */}
        <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg font-kedem" style={{ color: C.navy }}>
                10 השיעורים הנצפים ביותר
              </CardTitle>
              <SourceBadge source="Supabase" note="views_count" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr style={{ color: C.textMuted, borderBottom: `1px solid ${C.goldShimmer}` }}>
                    <th className="text-right py-2 px-3 font-ploni font-bold">#</th>
                    <th className="text-right py-2 px-3 font-ploni font-bold">שיעור</th>
                    <th className="text-right py-2 px-3 font-ploni font-bold">רב</th>
                    <th className="text-right py-2 px-3 font-ploni font-bold">צפיות</th>
                  </tr>
                </thead>
                <tbody>
                  {(topLessons ?? []).map((l: any, i: number) => (
                    <tr key={l.id} className="transition-colors hover:bg-amber-50/60" style={{ borderBottom: `1px solid ${C.goldShimmer}66` }}>
                      <td className="py-2.5 px-3 font-medium" style={{ color: C.textSubtle }}>{i + 1}</td>
                      <td className="py-2.5 px-3 font-ploni font-medium" style={{ color: C.text }}>{l.title}</td>
                      <td className="py-2.5 px-3 font-ploni" style={{ color: C.textMuted }}>{l.rabbis?.name ?? "—"}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: C.gold + "18", color: C.gold }}
                        >
                          <Eye className="h-3 w-3" aria-hidden />
                          {(l.views_count ?? 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top lessons bar */}
        <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg font-kedem" style={{ color: C.navy }}>
                גרף צפיות לפי שיעור
              </CardTitle>
              <SourceBadge source="Supabase" note="views_count" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lessonsChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.goldShimmer} opacity={0.5} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: C.textMuted, fontSize: 11, fontFamily: "Ploni" }} />
                  <YAxis dataKey="name" type="category" width={170} axisLine={false} tickLine={false} tick={{ fill: C.textMuted, fontSize: 11, fontFamily: "Ploni" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="views" fill={C.navy} radius={[0, 4, 4, 0]} name="צפיות" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
