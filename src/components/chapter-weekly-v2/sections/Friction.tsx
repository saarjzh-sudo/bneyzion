import { ArrowLeft, Check } from "lucide-react";

import { FRICTION } from "../data";

/**
 * ״זה לא שלא ניסית״ — הכאב, בצורת פנקס חשבון: מה נתקע מול מה שנפתר.
 * הגרסה הקודמת פרסה את זה כארבעה כרטיסים זהים; כאן זו שורה אחת לכל מכשול,
 * כך שהעין קוראת את הזוג ולא את הרשימה.
 */
const Friction = () => (
  <section
    className="py-20 md:py-28 px-4"
    style={{ background: "linear-gradient(180deg, #2A1B0E 0%, #3A2617 50%, #2A1B0E 100%)" }}
  >
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-5xl font-bold text-cream mb-5 leading-tight">
          זה לא שלא ניסית
        </h2>
        <p className="text-lg text-cream/70 max-w-xl mx-auto leading-relaxed">
          כמעט כל מי שמצטרף מספר את אותו סיפור. לא חסר רצון — חסרה דרך שמחזיקה יותר משבועיים.
        </p>
      </div>

      <ul className="space-y-3">
        {FRICTION.map((row) => (
          <li
            key={row.stuck}
            className="grid md:grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-6 rounded-xl border border-white/10 bg-white/[0.035] p-5 md:p-6 transition-colors hover:border-gold/25"
          >
            <p className="text-cream/60 leading-relaxed">{row.stuck}</p>

            <ArrowLeft
              className="hidden md:block w-5 h-5 text-gold/60 flex-shrink-0"
              aria-hidden="true"
            />

            <p className="flex items-start gap-2.5 text-cream font-medium leading-relaxed">
              <Check className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{row.fix}</span>
            </p>
          </li>
        ))}
      </ul>

      <p className="text-center text-xl md:text-2xl font-semibold text-gold mt-14 leading-relaxed">
        לתנ״ך יש סדר פנימי, הגיון ומבנה.
        <br className="hidden md:block" />
        <span className="text-cream"> כדי להגיע אליהם צריך ליווי, לא עוד ניסיון.</span>
      </p>
    </div>
  </section>
);

export default Friction;
