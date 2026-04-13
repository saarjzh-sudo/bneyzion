import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Trash2, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SmartAuthCTA from "@/components/auth/SmartAuthCTA";
import { useAwardPoints } from "@/hooks/usePoints";

interface Comment {
  id: string;
  content: string;
  display_name: string | null;
  avatar_url: string | null;
  user_id: string;
  created_at: string;
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return "עכשיו";
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק'`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע'`;
  if (diff < 604800) return `לפני ${Math.floor(diff / 86400)} ימים`;
  return new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

const LessonComments = ({ lessonId }: { lessonId: string }) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();
  const awardPoints = useAwardPoints();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["lesson-comments", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_comments")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Comment[];
    },
  });

  const addComment = useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("lesson_comments").insert({
        lesson_id: lessonId,
        user_id: user.id,
        content: text,
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0],
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["lesson-comments", lessonId] });
      awardPoints.mutate({ action: "comment", referenceId: lessonId });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("lesson_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-comments", lessonId] });
    },
  });

  return (
    <div className="space-y-4" dir="rtl">
      <h3 className="text-lg font-heading text-foreground flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        תגובות ({comments.length})
      </h3>

      {/* Add comment */}
      {user ? (
        <form
          onSubmit={(e) => { e.preventDefault(); if (content.trim()) addComment.mutate(content.trim()); }}
          className="flex items-start gap-3"
        >
          {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0 mt-1" referrerPolicy="no-referrer" loading="lazy" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <User className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex-1 flex gap-2">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="כתוב תגובה..."
              className="flex-1 bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/60"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!content.trim() || addComment.isPending}
              className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      ) : (
        <SmartAuthCTA variant="comment" compact />
      )}

      {/* Comments list */}
      <div className="space-y-3">
        <AnimatePresence>
          {comments.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-3 group"
            >
              {c.avatar_url ? (
                <img src={c.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5" referrerPolicy="no-referrer" loading="lazy" />
              ) : (
                <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-display text-foreground">{c.display_name || "אנונימי"}</span>
                  <span className="text-muted-foreground/60">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{c.content}</p>
              </div>
              {user && (user.id === c.user_id) && (
                <button
                  onClick={() => deleteComment.mutate(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive/50 hover:text-destructive transition-all shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-7 w-7 rounded-full bg-secondary" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-20 bg-secondary rounded" />
                  <div className="h-3 w-48 bg-secondary rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && comments.length === 0 && (
          <p className="text-sm text-muted-foreground/60 text-center py-4">אין תגובות עדיין — היה הראשון!</p>
        )}
      </div>
    </div>
  );
};

export default LessonComments;
