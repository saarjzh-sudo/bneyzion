/**
 * /design-research — Editorial-style page synthesizing 32 design patterns.
 * Each pattern card now DEMONSTRATES the pattern in itself (interactive demo).
 * Saar's spec: "כל קופסה תדגים את הפטרן בפועל — לא תיאור בלבד."
 */
import { useState, useRef, useEffect } from "react";
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
  Heart,
  Bookmark,
  Volume2,
  Play,
  Command,
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

  const filtered = PATTERNS.filter(
    (p) =>
      (activeTier === "all" || p.tier === activeTier) &&
      (activeCat === "all" || p.category === activeCat)
  );

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
          {/* Pattern #2 demo — editorial number */}
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

          {/* Pattern #3 demo — drop cap */}
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

          {/* Pattern #4 demo — pull quote */}
          <PullQuote>
            "סעדיה לא היה ספר תורה שמונח בארון הקודש; הוא היה ספר תורה מהלך."
            <em style={{ display: "block", marginTop: "0.5rem", fontSize: "0.78rem", color: colors.textSubtle, fontStyle: "normal" }}>
              — דוגמה לציטוט בדפוס #4 (Right-bordered cream pull-quote, גבול ימין ב-RTL)
            </em>
          </PullQuote>

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
          top: "var(--bz-header-h, 96px)",
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

      {/* ─── Pattern grid ─── */}
      <section style={{ background: colors.parchment, padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }} dir="rtl">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem" }}>
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

      {/* ─── Top 10 ─── */}
      <section style={{ background: gradients.warmDark, padding: "5rem 1.5rem", color: "white" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }} dir="rtl">
          <Eyebrow color={colors.goldShimmer}>סדר עדיפות</Eyebrow>
          <H2 dark>10 המהלכים הכי חשובים — לפי סדר</H2>
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

      {/* ─── Avoid ─── */}
      <section style={{ background: colors.parchmentDark, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }} dir="rtl">
          <Eyebrow color="#a52a2a">להימנע</Eyebrow>
          <H2>8 טעויות שגורמות לאתרים להיראות בני 10 שנים</H2>
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
                  <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.98rem", color: colors.textDark, marginBottom: "0.2rem" }}>{a.what}</div>
                  <div style={{ fontFamily: fonts.body, fontSize: "0.85rem", lineHeight: 1.65, color: colors.textMuted }}>{a.why}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Self-reflection ─── */}
      <section style={{ background: colors.parchment, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }} dir="rtl">
          <Eyebrow color={colors.tealMain}>ביקורת עצמית</Eyebrow>
          <H2>מה חקרנו — ומה לא</H2>
          <div style={{ marginBottom: "2.5rem" }}>
            <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.2rem", color: colors.textDark, marginBottom: "1rem" }}>✓ מה כיסינו</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {RESEARCHED.map((r, i) => (
                <div key={i} style={{ background: "white", borderRadius: radii.sm, padding: "0.85rem 1.1rem", border: `1px solid rgba(45,125,125,0.15)`, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0.75rem", alignItems: "center" }}>
                  <CheckCircle2 size={18} style={{ color: colors.tealMain }} />
                  <div style={{ fontFamily: fonts.display, fontSize: "0.92rem", fontWeight: 600, color: colors.textDark }}>{r.what}</div>
                  <span style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.tealMain, fontWeight: 700 }}>{r.coverage}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.2rem", color: colors.textDark, marginBottom: "1rem" }}>⚠ מה <em>לא</em> כיסינו — לסבב הבא</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {GAPS.map((g, i) => (
                <div key={i} style={{ background: "white", borderRadius: radii.md, padding: "1rem 1.25rem", border: `1px solid rgba(196,162,101,0.2)`, borderInlineStart: `4px solid ${colors.goldDark}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    <AlertTriangle size={16} style={{ color: colors.goldDark }} />
                    <div style={{ fontFamily: fonts.display, fontSize: "0.95rem", fontWeight: 700, color: colors.textDark }}>{g.what}</div>
                  </div>
                  <div style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, lineHeight: 1.65, paddingInlineStart: "1.65rem" }}>{g.note}</div>
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
          <h2 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "clamp(1.5rem, 3vw, 2.2rem)", margin: "0 0 1.25rem", fontStyle: "italic", lineHeight: 1.3 }} dir="rtl">
            עכשיו זה תורך — בחר 3 דפוסים, נתחיל ליישם
          </h2>
          <p dir="rtl" style={{ fontFamily: fonts.body, fontSize: "1rem", lineHeight: 1.85, color: "rgba(255,255,255,0.7)" }}>
            תגיד לי איזה 3 מתוך ה-32 הכי חשובים לך — אני בונה אותם ב-sandbox הבא ב-PR אחד נקי.
          </p>
        </div>
      </section>

      <style>{`
        @keyframes subtleFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes progressFill { from { width: 0%; } to { width: 72%; } }
        @keyframes themePulse { 0%,100% { opacity:1; } 50% { opacity:0.7; } }
        @keyframes waveWord { 0%,100% { background: transparent; } 40%,60% { background: rgba(139,111,71,0.18); border-radius: 3px; } }
        @keyframes cardSlide { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes magnetPulse { 0%,100% { box-shadow: 0 4px 20px rgba(139,111,71,0.3); } 50% { box-shadow: 0 8px 40px rgba(139,111,71,0.6), 0 0 0 4px rgba(139,111,71,0.15); } }
        @keyframes scrollbar { 0% { transform: translateY(0); } 100% { transform: translateY(48px); } }
        @keyframes flipItem { 0%,100% { transform: translateY(0); opacity:1; } 50% { transform: translateY(-6px); opacity:0.7; } }
        @keyframes bentoShift { 0%,100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        @keyframes typeChange { 0%,45% { opacity:1; } 50%,95% { opacity:0; } 100% { opacity:1; } }
        @keyframes borderPulse { 0%,100% { border-inline-end-color: rgba(196,162,101,0.5); } 50% { border-inline-end-color: rgba(139,111,71,1); } }
        @keyframes nodeExpand { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
      `}</style>
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
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 30%, rgba(232,213,160,0.12) 0%, transparent 50%)" }} />
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
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", fontFamily: fonts.body, fontSize: "0.78rem", letterSpacing: "0.25em", textTransform: "uppercase", color: colors.goldShimmer, fontWeight: 700 }}>
            <Search size={14} />
            <span>חקירת עיצוב</span>
            <span style={{ color: "rgba(232,213,160,0.4)" }}>·</span>
            <span>אפריל 2026</span>
          </div>
          <h1 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "clamp(2.4rem, 5.5vw, 4.4rem)", color: "rgba(255,255,255,0.97)", textShadow: "0 4px 30px rgba(0,0,0,0.4)", margin: "0 0 1.25rem", lineHeight: 1.05, fontStyle: "italic" }}>
            32 דפוסי עיצוב<br />
            <span style={{ color: colors.goldShimmer, fontStyle: "normal" }}>לסבב הבא של בני ציון</span>
          </h1>
          <p style={{ fontFamily: fonts.body, fontSize: "1.1rem", lineHeight: 1.85, color: "rgba(255,255,255,0.78)", maxWidth: 480, margin: 0 }}>
            חקירה מקיפה של פורטלי תוכן מהדרגה הראשונה בעולם, עם דגש על RTL, סקייל גדול, וחומר מקודש. כל דפוס מתורגם להמלצה ספציפית לבני ציון. <strong style={{ color: colors.goldShimmer }}>כל קופסה מדגימה את הפטרן שהיא מתארת.</strong>
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "2rem", fontFamily: fonts.body, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
            <ArrowDown size={16} />
            גלול כדי לראות את כולם — עם דמו חי
          </div>
        </div>

        <div className="research-hero-graphic" style={{ position: "relative", aspectRatio: "1 / 1", maxWidth: 480 }}>
          <FloatingTag tier="S" top="8%" right="5%" rotate={-8}>S — חובה</FloatingTag>
          <FloatingTag tier="A" top="35%" right="60%" rotate={4}>10 דפוסים</FloatingTag>
          <FloatingTag tier="B" top="68%" right="15%" rotate={-3}>8 קטגוריות</FloatingTag>
          <FloatingTag tier="S" top="20%" right="40%" rotate={6}>11 אתרים נחקרו</FloatingTag>
          <div
            style={{
              position: "absolute", top: "45%", insetInlineStart: "8%", right: "8%",
              transform: "translateY(-50%)", padding: "1.25rem 1.5rem",
              background: "rgba(26,18,8,0.5)", backdropFilter: "blur(20px) saturate(150%)",
              WebkitBackdropFilter: "blur(20px) saturate(150%)",
              borderRadius: radii.xl, border: "1px solid rgba(232,213,160,0.18)",
              fontFamily: fonts.display, fontSize: "1rem", lineHeight: 1.6,
              color: "rgba(255,255,255,0.92)", fontStyle: "italic", textAlign: "center",
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
    <div style={{ position: "absolute", top, insetInlineEnd: right, padding: "0.4rem 0.85rem", background: meta.bg, color: meta.fg, fontFamily: fonts.body, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", borderRadius: radii.pill, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", transform: `rotate(${rotate}deg)`, whiteSpace: "nowrap", border: `1px solid ${meta.border}` }}>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Pattern card — each renders a unique micro-demo of the pattern
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
        padding: "0 0 1.4rem",
        border: `1px solid rgba(139,111,71,0.1)`,
        boxShadow: shadows.cardSoft,
        position: "relative",
        transition: "all 0.28s",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
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
      {/* ── MICRO-DEMO AREA — unique per pattern ── */}
      <PatternDemo id={pattern.id} catColor={cat.color} />

      {/* ── Card metadata ── */}
      <div style={{ padding: "1rem 1.4rem 0" }}>
        {/* Number + tier */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
          <span style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1rem", color: "rgba(139,111,71,0.3)", fontVariantNumeric: "tabular-nums" }}>
            {String(pattern.id).padStart(2, "0")}
          </span>
          <span style={{ padding: "0.2rem 0.55rem", borderRadius: radii.sm, background: pattern.tier === "S" ? gradients.goldButton : tier.bg, color: tier.fg, fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>
            {pattern.tier}
          </span>
        </div>

        {/* Category */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, color: cat.color, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
          <Icon size={11} />
          {cat.label}
        </div>

        <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.05rem", color: colors.textDark, margin: "0 0 0.6rem", lineHeight: 1.35 }}>
          {pattern.name}
        </h3>

        <p style={{ fontFamily: fonts.body, fontSize: "0.86rem", lineHeight: 1.7, color: colors.textMid, margin: "0 0 0.85rem", flex: 1 }}>
          {pattern.desc}
        </p>

        <div style={{ paddingTop: "0.85rem", borderTop: `1px solid rgba(139,111,71,0.08)`, fontFamily: fonts.body, fontSize: "0.78rem", lineHeight: 1.7 }}>
          <div style={{ marginBottom: "0.35rem" }}>
            <span style={{ color: colors.textSubtle, fontWeight: 700 }}>למה:</span>{" "}
            <span style={{ color: colors.textMuted }}>{pattern.why}</span>
          </div>
          <div>
            <span style={{ color: colors.textSubtle, fontWeight: 700 }}>מקור:</span>{" "}
            <span style={{ color: colors.goldDark }}>{pattern.source}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Micro-demos — one per pattern ID
// ────────────────────────────────────────────────────────────────────────
function PatternDemo({ id, catColor }: { id: number; catColor: string }) {
  switch (id) {
    // 1 — Display × body type pairing
    case 1: return (
      <div style={{ background: colors.parchmentDark, padding: "1.4rem 1.6rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.5rem", color: colors.textDark, lineHeight: 1.2, marginBottom: "0.4rem" }}>
          פרשת בראשית — בשביל מה ברא?
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: "0.85rem", lineHeight: 1.85, color: colors.textMuted }}>
          שאלה זו העסיקה את הפרשנים מדורי דורות. רש"י פותח בה את פירושו הגדול.
        </div>
        <div style={{ marginTop: "0.5rem", display: "flex", gap: "1rem" }}>
          <span style={{ fontFamily: fonts.display, fontSize: "0.7rem", color: colors.goldDark, fontWeight: 700, letterSpacing: "0.1em" }}>KEDEM — כותרת</span>
          <span style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textSubtle }}>PLONI — גוף</span>
        </div>
      </div>
    );

    // 2 — Editorial number markers
    case 2: return (
      <div style={{ background: colors.parchment, padding: "1.4rem 1.6rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110, position: "relative", overflow: "hidden" }} dir="rtl">
        <div style={{ position: "absolute", top: "-0.5rem", insetInlineStart: "0.5rem", fontFamily: fonts.display, fontWeight: 900, fontSize: "5rem", color: "rgba(139,111,71,0.12)", lineHeight: 1 }} aria-hidden>02</div>
        <div style={{ position: "relative", fontFamily: fonts.body, fontSize: "0.9rem", lineHeight: 1.8, color: colors.textMid, maxWidth: 220, marginInlineStart: "2.5rem" }}>
          מספר עצום בשוליים — ויזואל חזק, לא מציף את התוכן.
        </div>
      </div>
    );

    // 3 — Drop cap
    case 3: return (
      <div style={{ background: colors.parchment, padding: "1.4rem 1.6rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div>
          <span style={{ float: "right", fontFamily: fonts.display, fontWeight: 900, fontSize: "3.8rem", lineHeight: 0.85, color: colors.goldDark, marginInlineStart: "0.4rem", marginTop: "0.3rem", marginBottom: "0.1rem" }}>ב</span>
          <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", lineHeight: 1.75, color: colors.textMid, margin: 0 }}>
            בראשית ברא אלהים את השמים ואת הארץ. אות פתיחה גדולה — רק בסגורות (ב/ה/ד/ם/ת).
          </p>
        </div>
      </div>
    );

    // 4 — Pull quote RTL
    case 4: return (
      <div style={{ background: "#fdf8ee", padding: "1.4rem 1.6rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110, borderInlineEnd: `4px solid ${colors.goldLight}`, animation: "borderPulse 3s ease-in-out infinite" }} dir="rtl">
        <Quote style={{ width: 14, height: 14, color: "rgba(139,111,71,0.4)", marginBottom: "0.4rem" }} />
        <p style={{ fontFamily: fonts.display, fontSize: "0.95rem", lineHeight: 1.7, color: colors.textDark, margin: 0, fontStyle: "italic" }}>
          "וּמַה ה' אֱלֹהֶיךָ שֹׁאֵל מֵעִמָּךְ"
        </p>
        <div style={{ marginTop: "0.5rem", fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textSubtle }}>— דברים י, יב · גבול ימני = RTL נכון</div>
      </div>
    );

    // 5 — Variable weight
    case 5: return (
      <div style={{ background: colors.parchment, padding: "1.4rem 1.6rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {[
            { w: 300, label: "300 — קליל" },
            { w: 450, label: "450 — רגיל" },
            { w: 600, label: "600 — דגש" },
            { w: 800, label: "800 — חשוב" },
          ].map(({ w, label }) => (
            <div key={w} style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
              <span style={{ fontFamily: fonts.display, fontWeight: w, fontSize: "1rem", color: colors.textDark, width: "6rem" }}>בני ציון</span>
              <span style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.textSubtle }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );

    // 6 — Asymmetric hero
    case 6: return (
      <div style={{ background: gradients.mahoganyHero, padding: "1.25rem 1.6rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110, display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", alignItems: "center" }} dir="rtl">
        <div>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.05rem", color: "white", lineHeight: 1.2, marginBottom: "0.3rem" }}>שיעור השבוע</div>
          <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(255,255,255,0.6)" }}>הרב ראובן ששון</div>
        </div>
        <div style={{ background: "rgba(232,213,160,0.12)", borderRadius: radii.md, aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BookOpen size={24} style={{ color: "rgba(232,213,160,0.5)" }} />
        </div>
      </div>
    );

    // 7 — Bento grid
    case 7: return (
      <div style={{ background: colors.parchmentDark, padding: "1rem 1.2rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.5rem", height: 88 }}>
          <div style={{ background: colors.goldDark, borderRadius: radii.md, display: "flex", alignItems: "center", justifyContent: "center", animation: "bentoShift 3s ease-in-out infinite" }}>
            <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "0.8rem", color: "white" }}>שיעור ראשי</span>
          </div>
          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: "0.5rem" }}>
            <div style={{ background: "rgba(91,110,58,0.2)", borderRadius: radii.sm }} />
            <div style={{ background: "rgba(45,125,125,0.15)", borderRadius: radii.sm }} />
          </div>
        </div>
      </div>
    );

    // 8 — Sticky TOC
    case 8: return (
      <div style={{ background: "white", padding: "1rem 1.2rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110, display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "start" }} dir="rtl">
        <div style={{ fontFamily: fonts.body, fontSize: "0.8rem", lineHeight: 1.9, color: colors.textMid }}>
          ①  הקדמה<br />② גוף השיעור<br />③ סיכום
        </div>
        <div style={{ borderInlineStart: `2px solid rgba(139,111,71,0.15)`, paddingInlineStart: "0.75rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {["הקדמה", "גוף", "סיכום"].map((t, i) => (
            <div key={i} style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: i === 0 ? colors.goldDark : colors.textSubtle, fontWeight: i === 0 ? 700 : 400, paddingInlineStart: "0.4rem", borderInlineStart: i === 0 ? `3px solid ${colors.goldDark}` : "3px solid transparent" }}>{t}</div>
          ))}
        </div>
      </div>
    );

    // 9 — Container queries
    case 9: return (
      <div style={{ background: colors.parchment, padding: "1rem 1.2rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "stretch" }}>
          {/* Wide container */}
          <div style={{ flex: 2, background: "white", borderRadius: radii.md, padding: "0.6rem 0.75rem", border: `1px solid rgba(139,111,71,0.12)`, display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: radii.sm, background: colors.parchmentDark, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.78rem", color: colors.textDark }}>כרטיס רחב</div>
              <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textSubtle }}>תיאור + תמונה</div>
            </div>
          </div>
          {/* Narrow container */}
          <div style={{ flex: 1, background: "white", borderRadius: radii.md, padding: "0.6rem 0.5rem", border: `1px solid rgba(139,111,71,0.12)`, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
            <div style={{ width: 28, height: 28, borderRadius: radii.sm, background: colors.parchmentDark }} />
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.65rem", color: colors.textDark, textAlign: "center" }}>צר</div>
          </div>
        </div>
        <div style={{ marginTop: "0.5rem", fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textSubtle, textAlign: "center" }}>אותו component — container שונה</div>
      </div>
    );

    // 10 — Hebrew URL
    case 10: return (
      <div style={{ background: colors.navyDeep, padding: "1.25rem 1.6rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110, display: "flex", flexDirection: "column", justifyContent: "center" }} dir="rtl">
        <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.4rem" }}>/bible/bereshit/1/5</div>
        <div style={{ fontFamily: "monospace", fontSize: "0.88rem", color: colors.goldShimmer }}>
          /bible/בראשית/א/ה
          <span style={{ marginInlineStart: "0.5rem", fontFamily: fonts.body, fontSize: "0.65rem", color: "rgba(232,213,160,0.5)" }}>← עברית אמיתית</span>
        </div>
      </div>
    );

    // 11 — Connections panel
    case 11: return (
      <div style={{ background: "white", padding: "0.75rem 1rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110, display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem", alignItems: "start" }} dir="rtl">
        <div style={{ fontFamily: fonts.display, fontSize: "0.9rem", lineHeight: 1.7, color: colors.textDark }}>
          <span style={{ background: "rgba(45,125,125,0.12)", padding: "0.1rem 0.3rem", borderRadius: "3px", cursor: "pointer", color: colors.tealMain, fontWeight: 700 }}>בְּרֵאשִׁית</span> בָּרָא אֱלֹהִים
        </div>
        <div style={{ background: colors.parchmentDark, borderRadius: radii.md, padding: "0.5rem 0.6rem", minWidth: 80, border: `1px solid rgba(45,125,125,0.2)` }}>
          <div style={{ fontFamily: fonts.body, fontSize: "0.6rem", color: colors.tealMain, fontWeight: 700, marginBottom: "0.3rem" }}>קשרים</div>
          <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textMuted, lineHeight: 1.6 }}>רש"י<br />רמב"ן<br />ספורנו</div>
        </div>
      </div>
    );

    // 12 — Logical CSS
    case 12: return (
      <div style={{ background: colors.parchment, padding: "1.25rem 1.6rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {[
            { bad: "padding-right: 1rem", good: "padding-inline-start: 1rem" },
            { bad: "left: 0", good: "inset-inline-start: 0" },
          ].map(({ bad, good }, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0.5rem", alignItems: "center" }}>
              <code style={{ fontFamily: "monospace", fontSize: "0.62rem", color: "#a52a2a", background: "rgba(165,42,42,0.06)", padding: "0.2rem 0.35rem", borderRadius: "3px" }}>{bad}</code>
              <span style={{ color: colors.goldDark, fontSize: "0.65rem", fontWeight: 700 }}>→</span>
              <code style={{ fontFamily: "monospace", fontSize: "0.62rem", color: colors.oliveMain, background: "rgba(91,110,58,0.08)", padding: "0.2rem 0.35rem", borderRadius: "3px" }}>{good}</code>
            </div>
          ))}
        </div>
      </div>
    );

    // 13 — Nikud
    case 13: return (
      <div style={{ background: "#fdf8ee", padding: "1.25rem 1.6rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: "0.6rem" }}>
          <div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.6rem", color: "#a52a2a", letterSpacing: "0.1em", marginBottom: "0.15rem" }}>בלי נקוד — אינטרנט</div>
            <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: "1.1rem", color: colors.textMid }}>בראשית ברא אלהים</div>
          </div>
          <div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.6rem", color: colors.oliveMain, letterSpacing: "0.1em", marginBottom: "0.15rem" }}>עם נקוד — ספר תנ"ך</div>
            <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: "1.15rem", color: colors.textDark, fontFeatureSettings: '"kern" 1' }}>בְּרֵאשִׁית בָּרָא אֱלֹהִים</div>
          </div>
        </div>
      </div>
    );

    // 14 — Dual pane
    case 14: return (
      <div style={{ background: "white", padding: "0.85rem 1rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div style={{ borderInlineEnd: `1px solid rgba(139,111,71,0.12)`, paddingInlineEnd: "0.75rem" }} dir="rtl">
          <div style={{ fontFamily: fonts.body, fontSize: "0.58rem", color: colors.goldDark, fontWeight: 700, letterSpacing: "0.1em", marginBottom: "0.3rem" }}>מקור</div>
          <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: "0.88rem", lineHeight: 1.7, color: colors.textDark }}>בְּרֵאשִׁית בָּרָא אֱלֹהִים</div>
        </div>
        <div dir="ltr">
          <div style={{ fontFamily: fonts.body, fontSize: "0.58rem", color: colors.tealMain, fontWeight: 700, letterSpacing: "0.1em", marginBottom: "0.3rem" }}>Translation</div>
          <div style={{ fontFamily: "sans-serif", fontSize: "0.82rem", lineHeight: 1.7, color: colors.textMid }}>In the beginning God created</div>
        </div>
      </div>
    );

    // 15 — Topic graph
    case 15: return (
      <div style={{ background: colors.parchment, padding: "1rem 1.2rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 180, height: 80 }}>
          {/* Hub */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 50, height: 50, background: colors.goldDark, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", animation: "nodeExpand 2.5s ease-in-out infinite" }}>
            <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "0.65rem", color: "white" }}>אמונה</span>
          </div>
          {/* Satellites */}
          {[
            { label: "תפילה", top: 0, left: "55%" },
            { label: "בטחון", top: 0, left: "5%" },
            { label: "ישראל", top: "60%", left: "62%" },
            { label: "פסוקים", top: "60%", left: "0%" },
          ].map(({ label, top, left }) => (
            <div key={label} style={{ position: "absolute", top, left, background: "rgba(45,125,125,0.12)", borderRadius: radii.pill, padding: "0.2rem 0.5rem" }}>
              <span style={{ fontFamily: fonts.body, fontSize: "0.6rem", color: colors.tealMain, fontWeight: 700 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );

    // 16 — Daily learning strip
    case 16: return (
      <div style={{ background: colors.navyDeep, padding: "0.85rem 1.2rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div style={{ fontFamily: fonts.body, fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>היום — כ"ד סיוון תשפ"ו</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {[
            { icon: "📖", label: "פרשת שבוע:", value: "בהעלתך" },
            { icon: "📚", label: "דף יומי:", value: "גיטין ל" },
            { icon: "⚖️", label: "הלכה יומית:", value: "כבוד אב ואם" },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem" }}>{icon}</span>
              <span style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", minWidth: 80 }}>{label}</span>
              <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.78rem", color: colors.goldShimmer }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    );

    // 17 — Cmd+K palette
    case 17: return (
      <div style={{ background: "rgba(26,39,68,0.96)", padding: "1rem 1.2rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: radii.md, padding: "0.6rem 0.85rem", border: "1px solid rgba(232,213,160,0.15)", display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem" }}>
          <Search size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
          <span style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>חפש סדרה, רב, פסוק...</span>
          <span style={{ marginInlineStart: "auto", fontFamily: fonts.body, fontSize: "0.6rem", color: "rgba(232,213,160,0.5)", border: "1px solid rgba(232,213,160,0.25)", borderRadius: "4px", padding: "0.1rem 0.3rem" }}>⌘K</span>
        </div>
        {["הרב ראובן ששון — פרשת השבוע", "בראשית — סדרת תנ\"ך"].map((r, i) => (
          <div key={i} style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: i === 0 ? colors.goldShimmer : "rgba(255,255,255,0.4)", padding: "0.3rem 0.4rem", borderRadius: "4px", background: i === 0 ? "rgba(232,213,160,0.06)" : "transparent" }}>{r}</div>
        ))}
      </div>
    );

    // 18 — Faceted search
    case 18: return (
      <div style={{ background: colors.parchment, padding: "1rem 1.2rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
          {[
            { label: "הרב ששון", active: true },
            { label: "בראשית", active: false },
            { label: "אודיו", active: true },
            { label: "< 20 דק'", active: false },
          ].map(({ label, active }) => (
            <span key={label} style={{ padding: "0.25rem 0.65rem", borderRadius: radii.pill, background: active ? colors.goldDark : "white", color: active ? "white" : colors.textMuted, fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, border: `1px solid ${active ? colors.goldDark : "rgba(139,111,71,0.2)"}` }}>{label}</span>
          ))}
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>נמצאו <strong style={{ color: colors.goldDark }}>243 שיעורים</strong> מתוך 11,818</div>
      </div>
    );

    // 19 — Recently viewed
    case 19: return (
      <div style={{ background: "white", padding: "0.75rem 0.9rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div style={{ fontFamily: fonts.body, fontSize: "0.6rem", color: colors.textSubtle, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>צפית לאחרונה</div>
        <div style={{ display: "flex", gap: "0.6rem", overflowX: "auto" }}>
          {["ויחי — הרב קשתיאל", "שמות פרק א׳", "פרשת בשלח"].map((title, i) => (
            <div key={i} style={{ flexShrink: 0, background: colors.parchmentDark, borderRadius: radii.sm, padding: "0.4rem 0.65rem", border: `1px solid rgba(139,111,71,0.08)` }}>
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.65rem", color: colors.textDark, whiteSpace: "nowrap" }}>{title}</div>
            </div>
          ))}
        </div>
      </div>
    );

    // 20 — View Transitions
    case 20: return (
      <ViewTransitionsDemo catColor={catColor} />
    );

    // 21 — Scroll-driven
    case 21: return (
      <div style={{ background: colors.parchment, padding: "1rem 1.2rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }}>
        <div style={{ fontFamily: fonts.body, fontSize: "0.6rem", color: colors.textSubtle, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.6rem" }} dir="rtl">אלמנטים נחשפים בגלילה</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {[1, 0.65, 0.35].map((opacity, i) => (
            <div key={i} style={{ height: "0.7rem", borderRadius: "4px", background: colors.goldDark, opacity, width: `${100 - i * 15}%`, transition: "all 0.5s" }} />
          ))}
        </div>
        <div style={{ marginTop: "0.6rem", fontFamily: fonts.body, fontSize: "0.68rem", color: colors.textSubtle, textAlign: "center" }}>opacity + translateY לפי @scroll-timeline</div>
      </div>
    );

    // 22 — Magnetic button
    case 22: return (
      <MagneticButtonDemo />
    );

    // 23 — FLIP animations
    case 23: return (
      <FlipDemo catColor={catColor} />
    );

    // 24 — Theme variants
    case 24: return (
      <ThemeDemo />
    );

    // 25 — Reading progress
    case 25: return (
      <div style={{ background: "white", padding: "1.25rem 1.6rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }}>
        <div style={{ height: "4px", background: colors.parchmentDark, borderRadius: "2px", overflow: "hidden", marginBottom: "0.75rem" }}>
          <div style={{ height: "100%", width: "72%", background: gradients.goldButton, borderRadius: "2px", animation: "progressFill 2s ease-out forwards" }} />
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textSubtle, textAlign: "center" }} dir="rtl">
          72% מהשיעור — עוד ~8 דקות
        </div>
        <div style={{ marginTop: "0.75rem", fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textMuted, textAlign: "center" }} dir="rtl">
          הפס מתמלא בזמן הגלילה
        </div>
      </div>
    );

    // 26 — For you rail
    case 26: return (
      <div style={{ background: colors.navyDeep, padding: "1rem 1.2rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div style={{ fontFamily: fonts.body, fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          <Sparkles style={{ width: 10, height: 10, display: "inline", marginLeft: "0.3rem" }} />
          מה שאהבת בשבוע שעבר
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {["פרשת שמות — הרב קשתיאל", "ויהי ערב ויהי בוקר — הרב ששון"].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: colors.goldShimmer, opacity: i === 0 ? 1 : 0.4 }} />
              <span style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: "rgba(255,255,255,0.7)" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    );

    // 27 — Optimistic UI
    case 27: return (
      <OptimisticUIDemo />
    );

    // 28 — Floating player
    case 28: return (
      <div style={{ background: gradients.warmDark, padding: "1.1rem 1.4rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }}>
        <div dir="rtl" style={{ background: "rgba(255,255,255,0.06)", borderRadius: radii.lg, padding: "0.75rem 1rem", border: "1px solid rgba(232,213,160,0.12)", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0.75rem", alignItems: "center", animation: "subtleFloat 4s ease-in-out infinite" }}>
          <Play size={18} style={{ color: colors.goldShimmer }} />
          <div>
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.8rem", color: "white" }}>פרשת בשלח</div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: "rgba(255,255,255,0.45)" }}>הרב ראובן ששון · 24:15</div>
          </div>
          <Volume2 size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
        </div>
        <div style={{ height: "2px", background: "rgba(255,255,255,0.08)", borderRadius: "1px", marginTop: "0.6rem", overflow: "hidden" }}>
          <div style={{ height: "100%", width: "38%", background: colors.goldDark }} />
        </div>
      </div>
    );

    // 29 — Synced transcript
    case 29: return (
      <div style={{ background: "white", padding: "1rem 1.2rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: "0.88rem", lineHeight: 2 }}>
          <span style={{ color: colors.textMid }}>ויאמר אלוהים </span>
          <span style={{ background: "rgba(139,111,71,0.18)", borderRadius: "3px", padding: "0 2px", color: colors.textDark, fontWeight: 700 }}>יהי</span>
          <span style={{ color: colors.textMid }}> אור — </span>
          <span style={{ color: colors.textMuted }}>ויהי אור. וירא אלוהים</span>
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textSubtle, marginTop: "0.4rem" }}>
          מילה מסומנת = הנגן נמצא שם · לחץ לקפוץ
        </div>
      </div>
    );

    // 30 — Audio summary
    case 30: return (
      <div style={{ background: colors.parchmentDark, padding: "1.1rem 1.4rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: gradients.goldButton, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play size={12} style={{ color: "white" }} />
          </div>
          <div>
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.78rem", color: colors.textDark }}>סיכום AI — 90 שניות</div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textSubtle }}>מ-45 דקות שיעור</div>
          </div>
          <span style={{ marginInlineStart: "auto", fontFamily: fonts.body, fontSize: "0.65rem", color: colors.goldDark, fontWeight: 700 }}>1:30</span>
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted, lineHeight: 1.65 }}>
          "הרב ששון מסביר שהגאולה ממצרים לא הייתה רק פיזית — אלא שחרור תודעתי..."
        </div>
      </div>
    );

    // 31 — Comfort reading
    case 31: return (
      <div style={{ background: "white", padding: "1.25rem 1.6rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div style={{ maxWidth: "66ch", fontFamily: fonts.body, fontSize: "1rem", lineHeight: 1.85, color: colors.textMid, margin: "0 auto" }}>
          עמודת קריאה נוחה — 60 תווים בשורה. הטקסט לא נמשך לרוחב המסך המלא. קל לעקוב, לא מעייף.
        </div>
        <div style={{ marginTop: "0.5rem", fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textSubtle, textAlign: "center" }}>max-width: 66ch · line-height: 1.85</div>
      </div>
    );

    // 32 — Estimated time
    case 32: return (
      <div style={{ background: colors.parchment, padding: "1rem 1.2rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.65rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "white", borderRadius: radii.md, padding: "0.45rem 0.75rem", border: `1px solid rgba(139,111,71,0.1)` }}>
            <Headphones size={13} style={{ color: colors.goldDark }} />
            <span style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMid, fontWeight: 700 }}>45 דקות האזנה</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "white", borderRadius: radii.md, padding: "0.45rem 0.75rem", border: `1px solid rgba(139,111,71,0.1)` }}>
            <BookOpen size={13} style={{ color: colors.tealMain }} />
            <span style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMid, fontWeight: 700 }}>12 דקות קריאה</span>
          </div>
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textSubtle }}>
          מנהל ציפיות → השלמת שיעורים גבוהה יותר
        </div>
      </div>
    );

    default: return (
      <div style={{ background: colors.parchmentDark, padding: "1rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 80 }} />
    );
  }
}

// ────────────────────────────────────────────────────────────────────────
// Interactive demo components
// ────────────────────────────────────────────────────────────────────────

function ViewTransitionsDemo({ catColor }: { catColor: string }) {
  const [state, setState] = useState<"list" | "detail">("list");
  return (
    <div
      style={{ background: state === "list" ? colors.parchment : gradients.mahoganyHero, padding: "1rem 1.2rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110, cursor: "pointer", transition: "background 0.5s" }}
      onClick={() => setState((s) => (s === "list" ? "detail" : "list"))}
      dir="rtl"
    >
      {state === "list" ? (
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: radii.md, background: gradients.mahoganyHero, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.9rem", color: colors.textDark }}>פרשת בשלח</div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textSubtle }}>לחץ לעבור לדף הסדרה</div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "100%", height: 36, background: "rgba(232,213,160,0.15)", borderRadius: radii.md, marginBottom: "0.4rem" }} />
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "0.9rem", color: colors.goldShimmer }}>דף הסדרה</div>
          <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: "0.2rem" }}>לחץ לחזור לרשימה</div>
        </div>
      )}
    </div>
  );
}

function MagneticButtonDemo() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouse = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setPos({ x: (e.clientX - cx) * 0.25, y: (e.clientY - cy) * 0.25 });
  };

  return (
    <div
      ref={ref}
      style={{ background: colors.parchmentDark, padding: "1.25rem 1.6rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110, display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseMove={handleMouse}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
    >
      <button
        style={{
          padding: "0.75rem 1.75rem",
          borderRadius: radii.pill,
          background: `radial-gradient(circle at ${50 + pos.x * 2}% ${50 + pos.y * 2}%, ${colors.goldLight}, ${colors.goldDark})`,
          color: "white",
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: "0.9rem",
          border: "none",
          cursor: "pointer",
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          transition: "transform 0.15s ease-out, box-shadow 0.15s",
          boxShadow: `${pos.x * 0.5}px ${pos.y * 0.5}px 24px rgba(139,111,71,0.4)`,
        }}
        dir="rtl"
      >
        רחף עלי
      </button>
    </div>
  );
}

function FlipDemo({ catColor }: { catColor: string }) {
  const ITEMS = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים", "יהושע"];
  const [filter, setFilter] = useState<"all" | "torah" | "neviim">("all");

  const visible = filter === "all" ? ITEMS : filter === "torah" ? ITEMS.slice(0, 5) : ITEMS.slice(5);

  return (
    <div style={{ background: colors.parchment, padding: "0.85rem 1rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110 }} dir="rtl">
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem" }}>
        {(["all", "torah", "neviim"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "0.2rem 0.6rem", borderRadius: radii.pill, border: `1.5px solid ${filter === f ? colors.goldDark : "rgba(139,111,71,0.2)"}`, background: filter === f ? colors.goldDark : "white", color: filter === f ? "white" : colors.textMuted, fontFamily: fonts.body, fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>
            {f === "all" ? "הכל" : f === "torah" ? "תורה" : "נביאים"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {visible.map((item) => (
          <div key={item} style={{ padding: "0.3rem 0.7rem", background: "white", borderRadius: radii.md, border: `1px solid rgba(139,111,71,0.12)`, fontFamily: fonts.display, fontWeight: 700, fontSize: "0.72rem", color: colors.textDark, transition: "all 0.3s", animation: "cardSlide 0.3s ease-out" }}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemeDemo() {
  const [theme, setTheme] = useState<"light" | "dark" | "sepia">("sepia");
  const themes = {
    light: { bg: "white", text: colors.textDark, label: "בהיר" },
    dark: { bg: colors.navyDeep, text: "rgba(255,255,255,0.9)", label: "כהה" },
    sepia: { bg: "#f8f2e4", text: "#3d2e1e", label: "ספיה" },
  };
  const t = themes[theme];

  return (
    <div style={{ background: t.bg, padding: "1rem 1.2rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110, transition: "all 0.35s" }} dir="rtl">
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.7rem" }}>
        {(Object.keys(themes) as (keyof typeof themes)[]).map((k) => (
          <button key={k} onClick={() => setTheme(k)} style={{ padding: "0.2rem 0.6rem", borderRadius: radii.pill, border: `1.5px solid ${theme === k ? colors.goldDark : "rgba(139,111,71,0.2)"}`, background: theme === k ? colors.goldDark : "transparent", color: theme === k ? "white" : t.text, fontFamily: fonts.body, fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>
            {themes[k].label}
          </button>
        ))}
      </div>
      <p style={{ fontFamily: fonts.body, fontSize: "0.82rem", lineHeight: 1.8, color: t.text, margin: 0 }}>
        וְהָאָרֶץ הָיְתָה תֹהוּ וָבֹהוּ — טקסט שמשנה רקע לפי בחירה
      </p>
    </div>
  );
}

function OptimisticUIDemo() {
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const handleClick = () => {
    setPending(true);
    setSaved(!saved);
    setTimeout(() => setPending(false), 800);
  };

  return (
    <div style={{ background: "white", padding: "1.25rem 1.6rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, minHeight: 110, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.65rem" }} dir="rtl">
      <button
        onClick={handleClick}
        style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.6rem 1.25rem", borderRadius: radii.pill,
          background: saved ? "rgba(91,110,58,0.1)" : "white",
          border: `1.5px solid ${saved ? colors.oliveMain : "rgba(139,111,71,0.2)"}`,
          color: saved ? colors.oliveMain : colors.textMuted,
          fontFamily: fonts.body, fontWeight: 700, fontSize: "0.85rem",
          cursor: "pointer", transition: "all 0.2s",
        }}
      >
        <Bookmark size={15} style={{ fill: saved ? colors.oliveMain : "transparent", color: saved ? colors.oliveMain : colors.textMuted, transition: "all 0.2s" }} />
        {saved ? "שמור במועדפים" : "הוסף למועדפים"}
      </button>
      <div style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: pending ? colors.goldDark : colors.textSubtle }}>
        {pending ? "שומר ברקע..." : saved ? "✓ נשמר מיידית (optimistic)" : "לחץ לדמו optimistic UI"}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────
function Eyebrow({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.65rem" }}>
      {children}
    </div>
  );
}

function H2({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", color: dark ? colors.goldShimmer : colors.textDark, margin: "0 0 1.5rem", lineHeight: 1.2 }}>
      {children}
    </h2>
  );
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: "2rem 0", padding: "1.5rem 1.85rem", background: "#fdf8ee", borderInlineEnd: `4px solid ${colors.goldLight}`, borderRadius: radii.md, fontFamily: fonts.display, fontSize: "1.15rem", lineHeight: 1.7, color: colors.textDark, fontStyle: "italic" }}>
      <Quote style={{ width: 16, height: 16, color: colors.goldDark, marginBottom: "0.6rem", opacity: 0.5 }} />
      {children}
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ background: "white", borderRadius: radii.lg, padding: "1rem 1.1rem", border: `1px solid rgba(139,111,71,0.1)`, textAlign: "center" }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.8rem", color: colors.goldDark, lineHeight: 1, marginBottom: "0.25rem" }}>{n}</div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textMuted, letterSpacing: "0.05em" }}>{label}</div>
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
