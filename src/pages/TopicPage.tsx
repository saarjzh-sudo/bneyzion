/**
 * TopicPage — /topic/:slug
 *
 * Shows all published lessons tagged with a given thematic topic.
 * Uses the thematic topic taxonomy (children of 'themes-root') — not the
 * structural book tree.
 *
 * Layout: DesignLayout (v2 with sidebar). Cream+gold, RTL.
 */

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  Volume2,
  FileText,
  BookOpen,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Tag,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { Seo, collectionJsonLd, breadcrumbJsonLd } from "@/components/seo/Seo";
import {
  colors,
  fonts,
  radii,
  shadows,
  formatDuration,
} from "@/lib/designTokens";
import { supabase } from "@/integrations/supabase/client";

// ─── helpers ─────────────────────────────────────────────────────────────────

type TopicLesson = {
  id: string;
  title: string;
  duration: number | null;
  published_at: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  attachment_url: string | null;
  series_id: string | null;
  rabbis: { name: string } | null;
  series: { title: string; image_url: string | null } | null;
};

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

function lessonImage(l: TopicLesson): string {
  return (
    l.thumbnail_url ||
    l.series?.image_url ||
    "/images/series-default.webp"
  );
}

// ─── hooks ───────────────────────────────────────────────────────────────────

function useTopic(slug: string) {
  return useQuery({
    queryKey: ["topic-by-slug", slug],
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, name, slug, description")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

function useTopicLessons(topicId: string | undefined) {
  return useQuery<Array<TopicLesson & { _sortOrder: number | null }>>({
    queryKey: ["topic-lessons", topicId],
    enabled: !!topicId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      // §7: select sort_order from lesson_topics for curated ordering (replaces published_at desc)
      // §5 R-TOP1: limit(500) on link rows — applied after filter (largest topic 246 items)
      const { data, error } = await supabase
        .from("lesson_topics")
        .select(
          `lesson_id, sort_order,
           lessons!inner(
             id, title, duration, published_at,
             thumbnail_url, video_url, audio_url, attachment_url,
             series_id, rabbi_id,
             rabbis!lessons_rabbi_id_fkey(name),
             series(title, image_url)
           )`
        )
        .eq("topic_id", topicId!)
        .eq("lessons.status", "published")
        // §0.3 + Saar 19.6: "what was exposed on BOTH sides stays on both" — show public (general)
        // AND dual-audience (teachers+general); teacher-EXCLUSIVE ({teachers} only) stays hidden.
        // "has general" == "not teacher-exclusive" since 0 published lessons lack audience_tags.
        // referencedTable required for PostgREST .or() on embedded table (fixes PGRST100)
        .or("audience_tags.cs.{general}", { referencedTable: "lessons" })
        .limit(500);

      if (error) throw error;

      // PostgREST returns lessons nested — flatten them
      const flat = (data || [])
        .map((row: any) => row.lessons)
        .filter(Boolean) as (TopicLesson & { rabbi_id?: string | null })[];

      // §0.2 dedup by physical lesson id only (R-SER4 alignment).
      // lesson_topics.sort_order is the curated order; same-title lessons are intentional.
      const seen = new Set<string>();
      const lessons = flat.filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      }) as TopicLesson[];

      // §7: order by lesson_topics.sort_order (curated, matches old site order).
      // PostgREST embeds the row including the sort_order from lesson_topics.
      // The join returns lesson_topics rows; we need to propagate sort_order onto lessons.
      // Since we flat-mapped rows.lessons, sort_order is on the parent row.
      // Re-derive from the raw data with sort_order.
      const lessonsWithOrder = (data || []).map((row: any) => ({
        ...(row.lessons as TopicLesson),
        _sortOrder: (row as any).sort_order as number | null,
      }));
      // Dedup by id (keep first occurrence in sort_order order)
      const seenForOrder = new Set<string>();
      const orderedLessons = lessonsWithOrder
        .filter((l) => {
          if (seenForOrder.has((l as any).id)) return false;
          seenForOrder.add((l as any).id);
          return true;
        })
        .sort((a: any, b: any) => {
          // §7: sort_order ASC NULLS LAST
          const ao = a._sortOrder;
          const bo = b._sortOrder;
          if (ao == null && bo == null) return 0;
          if (ao == null) return 1;
          if (bo == null) return -1;
          return ao - bo;
        }) as Array<TopicLesson & { _sortOrder: number | null }>;

      // L3: KEEP _sortOrder — the component merges series_topics + lesson_topics by this unified
      // order (old topic pages interleave series cards and lesson cards in one ordered list).
      return orderedLessons.length > 0
        ? orderedLessons
        : lessons.map((l) => ({ ...l, _sortOrder: null }));
    },
  });
}

// L3: series tagged to a topic (series_topics). Old topic pages list SERIES cards too, interleaved
// with lessons by order — rendered together in the component via the shared sort_order space.
type TopicSeries = {
  id: string;
  title: string;
  image_url: string | null;
  lesson_count: number | null;
  rabbis: { name: string } | null;
};

function useTopicSeries(topicId: string | undefined) {
  return useQuery<Array<TopicSeries & { _sortOrder: number | null }>>({
    queryKey: ["topic-series", topicId],
    enabled: !!topicId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      // series_topics isn't in the generated Supabase types yet (table exists in DB) → cast to any.
      const { data, error } = await (supabase as any)
        .from("series_topics")
        .select(
          `series_id, sort_order,
           series!inner(
             id, title, image_url, lesson_count, status,
             rabbis!series_rabbi_id_fkey(name)
           )`
        )
        .eq("topic_id", topicId!)
        .in("series.status", ["published", "active"])
        // Saar 19.6 dual-audience: show public + dual (teachers+general); teacher-exclusive hidden.
        // status already excludes 'category' (teacher-org containers stay out).
        .or("audience_tags.cs.{general}", { referencedTable: "series" })
        .limit(500);
      if (error) throw error;
      const seen = new Set<string>();
      const out: Array<TopicSeries & { _sortOrder: number | null }> = [];
      for (const row of (data || []) as any[]) {
        const s = row.series;
        if (!s || seen.has(s.id)) continue;
        seen.add(s.id);
        out.push({
          id: s.id,
          title: s.title,
          image_url: s.image_url,
          lesson_count: s.lesson_count,
          rabbis: s.rabbis,
          _sortOrder: row.sort_order as number | null,
        });
      }
      return out;
    },
  });
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function TopicPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [search, setSearch] = useState("");

  const { data: topic, isLoading: topicLoading, error: topicError } = useTopic(slug);
  const { data: lessons = [], isLoading: lessonsLoading } = useTopicLessons(topic?.id);
  const { data: seriesList = [], isLoading: seriesLoading } = useTopicSeries(topic?.id);

  // L3: unified ordered list — series cards + lesson cards interleaved by the shared sort_order
  // (mirrors the old topic page, which lists both in one ordered listing).
  type TopicItem =
    | ({ kind: "lesson"; _sortOrder: number | null } & TopicLesson)
    | ({ kind: "series"; _sortOrder: number | null } & TopicSeries);
  const items: TopicItem[] = [
    ...lessons.map((l) => ({ kind: "lesson" as const, ...l })),
    ...seriesList.map((s) => ({ kind: "series" as const, ...s })),
  ].sort((a, b) => {
    const ao = a._sortOrder, bo = b._sortOrder;
    if (ao == null && bo == null) return 0;
    if (ao == null) return 1;
    if (bo == null) return -1;
    return ao - bo;
  });

  const filtered = search.trim()
    ? items.filter(
        (it) =>
          it.title.includes(search.trim()) ||
          (it.rabbis?.name || "").includes(search.trim())
      )
    : items;

  const isLoading = topicLoading || lessonsLoading || seriesLoading;

  // ── SEO (T13) — additive head tags for the topic collection page.
  const topicPath = `/topic/${slug}`;
  const topicDesc =
    topic?.description ||
    (topic ? `שיעורים וסדרות בנושא ${topic.name} באתר בני ציון – לימוד התנ״ך של ישראל.` : undefined);

  return (
    <DesignLayout>
      {topic && (
        <Seo
          title={topic.name}
          description={topicDesc}
          url={`https://bneyzion.co.il${topicPath}`}
          jsonLd={[
            collectionJsonLd({ name: topic.name, description: topicDesc, path: topicPath }),
            breadcrumbJsonLd([
              { name: "בית", path: "/" },
              { name: "מאגר השיעורים", path: "/series" },
              { name: topic.name, path: topicPath },
            ]),
          ]}
        />
      )}
      <div dir="rtl" style={{ minHeight: "100vh", background: colors.parchment }}>
        {/* ─── Hero / header ─────────────────────────────────────────────── */}
        <section
          style={{
            background: `linear-gradient(160deg, #FBF6EC 0%, #F5EFE0 60%, #EDE5D0 100%)`,
            borderBottom: `1px solid rgba(139,111,71,0.12)`,
            padding: "3rem 1.5rem 2.5rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative arc (matches CategoryPage) */}
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

          <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1 }}>
            {/* Breadcrumb */}
            <nav
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                marginBottom: "1.5rem",
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                color: colors.textSubtle,
              }}
            >
              <Link
                to="/"
                style={{ color: colors.textSubtle, textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = colors.goldDark)}
                onMouseLeave={(e) => (e.currentTarget.style.color = colors.textSubtle)}
              >
                דף הבית
              </Link>
              <ChevronLeft size={12} style={{ transform: "rotate(180deg)" }} />
              <span style={{ color: colors.textSubtle }}>נושאים</span>
              {topic && (
                <>
                  <ChevronLeft size={12} style={{ transform: "rotate(180deg)" }} />
                  <span style={{ color: colors.goldDark, fontWeight: 600 }}>{topic.name}</span>
                </>
              )}
            </nav>

            {/* Title */}
            {topic ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <Tag size={22} style={{ color: colors.goldDark, flexShrink: 0 }} />
                <h1
                  style={{
                    fontFamily: fonts.display,
                    fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                    color: colors.textDark,
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {topic.name}
                </h1>
              </div>
            ) : isLoading ? (
              <div style={{ height: "2.4rem", width: "200px", background: "rgba(139,111,71,0.1)", borderRadius: radii.sm }} />
            ) : null}

            {/* Description */}
            {topic?.description && (
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.9rem",
                  color: colors.textSubtle,
                  marginTop: "0.6rem",
                  marginBottom: 0,
                  maxWidth: 560,
                  lineHeight: 1.6,
                }}
              >
                {topic.description}
              </p>
            )}

            {/* Item count badge */}
            {!isLoading && items.length > 0 && (
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.8rem",
                  color: colors.textSubtle,
                  marginTop: "0.75rem",
                  marginBottom: 0,
                }}
              >
                {items.length} שיעורים בנושא זה
              </p>
            )}
          </div>
        </section>

        {/* ─── Main content ──────────────────────────────────────────────── */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
          {/* Search */}
          {items.length > 8 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש בשיעורים…"
                style={{
                  width: "100%",
                  padding: "0.65rem 1rem",
                  borderRadius: radii.lg,
                  border: `1px solid rgba(139,111,71,0.25)`,
                  background: "#fff",
                  fontFamily: fonts.body,
                  fontSize: "0.88rem",
                  color: colors.textDark,
                  outline: "none",
                  direction: "rtl",
                }}
              />
            </div>
          )}

          {/* States */}
          {isLoading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", gap: "0.75rem", color: colors.goldDark }}>
              <Loader2 size={22} className="animate-spin" />
              <span style={{ fontFamily: fonts.body, fontSize: "0.9rem" }}>טוען שיעורים…</span>
            </div>
          )}

          {topicError && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "2rem", color: "#c0392b", fontFamily: fonts.body, fontSize: "0.88rem" }}>
              <AlertCircle size={18} />
              נושא לא נמצא
            </div>
          )}

          {!isLoading && !topicError && filtered.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 1rem",
                fontFamily: fonts.body,
                fontSize: "0.9rem",
                color: colors.textSubtle,
              }}
            >
              {search.trim() ? "לא נמצאו שיעורים לחיפוש זה" : "אין שיעורים זמינים בנושא זה כרגע"}
            </div>
          )}

          {/* Lesson list */}
          {!isLoading && filtered.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {filtered.map((it) => {
                const to = it.kind === "series" ? `/series/${it.id}` : `/lessons/${it.id}`;
                const img =
                  it.kind === "series"
                    ? it.image_url || "/images/series-default.webp"
                    : lessonImage(it);
                return (
                <Link
                  key={`${it.kind}-${it.id}`}
                  to={to}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      background: "#fff",
                      borderRadius: radii.xl,
                      padding: "0.9rem 1.1rem",
                      boxShadow: shadows.card,
                      border: "1px solid rgba(139,111,71,0.1)",
                      transition: "box-shadow 0.15s, transform 0.15s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.cardHover || "0 4px 20px rgba(0,0,0,0.1)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.card;
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    }}
                  >
                    {/* Thumbnail */}
                    <img
                      src={img}
                      alt=""
                      style={{
                        width: 62,
                        height: 62,
                        borderRadius: radii.lg,
                        objectFit: "cover",
                        flexShrink: 0,
                        background: colors.parchmentDark,
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/images/series-default.webp";
                      }}
                    />

                    {/* Text block */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: fonts.body,
                          fontWeight: 700,
                          fontSize: "0.92rem",
                          color: colors.textDark,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {it.title}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          marginTop: "0.3rem",
                          fontFamily: fonts.body,
                          fontSize: "0.75rem",
                          color: colors.textSubtle,
                          flexWrap: "wrap",
                        }}
                      >
                        {it.rabbis?.name && (
                          <span>{it.rabbis.name}</span>
                        )}
                        {it.kind === "series" ? (
                          it.lesson_count != null && it.lesson_count > 0 && (
                            <>
                              {it.rabbis?.name && <span style={{ opacity: 0.45 }}>·</span>}
                              <span style={{ color: colors.goldDark, fontWeight: 600 }}>{it.lesson_count} שיעורים</span>
                            </>
                          )
                        ) : (
                          <>
                            {it.series && (
                              <>
                                {it.rabbis?.name && <span style={{ opacity: 0.45 }}>·</span>}
                                <span style={{ color: colors.goldDark, fontWeight: 600 }}>{it.series.title}</span>
                              </>
                            )}
                            {it.duration != null && it.duration > 0 && (
                              <>
                                <span style={{ opacity: 0.45 }}>·</span>
                                <span>{formatDuration(it.duration)}</span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Media badge */}
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: `${colors.goldDark}18`,
                        color: colors.goldDark,
                        flexShrink: 0,
                      }}
                    >
                      {it.kind === "series" ? <BookOpen size={13} style={{ flexShrink: 0 }} /> : lessonMediaIcon(it)}
                    </span>
                  </div>
                </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DesignLayout>
  );
}
