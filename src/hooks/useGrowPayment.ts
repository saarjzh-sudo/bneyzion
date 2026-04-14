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
  type: "product" | "donation";
  orderId?: string; // Optional — donations create it server-side
  installments?: number;
  donationMeta?: {
    is_monthly?: boolean;
    dedication_type?: string;
    dedication_name?: string;
    donor_email?: string;
    user_id?: string;
  };
}

const SDK_URL = "https://cdn.meshulam.co.il/sdk/gs.min.js";

export function useGrowPayment() {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolveRef = useRef<((value: GrowSuccessResponse) => void) | null>(null);
  const rejectRef = useRef<((reason: any) => void) | null>(null);

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

        // Step 2a: Wallet flow (products) — open SDK overlay
        if (data.authCode) {
          return new Promise<GrowSuccessResponse>((resolve, reject) => {
            resolveRef.current = resolve;
            rejectRef.current = reject;
            window.growPayment.renderPaymentOptions(data.authCode);
          });
        }

        // Step 2b: Redirect flow (donations/direct debit) — open in new window
        const paymentWindow = window.open(data.url, "_blank", "width=600,height=700");
        setIsLoading(false);
        return {
          payment_sum: String(params.sum),
          full_name: params.fullName,
          payment_method: "redirect",
          number_of_payments: "1",
          confirmation_number: String(data.processId),
        } as GrowSuccessResponse;
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
