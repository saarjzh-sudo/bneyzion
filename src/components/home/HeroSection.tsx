import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import heroWatercolor from "@/assets/hero-watercolor-home.webp";
import LazyHeroVideo from "@/components/performance/LazyHeroVideo";

const HeroSection = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <section className="relative min-h-[85vh] flex flex-col items-center justify-start overflow-hidden -mt-24">
        {/* רמה 13 (9.7.2026): אקוורל ירושלים-של-זהב מונפש (גרוק) במקום וידאו-הנוף — הקו של יואב; הטקסט הפך כהה. */}
        <LazyHeroVideo videoSrc="/video/hero-watercolor.mp4" poster={heroWatercolor} posterAlt="חומות ירושלים באקוורל מוזהב" />

        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="container relative z-10 text-center px-4 pt-28 md:pt-32">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
            className="text-xl md:text-2xl tracking-[0.35em] text-foreground/85 font-heading mb-3"
          >
            בני ציון
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1.2, ease: "easeOut" }}
            className="text-5xl md:text-7xl lg:text-8xl font-heading leading-[1.05] mb-5 text-foreground"
            style={{ textShadow: "0 1px 12px rgba(255,250,240,0.6)" }}
          >
            אתר התנ״ך
            <br />
            <span className="gradient-gold-smooth" style={{ WebkitTextFillColor: 'transparent' }}>של ישראל</span>
          </motion.h1>

          {/* CTA - opens dialog. 27.5.2026 — /series→/lessons since /series was removed. */}
          <Link to="/lessons">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2.5 mt-6 px-8 py-4 rounded-2xl bg-primary/10 backdrop-blur-xl border border-primary/25 text-foreground text-lg md:text-xl font-heading hover:bg-primary/20 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300"
            >
              <BookOpen className="h-5 w-5 text-accent" />
              <span>התחילו ללמוד</span>
            </motion.span>
          </Link>

          {/* Social proof counters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.8 }}
            className="flex items-center justify-center gap-6 md:gap-10 mt-10"
          >
            {[
              { value: "11,000+", label: "שיעורים" },
              { value: "200+", label: "רבנים" },
              { value: "1,300+", label: "סדרות" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-heading text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground font-display">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Scroll hint */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.4 }}
            onClick={() => contentRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="mt-6 inline-flex flex-col items-center gap-1 text-foreground/40 hover:text-foreground/70 transition-colors"
          >
            <ChevronDown className="h-5 w-5 animate-float" />
          </motion.button>
        </div>
      </section>

      <div ref={contentRef} />
    </>
  );
};

export default HeroSection;
