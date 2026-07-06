/**
 * consent.ts — single source of truth for cookie-consent state.
 *
 * Compliance layer (2026-07-06). Two categories only, kept intentionally
 * simple for a content/learning site:
 *  - "necessary"  — always on (session, auth, cart). Never gated.
 *  - "marketing"  — third-party pixels/analytics (currently: Meta/Facebook
 *    pixel on ThankYou.tsx). Gated behind explicit user consent.
 *
 * Storage: localStorage (no cookie needed for the choice itself — avoids
 * the irony of a "cookie banner" cookie). Key versioned so we can force
 * re-consent later if the policy changes materially.
 *
 * Usage:
 *   import { getConsent, setConsent, hasMarketingConsent, onConsentChange } from "@/lib/consent";
 */

const STORAGE_KEY = "bnz.consent.v1";

export type ConsentChoice = "accepted_all" | "necessary_only";

export interface ConsentState {
  choice: ConsentChoice;
  marketing: boolean;
  necessary: true;
  decidedAt: string; // ISO timestamp
}

const CONSENT_EVENT = "bnz:consent-changed";

/** Read the current consent decision. Returns null if the user hasn't decided yet. */
export function getConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (!parsed || (parsed.choice !== "accepted_all" && parsed.choice !== "necessary_only")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Persist a consent decision and notify listeners (same-tab + cross-tab). */
export function setConsent(choice: ConsentChoice): ConsentState {
  const state: ConsentState = {
    choice,
    marketing: choice === "accepted_all",
    necessary: true,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private mode / quota) — consent simply
    // won't persist across reloads; banner will show again. Not fatal.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
  return state;
}

/** True only when the user actively accepted marketing/analytics cookies. */
export function hasMarketingConsent(): boolean {
  return getConsent()?.marketing === true;
}

/** True when the user has made ANY choice (used to decide whether to show the banner). */
export function hasDecided(): boolean {
  return getConsent() !== null;
}

/** Reset the decision — used by "cookie preferences" links (footer / accessibility page). */
export function clearConsent(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
}

/** Subscribe to consent changes (same-tab custom event + cross-tab storage event). */
export function onConsentChange(cb: (state: ConsentState | null) => void): () => void {
  const handleCustom = (e: Event) => {
    cb((e as CustomEvent<ConsentState | null>).detail ?? null);
  };
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb(getConsent());
  };
  window.addEventListener(CONSENT_EVENT, handleCustom);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CONSENT_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}
