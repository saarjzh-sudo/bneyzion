import { motion, AnimatePresence } from "framer-motion";
import { Star, Trophy, Flame, Target, Crown, BookOpen, Award, TrendingUp, User } from "lucide-react";
import { usePoints, usePointsLog, POINT_VALUES } from "@/hooks/usePoints";
import { useWeeklyChallenges, useChallengeProgress, useLeaderboard } from "@/hooks/useChallenges";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LEVELS = [
  { name: "מתחיל", min: 0, icon: BookOpen, color: "text-muted-foreground" },
  { name: "לומד", min: 100, icon: Flame, color: "text-orange-500" },
  { name: "מקדיש", min: 300, icon: Star, color: "text-amber-500" },
  { name: "בוקי", min: 700, icon: Trophy, color: "text-primary" },
  { name: "חכם", min: 1500, icon: Crown, color: "text-violet-500" },
];

function getLevel(pts: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (pts >= LEVELS[i].min) return { ...LEVELS[i], index: i };
  }
  return { ...LEVELS[0], index: 0 };
}

function getNextLevel(pts: number) {
  const current = getLevel(pts);
  if (current.index >= LEVELS.length - 1) return null;
  return LEVELS[current.index + 1];
}

const actionLabels: Record<string, string> = {
  course_complete: "השלמת קורס",
  comment: "תגובה",
  favorite: "לייק/מועדף",
  lesson_view: "צפייה בשיעור",
  streak_bonus: "בונוס רצף יומי",
};

const LoyaltyDashboard = () => {
  const { points, isLoggedIn } = usePoints();
  const { data: log = [] } = usePointsLog();
  const { data: challenges = [] } = useWeeklyChallenges();
  const { data: progress = [] } = useChallengeProgress();
  const { data: leaderboard = [] } = useLeaderboard();

  if (!isLoggedIn) return null;

  const total = points?.total_points ?? 0;
  const lifetime = points?.lifetime_points ?? 0;
  const level = getLevel(lifetime);
  const nextLevel = getNextLevel(lifetime);
  const LevelIcon = level.icon;
  const progressToNext = nextLevel ? Math.round(((lifetime - level.min) / (nextLevel.min - level.min)) * 100) : 100;

  const progressMap = new Map(progress.map((p: any) => [p.challenge_id, p]));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Points & Level Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
        <div className="absolute top-2 left-2 opacity-10">
          <Trophy className="h-24 w-24 text-primary" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Level badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className={`h-20 w-20 rounded-2xl bg-card border-2 border-primary/30 flex items-center justify-center ${level.color}`}>
              <LevelIcon className="h-10 w-10" />
            </div>
            <p className={`text-sm font-bold mt-1.5 ${level.color}`}>{level.name}</p>
          </motion.div>

          <div className="flex-1">
            <div className="flex items-baseline gap-3 mb-1">
              <motion.span
                key={total}
                initial={{ scale: 1.3, color: "hsl(var(--primary))" }}
                animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                className="text-4xl font-bold tabular-nums"
              >
                {total}
              </motion.span>
              <span className="text-sm text-muted-foreground">נקודות</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">סה״כ נצברו: {lifetime}</p>

            {nextLevel && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">לרמת <strong className="text-foreground">{nextLevel.name}</strong></span>
                  <span className="text-primary font-bold">{nextLevel.min - lifetime} נק' נותרו</span>
                </div>
                <Progress value={progressToNext} className="h-2.5" />
              </div>
            )}
            {!nextLevel && (
              <Badge className="bg-gradient-to-r from-violet-500 to-primary text-primary-foreground border-0">
                <Crown className="h-3 w-3 ml-1" /> רמה מקסימלית!
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="challenges" dir="rtl">
        <TabsList className="w-full justify-start bg-muted/50">
          <TabsTrigger value="challenges" className="gap-1.5"><Target className="h-3.5 w-3.5" />אתגרים</TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />מובילים</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><Star className="h-3.5 w-3.5" />היסטוריה</TabsTrigger>
        </TabsList>

        {/* Challenges */}
        <TabsContent value="challenges" className="space-y-3 mt-4">
          {challenges.length > 0 ? (
            <AnimatePresence>
              {challenges.map((c: any, i: number) => {
                const prog = progressMap.get(c.id);
                const current = prog?.current_count ?? 0;
                const pct = Math.min(Math.round((current / c.target_count) * 100), 100);
                const done = prog?.completed || current >= c.target_count;

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`rounded-xl border p-4 transition-all ${
                      done ? "bg-primary/5 border-primary/30" : "bg-card border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {done ? <Award className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${done ? "text-primary" : "text-foreground"}`}>{c.title}</p>
                        {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                      </div>
                      <Badge variant={done ? "default" : "secondary"} className="shrink-0">
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
                      <p className="text-xs text-primary mt-1.5 font-semibold flex items-center gap-1"><Award className="h-3 w-3" /> {c.reward_badge}</p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-2 text-border" />
              <p className="text-sm">אין אתגרים פעילים השבוע</p>
            </div>
          )}
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard" className="mt-4">
          {leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((entry: any, i: number) => (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border"
                >
                  <span className={`text-lg font-bold w-6 text-center tabular-nums ${
                    i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-600" : "text-muted-foreground"
                  }`}>
                    {entry.rank}
                  </span>
                  {entry.profile?.avatar_url ? (
                    <img src={entry.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="flex-1 text-sm font-medium text-foreground truncate">
                    {entry.profile?.full_name || "לומד"}
                  </span>
                  <span className="text-sm font-bold text-primary tabular-nums">{entry.total_points} נק'</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <TrendingUp className="h-10 w-10 mx-auto mb-2 text-border" />
              <p className="text-sm">הלוח יתמלא כשלומדים יצברו נקודות</p>
            </div>
          )}
        </TabsContent>

        {/* Points History */}
        <TabsContent value="history" className="mt-4">
          {log.length > 0 ? (
            <div className="space-y-1.5">
              {log.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-card border border-border">
                  <div>
                    <p className="text-sm text-foreground">{actionLabels[entry.action] || entry.action}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary">+{entry.points}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Star className="h-10 w-10 mx-auto mb-2 text-border" />
              <p className="text-sm">עדיין לא צברת נקודות</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default LoyaltyDashboard;
