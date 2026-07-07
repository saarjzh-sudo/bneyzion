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

/**
 * True when a lesson's `description` is really just the copied opening of its
 * `content` (a migration artifact on written articles — the "promo" h2 was
 * scraped as the first paragraph of the body). Such a promo must NOT be
 * rendered above the article, or the reader sees the opening twice.
 * (הרב יואב, הערה ד' 7.7.2026). Display-only; DB untouched.
 */
export function isDuplicatePromo(description: string | null | undefined, contentHtml: string | null | undefined): boolean {
  if (!description || !contentHtml) return false;
  const norm = (s: string) =>
    s
      .replace(/<[^>]+>/g, " ") // strip tags
      .replace(/[֑-ׇ"'׳״“”„…\-–—.,:;!?()\[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const d = norm(description);
  if (d.length < 40) return false; // short blurbs are legit promos
  const probe = d.slice(0, Math.min(200, d.length));
  const head = norm(contentHtml).slice(0, d.length + 300);
  return head.includes(probe);
}

export function sanitizeHtml(dirty: string): string {
  const clean = DOMPurify.sanitize(dirty, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "target"],
  });
  return stripCantillation(clean);
}
