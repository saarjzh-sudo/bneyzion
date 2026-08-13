import { ArrowLeft, Quote } from "lucide-react";
import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";

const testimonials = [
  // מהמשוב של לומדי תכנית איכה (טופס יואב, נשלף 13.8.2026) — לפי הנוהל:
  // ההמלצה היא שורה אחת כלשונה, שם פרטי + אות ראשונה של שם המשפחה.
  {
    text: "לרב יואב ובני ציון מבט ייחודי על התנ\"ך. כל שיעור יש בו חידוש שמשנה את כל המבט על הפרק ומקשר אותו לחיים ולתקופה שלנו.",
    name: "יעקב א.",
    featured: true
  },
  {
    text: "תודה גדולה על הזכות ללמוד את ספרי התנ\"ך בגובה שמחבר כל כך לחיים, בחוויה אמיתית של מתיקות התורה!",
    name: "רעות",
    featured: true
  },
  {
    text: "וואו. איזה כיף ומעמיק ללמוד תנ\"ך עם הרב יואב אוריאל! זו תכנית שמחזירה את האור ללימוד התנ\"ך: כל פרק נפתח בהקשר הרחב שלו בתוך הספר ובתוך התנ\"ך כולו, ופתאום הפסוקים \"נפתחים\" בצורה בהירה, מרגשת ומדויקת. כעוסק בהוראה - התכנים פשוט מעלים את רמת הלימוד בכיתה. תכנית חובה לכל מי שרוצה להבין תנ\"ך באמת.",
    name: "נתנאל ידגרי",
    role: "מורה",
    featured: true
  },
  {
    text: "לקראת השנה החדשה חיפשתי שיעור שבועי בזום שימלא אותי בתוכן וברוח. הלימוד משמעותי הרבה מעבר למה שציפיתי! הוא מלווה אותי לאורך כל השבוע במינונים קטנים, וגולת הכותרת היא השיעור השבועי - מרתק, מעמיק, ומחבר את אירועי התנ\"ך לאירועים הגדולים שאנחנו חווים בדור שלנו. זה לא רק שיעור תנ\"ך אלא ממש שיעור באמונה!",
    name: "חנה יצחקי",
    featured: true
  },
  {
    text: "יש כאן בשורה היסטורית, לא פחות - להפוך את לימוד התנ\"ך העמוק לחלק מהמיינסטרים בחברה, בצורה לא פשטנית מחד, או מרחפת מאידך. הרב מתחיל כל שיעור משאלות בפשט, ומטפס עד שיוצאים עם מבט חדש, כללי ורחב, שמעשיר את האופק הרוחני. התועלת ביחס להשקעה השבועית היא עצומה.",
    name: "ישורון צוקרמן",
    featured: true
  },
  {
    text: "נרשמתי מתוך סקרנות ורצון ללמוד תנ\"ך מסודר ומעמיק. כמי שלא למדה תנ\"ך מאז התיכון חששתי שאתקשה - אבל התוכנית בנויה כך שאפשר להתכונן ולהבין את הפרקים לעומק. בסיום כל שיעור יצאתי בהרגשה מרוממת ומלאת תקווה לגבי עתידנו (נושא שהיה קשה בשנים האחרונות).",
    name: "מעין ליב",
    role: "לומדת חדשה"
  },
  {
    text: "הכל מעולה, נהנת מאוד! נהנת מהזכות ללמוד ספרים שלא מגיעים אליהם ועל המבט של הגאולה של הרב. לא הכרתי את הרב ומאוד נהנת מהשיעורים המרוממים שלו, טעם של גאולה!!",
    name: "מרים שוראקי",
  },
  {
    text: "התכנית מובנית ומסודרת מאוד, שווה לכל נפש - הן מבחינת רמת הלימוד והן מבחינת רמת הפניות שהיא דורשת. נותנת לי את הזכות ללמוד תנ\"ך באופן מסודר, עמוק ועל הדרך גם מביאה כלים מעשיים ללימוד תנ\"ך.",
    name: "יהודה לוין",
  },
  {
    text: "שמח להמליץ על הלימוד השבועי בתנ\"ך של 'בני ציון'. התוכנית נותנת תמיכה, הדרכה וליווי, גם בתכני עזר מקדימים, גם בשיעורים עמוקים ובהירים, וגם בליווי וחיזוק מורלי \"לא לרדת מהגלגל\". הזדמנות פז לזכות ללימוד תנ\"ך מעמיק ומשמעותי. ממליץ בחום!",
    name: "ברכיה גרוסברג",
  },
  {
    text: "אני נהנה מאוד ללמוד ולהיות שותף בתכנית. השיעורים של הרב יואב מאירים כל פרק באור מיוחד, ממבט אמוני עמוק ומחיה של כל פרק (גם פרקים שנראים כמו רשימות טכניות). מחכה כבר ללמוד את שאר הספרים!",
    name: "בני מרואני",
  },
  {
    text: "תוכנית ממש מעולה, בקצב טוב, שיעורים ברמה מאוד גבוהה, מעניינים, בונים מבט אמיתי ועמוק ועוזרים ממש לרצות ללמוד את התנ\"ך.",
    name: "יעקב אמסלם",
  },
  {
    text: "לימוד ספר דניאל היה חוויה מיוחדת - מעולם לא למדתי אותו על הסדר. הכנסת קביעות לחיים בלימוד תנ\"ך היא דבר שלא עשיתי שנים רבות, והמסגרת מאפשרת לעשות את זה בכיף. בעצם בשביל השיעור הזה נרשמתי. מומלץ מאוד!!",
    name: "לירון גרינבאום",
  },
  {
    text: "התוכנית העשירה לי את הידע, נתנה לי גישה נעימה וברורה לעולמו של דניאל ולקדושת התנ\"ך. מפגש שבועי מעצים, מרגש וחוויתי. קיבלתי מעבר לידע - גם חיבור לעצמי ולאור התנ\"ך, באווירה עוטפת ומחבקת. מבחינתי זה לא רק לימוד - זה לימוד חי ומפרה.",
    name: "יסכה לובין",
  },
  {
    text: "אני חושב שהבחירה לגבות תשלום על ההשתתפות היא דבר נכון, שיוצר חיבור יציב יותר ללימוד גם מבחינה נפשית.",
    name: "נועם אניספלד",
  },
  {
    text: "הלימוד היה רחב, עמוק ומרתק. הסתכלות חדשה על תפיסות רוחב, עם הבנה היסטורית, דפי מקורות מגוונים. הרבה עומק וחשיבה אמונית תהליכית גאולית.",
    name: "ימימה גנץ",
  },
  {
    text: "הרבה שנים רציתי ללמוד תנ\"ך ולא יצא לי. עכשיו, כשיש לימוד בקבוצה, בקביעות ועם שיעורים מרוממים, זו שמחה גדולה על הזכות הזו להגשים חלום גדול!",
    name: "שלומית דביר",
  },
  {
    text: "זה בדיוק מה שחסר לי בלימודי תנ\"ך - המבט שמראה לי את מה שהתנ\"ך אומר לנו ולא מה שאנחנו חושבים.",
    name: "אלחי גלבוע",
    role: "אברך"
  },
  {
    text: "העוגן של השיעור השבועי מאוד מתאים לי. השיעורים מאוד עמוקים ומרחיבים!",
    name: "נווה בוחבוט",
    role: "הייטקיסט"
  },
];

const Testimonials = () => {
  const featuredTestimonials = testimonials.filter((t) => t.featured);
  const regularTestimonials = testimonials.filter((t) => !t.featured);

  return (
    <section className="py-20 md:py-28 px-4 bg-gradient-to-b from-primary/5 to-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gold/5 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">מה אומרים הלומדים</span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground">חוויות אמיתיות מהשטח</h2>
        </div>

        {/* Featured testimonials - larger and more prominent */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {featuredTestimonials.map((t, i) => (
            <div
              key={i}
              className="relative bg-card border-2 border-primary/20 rounded-2xl p-8 shadow-premium hover:shadow-premium-lg transition-all duration-300 hover:-translate-y-1"
            >
              <Quote className="absolute top-4 left-4 w-10 h-10 text-primary/20" />
              <div className="relative">
                <p className="text-brown-light leading-relaxed mb-6 text-lg">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {t.name.charAt(0)}
                  </div>
                  <p className="font-bold text-foreground text-lg">{t.name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Regular testimonials - smaller grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regularTestimonials.map((t, i) => (
            <div key={i} className="premium-card">
              <p className="text-brown-light leading-relaxed mb-4 text-sm">"{t.text}"</p>
              <div className="flex items-center justify-between">
                <p className="font-bold text-foreground">{t.name}</p>
                {t.role && <p className="text-xs text-primary">{t.role}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <SubscribeButton>
            <button
              type="button"
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:shadow-premium-lg hover:scale-105"
            >
              אשמח להצטרף
              <ArrowLeft className="w-5 h-5" />
            </button>
          </SubscribeButton>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
