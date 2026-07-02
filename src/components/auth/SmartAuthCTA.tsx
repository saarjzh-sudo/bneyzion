import { motion } from "framer-motion";
import { LogIn, Heart, BookOpen, MessageSquare, TrendingUp, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import GoogleIcon from "./GoogleIcon";
import { openAuthModal, type AuthModalVariant } from "./authModalStore";
import { currentReturnTarget } from "./googleSignIn";

type CTAVariant = "progress" | "favorites" | "comment" | "enroll" | "general";

interface SmartAuthCTAProps {
  variant?: CTAVariant;
  className?: string;
  compact?: boolean;
}

const variantConfig: Record<CTAVariant, { icon: typeof LogIn; text: string; subtext: string }> = {
  progress: {
    icon: TrendingUp,
    text: "התחבר כדי לשמור את ההתקדמות שלך",
    subtext: "המשך מאיפה שהפסקת בכל מכשיר",
  },
  favorites: {
    icon: Heart,
    text: "התחבר לשמירת מועדפים",
    subtext: "שמור שיעורים שאהבת וחזור אליהם בקלות",
  },
  comment: {
    icon: MessageSquare,
    text: "התחבר לכתיבת תגובה",
    subtext: "שתף את המחשבות שלך עם הקהילה",
  },
  enroll: {
    icon: BookOpen,
    text: "התחבר להרשמה לסדרה",
    subtext: "עקוב אחרי ההתקדמות שלך בסדרת השיעורים",
  },
  general: {
    icon: Sparkles,
    text: "התחבר לחוויה מלאה",
    subtext: "שמור מועדפים, עקוב אחרי התקדמות ועוד",
  },
};

const SmartAuthCTA = ({ variant = "general", className = "", compact = false }: SmartAuthCTAProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading || user) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;

  // פותח את מודאל-ההתחברות הגלובלי עם ההקשר המתאים, ושומר את יעד-החזרה.
  const open = () =>
    openAuthModal({ variant: variant as AuthModalVariant, next: currentReturnTarget() });

  if (compact) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onClick={open}
        className={`group inline-flex items-center gap-2 px-4 py-2 rounded-xl
          bg-secondary/60 hover:bg-secondary/90
          border border-border/40 hover:border-primary/30
          text-sm text-muted-foreground hover:text-foreground
          transition-all duration-300 backdrop-blur-sm
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${className}`}
      >
        <LogIn className="h-3.5 w-3.5 text-primary/70 group-hover:text-primary transition-colors" />
        <span className="font-display">{config.text}</span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-2xl border border-border/50 ${className}`}
    >
      {/* Subtle spring gradient background */}
      <div className="absolute inset-0 bg-gradient-to-l from-secondary/80 via-background to-secondary/40 opacity-80" />
      <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl translate-x-1/3 translate-y-1/3" />

      <div className="relative flex items-center gap-4 p-5 md:p-6">
        <div className="shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm md:text-base font-display text-foreground leading-snug">
            {config.text}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {config.subtext}
          </p>
        </div>

        <button
          onClick={open}
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl
            bg-primary text-primary-foreground text-sm font-display
            hover:bg-primary/90 transition-all duration-300 hover:shadow-md
            active:scale-[0.97]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60"
        >
          <span className="flex items-center justify-center bg-white rounded-[5px] p-0.5">
            <GoogleIcon size={14} />
          </span>
          התחברות
        </button>
      </div>
    </motion.div>
  );
};

export default SmartAuthCTA;
