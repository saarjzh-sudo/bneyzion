import { motion, type Easing } from "framer-motion";
import { Flame, Star, Heart, BookOpen, Quote } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useSiteSetting } from "@/hooks/useSiteSettings";

const easeOut: Easing = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: easeOut },
  }),
};

const Memorial = () => {
  const { data: name } = useSiteSetting("memorial_name");
  const { data: subtitle } = useSiteSetting("memorial_subtitle");
  const { data: dedication } = useSiteSetting("memorial_dedication");
  const { data: bio } = useSiteSetting("memorial_bio");
  const { data: legacy } = useSiteSetting("memorial_legacy");
  const { data: verse } = useSiteSetting("memorial_verse");

  const displayName = name || "סעדיה ז״ל";
  const displaySubtitle = subtitle || "תהא נשמתו צרורה בצרור החיים";

  return (
    <Layout>
      {/* Hero - dark, solemn */}
      <section className="relative py-28 md:py-36 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--brand-mahogany))] via-[hsl(var(--brand-mahogany)/0.85)] to-background" />
        <div className="absolute inset-0 noise-overlay opacity-30" />

        <div className="container relative z-10 text-center max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative w-24 h-24 mx-auto mb-10"
          >
            <div className="absolute inset-0 bg-accent/20 rounded-full animate-glow-pulse blur-md" />
            <div className="relative w-full h-full rounded-full bg-card/10 backdrop-blur-sm border border-accent/30 flex items-center justify-center">
              <Flame className="h-11 w-11 text-accent" />
            </div>
          </motion.div>

          <motion.p variants={fadeUp} custom={0} initial="hidden" animate="visible" className="text-accent/80 text-sm font-display tracking-widest mb-3">
            לעילוי נשמת
          </motion.p>

          <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="visible" className="text-5xl md:text-7xl font-heading text-primary-foreground hero-text-shadow mb-4">
            {displayName}
          </motion.h1>

          <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible" className="flex items-center justify-center gap-3 mb-6">
            <Star className="h-4 w-4 text-accent/60" />
            <span className="text-primary-foreground/60 font-serif text-sm">{displaySubtitle}</span>
            <Star className="h-4 w-4 text-accent/60" />
          </motion.div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-16 section-gradient-warm">
        <div className="container max-w-3xl">
          {/* Dedication card */}
          {dedication && (
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card-gold rounded-2xl p-8 md:p-10 mb-12 text-center">
              <Quote className="h-8 w-8 text-accent/40 mx-auto mb-4 rotate-180" />
              <p className="text-foreground leading-[2] font-serif text-lg md:text-xl">{dedication}</p>
              <Quote className="h-8 w-8 text-accent/40 mx-auto mt-4" />
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="space-y-8">
            {/* Bio */}
            {bio && (
              <div className="glass-card-light rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-heading gradient-sunset">על {displayName}</h2>
                </div>
                {bio.split("\n").filter(Boolean).map((p, i) => (
                  <p key={i} className={`text-foreground leading-[2] font-serif ${i > 0 ? "mt-4" : ""}`}>{p}</p>
                ))}
              </div>
            )}

            {/* Legacy */}
            {legacy && (
              <div className="glass-card-light rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-heading gradient-earth">ההנצחה שלנו</h2>
                </div>
                <p className="text-foreground leading-[2] font-serif">{legacy}</p>
                {verse && (
                  <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <p className="text-sm text-muted-foreground font-display text-center">{verse}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-center mt-12">
            <motion.a
              href="/"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3.5 bg-card border border-border text-foreground rounded-xl font-display text-sm shadow-sm hover:shadow-md hover:border-primary/30 transition-all inline-flex items-center gap-2"
            >
              <Flame className="h-4 w-4 text-primary" />
              להקדשת שיעור לעילוי נשמתו
            </motion.a>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Memorial;
