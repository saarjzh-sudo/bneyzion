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
    "/images/series-default.png"
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
  return useQuery<TopicLesson[]>({
    queryKey: ["topic-lessons", topicId],
    enabled: !!topicId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_topics")
        .select(
          `lesson_id,
           lessons!inner(
             id, title, duration, published_at,
             thumbnail_url, video_url, audio_url, attachment_url,
             series_id,
             rabbis(name),
             series(title, image_url)
           )`
        )
        .eq("topic_id", topicId!)
        .eq("lessons.status", "published")
        .limit(300);

      if (error) throw error;

      // PostgREST returns lessons nested — flatten them, then sort client-side
      const lessons = (data || [])
        .map((row: any) => row.lessons)
        .filter(Boolean) as TopicLesson[];

      // Sort by published_at desc (newest first)
      lessons.sort((a, b) => {
        const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
        const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
        return tb - ta;
      });

      return lessons;
    },
  });
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function TopicPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [search, setSearch] = useState("");

  const { data: topic, isLoading: topicLoading, error: topicError } = useTopic(slug);
  const { data: lessons = [], isLoading: lessonsLoading } = useTopicLessons(topic?.id);

  const filtered = search.trim()
    ? lessons.filter(
        (l) =>
          l.title.includes(search.trim()) ||
          (l.rabbis?.name || "").includes(search.trim())
      )
    : lessons;

  const isLoading = topicLoading || lessonsLoading;

  return (
    <DesignLayout>
      <div dir="rtl" style={{ minHeight: "100vh", background: colors.parchment }}>
        {/* ─── Hero / header ─────────────────────────────────────────────── */}
        <section
          style={{
            background: `linear-gradient(135deg, ${colors.oliveDark} 0%, ${colors.oliveMain} 100%)`,
            padding: "3rem 1.5rem 2.5rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* subtle radial glow */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(255,255,255,0.07), transparent)",
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
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <Link
                to="/"
                style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.95)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
              >
                דף הבית
              </Link>
              <ChevronLeft size={12} style={{ transform: "rotate(180deg)" }} />
              <span style={{ color: "rgba(255,255,255,0.85)" }}>נושאים</span>
              {topic && (
                <>
                  <ChevronLeft size={12} style={{ transform: "rotate(180deg)" }} />
                  <span style={{ color: "rgba(255,255,255,0.95)", fontWeight: 600 }}>{topic.name}</span>
                </>
              )}
            </nav>

            {/* Title */}
            {topic ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <Tag size={22} style={{ color: "rgba(255,255,255,0.8)", flexShrink: 0 }} />
                <h1
                  style={{
                    fontFamily: fonts.display,
                    fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                    color: "#fff",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {topic.name}
                </h1>
              </div>
            ) : isLoading ? (
              <div style={{ height: "2.4rem", width: "200px", background: "rgba(255,255,255,0.15)", borderRadius: radii.sm }} />
            ) : null}

            {/* Description */}
            {topic?.description && (
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.9rem",
                  color: "rgba(255,255,255,0.72)",
                  marginTop: "0.6rem",
                  marginBottom: 0,
                  maxWidth: 560,
                  lineHeight: 1.6,
                }}
              >
                {topic.description}
              </p>
            )}

            {/* Lesson count badge */}
            {!isLoading && lessons.length > 0 && (
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.8rem",
                  color: "rgba(255,255,255,0.55)",
                  marginTop: "0.75rem",
                  marginBottom: 0,
                }}
              >
                {lessons.length} שיעורים בנושא זה
              </p>
            )}
          </div>
        </section>

        {/* ─── Main content ──────────────────────────────────────────────── */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
          {/* Search */}
          {lessons.length > 8 && (
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
              {filtered.map((lesson) => (
                <Link
                  key={lesson.id}
                  to={`/lesson/${lesson.id}`}
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
                      src={lessonImage(lesson)}
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
                        (e.currentTarget as HTMLImageElement).src = "/images/series-default.png";
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
                        {lesson.title}
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
                        {lesson.rabbis?.name && (
                          <span>{lesson.rabbis.name}</span>
                        )}
                        {lesson.series && (
                          <>
                            {lesson.rabbis?.name && <span style={{ opacity: 0.45 }}>·</span>}
                            <span style={{ color: colors.goldDark, fontWeight: 600 }}>{lesson.series.title}</span>
                          </>
                        )}
                        {lesson.duration != null && lesson.duration > 0 && (
                          <>
                            <span style={{ opacity: 0.45 }}>·</span>
                            <span>{formatDuration(lesson.duration)}</span>
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
                      {lessonMediaIcon(lesson)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DesignLayout>
  );
}
