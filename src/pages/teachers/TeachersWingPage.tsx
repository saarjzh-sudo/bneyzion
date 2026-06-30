/**
 * TeachersWingPage — /teachers
 *
 * Production Teachers Wing main page.
 *
 * A — redesigned (2026-06-02): the central tabs/accordion have been removed.
 * Navigation is entirely via the sidebar (TeacherSidebar) — books, content types,
 * creators. This page is now the landing / entry point only.
 *
 * Layout: TeachersLayout (DesignHeader + TeacherSidebar + DesignFooter)
 * Hero: olive variant
 */
import { GraduationCap, BookOpen, Layers, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";

import TeachersLayout from "@/components/teachers/TeachersLayout";
import AITeacherTools from "@/components/teachers/AITeacherTools";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";

// ─── Quick-access card ────────────────────────────────────────────────────────
function QuickCard({
  icon,
  title,
  subtitle,
  href,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
  accent: string;
}) {
  return (
    <Link to={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: "white",
          borderRadius: radii.xl,
          border: "1px solid rgba(139,111,71,0.1)",
          boxShadow: shadows.cardSoft,
          padding: "1.5rem",
          cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex",
          flexDirection: "column",
          gap: "0.65rem",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = shadows.cardHover;
          e.currentTarget.style.borderColor = accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = shadows.cardSoft;
          e.currentTarget.style.borderColor = "rgba(139,111,71,0.1)";
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 4,
            background: gradients.oliveButton,
          }}
        />
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.lg,
            background: "rgba(74,90,46,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accent,
          }}
        >
          {icon}
        </div>
        <div>
          <h3
            style={{
              fontFamily: fonts.display,
              fontSize: "1rem",
              fontWeight: 800,
              color: colors.textDark,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "0.8rem",
              color: colors.textMuted,
              margin: "0.35rem 0 0",
              lineHeight: 1.55,
            }}
          >
            {subtitle}
          </p>
        </div>
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: "0.75rem",
            color: colors.oliveMain,
            fontWeight: 700,
            marginTop: "auto",
          }}
        >
          עיון ←
        </span>
      </div>
    </Link>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeachersWingPage() {
  useSEO({
    title: 'אגף המורים — כלים ותכנים למחנכי תנ"ך',
    description: 'מאגר תכנים מקצועי למורים ומחנכי תנ"ך: דפי עבודה, חידות, כלי עזר, מדריכים ועוד',
    url: "https://bneyzion.co.il/teachers",
  });

  return (
    <TeachersLayout>
      {/* Hero */}
      <DesignPageHero
        variant="olive"
        eyebrow="אגף המורים"
        title='כלים ותכנים למחנכי תנ"ך'
        subtitle='מאגר תכנים מקצועי למורים: דפי עבודה, חידות, כלי עזר, מדריכים והוראות לכיתות א׳–י״ב. ניווט לפי ספר, סוג תוכן, ויוצר — דרך התפריט הצדדי.'
        icon={<GraduationCap size={28} style={{ color: "#E8D5A0" }} />}
      />

      {/* Quick-access cards */}
      <div
        dir="rtl"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "2.5rem 1.5rem 3rem",
        }}
      >
        {/* Intro */}
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: "0.92rem",
            color: colors.textMuted,
            marginBottom: "2rem",
            lineHeight: 1.7,
            maxWidth: 640,
          }}
        >
          השתמש בתפריט הצדדי לניווט: בחר ספר, הרחב אותו וגלה את כל הסדרות והשיעורים
          הרלוונטיים — או עיין לפי סוג תוכן ויוצר.
        </p>

        {/* Three quick-entry cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
            gap: "1.25rem",
          }}
        >
          <QuickCard
            icon={<BookOpen size={22} />}
            title="לפי ספר"
            subtitle="תורה, נביאים, כתובים — פתח ספר בתפריט ובחר סדרה"
            href="/teachers"
            accent={colors.oliveDark}
          />
          <QuickCard
            icon={<Layers size={22} />}
            title="לפי סוג תוכן"
            subtitle="דפי עבודה, חידות, ביאורי מילים, סיכומים ועוד"
            href="/teachers"
            accent={colors.goldDark}
          />
          <QuickCard
            icon={<Users size={22} />}
            title="לפי יוצר"
            subtitle="גלה את כל החומרים שכתב מחנך מסוים"
            href="/teachers"
            accent={colors.oliveMain}
          />
        </div>

        {/* Hint */}
        <div
          style={{
            marginTop: "2.5rem",
            padding: "1rem 1.25rem",
            background: "rgba(74,90,46,0.06)",
            borderRadius: radii.lg,
            borderInlineStart: `3px solid ${colors.oliveMain}`,
            fontFamily: fonts.body,
            fontSize: "0.82rem",
            color: colors.textMuted,
            lineHeight: 1.65,
          }}
        >
          <strong style={{ color: colors.oliveDark }}>טיפ:</strong>{" "}
          בתפריט הצדדי (tab "ראשי") — לחץ על שם ספר כדי לפתוח את תוכנו. הכפתור
          "כל התכנים ב..." יציג את כל הסדרות והשיעורים של אותו ספר. לחיצה על שם הסדרה
          תוביל ישירות לדף הסדרה.
        </div>

        {/* AI tools for teachers */}
        <section
          aria-labelledby="teacher-ai-tools-heading"
          style={{
            marginTop: "3rem",
            padding: "2rem 1.5rem",
            background: "white",
            borderRadius: radii.xl,
            border: "1px solid rgba(139,111,71,0.1)",
            boxShadow: shadows.cardSoft,
          }}
        >
          <div style={{ marginBottom: "1.5rem" }}>
            <h2
              id="teacher-ai-tools-heading"
              style={{
                fontFamily: fonts.display,
                fontSize: "1.35rem",
                fontWeight: 800,
                color: colors.textDark,
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              כלי AI להכנת שיעור
            </h2>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "0.85rem",
                color: colors.textMuted,
                margin: "0.4rem 0 0",
                lineHeight: 1.65,
                maxWidth: 560,
              }}
            >
              מערך שיעור, מבחן או תפזורת — מותאמים לנושא ולרמת הגיל, מוכנים להדפסה בלחיצה.
            </p>
          </div>

          <AITeacherTools />
        </section>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </TeachersLayout>
  );
}
