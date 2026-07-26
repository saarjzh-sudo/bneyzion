/**
 * holidays.ts — לוח המועדים האוטומטי של האתר (רמה 11, 8.7.2026).
 *
 * מחליף שלוש רשימות HOLIDAYS_5786 מקודדות-ידנית שהתיישנו (י"ז בתמוז הופיע
 * בתאריך שגוי והמשיך להיות "המועד הקרוב" גם אחרי שעבר). התאריכים מחושבים
 * מ-@hebcal/core לכל שנה עברית — כולל שנים מעוברות ודחיית צומות משבת לראשון —
 * ואף פעם לא צריך לעדכן ידנית.
 *
 * לכל מועד מוצמדים מונחי-חיפוש (terms) לאיתור הסדרה/הקטגוריה המתאימה ב-DB,
 * ואפשר להצמיד seriesId קבוע כשסער/יואב רוצים יעד מפורש.
 */
import { HDate } from "@hebcal/core";
import { hebrewDateLabel } from "@/lib/hebrewDate";

export interface UpcomingHoliday {
  key: string;
  name: string;
  /** תאריך עברי מעוצב, מחושב (לא מקודד ידנית) */
  hebrewDate: string;
  date: Date;
  daysUntil: number;
  terms: string[];
  seriesId: string | null;
  /** תמונת מועד ייעודית (אופציונלי — הקומפוננטות נופלות לתמונת ברירת מחדל) */
  imageUrl: string | null;
  emoji: string;
  quote?: string;
  quoteAttribution?: string;
}

interface HolidayDef {
  key: string;
  name: string;
  /** חודש עברי (1=ניסן ... 13) ויום — הבסיס לחישוב; צומות מקבלים דחיית-שבת */
  month: number;
  day: number;
  postponeFromShabbat?: boolean;
  terms: string[];
  seriesId?: string;
  emoji: string;
  quote?: string;
  quoteAttribution?: string;
}

// months: NISAN=1 IYYAR=2 SIVAN=3 TAMUZ=4 AV=5 ELUL=6 TISHREI=7 CHESHVAN=8 KISLEV=9 TEVET=10 SHVAT=11 ADAR_I=12 ADAR_II=13
const DEFS: HolidayDef[] = [
  {
    // יואב 26.7 (סבב רמה 29): אלול נעדר מהלוח — הכרטיס קפץ ישר לראש השנה
    key: "elul",         name: "חודש אלול",   month: 6,  day: 1,
    terms: ["אלול", "תשובה", "סליחות", "ימים נוראים"],
    seriesId: "edc74757-ae3e-4b1c-9432-7206d24a2cd1", // "חודש אלול וימי התשובה"
    emoji: "🎺",
    quote: "אֲנִי לְדוֹדִי וְדוֹדִי לִי",
    quoteAttribution: "שיר השירים ו, ג",
  },
  { key: "rosh-hashana", name: "ראש השנה",    month: 7,  day: 1,  terms: ["ראש השנה"], emoji: "🍯" },
  { key: "yom-kippur",   name: "יום כיפור",   month: 7,  day: 10, terms: ["יום כיפור", "יום הכיפורים", "כיפור"], emoji: "🙏" },
  { key: "sukkot",       name: "סוכות",       month: 7,  day: 15, terms: ["סוכות"], emoji: "🌿" },
  { key: "chanukah",     name: "חנוכה",       month: 9,  day: 25, terms: ["חנוכה"], emoji: "🕎" },
  { key: "purim",        name: "פורים",       month: -1, day: 14, terms: ["פורים", "אסתר", "מגילת אסתר"], emoji: "🎭" }, // אדר האחרון (ב' בשנה מעוברת)
  { key: "pesach",       name: "פסח",         month: 1,  day: 15, terms: ["פסח", "הגדה"], emoji: "🍷" },
  { key: "atzmaut",      name: "יום העצמאות", month: 2,  day: 5,  terms: ["יום העצמאות", "עצמאות"], emoji: "🇮🇱" },
  { key: "lag-baomer",   name: "ל״ג בעומר",   month: 2,  day: 18, terms: ["ל\"ג בעומר"], emoji: "🔥" },
  { key: "yerushalayim", name: "יום ירושלים", month: 2,  day: 28, terms: ["יום ירושלים", "ירושלים", "בית המקדש"], emoji: "🦁" },
  { key: "shavuot",      name: "שבועות",      month: 3,  day: 6,  terms: ["שבועות", "רות", "מגילת רות"], emoji: "📜" },
  {
    key: "tzom-tammuz",  name: "י״ז בתמוז",   month: 4,  day: 17, postponeFromShabbat: true,
    terms: ["שלושת השבועות", "תמוז", "בין המצרים"],
    seriesId: "e36ea5d6-38f8-49ca-874e-ff3324bb3795",
    emoji: "🕯️",
    quote: "ואם נחרבנו ונחרב העולם עמנו על ידי שנאת חינם, נשוב להיבנות והעולם עמנו יבנה על ידי אהבת חינם",
    quoteAttribution: "הרב קוק זצ\"ל",
  },
  {
    key: "tisha-bav",    name: "תשעה באב",    month: 5,  day: 9,  postponeFromShabbat: true,
    terms: ["תשעה באב", "איכה", "שלושת השבועות", "בין המצרים"],
    emoji: "🕯️",
  },
];

/** מופע המועד בשנה עברית נתונה, כולל אדר-האחרון ודחיית צום משבת לראשון */
function occurrenceInYear(def: HolidayDef, hyear: number): Date {
  let month = def.month;
  if (month === -1) {
    // פורים — אדר בשנה רגילה, אדר ב' בשנה מעוברת
    month = HDate.isLeapYear(hyear) ? 13 : 12;
  }
  let hd = new HDate(def.day, month, hyear);
  if (def.postponeFromShabbat && hd.getDay() === 6) {
    hd = new HDate(def.day + 1, month, hyear);
  }
  return hd.greg();
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** כל המועדים הקרובים (מהיום), ממוינים לפי תאריך */
export function getUpcomingHolidays(now: Date = new Date()): UpcomingHoliday[] {
  const today = startOfDay(now);
  const hyear = new HDate(today).getFullYear();
  const list: UpcomingHoliday[] = [];

  for (const def of DEFS) {
    // המופע הקרוב: השנה העברית הנוכחית, ואם עבר — השנה הבאה
    let date = occurrenceInYear(def, hyear);
    if (startOfDay(date) < today) date = occurrenceInYear(def, hyear + 1);
    const daysUntil = Math.round((startOfDay(date).getTime() - today.getTime()) / 86400000);
    list.push({
      key: def.key,
      name: def.name,
      hebrewDate: hebrewDateLabel(date),
      date,
      daysUntil,
      terms: def.terms,
      seriesId: def.seriesId ?? null,
      imageUrl: null,
      emoji: def.emoji,
      quote: def.quote,
      quoteAttribution: def.quoteAttribution,
    });
  }
  return list.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** המועד הקרוב בתוך חלון ימים (ברירת מחדל 45) — או null */
export function getUpcomingHoliday(windowDays = 45, now: Date = new Date()): UpcomingHoliday | null {
  const next = getUpcomingHolidays(now)[0];
  return next && next.daysUntil <= windowDays ? next : null;
}
