import { Quote } from "lucide-react";

import { ART } from "../art";
import { TESTIMONIALS, type Testimonial } from "../data";

/**
 * קולות הלומדים.
 *
 * 10.9 סבב ג׳ — שלוש הערות של סער תוקנו כאן:
 *  1. הכותרת "מה קורה אחרי שנה של קביעות" לא נכונה — יש לומדים שלמדו פחות משנה.
 *     במקומה: "איך זה נראה מבפנים".
 *  2. **הרצועה הנעה ירדה במובייל.** היא זזה לצדדים, הותירה מסך חצי ריק ולא הייתה
 *     בשליטת המשתמש. במובייל: שלושה ציטוטים סטטיים ותו לא. הרצועה נשארת מ-md ומעלה,
 *     שם יש רוחב שמצדיק אותה.
 *  3. נוספה תמונה של לומד מול הזום עם התנ״ך פתוח — סער ביקש המחשה, לא רק טקסט.
 */

const featured = TESTIMONIALS.filter((t) => t.featured);
const rest = TESTIMONIALS.filter((t) => !t.featured);
const rowA = rest.slice(0, Math.ceil(rest.length / 2));
const rowB = rest.slice(Math.ceil(rest.length / 2));

function MiniCard({ t }: { t: Testimonial }) {
  return (
    <figure className="w-[290px] md:w-[340px] flex-shrink-0 rounded-xl border border-border/60 bg-card p-5 shadow-sm">
      <blockquote className="text-sm text-foreground/75 leading-relaxed mb-4">{t.text}</blockquote>
      <figcaption className="flex items-center justify-between gap-2">
        <span className="font-bold text-foreground text-sm">{t.name}</span>
        {t.role && <span className="text-xs text-primary">{t.role}</span>}
      </figcaption>
    </figure>
  );
}

function Marquee({ items, reverse }: { items: Testimonial[]; reverse?: boolean }) {
  return (
    <div className="cw2-marquee-viewport overflow-hidden py-2">
      <div className={`cw2-marquee ${reverse ? "cw2-marquee--reverse" : ""}`}>
        {[...items, ...items].map((t, i) => (
          <MiniCard key={`${t.name}-${i}`} t={t} />
        ))}
      </div>
    </div>
  );
}

const Voices = () => (
  <section className="py-20 md:py-28 bg-gradient-to-b from-cream-warm to-background overflow-hidden">
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-12">
        <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-5">
          {TESTIMONIALS.length} לומדים כתבו לנו
        </span>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground">איך זה נראה מבפנים</h2>
      </div>

      <figure className="relative rounded-2xl overflow-hidden mb-12 shadow-[0_24px_60px_-28px_rgba(13,31,53,0.55)]">
        <img
          src={ART.photoLearning}
          alt="לומד/ת מול שיעור הזום, עם התנ״ך פתוח על השולחן"
          className="w-full h-56 md:h-80 object-cover"
          loading="lazy"
          decoding="async"
          width={1600}
          height={893}
        />
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0C2039]/85 to-transparent p-5 md:p-7 text-cream text-sm md:text-lg font-medium">
          כל יום רביעי בערב, שעה אחת, מהבית.
        </figcaption>
      </figure>

      <div className="grid md:grid-cols-3 gap-5">
        {featured.map((t) => (
          <figure
            key={t.name}
            className="relative rounded-2xl border border-primary/20 bg-card p-7 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
          >
            <Quote className="absolute top-5 left-5 w-9 h-9 text-primary/15" aria-hidden="true" />
            <blockquote className="relative text-foreground/80 leading-relaxed mb-6">
              {t.text}
            </blockquote>
            <figcaption className="flex items-center gap-3">
              <span
                className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold flex items-center justify-center"
                aria-hidden="true"
              >
                {t.name.charAt(0)}
              </span>
              <span>
                <span className="block font-bold text-foreground">{t.name}</span>
                {t.role && <span className="block text-xs text-primary">{t.role}</span>}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>

    {/* הרצועה הנעה — דסקטופ בלבד. במובייל היא הייתה מבלבלת יותר ממה שתרמה. */}
    <div className="hidden md:block space-y-3 mt-14">
      <Marquee items={rowA} />
      <Marquee items={rowB} reverse />
    </div>
  </section>
);

export default Voices;
