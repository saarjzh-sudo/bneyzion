import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function computeStreak(rows: { activity_date: string }[]): number {
  if (!rows || rows.length === 0) return 0;

  // Sort descending by date
  const dates = rows
    .map((r) => r.activity_date)
    .sort((a, b) => (a > b ? -1 : 1));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const firstDate = new Date(dates[0] + "T00:00:00");

  // Streak must start from today or yesterday
  if (firstDate < yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const curr = new Date(dates[i - 1] + "T00:00:00");
    const prev = new Date(dates[i] + "T00:00:00");
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

const StreakDisplay = () => {
  const { user } = useAuth();

  const { data: streak = 0, isLoading } = useQuery({
    queryKey: ["user-streak", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const since = thirtyDaysAgo.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("user_daily_activity" as any)
        .select("activity_date")
        .eq("user_id", user!.id)
        .gte("activity_date", since)
        .order("activity_date", { ascending: false });

      if (error) throw error;
      return computeStreak((data as any[]) ?? []);
    },
  });

  if (!user || isLoading) return null;

  const active = streak > 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          active
            ? "bg-orange-500/10 text-orange-500"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <Flame
          className={`h-5 w-5 ${active ? "animate-pulse" : ""}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {active ? `${streak} ימים רצופים` : "אין רצף פעיל"}
        </p>
        <p className="text-xs text-muted-foreground">
          {active ? "כל הכבוד! המשיכו כך" : "התחילו ללמוד היום"}
        </p>
      </div>
      {active && streak >= 7 && (
        <span className="text-xs font-bold text-orange-500 bg-orange-500/10 rounded-full px-2.5 py-1">
          {streak >= 30 ? "אש!" : streak >= 14 ? "מדהים!" : "יופי!"}
        </span>
      )}
    </div>
  );
};

export default StreakDisplay;
