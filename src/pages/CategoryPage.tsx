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
import { useContentSidebar } from "@/hooks/useContentSidebar";
import { usePublicBookListing } from "@/hooks/usePublicBookListing";
import { supabase } from "@/integrations/supabase/client";

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

// ─── Main component ──────────────────────────────────────────────────────────

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: node, isLoading: nodeLoading } = useSeriesDetail(id);
  const { data: breadcrumbs = [] } = useSeriesBreadcrumb(id);

  const { useSeriesForNode } = useContentSidebar();
  const { data: seriesList = [], isLoading: seriesLoading } = useSeriesForNode(id ?? null);

  // Cast to canonical type (hook returns extra fields rabbiId + imageUrl + isDraft)
  // Filter out empty placeholder nodes (lesson_count=0, not a draft-in-progress):
  //   - nav containers like "סדרות על החומש" (active, 0 lessons) or "דפי עבודה" (published, 0)
  //   - Only keep 0-lesson entries if isDraft=true (they show a "בהכנה" badge on the card)
  const canonicalSeries = (seriesList as unknown as CanonicalSeries[]).filter(
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

  const isLoading = nodeLoading || seriesLoading;
  const title = node?.title ?? "קטגוריה";

  // Batched multi-rabbi map (C6)
  const rabbisMap = useSeriesRabbisMap(canonicalSeries);

  // Split standalone lessons into regular + שו"ת (C4c)
  const standaloneRegular = allDirectLessons.filter((l) => !isShut(l));
  const standaloneShut = allDirectLessons.filter((l) => isShut(l));

  // Badge counts: N סדרות · M שיעורים (real counts, not inflated lesson_count)
  const seriesBadgeCount = publicListing.hasListing ? publicListing.seriesCount : canonicalSeries.length;
  const lessonBadgeCount = publicListing.hasListing ? publicListing.lessonCount : allDirectLessons.length;

  return (
    <DesignLayout>
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
              background: gradients.goldText,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
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
                {lessonBadgeCount} שיעורים
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
        {publicListing.hasListing ? (
          /* ── (R6 Yoav) 1:1 PUBLIC listing — ONE ordered interleaved table (series +
             standalone lessons), old order_index, author + length. Pollution excluded
             by construction (allow-list). ── */
          <section>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {publicListing.items.map((it) =>
                it.type === "series" ? (
                  <SeriesRowCard
                    key={`pls-${it.series.id}-${it.sortOrder}`}
                    series={it.series}
                    rabbiNames={it.series.rabbiName ? [it.series.rabbiName] : []}
                    hrefSuffix={bookKey ? `?book=${encodeURIComponent(bookKey)}` : ""}
                  />
                ) : (
                  <LessonRow
                    key={`pll-${it.lesson.id}-${it.sortOrder}`}
                    lesson={it.lesson}
                    onNavigate={(path) => navigate(path)}
                  />
                )
              )}
            </div>
          </section>
        ) : (
          <>
        {/* ── (a) Series cards — CLOSED, link to /series/:id ── */}
        {isLoading ? (
          <SeriesGridSkeleton />
        ) : canonicalSeries.length > 0 ? (
          <section>
            <SectionHeading>סדרות</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {canonicalSeries.map((s) => (
                <SeriesRowCard
                  key={s.id}
                  series={s}
                  rabbiNames={rabbisMap.get(s.id) ?? (s.rabbiName ? [s.rabbiName] : [])}
                />
              ))}
            </div>
          </section>
        ) : !lessonsLoading && allDirectLessons.length === 0 ? (
          <EmptyState title={title} />
        ) : null}

        {/* ── (b) Standalone lessons (series_id = this node) ── */}
        {!lessonsLoading && standaloneRegular.length > 0 && (
          <section style={{ marginTop: canonicalSeries.length > 0 ? "2.5rem" : 0 }}>
            <SectionHeading>שיעורים</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {standaloneRegular.map((l) => (
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
        {!lessonsLoading && standaloneShut.length > 0 && (
          <section style={{ marginTop: "2.5rem" }}>
            <SectionHeading>שאלות ותשובות</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {standaloneShut.map((l) => (
                <LessonRow
                  key={l.id}
                  lesson={l}
                  onNavigate={(path) => navigate(path)}
                />
              ))}
            </div>
          </section>
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
}: {
  series: CanonicalSeries;
  rabbiNames: string[];
  hrefSuffix?: string;
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

          {series.lessonCount != null && series.lessonCount > 0 && (
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: "0.75rem",
                color: colors.goldDark,
                fontWeight: 600,
              }}
            >
              {series.lessonCount} שיעורים
            </span>
          )}
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
