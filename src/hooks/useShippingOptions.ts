/**
 * useShippingOptions — אפשרויות המשלוח האפקטיביות (רמה 13, משימה 8 של סער).
 *
 * מחירי המשלוח נערכים ממרכז-השליטה (מפתח copy.shipping.options ב-site_settings);
 * בלי override — הקונפיג הסטטי src/config/shipping.ts. ולידציה fail-closed:
 * JSON שבור / מזהה לא מוכר / מחיר לא-מספרי ⇒ הקונפיג הסטטי.
 */
import {
  SHIPPING_OPTIONS,
  type ShippingMethod,
  type ShippingOption,
} from "@/config/shipping";
import { useSiteCopy } from "@/hooks/useSiteSettings";

export const SHIPPING_OPTIONS_KEY = "copy.shipping.options";
const KNOWN_METHODS: ShippingMethod[] = ["registered_mail", "courier", "pickup"];

export function parseShippingOptions(raw: string): ShippingOption[] | null {
  try {
    const arr = JSON.parse(raw);
    if (
      Array.isArray(arr) &&
      arr.length === KNOWN_METHODS.length &&
      arr.every(
        (o) =>
          o &&
          KNOWN_METHODS.includes(o.id) &&
          typeof o.label === "string" && o.label.trim().length > 0 &&
          typeof o.sublabel === "string" &&
          typeof o.price === "number" && o.price >= 0 && o.price <= 500,
      ) &&
      new Set(arr.map((o) => o.id)).size === KNOWN_METHODS.length
    ) {
      return arr.map((o) => ({
        id: o.id,
        label: o.label.trim(),
        sublabel: o.sublabel.trim(),
        price: Math.round(o.price),
      }));
    }
  } catch {
    /* JSON שבור — נופלים לקונפיג */
  }
  return null;
}

export function useShippingOptions(): {
  options: ShippingOption[];
  getPrice: (method: ShippingMethod) => number;
  getLabel: (method: ShippingMethod) => string;
} {
  const copy = useSiteCopy();
  const raw = copy(SHIPPING_OPTIONS_KEY, "");
  const options = (raw && parseShippingOptions(raw)) || SHIPPING_OPTIONS;
  return {
    options,
    getPrice: (method) => options.find((o) => o.id === method)?.price ?? 0,
    getLabel: (method) => {
      const opt = options.find((o) => o.id === method);
      if (!opt) return method;
      return opt.price > 0 ? `${opt.label} (+₪${opt.price})` : opt.label;
    },
  };
}
