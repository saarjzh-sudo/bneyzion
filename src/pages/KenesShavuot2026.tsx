/**
 * KenesShavuot2026 — כנס שבועות תשפ"ו (19.5.2026)
 *
 * Route: /kenes-2026-05
 *
 * עמוד standalone (ללא Layout wrapper) — landing page לכנס בלבד.
 * ללא Header / Footer / Sidebar / MobileBottomNav.
 *
 * שיפורים 2026-05-20:
 * 1. הסרת Layout — עמוד standalone
 * 2. הרב דני לביא (תוקן מ"לוי"), role הוסר
 * 3. Hero image חדש מ-Imagen (hero-kenes-shavuot.jpg), כותרת שחורה
 * 4. סיכומים מורחבים עם מקורות מדויקים
 * 5. סרטון תרמה לפרויקט התנ"ך
 */
import { sanitizeHtml } from "@/lib/sanitize";
import { useState } from "react";
import { Play, MessageCircle, BookOpen, ChevronDown, ChevronUp, Heart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSEO } from "@/hooks/useSEO";
import kenesHeroBg from "@/assets/hero-bg-bney-zion.jpg";

const KENES_TITLE = "הכנת הלב למתן תורה";
const KENES_SUBTITLE = "מתוך הפסוקים — ערב לימוד לקראת חג השבועות תשפ״ו";
const KENES_DATE = "י׳ סיון תשפ״ו | 19 במאי 2026";

// Drive file ID for the donation video (from the recording of segment 03-project)
const DONATION_VIDEO_DRIVE_ID = "1u4hRMr9oHE4-81QRSJUM1QS37ifc9VTJ";

interface Recording {
  slug: string;
  name: string;
  role: string;
  topic: string;
  duration: string;
  videoUrl: string;
  summaryHtml: string;
}

const recordings: Recording[] = [
  {
    slug: "01-rimon",
    name: "הרב יוסף צבי רימון",
    role: "ראש ישיבת ההסדר גוש עציון",
    topic: "מעמד הר סיני — שלוש חזרות הציווי",
    duration: "11:11",
    videoUrl: "https://drive.google.com/file/d/1HlsW1ySXcHAMkoojDQ54H7z96XIQQzTi/view",
    summaryHtml: `
      <h4 style="font-weight:bold;margin:12px 0 6px;">שאלת ריבוי הציוויים — פרדוקס שהטריד את הגאון שנים</h4>
      <p style="margin-bottom:10px;">הרב רימון פותח בשאלה שמי שקורא את פרשת יתרו בעיון מיד תוקפת אותו: מדוע הקב"ה מצווה על הגבלת ההר שלוש פעמים? בפסוק יב: <strong>"והגבלתה את העם סביב לאמר"</strong> (שמות יט, יב). אחר כך בפסוק כא: <strong>"רד העד בעם"</strong> (שמות יט, כא). ואחרי שמשה עצמו שואל בתמיהה "לא יוכל העם לעלות — כי אתה עדתנו לאמר הגבל את ההר" — הקב"ה חוזר פעם שלישית: <strong>"לך רד ועלית אתה ואהרן עמך"</strong> (שמות יט, כד). האבן עזרא מביא ש"הגאון" חשב שנים בפסוק הזה ולא ידע את טעמו.</p>

      <h4 style="font-weight:bold;margin:12px 0 6px;">שלושה פרשנים, שלושה כיוונים</h4>
      <p style="margin-bottom:10px;">רש"י מסביר: <strong>"מזרזין את האדם קודם מעשה וחוזרין מזרזין אותו בשעת מעשה"</strong> — הציווי הראשון הכין, הציווי השני בא ברגע שזה קורה בפועל. הרשב"ם דוחה זאת ומחפש הסבר עמוק יותר. הספורנו מחדש: ישראל קיבל ציווי לא לעלות — אבל ברגע שאדם ירגיש התעלות רוחנית ונבואה, הוא עלול לחשוב שמותר לו לפרוץ את הגבולות. ולכן הציוויים החוזרים באים להבהיר: גם הדרגה הרוחנית הכי גבוהה לא מבטלת את ההלכה. שאיפה לדביקות עלולה לשכח את הגבולות.</p>

      <h4 style="font-weight:bold;margin:12px 0 6px;">"ממלכת כהנים וגוי קדוש" — מה זה אומר לחיות ככה</h4>
      <p style="margin-bottom:10px;">הרב רימון מגיע לאמירה המרכזית: <strong>"ואתם תהיו לי ממלכת כהנים וגוי קדוש"</strong> (שמות יט, ו) — לא עוד עם שה' מנחה אותו מהצד בנקודות ספציפיות, אלא עם שהתורה היא המעטפת שבתוכה הוא חי. כהן לא שואל "מה רצון ה' בנקודה הזאת" — כל יומו בנוי מראש סביב עבודת ה'. זה המהלך החדש שמתן תורה יצר. "נעשה ונשמע" — קודם כל חווים את החיים מתוך התורה, ואחר כך מבינים אותם. הפוך מכל הגיון אנושי, ומסביר למה לא היה אפשר "להכין" לזה מראש.</p>

      <blockquote style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;margin:12px 0;">
        "נעשה ונשמע — קודם חווים את החיים בתוך התורה, ואחר כך מבינים אותם. הפוך מכל דרך לימוד אנושית."
      </blockquote>
    `,
  },
  {
    slug: "02-yoav",
    name: "הרב יואב אוריאל",
    role: "ראש תנועת בני ציון",
    topic: "מה ידע ישראל לפני מתן תורה — ומה לא ידע",
    duration: "25:35",
    videoUrl: "https://drive.google.com/file/d/1DanUi5caNMAdebNkiaT-9vcrBQsG02fc/view",
    summaryHtml: `
      <h4 style="font-weight:bold;margin:12px 0 6px;">מה ידע עם ישראל לקראת מתן תורה?</h4>
      <p style="margin-bottom:10px;">הרב אוריאל פותח בשאלה שנראית פשוטה אבל עמוקה: כשעם ישראל יצא ממצרים, מה הוא ידע שמחכה לו? ידע שיהיה <strong>"לגוי גדול ועצום"</strong> — כפי שנאמר לאברהם אבינו. ידע שינחל ארץ ישראל. ידע שיעבוד את האלוקים. אבל דבר אחד לא ידע — שיהיה מעמד הר סיני במובן שאנחנו מכירים: עולם שלם של תרי"ג מצוות, הלכות, לימוד תורה, גמרא, משנה. הקב"ה במכוון לא הודיע. "כי ידעתיו למען אשר יצווה את בניו ואת ביתו אחריו ושמרו דרך השם לעשות צדקה ומשפט" (בראשית יח, יט) — אבל מה זו "דרך השם"? אין תשובה מוגדרת.</p>

      <h4 style="font-weight:bold;margin:12px 0 6px;">תורת האבות — "החיים קודמים לתורה"</h4>
      <p style="margin-bottom:10px;">הרב מגדיר: מה שהיה עד מתן תורה — "תורת האבות" — פועל כך: אתה חי, מגיע לצומת, ושם ה' אומר לך ימינה או שמאלה. "כל אשר תאמר אליך שרה שמע בקולה" — ה' הדריך את האבות צעד אחר צעד. <strong>"עקב אשר שמע אברהם בקולי וישמור משמרתי מצוותיי חוקותיי ותורותיי"</strong> (בראשית כו, ה) — אך המצוות הן הוראות שעה. לפעמים יוצרות מצוות לדורות (ברית מילה, גיד הנשה, "החודש הזה לכם"), אבל הבסיס הוא: ה' יגיד לנו מה לעשות. הבעיה התגלתה בפרשת יתרו: "כי יבוא אליי העם לדרוש אלוקים" (שמות יח, טו) — 60 ריבוא לא יכולים לתפקד כשכולם שואלים את מנהיגם בכל שאלה.</p>

      <h4 style="font-weight:bold;margin:12px 0 6px;">המהפכה של מתן תורה — "התורה קודמת לחיים"</h4>
      <p style="margin-bottom:10px;">מה שהתחדש בסיני: התורה קודמת לחיים. עם ישראל מקבל תרי"ג מצוות — כולל חוקים על ארץ ישראל, לפני שנכנס לשם. לומד הלכות שבת 40 שנה במדבר. ובשעה שנכנס לארץ — החיים נכנסים לתוך מארג המצוות שכבר קיים. <strong>"ואתם תהיו לי ממלכת כהנים וגוי קדוש"</strong> (שמות יט, ו) — כמו כהן שקם בבוקר, לפני שמתחיל לחיות, כבר מריץ בראש עולם שלם של הלכות, מצוות, מסורות. ולתוך זה החיים משתלבים. "נעשה ונשמע" — קודם חווים, אחר כך מבינים. לא יכולנו להבין את זה לפני שזה קרה.</p>

      <blockquote style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;margin:12px 0;">
        "בתורת האבות — החיים קודמים לתורה. במתן תורה — התורה קודמת לחיים. זה השינוי שלא ידענו שהוא עומד לקרות."
      </blockquote>
    `,
  },
  {
    slug: "03-project",
    name: "הצגת הפרויקט",
    role: "תנועת בני ציון",
    topic: "אתר התנ״ך החדש — לזכר סעדיה יעקב דרעי הי״ד",
    duration: "5:55",
    videoUrl: "https://drive.google.com/file/d/1u4hRMr9oHE4-81QRSJUM1QS37ifc9VTJ/view",
    summaryHtml: `
      <h4 style="font-weight:bold;margin:12px 0 6px;">אתר תנ"ך חדשני — לזכר גיבור ישראל</h4>
      <p style="margin-bottom:10px;">הסרטון מציג את פרויקט בני ציון — אתר התנ"ך החדש שנבנה לזכרו של סעדיה יעקב דרעי הי"ד, גיבור ישראל שנפל בעזה. הרב יואב אוריאל מסביר: האתר הישן קיים שמונה שנים, ועשרות אלפי אנשים נכנסים אליו בכל חודש. אבל הגיע הזמן לשדרג — להביא את לימוד התנ"ך לרמה שתמשוך מאות אלפי אנשים.</p>
      <p style="margin-bottom:10px;">חיים דרעי, אביו של סעדיה, מספר בסרטון: "כשפנו אלינו מבני ציון עם היוזמה הזאת — חיכינו שנה וחצי, לא עשינו הנצחה, לא מצאנו את הדבר המדויק. ואז זה הגיע. ואמרנו: כן, זה זה. זה בול." <br/>
      "בשבילי התנ"ך הוא מפעל חיים. ועכשיו זה ההזדמנות להפוך את זה לאתר מקצועי, גדול, רחב."</p>
      <blockquote style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;margin:12px 0;">
        "אנחנו מאמינים ומקווים שסעדיה ילווה אותנו מן השמיים — וישלח לנו את השיעת הנשמה, את האור בעיניים שצריך לפרויקט כזה גדול."
      </blockquote>
    `,
  },
  {
    slug: "04-draii",
    name: "חיים דרעי",
    role: "אביו של סעדיה יעקב דרעי הי״ד",
    topic: "עין טובה מביאה מלכות — ממגילת רות עד סעדיה",
    duration: "16:24",
    videoUrl: "https://drive.google.com/file/d/19W0Ntau6Q07dHgWM6UM0F1k6Bzf6xzTU/view",
    summaryHtml: `
      <h4 style="font-weight:bold;margin:12px 0 6px;">מסע אישי — ספר איוב שהרים אב שכול</h4>
      <p style="margin-bottom:10px;">חיים דרעי מספר שאחרי נפילת סעדיה, לא מצא כוח לפתוח ספרים בדרך הרגילה. "מצאתי פודקאסט, ואיכשהו הלימוד הזה ברשת הרים אותי." מתוך כך חזר ללימוד התנ"ך — וגילה שם את סעדיה. "פתאום אמרתי: רגע — הבן שלי הוא דמות תנ"כית. הוא אחד ממלאכי חזקיה, של יואש, של דמות מלך."</p>

      <h4 style="font-weight:bold;margin:12px 0 6px;">העין הטובה במגילת רות — נאומי ובועז</h4>
      <p style="margin-bottom:10px;">חיים מדגיש את עקרון "העין הטובה" שחוזר לאורך כל מגילת רות. אלימלך — על פי רש"י לרות א, א: "צרת עין בעיני הבאים לדוחקו." לעומתו, נאומי — "אישה גדולה שמסתכלת עליהן בטוב", ולכן הכלות "לא מוכנות לעזוב אותה." בועז — כשהקוצרים מספרים לו על רות המואביה, הוא לא שומע אישה זרה — הוא מסתכל עליה בעין טובה לגמרי: <strong>"ויגד ויגד לו כל אשר עשתה אחרי מות אישה"</strong> (רות ב, יא). ואחר כך: <strong>"חסדך האחרון גדול מחסדך הראשון"</strong> (רות ג, י). שניהם — נאומי ובועז — הביאו את המלכות של דוד מלך ישראל בזכות עינם הטובה.</p>

      <h4 style="font-weight:bold;margin:12px 0 6px;">"ע-י-ן" בשמות סעדיה ויעקב — עין שהביאה אותו לאן שהביאה</h4>
      <p style="margin-bottom:10px;">חיים מציין תצפית מרגשת: "ושם ללב שגם לסעדיה וגם ליעקב — אביו — יש 'עין' בתוך השמות. שתי העיניים הטובות של סעדיה הן אלו שהביאו אותו לאן שהביאו." מספר: ביפו, סעדיה ישב בבית המדרש, שמע תאונת אופנוע — רץ לעזור. מסתבר שאותו אדם שנפל זרק אבן לעבר הישיבה. סעדיה לא ידע. "ראה אדם נפגע — רץ לעזור. זה העין הטובה שלו. הוא לא שפט אנשים." היה "שילוב בין תלמיד ישיבה לאדם שיכול להרגיש בנוח עם כל רבדי עם ישראל."</p>

      <blockquote style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;margin:12px 0;">
        "שנלך בדרכיהם — במותם ציוו לנו חיים."
      </blockquote>
    `,
  },
  {
    slug: "05-dani-lavi",
    name: "הרב דני לביא",
    role: "",
    topic: "מוסר ולאומיות בעשרת הדיברות",
    duration: "15:46",
    videoUrl: "https://drive.google.com/file/d/1Et5O3f0CL1sOZpiwy75rCw54BGJ5nRAA/view",
    summaryHtml: `
      <h4 style="font-weight:bold;margin:12px 0 6px;">שאלת פתיחה: מדוע עשרת הדיברות מלמדים מוסר "ברור מאליו"?</h4>
      <p style="margin-bottom:10px;">הרב לביא פותח בסוגיה אקטואלית — חייל שנענש על פאץ' "משיח" — ומשתמש בה כפתח לשאלה עמוקה: מה הקשר בין קבלת תורה ללאומיות הישראלית? ומדוע עשרת הדיברות כוללות "לא תרצח, לא תגנוב, לא תנאף" — מצוות שנראות טבעיות לכל בן אנוש? "כמעט חבל לבזבז חלק כזה מהבשורה של היהדות על מצוות כל כך מוסריות."</p>

      <h4 style="font-weight:bold;margin:12px 0 6px;">שלוש תשובות — מהפרטים ועד יסוד המוסר</h4>
      <p style="margin-bottom:10px;"><strong>א. על הפרטים — לתורה יש הרבה לחדש.</strong> "לא תרצח" — כולם מסכימים. אבל מה לגבי הפלות? מה לגבי המתת חסד? הרב מביא דוגמה מצמררת: פרנסיס קריק, מגלה מבנה ה-DNA וזוכה פרס נובל, כתב ב-Nature שתינוק יחשב חי "רק 48 שעות לאחר לידה" ובני אדם מעל 80 יחשבו "מתים." הצעתו: "להפסיק את לימוד המוסר הדתי לילדים ולהחליפו בהשקפת הביולוגיה המודרנית."</p>
      <p style="margin-bottom:10px;"><strong>ב. המוסר האנושי תנודתי.</strong> שבת — פילוסוף רומי סנקה כתב: "היהודים מבזבזים כמעט שביעית מחייהם בבטלנות." עבדות — "הייתה נחשבת מוסכמה בסיסית", ובגלל השפעת היהדות הפכה לטאבו — ועכשיו שוב חוזרת בתרבות המערבית כ"מצוין ולכתחילה."</p>
      <p style="margin-bottom:10px;"><strong>ג. "ישר-אל" — בלי האל, גם הישרות מתמוטטת.</strong> הרב קוק ב"אורות ישראל" נגד הרב מרדכי אליאשברג: לא ניתן לבנות על "דרך ארץ שקדמה לתורה" — "כי המין האנושי כל כך התקלקל שכבר אי אפשר לבנות על האנושיות הזאת את קומת התורה." המשך חוכמה: חידוש התורה יורד עד להדרכות מעשיות. בן גוריון אמר שהחזון המשיחי של נביאי ישראל הוא שיצר את המדינה. הרצל בסיום "אלטנוילנד" — "הרב שמואל הזקן קם ואמר: האלוקים."</p>

      <h4 style="font-weight:bold;margin:12px 0 6px;">סעדיה — דמות המופת של הדור החדש</h4>
      <p style="margin-bottom:10px;">הרב לביא מסיים בדמותו של סעדיה: לא "למרות שלומד תורה — לוחם", אלא "בזכות שמחובר לתורה — מאיר את העולם וגם לוחם." "הוא אמר: רגע מפקד, אני מתדלק, כבר חוזר ללחימה" — ולמד גמרה עם הווסט וכל הציוד בעזה.</p>

      <blockquote style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;margin:12px 0;">
        "בלי היסוד הרוחני האלוקי בעם ישראל — גם המישור המוסרי הכי בסיסי, כולל הלאומיות עצמה, מתפוררים לטווח הרחוק.<br/>
        שנלך בדרכיהם — במותם ציוו לנו את החיים."
      </blockquote>
    `,
  },
];

function extractDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const driveId = extractDriveFileId(url);
  if (driveId) return `https://drive.google.com/file/d/${driveId}/preview`;
  return null;
}

function RecordingCard({ recording, index }: { recording: Recording; index: number }) {
  const [videoOpen, setVideoOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(index === 0);
  const embedUrl = getEmbedUrl(recording.videoUrl);
  const hasVideo = !!embedUrl;

  return (
    <>
      <div className="group rounded-2xl border border-[hsl(38_50%_82%)] bg-[hsl(38_50%_95%)] p-4 md:p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-[hsl(43_70%_47%)] text-white font-kedem font-bold text-base md:text-lg shrink-0 mt-1 ring-2 ring-[hsl(43_70%_47%/0.25)] ring-offset-2 ring-offset-[hsl(38_50%_95%)]">
              {index + 1}
            </span>
            <div className="flex flex-col">
              <h3 className="font-kedem font-bold text-base md:text-xl text-[hsl(30_40%_25%)]">
                {recording.name}
              </h3>
              {recording.role && (
                <p className="font-ploni text-xs text-[hsl(30_30%_50%)] mb-0.5">{recording.role}</p>
              )}
              <p className="font-ploni text-sm text-[hsl(30_35%_40%)]">{recording.topic}</p>
              <span className="font-ploni text-xs text-[hsl(30_30%_55%)] mt-0.5">
                {recording.duration} דק׳
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 mr-12 sm:mr-0 shrink-0">
            {recording.summaryHtml && (
              <button
                onClick={() => setSummaryOpen(!summaryOpen)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[hsl(43_70%_47%/0.15)] text-[hsl(30_40%_25%)] text-sm font-ploni font-light hover:bg-[hsl(43_70%_47%/0.3)] transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden xs:inline">סיכום</span>
                {summaryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
            <button
              onClick={() => hasVideo && setVideoOpen(true)}
              disabled={!hasVideo}
              className="flex flex-row-reverse items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(43_70%_47%)] text-white font-ploni transition-all duration-300 hover:bg-[hsl(43_70%_40%)] hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" fill="currentColor" />
              {hasVideo ? "צפייה" : "בקרוב"}
            </button>
          </div>
        </div>
        {recording.summaryHtml && summaryOpen && (
          <div
            className="mt-4 pt-4 border-t border-[hsl(38_50%_82%)] font-ploni text-[hsl(30_30%_30%)] leading-relaxed text-sm [&_h3]:font-kedem [&_h3]:font-bold [&_h4]:font-kedem [&_h4]:font-bold"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(recording.summaryHtml) }}
          />
        )}
      </div>

      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-3xl w-[95vw] p-0 overflow-hidden bg-[hsl(30_40%_12%)] border-none">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="font-kedem font-bold text-white text-right">
              {recording.name} — {recording.topic}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full">
            {embedUrl && (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function KenesShavuot2026() {
  useSEO({
    title: `${KENES_TITLE} – בני ציון`,
    description: `${KENES_SUBTITLE} | תנועת בני ציון ללימוד תנ״ך`,
  });

  return (
    <div dir="rtl" className="min-h-screen bg-[hsl(38_50%_93%)]">

      {/* ===== HERO ===== */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <img
          src={kenesHeroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(38_60%_92%/0.15)] via-[hsl(38_60%_90%/0.25)] to-[hsl(38_60%_88%/0.40)]" />
        <div className="relative z-10 px-4 py-20 max-w-3xl mx-auto md:mt-12">
          <div className="bg-[hsl(38_50%_94%/0.88)] backdrop-blur-sm rounded-3xl p-8 md:p-12 text-center shadow-xl border border-[hsl(38_40%_80%/0.5)]">
            <p className="font-kedem font-bold text-[hsl(30_40%_25%)] text-base md:text-lg mb-3 tracking-wide">
              תנועת בני ציון ללימוד תנ״ך
            </p>
            <h1 className="font-kedem font-black text-5xl sm:text-6xl md:text-7xl mb-4 leading-[1.05] text-black tracking-tight">
              {KENES_TITLE}
            </h1>
            <p className="font-kedem font-bold text-[hsl(30_40%_20%)] text-lg md:text-xl mb-2">
              {KENES_SUBTITLE}
            </p>
            <p className="font-ploni text-[hsl(30_35%_35%)] text-sm md:text-base mb-8">
              {KENES_DATE}
            </p>
            <div className="flex flex-col sm:flex-row-reverse items-center justify-center gap-4">
              <a
                href="#recordings"
                className="flex flex-row-reverse items-center gap-2 px-7 py-3.5 rounded-xl bg-[hsl(43_70%_47%)] text-white font-kedem font-bold text-base transition-all duration-300 hover:bg-[hsl(43_70%_40%)] hover:shadow-xl hover:scale-105"
              >
                <Play className="w-5 h-5" fill="currentColor" />
                הקלטות הכנס
              </a>
              <a
                href="https://chat.whatsapp.com/LghgDJHZngl4QBpji7MwAT"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-row-reverse items-center gap-2 px-6 py-3 rounded-xl bg-transparent border-2 border-[hsl(30_40%_25%)] text-[hsl(30_40%_25%)] font-kedem font-bold text-base transition-all duration-300 hover:bg-[hsl(30_40%_25%/0.08)]"
              >
                <MessageCircle className="w-5 h-5" />
                קהילת הווצאפ
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== INTRO / MEMORIAL NOTE ===== */}
      <section className="py-10 md:py-14 px-4 bg-gradient-to-b from-[hsl(38_50%_93%)] to-[hsl(38_40%_88%)]">
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-kedem text-[hsl(30_40%_25%)] text-lg md:text-xl leading-relaxed mb-2">
            תודה <strong>לכל המשתתפים</strong> בכנס!
          </p>
          <p className="font-ploni text-[hsl(30_30%_40%)] text-base leading-relaxed mb-4">
            כנס שבועות תשפ״ו נערך לזכרו של{" "}
            <strong className="text-[hsl(30_40%_25%)]">סעדיה יעקב דרעי הי״ד</strong>,
            גיבור ישראל שנפל בעזה — שחייו היו דוגמה חיה לחיבור בין תורה ולחימה.
          </p>
          <p className="font-ploni text-[hsl(30_30%_45%)] text-sm mb-5">
            לתמיכה בפרויקט אתר התנ"ך לזכרו:
          </p>
          <a
            href="https://givechak.co.il/Saadia?ref=r3"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-row-reverse items-center gap-2 px-8 py-3.5 rounded-xl bg-[hsl(43_70%_47%)] text-white font-kedem font-bold text-base md:text-lg shadow-md transition-all duration-300 hover:bg-[hsl(43_70%_40%)] hover:shadow-xl hover:scale-105"
          >
            <Heart className="w-5 h-5" fill="currentColor" />
            תרמו לזכרו
          </a>
        </div>
      </section>

      {/* ===== RECORDINGS ===== */}
      <section id="recordings" className="py-12 md:py-16 px-4 bg-[hsl(38_30%_85%)]">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-kedem font-bold text-2xl md:text-3xl text-[hsl(30_40%_20%)] text-center mb-2">
            הקלטות הכנס
          </h2>
          <p className="font-ploni text-[hsl(30_30%_45%)] text-center text-sm mb-8">
            5 קטעים | סה"כ ~75 דקות תורה
          </p>
          <div className="flex flex-col gap-4">
            {recordings.map((rec, i) => (
              <RecordingCard key={rec.slug} recording={rec} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== DONATION VIDEO SECTION ===== */}
      <div className="h-8 bg-gradient-to-b from-[hsl(38_40%_88%)] to-[hsl(30_45%_28%)]" />
      <section className="py-12 md:py-20 px-4 bg-[hsl(30_45%_28%)]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-kedem font-bold text-3xl md:text-4xl text-[hsl(43_70%_88%)] mb-4">
            אתר התנ"ך החדש — לזכר סעדיה ז"ל
          </h2>
          <p className="font-ploni text-[hsl(38_50%_82%)] mb-8 text-lg">
            צפו בסרטון ההצגה והשתתפו בהקמת אתר התנ"ך הגדול בעם ישראל
          </p>
          <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl mb-8">
            <iframe
              src={`https://drive.google.com/file/d/${DONATION_VIDEO_DRIVE_ID}/preview`}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
          <a
            href="https://givechak.co.il/Saadia?ref=r3"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-row-reverse items-center gap-2 px-8 py-4 rounded-xl bg-[hsl(43_75%_55%)] text-[hsl(30_50%_15%)] font-kedem font-bold text-base md:text-lg shadow-lg transition-all duration-300 hover:bg-[hsl(43_75%_48%)] hover:shadow-xl hover:scale-105"
          >
            <Heart className="w-5 h-5" fill="currentColor" />
            אני רוצה להיות שותף
          </a>
        </div>
      </section>

    </div>
  );
}
