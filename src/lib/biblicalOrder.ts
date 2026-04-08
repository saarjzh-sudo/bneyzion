/**
 * Biblical ordering utilities for sorting parshiot, books, and haftarot
 * by their canonical Tanakh order instead of alphabetically.
 */

// Torah parshiot in order
const TORAH_PARSHIOT = [
  "בראשית", "נח", "לך לך", "וירא", "חיי שרה", "תולדות",
  "ויצא", "וישלח", "וישב", "מקץ", "ויגש", "ויחי",
  "שמות", "וארא", "בא", "בשלח", "יתרו", "משפטים",
  "תרומה", "תצוה", "כי תשא", "ויקהל", "פקודי",
  "ויקרא", "צו", "שמיני", "תזריע", "מצורע", "אחרי מות",
  "קדושים", "אמור", "בהר", "בחוקותי",
  "במדבר", "נשא", "בהעלותך", "שלח", "שלח לך", "קרח", "חוקת", "בלק",
  "פנחס", "מטות", "מסעי",
  "דברים", "ואתחנן", "עקב", "ראה", "שופטים", "כי תצא", "כי תבוא",
  "ניצבים", "נצבים", "וילך", "האזינו", "וזאת הברכה", "וזאת הבכרה",
];

// Neviim books in order
const NEVIIM_BOOKS = [
  "יהושע", "שופטים", "שמואל", "שמואל א", "שמואל ב",
  "מלכים", "מלכים א", "מלכים ב",
  "ישעיהו", "ישעיה", "ירמיהו", "ירמיה", "יחזקאל",
  "הושע", "יואל", "עמוס", "עובדיה", "יונה", "מיכה",
  "נחום", "חבקוק", "צפניה", "חגי", "זכריה", "מלאכי",
  "תרי עשר",
];

// Ketuvim books in order
const KETUVIM_BOOKS = [
  "תהלים", "תהילים", "משלי", "איוב",
  "שיר השירים", "רות", "איכה", "קהלת", "אסתר",
  "דניאל", "עזרא", "עזרא ונחמיה", "נחמיה",
  "דברי הימים", "דברי הימים א", "דברי הימים ב",
];

// Separate maps: one for parshiot (used with "פרשת" prefix), one for books (direct match)
const PARSHIOT_MAP = new Map<string, number>();
const BOOKS_MAP = new Map<string, number>();

let idx = 0;
for (const name of TORAH_PARSHIOT) {
  if (!PARSHIOT_MAP.has(name)) {
    PARSHIOT_MAP.set(name, idx++);
  }
}

idx = 0;
for (const name of [...NEVIIM_BOOKS, ...KETUVIM_BOOKS]) {
  if (!BOOKS_MAP.has(name)) {
    BOOKS_MAP.set(name, idx++);
  }
}

/**
 * Extract a known biblical name from a title string.
 * Handles patterns like "פרשת בראשית | ...", "פרשת בראשית", "בראשית", etc.
 * Returns [name, isParsha] tuple.
 */
function extractBiblicalName(title: string): { name: string; isParsha: boolean } | null {
  // Try "פרשת X" pattern first - always a parsha
  const parshaMatch = title.match(/פרשת\s+([^|–\-]+)/);
  if (parshaMatch) {
    const name = parshaMatch[1].trim();
    if (PARSHIOT_MAP.has(name)) return { name, isParsha: true };
    for (const [key] of PARSHIOT_MAP) {
      if (name.startsWith(key)) return { name: key, isParsha: true };
    }
  }

  // Try direct book match first (Neviim/Ketuvim books take priority for standalone titles)
  for (const [key] of BOOKS_MAP) {
    if (title === key || title.startsWith(key + " ") || title.startsWith(key + " |") || title.startsWith(key + " –")) {
      return { name: key, isParsha: false };
    }
  }

  // Fall back to parsha match for direct titles
  for (const [key] of PARSHIOT_MAP) {
    if (title === key || title.startsWith(key + " ") || title.startsWith(key + " |") || title.startsWith(key + " –")) {
      return { name: key, isParsha: true };
    }
  }

  return null;
}

/**
 * Get the biblical sort index for a title. Returns Infinity if not found.
 */
export function getBiblicalSortIndex(title: string): number {
  const result = extractBiblicalName(title);
  if (result !== null) {
    const map = result.isParsha ? PARSHIOT_MAP : BOOKS_MAP;
    return map.get(result.name) ?? Infinity;
  }
  return Infinity;
}

/**
 * Sort an array of items with a `title` field by biblical order.
 * Items without a recognized biblical name are pushed to the end, keeping their relative order.
 */
export function sortByBiblicalOrder<T extends { title: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const idxA = getBiblicalSortIndex(a.title);
    const idxB = getBiblicalSortIndex(b.title);
    if (idxA === Infinity && idxB === Infinity) return 0; // keep original relative order
    return idxA - idxB;
  });
}
