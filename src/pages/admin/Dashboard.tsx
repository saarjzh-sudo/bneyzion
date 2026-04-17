import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users2, ShieldAlert, Crown, Headphones, Bell, MonitorPlay, Sparkles, TrendingUp, BarChart3, Database, MessageSquare, AlertTriangle, Hammer, DownloadCloud, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "data-ops" | "gamification">("overview");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["mega-dashboard"],
    queryFn: async () => {
      const [lessons, drafts, rabbis, series, members, orders, activity, topRabbis] = await Promise.all([
        supabase.from("lessons").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("lessons").select("*", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("rabbis").select("*", { count: "exact", head: true }),
        supabase.from("series").select("*", { count: "exact", head: true }),
        supabase.from("community_members").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("orders").select("total, created_at").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from("user_daily_activity").select("activity_date, lessons_completed").gte("activity_date", new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0]),
        supabase.from("rabbis").select("id, name, lesson_count, image_url").order("lesson_count", { ascending: false }).limit(4),
      ]);

      const monthlyRevenue = (orders.data ?? []).reduce((sum, o: any) => sum + (Number(o.total) || 0), 0);
      
      const chartMap = new Map<string, number>();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
        chartMap.set(d, 0);
      }
      (activity.data ?? []).forEach((a: any) => {
        chartMap.set(a.activity_date, (chartMap.get(a.activity_date) || 0) + (a.lessons_completed || 0));
      });
      const chartData = Array.from(chartMap.entries()).map(([date, val]) => ({ date: date.slice(5), שיעורים: val }));

      return {
        lessons: lessons.count ?? 0,
        drafts: drafts.count ?? 0,
        rabbis: rabbis.count ?? 0,
        series: series.count ?? 0,
        activeMembers: members.count ?? 0,
        monthlyRevenue,
        chartData,
        topRabbis: topRabbis.data ?? [],
      };
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin text-[#C4A265]">
            <Database size={48} />
          </div>
        </div>
      </AdminLayout>
    );
  }

  const kpis = [
    { title: "שיעורים באוויר", value: stats?.lessons ?? 0, icon: BookOpen, gradient: "from-[#1A2744] to-[#0D1526]" },
    { title: "משתמשים פעילים", value: stats?.activeMembers ?? 0, icon: Users2, gradient: "from-[#4A5A2E] to-[#2D3A1B]" },
    { title: "טיוטות להשלמה", value: stats?.drafts ?? 0, icon: ShieldAlert, gradient: "from-[#8B6F47] to-[#5C482E]" },
    { title: "הכנסות חודשיות", value: `₪${(stats?.monthlyRevenue ?? 0).toLocaleString()}`, icon: TrendingUp, gradient: "from-[#C4A265] to-[#A38145]" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12" dir="rtl">
        
        {/* Header Section */}
        <div className="relative bg-[#1A2744] rounded-3xl p-8 overflow-hidden shadow-2xl border border-[#C4A265]/30">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C4A265]/10 to-transparent translate-x-[-100%] animate-[shimmer_3s_infinite]" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-kedem font-bold text-white mb-2">מגה דשבורד</h1>
              <p className="text-[#E8D5A0] font-ploni text-lg">מרכז השליטה האסטרטגי של בני ציון</p>
            </div>
            <div className="flex bg-[#0A1224]/50 p-1.5 rounded-full border border-[#C4A265]/20 backdrop-blur-md">
              <button onClick={() => setActiveTab("overview")} className={`px-5 py-2 rounded-full font-ploni font-bold text-sm transition-all ${activeTab === "overview" ? "bg-[#C4A265] text-[#1A2744] shadow-lg" : "text-[#FAF6F0] hover:bg-white/10"}`}>מבט על</button>
              <button onClick={() => setActiveTab("data-ops")} className={`px-5 py-2 rounded-full font-ploni font-bold text-sm transition-all ${activeTab === "data-ops" ? "bg-[#C4A265] text-[#1A2744] shadow-lg" : "text-[#FAF6F0] hover:bg-white/10"}`}>פעולות Data</button>
              <button onClick={() => setActiveTab("gamification")} className={`px-5 py-2 rounded-full font-ploni font-bold text-sm transition-all ${activeTab === "gamification" ? "bg-[#C4A265] text-[#1A2744] shadow-lg" : "text-[#FAF6F0] hover:bg-white/10"}`}>גיימיפיקציה</button>
            </div>
          </div>
        </div>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((card) => (
                <div key={card.title} className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-6 text-white shadow-xl transform transition-all hover:-translate-y-1 hover:shadow-2xl`}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-ploni text-white/80 font-medium">{card.title}</h3>
                    <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                      <card.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="font-kedem text-4xl font-bold">{card.value}</p>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="col-span-1 lg:col-span-2 shadow-lg border-[#E8D5A0]/30 rounded-2xl">
                <CardHeader>
                  <CardTitle className="font-kedem text-[#1A2744] text-xl flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#C4A265]" /> התקדמות למידה (14 ימים)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats?.chartData ?? []}>
                        <defs>
                          <linearGradient id="colorShiur" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#C4A265" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#C4A265" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8D5A0" opacity={0.3} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6B5C4A', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B5C4A', fontSize: 12}} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E8D5A0', backgroundColor: '#FAF6F0', color: '#1A2744' }} />
                        <Area type="monotone" dataKey="שיעורים" stroke="#C4A265" strokeWidth={3} fillOpacity={1} fill="url(#colorShiur)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Rabbis Stand */}
              <Card className="col-span-1 shadow-lg border-[#E8D5A0]/30 rounded-2xl">
                <CardHeader>
                  <CardTitle className="font-kedem text-[#1A2744] text-xl flex items-center gap-2">
                    <Crown className="w-5 h-5 text-[#C4A265]" /> רבנים מובילים
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {(stats?.topRabbis ?? []).map((rabbi: any, i: number) => (
                    <div key={rabbi.id} className="flex items-center gap-4 bg-[#FAF6F0] p-3 rounded-xl border border-[#E8D5A0]/50 hover:bg-white transition-colors">
                      <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-full ${i === 0 ? 'bg-[#C4A265] text-white' : 'bg-[#E8D5A0]/30 text-[#6B5C4A]'}`}>
                        {i + 1}
                      </div>
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-[#C4A265]">
                        {rabbi.image_url ? (
                          <img src={rabbi.image_url} alt={rabbi.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#1A2744] flex items-center justify-center text-white font-bold text-xs">{rabbi.name?.charAt(0)}</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-ploni font-bold text-[#1A2744] text-sm">{rabbi.name}</p>
                        <p className="font-ploni text-xs text-[#6B5C4A]">{rabbi.lesson_count} שיעורים באוויר</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* --- DATA OPS TAB --- */}
        {activeTab === "data-ops" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="font-kedem text-2xl text-[#1A2744] mb-4 flex items-center gap-2">
              <Database className="w-6 h-6 text-[#C4A265]" /> מרכז בקרת נתונים ומיגרציה
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <Card className="border-[#E8D5A0] shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                <CardHeader>
                  <CardTitle className="font-kedem text-xl text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> התראת שיעורים חסרים ({stats?.drafts})
                  </CardTitle>
                  <CardDescription className="text-base font-ploni">
                    זיהינו {stats?.drafts} שיעורים הנמצאים בסטטוס "טיוטה" מאחר ולא הומרו הקישורים לוידאו/אודיו מהמערכת הישנה.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 mt-4">
                    <Button className="bg-[#1A2744] hover:bg-[#0A1224] font-ploni flex items-center gap-2">
                      <DownloadCloud className="w-4 h-4" /> הרץ Scraping מקומי
                    </Button>
                    <Link to="/admin/lessons?status=draft">
                      <Button variant="outline" className="border-[#1A2744] text-[#1A2744] font-ploni flex items-center gap-2">
                        <Eye className="w-4 h-4" /> צפה ברשימה
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#E8D5A0] shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                <CardHeader>
                  <CardTitle className="font-kedem text-xl text-emerald-800 flex items-center gap-2">
                    <Hammer className="w-5 h-5" /> כלי בניית מערכת
                  </CardTitle>
                  <CardDescription className="text-base font-ploni">
                    הפעלת כלים טכניים ותיקונים בלחיצת כפתור ללא צורך ב-Terminal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start font-ploni text-[#1A2744] border-[#E8D5A0] hover:bg-[#FAF6F0]">
                    <MonitorPlay className="w-4 h-4 ml-2 text-[#C4A265]" /> מפיק Thumbnails AI (Imagen 4)
                  </Button>
                  <Button variant="outline" className="w-full justify-start font-ploni text-[#1A2744] border-[#E8D5A0] hover:bg-[#FAF6F0]">
                    <Sparkles className="w-4 h-4 ml-2 text-[#C4A265]" /> נקה קישורים שבורים (Umbraco Clean)
                  </Button>
                </CardContent>
              </Card>

            </div>
          </div>
        )}

        {/* --- GAMIFICATION TAB --- */}
        {activeTab === "gamification" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="bg-[#FAF6F0] border-2 border-[#C4A265] rounded-3xl p-10 text-center shadow-lg">
                <Crown className="w-16 h-16 text-[#C4A265] mx-auto mb-4" />
                <h2 className="font-kedem text-3xl text-[#1A2744] mb-3">דשבורד גיימיפיקציה - בקרוב</h2>
                <p className="font-ploni text-[#6B5C4A] max-w-lg mx-auto text-lg leading-relaxed">
                  המסך הזה יכלול את אלופי התורה שלנו, שליטה ידנית על Points למשתמשים, הצגת Streak Leaderboards ומעקב מלא אחרי רמת המעורבות של הקהילה. 
                </p>
                <Button className="mt-8 bg-[#1A2744] hover:bg-[#0D1526] text-white px-8 py-6 rounded-xl font-bold font-ploni text-lg shadow-[0_10px_20px_rgba(26,39,68,0.2)]">
                  אשר בניית מודול גיימיפיקציה
                </Button>
             </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
