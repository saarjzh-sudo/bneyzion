import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CheckCircle2, Clock, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { Milestone, Subtask } from "@/data/roadmapData";
import { statusConfig } from "@/data/roadmapData";

const subtaskIcon = (s: Subtask["status"]) => {
  switch (s) {
    case "done": return <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />;
    case "in_progress": return <Clock className="h-3.5 w-3.5 text-accent shrink-0" />;
    case "todo": return <Circle className="h-3.5 w-3.5 text-border shrink-0" />;
  }
};

interface MilestoneCardProps {
  milestone: Milestone;
  index: number;
  isLast: boolean;
}

const MilestoneCard = ({ milestone: ms, index, isLast }: MilestoneCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const st = statusConfig(ms.status);

  return (
    <div className="relative">
      {/* Card */}

      {/* Card */}
      <motion.article
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.07 }}
        className={`flex-1 mb-4 bg-card rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${
          isOpen ? "border-primary/40 shadow-md" : "border-border hover:border-primary/20"
        }`}
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsOpen(!isOpen); } }}
      >
        <div className="p-3 md:p-4">
          {/* Header row */}
          <div className="flex justify-between items-start gap-3 mb-2">
            <h3 className="text-sm md:text-base font-heading text-foreground leading-snug">{ms.title}</h3>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-sans font-medium whitespace-nowrap ${st.bg} ${st.color}`}>
              {ms.status === "done" && <CheckCircle2 className="h-3 w-3" />}
              {ms.status === "in_progress" && <Clock className="h-3 w-3" />}
              {ms.status === "todo" && <Circle className="h-3 w-3" />}
              {st.label}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs md:text-sm text-muted-foreground font-sans mb-3 leading-relaxed">{ms.description}</p>

          {/* Tech tags */}
          {ms.techTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {ms.techTags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5 font-sans">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Progress */}
          <Progress value={ms.progress} className="h-2 mb-2" />
          <div className="flex justify-between text-xs text-muted-foreground font-sans">
            <span>{ms.progress}%</span>
            <time>{ms.target}</time>
          </div>

          {/* Expand arrow */}
          <div className="flex justify-center mt-2">
            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </div>

          {/* Expandable subtasks */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-heading text-foreground mb-3">
                    תתי-משימות ({ms.subtasks.filter(s => s.status === "done").length}/{ms.subtasks.length})
                  </p>
                  <ul className="space-y-2 list-none p-0">
                    {ms.subtasks.map((sub, i) => (
                      <li key={i} className="text-xs md:text-sm text-muted-foreground font-sans flex items-center gap-2">
                        {subtaskIcon(sub.status)}
                        <span className={sub.status === "done" ? "line-through opacity-60" : ""}>
                          {sub.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.article>
    </div>
  );
};

export default MilestoneCard;
