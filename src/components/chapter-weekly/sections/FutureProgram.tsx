import { ArrowLeft, Calendar, BookOpen } from "lucide-react";

const FutureProgram = () => (
  <section className="py-20 md:py-28 px-4 bg-background">
    <div className="max-w-4xl mx-auto text-center">
      <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full border border-accent/30 mb-8">
        <Calendar className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium text-foreground">מה קורה אחרי מגילת אסתר?</span>
      </div>

      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
        ממשיכים לנביאי <span className="text-primary">הבית השני</span>
      </h2>

      <p className="text-lg md:text-xl text-brown-light max-w-3xl mx-auto mb-10 leading-relaxed">
        אחרי פסח נמשיך ללמוד את <span className="font-bold text-foreground">חגי, זכריה ומלאכי</span> –
        הנביאים של אותו הדור של אסתר ומרדכי, שממשיכים באופן ישיר את סיפור המגילה להמשך ימי הבית השני.
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {[
          ["חגי", "הנביא שעודד את בניית הבית השני"],
          ["זכריה", "חזונות הגאולה והמנורה"],
          ["מלאכי", "הנביא האחרון – לקראת הגאולה"],
        ].map(([t, d]) => (
          <div key={t} className="premium-card text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-bold text-foreground text-lg mb-2">{t}</h4>
            <p className="text-brown-light text-sm">{d}</p>
          </div>
        ))}
      </div>

      <div className="premium-card bg-gradient-to-l from-primary/5 to-accent/5 border-primary/20">
        <p className="text-lg text-foreground leading-relaxed">
          <span className="font-bold text-primary">התכנית הכוללת:</span> לימוד כל ספרי התנ"ך על הסדר –
          נביאים וכתובים, עם הבנה עמוקה ורלוונטית לדורנו.
        </p>
      </div>

      <div className="mt-10">
        <a
          href="https://pay.grow.link/714ddd3db06f5aabeaecb107064b431f-MjcwODI0Ng"
          className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 md:px-10 md:py-5 rounded-xl font-bold text-lg md:text-xl transition-all duration-300 hover:shadow-premium-lg hover:scale-105"
        >
          אני רוצה להצטרף למסע
          <ArrowLeft className="w-5 h-5" />
        </a>
      </div>
    </div>
  </section>
);

export default FutureProgram;
