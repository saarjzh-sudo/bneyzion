// Shipping options for physical store products.
// Prices are in NIS (₪). Update here only — used by StoreCheckoutDialog + webhook.

export type ShippingMethod = "registered_mail" | "courier" | "pickup";

export interface ShippingOption {
  id: ShippingMethod;
  label: string;
  sublabel: string;
  price: number;
}

export const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: "registered_mail",
    label: "דואר רשום",
    sublabel: "עד 14 ימי עסקים",
    price: 25,
  },
  {
    id: "courier",
    label: "שליח עד הבית",
    sublabel: "עד 7 ימי עסקים",
    price: 60,
  },
  {
    id: "pickup",
    label: "איסוף עצמי",
    sublabel: "תיאום מראש בטלפון",
    price: 0,
  },
];

export function getShippingPrice(method: ShippingMethod): number {
  return SHIPPING_OPTIONS.find((o) => o.id === method)?.price ?? 0;
}

export function getShippingLabel(method: ShippingMethod): string {
  const opt = SHIPPING_OPTIONS.find((o) => o.id === method);
  if (!opt) return method;
  return opt.price > 0 ? `${opt.label} (+₪${opt.price})` : opt.label;
}
