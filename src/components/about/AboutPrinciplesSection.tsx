import { motion } from "framer-motion";
import { Sparkles, BookOpen, Quote } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const AboutPrinciplesSection = () => {
  return (
    <section className="py-20 section-gradient-warm">
      <div className="container max-w-4xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-10"
        >
          {/* עקרונות היסוד */}
          <motion.div variants={fadeUp} custom={0}>
            <h2 className="text-3xl font-heading gradient-warm mb-6 flex items-center gap-3">
              <Sparkles className="h-7 w-7 text-primary" />
              עקרונות היסוד של תכנית 'בני ציון'
            </h2>
            <div className="glass-card-light rounded-2xl p-8 md:p-10 space-y-5 text-foreground/90 leading-[2] font-serif">
              <p>
                לימוד תנ"ך הוא התקרבות לשלימות חיים שהופיעה בימים קדומים. התנ"ך סולל דרך אל קדושה מסדר גודל אחר, שאותה רק הנבואה יכולה לקלוט ולתאר.
              </p>
              <p>
                לימוד ספרי הנבואה מלווה ביראה ובידיעת קטנותנו ביחס לדברי ה', ובכללם דברי חז"ל במשך הדורות.
              </p>
              <p>
                דברי הנביאים משנים אותנו, מהפכים את נפשנו לטובה. בכל לימוד של כתבי הקודש מתגלים אופקים חדשים. מתגלה לאן יש לחתור ולאיזה אופק עלינו לשאוף.
              </p>
              <div className="my-6 p-5 bg-primary/5 rounded-xl border border-primary/10">
                <Quote className="h-5 w-5 text-primary/40 mb-2 rotate-180" />
                <p className="text-sm md:text-base text-muted-foreground font-serif leading-[2]">
                  "וכל דיבוריו יתברך מפי נביאיו שנכתבו בתנ"ך הם פועלים לדורות עולם בכל הנפשות מישראל בכל דור ודור להוליד בלבבם הרהורי תשובה והתעוררות לשוב, וה' יתברך מבטיח דלא ישוב ריקם"
                </p>
                <p className="text-xs text-muted-foreground/70 mt-2 font-display">(ר' צדוק מלובלין, תקנת השבים עמוד קלב)</p>
                <Quote className="h-5 w-5 text-primary/40 mt-2" />
              </div>
            </div>
          </motion.div>

          {/* דרך הלימוד */}
          <motion.div variants={fadeUp} custom={1}>
            <h2 className="text-3xl font-heading gradient-warm mb-6 flex items-center gap-3">
              <BookOpen className="h-7 w-7 text-primary" />
              דרך הלימוד
            </h2>
            <div className="glass-card-light rounded-2xl p-8 md:p-10 space-y-5 text-foreground/90 leading-[2] font-serif">
              <p>
                הענקיות הנבואית הוטבעה בכל פרק, פסוק ומילה בתנ"ך. התקרבות אליה זוקקת לימוד המותאם לכך.
              </p>
              <p className="font-bold text-foreground">על כן אנו לומדים תנ"ך תוך שאיפה לגדלות:</p>
              <ul className="space-y-4 pr-4">
                <li className="relative pr-5 before:content-['●'] before:absolute before:right-0 before:top-0 before:text-primary before:text-xs">
                  <strong className="text-foreground">התבוננות על כלל הפרק או הספר</strong> בו עוסקים. אנו עמלים על הבנת המבנה השלם והרצף של פרקי התנ"ך.
                </li>
                <li className="relative pr-5 before:content-['●'] before:absolute before:right-0 before:top-0 before:text-primary before:text-xs">
                  <strong className="text-foreground">הכללת שני רבדי התנ"ך:</strong> תורה שבכתב עם תורה שבעל פה. אנו משתדלים לפגוש את דבר ה' על שני אגפיו – פשטי הפסוקים עם דברי המדרשים והמפרשים.
                </li>
                <li className="relative pr-5 before:content-['●'] before:absolute before:right-0 before:top-0 before:text-primary before:text-xs">
                  <strong className="text-foreground">איננו באים לחדש,</strong> אלא להיצמד ככל האפשר לדבר ה'. במידה וזוכים לחידושים, הרי הם נולדים בעקבות כך, במסגרת דרך זו.
                </li>
                <li className="relative pr-5 before:content-['●'] before:absolute before:right-0 before:top-0 before:text-primary before:text-xs">
                  <strong className="text-foreground">השאיפה לשלימות שבדברי התנ"ך</strong> מכוונת אותנו תמיד אל נקודת הרוממות שבדברים – בכל פרשה ופרק אנו ממוקדים בשאלה: מהו הפלא המצוי בהם. ובמילים אחרות: היכן נמצאת בפסוקים הנקודה האלוקית שבן אנוש לא יכל להגיע אליה בעצמו.
                </li>
                <li className="relative pr-5 before:content-['●'] before:absolute before:right-0 before:top-0 before:text-primary before:text-xs">
                  <strong className="text-foreground">חתירה להבנת הנחות היסוד</strong> של דברי הנביאים. דברי התנ"ך נראים לנו לעתים כמובנים מאליהם וכידועים לנו זה מכבר; אולם עיון בהנחות היסוד של הנביאים בונה מחדש את דרך החשיבה שלנו. ההתמקדות ב'מובן מאליו' של התנ"ך כפי העולה בכל פרק ופרשה, מגלה את דבר ה' במלוא גודלו.
                </li>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutPrinciplesSection;
