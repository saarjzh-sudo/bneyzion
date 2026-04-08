import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { Progress } from "@/components/ui/progress";
import { Map } from "lucide-react";
import { modules } from "@/data/roadmapData";
import ModuleSection from "@/components/roadmap/ModuleSection";

const Roadmap = () => {
  const totalMilestones = modules.reduce((a, m) => a + m.milestones.length, 0);
  const doneMilestones = modules.reduce((a, m) => a + m.milestones.filter(ms => ms.status === "done").length, 0);
  const overallProgress = Math.round(
    modules.reduce((a, m) => a + m.milestones.reduce((b, ms) => b + ms.progress, 0), 0) / totalMilestones
  );

  return (
    <Layout>
      <article className="container py-12 md:py-16" itemScope itemType="https://schema.org/Article">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
            <Map className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-5xl font-heading text-foreground mb-3" itemProp="headline">מפת הדרך</h1>
          <p className="text-muted-foreground font-sans mb-4 max-w-lg mx-auto" itemProp="description">
            מעקב אחר התקדמות הפיתוח של פורטל בני ציון — {totalMilestones} אבני דרך ב-{modules.length} מודולים
          </p>
          <p className="text-sm text-muted-foreground font-sans mb-4 max-w-xl mx-auto leading-relaxed">
            לוח הזמנים המוצג הוא משוער בלבד — בעזרת ה׳ הדברים יכולים להתקדם הרבה יותר מהר! 🚀
          </p>
          <p className="text-sm font-sans text-accent font-medium mb-8 max-w-xl mx-auto leading-relaxed">
            ״אִם ה׳ לֹא יִבְנֶה בַיִת שָׁוְא עָמְלוּ בוֹנָיו בּוֹ״ — אנחנו שמים את הביטחון בקב״ה ועושים את ההשתדלות, והוא יברך את המלאכה ✨
          </p>

          {/* Overall progress */}
          <div className="max-w-md mx-auto bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-muted-foreground font-sans">התקדמות כוללת</span>
              <span className="font-heading text-primary">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3 mb-3" />
            <p className="text-xs text-muted-foreground font-sans">
              {doneMilestones}/{totalMilestones} אבני דרך הושלמו
            </p>
          </div>

          {/* Module mini-stats */}
          <nav aria-label="מודולים" className="flex flex-wrap justify-center gap-3 mt-6">
            {modules.map((mod) => {
              const modProgress = Math.round(
                mod.milestones.reduce((a, m) => a + m.progress, 0) / mod.milestones.length
              );
              return (
                <div
                  key={mod.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border text-xs"
                >
                  <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${mod.gradient} flex items-center justify-center`}>
                    <mod.Icon className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <span className="font-heading text-foreground">{mod.name}</span>
                  <span className="text-muted-foreground font-sans">{modProgress}%</span>
                </div>
              );
            })}
          </nav>
        </motion.header>

        {/* Modules */}
        <div className="space-y-14">
          {modules.map((mod, i) => (
            <ModuleSection key={mod.id} mod={mod} index={i} />
          ))}
        </div>
      </article>
    </Layout>
  );
};

export default Roadmap;
