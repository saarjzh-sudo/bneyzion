import { ArrowLeft, Sparkles } from "lucide-react";
import { useState } from "react";
import estherSunrise from "@/assets/esther-sunrise.jpg";
import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";

const keyTopics = [
  {
    title: "חזרת הנבואה בתוך החושך",
    desc: "עם ישראל כבר איבד את כוח הנבואה – ואחרי עשרות שנים, ה' פתח שערי שמיים מחדש לזמן קצר. הנחיות לתקופת חושך, מתוך אור עצום.",
  },
  {
    title: "מנבואה לתורה שבעל פה",
    desc: "הנביאים האחרונים כחוליית תפר היסטורית – הנבואה יורדת אל המציאות, מתקצרת ומתמצטת, כהכנה לדורות של הסתר פנים ולימוד תורה.",
  },
  {
    title: "סוד 'כ״ד בחודש' וימי החנוכה",
    desc: "תאריך חוזר באופן פלאי בספרי שיבת ציון – עבודה רוחנית בימי חשכה, וזיקה מהותית ליסוד חג החנוכה והדלקת האור.",
  },
  {
    title: "מ'יד ה'' ל'עיני ה'' – תמורות בהשגחה",
    desc: "מעבר מניסים גלויים כיציאת מצרים, להשגחה נסתרת ('שבעה עיני ה' משוטטים') – שדורשת שותפות ואחריות של 'קמעא קמעא'.",
  },
  {
    title: "ברכת הארץ ובניין המקדש",
    desc: "חידוש רוחני: השפע הכלכלי קשור בקשר ישיר למסירות לבניין המקדש ולמשימה הלאומית.",
  },
  {
    title: "אשליית 'לא עת בוא' וההחמצה ההיסטורית",
    desc: "דור שהמתין לסימנים שמימיים ולקצים מחושבים – ובכך כמעט החמיץ את שעת הכושר המעשית לבניין.",
  },
  {
    title: "חזונות הגאולה ומלחמת גוג ומגוג",
    desc: "פענוח מראות זכריה – ישראל מול מעצמות העולם, שתי קומות בגאולת ירושלים, והמתח הפנימי בתוך האומה.",
  },
  {
    title: "שחיקה רוחנית ועייפות הקודש",
    desc: "הבדל עמוק בין חטאי הבית הראשון (עבודה זרה) לבין חטאי הבית השני – זלזול, עייפות, 'לחם מגואל'. הירדמות של דור נטול להט.",
  },
  {
    title: "חותם הנבואה – חיבור הדורות",
    desc: "נבואת החתימה: 'תורת משה' כעוגן לתקופת ההסתר, ו'השבת לב אבות על בנים' כהכנה ליום ה' הגדול.",
  },
];

const WhySecondTemple = () => {
  const [showAll, setShowAll] = useState(false);
  const visibleTopics = showAll ? keyTopics : keyTopics.slice(0, 4);

  return (
    <section className="relative py-20 md:py-28 px-4 overflow-hidden">
      {/* Sunrise Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${estherSunrise})` }}
      />

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(240,20%,5%)]/90 via-[hsl(240,20%,5%)]/75 to-[hsl(240,20%,5%)]/85" />

      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-15">
        <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-crimson to-crimson-dark rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-gradient-to-br from-gold to-amber-600 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-crimson/20 to-crimson-dark/20 backdrop-blur-sm px-4 py-2 rounded-full border border-crimson/30 mb-6">
            <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
            <span className="text-sm font-medium text-cream">למה דווקא עכשיו?</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-cream mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-crimson via-crimson-light to-crimson">חגי, זכריה ומלאכי</span>
            <br />
            <span className="text-cream/90 text-2xl md:text-3xl">הנבואה שחזרה – כדי להאיר את החושך</span>
          </h2>

          <p className="text-lg md:text-xl text-cream/90 max-w-3xl mx-auto mb-4 leading-relaxed">
            עם ישראל כבר איבד את כוח הנבואה. עשרות שנים של שתיקה.
            <br className="hidden md:block" />
            ואז – פתאום – ה' פתח את שערי השמיים מחדש, לזמן קצר.
          </p>

          <p className="text-base md:text-lg text-cream/75 max-w-3xl mx-auto mb-4 leading-relaxed">
            שלושה נביאים אחרונים קיבלו השראה עצומה – הנחיות, חזונות ונבואות עתיד –
            בדיוק כשהאומה נכנסה לתקופה החשוכה ביותר, תקופת הבית השני.
          </p>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-gold/30 max-w-3xl mx-auto mb-8">
            <p className="text-cream/90 text-lg leading-relaxed">
              <Sparkles className="w-5 h-5 text-gold inline-block ml-2" />
              <span className="text-gold font-bold">מאז ועד היום</span> – אנחנו חיים בתוך התקופה שהנביאים האלה תיארו.
              ההיסטוריה מול המלכויות, הגלות, שיבת ציון, גוג ומגוג –
              <span className="font-semibold text-cream"> הכל כאן, בפסוקים שמחכים שתגלה אותם.</span>
            </p>
          </div>
        </div>

        {/* Key Topics */}
        <h3 className="text-2xl md:text-3xl font-bold text-cream text-center mb-8">
          מה נלמד? <span className="text-gold">טעימה מהנושאים</span>
        </h3>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {visibleTopics.map((topic, i) => (
            <div
              key={i}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 text-right transition-all duration-300 hover:bg-white/15 hover:border-gold/30"
            >
              <h4 className="font-bold text-gold text-lg mb-2">{topic.title}</h4>
              <p className="text-cream/85 text-sm leading-relaxed">{topic.desc}</p>
            </div>
          ))}
        </div>

        {!showAll && (
          <div className="text-center mb-10">
            <button
              onClick={() => setShowAll(true)}
              className="text-gold hover:text-cream border border-gold/40 hover:border-gold/70 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 backdrop-blur-sm bg-white/5"
            >
              עוד נושאים ({keyTopics.length - 4} נוספים) ↓
            </button>
          </div>
        )}

        {showAll && (
          <div className="text-center mb-10">
            <button
              onClick={() => setShowAll(false)}
              className="text-gold hover:text-cream border border-gold/40 hover:border-gold/70 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 backdrop-blur-sm bg-white/5"
            >
              הצג פחות ↑
            </button>
          </div>
        )}

        <div className="text-center">
          <SubscribeButton>
            <button
              type="button"
              className="inline-flex items-center gap-2 md:gap-3 bg-gradient-to-l from-crimson via-crimson to-crimson-dark text-white px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-base md:text-lg transition-all hover:shadow-xl hover:scale-105"
            >
              אני מצטרף ללימוד הקיץ
              <ArrowLeft className="w-5 h-5" />
            </button>
          </SubscribeButton>
        </div>
      </div>
    </section>
  );
};

export default WhySecondTemple;
