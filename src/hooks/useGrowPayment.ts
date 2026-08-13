import { useState, useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    growPayment: {
      init: (config: GrowConfig) => void;
      renderPaymentOptions: (authCode: string) => void;
    };
  }
}

interface GrowConfig {
  environment: "DEV" | "PRODUCTION";
  version: number;
  events: {
    onSuccess?: (response: GrowSuccessResponse) => void;
    onFailure?: (response: GrowErrorResponse) => void;
    onError?: (response: GrowErrorResponse) => void;
    onTimeout?: (response: any) => void;
    onWalletChange?: (state: "open" | "close") => void;
    onPaymentStart?: (response: any) => void;
    onPaymentCancel?: (response: any) => void;
  };
}

interface GrowSuccessResponse {
  payment_sum: string;
  full_name: string;
  payment_method: string;
  number_of_payments: string;
  confirmation_number: string;
}

interface GrowErrorResponse {
  status: number;
  message: string;
}

/**
 * Controls which "thank you" variant is shown after a successful payment.
 * Maps directly to the ?type= query param on /thank-you.
 *   store        — book / physical product purchase
 *   subscription — weekly-chapter or similar recurring subscription
 *   donation     — one-time or monthly donation
 *   cart         — generic multi-item cart checkout
 */
export type ThankYouType = "store" | "subscription" | "donation" | "cart";

export interface StartPaymentParams {
  sum: number;
  description: string;
  fullName: string;
  phone: string;
  email?: string;
  // Legacy values ('product' | 'donation') still work; new callers can also
  // send 'wallet' or 'directDebit' but the server resolves the real flow
  // from `meta.product` when present.
  type: "product" | "donation" | "wallet" | "directDebit";
  orderId?: string;
  installments?: number;
  /**
   * Which /thank-you variant to show after a successful redirect-flow payment.
   * For wallet-flow (onSuccess callback) the caller must navigate manually.
   * Defaults to "cart" if omitted.
   */
  thankYouType?: ThankYouType;
  meta?: {
    product?: string;
    session_title?: string;
    user_id?: string;
    quantity?: number;
    tos_accepted?: boolean;
    tos_accepted_at?: string;
    // Shipping (physical store products) — persisted to orders.shipping_* columns
    shipping_method?: string;
    shipping_address?: string;
    shipping_city?: string;
    shipping_zip?: string;
    // Coupon — server re-validates and enforces the math in create-payment
    coupon_code?: string;
    pre_discount_sum?: number;
    shipping_fee?: number;
  };
  donationMeta?: {
    is_monthly?: boolean;
    dedication_type?: string;
    dedication_name?: string;
    donor_email?: string;
    user_id?: string;
  };
  /** הקדשת שיעור/סדרה — השרת יוצר את שורת ה-pending ואוכף את המחיר. */
  dedicationMeta?: {
    scope: "lesson" | "series";
    lesson_id?: string;
    series_id?: string;
    dedication_type: string;
    dedicated_name: string;
    dedicator_name?: string;
    user_id?: string;
  };
}

const SDK_URL = "https://cdn.meshulam.co.il/sdk/gs.min.js";
// "PRODUCTION" loads the production Grow wallet (requires production userId + pageCodes).
// "DEV" loads the sandbox Grow wallet (matches sandbox.meshulam.co.il API).
// Switch via VITE_GROW_ENVIRONMENT env var — defaults to "DEV" so sandbox stays working.
const GROW_ENVIRONMENT = (
  import.meta.env.VITE_GROW_ENVIRONMENT || "DEV"
) as "PRODUCTION" | "DEV";

export function useGrowPayment() {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolveRef = useRef<((value: GrowSuccessResponse) => void) | null>(null);
  const rejectRef = useRef<((reason: any) => void) | null>(null);
  /** מזהה ההזמנה מהקריאה האחרונה ל-create-payment (לדף התודה — קבצים דיגיטליים) */
  const lastOrderIdRef = useRef<string | null>(null);

  // Load SDK script
  useEffect(() => {
    if (window.growPayment) {
      initSDK();
      return;
    }

    const existing = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", initSDK);
      return;
    }

    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = initSDK;
    script.onerror = () => setError("Failed to load payment SDK");
    document.head.appendChild(script);
  }, []);

  function initSDK() {
    if (!window.growPayment) {
      // SDK may initialize asynchronously — retry briefly
      let retries = 0;
      const interval = setInterval(() => {
        retries++;
        if (window.growPayment) {
          clearInterval(interval);
          doInit();
        } else if (retries > 20) {
          clearInterval(interval);
          setError("Payment SDK failed to initialize");
        }
      }, 200);
      return;
    }
    doInit();
  }

  function doInit() {
    if (!window.growPayment) return;

    window.growPayment.init({
      environment: GROW_ENVIRONMENT,
      version: 1,
      events: {
        onSuccess: (response) => {
          setIsLoading(false);
          resolveRef.current?.(response);
          resolveRef.current = null;
          rejectRef.current = null;
        },
        onFailure: (response) => {
          setIsLoading(false);
          const msg = response?.message || "Payment failed";
          setError(msg);
          rejectRef.current?.(new Error(msg));
          resolveRef.current = null;
          rejectRef.current = null;
        },
        onError: (response) => {
          setIsLoading(false);
          const msg = response?.message || "Payment error";
          setError(msg);
          rejectRef.current?.(new Error(msg));
          resolveRef.current = null;
          rejectRef.current = null;
        },
        onTimeout: () => {
          setIsLoading(false);
          setError("Payment session timed out");
          rejectRef.current?.(new Error("Payment session timed out"));
          resolveRef.current = null;
          rejectRef.current = null;
        },
        onWalletChange: (state) => {
          if (state === "close") {
            setIsLoading(false);
          }
        },
        onPaymentCancel: () => {
          setIsLoading(false);
        },
      },
    });

    setIsReady(true);
  }

  const startPayment = useCallback(
    async (params: StartPaymentParams): Promise<GrowSuccessResponse> => {
      // תיוג מקור (הוראת סער 13.8): ?src= מכתובת הכניסה נשמר לכל הסשן
      // ומוצמד לכל רכישה — כך רואים באדמין מאיזה ערוץ הגיע כל רוכש.
      let trafficSource: string | undefined;
      try {
        const qs = new URLSearchParams(window.location.search);
        const fromUrl = qs.get("src") || qs.get("utm_source");
        if (fromUrl) sessionStorage.setItem("bz_traffic_src", fromUrl.slice(0, 40));
        trafficSource = sessionStorage.getItem("bz_traffic_src") || undefined;
      } catch {
        /* sessionStorage לא זמין — ממשיכים בלי תיוג */
      }
      if (trafficSource) {
        params = { ...params, meta: { ...(params.meta ?? {}), source: trafficSource } as any };
      }
      setError(null);
      setIsLoading(true);

      try {
        // Step 1: Create payment process on our server
        const thankYouType = params.thankYouType ?? "cart";
        const response = await fetch("/api/grow/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...params,
            successUrl: `${window.location.origin}/thank-you?type=${thankYouType}`,
            cancelUrl: window.location.href,
          }),
        });

        const data = await response.json();

        if (!response.ok || (!data.authCode && !data.url)) {
          throw new Error(data.error || "Failed to create payment");
        }

        // רמה 17: מזהה ההזמנה נשמר כדי שדף התודה יוכל למשוך קבצים דיגיטליים
        lastOrderIdRef.current = data.orderId ?? null;

        // Step 2a: Wallet flow (products) — open SDK overlay
        if (data.authCode) {
          return new Promise<GrowSuccessResponse>((resolve, reject) => {
            resolveRef.current = resolve;
            rejectRef.current = reject;
            window.growPayment.renderPaymentOptions(data.authCode);
          });
        }

        // Step 2b: Redirect flow (donations/direct debit) — navigate current tab
        // Cannot use window.open from async callback (popup blocker).
        // Grow will redirect back to successUrl after payment.
        window.location.href = data.url;
        // Return never resolves — page navigates away
        return new Promise<GrowSuccessResponse>(() => {});
      } catch (err: any) {
        setIsLoading(false);
        setError(err.message);
        throw err;
      }
    },
    []
  );

  return { startPayment, isReady, isLoading, error, setError, lastOrderIdRef };
}
