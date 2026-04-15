import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children?: ReactNode;
}

export default function PageHero({ title, subtitle, icon, children }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden py-10 md:py-14">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2D1F0E] via-[#3D2A12] to-[#2D1F0E]" />

      <div className="container relative z-10 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-4xl font-heading text-white hero-text-shadow mb-1"
        >
          {icon && <span className="inline-block ml-2 align-middle">{icon}</span>}
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-sm md:text-base text-white/75 max-w-xl mx-auto"
          >
            {subtitle}
          </motion.p>
        )}
        {children}
      </div>
    </section>
  );
}
