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
