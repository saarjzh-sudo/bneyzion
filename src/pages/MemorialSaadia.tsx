import Layout from "@/components/layout/Layout";
import MemorialHero from "@/components/memorial/MemorialHero";
import MemorialContent from "@/components/memorial/MemorialContent";
import { Seo } from "@/components/seo/Seo";

const MemorialSaadia = () => (
  <Layout>
    <Seo
      title="לזכר סעדיה"
      description="עמוד הנצחה לזכרו של סעדיה — בני ציון, אתר התנ״ך של ישראל."
      url="https://bneyzion.co.il/memorial/saadia"
      type="article"
    />
    <MemorialHero />
    <MemorialContent />
  </Layout>
);

export default MemorialSaadia;
