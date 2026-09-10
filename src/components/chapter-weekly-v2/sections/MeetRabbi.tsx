/**
 * הרב יואב — סקשן דיוקן. שתי עמודות: תמונה גדולה מימין, והדרך שלו משמאל.
 * ההבדל מהגרסה הקודמת: הגישה מוצגת כארבעה עוגנים קצרים, לא כפסקאות שיווק.
 */

const CREDENTIALS = [
  "ראש תנועת ״בני ציון״ ללימוד תנ״ך",
  "מחבר סדרת הספרים ״מכלל יופי״ על התנ״ך",
  "מרצה ותיק במכללה ירושלים",
  "15 שנות הוראה — בישיבות, בכנסים ובקהילות בכל הארץ",
] as const;

const APPROACH = [
  { title: "סקרנות", body: "להתרגש מכל גילוי, כמו בפעם הראשונה." },
  { title: "בהירות", body: "לראות את הרצף, המגמה וההיגיון הפנימי של הספר." },
  { title: "פשט ועומק", body: "קודם מה כתוב, ורק אחר כך השאלות הגדולות." },
  { title: "חיבור לימינו", body: "איך כל פרק נוגע בדיוק במה שאנחנו חיים כאן עכשיו." },
] as const;

const MeetRabbi = () => (
  <section
    className="py-20 md:py-28 px-4"
    style={{ background: "linear-gradient(180deg, #123A3A 0%, #0D2B2B 60%, #123A3A 100%)" }}
  >
    <div className="max-w-5xl mx-auto">
      <div className="grid md:grid-cols-[280px_1fr] gap-10 md:gap-14 items-start">
        <div className="mx-auto md:mx-0">
          <img
            src="/lovable-uploads/fbbe71d6-129b-47d8-a0ec-ce3ce44cdb29.png"
            alt="הרב יואב אוריאל"
            className="w-56 h-56 md:w-[280px] md:h-[280px] object-cover rounded-2xl shadow-2xl ring-1 ring-gold/40"
            loading="lazy"
          />
        </div>

        <div>
          <p className="text-gold text-sm font-medium mb-3">מי מלמד</p>
          <h2 className="text-3xl md:text-5xl font-bold text-cream mb-6">הרב יואב אוריאל</h2>

          <p className="text-lg text-cream/80 leading-relaxed mb-8">
            כבר יותר מ־15 שנה הוא לוקח את אותו התנ״ך שרבים פותחים בהיסוס, ומחזיר לו את
            הסקרנות, הסדר והעומק — כך שגם מי שלא פתח אותו ברצינות מאז בית הספר מוצא בו את
            עצמו.
          </p>

          <ul className="space-y-2.5 mb-10">
            {CREDENTIALS.map((c) => (
              <li key={c} className="flex items-start gap-3 text-cream/85">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-gold mt-2.5 flex-shrink-0"
                  aria-hidden="true"
                />
                <span>{c}</span>
              </li>
            ))}
          </ul>

          <div className="grid sm:grid-cols-2 gap-3">
            {APPROACH.map((a) => (
              <div
                key={a.title}
                className="rounded-xl border border-white/10 bg-white/[0.05] p-4"
              >
                <p className="font-bold text-gold mb-1">{a.title}</p>
                <p className="text-sm text-cream/75 leading-relaxed">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default MeetRabbi;
