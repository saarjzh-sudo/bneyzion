import { ART } from "../art";
import { DREAM } from "../data";

/**
 * החלום — פסקה אחת קצרה שסער ביקש להוסיף (10.9):
 * "טקסט קצר על החלום ללמוד תנ״ך, לדעת את התנ״ך, בצורה מסודרת, במבט של גאולה,
 *  גם בדור שלנו."
 * סקשן שקט בכוונה: רצועת נוף, ארבע שורות, בלי כפתור. הוא נושם בין ההטבה
 * הרועשת לבין מקצב השבוע.
 */
const Dream = () => (
  <section className="relative py-24 md:py-32 px-4 overflow-hidden">
    <div
      className="cw2-parallax absolute inset-0"
      style={{ backgroundImage: `url(${ART.photoStone})` }}
      role="presentation"
    />
    <div className="absolute inset-0 bg-[#0C2039]/75" />

    <div className="relative z-10 max-w-2xl mx-auto text-center">
      <span className="text-sm font-bold tracking-[0.3em] text-[#F0C871]">{DREAM.kicker}</span>
      <h2 className="mt-5 text-3xl md:text-5xl font-black text-white leading-tight">
        {DREAM.title}
      </h2>
      <p className="mt-6 text-lg md:text-2xl text-cream/85 leading-relaxed">{DREAM.body}</p>
    </div>
  </section>
);

export default Dream;
