import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Clock } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useRabbi, useRabbiSeries, useRabbiLessons } from "@/hooks/useRabbi";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSEO } from "@/hooks/useSEO";
import { formatRabbiName } from "@/lib/rabbi-name";
import { useMemo } from "react";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)} דקות`;
}

const RabbiPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: rabbi, isLoading } = useRabbi(id);
  const { data: seriesList } = useRabbiSeries(id);
  const { data: lessons } = useRabbiLessons(id);

  const displayName = useMemo(() => formatRabbiName(rabbi), [rabbi]);

  const jsonLd = useMemo(() => rabbi ? {
    "@context": "https://schema.org",
    "@type": "Person",
    name: displayName || rabbi.name,
    jobTitle: rabbi.title || "רב ומרצה",
    description: rabbi.bio || undefined,
    image: rabbi.image_url || undefined,
  } : undefined, [rabbi, displayName]);

  useSEO({
    title: displayName || rabbi?.name,
    description: rabbi?.bio ?? `שיעורי ${displayName || rabbi?.name || "הרב"} באתר בני ציון`,
    image: rabbi?.image_url ?? undefined,
    type: "profile",
    jsonLd,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 space-y-6">
          <div className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (!rabbi) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <h1 className="text-2xl font-heading text-foreground">הרב לא נמצא</h1>
          <Link to="/rabbis" className="text-primary hover:underline mt-4 inline-block">חזרה לרשימת הרבנים</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        dir="rtl"
      >
        {/* Hero */}
        <section className="section-gradient-cool py-12 md:py-16 border-b border-border">
          <div className="container flex flex-col md:flex-row items-start gap-8">
            <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-primary/20">
              <AvatarImage src={rabbi.image_url || undefined} alt={rabbi.name} />
              <AvatarFallback className="text-3xl font-heading bg-primary/10 text-primary">
                {rabbi.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-heading text-foreground">
                {displayName}
              </h1>
              {rabbi.specialty && <Badge variant="secondary" className="mt-3">{rabbi.specialty}</Badge>}
              {rabbi.bio && (
                <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl whitespace-pre-line">{rabbi.bio}</p>
              )}
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {rabbi.lesson_count} שיעורים
                </span>
                {seriesList && <span>{seriesList.length} סדרות</span>}
              </div>
            </div>
          </div>
        </section>

        <div className="container py-12 space-y-16">
          {/* Series */}
          {seriesList && seriesList.length > 0 && (
            <section>
              <h2 className="text-xl font-heading text-foreground mb-6">סדרות</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {seriesList.map((s) => (
                  <Link key={s.id} to={`/series/${s.id}`}>
                    <Card className="hover:shadow-md transition-shadow h-full group">
                      {s.image_url && (
                        <div className="aspect-[16/9] overflow-hidden rounded-t-lg">
                          <img src={s.image_url} alt={s.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{s.title}</h3>
                        {s.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                        <span className="text-xs text-muted-foreground mt-2 block">{s.lesson_count} שיעורים</span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Recent Lessons */}
          {lessons && lessons.length > 0 && (
            <section>
              <h2 className="text-xl font-heading text-foreground mb-6">שיעורים אחרונים</h2>
              <div className="space-y-2">
                {lessons.map((l, i) => {
                  const lSeries = l.series as { id: string; title: string } | null;
                  return (
                    <Link key={l.id} to={`/lessons/${l.id}`}>
                      <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/60 transition-colors group">
                        <span className="text-sm text-muted-foreground w-6 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{l.title}</h3>
                          {lSeries && <span className="text-xs text-muted-foreground">{lSeries.title}</span>}
                        </div>
                        {l.duration && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatDuration(l.duration)}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </motion.div>
    </Layout>
  );
};

export default RabbiPage;
