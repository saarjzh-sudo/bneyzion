import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ChevronDown, Play } from "lucide-react";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

interface MemorialPerson {
  name: string;
  suffix: string;
  summary: string;
  bio: string[];
  videoUrl?: string;
  videoLabel?: string;
  linkTo?: string;
}

const people: MemorialPerson[] = [
  {
    name: "בן ציון חיים הנמן",
    suffix: "הי\"ד",
    summary: "'בני ציון' הוקמה להנצחת זכרו. מסר נפשו בקרב עם מחבלים בשכם.",
    linkTo: "/memorial",
    videoUrl: "https://www.youtube.com/results?search_query=%D7%91%D7%9F+%D7%A6%D7%99%D7%95%D7%9F+%D7%94%D7%A0%D7%9E%D7%9F",
    videoLabel: "סרטון – בן ציון הנמן מדבר ביציאה לפעולה שבה נפל",
    bio: [
      "בן תמר ויעקב. נולד ביום ח' בטבת תשמ\"ו ביישוב סוסיא שבדרום הר חברון. אח ליעל, איילת, עפרה, רועי, מוריה, נעמה, יפעת, אהוביה ושירה. לאחר לידתו עברה המשפחה לירושלים. בן-ציון חיים למד בגן של תלמוד תורה \"מורשה\" ולאחר מכן בכיתות היסוד של בית הספר הממלכתי-דתי \"חורב\".",
      "בשנת תשנ\"ה שבה המשפחה להתגורר במקום מגוריה המקורי, במושב נוב שברמת הגולן, ובן-ציון המשיך את לימודיו בבית הספר האזורי הממלכתי-דתי \"גולן\" שבחספין. את לימודיו התיכוניים עשה ב\"ישיבת ירושלים לצעירים\" שליד מרכז הרב. לאחר מכן המשיך לישיבה הגבוהה \"מדברה כעדן\" שבמצפה רמון ולמד בה כחצי שנה ואז החליט להתגייס. בן-ציון ששאף לשרת בצה\"ל כחייל קרבי עשה מאמצים גדולים להעלות את הפרופיל הרפואי שנקבע לו, ולצורך כך אף עבר ניתוח לייזר בעיניו.",
      "בשנת תשס\"ד התגייס בן-ציון לחטיבת הצנחנים לסיירת הצנחנים ועבר את מסלול ההכשרה המפרך שבסיומו הוצב כלוחם בגדוד הסיור. יחד עם חבריו לצוות לחם ופעל במשימות הסיירת.",
      "בתחנות חייו השונות הכיר בן-ציון אנשים רבים ורקם קשרים מיוחדים עם חברים ומכרים מכל רחבי הארץ. במפגשיו עם הזולת ניכרו מידותיו הטובות ואישיותו הכובשת ורבים נקשרו אליו אפילו לאחר מפגש בודד. בן-ציון היה חבר נאמן לכל אדם, קיבל כל אחד כמו שהוא והיה חסר פניות. את קשריו החברתיים טיפח בחיבה ובתשומת לב נדירה ואף כי היה ביישן ומופנם, בלט מאוד ברגישותו לזולת. תכונות אופיו של בן-ציון שילבו את מידת הענווה לצד עוז רוחו, מידת האמת וחוש צדק מפותח, והוא ידע לשמח גם אנשים אומללים וקשי יום.",
      "בן-ציון אהב מאוד את החיים ותכנן תכניות רבות לתקופה שלאחר השחרור. הוא חלם לטייל בעולם, ואחר כך ללמוד חקלאות וייננות. בן-ציון קיווה לחזור למשק ההורים בגולן – לכרמי היין ולכרם הזיתים האורגני, להקים משפחה ולבנות במקום את ביתו. במשפחה סיפרו עליו: \"בן-ציון לא דיבר הרבה, אך מאחורי עיניו הכחולות והחודרות עמד עולם שלם.\"",
      "ביום ו' בתשרי תשס\"ח נפל בן-ציון בקרב במחנה הפליטים עין בית-עילמה הסמוך לשכם. דקות לפני הקרב שבו נהרג תועד במצלמת דובר צה\"ל אומר: \"קוראים לי בן-ציון הנמן, אני גר במושב נוב ברמת הגולן, יש לי תשעה אחים ואחיות, לא אתחיל לפרט את הגילאים. דבר ציונות? יש לנו אחלה מדינה, אחלה צבא, הייתה תקופה אדירה, שיהיה בהצלחה לכולם.\" במהלך הסרט נראים בן-ציון וחבריו למחלקה כשהם מקבלים תדרוך ושרים את \"התקווה\" בדרכם לפעילות ללכידת מבוקשים. הודות לפעילותם סוכל פיגוע התאבדות שתכננו המחבלים במרכז הארץ.",
      "סמל-ראשון בן-ציון חיים הנמן היה בן עשרים ושתיים בנופלו. הוא הובא למנוחות בבית העלמין בחספין. הותיר הורים ותשעה אחים ואחיות.",
    ],
  },
  {
    name: "סעדיה יעקב בן חיים (דרעי)",
    suffix: "הי\"ד",
    summary: "תהא נשמתו צרורה בצרור החיים. מהתומכים הראשונים של בני ציון.",
    bio: [
      "סעדיה היה אדם מיוחד שחיבר בין אהבת התורה לאהבת הארץ. הוא האמין שלימוד התנ\"ך הוא הגשר בין העבר להווה, ושדרך ההיכרות עם סיפורי התנ\"ך אפשר להבין את עומק הקשר שלנו לארץ ישראל.",
      "סעדיה היה מהראשונים שתמכו בהקמת אתר בני ציון, מתוך חזון ברור שלימוד התנ\"ך צריך להיות נגיש לכל יהודי – בכל מקום ובכל זמן. זכרו מלווה אותנו בכל שיעור שנוסף, בכל סדרה שנפתחת, ובכל אדם שמגלה את עומק התנ\"ך דרך האתר הזה.",
    ],
  },
  {
    name: "מעין פלסר",
    suffix: "ז\"ל",
    summary: "תהא נשמתה צרורה בצרור החיים.",
    bio: [
      "מעין פלסר ז\"ל – זכרה מלווה אותנו ומעורר השראה להמשך הלימוד והעשייה למען הנגשת התנ\"ך.",
    ],
  },
];

const MemorialCard = ({ person, index }: { person: MemorialPerson; index: number }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div variants={fadeUp} custom={index} className="glass-card-gold rounded-2xl overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 md:p-8 text-right flex items-start gap-4 hover:bg-primary/5 transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
          <Heart className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl md:text-2xl font-heading text-foreground">
            {person.name} <span className="text-muted-foreground text-base">{person.suffix}</span>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{person.summary}</p>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 mt-2"
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expanded bio */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 md:px-8 pb-8 space-y-4">
              <div className="border-t border-primary/10 pt-6 space-y-4">
                {person.bio.map((paragraph, i) => (
                  <p key={i} className="text-foreground/85 leading-[2] font-serif text-sm md:text-base">
                    {paragraph}
                  </p>
                ))}
              </div>

              {person.videoUrl && (
                <a
                  href={person.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-display hover:bg-primary/20 transition-colors"
                >
                  <Play className="h-4 w-4" />
                  {person.videoLabel || "צפו בסרטון"}
                </a>
              )}

              {person.linkTo && (
                <Link
                  to={person.linkTo}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-display hover:bg-primary/90 transition-colors mr-2"
                >
                  <Heart className="h-4 w-4" />
                  לדף ההנצחה המלא
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const AboutMemorialSection = () => {
  return (
    <section className="py-20 section-gradient-cool">
      <div className="container max-w-4xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-6"
        >
          <motion.div variants={fadeUp} custom={0} className="text-center mb-8">
            <h2 className="text-3xl font-heading gradient-warm mb-3">לזכרם ולהנצחתם</h2>
            <p className="text-muted-foreground text-sm">
              האתר מוקדש לזכרם של אלו שנשמתם מאירה את דרכנו
            </p>
          </motion.div>

          {people.map((person, i) => (
            <MemorialCard key={person.name} person={person} index={i + 1} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AboutMemorialSection;
