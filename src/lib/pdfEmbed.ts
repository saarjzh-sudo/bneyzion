/**
 * כרום במובייל (אנדרואיד) לא מרנדר PDF גולמי בתוך iframe — מציג מסך אפור עם
 * כפתור "פתיחה" בלבד (הערת אלי 19.7.2026). במובייל עוטפים ב-Google Viewer
 * שמרנדר את העמודים כתמונות; בדסקטופ נשאר הצופה המקורי של הדפדפן.
 */
export const isMobileUA = (): boolean =>
  typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const pdfEmbedSrc = (url: string): string =>
  isMobileUA()
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`
    : url;
