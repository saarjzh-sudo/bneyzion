import { PILLARS } from "../data";

/**
 * ארבעת העמודים — הרצועה שמופיעה בפלייר של סער, אחד לאחד.
 *
 * 10.9 סבב ג׳: אייקוני הקו של lucide הוחלפו באייקונים מצוירים משלנו —
 * סער ביקש "אייקונים חיים, כיפיים". כל אחד נבנה כ-SVG קטן עם צבע מלא, קימור
 * ידני ונקודת-אור אחת, בפלטת המותג (נייבי · זהב · טורקיז). בלי ספריות.
 */

const ICONS: Record<string, JSX.Element> = {
  // ספר פתוח עם לב קטן — "לב הפרק"
  book: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M6 16c8-4 16-4 26 2v36c-10-6-18-6-26-2V16Z" fill="#1C4A79" />
      <path d="M58 16c-8-4-16-4-26 2v36c10-6 18-6 26-2V16Z" fill="#2D7D7D" />
      <path d="M32 18c10-6 18-6 26-2" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M32 30c1.8-2.6 6-2.3 6 1 0 3-4.2 5.4-6 6.6-1.8-1.2-6-3.6-6-6.6 0-3.3 4.2-3.6 6-1Z"
        fill="#F0C871"
      />
    </svg>
  ),
  // מסך עם משולש נגינה ונקודת "שידור חי"
  video: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="5" y="12" width="54" height="36" rx="7" fill="#1C4A79" />
      <path d="M27 24.5c0-1.6 1.8-2.6 3.2-1.8l9.4 5.5c1.3.8 1.3 2.7 0 3.5l-9.4 5.5c-1.4.8-3.2-.2-3.2-1.8v-10.9Z" fill="#F0C871" />
      <path d="M22 55h20" stroke="#1C4A79" strokeWidth="4" strokeLinecap="round" />
      <circle cx="49" cy="21" r="3.5" fill="#E05B4B" />
    </svg>
  ),
  // דף עם שורות וסימן וי
  notes: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M13 8h26l14 14v34a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z" fill="#F5EFE2" stroke="#1C4A79" strokeWidth="3" />
      <path d="M39 8v14h14" fill="#C4A265" />
      <path d="M18 32h20M18 40h20M18 48h12" stroke="#1C4A79" strokeWidth="3" strokeLinecap="round" strokeOpacity=".55" />
      <circle cx="47" cy="45" r="11" fill="#2D7D7D" />
      <path d="m42.5 45 3.2 3.4 6.3-6.6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  // שלושה אנשים
  community: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="15" cy="24" r="7" fill="#C4A265" />
      <path d="M4 47c0-6 5-10 11-10s11 4 11 10v3H4v-3Z" fill="#C4A265" />
      <circle cx="49" cy="24" r="7" fill="#2D7D7D" />
      <path d="M38 47c0-6 5-10 11-10s11 4 11 10v3H38v-3Z" fill="#2D7D7D" />
      <circle cx="32" cy="20" r="9" fill="#1C4A79" />
      <path d="M18 48c0-8 6-13 14-13s14 5 14 13v6H18v-6Z" fill="#1C4A79" />
    </svg>
  ),
};

const Pillars = () => (
  <section className="relative z-10 px-4 -mt-10 md:-mt-14">
    <ul className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {PILLARS.map(({ icon, title, body }, i) => (
        <li
          key={title}
          className="cw2-card text-center px-4 py-6 md:py-7 animate-fade-up"
          style={{ animationDelay: `${0.06 * i}s` }}
        >
          <span className="cw2-card-icon">{ICONS[icon]}</span>
          <h3 className="mt-4 text-lg md:text-xl font-black text-[#12314F]">{title}</h3>
          <p className="mt-1 text-sm md:text-base text-[#5B7391]">{body}</p>
        </li>
      ))}
    </ul>
  </section>
);

export default Pillars;
