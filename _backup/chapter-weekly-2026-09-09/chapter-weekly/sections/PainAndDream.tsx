import { ArrowLeft } from "lucide-react";
import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";

const PainAndDream = () => (
  <>
    <section className="py-16 md:py-20 px-4 bg-background">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-lg md:text-xl text-foreground leading-relaxed">
          בתכל'ס, תמיד ידעתי שהכל מתחיל משם:
          <br />
          הזהות שלי, הקשר לארץ, הביטחון הפנימי כעם.
        </p>
        <p className="text-lg md:text-xl text-foreground leading-relaxed mt-6">
          אבל איכשהו, בין ריצות, סידורים, ושגרת חיים – התנ"ך נשאר מחוץ לתמונה.
          <br />
          כמו הר גבוה בקצה האופק, שמביט בי תמיד מלמעלה וקורא לי –
          <br />
          אבל אין שביל ברור שמוביל אליו.
        </p>
      </div>
    </section>

    <section className="py-20 md:py-28 px-4 bg-cream-warm">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground text-center mb-6">
          זה לא ש<span className="text-primary">לא ניסית</span>...
        </h2>

        <p className="text-lg md:text-xl text-center text-foreground leading-relaxed mb-12 max-w-3xl mx-auto">
          אתה יודע כמה התנ"ך חשוב, מרגיש שיש בו משהו עצום ושורשי,
          וכל פעם שאתה פותח אותו – אתה רוצה לגלות את האור שבו.
          <br />
          אבל בפועל? זה תמיד נשאר בגדר רצון.
        </p>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          <div className="premium-card">
            <h4 className="font-bold text-foreground text-xl mb-3">ניסית ללמוד לבד</h4>
            <p className="text-foreground leading-relaxed">
              אבל אחרי כמה פסוקים הרגשת שאתה טובע. שורות ארוכות, מילים קשות, שמות ומקומות שאתה לא מצליח למקם.
              <br />
              <span className="font-semibold">התחושה? שזה סגור ונעול בפניך.</span>
            </p>
          </div>

          <div className="premium-card">
            <h4 className="font-bold text-foreground text-xl mb-3">הצטרפת לשיעור</h4>
            <p className="text-foreground leading-relaxed">או שהוא היה שטחי מדי, ולא סיפק את העומק שחיפשת, או כבד ומרוחק, עד שמצאת את עצמך בוהה בשעון.</p>
          </div>

          <div className="premium-card">
            <h4 className="font-bold text-foreground text-xl mb-3">רצית להתמיד</h4>
            <p className="text-foreground leading-relaxed">אבל החיים תמיד חזקים יותר. העבודה, המשפחה והמחויבויות השאירו את התנ"ך בתחתית הרשימה.</p>
          </div>

          <div className="premium-card">
            <h4 className="font-bold text-foreground text-xl mb-3">קנית ספרים</h4>
            <p className="text-foreground leading-relaxed">הם עומדים על המדף, מזכירים לך כל יום את ההבטחה שלא מומשה.</p>
          </div>
        </div>

        <div className="text-center mt-12 max-w-3xl mx-auto">
          <p className="text-lg text-foreground leading-relaxed mb-6">
            ובסוף – התחום הכי בסיסי בתורה, זה שאמור למלא אותך יראת שמים, השראה וחיבור,
            הפך אצלך למשהו מרוחק, קצת משעמם, ואפילו.. מתסכל.
          </p>
          <p className="text-lg text-foreground leading-relaxed mb-8">
            אתה לא מצליח להבין באמת את ההיגיון והסדר הפנימי שלו,
            ובטח שלא להתרגש ממנו או להנות מהלימוד.
            <br />
            הלב יודע שיש שם אוצר, אבל הדרך מרגישה כבדה, מסובכת,
            כמו הר גבוה שאין לך מושג מאיפה להתחיל לטפס.
          </p>
          <p className="text-xl md:text-2xl font-semibold text-foreground">
            ואז אתה שואל את עצמך:
            <br />
            <span className="text-primary">"למה זה כל כך קשה? למה אני לא מצליח ללמוד תנ"ך – ובאמת ליהנות מהלימוד שלו?"</span>
            <br />
            <span className="text-primary">איפה התשוקה שהיתה לי כשהייתי ילד ורק חיכיתי לשמוע את הפרק או הסיפור הבא?</span>
          </p>
        </div>
      </div>
    </section>

    <section className="py-20 md:py-28 px-4 bg-primary text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center">
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-accent mb-12">דמיין את עצמך עוד שנה מהיום...</h3>

          <div className="space-y-8 max-w-3xl mx-auto text-lg md:text-xl leading-relaxed text-primary-foreground/90">
            <div className="premium-card bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
              <h4 className="font-bold text-accent text-xl mb-3">בבית הכנסת</h4>
              <p>
                אתה יושב באותו מקום. החזן מתחיל לקרוא את ההפטרה.
                אבל הפעם — <span className="text-accent font-semibold">אתה מחובר לכל מילה.</span>
                <br />
                לא רק ש"אתה יודע על מה מדובר" — אתה רואה בעיני רוחך את כל הסיפור שמאחוריה.
                <br />
                אתה שם לב להקשרים לספרים אחרים בתנ"ך, את הרמזים שחז"ל ראו שם, ואת המסר העמוק שנוגע בדיוק לחיים שלך עכשיו.
              </p>
            </div>

            <div className="premium-card bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
              <h4 className="font-bold text-accent text-xl mb-3">בשולחן שבת, עם הילדים</h4>
              <p>
                הילדים מפתיעים עם שאלה על התנ"ך. אתה לא מחפש תירוץ או מפנה אותם למורה.
                <span className="text-accent font-semibold"> אתה עונה בעצמך, בטבעיות.</span>
                <br />
                מספר את הסיפור, מחבר נקודות, ורואה את העיניים שלהם נדלקות כשהם פוגשים גודל אמיתי ומקורי.
              </p>
            </div>

            <div className="premium-card bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
              <h4 className="font-bold text-accent text-xl mb-3">השינוי הפנימי</h4>
              <p>
                כשחבר שואל אותך על דניאל, עזרא, או יחזקאל – <span className="text-accent font-semibold">אתה לא מגמגם.</span>
                <br />
                אתה יודע בדיוק מה לומר, כי אתה חי את הפסוקים, מבין את ההיגיון הפנימי של הספרים, ומרגיש שהחיבור הזה מלווה אותך בכל תחומי החיים.
              </p>
            </div>

            <div className="premium-card bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
              <h4 className="font-bold text-accent text-xl mb-3">והכי חשוב...</h4>
              <p>
                חיי השיגרה שלך נשארו אותו הדבר – אותה עבודה, אותה משפחה, אותם הרגלים.
                <br />
                רק שעכשיו, יש לך עוד 'משהו': <span className="text-accent font-semibold">חיבור חי, עמוק, ומשמח לתנ"ך.</span>
                <br />
                תחושה שאתה חלק מהסיפור — ושזה חלק ממך.
              </p>
            </div>
          </div>

          <p className="text-2xl md:text-3xl font-bold text-accent mt-12 mb-8">זה לא חלום – זה בהישג יד.</p>

          <SubscribeButton>
      <button type="button" className="inline-flex items-center gap-3 bg-accent text-accent-foreground px-8 py-4 md:px-10 md:py-5 rounded-xl font-bold text-lg md:text-xl transition-all duration-300 hover:shadow-gold hover:scale-105">
            אני רוצה להצטרף
            <ArrowLeft className="w-5 h-5" />
          </button>
    </SubscribeButton>
        </div>
      </div>
    </section>
  </>
);

export default PainAndDream;
