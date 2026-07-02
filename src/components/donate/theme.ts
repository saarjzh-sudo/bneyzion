/**
 * Donate page design system — a disciplined, editorial token set.
 *
 * Restraint over decoration: one warm ink, one warm paper, ONE gold accent.
 * No multi-stop gold gradients, no teal glows. Dramatic type-scale contrast,
 * hairline borders, custom easing. Shared by the page + the form so the whole
 * experience reads as one considered system.
 */
import { fonts } from "@/lib/designTokens";

export { fonts };

// ── Color — warm, owned, restrained ─────────────────────────
export const C = {
  ink: "#1A150E",          // warm near-black (never pure #000)
  ink80: "rgba(26,21,14,0.82)",
  ink62: "rgba(26,21,14,0.62)",
  ink42: "rgba(26,21,14,0.42)",
  line: "rgba(26,21,14,0.13)",
  lineSoft: "rgba(26,21,14,0.07)",

  cream: "#F5EFE3",        // warm off-white page (never pure #fff)
  creamDeep: "#ECE3D2",
  paper: "#FCFAF3",        // card surface

  gold: "#A9843F",         // single refined accent (matte, not shiny)
  goldDeep: "#856530",
  goldTint: "rgba(169,132,63,0.09)",

  onDark: "#F5EFE3",
  onDark72: "rgba(245,239,227,0.74)",
  onDark45: "rgba(245,239,227,0.48)",
} as const;

// ── Custom easing (never default ease/linear) ───────────────
export const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";     // expo out
export const EASE_IO = "cubic-bezier(0.87, 0, 0.13, 1)"; // expo in-out
