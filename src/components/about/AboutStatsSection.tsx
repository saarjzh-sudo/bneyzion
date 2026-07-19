import { motion } from "framer-motion";
import { Headphones, Users, BookOpen } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

interface Props {
  stats?: { lessons: number; rabbis: number; series: number } | undefined;
}

const AboutStatsSection = ({ stats }: Props) => {
  const statItems = [
    { label: "שיעורים", value: stats?.lessons.toLocaleString() ?? "—", icon: Headphones, color: "bg-primary/10 text-primary" },
    { label: "רבנים", value: stats?.rabbis.toLocaleString() ?? "—", icon: Users, color: "bg-accent/15 text-accent-foreground" },
    { label: "סדרות", value: stats?.series.toLocaleString() ?? "—", icon: BookOpen, color: "bg-secondary text-foreground" },
  ];

  return (
    <section className="py-16 section-gradient-cool">
      <div className="container max-w-3xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-3 gap-4"
        >
          {statItems.map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              custom={i}
              className="glass-card-light rounded-2xl p-4 sm:p-6 text-center min-w-0"
            >
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-3`}>
                <stat.icon className="h-6 w-6" />
              </div>
              {/* 17.7 (תרצה) + 19.7 (אלי): "22,645" נחתך במובייל והציג רק "45" —
                  ה-nowrap גלש מהכרטיס וה-overflow חתך את הספרות המובילות.
                  גודל-גופן נוזלי (clamp לפי רוחב-מסך) שתמיד נכנס בכרטיס,
                  ספרות סאנס נקיות וגרדיאנט שנגמר כהה (לא נמוג ללבן). */}
              <p
                className="font-bold whitespace-nowrap"
                dir="ltr"
                style={{
                  fontFamily: "Ploni, sans-serif",
                  fontSize: "clamp(0.95rem, 4.2vw, 2.25rem)",
                  background: "linear-gradient(135deg, hsl(25, 50%, 28%) 0%, hsl(36, 55%, 52%) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AboutStatsSection;
