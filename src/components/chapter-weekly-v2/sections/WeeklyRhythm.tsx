import { FileText, Headphones, MessageCircle, NotebookPen, Video } from "lucide-react";

import { SEASON, WEEKLY_RHYTHM } from "../data";

/**
 * שבוע אחד בתכנית — ציר אופקי במקום ארבעה כרטיסים זהים.
 * מאחד את שני הסקשנים שהיו קודם נפרדים ("איך זה עובד בפועל" + "מה תקבל כל שבוע").
 */

const INCLUDED = [
  { Icon: FileText, label: "מאמר העמקה שבועי" },
  { Icon: Video, label: "שיעור זום חי + הקלטה" },
  { Icon: Headphones, label: "ביאור פסוק־פסוק להאזנה" },
  { Icon: NotebookPen, label: "סיכום כתוב מסודר" },
  { Icon: MessageCircle, label: "קבוצת הלומדים" },
] as const;

const WeeklyRhythm = () => (
  <section className="py-20 md:py-28 px-4 bg-background">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
          איך נראה <span className="text-primary">שבוע אחד</span>
        </h2>
        <p className="text-lg text-foreground/70 max-w-xl mx-auto">
          פרק אחד, מהתחלה ועד הסוף. בלי מרדף, בלי פערים לסגור.
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
          כל זה כלול במנוי
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
          ההקלטה עולה למחרת.
        </p>
      </div>
    </div>
  </section>
);

export default WeeklyRhythm;
