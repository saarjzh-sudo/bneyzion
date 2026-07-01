/**
 * T09 promo system — re-appearance cap (frequency control).
 *
 * A dismissed promo should not nag the visitor. We persist a small record
 * per promo id and honour the promo's `frequency` on the next visit.
 *
 *   'always'  → never remembered (shows every load)
 *   'session' → remembered for the browser session (sessionStorage)
 *   'once'    → remembered forever (localStorage)
 *   'daily'   → remembered until the next calendar day (localStorage + date)
 *
 * All access is wrapped in try/catch so privacy modes that throw on storage
 * access degrade to "just show it" rather than crashing the site.
 */
import type { Promo, PromoFrequency } from "./types";

const KEY = "bz_promo_dismissed_v1";

type DismissRecord = Record<string, string>; // promoId -> ISO timestamp

function readStore(storage: Storage): DismissRecord {
  try {
    const raw = storage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DismissRecord) : {};
  } catch {
    return {};
  }
}

function writeStore(storage: Storage, rec: DismissRecord) {
  try {
    storage.setItem(KEY, JSON.stringify(rec));
  } catch {
    /* storage blocked (private mode / quota) — ignore */
  }
}

function sameCalendarDay(iso: string, nowMs: number): boolean {
  const then = new Date(iso);
  const now = new Date(nowMs);
  return (
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate()
  );
}

/** Should this promo be shown, given its frequency and past dismissals? */
export function shouldShowPromo(promo: Promo, nowMs: number): boolean {
  if (promo.frequency === "always") return true;
  if (typeof window === "undefined") return true;

  const storage: Storage =
    promo.frequency === "session" ? window.sessionStorage : window.localStorage;
  const rec = readStore(storage);
  const dismissedAt = rec[promo.id];
  if (!dismissedAt) return true;

  if (promo.frequency === "daily") {
    // shown again once the stored dismissal is from an earlier day
    return !sameCalendarDay(dismissedAt, nowMs);
  }

  // 'session' and 'once' — any record means "don't show again"
  return false;
}

/** Record a dismissal so the frequency cap applies next time. */
export function markPromoDismissed(promo: Promo, nowMs: number): void {
  if (promo.frequency === "always" || typeof window === "undefined") return;

  const storage: Storage =
    promo.frequency === "session" ? window.sessionStorage : window.localStorage;
  const rec = readStore(storage);
  rec[promo.id] = new Date(nowMs).toISOString();
  writeStore(storage, rec);
}

export type { PromoFrequency };
