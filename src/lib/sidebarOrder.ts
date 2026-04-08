/**
 * Custom ordering for sidebar sections that don't follow biblical order.
 * These match the order from the original bneyzion.co.il sidebar.
 */

// Moadim in Jewish calendar order
const MOADIM_ORDER = [
  "חודש אלול וימי התשובה",
  "ראש השנה",
  "יום הכיפורים",
  "סוכות",
  "שמיני עצרת",
  "חנוכה",
  'ט"ו בשבט',
  "פורים",
  "פסח",
  "ספירת העומר",
  "יום העצמאות",
  "יום ירושלים",
  "שבועות",
  "שלושת השבועות",
];

// Haftarot in Torah book order
const HAFTAROT_ORDER = [
  "הפטרות בראשית",
  "הפטרות שמות",
  "הפטרות ויקרא",
  "הפטרות במדבר",
  "הפטרות דברים",
  "הפטרות המועדים",
];

// General topics in the original sidebar order
const GENERAL_TOPICS_ORDER = [
  "גלות וגאולה",
  "מלחמת גוג ומגוג",
  "מלחמה",
  "יג מידות הרחמים",
  "נבואה ונביאים",
  "ירושלים",
  "ארץ ישראל",
  "סקירות תנ\"כיות על אזורים בארץ ישראל",
];

// כלי עזר - exact order from original site
const TOOLS_ORDER = [
  "מפות עזר לספר יהושע",
  "מפות עזר לספר שופטים",
  "ציר זמן - תקופת המלכים",
  "מפות עזר לתנ\"ך",
  "טבלת 850 השנים מן הכניסה לארץ ועד החורבן",
  "טבלת סיכום השנים והמאורעות בספר שמואל",
  "לוח השנים בתנ\"ך - מיציאת מצרים ועד סוף ספר מלכים",
  "טבלת עשרים הדורות הראשונים",
  "טבלת תולדות יעקב",
  "טבלת שנות השיעבוד במצרים",
  "טבלת כלי המשכן ועבודתם",
  "טבלת מאורעות שנת הארבעים",
  "טבלת קרבנות הציבור הקבועים",
  "שרטוט בית המקדש ביחזקאל לפי שיטות המלבי\"ם רש\"י ומצודות",
  "מפת עזר לזיהוי אתרי התנ\"ך בארץ ישראל",
  "ציר זמן יהושע שופטים",
  "ציר זמן גלות בבל",
  "ציר זמן שנה וחצי ראשונות במדבר",
  "טבלת תהליכי החורבן",
];

function getOrderIndex(title: string, orderList: string[]): number {
  // Try exact match first
  const exact = orderList.indexOf(title);
  if (exact !== -1) return exact;
  // Try partial match (title contains or is contained by an item)
  for (let i = 0; i < orderList.length; i++) {
    if (title.includes(orderList[i]) || orderList[i].includes(title)) return i;
  }
  return Infinity;
}

/**
 * Sort items by a predefined order list. Items not in the list go to the end,
 * preserving their relative alphabetical order.
 */
export function sortByCustomOrder<T extends { title: string }>(
  items: T[],
  section: "moadim" | "haftarot" | "generalTopics" | "tools"
): T[] {
  const orderList =
    section === "moadim"
      ? MOADIM_ORDER
      : section === "haftarot"
      ? HAFTAROT_ORDER
      : section === "tools"
      ? TOOLS_ORDER
      : GENERAL_TOPICS_ORDER;

  return [...items].sort((a, b) => {
    const idxA = getOrderIndex(a.title, orderList);
    const idxB = getOrderIndex(b.title, orderList);
    if (idxA === Infinity && idxB === Infinity) {
      return a.title.localeCompare(b.title, "he");
    }
    return idxA - idxB;
  });
}

export { TOOLS_ORDER };
export { getOrderIndex };
