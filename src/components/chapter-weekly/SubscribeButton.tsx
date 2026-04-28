import { QuickBuyDialog } from "@/components/payment/QuickBuyDialog";

/**
 * Single source of truth for the "subscribe to weekly chapter program" CTA.
 * All Pricing/Hero/FinalCTA/etc sections render through this so the price,
 * Smoove list, and Grow page wiring stay in sync.
 *
 * Replaces the legacy `<a href="https://pay.grow.link/714ddd...">` links —
 * those bypassed our webhook entirely (no order row, no Smoove subscribe,
 * no audit trail).
 *
 * IMPORTANT — Grow direct-debit (הוראת קבע) semantics, per Hannah:
 *   "בחיוב הו"ק יש לשלוח את הסכום החודשי ולא את הסכום המלא"
 * So `amount` here is the recurring monthly charge. Any first-month
 * promo (e.g. "5 ש״ח חודש ראשון") is configured at the Grow page level,
 * NOT via API params. The marketing copy in Pricing.tsx and the actual
 * Grow page configuration must be reconciled by whoever administers the
 * Grow account.
 *
 * UX: even though the HOK pageCode returns a redirect URL (not authCode),
 * useGrowPayment now opens it in an iframe modal on the bnei zion site
 * (per Grow's official iframe + postMessage docs). The user never leaves.
 */
export function SubscribeButton({ children }: { children: React.ReactNode }) {
  return (
    <QuickBuyDialog
      product="weekly-chapter-subscription"
      amount={110}
      description="מנוי הפרק השבועי - חיוב חודשי"
      title="הצטרפות למנוי הפרק השבועי"
      subtitle="₪110 לחודש · הוראת קבע · ביטול בכל עת"
      maxInstallments={1}
    >
      {children}
    </QuickBuyDialog>
  );
}
