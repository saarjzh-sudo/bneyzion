/**
 * /design-memorial-saadia — Memorial page for סעדיה יעקב דרעי הי״ד, redesigned.
 *
 * Bio + quotes pulled verbatim from the existing MemorialContent.tsx (the
 * family-approved text). Real photos from src/assets/saadia-*.png are
 * reused directly (no Facebook scraping — those photos belong to the
 * photographers; we use the assets the project already has).
 *
 * NEW image slots are clearly marked as PLACEHOLDER — Saar will populate
 * them by uploading to /public/images/saadia/ once the family approves
 * which photos to use publicly.
 */
import { Flame, Heart, BookOpen, Camera, Quote, Sparkles, ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useTopSeries } from "@/hooks/useTopSeries";
import { useLessonsBySeries } from "@/hooks/useLessonsBySeries";

import saadiaPortrait from "@/assets/saadia-soldier.png";
import saadiaTefillin from "@/assets/saadia-tefillin.png";

// ────────────────────────────────────────────────────────────────────────
const MEMORIAL = {
  fullName: "סעדיה יעקב דרעי",
  honorific: "הי״ד",
  age: 27,
  hebrewDate: "י״ד בסיוון תשפ״ד",
  gregorianDate: "20 ביוני 2024",
  unit: "חטיבת אלכסנדרוני",
  fallLocation: "מסדרון נצרים, רצועת עזה",
  cause: "פגיעת פצמ״ר",
  parents: "חיים וללי דרעי",
  spouse: "רחלי",
  children: "הללי וינון (ותינוק שנולד לאחר נופלו)",
  hometown: "עלי (ילדות) · יפו (משפחה משלו)",
  unit_role: "לוחם, אברך, בעל קורא בחסד עליון",
};

const motherQuote = `"מי שיש לו 'למה' חזק, ידע להתמודד עם כל 'איך', ואני מוסיפה: גם עם כל 'איכה'. הלמה החזק שלנו מתחיל שם, בתנ״ך. זה מה שנותן לנו כוחות. וזה היה הבסיס של סעדיה."`;
const motherAttribution = "— מתוך דבריה של אמו, ללי";

const saadiaQuote = `"אנחנו לא מפחדים למות כשיש לנו משימה גדולה"`;
const saadiaAttribution = "— סעדיה, מתוך שיחה עם הוריו";

const bioParagraphs = [
  `סעדיה (27), בנם של חיים וללי מראשי הקהילה בישוב עלי, גדל על ברכי האהבה לתורה, לעם ולתקומת ישראל. אמו, שעלתה לארץ מצרפת בעקבות הקריאה "לך לך", חינכה את ילדיה שהתנ"ך הוא המצפן דרכו מנווטים את החיים בארץ ישראל.`,
  `מגיל צעיר, סעדיה הפך את המצפן הזה לדרך חיים. הוא בלט כבעל קורא בחסד עליון, שהקפיד על כל אות ותג בתורה. אהבתו לקריאת התורה ולציבור הייתה כה גדולה, עד שביום הכיפורים היה מדלג בין בתי כנסת שונים כדי לזכות לקרוא בתורה עבור כולם.`,
];

const lifeStoryParagraphs = [
  `יחד עם אשתו רחלי, הקים סעדיה את ביתו ביפו, מתוך רצון לחיות חיי תורה שמחוברים לעם על כל גווניו. הוא היה אברך שקדן שלמד בהתמדה למבחני הרבנות, ולצד זאת החל את לימודיו לתואר ראשון בהוראה. הוא לא שמר את התורה לעצמו – הוא מסר שיעורי "דף יומי" לתלמידי הישיבה במסירות עצומה.`,
  `מעל הכל, סעדיה היה אבא אוהב, נוכח ומסור להללי ולינון הקטנים (ולאחר נופלו התברר שרחלי נושאת ברחמה תינוק נוסף).`,
  `בשמחת תורה התייצב סעדיה מיד בצו 8 כלוחם בחטיבת אלכסנדרוני. התמונות שפורסמו מהקרבות בעזה – סעדיה עטור בתפילין, או יושב על טנק בציוד לחימה מלא, קורן מאושר ושוקע בלימוד גמרא – הפכו לסמל המובהק ביותר של תורת ארץ ישראל.`,
];

// ────────────────────────────────────────────────────────────────────────
export default function DesignPreviewMemorialSaadia() {
  const { data: topSeries = [] } = useTopSeries(3);
  const memorialSeries = (topSeries as any[])[0];
  const { data: dedicatedLessons = [] } = useLessonsBySeries(memorialSeries?.id);

  return (
    <DesignLayout transparentHeader overlapHero>
      {/* ─── Hero — navy variant, deeply solemn ─── */}
      <div
        style={{
          minHeight: 600,
          position: "relative",
          overflow: "hidden",
          marginTop: -96,
          background: gradients.navyHero,
        }}
      >
        {/* Background portrait — heavily darkened */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${saadiaPortrait})`,
            backgroundSize: "cover",
            backgroundPosition: "center 25%",
            opacity: 0.18,
            filter: "brightness(0.6) saturate(0.7)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 40%, transparent 15%, rgba(0,0,0,0.55) 80%), linear-gradient(180deg, rgba(26,39,68,0.5) 0%, rgba(15,26,48,0.85) 100%)",
          }}
        />

        {/* Gentle shimmering candle particles (CSS only) */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 30%, rgba(232,213,160,0.08) 0%, transparent 8%), radial-gradient(circle at 75% 60%, rgba(232,213,160,0.06) 0%, transparent 6%), radial-gradient(circle at 50% 80%, rgba(232,213,160,0.05) 0%, transparent 10%)",
          }}
        />

        <div
          dir="rtl"
          style={{
            position: "relative",
            minHeight: 600,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "150px 1.5rem 4rem",
            maxWidth: 880,
            margin: "0 auto",
          }}
        >
          {/* Small portrait */}
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: "50%",
              border: `4px solid ${colors.goldShimmer}`,
              boxShadow: `0 0 60px rgba(232,213,160,0.35), 0 8px 32px rgba(0,0,0,0.5)`,
              backgroundImage: `url(${saadiaPortrait})`,
              backgroundSize: "cover",
              backgroundPosition: "center 20%",
              marginBottom: "1.75rem",
              animation: "subtleGlow 4s ease-in-out infinite",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
              marginBottom: "1.25rem",
            }}
          >
            <Flame style={{ width: 14, height: 14, color: colors.goldShimmer }} />
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                color: colors.goldShimmer,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              לעילוי נשמת
            </span>
            <Flame style={{ width: 14, height: 14, color: colors.goldShimmer }} />
          </div>

          {/* Gold divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1rem" }}>
            <div style={{ width: 60, height: 1, background: "rgba(232,213,160,0.45)" }} />
            <div style={{ width: 8, height: 8, background: colors.goldShimmer, transform: "rotate(45deg)" }} />
            <div style={{ width: 60, height: 1, background: "rgba(232,213,160,0.45)" }} />
          </div>

          <h1
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "clamp(2.4rem, 5.5vw, 4.2rem)",
              color: "rgba(255,255,255,0.97)",
              textShadow: "0 4px 30px rgba(0,0,0,0.5), 0 2px 12px rgba(232,213,160,0.18)",
              margin: "0 0 0.4rem",
              lineHeight: 1.1,
              fontStyle: "italic",
            }}
          >
            {MEMORIAL.fullName}
          </h1>

          <div
            style={{
              fontFamily: fonts.display,
              fontSize: "clamp(1.5rem, 3vw, 2.4rem)",
              color: colors.goldShimmer,
              fontWeight: 600,
              marginBottom: "1.75rem",
              letterSpacing: "0.05em",
            }}
          >
            {MEMORIAL.honorific}
          </div>

          <div
            style={{
              fontFamily: fonts.body,
              fontSize: "1rem",
              color: "rgba(255,255,255,0.72)",
              marginBottom: "2.25rem",
              letterSpacing: "0.05em",
            }}
          >
            {MEMORIAL.hebrewDate} · {MEMORIAL.gregorianDate} · בן {MEMORIAL.age}
          </div>

          {/* Mother's quote — glass card */}
          <div
            style={{
              maxWidth: 680,
              padding: "1.75rem 2rem",
              borderRadius: radii.xl,
              background: "rgba(26,39,68,0.55)",
              backdropFilter: "blur(16px) saturate(150%)",
              WebkitBackdropFilter: "blur(16px) saturate(150%)",
              border: "1px solid rgba(232,213,160,0.18)",
              boxShadow: "0 12px 48px rgba(0,0,0,0.3)",
            }}
          >
            <Quote style={{ width: 22, height: 22, color: "rgba(232,213,160,0.5)", margin: "0 auto 1rem", display: "block" }} />
            <p
              style={{
                fontFamily: fonts.display,
                fontSize: "clamp(0.95rem, 1.6vw, 1.1rem)",
                lineHeight: 2,
                color: "rgba(255,255,255,0.92)",
                margin: 0,
                fontStyle: "italic",
              }}
            >
              {motherQuote}
            </p>
            <div
              style={{
                marginTop: "1rem",
                fontFamily: fonts.body,
                fontSize: "0.82rem",
                color: "rgba(232,213,160,0.7)",
              }}
            >
              {motherAttribution}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes subtleGlow {
            0%, 100% { box-shadow: 0 0 60px rgba(232,213,160,0.35), 0 8px 32px rgba(0,0,0,0.5); }
            50% { box-shadow: 0 0 80px rgba(232,213,160,0.5), 0 8px 32px rgba(0,0,0,0.5); }
          }
        `}</style>
      </div>

      {/* ─── Section 1: Why Bnei Zion ─── */}
      <section style={{ background: colors.parchment, padding: "5rem 1.5rem 3rem" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }} dir="rtl">
          <SectionEyebrow color={colors.goldDark}>הנצחה חיה</SectionEyebrow>
          <SectionTitle>למה דווקא ב'בני ציון'?</SectionTitle>

          <div style={{ fontFamily: fonts.body, fontSize: "1.05rem", lineHeight: 2.15, color: colors.textMid }}>
            <p style={{ margin: "0 0 1.25rem" }}>
              רבים הציעו למשפחת דרעי לכתוב ספר תורה לעילוי נשמתו של סעדיה. אבל סעדיה לא היה ספר תורה שמונח בארון הקודש; הוא היה{" "}
              <strong style={{ color: colors.textDark }}>ספר תורה מהלך</strong>. איש של תורה חיה, פועמת, שקורא בתורה בדקדוק, שמלמד דף יומי, ושפותח גמרא על הטנק בלב עזה.
            </p>
            <p style={{ margin: "0 0 1.25rem" }}>
              בארגון "בני ציון", שמפעיל את אתר התנ"ך הגדול ברשת אליו נכנסים מאות אלפי לומדים בשנה, הבנו שההנצחה הראויה ביותר לדמות כזו לא יכולה להיות דוממת. היא חייבת להיות מקום שבו התורה שלו ממשיכה להילמד בכל יום, על ידי רבבות עמך ישראל – מחיילים בדרכים ועד מורים בכיתות.
            </p>
            <p style={{ margin: 0 }}>
              החיבור בין החזון של "בני ציון" להנגשת התנ"ך כ-GPS של עם ישראל, לבין דמותו של סעדיה שחי את הפסוקים הלכה למעשה, הוא טבעי ושלם.{" "}
              <strong style={{ color: colors.textDark }}>כאן, תורתו ממשיכה לחיות.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ─── Photo strip: real portrait + tefillin slot ─── */}
      <section style={{ background: colors.parchment, padding: "1rem 1.5rem 4rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }} dir="rtl">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.25rem",
            }}
            className="photo-strip-2"
          >
            <Photo
              src={saadiaPortrait}
              caption="סעדיה דרעי הי״ד"
              subcaption="לוחם בחטיבת אלכסנדרוני"
              objectPos="center 20%"
            />
            <Photo
              src={saadiaTefillin}
              caption="לומד בכל מצב"
              subcaption="עטור תפילין בין הקרבות בעזה"
              objectPos="center 20%"
            />
          </div>
        </div>
      </section>

      {/* ─── Section 2: Roots — sage card ─── */}
      <section style={{ background: "#E8F0EB", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }} dir="rtl">
          <SectionEyebrow color={colors.oliveMain}>שורשים של אהבה</SectionEyebrow>
          <SectionTitle>ה-GPS של עם ישראל</SectionTitle>

          <div style={{ fontFamily: fonts.body, fontSize: "1.05rem", lineHeight: 2.15, color: colors.textMid }}>
            {bioParagraphs.map((p, i) => (
              <p key={i} style={{ margin: i === bioParagraphs.length - 1 ? 0 : "0 0 1.25rem" }}>
                {p}
              </p>
            ))}
          </div>

          {/* Family details card */}
          <div
            style={{
              marginTop: "2rem",
              padding: "1.5rem 1.75rem",
              background: "rgba(255,255,255,0.7)",
              borderRadius: radii.lg,
              border: `1px solid rgba(91,110,58,0.2)`,
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
              <Detail label="הורים" value={MEMORIAL.parents} />
              <Detail label="אישתו" value={MEMORIAL.spouse} />
              <Detail label="ילדים" value={MEMORIAL.children} />
              <Detail label="מקום מגורים" value={MEMORIAL.hometown} />
              <Detail label="יחידה" value={MEMORIAL.unit} />
              <Detail label="גיל" value={`${MEMORIAL.age}`} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 3: Life Story — DARK forest card ─── */}
      <section style={{ background: gradients.warmDark, padding: "5rem 1.5rem", color: "white" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }} dir="rtl">
          <SectionEyebrow color={colors.goldShimmer}>ספרא וסייפא</SectionEyebrow>
          <SectionTitle dark>הבית ביפו והגמרא על הטנק</SectionTitle>

          <div style={{ fontFamily: fonts.body, fontSize: "1.05rem", lineHeight: 2.15, color: "rgba(255,255,255,0.85)" }}>
            {lifeStoryParagraphs.map((p, i) => (
              <p key={i} style={{ margin: i === lifeStoryParagraphs.length - 1 ? "0 0 1.5rem" : "0 0 1.25rem" }}>
                {p}
              </p>
            ))}
          </div>

          {/* Saadia's own quote */}
          <div
            style={{
              padding: "1.75rem 2rem",
              borderRadius: radii.lg,
              background: "rgba(232,213,160,0.08)",
              border: "1px solid rgba(232,213,160,0.2)",
              textAlign: "center",
              margin: "1rem 0 1.5rem",
            }}
          >
            <Quote style={{ width: 20, height: 20, color: "rgba(232,213,160,0.5)", margin: "0 auto 0.85rem", display: "block" }} />
            <p
              style={{
                fontFamily: fonts.display,
                fontSize: "1.2rem",
                lineHeight: 1.7,
                color: colors.goldShimmer,
                margin: 0,
                fontStyle: "italic",
              }}
            >
              {saadiaQuote}
            </p>
            <div
              style={{
                marginTop: "0.85rem",
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                color: "rgba(232,213,160,0.65)",
              }}
            >
              {saadiaAttribution}
            </div>
          </div>

          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "1rem",
              lineHeight: 2,
              color: "rgba(255,255,255,0.7)",
              margin: 0,
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            הוא נפל בקרב ב{MEMORIAL.fallLocation}, מ{MEMORIAL.cause}, ב{MEMORIAL.hebrewDate} ({MEMORIAL.gregorianDate}).
          </p>
        </div>
      </section>

      {/* ─── Photo gallery slots — for additional photos to be added ─── */}
      <section style={{ background: colors.parchment, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }} dir="rtl">
          <SectionEyebrow color={colors.goldDark}>אלבום זיכרון</SectionEyebrow>
          <SectionTitle>תמונות מחייו</SectionTitle>

          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "0.92rem",
              color: colors.textMuted,
              maxWidth: 580,
              marginBottom: "2rem",
              lineHeight: 1.85,
            }}
          >
            המשפחה משתפת תמונות נבחרות מחייו — בלימוד, בצבא, עם רחלי וילדיו, ובמקומות אהובים. ניתן להוסיף עוד תמונות באישור המשפחה.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "1.25rem",
            }}
          >
            <Photo
              src={saadiaPortrait}
              caption="סעדיה ז״ל"
              subcaption="כריזמה ועדינות"
              aspect="4 / 5"
              objectPos="center 20%"
            />
            <Photo
              src={saadiaTefillin}
              caption="עטור תפילין"
              subcaption="בין הקרבות בעזה"
              aspect="4 / 5"
              objectPos="center 20%"
            />
            <PhotoSlot
              label="עם המשפחה"
              hint="תמונה משפחתית של סעדיה, רחלי, הללי וינון"
              aspect="4 / 5"
            />
            <PhotoSlot
              label="קריאה בתורה"
              hint="כבעל קורא בבית הכנסת"
              aspect="4 / 5"
            />
            <PhotoSlot
              label="בעת הקרבות"
              hint="עם הצוות / על הטנק / בנגב"
              aspect="4 / 5"
            />
            <PhotoSlot
              label="מתורתו"
              hint="כתב יד / חידוש תורה / דף לימוד"
              aspect="4 / 5"
            />
          </div>

          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.25rem 1.5rem",
              borderRadius: radii.md,
              background: "rgba(196,162,101,0.08)",
              border: `1px dashed rgba(196,162,101,0.4)`,
              fontFamily: fonts.body,
              fontSize: "0.82rem",
              color: colors.textMuted,
              lineHeight: 1.7,
            }}
          >
            <strong style={{ color: colors.goldDark }}>הערה למפתח:</strong> ארבעת ה-slots הריקים מציינים מקומות שיוזנו עם תמונות נוספות שתקבל מהמשפחה. ניתן לשמור אותן ב-<code style={{ background: "rgba(0,0,0,0.04)", padding: "0.1rem 0.35rem", borderRadius: 4 }}>/public/images/saadia/</code> ולעדכן את הקובץ.
          </div>
        </div>
      </section>

      {/* ─── Section 4: His Torah Treasures ─── */}
      <section style={{ background: colors.parchmentDark, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }} dir="rtl">
          <SectionEyebrow color={colors.goldDark}>אוצרותיו</SectionEyebrow>
          <SectionTitle>תורתו של סעדיה</SectionTitle>

          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "1rem",
              lineHeight: 1.95,
              color: colors.textMid,
              marginBottom: "1.5rem",
            }}
          >
            ויטרינה דיגיטלית — כאן ייפגשו לומדי אתר בני ציון עם כתביו וחידושיו המקוריים של סעדיה.
            כל רעיון הקשור לפסוק מסוים יקבל קישור לפרק הרלוונטי באתר, כך שמי שלומד את הפרק יראה פנינה מתורתו.
          </p>

          <div
            style={{
              padding: "2rem 2.25rem",
              borderRadius: radii.xl,
              background: "white",
              border: `2px dashed rgba(196,162,101,0.4)`,
              textAlign: "center",
            }}
          >
            <BookOpen style={{ width: 36, height: 36, color: colors.goldDark, margin: "0 auto 0.85rem", opacity: 0.6 }} />
            <div
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: "1.1rem",
                color: colors.textDark,
                marginBottom: "0.5rem",
              }}
            >
              בקרוב
            </div>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "0.92rem",
                lineHeight: 1.85,
                color: colors.textMuted,
                margin: 0,
              }}
            >
              סריקות מכתבי ידו של סעדיה, חידושי תורה מקוריים, וקישורים אוטומטיים לפרקים באתר.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Lessons in his memory ─── */}
      <section style={{ background: colors.parchment, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "2rem", textAlign: "center" }}>
            <Sparkles style={{ width: 28, height: 28, color: colors.goldDark, margin: "0 auto 0.5rem" }} />
            <SectionEyebrow color={colors.goldDark}>שיעורים לזכרו</SectionEyebrow>
            <SectionTitle>אלפי לומדים, יום-יום, לעילוי נשמתו</SectionTitle>
          </div>

          {/* Stats strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              marginBottom: "2.5rem",
              maxWidth: 880,
              margin: "0 auto 2.5rem",
            }}
            dir="rtl"
          >
            <Stat icon={<BookOpen size={22} />} value="11,000+" label="שיעורים באתר" />
            <Stat icon={<Heart size={22} />} value="200+" label="רבנים מלמדים" />
            <Stat icon={<Sparkles size={22} />} value="∞" label="לומדים ברחבי העולם" />
          </div>

          {/* Sample lessons list */}
          {(dedicatedLessons as any[]).length > 0 && (
            <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: "0.65rem", maxWidth: 760, margin: "0 auto" }}>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.82rem",
                  color: colors.textMuted,
                  textAlign: "center",
                  marginBottom: "0.5rem",
                }}
              >
                שיעורים שנלמדו לעילוי נשמתו השבוע
              </div>
              {(dedicatedLessons as any[]).slice(0, 5).map((l: any) => (
                <div
                  key={l.id}
                  style={{
                    background: "white",
                    borderRadius: radii.md,
                    padding: "0.85rem 1rem",
                    border: `1px solid rgba(139,111,71,0.08)`,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  <Flame style={{ width: 16, height: 16, color: colors.goldDark, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        color: colors.textDark,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {l.title}
                    </div>
                    <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>
                      {l.rabbis?.name || ""} · {memorialSeries?.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Closing CTA — gold gradient ─── */}
      <section style={{ background: gradients.warmDark, padding: "5rem 1.5rem", color: "white", textAlign: "center" }} dir="rtl">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Flame style={{ width: 36, height: 36, color: colors.goldShimmer, margin: "0 auto 1.25rem" }} />
          <h2
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
              margin: "0 0 1.25rem",
              fontStyle: "italic",
              lineHeight: 1.3,
            }}
          >
            המשך ללמוד תורה — לעילוי נשמתו
          </h2>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "1rem",
              lineHeight: 1.85,
              color: "rgba(255,255,255,0.7)",
              marginBottom: "2rem",
            }}
          >
            כל שיעור שנלמד באתר נצרב כשעת לימוד לעילוי נשמתו. הצטרפו ללימוד היומי, הקדישו שיעור, או תרמו להמשך הפרויקט.
          </p>

          <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/series"
              style={{
                padding: "0.85rem 1.8rem",
                borderRadius: radii.lg,
                background: gradients.goldButton,
                color: "white",
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "1rem",
                textDecoration: "none",
                boxShadow: shadows.goldGlow,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <BookOpen size={16} />
              התחל ללמוד
            </Link>
            <Link
              to="/donate"
              style={{
                padding: "0.85rem 1.6rem",
                borderRadius: radii.lg,
                border: "1.5px solid rgba(232,213,160,0.4)",
                background: "rgba(232,213,160,0.08)",
                color: colors.goldShimmer,
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "0.95rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Heart size={16} />
              תרומה לזכרו
            </Link>
          </div>

          <div
            style={{
              marginTop: "3rem",
              paddingTop: "2rem",
              borderTop: "1px solid rgba(232,213,160,0.15)",
              fontFamily: fonts.display,
              fontStyle: "italic",
              fontSize: "0.95rem",
              color: "rgba(232,213,160,0.7)",
              letterSpacing: "0.05em",
            }}
          >
            תהא נשמתו צרורה בצרור החיים
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .photo-strip-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </DesignLayout>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────
function SectionEyebrow({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div
      style={{
        fontFamily: fonts.body,
        fontSize: "0.75rem",
        fontWeight: 700,
        color,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        marginBottom: "0.6rem",
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <h2
      style={{
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
        color: dark ? colors.goldShimmer : colors.textDark,
        margin: "0 0 1.5rem",
        lineHeight: 1.25,
      }}
    >
      {children}
    </h2>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: "0.7rem",
          color: colors.oliveDark,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 700,
          marginBottom: "0.2rem",
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: fonts.display, fontSize: "0.95rem", color: colors.textDark, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}

function Photo({
  src,
  caption,
  subcaption,
  aspect = "4 / 3",
  objectPos = "center",
}: {
  src: string;
  caption: string;
  subcaption?: string;
  aspect?: string;
  objectPos?: string;
}) {
  return (
    <figure
      style={{
        margin: 0,
        borderRadius: radii.xl,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(45,31,14,0.12)",
        background: "white",
      }}
    >
      <div style={{ aspectRatio: aspect, overflow: "hidden", background: colors.parchmentDark }}>
        <img
          src={src}
          alt={caption}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: objectPos,
          }}
        />
      </div>
      <figcaption
        style={{
          padding: "0.95rem 1.1rem",
          background: gradients.warmDark,
          color: "white",
          fontFamily: fonts.display,
          fontSize: "0.95rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontWeight: 700 }}>{caption}</div>
        {subcaption && (
          <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.goldShimmer, marginTop: "0.2rem" }}>
            {subcaption}
          </div>
        )}
      </figcaption>
    </figure>
  );
}

function PhotoSlot({ label, hint, aspect = "4 / 3" }: { label: string; hint: string; aspect?: string }) {
  return (
    <figure
      style={{
        margin: 0,
        borderRadius: radii.xl,
        overflow: "hidden",
        background: "rgba(196,162,101,0.06)",
        border: `2px dashed rgba(196,162,101,0.4)`,
      }}
    >
      <div
        style={{
          aspectRatio: aspect,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <ImageIcon style={{ width: 36, height: 36, color: colors.goldDark, opacity: 0.5, marginBottom: "0.65rem" }} />
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: "0.95rem",
            color: colors.goldDark,
            marginBottom: "0.4rem",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: "0.78rem",
            color: colors.textMuted,
            lineHeight: 1.5,
          }}
        >
          {hint}
        </div>
        <div
          style={{
            marginTop: "0.85rem",
            fontFamily: fonts.body,
            fontSize: "0.7rem",
            color: colors.goldDark,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          <Camera size={11} />
          סלוט לתמונה
        </div>
      </div>
    </figure>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: radii.lg,
        padding: "1.25rem 1.4rem",
        border: `1px solid rgba(139,111,71,0.1)`,
        textAlign: "center",
        boxShadow: shadows.cardSoft,
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", color: colors.goldDark, marginBottom: "0.5rem" }}>
        {icon}
      </div>
      <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.6rem", color: colors.textDark, marginBottom: "0.15rem" }}>
        {value}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted, letterSpacing: "0.05em" }}>
        {label}
      </div>
    </div>
  );
}
