import { useSEO } from "@/hooks/useSEO";
import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import ContinueLearningBar from "@/components/home/ContinueLearningBar";
import DorHaplaotSection from "@/components/home/DorHaplaotSection";
import DailyVerseSection from "@/components/home/DailyVerseSection";
import LearningDashboard from "@/components/home/LearningDashboard";
import RecommendationsSection from "@/components/home/RecommendationsSection";
import PopularSection from "@/components/home/PopularSection";
import ParashaHolidaySection from "@/components/home/ParashaHolidaySection";
import QuizSection from "@/components/home/QuizSection";
import StrengthSection from "@/components/home/StrengthSection";
import RabbisSlider from "@/components/home/RabbisSlider";
import DedicationSection from "@/components/home/DedicationSection";
import WhatsAppCommunitySection from "@/components/home/WhatsAppCommunitySection";
import MemorialSection from "@/components/home/MemorialSection";

const Index = () => {
  useSEO({
    description: "פורטל מרכזי ללימוד תנ״ך – שיעורים, סדרות, רבנים ועוד. למעלה מ-1,000 שיעורים חינמיים בספרי נביאים, כתובים, תורה ומועדים.",
    url: "https://bneyzion.co.il/",
  });
  return (
    <Layout>
      <HeroSection />
      <ContinueLearningBar />
      <DorHaplaotSection />
      <DailyVerseSection />
      <LearningDashboard />
      <RecommendationsSection />
      <PopularSection />
      <ParashaHolidaySection />
      <QuizSection />
      <StrengthSection />
      <RabbisSlider />
      <WhatsAppCommunitySection />
      <MemorialSection />
      <DedicationSection />
    </Layout>
  );
};

export default Index;
