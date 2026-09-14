import { Cta } from "../Cta";
import { ART } from "../art";
import { PRICE, SEASON } from "../data";
import { useEarlyBird } from "../useEarlyBird";

/**
 * ההירו — נבנה מחדש 10.9.2026 לפי הפלייר של סער.
 *
 * מה השתנה מהגרסה הקודמת, ולמה:
 *  - רקע **צילומי ובהיר** (מרפסת אבן ירושלמית, ענפי זית, נוף ההרים) במקום תמונת
 *    חומות כהה עם שכבת נייבי. סער: "שיהיה כיפי, הרבה נופים, חוויה של דף עוצמתי".
 *  - **שני הספרים המודפסים כבר בהירו** — הבקשה המפורשת שלו.
 *  - הכותרת חזרה לניסוח שלו: "השנה גם אתם לומדים את התנ״ך".
 *  - שורת ה-CTA אומרת את כל העסקה במשפט אחד (5 ₪ + ספר מתנה), כי זו הנקודה.
 *  - ירדו: ארבע פסקאות טקסט ושורת ארבעת המספרים. הן דחפו את הכפתור מתחת לקפל.
 */
const Hero = () => {
  const earlyBird = useEarlyBird();

  return (
    <section className="cw2-hero relative flex items-center justify-center overflow-hidden">
      {/* הצילום — מקובע ל-viewport, מה שנותן את הפרלקס בגלילה */}
      <div
        className="cw2-parallax absolute inset-0"
        style={{ backgroundImage: `url(${ART.photoHero})` }}
        role="presentation"
      />
      {/* ⚠️ שכבת ההבהרה הראשונה (white/70) בלעה את הנוף — וזה בדיוק מה שסער ביקש
          שיֵראה. עכשיו: וילון עדין בלבד למעלה, מעבר אל הקרם רק בתחתית, והילה
          רכה ממוקדת מאחורי עמודת הטקסט כדי לשמור על קריאוּת. */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/10 to-[#FAF5EA]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 62% 46% at 50% 34%, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.45) 45%, transparent 78%)",
        }}
      />

      <div className="relative z-10 w-full max-w-5xl mx-auto text-center px-4 pt-28 pb-14 md:pt-32 md:pb-16">
        {earlyBird.open && (
          <div className="cw2-pill animate-fade-up" style={{ animationDelay: "0.05s" }}>
            <span className="cw2-pill-dot" aria-hidden="true" />
            הרשמה מוקדמת · {earlyBird.label}
          </div>
        )}

        <h1
          className="cw2-h1 mt-7 font-black text-[#12314F] animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          השנה גם אתם
          <br />
          לומדים את התנ״ך
        </h1>

        <p
          className="mt-6 text-xl md:text-3xl font-bold text-[#1C4A79] animate-fade-up"
          style={{ animationDelay: "0.15s" }}
        >
          <span className="cw2-rule">תכנית הפרק השבועי</span>
        </p>

        <p
          className="mt-4 text-lg md:text-2xl text-[#2C4763] animate-fade-up"
          style={{ animationDelay: "0.18s" }}
        >
          מתחילים מספר <b className="text-[#B8860B]">יהושע</b> · פרק אחד בשבוע.
        </p>

        {/* הספרים המודפסים — יושבים על מדף האבן שבצילום */}
        <img
          src={ART.booksGift}
          alt="ספר יהושע וספר שופטים מאת הרב יואב אוריאל, מהדורת 2025"
          className="cw2-hero-books animate-fade-up"
          style={{ animationDelay: "0.24s" }}
          width={1000}
          height={753}
          fetchPriority="high"
        />

        <div className="animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <Cta tone="gold" size="lg" />
          <p className="mt-4 text-sm md:text-base text-[#42607D]">
            החודש הראשון {PRICE.firstMonth} ₪ · אחר כך {PRICE.monthly} ₪ לחודש · ביטול בכל עת
          </p>
          {/* ‎startDateLabel‎ הוא כבר "מיד אחרי החגים" — הוספת המילים שוב יצרה כפילות. */}
          <p className="mt-1.5 text-sm md:text-base text-[#42607D]">
            הלימוד נפתח {SEASON.startDateLabel} · שנת {SEASON.hebrewYear}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
