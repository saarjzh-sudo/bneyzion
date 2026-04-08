import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, MailOpen, Eye, Trash2, Calendar, Phone, AtSign } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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

const Messages = () => {
  const { data: messages, isLoading } = useContactMessages();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

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

  const unreadCount = messages?.filter((m) => !m.read).length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-heading text-foreground">הודעות</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} חדשות
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {messages?.length ?? 0} הודעות סה״כ
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : messages?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>אין הודעות עדיין</p>
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
    </AdminLayout>
  );
};

export default Messages;
