import { useState, useEffect } from "react";
import { Bell, BellRing, BellOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/components/pwa/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { Link } from "react-router-dom";

function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("user_notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

interface NotificationBellProps {
  isTransparent?: boolean;
}

export default function NotificationBell({ isTransparent }: NotificationBellProps) {
  const { user } = useAuth();
  const { data: notifications } = useNotifications();
  const markRead = useMarkRead();
  const qc = useQueryClient();
  const push = usePushNotifications();

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`p-2.5 rounded-xl transition-all relative ${
            isTransparent
              ? "text-white/70 hover:text-white hover:bg-white/10"
              : "text-muted-foreground hover:text-primary hover:bg-secondary"
          }`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" dir="rtl">
        <div className="p-3 border-b border-border">
          <h3 className="font-heading text-sm font-semibold">התראות</h3>
        </div>

        {/* Device push opt-in — only shown where Web Push can actually be delivered */}
        {push.isSupported && push.vapidConfigured && (
          <div className="px-3 py-2 border-b border-border/60 bg-secondary/30">
            {push.permission === "denied" ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <BellOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ההתראות חסומות בהגדרות הדפדפן
              </p>
            ) : push.isSubscribed ? (
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs text-primary">
                  <BellRing className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  ההתראות פעילות במכשיר
                </span>
                <button
                  onClick={() => push.disable()}
                  disabled={push.isWorking}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                >
                  כיבוי
                </button>
              </div>
            ) : (
              <button
                onClick={() => push.enable()}
                disabled={push.isWorking}
                className="flex w-full items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
              >
                <BellRing className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                קבלת התראות למכשיר — גם כשהאתר סגור
              </button>
            )}
          </div>
        )}

        <ScrollArea className="max-h-80">
          {!notifications?.length ? (
            <p className="p-4 text-center text-sm text-muted-foreground">אין התראות חדשות</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer ${
                  !n.read ? "bg-primary/5" : ""
                }`}
                onClick={() => { if (!n.read) markRead.mutate(n.id); }}
              >
                {n.link ? (
                  <Link to={n.link} className="block">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                  </Link>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                  </>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { locale: he, addSuffix: true })}
                </p>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
