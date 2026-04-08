import { motion } from "framer-motion";
import { Building2 } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const institutions = [
  "ישיבת אילת",
  "ישיבת אלון מורה",
  "ישיבת הגולן",
  "ישיבת הכותל",
  "ישיבת הר ברכה",
  "ישיבת הר המור",
  "ישיבת כרמיאל",
  "ישיבת מודיעין",
  "מוסדות 'בני דוד' בעלי",
  "מוסדות מכינת 'עצם'",
  "מכון מאיר",
  "ישיבת 'מעלה אליהו' תל אביב",
  "ישיבת מרכז הרב",
  "ישיבת מצפה רמון",
  "ישיבת נהורא",
  "ישיבת עטרת כהנים",
  "ישיבת קדומים",
  "ישיבת רמת גן",
  "ישיבת שבי חברון",
  "ישיבת שדרות",
  "ישיבת תורת החיים",
  "מדרשת הרובע",
  "מדרשת אוריה",
  "מוסדות בית מוריה – באר שבע",
  "מכון עז לישראל",
  "מכללה ירושלים",
  "ימי העיון בתנ״ך",
];

const AboutInstitutionsSection = () => {
  return (
    <section className="py-16 section-gradient-cool">
      <div className="container max-w-4xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-heading gradient-warm mb-4 text-center flex items-center justify-center gap-3">
            <Building2 className="h-7 w-7 text-primary" />
            המוסדות בהם נוצרו תכני האתר
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-sm text-muted-foreground text-center mb-8">
            באתר 'בני ציון' מוצבים שיעורים ומאמרים ממספר גדול של ישיבות ומוסדות תורניים (רשימה חלקית לפי א"ב)
          </motion.p>
          <motion.div variants={fadeUp} custom={2} className="glass-card-light rounded-2xl p-6 md:p-8">
            <div className="flex flex-wrap gap-2 justify-center">
              {institutions.map((inst) => (
                <span
                  key={inst}
                  className="px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-lg text-sm text-foreground/80 font-display"
                >
                  {inst}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutInstitutionsSection;
