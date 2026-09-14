import { CalendarDays, Flag } from "lucide-react";

import { Cta } from "../Cta";
import { ART } from "../art";
import { BOOKS, MILESTONES, SEASON, WEEKS } from "../data";

/**
 * ההבטחה השנתית — מסלול 45 השבועות במבט אחד.
 *
 * זה הסקשן שלא היה קיים בגרסה הקודמת: במקום להבטיח ״לימוד מסודר״ במילים,
 * הדף מראה את כל השנה על ציר אחד, עם התחנות הידועות מראש.
 *
 * 14.9 — סבב הרב יואב (13.9):
 *  - הכותרת "שנה שלמה של נביאים, במבט אחד" → "תכנית שנתית של לימוד יהושע ושופטים"
 *    ("קצת מופשט מדי").
 *  - הציר: "לא כתוב על שום לבנה מה היא ומה התאריכים — יוצא סתמי מאד". עכשיו כל
 *    שבוע הוא כרטיס קטן: מספר השבוע, הספר והפרק, והתאריך העברי של יום שישי
 *    (השבוע נפתח בשישי — יואב). הכול מ-`WEEKS` ב-data.ts, מחושב ולא מוקלד.
 *  - התחנות: "לא ברור מה הם כל הפרקים" → כותרת "תחנות בדרך", שם מלא "יהושע פרק א׳",
 *    ושורה על מה שקורה בכל תחנה.
 */

const MILESTONE_WEEKS = new Set(MILESTONES.map((m) => m.week));

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
          תכנית שנתית של לימוד
          <br className="hidden md:block" /> יהושע ושופטים
        </h2>
        <p className="text-lg text-cream/75 max-w-2xl mx-auto leading-relaxed">
          {SEASON.totalWeeks} שבועות, פרק בשבוע, לפי לוח ידוע מראש. מי שמתחיל עכשיו יודע
          בדיוק לאן הוא הולך — ומתי מגיעים לשם.
        </p>
      </div>

      {/* שני הספרים — עם האיור של כל ספר (הערת סער 10.9: "צריך יותר המחשה") */}
      <div className="grid md:grid-cols-2 gap-5 mb-14">
        {BOOKS.map((book) => (
          <article
            key={book.name}
            className="group relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm overflow-hidden"
          >
            <div className="relative h-44 md:h-52 overflow-hidden">
              <img
                src={ART[book.art]}
                alt={`איור אקוורל לספר ${book.name}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
                decoding="async"
                width={1376}
                height={768}
              />
              {/* האיור נסגר אל הנייבי של הכרטיס כדי שהכותרת תשב על רקע אחיד */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E1526] via-[#0E1526]/45 to-transparent" />
              <span
                className="absolute bottom-0 right-0 left-0 h-1"
                style={{ background: book.accent }}
                aria-hidden="true"
              />
            </div>

            <div className="p-7">
              <div className="flex items-baseline gap-3 mb-3">
                <h3 className="text-2xl md:text-3xl font-bold text-cream">ספר {book.name}</h3>
                <span className="text-sm text-gold font-semibold">{book.chapters} פרקים</span>
              </div>
              <p className="text-cream/75 leading-relaxed mb-5">{book.blurb}</p>
              <p className="text-xs text-cream/50">
                שבועות {book.weekFrom}–{book.weekTo} · פרק אחד בכל שבוע
              </p>
            </div>
          </article>
        ))}
      </div>

      {/* ציר 45 השבועות — כל שבוע: מספר · ספר ופרק · תאריך עברי */}
      <div className="mb-4 flex items-center justify-between gap-4 px-1">
        <h3 className="text-sm font-semibold text-cream/80">
          {SEASON.totalWeeks} שבועות ברצף · הפרק נפתח בכל יום {SEASON.weekOpensDay}
        </h3>
        <p className="text-xs text-cream/45">גללו לאורך הציר ←</p>
      </div>

      <div className="cw2-rail overflow-x-auto pt-4 pb-4">
        <ol className="cw2-weeks" aria-label="מסלול השבועות של השנה — ספר, פרק ותאריך">
          {WEEKS.map((w) => {
            const milestone = MILESTONE_WEEKS.has(w.week);
            return (
              <li
                key={w.week}
                className={`cw2-week ${milestone ? "cw2-week--milestone" : ""}`}
                style={{ ["--accent" as string]: w.book.accent }}
              >
                <span className="cw2-week-bar" aria-hidden="true" />
                <span className="cw2-week-num">שבוע {w.week}</span>
                <span className="cw2-week-label">{w.label}</span>
                <span className="cw2-week-date">{w.dateHeb}</span>
                {milestone && <span className="cw2-week-dot" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      </div>

      <p className="text-xs text-cream/45 mt-1 px-1">
        התאריכים לפי יום שישי של כל שבוע, ברצף מלא. שבוע הפסקה סביב חג דוחה את מה שאחריו בשבוע.
      </p>

      {/* תחנות בדרך */}
      <div className="mt-12 mb-5 text-center">
        <h3 className="text-xl md:text-2xl font-bold text-cream">תחנות בדרך</h3>
        <p className="text-sm text-cream/60 mt-1">
          כמה מהרגעים הגדולים של השנה, מתוך {SEASON.totalWeeks} הפרקים
        </p>
      </div>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <p className="text-sm text-gold/85 mt-1.5">{m.note}</p>
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
