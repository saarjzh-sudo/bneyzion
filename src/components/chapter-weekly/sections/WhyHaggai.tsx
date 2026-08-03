import { ArrowLeft, CalendarDays } from "lucide-react";
import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";

/*
 * השקת ספר חגי — אלול תשפ"ו (3.8.2026).
 * הקו השיווקי מהרב יואב (WA 3.8 12:25): חגי הוא אחד התהליכים המרכזיים בתנ"ך
 * שקרו בחודש אלול — העם במצב ביניים, מתלבט אם זו הגאולה, וחגי דוחף אותו
 * להסתער קדימה ולבנות. העוגן המקראי: הנבואה הראשונה בספר נאמרה בא' אלול
 * (חגי א, א) והבנייה התחדשה בכ"ד אלול (חגי א, טו).
 */

const haggaiPoints = [
  {
    verse: "״שִׂימוּ לְבַבְכֶם עַל דַּרְכֵיכֶם״",
    title: "חשבון הנפש המקורי של אלול",
    desc: "פעמיים בפרק אחד חוזר חגי על הקריאה הזו. עצירה, התבוננות, ובדיקה מחודשת של הדרך — הרבה לפני שזה נהיה סדר העבודה של החודש הזה.",
  },
  {
    verse: "״זְרַעְתֶּם הַרְבֵּה וְהָבֵא מְעָט״",
    title: "כשמשקיעים — ולא רואים ברכה",
    desc: "העם עובד, זורע, מתאמץ — והברכה לא מגיעה. חגי מלמד לקרוא את הסימנים: מתי הקושי הוא לא עונש, אלא הזמנה לשנות כיוון.",
  },
  {
    verse: "״לֹא עֶת בֹּא״",
    title: "האשליה של ׳עוד לא הגיע הזמן׳",
    desc: "שמונה עשרה שנה עמד הבית חרב, והעם שכנע את עצמו שצריך לחכות. חגי מגלה להם שהשער כבר פתוח — רק צריך להעז להיכנס.",
  },
  {
    verse: "״אֲנִי אִתְּכֶם נְאֻם ה׳״",
    title: "להתחיל לבנות בתנאים לא מושלמים",
    desc: "רוב העם עוד בבבל, האויבים מסביב, והמשאבים דלים. ודווקא אז מגיעה ההבטחה — וההיענות של העם משנה את ההיסטוריה.",
  },
];

const WhyHaggai = () => (
  <section className="py-20 md:py-28 px-4 bg-background">
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full border border-accent/30 mb-6">
          <CalendarDays className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-foreground">מתחילים בחודש אלול</span>
        </div>

        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
          הספר שכולו <span className="text-primary">אלול אחד</span>
        </h2>

        <div className="max-w-3xl mx-auto space-y-4 text-right md:text-center">
          <p className="text-lg md:text-xl text-brown-light leading-relaxed">
            שיבת ציון. העם חזר מגלות בבל למדינה קטנה וחלשה — ובית המקדש עומד חרב.
            רוב העם נשאר בחוץ, האויבים עוצרים כל ניסיון לבנות,
            וכולם שואלים את אותה שאלה: <span className="font-semibold text-foreground">האם זו בכלל הגאולה שהובטחה לנו?</span>
          </p>
          <p className="text-lg md:text-xl text-brown-light leading-relaxed">
            ואז, בראש חודש אלול, אחרי עשרות שנים של שתיקה נבואית —
            <span className="font-semibold text-foreground"> ״הָיָה דְבַר ה׳ בְּיַד חַגַּי הַנָּבִיא״.</span>
          </p>
          <p className="text-lg md:text-xl text-brown-light leading-relaxed">
            חגי לא נותן לעם לחכות לתנאים מושלמים. הוא דוחף אותם להסתער קדימה —
            ובכ״ד אלול, פחות מחודש אחרי, העם כבר עומד ובונה את בית המקדש.
            <span className="font-semibold text-primary"> אלול אחד שינה את ההיסטוריה.</span>
          </p>
        </div>
      </div>

      {/* המספרים של חגי */}
      <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-12">
        <div className="premium-card text-center px-8 py-5">
          <div className="text-3xl md:text-4xl font-bold text-primary mb-1">א׳ אלול</div>
          <p className="text-brown-light text-sm">הנבואה הראשונה בספר</p>
        </div>
        <div className="premium-card text-center px-8 py-5">
          <div className="text-3xl md:text-4xl font-bold text-primary mb-1">כ״ד אלול</div>
          <p className="text-brown-light text-sm">העם מתחיל לבנות</p>
        </div>
        <div className="premium-card text-center px-8 py-5">
          <div className="text-3xl md:text-4xl font-bold text-primary mb-1">2 פרקים</div>
          <p className="text-brown-light text-sm">מהספרים הקצרים בתנ״ך — ולומדים אותו עד הסוף</p>
        </div>
      </div>

      {/* מה נגלה בלימוד */}
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        {haggaiPoints.map((point, i) => (
          <div key={i} className="premium-card text-right">
            <p className="text-primary font-bold text-lg mb-1">{point.verse}</p>
            <h4 className="font-bold text-foreground text-base mb-2">{point.title}</h4>
            <p className="text-brown-light text-sm leading-relaxed">{point.desc}</p>
          </div>
        ))}
      </div>

      <div className="premium-card bg-gradient-to-l from-primary/5 to-accent/5 border-primary/20 text-center mb-10">
        <p className="text-lg text-foreground leading-relaxed">
          יותר מ-2,500 שנה אחרי שנאמרה הנבואה הזו באלול —
          <span className="font-bold text-primary"> אנחנו פותחים את הספר בדיוק באותו חודש.</span>
          <br className="hidden md:block" />
          פרק בשבוע, עם שיעור חי של הרב יואב אוריאל, תכני העמקה ופורטל לימוד אישי.
        </p>
      </div>

      <div className="text-center">
        <SubscribeButton>
          <button
            type="button"
            className="inline-flex items-center gap-2 md:gap-3 bg-primary text-primary-foreground px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-base md:text-lg transition-all hover:shadow-premium-lg hover:scale-105"
          >
            אני פותח את אלול עם חגי
            <ArrowLeft className="w-5 h-5" />
          </button>
        </SubscribeButton>
      </div>
    </div>
  </section>
);

export default WhyHaggai;
