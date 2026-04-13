import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Heart, History, BookOpen, Bell, ChevronLeft, Pencil, Check, X, Camera, Loader2, Users, Star } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import LessonDialog from "@/components/lesson/LessonDialog";
import CommunityBadge from "@/components/community/CommunityBadge";
import JoinCommunityDialog from "@/components/community/JoinCommunityDialog";
import LearningStatsCard from "@/components/community/LearningStatsCard";
import { useMembership } from "@/hooks/useMembership";
import LoyaltyDashboard from "@/components/community/LoyaltyDashboard";
import StreakDisplay from "@/components/gamification/StreakDisplay";
import WeeklyChallenges from "@/components/gamification/WeeklyChallenges";
import Leaderboard from "@/components/gamification/Leaderboard";

const Profile = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  const { membership, isMember } = useMembership();

  // Favorites
  const { data: favorites } = useQuery({
    queryKey: ["user-favorites", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_favorites")
        .select("lesson_id, created_at, lessons(id, title, rabbi_id, source_type, rabbis(name))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  // History
  const { data: history } = useQuery({
    queryKey: ["user-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_history")
        .select("lesson_id, watched_at, completed, lessons(id, title, rabbi_id, source_type, rabbis(name))")
        .eq("user_id", user!.id)
        .order("watched_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Enrollments
  const { data: enrollments } = useQuery({
    queryKey: ["user-enrollments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_enrollments")
        .select("*, series(id, title, image_url, lesson_count)")
        .eq("user_id", user!.id)
        .order("enrolled_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  // Notifications
  const { data: notifications } = useQuery({
    queryKey: ["user-notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Profile
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (fullName: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setEditingName(false);
      toast({ title: "הפרופיל עודכן בהצלחה" });
    },
  });

  const markNotificationRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("user_notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-notifications"] }),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);
      if (updateErr) throw updateErr;

      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast({ title: "התמונה עודכנה בהצלחה" });
    } catch (err: any) {
      toast({ title: "שגיאה בהעלאת תמונה", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (authLoading) return <Layout><div className="container py-20 text-center text-muted-foreground">טוען...</div></Layout>;
  if (!user) return <Navigate to="/" replace />;

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0];
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;

  return (
    <Layout>
      {/* Profile Header */}
      <section className="relative overflow-hidden py-10 md:py-14">
        <div className="absolute inset-0">
          <img src="/images/hero-biblical-landscape.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        </div>
        <div className="container relative z-10 flex items-center gap-6">
          {/* Avatar with upload */}
          <div className="relative group">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-20 w-20 rounded-2xl object-cover border-2 border-white/20" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-heading text-white">
                {displayName?.charAt(0)}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              {uploadingAvatar ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }}
            />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="h-9 w-48 bg-white/10 border-white/20 text-white"
                    autoFocus
                  />
                  <button onClick={() => updateProfile.mutate(newName)} className="text-white/80 hover:text-white"><Check className="h-5 w-5" /></button>
                  <button onClick={() => setEditingName(false)} className="text-white/60 hover:text-white"><X className="h-5 w-5" /></button>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl md:text-3xl font-heading text-white">{displayName}</h1>
                  <button onClick={() => { setNewName(displayName ?? ""); setEditingName(true); }} className="text-white/50 hover:text-white">
                    <Pencil className="h-4 w-4" />
                  </button>
                </>
              )}
              {/* Community Badge */}
              {isMember && membership && (
                <CommunityBadge
                  tier={membership.membership_tier}
                  label={membership.badge_label}
                  size="md"
                />
              )}
            </div>
            <p className="text-white/60 text-sm">{user.email}</p>
            {!isMember && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 gap-1.5 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                onClick={() => setJoinDialogOpen(true)}
              >
                <Users className="h-3.5 w-3.5" />
                הצטרפו לקהילה
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Streak & Gamification */}
      <section className="py-6">
        <div className="container space-y-4">
          <StreakDisplay />
          <LearningStatsCard />
          <WeeklyChallenges />
          <Leaderboard />
        </div>
      </section>

      {/* Tabs */}
      <section className="py-4 pb-8">
        <div className="container">
          <Tabs defaultValue="loyalty" dir="rtl">
            <TabsList className="mb-6 w-full justify-start bg-muted/50 overflow-x-auto">
              <TabsTrigger value="loyalty" className="gap-2"><Star className="h-4 w-4" />מועדון נאמנות</TabsTrigger>
              <TabsTrigger value="courses" className="gap-2"><BookOpen className="h-4 w-4" />הקורסים שלי</TabsTrigger>
              <TabsTrigger value="favorites" className="gap-2"><Heart className="h-4 w-4" />מועדפים</TabsTrigger>
              <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" />היסטוריה</TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2 relative">
                <Bell className="h-4 w-4" />
                התראות
                {unreadCount > 0 && <span className="absolute -top-1 -left-1 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>}
              </TabsTrigger>
            </TabsList>

            {/* Loyalty */}
            <TabsContent value="loyalty">
              <LoyaltyDashboard />
            </TabsContent>

            {/* Courses */}
            <TabsContent value="courses">
              {enrollments && enrollments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enrollments.map((e: any, i: number) => {
                    const progress = e.series?.lesson_count ? Math.round((e.completed_lessons / e.series.lesson_count) * 100) : 0;
                    return (
                      <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <Link to={`/series/${e.series_id}`} className="glass-card-light rounded-2xl p-5 block hover:shadow-lg transition-all group">
                          <h3 className="font-display text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                            {e.series?.title}
                          </h3>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                            <span>{e.completed_lessons} / {e.series?.lesson_count ?? 0} שיעורים</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          {e.completed && <span className="text-xs text-accent-foreground mt-2 block">✓ הושלם</span>}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 text-border" />
                  <p>עדיין לא נרשמת לקורסים</p>
                  <Link to="/series" className="text-primary text-sm mt-2 inline-block">עיין בסדרות השיעורים ←</Link>
                </div>
              )}
            </TabsContent>

            {/* Favorites */}
            <TabsContent value="favorites">
              {favorites && favorites.length > 0 ? (
                <div className="space-y-2">
                  {favorites.map((f: any) => (
                    <button
                      key={f.lesson_id}
                      onClick={() => setSelectedLessonId(f.lesson_id)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-md transition-all group text-right"
                    >
                      <Heart className="h-4 w-4 text-destructive shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary truncate">{(f as any).lessons?.title}</p>
                        <p className="text-xs text-muted-foreground">{(f as any).lessons?.rabbis?.name}</p>
                      </div>
                      <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Heart className="h-12 w-12 mx-auto mb-3 text-border" />
                  <p>אין שיעורים שמורים עדיין</p>
                </div>
              )}
            </TabsContent>

            {/* History */}
            <TabsContent value="history">
              {history && history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((h: any) => (
                    <button
                      key={h.lesson_id + h.watched_at}
                      onClick={() => setSelectedLessonId(h.lesson_id)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-md transition-all group text-right"
                    >
                      <History className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary truncate">{(h as any).lessons?.title}</p>
                        <p className="text-xs text-muted-foreground">{(h as any).lessons?.rabbis?.name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(h.watched_at).toLocaleDateString("he-IL")}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 text-border" />
                  <p>אין היסטוריית צפייה עדיין</p>
                </div>
              )}
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications">
              {notifications && notifications.length > 0 ? (
                <div className="space-y-2">
                  {notifications.map((n: any) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-all ${
                        n.read ? "bg-card border-border" : "bg-accent/5 border-accent/20"
                      }`}
                    >
                      <Bell className={`h-4 w-4 mt-0.5 shrink-0 ${n.read ? "text-muted-foreground" : "text-accent-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${n.read ? "text-muted-foreground" : "font-medium text-foreground"}`}>{n.title}</p>
                        {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString("he-IL")}</p>
                      </div>
                      {!n.read && (
                        <button onClick={() => markNotificationRead.mutate(n.id)} className="text-xs text-primary hover:text-primary/80 shrink-0">
                          סמן כנקרא
                        </button>
                      )}
                      {n.link && (
                        <Link to={n.link} className="text-xs text-primary shrink-0">
                          <ChevronLeft className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-border" />
                  <p>אין התראות</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {selectedLessonId && (
        <LessonDialog lessonId={selectedLessonId} open={!!selectedLessonId} onOpenChange={open => !open && setSelectedLessonId(null)} />
      )}

      <JoinCommunityDialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen} />
    </Layout>
  );
};

export default Profile;
