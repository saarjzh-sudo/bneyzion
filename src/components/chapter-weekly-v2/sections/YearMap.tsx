import { CalendarDays, Flag } from "lucide-react";

import { Cta } from "../Cta";
import { BOOKS, MILESTONES, SEASON } from "../data";

/**
 * ההבטחה השנתית — מסלול 45 השבועות במבט אחד.
 *
 * זה הסקשן שלא היה קיים בגרסה הקודמת: במקום להבטיח ״לימוד מסודר״ במילים,
 * הדף מראה את כל השנה על ציר אחד, עם התחנות הידועות מראש.
 */

const WEEKS = Array.from({ length: SEASON.totalWeeks }, (_, i) => i + 1);
type Milestone = (typeof MILESTONES)[number];
const MILESTONE_BY_WEEK = new Map<number, Milestone>(MILESTONES.map((m) => [m.week, m]));

function bookForWeek(week: number) {
  return BOOKS.find((b) => week >= b.weekFrom && week <= b.weekTo) ?? BOOKS[0];
}

const YearMap = () => (
  <section
    id="המסלול"
    className="relative py-20 md:py-28 px-4 overflow-hidden scroll-mt-20"
    style={{ background: "linear-gradient(180deg, #131C30 0%, #0E1526 55%, #131C30 100%)" }}
  >
    <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
      <div className="absolute top-10 right-0 w-80 h-80 rounded-full blur-3xl bg-[#C4A265]" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl bg-[#2D7D7D]" />
    </div>

    <div className="relative z-10 max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-gold border border-gold/35 rounded-full px-4 py-1.5 mb-6">
          <CalendarDays className="w-4 h-4" aria-hidden="true" />
          מסלול {SEASON.hebrewYear}
        </span>
        <h2 className="text-3xl md:text-5xl font-bold text-cream mb-5 leading-tight">
          שנה שלמה של נביאים,
          <br className="hidden md:block" /> במבט אחד
        </h2>
        <p className="text-lg text-cream/75 max-w-2xl mx-auto leading-relaxed">
          מסלול אחד וברור, עם תחנות ידועות מראש. מי שמתחיל עכשיו יודע בדיוק לאן הוא הולך —
          ומתי מגיעים לשם.
        </p>
      </div>

      {/* שני הספרים */}
      <div className="grid md:grid-cols-2 gap-5 mb-14">
        {BOOKS.map((book) => (
          <article
            key={book.name}
            className="relative rounded-2xl p-7 border border-white/10 bg-white/[0.04] backdrop-blur-sm overflow-hidden"
          >
            <span
              className="absolute top-0 right-0 h-full w-1"
              style={{ background: book.accent }}
              aria-hidden="true"
            />
            <div className="flex items-baseline gap-3 mb-3">
              <h3 className="text-2xl md:text-3xl font-bold text-cream">ספר {book.name}</h3>
              <span className="text-sm text-gold font-semibold">{book.chapters} פרקים</span>
            </div>
            <p className="text-cream/75 leading-relaxed mb-5">{book.blurb}</p>
            <p className="text-xs text-cream/50">
              שבועות {book.weekFrom}–{book.weekTo}
            </p>
          </article>
        ))}
      </div>

      {/* ציר 45 השבועות */}
      <div className="mb-4 flex items-center justify-between gap-4 px-1">
        <h3 className="text-sm font-semibold text-cream/80">
          {SEASON.totalWeeks} שבועות ברצף
        </h3>
        <p className="text-xs text-cream/45">גללו לאורך הציר ←</p>
      </div>

      <div className="cw2-rail overflow-x-auto pt-3 pb-4">
        <ol
          className="flex items-end gap-1.5 min-w-max px-1"
          aria-label="מסלול השבועות של השנה"
        >
          {WEEKS.map((week) => {
            const book = bookForWeek(week);
            const milestone = MILESTONE_BY_WEEK.get(week);
            return (
              <li key={week} className="relative">
                <div
                  className={`w-[22px] md:w-[26px] rounded-[3px] transition-all duration-200 ${
                    milestone ? "h-14" : "h-8 opacity-50 hover:opacity-90"
                  }`}
                  style={{ background: book.accent }}
                  title={`שבוע ${week} · ספר ${book.name}`}
                />
                {milestone && (
                  <span
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gold ring-2 ring-[#0E1526]"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* תחנות הדרך */}
      <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-10">
        {MILESTONES.map((m) => (
          <li
            key={m.week}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-4 hover:border-gold/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Flag className="w-3.5 h-3.5 text-gold flex-shrink-0" aria-hidden="true" />
              <span className="text-cream font-bold">{m.title}</span>
            </div>
            <p className="text-xs text-cream/60">
              שבוע {m.week} · {m.date}
            </p>
            <p className="text-xs text-gold/80 mt-1">{m.note}</p>
          </li>
        ))}
      </ul>

      <div className="text-center mt-14">
        <Cta tone="gold">מצטרפים למסלול השנתי</Cta>
      </div>
    </div>
  </section>
);

export default YearMap;
