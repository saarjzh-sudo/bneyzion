/**
 * /chapter-weekly-v2 — דף הפרק השבועי, גרסה משודרגת.
 *
 * נבנה 9.9.2026 לפי בקשת סער ("שדרוג משמעותי, בעוצמה וגיוון").
 * הדף החי (/chapter-weekly) לא נגוע. גיבוי מלא של הגרסה הקודמת:
 * `_backup/chapter-weekly-2026-09-09/`.
 *
 * מה השתנה מול הגרסה הקודמת:
 *  - התוכן עבר מקיץ תשפ״ו (חגי·זכריה·מלאכי) לשנת תשפ״ז (יהושע·שופטים).
 *  - נוסף מסלול 45 השבועות — ההבטחה השנתית כציר ויזואלי, לא כהצהרה.
 *  - שמונה כפתורי CTA זהים הוחלפו בפס תחתון קבוע + ארבע נקודות החלטה.
 *  - כל מספר, מחיר ותאריך יושבים ב-`chapter-weekly-v2/data.ts` בלבד.
 *
 * ⚠️ לפני עלייה לאוויר: לאמת את הפריטים המסומנים NEEDS_VERIFY ב-data.ts.
 */
import "@/styles/chapter-weekly.css";
import "@/styles/chapter-weekly-v2.css";

import { useSEO } from "@/hooks/useSEO";
import { AnimatedSection } from "@/components/ui/animated-section";

import TopNav from "@/components/chapter-weekly-v2/sections/TopNav";
import Hero from "@/components/chapter-weekly-v2/sections/Hero";
import Pillars from "@/components/chapter-weekly-v2/sections/Pillars";
import Offer from "@/components/chapter-weekly-v2/sections/Offer";
import Dream from "@/components/chapter-weekly-v2/sections/Dream";
import YearMap from "@/components/chapter-weekly-v2/sections/YearMap";
import EarlyBird from "@/components/chapter-weekly-v2/sections/EarlyBird";
import Letter from "@/components/chapter-weekly-v2/sections/Letter";
import WeeklyRhythm from "@/components/chapter-weekly-v2/sections/WeeklyRhythm";
import Voices from "@/components/chapter-weekly-v2/sections/Voices";
import MeetRabbi from "@/components/chapter-weekly-v2/sections/MeetRabbi";
import Faq from "@/components/chapter-weekly-v2/sections/Faq";
import Closing from "@/components/chapter-weekly-v2/sections/Closing";
import Dock from "@/components/chapter-weekly-v2/sections/Dock";

const ChapterWeeklyV2 = () => {
  useSEO({
    title: "השנה גם אתם לומדים את התנ״ך | תכנית הפרק השבועי",
    description:
      "מתחילים מספר יהושע — פרק אחד בשבוע, שיעור זום חי עם הרב יואב אוריאל, סיכום ותכני העמקה וקהילה שלומדת יחד. חודש התנסות ב־5 ₪, וספר שופטים המודפס במתנה.",
    url: "https://bneyzion.co.il/chapter-weekly",
  });

  // ‎overflow-x-clip‎ = בלם בטיחות בלבד (נמדד 10.9: אין גלישה אופקית, ‎VW=SW‎).
  // ‎clip‎ ולא ‎hidden‎ — ‎hidden‎ שובר את ה-sticky של ההדר.
  return (
    <div
      className="chapter-weekly-theme min-h-screen overflow-x-clip bg-background text-foreground"
      dir="rtl"
    >
      <TopNav />

      <main>
        <Hero />
        <Pillars />

        {/* סדר הסקשנים, לפי הוראת סער 10.9: ההטבה והמחיר לפני הכול, ובוודאי
            לפני התיאור של הרב יואב. קודם למה כדאי להצטרף — אחר כך מי מלמד. */}
        <AnimatedSection animation="scale">
          <Offer />
        </AnimatedSection>

        <AnimatedSection animation="scale">
          <EarlyBird />
        </AnimatedSection>

        <AnimatedSection animation="fade-in">
          <Dream />
        </AnimatedSection>

        <AnimatedSection>
          <WeeklyRhythm />
        </AnimatedSection>

        <AnimatedSection>
          <YearMap />
        </AnimatedSection>

        <AnimatedSection animation="scale">
          <Voices />
        </AnimatedSection>

        <AnimatedSection>
          <MeetRabbi />
        </AnimatedSection>

        <AnimatedSection>
          <Letter />
        </AnimatedSection>

        <AnimatedSection>
          <Faq />
        </AnimatedSection>

        <AnimatedSection animation="fade-in">
          <Closing />
        </AnimatedSection>

      </main>

      <Dock />
    </div>
  );
};

export default ChapterWeeklyV2;
