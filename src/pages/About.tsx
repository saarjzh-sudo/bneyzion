import { motion } from "framer-motion";
import { BookOpen, Users, Headphones, ScrollText, Heart, Mail, Phone, MessageCircle, ExternalLink, ChevronDown, Play, Building2, Sparkles, Quote } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import PageHero from "@/components/layout/PageHero";
import AboutStatsSection from "@/components/about/AboutStatsSection";
import AboutRabbisSection from "@/components/about/AboutRabbisSection";
import AboutContactSection from "@/components/about/AboutContactSection";
import AboutMemorialSection from "@/components/about/AboutMemorialSection";
import AboutPrinciplesSection from "@/components/about/AboutPrinciplesSection";
import AboutInstitutionsSection from "@/components/about/AboutInstitutionsSection";
import { useSEO } from "@/hooks/useSEO";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const About = () => {
  useSEO({ title: "אודות", description: "בני ציון – עמותה ללימוד תנ״ך בישראל. מאות רבנים, אלפי שיעורים ותכנים ללימוד התנ״ך" });
  const { data: stats } = useQuery({
    queryKey: ["about-stats"],
    queryFn: async () => {
      const [lessons, rabbis, series] = await Promise.all([
        supabase.from("lessons").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("rabbis").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("series").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);
      return {
        lessons: lessons.count ?? 0,
        rabbis: rabbis.count ?? 0,
        series: series.count ?? 0,
      };
    },
    staleTime: 1000 * 60 * 30,
  });

  const { data: topRabbis } = useQuery({
    queryKey: ["about-top-rabbis"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rabbis")
        .select("id, name, title, image_url, specialty, lesson_count")
        .eq("status", "active")
        .gt("lesson_count", 30)
        .order("lesson_count", { ascending: false })
        .limit(8);
      return data ?? [];
    },
    staleTime: 1000 * 60 * 30,
  });

  return (
    <Layout>
      <PageHero title="אודות בני ציון" subtitle="הבמה המרכזית של לימוד התנ״ך, בדרך הממשיכה את מסורת ישראל לדורותיה" />

      {/* Vision & Story */}
      <section className="py-20 section-gradient-warm">
        <div className="container max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-8"
          >
            <motion.div variants={fadeUp} custom={0}>
              <div className="glass-card-gold rounded-2xl p-8 md:p-10">
                <div className="space-y-5 text-lg leading-[2] text-foreground/90 font-serif">
                  <p>
                    <strong className="text-foreground">'בני ציון'</strong> היא הבמה המרכזית של לימוד התנ"ך, בדרך הממשיכה את מסורת ישראל לדורותיה.
                  </p>
                  <p>
                    דרך זו מאגדת עשרות רבנים המתמחים בתנ"ך ומלמדים אותו במשך שנים רבות.
                  </p>
                  <p>
                    'בני ציון' הוקמה להנצחת זכרו של{" "}
                    <Link to="/memorial" className="text-primary font-bold hover:underline">
                      בן ציון חיים הנמן הי"ד
                    </Link>
                    , אשר מסר נפשו בקרב עם מחבלים בשכם.
                  </p>
                  <p>
                    בראש התכנית עומד <strong className="text-foreground">הרב יואב אוריאל</strong>.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Mission Cards */}
            <motion.div variants={fadeUp} custom={1}>
              <div className="glass-card-light rounded-2xl p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-display text-foreground mb-2">להנגיש</h3>
                    <p className="text-sm text-muted-foreground">אלפי שיעורים ומאמרים בחינם, זמינים לכל אחד בכל עת</p>
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto mb-3">
                      <ScrollText className="h-7 w-7 text-accent-foreground" />
                    </div>
                    <h3 className="font-display text-foreground mb-2">להעמיק</h3>
                    <p className="text-sm text-muted-foreground">תוכן ברמה גבוהה מרבני ומורי הדור, המחבר בין פשט לדרש</p>
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                      <Heart className="h-7 w-7 text-foreground" />
                    </div>
                    <h3 className="font-display text-foreground mb-2">לחבר</h3>
                    <p className="text-sm text-muted-foreground">לבנות קהילה של לומדים שמתחברים לשורשים ולמורשת ישראל</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <AboutStatsSection stats={stats} />

      {/* Principles */}
      <AboutPrinciplesSection />

      {/* Institutions */}
      <AboutInstitutionsSection />

      {/* Leading Rabbis */}
      <AboutRabbisSection topRabbis={topRabbis} />

      {/* Memorial Section */}
      <AboutMemorialSection />

      {/* Contact & Donate */}
      <AboutContactSection />
    </Layout>
  );
};

export default About;
