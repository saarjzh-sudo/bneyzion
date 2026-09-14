import { useEffect, useState } from "react";

// גרסאות חתוכות של הלוגואים. המקוריים עטופים ב-80% שוליים שקופים,
// ולכן נראים זעירים בהדר. החיתוך נעשה פעם אחת ונשמר כנכס נפרד.
import logoBneyZion from "@/assets/cw2-logo-bneyzion.png";
import logoLivotTanach from "@/assets/cw2-logo-livot-tanach.png";

/**
 * הדר שקוף מעל ההירו, שנעשה אטום ברגע שמתחילים לגלול.
 * כפתור ההצטרפות לא יושב כאן בכוונה — הוא מרוכז בפס התחתון (Dock),
 * כדי שלא יהיו שני כפתורים מתחרים על אותו מסך.
 */
const TopNav = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "cw2-dock bg-[#0E1526]/90 border-b border-gold/20 py-2"
          : "cw2-dock bg-[#0E1526]/45 border-b border-white/10 py-3"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <a
          href="/"
          className="flex items-center gap-3 md:gap-5 min-w-0"
          aria-label="לדף הבית של בני ציון"
        >
          <img
            src={logoBneyZion}
            alt="תנועת בני ציון"
            className={`w-auto transition-all duration-300 ${scrolled ? "h-6 md:h-7" : "h-6 md:h-10"}`}
          />
          <span
            className={`w-px transition-all duration-300 ${scrolled ? "bg-cream/25" : "bg-cream/30"} ${
              scrolled ? "h-6" : "h-8 md:h-10"
            }`}
            aria-hidden="true"
          />
          <img
            src={logoLivotTanach}
            alt="לחיות תנ״ך — הפרק השבועי"
            className={`w-auto transition-all duration-300 ${scrolled ? "h-7 md:h-8" : "h-8 md:h-12"}`}
          />
        </a>

        <nav className={`hidden md:flex items-center gap-7 text-sm ${scrolled ? "text-cream/80" : "text-cream/90"}`}>
          <a href="#ההטבה" className="hover:text-gold transition-colors">
            ההטבה
          </a>
          <a href="#המסלול" className="hover:text-gold transition-colors">
            מסלול השנה
          </a>
        </nav>
      </div>
    </header>
  );
};

export default TopNav;
