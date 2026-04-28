/**
 * DesignPageHero — sandbox page-hero for the v2 redesign.
 *
 * Replaces the current `PageHero` (static dark gradient) with 4 variants
 * pulled from `designTokens.heroVariants`:
 *  - parchment: light cream + gold (default for most pages)
 *  - mahogany: warm storytelling dark (lessons, series detail)
 *  - navy: solemn (memorial, dor haplaot)
 *  - olive: gathering (community, knes)
 *
 * Optional props:
 *  - eyebrow: small label above title (e.g. "סדרת רב יואב אוריאל")
 *  - title: H1
 *  - subtitle: short paragraph
 *  - icon: lucide icon shown beside the title
 *  - imageSrc: optional bg image (composited under gradient overlay)
 *  - children: CTAs / extra content rendered under the subtitle
 *  - compact: smaller padding for tight pages
 */
import { type ReactNode } from "react";
import { motion } from "framer-motion";

import { fonts, colors, heroVariants, type HeroVariant } from "@/lib/designTokens";

interface DesignPageHeroProps {
  variant?: HeroVariant;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  imageSrc?: string;
  children?: ReactNode;
  compact?: boolean;
}

export default function DesignPageHero({
  variant = "parchment",
  eyebrow,
  title,
  subtitle,
  icon,
  imageSrc,
  children,
  compact = false,
}: DesignPageHeroProps) {
  const v = heroVariants[variant];
  const isDark = variant !== "parchment";

  return (
    <section
      dir="rtl"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: compact ? "3rem 1.5rem 2.5rem" : "5rem 1.5rem 4rem",
        background: v.background,
        color: v.textColor,
      }}
    >
      {/* Background image (under everything) */}
      {imageSrc && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${imageSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: isDark ? 0.35 : 0.12,
            filter: isDark ? "brightness(0.55)" : "saturate(0.85)",
          }}
        />
      )}

      {/* Vignette overlay (only on dark variants) */}
      {isDark && v.overlay !== "none" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: v.overlay,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Subtle grain on light variant */}
      {!isDark && (
        <svg
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.025,
            pointerEvents: "none",
          }}
          width="100%"
          height="100%"
          aria-hidden
        >
          <filter id="hero-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hero-grain)" />
        </svg>
      )}

      {/* Content */}
      <div
        style={{
          position: "relative",
          maxWidth: 960,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {eyebrow && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              fontFamily: fonts.body,
              fontSize: "0.78rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: v.accentColor,
              fontWeight: 700,
              marginBottom: "0.75rem",
            }}
          >
            {eyebrow}
          </motion.div>
        )}

        {/* Gold-divider above title (only when no eyebrow, to keep hierarchy clean) */}
        {!eyebrow && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            <div style={{ width: 40, height: 1, background: v.dividerColor }} />
            <div
              style={{
                width: 6,
                height: 6,
                background: v.accentColor,
                transform: "rotate(45deg)",
              }}
            />
            <div style={{ width: 40, height: 1, background: v.dividerColor }} />
          </div>
        )}

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: compact ? "clamp(1.6rem, 3.4vw, 2.4rem)" : "clamp(2rem, 4.5vw, 3.2rem)",
            lineHeight: 1.2,
            margin: 0,
            color: v.textColor,
            textShadow: isDark ? "0 2px 16px rgba(0,0,0,0.45)" : "none",
            fontStyle: isDark ? "italic" : "normal",
          }}
        >
          {icon && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                marginInlineEnd: "0.5rem",
                color: v.accentColor,
                verticalAlign: "middle",
              }}
            >
              {icon}
            </span>
          )}
          {title}
        </motion.h1>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            style={{
              fontFamily: fonts.body,
              fontSize: compact ? "0.95rem" : "1.05rem",
              lineHeight: 1.7,
              color: v.subtleColor,
              maxWidth: 680,
              margin: "1rem auto 0",
            }}
          >
            {subtitle}
          </motion.p>
        )}

        {children && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{ marginTop: "1.5rem" }}
          >
            {children}
          </motion.div>
        )}
      </div>

      {/* Bottom fade — only on parchment, to blend into next section */}
      {!isDark && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 24,
            background: `linear-gradient(180deg, transparent, ${colors.parchment})`,
            pointerEvents: "none",
          }}
        />
      )}
    </section>
  );
}
