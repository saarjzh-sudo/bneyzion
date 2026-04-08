import { motion } from "framer-motion";
import { Flame, Star } from "lucide-react";
import { useSiteSetting } from "@/hooks/useSiteSettings";

const MemorialSection = () => {
  const { data: name } = useSiteSetting("memorial_name");
  const { data: subtitle } = useSiteSetting("memorial_subtitle");
  const { data: dedication } = useSiteSetting("memorial_dedication");

  const displayName = name || "סעדיה ז״ל";
  const displaySubtitle = subtitle || "תהא נשמתו צרורה בצרור החיים";

  return (
    <section className="py-20 section-gradient-warm">
      <div className="container max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 bg-accent/15 rounded-full animate-glow-pulse" />
            <div className="relative w-full h-full rounded-full glass-spring flex items-center justify-center shadow-md">
              <Flame className="h-9 w-9 text-primary" />
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-2 font-display">לעילוי נשמת</p>

          <h2 className="text-3xl md:text-5xl font-heading gradient-royal mb-3">
            {displayName}
          </h2>

          <div className="flex items-center justify-center gap-3 mb-6">
            <Star className="h-4 w-4 text-accent" />
            <span className="text-muted-foreground font-serif">{displaySubtitle}</span>
            <Star className="h-4 w-4 text-accent" />
          </div>

          {dedication && (
            <div className="glass-spring rounded-2xl p-8 shadow-sm">
              <p className="text-foreground leading-relaxed font-serif text-lg">{dedication}</p>
            </div>
          )}

          <div className="mt-8">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3 glass-spring text-foreground rounded-xl font-display text-sm hover:shadow-md transition-all inline-flex items-center gap-2"
            >
              <Flame className="h-4 w-4 text-primary" />
              הקדישו שיעור לעילוי נשמתו
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MemorialSection;
