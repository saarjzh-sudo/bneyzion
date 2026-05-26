import { ArrowLeft, Calendar, BookOpen } from "lucide-react";
import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";

const FutureProgram = () => (
  <section className="py-20 md:py-28 px-4 bg-background">
    <div className="max-w-4xl mx-auto text-center">
      <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full border border-accent/30 mb-8">
        <Calendar className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium text-foreground">מה קורה אחרי חגי, זכריה ומלאכי?</span>
      </div>

      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
        ממשיכים ל<span className="text-primary">ספר יהושע</span> – הנביאים מההתחלה
      </h2>

      <p className="text-lg md:text-xl text-brown-light max-w-3xl mx-auto mb-10 leading-relaxed">
        אחרי שנסיים את נביאי הבית השני (חגי, זכריה ומלאכי) – נחזור להתחלה,
        ונתחיל את לימוד הנביאים מספר יהושע, על הסדר, ספר אחרי ספר.
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="premium-card text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-bold text-foreground text-lg mb-2">ספר יהושע</h4>
          <p className="text-brown-light text-sm">כניסה לארץ, כיבוש והתנחלות השבטים</p>
        </div>
        <div className="premium-card text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-bold text-foreground text-lg mb-2">שופטים ושמואל</h4>
          <p className="text-brown-light text-sm">תקופת השופטים והקמת המלוכה</p>
        </div>
        <div className="premium-card text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-bold text-foreground text-lg mb-2">ועוד…</h4>
          <p className="text-brown-light text-sm">מלכים, ישעיה, ירמיה – כל הנביאים על הסדר</p>
        </div>
      </div>

      <div className="premium-card bg-gradient-to-l from-primary/5 to-accent/5 border-primary/20">
        <p className="text-lg text-foreground leading-relaxed">
          <span className="font-bold text-primary">התכנית הכוללת:</span> מסע מסודר דרך כל ספרי הנביאים –
          מיהושע ועד מלאכי, עם הבנה עמוקה ורלוונטית לדורנו.
        </p>
      </div>

      <div className="mt-10">
        <SubscribeButton>
      <button type="button" className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 md:px-10 md:py-5 rounded-xl font-bold text-lg md:text-xl transition-all duration-300 hover:shadow-premium-lg hover:scale-105">
          אני רוצה להצטרף למסע
          <ArrowLeft className="w-5 h-5" />
        </button>
    </SubscribeButton>
      </div>
    </div>
  </section>
);

export default FutureProgram;
