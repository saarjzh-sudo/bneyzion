/**
 * KenesShavuot2026 — כנס שבועות תשפ"ו (19.5.2026)
 *
 * Route: /kenes-2026-05
 *
 * מבוסס על KnesPage.tsx (כנס פורים תשפ"ו).
 * כל שינוי עיצובי מהותי — sandbox בלבד עד אישור rollout.
 */
import { sanitizeHtml } from "@/lib/sanitize";
import { useState } from "react";
import { Play, MessageCircle, BookOpen, ChevronDown, ChevronUp, Heart, Archive } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Layout from "@/components/layout/Layout";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";
import kenesHeroBg from "@/assets/hero-bg-bney-zion.jpg";

const KENES_TITLE = "הכנת הלב למתן תורה";
const KENES_SUBTITLE = "מתוך הפסוקים — ערב לימוד לקראת חג השבועות תשפ״ו";
const KENES_DATE = "י׳ סיון תשפ״ו | 19 במאי 2026";

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
      <h3 style="font-size:1.05em;font-weight:bold;margin-bottom:8px;">מדוע הציווי על מעמד הר סיני חוזר שלוש פעמים?</h3>
      <p style="margin-bottom:10px;">לא "כפל לשון" סתמי — כל חזרה מוסיפה שכבה. הראשונה: הכנה חיצונית (טהרה, גבולות). השנייה: הכנה פנימית (אמונה וציפייה). השלישית: ההתגלות עצמה.</p>
      <h4 style="font-weight:bold;margin:12px 0 6px;">מתן תורה כבריאה חדשה</h4>
      <p style="margin-bottom:10px;">ה׳ לא הכריז מראש בדיוק מה עומד לקרות — כי כל הסבר מוקדם היה נכנס לתוך המסגרת הישנה של "תורת האבות". מתן תורה היה בריאה חדשה שאי אפשר היה להכין לה.</p>
      <h4 style="font-weight:bold;margin:12px 0 6px;">ממלכת כהנים וגוי קדוש</h4>
      <p style="margin-bottom:10px;">לא עוד עם שה׳ מנחה אותו מהצד — אלא עם שהתורה היא המעטפת שבתוכה הוא חי. כמו כהן שכל יומו בנוי סביב רצון ה׳, כך כל יהודי אמור לחיות.</p>
      <p style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">״נעשה ונשמע״ — קודם חווים את החיים בתוך התורה, ואחר כך מבינים אותם. הפוך מכל דרך לימוד אנושית.</p>
    `,
  },
  {
    slug: "02-yoav",
    name: "הרב יואב אוריאל",
    role: "ראש תנועת בני ציון",
    topic: "עין טובה מביאה מלכות — מנאומי ובועז עד סעדיה ז״ל",
    duration: "25:35",
    videoUrl: "https://drive.google.com/file/d/1DanUi5caNMAdebNkiaT-9vcrBQsG02fc/view",
    summaryHtml: `
      <h3 style="font-size:1.05em;font-weight:bold;margin-bottom:8px;">מגילת רות, פרשת יתרו, וסעדיה ז״ל — אותה אמת</h3>
      <p style="margin-bottom:10px;">יתרו שמע על הניסים — אבל רק יתרו הגיע. הוא ראה בעין טובה את מה שה׳ עושה ופעל. נאומי ובועז — שתי עיניים טובות שביחד הביאו מלכות לעולם.</p>
      <h4 style="font-weight:bold;margin:12px 0 6px;">עין בתוך שני השמות</h4>
      <p style="margin-bottom:10px;">הרב יואב עוצר ומציין: האותיות ע-י-ן מצויות בשמות <strong>סעדיה</strong> ו<strong>יעקב</strong> אביו. העיניים הטובות של סעדיה הן אלו שהביאו אותו לאן שהגיע.</p>
      <h4 style="font-weight:bold;margin:12px 0 6px;">סעדיה בעזה עם גמרה</h4>
      <p style="margin-bottom:10px;">חיוך מלא אורה, ווסט ציוד — ולומד גמרה. לא <em>למרות</em> הלחימה אלא <em>מכוחה</em>. "הוא אמר: רגע מפקד, אני מתדלק. חוזר ללחימה."</p>
      <p style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">חיים שמשתלבים לתוך התורה — לא "תוסף דתיות על חיים", אלא חיים שנבנים מתוך תורה מהבסיס.</p>
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
      <h3 style="font-size:1.05em;font-weight:bold;margin-bottom:8px;">אתר תנ״ך חדשני — לזכר גיבור ישראל</h3>
      <p style="margin-bottom:10px;">הפרויקט כבר בנוי: אלפי שיעורים, מאות רבנים, וכלים ללימוד תנ"ך. הכנס הוא ההצגה הראשונה לציבור.</p>
      <p style="margin-bottom:10px;">כפי שסעדיה חי תורה ולחימה ביחד — כך האתר מחבר לימוד תנ"ך אמיתי עם העוצמה שאנחנו חיים בה. הפרויקט נעשה לשמו ולדמותו.</p>
      <p style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">הקהל מוזמן לתרום ולהיות שותפים בהנצחה החיה הזאת — לא רק כסף, אלא כחלק מהמהלך של לימוד התנ"ך בדור הגאולה.</p>
    `,
  },
  {
    slug: "04-draii",
    name: "חיים דרעי",
    role: "אביו של סעדיה יעקב דרעי הי״ד",
    topic: "עדות — מי היה סעדיה",
    duration: "16:24",
    videoUrl: "https://drive.google.com/file/d/19W0Ntau6Q07dHgWM6UM0F1k6Bzf6xzTU/view",
    summaryHtml: `
      <h3 style="font-size:1.05em;font-weight:bold;margin-bottom:8px;">״הוא קם בבוקר וישר הלך ללמוד״</h3>
      <p style="margin-bottom:10px;">לא נאום, לא הספד — עדות חיה של אב על בן שכולו תורה ועוצמה. חיים מתאר ילד שמאז ילדות אהב ללמוד לא כי הכריחו אותו, אלא כי זו הייתה נשמתו.</p>
      <h4 style="font-weight:bold;margin:12px 0 6px;">החיוך שלא עזב</h4>
      <p style="margin-bottom:10px;">גם בעזה, גם בקרב — התמונות של סעדיה הן של אדם שחיוכו מלא אור. לא הצגה. זה מי שהיה. תורה ולחימה — לא שני דברים נפרדים.</p>
      <p style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;font-weight:bold;">״שנלך בדרכיהם — במותם ציוו לנו חיים.״</p>
    `,
  },
  {
    slug: "05-dani-levi",
    name: "הרב דני לוי",
    role: "ראש ישיבת אורות שאול",
    topic: "מוסר ולאומיות בעשרת הדיברות",
    duration: "15:46",
    videoUrl: "https://drive.google.com/file/d/1Et5O3f0CL1sOZpiwy75rCw54BGJ5nRAA/view",
    summaryHtml: `
      <h3 style="font-size:1.05em;font-weight:bold;margin-bottom:8px;">בלי יסוד רוחני — גם הלאומיות מתפוררת</h3>
      <p style="margin-bottom:10px;">מה הקשר בין עשרת הדיברות לבין הלאומיות הישראלית? "בלי היסוד הרוחני אלוקי בעם ישראל — גם המישור המוסרי הכי בסיסי, כולל הלאומיות עצמה, מתפוררים לטווח הרחוק."</p>
      <h4 style="font-weight:bold;margin:12px 0 6px;">סעדיה מייצג דור חדש</h4>
      <p style="margin-bottom:10px;">לא ״למרות התורה — לוחם.״ ״מכוח התורה — לוחם ומאיר.״ החיבור הזה הוא בדיוק מה שהפרויקט של בני ציון מנסה לחזק בכל לומד.</p>
      <p style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;font-weight:bold;">״שנלך בדרכיהם — במותם ציוו לנו חיים.״<br/>אמן ואמן.</p>
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
  const [summaryOpen, setSummaryOpen] = useState(false);
  const embedUrl = getEmbedUrl(recording.videoUrl);
  const hasVideo = !!embedUrl;

  return (
    <>
      <div className="group rounded-2xl border border-[hsl(38_50%_82%)] bg-[hsl(38_50%_95%)] p-4 md:p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-[hsl(43_70%_47%)] text-white font-kedem font-bold text-base md:text-lg shrink-0 mt-1">
              {index + 1}
            </span>
            <div className="flex flex-col">
              <h3 className="font-kedem font-bold text-base md:text-xl text-[hsl(30_40%_25%)]">
                {recording.name}
              </h3>
              <p className="font-ploni text-xs text-[hsl(30_30%_50%)] mb-0.5">{recording.role}</p>
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
    <Layout>
      <div dir="rtl" className="bg-[hsl(38_50%_93%)]">

        {/* ===== HERO ===== */}
        <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
          <img
            src={kenesHeroBg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(38_60%_92%/0.55)] to-[hsl(38_60%_88%/0.75)]" />
          <div className="relative z-10 text-center px-4 py-20 max-w-3xl mx-auto">
            <p className="font-kedem font-light text-[hsl(30_40%_20%)] text-lg md:text-xl mb-3 tracking-wide md:mt-16">
              תנועת בני ציון ללימוד תנ״ך:
            </p>
            <h1 className="font-kedem-hollow text-4xl sm:text-5xl md:text-7xl mb-3 leading-tight bg-gradient-to-l from-[hsl(25_50%_25%)] to-[hsl(30_40%_18%)] bg-clip-text text-transparent">
              {KENES_TITLE}
            </h1>
            <p className="font-kedem text-[hsl(30_35%_35%)] text-base md:text-lg mb-2">{KENES_SUBTITLE}</p>
            <p className="font-ploni text-[hsl(30_30%_50%)] text-sm mb-8">{KENES_DATE}</p>
            <div className="flex flex-col sm:flex-row-reverse items-center justify-center gap-4">
              <a
                href="https://chat.whatsapp.com/LghgDJHZngl4QBpji7MwAT"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-row-reverse items-center gap-2 px-7 py-3.5 rounded-xl bg-[hsl(85_35%_35%)] text-white font-kedem font-bold text-base transition-all duration-300 hover:bg-[hsl(85_35%_28%)] hover:shadow-xl hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                קהילת הווצאפ
              </a>
              <a
                href="#recordings"
                className="flex flex-row-reverse items-center gap-2 px-7 py-3.5 rounded-xl bg-[hsl(43_70%_47%)] text-white font-kedem font-bold text-base transition-all duration-300 hover:bg-[hsl(43_70%_40%)] hover:shadow-xl hover:scale-105"
              >
                <Play className="w-5 h-5" fill="currentColor" />
                הקלטות הכנס
              </a>
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
        <section id="recordings" className="py-12 md:py-16 px-4 bg-[hsl(38_40%_90%)]">
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

        {/* ===== DONATE BOTTOM ===== */}
        <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-[hsl(38_40%_88%)] to-[hsl(38_30%_84%)]">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="font-kedem font-bold text-2xl md:text-3xl text-[hsl(30_40%_20%)] mb-3">
              שותפות בפרויקט התנ״ך
            </h2>
            <p className="font-ploni text-[hsl(30_30%_40%)] text-base leading-relaxed mb-6">
              האתר נבנה לזכרו של סעדיה יעקב דרעי הי״ד.
              כל תרומה מוסיפה שיעור, מאיר קטע תנ"ך, ומנציחה את דמותו.
            </p>
            <a
              href="https://givechak.co.il/Saadia?ref=r3"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-row-reverse items-center gap-2 px-8 py-3.5 rounded-xl bg-[hsl(30_60%_30%)] text-[hsl(43_80%_85%)] font-kedem font-bold text-base md:text-lg shadow-lg transition-all duration-300 hover:bg-[hsl(30_60%_25%)] hover:shadow-xl hover:scale-105"
            >
              <Heart className="w-5 h-5" fill="currentColor" />
              לתרומה — givechak.co.il/Saadia
            </a>
          </div>
        </section>

        {/* ===== ARCHIVE LINK ===== */}
        <section className="py-8 px-4 bg-[hsl(38_30%_84%)] border-t border-[hsl(38_40%_78%)]">
          <div className="max-w-xl mx-auto text-center">
            <Link
              to="/kenes-archive"
              className="inline-flex flex-row-reverse items-center gap-2 font-ploni text-[hsl(30_35%_40%)] text-sm hover:text-[hsl(30_40%_25%)] transition-colors"
            >
              <Archive className="w-4 h-4" />
              כל כנסי בני ציון — ארכיון
            </Link>
          </div>
        </section>

      </div>
    </Layout>
  );
}
