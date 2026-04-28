/**
 * Format a rabbi's display name without double-prefixing the title.
 *
 * Some rows in the `rabbis` table store the full name in `name`
 * (e.g. "הרב יונדב זר") while also setting `title = "הרב"`. The naive
 * concatenation `${title} ${name}` produces "הרב הרב יונדב זר", and
 * variants without spacing render as "הרבהרב …".
 *
 * Rule:
 *  - if `name` already starts with `title` (with or without a space),
 *    just return `name`
 *  - otherwise return "${title} ${name}"
 *  - if `title` is empty/null, return `name`
 */
export function formatRabbiName(rabbi: {
  name?: string | null;
  title?: string | null;
} | null | undefined): string {
  if (!rabbi) return "";
  const name = (rabbi.name ?? "").trim();
  const title = (rabbi.title ?? "").trim();
  if (!title) return name;
  if (!name) return title;
  // Already starts with title — don't double-prefix
  if (name === title || name.startsWith(`${title} `) || name.startsWith(title)) {
    return name;
  }
  return `${title} ${name}`;
}
