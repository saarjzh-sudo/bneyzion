import { ArrowLeft } from "lucide-react";
import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";

const ProgramIntro = () => (
  <section className="py-20 md:py-28 px-4 bg-primary text-primary-foreground relative overflow-hidden">
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/30 to-transparent" />
    </div>

    <div className="max-w-4xl mx-auto text-center relative z-10">
      <p className="text-lg md:text-xl text-primary-foreground/80 font-medium mb-6">תנועת בני ציון גאה להציג</p>

      <div className="max-w-2xl mx-auto mb-10 rounded-2xl overflow-hidden shadow-2xl border-4 border-accent/30">
        <div className="aspect-video">
          <iframe
            src="https://drive.google.com/file/d/1ZGxVeFaCkw7oLm__2ugXLDMhGgQQCE2e/preview"
            width="100%"
            height="100%"
            allow="autoplay"
            className="w-full h-full"
            title="המלצות על התכנית"
          />
        </div>
      </div>

      <div className="relative inline-block mb-8">
        <div className="absolute inset-0 bg-white/40 blur-2xl rounded-full scale-110" />
        <img src="/lovable-uploads/logo-livot-tanach.png" alt="לוגו לחיות תנ״ך - הפרק השבועי" className="relative h-56 md:h-80 mx-auto filter drop-shadow-2xl" />
      </div>

      <p className="text-lg md:text-xl mb-6 leading-relaxed max-w-3xl mx-auto text-primary-foreground/90">
        הדרך שתעזור לך להיכנס בשערי התנ"ך,
        <br />
        ולגלות עולם שתמיד היה חסר לך.
      </p>

      <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-10 text-base md:text-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-accent rounded-full" />
          <span>פגישה חיה עם הפסוקים</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-accent rounded-full" />
          <span>קצב מותאם לחיים</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-accent rounded-full" />
          <span>מפגש זום שבועי</span>
        </div>
      </div>

      <SubscribeButton>
      <button type="button" className="inline-flex items-center gap-2 md:gap-3 bg-accent text-accent-foreground px-6 py-3 md:px-10 md:py-5 rounded-xl font-bold text-base md:text-xl transition-all duration-300 hover:shadow-gold hover:scale-105">
        אני רוצה להצטרף
        <ArrowLeft className="w-5 h-5" />
      </button>
    </SubscribeButton>
    </div>
  </section>
);

export default ProgramIntro;
