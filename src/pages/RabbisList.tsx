import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import PageHero from "@/components/layout/PageHero";
import Layout from "@/components/layout/Layout";
import { usePublicRabbis } from "@/hooks/useRabbis";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import RabbiCard from "@/components/cards/RabbiCard";
import { useSEO } from "@/hooks/useSEO";

const RabbisList = () => {
  useSEO({ title: "רבנים ומרצים", description: "כל הרבנים והמרצים של בני ציון – מאות שיעורי תנ״ך חינמיים" });
  const { data: activeRabbis, isLoading } = usePublicRabbis();
  // הרב יואב 15.9.2026: רשימה ארוכה מאוד של רבנים — שורת חיפוש בראש הדף
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().replace(/["״׳']/g, "");
    if (!q) return activeRabbis ?? [];
    return (activeRabbis ?? []).filter((r) => (r.name || "").replace(/["״׳']/g, "").includes(q));
  }, [activeRabbis, search]);

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
          <div className="relative max-w-xl mx-auto mb-10">
            <Search className="absolute top-1/2 right-4 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש רב לפי שם..."
              aria-label="חיפוש רב לפי שם"
              className="w-full h-12 rounded-full border border-input bg-background pr-12 pl-5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} avatar lines={2} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">לא נמצא רב בשם הזה.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filtered.map((rabbi) => (
                <RabbiCard
                  key={rabbi.id}
                  id={rabbi.id}
                  slug={rabbi.slug}
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
