/**
 * TeachersWingPage — /teachers
 *
 * Production Teachers Wing main page.
 *
 * A — redesigned (2026-06-02): the central tabs/accordion have been removed.
 * Navigation is entirely via the sidebar (TeacherSidebar).
 *
 * B — redesigned (2026-07-22, יואב + אישור-היקף סער): שלושת כפתורי-הקיצור
 * שבלב העמוד ירדו ("להוריד את הכפתורים"), ובמקומם סליידרים של תוכן אמיתי —
 * חדש באגף, דפי עבודה, חידות חזרה — בשפת סליידר "שיעורים נבחרים" של דף הבית,
 * בפלטת הזית. נוסף גם סלוט-באנר בניהול (promos placement="teachers").
 *
 * Layout: TeachersLayout (DesignHeader + TeacherSidebar + DesignFooter)
 * Hero: olive variant
 */
import { GraduationCap } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

import TeachersLayout from "@/components/teachers/TeachersLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import TeacherContentSlider from "@/components/teachers/TeacherContentSlider";
import CustomSlidersSlot from "@/components/common/CustomSlidersSlot";
import ImageBannerSlot from "@/components/promo/ImageBannerSlot";
import { colors, fonts, radii } from "@/lib/designTokens";

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
        variant="parchment"
        imageSrc="/images/hero-watercolor-teachers.webp"
        eyebrow="אגף המורים"
        title='כלים ותכנים למחנכי תנ"ך'
        subtitle='מאגר תכנים מקצועי למורים: דפי עבודה, חידות, כלי עזר, מדריכים והוראות לכיתות א׳–י״ב. ניווט לפי ספר, סוג תוכן, ויוצר — דרך התפריט הצדדי.'
        icon={<GraduationCap size={28} style={{ color: "#8B6F47" }} />}
      />

      {/* באנר בניהול — עריכה מ"באנרים ופופאפים" באדמין, מיקום "אגף המורים" */}
      <ImageBannerSlot placement="teachers" />

      {/* סליידרי תוכן */}
      <div
        dir="rtl"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "2rem 1.5rem 3rem",
        }}
      >
        <TeacherContentSlider
          eyebrow="מה חדש"
          title="חדש באגף המורים"
          viewAllTo="/teachers?tab=sogTochn"
          viewAllLabel="כל סוגי התוכן"
        />
        <TeacherContentSlider
          eyebrow="מוכן לכיתה"
          title="דפי עבודה"
          contentType="דפי עבודה"
          viewAllTo={`/teachers/content-type/${encodeURIComponent("דפי עבודה")}`}
          viewAllLabel="לכל דפי העבודה"
        />
        <TeacherContentSlider
          eyebrow="לחזרה ולשינון"
          title="חידות חזרה"
          contentType="חידות חזרה"
          viewAllTo={`/teachers/content-type/${encodeURIComponent("חידות חזרה")}`}
          viewAllLabel="לכל החידות"
        />

        {/* רמה 26ד (יואב 22.7 13:25): סליידרים שיואב יוצר לבד ב-/admin/sliders */}
        <CustomSlidersSlot placement="teachers" />

        {/* Hint — ניווט מלא דרך הסיידבר */}
        <div
          style={{
            marginTop: "0.5rem",
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
          כל המאגר נגיש מהתפריט הצדדי — לפי ספר, לפי סוג תוכן או לפי יוצר. לחיצה
          על שם ספר פותחת את כל הסדרות והשיעורים שלו.
        </div>
      </div>
    </TeachersLayout>
  );
}
