import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, TrendingUp, Users, BookOpen, Clock, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function Analytics() {
  const { data: topLessons } = useQuery({
    queryKey: ["analytics-top-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, views_count, rabbis(name)")
        .order("views_count", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["analytics-stats"],
    queryFn: async () => {
      const [lessons, rabbis, series, users, history, favorites] = await Promise.all([
        supabase.from("lessons").select("*", { count: "exact", head: true }),
        supabase.from("rabbis").select("*", { count: "exact", head: true }),
        supabase.from("series").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_history").select("*", { count: "exact", head: true }),
        supabase.from("user_favorites").select("*", { count: "exact", head: true }),
      ]);
      // Total views
      const { data: viewsData } = await supabase.from("lessons").select("views_count");
      const totalViews = viewsData?.reduce((s, l) => s + (l.views_count || 0), 0) ?? 0;

      return {
        lessons: lessons.count ?? 0,
        rabbis: rabbis.count ?? 0,
        series: series.count ?? 0,
        users: users.count ?? 0,
        totalViews,
        historyEntries: history.count ?? 0,
        favorites: favorites.count ?? 0,
      };
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

  const { data: recentHistory } = useQuery({
    queryKey: ["analytics-recent-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_history")
        .select("watched_at")
        .order("watched_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      // Group by date
      const groups: Record<string, number> = {};
      data?.forEach((h) => {
        const day = new Date(h.watched_at).toLocaleDateString("he-IL", { month: "short", day: "numeric" });
        groups[day] = (groups[day] || 0) + 1;
      });
      return Object.entries(groups)
        .slice(0, 14)
        .reverse()
        .map(([date, count]) => ({ date, count }));
    },
  });

  const statCards = [
    { title: "סה״כ צפיות", value: stats?.totalViews ?? 0, icon: Eye, color: "text-primary" },
    { title: "משתמשים", value: stats?.users ?? 0, icon: Users, color: "text-accent" },
    { title: "שיעורים", value: stats?.lessons ?? 0, icon: BookOpen, color: "text-primary" },
    { title: "היסטוריית צפייה", value: stats?.historyEntries ?? 0, icon: Clock, color: "text-accent" },
    { title: "מועדפים", value: stats?.favorites ?? 0, icon: Star, color: "text-primary" },
    { title: "סדרות", value: stats?.series ?? 0, icon: TrendingUp, color: "text-accent" },
  ];

  const chartData = topLessons?.map((l) => ({
    name: l.title.length > 25 ? l.title.slice(0, 25) + "…" : l.title,
    views: l.views_count,
  })) ?? [];

  const pieData = topRabbis?.map((r) => ({
    name: r.name,
    value: r.lesson_count,
  })) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-heading gradient-teal">אנליטיקס</h1>
          <p className="text-muted-foreground mt-1">סטטיסטיקות שימוש ומגמות באתר</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card, i) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <card.icon className={`h-6 w-6 mx-auto mb-2 ${card.color}`} />
                  <p className="text-2xl font-heading">{card.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading">פעילות צפייה (14 ימים אחרונים)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recentHistory ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="צפיות" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Rabbis Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading">רבנים מובילים (לפי מספר שיעורים)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Lessons Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">10 השיעורים הנצפים ביותר</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-right py-2 px-3">#</th>
                    <th className="text-right py-2 px-3">שיעור</th>
                    <th className="text-right py-2 px-3">רב</th>
                    <th className="text-right py-2 px-3">צפיות</th>
                  </tr>
                </thead>
                <tbody>
                  {topLessons?.map((l, i) => (
                    <tr key={l.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-muted-foreground">{i + 1}</td>
                      <td className="py-2.5 px-3 font-medium">{l.title}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{(l.rabbis as any)?.name ?? "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-semibold">
                          <Eye className="h-3 w-3" />
                          {l.views_count.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Bar chart - Top lessons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">גרף צפיות לפי שיעור</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Bar dataKey="views" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} name="צפיות" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
