import { ArrowLeft } from "lucide-react";
import estherSunrise from "@/assets/esther-sunrise.jpg";
import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";

const WhySecondTemple = () => (
  <section className="relative py-20 md:py-28 px-4 overflow-hidden">
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${estherSunrise})` }} />
    <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy-deep/60 to-navy-deep/70" />

    <div className="absolute inset-0 opacity-15">
      <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-crimson to-crimson-dark rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-gradient-to-br from-gold to-amber-600 rounded-full blur-3xl" />
    </div>

    <div className="max-w-4xl mx-auto text-center relative z-10">
      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-crimson/20 to-crimson-dark/20 backdrop-blur-sm px-4 py-2 rounded-full border border-crimson/30 mb-6">
        <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cream">קפצו על הרכבת!</span>
      </div>

      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-cream mb-4">
        מתחילים ב-
        <span className="text-transparent bg-clip-text bg-gradient-to-l from-crimson via-crimson-light to-crimson">ט״ו בשבט</span> (2.2)
        <br />
        את <span className="text-transparent bg-clip-text bg-gradient-to-l from-crimson via-crimson-light to-crimson">מגילת אסתר!</span>
      </h2>

      <p className="text-lg md:text-xl text-cream/90 max-w-3xl mx-auto mb-8 leading-relaxed">
        מה קורה כשכל העולם נגד עם ישראל?
        <br className="hidden md:block" />
        איך היהודים גוברים על האימפריות הגדולות?
      </p>

      <p className="text-base md:text-lg text-cream/80 max-w-2xl mx-auto mb-10">
        מגילת אסתר – לא סיפור של גלות, אלא של גאולה.
        <br className="hidden md:block" />
        ספר שמראה איך בסוף עם ישראל תמיד עולה לראש ופותר את הבעיות של העולם כולו.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-10 max-w-3xl mx-auto">
        {[
          ["לא סיפור של גלות – סיפור של גאולה", "המגילה מראה איך עם ישראל גובר על האימפריה הגדולה בעולם."],
          ["מרדכי ואסתר – מנהיגות יהודית בראש", "בסוף היהודים לא רק שורדים – הם מגיעים לראש המלכות."],
          ["כשכל העולם נגדנו", "איך מתמודדים כשגזירה נגד כל עם ישראל – ומנצחים."],
          ["רלוונטי לימינו", "המציאות של היום – כשעמים רבים נגדנו – מקבלת פרספקטיבה חדשה."],
        ].map(([t, d]) => (
          <div key={t} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 text-right">
            <h4 className="font-bold text-gold text-lg mb-2">{t}</h4>
            <p className="text-cream/90 text-sm">{d}</p>
          </div>
        ))}
      </div>

      <SubscribeButton>
      <button type="button" className="inline-flex items-center gap-2 md:gap-3 bg-gradient-to-l from-crimson via-crimson to-crimson-dark text-white px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-base md:text-lg transition-all hover:shadow-xl hover:scale-105">
        אני מצטרף ללימוד מגילת אסתר
        <ArrowLeft className="w-5 h-5" />
      </button>
    </SubscribeButton>
    </div>
  </section>
);

export default WhySecondTemple;
