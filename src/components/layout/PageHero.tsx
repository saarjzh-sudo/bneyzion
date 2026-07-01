import { motion } from "framer-motion";
import { type ReactNode } from "react";
import { colors, fonts, radii } from "@/lib/designTokens";

/**
 * PageHero — the single, shared page hero for all non-home pages.
 *
 * T10 (2026-07-01): rewritten from the old dark-brown gradient
 * (`#2D1F0E → #3D2A12`, felt gloomy) to a light warm-cream band that
 * matches the redesign token language (see `designTokens.ts`). One solid
 * component that every page consumes, with variants that give each page
 * type its own visual identity.
 *
 * Variants:
 *  - `default` / `page` — centered, gold diamond divider. Library, About,
 *    Terms, Rabbis list, History, Favorites…
 *  - `category` — a **collection** header: start-aligned (RTL), airy, big
 *    decorative arc, "אוסף" eyebrow. For `/category/:id`.
 *  - `series` — a **focused learning path**: a gold spine on the inline
 *    start, "סדרת לימוד" eyebrow, tighter column. For `/series/:id`.
 *
 * Accessibility: title uses solid `textDark` on cream (AA+ contrast); gold
 * is reserved for the eyebrow / divider / icon accents. Decorative shapes
 * are `aria-hidden`.
 *
 * Backward-compatible: `title` is optional. When absent, children render
 * as a plain passthrough (used by ThankYou as a full-page wrapper).
 */

type PageHeroVariant = "default" | "page" | "category" | "series";

interface PageHeroProps {
  title?: string;
  subtitle?: string;
  /** Small label above the title (e.g. "אוסף", "סדרת לימוד"). */
  eyebrow?: string;
  icon?: ReactNode;
  variant?: PageHeroVariant;
  /** Meta row rendered under the subtitle — badges, counts, rabbi chip. */
  meta?: ReactNode;
  children?: ReactNode;
}

const CREAM_BG = "linear-gradient(160deg, #FBF6EC 0%, #F5EFE0 60%, #EDE5D0 100%)";

const MOBILE_STYLE = `
  @media (max-width: 767px) {
    .page-hero { padding: 2.25rem 1.25rem 1.9rem !important; }
    .page-hero--series { padding-inline-start: 1.6rem !important; }
  }
`;

export default function PageHero({
  title,
  subtitle,
  eyebrow,
  icon,
  variant = "default",
  meta,
  children,
}: PageHeroProps) {
  // Passthrough mode: legacy wrapper usage with no title.
  if (!title) {
    return <>{children}</>;
  }

  const isCategory = variant === "category";
  const isSeries = variant === "series";
  const align: "center" | "start" = isCategory || isSeries ? "start" : "center";
  const defaultEyebrow = isCategory ? "אוסף" : isSeries ? "סדרת לימוד" : undefined;
  const shownEyebrow = eyebrow ?? defaultEyebrow;

  return (
    <>
      <style>{MOBILE_STYLE}</style>
      <section
        dir="rtl"
        className={`page-hero${isSeries ? " page-hero--series" : ""}`}
        style={{
          position: "relative",
          overflow: "hidden",
          background: CREAM_BG,
          borderBottom: "1px solid rgba(139,111,71,0.12)",
          padding: isSeries
            ? "2.75rem 2rem 2.4rem 2.6rem"
            : "2.9rem 2rem 2.5rem",
          textAlign: align,
        }}
      >
        {/* Decorative arc — expansive feel for collections (category / default) */}
        {!isSeries && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              insetInlineEnd: "-60px",
              top: "-80px",
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: "rgba(196,162,101,0.07)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Gold spine — the "path" motif that marks a single series */}
        {isSeries && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              insetInlineStart: 0,
              top: "18%",
              bottom: "18%",
              width: 4,
              borderRadius: radii.pill,
              background: `linear-gradient(180deg, ${colors.goldLight}, ${colors.goldDark})`,
              pointerEvents: "none",
            }}
          />
        )}

        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: isSeries ? 760 : isCategory ? 1000 : 720,
            margin: align === "center" ? "0 auto" : "0 auto 0 0",
            marginInline: align === "center" ? "auto" : undefined,
          }}
        >
          {/* Eyebrow */}
          {shownEyebrow && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                fontFamily: fonts.body,
                fontSize: "0.72rem",
                letterSpacing: "0.16em",
                fontWeight: 700,
                color: colors.goldDark,
                marginBottom: "0.7rem",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  background: colors.goldLight,
                  transform: "rotate(45deg)",
                  display: "inline-block",
                }}
              />
              {shownEyebrow}
            </motion.div>
          )}

          {/* Centered gold diamond divider — only on the plain/default variant */}
          {!shownEyebrow && !isCategory && !isSeries && (
            <div
              aria-hidden
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                justifyContent: "center",
                marginBottom: "0.85rem",
              }}
            >
              <div style={{ width: 40, height: 1, background: "rgba(196,162,101,0.45)" }} />
              <div style={{ width: 6, height: 6, background: colors.goldLight, transform: "rotate(45deg)" }} />
              <div style={{ width: 40, height: 1, background: "rgba(196,162,101,0.45)" }} />
            </div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: isSeries
                ? "clamp(1.7rem, 3.6vw, 2.5rem)"
                : "clamp(1.6rem, 4vw, 2.5rem)",
              lineHeight: 1.2,
              margin: 0,
              color: colors.textDark,
            }}
          >
            {icon && (
              <span
                aria-hidden
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  marginInlineEnd: "0.5rem",
                  color: colors.goldDark,
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.45 }}
              style={{
                fontFamily: fonts.body,
                fontSize: "0.98rem",
                lineHeight: 1.7,
                color: colors.textMuted,
                maxWidth: 620,
                margin: align === "center" ? "0.7rem auto 0" : "0.7rem 0 0",
              }}
            >
              {subtitle}
            </motion.p>
          )}

          {meta && <div style={{ marginTop: "1rem" }}>{meta}</div>}

          {children && <div style={{ marginTop: "1.25rem" }}>{children}</div>}
        </div>

        {/* Bottom fade — blends into the next section */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 0,
            insetInline: 0,
            height: 20,
            background: `linear-gradient(180deg, transparent, ${colors.parchment})`,
            pointerEvents: "none",
          }}
        />
      </section>
    </>
  );
}
