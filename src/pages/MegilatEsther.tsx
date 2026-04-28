import "@/styles/chapter-weekly.css";

import { AnimatedSection } from "@/components/ui/animated-section";
import { QuickBuyDialog } from "@/components/payment/QuickBuyDialog";
import heroDesktop from "@/assets/esther-hero-desktop.png";
import heroMobile from "@/assets/esther-hero-mobile.png";
import estherBook from "@/assets/esther-book.png";
import bookSet from "@/assets/book-set.png";
import { Crown, ScrollText, Eye, Sparkles, Shield, Users, Star, ChevronLeft, Gift, Library, Download, BookOpen, Target } from "lucide-react";

const SAMPLE_PDF = "/files/megillat-esther-sample.pdf";

interface CtaButtonProps {
  className?: string;
  large?: boolean;
  /** Tier — single book (default), two-pack, or full series */
  tier?: "single" | "double" | "set";
}

const TIERS = {
  single: { amount: 70,  label: "מגילה אחת",            description: "מגילת אסתר – מכלל יופי (עותק אחד)" },
  double: { amount: 120, label: "2 מגילות",              description: "מגילת אסתר – מכלל יופי (זוג)" },
  set:    { amount: 350, label: "סדרת מכלל יופי",        description: "סדרת מכלל יופי – חמש מגילות + שופטים" },
} as const;

const CtaButton = ({ className = "", large = false, tier = "single" }: CtaButtonProps) => {
  const t = TIERS[tier];
  return (
    <QuickBuyDialog
      product="book-megilat-esther"
      amount={t.amount}
      description={t.description}
      title={`רכישת ${t.label}`}
      subtitle={`₪${t.amount.toLocaleString("he-IL")} · ${t.description}`}
      maxInstallments={3}
    >
      <button
        type="button"
        className={`inline-flex items-center gap-3 bg-gradient-to-l from-gold to-gold-light text-navy-deep rounded-xl font-bold transition-all duration-300 hover:shadow-gold hover:scale-105 ${
          large ? "px-10 py-5 text-xl" : "px-8 py-4 text-lg"
        } ${className}`}
      >
        <Crown className={large ? "w-6 h-6" : "w-5 h-5"} />
        לרכישת הספר
        <ChevronLeft className={large ? "w-5 h-5" : "w-4 h-4"} />
      </button>
    </QuickBuyDialog>
  );
};

const SampleButton = ({ light = false, className = "" }: { light?: boolean; className?: string }) => (
  <a
    href={SAMPLE_PDF}
    target="_blank"
    rel="noopener noreferrer"
    className={`inline-flex items-center gap-2 rounded-xl font-bold transition-all duration-300 hover:scale-105 px-6 py-3 text-base ${
      light ? "border-2 border-cream/40 text-cream hover:bg-cream/10" : "border-2 border-accent/40 text-accent hover:bg-accent/10"
    } ${className}`}
  >
    <Download className="w-5 h-5" />
    הורידו פרק לדוגמא
  </a>
);

const MegilatEsther = () => {
  return (
    <div className="chapter-weekly-theme min-h-screen bg-background text-foreground" dir="rtl">
      <header className="py-3 px-4 bg-cream-warm border-b border-border/30">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <img
            src="/lovable-uploads/logo-bney-zion-horizontal-tagline.png"
            alt="בני ציון – בונים קומה בתנ״ך"
            className="h-16 md:h-20 transition-all duration-300 hover:scale-105"
          />
        </div>
      </header>

      <section className="relative min-h-[90vh] md:min-h-screen flex flex-col overflow-hidden">
        <div className="relative w-full flex-1">
          <img src={heroDesktop} alt="מגילת אסתר – מכלל יופי על שולחן פורים" className="hidden md:block w-full h-full object-cover" />
          <img src={heroMobile} alt="מגילת אסתר – מכלל יופי על שולחן פורים" className="block md:hidden w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/60 to-transparent" />
        </div>

        <div className="absolute bottom-0 inset-x-0 z-10 px-4 pb-10 md:pb-16 text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-cream mb-4 leading-tight drop-shadow-lg">
            השנה, תקרא את המגילה
            <br />
            <span className="bg-gradient-to-l from-gold to-gold-light bg-clip-text text-transparent">כמו שאף פעם לא קראת</span>
          </h1>

          <p className="text-base md:text-xl text-cream/85 max-w-2xl mx-auto mb-8 leading-relaxed drop-shadow-md">
            גלה את המלחמה האמיתית, מאחורי הקלעים בארמון המלך אחשוורוש, בביאור שחורז את כל המגילה לסיפור אחד בהיר ועמוק.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <CtaButton />
            <SampleButton light />
          </div>
        </div>
      </section>

      <AnimatedSection>
        <section className="section-premium bg-navy-deep">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-4xl font-bold text-cream text-center mb-12">שאלות שלא ידעת שצריך לשאול</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: <ScrollText className="w-8 h-8" />,
                  question: 'מהו "החוק העליון" של פרס ומדי, ואיך דווקא הוא היה המפתח לניצחון של מרדכי ואסתר?',
                },
                { icon: <Eye className="w-8 h-8" />, question: "למה המן הרשע החזיק בביתו קרש עתיק שנלקח מתיבת נח?" },
                { icon: <Sparkles className="w-8 h-8" />, question: "מה הסוד הגדול שהסתיר חרבונה, ששינה את פני ההיסטוריה ברגע אחד?" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-navy-light/50 backdrop-blur-sm border border-gold/20 rounded-2xl p-6 md:p-8 text-center transition-all duration-300 hover:border-gold/40 hover:-translate-y-1"
                >
                  <div className="text-gold mb-4 flex justify-center">{item.icon}</div>
                  <p className="text-cream/90 text-lg leading-relaxed font-medium">{item.question}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <CtaButton />
              <SampleButton light />
            </div>
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection>
        <section className="section-premium bg-cream-warm">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-6">
              מה הספר <span className="gradient-text-gold">מגלה</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              הספר מראה, צעד אחר צעד, איך בתוך החושך הגדול ביותר נרקם המהלך האלוקי שבו עם ישראל תמיד עולה לראש.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: <Shield className="w-7 h-7" />, title: "ניצחון על אימפריות", desc: "איך היהודים לא רק שורדים, אלא גוברים על האימפריות הגדולות ביותר." },
                { icon: <Crown className="w-7 h-7" />, title: "מנהיגות יהודית", desc: "איך ברגע האמת צומחת מנהיגות יהודית שתופסת את ראשות המלכות." },
                { icon: <Users className="w-7 h-7" />, title: "עם ישראל מוביל", desc: "איך בסופו של דבר, עם ישראל הוא זה שפותר את הבעיות של העולם כולו." },
              ].map((item, i) => (
                <div key={i} className="premium-card text-center">
                  <div className="text-accent mb-4 flex justify-center">{item.icon}</div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection>
        <section className="section-premium bg-navy-deep">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-br from-gold/30 to-gold-light/15 rounded-2xl blur-xl opacity-60 group-hover:opacity-90 transition-opacity duration-500" />
                <img
                  src={estherBook}
                  alt="ספר מגילת אסתר – מכלל יופי"
                  className="relative w-64 md:w-80 lg:w-96 rounded-xl shadow-2xl ring-2 ring-gold/40 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-cream mb-3">
              מגילת אסתר – <span className="bg-gradient-to-l from-gold to-gold-light bg-clip-text text-transparent">מכלל יופי</span>
            </h2>
            <p className="text-cream/70 text-lg max-w-xl mx-auto">ביאור שלם, בהיר ומרתק – שחורז את כל המגילה לסיפור אחד עוצר נשימה.</p>
          </div>
        </section>
      </AnimatedSection>

      <div className="h-2 bg-gradient-to-l from-gold via-crimson to-gold" />

      <AnimatedSection>
        <section className="section-premium bg-cream-warm">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
              הזמינו <span className="gradient-text-gold">עכשיו</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-4 max-w-2xl mx-auto leading-relaxed">
              סדרת ספרי מכלל יופי מזמינה אתכם להיכנס לעולם של תובנות חדשות ועמוקות מהתנ״ך עם כתיבה בהירה ופשוטה.
            </p>
            <p className="text-muted-foreground text-base mb-12 max-w-2xl mx-auto leading-relaxed">
              כל ספר פותח את הליבה הפנימית של התנ״ך ומביא אותה מתוך בית המדרש אל כלל הציבור.
            </p>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="premium-card text-center relative overflow-hidden">
                <div className="text-accent mb-4 flex justify-center">
                  <BookOpen className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">מגילה אחת</h3>
                <p className="text-muted-foreground mb-4">עותק אחד לבית שלך</p>
                <div className="text-4xl font-bold text-foreground mb-1">₪70</div>
                <p className="text-sm text-muted-foreground mb-6">בלבד</p>
                <CtaButton tier="single" />
              </div>

              <div className="premium-card text-center relative overflow-hidden border-2 border-gold/40">
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-l from-gold to-gold-light text-navy-deep text-sm font-bold py-1">
                  <div className="flex items-center justify-center gap-1">
                    <Gift className="w-4 h-4" />
                    חוסכים ₪20!
                  </div>
                </div>
                <div className="text-accent mb-4 flex justify-center pt-4">
                  <Users className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">2 מגילות</h3>
                <p className="text-muted-foreground mb-4">אחד לך ואחד ׳משלוח מנות׳ למישהו קרוב</p>
                <div className="text-4xl font-bold text-foreground mb-1">₪120</div>
                <p className="text-sm text-muted-foreground mb-6">במקום ₪140</p>
                <CtaButton tier="double" />
              </div>

              <div className="premium-card text-center relative overflow-hidden border-2 border-accent/40">
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-l from-accent to-primary text-cream text-sm font-bold py-1">
                  <div className="flex items-center justify-center gap-1">
                    <Library className="w-4 h-4" />
                    כל הסדרה!
                  </div>
                </div>
                <div className="flex justify-center pt-4 mb-4">
                  <img src={bookSet} alt="סדרת ספרי מכלל יופי" className="w-full max-w-[200px] h-auto rounded-lg" loading="lazy" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">סדרת מכלל יופי</h3>
                <p className="text-muted-foreground text-sm mb-4">חמש מגילות + שופטים</p>
                <div className="text-4xl font-bold text-foreground mb-1">₪350</div>
                <p className="text-sm text-muted-foreground mb-6">במקום ₪420</p>
                <CtaButton tier="set" />
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection>
        <section className="section-premium bg-background">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
              בזכות שיטת <span className="gradient-text">"מכלל יופי"</span>
            </h2>
            <p className="text-muted-foreground mb-12 text-lg">שזיקקה עשרות פירושים למהלך אחד בהיר ורציף, תזכה השנה:</p>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: <Target className="w-7 h-7" />, title: "רלוונטיות לימינו", desc: "הבנה מעמיקה איך מתמודדים (ומנצחים!) כשגזירה עומדת נגד כל עם ישראל." },
                { icon: <Star className="w-7 h-7" />, title: "גאווה לאומית", desc: "מבט חדש על עוצמתו של העם היהודי, שמשנה את כל קריאת המגילה שלך." },
                { icon: <BookOpen className="w-7 h-7" />, title: "בהירות ורהיטות", desc: "חווית לימוד שוטפת, ללא הפרעות, שמאירה את התמונה הגדולה של הגאולה." },
              ].map((item, i) => (
                <div key={i} className="premium-card text-center">
                  <div className="text-primary mb-4 flex justify-center">{item.icon}</div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <CtaButton />
            </div>
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection animation="fade-in">
        <section className="relative py-24 md:py-32 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-navy-deep via-navy to-navy-deep" />
          <div className="absolute top-10 left-20 w-80 h-80 bg-gold/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-10 right-20 w-60 h-60 bg-crimson/10 rounded-full blur-[80px]" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-cream mb-4">בפורים הזה – תקרא את המגילה אחרת</h2>
            <p className="text-cream/70 text-lg mb-10">הצטרפו למאות לומדים שכבר גילו את העומק שמאחורי הסיפור.</p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <CtaButton large className="text-xl" />
              <SampleButton light />
            </div>

            <div className="flex items-center justify-center gap-6 mt-8 text-cream/50 text-sm">
              <span>📦 משלוח מהיר</span>
              <span>•</span>
              <span>🔒 רכישה מאובטחת</span>
            </div>
          </div>
        </section>
      </AnimatedSection>

      <section className="py-12 bg-gradient-to-l from-gold via-crimson to-gold text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-cream drop-shadow-lg">🎭 פורים שמח! 🎭</h2>
      </section>

      <footer className="py-6 bg-navy-deep text-center">
        <p className="text-cream/50 text-sm">
          נבנה ב♥ ע״י{" "}
          <a href="https://wa.me/972527203221" target="_blank" rel="noopener noreferrer" className="underline hover:text-gold transition-colors">
            סער חלק
          </a>
        </p>
        <p className="text-cream/30 text-xs mt-2">© {new Date().getFullYear()} בני ציון</p>
      </footer>
    </div>
  );
};

export default MegilatEsther;
