/**
 * T09 promo system — public surface.
 * Layout.tsx injects <PromoProvider /> once; everything else is internal.
 */
export { default as PromoProvider } from "./PromoProvider";
export type { Promo, PromoType, PromoFrequency, PromoTheme } from "./types";
