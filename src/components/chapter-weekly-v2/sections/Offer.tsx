import { Check, Gift } from "lucide-react";

import { Cta } from "../Cta";
import { ART } from "../art";
import { ANCHOR, EARLY_BIRD, PRICE, SEASON } from "../data";
import { useEarlyBird } from "../useEarlyBird";

/**
 * ההטבה — הסקשן המרכזי של הדף (הוראת סער, 10.9.2026):
 * "האזור של המחיר צריך להיות הרבה יותר רשמי וכיפי, וגם טיפה עיגון —
 *  הספר עולה כך וכך, התכנית 110 בחודש, ועכשיו אתה מקבל את הכל בחמישה שקל."
 *
 * העיגון בנוי משני מספרים אמיתיים בלבד:
 *  - מחיר הספר המודפס — מטבלת `products` בפרודקשן (ANCHOR.bookPrice).
 *  - מחיר החודש — `PRICE.monthly`, אותו מספר שכבר מוצג ב-`PriceLine`.
 * שום מספר כאן לא "לצורך ההמחשה".
 *
 * 14.9 — המסגור שונה לפי הרב יואב (13.9): *"זה כתוב כאילו ספר יהושע הוא חלק
 * מהרשימה עם חודש לימוד וזה לא נכון. המסגור: חודש התנסות ב-5 ש״ח + מתנה מאיתנו —
 * ספר בחינם. לא חבילה של שני דברים ב-5 ש״ח."*
 * לכן: טבלת "ספר + חודש = 180 → 5" ירדה. במקומה שני בלוקים נפרדים —
 * (1) חודש התנסות: ~~110~~ → 5 ₪  (2) "+ מתנה מאיתנו": ספר שופטים, בחינם.
 * העיגון של סער נשאר, רק על החודש, ומחיר הספר בחנות מופיע בבלוק המתנה.
 */
const CONFETTI = Array.from({ length: 26 }, (_, i) => i);

const Offer = () => {
  const earlyBird = useEarlyBird();

  return (
    <section
      id="ההטבה"
      className="cw2-offer relative py-20 md:py-28 px-4 overflow-hidden scroll-mt-20"
    >
      <div
        className="cw2-parallax absolute inset-0"
        style={{ backgroundImage: `url(${ART.photoSunrise})` }}
        role="presentation"
      />
      {/* ⚠️ אטימות בטיילווינד = כפולה של 5 בלבד. ‎/88‎ נזרק בשקט והשכבה נעלמת —
          מה שהשאיר את כל הטקסט הלבן על שמי זריחה בהירים. אותה מלכודת כמו בהירו. */}
      <div className="absolute inset-0 bg-[#0C2039]/90" />

      {/* קונפטי — דקורטיבי בלבד, ומכובה תחת prefers-reduced-motion */}
      <div className="cw2-confetti" aria-hidden="true">
        {CONFETTI.map((i) => (
          <i key={i} className={`cw2-confetto cw2-c${i % 4}`} style={{ ["--i" as string]: i }} />
        ))}
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <span className="cw2-pill cw2-pill--gold">
          <Gift className="w-4 h-4" aria-hidden="true" />
          {earlyBird.open ? `הרשמה מוקדמת · ${earlyBird.label}` : "הטבת פתיחת השנה"}
        </span>

        <h2 className="mt-6 text-3xl md:text-5xl font-black text-white leading-tight">
          מצטרפים ללימוד יהושע ושופטים
          <br />
          <span className="cw2-gold-text">חודש התנסות ב־{PRICE.firstMonth} ₪</span>
        </h2>

        {/* (1) חודש ההתנסות — העיגון של סער נשאר, על החודש בלבד */}
        <div className="cw2-anchor">
          <div className="cw2-anchor-row">
            <span>{ANCHOR.monthLabel}</span>
            <b>
              <s>{PRICE.monthly} ₪</s>
            </b>
          </div>

          <div className="cw2-anchor-hit">
            <p className="cw2-anchor-hit-label">חודש התנסות ראשון</p>
            <p className="cw2-anchor-hit-price">
              <span>{PRICE.firstMonth}</span> ₪
            </p>
            <p className="cw2-anchor-hit-sub">
              אחר כך {PRICE.monthly} ₪ לחודש · ביטול בכל עת
            </p>
          </div>
        </div>

        {/* (2) המתנה — בלוק נפרד, לא חלק מהחבילה (יואב 13.9) */}
        <div className="cw2-gift">
          <p className="cw2-gift-plus" aria-hidden="true">+</p>
          <div className="cw2-gift-body">
            <p className="cw2-gift-kicker">
              <Gift className="w-5 h-5" aria-hidden="true" />
              מתנה מאיתנו
            </p>
            <p className="cw2-gift-title">
              {EARLY_BIRD.gift.name} — <b>בחינם</b>
            </p>
            <p className="cw2-gift-text">
              הכרך המודפס של הרב יואב, מהדורת 2025
              <span className="cw2-gift-price"> · בחנות {ANCHOR.bookPrice} ₪</span>
            </p>
          </div>
          <img
            src={ART.bookShoftim}
            alt="ספר שופטים מאת הרב יואב אוריאל, מהדורת 2025 — המתנה למצטרפים"
            className="cw2-gift-img"
            loading="lazy"
            decoding="async"
            width={921}
            height={1438}
          />
        </div>

        {/* שורת יואב (13.9) — "נסו את התכנית במחיר אפסי..." */}
        <p className="mt-7 text-lg md:text-xl text-white/90 font-medium leading-relaxed max-w-xl mx-auto">
          {EARLY_BIRD.gift.tryLine}
        </p>

        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm md:text-base text-white/85">
          {["שיעור זום חי כל שבוע", "סיכום ותכני העמקה", "קהילת לומדים", "ביטול בכל עת"].map(
            (t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <Check className="w-4 h-4 text-[#F0C871] flex-shrink-0" aria-hidden="true" />
                {t}
              </li>
            ),
          )}
        </ul>

        <div className="mt-9">
          <Cta tone="gold" size="lg" />
          <p className="mt-4 text-sm text-white/70">
            הלימוד נפתח {SEASON.startDateLabel} · שנת {SEASON.hebrewYear}
          </p>
          <p className="mt-2 text-xs text-white/55">
            המתנה למצטרפים בהרשמה המוקדמת בלבד. {EARLY_BIRD.gift.terms}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Offer;
