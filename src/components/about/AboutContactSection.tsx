import { motion } from "framer-motion";
import { Heart, Mail, Phone, MessageCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const AboutContactSection = () => {
  return (
    <section className="py-20 section-gradient-warm">
      <div className="container max-w-4xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* Contact */}
          <motion.div variants={fadeUp} custom={0} className="glass-card-light rounded-2xl p-8">
            <h2 className="text-2xl font-heading gradient-warm mb-6">צור קשר</h2>
            <div className="space-y-4">
              <a href="mailto:info@bneyzion.co.il" className="flex items-center gap-3 text-foreground hover:text-primary transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">אימייל</p>
                  <p className="text-xs text-muted-foreground">info@bneyzion.co.il</p>
                </div>
              </a>
              <a href="https://wa.me/972000000000" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-foreground hover:text-primary transition-colors">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">שלחו לנו הודעה</p>
                </div>
              </a>
              <a href="tel:+972000000000" className="flex items-center gap-3 text-foreground hover:text-primary transition-colors">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">טלפון</p>
                  <p className="text-xs text-muted-foreground">נשמח לשמוע מכם</p>
                </div>
              </a>
            </div>
          </motion.div>

          {/* Donate */}
          <motion.div variants={fadeUp} custom={1} className="glass-card-gold rounded-2xl p-8">
            <h2 className="text-2xl font-heading gradient-warm mb-4">תרומות</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              הפעילות של בני ציון מתאפשרת הודות לתרומות הציבור. כל תרומה מסייעת להמשיך
              להנגיש את עולם התנ״ך לאלפי לומדים ומורים ברחבי הארץ והעולם.
            </p>
            <div className="space-y-3">
              <Link
                to="/donate"
                className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-xl font-display text-sm hover:bg-primary/90 transition-colors"
              >
                <Heart className="h-4 w-4" />
                לתרומה חד-פעמית
              </Link>
              <Link
                to="/donate"
                className="flex items-center justify-center gap-2 w-full py-3 border border-primary text-primary rounded-xl font-display text-sm hover:bg-primary/5 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                תרומה חודשית קבועה
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutContactSection;
