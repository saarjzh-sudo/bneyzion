import { motion } from "framer-motion";
import { LogIn, Heart, BookOpen, MessageSquare, TrendingUp, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user, isLoading, signInWithGoogle } = useAuth();

  if (isLoading || user) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;

  if (compact) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onClick={signInWithGoogle}
        className={`group inline-flex items-center gap-2 px-4 py-2 rounded-xl
          bg-secondary/60 hover:bg-secondary/90
          border border-border/40 hover:border-primary/30
          text-sm text-muted-foreground hover:text-foreground
          transition-all duration-300 backdrop-blur-sm ${className}`}
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
          onClick={signInWithGoogle}
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl
            bg-primary text-primary-foreground text-sm font-display
            hover:bg-primary/90 transition-all duration-300 hover:shadow-md
            active:scale-[0.97]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          התחברות
        </button>
      </div>
    </motion.div>
  );
};

export default SmartAuthCTA;
