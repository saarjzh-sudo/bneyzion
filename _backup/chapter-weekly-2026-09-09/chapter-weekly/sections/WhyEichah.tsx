import { ArrowLeft } from "lucide-react";
import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";

/**
 * WhyEichah — סקשן "למה מגילת איכה?"
 * נוצר מהזיפ Lovable (26.5.2026). לא מוזכר ב-Index.tsx המקורי —
 * ניתן לשלב ב-ChapterWeekly.tsx בין WhySecondTemple ל-ProgramIntro אחרי אישור יואב.
 */
const WhyEichah = () => (
  <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-bg-light via-white to-light-blue relative overflow-hidden transition-all duration-700 ease-in-out">
    <div className="max-w-4xl mx-auto relative z-10">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-blue text-center mb-12 md:mb-16">
        למה מתחילים דווקא עם
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-l from-elegant-gold to-yellow-600">מגילת איכה</span>?
      </h2>

      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <div className="text-center space-y-6">
          <h3 className="text-2xl font-bold text-navy-blue">אחד הספרים הבלתי נלמדים</h3>
          <p className="text-lg leading-relaxed">
            את המגילה הזאת אנחנו קוראים
            <br />
            כל תשעה באב
            <br />
            אבל כמעט שלא מבינים
            <br />
            את המשמעות העמוקה של הפסוקים.
          </p>
        </div>

        <div className="text-center space-y-6">
          <h3 className="text-2xl font-bold text-navy-blue">מגילת הגאולה לא החורבן</h3>
          <p className="text-lg leading-relaxed">
            המגילה הזו נועדה למנוע את החורבן,
            <br />
            ובלימוד שלה אנחנו מקרבים
            <br />
            את הגאולה בפועל ממש
            <br />
            לקראת תשעה באב!
          </p>
        </div>

        <div className="text-center space-y-6 md:col-span-2">
          <h3 className="text-2xl font-bold text-navy-blue">יעד ממוקד וברור</h3>
          <p className="text-lg leading-relaxed">
            חמשת הפרקים של מגילת איכה
            <br />
            ניתנים ללימוד בפרק זמן לא ארוך,
            <br />
            כאשר תוך כמה שבועות
            <br />
            תזכה לסיים ספר שלם בתנ"ך.
          </p>
        </div>
      </div>

      <div className="text-center">
        <SubscribeButton>
          <button
            type="button"
            className="bg-gradient-to-l from-navy-blue to-blue-800 text-white px-8 md:px-12 py-4 md:py-6 rounded-2xl text-lg md:text-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-4 shadow-xl"
          >
            אני רוצה להצטרף
            <ArrowLeft className="w-5 h-5" />
          </button>
        </SubscribeButton>
      </div>
    </div>
  </section>
);

export default WhyEichah;
