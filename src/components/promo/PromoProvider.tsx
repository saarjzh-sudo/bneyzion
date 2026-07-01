/**
 * PromoProvider — the single orchestrator, injected once in Layout.tsx.
 *
 * Responsibilities:
 *   1. Read the current route (useLocation).
 *   2. Fetch active promos (real Supabase data; fails soft to []).
 *   3. Apply scheduling window, audience targeting and frequency caps.
 *   4. Pick at most one of each surface: banner, conference strip, popup.
 *   5. SUPPRESS popups by default on product + learning routes.
 *
 * Banners and the conference strip are quiet (flow above the header) and are
 * allowed everywhere except fully-blocked routes (admin/auth/sandbox).
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PromoBanner from "./PromoBanner";
import PromoConferenceStrip from "./PromoConferenceStrip";
import PromoPopup from "./PromoPopup";
import { usePromos, isWithinSchedule, matchesAudience } from "./usePromos";
import { shouldShowPromo, markPromoDismissed } from "./promoDismissal";
import { isProductRoute, isLearningRoute, isPromoBlockedRoute } from "./promoRoutes";
import type { Promo } from "./types";

/** Delay before a popup appears, so it never slams on first paint. */
const POPUP_DELAY_MS = 1500;

/**
 * Visitor audience tags for targeting. Untargeted promos (empty audience_tags)
 * always match. Richer targeting (e.g. 'weekly-learners' from the auth/profile
 * layer, owned by T06) can be fed in here later — see _DONE.md.
 */
function useVisitorAudience(): string[] {
  return useMemo(() => [], []);
}

const PromoProvider = () => {
  const { pathname } = useLocation();
  const { data: promos } = usePromos();
  const visitorTags = useVisitorAudience();

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [popupReady, setPopupReady] = useState(false);

  // Reset the popup delay on every route change.
  useEffect(() => {
    setPopupReady(false);
    const t = window.setTimeout(() => setPopupReady(true), POPUP_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const dismiss = (promo: Promo) => {
    markPromoDismissed(promo, Date.now());
    setDismissedIds((prev) => new Set(prev).add(promo.id));
  };

  const { banner, conference, popup } = useMemo(() => {
    const empty = { banner: null as Promo | null, conference: null as Promo | null, popup: null as Promo | null };
    if (!promos || isPromoBlockedRoute(pathname)) return empty;

    const now = Date.now();
    const onProduct = isProductRoute(pathname);
    const onLearning = isLearningRoute(pathname);

    // eligible = active + scheduled + targeted + not frequency-capped + not just-dismissed
    const eligible = promos.filter(
      (p) =>
        !dismissedIds.has(p.id) &&
        isWithinSchedule(p, now) &&
        matchesAudience(p, visitorTags) &&
        shouldShowPromo(p, now),
    );

    // highest priority is first (query already ordered, but be explicit)
    const byPriority = (a: Promo, b: Promo) => b.priority - a.priority;

    const pick = (type: Promo["type"]) =>
      eligible.filter((p) => p.type === type).sort(byPriority)[0] ?? null;

    let popupPick = pick("popup");
    // Default-OFF safety: no popup over a purchase or a lesson.
    if (popupPick) {
      if (onProduct && popupPick.suppress_on_product) popupPick = null;
      else if (onLearning && popupPick.suppress_on_learning) popupPick = null;
    }

    return { banner: pick("banner"), conference: pick("conference"), popup: popupPick };
  }, [promos, pathname, dismissedIds, visitorTags]);

  if (!banner && !conference && !popup) return null;

  return (
    <>
      {banner && <PromoBanner promo={banner} onDismiss={dismiss} />}
      {conference && <PromoConferenceStrip promo={conference} onDismiss={dismiss} />}
      {popup && popupReady && <PromoPopup promo={popup} onDismiss={dismiss} />}
    </>
  );
};

export default PromoProvider;
