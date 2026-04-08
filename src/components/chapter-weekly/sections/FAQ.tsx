import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqData = [
  {
    question: 'מה זה "לחיות תנ"ך – הפרק השבועי"?',
    answer: `זו תכנית לימוד ייחודית שמחזירה את התנ"ך להיות חי, מובן ומרגש – גם למי שניסה בעבר ולא הצליח להתחבר.
במגילת אסתר לומדים שני פרקים בשבוע, בצורה מסודרת ובהירה: הכנה קצרה עם חומרים כתובים ומוקלטים, ולאחריה שיעור זום שבועי חי עם הרב יואב אוריאל – מורה ותיק ומומחה לתנ"ך.
המטרה: לא רק להכיר את הפסוקים, אלא להבין את הסיפור המלא, לראות את ההקשרים, ולהרגיש שהפסוקים עצמם מדברים לחיים שלך כאן ועכשיו.`,
  },
  {
    question: "מי זה הרב יואב אוריאל?",
    answer: `הרב יואב הוא ראש תנועת "בני ציון", מחבר סדרת הספרים "מכלל יופי" על התנ"ך, מרצה ותיק במכללה ירושלים, ומורה בתוכניות לימוד ברחבי הארץ.
במשך 15 שנה הוא מלמד תנ"ך בשיטה שמשלבת עומק, סדר ובהירות – עם חיבור אמיתי למסורת ולמקורות, ובצד זה גם רלוונטיות חיה לדור שלנו.`,
  },
  {
    question: "מתי מתקיימים המפגשים?",
    answer: `בכל יום שני בשעה 21:00 – שיעור זום חי של כשעה עם הרב יואב אוריאל.
לא יכולים להגיע בשידור חי? ההקלטה המלאה + סיכום כתוב זמינים כבר למחרת – ותוכלו ללמוד בזמן ובקצב שלכם.`,
  },
  {
    question: "מה אורך התוכנית?",
    answer: `התכנית נבנית כסדרה רציפה של ספרי תנ"ך – אנחנו מתחילים במגילת אסתר ובהמשך נעבור לספרי הבית השני (עזרא, נחמיה, חגי, זכריה ומלאכי), ולספרים נוספים לפי הסדר.
כל ספר נלמד לעומק – פרק אחר פרק – כך שבסוף תכיר אותו היטב, לא "על קצה המזלג" אלא באמת.`,
  },
  {
    question: "הגעתי עכשיו, אפשר להצטרף?",
    answer: `בוודאי. אפשר להצטרף בכל שלב – פשוט תתחיל מהפרק שנמצא כרגע בלימוד. כל ההקלטות, הסיכומים והחומרים של הפרקים הקודמים מחכים לך באתר סגור למשתתפי התוכנית בלבד.`,
  },
  {
    question: "איך אדע אם זה מתאים לי? אפשר לנסות?",
    answer: `כן. ההצטרפות היא בחיוב חודשי – אפשר לבטל בכל עת, בלי התחייבות ובלי קנסות.
כך שתוכל לנסות חודש, לראות איך זה מרגיש, ולהמשיך רק אם זה באמת עובד לך.`,
  },
  {
    question: "למי מיועדת התוכנית?",
    answer: `לכל מי שרוצה לדעת תנ"ך בצורה אמיתית – גם למי שאין לו רקע קודם וגם ללומדים ותיקים.
התכנים בנויים כך שיתנו הבנה מקיפה ומדויקת, ובמקביל יפתחו כיווני מחשבה אמוניים ורעיוניים רלוונטיים להיום.`,
  },
  {
    question: "איך אפשר לפנות אליכם?",
    answer: `אפשר לכתוב לנו בוואטסאפ למספר 052-720-3221 או במייל office@bneyzion.co.il – ונחזור אליך בהקדם.`,
  },
];

const FAQ = () => (
  <section className="py-20 md:py-28 px-4 bg-cream-warm">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground text-center mb-12">שאלות נפוצות</h2>

      <Accordion type="single" collapsible className="space-y-4">
        {faqData.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`} className="bg-card rounded-xl border border-border/50 px-6 shadow-sm">
            <AccordionTrigger className="text-lg md:text-xl font-semibold text-foreground text-right hover:no-underline py-5">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-foreground leading-relaxed pb-5 whitespace-pre-line">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default FAQ;
