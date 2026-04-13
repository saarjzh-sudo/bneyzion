import { useQuery } from "@tanstack/react-query";
import { Target, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const WeeklyChallenges = () => {
  const { user } = useAuth();

  const { data: challenges = [], isLoading: loadingChallenges } = useQuery({
    queryKey: ["weekly-challenges-standalone"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_challenges" as any)
        .select("*")
        .eq("active", true);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["challenge-progress-standalone", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_challenge_progress" as any)
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  if (loadingChallenges) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">אתגרים שבועיים</h3>
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const progressMap = new Map(
    progress.map((p: any) => [p.challenge_id, p])
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">אתגרים שבועיים</h3>
      </div>

      {challenges.length > 0 ? (
        <div className="space-y-3">
          {challenges.map((c: any) => {
            const prog = progressMap.get(c.id);
            const current = prog?.current_count ?? 0;
            const pct = Math.min(
              Math.round((current / c.target_count) * 100),
              100
            );
            const done = prog?.completed || current >= c.target_count;

            return (
              <div
                key={c.id}
                className={`rounded-xl border p-4 transition-all ${
                  done
                    ? "bg-primary/5 border-primary/30"
                    : "bg-card border-border"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? (
                      <Award className="h-4 w-4" />
                    ) : (
                      <Target className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        done ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {c.title}
                    </p>
                    {c.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={done ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    +{c.reward_points} נק'
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Progress value={pct} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {current}/{c.target_count}
                  </span>
                </div>

                {done && c.reward_badge && (
                  <p className="text-xs text-primary mt-1.5 font-semibold flex items-center gap-1">
                    <Award className="h-3 w-3" /> {c.reward_badge}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Target className="h-10 w-10 mx-auto mb-2 text-border" />
          <p className="text-sm">אין אתגרים פעילים השבוע</p>
        </div>
      )}
    </div>
  );
};

export default WeeklyChallenges;
