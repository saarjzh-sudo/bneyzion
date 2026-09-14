import { useEffect, useState } from "react";

import { Cta } from "../Cta";
import { PRICE } from "../data";
import { useEarlyBird } from "../useEarlyBird";

/**
 * פס הצטרפות תחתון. מופיע אחרי שגוללים מעבר להירו ונעלם כשמגיעים לסקשן המחיר,
 * כדי שלא יסתיר את הכרטיס עצמו.
 *
 * זה מה שמחליף את שמונת הכפתורים הזהים שהיו פזורים בגרסה הקודמת:
 * כפתור אחד שתמיד בהישג יד, במקום חזרה שמאבדת משמעות.
 */
const Dock = () => {
  const [visible, setVisible] = useState(false);
  const earlyBird = useEarlyBird();

  useEffect(() => {
    const onScroll = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.9;

      const pricing = document.getElementById("מחיר");
      const atPricing = pricing
        ? pricing.getBoundingClientRect().top < window.innerHeight * 0.85
        : false;

      setVisible(pastHero && !atPricing);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`cw2-dock fixed bottom-0 inset-x-0 z-40 border-t border-gold/25 bg-[#0E1526]/95 transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      {/* pe-20 במובייל = מרווח לכפתור הצ'אט-בוט של האתר, שיושב ב-bottom-6 left-6
          עם z-[100] ואחרת נוחת בדיוק על כפתור ההצטרפות. */}
      <div className="max-w-5xl mx-auto ps-4 pe-20 md:pe-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          {/* שם התכנית רק מ-md ומעלה — במסך צר הוא נחתך ודוחק את הכפתור. */}
          <p className="hidden md:block text-cream font-semibold text-base leading-tight">
            {earlyBird.open ? (
              <>
                הרשמה מוקדמת · <span className="text-gold">{earlyBird.label}</span>
              </>
            ) : (
              <>הפרק השבועי — יהושע ושופטים</>
            )}
          </p>
          <p className="text-cream/70 text-xs md:text-sm md:mt-0.5 leading-snug">
            חודש ראשון {PRICE.firstMonth} {PRICE.currency} · אחר כך {PRICE.monthly}{" "}
            {PRICE.currency}
            <span className="hidden sm:inline"> · ביטול בכל עת</span>
          </p>
        </div>

        <div className="flex-shrink-0">
          <Cta tone="gold" size="md">
            הצטרפות
          </Cta>
        </div>
      </div>
    </div>
  );
};

export default Dock;
