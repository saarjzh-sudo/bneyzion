import { motion, type Easing } from "framer-motion";
import heroImg from "@/assets/memorial-saadia-hero.jpg";

const easeOut: Easing = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: easeOut },
  }),
};

const MemorialHero = () => (
  <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
    <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
    {/* Forest-to-transparent overlay */}
    <div
      className="absolute inset-0"
      style={{
        background: "linear-gradient(to bottom, rgba(29,46,39,0.82) 0%, rgba(56,79,71,0.65) 50%, rgba(29,46,39,0.90) 100%)",
      }}
    />
    <div className="absolute inset-0 noise-overlay opacity-10 pointer-events-none" />

    <div className="container relative z-10 text-center max-w-3xl py-28">
      {/* Org line */}
      <motion.p
        variants={fadeUp} custom={0} initial="hidden" animate="visible"
        className="text-sm font-display tracking-[0.2em] mb-10"
        style={{ color: "#B0CEBB" }}
      >
        אתר התנ״ך של ישראל מבית ארגון בני ציון
      </motion.p>

      {/* Ornamental line */}
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="flex items-center justify-center gap-4 mb-8">
        <span className="h-px w-16" style={{ background: "#C9A454", opacity: 0.35 }} />
        <span className="text-xs font-display tracking-widest" style={{ color: "#DFC68E" }}>לזכרו של</span>
        <span className="h-px w-16" style={{ background: "#C9A454", opacity: 0.35 }} />
      </motion.div>

      {/* Name */}
      <motion.h1
        variants={fadeUp} custom={2} initial="hidden" animate="visible"
        className="text-5xl sm:text-6xl md:text-8xl font-heading leading-[1.1] mb-3"
        style={{ color: "#F9F7F4", textShadow: "0 4px 50px rgba(201,164,94,0.2), 0 2px 16px rgba(0,0,0,0.4)" }}
      >
        סעדיה יעקב דרעי
      </motion.h1>

      <motion.p
        variants={fadeUp} custom={3} initial="hidden" animate="visible"
        className="text-3xl md:text-4xl font-heading mb-10"
        style={{ color: "#C9A45E" }}
      >
        הי״ד
      </motion.p>

      {/* Date */}
      <motion.p variants={fadeUp} custom={4} initial="hidden" animate="visible" className="font-serif text-sm mb-12" style={{ color: "#B0CEBB" }}>
        י״ד בסיוון תשפ״ד · 20 ביוני 2024
      </motion.p>

      {/* Mother's quote */}
      <motion.blockquote
        variants={fadeUp} custom={5} initial="hidden" animate="visible"
        className="max-w-2xl mx-auto rounded-2xl p-7 md:p-9"
        style={{
          background: "rgba(29,46,39,0.5)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(201,164,84,0.15)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
        }}
      >
        <p className="leading-[2.2] font-serif text-base md:text-lg" style={{ color: "#F0EBE3" }}>
          "מי שיש לו 'למה' חזק, ידע להתמודד עם כל 'איך', ואני מוסיפה: גם עם כל 'איכה'. הלמה החזק שלנו מתחיל שם, בתנ״ך. זה מה שנותן לנו כוחות. וזה היה הבסיס של סעדיה."
        </p>
        <footer className="mt-4 text-sm font-display" style={{ color: "#B9A87A" }}>— מתוך דבריה של אמו, ללי</footer>
      </motion.blockquote>
    </div>

    {/* Bottom fade to content bg */}
    <div className="absolute bottom-0 inset-x-0 h-32" style={{ background: "linear-gradient(to top, #F9F7F4, transparent)" }} />
  </section>
);

export default MemorialHero;
