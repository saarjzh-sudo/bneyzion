/**
 * useNavItems — פריטי התפריט האפקטיביים (רמה 13, אישור סער 10.7).
 *
 * הרב יואב ביקש לשלוט בתפריטים מהאדמין ("אם אני מוסיף או מוריד תפריט מסוים").
 * ה-override נשמר כ-JSON במפתח copy.nav.items ב-site_settings (נערך ממרכז
 * השליטה); בלי override — הקונפיג הסטטי src/config/navigation.ts כרגיל.
 * ולידציה fail-closed: JSON שבור / מבנה לא תקין ⇒ הקונפיג הסטטי.
 */
import { NAV_ITEMS, type NavItem } from "@/config/navigation";
import { useSiteCopy } from "@/hooks/useSiteSettings";

export const NAV_ITEMS_KEY = "copy.nav.items";
const MAX_ITEMS = 12;

export function parseNavItems(raw: string): NavItem[] | null {
  try {
    const arr = JSON.parse(raw);
    if (
      Array.isArray(arr) &&
      arr.length > 0 &&
      arr.length <= MAX_ITEMS &&
      arr.every(
        (i) =>
          i &&
          typeof i.label === "string" &&
          i.label.trim().length > 0 &&
          i.label.length <= 30 &&
          typeof i.href === "string" &&
          (i.href.startsWith("/") || i.href.startsWith("https://")),
      )
    ) {
      return arr.map((i) => ({ label: i.label.trim(), href: i.href.trim() }));
    }
  } catch {
    /* JSON שבור — נופלים לקונפיג */
  }
  return null;
}

export function useNavItems(): NavItem[] {
  const copy = useSiteCopy();
  const raw = copy(NAV_ITEMS_KEY, "");
  if (!raw) return NAV_ITEMS;
  return parseNavItems(raw) ?? NAV_ITEMS;
}
