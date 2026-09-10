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
import YearMap from "@/components/chapter-weekly-v2/sections/YearMap";
import EarlyBird from "@/components/chapter-weekly-v2/sections/EarlyBird";
import Letter from "@/components/chapter-weekly-v2/sections/Letter";
import Friction from "@/components/chapter-weekly-v2/sections/Friction";
import WeeklyRhythm from "@/components/chapter-weekly-v2/sections/WeeklyRhythm";
import Voices from "@/components/chapter-weekly-v2/sections/Voices";
import MeetRabbi from "@/components/chapter-weekly-v2/sections/MeetRabbi";
import Pricing from "@/components/chapter-weekly-v2/sections/Pricing";
import Faq from "@/components/chapter-weekly-v2/sections/Faq";
import Closing from "@/components/chapter-weekly-v2/sections/Closing";
import Dock from "@/components/chapter-weekly-v2/sections/Dock";

const ChapterWeeklyV2 = () => {
  useSEO({
    title: "השנה מתחילים את הנביאים | הפרק השבועי של בני ציון",
    description:
      "אחרי החגים פותחים את ספר יהושע — פרק בשבוע, שיעור זום חי עם הרב יואב אוריאל, תכני העמקה וקבוצה שלומדת יחד. 45 שבועות, יהושע ושופטים.",
    url: "https://bneyzion.co.il/chapter-weekly-v2",
  });

  return (
    <div className="chapter-weekly-theme min-h-screen bg-background text-foreground" dir="rtl">
      <TopNav />

      <main>
        <Hero />

        <AnimatedSection>
          <YearMap />
        </AnimatedSection>

        {/* חלון ההרשמה המוקדמת — מרנדר null מעצמו אחרי תאריך פתיחת הלימוד. */}
        <AnimatedSection animation="scale">
          <EarlyBird />
        </AnimatedSection>

        <AnimatedSection>
          <Letter />
        </AnimatedSection>

        <AnimatedSection>
          <Friction />
        </AnimatedSection>

        <AnimatedSection>
          <WeeklyRhythm />
        </AnimatedSection>

        <AnimatedSection animation="scale">
          <Voices />
        </AnimatedSection>

        <AnimatedSection>
          <MeetRabbi />
        </AnimatedSection>

        <AnimatedSection animation="scale">
          <Pricing />
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
