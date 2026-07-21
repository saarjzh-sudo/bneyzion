import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getCurrentParasha,
  getParashaSeriesTitle,
  getParashaChumash,
  PARASHA_ARTICLE_SERIES,
  CHUMASH_RIDDLE_SERIES,
  LEGACY_RIDDLES_SERIES_ID,
  scoreRiddleLessonMatch,
} from "@/lib/parashaCalendar";

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

  // Combined (double) parashiot are joined with a hyphen/maqaf — e.g.
  // "מטות-מסעי", "נצבים-וילך", "אחרי מות-קדושים". The DB titles content by the
  // individual parasha ("פרשת מטות" / "פרשת מסעי"), so split on the hyphen/maqaf
  // and add each half as its own search term (space-joined two-word names like
  // "שלח לך" are handled by shortForms above and are NOT split here).
  if (/[-־]/.test(parasha)) {
    for (const half of parasha.split(/\s*[-־]\s*/)) {
      const h = half.trim();
      if (h && !terms.includes(h)) terms.push(h);
      const hShort = shortForms[h];
      if (hShort && !terms.includes(hShort)) terms.push(hShort);
    }
  }
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

      // מאתר בתוך קבוצת סדרות את מאמר הפרשה הנוכחית — מהמונח הספציפי לקצר.
      const findParashaLesson = async (seriesIds: string[]) => {
        for (const term of parashaSearchTerms) {
          const { data: lessons } = await supabase
            .from("lessons")
            .select("id, title, content, series_id")
            .in("series_id", seriesIds)
            .eq("status", "published")
            .ilike("title", `%${term}%`)
            .limit(10);
          // R-PAR1 word-boundary guard: '%חוקת%' also matches 'בחוקתי' etc.
          const valid = (lessons || []).filter((l) => titleMatchesParasha(l.title, parashaSearchTerms));
          const pick = valid.find((l) => l.content) || valid[0];
          if (pick) return pick as { id: string; title: string; content: string | null; series_id: string };
        }
        return null;
      };

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
          const lesson = await findParashaLesson(seriesIds);
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

      // Y6 (יואב 21.7): סדרות שסומנו באדמין (series.show_in_parasha) מצטרפות
      // לפינה בלי דיפלוי — יואב מסמן בעריכת-סדרה והסדרה חיה כאן תוך חצי דקה.
      const { data: flagged } = await supabase
        .from("series")
        .select("id, title, rabbis!series_rabbi_id_fkey(name)")
        .eq("show_in_parasha", true)
        .in("status", ["active", "published"]);

      const hardcodedTitles = new Set(PARASHA_ARTICLE_SERIES.map((s) => s.seriesTitle));
      const flaggedByTitle = new Map<string, { rabbi: string; ids: string[] }>();
      for (const s of flagged || []) {
        if (hardcodedTitles.has(s.title)) continue; // כבר מיוצגת ברשימה הקבועה
        const cur = flaggedByTitle.get(s.title) || {
          rabbi: (s as any).rabbis?.name || "",
          ids: [] as string[],
        };
        cur.ids.push(s.id);
        flaggedByTitle.set(s.title, cur);
      }

      const flaggedResults: ParashaArticleSeries[] = [];
      for (const [title, spec] of flaggedByTitle) {
        const lesson = await findParashaLesson(spec.ids);
        flaggedResults.push({
          title,
          rabbi: spec.rabbi,
          seriesId: lesson?.series_id ?? spec.ids[0],
          lessonId: lesson?.id ?? null,
          lessonTitle: lesson?.title ?? null,
          lessonContent: lesson?.content ?? null,
        });
      }
      // מיד אחרי הסדרה הראשית — בעמוד הבית מוצגות רק 5 הראשונות, ו"תופיע תמיד"
      // מחייב שהסדרות המסומנות לא ייחתכו בסוף הרשימה.
      results.splice(Math.min(1, results.length), 0, ...flaggedResults);

      return results;
    },
  });

  // Get riddle for current parasha (Saar 11.7.2026: "יש 5 סדרות כאלה על כל הפרשות").
  // Primary source: the per-chumash series "חידות לילדים - פרשת השבוע, לפי סדר
  // העולים לתורה" — looked up by series.bible_book (set in DB 11.7.2026, backup
  // series_bak_riddles_20260711), with a hardcoded ID map as safety net.
  // Matching is done client-side with scoreRiddleLessonMatch, which handles
  // "פרשת"/"פרשות", hyphen vs space, spelling variants (ניצבים/שלח), and double
  // parashiot in both directions (combined week ↔ combined/single lesson).
  // Fallback: the legacy mixed series (c852edd8) when nothing matches.
  const riddleQuery = useQuery({
    queryKey: ["parasha-riddle", parasha, chumash],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      type RiddleLesson = { id: string; title: string; content: string | null; description: string | null; series_id: string };

      const pickBest = (lessons: RiddleLesson[] | null): RiddleLesson | null => {
        const scored = (lessons || [])
          .map((l) => ({ l, score: scoreRiddleLessonMatch(l.title, parasha) }))
          .filter((x) => x.score > 0 && x.l.content);
        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.l || null;
      };

      // 1) Per-chumash riddle series
      if (chumash) {
        const { data: seriesMatches } = await supabase
          .from("series")
          .select("id")
          .eq("bible_book", chumash)
          .ilike("title", "%חידות לילדים%")
          .in("status", ["active", "published"]);
        let seriesIds = (seriesMatches || []).map((s) => s.id);
        if (seriesIds.length === 0 && CHUMASH_RIDDLE_SERIES[chumash]) {
          seriesIds = [CHUMASH_RIDDLE_SERIES[chumash]];
        }
        if (seriesIds.length > 0) {
          const { data: lessons } = await supabase
            .from("lessons")
            .select("id, title, content, description, series_id")
            .in("series_id", seriesIds)
            .eq("status", "published")
            .limit(60);
          const best = pickBest(lessons as RiddleLesson[] | null);
          if (best) return { lesson: best, seriesId: best.series_id };
        }
      }

      // 2) Legacy fallback series
      const { data: legacy } = await supabase
        .from("lessons")
        .select("id, title, content, description, series_id")
        .eq("series_id", LEGACY_RIDDLES_SERIES_ID)
        .eq("status", "published")
        .limit(80);
      const legacyBest = pickBest(legacy as RiddleLesson[] | null);
      return {
        lesson: legacyBest,
        seriesId: (chumash && CHUMASH_RIDDLE_SERIES[chumash]) || LEGACY_RIDDLES_SERIES_ID,
      };
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
    riddle: riddleQuery.data?.lesson || null,
    // The riddle series that fits the current chumash — used by the CTA card
    // when there's no matched lesson to scroll to.
    riddleSeriesId: riddleQuery.data?.seriesId || LEGACY_RIDDLES_SERIES_ID,
    isLoading: parashaLessonsQuery.isLoading || audioLessonsQuery.isLoading || articleSeriesQuery.isLoading,
  };
}
