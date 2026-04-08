import { useMemo } from "react";
import { motion } from "framer-motion";
import PageHero from "@/components/layout/PageHero";
import Layout from "@/components/layout/Layout";
import { useRabbis } from "@/hooks/useRabbis";
import { Skeleton } from "@/components/ui/skeleton";
import RabbiCard from "@/components/cards/RabbiCard";
import { useSEO } from "@/hooks/useSEO";

const RabbisList = () => {
  useSEO({ title: "רבנים ומרצים", description: "כל הרבנים והמרצים של בני ציון – מאות שיעורי תנ״ך חינמיים" });
  const { data: rabbis, isLoading } = useRabbis();
  const activeRabbis = useMemo(() => rabbis?.filter((r) => r.status === "active"), [rabbis]);

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        dir="rtl"
      >
        <PageHero title="הרבנים שלנו" subtitle="מרצים ורבנים המעבירים שיעורי תורה באתר" />

        <div className="container py-12">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {activeRabbis?.map((rabbi) => (
                <RabbiCard
                  key={rabbi.id}
                  id={rabbi.id}
                  name={rabbi.name}
                  title={rabbi.title}
                  specialty={rabbi.specialty}
                  imageUrl={rabbi.image_url}
                  lessonCount={rabbi.lesson_count}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </Layout>
  );
};

export default RabbisList;
