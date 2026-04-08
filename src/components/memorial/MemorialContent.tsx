import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import saadiaTefillin from "@/assets/saadia-tefillin.png";
import saadiaSoldier from "@/assets/saadia-soldier.png";
import landscapeSunrise from "@/assets/memorial-landscape-sunrise.jpg";
import landscapePath from "@/assets/memorial-landscape-path.jpg";
import torahScroll from "@/assets/memorial-torah-scroll.jpg";

type CardVariant = "cream" | "forest" | "gold" | "sage";

const variantStyles: Record<CardVariant, { bg: string; border: string; shadow: string; titleColor: string; titleBorder: string }> = {
  cream: {
    bg: "linear-gradient(145deg, #FDFCFA 0%, #F5F1EA 100%)",
    border: "1px solid #E3E0DA",
    shadow: "0 4px 30px rgba(56,79,71,0.05)",
    titleColor: "#384F47",
    titleBorder: "1px solid #E3E0DA",
  },
  forest: {
    bg: "linear-gradient(145deg, #1D2E27 0%, #384F47 100%)",
    border: "1px solid rgba(201,164,84,0.15)",
    shadow: "0 8px 40px rgba(29,46,39,0.3)",
    titleColor: "#DFC68E",
    titleBorder: "1px solid rgba(201,164,84,0.2)",
  },
  gold: {
    bg: "linear-gradient(145deg, #F5F1EA 0%, #EDEAE4 50%, #F0EBE3 100%)",
    border: "1px solid rgba(201,164,84,0.25)",
    shadow: "0 4px 30px rgba(201,164,84,0.08)",
    titleColor: "#76604B",
    titleBorder: "1px solid rgba(201,164,84,0.2)",
  },
  sage: {
    bg: "linear-gradient(145deg, #E8F0EB 0%, #D8E6DD 100%)",
    border: "1px solid rgba(114,143,126,0.25)",
    shadow: "0 4px 30px rgba(56,79,71,0.06)",
    titleColor: "#384F47",
    titleBorder: "1px solid rgba(114,143,126,0.25)",
  },
};

const SectionCard = ({
  title,
  children,
  delay = 0,
  variant = "cream",
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
  variant?: CardVariant;
}) => {
  const s = variantStyles[variant];
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.7 }}
      className="rounded-2xl p-8 md:p-10"
      style={{ background: s.bg, border: s.border, boxShadow: s.shadow }}
    >
      <h2
        className="text-xl md:text-2xl font-heading mb-6 pb-4 bg-clip-text"
        style={{
          background: variant === "forest"
            ? "linear-gradient(135deg, #DFC68E, #C9A454)"
            : variant === "gold"
            ? "linear-gradient(135deg, #76604B, #C9A454)"
            : "linear-gradient(135deg, #1D2E27, #384F47, #4B6E58)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          borderBottom: s.titleBorder,
        }}
      >
        {title}
      </h2>
      {children}
    </motion.div>
  );
};

const Paragraph = ({ children, light = false }: { children: React.ReactNode; light?: boolean }) => (
  <p
    className="leading-[2.1] text-[0.95rem] md:text-base font-body"
    style={{ color: light ? "#B0CEBB" : "#384F47" }}
  >
    {children}
  </p>
);

const PhotoBlock = ({
  src,
  alt,
  caption,
  delay = 0,
  aspect = "aspect-[16/10]",
  objectPosition = "object-top",
}: {
  src: string;
  alt: string;
  caption: string;
  delay?: number;
  aspect?: string;
  objectPosition?: string;
}) => (
  <motion.figure
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.7 }}
    className="rounded-2xl overflow-hidden"
    style={{ boxShadow: "0 8px 40px rgba(56,79,71,0.12)" }}
  >
    <img src={src} alt={alt} className={`w-full ${aspect} object-cover ${objectPosition}`} loading="lazy" />
    <figcaption
      className="px-6 py-3 text-sm font-display text-center"
      style={{ background: "linear-gradient(90deg, #384F47, #43614F)", color: "#F0EBE3" }}
    >
      {caption}
    </figcaption>
  </motion.figure>
);

const LandscapeBanner = ({ src, alt, delay = 0 }: { src: string; alt: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 1 }}
    className="rounded-2xl overflow-hidden"
    style={{ boxShadow: "0 4px 30px rgba(56,79,71,0.08)" }}
  >
    <img src={src} alt={alt} className="w-full aspect-[21/8] object-cover" loading="lazy" />
  </motion.div>
);

/* Full-width colored divider between sections */
const SectionDivider = ({ variant = "gold" }: { variant?: "gold" | "forest" | "sage" }) => {
  const colors = {
    gold: { line: "#C9A454", dot: "#DFC68E" },
    forest: { line: "#384F47", dot: "#728F7E" },
    sage: { line: "#728F7E", dot: "#B0CEBB" },
  };
  const c = colors[variant];
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <span className="h-px flex-1 max-w-24" style={{ background: `linear-gradient(to right, transparent, ${c.line})` }} />
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      <span className="h-px flex-1 max-w-24" style={{ background: `linear-gradient(to left, transparent, ${c.line})` }} />
    </div>
  );
};

const MemorialContent = () => (
  <section className="relative py-16 md:py-24">
    {/* Layered background with color zones */}
    <div className="absolute inset-0 pointer-events-none" style={{
      background: `
        linear-gradient(180deg, 
          #F9F7F4 0%, 
          #F5F1EA 8%, 
          #E8F0EB 20%, 
          #F5F1EA 35%, 
          #1D2E27 42%, 
          #384F47 55%, 
          #F5F1EA 58%, 
          #EDEAE4 70%, 
          #E8F0EB 82%, 
          #F0EBE3 100%
        )
      `,
    }} />

    <div className="container relative z-10 max-w-3xl space-y-10">

      {/* ── Section 1: Why Bney Zion — cream card ── */}
      <SectionCard title="הנצחה חיה: למה דווקא ב׳בני ציון׳?" variant="cream">
        <div className="space-y-5">
          <Paragraph>
            רבים הציעו למשפחת דרעי לכתוב ספר תורה לעילוי נשמתו של סעדיה. אבל סעדיה לא היה ספר תורה שמונח בארון הקודש; הוא היה <strong style={{ color: "#1D2E27" }}>ספר תורה מהלך</strong>. איש של תורה חיה, פועמת, שקורא בתורה בדקדוק, שמלמד דף יומי, ושפותח גמרא על הטנק בלב עזה.
          </Paragraph>
          <Paragraph>
            בארגון "בני ציון", שמפעיל את אתר התנ"ך הגדול ברשת אליו נכנסים מאות אלפי לומדים בשנה, הבנו שההנצחה הראויה ביותר לדמות כזו לא יכולה להיות דוממת. היא חייבת להיות מקום שבו התורה שלו ממשיכה להילמד בכל יום, על ידי רבבות עמך ישראל – מחיילים בדרכים ועד מורים בכיתות.
          </Paragraph>
          <Paragraph>
            החיבור בין החזון של "בני ציון" להנגשת התנ"ך כ-GPS של עם ישראל, לבין דמותו של סעדיה שחי את הפסוקים הלכה למעשה, הוא טבעי ושלם. <strong style={{ color: "#1D2E27" }}>כאן, תורתו ממשיכה לחיות.</strong>
          </Paragraph>
        </div>
      </SectionCard>

      {/* ── Photo: Soldier ── */}
      <PhotoBlock src={saadiaSoldier} alt="סעדיה דרעי הי״ד" caption="סעדיה דרעי הי״ד, לוחם בחטיבת אלכסנדרוני" delay={0.05} />

      <SectionDivider variant="sage" />

      {/* ── Section 2: Roots — sage-toned card ── */}
      <SectionCard title="שורשים של אהבה: ה-GPS של עם ישראל" variant="sage" delay={0.05}>
        <div className="space-y-5">
          <Paragraph>
            סעדיה (27), בנם של חיים וללי מראשי הקהילה בישוב עלי, גדל על ברכי האהבה לתורה, לעם ולתקומת ישראל. אמו, שעלתה לארץ מצרפת בעקבות הקריאה "לך לך", חינכה את ילדיה שהתנ"ך הוא המצפן דרכו מנווטים את החיים בארץ ישראל.
          </Paragraph>
          <Paragraph>
            מגיל צעיר, סעדיה הפך את המצפן הזה לדרך חיים. הוא בלט כבעל קורא בחסד עליון, שהקפיד על כל אות ותג בתורה. אהבתו לקריאת התורה ולציבור הייתה כה גדולה, עד שביום הכיפורים היה מדלג בין בתי כנסת שונים כדי לזכות לקרוא בתורה עבור כולם.
          </Paragraph>
        </div>
      </SectionCard>

      {/* ── Landscape: Sunrise ── */}
      <LandscapeBanner src={landscapeSunrise} alt="נוף הרי שומרון בזריחה" />

      {/* ── Section 3: Life story — DARK forest card ── */}
      <SectionCard title="ספרא וסייפא: הבית ביפו והגמרא על הטנק" variant="forest" delay={0.05}>
        <div className="space-y-5">
          <Paragraph light>
            יחד עם אשתו רחלי, הקים סעדיה את ביתו ביפו, מתוך רצון לחיות חיי תורה שמחוברים לעם על כל גווניו. הוא היה אברך שקדן שלמד בהתמדה למבחני הרבנות, ולצד זאת החל את לימודיו לתואר ראשון בהוראה. הוא לא שמר את התורה לעצמו – הוא מסר שיעורי "דף יומי" לתלמידי הישיבה במסירות עצומה. מעל הכל, סעדיה היה אבא אוהב, נוכח ומסור להללי ולינון הקטנים (ולאחר נופלו התברר שרחלי נושאת ברחמה תינוק נוסף).
          </Paragraph>
          <Paragraph light>
            בשמחת תורה התייצב סעדיה מיד בצו 8 כלוחם בחטיבת אלכסנדרוני. התמונות שפורסמו מהקרבות בעזה – סעדיה עטור בתפילין, או יושב על טנק בציוד לחימה מלא, קורן מאושר ושוקע בלימוד גמרא – הפכו לסמל המובהק ביותר של תורת ארץ ישראל.
          </Paragraph>

          {/* Inline quote on dark */}
          <div
            className="rounded-xl p-5 text-center"
            style={{ background: "rgba(201,164,84,0.08)", border: "1px solid rgba(201,164,84,0.2)" }}
          >
            <p className="text-lg leading-relaxed font-body" style={{ color: "#DFC68E" }}>
              "אנחנו לא מפחדים למות כשיש לנו משימה גדולה"
            </p>
            <p className="text-xs mt-2 font-display" style={{ color: "#B9A87A" }}>— סעדיה, מתוך שיחה עם הוריו</p>
          </div>

          <Paragraph light>
            הוא נפל בקרב במסדרון נצרים מפגיעת פצמ״ר, בי״ד בסיוון תשפ״ד (20 ביוני 2024).
          </Paragraph>
        </div>
      </SectionCard>

      {/* ── Photo: Tefillin in Gaza ── */}
      <PhotoBlock src={saadiaTefillin} alt="סעדיה מניח תפילין בעזה" caption="לומד בכל מצב — סעדיה עטור תפילין בין הקרבות בעזה" delay={0.05} />

      <SectionDivider variant="gold" />

      {/* ── Torah scroll landscape ── */}
      <LandscapeBanner src={torahScroll} alt="ספר תורה פתוח" />

      {/* ── Section 4: Torah Treasures — warm gold card ── */}
      <SectionCard title="אוצרותיו של סעדיה" variant="gold" delay={0.05}>
        <div className="space-y-5">
          <p className="text-sm font-display" style={{ color: "#76604B" }}>
            ויטרינה דיגיטלית — כאן ייפגשו לומדי אתר בני ציון עם כתביו וחידושיו המקוריים של סעדיה
          </p>
          <div
            className="rounded-xl p-6 text-center"
            style={{ border: "1px dashed rgba(201,164,84,0.35)", background: "rgba(201,164,84,0.06)" }}
          >
            <p className="text-sm leading-relaxed font-body" style={{ color: "#76604B" }}>
              בקרוב: סריקות מכתבי ידו של סעדיה, חידושי תורה מקוריים, וקישורים אוטומטיים לפרקים באתר.
              <br />
              כל רעיון הקשור לפסוק מסוים יקבל קישור לפרק הרלוונטי, כך שמי שלומד את הפרק יראה פנינה מתורתו.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ── Landscape: Path ── */}
      <LandscapeBanner src={landscapePath} alt="שביל עתיק בנוף ישראלי" />

      <SectionDivider variant="forest" />

      {/* ── Stats — sage background ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          { value: "2,500+", label: "שיעורים באתר" },
          { value: "50+", label: "רבנים מלמדים" },
          { value: "∞", label: "לומדים ברחבי העולם" },
        ].map((stat, i) => (
          <div
            key={i}
            className="rounded-xl p-5 text-center"
            style={{
              background: "linear-gradient(145deg, #E8F0EB, #D8E6DD)",
              border: "1px solid rgba(114,143,126,0.3)",
            }}
          >
            <p className="text-2xl md:text-3xl font-heading mb-1" style={{ color: "#1D2E27" }}>{stat.value}</p>
            <p className="text-xs font-display" style={{ color: "#4B6E58" }}>{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── CTA ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center pt-4"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-display text-sm transition-all hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #C9A454, #B8885F)",
            color: "#1D2E27",
            boxShadow: "0 4px 20px rgba(201,164,84,0.3)",
            fontWeight: 600,
          }}
        >
          המשיכו ללמוד באתר התנ״ך – לעילוי נשמתו
        </Link>
      </motion.div>

      {/* ── Bottom ornament ── */}
      <div className="flex items-center justify-center gap-4 pt-8">
        <span className="h-px w-20" style={{ background: "#C9A454", opacity: 0.3 }} />
        <span className="text-xs font-display" style={{ color: "#B9A87A" }}>תהא נשמתו צרורה בצרור החיים</span>
        <span className="h-px w-20" style={{ background: "#C9A454", opacity: 0.3 }} />
      </div>
    </div>
  </section>
);

export default MemorialContent;
