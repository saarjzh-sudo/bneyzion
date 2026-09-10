import { ChevronDown } from "lucide-react";

import jerusalemWalls from "@/assets/jerusalem-walls.webp";
import { Cta, PriceLine } from "../Cta";
import { BOOKS, SEASON, STATS } from "../data";
import { useEarlyBird } from "../useEarlyBird";

/**
 * הירו קולנועי: תמונת רקע בתנועה איטית, כותרת אחת גדולה, כפתור אחד.
 * בניגוד לגרסה הקודמת — אין כאן שלושה בלוקים של טקסט מכירתי מעל הקפל.
 */
const Hero = () => {
  const earlyBird = useEarlyBird();

  return (
  <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="cw2-kenburns absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${jerusalemWalls})` }}
        role="presentation"
      />
    </div>

    {/* התחתית נסגרת אל הנייבי של סקשן המסלול, ולא אל הקרם של הרקע —
        אחרת נוצר פס בהיר שבולע את שורת המספרים. */}
    {/* ⚠️ אטימות בטיילווינד חייבת להיות כפולה של 5. ‎/88 או ‎/92 נזרקים בשקט
        והשכבה נעלמת — מה שהשאיר את הכותרת על שמיים בהירים. */}
    <div className="absolute inset-0 bg-gradient-to-b from-[#0B1220]/85 via-[#0B1220]/70 to-[#131C30]" />
    {/* בריכת צל רכה מתחת לעמודת הטקסט. ויניאטה רגילה מחשיכה דווקא את
        השוליים ומשאירה את הכותרת על השמיים הבהירים. */}
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 90% 70% at 50% 45%, rgba(4,8,16,0.45) 0%, rgba(4,8,16,0.18) 60%, transparent 85%)",
      }}
    />

    <div className="relative z-10 w-full max-w-5xl mx-auto text-center px-4 py-20 md:py-28">
      <div
        className="inline-flex items-center gap-2.5 bg-black/40 backdrop-blur-sm px-5 py-2 rounded-full border border-gold/40 mb-8 animate-fade-up"
        style={{ animationDelay: "0.05s" }}
      >
        <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" aria-hidden="true" />
        <span className="text-sm font-medium text-cream tracking-wide">
          {earlyBird.open ? (
            <>
              הרשמה מוקדמת · {earlyBird.label} · שנת {SEASON.hebrewYear}
            </>
          ) : (
            <>תנועת בני ציון · הפרק השבועי · {SEASON.hebrewYear}</>
          )}
        </span>
      </div>

      <h1
        className="text-4xl md:text-6xl lg:text-7xl font-bold text-cream mb-7 leading-[1.15] animate-fade-up"
        style={{ animationDelay: "0.1s" }}
      >
        השנה מתחילים
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#E8D5A0] via-[#C4A265] to-[#E8D5A0]">
          את הנביאים
        </span>
      </h1>

      <p
        className="text-lg md:text-2xl text-cream/90 max-w-2xl mx-auto mb-4 leading-relaxed animate-fade-up"
        style={{ animationDelay: "0.15s" }}
      >
        {BOOKS.map((b) => b.name).join(" ו")} — {SEASON.totalWeeks} שבועות, פרק בכל שבוע,
        עם שיעור חי וקבוצה שלומדת יחד.
      </p>

      <p
        className="text-base md:text-lg text-cream/70 max-w-xl mx-auto mb-10 animate-fade-up"
        style={{ animationDelay: "0.2s" }}
      >
        הלימוד נפתח {SEASON.startDateLabel}, מיד אחרי החגים.
      </p>

      <div className="animate-fade-up" style={{ animationDelay: "0.28s" }}>
        <Cta tone="gold" size="lg" />
        <PriceLine />
      </div>

      <dl
        className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-7 max-w-3xl mx-auto mt-16 animate-fade-up"
        style={{ animationDelay: "0.4s" }}
      >
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <dt className="sr-only">{s.label}</dt>
            <dd>
              <span className="block text-3xl md:text-4xl font-bold text-gold leading-none">
                {s.value}
              </span>
              <span className="block text-xs md:text-sm text-cream/70 mt-2 leading-snug px-1">
                {s.label}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>

    <a
      href="#המסלול"
      aria-label="לגלול אל מסלול השנה"
      className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 text-cream/70 hover:text-gold transition-colors"
    >
      <ChevronDown className="cw2-nudge w-7 h-7" aria-hidden="true" />
    </a>
  </section>
  );
};

export default Hero;
