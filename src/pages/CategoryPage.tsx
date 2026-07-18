/**
 * CategoryPage — /category/:id
 *
 * Three-part layout mirroring the old site:
 *   1. Closed series cards (link to /series/:id) — parsha event-series excluded by useSeriesForNode
 *   2. Standalone lessons (series_id = this node directly)
 *   3. שו"ת — split from standalone if source_type/content_type marker exists
 *
 * C1: parsha event-series filter lives in useContentSidebar.useSeriesForNode (isParshaEventSeries).
 * C2: SeriesBlock accordion removed; closed SeriesRowCard replaces it.
 * C3: lesson count shown from series.lessonCount (scoped to the series, not roll-up).
 * C4: three-part structure: [series cards] → [standalone lessons] → [שו"ת].
 * C5: children of nested nav-nodes exposed via useSeriesForNode (no change needed in hook).
 * C6: batched multi-rabbi query via useSeriesRabbisMap + formatRabbis helper.
 * C7: Hebrew α-sort within page-only band lives in useContentSidebar sort comparator.
 * C8: BibleBookPage chapter grid is handled separately.
 *
 * Layout: DesignLayout (v2 with sidebar). Cream+gold, RTL.
 */

import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  Loader2,
  BookOpen,
  Play,
  Volume2,
  FileText,
  AlertCircle,
  Construction,
  Users,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import {
  colors,
  fonts,
  gradients,
  radii,
  shadows,
  getSeriesCoverImage,
  formatDuration,
} from "@/lib/designTokens";
import { useSeriesDetail } from "@/hooks/useSeriesDetail";
import { useSeriesBreadcrumb } from "@/hooks/useSeriesHierarchy";
import { Seo, collectionJsonLd, breadcrumbJsonLd } from "@/components/seo/Seo";
import {
  useContentSidebar,
  RECORDED_PROJECT_ID,
  fetchRecordedProjectSeries,
} from "@/hooks/useContentSidebar";
import { usePublicBookListing, type PublicListingItem } from "@/hooks/usePublicBookListing";
import { supabase } from "@/integrations/supabase/client";
// רמה 21 (סער 17.7): דפי הכנסים הייעודיים מוצגים כבלוק בקטגוריית "ימי עיון בתנ"ך"
import { KNESIM } from "@/data/kenesim";

// content_nodes root של "ימי עיון בתנ"ך" (ROOT_IDS.yemeiIyun ב-useContentSidebar)
const YEMEI_IYUN_ID = "f4040001-0001-4000-8000-000000000000";

// ─── types ───────────────────────────────────────────────────────────────────

type CanonicalSeries = {
  id: string;
  title: string;
  lessonCount: number | null;
  rabbiId: string | null;
  rabbiName: string | null;
  description?: string | null;
  imageUrl?: string | null;
  isDraft?: boolean;
};

type DirectLesson = {
  id: string;
  title: string;
  duration: number | null;
  published_at: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  attachment_url: string | null;
  bible_chapter: number | null;
  series_id: string | null;
  rabbi_id: string | null;
  source_type: string | null;
  content_type: string | null;
  rabbis: { name: string } | null;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function resolveSeriesImage(s: { imageUrl?: string | null; title: string }): string {
  return s.imageUrl || getSeriesCoverImage(s.title) || "/images/series-default.webp";
}

/** Format up to 2 rabbi names; >2 → "X, Y ועוד" */
export function formatRabbis(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]} ועוד`;
}

function lessonMediaIcon(l: {
  video_url?: string | null;
  audio_url?: string | null;
  attachment_url?: string | null;
}) {
  if (l.video_url) return <Play size={13} style={{ flexShrink: 0 }} />;
  if (l.audio_url) return <Volume2 size={13} style={{ flexShrink: 0 }} />;
  if (l.attachment_url) return <FileText size={13} style={{ flexShrink: 0 }} />;
  return <BookOpen size={13} style={{ flexShrink: 0 }} />;
}

// ─── formats (Yoav 9.7: visible per-row marker + filter bar) ─────────────────

export type FormatKey = "video" | "audio" | "pdf" | "text";

export const FORMAT_META: Record<
  FormatKey,
  { label: string; Icon: typeof Play }
> = {
  video: { label: "וידאו", Icon: Play },
  audio: { label: "שמע", Icon: Volume2 },
  pdf: { label: "PDF", Icon: FileText },
  text: { label: "טקסט", Icon: BookOpen },
};

const FORMAT_ORDER: FormatKey[] = ["video", "audio", "pdf", "text"];

export function classifyLessonFormat(l: {
  video_url?: string | null;
  audio_url?: string | null;
  attachment_url?: string | null;
}): FormatKey {
  if (l.video_url) return "video";
  if (l.audio_url) return "audio";
  if (l.attachment_url) return "pdf";
  return "text";
}

/** Detect שו"ת by source_type or content_type marker */
function isShut(l: DirectLesson): boolean {
  const st = (l.source_type ?? "").toLowerCase();
  const ct = (l.content_type ?? "").toLowerCase();
  return st.includes("שו") || st.includes("shut") || ct.includes("שו") || ct.includes("shut");
}

// ─── parsha-event-series regex (mirrors useContentSidebar) ──────────────────
// Matches Torah parsha containers: "פרשת נח | ו-יא", "פרשת בראשית | א-ו", etc.
// Deliberately does NOT match Neviim chapter series ("הושע פרק א").
const IS_PARSHA_EVENT = /^\s*פרשת\s.*\|\s*[א-ת]/;

// ─── normalise title for dedup ───────────────────────────────────────────────
function normTitle(t: string): string {
  return t
    .trim()
    .replace(/[״"'׳'""`]/g, "")
    .replace(/\s+/g, " ");
}

// ─── hook: direct + standalone lessons for category node ─────────────────────
//
// Three-pass approach:
//  Pass 1 — Fetch direct children series of this node (one query).
//            Parsha event-series (title matches IS_PARSHA_EVENT) are
//            excluded from cards but their lessons ARE the standalone band.
//            For Neviim/Ketuvim (no parsha-event children) this gives an
//            empty parsha-ids list → standalone band = category-direct only.
//  Pass 2 — Fetch lessons where series_id IN (nodeId ∪ parshaEventIds)
//            AND copied_from IS NULL (originals only, not rabbi-series copies).
//  Pass 3 — Client-side: dedup by normalised title, exclude titles that appear
//            in the canonical series cards (canonicalTitles set, passed in).
//
// Safety for Neviim: if parshaEventIds is empty, only the 4-5 lessons directly
// on the node are returned (correct — chapter series lessons live in the cards).

function useDirectLessons(
  nodeId: string | undefined,
  _canonicalSeriesCardIds: string[],
) {
  // Standalone lessons & שו"ת on the old category page are pre-identified by the
  // re-scrape of the old site (the exact 39+20 per book) and marked in the DB with
  // lessons.cat_standalone = true (the canonical copy of each). This is the only
  // reliable 1:1 source — the old site's "single lesson" rows can't be derived
  // generically (they sit inside parsha event-series alongside rabbi-series content).
  // We resolve the book from the node, then fetch its marked standalone lessons.
  const nodeQuery = useQuery({
    queryKey: ["category-node-book", nodeId],
    enabled: !!nodeId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data } = await supabase
        .from("series")
        .select("title, bible_book")
        .eq("id", nodeId!)
        .maybeSingle();
      return (data ?? null) as { title: string; bible_book: string | null } | null;
    },
  });

  const book = nodeQuery.data?.bible_book || nodeQuery.data?.title || null;

  const lessonsQuery = useQuery({
    queryKey: ["category-standalone-marked", book],
    enabled: !!book,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select(
          "id, title, duration, published_at, thumbnail_url, video_url, audio_url, attachment_url, bible_chapter, series_id, rabbi_id, source_type, content_type, rabbis!lessons_rabbi_id_fkey(name)"
        )
        .eq("bible_book", book!)
        .eq("cat_standalone", true)
        .eq("status", "published")
        // R3 14.6.2026 (Saar): standalone band had NO audience filter → teacher lessons
        // (חידות/דפי עבודה/שאלות + 14 teacher shiurim per chumash) leaked onto every parsha
        // page. Strict rule: teacher content NEVER public. Matches useParasha/useBible.
        .not("audience_tags", "cs", "{teachers}")
        .order("content_type", { ascending: true, nullsFirst: true }) // lessons before שו"ת
        .order("bible_chapter", { ascending: true, nullsFirst: false })
        .order("title", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as DirectLesson[];
    },
  });

  // Dedup by normalised title (defensive — marks should already be unique)
  const rawLessons = lessonsQuery.data ?? [];
  const seen = new Map<string, DirectLesson>();
  for (const l of rawLessons) {
    const key = normTitle(l.title);
    if (!seen.has(key)) seen.set(key, l);
  }
  const deduped = Array.from(seen.values());

  return {
    data: deduped,
    isLoading: nodeQuery.isLoading || lessonsQuery.isLoading,
  };
}

// ─── hook: batched distinct rabbis for all visible series (C6 / R5) ──────────
//
// One round-trip: fetch all published lessons for ALL visible series ids,
// group client-side by series_id, build ordered distinct-name list per series.
// Lead rabbi (series.rabbi_id) always comes first.

type SeriesRabbisMap = Map<string, string[]>; // series_id → ordered distinct rabbi names

function useSeriesRabbisMap(
  series: Array<{ id: string; rabbiId: string | null; rabbiName: string | null }>
): SeriesRabbisMap {
  const ids = series.map((s) => s.id);
  const { data } = useQuery({
    queryKey: ["series-rabbis-batch", ids.sort().join(",")],
    enabled: ids.length > 0,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (ids.length === 0) return [];
      // One batched lessons query for all series
      const { data: rows } = await supabase
        .from("lessons")
        .select("series_id, rabbi_id, rabbis!lessons_rabbi_id_fkey(name)")
        .in("series_id", ids)
        .eq("status", "published")
        .not("audience_tags", "cs", "{teachers}")
        .not("rabbi_id", "is", null)
        .limit(5000);
      return rows ?? [];
    },
  });

  // Build map: series_id → ordered distinct names (lead first)
  const map = new Map<string, string[]>();
  for (const s of series) {
    // Start with lead rabbi from series table (rabbiName already resolved)
    const lead: string[] = s.rabbiName ? [s.rabbiName] : [];
    map.set(s.id, lead);
  }
  for (const row of data ?? []) {
    const sid = (row as any).series_id as string;
    const rabbiRow = (row as any).rabbis as { name: string } | null;
    const name = rabbiRow?.name;
    if (!name || !sid) continue;
    const arr = map.get(sid);
    if (!arr) continue;
    if (!arr.includes(name)) arr.push(name);
  }
  return map;
}

// ─── hook: formats present per series (for row markers + format filter) ──────
//
// One paginated query (PostgREST max_rows=1000 → range-loop) over the visible
// series' published lessons, classified client-side. text = no media at all.

type SeriesFormatsMap = Map<string, Set<FormatKey>>;

function useSeriesFormatsMap(seriesIds: string[]): SeriesFormatsMap {
  const key = [...seriesIds].sort().join(",");
  const { data } = useQuery({
    queryKey: ["series-formats-batch", key],
    enabled: seriesIds.length > 0,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const all: Array<{
        series_id: string;
        video_url: string | null;
        audio_url: string | null;
        attachment_url: string | null;
      }> = [];
      const PAGE = 1000;
      for (let from = 0; from < 8000; from += PAGE) {
        const { data: rows, error } = await supabase
          .from("lessons")
          .select("series_id, video_url, audio_url, attachment_url")
          .in("series_id", seriesIds)
          .eq("status", "published")
          .not("audience_tags", "cs", "{teachers}")
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all.push(...((rows ?? []) as typeof all));
        if (!rows || rows.length < PAGE) break;
      }
      return all;
    },
  });

  const map: SeriesFormatsMap = new Map();
  for (const row of data ?? []) {
    if (!row.series_id) continue;
    let set = map.get(row.series_id);
    if (!set) {
      set = new Set<FormatKey>();
      map.set(row.series_id, set);
    }
    set.add(classifyLessonFormat(row));
  }
  return map;
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: node, isLoading: nodeLoading } = useSeriesDetail(id);
  const { data: breadcrumbs = [] } = useSeriesBreadcrumb(id);

  const { useSeriesForNode } = useContentSidebar();
  const { data: seriesList = [], isLoading: seriesLoading } = useSeriesForNode(id ?? null);

  // רמה 13 (משימה 10 של סער): צומת "פרוייקט התנ"ך המוקלט" ריק מילדים ישירים —
  // הסדרות המוקלטות חיות תחת הורי-הספרים. הדף הציג EmptyState; עכשיו הוא מאגרג
  // באותו דפוס-כותרת של הסיידבר (fetchRecordedProjectSeries, סדר-קאנון).
  const isRecordedProject = id === RECORDED_PROJECT_ID;
  const { data: recordedSeries = [], isLoading: recordedLoading } = useQuery({
    queryKey: ["recorded-project-series-full"],
    enabled: isRecordedProject,
    staleTime: 1000 * 60 * 10,
    queryFn: fetchRecordedProjectSeries,
  });

  // Cast to canonical type (hook returns extra fields rabbiId + imageUrl + isDraft)
  // Filter out empty placeholder nodes (lesson_count=0, not a draft-in-progress):
  //   - nav containers like "סדרות על החומש" (active, 0 lessons) or "דפי עבודה" (published, 0)
  //   - Only keep 0-lesson entries if isDraft=true (they show a "בהכנה" badge on the card)
  const canonicalSeries: CanonicalSeries[] = isRecordedProject
    ? recordedSeries.map((s) => ({
        id: s.id,
        title: s.title,
        lessonCount: s.lessonCount,
        rabbiId: null,
        rabbiName: null,
        imageUrl: s.imageUrl,
      }))
    : (seriesList as unknown as CanonicalSeries[]).filter(
        (s) => (s.lessonCount ?? 0) > 0 || s.isDraft,
      );

  // Card series IDs — used to exclude their lessons from the standalone band
  const cardSeriesIds = canonicalSeries.map((s) => s.id);

  const { data: directLessons, isLoading: lessonsLoading } = useDirectLessons(id, cardSeriesIds);
  const allDirectLessons = directLessons ?? [];

  // ── (R6 Yoav) Explicit 1:1 PUBLIC listing — one ordered interleaved table (series +
  // standalone lessons) mirroring the old book page, with author + length. When this book
  // has listing rows (scope='public_book') it DRIVES the page; otherwise we fall back to the
  // heuristic three-section render below. Keyed by the book name = the category node title.
  const { data: nodeForBook } = useQuery({
    queryKey: ["category-node-booktitle", id],
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data } = await supabase
        .from("series")
        .select("title, bible_book")
        .eq("id", id!)
        .maybeSingle();
      return (data ?? null) as { title: string; bible_book: string | null } | null;
    },
  });
  const bookKey = nodeForBook?.bible_book || nodeForBook?.title || node?.title || null;
  const publicListing = usePublicBookListing(bookKey);

  const isLoading = nodeLoading || (isRecordedProject ? recordedLoading : seriesLoading);
  const title = node?.title ?? "קטגוריה";

  // Batched multi-rabbi map (C6)
  const rabbisMap = useSeriesRabbisMap(canonicalSeries);

  // Split standalone lessons into regular + שו"ת (C4c)
  const standaloneRegular = allDirectLessons.filter((l) => !isShut(l));
  const standaloneShut = allDirectLessons.filter((l) => isShut(l));

  // ── (Yoav 9.7 #3+#4) format markers + filter bar ──
  const [formatFilter, setFormatFilter] = useState<FormatKey | null>(null);

  const listingSeries = publicListing.items.filter(
    (i): i is Extract<PublicListingItem, { type: "series" }> => i.type === "series",
  );
  const listingLessons = publicListing.items.filter(
    (i): i is Extract<PublicListingItem, { type: "lesson" }> => i.type === "lesson",
  );

  const visibleSeriesIds = publicListing.hasListing
    ? listingSeries.map((i) => i.series.id)
    : cardSeriesIds;
  const seriesFormats = useSeriesFormatsMap(visibleSeriesIds);

  const seriesMatches = (sid: string) =>
    !formatFilter || (seriesFormats.get(sid)?.has(formatFilter) ?? false);
  const lessonMatches = (l: {
    video_url?: string | null;
    audio_url?: string | null;
    attachment_url?: string | null;
  }) => !formatFilter || classifyLessonFormat(l) === formatFilter;

  // Per-format counts (series that contain it + standalone lessons of it) for the bar
  const formatCounts = new Map<FormatKey, number>();
  {
    const allLessonRows = publicListing.hasListing
      ? listingLessons.map((i) => i.lesson)
      : allDirectLessons;
    for (const f of FORMAT_ORDER) {
      let n = 0;
      for (const sid of visibleSeriesIds) if (seriesFormats.get(sid)?.has(f)) n++;
      for (const l of allLessonRows) if (classifyLessonFormat(l) === f) n++;
      if (n > 0) formatCounts.set(f, n);
    }
  }

  // Filtered views
  const filteredListingSeries = listingSeries.filter((i) => seriesMatches(i.series.id));
  const filteredListingLessons = listingLessons.filter((i) => lessonMatches(i.lesson));
  const filteredCanonicalSeries = canonicalSeries.filter((s) => seriesMatches(s.id));
  const filteredStandaloneRegular = standaloneRegular.filter(lessonMatches);
  const filteredStandaloneShut = standaloneShut.filter(lessonMatches);

  // Badge counts: N סדרות · M שיעורים (real counts, not inflated lesson_count)
  const seriesBadgeCount = publicListing.hasListing ? publicListing.seriesCount : canonicalSeries.length;
  const lessonBadgeCount = publicListing.hasListing ? publicListing.lessonCount : allDirectLessons.length;

  // ── SEO (T13) — additive head tags: unique title, description, breadcrumb + collection JSON-LD.
  const catPath = `/category/${id}`;
  const catTitle = node?.title ?? title;
  const seoDesc = node?.title
    ? `${node.title} — שיעורי תנ״ך, סדרות ומורים באתר בני ציון.`
    : undefined;
  const seoCrumbs = [
    { name: "בית", path: "/" },
    { name: "מאגר השיעורים", path: "/series" },
    ...(breadcrumbs.length
      ? breadcrumbs.map((b) => ({ name: b.title, path: `/category/${b.id}` }))
      : node
        ? [{ name: node.title, path: catPath }]
        : []),
  ];

  return (
    <DesignLayout>
      {node && (
        <Seo
          title={catTitle}
          description={seoDesc}
          image={node.image_url ?? undefined}
          url={`https://bneyzion.co.il${catPath}`}
          jsonLd={[
            collectionJsonLd({ name: catTitle, description: seoDesc, path: catPath }),
            breadcrumbJsonLd(seoCrumbs),
          ]}
        />
      )}
      {/* ── Hero ── */}
      <div
        dir="rtl"
        style={{
          background: `linear-gradient(160deg, #FBF6EC 0%, #F5EFE0 60%, #EDE5D0 100%)`,
          borderBottom: `1px solid rgba(139,111,71,0.12)`,
          padding: "2.5rem 2rem 2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative arc */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            insetInlineEnd: "-60px",
            top: "-80px",
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(196,162,101,0.07)",
            pointerEvents: "none",
          }}
        />

        {/* Breadcrumb */}
        {breadcrumbs.length > 0 && (
          <nav
            aria-label="ניווט"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <Link
              to="/"
              style={{
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                color: colors.textSubtle,
                textDecoration: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = colors.goldDark)}
              onMouseLeave={(e) => (e.currentTarget.style.color = colors.textSubtle)}
            >
              ראשי
            </Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.id} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <ChevronLeft size={12} style={{ color: colors.textSubtle, flexShrink: 0 }} />
                <Link
                  to={`/category/${crumb.id}`}
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.78rem",
                    color: crumb.id === id ? colors.goldDark : colors.textSubtle,
                    textDecoration: "none",
                    fontWeight: crumb.id === id ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (crumb.id !== id) e.currentTarget.style.color = colors.goldDark;
                  }}
                  onMouseLeave={(e) => {
                    if (crumb.id !== id) e.currentTarget.style.color = colors.textSubtle;
                  }}
                >
                  {crumb.title}
                </Link>
              </span>
            ))}
          </nav>
        )}

        {/* Title */}
        {nodeLoading ? (
          <div
            style={{
              height: 40,
              width: 200,
              borderRadius: radii.sm,
              background: "rgba(139,111,71,0.1)",
              animation: "pulse 1.5s ease infinite",
            }}
          />
        ) : (
          <h1
            style={{
              fontFamily: fonts.display,
              fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
              fontWeight: 700,
              color: colors.textDark,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
        )}

        {/* Description */}
        {node?.description && (
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "0.92rem",
              color: colors.textMuted,
              marginTop: "0.6rem",
              marginBottom: 0,
              maxWidth: 560,
              lineHeight: 1.65,
            }}
          >
            {node.description}
          </p>
        )}

        {/* Badges — "N סדרות · M שיעורים" */}
        {(!seriesLoading || !lessonsLoading) && (seriesBadgeCount > 0 || lessonBadgeCount > 0) && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
            {!seriesLoading && seriesBadgeCount > 0 && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.3rem 0.75rem",
                  borderRadius: radii.pill,
                  background: "rgba(139,111,71,0.08)",
                  border: `1px solid rgba(139,111,71,0.15)`,
                  fontFamily: fonts.body,
                  fontSize: "0.78rem",
                  color: colors.goldDark,
                  fontWeight: 600,
                }}
              >
                <BookOpen size={13} />
                {seriesBadgeCount} סדרות
              </div>
            )}
            {!lessonsLoading && lessonBadgeCount > 0 && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.3rem 0.75rem",
                  borderRadius: radii.pill,
                  background: "rgba(139,111,71,0.06)",
                  border: `1px solid rgba(139,111,71,0.12)`,
                  fontFamily: fonts.body,
                  fontSize: "0.78rem",
                  color: colors.textMuted,
                  fontWeight: 500,
                }}
              >
                {lessonBadgeCount} תכנים
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div
        dir="rtl"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "2rem 1.5rem",
        }}
      >
        {/* ── (Yoav 9.7 #4) format filter bar — sticky so the format context never
            scrolls away. Chips only for formats that actually exist here. ── */}
        {formatCounts.size > 0 && (
          <FormatFilterBar
            counts={formatCounts}
            active={formatFilter}
            onChange={(f) => {
              setFormatFilter(f);
              // מיכאל (קבוצת המבקרים 17.7): אחרי בחירת פילטר "התוכן שאני רוצה
              // נמצא יותר למטה" — גוללים אוטומטית לתחילת התוצאות.
              if (f) {
                window.setTimeout(() => {
                  document
                    .getElementById("category-results")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 60);
              }
            }}
          />
        )}

        <div id="category-results" style={{ scrollMarginTop: 120 }} />

        {/* ── רמה 21 (סער 17.7): כנסי בני ציון — דפי הכנסים הייעודיים תחת "ימי עיון בתנ"ך" ── */}
        {id === YEMEI_IYUN_ID && (
          <section style={{ marginBottom: "2.5rem" }}>
            <SectionHeading>כנסי בני ציון</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {KNESIM.map((knes) => (
                <Link
                  key={knes.slug}
                  to={knes.to}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    padding: "1rem 1.25rem",
                    background: "#fff",
                    border: `1px solid rgba(139,111,71,0.15)`,
                    borderRadius: radii.md,
                    boxShadow: shadows.card,
                    textDecoration: "none",
                    transition: "box-shadow 0.15s, border-color 0.15s, transform 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = shadows.cardHover;
                    e.currentTarget.style.borderColor = colors.goldDark;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = shadows.card;
                    e.currentTarget.style.borderColor = "rgba(139,111,71,0.15)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.2rem" }}>
                      <span style={{ fontFamily: fonts.display, fontSize: "1.05rem", fontWeight: 700, color: colors.textDark }}>
                        {knes.title}
                      </span>
                      <span style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textSubtle }}>
                        {knes.hebrewDate} · {knes.date}
                      </span>
                    </div>
                    <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>
                      {knes.subtitle} · {formatRabbis(knes.rabbis)}
                    </p>
                  </div>
                  <ChevronLeft size={16} style={{ color: colors.goldDark, flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {publicListing.hasListing ? (
          /* ── (R6 Yoav) 1:1 PUBLIC listing, old order_index. The listing data is
             grouped by construction (all series rows, then all lesson rows — verified
             in DB: zero interleaved books), so the Yoav-9.7 section headings slot in
             without touching the order. ── */
          <>
            {filteredListingSeries.length > 0 && (
              <section>
                <SectionHeading>סדרות</SectionHeading>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {filteredListingSeries.map((it) => (
                    <SeriesRowCard
                      key={`pls-${it.series.id}-${it.sortOrder}`}
                      series={it.series}
                      rabbiNames={it.series.rabbiName ? [it.series.rabbiName] : []}
                      hrefSuffix={bookKey ? `?book=${encodeURIComponent(bookKey)}` : ""}
                      formats={seriesFormats.get(it.series.id)}
                    />
                  ))}
                </div>
              </section>
            )}
            {filteredListingLessons.length > 0 && (
              <section style={{ marginTop: filteredListingSeries.length > 0 ? "2.5rem" : 0 }}>
                <SectionHeading>תכנים בודדים</SectionHeading>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {filteredListingLessons.map((it) => (
                    <LessonRow
                      key={`pll-${it.lesson.id}-${it.sortOrder}`}
                      lesson={it.lesson}
                      onNavigate={(path) => navigate(path)}
                    />
                  ))}
                </div>
              </section>
            )}
            {formatFilter &&
              filteredListingSeries.length === 0 &&
              filteredListingLessons.length === 0 && (
                <FilterEmptyState format={formatFilter} onClear={() => setFormatFilter(null)} />
              )}
          </>
        ) : (
          <>
        {/* ── (a) Series cards — CLOSED, link to /series/:id ── */}
        {isLoading ? (
          <SeriesGridSkeleton />
        ) : filteredCanonicalSeries.length > 0 ? (
          <section>
            <SectionHeading>סדרות</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {filteredCanonicalSeries.map((s) => (
                <SeriesRowCard
                  key={s.id}
                  series={s}
                  rabbiNames={rabbisMap.get(s.id) ?? (s.rabbiName ? [s.rabbiName] : [])}
                  formats={seriesFormats.get(s.id)}
                />
              ))}
            </div>
          </section>
        ) : !lessonsLoading && allDirectLessons.length === 0 && !formatFilter ? (
          <EmptyState title={title} />
        ) : null}

        {/* ── (b) Standalone content (series_id = this node) ── */}
        {!lessonsLoading && filteredStandaloneRegular.length > 0 && (
          <section style={{ marginTop: filteredCanonicalSeries.length > 0 ? "2.5rem" : 0 }}>
            <SectionHeading>תכנים בודדים</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {filteredStandaloneRegular.map((l) => (
                <LessonRow
                  key={l.id}
                  lesson={l}
                  onNavigate={(path) => navigate(path)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── (c) שו"ת section ── */}
        {!lessonsLoading && filteredStandaloneShut.length > 0 && (
          <section style={{ marginTop: "2.5rem" }}>
            <SectionHeading>שאלות ותשובות</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {filteredStandaloneShut.map((l) => (
                <LessonRow
                  key={l.id}
                  lesson={l}
                  onNavigate={(path) => navigate(path)}
                />
              ))}
            </div>
          </section>
        )}
        {formatFilter &&
          filteredCanonicalSeries.length === 0 &&
          filteredStandaloneRegular.length === 0 &&
          filteredStandaloneShut.length === 0 && (
            <FilterEmptyState format={formatFilter} onClear={() => setFormatFilter(null)} />
          )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </DesignLayout>
  );
}

// ─── FormatFilterBar (Yoav 9.7 #4) ───────────────────────────────────────────
// Sticky chips bar — filter the category by format (video / audio / pdf / text).

function FormatFilterBar({
  counts,
  active,
  onChange,
}: {
  counts: Map<FormatKey, number>;
  active: FormatKey | null;
  onChange: (f: FormatKey | null) => void;
}) {
  const chipBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.35rem 0.85rem",
    borderRadius: radii.pill,
    fontFamily: fonts.body,
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s, border-color 0.15s",
    border: `1px solid rgba(139,111,71,0.18)`,
    background: "white",
    color: colors.textMuted,
  };
  const chipActive: React.CSSProperties = {
    background: colors.goldDark,
    borderColor: colors.goldDark,
    color: "white",
  };

  return (
    <div
      role="toolbar"
      aria-label="סינון לפי פורמט"
      style={{
        position: "sticky",
        top: "var(--bz-header-h, 96px)", // נצמד ממש מתחת להדר (96 דסקטופ / 64 נייד)
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        flexWrap: "wrap",
        padding: "0.65rem 0.25rem",
        marginBottom: "1.25rem",
        background: "rgba(251,247,238,0.96)",
        backdropFilter: "blur(4px)",
        borderBottom: `1px solid rgba(139,111,71,0.10)`,
      }}
    >
      <button
        onClick={() => onChange(null)}
        aria-pressed={active === null}
        style={{ ...chipBase, ...(active === null ? chipActive : {}) }}
      >
        הכל
      </button>
      {FORMAT_ORDER.filter((f) => counts.has(f)).map((f) => {
        const { label, Icon } = FORMAT_META[f];
        const isActive = active === f;
        return (
          <button
            key={f}
            onClick={() => onChange(isActive ? null : f)}
            aria-pressed={isActive}
            style={{ ...chipBase, ...(isActive ? chipActive : {}) }}
          >
            <Icon size={13} style={{ flexShrink: 0 }} />
            {label}
            <span style={{ fontWeight: 400, fontSize: "0.72rem", opacity: 0.75 }}>
              {counts.get(f)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── FilterEmptyState ────────────────────────────────────────────────────────

function FilterEmptyState({
  format,
  onClear,
}: {
  format: FormatKey;
  onClear: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2.5rem 1.5rem",
        gap: "0.75rem",
        color: colors.textSubtle,
        textAlign: "center",
        fontFamily: fonts.body,
      }}
    >
      <AlertCircle size={32} style={{ opacity: 0.4 }} />
      <div style={{ fontSize: "0.95rem", color: colors.textMuted }}>
        אין תכנים בפורמט {FORMAT_META[format].label} בקטגוריה זו
      </div>
      <button
        onClick={onClear}
        style={{
          border: "none",
          background: "transparent",
          color: colors.goldDark,
          fontFamily: fonts.body,
          fontSize: "0.85rem",
          fontWeight: 600,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        הצגת כל התכנים
      </button>
    </div>
  );
}

// ─── SectionHeading ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: fonts.display,
        fontSize: "1.1rem",
        fontWeight: 700,
        color: colors.textDark,
        marginBottom: "1rem",
        marginTop: 0,
        paddingBottom: "0.5rem",
        borderBottom: `2px solid rgba(196,162,101,0.2)`,
      }}
    >
      {children}
    </h2>
  );
}

// ─── SeriesRowCard (C2) ───────────────────────────────────────────────────────
// Closed card — entire card is a Link to /series/:id. No accordion, no lesson rows.

function SeriesRowCard({
  series,
  rabbiNames,
  hrefSuffix,
  formats,
}: {
  series: CanonicalSeries;
  rabbiNames: string[];
  hrefSuffix?: string;
  formats?: Set<FormatKey>;
}) {
  const imgSrc = resolveSeriesImage(series);
  const hasDraftBadge = series.isDraft && (!series.lessonCount || series.lessonCount === 0);
  const rabbiLabel = formatRabbis(rabbiNames);

  return (
    <Link
      to={`/series/${series.id}${hrefSuffix ?? ""}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          borderRadius: radii.lg,
          overflow: "hidden",
          background: "white",
          border: `1px solid rgba(139,111,71,0.10)`,
          boxShadow: "0 2px 8px rgba(45,31,14,0.06)",
          transition: "box-shadow 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(139,111,71,0.18)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,111,71,0.3)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(45,31,14,0.06)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,111,71,0.10)";
        }}
      >
        {/* Cover image */}
        <div
          style={{
            width: 90,
            flexShrink: 0,
            overflow: "hidden",
            background: "#EDE5D6",
          }}
        >
          <img
            src={imgSrc}
            alt={series.title}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/images/series-default.webp";
            }}
          />
        </div>

        {/* Info */}
        <div
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            justifyContent: "center",
          }}
        >
          {/* Draft badge */}
          {hasDraftBadge && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.15rem 0.5rem",
                borderRadius: radii.pill,
                background: "rgba(139,111,71,0.08)",
                color: colors.textSubtle,
                fontFamily: fonts.body,
                fontSize: "0.68rem",
                fontWeight: 600,
                width: "fit-content",
                marginBottom: "0.1rem",
              }}
            >
              <Construction size={10} />
              בהכנה
            </div>
          )}

          <span
            style={{
              fontFamily: fonts.display,
              fontSize: "0.98rem",
              fontWeight: 700,
              color: colors.textDark,
              lineHeight: 1.3,
            }}
          >
            {series.title}
          </span>

          {rabbiLabel && (
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: "0.8rem",
                color: colors.textMuted,
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              {rabbiNames.length > 1 && <Users size={11} style={{ flexShrink: 0, opacity: 0.6 }} />}
              {rabbiLabel}
            </span>
          )}

          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            {series.lessonCount != null && series.lessonCount > 0 && (
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.75rem",
                  color: colors.goldDark,
                  fontWeight: 600,
                }}
              >
                {series.lessonCount} תכנים
              </span>
            )}
            {/* (Yoav 9.7 #3) formats the series contains — always-visible marker */}
            {formats && formats.size > 0 && (
              <span style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center" }}>
                {FORMAT_ORDER.filter((f) => formats.has(f)).map((f) => {
                  const { label, Icon } = FORMAT_META[f];
                  return (
                    <span
                      key={f}
                      title={label}
                      aria-label={label}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.2rem",
                        padding: "0.1rem 0.4rem",
                        borderRadius: radii.pill,
                        background: "rgba(139,111,71,0.07)",
                        color: colors.textMuted,
                        fontFamily: fonts.body,
                        fontSize: "0.66rem",
                        fontWeight: 600,
                      }}
                    >
                      <Icon size={10} style={{ flexShrink: 0 }} />
                      {label}
                    </span>
                  );
                })}
              </span>
            )}
          </span>
        </div>

        {/* Arrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            paddingInlineEnd: "1rem",
            color: colors.textSubtle,
          }}
        >
          <ChevronLeft size={16} style={{ transform: "rotate(180deg)" }} />
        </div>
      </div>
    </Link>
  );
}

// ─── LessonRow ───────────────────────────────────────────────────────────────

type LessonRowData = {
  id: string;
  title: string;
  duration?: number | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  attachment_url?: string | null;
  rabbis?: { name: string } | { name: string }[] | null;
};

function LessonRow({
  lesson,
  onNavigate,
}: {
  lesson: LessonRowData;
  onNavigate: (path: string) => void;
}) {
  const rabbiName = Array.isArray(lesson.rabbis)
    ? lesson.rabbis[0]?.name
    : (lesson.rabbis as { name: string } | null)?.name;

  const imgSrc = lesson.thumbnail_url || "/images/series-default.webp";

  return (
    <button
      onClick={() => onNavigate(`/lessons/${lesson.id}`)}
      style={{
        width: "100%",
        textAlign: "right",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.55rem 1rem",
        background: "white",
        border: `1px solid rgba(139,111,71,0.08)`,
        borderRadius: radii.md,
        cursor: "pointer",
        transition: "background 0.15s",
        fontFamily: fonts.body,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(196,162,101,0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "white";
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 48,
          height: 34,
          flexShrink: 0,
          borderRadius: radii.sm,
          overflow: "hidden",
          background: "#EDE5D6",
          position: "relative",
        }}
      >
        <img
          src={imgSrc}
          alt=""
          aria-hidden
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/images/series-default.webp";
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 2,
            insetInlineStart: 2,
            color: "white",
            background: "rgba(45,31,14,0.55)",
            borderRadius: 3,
            padding: "1px 3px",
            display: "flex",
            alignItems: "center",
          }}
        >
          {lessonMediaIcon(lesson)}
        </div>
      </div>

      {/* Title + rabbi */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.83rem",
            fontWeight: 600,
            color: colors.textDark,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {lesson.title}
        </div>
        {rabbiName && (
          <div style={{ fontSize: "0.72rem", color: colors.textMuted, marginTop: "0.1rem" }}>
            {rabbiName}
          </div>
        )}
      </div>

      {/* (Yoav 9.7 #3) always-visible format chip — the thumbnail overlay alone
          was easy to lose while scrolling */}
      {(() => {
        const f = classifyLessonFormat(lesson);
        const { label, Icon } = FORMAT_META[f];
        return (
          <span
            aria-label={label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.15rem 0.5rem",
              borderRadius: radii.pill,
              background: "rgba(139,111,71,0.07)",
              border: `1px solid rgba(139,111,71,0.12)`,
              color: colors.textMuted,
              fontSize: "0.68rem",
              fontWeight: 600,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <Icon size={11} style={{ flexShrink: 0 }} />
            {label}
          </span>
        );
      })()}

      {/* Duration */}
      {lesson.duration != null && lesson.duration > 0 && (
        <span
          style={{
            fontSize: "0.72rem",
            color: colors.textSubtle,
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {formatDuration(lesson.duration)}
        </span>
      )}
    </button>
  );
}

// ─── SeriesGridSkeleton ──────────────────────────────────────────────────────

function SeriesGridSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            borderRadius: radii.lg,
            overflow: "hidden",
            background: "white",
            border: `1px solid rgba(139,111,71,0.08)`,
            display: "flex",
            height: 80,
          }}
        >
          <div
            style={{
              width: 90,
              background: "rgba(139,111,71,0.08)",
              animation: "pulse 1.5s ease infinite",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, padding: "0.85rem 1rem" }}>
            <div
              style={{
                height: 14,
                width: "60%",
                borderRadius: radii.sm,
                background: "rgba(139,111,71,0.08)",
                animation: "pulse 1.5s ease infinite",
                marginBottom: "0.5rem",
              }}
            />
            <div
              style={{
                height: 11,
                width: "35%",
                borderRadius: radii.sm,
                background: "rgba(139,111,71,0.06)",
                animation: "pulse 1.5s ease infinite",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

function EmptyState({ title }: { title: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        gap: "1rem",
        color: colors.textSubtle,
        textAlign: "center",
      }}
    >
      <AlertCircle size={40} style={{ opacity: 0.4 }} />
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: "1.1rem",
          fontWeight: 600,
          color: colors.textMuted,
        }}
      >
        אין סדרות ב{title} כרגע
      </div>
    </div>
  );
}
