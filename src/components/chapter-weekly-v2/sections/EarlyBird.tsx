import { BookMarked, CalendarClock, Check } from "lucide-react";

import { Cta, PriceLine } from "../Cta";
import { EARLY_BIRD, SEASON } from "../data";
import { useEarlyBird } from "../useEarlyBird";

/**
 * ההרשמה המוקדמת — רצה עד יום פתיחת הלימוד ואז נעלמת מהדף לבד.
 *
 * הדחיפות כאן אמיתית ולא מומצאת: יש תאריך שבו כולם פותחים את פרק א׳,
 * ומי שנרשם לפניו מתחיל את השנה מההתחלה ולא באמצע.
 */
const EarlyBird = () => {
  const { open, daysLeft, label } = useEarlyBird();

  if (!open) return null;

  return (
    <section
      className="relative py-20 md:py-28 px-4 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #F7F1E6 0%, #FAF6F0 100%)" }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border-2 border-[#C4A265]/45 bg-card shadow-xl overflow-hidden">
          {/* פס הכותרת עם הספירה */}
          <div
            className="px-6 py-5 md:px-10 md:py-6 flex flex-wrap items-center justify-between gap-4"
            style={{ background: "linear-gradient(135deg, #8B6F47, #C4A265)" }}
          >
            <div className="flex items-center gap-3">
              <CalendarClock className="w-6 h-6 text-[#241708]" aria-hidden="true" />
              <p className="text-[#241708] font-bold text-lg md:text-xl">הרשמה מוקדמת</p>
            </div>

            <p className="text-[#241708] font-semibold text-sm md:text-base">
              {daysLeft > 2 ? (
                <>
                  {/* me = margin-inline-end = צד שמאל ב-RTL, כלומר הרווח שבין
                      המספר לבין המילה שאחריו. ms היה שם אותו בצד הלא נכון. */}
                  <span className="text-2xl md:text-3xl font-bold align-middle me-1.5">
                    {daysLeft}
                  </span>
                  ימים שנותרו
                </>
              ) : (
                <span className="text-lg md:text-xl font-bold">{label}</span>
              )}
            </p>
          </div>

          <div className="p-6 md:p-10">
            <p className="text-lg md:text-xl text-foreground leading-relaxed mb-8">
              הלימוד נפתח <span className="font-bold">{EARLY_BIRD.deadlineLabel}</span>, ועד אז
              ההרשמה פתוחה כהרשמה מוקדמת. מי שנרשם עכשיו לא מחכה לתאריך —
              הוא מתחיל ללמוד היום, ומגיע ליהושע א׳ כשכולם פותחים אותו.
            </p>

            <ul className="space-y-5 mb-8">
              {EARLY_BIRD.benefits.map((b) => (
                <li key={b.title} className="flex items-start gap-3.5">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5"
                    aria-hidden="true"
                  >
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </span>
                  <span>
                    <span className="block font-bold text-foreground mb-1">{b.title}</span>
                    <span className="block text-foreground/75 leading-relaxed">{b.body}</span>
                  </span>
                </li>
              ))}
            </ul>

            {EARLY_BIRD.gift.show && (
              <div className="rounded-xl border border-[#C4A265]/40 bg-[#FBF7EF] p-5 md:p-6 mb-8">
                <div className="flex items-start gap-3.5">
                  <BookMarked
                    className="w-6 h-6 text-[#8B6F47] flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-bold text-foreground mb-1.5">{EARLY_BIRD.gift.title}</p>
                    <p className="text-foreground/75 leading-relaxed mb-3">
                      {EARLY_BIRD.gift.body}
                    </p>
                    <p className="text-sm text-foreground/60">
                      המתנה למצטרפים בהרשמה המוקדמת בלבד, עד {EARLY_BIRD.deadlineLabel}.
                      איסוף עצמי מנקודות האיסוף: {EARLY_BIRD.gift.pickup}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <Cta tone="gold">נרשמים בהרשמה המוקדמת</Cta>
              <PriceLine muted />
              <p className="text-xs text-foreground/55 mt-3">
                אחרי {EARLY_BIRD.deadlineLabel} נסגרת ההרשמה המוקדמת, וההצטרפות ממשיכה
                כרגיל — מהפרק שנמצא באותו שבוע בלימוד.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-foreground/55 mt-6">
          שנת {SEASON.hebrewYear} · {SEASON.totalWeeks} שבועות · יהושע ושופטים
        </p>
      </div>
    </section>
  );
};

export default EarlyBird;
