import { Mail, Phone } from "lucide-react";

import { Cta, PriceLine } from "../Cta";
import { ART } from "../art";
import { CONTACT, SEASON } from "../data";

/**
 * הסוגר — בקולו של הרב יואב, ואחריו הכפתור פעם אחרונה.
 * הקופי מתוך `A-yehoshua/lp-copy.md`, סקשן ז.
 */
const Closing = () => (
  <section
    className="relative py-20 md:py-28 px-4 overflow-hidden"
    style={{ background: "linear-gradient(180deg, #0E1526 0%, #131C30 100%)" }}
  >
    {/* איור השביל שמטפס אל האור — רקע רך מאחורי הסוגר, לא תמונה שמושכת תשומת לב.
        נוסף 10.9 בעקבות הערת סער על "יותר המחשה" בדף. */}
    <img
      src={ART.photoStone}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover opacity-[0.22] pointer-events-none"
      loading="lazy"
      decoding="async"
    />
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, rgba(14,21,38,0.55) 0%, rgba(14,21,38,0.88) 70%, #0E1526 100%)",
      }}
    />
    <div
      className="absolute inset-0 opacity-[0.06] pointer-events-none"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, #C4A265 0%, transparent 60%)",
      }}
    />

    <div className="relative z-10 max-w-2xl mx-auto text-center">
      <p className="text-gold text-sm font-medium mb-6">עוד שורה אחת ממני</p>

      <div className="space-y-5 text-lg md:text-xl text-cream/85 leading-[1.85] mb-10">
        <p>
          הפרק הראשון של יהושע הוא הפרק של{" "}
          <span className="text-gold font-semibold">״חזק ואמץ״</span>. פעם אחר פעם חוזר שם
          הציווי הזה, רגע לפני הכניסה לארץ.
        </p>
        <p>
          את ספר יהושע אפשר גם לקרוא לבד. אבל ללכת איתו עד הסוף, פרק אחר פרק, עם שיעור
          וקבוצה — זה מה שהופך קריאה לקביעות.
        </p>
        <p className="text-cream">
          בשביל זה יש את הפרק השבועי: להרים את קומת הקודש בעם, שמתוכה, בעזרת ה׳, ננצח ונבנה.
        </p>
        <p className="text-gold font-semibold">נפגשים בפרק א׳. חזק ואמץ.</p>
      </div>

      <p className="text-cream font-bold text-lg mb-12">הרב יואב אוריאל</p>

      <div className="cw2-hairline mb-12" />

      <Cta tone="gold" />
      <PriceLine />
      <p className="text-sm text-cream/55 mt-3">הלימוד נפתח {SEASON.startDateLabel}.</p>

      {/* פוטר — 10.9: היה שורת טקסט זעירה ודהויה. עכשיו שני כפתורי יצירת-קשר
          אמיתיים בגודל מגע תקין, וקו מפריד לפני שורת הזיכרון. */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 mt-16">
        <a
          href={CONTACT.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="cw2-footlink"
        >
          <Phone className="w-5 h-5" aria-hidden="true" />
          <span dir="ltr">{CONTACT.phone}</span>
        </a>
        <a href={`mailto:${CONTACT.email}`} className="cw2-footlink">
          <Mail className="w-5 h-5" aria-hidden="true" />
          <span dir="ltr">{CONTACT.email}</span>
        </a>
      </div>

      <div className="cw2-hairline mt-10 mb-6" />

      <p className="text-sm text-cream/65">תנ״ך · אנשים · חיים</p>
      <p className="text-sm text-cream/50 mt-2">
        התכנית לעילוי נשמת מעין פלסר ז״ל · © {new Date().getFullYear()} תנועת בני ציון
      </p>
    </div>
  </section>
);

export default Closing;
