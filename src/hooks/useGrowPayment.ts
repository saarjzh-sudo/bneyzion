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
  meta?: {
    product?: string;
    session_title?: string;
    user_id?: string;
    quantity?: number;
    tos_accepted?: boolean;
    tos_accepted_at?: string;
  };
  donationMeta?: {
    is_monthly?: boolean;
    dedication_type?: string;
    dedication_name?: string;
    donor_email?: string;
    user_id?: string;
  };
}

const SDK_URL = "https://cdn.meshulam.co.il/sdk/gs.min.js";

// Both production and sandbox post messages from these origins to the parent
// window. We accept either so test transactions in sandbox work too.
const GROW_TRUSTED_ORIGINS = new Set([
  "https://meshulam.co.il",
  "https://www.meshulam.co.il",
  "https://sandbox.meshulam.co.il",
  "https://pay.grow.link",
]);

// ───────────────────────── Iframe overlay (HOK / redirect flow) ─────────────────────────
// Grow's standard payment flow returns a `url` instead of `authCode`. Per the
// official Grow docs at https://grow-il.readme.io/reference/postmassage,
// that url can be embedded in an iframe and the inner frame posts these
// messages back via window.postMessage:
//   { action: 'close' } — user dismissed
//   { action: 'payment', status: 1 } — payment succeeded
//   { action: 'payment', status: 0 } — payment failed
//   { action: 'failed_to_load_page' } — error loading checkout
//
// We mount a fullscreen-iframe + postMessage listener so the user never
// leaves bnei zion. resolves/rejects the Promise from startPayment so the
// caller's try/catch works the same as the SDK overlay flow.

interface IframeOverlayHandlers {
  onSuccess: (data: any) => void;
  onCancel: () => void;
  onFailure: (msg: string) => void;
}

function openIframeOverlay(url: string, handlers: IframeOverlayHandlers) {
  // Build the overlay
  const overlay = document.createElement("div");
  overlay.setAttribute("data-grow-iframe-overlay", "true");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(0,0,0,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "9999",
    padding: "16px",
    backdropFilter: "blur(4px)",
  } as CSSStyleDeclaration);

  // Wrapper makes a phone-sized white card
  const card = document.createElement("div");
  Object.assign(card.style, {
    position: "relative",
    background: "white",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "520px",
    height: "min(90vh, 720px)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    overflow: "hidden",
  } as CSSStyleDeclaration);

  // Close button — Saar wanted users to be able to dismiss
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "סגור חלון תשלום");
  closeBtn.innerHTML = "&times;";
  Object.assign(closeBtn.style, {
    position: "absolute",
    top: "8px",
    right: "8px",
    width: "32px",
    height: "32px",
    border: "none",
    background: "rgba(255,255,255,0.95)",
    borderRadius: "50%",
    fontSize: "22px",
    lineHeight: "30px",
    cursor: "pointer",
    zIndex: "1",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  } as CSSStyleDeclaration);

  const iframe = document.createElement("iframe");
  iframe.src = url;
  iframe.title = "תשלום מאובטח דרך Grow";
  iframe.allow = "payment";
  Object.assign(iframe.style, {
    width: "100%",
    height: "100%",
    border: "none",
    display: "block",
  } as CSSStyleDeclaration);

  card.appendChild(closeBtn);
  card.appendChild(iframe);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Lock background scroll while modal is open
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  let settled = false;
  const cleanup = () => {
    if (settled) return;
    settled = true;
    window.removeEventListener("message", onMessage);
    document.body.style.overflow = previousOverflow;
    overlay.remove();
  };

  const onMessage = (event: MessageEvent) => {
    if (!GROW_TRUSTED_ORIGINS.has(event.origin)) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    switch (data.action) {
      case "close": {
        cleanup();
        handlers.onCancel();
        break;
      }
      case "payment": {
        const status = Number(data.status ?? 0);
        if (status === 1) {
          cleanup();
          handlers.onSuccess(data);
        } else {
          cleanup();
          handlers.onFailure(data.message || "התשלום נכשל");
        }
        break;
      }
      case "failed_to_load_page": {
        cleanup();
        handlers.onFailure("שגיאה בטעינת דף התשלום");
        break;
      }
    }
  };
  window.addEventListener("message", onMessage);

  closeBtn.addEventListener("click", () => {
    cleanup();
    handlers.onCancel();
  });

  // ESC also closes
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      cleanup();
      handlers.onCancel();
      window.removeEventListener("keydown", onKey);
    }
  };
  window.addEventListener("keydown", onKey);
}

// ───────────────────────────── React hook ─────────────────────────────

export function useGrowPayment() {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolveRef = useRef<((value: GrowSuccessResponse) => void) | null>(null);
  const rejectRef = useRef<((reason: any) => void) | null>(null);

  // Load SDK script (still needed for the wallet/authCode flow used by books)
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
      environment: "DEV",
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
      setError(null);
      setIsLoading(true);

      try {
        // Step 1: Create payment process on our server
        const response = await fetch("/api/grow/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...params,
            successUrl: `${window.location.origin}/thank-you`,
            cancelUrl: window.location.href,
          }),
        });

        const data = await response.json();

        if (!response.ok || (!data.authCode && !data.url)) {
          throw new Error(data.error || "Failed to create payment");
        }

        // Step 2a: Wallet flow (products / books) — open SDK overlay
        if (data.authCode) {
          return new Promise<GrowSuccessResponse>((resolve, reject) => {
            resolveRef.current = resolve;
            rejectRef.current = reject;
            window.growPayment.renderPaymentOptions(data.authCode);
          });
        }

        // Step 2b: HOK / standard flow — open URL in an iframe modal so the
        // user never leaves bnei zion. Communicate via postMessage per Grow's
        // official iframe docs.
        return new Promise<GrowSuccessResponse>((resolve, reject) => {
          openIframeOverlay(data.url, {
            onSuccess: (msg) => {
              setIsLoading(false);
              // Grow's postMessage payload differs from the SDK's onSuccess
              // payload — synthesise a comparable shape for callers.
              resolve({
                payment_sum: String(msg.sum ?? params.sum ?? ""),
                full_name: params.fullName,
                payment_method: msg.payment_method || "credit",
                number_of_payments: String(
                  msg.paymentsNum ?? params.installments ?? 1
                ),
                confirmation_number: String(
                  msg.transactionId ?? msg.asmachta ?? ""
                ),
              });
            },
            onCancel: () => {
              setIsLoading(false);
              reject(new Error("התשלום בוטל"));
            },
            onFailure: (msg) => {
              setIsLoading(false);
              setError(msg);
              reject(new Error(msg));
            },
          });
        });
      } catch (err: any) {
        setIsLoading(false);
        setError(err.message);
        throw err;
      }
    },
    []
  );

  return { startPayment, isReady, isLoading, error, setError };
}
