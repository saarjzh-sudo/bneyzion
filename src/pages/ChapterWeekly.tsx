import "@/styles/chapter-weekly.css";

import Header from "@/components/chapter-weekly/sections/Header";
import Hero from "@/components/chapter-weekly/sections/Hero";
import ProgramIntro from "@/components/chapter-weekly/sections/ProgramIntro";
import PainAndDream from "@/components/chapter-weekly/sections/PainAndDream";
import HowItWorks from "@/components/chapter-weekly/sections/HowItWorks";
import HowItWorksInPractice from "@/components/chapter-weekly/sections/HowItWorksInPractice";
import Pricing from "@/components/chapter-weekly/sections/Pricing";
import MeetRabbi from "@/components/chapter-weekly/sections/MeetRabbi";
import PracticalDetails from "@/components/chapter-weekly/sections/PracticalDetails";
import WhySecondTemple from "@/components/chapter-weekly/sections/WhySecondTemple";
import FutureProgram from "@/components/chapter-weekly/sections/FutureProgram";
import Testimonials from "@/components/chapter-weekly/sections/Testimonials";
import FAQ from "@/components/chapter-weekly/sections/FAQ";
import FinalCTA from "@/components/chapter-weekly/sections/FinalCTA";
import { AnimatedSection } from "@/components/ui/animated-section";

const ChapterWeekly = () => {
  return (
    <div className="chapter-weekly-theme min-h-screen bg-background text-foreground" dir="rtl">
      <Header />
      <Hero />
      <AnimatedSection>
        <WhySecondTemple />
      </AnimatedSection>
      <AnimatedSection>
        <ProgramIntro />
      </AnimatedSection>
      <AnimatedSection delay={100}>
        <PainAndDream />
      </AnimatedSection>
      <AnimatedSection>
        <HowItWorks />
      </AnimatedSection>
      <AnimatedSection>
        <HowItWorksInPractice />
      </AnimatedSection>
      <AnimatedSection animation="scale">
        <Testimonials />
      </AnimatedSection>
      <AnimatedSection animation="scale">
        <Pricing />
      </AnimatedSection>
      <AnimatedSection>
        <MeetRabbi />
      </AnimatedSection>
      <AnimatedSection>
        <PracticalDetails />
      </AnimatedSection>
      <AnimatedSection>
        <FutureProgram />
      </AnimatedSection>
      <AnimatedSection>
        <FAQ />
      </AnimatedSection>
      <AnimatedSection animation="fade-in">
        <FinalCTA />
      </AnimatedSection>
    </div>
  );
};

export default ChapterWeekly;
