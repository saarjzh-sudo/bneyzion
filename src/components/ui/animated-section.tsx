import { useRef, useEffect, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  animation?: string;
}

export function AnimatedSection({ children, className, delay = 0 }: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // לקח 13.8 (ערב כנס אלול): threshold 0.1 דורש ש-10% מהסקשן ייראה בבת אחת.
    // סקשן שגבוה פי >10 מהמסך (PainAndDream וכד') לעולם לא מגיע לזה — ונשאר
    // opacity-0 לתמיד: "טקסט לבן על רקע לבן". threshold 0 = כל פיקסל מדליק.
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
