import { QuickBuyDialog } from "@/components/payment/QuickBuyDialog";

/**
 * Single source of truth for the "subscribe to weekly chapter program" CTA.
 * All Pricing/Hero/FinalCTA/etc sections render through this so the price,
 * Smoove list, and Grow page wiring stay in sync.
 *
 * Replaces the legacy `<a href="https://pay.grow.link/714ddd...">` links —
 * those bypassed our webhook entirely (no order row, no Smoove subscribe,
 * no audit trail).
 */
export function SubscribeButton({ children }: { children: React.ReactNode }) {
  return (
    <QuickBuyDialog
      product="weekly-chapter-subscription"
      amount={5}
      description="מנוי הפרק השבועי - חודש ראשון במחיר מבצע (5 ש״ח)"
      title="הצטרפות למנוי הפרק השבועי"
      subtitle="חודש ראשון 5 ש״ח · לאחר מכן 110 ש״ח לחודש · ביטול בכל עת"
      maxInstallments={1}
    >
      {children}
    </QuickBuyDialog>
  );
}
