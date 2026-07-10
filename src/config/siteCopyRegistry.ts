/**
 * siteCopyRegistry — מרשם הנוסחים/תמונות שניתנים לעריכה מהאדמין (רמה 13).
 *
 * זה הלב של "מרכז השליטה" (בקשת סער 9.7 + לחץ הרב יואב: "עדיף מאשר שאשלח לך
 * כל הזמן פניות"). כל שדה כאן = מפתח ב-site_settings (prefix copy./image. או
 * מפתחות memorial_/print_ הקיימים). הקומפוננטות החיות קוראות דרך useSiteCopy
 * עם fallback לנוסח המקודד — אפס שינוי ויזואלי עד שעורכים בפועל.
 *
 * אבטחה (עוגן: "מידע רגיש נשאר של סער; לעולם לא RLS פתוח"):
 * - RLS על site_settings מתיר לאדמינים לכתוב רק מפתחות copy./image./memorial_/
 *   print_/homepage_ — גם admin לא יכול לגעת במפתח אחר (fail-closed בצד ה-DB).
 * - sensitive: true ⇒ עריכה רק ל-SUPER_ADMIN_EMAILS (סער) — נאכף גם ב-UI.
 */

export interface CopyField {
  /** site_settings key — חייב להתחיל ב-copy. / image. / memorial_ / print_ */
  key: string;
  label: string;
  group: string;
  type: "text" | "textarea" | "image";
  /** הנוסח המקודד הנוכחי — ה-fallback כשאין override ב-DB */
  defaultValue: string;
  /** איפה זה מופיע באתר */
  hint?: string;
  /** עריכה רק לסער (SUPER_ADMIN_EMAILS) */
  sensitive?: boolean;
}

export const SUPER_ADMIN_EMAILS = ["saar.j.z.h@gmail.com"];

export const SITE_COPY_REGISTRY: CopyField[] = [
  // ── דף הבית — הירו ──
  {
    key: "copy.home.hero_title",
    label: "כותרת ההירו",
    group: "דף הבית",
    type: "text",
    defaultValue: "אתר התנ״ך של ישראל",
    hint: "הכותרת הגדולה מעל וידאו-האקוורל בדף הבית",
  },
  {
    key: "copy.home.hero_cta_primary",
    label: "כפתור ראשי בהירו",
    group: "דף הבית",
    type: "text",
    defaultValue: "התחילו ללמוד",
    hint: "הכפתור המוזהב בדף הבית",
  },
  {
    key: "copy.home.hero_cta_secondary",
    label: "כפתור משני בהירו",
    group: "דף הבית",
    type: "text",
    defaultValue: "לתכנית הפרק השבועי",
    hint: "הכפתור השקוף ליד הכפתור המוזהב",
  },

  // ── דף הבית — פס המספרים ──
  {
    key: "copy.home.stat1_num",
    label: "מספר 1 בפס הנתונים",
    group: "דף הבית",
    type: "text",
    defaultValue: "+11,000",
    hint: "הפס הכהה מתחת להירו",
  },
  {
    key: "copy.home.stat1_label",
    label: "תווית 1 בפס הנתונים",
    group: "דף הבית",
    type: "text",
    defaultValue: "שיעורים ומאמרים",
  },
  {
    key: "copy.home.stat2_num",
    label: "מספר 2 בפס הנתונים",
    group: "דף הבית",
    type: "text",
    defaultValue: "+200",
  },
  {
    key: "copy.home.stat2_label",
    label: "תווית 2 בפס הנתונים",
    group: "דף הבית",
    type: "text",
    defaultValue: "רבנים ומרצים",
  },
  {
    key: "copy.home.stat3_num",
    label: "מספר 3 בפס הנתונים",
    group: "דף הבית",
    type: "text",
    defaultValue: "+1,300",
  },
  {
    key: "copy.home.stat3_label",
    label: "תווית 3 בפס הנתונים",
    group: "דף הבית",
    type: "text",
    defaultValue: "סדרות לימוד",
  },

  // ── חנות ──
  {
    key: "copy.store.hero_title",
    label: "כותרת החנות",
    group: "חנות",
    type: "text",
    defaultValue: "ספרי תנ״ך מבית בני ציון",
    hint: "הכותרת בראש עמוד /store",
  },
  {
    key: "copy.store.hero_subtitle",
    label: "תת-כותרת החנות",
    group: "חנות",
    type: "textarea",
    defaultValue:
      "ספרי פרשנות מקוריים, מגילות, קורסים דיגיטליים וימי עיון — הכל מבית בני ציון",
  },

  // ── הנצחה (מפתחות קיימים ב-DB — בלי copy. prefix) ──
  {
    key: "memorial_name",
    label: "שם המונצח",
    group: "הנצחה",
    type: "text",
    defaultValue: "סעדיה ז״ל",
    hint: "עמוד ההנצחה",
    sensitive: true,
  },
  {
    key: "memorial_subtitle",
    label: "תת-כותרת ההנצחה",
    group: "הנצחה",
    type: "text",
    defaultValue: "תהא נשמתו צרורה בצרור החיים",
    sensitive: true,
  },
  {
    key: "memorial_verse",
    label: "פסוק ההנצחה",
    group: "הנצחה",
    type: "text",
    defaultValue: "״והחי ייתן אל ליבו״ – קהלת ז׳, ב׳",
    sensitive: true,
  },
  {
    key: "memorial_dedication",
    label: "הקדשת האתר",
    group: "הנצחה",
    type: "textarea",
    defaultValue: "",
    sensitive: true,
  },
  {
    key: "memorial_bio",
    label: "ביוגרפיה",
    group: "הנצחה",
    type: "textarea",
    defaultValue: "",
    sensitive: true,
  },
  {
    key: "memorial_legacy",
    label: "מורשת",
    group: "הנצחה",
    type: "textarea",
    defaultValue: "",
    sensitive: true,
  },
  {
    key: "print_dedication",
    label: "הקדשה בהדפסה",
    group: "הנצחה",
    type: "text",
    defaultValue: "לעילוי נשמת סעדיה בן שמחה ז״ל",
    hint: "מופיעה בתחתית כל עמוד מודפס",
    sensitive: true,
  },
];

export const COPY_GROUPS = [...new Set(SITE_COPY_REGISTRY.map((f) => f.group))];
