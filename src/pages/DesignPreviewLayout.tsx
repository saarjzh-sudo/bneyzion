/**
 * /design-layout — chrome-only showcase: Header + 4 hero variants + Footer.
 *
 * Real content simulations live in:
 *   /design-series-page     — full series detail page demo
 *   /design-lesson-popup    — lesson popup/dialog demo
 *   /design-lesson          — full lesson page demo (existing)
 *
 * Dev-only (gated in App.tsx by `import.meta.env.DEV`).
 */
import { Flame } from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import { colors, fonts, gradients, shadows, radii } from "@/lib/designTokens";

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

export default function DesignPreviewLayout() {
  return (
    <DesignLayout>
      {/* ─── 1. Parchment hero (default — Series list, About, Contact) ──── */}
      <DesignPageHero
        variant="parchment"
        eyebrow="וריאנט פרגמנט · רשימת סדרות, אודות, צור קשר"
        title="ספריית העיצוב v2"
        subtitle="ארבעת וריאנטי ההירו, ה-Header וה-Footer החדשים. הדף הזה הוא דמו של ה-chrome בלבד — הסדרה, השיעור והפופאפ נמצאים בכתובות אחרות (ראה למטה)."
      >
        <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/design-series-page"
            style={{
              padding: "0.75rem 1.8rem",
              borderRadius: radii.lg,
              border: "none",
              background: gradients.goldButton,
              color: "white",
              fontFamily: fonts.accent,
              fontWeight: 700,
              fontSize: "1rem",
              boxShadow: shadows.goldGlow,
              textDecoration: "none",
            }}
          >
            ↗ עבור לדף הסדרה
          </a>
          <a
            href="/design-lesson-popup"
            style={{
              padding: "0.75rem 1.8rem",
              borderRadius: radii.lg,
              border: `1.5px solid ${colors.goldDark}`,
              background: "transparent",
              color: colors.textDark,
              fontFamily: fonts.accent,
              fontWeight: 700,
              fontSize: "1rem",
              textDecoration: "none",
            }}
          >
            ↗ פופאפ שיעור
          </a>
          <a
            href="/design-lesson"
            style={{
              padding: "0.75rem 1.8rem",
              borderRadius: radii.lg,
              border: `1.5px solid ${colors.textMuted}`,
              background: "transparent",
              color: colors.textMuted,
              fontFamily: fonts.accent,
              fontWeight: 600,
              fontSize: "0.95rem",
              textDecoration: "none",
            }}
          >
            ↗ דף שיעור
          </a>
        </div>
      </DesignPageHero>

      {/* ─── 2. Mahogany hero (Series detail, Rabbi page) ────────────────── */}
      <DesignPageHero
        variant="mahogany"
        eyebrow="וריאנט מהגוני · דפי שיעור / סדרה / רב"
        title="כָּל הָאָרֶץ מָלְאָה כְּבוֹדוֹ"
        subtitle="הירו עמוק וחם לסיפור — שיעור בודד, דף סדרה, דף רב. רקע גרדיאנט מהגוני עם vignette ומקום ל-image של השיעור או של הרב מאחור."
      >
        <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
          <PrimaryButton>צפה בשיעור</PrimaryButton>
          <GlassButton>הוסף למועדפים</GlassButton>
        </div>
      </DesignPageHero>

      <div style={{ height: 32, background: colors.parchment }} />

      {/* ─── 3. Navy hero (Memorial, Dor Haplaot) ────────────────────────── */}
      <DesignPageHero
        variant="navy"
        eyebrow="וריאנט נייווי · זיכרון ופלאות"
        title="לְעִלּוּי נִשְׁמַת"
        subtitle="לדפי הזיכרון (סעדיה הי״ד, מעין פלסר ז״ל) ולסדרת דור הפלאות. שקול, חגיגי, עם זהב מנצנץ דק."
      >
        <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
          <PrimaryButton>הצטרף ללימוד לעילוי נשמה</PrimaryButton>
        </div>
      </DesignPageHero>

      <div style={{ height: 32, background: colors.parchment }} />

      {/* ─── 4. Olive hero (Community, Knes) ─────────────────────────────── */}
      <DesignPageHero
        variant="olive"
        eyebrow="וריאנט זית · קהילה וכנס"
        title="חברותא של אנשי תנ״ך"
        subtitle="לדפי הקהילה, אגף המורים, וכנס התנ״ך. פעיל ואינטלקטואלי — מזמין השתתפות."
      >
        <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
          <PrimaryButton>הצטרף לקהילה</PrimaryButton>
          <GlassButton>גלה את הכנס</GlassButton>
        </div>
      </DesignPageHero>

      {/* ─── 5. Sandbox notice ────────────────────────────────────────────── */}
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
