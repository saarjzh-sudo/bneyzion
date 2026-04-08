import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

interface Rabbi {
  id: string;
  name: string;
  title: string | null;
  image_url: string | null;
  specialty: string | null;
  lesson_count: number;
}

interface Props {
  topRabbis?: Rabbi[] | undefined;
}

const AboutRabbisSection = ({ topRabbis }: Props) => {
  if (!topRabbis || topRabbis.length === 0) return null;

  return (
    <section className="py-20 section-gradient-warm">
      <div className="container max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-heading gradient-warm mb-8 text-center">
            הרבנים המובילים שלנו
          </motion.h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {topRabbis.map((rabbi, i) => (
              <motion.div key={rabbi.id} variants={fadeUp} custom={i + 1}>
                <Link
                  to={`/rabbis/${rabbi.id}`}
                  className="glass-card-light rounded-2xl p-5 text-center block hover:shadow-lg hover:border-primary/20 transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-heading text-primary">
                      {rabbi.name.charAt(0)}
                    </span>
                  </div>
                  <h3 className="text-sm font-display text-foreground group-hover:text-primary transition-colors">
                    {rabbi.title} {rabbi.name.replace(/^הרב\s*/, "")}
                  </h3>
                  {rabbi.specialty && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{rabbi.specialty}</p>
                  )}
                  <p className="text-xs text-accent-foreground mt-1">{rabbi.lesson_count} שיעורים</p>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link to="/rabbis" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              לכל הרבנים ←
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutRabbisSection;
