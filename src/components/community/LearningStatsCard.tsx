import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, Heart, Flame, Clock, GraduationCap } from "lucide-react";
import { useLearningStats } from "@/hooks/useMembership";

const StatItem = ({ icon: Icon, label, value, color }: { icon: typeof BookOpen; label: string; value: number | string; color: string }) => (
  <div className="text-center p-4 bg-muted/40 rounded-xl border border-border">
    <Icon className={`h-5 w-5 mx-auto mb-1.5 ${color}`} />
    <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
    <p className="text-[11px] text-muted-foreground">{label}</p>
  </div>
);

const LearningStatsCard = () => {
  const { data: stats, isLoading } = useLearningStats();

  if (isLoading || !stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-5 md:p-6"
    >
      <h3 className="text-base font-heading text-foreground mb-4 flex items-center gap-2">
        <GraduationCap className="h-4.5 w-4.5 text-primary" />
        סטטיסטיקות למידה
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <StatItem icon={Flame} label="ימים רצופים" value={stats.streak} color="text-orange-500" />
        <StatItem icon={BookOpen} label="שיעורים נצפו" value={stats.totalLessons} color="text-primary" />
        <StatItem icon={CheckCircle2} label="הושלמו" value={stats.completedLessons} color="text-emerald-500" />
        <StatItem icon={Heart} label="מועדפים" value={stats.totalFavorites} color="text-destructive" />
        <StatItem icon={GraduationCap} label="קורסים" value={stats.activeEnrollments} color="text-violet-500" />
        <StatItem icon={Clock} label="דקות למידה" value={stats.totalMinutes} color="text-sky-500" />
      </div>
    </motion.div>
  );
};

export default LearningStatsCard;
