/**
 * hebrewDate — תאריך עברי מאומת למנגנון התוכן היומי (סער, 7.7.2026).
 *
 * מבוסס @hebcal/core (כבר בפרויקט, משמש את לוח-הפרשות). הפורמט מיושר
 * ל-hebcal.com: "כ״ב בתמוז תשפ״ו" (יום בגימטריה, ב+חודש, שנה).
 *
 * ✅ אומת 7.7.2026 מול ה-API הרשמי של hebcal.com על 4 תאריכים כולל קצוות:
 *    7.7.2026→כ״ב בתמוז תשפ״ו · 12.9.2026→א׳ בתשרי תשפ״ז (ראש השנה) ·
 *    19.3.2026→א׳ בניסן תשפ״ו · 31.12.2025→י״א בטבת תשפ״ו — התאמה מלאה.
 *    (כלל-ברזל מהזיכרון: ולידציית תאריך-עברי תמיד מול hebcal.)
 */
import { HDate } from "@hebcal/core";

const stripNikud = (s: string) => s.replace(/[֑-ׇ]/g, "");

function toDate(d: Date | string): Date {
  if (d instanceof Date) return d;
  // תאריך-בלבד (YYYY-MM-DD) מקובע לצהריים כדי לא לגלוש יום אחורה ב-UTC
  return new Date(d.length === 10 ? `${d}T12:00:00` : d);
}

/** "כ״ב בתמוז תשפ״ו" */
export function hebrewDateLabel(d: Date | string): string {
  const parts = stripNikud(new HDate(toDate(d)).renderGematriya()).split(" ");
  return parts.length === 3 ? `${parts[0]} ב${parts[1]} ${parts[2]}` : parts.join(" ");
}

/** "תמוז תשפ״ו" — לקיבוץ ארכיונים לפי חודש עברי */
export function hebrewMonthLabel(d: Date | string): string {
  const parts = stripNikud(new HDate(toDate(d)).renderGematriya()).split(" ");
  return parts.length === 3 ? `${parts[1]} ${parts[2]}` : parts.join(" ");
}

/** מפתח מיון-וקיבוץ יציב לחודש עברי (שנה*100+חודש) */
export function hebrewMonthKey(d: Date | string): number {
  const h = new HDate(toDate(d));
  return h.getFullYear() * 100 + h.getMonth();
}
