import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg-bney-zion.jpg";

const HeroSection = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <section className="relative min-h-[85vh] flex flex-col items-center justify-start overflow-hidden -mt-24">
        {/* Background Image */}
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-black/50" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="container relative z-10 text-center px-4 pt-28 md:pt-32">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
            className="text-xl md:text-2xl tracking-[0.35em] text-white/90 font-heading mb-3"
            style={{ textShadow: "0 2px 16px rgba(0,0,0,0.25)" }}
          >
            בני ציון
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1.2, ease: "easeOut" }}
            className="text-5xl md:text-7xl lg:text-8xl font-heading leading-[1.05] mb-5 text-white"
            style={{ textShadow: "0 4px 30px rgba(0,0,0,0.3), 0 1px 6px rgba(0,0,0,0.2)" }}
          >
            אתר התנ״ך
            <br />
            <span className="gradient-gold-smooth" style={{ WebkitTextFillColor: 'transparent' }}>של ישראל</span>
          </motion.h1>

          {/* CTA - opens dialog */}
          <Link to="/series">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2.5 mt-6 px-8 py-4 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 text-white text-lg md:text-xl font-heading hover:bg-white/25 hover:shadow-2xl hover:shadow-white/10 transition-all duration-300"
              style={{ textShadow: "0 1px 10px rgba(0,0,0,0.2)" }}
            >
              <BookOpen className="h-5 w-5 text-accent" />
              <span>התחילו ללמוד</span>
            </motion.span>
          </Link>

          {/* Scroll hint */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.4 }}
            onClick={() => contentRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="mt-10 inline-flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors"
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
