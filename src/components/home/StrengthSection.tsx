import { motion } from "framer-motion";
import { Play, Shield } from "lucide-react";

const videos = [
  { title: "הצרעה – כוח האמונה", rabbi: "הרב יואב אוריאל" },
  { title: "מלחמה על הדעת", rabbi: "הרב חגי ולוסקי" },
  { title: "נפש, רוח ונשמה", rabbi: "הרב שלמה כהן" },
];

const StrengthSection = () => {
  return (
    <section className="py-20 section-gradient-cool">
      <div className="container">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/90 to-primary/70 flex items-center justify-center shadow-sm shadow-primary/10">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <h2 className="text-2xl md:text-3xl font-heading gradient-royal">
            בכוח התנ״ך ננצח
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {videos.map((v, i) => (
            <motion.div
              key={i}
              className="group glass-spring rounded-2xl overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300"
              whileHover={{ y: -3 }}
            >
              <div className="aspect-video bg-gradient-to-br from-muted/60 to-secondary/60 flex items-center justify-center relative overflow-hidden">
                <div className="w-16 h-16 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="h-7 w-7 text-primary mr-[-2px]" />
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-serif font-bold text-foreground group-hover:text-primary transition-colors">
                  {v.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{v.rabbi}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StrengthSection;
