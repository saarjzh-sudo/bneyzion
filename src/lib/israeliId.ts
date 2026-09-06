/**
 * בדיקת ספרת-ביקורת לת"ז/ח.פ ישראלי. מקבל 5-9 ספרות (ריפוד אפסים משמאל),
 * מחזיר את ה-9 ספרות המנורמלות או null אם לא תקין.
 * Grow דוחה ת"ז שלא עובר ספרת-ביקורת (שגיאה 782) ומפיל את התשלום — לכן בודקים לפני.
 */
export function normalizeIsraeliId(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 5 || digits.length > 9) return null;
  const id = digits.padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(id[i]) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  return sum % 10 === 0 ? id : null;
}
