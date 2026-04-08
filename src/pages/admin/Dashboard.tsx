import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users2, FolderOpen, CreditCard, Crown, Headphones, Bell, Plus, Ticket, TrendingUp, BarChart3, PieChart as PieChartIcon, Eye, MessageSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(174 60% 50%)",
  "hsl(40 80% 55%)",
  "hsl(280 50% 55%)",
];

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-v3"],
    queryFn: async () => {
      const [lessons, rabbis, series, members, orders, activity, recentOrders, topRabbis, donations, contacts] = await Promise.all([
        supabase.from("lessons").select("*", { count: "exact", head: true }),
        supabase.from("rabbis").select("*", { count: "exact", head: true }),
        supabase.from("series").select("*", { count: "exact", head: true }),
        supabase.from("community_members").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("orders").select("total, created_at").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from("user_daily_activity").select("activity_date, lessons_completed, minutes_learned").gte("activity_date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
        supabase.from("orders").select("id, order_number, customer_name, total, status, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("rabbis").select("id, name, lesson_count, image_url").order("lesson_count", { ascending: false }).limit(5),
        supabase.from("donations").select("amount, created_at").eq("payment_status", "completed").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("read", false),
      ]);

      // Monthly revenue
      const monthlyRevenue = (orders.data ?? []).reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
      const monthlyDonations = (donations.data ?? []).reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);

      // Today's lessons played
      const today = new Date().toISOString().slice(0, 10);
      const todayLessons = (activity.data ?? []).filter((a: any) => a.activity_date === today).reduce((sum: number, a: any) => sum + (a.lessons_completed || 0), 0);

      // Activity chart data (last 30 days)
      const chartMap = new Map<string, { lessons: number; minutes: number }>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        chartMap.set(d, { lessons: 0, minutes: 0 });
      }
      (activity.data ?? []).forEach((a: any) => {
        const existing = chartMap.get(a.activity_date) || { lessons: 0, minutes: 0 };
        chartMap.set(a.activity_date, {
          lessons: existing.lessons + (a.lessons_completed || 0),
          minutes: existing.minutes + (a.minutes_learned || 0),
        });
      });
      const chartData = Array.from(chartMap.entries()).map(([date, val]) => ({
        date: date.slice(5),
        שיעורים: val.lessons,
        דקות: val.minutes,
      }));

      // Revenue chart (last 30 days)
      const revenueMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        revenueMap.set(d, 0);
      }
      (orders.data ?? []).forEach((o: any) => {
        const d = o.created_at.slice(0, 10);
        revenueMap.set(d, (revenueMap.get(d) || 0) + (Number(o.total) || 0));
      });
      (donations.data ?? []).forEach((d: any) => {
        const date = d.created_at.slice(0, 10);
        revenueMap.set(date, (revenueMap.get(date) || 0) + (Number(d.amount) || 0));
      });
      const revenueData = Array.from(revenueMap.entries()).map(([date, amount]) => ({
        date: date.slice(5),
        הכנסה: amount,
      }));

      // Content breakdown
      const lessonsCount = lessons.count ?? 0;
      const seriesCount = series.count ?? 0;
      const rabbisCount = rabbis.count ?? 0;
      const contentBreakdown = [
        { name: "שיעורים", value: lessonsCount },
        { name: "סדרות", value: seriesCount },
        { name: "רבנים", value: rabbisCount },
      ];

      return {
        lessons: lessonsCount,
        rabbis: rabbisCount,
        series: seriesCount,
        activeMembers: members.count ?? 0,
        monthlyRevenue,
        monthlyDonations,
        todayLessons,
        chartData,
        revenueData,
        contentBreakdown,
        recentOrders: recentOrders.data ?? [],
        topRabbis: topRabbis.data ?? [],
        unreadMessages: contacts.count ?? 0,
      };
    },
  });

  const kpis = [
    { title: "שיעורים", value: stats?.lessons ?? 0, icon: BookOpen, color: "text-primary" },
    { title: "רבנים", value: stats?.rabbis ?? 0, icon: Users2, color: "text-accent" },
    { title: "סדרות", value: stats?.series ?? 0, icon: FolderOpen, color: "text-primary" },
    { title: "חברי קהילה", value: stats?.activeMembers ?? 0, icon: Crown, color: "text-accent" },
    { title: "הכנסה חודשית", value: `₪${(stats?.monthlyRevenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: "text-primary" },
    { title: "שיעורים היום", value: stats?.todayLessons ?? 0, icon: Headphones, color: "text-accent" },
    { title: "תרומות החודש", value: `₪${(stats?.monthlyDonations ?? 0).toLocaleString()}`, icon: CreditCard, color: "text-primary" },
    { title: "הודעות חדשות", value: stats?.unreadMessages ?? 0, icon: MessageSquare, color: "text-accent" },
  ];

  const quickActions = [
    { label: "שלח התראה", href: "/admin/notifications", icon: Bell },
    { label: "הוסף שיעור", href: "/admin/upload", icon: Plus },
    { label: "צור קופון", href: "/admin/products?tab=coupons", icon: Ticket },
  ];

  const statusLabel: Record<string, string> = {
    pending: "ממתין",
    completed: "הושלם",
    cancelled: "בוטל",
    processing: "בטיפול",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-heading gradient-teal">דשבורד ניהול</h1>
            <p className="text-muted-foreground mt-1">סקירה כללית של תוכן האתר והפעילות</p>
          </div>
          <div className="flex gap-2">
            {quickActions.map((a) => (
              <Link key={a.href} to={a.href}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <a.icon className="h-3.5 w-3.5" /> {a.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {kpis.map((card) => (
            <Card key={card.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-1 px-4 pt-4">
                <CardTitle className="text-[11px] font-display text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-xl font-heading">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-primary" /> פעילות 30 ימים אחרונים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.chartData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="שיעורים" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-accent" /> הכנסות 30 ימים אחרונים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.revenueData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <Tooltip
                      formatter={(value: number) => [`₪${value.toLocaleString()}`, "הכנסה"]}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="הכנסה" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.15)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Content Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <PieChartIcon className="h-5 w-5 text-primary" /> פילוח תוכן
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.contentBreakdown ?? []}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {(stats?.contentBreakdown ?? []).map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Rabbis */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <Users2 className="h-5 w-5 text-accent" /> רבנים מובילים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(stats?.topRabbis ?? []).map((rabbi: any, i: number) => (
                  <div key={rabbi.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                      {rabbi.image_url ? (
                        <img src={rabbi.image_url} alt={rabbi.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-primary">{rabbi.name?.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{rabbi.name}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">{rabbi.lesson_count} שיעורים</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-primary" /> הזמנות אחרונות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(stats?.recentOrders ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">אין הזמנות עדיין</p>
                ) : (
                  (stats?.recentOrders ?? []).map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{order.customer_name || order.order_number}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("he-IL")}</p>
                      </div>
                      <div className="text-left shrink-0">
                        <p className="text-sm font-semibold text-primary">₪{Number(order.total).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">{statusLabel[order.status] || order.status}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
