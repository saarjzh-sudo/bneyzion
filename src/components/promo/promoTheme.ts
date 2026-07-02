/**
 * T09 promo system — theme → design-token mapping.
 * Keeps the promo surfaces in the site's visual language (gold / olive / navy),
 * no ad-hoc hex codes.
 */
import { colors, gradients, fonts } from "@/lib/designTokens";
import type { PromoTheme } from "./types";

export interface PromoPalette {
  surface: string; // background of the strip / accent
  onSurface: string; // text over the surface
  subtle: string; // secondary text over the surface
  ctaBg: string; // CTA button background
  ctaText: string; // CTA button text
  ring: string; // focus ring colour
}

export const promoPalette: Record<PromoTheme, PromoPalette> = {
  gold: {
    surface: gradients.goldButton,
    onSurface: "#fff",
    subtle: "rgba(255,255,255,0.85)",
    ctaBg: "#fff",
    ctaText: colors.goldDeep,
    ring: colors.goldShimmer,
  },
  olive: {
    surface: gradients.oliveButton,
    onSurface: "#fff",
    subtle: "rgba(255,255,255,0.85)",
    ctaBg: "#fff",
    ctaText: colors.oliveDark,
    ring: colors.goldShimmer,
  },
  navy: {
    surface: gradients.navyHero,
    onSurface: "#fff",
    subtle: "rgba(255,255,255,0.75)",
    ctaBg: colors.goldLight,
    ctaText: colors.textDark,
    ring: colors.goldShimmer,
  },
};

export const promoFonts = fonts;
