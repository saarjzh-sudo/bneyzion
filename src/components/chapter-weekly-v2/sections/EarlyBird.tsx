import { BookMarked, CalendarClock } from "lucide-react";

import { Cta, PriceLine } from "../Cta";
import { ART } from "../art";
import { EARLY_BIRD, SEASON } from "../data";
import { useEarlyBird } from "../useEarlyBird";

/**
 * ההרשמה המוקדמת — נכתב מחדש 10.9 (סבב ג׳).
 *
 * סער: *"ההרשמה המוקדמת גם מוזרה וגם לא משכנעת. מה אכפת לי שהארכיון נפתח,
 * מה אכפת לי שכולם פותחים את הספר באותו זמן. מה שאכפת לי: בהרשמה המוקדמת
 * בלבד — וקבלו ספר מתנה. קיצור."*
 *
 * לכן: שתי ההטבות הישנות ירדו, הפסקה הארוכה ירדה, ומה שנשאר הוא כרטיס אחד —
 * ספר, תנאי, כפתור. הסקשן גם עלה בסדר הדף, לפני התיאור של הרב יואב.
 *
 * הרכיב מרנדר `null` מעצמו אחרי תאריך פתיחת הלימוד, בלי נגיעה בקוד.
 */
const EarlyBird = () => {
  const { open, daysLeft } = useEarlyBird();

  if (!open) return null;

  return (
    <section
      className="relative py-16 md:py-20 px-4"
      style={{ background: "linear-gradient(180deg, #F7F1E6 0%, #FAF6F0 100%)" }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border-2 border-[#C4A265]/45 bg-card shadow-xl overflow-hidden">
          <div
            className="px-6 py-4 md:px-9 md:py-5 flex flex-wrap items-center justify-between gap-3"
            style={{ background: "linear-gradient(135deg, #8B6F47, #C4A265)" }}
          >
            <p className="inline-flex items-center gap-3 text-[#241708] font-bold text-lg md:text-xl">
              <CalendarClock className="w-6 h-6" aria-hidden="true" />
              הרשמה מוקדמת
            </p>
            {daysLeft > 2 && (
              <p className="text-[#241708] font-semibold text-sm md:text-base">
                {/* me = margin-inline-end = הרווח שבין המספר למילה שאחריו ב-RTL */}
                <span className="text-2xl md:text-3xl font-bold align-middle me-1.5">
                  {daysLeft}
                </span>
                ימים אחרונים
              </p>
            )}
          </div>

          <div className="p-6 md:p-9 grid sm:grid-cols-[auto_1fr] gap-6 md:gap-8 items-center">
            <img
              src={ART.bookShoftim}
              alt="ספר שופטים מאת הרב יואב אוריאל, מהדורת 2025 — המתנה למצטרפים"
              className="w-36 sm:w-44 mx-auto drop-shadow-xl"
              loading="lazy"
              decoding="async"
              width={921}
              height={1438}
            />

            <div className="text-center sm:text-right">
              <p className="inline-flex items-center gap-2 text-2xl md:text-3xl font-black text-foreground">
                <BookMarked className="w-6 h-6 text-[#8B6F47]" aria-hidden="true" />
                {EARLY_BIRD.gift.title}
              </p>
              <p className="mt-3 text-lg text-foreground/75 leading-relaxed">
                {EARLY_BIRD.gift.body}
              </p>
              <p className="mt-2 text-base text-foreground/70 leading-relaxed">
                {EARLY_BIRD.gift.tryLine}
              </p>
              <p className="mt-3 text-sm text-foreground/55">
                {EARLY_BIRD.gift.terms} נקודות איסוף: {EARLY_BIRD.gift.pickup}.
              </p>

              <div className="mt-7">
                <Cta tone="gold" />
                <PriceLine muted />
                <p className="mt-3 text-xs text-foreground/55">
                  הלימוד נפתח {SEASON.startDateLabel} · שנת {SEASON.hebrewYear}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EarlyBird;
