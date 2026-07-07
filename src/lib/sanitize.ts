import DOMPurify from "dompurify";

/**
 * Strip biblical cantillation marks (טעמי המקרא / te'amim) plus meteg & rafe.
 *
 * Why: our display fonts (Ploni / Kedem / Paamon) have no glyphs for the
 * cantillation block (U+0591–U+05AF) nor for meteg (U+05BD) / rafe (U+05BF),
 * so verses stored WITH them render every such accent as a missing-glyph box
 * (□) — on screen and, glaringly, in the print bulletin. Combining marks must
 * share their base letter's font to compose, so a per-glyph font fallback
 * can't fix it. Removing these (keeping every nikud point, shin/sin dots,
 * maqaf, paseq and sof-pasuq) is the standard for a nikud bulletin and makes
 * Ploni render cleanly. Display-only — the DB content is untouched.
 *
 * Kept on purpose: U+05B0–05BC nikud, U+05BE maqaf, U+05C0 paseq,
 * U+05C1/05C2 shin-sin dots, U+05C3 sof-pasuq — Ploni renders all correctly.
 */
export function stripCantillation(text: string): string {
  return text.replace(/[֑-ֽֿׅ֯ׄ]/g, "");
}

export function sanitizeHtml(dirty: string): string {
  const clean = DOMPurify.sanitize(dirty, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "target"],
  });
  return stripCantillation(clean);
}
