import { Cta, PriceLine } from "../Cta";
import { BOOKS, SEASON } from "../data";

/**
 * המכתב של הרב יואב — סקשן במשלב אחר לגמרי משאר הדף: נייר, לא כרטיס.
 *
 * הקופי מתוך `A-yehoshua/lp-copy.md` (עבר מבחן voice-cards).
 * ⚠️ הבריף משאיר לסער לבחור בין שתי גרסאות. משנים את הקבוע כאן בלבד.
 */
const LETTER_VERSION: "עניינית" | "רגשית" = "עניינית";

const LETTERS = {
  רגשית: [
    "שלום, כאן יואב אוריאל.",
    "ספר יהושע נפתח בעם שלם שעומד על גדות הירדן, אחרי ארבעים שנה במדבר. כשנגעו רגלי הכהנים במים, הירדן נעצר, והעם נכנס הביתה, אל הארץ.",
    "מתי יצא לך ללמוד את הספר הזה ברצף, פרק אחר פרק?",
    "אחרי החגים אנחנו מתחילים אותו: פרק בשבוע, שיעור חי, וקבוצה שלומדת יחד. קביעות אחת בשבוע, שמכניסה את ספר הנביאים אל תוך השנה שלכם.",
    "עכשיו, כשאנחנו נאבקים על הארץ הזאת, הפרקים האלה נקראים כאילו נכתבו עלינו. הם מזכירים מי הכניס אותנו לכאן ומי מחזיק אותנו כאן.",
    "אני מזמין אותך להתחיל מהפרק הראשון.",
  ],
  עניינית: [
    "שלום, כאן יואב אוריאל.",
    `השנה אנחנו מתחילים את הנביאים: אחרי החגים נפתח את ספר ${BOOKS[0].name}, פרק בשבוע, ומשם נמשיך אל ספר ${BOOKS[1].name}.`,
    "יהושע הוא הספר שבו עם ישראל נכנס לארץ: הירדן שנעצר, חומת יריחו שנפלה, חלוקת הארץ לנחלות, ברית שכם. מתי יצא לך ללמוד אותו ברצף, מהפרק הראשון ועד האחרון?",
    "הלימוד פשוט: פרק אחד בשבוע, שיעור זום חי, תכני העמקה בהירים, וקבוצה שלומדת יחד. כך נבנית קביעות של תנ״ך, וממנה, בעזרת ה׳, קומה חדשה של קודש בעם.",
    "אני מזמין אותך להתחיל את השנה איתנו.",
  ],
} as const;

const Letter = () => (
  <section className="relative py-20 md:py-28 px-4 bg-cream-warm">
    <div className="max-w-3xl mx-auto">
      <div className="cw2-paper rounded-2xl px-6 py-10 md:px-14 md:py-14 border border-[#C4A265]/25">
        <div className="flex items-center gap-4 mb-9 pb-7 border-b border-[#C4A265]/25">
          <img
            src="/lovable-uploads/fbbe71d6-129b-47d8-a0ec-ce3ce44cdb29.png"
            alt="הרב יואב אוריאל"
            className="w-16 h-16 md:w-[72px] md:h-[72px] rounded-full object-cover ring-2 ring-[#C4A265]/40 flex-shrink-0"
            loading="lazy"
          />
          <div>
            <p className="font-bold text-foreground text-lg leading-tight">הרב יואב אוריאל</p>
            <p className="text-sm text-foreground/65 mt-0.5">
              ראש תנועת בני ציון ללימוד תנ״ך
            </p>
          </div>
        </div>

        <div className="space-y-5 text-lg md:text-xl leading-[1.85] text-foreground/90">
          {LETTERS[LETTER_VERSION].map((paragraph, i) => (
            <p key={i} className={i === 0 ? "font-semibold text-foreground" : undefined}>
              {paragraph}
            </p>
          ))}
        </div>

        <p className="mt-10 text-xl font-bold text-foreground">יואב אוריאל</p>

        <div className="cw2-hairline my-9" />

        <div className="text-center">
          <Cta tone="teal">מצטרפים לשנת הנביאים</Cta>
          <PriceLine muted />
          <p className="text-xs text-foreground/55 mt-3">
            הלימוד נפתח {SEASON.startDateLabel}
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default Letter;
