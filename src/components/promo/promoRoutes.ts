/**
 * T09 promo system — route suppression rules.
 *
 * "Popups off by default in the middle of a purchase or a lesson."
 * A quiet top banner and the conference strip are still allowed everywhere;
 * only the modal *popup* is gated by these lists.
 *
 * Route facts taken from src/App.tsx (T09 does not own App.tsx — this list
 * is a read-only mirror; if routes change, update here). Prefix-matched.
 */

/** Product / purchase pages — a popup must never cover a checkout flow. */
export const PRODUCT_ROUTE_PREFIXES = [
  "/store", // StorePage + /store/:slug ProductPage
  "/product", // future-proof alias
  "/course", // /course/:slug book detail, /course/weekly-chapter
  "/courses", // legacy redirect
  "/design-my-courses",
  "/checkout",
  "/community", // paid community courses
] as const;

/** Learning pages — a popup must never interrupt a lesson or the player. */
export const LEARNING_ROUTE_PREFIXES = [
  "/lessons", // LessonPage (/lessons/:id)
  "/lesson", // singular alias
  "/portal", // subscriber learning portal (+ /portal-old, /portal/course/:id)
  "/program", // /program/weekly-chapter library
  "/chapter-weekly", // weekly chapter learning
  "/teachers/lesson", // teachers wing lesson player
] as const;

/**
 * Surfaces where NO promo of any kind should appear (admin, auth, sandbox).
 * Keeps the injection clean of chrome that has its own layout.
 */
export const PROMO_BLOCKED_PREFIXES = [
  "/admin",
  "/auth",
  "/portal-login",
  "/design-", // sandbox design-* preview routes
  "/dev-pages",
] as const;

const startsWithAny = (pathname: string, prefixes: readonly string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(p));

export const isProductRoute = (pathname: string) =>
  startsWithAny(pathname, PRODUCT_ROUTE_PREFIXES);

export const isLearningRoute = (pathname: string) =>
  startsWithAny(pathname, LEARNING_ROUTE_PREFIXES);

/** All promos (banner + popup + strip) are hidden on these routes entirely. */
export const isPromoBlockedRoute = (pathname: string) =>
  startsWithAny(pathname, PROMO_BLOCKED_PREFIXES);
