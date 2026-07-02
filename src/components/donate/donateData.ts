/**
 * donateData — copy + structured content for the donate page.
 *
 * Voice: a real bet-midrash request, not a sales page. Warm, plain, moving —
 * no manufactured drama. Copy direction set by Saar + Rav Yoav's own group
 * messages and the Saadia campaign.
 *
 * Kept as plain data (no JSX) so the copy lives in one place and the page
 * components stay presentational.
 */

// ── Rav Yoav / campaign imagery (real assets in /public) ────────────────────
export const IMAGES = {
  heroVideo: "/video/hero-bg.mp4",
  heroPoster: "/assets/hero-bg-bney-zion.webp", // graceful fallback
  yoavTeaching: "/images/yoav-campaign/yoav-with-full-set.jpg",
  yoavWriting: "/images/yoav-campaign/yoav-writing-on-tank.jpg",
  yoavBook: "/images/yoav-campaign/yoav-with-shoftim-book.jpg",
  reelVideo: "/video/yehoshua-reel.mp4",
  reelPoster: "/video/yehoshua-reel-poster.jpg",
} as const;

export interface ImpactTier {
  amount: number;
  /** Verb-led card heading. */
  name: string;
  /** What this gift opens/builds. */
  impact: string;
  /** Mark the recommended tier. */
  highlight?: boolean;
  /** Small tag on the highlighted tier. */
  tag?: string;
}

/**
 * Impact tiers — every gift opens another gate to learning.
 * Click-to-fund: selecting a card sets the amount on the live form.
 */
export const IMPACT_TIERS: ImpactTier[] = [
  {
    amount: 50,
    name: "פותחים שיעור",
    impact: "עוזרים להעלות שיעור אחד לאתר — פתוח לכל מי שרוצה ללמוד.",
  },
  {
    amount: 100,
    name: "מנגישים לימוד",
    impact: "תומכים בעריכה, תמלול וסידור השיעור, כדי שיהיה ברור ונוח ללמידה.",
  },
  {
    amount: 180,
    name: "מחזיקים שיעור שלם",
    impact: "השותפות המרכזית שלנו: תוכן, עריכה, הנגשה והעלאה של שיעור איכותי לאתר.",
    highlight: true,
    tag: "השותפות המרכזית שלנו",
  },
  {
    amount: 360,
    name: "בונים יחידת לימוד",
    impact: "עוזרים להפוך שיעור לחוויית לימוד שלמה, מסודרת ומאירת עיניים.",
  },
  {
    amount: 540,
    name: "פותחים סדרה קטנה",
    impact: "שותפות בבניית רצף שיעורים סביב נושא, פרק או ספר בתנ\"ך.",
  },
  {
    amount: 1000,
    name: "בונים קומה בבית התנ\"ך",
    impact: "שותפות משמעותית ביצירת תוכן עומק, חומרי עזר ותשתית לימוד שנשארת לדורות.",
  },
];

export interface AllocationItem {
  title: string;
  detail: string;
}

/** Where the donation goes — verbal, not percentages (more trustworthy). */
export const ALLOCATION: AllocationItem[] = [
  { title: "הפקת שיעורים", detail: "צילום, הקלטה, עריכה והעלאה לאתר." },
  { title: "הנגשת תוכן", detail: "תמלול, סידור, עיצוב, מצגות וחומרי עזר." },
  { title: "פיתוח ותחזוקה", detail: "שמירה על אתר מהיר, יציב ונוח ללמידה." },
  { title: "שירות ללומדים", detail: "מענה, תיקונים, סידור תכנים ושיפור חוויית הלימוד." },
];

export interface WhyCard {
  n: string;
  title: string;
  desc: string;
}

export const WHY_CARDS: WhyCard[] = [
  {
    n: "01",
    title: "פתוח לכולם",
    desc: "בלי מנוי, בלי תשלום בכניסה, בלי מחסום. לימוד תנ\"ך שנמצא במרחק לחיצה מכל בית בישראל.",
  },
  {
    n: "02",
    title: "נבנה בידיים טובות",
    desc: "מאחורי כל שיעור יש אנשים: רבנים, עורכים, מאיירים, מתמללים ומפתחים. זה לא תוכן שנזרק לאוויר — זה בית מדרש שנבנה בזהירות.",
  },
  {
    n: "03",
    title: "נשאר לדורות",
    desc: "שיעור שנתרם פעם אחת יכול להמשיך ללמד שנים. התרומה שלכם עובדת גם הרבה אחרי הרגע שבו נתתם אותה.",
  },
];

export interface Testimonial {
  text: string;
  name: string;
  role?: string;
}

/**
 * Real testimonials from the weekly-chapter program (learners on Rav Yoav's
 * teaching). Sourced verbatim from chapter-weekly/sections/Testimonials.tsx —
 * NOT invented. Curated to the strongest few for the donate page.
 */
export const TESTIMONIALS: Testimonial[] = [
  {
    text: "וואו. איזה כיף ומעמיק ללמוד תנ\"ך עם הרב יואב אוריאל! זו תכנית שמחזירה את האור ללימוד התנ\"ך: כל פרק נפתח בהקשר הרחב שלו, ופתאום הפסוקים \"נפתחים\" בצורה בהירה, מרגשת ומדויקת. תכנית חובה לכל מי שרוצה להבין תנ\"ך באמת.",
    name: "נתנאל ידגרי",
    role: "מורה",
  },
  {
    text: "הלימוד משמעותי הרבה מעבר למה שציפיתי! הוא מלווה אותי לאורך כל השבוע, וגולת הכותרת היא השיעור השבועי — מרתק, מעמיק, ומחבר את אירועי התנ\"ך לאירועים הגדולים שאנחנו חווים בדור שלנו. זה לא רק שיעור תנ\"ך אלא ממש שיעור באמונה!",
    name: "חנה יצחקי",
  },
  {
    text: "יש כאן בשורה היסטורית — להפוך את לימוד התנ\"ך העמוק לחלק מהמיינסטרים, בצורה לא פשטנית ולא מרחפת. הרב מתחיל כל שיעור משאלות בפשט, ומטפס עד שיוצאים עם מבט חדש, כללי ורחב, שמעשיר את האופק הרוחני.",
    name: "ישורון צוקרמן",
  },
  {
    text: "כמי שלא למדה תנ\"ך מאז התיכון חששתי שאתקשה — אבל התוכנית בנויה כך שאפשר להבין את הפרקים לעומק. בסיום כל שיעור יצאתי בהרגשה מרוממת ומלאת תקווה לגבי עתידנו.",
    name: "מעין ליב",
    role: "לומדת חדשה",
  },
  {
    text: "שמח להמליץ על הלימוד השבועי בתנ\"ך של 'בני ציון'. התוכנית נותנת תמיכה, הדרכה וליווי — גם בתכני עזר, גם בשיעורים עמוקים ובהירים. הזדמנות פז לזכות בלימוד תנ\"ך מעמיק ומשמעותי. ממליץ בחום!",
    name: "ברכיה גרוסברג",
  },
  {
    text: "הרבה שנים רציתי ללמוד תנ\"ך ולא יצא לי. עכשיו, כשיש לימוד בקבוצה, בקביעות ועם שיעורים מרוממים, זו שמחה גדולה על הזכות להגשים חלום גדול!",
    name: "שלומית דביר",
  },
];

export interface DonateFaq {
  q: string;
  a: string;
}

export const DONATE_FAQS: DonateFaq[] = [
  {
    q: "לאן הולך הכסף שלי?",
    a: "לבניית התוכן באתר: הפקת שיעורים, עריכה, תמלול, עיצוב, פיתוח, תחזוקה והנגשה ללומדים. המטרה פשוטה — להשאיר את לימוד התנ\"ך פתוח ונגיש לכולם.",
  },
  {
    q: "התרומה מוכרת לזיכוי מס?",
    a: "כן. התרומה מוכרת לזיכוי מס לפי סעיף 46, וקבלה נשלחת למייל לאחר התרומה.",
  },
  {
    q: "אפשר להקדיש את התרומה?",
    a: "כן. אפשר להקדיש לעילוי נשמת, לרפואה או לכבוד שמחה. ההקדשה מצטרפת לשותפות שלכם בלימוד התורה באתר.",
  },
  {
    q: "אפשר לתרום בהוראת קבע?",
    a: "כן. הוראת קבע היא השותפות שהכי עוזרת לנו לתכנן קדימה, להפיק סדרות שלמות ולהחזיק את האתר פתוח לאורך זמן. אפשר לעצור בכל שלב.",
  },
  {
    q: "אני לא יכול לתרום עכשיו — איך עוד אפשר לעזור?",
    a: "ללמוד ולשתף. כל שיעור שנשלח לחבר, לתלמיד, למשפחה או לקבוצה — פותח עוד שער לתנ\"ך.",
  },
];
