/**
 * /memorial — דף ההנצחה של בן ציון חיים הנמן הי"ד (רמה 27, 22.7.2026).
 *
 * יואב 16:36: "כשלוחצים על בן ציון חיים הנמן עולה הדף של סעדיה. צריך להקים דף
 * הנצחה גם לבן ציון — אפשר להעתיק אחד לאחד מבחינת הטקסט והתמונות מהאתר הישן."
 *
 * הטקסט, התמונה והסרטון הועתקו 1:1 מהעמוד הישן bneyzion.co.il/בן-ציון-חיים-הנמן-היד/
 * (הביוגרפיה זהה לזו שבסקשן ההנצחה באודות). קודם לכן הראוט הזה הציג בטעות את
 * תכני סעדיה מ-site_settings (memorial_*) — סעדיה נשאר ב-/memorial/saadia.
 */
import DesignLayout from "@/components/layout-v2/DesignLayout";
import { Seo } from "@/components/seo/Seo";
import { Flame, Play } from "lucide-react";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";

const PHOTO = "https://pzvmwfexeiruelwiujxn.supabase.co/storage/v1/object/public/product-images/memorial/benzion-hanemann.jpg";
const VIDEO_EMBED = "https://www.youtube.com/embed/7r2VG9ZifSk";

const BIO: string[] = [
  "בן תמר ויעקב. נולד ביום ח' בטבת תשמ\"ו ביישוב סוסיא שבדרום הר חברון. אח ליעל, איילת, עפרה, רועי, מוריה, נעמה, יפעת, אהוביה ושירה. לאחר לידתו עברה המשפחה לירושלים. בן-ציון חיים למד בגן של תלמוד תורה \"מורשה\" ולאחר מכן בכיתות היסוד של בית הספר הממלכתי-דתי \"חורב\".",
  "בשנת תשנ\"ה שבה המשפחה להתגורר במקום מגוריה המקורי, במושב נוב שברמת הגולן, ובן-ציון המשיך את לימודיו בבית הספר האזורי הממלכתי-דתי \"גולן\" שבחספין. את לימודיו התיכוניים עשה ב\"ישיבת ירושלים לצעירים\" שליד מרכז הרב. לאחר מכן המשיך לישיבה הגבוהה \"מדברה כעדן\" שבמצפה רמון ולמד בה כחצי שנה ואז החליט להתגייס. בן-ציון ששאף לשרת בצה\"ל כחייל קרבי עשה מאמצים גדולים להעלות את הפרופיל הרפואי שנקבע לו, ולצורך כך אף עבר ניתוח לייזר בעיניו.",
  "בשנת תשס\"ד התגייס בן-ציון לחטיבת הצנחנים לסיירת הצנחנים ועבר את מסלול ההכשרה המפרך שבסיומו הוצב כלוחם בגדוד הסיור. יחד עם חבריו לצוות לחם ופעל במשימות הסיירת.",
  "בתחנות חייו השונות הכיר בן-ציון אנשים רבים ורקם קשרים מיוחדים עם חברים ומכרים מכל רחבי הארץ. במפגשיו עם הזולת ניכרו מידותיו הטובות ואישיותו הכובשת ורבים נקשרו אליו אפילו לאחר מפגש בודד. בן-ציון היה חבר נאמן לכל אדם, קיבל כל אחד כמו שהוא והיה חסר פניות. את קשריו החברתיים טיפח בחיבה ובתשומת לב נדירה ואף כי היה ביישן ומופנם, בלט מאוד ברגישותו לזולת. תכונות אופיו של בן-ציון שילבו את מידת הענווה לצד עוז רוחו, מידת האמת וחוש צדק מפותח, והוא ידע לשמח גם אנשים אומללים וקשי יום.",
  "בן-ציון אהב מאוד את החיים ותכנן תכניות רבות לתקופה שלאחר השחרור. הוא חלם לטייל בעולם, ואחר כך ללמוד חקלאות וייננות. בן-ציון קיווה לחזור למשק ההורים בגולן – לכרמי היין ולכרם הזיתים האורגני, להקים משפחה ולבנות במקום את ביתו. במשפחה סיפרו עליו: \"בן-ציון לא דיבר הרבה, אך מאחורי עיניו הכחולות והחודרות עמד עולם שלם.\"",
  "ביום ו' בתשרי תשס\"ח נפל בן-ציון בקרב במחנה הפליטים עין בית-עילמה הסמוך לשכם. דקות לפני הקרב שבו נהרג תועד במצלמת דובר צה\"ל אומר: \"קוראים לי בן-ציון הנמן, אני גר במושב נוב ברמת הגולן, יש לי תשעה אחים ואחיות, לא אתחיל לפרט את הגילאים. דבר ציונות? יש לנו אחלה מדינה, אחלה צבא, הייתה תקופה אדירה, שיהיה בהצלחה לכולם.\" במהלך הסרט נראים בן-ציון וחבריו למחלקה כשהם מקבלים תדרוך ושרים את \"התקווה\" בדרכם לפעילות ללכידת מבוקשים. הודות לפעילותם סוכל פיגוע התאבדות שתכננו המחבלים במרכז הארץ.",
  "סמל-ראשון בן-ציון חיים הנמן היה בן עשרים ושתיים בנופלו. הוא הובא למנוחות בבית העלמין בחספין. הותיר הורים ותשעה אחים ואחיות.",
];

const Memorial = () => (
  <DesignLayout sidebar={false}>
    <Seo
      title="לזכר בן ציון חיים הנמן הי״ד"
      description="עמוד הנצחה לזכרו של בן ציון חיים הנמן הי״ד — תנועת בני ציון הוקמה להנצחת זכרו."
      url="https://bneyzion.co.il/memorial"
      type="article"
    />

    {/* Hero */}
    <div dir="rtl" style={{ background: gradients.warmDark, padding: "3.5rem 1.5rem 3rem", textAlign: "center" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontFamily: fonts.body, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.18em", color: colors.goldShimmer, marginBottom: "1rem" }}>
          <Flame size={14} /> לעילוי נשמת <Flame size={14} />
        </div>
        <h1 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.8rem, 5vw, 2.6rem)", color: "white", margin: "0 0 0.5rem", lineHeight: 1.2 }}>
          בן ציון חיים הנמן הי״ד
        </h1>
        <p style={{ fontFamily: fonts.body, fontSize: "1rem", color: "rgba(255,255,255,0.85)", margin: "0 0 1.75rem", lineHeight: 1.8 }}>
          תנועת 'בני ציון' הוקמה להנצחת זכרו — בחור ישיבה מלא חיים, אוהב תנ״ך,
          אשר מסר נפשו בקרב עם מחבלים בשכם. שמו הטהור נושא את שם התנועה עד היום.
        </p>
        <img
          src={PHOTO}
          alt="בן ציון חיים הנמן הי״ד"
          style={{ width: 220, borderRadius: radii.xl, boxShadow: "0 18px 50px rgba(0,0,0,0.4)", border: "3px solid rgba(232,213,160,0.35)" }}
        />
      </div>
    </div>

    {/* Bio */}
    <div dir="rtl" style={{ background: colors.parchment, padding: "3rem 1.5rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <section style={{ background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.12)", boxShadow: shadows.cardSoft, padding: "2rem 2.25rem" }}>
          <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.3rem", color: colors.textDark, margin: "0 0 1.25rem" }}>
            קורות חייו
          </h2>
          {BIO.map((p, i) => (
            <p key={i} style={{ fontFamily: fonts.body, fontSize: "0.95rem", color: colors.textMid, lineHeight: 2, margin: "0 0 1.1rem" }}>
              {p}
            </p>
          ))}
        </section>

        {/* Video */}
        <section style={{ marginTop: "1.5rem", background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.12)", boxShadow: shadows.cardSoft, padding: "2rem 2.25rem" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: colors.textDark, margin: "0 0 1rem" }}>
            <Play size={18} style={{ color: colors.goldDark }} />
            בן ציון מדבר ביציאה לפעולה שבה נפל
          </h2>
          <div style={{ position: "relative", paddingBottom: "56.25%", borderRadius: radii.lg, overflow: "hidden" }}>
            <iframe
              src={VIDEO_EMBED}
              title="בן ציון הנמן — סרטון לזכרו"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
            />
          </div>
        </section>

        {/* הקדשה */}
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <a
            href="/donate"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.9rem", borderRadius: radii.lg, background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.95rem", textDecoration: "none", boxShadow: shadows.goldGlow }}
          >
            <Flame size={15} /> להקדשת שיעור לעילוי נשמתו
          </a>
        </div>
      </div>
    </div>
  </DesignLayout>
);

export default Memorial;
