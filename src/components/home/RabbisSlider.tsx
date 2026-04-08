import { motion } from "framer-motion";
import { User } from "lucide-react";

const rabbis = [
  { name: "הרב חגי ולוסקי", lessons: 234 },
  { name: "הרב יואב אוריאל", lessons: 189 },
  { name: "הרב שלמה כהן", lessons: 156 },
  { name: "הרב אריה לוי", lessons: 142 },
  { name: "הרב מנחם גולד", lessons: 128 },
  { name: 'הרב אס"ף בנדל', lessons: 115 },
];

const RabbisSlider = () => {
  return (
    <section className="py-20">
      <div className="container">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/90 to-primary/70 flex items-center justify-center shadow-sm shadow-primary/10">
            <User className="h-5 w-5 text-primary-foreground" />
          </div>
          <h2 className="text-2xl md:text-3xl font-heading gradient-earth">
            הרבנים שלנו
          </h2>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
          {rabbis.map((r, i) => (
            <motion.div
              key={i}
              className="flex-shrink-0 w-36 text-center cursor-pointer group"
              whileHover={{ y: -4 }}
            >
              <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-white/80 to-secondary/60 border border-border/40 flex items-center justify-center mb-3 group-hover:border-accent/40 group-hover:shadow-lg transition-all glass-spring">
                <User className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm font-serif font-bold text-foreground group-hover:text-primary transition-colors">
                {r.name}
              </p>
              <p className="text-xs text-muted-foreground">{r.lessons} שיעורים</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RabbisSlider;
