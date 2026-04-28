/**
 * /design-layout — Showcase page for the v2 design system.
 *
 * Demonstrates DesignLayout (Header + Footer + MobileBottomNav) with all
 * 4 hero variants stacked, plus a sample content block, so Saar can review
 * the entire chrome on dry land before any production swap.
 *
 * This page is dev-only (gated in App.tsx by `import.meta.env.DEV`).
 */
import { BookOpen, Heart, Users, Flame } from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import { colors, fonts, gradients, shadows, radii, seriesFamilies } from "@/lib/designTokens";

const SECTION_HEADING_STYLE: React.CSSProperties = {
  fontFamily: fonts.display,
  fontWeight: 800,
  fontSize: "clamp(1.4rem, 2.6vw, 2rem)",
  color: colors.textDark,
  textAlign: "center",
  marginBottom: "0.5rem",
};

const SECTION_SUB_STYLE: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: "0.95rem",
  color: colors.textMuted,
  textAlign: "center",
  marginBottom: "2.5rem",
  maxWidth: 640,
  marginInline: "auto",
};

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      style={{
        padding: "0.75rem 1.8rem",
        borderRadius: radii.lg,
        border: "none",
        background: gradients.goldButton,
        color: "white",
        fontFamily: fonts.accent,
        fontWeight: 700,
        fontSize: "1rem",
        cursor: "pointer",
        boxShadow: shadows.goldGlow,
      }}
    >
      {children}
    </button>
  );
}

function GlassButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      style={{
        padding: "0.75rem 1.8rem",
        borderRadius: radii.lg,
        border: "1.5px solid rgba(255,255,255,0.35)",
        background: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        color: "white",
        fontFamily: fonts.accent,
        fontSize: "0.95rem",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function PaleButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      style={{
        padding: "0.7rem 1.5rem",
        borderRadius: radii.lg,
        border: `1.5px solid ${colors.goldDark}`,
        background: "transparent",
        color: colors.textDark,
        fontFamily: fonts.accent,
        fontWeight: 600,
        fontSize: "0.95rem",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function FamilyCard({
  familyKey,
  description,
}: {
  familyKey: keyof typeof seriesFamilies;
  description: string;
}) {
  const fam = seriesFamilies[familyKey];
  return (
    <div
      style={{
        background: "white",
        borderRadius: radii.xl,
        padding: "1.4rem",
        border: `1px solid rgba(139,111,71,0.10)`,
        boxShadow: shadows.cardSoft,
        transition: "all 0.28s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = shadows.cardHover;
        e.currentTarget.style.borderColor = "rgba(139,111,71,0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = shadows.cardSoft;
        e.currentTarget.style.borderColor = "rgba(139,111,71,0.10)";
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "0.3rem 0.7rem",
          borderRadius: radii.sm,
          background: fam.badgeBg,
          color: fam.badgeFg,
          fontFamily: fonts.body,
          fontSize: "0.7rem",
          letterSpacing: "0.1em",
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: "0.65rem",
        }}
      >
        {fam.label}
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: "1.1rem",
          color: colors.textDark,
          marginBottom: "0.4rem",
        }}
      >
        משפחת עיצוב: {fam.label}
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: "0.85rem",
          color: colors.textMuted,
          lineHeight: 1.65,
        }}
      >
        {description}
      </div>
      <div
        style={{
          marginTop: "1rem",
          paddingTop: "1rem",
          borderTop: "1px solid rgba(139,111,71,0.08)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontFamily: fonts.body,
          fontSize: "0.78rem",
          color: colors.textSubtle,
        }}
      >
        <span>וריאנט הירו:</span>
        <span style={{ color: fam.badgeFg, fontWeight: 700 }}>{fam.heroVariant}</span>
      </div>
    </div>
  );
}

export default function DesignPreviewLayout() {
  return (
    <DesignLayout transparentHeader={false}>
      {/* ─── 1. Parchment hero (default for most pages) ─────────────────── */}
      <DesignPageHero
        variant="parchment"
        eyebrow="Sandbox / /design-layout"
        title="ספריית העיצוב v2 — תצוגה חיה"
        subtitle="כל ארבעת וריאנטי ההירו, ה-Header, ה-Footer וה-Mobile Nav החדשים. אין שום שינוי באתר עצמו — הדף הזה הוא רק לבדיקה ויזואלית לפני אישור."
        icon={<BookOpen style={{ width: 28, height: 28 }} />}
      >
        <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
          <PaleButton>גלול למשפחות</PaleButton>
          <button
            style={{
              padding: "0.7rem 1.5rem",
              borderRadius: radii.lg,
              border: "none",
              background: gradients.goldButton,
              color: "white",
              fontFamily: fonts.accent,
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              boxShadow: shadows.goldGlowSoft,
            }}
          >
            המשך לגל הבא
          </button>
        </div>
      </DesignPageHero>

      {/* ─── 2. Series families showcase ─────────────────────────────────── */}
      <section style={{ background: colors.parchment, padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <h2 style={SECTION_HEADING_STYLE}>שבע משפחות עיצוב לסדרות</h2>
          <p style={SECTION_SUB_STYLE}>
            כל סדרה באתר תקבל זהות ויזואלית של אחת מהמשפחות הללו — צבעי תג, וריאנט הירו, וסגנון תמונה מלווה תואם.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1.25rem",
            }}
          >
            <FamilyCard
              familyKey="sacredCanon"
              description="תורה / נביאים / כתובים, ספרי תנ״ך — למדנות מכובדת. קליגרפיה, מסגרת מואר, בורדו וזהב."
            />
            <FamilyCard
              familyKey="weeklyObservance"
              description="פרשת השבוע ומועדים — חמים, ביתי, מחזורי. נופים עונתיים, טאן ומרווה."
            />
            <FamilyCard
              familyKey="miraculous"
              description="דור הפלאות — יראה, אור אלוהי. נייווי עמוק, קרני זהב, מספור בעיגולים."
            />
            <FamilyCard
              familyKey="remembrance"
              description="זיכרון ומורשת — שקול ומרומם. מהגוני, קרם, וזהב מאופק."
            />
            <FamilyCard
              familyKey="youth"
              description="חידות וילדי התנ״ך — משחקי, מעודד. צורות מצוירות, פסטל וטורקיז."
            />
            <FamilyCard
              familyKey="assembly"
              description="כנס וקהילה — אינטלקטואלי ופעיל. זית, פורטרטים, אוויר תוסס."
            />
            <FamilyCard
              familyKey="reference"
              description="כלי עזר ומפות — פונקציונלי. דיאגרמות נקיות, אפור בהיר וכחול."
            />
          </div>
        </div>
      </section>

      {/* ─── 3. Mahogany hero variant demo ────────────────────────────────── */}
      <DesignPageHero
        variant="mahogany"
        eyebrow="וריאנט מהגוני · לדפי שיעור / סדרה / רב"
        title="כָּל הָאָרֶץ מָלְאָה כְּבוֹדוֹ"
        subtitle="הירו עמוק וחם לסיפור — שיעור בודד, דף סדרה, דף רב. רקע גרדיאנט מהגוני עם vignette ומקום ל-image של השיעור או של הרב מאחור."
        icon={<BookOpen style={{ width: 30, height: 30 }} />}
      >
        <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
          <PrimaryButton>צפה בשיעור</PrimaryButton>
          <GlassButton>הוסף למועדפים</GlassButton>
        </div>
      </DesignPageHero>

      {/* spacer */}
      <div style={{ height: 32, background: colors.parchment }} />

      {/* ─── 4. Navy hero variant demo ────────────────────────────────────── */}
      <DesignPageHero
        variant="navy"
        eyebrow="וריאנט נייווי · זיכרון ופלאות"
        title="לְעִלּוּי נִשְׁמַת"
        subtitle="לדפי הזיכרון (סעדיה הי״ד, מעין פלסר ז״ל) ולסדרת דור הפלאות. שקול, חגיגי, עם זהב מנצנץ דק."
        icon={<Heart style={{ width: 28, height: 28 }} />}
      >
        <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
          <PrimaryButton>הצטרף ללימוד לעילוי נשמה</PrimaryButton>
        </div>
      </DesignPageHero>

      <div style={{ height: 32, background: colors.parchment }} />

      {/* ─── 5. Olive hero variant demo ───────────────────────────────────── */}
      <DesignPageHero
        variant="olive"
        eyebrow="וריאנט זית · קהילה וכנס"
        title="חברותא של אנשי תנ״ך"
        subtitle="לדפי הקהילה, אגף המורים, וכנס התנ״ך. פעיל ואינטלקטואלי — מזמין השתתפות."
        icon={<Users style={{ width: 28, height: 28 }} />}
      >
        <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
          <PrimaryButton>הצטרף לקהילה</PrimaryButton>
          <GlassButton>גלה את הכנס</GlassButton>
        </div>
      </DesignPageHero>

      {/* ─── 6. Sample content block — to test how a regular section reads ─ */}
      <section style={{ background: colors.parchment, padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: "0.78rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: colors.goldDark,
              fontWeight: 700,
              textAlign: "center",
              marginBottom: "0.75rem",
            }}
          >
            דוגמת תוכן · בלוק טקסט
          </div>
          <h2 style={SECTION_HEADING_STYLE}>איך נראה תוכן רגיל בתבנית החדשה</h2>
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: "1.02rem",
              lineHeight: 2,
              color: colors.textMid,
              maxWidth: 720,
              margin: "1rem auto 0",
            }}
          >
            <p>
              כל פסקה בעיצוב החדש משתמשת בפונט <b>Ploni</b> לקריאות, עם line-height 2 שנותן לתנ״ך נשימה.
              כותרות בפונט <b>Kedem</b> השרפי, וכפתורי CTA ב-<b>Paamon</b>. הצבעים נוחים לעיניים בלימוד ארוך.
            </p>
            <p style={{ marginTop: "1rem" }}>
              ציטוטים ארוכים מקבלים מסגרת זהב מימין, תאריכים בעברית ב-<i>Mugrabi</i> בעדינות, ולכל שיעור יש
              באדג' של משפחת העיצוב שלו (קאנון מקודש / זיכרון / פלאות וכו') כדי שהעין תזהה מיד באיזה ז'אנר היא נמצאת.
            </p>
          </div>

          <div
            style={{
              marginTop: "2rem",
              padding: "1.5rem 1.75rem",
              borderInlineEnd: `4px solid ${colors.goldLight}`,
              background: "rgba(196,162,101,0.08)",
              borderRadius: radii.md,
              fontFamily: fonts.display,
              fontStyle: "italic",
              fontSize: "1.1rem",
              color: colors.textDark,
              lineHeight: 1.7,
            }}
          >
            "וְשִׁנַּנְתָּם לְבָנֶיךָ וְדִבַּרְתָּ בָּם" — ציטוט בולט מקבל מסגרת זהב, פונט Kedem איטליק, ורקע זהב חיוור.
          </div>
        </div>
      </section>

      {/* ─── 7. Status / sandbox notice ────────────────────────────────────── */}
      <section
        style={{
          background: colors.parchmentDark,
          padding: "3rem 1.5rem",
          borderTop: `1px solid rgba(139,111,71,0.12)`,
        }}
      >
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            textAlign: "center",
            fontFamily: fonts.body,
            fontSize: "0.92rem",
            color: colors.textMuted,
            lineHeight: 1.85,
          }}
        >
          <Flame
            style={{
              width: 22,
              height: 22,
              color: colors.goldDark,
              margin: "0 auto 0.75rem",
            }}
          />
          <p>
            <b style={{ color: colors.textDark }}>זה דף סנדבוקס.</b> הוא קיים רק במצב פיתוח (<code>import.meta.env.DEV</code>),
            אינו מקושר משום מקום באתר, ואינו מגיע לפרודקשן בכלל.
          </p>
          <p style={{ marginTop: "0.5rem" }}>
            כשתאשר את העיצוב — Header, Footer וה-Hero יוחלפו ב-`Layout.tsx` בעבודת import אחת, ומכאן הם יחולו על כל הדפים החיים.
          </p>
        </div>
      </section>
    </DesignLayout>
  );
}
