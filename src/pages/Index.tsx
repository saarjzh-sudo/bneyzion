import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
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
import DailyVerseSection from "@/components/home/DailyVerseSection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <LearningDashboard />
      <RecommendationsSection />
      <PopularSection />
      <DailyVerseSection />
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
