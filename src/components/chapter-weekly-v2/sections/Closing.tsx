import { Mail, Phone } from "lucide-react";

import { Cta, PriceLine } from "../Cta";
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

      <Cta tone="gold">מצטרפים לשנת הנביאים</Cta>
      <PriceLine />
      <p className="text-sm text-cream/55 mt-3">
        הלימוד נפתח {SEASON.startDateLabel}, מיד אחרי החגים.
      </p>

      <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-16 text-cream/70 text-sm">
        <a
          href={CONTACT.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:text-gold transition-colors"
        >
          <Phone className="w-4 h-4" aria-hidden="true" />
          <span dir="ltr">{CONTACT.phone}</span>
        </a>
        <a
          href={`mailto:${CONTACT.email}`}
          className="flex items-center gap-2 hover:text-gold transition-colors"
        >
          <Mail className="w-4 h-4" aria-hidden="true" />
          <span dir="ltr">{CONTACT.email}</span>
        </a>
      </div>

      <p className="text-xs text-cream/40 mt-8">
        התכנית לעילוי נשמת מעין פלסר ז״ל · © {new Date().getFullYear()} תנועת בני ציון
      </p>
    </div>
  </section>
);

export default Closing;
