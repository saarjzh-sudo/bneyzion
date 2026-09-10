import { Check, ShieldCheck } from "lucide-react";

import { Cta } from "../Cta";
import { EARLY_BIRD, PRICE, SEASON } from "../data";
import { useEarlyBird } from "../useEarlyBird";

/**
 * מחיר. כרטיס אחד, בלי טיימרים ובלי ״מבצע״ מהבהב — המספרים נקראים מ-data.ts,
 * כך שהכרעת עליית המחיר (אם תתקבל) משנה קובץ אחד ולא שבעה מופעים בדף.
 */

const INCLUDED = [
  "כל השיעורים והתכנים של השנה",
  "שיעור זום חי בכל שבוע, והקלטה למחרת",
  "גישה לכל הפרקים והספרים שכבר נלמדו",
  "קבוצת הלומדים",
] as const;

const Pricing = () => {
  const earlyBird = useEarlyBird();

  return (
  <section id="מחיר" className="py-20 md:py-28 px-4 bg-cream-warm scroll-mt-20">
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">כמה זה עולה</h2>
        <p className="text-lg text-foreground/70">
          בלי התחייבות. אפשר להצטרף לחודש אחד ולהחליט משם.
        </p>
      </div>

      <div className="rounded-2xl bg-card border border-border/60 shadow-xl overflow-hidden">
        <div className="bg-primary text-primary-foreground text-center py-3.5">
          <p className="font-semibold text-sm tracking-wide">
            מנוי הפרק השבועי · {SEASON.hebrewYear}
          </p>
        </div>

        <div className="p-8 md:p-10 text-center">
          <div className="flex items-baseline justify-center gap-2 mb-1">
            <span className="text-6xl md:text-7xl font-bold text-primary leading-none">
              {PRICE.firstMonth}
            </span>
            <span className="text-2xl font-semibold text-foreground">{PRICE.currency}</span>
          </div>
          <p className="text-foreground font-medium">לחודש הראשון</p>
          <p className="text-sm text-foreground/65 mt-1.5">
            ואחר כך {PRICE.monthly} {PRICE.currency} לחודש
          </p>

          <ul className="text-right space-y-3 my-9">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Check
                  className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span className="text-foreground">{item}</span>
              </li>
            ))}
          </ul>

          <Cta tone="teal" size="md">
            אני מצטרף
          </Cta>
        </div>

        <div className="border-t border-border/60 bg-primary/5 px-8 py-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-foreground/80 leading-relaxed">
              <span className="font-bold text-foreground">ביטול בכל עת.</span> בלי שאלות ובלי
              אותיות קטנות. מפסיקים מתי שרוצים.
            </p>
          </div>
        </div>
      </div>

      {earlyBird.open && (
        <p className="text-center text-sm text-foreground/70 mt-7">
          <span className="font-semibold text-foreground">
            ההרשמה המוקדמת פתוחה עד {EARLY_BIRD.deadlineLabel}
          </span>{" "}
          · {earlyBird.label}
        </p>
      )}

      <p className="text-center text-sm text-foreground/60 mt-3">
        התכנית פתוחה לנשים ולגברים.
      </p>
    </div>
  </section>
  );
};

export default Pricing;
