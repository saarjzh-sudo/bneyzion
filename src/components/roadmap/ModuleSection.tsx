import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import MilestoneCard from "./MilestoneCard";
import type { Module } from "@/data/roadmapData";

interface ModuleSectionProps {
  mod: Module;
  index: number;
}

const ModuleSection = ({ mod, index }: ModuleSectionProps) => {
  const doneMilestones = mod.milestones.filter(m => m.status === "done").length;
  const totalMilestones = mod.milestones.length;
  const moduleProgress = Math.round(
    mod.milestones.reduce((a, m) => a + m.progress, 0) / totalMilestones
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12 }}
      aria-label={mod.name}
    >
      {/* Module header */}
      <header className="flex items-start gap-4 mb-2">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center shadow-md shrink-0`}>
          <mod.Icon className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-heading text-foreground">{mod.name}</h2>
          <p className="text-sm text-muted-foreground font-sans mt-0.5">{mod.description}</p>
        </div>
      </header>

      {/* Module stats bar */}
      <div className="flex items-center gap-3 mb-6 mr-16">
        <Progress value={moduleProgress} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground font-sans whitespace-nowrap">
          {doneMilestones}/{totalMilestones} אבני דרך • {moduleProgress}%
        </span>
      </div>

      {/* Timeline milestones — 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0 mr-4 md:mr-6">
        {mod.milestones.map((ms, i) => (
          <div key={ms.id}>
            <MilestoneCard
              milestone={ms}
              index={i}
              isLast={i === mod.milestones.length - 1}
            />
          </div>
        ))}
      </div>
    </motion.section>
  );
};

export default ModuleSection;
