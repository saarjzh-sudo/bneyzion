import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, TrendingUp, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Leaderboard = () => {
  const { user } = useAuth();

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["weekly-leaderboard-v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_leaderboard" as any)
        .select("*")
        .limit(10);

      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">טבלת מובילים</h3>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">טבלת מובילים</h3>
        <span className="text-xs text-muted-foreground mr-auto">שבועי</span>
      </div>

      {leaderboard.length > 0 ? (
        <div className="space-y-2">
          {leaderboard.map((entry: any, i: number) => {
            const rank = entry.rank ?? i + 1;
            const isCurrentUser = user?.id === entry.user_id;

            return (
              <div
                key={entry.user_id || i}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isCurrentUser
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/30 border border-transparent"
                }`}
              >
                {/* Rank */}
                <div className="w-7 flex items-center justify-center shrink-0">
                  {rank === 1 ? (
                    <Crown className="h-5 w-5 text-amber-500" />
                  ) : rank <= 3 ? (
                    <Medal
                      className={`h-5 w-5 ${
                        rank === 2 ? "text-slate-400" : "text-orange-600"
                      }`}
                    />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground tabular-nums">
                      {rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                {entry.avatar_url ? (
                  <img
                    src={entry.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}

                {/* Name */}
                <span
                  className={`flex-1 text-sm truncate ${
                    isCurrentUser
                      ? "font-bold text-primary"
                      : "font-medium text-foreground"
                  }`}
                >
                  {entry.full_name || "לומד"}
                  {isCurrentUser && (
                    <span className="text-xs text-primary/70 mr-1">(את/ה)</span>
                  )}
                </span>

                {/* Points */}
                <span className="text-sm font-bold text-primary tabular-nums shrink-0">
                  {entry.total_points ?? entry.points ?? 0}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="h-10 w-10 mx-auto mb-2 text-border" />
          <p className="text-sm">הלוח יתמלא כשלומדים יצברו נקודות</p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
