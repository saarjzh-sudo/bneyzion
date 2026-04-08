import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Send, Users, History, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

export default function Notifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [target, setTarget] = useState("all");

  // Recent notifications sent by admins
  const { data: recentNotifications } = useQuery({
    queryKey: ["admin-recent-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("title, body, link, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      // Deduplicate by title+created_at (same broadcast)
      const seen = new Set<string>();
      return data?.filter((n) => {
        const key = `${n.title}|${n.created_at}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 10) ?? [];
    },
  });

  const { data: userCount } = useQuery({
    queryKey: ["admin-user-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: communityCount } = useQuery({
    queryKey: ["admin-community-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .not("user_id", "is", null);
      return count ?? 0;
    },
  });

  const broadcast = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("broadcast-notification", {
        body: { title, body, link, target },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`ההתראה נשלחה ל-${data.sent} משתמשים!`);
      setTitle("");
      setBody("");
      setLink("");
    },
    onError: (err: Error) => {
      toast.error(`שגיאה: ${err.message}`);
    },
  });

  const targetLabel = target === "all" ? `כל המשתמשים (${userCount ?? 0})` : `חברי קהילה (${communityCount ?? 0})`;

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-3xl font-heading gradient-teal flex items-center gap-3">
            <Bell className="h-8 w-8" />
            שליחת התראות
          </h1>
          <p className="text-muted-foreground mt-1">שלח הודעות לכל המשתמשים או לקהילת הלומדים</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-heading">{userCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">משתמשים רשומים</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-heading">{communityCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">חברי קהילה פעילים</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compose Form */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              התראה חדשה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>קהל יעד</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המשתמשים ({userCount ?? 0})</SelectItem>
                  <SelectItem value="community">חברי קהילה בלבד ({communityCount ?? 0})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>כותרת *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="למשל: שיעור חדש זמין!"
                maxLength={100}
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label>תוכן ההודעה</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="תיאור קצר (אופציונלי)"
                maxLength={500}
                rows={3}
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label>קישור (אופציונלי)</Label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="למשל: /lessons/abc123"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">נתיב יחסי באתר שאליו ההתראה תפנה</p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                ישלח ל: <strong className="text-foreground">{targetLabel}</strong>
              </p>
              <Button
                onClick={() => broadcast.mutate()}
                disabled={!title.trim() || broadcast.isPending}
                size="lg"
                className="gap-2"
              >
                {broadcast.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                שלח התראה
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              התראות אחרונות
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentNotifications?.length ? (
              <p className="text-center text-muted-foreground py-6">לא נשלחו התראות עדיין</p>
            ) : (
              <div className="space-y-3">
                {recentNotifications.map((n, i) => (
                  <motion.div
                    key={`${n.title}-${n.created_at}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                      {n.link && (
                        <Badge variant="outline" className="mt-1 text-[10px]">{n.link}</Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(n.created_at), { locale: he, addSuffix: true })}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
