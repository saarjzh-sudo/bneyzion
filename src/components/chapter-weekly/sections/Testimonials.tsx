import { ArrowLeft, Quote } from "lucide-react";
import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";

const testimonials = [
  {
    text: "הכל מעולה, נהנת מאוד! נהנת מהזכות ללמוד ספרים שלא מגיעים כל כך אליהם ועל המבט של הגאולה של הרב. לא הכרתי את הרב ומאוד נהנת מהשיעורים המרוממים שלו, טעם של גאולה!!",
    name: "מרים ש.",
    featured: true,
  },
  {
    text: "שמח להמליץ על הלימוד השבועי בתנך של 'בני ציון'. התוכנית נותנת תמיכה, הדרכה וליווי בלימוד, גם בתכני עזר מקדימים, גם בשיעורים עמוקים ובהירים וגם בליווי וחיזוק מורלי \"לא לרדת מהגלגל\" ולהמשיך לצעוד בשבילי התנ״ך. הזדמנות פז לזכות ללימוד תנך באופן מסודר, מעמיק ומשמעותי. ממליץ בחום!",
    name: "ברכיה גרוסברג",
    featured: true,
  },
  {
    text: "אני נהנה מאוד ללמוד ולהיות שותף בתכנית התנך. השיעורים של הרב יואב יפים ומאירים כל פרק באור מיוחד. ממבט אמוני עמוק ומחיה של כל פרק בתנך (גם פרקים שנראים כמו רשימות טכניות וכד'). מחכה כבר ללמוד את שאר הספרים!",
    name: "בני מ.",
    featured: true,
  },
  { text: "אף פעם לא נגעתי לספר הזה וזו פעם ראשונה שלומד ספר דניאל. השיעור השני מאד הביא תובנות חדשות והיה מאד מעמיק.", name: "שמשון אנסבכר", role: "אברך" },
  { text: "זה בדיוק מה שחסר לי בלימודי תנ״ך - המבט שמראה לי את מה שהתנך אומר לנו ולא מה שאנחנו חושבים.", name: "אלחי גלבוע", role: "אברך" },
  { text: "התוכנית באמת נפלאה ומאפשרת ללמוד מצד אחד בנחת ומצד שני להתעמק.", name: "אוריאל חיים", role: "סטודנט" },
  { text: "העוגן של השיעור השבועי מאוד מתאים לי. השיעורים מאוד עמוקים ומרחיבים!", name: "נווה בוחבוט", role: "הייטקיסט" },
  { text: "אני מאוד נהנה מההקלטות. הרב יואב מדהים!", name: "יואב רומם", role: "רופא" },
];

const Testimonials = () => {
  const featured = testimonials.filter((t) => t.featured);
  const regular = testimonials.filter((t) => !t.featured);

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

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {featured.map((t, i) => (
            <div key={i} className="relative bg-card border-2 border-primary/20 rounded-2xl p-8 shadow-premium hover:shadow-premium-lg transition-all duration-300 hover:-translate-y-1">
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regular.map((t, i) => (
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
      <button type="button" className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:shadow-premium-lg hover:scale-105">
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
