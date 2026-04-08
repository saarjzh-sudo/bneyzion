import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, BookOpen, ChevronLeft, Volume2, Video, FileText, FolderOpen, MessageSquare } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useSeriesDetail } from "@/hooks/useSeriesDetail";
import { useSeriesBreadcrumb } from "@/hooks/useSeriesHierarchy";
import { useSeriesMixedContent, MixedContentRow } from "@/hooks/useSeriesMixedContent";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import LessonDialog from "@/components/lesson/LessonDialog";
import { useSEO } from "@/hooks/useSEO";
import SmartAuthCTA from "@/components/auth/SmartAuthCTA";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} דק'`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} שע' ${rem} דק'` : `${hrs} שע'`;
}

function MediaIcon({ row }: { row: MixedContentRow }) {
  if (row.type === "series") return <FolderOpen className="h-4 w-4 text-primary" />;
  if (row.videoUrl) return <Video className="h-4 w-4 text-primary" />;
  if (row.audioUrl) return <Volume2 className="h-4 w-4 text-primary" />;
  if (row.sourceType === "qa") return <MessageSquare className="h-4 w-4 text-amber-600" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

function TypeLabel({ row }: { row: MixedContentRow }) {
  if (row.type === "series") return <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">סדרה</span>;
  if (row.sourceType === "qa") return <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">שו&quot;ת</span>;
  return <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded">שיעור</span>;
}

const SeriesPagePublic = () => {
  const { id } = useParams<{ id: string }>();
  const { data: series, isLoading } = useSeriesDetail(id);
  const { data: breadcrumb } = useSeriesBreadcrumb(id);
  const { data: mixedContent } = useSeriesMixedContent(id);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  const rabbiName = (series?.rabbis as any)?.name;

  useSEO({
    title: series?.title,
    description: series?.description ?? `סדרת שיעורים ${series?.title ?? ""}${rabbiName ? ` מאת ${rabbiName}` : ""}`,
    image: series?.image_url ?? undefined,
    jsonLd: series ? {
      "@context": "https://schema.org",
      "@type": "Course",
      name: series.title,
      description: series.description || undefined,
      provider: { "@type": "Organization", name: "בני ציון" },
    } : undefined,
  });

  const rabbi = series?.rabbis as { id: string; name: string; image_url: string | null } | null;
  const totalItems = mixedContent?.length ?? 0;

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 space-y-4" dir="rtl">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!series) {
    return (
      <Layout>
        <div className="container py-24 text-center" dir="rtl">
          <h1 className="text-2xl font-heading text-foreground">הסדרה לא נמצאה</h1>
          <Link to="/series" className="text-primary hover:underline mt-4 inline-block">חזרה לרשימת הסדרות</Link>
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
        {/* Breadcrumbs */}
        <div className="container pt-6 pb-2">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <Link to="/" className="hover:text-primary transition-colors">ראשי</Link>
            <ChevronLeft className="h-3 w-3" />
            <Link to="/series" className="hover:text-primary transition-colors">מאגר השיעורים</Link>
            {breadcrumb && breadcrumb.length > 1 && breadcrumb.slice(0, -1).map((ancestor) => (
              <span key={ancestor.id} className="flex items-center gap-2">
                <ChevronLeft className="h-3 w-3" />
                <Link to={`/series/${ancestor.id}`} className="hover:text-primary transition-colors">
                  {ancestor.title}
                </Link>
              </span>
            ))}
            <ChevronLeft className="h-3 w-3" />
            <span className="text-foreground">{series.title}</span>
          </nav>
        </div>

        {/* Header */}
        <section className="container py-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <h1 className="text-3xl md:text-4xl font-heading text-primary">{series.title}</h1>
            <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
              {rabbi && (
                <Link to={`/rabbis/${rabbi.id}`} className="flex items-center gap-2 group">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={rabbi.image_url || undefined} alt={rabbi.name} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{rabbi.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold text-primary group-hover:underline">{rabbi.name}</span>
                </Link>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>{totalItems} פריטים</span>
              </div>
            </div>
          </div>
          {series.description && (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line mt-4">{series.description}</p>
          )}
        </section>

        <Separator className="container" />

        {/* Mixed Content Table */}
        <section className="container py-8">
          {totalItems > 0 ? (
            <div className="border border-border rounded-xl overflow-hidden">
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-[auto_auto_1fr_auto_auto_auto] gap-4 px-4 py-3 bg-primary text-primary-foreground text-sm font-semibold">
                <span className="w-12 text-center">סוג מדיה</span>
                <span className="w-16 text-center">סוג</span>
                <span>שם השיעור</span>
                <span className="w-36 text-center">מאת</span>
                <span className="w-28 text-center">אורך</span>
                <span className="w-20 text-center">סדרה</span>
              </div>

              {mixedContent?.map((row, idx) => {
                if (row.type === "series") {
                  return (
                    <Link
                      key={row.id}
                      to={`/series/${row.id}`}
                      className={`block w-full grid grid-cols-1 sm:grid-cols-[auto_auto_1fr_auto_auto_auto] gap-2 sm:gap-4 px-4 py-3 text-right hover:bg-primary/5 transition-colors cursor-pointer border-b border-border last:border-b-0 ${idx % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}`}
                    >
                      <span className="hidden sm:flex w-12 justify-center items-center">
                        <MediaIcon row={row} />
                      </span>
                      <span className="hidden sm:flex w-16 justify-center items-center">
                        <TypeLabel row={row} />
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="sm:hidden"><MediaIcon row={row} /></span>
                        <h3 className="text-sm font-bold text-primary hover:underline transition-colors">
                          {row.title}
                        </h3>
                        <span className="sm:hidden"><TypeLabel row={row} /></span>
                      </div>
                      <span className="hidden sm:block text-xs text-muted-foreground w-36 text-center truncate leading-relaxed self-center">
                        {row.rabbiName || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 sm:w-28 sm:justify-center">
                        {row.totalLessons} שיעורים
                      </span>
                      <span className="hidden sm:block w-20" />
                    </Link>
                  );
                }

                // Lesson row
                return (
                  <button
                    key={row.id}
                    onClick={() => setSelectedLesson(row.id)}
                    className={`w-full grid grid-cols-1 sm:grid-cols-[auto_auto_1fr_auto_auto_auto] gap-2 sm:gap-4 px-4 py-3 text-right hover:bg-primary/5 transition-colors cursor-pointer border-b border-border last:border-b-0 ${idx % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}`}
                  >
                    <span className="hidden sm:flex w-12 justify-center items-center">
                      <MediaIcon row={row} />
                    </span>
                    <span className="hidden sm:flex w-16 justify-center items-center">
                      <TypeLabel row={row} />
                    </span>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="sm:hidden"><MediaIcon row={row} /></span>
                        <h3 className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate">
                          {row.title}
                        </h3>
                        <span className="sm:hidden"><TypeLabel row={row} /></span>
                      </div>
                      {row.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{row.description}</p>
                      )}
                    </div>
                    <span className="hidden sm:block text-xs text-muted-foreground w-36 text-center truncate leading-relaxed self-center">
                      {row.rabbiName || "—"}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 sm:w-28 sm:justify-center">
                      {row.duration ? (
                        <>
                          <Clock className="h-3 w-3" />
                          {formatDuration(row.duration)}
                        </>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </span>
                    <span className="hidden sm:block w-20" />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">אין תכנים בסדרה זו עדיין</p>
          )}
        </section>

        {/* Enroll CTA for non-authenticated users */}
        <div className="container pb-12">
          <SmartAuthCTA variant="enroll" />
        </div>
      </motion.div>

      <LessonDialog
        lessonId={selectedLesson}
        open={!!selectedLesson}
        onOpenChange={(open) => !open && setSelectedLesson(null)}
      />
    </Layout>
  );
};

export default SeriesPagePublic;
