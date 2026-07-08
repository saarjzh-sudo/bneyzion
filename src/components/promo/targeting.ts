/**
 * targeting.ts — טרגוט חכם לפופאפים ולבאנרים (8.7.2026, בקשת סער).
 *
 * שתי צלעות, שתיהן "ריק = כולם":
 *   page_types — באילו סוגי דפים להציג (צ'קבוקסים באדמין)
 *   audiences  — לאילו סוגי גולשים להציג
 */
import { useAuth } from "@/contexts/AuthContext";
import { useUserAccess } from "@/hooks/useUserAccess";

export const PAGE_TYPES = [
  { value: "home",        label: "דף הבית" },
  { value: "series",      label: "עמודי סדרות" },
  { value: "lessons",     label: "עמודי שיעורים" },
  { value: "parasha",     label: "פרשת השבוע ומועדים" },
  { value: "family",      label: "תנ״ך למשפחה והפינות היומיות" },
  { value: "dor-haplaot", label: "דור הפלאות" },
  { value: "bible",       label: "ניווט לפי ספר ופרק" },
  { value: "rabbis",      label: "עמודי רבנים" },
  { value: "other",       label: "שאר העמודים" },
] as const;

export const AUDIENCES = [
  { value: "guest",      label: "אורחים (לא מחוברים)" },
  { value: "member",     label: "מחוברים בלי מנוי" },
  { value: "subscriber", label: "מנויי הפרק השבועי" },
  { value: "eicha",      label: "לומדי איכה" },
] as const;

export function pageTypeFromPath(pathname: string): string {
  const p = pathname.toLowerCase();
  if (p === "/" || p === "") return "home";
  if (p.startsWith("/series")) return "series";
  if (p.startsWith("/lessons")) return "lessons";
  if (p.startsWith("/parasha") || p.startsWith("/holiday")) return "parasha";
  if (p.startsWith("/family-tanach") || p.startsWith("/tanach-news") || p.startsWith("/daily-verse")) return "family";
  if (p.startsWith("/dor-haplaot")) return "dor-haplaot";
  if (p.startsWith("/bible")) return "bible";
  if (p.startsWith("/rabbi")) return "rabbis";
  return "other";
}

/** קהלי הגולש הנוכחי — גולש יכול להיות בכמה קהלים בו-זמנית */
export function useVisitorAudiences(): string[] {
  const { user } = useAuth();
  const { hasAccess: isSubscriber } = useUserAccess("program:weekly-chapter");
  const { hasAccess: isEicha } = useUserAccess("program:eicha-monday");
  if (!user) return ["guest"];
  const out: string[] = [];
  if (isSubscriber) out.push("subscriber");
  if (isEicha) out.push("eicha");
  if (out.length === 0) out.push("member");
  return out;
}

export function matchesTargeting(
  promo: { page_types?: string[] | null; audiences?: string[] | null },
  pageType: string,
  visitorAudiences: string[],
): boolean {
  const pt = promo.page_types ?? [];
  if (pt.length > 0 && !pt.includes(pageType)) return false;
  const au = promo.audiences ?? [];
  if (au.length > 0 && !au.some((a) => visitorAudiences.includes(a))) return false;
  return true;
}
