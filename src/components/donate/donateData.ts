/**
 * donateData — copy + structured content for the donate page.
 *
 * Kept as plain data (no JSX) so the copy lives in one place and the page
 * components stay presentational. All amounts are real preset values the
 * Grow donation flow already supports.
 */

export interface ImpactTier {
  amount: number;
  /** Short label shown on the card heading. */
  name: string;
  /** One concrete thing this gift pays for. */
  impact: string;
  /** Supporting detail line. */
  detail: string;
  /** Mark the recommended tier. */
  highlight?: boolean;
}

/**
 * Impact tiers — every gift maps to one concrete thing it builds.
 * Click-to-fund: selecting a card sets the amount on the live form.
 */
export const IMPACT_TIERS: ImpactTier[] = [
  {
    amount: 50,
    name: "שיעור אחד",
    impact: "הקלטה ועריכה של שיעור שלם",
    detail: "שיעור אחד שנשאר באתר לתמיד, פתוח לכל אחד.",
  },
  {
    amount: 100,
    name: "שיעור מלוטש",
    impact: "שיעור עם כתוביות ותמלול מלא",
    detail: "כדי שאפשר יהיה ללמוד גם בלי אוזניות, וגם לחפש בתוכו.",
  },
  {
    amount: 180,
    name: "מצגת מאוירת",
    impact: "מצגת שיעור עם איורים מקוריים",
    detail: "התרומה שהכי עוזרת לנו — חבילת ההפקה המלאה של שיעור.",
    highlight: true,
  },
  {
    amount: 360,
    name: "שיעור מוקרן",
    impact: "הסבת שיעור לתסריט ולקריינות",
    detail: "שיעור שהופך לסרטון מלא, מוכן לצפייה ולשיתוף.",
  },
  {
    amount: 540,
    name: "סדרה קטנה",
    impact: "שלושה שיעורים בסדרת לימוד אחת",
    detail: "מהלך לימודי שלם על ספר או נושא, מההתחלה ועד הסוף.",
  },
  {
    amount: 1000,
    name: "פרק בקורס",
    impact: "הפקת פרק שלם בקורס דיגיטלי",
    detail: "פרק עם שיעורים, חומרי עזר ומבחנים — דור שלם ילמד ממנו.",
  },
];

export interface AllocationSlice {
  label: string;
  percent: number;
}

/** Where each shekel goes — transparency block. */
export const ALLOCATION: AllocationSlice[] = [
  { label: "הקלטה ועריכת שיעורים", percent: 45 },
  { label: "פיתוח ותחזוקת האתר", percent: 25 },
  { label: "איורים, מצגות וקריינות", percent: 20 },
  { label: "הנגשה ושירות ללומדים", percent: 10 },
];

export interface DonateFaq {
  q: string;
  a: string;
}

export const DONATE_FAQS: DonateFaq[] = [
  {
    q: "לאן הולך הכסף שלי?",
    a: "כל שקל נכנס ישירות לבניית התוכן: הקלטה ועריכה של שיעורים, איורים ומצגות, קריינות, ותחזוקת האתר שמחזיק יותר מ-11,000 שיעורים. אנחנו עמותה ללא כוונת רווח, וכל הכסף חוזר אל הלומדים.",
  },
  {
    q: "התרומה מוכרת לזיכוי מס?",
    a: "כן. אנחנו עמותה מוכרת עם אישור לפי סעיף 46, וקבלה רשמית נשלחת אליכם למייל מיד עם סיום התשלום. אפשר להגיש אותה לצורך החזר מס.",
  },
  {
    q: "אפשר להקדיש את התרומה?",
    a: "בוודאי. אפשר להקדיש לעילוי נשמת, לרפואת חולה, או לכבוד שמחה. ההקדשה נצרבת לצד התרומה, וכל שיעור שנבנה בזכותה נלמד לזכר מי שבחרתם.",
  },
  {
    q: "אפשר לתרום בהוראת קבע?",
    a: "כן, וזה העוגן הכי יציב שלנו. תרומה חודשית קבועה מאפשרת לנו לתכנן קדימה ולהפיק סדרות שלמות בלי לעצור באמצע. אפשר לעצור בכל רגע.",
  },
  {
    q: "אני לא יכול לתרום עכשיו — איך עוד אפשר לעזור?",
    a: "פשוט ללמוד, ולשתף. כל שיתוף של שיעור עם חבר, כל הפניה לאתר, מקרבת עוד יהודי ללימוד תנ\"ך. גם זו תרומה אמיתית.",
  },
];
