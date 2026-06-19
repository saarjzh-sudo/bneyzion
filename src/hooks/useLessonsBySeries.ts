/**
 * useLessonsBySeries — fetch all published lessons of a given series_id.
 * Used by sandbox preview pages (DesignPreviewSeriesPage, DesignPreviewLessonPopup)
 * and will become the canonical hook for the live SeriesPagePublic page once
 * the redesign is rolled out.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isPublicDualAllowed } from "@/lib/publicAudience";

export function useLessonsBySeries(seriesId: string | undefined, book?: string | null) {
  return useQuery({
    queryKey: ["lessons-by-series", seriesId, book ?? null],
    queryFn: async () => {
      if (!seriesId) return [];

      // ── (Yoav R6, 17.6.2026) 1:1 LESSON allow-list inside a series ──
      // teacher_listing_items scope='series_lessons' key=<seriesId> holds the OLD series
      // page's exact ordered lessons (matched by audio basename → the golden key). When
      // present it DRIVES the list: wrong-audio intruders / migration dups are excluded by
      // construction, whole-Torah series are scoped to what the old page showed, order = old.
      // No rows → fall through to the heuristic below (fully reversible, nothing regresses).
      // Book-scoped key first (shared whole-Torah series shown per-book — '<id>|<book>'),
      // then the plain series key. No book param → plain key only (full series, no regression).
      const candidateKeys = book ? [`${seriesId}|${book}`, seriesId] : [seriesId];
      let listRows: any[] | null = null;
      for (const key of candidateKeys) {
        const { data } = await (supabase as any)
          .from("teacher_listing_items")
          .select("lesson_id, sort_order")
          .eq("scope", "series_lessons")
          .eq("key", key)
          .order("sort_order", { ascending: true });
        if (data && data.length > 0) { listRows = data as any[]; break; }
      }
      if (listRows && listRows.length > 0) {
        const ids = (listRows as any[]).map((r) => r.lesson_id).filter(Boolean);
        const byId = new Map<string, any>();
        for (let i = 0; i < ids.length; i += 400) {
          const chunk = ids.slice(i, i + 400);
          const { data } = await supabase
            .from("lessons")
            .select("*, rabbis!lessons_rabbi_id_fkey(name)")
            .in("id", chunk);
          for (const l of data || []) byId.set(l.id, l);
        }
        const seenL = new Set<string>();
        const ordered: any[] = [];
        for (const r of listRows as any[]) {
          const l = byId.get(r.lesson_id);
          if (l && !seenL.has(l.id)) { seenL.add(l.id); ordered.push(l); }
        }
        if (ordered.length > 0) return ordered;
      }

      // R3 15.6.2026 (Saar): for the כלי עזר section roots ONLY, dual-tagged study-aids
      // (published + ['teachers','general']) are genuinely public → relax the teacher filter.
      // Everywhere else the strict rule stays. See src/lib/publicAudience.ts.
      const allowDual = isPublicDualAllowed(seriesId);
      // §0.1 order: sort_order NULLS LAST, bible_chapter NULLS LAST, title ASC
      // §4: explicit limit(2000) — PostgREST silently caps at 1000 without it (R-SER6).
      //     Series with >1000 lessons (e.g. large Nevi'im books) would be silently truncated.
      // Two pages of 1000: fetch 1-1000 then 1001-2000 to beat the PostgREST cap.
      const fetchPage = async (from: number, to: number) => {
        let q = supabase
          .from("lessons")
          .select("*, rabbis!lessons_rabbi_id_fkey(name)")
          .eq("series_id", seriesId)
          .eq("status", "published");
        // §0.3 (REVERTED 14.6.2026 — Saar round-3): teacher content NEVER appears in public.
        // The old dual-audience filter let ['general','teachers'] rows leak into public lists.
        // Strict rule: exclude ANY lesson tagged 'teachers' (matches useParasha/useBible) —
        // EXCEPT the explicitly-allowed כלי עזר roots (Saar 15.6.2026).
        if (!allowDual) q = q.not("audience_tags", "cs", "{teachers}");
        const { data, error } = await q
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("bible_chapter", { ascending: true, nullsFirst: false })
          .order("title", { ascending: true })
          .range(from, to);
        if (error) throw error;
        return data || [];
      };
      const page1 = await fetchPage(0, 999);
      const page2 = page1.length === 1000 ? await fetchPage(1000, 1999) : [];
      const allRows = [...page1, ...page2];

      // §0.2 dedup by physical id only — the curated sort_order plan produces exact row sets;
      // same-title multi-part shiurim are legitimate and must NOT be collapsed.
      // We only deduplicate rows that are physically identical (same DB id) to handle the
      // migration COPY-duplicate case where the same id was inserted twice.
      const seen = new Set<string>();
      const seenDup = new Set<string>();
      return allRows.filter((l: any) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        // §empty-guard (Saar 19.6): never render a lesson with NO content AND NO media — it shows
        // a titled card that opens an empty dialog (dead end). Reversible: backfill content → reappears.
        const hasContent = l.content && String(l.content).trim() !== "";
        const hasMedia = l.audio_url || l.video_url || l.attachment_url || l.legacy_attachment_url;
        if (!hasContent && !hasMedia) return false;
        // §copy-dedup (Saar 19.6): collapse migration COPY-duplicates that share BOTH the same
        // audio file AND the same base-title (modulo a "(N)" suffix) — identical content shown N×.
        // Safety: requires same audio AND same base-title, so generic-filename / mislabel cases
        // (different title) and legitimate multi-part lessons (different audio) are NOT collapsed.
        const ab = (l.audio_url || l.legacy_attachment_url || "")
          .split("/").pop()?.split("?")[0]?.toLowerCase() || "";
        if (ab) {
          const bt = String(l.title || "").replace(/\s*\(\d+\)\s*/g, " ").replace(/\s+/g, " ").trim();
          const key = ab + "||" + bt;
          if (seenDup.has(key)) return false;
          seenDup.add(key);
        }
        return true;
      });
    },
    enabled: !!seriesId,
    staleTime: 1000 * 60 * 5,
  });
}
