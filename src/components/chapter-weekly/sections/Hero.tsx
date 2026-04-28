import { ArrowLeft } from "lucide-react";
import jerusalemWalls from "@/assets/jerusalem-walls.jpg";
import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";

const Hero = () => (
  <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
    <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${jerusalemWalls})` }} />
    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-background" />

    <div className="relative z-10 max-w-4xl mx-auto text-center px-4 py-16 md:py-24">
      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-sm px-4 py-2 rounded-full border border-primary/30 mb-8 animate-fade-up">
        <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cream">מבצע הצטרפות מיוחד – 5 ש״ח בלבד!</span>
      </div>

      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-cream mb-8 leading-tight animate-fade-up" style={{ animationDelay: "0.1s" }}>
        איך יכול להיות…
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary via-teal-400 to-primary">שאני כמעט לא מכיר את התנ״ך?</span>
      </h1>

      <p className="text-lg md:text-xl lg:text-2xl text-cream/90 max-w-3xl mx-auto mb-12 leading-relaxed animate-fade-up" style={{ animationDelay: "0.2s" }}>
        אני שומר מצוות, לומד תורה, מבין גם גמרא והלכה –
        <br className="hidden md:block" />
        אבל אם תשאל אותי על ספר עזרא, חגי או יחזקאל… <span className="text-gold font-semibold">אני מגמגם.</span>
        <br />
        <br />
        <span className="text-cream/80">לא כי זה לא חשוב לי – פשוט כי אף אחד לא הראה לי איך לגעת בזה באמת.</span>
      </p>

      <SubscribeButton>
      <button type="button" className="inline-flex items-center gap-2 md:gap-3 bg-gradient-to-l from-primary via-primary to-teal-600 text-white px-6 py-3 md:px-10 md:py-5 rounded-xl font-bold text-base md:text-xl transition-all duration-300 hover:shadow-xl hover:scale-105 animate-fade-up"
 style={{ animationDelay: "0.3s" }}>
        אשמח להצטרף עכשיו
        <ArrowLeft className="w-5 h-5" />
      </button>
    </SubscribeButton>

      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-12 text-sm animate-fade-up" style={{ animationDelay: "0.4s" }}>
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-gold/30">
          <span className="text-gold font-bold">✓</span>
          <span className="text-cream font-medium">ללא התחייבות</span>
        </div>
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-gold/30">
          <span className="text-gold font-bold">✓</span>
          <span className="text-cream font-medium">החזר כספי מלא</span>
        </div>
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-gold/30">
          <span className="text-gold font-bold">✓</span>
          <span className="text-cream font-medium">250+ לומדים פעילים</span>
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
