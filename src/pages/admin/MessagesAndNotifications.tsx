/**
 * MessagesAndNotifications — /admin/messages + /admin/notifications
 *
 * 10.7.2026 (הוראת סער): איחוד שני עמודים לעמוד אחד "הודעות והתראות" עם שני טאבים:
 *   • "פניות נכנסות"      — תיבת הפניות מטופס יצירת-הקשר (contact_messages) — לשעבר Messages.tsx
 *   • "התראות למשתמשים"   — שיגור התראות in-app/push דרך edge broadcast-notification — לשעבר Notifications.tsx
 *
 * שני הראוטים הישנים מרנדרים את העמוד הזה (Messages.tsx / Notifications.tsx =
 * re-export). הטאב ההתחלתי נגזר מהנתיב: /admin/notifications פותח את טאב ההתראות.
 */
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail, MailOpen, Trash2, Calendar, AtSign,
  Bell, Send, Users, History, CheckCircle2, Loader2, Inbox,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

/* ═══════════════════════════════════════════════════════════════════
   טאב 1 — פניות נכנסות (contact_messages)
   ═══════════════════════════════════════════════════════════════════ */

function useContactMessages() {
  return useQuery({
    queryKey: ["admin-contact-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessagesInboxContent() {
  const { data: messages, isLoading, error } = useContactMessages();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const sendViaSystem = async () => {
    if (!selectedMessage?.email || !replyText.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-admin-email", {
        body: {
          to: selectedMessage.email,
          subject: `Re: ${selectedMessage.subject || "פנייתך לבני ציון"}`,
          html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7">${replyText.replace(/\n/g, "<br>")}</div>`,
          replyTo: selectedMessage.email,
        },
      });
      if (error) throw error;
      if (data && data.ok === false) throw new Error(data.error || "השליחה נכשלה");
      toast({ title: "המענה נשלח דרך המערכת" });
      setReplyText("");
      setSelectedMessage(null);
    } catch (e: any) {
      toast({ title: "שליחה דרך המערכת נכשלה", description: `${e.message}. אפשר להשתמש ב"השב במייל".`, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_messages")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_messages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] });
      toast({ title: "ההודעה נמחקה" });
    },
  });

  const openMessage = (msg: any) => {
    setSelectedMessage(msg);
    if (!msg.read) {
      markAsRead.mutate(msg.id);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <p className="text-sm text-muted-foreground">
        {messages?.length ?? 0} פניות סה״כ — מטופס יצירת הקשר באתר
      </p>

      {error ? (
        <div className="text-center py-10 text-destructive text-sm">
          שגיאה בטעינת הפניות: {(error as Error).message}
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : messages?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>אין פניות עדיין</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages?.map((msg) => (
            <Card
              key={msg.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                !msg.read ? "border-primary/30 bg-primary/5" : ""
              }`}
              onClick={() => openMessage(msg)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1 shrink-0">
                      {msg.read ? (
                        <MailOpen className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Mail className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${!msg.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {msg.name}
                        </span>
                        {msg.subject && (
                          <span className="text-xs text-muted-foreground">— {msg.subject}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{msg.message}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(msg.created_at)}
                        </span>
                        {msg.email && (
                          <span className="flex items-center gap-1">
                            <AtSign className="h-3 w-3" />
                            {msg.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!msg.read && (
                      <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Message detail dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          {selectedMessage && (
            <>
              <DialogHeader>
                <DialogTitle className="text-right">
                  {selectedMessage.subject || "הודעה מ" + selectedMessage.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">שם: </span>
                    <span className="font-medium">{selectedMessage.name}</span>
                  </div>
                  {selectedMessage.email && (
                    <div>
                      <span className="text-muted-foreground">מייל: </span>
                      <a href={`mailto:${selectedMessage.email}`} className="text-primary hover:underline">
                        {selectedMessage.email}
                      </a>
                    </div>
                  )}
                  {selectedMessage.phone && (
                    <div>
                      <span className="text-muted-foreground">טלפון: </span>
                      <a href={`tel:${selectedMessage.phone}`} className="text-primary hover:underline">
                        {selectedMessage.phone}
                      </a>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(selectedMessage.created_at)}
                </div>
                <div className="bg-secondary/30 rounded-lg p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>

                {selectedMessage.email && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">מענה (יישלח ממערכת בני ציון):</label>
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      placeholder="כתוב כאן את המענה…"
                      dir="rtl"
                    />
                    <Button
                      size="sm"
                      onClick={sendViaSystem}
                      disabled={!replyText.trim() || sending}
                    >
                      <Mail className="h-4 w-4 ml-1" />
                      {sending ? "שולח…" : "שלח דרך המערכת"}
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      deleteMessage.mutate(selectedMessage.id);
                      setSelectedMessage(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 ml-1" />
                    מחק
                  </Button>
                  {selectedMessage.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject || ""}`}>
                        <Mail className="h-4 w-4 ml-1" />
                        השב במייל
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   טאב 2 — התראות למשתמשים (user_notifications + web push)
   ═══════════════════════════════════════════════════════════════════ */

export function NotificationsContent() {
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
      sonnerToast.success(`ההתראה נשלחה ל-${data.sent} משתמשים!`);
      setTitle("");
      setBody("");
      setLink("");
    },
    onError: (err: Error) => {
      sonnerToast.error(`שגיאה: ${err.message}`);
    },
  });

  const targetLabel =
    target === "all"
      ? `כל המשתמשים (${userCount ?? 0})`
      : target === "weekly-learners"
        ? "לומדי הפרק השבועי (מנויים עם חשבון מקושר)"
        : `חברי קהילה (${communityCount ?? 0})`;

  return (
    <div className="space-y-8 max-w-4xl" dir="rtl">
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
                <SelectItem value="weekly-learners">לומדי הפרק השבועי בלבד</SelectItem>
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
  );
}

/* ═══════════════════════════════════════════════════════════════════
   העמוד המאוחד
   ═══════════════════════════════════════════════════════════════════ */

export default function MessagesAndNotifications() {
  const { pathname } = useLocation();
  // /admin/notifications פותח ישירות את טאב ההתראות; כל נתיב אחר — פניות נכנסות
  const initialTab = pathname.includes("notifications") ? "notifications" : "inbox";
  const [tab, setTab] = useState(initialTab);

  const { data: messages } = useContactMessages();
  const unreadCount = messages?.filter((m: any) => !m.read).length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-heading text-foreground">הודעות והתראות</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} חדשות
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground -mt-4">
          פניות שמגיעות מהאתר + שיגור התראות למשתמשים — במקום אחד
        </p>

        <Tabs value={tab} onValueChange={setTab} dir="rtl">
          <TabsList>
            <TabsTrigger value="inbox" className="gap-1.5">
              <Inbox className="h-3.5 w-3.5" />
              פניות נכנסות
              {unreadCount > 0 && (
                <span className="rounded-full bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 leading-none">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              התראות למשתמשים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="pt-4">
            <MessagesInboxContent />
          </TabsContent>
          <TabsContent value="notifications" className="pt-4">
            <NotificationsContent />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
