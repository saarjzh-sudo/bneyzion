/**
 * formatLessonDate — תאריך פרסום של שיעור לתצוגה ציבורית.
 *
 * הערת סוקר 2.8.2026: שיעורים הציגו תאריך עתידי ("2 בינואר 2027") — ארטיפקט
 * ייבוא מהאתר הישן (כ-1,650 שיעורים עם published_at עתידי, תזמון-פרסום ישן).
 * תאריך עתידי אינו מידע אמיתי עבור הגולש — לא מציגים אותו בכלל.
 */
export function formatLessonDate(
  d: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
): string | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime()) || date.getTime() > Date.now()) return null;
  return date.toLocaleDateString(
    "he-IL",
    opts ?? { year: "numeric", month: "long", day: "numeric" },
  );
}
