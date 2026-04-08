import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, BookOpenCheck, Shield, Compass } from "lucide-react";

const audiences = [
  { id: "teacher", label: "מורה", Icon: GraduationCap, description: "דפי עבודה, מערכי שיעור ומבחנים", gradient: "from-primary to-teal" },
  { id: "student", label: "תלמיד", Icon: BookOpenCheck, description: "סדרות שיעורים ולימוד יומי", gradient: "from-accent to-primary" },
  { id: "soldier", label: "חייל", Icon: Shield, description: "סרטוני חיזוק ושיעורים קצרים", gradient: "from-primary to-accent" },
  { id: "curious", label: "מתעניין", Icon: Compass, description: "חידונים, סיפורים וערכים", gradient: "from-accent to-gold" },
];

const SmartGate = () => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-serif font-black gradient-warm mb-3">
            ספר לנו מי אתה
          </h2>
          <p className="text-muted-foreground">
            נתאים לך את חוויית הלימוד
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
          {audiences.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-6 md:p-8 text-center cursor-pointer rounded-2xl border transition-all duration-300 bg-card shadow-sm hover:shadow-xl ${
                selected === a.id
                  ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                  : "border-border hover:border-primary/30"
              }`}
              onClick={() => setSelected(a.id)}
            >
              <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${a.gradient} flex items-center justify-center mb-4 shadow-sm`}>
                <a.Icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="font-serif font-bold text-foreground mb-1 text-lg">{a.label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{a.description}</p>
            </motion.div>
          ))}
        </div>

        {selected && (
          <motion.div
            className="text-center mt-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-display text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
              קח אותי לתכנים שלי
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default SmartGate;
