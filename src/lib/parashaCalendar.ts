/**
 * Hebrew Calendar Parasha Calculator
 * Uses @hebcal/core for dynamic computation — Israel schedule (il: true).
 * No static schedule tables — works for any year, forever.
 *
 * Replaces the hand-maintained SCHEDULE_5785 / SCHEDULE_5786 tables that
 * needed yearly updates and were off by a week in June 2026.
 *
 * Updated: 2026-06-02 — automatic computation, Israel schedule
 */

import { HebrewCalendar, flags, type ParshaEvent } from "@hebcal/core";

// All 54 parashiot in order (used by other modules — keep exported)
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

/**
 * Maps @hebcal/core English parasha descriptions → Hebrew names (no nikud).
 * Includes combined parashiot as they appear in the Israel schedule.
 */
const EN_TO_HE: Record<string, string> = {
  "Parashat Bereshit":             "בראשית",
  "Parashat Noach":                "נח",
  "Parashat Lech-Lecha":           "לך לך",
  "Parashat Vayera":               "וירא",
  "Parashat Chayei Sara":          "חיי שרה",
  "Parashat Toldot":               "תולדות",
  "Parashat Vayetzei":             "ויצא",
  "Parashat Vayishlach":           "וישלח",
  "Parashat Vayeshev":             "וישב",
  "Parashat Miketz":               "מקץ",
  "Parashat Vayigash":             "ויגש",
  "Parashat Vayechi":              "ויחי",
  "Parashat Shemot":               "שמות",
  "Parashat Vaera":                "וארא",
  "Parashat Bo":                   "בא",
  "Parashat Beshalach":            "בשלח",
  "Parashat Yitro":                "יתרו",
  "Parashat Mishpatim":            "משפטים",
  "Parashat Terumah":              "תרומה",
  "Parashat Tetzaveh":             "תצוה",
  "Parashat Ki Tisa":              "כי תשא",
  "Parashat Vayakhel":             "ויקהל",
  "Parashat Pekudei":              "פקודי",
  "Parashat Vayakhel-Pekudei":     "ויקהל-פקודי",
  "Parashat Vayikra":              "ויקרא",
  "Parashat Tzav":                 "צו",
  "Parashat Shmini":               "שמיני",
  "Parashat Tazria":               "תזריע",
  "Parashat Metzora":              "מצורע",
  "Parashat Tazria-Metzora":       "תזריע-מצורע",
  "Parashat Achrei Mot":           "אחרי מות",
  "Parashat Kedoshim":             "קדושים",
  "Parashat Achrei Mot-Kedoshim":  "אחרי מות-קדושים",
  "Parashat Emor":                 "אמור",
  "Parashat Behar":                "בהר",
  "Parashat Bechukotai":           "בחוקותי",
  "Parashat Behar-Bechukotai":     "בהר-בחוקותי",
  "Parashat Bamidbar":             "במדבר",
  "Parashat Naso":                 "נשא",
  "Parashat Beha'alotcha":         "בהעלותך",
  "Parashat Sh'lach":              "שלח לך",
  "Parashat Korach":               "קורח",
  "Parashat Chukat":               "חוקת",
  "Parashat Balak":                "בלק",
  "Parashat Pinchas":              "פנחס",
  "Parashat Matot":                "מטות",
  "Parashat Masei":                "מסעי",
  "Parashat Matot-Masei":          "מטות-מסעי",
  "Parashat Devarim":              "דברים",
  "Parashat Vaetchanan":           "ואתחנן",
  "Parashat Eikev":                "עקב",
  "Parashat Re'eh":                "ראה",
  "Parashat Shoftim":              "שופטים",
  "Parashat Ki Teitzei":           "כי תצא",
  "Parashat Ki Tavo":              "כי תבוא",
  "Parashat Nitzavim":             "נצבים",
  "Parashat Vayeilech":            "וילך",
  "Parashat Nitzavim-Vayeilech":   "נצבים-וילך",
  "Parashat Ha'Azinu":             "האזינו",
  "Parashat Vezot Haberakhah":     "וזאת הברכה",
};

/**
 * Get the current weekly parasha (Israel schedule) for a given date.
 * Returns the upcoming Shabbat reading — the parasha that will be read
 * on the NEXT Saturday (or today if it's Saturday).
 * Uses @hebcal/core — accurate for any year, no manual updates needed.
 */
export function getCurrentParasha(date: Date = new Date()): string {
  try {
    const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endDate = new Date(startDate.getTime() + 9 * 24 * 60 * 60 * 1000); // 9 days window

    const events = HebrewCalendar.calendar({
      start:       startDate,
      end:         endDate,
      sedrot:      true,
      il:          true,   // Israel schedule — critical for merged parashiot
      noHolidays:  true,
    });

    for (const ev of events) {
      // flags.PARSHA_HASHAVUA = 1024 in @hebcal/core v6
      if (ev.getFlags() === 1024) {
        const desc = ev.getDesc();
        const he = EN_TO_HE[desc];
        if (he) return he;
        // Unknown combined parasha — try to extract first name
        const match = desc.match(/^Parashat (.+?)(?:-|$)/);
        if (match) {
          const firstEn = "Parashat " + match[1];
          return EN_TO_HE[firstEn] ?? "שלח לך";
        }
        return "שלח לך";
      }
    }
  } catch {
    // If @hebcal/core fails for any reason, fall through to fallback
  }

  // Static fallback for edge cases (end of year / missing mapping)
  return _fallbackParasha(date);
}

/**
 * Minimal static fallback — only fires if hebcal throws.
 * Covers תשפ"ו (Oct 2025 – Oct 2026) with key dates.
 */
function _fallbackParasha(date: Date): string {
  const m = date.getMonth(); // 0-indexed
  const d = date.getDate();
  const y = date.getFullYear();

  if (y === 2026) {
    if (m < 1 || (m === 0 && d <= 3))  return "ויחי";
    if (m === 0) return "שמות";
    if (m === 1) return "יתרו";
    if (m === 2) return "כי תשא";
    if (m === 3) return "שמיני";
    if (m === 4) return "אמור";
    if (m === 5 && d <= 12) return "שלח לך";
    if (m === 5) return "קורח";
    if (m === 6 && d <= 10) return "פנחס";
    if (m === 6 && d <= 17) return "מטות-מסעי";
    if (m === 6) return "דברים";
    if (m === 7) return "ואתחנן";
    if (m === 8) return "נצבים-וילך";
  }
  return "שלח לך";
}

// Map parasha name to its DB series title format
export const PARASHA_TO_SERIES_TITLE: Record<string, string> = {
  "בראשית":         "פרשת בראשית | א-ו",
  "נח":             "פרשת נח | ו-יא",
  "לך לך":          "פרשת לך לך | יב-יז",
  "וירא":           "פרשת וירא | יח-כב",
  "חיי שרה":        "פרשת חיי שרה | כג-כה",
  "תולדות":         "פרשת תולדות | כה-כח",
  "ויצא":           "פרשת ויצא | כח-לב",
  "וישלח":          "פרשת וישלח |לב-לו",
  "וישב":           "פרשת וישב | לז-מ",
  "מקץ":            "פרשת מקץ | מא-מד",
  "ויגש":           "פרשת ויגש | מד-מז",
  "ויחי":           "פרשת ויחי | מז-נ",
  "שמות":           "פרשת שמות | א-ו",
  "וארא":           "פרשת וארא | ו-ט",
  "בא":             "פרשת בא | י-יג",
  "בשלח":           "פרשת בשלח | יג-יז",
  "יתרו":           "פרשת יתרו | יח-כ",
  "משפטים":         "פרשת משפטים | כא-כד",
  "תרומה":          "פרשת תרומה | כה-כז",
  "תצוה":           "פרשת תצוה | כז-ל",
  "כי תשא":         "פרשת כי תשא | ל-לד",
  "ויקהל":          "פרשת ויקהל | לה-לח",
  "פקודי":          "פרשת פקודי | לח-מ",
  "ויקהל-פקודי":    "פרשת ויקהל | לה-לח",
  "ויקרא":          "פרשת ויקרא | א-ה",
  "צו":             "פרשת צו | ו-ח",
  "שמיני":          "פרשת שמיני | ט-יא",
  "תזריע":          "פרשת תזריע | יב-יג",
  "מצורע":          "פרשת מצורע | יד-טו",
  "תזריע-מצורע":    "פרשת תזריע | יב-יג",
  "אחרי מות":       "פרשת אחרי מות | טז-יח",
  "קדושים":         "פרשת קדושים | יט-כ",
  "אחרי מות-קדושים":"פרשת אחרי מות | טז-יח",
  "אמור":           "פרשת אמור | כא-כד",
  "בהר":            "פרשת בהר | כה-כו",
  "בחוקותי":        "פרשת בחוקותי | כו-כז",
  "בהר-בחוקותי":    "פרשת בהר | כה-כו",
  "במדבר":          "פרשת במדבר | א-ד",
  "נשא":            "פרשת נשא | ד-ז",
  "בהעלותך":        "פרשת בהעלותך | ח-יב",
  "שלח לך":         "פרשת שלח לך | יג-טו",
  "קורח":           "פרשת קורח | טז-יח",
  "חוקת":           "פרשת חוקת | יט-כב",
  "בלק":            "פרשת בלק | כב-כה",
  "פנחס":           "פרשת פנחס | כה-ל",
  "מטות":           "פרשת מטות | ל-לב",
  "מסעי":           "פרשת מסעי | לג-לו",
  "מטות-מסעי":      "פרשת מטות | ל-לב",
  "דברים":          "פרשת דברים | א-ד",
  "ואתחנן":         "פרשת ואתחנן | ד-ז",
  "עקב":            "פרשת עקב | ז-יא",
  "ראה":            "פרשת ראה | יא-טז",
  "שופטים":         "פרשת שופטים | טז-כא",
  "כי תצא":         "פרשת כי תצא | כא-כה",
  "כי תבוא":        "פרשת כי תבוא | כו-כט",
  "נצבים":          "פרשת נצבים | כט-ל",
  "וילך":           "פרשת וילך | לא",
  "נצבים-וילך":     "פרשת נצבים | כט-ל",
  "האזינו":         "פרשת האזינו | לב",
  "וזאת הברכה":     "פרשת וזאת הברכה | לג-לד",
};

// Map parasha to its chumash (book)
export const PARASHA_TO_CHUMASH: Record<string, string> = {};
const _chumashim = [
  { name: "בראשית", parashiot: ["בראשית","נח","לך לך","וירא","חיי שרה","תולדות","ויצא","וישלח","וישב","מקץ","ויגש","ויחי"] },
  { name: "שמות",   parashiot: ["שמות","וארא","בא","בשלח","יתרו","משפטים","תרומה","תצוה","כי תשא","ויקהל","פקודי","ויקהל-פקודי"] },
  { name: "ויקרא",  parashiot: ["ויקרא","צו","שמיני","תזריע","מצורע","תזריע-מצורע","אחרי מות","קדושים","אחרי מות-קדושים","אמור","בהר","בחוקותי","בהר-בחוקותי"] },
  { name: "במדבר",  parashiot: ["במדבר","נשא","בהעלותך","שלח לך","קורח","חוקת","בלק","פנחס","מטות","מסעי","מטות-מסעי"] },
  { name: "דברים",  parashiot: ["דברים","ואתחנן","עקב","ראה","שופטים","כי תצא","כי תבוא","נצבים","וילך","נצבים-וילך","האזינו","וזאת הברכה"] },
];
_chumashim.forEach(c => c.parashiot.forEach(p => { PARASHA_TO_CHUMASH[p] = c.name; }));

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
  "דברים": {
    text: "אֵלֶּה הַדְּבָרִים אֲשֶׁר דִּבֶּר מֹשֶׁה אֶל כָּל יִשְׂרָאֵל בְּעֵבֶר הַיַּרְדֵּן",
    reference: "דברים א, א",
  },
};

// יואב 13.7 (אודיט): פסוק ברירת-מחדל — קודם ~51 שבועות בשנה תיבת-הפסוק בהירו
// הייתה ריקה (רק 3/54 פרשות מופו). כך התיבה לעולם לא ריקה; מוסיפים פסוקי-פתיחה
// ספציפיים בהדרגה מעל הדיפולט הזה.
export const DEFAULT_PARASHA_VERSE = {
  text: "תּוֹרַת ה' תְּמִימָה מְשִׁיבַת נָפֶשׁ, עֵדוּת ה' נֶאֱמָנָה מַחְכִּימַת פֶּתִי",
  reference: "תהלים יט, ח",
};

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
export function getParashaVerse(parasha: string): { text: string; reference: string } {
  return PARASHA_VERSES[parasha] ?? DEFAULT_PARASHA_VERSE;
}

// ── חידות לילדים — סדרה-לכל-חומש ────────────────────────────────────────────
// 5 series titled "חידות לילדים - פרשת השבוע, לפי סדר העולים לתורה" (published),
// one per chumash. On 11.7.2026 their `bible_book` column was set in the DB
// (backup: series_bak_riddles_20260711), so the primary lookup is by bible_book.
// This map is the code-side safety net if bible_book is ever wiped again.
export const CHUMASH_RIDDLE_SERIES: Record<string, string> = {
  "בראשית": "faaf06ea-0b08-4634-b1fb-d489249e7ed0",
  "שמות":   "26a2076b-f716-4d49-87f9-59673f18db07",
  "ויקרא":  "dd663cb8-5866-4aff-ba36-5e977338756b",
  "במדבר":  "b654c91c-1d39-4ede-8f2b-6fd3ed2f3985",
  "דברים":  "00b7226a-cb33-470b-8710-ba574662f406",
};

// Legacy mixed riddles series ("חידות לילדים פ\"ש", 50 lessons) — fallback only.
export const LEGACY_RIDDLES_SERIES_ID = "c852edd8-d959-4c8d-bf7e-17b5881275fa";

// DB spelling variants per parasha (titles differ from the hebcal names):
// "ניצבים" (עם יו"ד), "שלח" (בלי "לך"), וכן הלאה.
const PARASHA_NAME_ALIASES: Record<string, string[]> = {
  "נצבים":   ["ניצבים"],
  "שלח לך":  ["שלח"],
  "קורח":    ["קרח"],
  "חוקת":    ["חקת"],
  "בחוקותי": ["בחקתי", "בחקותי", "בחוקתי"],
  "תצוה":    ["תצווה"],
  "פנחס":    ["פינחס"],
};

/** Normalize a riddle/lesson title for matching: strip quotes, unify
 *  hyphen/maqaf → space, collapse whitespace. "פרשות מטות-מסעי" → "פרשות מטות מסעי". */
function normalizeForMatch(s: string): string {
  return s
    .replace(/[״"'׳`]/g, "")
    .replace(/[-–—־]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True if `seq` appears as a consecutive token run inside `tokens`. */
function seqInTokens(tokens: string[], seq: string[]): boolean {
  outer: for (let i = 0; i + seq.length <= tokens.length; i++) {
    for (let j = 0; j < seq.length; j++) {
      if (tokens[i + j] !== seq[j]) continue outer;
    }
    return true;
  }
  return false;
}

/**
 * Which parashiot (canonical names from PARASHIOT) are mentioned in a title.
 * Token-exact, so "בשלח" never matches "שלח", and "מנחם" never matches "נח".
 * Handles "פרשת"/"פרשות" prefixes implicitly (they're just extra tokens) and
 * hyphen/space double-parasha forms via normalizeForMatch.
 */
export function detectParashiotInTitle(title: string): Set<string> {
  const tokens = normalizeForMatch(title).split(" ");
  const found = new Set<string>();
  for (const name of PARASHIOT) {
    const variants = [name, ...(PARASHA_NAME_ALIASES[name] ?? [])];
    for (const v of variants) {
      if (seqInTokens(tokens, v.split(" "))) {
        found.add(name);
        break;
      }
    }
  }
  return found;
}

/**
 * Score how well a riddle-lesson title matches the current week's parasha.
 * Works for double parashiot in BOTH directions:
 *   - week "מטות-מסעי" ← lesson "פרשות מטות מסעי" (exact, 3) or "פרשת מטות" (half, 2)
 *   - week "מטות" (a year they're read separately) ← lesson "פרשות מטות מסעי" (superset, 1)
 * Returns 0 = no match; higher = better.
 */
export function scoreRiddleLessonMatch(lessonTitle: string, parasha: string): number {
  const want = detectParashiotInTitle(parasha);
  if (want.size === 0) return 0;
  const have = detectParashiotInTitle(lessonTitle);
  if (have.size === 0) return 0;
  const haveArr = [...have];
  const wantArr = [...want];
  const sameSet = have.size === want.size && haveArr.every((n) => want.has(n));
  if (sameSet) return 3; // exact — e.g. "פרשות מטות מסעי" in a מטות-מסעי week
  if (haveArr.every((n) => want.has(n))) return 2; // lesson covers half of a double week
  if (wantArr.every((n) => have.has(n))) return 1; // combined lesson covers a single week
  return 0;
}

// Article series that appear on the parasha page
// These are standalone series with one lesson per parasha
// Parsha-page editorial columns. Round-2 (14.6.2026): list rebuilt against the
// OLD site's dynamic parsha hub + verified DB coverage. Only columns whose lessons
// are reliably matchable to the parsha (title contains the parasha name) are listed,
// so every entry actually renders 1:1 with the old site instead of dropping silently.
//   chumashScoped=true → the series title is per-chumash ("…- חומש <book>") and the
//   lookup appends the current chumash (e.g. "מאמרים לשולחן השבת - חומש במדבר").
// KNOWN data-debt (NOT listed, would never match — migration lost their parsha key):
//   "עולמות חדשים בפרשה" (thematic titles, no bible_book) + "לאור הפרשה" (absent from DB).
export const PARASHA_ARTICLE_SERIES = [
  { title: "הפרשה במבט רחב", rabbi: "הרב יואב אוריאל", seriesTitle: "הפרשה במבט רחב" },
  { title: "סימן לבנים", rabbi: "הרב אליעזר קשתיאל", seriesTitle: "סימן לבנים" },
  { title: "מבט על ההפטרה", rabbi: "הרב מנחם שחור", seriesTitle: "מבט על ההפטרה" },
  { title: "מידות בפרשה", rabbi: "הרב חגי ולוסקי", seriesTitle: "מידות בפרשה" },
  { title: "לב ההפטרה", rabbi: "הרב עמנואל בן ארצי", seriesTitle: "לב ההפטרה" },
  { title: "עולמות חדשים בפרשה", rabbi: "הרב יוסף שילר", seriesTitle: "עולמות חדשים בפרשה" },
  { title: "מאמר לשולחן השבת", rabbi: "הרב יואב אוריאל", seriesTitle: "מאמרים לשולחן השבת", chumashScoped: true },
];
