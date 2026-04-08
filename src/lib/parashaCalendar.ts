/**
 * Hebrew Calendar Parasha Calculator
 * Determines the current weekly Torah portion based on the Gregorian date.
 * Uses a simplified lookup approach with known parasha reading dates.
 */

// All 54 parashiot in order
export const PARASHIOT = [
  "בראשית", "נח", "לך לך", "וירא", "חיי שרה",
  "תולדות", "ויצא", "וישלח", "וישב", "מקץ",
  "ויגש", "ויחי", "שמות", "וארא", "בא",
  "בשלח", "יתרו", "משפטים", "תרומה", "תצוה",
  "כי תשא", "ויקהל", "פקודי", "ויקרא", "צו",
  "שמיני", "תזריע", "מצורע", "אחרי מות", "קדושים",
  "אמור", "בהר", "בחוקותי", "במדבר", "נשא",
  "בהעלותך", "שלח לך", "קורח", "חוקת", "בלק",
  "פנחס", "מטות", "מסעי", "דברים", "ואתחנן",
  "עקב", "ראה", "שופטים", "כי תצא", "כי תבוא",
  "נצבים", "וילך", "האזינו", "וזאת הברכה",
] as const;

// Map parasha name to its DB series title format
export const PARASHA_TO_SERIES_TITLE: Record<string, string> = {
  "בראשית": "פרשת בראשית | א-ו",
  "נח": "פרשת נח | ו-יא",
  "לך לך": "פרשת לך לך | יב-יז",
  "וירא": "פרשת וירא | יח-כב",
  "חיי שרה": "פרשת חיי שרה | כג-כה",
  "תולדות": "פרשת תולדות | כה-כח",
  "ויצא": "פרשת ויצא | כח-לב",
  "וישלח": "פרשת וישלח |לב-לו",
  "וישב": "פרשת וישב | לז-מ",
  "מקץ": "פרשת מקץ | מא-מד",
  "ויגש": "פרשת ויגש | מד-מז",
  "ויחי": "פרשת ויחי | מז-נ",
  "שמות": "פרשת שמות | א-ו",
  "וארא": "פרשת וארא | ו-ט",
  "בא": "פרשת בא | י-יג",
  "בשלח": "פרשת בשלח | יג-יז",
  "יתרו": "פרשת יתרו | יח-כ",
  "משפטים": "פרשת משפטים | כא-כד",
  "תרומה": "פרשת תרומה | כה-כז",
  "תצוה": "פרשת תצוה | כז-ל",
  "כי תשא": "פרשת כי תשא | ל-לד",
  "ויקהל": "פרשת ויקהל | לה-לח",
  "פקודי": "פרשת פקודי | לח-מ",
  "ויקרא": "פרשת ויקרא | א-ה",
  "צו": "פרשת צו | ו-ח",
  "שמיני": "פרשת שמיני | ט-יא",
  "תזריע": "פרשת תזריע | יב-יג",
  "מצורע": "פרשת מצורע | יד-טו",
  "אחרי מות": "פרשת אחרי מות | טז-יח",
  "קדושים": "פרשת קדושים | יט-כ",
  "אמור": "פרשת אמור | כא-כד",
  "בהר": "פרשת בהר | כה-כו",
  "בחוקותי": "פרשת בחוקותי | כו-כז",
  "במדבר": "פרשת במדבר | א-ד",
  "נשא": "פרשת נשא | ד-ז",
  "בהעלותך": "פרשת בהעלותך | ח-יב",
  "שלח לך": "פרשת שלח לך | יג-טו",
  "קורח": "פרשת קורח | טז-יח",
  "חוקת": "פרשת חוקת | יט-כב",
  "בלק": "פרשת בלק | כב-כה",
  "פנחס": "פרשת פנחס | כה-ל",
  "מטות": "פרשת מטות | ל-לב",
  "מסעי": "פרשת מסעי | לג-לו",
  "דברים": "פרשת דברים | א-ד",
  "ואתחנן": "פרשת ואתחנן | ד-ז",
  "עקב": "פרשת עקב | ז-יא",
  "ראה": "פרשת ראה | יא-טז",
  "שופטים": "פרשת שופטים | טז-כא",
  "כי תצא": "פרשת כי תצא | כא-כה",
  "כי תבוא": "פרשת כי תבוא | כו-כט",
  "נצבים": "פרשת נצבים | כט-ל",
  "וילך": "פרשת וילך | לא",
  "האזינו": "פרשת האזינו | לב",
  "וזאת הברכה": "פרשת וזאת הברכה | לג-לד",
};

// Map parasha to its chumash (book)
export const PARASHA_TO_CHUMASH: Record<string, string> = {};
const chumashim = [
  { name: "בראשית", parashiot: ["בראשית", "נח", "לך לך", "וירא", "חיי שרה", "תולדות", "ויצא", "וישלח", "וישב", "מקץ", "ויגש", "ויחי"] },
  { name: "שמות", parashiot: ["שמות", "וארא", "בא", "בשלח", "יתרו", "משפטים", "תרומה", "תצוה", "כי תשא", "ויקהל", "פקודי"] },
  { name: "ויקרא", parashiot: ["ויקרא", "צו", "שמיני", "תזריע", "מצורע", "אחרי מות", "קדושים", "אמור", "בהר", "בחוקותי"] },
  { name: "במדבר", parashiot: ["במדבר", "נשא", "בהעלותך", "שלח לך", "קורח", "חוקת", "בלק", "פנחס", "מטות", "מסעי"] },
  { name: "דברים", parashiot: ["דברים", "ואתחנן", "עקב", "ראה", "שופטים", "כי תצא", "כי תבוא", "נצבים", "וילך", "האזינו", "וזאת הברכה"] },
];
chumashim.forEach(c => c.parashiot.forEach(p => { PARASHA_TO_CHUMASH[p] = c.name; }));

// Featured verses for each parasha
export const PARASHA_VERSES: Record<string, { text: string; reference: string }> = {
  "תצוה": {
    text: "וְקִדַּשְׁתִּי אֶת אֹהֶל מוֹעֵד וְאֶת הַמִּזְבֵּחַ וְאֶת אַהֲרֹן וְאֶת בָּנָיו אֲקַדֵּשׁ לְכַהֵן לִי: וְשָׁכַנְתִּי בְּתוֹךְ בְּנֵי יִשְׂרָאֵל וְהָיִיתִי לָהֶם לֵאלֹהִים",
    reference: "שמות כט, מד - מה",
  },
  "בראשית": {
    text: "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ",
    reference: "בראשית א, א",
  },
  "נח": {
    text: "אֵלֶּה תּוֹלְדֹת נֹחַ נֹחַ אִישׁ צַדִּיק תָּמִים הָיָה בְּדֹרֹתָיו אֶת הָאֱלֹהִים הִתְהַלֶּךְ נֹחַ",
    reference: "בראשית ו, ט",
  },
  // Default verse for parashiot without a specific verse
};

/**
 * Known parasha schedule for 5785 (2024-2025)
 * Each entry: [month (0-indexed), day, parashaIndex]
 * This covers the full year cycle
 */
const SCHEDULE_5785: Array<[number, number, string]> = [
  // Tishrei-Cheshvan 5785 (Oct-Nov 2024)
  [9, 26, "בראשית"], // Oct 26 2024
  [10, 2, "נח"],
  [10, 9, "לך לך"],
  [10, 16, "וירא"],
  [10, 23, "חיי שרה"],
  [10, 30, "תולדות"],
  [11, 6, "ויצא"],
  [11, 13, "וישלח"],
  [11, 20, "וישב"],
  [11, 27, "מקץ"],
  [0, 3, "ויגש"], // Jan 2025
  [0, 10, "ויחי"],
  [0, 17, "שמות"],
  [0, 24, "וארא"],
  [0, 31, "בא"],
  [1, 7, "בשלח"],
  [1, 14, "יתרו"],
  [1, 21, "משפטים"],
  [1, 28, "תרומה"],
  [2, 7, "תצוה"], // Mar 7 2025
  [2, 14, "כי תשא"],
  [2, 21, "ויקהל"],
  [2, 28, "פקודי"],  // also could be ויקהל-פקודי
  [3, 4, "ויקרא"],
  [3, 11, "צו"],
  // Pesach week
  [3, 25, "שמיני"],
  [4, 2, "תזריע"],
  [4, 9, "מצורע"], // or תזריע-מצורע
  [4, 16, "אחרי מות"],
  [4, 23, "קדושים"], // or אחרי מות-קדושים
  [4, 30, "אמור"],
  [5, 6, "בהר"],
  [5, 13, "בחוקותי"], // or בהר-בחוקותי
  [5, 20, "במדבר"],
  [5, 27, "נשא"],
  [6, 4, "בהעלותך"],
  [6, 11, "שלח לך"],
  [6, 18, "קורח"],
  [6, 25, "חוקת"],
  [7, 2, "בלק"],
  [7, 9, "פנחס"],
  [7, 16, "מטות"],
  [7, 23, "מסעי"], // or מטות-מסעי
  [7, 30, "דברים"],
  [8, 6, "ואתחנן"],
  [8, 13, "עקב"],
  [8, 20, "ראה"],
  [8, 27, "שופטים"],
  [9, 3, "כי תצא"],
  [9, 10, "כי תבוא"],
  [9, 17, "נצבים"], // or נצבים-וילך
];

/**
 * Known parasha schedule for 5786 (2025-2026)
 */
const SCHEDULE_5786: Array<[number, number, string]> = [
  [9, 18, "בראשית"], // Oct 18 2025
  [9, 25, "נח"],
  [10, 1, "לך לך"],
  [10, 8, "וירא"],
  [10, 15, "חיי שרה"],
  [10, 22, "תולדות"],
  [10, 29, "ויצא"],
  [11, 6, "וישלח"],
  [11, 13, "וישב"],
  [11, 20, "מקץ"],
  [11, 27, "ויגש"],
  [0, 3, "ויחי"], // Jan 2026
  [0, 10, "שמות"],
  [0, 17, "וארא"],
  [0, 24, "בא"],
  [0, 31, "בשלח"],
  [1, 7, "יתרו"],
  [1, 14, "משפטים"],
  [1, 21, "תרומה"],
  [1, 28, "תצוה"], // Feb 28 2026 ← current!
  [2, 7, "כי תשא"],
  [2, 14, "ויקהל"],
  [2, 21, "פקודי"],
  [2, 28, "ויקרא"],
  [3, 4, "צו"],
  // Pesach
  [3, 18, "שמיני"],
  [3, 25, "תזריע"],
  [4, 2, "מצורע"],
  [4, 9, "אחרי מות"],
  [4, 16, "קדושים"],
  [4, 23, "אמור"],
  [4, 30, "בהר"],
  [5, 6, "בחוקותי"],
  [5, 13, "במדבר"],
  [5, 20, "נשא"],
  [5, 27, "בהעלותך"],
  [6, 4, "שלח לך"],
  [6, 11, "קורח"],
  [6, 18, "חוקת"],
  [6, 25, "בלק"],
  [7, 2, "פנחס"],
  [7, 9, "מטות"],
  [7, 16, "מסעי"],
  [7, 23, "דברים"],
  [7, 30, "ואתחנן"],
  [8, 6, "עקב"],
  [8, 13, "ראה"],
  [8, 20, "שופטים"],
  [8, 27, "כי תצא"],
  [9, 3, "כי תבוא"],
  [9, 10, "נצבים"],
];

function getUpcomingParashaFromSchedule(
  date: Date,
  schedule: Array<[number, number, string]>,
  year: number
): string | null {
  // Find the UPCOMING parasha - the next Shabbat reading
  for (const [month, day, parasha] of schedule) {
    const entryYear = month >= 9 ? year : year + 1;
    const entryDate = new Date(entryYear, month, day);
    // If this Shabbat is today or in the future, this is the current parasha
    if (entryDate >= date) {
      return parasha;
    }
  }
  return null;
}

function getLastParashaFromSchedule(
  date: Date,
  schedule: Array<[number, number, string]>,
  year: number
): string | null {
  let found: string | null = null;
  for (const [month, day, parasha] of schedule) {
    const entryYear = month >= 9 ? year : year + 1;
    const entryDate = new Date(entryYear, month, day);
    if (entryDate <= date) {
      found = parasha;
    } else {
      break;
    }
  }
  return found;
}

/**
 * Get the current weekly parasha based on today's date.
 * Returns the UPCOMING parasha (the one to be read this Shabbat or next).
 */
export function getCurrentParasha(date: Date = new Date()): string {
  // Strip time to compare dates only
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Try 5786 schedule (starts Oct 2025)
  const upcoming5786 = getUpcomingParashaFromSchedule(today, SCHEDULE_5786, 2025);
  if (upcoming5786) return upcoming5786;

  // Try 5785
  const upcoming5785 = getUpcomingParashaFromSchedule(today, SCHEDULE_5785, 2024);
  if (upcoming5785) return upcoming5785;

  // Fallback: last known parasha
  const last5786 = getLastParashaFromSchedule(today, SCHEDULE_5786, 2025);
  if (last5786) return last5786;

  return "תצוה";
}

/**
 * Get the DB series title for a parasha name
 */
export function getParashaSeriesTitle(parasha: string): string | undefined {
  return PARASHA_TO_SERIES_TITLE[parasha];
}

/**
 * Get the chumash name for a parasha
 */
export function getParashaChumash(parasha: string): string | undefined {
  return PARASHA_TO_CHUMASH[parasha];
}

/**
 * Get the featured verse for a parasha
 */
export function getParashaVerse(parasha: string): { text: string; reference: string } | undefined {
  return PARASHA_VERSES[parasha];
}

// Article series that appear on the parasha page
// These are standalone series with one lesson per parasha
export const PARASHA_ARTICLE_SERIES = [
  { title: "הפרשה במבט רחב", rabbi: "הרב יואב אוריאל", seriesTitle: "הפרשה במבט רחב" },
  { title: "סימן לבנים", rabbi: "הרב אליעזר קשתיאל", seriesTitle: "סימן לבנים" },
  { title: "מבט על ההפטרה", rabbi: "הרב מנחם שחור", seriesTitle: "מבט על ההפטרה" },
  { title: "מידות בפרשה", rabbi: "הרב חגי ולוסקי", seriesTitle: "מידות בפרשה" },
  { title: "פשט בפרשה", rabbi: "הרב עמנואל בן ארצי", seriesTitle: "פשט בפרשה" },
  { title: "לשון הקודש בפרשה", rabbi: "הרב יהונתן מיכאלי", seriesTitle: "לשון הקודש בפרשה" },
  { title: "עולמות חדשים בפרשה", rabbi: "הרב יוסף שילר", seriesTitle: "עולמות חדשים בפרשה" },
  { title: "דבר תורה לשולחן השבת", rabbi: "הרב יואב אוריאל", seriesTitle: "דבר תורה לשולחן השבת" },
];
