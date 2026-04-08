import { motion } from "framer-motion";
import { Shield, Star, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommunityBadgeProps {
  tier?: string;
  label?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const tierConfig: Record<string, { icon: typeof Shield; gradient: string; textColor: string }> = {
  standard: {
    icon: Shield,
    gradient: "from-primary/20 to-primary/5 border-primary/30",
    textColor: "text-primary",
  },
  premium: {
    icon: Star,
    gradient: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  vip: {
    icon: Crown,
    gradient: "from-violet-500/20 to-violet-500/5 border-violet-500/30",
    textColor: "text-violet-600 dark:text-violet-400",
  },
};

const sizeConfig = {
  sm: "px-2 py-0.5 text-[10px] gap-1",
  md: "px-3 py-1 text-xs gap-1.5",
  lg: "px-4 py-1.5 text-sm gap-2",
};

const iconSize = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

const CommunityBadge = ({ tier = "standard", label, size = "md", className }: CommunityBadgeProps) => {
  const config = tierConfig[tier] || tierConfig.standard;
  const Icon = config.icon;

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center font-semibold rounded-full border bg-gradient-to-l",
        config.gradient,
        config.textColor,
        sizeConfig[size],
        className
      )}
    >
      <Icon className={iconSize[size]} />
      {label || "חבר הקהילה"}
    </motion.span>
  );
};

export default CommunityBadge;
