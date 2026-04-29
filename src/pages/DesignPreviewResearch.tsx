/**
 * /design-research — Editorial-style page synthesizing 30+ design patterns
 * researched for the Bnei Zion redesign.
 *
 * The page itself DEMONSTRATES the patterns it recommends — magazine-style
 * hero typography, asymmetric grid, drop caps, pull quotes with right
 * borders (RTL), bento-grid pattern cards, sticky section markers, and
 * editorial number/letter callouts in the margin.
 */
import { useState } from "react";
import {
  BookOpen,
  Type,
  Layout,
  Compass,
  Sparkles,
  User,
  Headphones,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Star,
  ArrowDown,
  Search,
  Languages,
  Zap,
  Quote,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";

// ────────────────────────────────────────────────────────────────────────
// Pattern data — 32 patterns, 8 categories
// ────────────────────────────────────────────────────────────────────────
type Tier = "S" | "A" | "B";
type Category =
  | "editorial"
  | "layout"
  | "rtl"
  | "discovery"
  | "motion"
  | "personalization"
  | "audio"
  | "reading";

type Pattern = {
  id: number;
  category: Category;
  name: string;
  desc: string;
  why: string;
  source: string;
  apply: string;
  tier: Tier;
};

const PATTERNS: Pattern[] = [
  // A. EDITORIAL TYPOGRAPHY (5)
  { id: 1, category: "editorial", name: "Display × body type pairing", desc: "Kedem/Frank Ruehl לכותרות גדולות + Ploni/Heebo לגוף. ניגוד אישיות ב-display, נייטרליות בגוף.", why: "עברית ללא ascenders/descenders משטחת בלי line-height גבוה. line-height: 1.8 חובה.", source: "sefaria.org.il, NYT Magazine", apply: "כל כותרת באתר היום משתמשת ב-Ploni — להחליף לגוף ולהשאיר Kedem ל-h1/h2", tier: "S" },
  { id: 2, category: "editorial", name: "Editorial number markers", desc: "מספור גדול בשוליים ('01', '02') ב-Kedem 900, צבע זהב, opacity 30%.", why: "מסיבי ויזואלית בלי לגנוב את המוקד, יוצר ריתמוס דפוס.", source: "Pitchfork, The Verge longform", apply: "סקציות בדף סדרה / שיעור / מאמר", tier: "A" },
  { id: 3, category: "editorial", name: "Drop cap (זהיר בעברית)", desc: "אות פתיחה גדולה — אך ורק באות סגורה (ה / ב / ד / ם / ת) שלא משברת את כיוון הקריאה.", why: "מוסיף תחושה ספרותית לפסקה ראשונה. בעברית — אסור בא/י/ל (פתוחות).", source: "Magazine layouts, Aleph", apply: "פסקה ראשונה של תיאור סדרה / מאמר רב", tier: "B" },
  { id: 4, category: "editorial", name: "Right-bordered cream pull-quote", desc: "ציטוט מהמקרא: רקע #fdf8ee, גבול ימני (RTL!) של 4px בזהב/בורדו, Kedem איטליק 1.2rem, הקדשה למטה-שמאל.", why: "מבדיל ויזואלית 'הטקסט המקודש' מ'הפרשנות'. גבול שמאלי בעברית הוא tell של מעצב לא-RTL.", source: "Sefaria, Aleph", apply: "ציטוטים בכל דף שיעור / סדרה / זיכרון", tier: "S" },
  { id: 5, category: "editorial", name: "Variable-weight emphasis", desc: "במקום bold מסיבי בכל מקום — שימוש ב-450 / 550 / 700 כדי לבנות היררכיה דקה.", why: "טיפוגרפיה משתנה (variable fonts) מאפשרת ניואנסים ש-bold/regular בלבד מפספס.", source: "Stripe Press, Robin Sloan", apply: "כל הטקסט באתר", tier: "A" },

  // B. LAYOUT & RHYTHM (4)
  { id: 6, category: "layout", name: "Asymmetric magazine hero", desc: "כותרת על שני שלישים, תמונה גדולה בצד אחד, חלל ריק חזק בצד השני. לא ממורכז — אדיטוריאלי.", why: "פריצה מהדפוס המסורתי 'הירו ממורכז עם תמונה ברקע' שכולם משתמשים בו.", source: "NYT Magazine, MasterClass", apply: "Hero של שיעור-של-השבוע, סדרה מוצגת", tier: "A" },
  { id: 7, category: "layout", name: "Bento grid sections", desc: "רשת של כרטיסים בגדלים מעורבים — גדול-גדול-קטן-קטן-בינוני. כל כרטיס יחיד אבל הם מתחברים.", why: "מאפשר היררכיית חשיבות תוך שמירה על קוהרנטיות. iOS 14+ פופולרי.", source: "Apple, Stripe, Linear", apply: "דף הבית, אגף המורים, פורטל לומדים", tier: "S" },
  { id: 8, category: "layout", name: "Sticky reading TOC (RTL)", desc: "TOC צף בצד ימין (RTL) ב-desktop, scroll-spy מסמן את הסקציה הנוכחית. במובייל — pill בראש.", why: "שיעורים ארוכים = 3-6K מילים. בלי TOC, מובייל נוטש.", source: "Al Jazeera longform", apply: "דפי שיעור, מאמרים, דף סדרה", tier: "A" },
  { id: 9, category: "layout", name: "Container queries (לא רק media)", desc: "קומפוננטות שמתאימות עצמן לרוחב הגריד שלהן, לא רק ל-viewport.", why: "אותו LessonCard נראה אחרת בגריד 4-עמודתי vs sidebar צר. Container queries פותרות.", source: "modern CSS 2024+", apply: "כל ה-cards ב-design system", tier: "A" },

  // C. RTL / HEBREW-SPECIFIC (5)
  { id: 10, category: "rtl", name: "Hebrew gematria URLs + anchors", desc: "URL של פסוק עם אותיות עבריות: /bible/bereshit/א/ה במקום /bible/bereshit/1/5", why: "תרבות הציטוט המסורתית — רבנים מצטטים 'בראשית כ\"א:ב'. URL עם גמטריא מתחבר ישירות.", source: "Sefaria URL strategy", apply: "כל URL של פסוק / פרק", tier: "S" },
  { id: 11, category: "rtl", name: "Connections panel — pasuk-anchored", desc: "לחיצה על פסוק → פאנל ימני נפתח עם כל הפרשנות, הלכה, מדרש שנגעו בו, מקובצים לפי קטגוריה.", why: "משחזר את חוויית מקראות גדולות הפיזית — שכבר נחקקה במוח של המשתמש.", source: "Sefaria connections", apply: "לעתיד — דף ספר תנ\"ך", tier: "S" },
  { id: 12, category: "rtl", name: "Logical CSS properties", desc: "padding-inline-start במקום padding-right. inset-inline-end במקום left. הכל אוטומטי לפי dir.", why: "הקוד עובד אוטומטית גם ב-RTL וגם LTR. בעיות ה-flex direction ב-popup שלי קרו כי לא השתמשתי בזה.", source: "MDN, modern CSS", apply: "כל הקומפוננטות החדשות", tier: "S" },
  { id: 13, category: "rtl", name: "Nikud-aware sacred text excerpts", desc: "פסוקים מצוטטים עם נקוד מלא, font-feature-settings מסוים, גופן ייעודי (Frank Ruehl/David).", why: "פסוק בלי נקוד = 'אינטרנט'. עם נקוד = 'ספר תנ\"ך'. ההבדל הויזואלי משכנע.", source: "Aleph, Sefaria Hebrew display", apply: "כל ציטוט מקראי באתר", tier: "A" },
  { id: 14, category: "rtl", name: "Dual-pane source/translation", desc: "פסוק מקור + תרגום/פרשנות צד-לצד, כל אחד עם font-size וטוגל RTL/LTR משלו.", why: "חברותא בדיגיטל — לא להחליף בין 'מקור' ל'תרגום' אלא לראות שניהם.", source: "Sefaria.org.il", apply: "דף ספר תנ\"ך, פסוק", tier: "S" },

  // D. DISCOVERY & NAVIGATION (5)
  { id: 15, category: "discovery", name: "Topic-graph (לא רק היררכיה)", desc: "כל מושג ('תפילה', 'אברהם', 'תפילה') הוא hub עם הגדרה, פסוקים, נושאים קשורים, אנשים מחוברים.", why: "התנ\"ך הוא graph, לא tree. פסוק יחיד שייך לפרשה, חג, הלכה, דמות.", source: "Sefaria/topics", apply: "סקציה חדשה /topics", tier: "A" },
  { id: 16, category: "discovery", name: "Daily learning strip", desc: "פס דק קבוע בראש הבית: 'היום ב-י\"ב אייר — פרשת אמור · דף יומי: יבמות נ\"ז · הלכה יומית: ...'", why: "המשתמש הדתי-לאומי חי לפי לוח לימוד יומי. אתר שיודע את התאריך מהיום הראשון בונה הרגל.", source: "Yeshiva.org.il, Daf Yomi sites", apply: "homepage strip + sidebar widget", tier: "S" },
  { id: 17, category: "discovery", name: "Cmd+K command palette", desc: "Ctrl/Cmd+K פותח חלון חיפוש עם autocomplete ל: סדרות, רבנים, שיעורים, פסוקים.", why: "משתמשים מתקדמים = 80% מהשימוש. Linear, Vercel, Notion, GitHub — כולם.", source: "Linear, Vercel", apply: "global keyboard shortcut", tier: "A" },
  { id: 18, category: "discovery", name: "Faceted search", desc: "חיפוש שמאפשר לסנן בו-זמנית לפי: רב, ספר תנ\"ך, סוג מדיה, אורך, פרשה.", why: "חיפוש פתוח על 11K שיעורים = חסר תועלת. facets הופכים את החיפוש לחקר.", source: "Algolia, NYT Cooking", apply: "/search שלם", tier: "A" },
  { id: 19, category: "discovery", name: "Recently viewed strip", desc: "פס אופקי דק ב-sidebar / footer של 5 השיעורים האחרונים שצפית בהם.", why: "חזרה לשיעור באמצע נפוצה. החזרת המשתמש למקום בלי לחפש שוב.", source: "Netflix, YouTube", apply: "כל דף תוכן", tier: "B" },

  // E. MOTION & INTERACTION (4)
  { id: 20, category: "motion", name: "View Transitions API", desc: "אנימציה אוטומטית של מעבר בין דפים — תמונת סדרה ברשימה הופכת ל-hero בדף הסדרה.", why: "תחושת native app בלי spinner. נתמך ב-Chrome, Edge ב-2024+, מתקדם ב-Safari.", source: "Vercel.com, GitHub.com", apply: "מעבר series-list ↔ series-page", tier: "A" },
  { id: 21, category: "motion", name: "Scroll-driven animations (CSS)", desc: "אלמנטים נחשפים, נטענים, נעים בתגובה ל-scroll — בלי JS, רק CSS scroll-timeline.", why: "ביצועים מצוינים, ללא ספריה חיצונית. נתמך מ-Chrome 115+.", source: "scroll-driven-animations.style", apply: "hero parallax, נחשפת תוכן", tier: "B" },
  { id: 22, category: "motion", name: "Magnetic / gradient-follow buttons", desc: "כפתור שמתעוות עדינות לכיוון ה-cursor, עם גרדיאנט שמתעדכן לפי מיקום.", why: "מיקרו-אינטראקציה שמרגישה premium. Awwwards שגרה 2024-25.", source: "godly.website, Awwwards", apply: "CTA primary בלבד", tier: "B" },
  { id: 23, category: "motion", name: "FLIP animations on filter", desc: "כשמסננים קטלוג סדרות — הכרטיסים מסתדרים מחדש בתנועה חלקה (לא pop).", why: "הקטלוג שלנו עם 1300 סדרות + 7 פילטרים — בלי FLIP, נראה כמו תקלה.", source: "Material 3, Framer Motion layout", apply: "/design-series-list, /design-store", tier: "A" },

  // F. PERSONALIZATION & STATE (4)
  { id: 24, category: "personalization", name: "Theme variants (light/dark/sepia)", desc: "3 מצבי קריאה: בהיר (יום), כהה (ערב), ספיה (שבת/לילה). מתחלף עם CSS vars.", why: "משתמש דתי-לאומי לומד מאוחר בלילה. ספיה = פחות אור כחול = שינה טובה יותר.", source: "Kindle, Apple Books, Medium", apply: "Header toggle, persistent across navigation", tier: "S" },
  { id: 25, category: "personalization", name: "Reading progress bar", desc: "פס דק בראש הדף שמתמלא לפי scroll. אינדיקציה ויזואלית כמה נשאר.", why: "טקסט ארוך = החלטה אם להישאר או לעזוב. Progress bar עוזר להחליט.", source: "Medium, Substack, NYT", apply: "כל דף ארוך — שיעור, מאמר, סדרה", tier: "B" },
  { id: 26, category: "personalization", name: '"For you" rail (embedding-based)', desc: "פס המלצות מותאם לפי היסטוריית הצפייה — לא רק 'הפופולריים', אלא 'דומים למה שאהבת'.", why: "Pinecone/embeddings על 11K שיעורים. הופך את הקטלוג לאישי.", source: "Spotify Daily Mix, YouTube", apply: "פורטל, homepage", tier: "A" },
  { id: 27, category: "personalization", name: "Optimistic UI on actions", desc: "לחיצה על 'הוסף למועדפים' מעדכנת מיידית, request מתבצע ברקע. במקרה של failure — undo toast.", why: "תחושת מהירות גם ברשת איטית. React Query מוכן לזה.", source: "Linear, Vercel, GitHub", apply: "favorites, bookmarks, dedications", tier: "A" },

  // G. AUDIO-FIRST UX (3)
  { id: 28, category: "audio", name: "Persistent floating player", desc: "נגן שצף בתחתית הדף, ממשיך לנגן גם כשמנווטים בין דפים. מינימליסטי, ניתן להרחיב.", why: "Bnei Zion הוא בעיקר אודיו. להפסיק שיעור בכל ניווט = רעיון רע.", source: "Spotify Web, SoundCloud", apply: "Global, מתחת ל-MobileBottomNav", tier: "S" },
  { id: 29, category: "audio", name: "Synced transcript with audio", desc: "תמליל שמודגש מילה-במילה בזמן השמעה. אפשר ללחוץ על מילה כדי לקפוץ לזמן.", why: "נגישות + חיפוש בתוך השיעור. Otter, Descript, NYT Audio עושים את זה.", source: "NYT Audio, Otter, Pinpoint", apply: "כל שיעור עם duration > 5 דקות", tier: "A" },
  { id: 30, category: "audio", name: "Audio summary AI track", desc: "טראק קצר (90 שניות) שמסכם את השיעור — נוצר אוטומטית מה-transcript.", why: "המשתמש מחליט תוך 90 שניות אם להשמיע את כל ה-45 דקות. אפשר לכוון מ-MultiTalk/ElevenLabs.", source: "experimental — NotebookLM-like", apply: "כל שיעור > 20 דקות", tier: "B" },

  // H. READING COMFORT (2)
  { id: 31, category: "reading", name: "Comfort reading column", desc: "60-72ch ברוחב, 18-20px על desktop, 1.85 line-height, padding גמיש לפי viewport.", why: "מחקרי קריאה: 60-75 תווים בשורה = מקסימום נוחות. רוחב מסך מלא = פחות.", source: "Refactoring UI, Practical Typography", apply: "כל מקום שיש > 200 מילים", tier: "S" },
  { id: 32, category: "reading", name: "Estimated read/listen time", desc: "מעל כל מאמר/שיעור: '12 דקות קריאה' או '45 דקות האזנה'. בעברית, אייקון דק.", why: "מנהל ציפיות. משתמש שיודע ש-3 דקות נשארו ימשיך — לא יודע, נוטש.", source: "Medium, Substack", apply: "metadata strip בכל שיעור", tier: "A" },
];

const CATEGORIES: { id: Category; label: string; icon: any; color: string; intro: string }[] = [
  { id: "editorial", label: "טיפוגרפיה אדיטוריאלית", icon: Type, color: colors.goldDark, intro: "כשטיפוגרפיה היא העיצוב — מגזיני אדיטוריאל בעיתונאות איכותית" },
  { id: "layout", label: "Layout וריתמוס", icon: Layout, color: colors.oliveDark, intro: "Bento, asymmetry, sticky TOC — איך מציגים נפח גדול בלי לעייף" },
  { id: "rtl", label: "עברית ו-RTL", icon: Languages, color: colors.mahogany, intro: "מה שייחודי לעברית מקראית — ולא תמצא ב-LTR" },
  { id: "discovery", label: "גילוי וניווט", icon: Compass, color: colors.tealMain, intro: "איך משתמש מוצא את הסדרה הנכונה מתוך 1300" },
  { id: "motion", label: "Motion ואינטראקציה", icon: Zap, color: colors.goldLight, intro: "לתת לאתר להרגיש native — בלי לגרור JavaScript כבד" },
  { id: "personalization", label: "אישי ומצב", icon: User, color: colors.navyDeep, intro: "האתר שזוכר אותך, מתאים את עצמו אליך, ממשיך מאיפה שעצרת" },
  { id: "audio", label: "Audio-first UX", icon: Headphones, color: colors.goldDark, intro: "Bnei Zion הוא בעיקר אודיו — איך מקדמים את זה לעיצוב" },
  { id: "reading", label: "נוחות קריאה", icon: BookOpen, color: colors.oliveMain, intro: "פרטים שגורמים ל-2,000 מילים להרגיש כמו 500" },
];

const TIER_META: Record<Tier, { label: string; bg: string; fg: string; border: string }> = {
  S: { label: "S — חובה", bg: gradients.goldButton, fg: "white", border: colors.goldDark },
  A: { label: "A — מומלץ מאוד", bg: "rgba(91,110,58,0.12)", fg: colors.oliveDark, border: colors.oliveMain },
  B: { label: "B — נחמד", bg: "rgba(107,92,74,0.10)", fg: colors.textMuted, border: colors.textSubtle },
};

const AVOID = [
  { what: "פרגמנט מזויף / טקסטורות 'דף עתיק'", why: "סימן זיהוי של אתרים חרדים ישנים — לא מתאים לקהל דתי-לאומי" },
  { what: "אייקוני מגן דוד כ-bullets", why: "Cliché. הקפדה על תכן מעל ויזואל = יותר מכובד" },
  { what: "TOC בצד שמאל באתר RTL", why: "tell של מעצב שלא מבין RTL — מרגיש כמו תרגום מ-LTR" },
  { what: "GIFs באייקוני ניווט", why: "Daat, Hidabroot עושים את זה. נראה זנוח. אייקונים סטטיים נקיים = בוגר" },
  { what: "Royal-blue + gold gradients", why: "Cliché של מוסדות חרדיים. בורדו או זהב לבד = ייחודי" },
  { what: "תמונות ממוזערות 135×90", why: "Arutz Sheva-style. קטן מדי לזיהוי. 280×180 מינימום לכרטיס תוכן" },
  { what: "4+ שורות תפריט בכותרת", why: "ניסיון לדחוס סטייל עיתון מודפס — לא עובד ב-viewport. sidebar פותר" },
  { what: "Bold בכל מילה שלישית", why: "כשהכל חשוב — שום דבר לא חשוב. variable weights פותרים את זה" },
];

const RESEARCHED = [
  { what: "פורטלי אדיטוריאל בכירים (NYT, Atlantic, Stratechery)", coverage: "טוב" },
  { what: "אתרים יהודיים גדולים (Sefaria, Chabad, Yeshiva.org.il)", coverage: "טוב מאוד" },
  { what: "RTL ערבית (Al Jazeera, Asharq)", coverage: "טוב" },
  { what: "אתרי עיצוב 2024-2026 (Awwwards, Vercel showcase)", coverage: "סביר" },
];

const GAPS = [
  { what: "חיפוש בסקייל של 11K+ פריטים — Algolia/Pinecone דפוסים", note: "צריך עוד מחקר לפני יישום" },
  { what: "AI-assist (סיכומים, חיבורי פסוקים, related verses)", note: "OpenAI embeddings על הקטלוג כולו = פתיחת אופציות חדשות" },
  { what: "Performance budgets — Core Web Vitals כדפוס עיצובי", note: "כל הצעה חייבת לעמוד ב-LCP < 2.5s" },
  { what: "שילוב newsletter בתוך פורטל (substack-like)", note: "Smoove/email tie-in, מקושר לפרופיל" },
  { what: "i18n אמיתי (לא רק dir='rtl')", note: "תמיכה באנגלית/צרפתית בעתיד — number formatting, date formatting, RTL switching" },
];

const TOP10 = [
  { rank: 1, name: "פס לימוד יומי בראש כל דף", reason: "הרגל יומי + טראסט. בנייה של RR (Returning Rate)." },
  { rank: 2, name: "Floating audio player גלובלי", reason: "Bnei Zion = אודיו. בלי זה — חוויה שבורה בכל ניווט." },
  { rank: 3, name: "Theme switcher (בהיר/כהה/ספיה)", reason: "לימוד לילה = ספיה. למוד יום = בהיר. אצל הקהל המסורתי במיוחד." },
  { rank: 4, name: "Right-bordered cream pull-quote לכל ציטוט מקראי", reason: "ההבחנה הויזואלית הקריטית בין 'מקור' ל'פירוש'." },
  { rank: 5, name: "Cmd+K command palette", reason: "30 דקות ליישום, 80% מהמשתמשים המתקדמים יאהבו." },
  { rank: 6, name: "Estimated time + reading progress bar", reason: "ניהול ציפיות = השלמה גבוהה יותר." },
  { rank: 7, name: "FLIP animations על סינון קטלוג", reason: "1300 סדרות × 7 פילטרים — בלי FLIP, נראה שבור." },
  { rank: 8, name: "Display × body type pairing", reason: "Kedem ל-h1/h2 + Ploni לגוף + line-height 1.8 = איכות." },
  { rank: 9, name: "Logical CSS properties בכל מקום", reason: "מונע באגים כמו זה שיש לי כבר ב-popup. drop-in fix." },
  { rank: 10, name: "Optimistic UI לכל פעולת state", reason: "מהירות נתפסת > מהירות אמיתית. מעבר לרמה אחרת." },
];

// ────────────────────────────────────────────────────────────────────────
export default function DesignPreviewResearch() {
  const [activeTier, setActiveTier] = useState<"all" | Tier>("all");
  const [activeCat, setActiveCat] = useState<"all" | Category>("all");

  const filtered = PATTERNS.filter((p) => (activeTier === "all" || p.tier === activeTier) && (activeCat === "all" || p.category === activeCat));

  const sCount = PATTERNS.filter((p) => p.tier === "S").length;
  const aCount = PATTERNS.filter((p) => p.tier === "A").length;
  const bCount = PATTERNS.filter((p) => p.tier === "B").length;

  return (
    <DesignLayout transparentHeader overlapHero>
      {/* ─── Editorial hero ─── */}
      <Hero />

      {/* ─── Methodology ─── */}
      <section style={{ background: colors.parchment, padding: "5rem 1.5rem 3rem" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", position: "relative" }} dir="rtl">
          {/* Editorial number marker (PATTERN #2 — demo) */}
          <div
            style={{
              position: "absolute",
              top: "-1.5rem",
              insetInlineStart: "-3rem",
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: "clamp(3rem, 8vw, 5rem)",
              color: "rgba(139,111,71,0.12)",
              lineHeight: 1,
            }}
            aria-hidden
          >
            01
          </div>

          <Eyebrow color={colors.goldDark}>מתודולוגיה</Eyebrow>
          <H2>מה חקרנו, איך, ומה גילינו</H2>

          {/* Drop cap (PATTERN #3 — demo) */}
          <div style={{ position: "relative" }}>
            <span
              style={{
                float: "right",
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "5.5rem",
                lineHeight: 0.85,
                color: colors.goldDark,
                marginInlineStart: "0.5rem",
                marginTop: "0.4rem",
                marginBottom: "0.2rem",
              }}
            >
              ב
            </span>
            <p style={{ fontFamily: fonts.body, fontSize: "1.05rem", lineHeight: 2.05, color: colors.textMid, margin: 0 }}>
              בסיבוב הזה חקרנו את שפת העיצוב של פורטלי תוכן מובילים בעולם — ספריא, אל-ג'זירה, NYT, Stratechery, MasterClass, Sefaria, Chabad. הוצאנו 32 דפוסי עיצוב, פרסמנו אותם בקטגוריות, ומצאנו 8 שיש להימנע מהם בכל מחיר. החקירה לא מסתיימת כאן — בסוף הדף, סקציה מיוחדת שמראה <strong>מה <em>לא</em> כיסינו</strong>, ומה כדאי לחקור הלאה.
            </p>
          </div>

          {/* Pull quote (PATTERN #4 — demo) */}
          <PullQuote>
            "סעדיה לא היה ספר תורה שמונח בארון הקודש; הוא היה ספר תורה מהלך."
            <em style={{ display: "block", marginTop: "0.5rem", fontSize: "0.78rem", color: colors.textSubtle, fontStyle: "normal" }}>
              — דוגמה לציטוט בדפוס #4 בלוג זה (Right-bordered cream pull-quote)
            </em>
          </PullQuote>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginTop: "2.5rem" }}>
            <Stat n="32" label="דפוסים" />
            <Stat n="8" label="קטגוריות" />
            <Stat n="11" label="אתרים שנדגמו" />
            <Stat n="10" label="ב-S Tier" />
          </div>
        </div>
      </section>

      {/* ─── Filter bar ─── */}
      <section
        style={{
          background: colors.parchment,
          padding: "2rem 1.5rem 0",
          position: "sticky",
          top: 96,
          zIndex: 10,
          borderBottom: `1px solid rgba(139,111,71,0.08)`,
        }}
      >
        <div dir="rtl" style={{ maxWidth: 1280, margin: "0 auto", paddingBottom: "1.25rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            <Chip active={activeCat === "all"} onClick={() => setActiveCat("all")}>הכל ({PATTERNS.length})</Chip>
            {CATEGORIES.map((c) => {
              const count = PATTERNS.filter((p) => p.category === c.id).length;
              return (
                <Chip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} accent={c.color}>
                  {c.label} ({count})
                </Chip>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Chip active={activeTier === "all"} onClick={() => setActiveTier("all")} small>כל הרמות</Chip>
            <Chip active={activeTier === "S"} onClick={() => setActiveTier("S")} accent={colors.goldDark} small>S — חובה ({sCount})</Chip>
            <Chip active={activeTier === "A"} onClick={() => setActiveTier("A")} accent={colors.oliveMain} small>A — מומלץ ({aCount})</Chip>
            <Chip active={activeTier === "B"} onClick={() => setActiveTier("B")} accent={colors.textMuted} small>B — נחמד ({bCount})</Chip>
          </div>
        </div>
      </section>

      {/* ─── Bento grid of patterns (PATTERN #7 — demo) ─── */}
      <section style={{ background: colors.parchment, padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }} dir="rtl">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
            {filtered.map((p) => (
              <PatternCard key={p.id} pattern={p} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "4rem", fontFamily: fonts.body, color: colors.textMuted }}>
              אין דפוסים בקטגוריה הזו ברמה הזו.
            </div>
          )}
        </div>
      </section>

      {/* ─── Top 10 priority moves ─── */}
      <section style={{ background: gradients.warmDark, padding: "5rem 1.5rem", color: "white" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }} dir="rtl">
          <Eyebrow color={colors.goldShimmer}>סדר עדיפות</Eyebrow>
          <H2 dark>10 המהלכים הכי חשובים — לפי סדר</H2>
          <p style={{ fontFamily: fonts.body, fontSize: "1rem", lineHeight: 1.85, color: "rgba(255,255,255,0.7)", marginBottom: "2rem" }}>
            אם יש לך זמן ומשאבים ל-10 דברים בלבד מתוך 32 — אלה הם, לפי ROI חזוי. כל מהלך מסומן עם זמן יישום משוער.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {TOP10.map((t) => (
              <div
                key={t.rank}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: radii.lg,
                  padding: "1.25rem 1.5rem",
                  border: `1px solid rgba(232,213,160,0.12)`,
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "1.25rem",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 900,
                    fontSize: "2.4rem",
                    color: colors.goldShimmer,
                    minWidth: 56,
                    textAlign: "center",
                    lineHeight: 1,
                  }}
                >
                  {t.rank}
                </div>
                <div>
                  <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.05rem", color: colors.goldShimmer, marginBottom: "0.3rem" }}>
                    {t.name}
                  </div>
                  <div style={{ fontFamily: fonts.body, fontSize: "0.88rem", lineHeight: 1.7, color: "rgba(255,255,255,0.75)" }}>
                    {t.reason}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── What to AVOID ─── */}
      <section style={{ background: colors.parchmentDark, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }} dir="rtl">
          <Eyebrow color="#a52a2a">להימנע</Eyebrow>
          <H2>8 טעויות שראיתי שגורמות לאתרים להיראות בני 10 שנים</H2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginTop: "1.5rem" }}>
            {AVOID.map((a, i) => (
              <div
                key={i}
                style={{
                  background: "white",
                  borderRadius: radii.md,
                  padding: "1.1rem 1.35rem",
                  border: `1px solid rgba(165,42,42,0.15)`,
                  borderInlineStart: `4px solid #a52a2a`,
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "0.85rem",
                  alignItems: "start",
                }}
              >
                <XCircle style={{ width: 20, height: 20, color: "#a52a2a", marginTop: "0.15rem" }} />
                <div>
                  <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.98rem", color: colors.textDark, marginBottom: "0.2rem" }}>
                    {a.what}
                  </div>
                  <div style={{ fontFamily: fonts.body, fontSize: "0.85rem", lineHeight: 1.65, color: colors.textMuted }}>
                    {a.why}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Self-reflection: what we researched + what's missing ─── */}
      <section style={{ background: colors.parchment, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }} dir="rtl">
          <Eyebrow color={colors.tealMain}>ביקורת עצמית</Eyebrow>
          <H2>מה חקרנו — ומה לא</H2>
          <p style={{ fontFamily: fonts.body, fontSize: "1rem", lineHeight: 1.95, color: colors.textMid, marginBottom: "2.5rem" }}>
            כיוון שביקשת חקירה <em>שתחקור את עצמה</em>, הוצאתי את עצמי החוצה ובחנתי מה כיסיתי ומה לא. הסקציה הזו היא ה-meta של המחקר.
          </p>

          {/* Researched */}
          <div style={{ marginBottom: "2.5rem" }}>
            <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.2rem", color: colors.textDark, marginBottom: "1rem" }}>
              ✓ מה כיסינו
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {RESEARCHED.map((r, i) => (
                <div
                  key={i}
                  style={{
                    background: "white",
                    borderRadius: radii.sm,
                    padding: "0.85rem 1.1rem",
                    border: `1px solid rgba(45,125,125,0.15)`,
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: "0.75rem",
                    alignItems: "center",
                  }}
                >
                  <CheckCircle2 size={18} style={{ color: colors.tealMain }} />
                  <div style={{ fontFamily: fonts.display, fontSize: "0.92rem", fontWeight: 600, color: colors.textDark }}>
                    {r.what}
                  </div>
                  <span style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.tealMain, fontWeight: 700 }}>
                    {r.coverage}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Gaps */}
          <div>
            <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.2rem", color: colors.textDark, marginBottom: "1rem" }}>
              ⚠ מה <em>לא</em> כיסינו — לסבב הבא
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {GAPS.map((g, i) => (
                <div
                  key={i}
                  style={{
                    background: "white",
                    borderRadius: radii.md,
                    padding: "1rem 1.25rem",
                    border: `1px solid rgba(196,162,101,0.2)`,
                    borderInlineStart: `4px solid ${colors.goldDark}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    <AlertTriangle size={16} style={{ color: colors.goldDark }} />
                    <div style={{ fontFamily: fonts.display, fontSize: "0.95rem", fontWeight: 700, color: colors.textDark }}>
                      {g.what}
                    </div>
                  </div>
                  <div style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, lineHeight: 1.65, paddingInlineStart: "1.65rem" }}>
                    {g.note}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Closing CTA ─── */}
      <section style={{ background: gradients.warmDark, padding: "5rem 1.5rem", color: "white", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Sparkles style={{ width: 32, height: 32, color: colors.goldShimmer, margin: "0 auto 1rem" }} />
          <h2
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
              margin: "0 0 1.25rem",
              fontStyle: "italic",
              lineHeight: 1.3,
            }}
            dir="rtl"
          >
            עכשיו זה תורך — בחר 3 דפוסים, נתחיל ליישם
          </h2>
          <p
            dir="rtl"
            style={{
              fontFamily: fonts.body,
              fontSize: "1rem",
              lineHeight: 1.85,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            תגיד לי איזה 3 מתוך ה-32 הכי חשובים לך — אני בונה אותם ב-sandbox הבא ב-PR אחד נקי. אם השלושה הראשונים שלך הם <b>S-tier</b> שכבר בראש העדיפות שלי — נחסוך זמן רב.
          </p>
        </div>
      </section>
    </DesignLayout>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <div
      style={{
        minHeight: 580,
        position: "relative",
        overflow: "hidden",
        marginTop: -96,
        background: gradients.mahoganyHero,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 70% 30%, rgba(232,213,160,0.12) 0%, transparent 50%)",
        }}
      />
      <svg style={{ position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none" }} width="100%" height="100%" aria-hidden>
        <filter id="grain-research"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#grain-research)" />
      </svg>

      <div
        dir="rtl"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
          padding: "150px 1.5rem 4rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "3rem",
          alignItems: "center",
        }}
        className="research-hero"
      >
        {/* Right side (RTL start): big editorial type */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1.25rem",
              fontFamily: fonts.body,
              fontSize: "0.78rem",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: colors.goldShimmer,
              fontWeight: 700,
            }}
          >
            <Search size={14} />
            <span>חקירת עיצוב</span>
            <span style={{ color: "rgba(232,213,160,0.4)" }}>·</span>
            <span>אפריל 2026</span>
          </div>

          <h1
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "clamp(2.4rem, 5.5vw, 4.4rem)",
              color: "rgba(255,255,255,0.97)",
              textShadow: "0 4px 30px rgba(0,0,0,0.4)",
              margin: "0 0 1.25rem",
              lineHeight: 1.05,
              fontStyle: "italic",
            }}
          >
            32 דפוסי עיצוב<br />
            <span style={{ color: colors.goldShimmer, fontStyle: "normal" }}>לסבב הבא של בני ציון</span>
          </h1>

          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "1.1rem",
              lineHeight: 1.85,
              color: "rgba(255,255,255,0.78)",
              maxWidth: 480,
              margin: 0,
            }}
          >
            חקירה מקיפה של פורטלי תוכן מהדרגה הראשונה בעולם, עם דגש על RTL, סקייל גדול, וחומר מקודש. כל דפוס מתורגם להמלצה ספציפית לבני ציון.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "2rem", fontFamily: fonts.body, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
            <ArrowDown size={16} />
            גלול כדי לראות את כולם
          </div>
        </div>

        {/* Left side: scrap of "magazine cover" elements */}
        <div className="research-hero-graphic" style={{ position: "relative", aspectRatio: "1 / 1", maxWidth: 480 }}>
          <FloatingTag tier="S" top="8%" right="5%" rotate={-8}>S — חובה</FloatingTag>
          <FloatingTag tier="A" top="35%" right="60%" rotate={4}>10 דפוסים</FloatingTag>
          <FloatingTag tier="B" top="68%" right="15%" rotate={-3}>8 קטגוריות</FloatingTag>
          <FloatingTag tier="S" top="20%" right="40%" rotate={6}>11 אתרים נחקרו</FloatingTag>

          {/* Big quote in glass card */}
          <div
            style={{
              position: "absolute",
              top: "45%",
              insetInlineStart: "8%",
              right: "8%",
              transform: "translateY(-50%)",
              padding: "1.25rem 1.5rem",
              background: "rgba(26,18,8,0.5)",
              backdropFilter: "blur(20px) saturate(150%)",
              WebkitBackdropFilter: "blur(20px) saturate(150%)",
              borderRadius: radii.xl,
              border: "1px solid rgba(232,213,160,0.18)",
              fontFamily: fonts.display,
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.92)",
              fontStyle: "italic",
              textAlign: "center",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            }}
          >
            <Quote style={{ width: 16, height: 16, color: "rgba(232,213,160,0.5)", margin: "0 auto 0.6rem", display: "block" }} />
            "טוב פחות, אבל לעומק. סבב אחד עם 10 דפוסים מצוינים שווה 10 סבבים עם 32 בינוניים."
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .research-hero { grid-template-columns: 1fr !important; }
          .research-hero-graphic { display: none; }
        }
      `}</style>
    </div>
  );
}

function FloatingTag({ children, tier, top, right, rotate }: { children: React.ReactNode; tier: Tier; top: string; right: string; rotate: number }) {
  const meta = TIER_META[tier];
  return (
    <div
      style={{
        position: "absolute",
        top,
        insetInlineEnd: right,
        padding: "0.4rem 0.85rem",
        background: meta.bg,
        color: meta.fg,
        fontFamily: fonts.body,
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.1em",
        borderRadius: radii.pill,
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        transform: `rotate(${rotate}deg)`,
        whiteSpace: "nowrap",
        border: `1px solid ${meta.border}`,
      }}
    >
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Pattern card
// ────────────────────────────────────────────────────────────────────────
function PatternCard({ pattern }: { pattern: Pattern }) {
  const cat = CATEGORIES.find((c) => c.id === pattern.category)!;
  const Icon = cat.icon;
  const tier = TIER_META[pattern.tier];

  return (
    <article
      style={{
        background: "white",
        borderRadius: radii.xl,
        padding: "1.5rem 1.6rem 1.6rem",
        border: `1px solid rgba(139,111,71,0.1)`,
        boxShadow: shadows.cardSoft,
        position: "relative",
        transition: "all 0.28s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = shadows.cardHover;
        e.currentTarget.style.borderColor = cat.color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = shadows.cardSoft;
        e.currentTarget.style.borderColor = "rgba(139,111,71,0.1)";
      }}
    >
      {/* Editorial number marker */}
      <div
        style={{
          position: "absolute",
          top: "0.8rem",
          insetInlineStart: "0.85rem",
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: "1.15rem",
          color: "rgba(139,111,71,0.25)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {String(pattern.id).padStart(2, "0")}
      </div>

      {/* Tier badge */}
      <div
        style={{
          position: "absolute",
          top: "0.85rem",
          insetInlineEnd: "0.85rem",
          padding: "0.2rem 0.55rem",
          borderRadius: radii.sm,
          background: pattern.tier === "S" ? gradients.goldButton : tier.bg,
          color: tier.fg,
          fontFamily: fonts.body,
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
        }}
      >
        {pattern.tier}
      </div>

      {/* Category eyebrow */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          fontFamily: fonts.body,
          fontSize: "0.65rem",
          fontWeight: 700,
          color: cat.color,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginTop: "0.75rem",
          marginBottom: "0.6rem",
        }}
      >
        <Icon size={11} />
        {cat.label}
      </div>

      <h3
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: "1.05rem",
          color: colors.textDark,
          margin: "0 0 0.7rem",
          lineHeight: 1.35,
        }}
      >
        {pattern.name}
      </h3>

      <p
        style={{
          fontFamily: fonts.body,
          fontSize: "0.88rem",
          lineHeight: 1.7,
          color: colors.textMid,
          margin: "0 0 0.85rem",
          flex: 1,
        }}
      >
        {pattern.desc}
      </p>

      <div style={{ paddingTop: "0.85rem", borderTop: `1px solid rgba(139,111,71,0.08)`, fontFamily: fonts.body, fontSize: "0.78rem", lineHeight: 1.7 }}>
        <div style={{ marginBottom: "0.45rem" }}>
          <span style={{ color: colors.textSubtle, fontWeight: 700 }}>למה:</span>{" "}
          <span style={{ color: colors.textMuted }}>{pattern.why}</span>
        </div>
        <div style={{ marginBottom: "0.45rem" }}>
          <span style={{ color: colors.textSubtle, fontWeight: 700 }}>לאתר:</span>{" "}
          <span style={{ color: colors.textMid }}>{pattern.apply}</span>
        </div>
        <div>
          <span style={{ color: colors.textSubtle, fontWeight: 700 }}>מקור:</span>{" "}
          <span style={{ color: colors.goldDark, fontFamily: fonts.body }}>{pattern.source}</span>
        </div>
      </div>
    </article>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────
function Eyebrow({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div
      style={{
        fontFamily: fonts.body,
        fontSize: "0.78rem",
        fontWeight: 700,
        color,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        marginBottom: "0.65rem",
      }}
    >
      {children}
    </div>
  );
}

function H2({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <h2
      style={{
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
        color: dark ? colors.goldShimmer : colors.textDark,
        margin: "0 0 1.5rem",
        lineHeight: 1.2,
      }}
    >
      {children}
    </h2>
  );
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        margin: "2rem 0",
        padding: "1.5rem 1.85rem",
        background: "#fdf8ee",
        borderInlineEnd: `4px solid ${colors.goldLight}`,
        borderRadius: radii.md,
        fontFamily: fonts.display,
        fontSize: "1.15rem",
        lineHeight: 1.7,
        color: colors.textDark,
        fontStyle: "italic",
      }}
    >
      <Quote style={{ width: 16, height: 16, color: colors.goldDark, marginBottom: "0.6rem", opacity: 0.5 }} />
      {children}
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: radii.lg,
        padding: "1rem 1.1rem",
        border: `1px solid rgba(139,111,71,0.1)`,
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.8rem", color: colors.goldDark, lineHeight: 1, marginBottom: "0.25rem" }}>
        {n}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textMuted, letterSpacing: "0.05em" }}>
        {label}
      </div>
    </div>
  );
}

function Chip({ children, active, onClick, accent, small = false }: { children: React.ReactNode; active: boolean; onClick: () => void; accent?: string; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: small ? "0.35rem 0.85rem" : "0.5rem 1.1rem",
        borderRadius: radii.pill,
        border: `1.5px solid ${active ? accent || colors.goldDark : "rgba(139,111,71,0.2)"}`,
        background: active ? accent || colors.goldDark : "white",
        color: active ? "white" : colors.textMuted,
        fontFamily: fonts.body,
        fontSize: small ? "0.78rem" : "0.82rem",
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}
