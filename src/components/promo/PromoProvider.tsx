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
import PromoConferenceStrip from "./PromoConferenceStrip";
import PromoPopup from "./PromoPopup";
import { usePromos, isWithinSchedule, matchesAudience } from "./usePromos";
import { shouldShowPromo, markPromoDismissed } from "./promoDismissal";
import { isProductRoute, isLearningRoute, isPromoBlockedRoute } from "./promoRoutes";
import { pageTypeFromPath, useVisitorAudiences, matchesTargeting } from "./targeting";
import type { Promo } from "./types";

/** Delay before a popup appears, so it never slams on first paint.
 *  יואב 17.7: ניתן להגדרה פר-פופאפ באדמין (popup_delay_seconds, ברירת-מחדל 3ש'). */
const POPUP_DELAY_MS_DEFAULT = 3000;

const PromoProvider = () => {
  const { pathname } = useLocation();
  const { data: promos } = usePromos();
  const visitorTags = useMemo<string[]>(() => [], []);
  // טרגוט חכם (8.7): סוגי-דפים + סוגי-גולשים מהאדמין
  const visitorAudiences = useVisitorAudiences();

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [popupReady, setPopupReady] = useState(false);

  const dismiss = (promo: Promo) => {
    markPromoDismissed(promo, Date.now());
    setDismissedIds((prev) => new Set(prev).add(promo.id));
  };

  const { conference, popup } = useMemo(() => {
    // באנרים לא מרונדרים כאן יותר — הם משולבים בזרימת העמוד דרך ImageBannerSlot.
    const empty = { conference: null as Promo | null, popup: null as Promo | null };
    if (!promos || isPromoBlockedRoute(pathname)) return empty;

    const now = Date.now();
    const onProduct = isProductRoute(pathname);
    const onLearning = isLearningRoute(pathname);
    const pageType = pageTypeFromPath(pathname);

    // eligible = active + scheduled + targeted + not frequency-capped + not just-dismissed
    const eligible = promos.filter(
      (p) =>
        !dismissedIds.has(p.id) &&
        isWithinSchedule(p, now) &&
        matchesAudience(p, visitorTags) &&
        matchesTargeting(p, pageType, visitorAudiences) &&
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

    return { conference: pick("conference"), popup: popupPick };
  }, [promos, pathname, dismissedIds, visitorTags, visitorAudiences]);

  // Reset the popup delay on every route change; duration = per-popup setting.
  const popupDelayMs =
    popup?.popup_delay_seconds != null ? popup.popup_delay_seconds * 1000 : POPUP_DELAY_MS_DEFAULT;
  useEffect(() => {
    setPopupReady(false);
    const t = window.setTimeout(() => setPopupReady(true), popupDelayMs);
    return () => window.clearTimeout(t);
  }, [pathname, popup?.id, popupDelayMs]);

  if (!conference && !popup) return null;

  return (
    <>
      {conference && <PromoConferenceStrip promo={conference} onDismiss={dismiss} />}
      {popup && popupReady && <PromoPopup promo={popup} onDismiss={dismiss} />}
    </>
  );
};

export default PromoProvider;
