/**
 * /rabbis/:id — Single rabbi profile.
 * v2 (2026-05-26):
 *   - Series sorted by biblical order (sortByBiblicalOrder)
 *   - TOC horizontal strip of bible books, scroll-to on click
 *   - Grouped series display by book
 * Preserves: Layout, useSEO, formatRabbiName, all existing routes.
 */
import { useMemo, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Clock, Play } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useRabbi, useRabbiSeries, useRabbiLessons } from "@/hooks/useRabbi";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSEO } from "@/hooks/useSEO";
import { formatRabbiName } from "@/lib/rabbi-name";
import { sortByBiblicalOrder, getBiblicalSortIndex } from "@/lib/biblicalOrder";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)} דקות`;
}

// Parsha → Torah book
function parshaFirstWord(word: string): string {
  const map: Record<string, string> = {
    "בראשית": "בראשית", "נח": "בראשית", "לך": "בראשית", "וירא": "בראשית",
    "חיי": "בראשית", "תולדות": "בראשית", "ויצא": "בראשית", "וישלח": "בראשית",
    "וישב": "בראשית", "מקץ": "בראשית", "ויגש": "בראשית", "ויחי": "בראשית",
    "שמות": "שמות", "וארא": "שמות", "בא": "שמות", "בשלח": "שמות",
    "יתרו": "שמות", "משפטים": "שמות", "תרומה": "שמות", "תצוה": "שמות",
    "כי": "שמות", "ויקהל": "שמות", "פקודי": "שמות",
    "ויקרא": "ויקרא", "צו": "ויקרא", "שמיני": "ויקרא", "תזריע": "ויקרא",
    "מצורע": "ויקרא", "אחרי": "ויקרא", "קדושים": "ויקרא", "אמור": "ויקרא",
    "בהר": "ויקרא", "בחוקותי": "ויקרא",
    "במדבר": "במדבר", "נשא": "במדבר", "בהעלותך": "במדבר", "שלח": "במדבר",
    "קרח": "במדבר", "חוקת": "במדבר", "בלק": "במדבר", "פנחס": "במדבר", "פינחס": "במדבר",
    "מטות": "במדבר", "מסעי": "במדבר",
    "דברים": "דברים", "ואתחנן": "דברים", "עקב": "דברים", "ראה": "דברים",
    "שופטים": "דברים", "ניצבים": "דברים", "נצבים": "דברים", "וילך": "דברים",
    "האזינו": "דברים",
  };
  return map[word] || word;
}

function getBookGroupName(title: string): string {
  if (title.startsWith("פרשת ")) {
    const w = title.replace(/^פרשת\s+/, "").split(/[\s|–\-]/)[0];
    return parshaFirstWord(w);
  }
  return title.split(/[\s|–\-]/)[0];
}

const RabbiPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: rabbi, isLoading } = useRabbi(id);
  const { data: seriesListRaw } = useRabbiSeries(id);
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

  // Sort series by biblical order
  const seriesList = useMemo(
    () => sortByBiblicalOrder((seriesListRaw ?? []) as any[]) as typeof seriesListRaw,
    [seriesListRaw]
  );

  // Build TOC book groups
  const bookGroups = useMemo(() => {
    if (!seriesList) return [];
    const groups = new Map<string, { bookName: string; seriesIds: string[]; idx: number }>();
    for (const s of seriesList as any[]) {
      const idx = getBiblicalSortIndex(s.title);
      if (idx === Infinity) {
        if (!groups.has("__other__")) groups.set("__other__", { bookName: "אחר", seriesIds: [], idx: Infinity });
        groups.get("__other__")!.seriesIds.push(s.id);
        continue;
      }
      const bookName = getBookGroupName(s.title);
      if (!groups.has(bookName)) groups.set(bookName, { bookName, seriesIds: [], idx });
      groups.get(bookName)!.seriesIds.push(s.id);
    }
    return Array.from(groups.values()).sort((a, b) => a.idx - b.idx);
  }, [seriesList]);

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const scrollToBook = useCallback((bookName: string) => {
    const el = sectionRefs.current.get(bookName);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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

  const showToc = bookGroups.length > 2;

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
              {(rabbi as any).specialty && <Badge variant="secondary" className="mt-3">{(rabbi as any).specialty}</Badge>}
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

        {/* TOC — sticky book strip */}
        {showToc && (
          <div
            style={{
              background: "var(--background)",
              borderBottom: "1px solid var(--border)",
              padding: "0.65rem 1rem",
              position: "sticky",
              top: 64,
              zIndex: 20,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={{ display: "flex", gap: "0.45rem", alignItems: "center", minWidth: "max-content" }}>
              <span style={{ fontSize: "0.68rem", color: "var(--muted-foreground)", fontWeight: 700, letterSpacing: "0.1em", marginInlineEnd: "0.4rem", flexShrink: 0 }}>
                ספרים:
              </span>
              {bookGroups.map((g) => (
                <button
                  key={g.bookName}
                  onClick={() => scrollToBook(g.bookName)}
                  className="hover:bg-secondary transition-colors"
                  style={{
                    padding: "0.28rem 0.7rem",
                    borderRadius: "999px",
                    border: "1.5px solid var(--border)",
                    background: "transparent",
                    color: g.bookName === "אחר" ? "var(--muted-foreground)" : "var(--foreground)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    opacity: g.bookName === "אחר" ? 0.6 : 1,
                    fontFamily: "inherit",
                  }}
                >
                  {g.bookName}
                  <span style={{ marginInlineStart: "0.3rem", fontSize: "0.62rem", color: "var(--primary)", fontWeight: 900 }}>
                    {g.seriesIds.length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="container py-12 space-y-16">
          {/* Series — grouped by bible book */}
          {seriesList && seriesList.length > 0 && (
            <section>
              <h2 className="text-xl font-heading text-foreground mb-6">
                סדרות {showToc ? "— לפי סדר התנ\"ך" : ""}
              </h2>

              {showToc ? (
                <div className="space-y-10">
                  {bookGroups.map((g) => {
                    const groupSeries = (seriesList as any[]).filter((s: any) => g.seriesIds.includes(s.id));
                    return (
                      <div
                        key={g.bookName}
                        ref={(el) => {
                          if (el) sectionRefs.current.set(g.bookName, el as HTMLElement);
                          else sectionRefs.current.delete(g.bookName);
                        }}
                      >
                        {/* Book heading */}
                        <div className="flex items-center gap-3 mb-4">
                          <h3 className="font-heading font-bold text-lg text-foreground whitespace-nowrap">{g.bookName}</h3>
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground font-semibold">{groupSeries.length} סדרות</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {groupSeries.map((s: any) => <SeriesCard key={s.id} s={s} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(seriesList as any[]).map((s: any) => <SeriesCard key={s.id} s={s} />)}
                </div>
              )}
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function SeriesCard({ s }: { s: any }) {
  return (
    <Link to={`/series/${s.id}`}>
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
  );
}
