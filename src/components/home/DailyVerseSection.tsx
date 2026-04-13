import { BookOpen, Calendar, ScrollText } from "lucide-react";
import { useDailyLearning } from "@/hooks/useDailyVerse";
import { Skeleton } from "@/components/ui/skeleton";

const DailyVerseSection = () => {
  const { data, isLoading } = useDailyLearning();

  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-to-b from-[hsl(38_50%_96%)] to-background" dir="rtl">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Header skeleton */}
          <div className="text-center mb-10 space-y-3">
            <Skeleton className="h-8 w-32 mx-auto rounded-full" />
            <Skeleton className="h-9 w-64 mx-auto rounded" />
            <Skeleton className="h-5 w-40 mx-auto rounded" />
          </div>
          {/* Verse block skeleton */}
          <div className="bg-white/80 backdrop-blur rounded-2xl border border-[hsl(38_50%_85%)] p-6 md:p-8 mb-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className={`h-4 rounded ${i % 2 === 0 ? "w-full" : "w-5/6"}`} />
            ))}
          </div>
          {/* Quick links skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/60 border border-[hsl(38_50%_85%)]">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-20 rounded" />
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!data) return null;

  const { tanakhYomi, parashat, perek929 } = data;
  const mainVerse = tanakhYomi || perek929;

  return (
    <section className="py-16 bg-gradient-to-b from-[hsl(38_50%_96%)] to-background" dir="rtl">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Calendar className="h-4 w-4" />
            <span className="font-display text-sm">לימוד יומי</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-heading text-foreground">
            הפרק היומי בתנ״ך
          </h2>
          {mainVerse && (
            <p className="text-muted-foreground mt-2 font-display text-lg">
              {mainVerse.heRef}
            </p>
          )}
        </div>

        {/* Verse Text */}
        {mainVerse?.text && mainVerse.text.length > 0 && (
          <div className="bg-white/80 backdrop-blur rounded-2xl border border-[hsl(38_50%_85%)] p-6 md:p-8 mb-8 shadow-sm">
            <div className="prose prose-lg max-w-none text-right leading-[2.2] font-serif text-foreground/90">
              {mainVerse.text.slice(0, 8).map((verse, i) => (
                <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: verse }} />
              ))}
              {mainVerse.text.length > 8 && (
                <p className="text-muted-foreground text-center mt-4 font-display text-base">
                  <a
                    href={`https://www.sefaria.org/${mainVerse.ref.replace(/ /g, "_")}?lang=he`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    להמשך הפרק בספריא →
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {parashat && (
            <a
              href={`https://www.sefaria.org/${parashat.ref.replace(/ /g, "_")}?lang=he`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl bg-white/60 border border-[hsl(38_50%_85%)] hover:bg-white hover:shadow-md transition-all"
            >
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <ScrollText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-heading text-sm text-foreground">פרשת השבוע</p>
                <p className="text-muted-foreground text-xs">{parashat.heRef}</p>
              </div>
            </a>
          )}

          {tanakhYomi && (
            <a
              href={`https://www.sefaria.org/${tanakhYomi.ref.replace(/ /g, "_")}?lang=he`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl bg-white/60 border border-[hsl(38_50%_85%)] hover:bg-white hover:shadow-md transition-all"
            >
              <div className="bg-accent/20 p-2.5 rounded-lg">
                <BookOpen className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="font-heading text-sm text-foreground">תנ״ך יומי</p>
                <p className="text-muted-foreground text-xs">{tanakhYomi.heRef}</p>
              </div>
            </a>
          )}

          {perek929 && (
            <a
              href={`https://www.sefaria.org/${perek929.ref.replace(/ /g, "_")}?lang=he`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl bg-white/60 border border-[hsl(38_50%_85%)] hover:bg-white hover:shadow-md transition-all"
            >
              <div className="bg-[hsl(30_40%_90%)] p-2.5 rounded-lg">
                <Calendar className="h-5 w-5 text-[hsl(30_40%_40%)]" />
              </div>
              <div>
                <p className="font-heading text-sm text-foreground">929 — פרק יומי</p>
                <p className="text-muted-foreground text-xs">{perek929.heRef}</p>
              </div>
            </a>
          )}
        </div>

        {/* Attribution */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          טקסט מפרויקט ספריא — מקור פתוח ללימוד תורה
        </p>
      </div>
    </section>
  );
};

export default DailyVerseSection;
