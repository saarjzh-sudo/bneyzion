import Layout from "@/components/layout/Layout";
import PageHero from "@/components/layout/PageHero";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";
import { reopenCookieBanner } from "@/components/legal/CookieConsent";

const LAST_UPDATED = "6 ביולי 2026";

const PrivacyPolicy = () => {
  useSEO({
    title: "מדיניות פרטיות",
    description: "מדיניות הפרטיות של אתר בני ציון — איסוף מידע, שימוש, עוגיות וזכויות המשתמש.",
    url: "https://bneyzion.co.il/privacy-policy",
  });

  return (
    <Layout>
      <PageHero
        title="מדיניות פרטיות"
        subtitle={`עודכן לאחרונה: ${LAST_UPDATED}`}
      />

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10 text-right" dir="rtl">
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">1. כללי</h2>
          <p className="text-muted-foreground leading-relaxed">
            מדיניות פרטיות זו חלה על האתר <strong>bneyzion.co.il</strong>, המופעל
            על-ידי <strong>עמותת מכלל יופי (ע"ר)</strong>, מספר עמותה{" "}
            <strong>580731974</strong>, רחוב הרקפת 5, ירושלים. המדיניות
            מתארת אילו נתונים אנו אוספים, כיצד אנו משתמשים בהם, ומהן
            זכויותיך כמשתמש.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">2. איזה מידע אנו אוספים</h2>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>שם מלא, כתובת דוא"ל ומספר טלפון — שנמסרו בעת הרשמה, רכישה או פנייה.</li>
            <li>היסטוריית צפייה, מעקב התקדמות ותכנים שנרכשו — לצורך מתן השירות ושיפורו.</li>
            <li>כתובת IP, סוג דפדפן ונתוני מכשיר — לצורכי אבטחה, מניעת הונאות וניתוח תעבורה.</li>
            <li>פרטי תשלום — מעובדים ונשמרים אצל ספק הסליקה בלבד (ראו סעיף 5), לא בשרתי האתר.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">3. עוגיות (Cookies)</h2>
          <p className="text-muted-foreground leading-relaxed">
            האתר משתמש בשני סוגי עוגיות:
          </p>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>
              <strong>עוגיות הכרחיות</strong> — נדרשות לתפעול בסיסי של האתר
              (התחברות, סל קניות, זכירת העדפת נגישות/עוגיות). עוגיות אלה
              פעילות תמיד ואינן דורשות הסכמה.
            </li>
            <li>
              <strong>עוגיות שיווקיות/אנליטיות</strong> — משמשות למדידת
              ביצועי קמפיינים (לדוגמה, פיקסל פייסבוק) ולשיפור חוויית
              המשתמש. עוגיות אלה נטענות <strong>רק לאחר אישורך המפורש</strong>{" "}
              בבאנר העוגיות המוצג בכניסתך הראשונה לאתר.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            ניתן לשנות את בחירתך בכל עת דרך{" "}
            <button
              type="button"
              onClick={() => reopenCookieBanner()}
              className="underline text-primary hover:opacity-80 font-semibold bg-transparent border-0 p-0 cursor-pointer"
            >
              עדכון העדפות עוגיות
            </button>
            , או דרך הגדרות הדפדפן שלך.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">4. כיצד אנו משתמשים במידע</h2>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>הפעלת השירות — אימות זהות, מתן גישה לתכנים, שליחת קבלות ותמיכה טכנית.</li>
            <li>שיפור חוויית המשתמש ופיתוח תכנים חדשים.</li>
            <li>משלוח עדכונים רלוונטיים (ניתן לביטול בכל עת בלחיצה על "הסרה" בתחתית כל מייל).</li>
            <li>מדידת ביצועי קמפיינים שיווקיים — בכפוף להסכמתך לעוגיות שיווקיות (סעיף 3).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">5. שיתוף מידע עם צדדים שלישיים</h2>
          <p className="text-muted-foreground leading-relaxed">
            איננו מוכרים את המידע האישי שלך. אנו משתפים מידע מוגבל עם ספקים
            הפועלים בשמנו, בהיקף הנדרש לתפעול השירות בלבד:
          </p>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>
              <strong>Grow / Meshulam</strong> — לצורך עיבוד תשלומים וסליקת
              כרטיסי אשראי (מאובטח בתקן PCI-DSS). פרטי הכרטיס אינם נשמרים
              בשרתי האתר.
            </li>
            <li>
              <strong>Meta (פייסבוק/אינסטגרם)</strong> — פיקסל מדידת המרות,
              נטען אך ורק בהסכמתך לעוגיות שיווקיות.
            </li>
            <li>
              <strong>Paperless</strong> — לצורך הפקת חשבוניות/קבלות (שם
              מלא, דוא"ל, טלפון).
            </li>
            <li>
              <strong>Smoove</strong> — לצורך משלוח דיוור ועדכונים במייל,
              בכפוף לזכותך להסרה בכל עת.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">6. אבטחת מידע</h2>
          <p className="text-muted-foreground leading-relaxed">
            אנו נוקטים באמצעי אבטחה מקובלים (הצפנת תעבורה, בקרת גישה) כדי
            להגן על המידע האישי שלך, אך אין באפשרותנו להבטיח הגנה מוחלטת
            מפני כל שימוש לרעה, ככל שירותי אינטרנט אחרים.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">7. זכויות המשתמש</h2>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>ניתן לבקש עיון, תיקון או מחיקת המידע האישי שלך בכל עת.</li>
            <li>ניתן להסיר את עצמך מרשימות תפוצה בלחיצה אחת בתחתית כל מייל.</li>
            <li>ניתן לעדכן את בחירת העוגיות בכל עת (סעיף 3).</li>
            <li>
              לכל פנייה בנושאי פרטיות:{" "}
              <Link to="/contact" className="underline text-primary hover:opacity-80">
                דף יצירת קשר
              </Link>{" "}
              או{" "}
              <a href="mailto:office@bneyzion.co.il" className="underline text-primary hover:opacity-80">
                office@bneyzion.co.il
              </a>
              .
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">8. שינויים במדיניות</h2>
          <p className="text-muted-foreground leading-relaxed">
            עמותת מכלל יופי (ע"ר) שומרת לעצמה את הזכות לעדכן מדיניות זו
            מעת לעת. שינויים מהותיים יפורסמו באתר. המשך שימוש בשירות לאחר
            עדכון המדיניות מהווה הסכמה לתנאים המעודכנים.
          </p>
        </section>

        <div className="rounded-xl border border-border bg-muted/40 px-6 py-5 text-sm text-muted-foreground space-y-1">
          <p>עודכן לאחרונה: {LAST_UPDATED}</p>
          <p>
            ראו גם:{" "}
            <Link to="/terms" className="underline hover:opacity-80">
              תקנון האתר
            </Link>{" "}
            ·{" "}
            <Link to="/accessibility" className="underline hover:opacity-80">
              הצהרת נגישות
            </Link>
          </p>
          <p>
            לשאלות:{" "}
            <Link to="/contact" className="underline hover:opacity-80">
              צור קשר
            </Link>{" "}
            ·{" "}
            <a href="mailto:office@bneyzion.co.il" className="underline hover:opacity-80">
              office@bneyzion.co.il
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;
