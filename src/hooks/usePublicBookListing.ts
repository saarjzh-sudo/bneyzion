/**
 * usePublicBookListing — PUBLIC twin of useTeacherBookListing (Yoav R6, 17.6.2026).
 *
 * Reads the explicit, ordered, allow-list listing from teacher_listing_items
 * (scope='public_book', key=<book>), built by scripts/parity/public_book_listing.py from the
 * OLD public book page (sub_links = series rows + items = standalone lessons, one continuous
 * order_index). Each row is a series-card or a lesson-row, rendered in the OLD order — the
 * single interleaved ordered table Yoav demands, with author + length.
 *
 * Why a listing and not the cat_standalone heuristic: the DB is heavily duplicated and the
 * cat_standalone flag landed on TEACHER copies, so the heuristic rendered "series only,
 * alphabetical". The listing names the exact canonical id per old row → pollution (teacher
 * חידות/worksheets) is absent by construction, order is the old order_index.
 *
 * Fallback: no rows for a book → items=[] / hasListing=false → CategoryPage keeps its current
 * heuristic render. Fully reversible: delete the scope='public_book' rows.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicListingSeries {
  id: string;
  title: string;
  lessonCount: number;
  rabbiId: string | null;
  rabbiName: string | null;
  description: string | null;
  imageUrl: string | null;
  isDraft: boolean;
}
export interface PublicListingLesson {
  id: string;
  title: string;
  duration: number | null;
  thumbnail_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  attachment_url: string | null;
  rabbis: { name: string } | null;
}
export type PublicListingItem =
  | { type: "series"; sortOrder: number; series: PublicListingSeries }
  | { type: "lesson"; sortOrder: number; lesson: PublicListingLesson };

export interface PublicBookListingResult {
  items: PublicListingItem[];
  seriesCount: number;
  lessonCount: number;
  isLoading: boolean;
  hasListing: boolean;
}

export function usePublicBookListing(book: string | null | undefined): PublicBookListingResult {
  const q = useQuery({
    queryKey: ["public-book-listing-v1", book],
    enabled: !!book,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data: rows, error } = await (supabase as any)
        .from("teacher_listing_items")
        .select(
          [
            "id", "kind", "sort_order", "series_id", "lesson_id",
            "series(id,title,description,image_url,lesson_count,rabbi_id)",
            "lessons(id,title,duration,thumbnail_url,video_url,audio_url,attachment_url,rabbi_id)",
          ].join(",")
        )
        .eq("scope", "public_book")
        .eq("key", book)
        .order("sort_order", { ascending: true });
      if (error || !rows || rows.length === 0) return { items: [] as PublicListingItem[] };

      const rowArr = rows as any[];
      const rabbiIds = [
        ...new Set(
          rowArr.flatMap((r) => [r.series?.rabbi_id, r.lessons?.rabbi_id].filter(Boolean) as string[])
        ),
      ];
      let rabbiMap = new Map<string, string>();
      if (rabbiIds.length > 0) {
        const { data: rabbis } = await supabase.from("rabbis").select("id, name").in("id", rabbiIds);
        rabbiMap = new Map((rabbis || []).map((r) => [r.id, r.name]));
      }

      const items: PublicListingItem[] = [];
      for (const r of rowArr) {
        if (r.kind === "series" && r.series) {
          const s = r.series;
          items.push({
            type: "series",
            sortOrder: r.sort_order,
            series: {
              id: s.id,
              title: s.title,
              lessonCount: s.lesson_count ?? 0,
              rabbiId: s.rabbi_id ?? null,
              rabbiName: s.rabbi_id ? rabbiMap.get(s.rabbi_id) || null : null,
              description: s.description ?? null,
              imageUrl: s.image_url ?? null,
              isDraft: false,
            },
          });
        } else if (r.kind === "lesson" && r.lessons) {
          const l = r.lessons;
          items.push({
            type: "lesson",
            sortOrder: r.sort_order,
            lesson: {
              id: l.id,
              title: l.title,
              duration: l.duration ?? null,
              thumbnail_url: l.thumbnail_url ?? null,
              video_url: l.video_url ?? null,
              audio_url: l.audio_url ?? null,
              attachment_url: l.attachment_url ?? null,
              rabbis: l.rabbi_id ? { name: rabbiMap.get(l.rabbi_id) || "" } : null,
            },
          });
        }
      }

      // Card count must equal the 1:1 allow-list count (the series page count), NOT the raw
      // series.lesson_count — else cards show inflated numbers (מידות 117 vs 30, קשתיאל 24 vs 23,
      // לשון הקודש 149 vs 37). Prefer the book-scoped key, then the plain series key.
      const seriesItems = items.filter((i) => i.type === "series") as Array<{ type: "series"; sortOrder: number; series: PublicListingSeries }>;
      if (seriesItems.length) {
        const keys: string[] = [];
        for (const si of seriesItems) {
          if (book) keys.push(`${si.series.id}|${book}`);
          keys.push(si.series.id);
        }
        const { data: cntRows } = await (supabase as any)
          .from("teacher_listing_items")
          .select("key")
          .eq("scope", "series_lessons")
          .in("key", keys);
        const cnt = new Map<string, number>();
        for (const r of (cntRows || []) as any[]) cnt.set(r.key, (cnt.get(r.key) || 0) + 1);
        for (const si of seriesItems) {
          const c = (book ? cnt.get(`${si.series.id}|${book}`) : undefined) || cnt.get(si.series.id);
          if (c) si.series.lessonCount = c;
        }
      }
      return { items };
    },
  });

  const items = q.data?.items || [];
  return {
    items,
    seriesCount: items.filter((i) => i.type === "series").length,
    lessonCount: items.filter((i) => i.type === "lesson").length,
    isLoading: q.isLoading,
    hasListing: items.length > 0,
  };
}
