import Layout from "@/components/layout/Layout";
import PageHero from "@/components/layout/PageHero";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";

const LAST_UPDATED = "3 במאי 2026";

const Terms = () => {
  useSEO({
    title: "תקנון ומדיניות פרטיות",
    description: "תקנון האתר ומדיניות הפרטיות של תנועת בני ציון ללימוד תנ\"ך.",
    url: "https://bneyzion.co.il/terms",
  });

  return (
    <Layout>
      <PageHero
        title="תקנון ומדיניות פרטיות"
        subtitle={`עודכן לאחרונה: ${LAST_UPDATED}`}
      />

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10 text-right" dir="rtl">

        {/* Section 1 — Identity */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">1. זהות בעל האתר ופרטי קשר</h2>
          <p className="text-muted-foreground leading-relaxed">
            האתר <strong>bneyzion.co.il</strong> מופעל על-ידי <strong>עמותת מכלל יופי (ע"ר)</strong>,
            מספר עמותה <strong>580731974</strong>, רחוב הרקפת 5, ירושלים, מיקוד 9650515.
            האתר פועל תחת המותג "בני ציון — תנועה ללימוד תנ"ך", בניהולו של הרב יואב אוריאל.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            לפניות ושאלות:{" "}
            <Link to="/contact" className="underline text-primary hover:opacity-80">
              דף יצירת קשר
            </Link>
            {" · "}
            <a href="mailto:office@bneyzion.co.il" className="underline text-primary hover:opacity-80">
              office@bneyzion.co.il
            </a>
            {" · "}
            <a href="tel:+972534706610" className="underline text-primary hover:opacity-80">
              053-470-6610
            </a>
          </p>
        </section>

        {/* Section 2 — Service */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">2. תיאור השירות</h2>
          <p className="text-muted-foreground leading-relaxed">
            האתר מציע מנוי דיגיטלי לגישה לתכני לימוד תנ"ך — שיעורים מוקלטים, חוברות לימוד,
            סדרות נושאיות ועוד — ממאות רבנים ומלמדים. התכנים מיועדים לשימוש אישי בלבד.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            בנוסף לתכנים הדיגיטליים, מופעל חנות מוצרים פיזיים בכתובת{" "}
            <a
              href="https://club.bneyzion.co.il"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary hover:opacity-80"
            >
              club.bneyzion.co.il
            </a>{" "}
            הכפופה לתנאים נפרדים.
          </p>
        </section>

        {/* Section 3 — Payment */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">3. מדיניות תשלום</h2>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>התשלום מתבצע דרך מערכת Grow / Meshulam, מאובטחת בתקן PCI-DSS.</li>
            <li>פרטי כרטיס האשראי אינם נשמרים בשרתי האתר בשום שלב.</li>
            <li>מנוי חודשי מחויב בתחילת כל חודש; מנוי שנתי מחויב פעם בשנה.</li>
            <li>הסכום שמוצג בזמן הרכישה הוא הסכום הסופי כולל מע"מ.</li>
            <li>קבלה תישלח אוטומטית לכתובת הדוא"ל שסופקה בעת הרכישה.</li>
          </ul>
        </section>

        {/* Section 4 — Cancellation */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">4. מדיניות ביטולים והחזרים</h2>
          <p className="text-muted-foreground leading-relaxed">
            בהתאם לחוק הגנת הצרכן, התשמ"א-1981 ותקנותיו:
          </p>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>
              ניתן לבטל עסקה תוך <strong>14 יום</strong> מיום הרכישה ולקבל החזר מלא, ובלבד
              שלא נעשה שימוש בתכנים המנויים.
            </li>
            <li>
              ביטול לאחר 14 יום — לא יינתן החזר על תקופה שחלפה; המנוי יופסק עם תום
              התקופה ששולמה.
            </li>
            <li>
              לביטול יש לפנות אלינו בכתב דרך{" "}
              <Link to="/contact" className="underline text-primary hover:opacity-80">
                דף יצירת קשר
              </Link>{" "}
              או בדוא"ל.
            </li>
            <li>ההחזר יבוצע לאמצעי התשלום המקורי תוך 14 ימי עסקים.</li>
          </ul>
        </section>

        {/* Section 5 — Age restriction */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">5. הגבלת גיל וכשירות לרכישה</h2>
          <p className="text-muted-foreground leading-relaxed">
            השירותים באתר מיועדים לבני <strong>18 ומעלה</strong>. ביצוע רכישה או הרשמה לאתר
            מהווה הצהרה של המשתמש כי הוא מלאו לו 18 שנה וכי הוא כשיר משפטית לכרות חוזה
            מחייב. קטין המבצע רכישה ללא אישור הורה או אפוטרופוס אחראי — הרכישה עלולה
            להתבטל ולהיות מוחזרת.
          </p>
        </section>

        {/* Section 6 — Delivery policy */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">6. מדיניות אספקת שירותים ומסירת תכנים</h2>
          <p className="text-muted-foreground leading-relaxed font-semibold">תכנים דיגיטליים ומנויים:</p>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>
              גישה לתכנים דיגיטליים (שיעורים מוקלטים, חוברות, הפרק השבועי וכל מנוי דיגיטלי אחר)
              מופעלת <strong>באופן מיידי</strong> עם אישור התשלום, דרך אזור אישי מאובטח.
            </li>
            <li>
              אישור המנוי ישלח לכתובת הדוא"ל שסופקה בעת הרכישה תוך מספר דקות.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed font-semibold mt-4">מוצרים פיזיים (ספרים וחוברות):</p>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>
              <strong>דואר רשום:</strong> המשלוח יצא תוך 3 ימי עסקים מאישור ההזמנה; זמן מסירה עד
              <strong> 14 ימי עסקים</strong> מיום המשלוח. דמי משלוח כמפורט בשלב הסיום של ההזמנה.
            </li>
            <li>
              <strong>שליח עד הבית:</strong> זמן מסירה <strong>עד 7 ימי עסקים</strong> מאישור ההזמנה (בתשלום נפרד).
            </li>
            <li>
              <strong>איסוף עצמי:</strong> ניתן לתיאום מראש עם הצוות דרך דף יצירת קשר.
            </li>
            <li>
              עמותת מכלל יופי (ע"ר) אינה אחראית לעיכובים הנובעים מכוח עליון, שביתות בדואר, או
              נסיבות שמחוץ לשליטתנו. במקרה כזה ייצור הצוות קשר עם הרוכש.
            </li>
          </ul>
        </section>

        {/* Section 7 — Product warranty */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">7. אחריות על מוצרים פיזיים</h2>
          <p className="text-muted-foreground leading-relaxed">
            לכל מוצר פיזי (ספר, חוברת) הנרכש דרך האתר:
          </p>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>
              <strong>מוצר פגום / שגוי:</strong> ניתן להחזיר תוך <strong>14 ימי עסקים</strong> מיום קבלת המשלוח
              ולקבל החלפה או החזר מלא, ללא עלות משלוח.
            </li>
            <li>
              <strong>החלפה בשל שינוי דעה:</strong> ניתן להחזיר מוצר שלם ולא-פגום תוך 14 יום מקבלתו;
              דמי המשלוח בגין ההחזרה יחולו על הרוכש.
            </li>
            <li>
              אחריות אינה חלה על נזק שנגרם בשל שימוש לקוי, רטיבות, או גורמים שמחוץ לשליטתנו.
            </li>
            <li>
              לפניות בנושא אחריות:{" "}
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

        {/* Section 8 — Content usage */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">8. שימוש בתכנים וזכויות יוצרים</h2>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>כל התכנים באתר — שיעורים, חוברות, תמלולים — הם רכוש תנועת בני ציון ו/או מרצאיהם ושמורות להם כל הזכויות.</li>
            <li>הגישה לתכנים מוענקת למנוי לשימוש אישי בלבד.</li>
            <li>אסור להוריד, להפיץ, לשתף, להקליט, לשדר מחדש, למכור או לעשות שימוש מסחרי כלשהו בתכנים.</li>
            <li>הפרת הסעיף תגרור ביטול המנוי מיידי ועלולה להקים עילה משפטית.</li>
          </ul>
        </section>

        {/* Section 9 — Privacy */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">9. מדיניות פרטיות</h2>
          <p className="text-muted-foreground leading-relaxed font-semibold">
            מידע שאנו אוספים:
          </p>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>שם מלא, כתובת דוא"ל, מספר טלפון — שנמסרו בעת ההרשמה או הרכישה.</li>
            <li>היסטוריית צפייה ורכישות — לצורך מתן השירות ושיפורו.</li>
            <li>כתובת IP ונתוני דפדפן — לצורכי אבטחה וניתוח תעבורה.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed font-semibold mt-4">
            שימוש במידע:
          </p>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>הפעלת השירות — אימות זהות, שליחת קבלות, תמיכה טכנית.</li>
            <li>שיפור חוויית המשתמש ופיתוח תכנים חדשים.</li>
            <li>משלוח עדכונים רלוונטיים (ניתן לביטול בכל עת).</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed font-semibold mt-4">
            העברת מידע לצד שלישי:
          </p>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>מידע על תשלום מועבר לחברת Grow / Meshulam לצורך עיבוד התשלום בלבד.</li>
            <li>נשמר שם מלא, דוא"ל וטלפון לצורך שליחת קבלות (Paperless).</li>
            <li>המידע אינו נמכר או מועבר לצד שלישי לצורכי פרסום.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed font-semibold mt-4">
            זכויות המשתמש:
          </p>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>ניתן לבקש עיון, תיקון או מחיקת המידע האישי בכל עת.</li>
            <li>
              לפניות בנושאי פרטיות:{" "}
              <Link to="/contact" className="underline text-primary hover:opacity-80">
                דף יצירת קשר
              </Link>{" "}
              או בדוא"ל.
            </li>
          </ul>
        </section>

        {/* Section 10 — Changes */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">10. שינויים בתקנון</h2>
          <p className="text-muted-foreground leading-relaxed">
            עמותת מכלל יופי (ע"ר) שומרת לעצמה את הזכות לעדכן תקנון זה בהתאם לשינויים בשירות או
            בדרישות החוק. שינויים מהותיים יפורסמו באתר ויישלח עדכון למנויים פעילים לפחות
            30 יום לפני כניסתם לתוקף. המשך שימוש בשירות לאחר מועד זה מהווה הסכמה לתנאים המעודכנים.
          </p>
        </section>

        {/* Section 11 — Jurisdiction */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">11. ברירת דין וסמכות שיפוט</h2>
          <p className="text-muted-foreground leading-relaxed">
            תקנון זה כפוף לדין הישראלי. כל מחלוקת הנוגעת לשירות תידון בבית המשפט המוסמך
            בירושלים, ישראל, בלעדית.
          </p>
        </section>

        {/* Closing note */}
        <div className="rounded-xl border border-border bg-muted/40 px-6 py-5 text-sm text-muted-foreground space-y-1">
          <p>עודכן לאחרונה: {LAST_UPDATED}</p>
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

export default Terms;
