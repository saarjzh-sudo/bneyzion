import { ArrowLeft, Phone, Mail } from "lucide-react";
import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";

const FinalCTA = () => (
  <section className="py-20 md:py-28 px-4 bg-background">
    <div className="max-w-3xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
        מוכן להתחיל את <span className="text-primary">המסע שלך בתנ"ך</span>?
      </h2>

      <p className="text-lg md:text-xl text-foreground mb-8">
        <span className="text-primary font-semibold">לכבוד תחילת לימוד מגילת אסתר</span> – <span className="text-accent font-bold">רק 5 ש"ח לחודש הראשון!</span>
        <br />
        <span className="text-sm">ללא התחייבות • ביטול בכל עת</span>
      </p>

      <SubscribeButton>
      <button type="button" className="inline-flex items-center gap-2 md:gap-3 bg-accent text-accent-foreground px-6 py-3 md:px-10 md:py-5 rounded-xl font-bold text-base md:text-xl transition-all hover:shadow-gold hover:scale-105 mb-12">
        אני רוצה להצטרף במחיר מבצע!
        <ArrowLeft className="w-5 h-5" />
      </button>
    </SubscribeButton>

      <div className="flex flex-wrap justify-center gap-6 text-foreground mb-8">
        <a href="https://wa.me/972527203221" className="flex items-center gap-2 hover:text-primary transition-colors">
          <Phone className="w-4 h-4" /> 052-720-3221
        </a>
        <a href="mailto:office@bneyzion.co.il" className="flex items-center gap-2 hover:text-primary transition-colors">
          <Mail className="w-4 h-4" /> office@bneyzion.co.il
        </a>
      </div>

      <p className="text-xs text-muted-foreground mb-2">התכנית לעילוי נשמת מעין פלסר ז״ל • © 2025 בני ציון</p>
      <p className="text-xs text-muted-foreground">
        נבנה ב<span className="text-muted-foreground">♥</span> ע״י{" "}
        <a
          href="https://wa.me/972527203221"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors underline"
        >
          סער חלק
        </a>
      </p>
    </div>
  </section>
);

export default FinalCTA;
