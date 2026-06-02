/**
 * BibleChapterReader
 *
 * Native in-site verse reader — replaces the external Sefaria link.
 * Fetches verses from public.bible_verses (populated from Sefaria once,
 * stored in Supabase).
 *
 * Decision 2 (2026-06-02): reading items use this component, not a Sefaria URL.
 */
import { useBibleChapter } from "@/hooks/useCommunity";
import { Loader2, BookOpen } from "lucide-react";

interface Props {
  book: string;
  chapter: number;
  title?: string;
}

const HEBREW_CHAPTER_LABELS: Record<number, string> = {
  1: "א", 2: "ב", 3: "ג", 4: "ד", 5: "ה",
  6: "ו", 7: "ז", 8: "ח", 9: "ט", 10: "י",
};

export function BibleChapterReader({ book, chapter, title }: Props) {
  const { data: verses, isLoading, isError } = useBibleChapter(book, chapter);

  const chapterLabel = HEBREW_CHAPTER_LABELS[chapter] ?? String(chapter);
  const displayTitle = title ?? `${book} פרק ${chapterLabel}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">טוען פסוקים...</span>
      </div>
    );
  }

  if (isError || !verses || verses.length === 0) {
    return (
      <div className="rounded-xl bg-muted/40 border border-border p-6 text-center text-muted-foreground text-sm">
        <BookOpen className="h-6 w-6 mx-auto mb-2 text-border" />
        <p>הפסוקים אינם זמינים כרגע</p>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="rounded-xl border border-border bg-amber-50/40 dark:bg-amber-950/10 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-amber-100/50 dark:bg-amber-900/20">
        <BookOpen className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
        <h3 className="text-sm font-heading text-amber-900 dark:text-amber-200 font-semibold">
          {displayTitle}
        </h3>
        <span className="mr-auto text-xs text-amber-700/60 dark:text-amber-400/60">
          {verses.length} פסוקים
        </span>
      </div>

      {/* Verses */}
      <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
        {verses.map(({ verse, text_he }) => (
          <p
            key={verse}
            className="text-base leading-8 text-foreground font-serif"
            style={{ fontFamily: "'Kedem', 'Frank Ruhl Libre', serif" }}
          >
            <span className="inline-block text-[11px] font-sans font-bold text-amber-700 dark:text-amber-400 ml-2 align-middle select-none min-w-[1.4rem] text-center">
              {HEBREW_CHAPTER_LABELS[verse] ?? verse}
            </span>
            {text_he}
          </p>
        ))}
      </div>
    </div>
  );
}

export default BibleChapterReader;
