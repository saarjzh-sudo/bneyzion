/**
 * נרמול קישורי מדיה שהוזנו ידנית באדמין (סער 16.7).
 *
 * הבעיה: קישור "שיתוף" מגוגל דרייב (…/view?usp=sharing או open?id=…) חסום
 * להטמעה (X-Frame-Options) — נגן שמקבל אותו מציג מסך ריק. הצורה היחידה
 * שמוטמעת היא /preview. יואב מדביק קישורים ידנית — מנרמלים ברינדור, כך
 * שכל צורת קישור דרייב עובדת, וגם דאטה ישן מכוסה.
 */
export function normalizeMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(
    /drive\.google\.com\/(?:file\/d\/([\w-]{10,})|open\?[^#]*\bid=([\w-]{10,})|uc\?[^#]*\bid=([\w-]{10,}))/
  );
  const id = m?.[1] || m?.[2] || m?.[3];
  if (id) return `https://drive.google.com/file/d/${id}/preview`;
  return url;
}

/** קישור דרייב חייב iframe — תגיות <audio>/<video> לא מנגנות אותו. */
export function isDriveUrl(url?: string | null): boolean {
  return !!url && url.includes("drive.google.com");
}

/**
 * שמע מדרייב — קישור הזרמה ישירה לתג <audio> נטיבי.
 *
 * יואב 21.7 (איכה פרק ב): נגן ה-preview של דרייב ב-iframe נכנס למצב "מנגן"
 * אבל תקוע על 0:00 — לא מזרים (שוחזר בדפדפן; הקובץ עצמו תקין). לעומת זאת
 * צורת uc?export=download מחזירה את בייטי ה-MP3 עצמם (כולל Range לניווט),
 * ותג <audio> מנגן אותה מצוין (אומת: currentTime מתקדם, duration מזוהה).
 * ⚠️ תקף לקבצים עד ~100MB — מעבר לזה דרייב מחזיר דף-ביניים של סריקת וירוסים.
 * הקלטות השיעורים הן ~20MB, בטווח בטוח.
 */
export function driveAudioStreamUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(
    /drive\.google\.com\/(?:file\/d\/([\w-]{10,})|open\?[^#]*\bid=([\w-]{10,})|uc\?[^#]*\bid=([\w-]{10,}))/
  );
  const id = m?.[1] || m?.[2] || m?.[3];
  if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  return null;
}

/**
 * קישור צפייה ישירה בדרייב (first-party, לשונית חדשה).
 *
 * יואב 26.7: נגן ה-preview המוטמע ב-iframe הציג אצלו "אירעה בעיה בהפעלת
 * הסרטון" בקורסי איך/למה ללמוד תנ"ך — הקבצים עצמם אומתו תקינים
 * (get_video_info=ok, /preview נגיש אנונימית); הכשל הוא חסימת ההזרמה בתוך
 * iframe צד-שלישי (עוגיות צד-שלישי / סינון תוכן). הקבצים גדולים מ-100MB אז
 * אין הזרמה ישירה לתג <video> (דף סריקת-וירוסים). צפייה ב-drive.google.com
 * עצמו היא first-party ועוקפת את החסימה — לכן קישור-חילוץ קבוע מתחת לנגן.
 */
export function driveViewUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(
    /drive\.google\.com\/(?:file\/d\/([\w-]{10,})|open\?[^#]*\bid=([\w-]{10,})|uc\?[^#]*\bid=([\w-]{10,}))/
  );
  const id = m?.[1] || m?.[2] || m?.[3];
  if (id) return `https://drive.google.com/file/d/${id}/view`;
  return null;
}

/**
 * נרמול קישור תמונה שהוזן ידנית באדמין: קישור-שיתוף דרייב לא עובד בתוך
 * <img>/background-image (מחזיר HTML) — ממירים לצורת lh3 הישירה.
 */
export function normalizeImageUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(
    /drive\.google\.com\/(?:file\/d\/([\w-]{10,})|open\?[^#]*\bid=([\w-]{10,})|uc\?[^#]*\bid=([\w-]{10,}))/
  );
  const id = m?.[1] || m?.[2] || m?.[3];
  if (id) return `https://lh3.googleusercontent.com/d/${id}=w1600`;
  return url;
}
