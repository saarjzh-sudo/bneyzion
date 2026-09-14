import { AudioLines, Headphones, MessageCircle, NotebookPen, Video } from "lucide-react";

import { ART } from "../art";
import { SEASON, WEEKLY_RHYTHM } from "../data";

/**
 * שבוע אחד בתכנית — ציר אופקי במקום ארבעה כרטיסים זהים.
 * מאחד את שני הסקשנים שהיו קודם נפרדים ("איך זה עובד בפועל" + "מה תקבל כל שבוע").
 */

// יואב 13.9: "אין מאמר העמקה" (ירד) · "יש הקלטת העמקה שבועית של הרב עמנואל בן ארצי"
// (נוסף) · "סיכום בהיר וערוך שעולה אחרי השיעור".
const INCLUDED = [
  { Icon: Video, label: "שיעור זום חי + הקלטה" },
  { Icon: NotebookPen, label: "סיכום בהיר וערוך אחרי השיעור" },
  { Icon: AudioLines, label: "הקלטת העמקה שבועית של הרב עמנואל בן ארצי" },
  { Icon: Headphones, label: "ביאור פסוק־פסוק להאזנה" },
  { Icon: MessageCircle, label: "קבוצת הלומדים" },
] as const;

const WeeklyRhythm = () => (
  <section className="py-20 md:py-28 px-4 bg-background">
    <div className="max-w-6xl mx-auto">
      {/* רצועת נוף — 10.9 סבב ב׳: הוחלף מאקוורל לצילום, בשפה הבהירה של הפלייר.
          רצועה נמוכה שנסגרת אל רקע הסקשן, כדי שלא תתחרה בציר השבוע שמתחתיה. */}
      <figure className="relative rounded-2xl overflow-hidden mb-12 md:mb-14">
        <img
          src={ART.photoOlive}
          alt="חורשת זיתים באור בוקר בהרי ירושלים"
          className="w-full h-44 md:h-60 object-cover object-center"
          loading="lazy"
          decoding="async"
          width={1376}
          height={768}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
      </figure>

      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
          איך נראה <span className="text-primary">שבוע בתכנית</span>
        </h2>
        <p className="text-lg text-foreground/70 max-w-xl mx-auto">
          פרק אחד, מיום {SEASON.weekOpensDay} ועד השיעור החי. בלי מרדף ובלי פערים לסגור.
        </p>
      </div>

      {/* ציר השבוע */}
      <ol className="relative grid md:grid-cols-4 gap-8 md:gap-5">
        <span
          className="hidden md:block absolute top-[22px] right-[12%] left-[12%] h-px bg-gradient-to-l from-transparent via-primary/30 to-transparent"
          aria-hidden="true"
        />

        {WEEKLY_RHYTHM.map((step, i) => (
          <li key={step.title} className="relative text-right">
            <div className="flex md:block items-center gap-3">
              <span className="relative z-10 flex-shrink-0 w-11 h-11 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shadow-lg">
                {i + 1}
              </span>
              <p className="text-sm font-bold text-accent md:mt-5">{step.when}</p>
            </div>
            <h3 className="text-xl font-bold text-foreground mt-2 mb-2">{step.title}</h3>
            <p className="text-foreground/70 leading-relaxed text-sm md:text-base">
              {step.body}
            </p>
          </li>
        ))}
      </ol>

      {/* מה כלול */}
      <div className="mt-16 rounded-2xl border border-border/60 bg-cream-warm/60 p-7 md:p-9">
        <h3 className="text-center text-sm font-bold text-foreground/60 tracking-wide mb-7">
          כל זה כלול במנוי החודשי
        </h3>
        <ul className="flex flex-wrap justify-center gap-3">
          {INCLUDED.map(({ Icon, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-2.5 bg-card border border-border/60 rounded-full ps-4 pe-5 py-2.5 shadow-sm"
            >
              <Icon className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </li>
          ))}
        </ul>
        <p className="text-center text-xs text-foreground/55 mt-6">
          השיעור החי מתקיים כל יום {SEASON.liveLessonDay} בשעה {SEASON.liveLessonTime}.
          ההקלטה והסיכום עולים אחרי השיעור.
        </p>
      </div>
    </div>
  </section>
);

export default WeeklyRhythm;
