import Layout from "@/components/layout/Layout";
import PageHero from "@/components/layout/PageHero";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";

const LAST_UPDATED = "6 ביולי 2026";

const AccessibilityStatement = () => {
  useSEO({
    title: "הצהרת נגישות",
    description: "הצהרת הנגישות של אתר בני ציון — תנועה ללימוד תנ\"ך, בהתאם לתקן הישראלי ת\"י 5568.",
    url: "https://bneyzion.co.il/accessibility",
  });

  return (
    <Layout>
      <PageHero
        title="הצהרת נגישות"
        subtitle={`עודכן לאחרונה: ${LAST_UPDATED}`}
      />

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10 text-right" dir="rtl">
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">1. התחייבותנו לנגישות</h2>
          <p className="text-muted-foreground leading-relaxed">
            תנועת בני ציון רואה חשיבות רבה במתן שירות שוויוני ונגיש לכלל
            הציבור, לרבות אנשים עם מוגבלות. אנו פועלים להנגשת האתר כך
            שיהיה שמיש ככל האפשר עבור כל משתמש, ללא תלות ביכולת הראייה,
            השמיעה, התנועה או הקוגניציה שלו.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">2. רמת ההתאמה</h2>
          <p className="text-muted-foreground leading-relaxed">
            האתר תוכנן ונבנה מתוך שאיפה לעמידה בדרישות תקן הנגישות הישראלי{" "}
            <strong>ת"י 5568</strong> (המבוסס על הנחיות WCAG 2.1 ברמה{" "}
            <strong>AA</strong>), ובהתאם לתקנות שוויון זכויות לאנשים עם
            מוגבלות (התאמות נגישות לשירות), התשע"ג-2013.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            הנגשת האתר היא תהליך מתמשך. אנו ממשיכים לבדוק ולשפר את הנגישות
            באופן שוטף, ואיננו טוענים להתאמה מלאה בכל עת ובכל עמוד.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">3. אמצעי נגישות שיושמו באתר</h2>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>מבנה דף סמנטי (כותרות, אזורים, ניווט) המותאם לקוראי מסך.</li>
            <li>אפשרות דילוג ישיר לתוכן הראשי באמצעות מקלדת ("דלג לתוכן הראשי").</li>
            <li>ניווט מלא במקלדת בכל הרכיבים האינטראקטיביים (תפריטים, טפסים, חלונות קופצים).</li>
            <li>טקסט חלופי (alt) לתמונות משמעותיות.</li>
            <li>ניגודיות צבעים נבדקת מול רקע, לפי יחסי ניגודיות מומלצים.</li>
            <li>תמיכה מלאה בכיווניות מימין-לשמאל (RTL) התואמת את שפת התוכן.</li>
            <li>תיוג נגיש (aria) לכפתורים, חלונות מודאליים ואזורי הודעה דינאמיים.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">4. מגבלות ידועות</h2>
          <p className="text-muted-foreground leading-relaxed">
            ייתכן שחלקים מסוימים באתר — בעיקר תכני וידאו/שמע ישנים שהועלו
            במסגרת תהליך המרה מאתר קודם — עדיין אינם כוללים כתוביות או
            תמלול מלא. אנו פועלים להשלים הנגשה זו בהדרגה. נתקלתם ברכיב
            שאינו נגיש? נשמח שתדווחו לנו כמפורט מטה.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">5. פנייה בנושאי נגישות</h2>
          <p className="text-muted-foreground leading-relaxed">
            נתקלתם בבעיית נגישות באתר, או שיש לכם הצעה לשיפור? נשמח שתפנו
            אלינו ונטפל בפנייה בהקדם האפשרי:
          </p>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>
              דוא"ל רכז הנגישות:{" "}
              <a href="mailto:office@bneyzion.co.il" className="underline text-primary hover:opacity-80">
                office@bneyzion.co.il
              </a>
            </li>
            <li>
              טלפון:{" "}
              <a href="tel:+972527368607" className="underline text-primary hover:opacity-80">
                052-736-8607
              </a>
            </li>
            <li>
              או דרך{" "}
              <Link to="/contact" className="underline text-primary hover:opacity-80">
                דף יצירת הקשר
              </Link>
              , תוך ציון "פניית נגישות" בנושא ההודעה.
            </li>
          </ul>
        </section>

        <div className="rounded-xl border border-border bg-muted/40 px-6 py-5 text-sm text-muted-foreground space-y-1">
          <p>עודכן לאחרונה: {LAST_UPDATED}</p>
          <p>
            לשאלות נוספות:{" "}
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

export default AccessibilityStatement;
