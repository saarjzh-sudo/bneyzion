/**
 * shabbat.ts — האם עכשיו שבת/חג בארץ ישראל? (רמה 26ד, 22.7.2026)
 *
 * הקלטת הבודק 13:16 + שאלת יואב "יש אפשרות שהאתר יהיה סגור בשבת?" + אישור סער
 * ("בטח"): האתר מציג כיסוי "האתר שובת" מהדלקת נרות ועד צאת השבת/החג.
 *
 * החישוב מקומי לגמרי (@hebcal/core שכבר בפרויקט — אפס תלות ברשת):
 * - מיקום ירושלים, il=true → כולל גם ערבי-חג (ר"ה, יו"כ, סוכות, שמ"ע, פסח, שבועות).
 * - הדלקת נרות = מנהג ירושלים (40 דק' לפני שקיעה, ברירת-המחדל של hebcal לירושלים)
 *   → נסגרים מעט מוקדם, לחומרא.
 * - צאת = אירוע ההבדלה של hebcal (ברירת-מחדל 8.5°).
 * - הזמנים מוחלטים (UTC) — גולש בחו"ל רואה את האתר שובת לפי שעון ארץ ישראל.
 *
 * עקיפה לבדיקות: ?shabbat=off (נשמר ל-sessionStorage) · ?shabbat=preview מדליק ידנית.
 */
import { HebrewCalendar, Location } from "@hebcal/core";

const JERUSALEM = Location.lookup("Jerusalem");

export interface ShabbatWindow {
  start: Date;
  end: Date;
}

/** חלונות שבת/חג (הדלקה→הבדלה) בטווח ±3 ימים סביב הזמן הנתון. */
export function shabbatWindows(now: Date = new Date()): ShabbatWindow[] {
  const start = new Date(now.getTime() - 3 * 86400_000);
  const end = new Date(now.getTime() + 3 * 86400_000);
  let events;
  try {
    events = HebrewCalendar.calendar({
      start,
      end,
      location: JERUSALEM,
      candlelighting: true,
      il: true,
      sedrot: false,
      omer: false,
      noMinorFast: true,
      noSpecialShabbat: true,
    });
  } catch {
    return []; // fail-open: אם החישוב נכשל האתר נשאר זמין
  }

  // מזווגים: הדלקת-נרות ראשונה פותחת חלון, אירוע ההבדלה הבא סוגר אותו.
  // (בשבת→חג רצופים hebcal פולט הדלקה נוספת באמצע והבדלה אחת בסוף — הזיווג נכון.)
  const windows: ShabbatWindow[] = [];
  let open: Date | null = null;
  for (const ev of events) {
    const desc = ev.getDesc();
    const time: Date | undefined = (ev as { eventTime?: Date }).eventTime;
    if (!time) continue;
    if (desc === "Candle lighting" && open === null) open = time;
    else if (desc === "Havdalah" && open !== null) {
      windows.push({ start: open, end: time });
      open = null;
    }
  }
  // חלון שנפתח בקצה הטווח בלי הבדלה (למשל עכשיו ליל שבת) — סוגרים בקצה הטווח.
  if (open !== null) windows.push({ start: open, end });
  return windows;
}

/** האם ברגע זה שבת/חג בא"י? מחזיר את החלון הפעיל או null. */
export function activeShabbatWindow(now: Date = new Date()): ShabbatWindow | null {
  for (const w of shabbatWindows(now)) {
    if (now >= w.start && now <= w.end) return w;
  }
  return null;
}
