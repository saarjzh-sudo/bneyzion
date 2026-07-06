import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * סקשן "הקדישו שיעור" לדף הבית.
 * אין כאן שיעור ספציפי (זהו דף הבית, לא עמוד שיעור) — הכפתור מוביל למאגר
 * השיעורים כדי שהמשתמש יבחר שיעור/סדרה ומשם ייפתח DedicationDialog האמיתי
 * (עם preview + תשלום). זה מונע כפתור-מת בלי להמציא flow הקדשה מקביל.
 */
const DedicationSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20">
      <div className="container text-center max-w-xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/90 to-primary/70 flex items-center justify-center mb-6 shadow-md shadow-primary/10">
          <Heart className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
        </div>
        <h2 className="text-2xl md:text-4xl font-heading gradient-gold-smooth mb-4">
          הקדישו שיעור לע״נ / לרפואת
        </h2>
        <p className="text-muted-foreground mb-8">
          ״כל מילה בתנ״ך היא אור – הקדישו אור״
        </p>
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/series")}
          className="px-8 py-3.5 bg-gradient-to-l from-primary to-primary/85 text-primary-foreground rounded-xl font-display text-sm shadow-md shadow-primary/12 hover:shadow-lg hover:shadow-primary/20 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          הקדישו שיעור ←
        </motion.button>
      </div>
    </section>
  );
};

export default DedicationSection;
