import { motion } from "framer-motion";
import { Star, Trophy, Flame } from "lucide-react";
import { usePoints, usePointsLog, POINT_VALUES } from "@/hooks/usePoints";

const actionLabels: Record<string, string> = {
  course_complete: "השלמת קורס",
  comment: "תגובה",
  favorite: "לייק/מועדף",
  lesson_view: "צפייה בשיעור",
  streak_bonus: "בונוס רצף יומי",
};

const PointsBadge = () => {
  const { points, isLoading, isLoggedIn } = usePoints();
  const { data: log = [] } = usePointsLog();

  if (!isLoggedIn || isLoading) return null;

  const total = points?.total_points ?? 0;
  const lifetime = points?.lifetime_points ?? 0;

  // Determine level
  const level = lifetime >= 1000 ? "זהב" : lifetime >= 500 ? "כסף" : lifetime >= 100 ? "ארד" : "מתחיל";
  const levelColor = lifetime >= 1000 ? "text-amber-500" : lifetime >= 500 ? "text-slate-400" : lifetime >= 100 ? "text-orange-600" : "text-muted-foreground";
  const LevelIcon = lifetime >= 1000 ? Trophy : lifetime >= 500 ? Star : Flame;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-heading text-foreground flex items-center gap-2">
          <Star className="h-4.5 w-4.5 text-primary" />
          מועדון נאמנות
        </h3>
        <div className={`flex items-center gap-1.5 text-sm font-bold ${levelColor}`}>
          <LevelIcon className="h-4 w-4" />
          {level}
        </div>
      </div>

      {/* Points display */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-3xl font-bold text-primary tabular-nums">{total}</p>
          <p className="text-[11px] text-muted-foreground">נקודות זמינות</p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div className="text-center">
          <p className="text-xl font-bold text-foreground tabular-nums">{lifetime}</p>
          <p className="text-[11px] text-muted-foreground">סה״כ נצברו</p>
        </div>
      </div>

      {/* How to earn */}
      <div className="bg-muted/40 rounded-xl p-3 space-y-1.5">
        <p className="text-xs font-semibold text-foreground">איך צוברים נקודות?</p>
        {Object.entries(POINT_VALUES).map(([action, pts]) => (
          <div key={action} className="flex justify-between text-xs text-muted-foreground">
            <span>{actionLabels[action] || action}</span>
            <span className="font-bold text-primary">+{pts}</span>
          </div>
        ))}
      </div>

      {/* Recent log */}
      {log.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground">פעילות אחרונה</p>
          {log.slice(0, 5).map((entry: any) => (
            <div key={entry.id} className="flex justify-between text-xs text-muted-foreground">
              <span>{actionLabels[entry.action] || entry.action}</span>
              <span className="font-bold text-emerald-500">+{entry.points}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default PointsBadge;
