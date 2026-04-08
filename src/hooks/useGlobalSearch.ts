import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Strip Hebrew diacritics (nikud), special punctuation, and normalize whitespace */
function normalizeHebrew(text: string): string {
  return text
    // Remove nikud (Hebrew diacritics U+0591–U+05C7)
    .replace(/[\u0591-\u05C7]/g, "")
    // Remove geresh / gershayim variants
    .replace(/[״׳"'`]/g, "")
    // Remove special dashes
    .replace(/[–—\-]/g, " ")
    // Remove LTR/RTL control chars
    .replace(/[\u200E\u200F\u202A-\u202E]/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/** Generate multiple search patterns from query for better Hebrew matching */
function buildPatterns(query: string): string[] {
  const normalized = normalizeHebrew(query);
  const patterns = [`%${normalized}%`];

  // Also search original if different
  const trimmed = query.trim();
  if (trimmed !== normalized) {
    patterns.push(`%${trimmed}%`);
  }

  // Strip common prefixes for broader matching
  const prefixes = ["שיעור ", "סדרת ", "פרשת ", "הרב ", "ספר "];
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      patterns.push(`%${normalized.slice(prefix.length)}%`);
    }
  }

  return [...new Set(patterns)];
}

interface RabbiResult {
  id: string;
  name: string;
  title: string | null;
  image_url: string | null;
  lesson_count: number;
}

interface SeriesResult {
  id: string;
  title: string;
  lesson_count: number;
  rabbis: { name: string } | null;
}

interface LessonResult {
  id: string;
  title: string;
  rabbis: { name: string } | null;
  series: { title: string } | null;
}

interface TopicResult {
  id: string;
  name: string;
  slug: string;
}

export interface SearchResults {
  rabbis: RabbiResult[];
  series: SeriesResult[];
  lessons: LessonResult[];
  topics: TopicResult[];
}

export interface SearchSuggestion {
  text: string;
  type: "rabbi" | "series" | "topic";
}

export function useGlobalSearch(query: string) {
  const [results, setResults] = useState<SearchResults>({ rabbis: [], series: [], lessons: [], topics: [] });
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults({ rabbis: [], series: [], lessons: [], topics: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    timerRef.current = setTimeout(async () => {
      const patterns = buildPatterns(trimmed);
      const mainPattern = patterns[0];

      // Build OR filter for rabbis with all patterns
      const rabbiOrClauses = patterns
        .flatMap(p => [`name.ilike.${p}`, `title.ilike.${p}`, `specialty.ilike.${p}`])
        .join(",");

      const [rabbisRes, seriesRes, lessonsRes, topicsRes] = await Promise.all([
        supabase
          .from("rabbis")
          .select("id, name, title, image_url, lesson_count")
          .or(rabbiOrClauses)
          .eq("status", "active")
          .order("lesson_count", { ascending: false })
          .limit(6),
        supabase
          .from("series")
          .select("id, title, lesson_count, rabbis(name)")
          .or(patterns.map(p => `title.ilike.${p}`).join(","))
          .eq("status", "active")
          .order("lesson_count", { ascending: false })
          .limit(8),
        supabase
          .from("lessons")
          .select("id, title, rabbis(name), series(title)")
          .or(patterns.map(p => `title.ilike.${p}`).join(","))
          .eq("status", "published")
          .limit(8),
        supabase
          .from("topics")
          .select("id, name, slug")
          .ilike("name", mainPattern)
          .limit(5),
      ]);

      setResults({
        rabbis: (rabbisRes.data as RabbiResult[]) || [],
        series: (seriesRes.data as SeriesResult[]) || [],
        lessons: (lessonsRes.data as LessonResult[]) || [],
        topics: (topicsRes.data as TopicResult[]) || [],
      });
      setIsLoading(false);
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Generate autocomplete suggestions from results
  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const items: SearchSuggestion[] = [];
    for (const r of results.rabbis.slice(0, 3)) {
      items.push({ text: r.title ? `${r.title} ${r.name}` : r.name, type: "rabbi" });
    }
    for (const s of results.series.slice(0, 3)) {
      items.push({ text: s.title, type: "series" });
    }
    for (const t of results.topics.slice(0, 2)) {
      items.push({ text: t.name, type: "topic" });
    }
    return items;
  }, [results]);

  const totalResults = results.rabbis.length + results.series.length + results.lessons.length + results.topics.length;
  const hasResults = totalResults > 0;

  return { results, isLoading, hasResults, suggestions, totalResults };
}
