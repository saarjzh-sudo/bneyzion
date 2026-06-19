import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentParasha, getParashaSeriesTitle, getParashaChumash, PARASHA_ARTICLE_SERIES } from "@/lib/parashaCalendar";

const RIDDLES_SERIES_ID = "c852edd8-d959-4c8d-bf7e-17b5881275fa";

export interface ParashaLesson {
  id: string;
  title: string;
  description: string | null;
  source_type: string;
  audio_url: string | null;
  video_url: string | null;
  content: string | null;
  duration: number | null;
  rabbi_name: string | null;
  series_title: string | null;
}

export interface ParashaArticleSeries {
  title: string;
  rabbi: string;
  seriesId: string | null;
  lessonId: string | null;
  lessonTitle: string | null;
  lessonContent: string | null;
}

// Some parasha names in the DB are shortened (e.g. "שלח" instead of "שלח לך").
// Build an array of search terms for each parasha, shortest first, so we get
// the most specific match but also the short form as a fallback.
function getParashaSearchTerms(parasha: string): string[] {
  const terms: string[] = [parasha]; // full name always first
  // Common two-word parashiot where DB titles use only the first word
  const shortForms: Record<string, string> = {
    "שלח לך": "שלח",
    "לך לך": "לך לך", // keep as-is, already unambiguous
    "כי תשא": "כי תשא",
    "כי תצא": "כי תצא",
    "כי תבוא": "כי תבוא",
    "חיי שרה": "חיי שרה",
    "אחרי מות": "אחרי מות",
  };
  const short = shortForms[parasha];
  if (short && short !== parasha) terms.push(short);
  return terms;
}

/**
 * R-PAR1 fix: bare ilike '%<name>%' over-matches short names (נח/בא/צו/ראה…).
 * After the DB fetch we apply a strict JS-side word-boundary check.
 * A lesson title passes if it contains the parasha name preceded by a word
 * separator (start-of-string, space, "|", "–", "-", "פרשת") and followed by
 * the same, or by end-of-string.
 *
 * Examples that MUST pass:  "פרשת נח", "נח - דף עבודה", "שיעור בנח |א"
 * Examples that MUST fail:  "מנחם", "מנחה", "ברכה" (contains "כה" not "כי")
 */
function titleMatchesParasha(title: string, terms: string[]): boolean {
  const separators = "(?:^|[\\s|–\\-/״\'׳`\"(])";
  const afterSeps  = "(?:[\\s|–\\-/״\'׳`\"()]|$)";
  for (const term of terms) {
    // Escape regex special chars in the term (Hebrew letters are safe but |, . etc. are not)
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`${separators}${escaped}${afterSeps}`, "");
    if (re.test(title)) return true;
    // Also accept "פרשת <term>" as a prefix (common DB pattern)
    if (title.includes(`פרשת ${term}`)) return true;
    if (title.includes(`פרשה ${term}`)) return true;
  }
  return false;
}

export function useParasha() {
  const queryClient = useQueryClient();

  // The current parasha is date-derived. Keep it in state and re-evaluate on a timer
  // + on tab focus, so the page rolls over to the new week LIVE — no manual refresh.
  const [parasha, setParasha] = useState<string>(() => getCurrentParasha());
  useEffect(() => {
    const recheck = () => {
      const p = getCurrentParasha();
      setParasha((prev) => (p && p !== prev ? p : prev));
    };
    const id = setInterval(recheck, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") recheck(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  // Supabase Realtime — same push mechanism as the live donation counter
  // (see useTierCounts): when lessons/series change in the DB, invalidate the
  // parsha queries so new/edited content appears live without a reload.
  useEffect(() => {
    const invalidate = () =>
      queryClient.invalidateQueries({
        predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("parasha-"),
      });
    const channel = supabase
      .channel("parasha-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "lessons" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "series" }, invalidate)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const seriesTitle = getParashaSeriesTitle(parasha);
  const chumash = getParashaChumash(parasha);
  const parashaSearchTerms = getParashaSearchTerms(parasha);

  // Get ALL published lessons for the current parasha (Saar feedback 10.6.2026: the page was
  // thin — it only read ONE exact-title series). The old site's parasha page aggregated many
  // sources, so we collect every public lesson whose title mentions the parasha, across all
  // series, exclude teacher-wing content, and dedup by title+rabbi.
  // 11.6.2026: Added short-form fallback — "שלח לך" lessons are titled "פרשת שלח" in DB.
  const parashaLessonsQuery = useQuery({
    queryKey: ["parasha-lessons-all", parasha],
    // Live updates — same approach the donation counter actually relies on:
    // poll every 30s + refetch on tab focus (realtime push above is an instant bonus).
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!parasha) return [];

      // Build OR filter for all search terms (full name + short form)
      const orFilter = parashaSearchTerms.map(t => `title.ilike.%${t}%`).join(",");

      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, title, description, source_type, audio_url, video_url, content, duration, rabbi_id, series_id, series(title)")
        .eq("status", "published")
        .or(orFilter)
        .not("audience_tags", "cs", "{teachers}")
        .order("title")
        .limit(150);

      if (!lessons || lessons.length === 0) return [];

      // R-PAR1: apply strict word-boundary filter client-side to reject false matches
      // from short parasha names (נח/בא/צו/ראה/שלח/בלק/עקב/אמור).
      const wordBoundaryFiltered = lessons.filter((l) =>
        titleMatchesParasha(l.title, parashaSearchTerms)
      );

      // Dedup by normalized title + rabbi (the migration cross-listed/duplicated lessons)
      const seen = new Set<string>();
      const deduped = wordBoundaryFiltered.filter((l) => {
        const key = (l.title || "").trim().replace(/[״"'׳`|]/g, "").replace(/\s+/g, " ") + "::" + (l.rabbi_id || "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Get rabbi names
      const rabbiIds = [...new Set(deduped.filter(l => l.rabbi_id).map(l => l.rabbi_id!))];
      const { data: rabbis } = await supabase
        .from("rabbis")
        .select("id, name")
        .in("id", rabbiIds.length > 0 ? rabbiIds : ["00000000-0000-0000-0000-000000000000"]);

      const rabbiMap = new Map(rabbis?.map(r => [r.id, r.name]) || []);

      return deduped.map(l => ({
        ...l,
        rabbi_name: l.rabbi_id ? rabbiMap.get(l.rabbi_id) || null : null,
        series_title: (l as any).series?.title || seriesTitle,
      })) as ParashaLesson[];
    },
  });

  // Get audio lessons (Torah reading)
  const audioLessonsQuery = useQuery({
    queryKey: ["parasha-audio", parasha, chumash],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!chumash) return [];

      // Find Torah reading series under this chumash
      const { data: chumashSeries } = await supabase
        .from("series")
        .select("id, title")
        .eq("title", chumash);

      if (!chumashSeries || chumashSeries.length === 0) return [];

      // Find audio series (קריאה בטעמים, קריאה עם ביאור)
      const chumashId = chumashSeries[0].id;
      const { data: audioSeries } = await supabase
        .from("series")
        .select("id, title")
        .eq("parent_id", chumashId)
        .or("title.ilike.%קריאה בטעמים%,title.ilike.%קריאה עם ביאור%");

      if (!audioSeries || audioSeries.length === 0) return [];

      // Find lessons with parasha name
      const seriesIds = audioSeries.map(s => s.id);
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, title, description, source_type, audio_url, video_url, content, duration, rabbi_id")
        .in("series_id", seriesIds)
        .eq("status", "published")
        .ilike("title", `%${parasha}%`);

      if (!lessons) return [];

      const rabbiIds = [...new Set(lessons.filter(l => l.rabbi_id).map(l => l.rabbi_id!))];
      const { data: rabbis } = await supabase
        .from("rabbis")
        .select("id, name")
        .in("id", rabbiIds.length > 0 ? rabbiIds : ["00000000-0000-0000-0000-000000000000"]);

      const rabbiMap = new Map(rabbis?.map(r => [r.id, r.name]) || []);

      return lessons.map(l => ({
        ...l,
        rabbi_name: l.rabbi_id ? rabbiMap.get(l.rabbi_id) || null : null,
        series_title: null,
      })) as ParashaLesson[];
    },
  });

  // Get article series and find matching lessons
  const articleSeriesQuery = useQuery({
    queryKey: ["parasha-article-series", parasha],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const results: ParashaArticleSeries[] = [];
      
      for (const articleSeries of PARASHA_ARTICLE_SERIES) {
        // Round-2 fix: the migration produced DUPLICATE series with the same title
        // (e.g. "מידות בפרשה" exists 6×). The old .limit(2)+pick logic often landed on an
        // empty duplicate and dropped the whole section. Collect ALL same-titled series and
        // search the parasha lesson across every one of them.
        // chumashScoped columns live under a per-chumash title (e.g.
        // "מאמרים לשולחן השבת - חומש במדבר"). Everything else uses the exact title.
        const lookupTitle = (articleSeries as any).chumashScoped && chumash
          ? `${articleSeries.seriesTitle} - חומש ${chumash}`
          : articleSeries.seriesTitle;
        const { data: seriesMatches } = await supabase
          .from("series")
          .select("id")
          .eq("title", lookupTitle)
          .in("status", ["active", "published"]);
        const seriesIds = (seriesMatches || []).map((s) => s.id);

        let seriesId: string | null = seriesIds[0] || null;
        let lessonId: string | null = null;
        let lessonTitle: string | null = null;
        let lessonContent: string | null = null;

        if (seriesIds.length > 0) {
          // Try each search term in order — most specific first (e.g. "שלח לך"),
          // then short form (e.g. "שלח") so "פרשת שלח" articles are found.
          let lesson: { id: string; title: string; content: string | null; series_id: string } | null = null;
          for (const term of parashaSearchTerms) {
            const { data: lessons } = await supabase
              .from("lessons")
              .select("id, title, content, series_id")
              .in("series_id", seriesIds)
              .eq("status", "published")
              .ilike("title", `%${term}%`)
              .limit(10);
            // R-PAR1 word-boundary guard: '%חוקת%' also matches 'בחוקתי' etc. Pick the
            // candidate whose title contains the parasha as a whole word; prefer one with content.
            const valid = (lessons || []).filter((l) => titleMatchesParasha(l.title, parashaSearchTerms));
            const pick = valid.find((l) => l.content) || valid[0];
            if (pick) { lesson = pick as any; break; }
          }

          if (lesson) {
            lessonId = lesson.id;
            lessonTitle = lesson.title;
            lessonContent = lesson.content;
            seriesId = lesson.series_id; // point the CTA at the series that actually has the lesson
          }
        }

        results.push({
          title: articleSeries.title,
          rabbi: articleSeries.rabbi,
          seriesId,
          lessonId,
          lessonTitle,
          lessonContent,
        });
      }

      return results;
    },
  });

  // Get riddle for current parasha
  const riddleQuery = useQuery({
    queryKey: ["parasha-riddle", parasha],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, title, content, description")
        .eq("series_id", RIDDLES_SERIES_ID)
        .eq("status", "published")
        .ilike("title", `%${parasha}%`)
        .limit(1);

      return lessons?.[0] || null;
    },
  });

  // Get the series ID for the current parasha (for the "כל תכני הפרשה" CTA)
  // §9 R14: maybeSingle() → .limit(2) + deterministic pick to avoid silent error on duplicate titles.
  const parashaSeriesIdQuery = useQuery({
    queryKey: ["parasha-series-id", seriesTitle],
    queryFn: async () => {
      if (!seriesTitle) return null;
      const { data: seriesList } = await supabase
        .from("series")
        .select("id, status")
        .eq("title", seriesTitle)
        .in("status", ["active", "published"])
        .limit(2);
      if (!seriesList || seriesList.length === 0) return null;
      if (seriesList.length > 1) {
        // Pick active over published; if tie pick first
        const active = seriesList.find((s) => s.status === "active");
        if (active) return active.id;
      }
      return seriesList[0].id;
    },
  });

  return {
    parasha,
    chumash,
    seriesTitle,
    parashaSeriesId: parashaSeriesIdQuery.data || null,
    lessons: parashaLessonsQuery.data || [],
    audioLessons: audioLessonsQuery.data || [],
    articleSeries: articleSeriesQuery.data || PARASHA_ARTICLE_SERIES.map(s => ({ title: s.title, rabbi: s.rabbi, seriesId: null, lessonId: null, lessonTitle: null, lessonContent: null })),
    riddle: riddleQuery.data || null,
    isLoading: parashaLessonsQuery.isLoading || audioLessonsQuery.isLoading || articleSeriesQuery.isLoading,
  };
}
