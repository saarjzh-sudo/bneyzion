import { ArrowLeft, Check, Shield } from "lucide-react";
import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";

const Pricing = () => (
  <section className="py-20 md:py-28 px-4 bg-cream-warm">
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">מחיר שווה לכל נפש</h2>
      <p className="text-lg text-brown-light mb-12">התכנית ללא שום התחייבות – ניתן להצטרף אפילו לחודש אחד</p>

      <div className="premium-card max-w-xl mx-auto mb-12 relative overflow-hidden">
        {/* Sale badge */}
        <div className="absolute top-4 left-4 bg-gradient-to-l from-crimson to-crimson-dark text-white px-4 py-1.5 rounded-full text-sm font-bold animate-pulse">
          🔥 מבצע הצטרפות!
        </div>
        <div className="pt-8">
          <p className="text-primary font-semibold mb-4">מנוי חודשי – כולל הכל</p>
          <div className="mb-8">
            <div className="flex items-baseline justify-center gap-2 mb-1">
              <span className="text-2xl text-muted-foreground line-through">110 ש"ח</span>
            </div>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-6xl md:text-7xl font-bold text-primary">5</span>
              <span className="text-2xl text-foreground font-semibold">ש"ח</span>
            </div>
            <p className="text-lg text-foreground mt-2">לחודש הראשון בלבד</p>
            <p className="text-sm text-primary font-semibold mt-1">ואח"כ 110 ש"ח לחודש • ביטול בכל עת</p>
          </div>

          <ul className="space-y-3 text-right mb-8">
            {[
              "כל התכנים והשיעורים",
              "גישה לכל ההקלטות",
              "קבוצת וואטסאפ ייחודית",
              "ביטול בכל עת",
            ].map((text) => (
              <li key={text} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-foreground">{text}</span>
              </li>
            ))}
          </ul>

          <SubscribeButton>
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-2 md:gap-3 bg-primary text-primary-foreground px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-base md:text-lg transition-all duration-300 hover:shadow-premium-lg hover:scale-105"
            >
              אני רוצה להצטרף!
              <ArrowLeft className="w-5 h-5" />
            </button>
          </SubscribeButton>
        </div>
      </div>

      <div className="premium-card max-w-xl mx-auto bg-primary/5 border-primary/20">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-primary" />
          <h3 className="text-xl font-bold text-foreground">ללא התחייבות</h3>
        </div>
        <p className="text-foreground leading-relaxed">
          התכנית גמישה לחלוטין – אפשר להצטרף לחודש אחד ולהחליט אם להמשיך.
          <br />
          <span className="font-semibold">ביטול בכל עת, בלי שאלות ובלי אותיות קטנות.</span>
        </p>
      </div>

      <p className="text-sm text-brown-light mt-8">*התכנית מיועדת גם לנשים וגם לגברים</p>
    </div>
  </section>
);

export default Pricing;
