/**
 * RabbiPage — /rabbis/:id (slug or legacy UUID)
 *
 * Parity target: old bneyzion site rabbi page structure:
 *  - Hero: avatar + name + bio + counts
 *  - Media filter pills: כל הסוגים / וידאו / אודיו / טקסט-PDF / שאלות-ותשובות
 *  - ONE flat list (no section headers): series cards + individual lessons +
 *    Q&A rows — sorted by rabbi_page_items.sort_order when rows exist,
 *    otherwise series-first then lessons §0.1
 *  - No pagination, no cap
 *  - Series always visible under "כל הסוגים" and their own media bucket
 *  - LessonDialog for lesson/qa rows
 *
 * Layout: DesignLayout (v2 with sidebar). Cream-gold, RTL.
 */

import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Play, Volume2, FileText, HelpCircle, BookOpen, Loader2, ChevronLeft } from "lucide-react";
import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, radii, shadows, formatDuration } from "@/lib/designTokens";
import { useRabbi, useRabbiBySlug, useRabbiSeries, useRabbiLessons, useRabbiPageItems, isUUID } from "@/hooks/useRabbi";
import LessonDialog from "@/components/lesson/LessonDialog";
import { useSEO } from "@/hooks/useSEO";
import { formatRabbiName } from "@/lib/rabbi-name";

// ─── types ───────────────────────────────────────────────────────────────────

type MediaKind = "all" | "video" | "audio" | "text" | "qa";

interface FlatItem {
  type: "series" | "lesson" | "qa";
  id: string;
  title: string;
  image_url?: string | null;
  lesson_count?: number;
  duration?: number | null;
  audio_url?: string | null;
  video_url?: string | null;
  attachment_url?: string | null;
  series_title?: string | null;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function mediaKindOf(item: FlatItem): MediaKind {
  if (item.type === "qa") return "qa";
  if (item.type === "series") return "all"; // series shown in every filter
  if (item.video_url) return "video";
  if (item.audio_url) return "audio";
  return "text";
}

function MediaIcon({ kind, size = 14 }: { kind: MediaKind; size?: number }) {
  if (kind === "video") return <Play size={size} />;
  if (kind === "audio") return <Volume2 size={size} />;
  if (kind === "qa") return <HelpCircle size={size} />;
  if (kind === "text") return <FileText size={size} />;
  return <BookOpen size={size} />;
}

const FILTER_PILLS: { key: MediaKind; label: string }[] = [
  { key: "all", label: "כל הסוגים" },
  { key: "video", label: "וידאו" },
  { key: "audio", label: "אודיו" },
  { key: "text", label: "טקסט · PDF" },
  { key: "qa", label: "שאלות ותשובות" },
];

// ─── sub-components ──────────────────────────────────────────────────────────

function SeriesCard({ item, onClick }: { item: FlatItem; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={`/series/${item.id}`}
      onClick={onClick}
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
          boxShadow: hovered ? shadows.cardHover : shadows.card,
          border: `1px solid ${hovered ? "rgba(139,111,71,0.25)" : "rgba(139,111,71,0.1)"}`,
          transition: "box-shadow 0.15s, transform 0.15s, border-color 0.15s",
          transform: hovered ? "translateY(-1px)" : "translateY(0)",
          cursor: "pointer",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Thumbnail */}
        <img
          src={item.image_url || "/images/series-default.png"}
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

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: "0.92rem",
              color: hovered ? colors.goldDark : colors.textDark,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              transition: "color 0.15s",
            }}
          >
            {item.title}
          </div>
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: "0.75rem",
              color: colors.textSubtle,
              marginTop: "0.25rem",
            }}
          >
            {item.lesson_count != null ? `${item.lesson_count} שיעורים` : "סדרת שיעורים"}
          </div>
        </div>

        {/* Series badge */}
        <span
          style={{
            fontSize: "0.7rem",
            fontFamily: fonts.body,
            color: colors.goldDark,
            background: `${colors.goldDark}14`,
            borderRadius: radii.pill,
            padding: "0.2rem 0.6rem",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          סדרה
        </span>
      </div>
    </Link>
  );
}

function LessonRow({
  item,
  onOpen,
}: {
  item: FlatItem;
  onOpen: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const kind = mediaKindOf(item);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(item.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        background: "#fff",
        borderRadius: radii.xl,
        padding: "0.9rem 1.1rem",
        boxShadow: hovered ? shadows.cardHover : shadows.card,
        border: `1px solid ${hovered ? "rgba(139,111,71,0.25)" : "rgba(139,111,71,0.1)"}`,
        transition: "box-shadow 0.15s, transform 0.15s, border-color 0.15s",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Media icon bubble */}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: `${colors.goldDark}14`,
          color: colors.goldDark,
          flexShrink: 0,
        }}
      >
        <MediaIcon kind={kind} size={18} />
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: "0.92rem",
            color: hovered ? colors.goldDark : colors.textDark,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            transition: "color 0.15s",
          }}
        >
          {item.title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "0.25rem",
            fontFamily: fonts.body,
            fontSize: "0.75rem",
            color: colors.textSubtle,
            flexWrap: "wrap",
          }}
        >
          {item.series_title && (
            <span style={{ color: colors.goldDark, fontWeight: 600 }}>{item.series_title}</span>
          )}
          {item.series_title && item.duration != null && item.duration > 0 && (
            <span style={{ opacity: 0.4 }}>·</span>
          )}
          {item.duration != null && item.duration > 0 && (
            <span>{formatDuration(item.duration)}</span>
          )}
        </div>
      </div>

      {/* QA label */}
      {item.type === "qa" && (
        <span
          style={{
            fontSize: "0.7rem",
            fontFamily: fonts.body,
            color: colors.tealMain,
            background: `${colors.tealMain}14`,
            borderRadius: radii.pill,
            padding: "0.2rem 0.6rem",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          שו"ת
        </span>
      )}
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

const RabbiPage = () => {
  const { id: param } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const uuidMode = isUUID(param);

  // UUID legacy redirect
  const { data: rabbiByUUID, isLoading: uuidLoading } = useRabbi(uuidMode ? param : undefined);
  const { data: rabbiBySlug, isLoading: slugLoading } = useRabbiBySlug(!uuidMode ? param : undefined);

  useEffect(() => {
    if (uuidMode && rabbiByUUID?.slug) {
      navigate(`/rabbis/${rabbiByUUID.slug}`, { replace: true });
    }
  }, [uuidMode, rabbiByUUID, navigate]);

  const rabbi = uuidMode ? undefined : rabbiBySlug;
  const isLoading = uuidMode ? uuidLoading : slugLoading;
  const rabbiId = rabbi?.id;

  // Data
  const { data: rpiRows, isLoading: rpiLoading } = useRabbiPageItems(rabbiId);
  const { data: seriesList, isLoading: seriesLoading } = useRabbiSeries(rabbiId);
  const { data: lessons, isLoading: lessonsLoading } = useRabbiLessons(rabbiId);

  // UI state
  const [activeFilter, setActiveFilter] = useState<MediaKind>("all");
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  const displayName = useMemo(() => formatRabbiName(rabbi), [rabbi]);

  useSEO({
    title: displayName || rabbi?.name,
    description: rabbi?.bio ?? `שיעורי ${displayName || rabbi?.name || "הרב"} באתר בני ציון`,
    image: rabbi?.image_url ?? undefined,
    type: "profile",
  });

  // ─── build flat list ────────────────────────────────────────────────────────
  const flatItems = useMemo<FlatItem[]>(() => {
    const hasRpi = rpiRows && rpiRows.length > 0;

    if (hasRpi) {
      // rabbi_page_items curated order
      return rpiRows.map((row: any): FlatItem => {
        if (row.kind === "series" && row.series) {
          return {
            type: "series",
            id: row.series.id,
            title: row.series.title,
            image_url: row.series.image_url,
            lesson_count: row.series.lesson_count,
          };
        }
        if (row.kind === "qa" && row.lessons) {
          return {
            type: "qa",
            id: row.lessons.id,
            title: row.lessons.title,
            duration: row.lessons.duration,
            audio_url: row.lessons.audio_url,
            video_url: row.lessons.video_url,
            attachment_url: row.lessons.attachment_url,
          };
        }
        // kind === "lesson"
        const l = row.lessons;
        if (!l) return { type: "lesson", id: row.lesson_id ?? row.id, title: "(ללא כותרת)" };
        return {
          type: "lesson",
          id: l.id,
          title: l.title,
          duration: l.duration,
          audio_url: l.audio_url,
          video_url: l.video_url,
          attachment_url: l.attachment_url,
        };
      });
    }

    // Fallback: series first, then lessons — §0.1 ordering (already applied by hooks)
    const seriesItems: FlatItem[] = (seriesList ?? []).map((s: any) => ({
      type: "series",
      id: s.id,
      title: s.title,
      image_url: s.image_url,
      lesson_count: s.lesson_count,
    }));

    const lessonItems: FlatItem[] = (lessons ?? []).map((l: any) => ({
      type: "lesson",
      id: l.id,
      title: l.title,
      duration: l.duration,
      audio_url: l.audio_url,
      video_url: l.video_url,
      attachment_url: l.attachment_url,
      series_title: (l.series as any)?.title ?? null,
    }));

    return [...seriesItems, ...lessonItems];
  }, [rpiRows, seriesList, lessons]);

  // ─── filter ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (activeFilter === "all") return flatItems;
    return flatItems.filter((item) => {
      if (item.type === "series") return true; // series visible in all filters per old site
      return mediaKindOf(item) === activeFilter;
    });
  }, [flatItems, activeFilter]);

  // ─── counts per filter (for pill badges) ────────────────────────────────────
  const counts = useMemo<Record<MediaKind, number>>(() => {
    const c: Record<MediaKind, number> = { all: 0, video: 0, audio: 0, text: 0, qa: 0 };
    for (const item of flatItems) {
      c.all++;
      if (item.type === "series") {
        // series counted in all but not in sub-filters
      } else {
        const k = mediaKindOf(item);
        if (k !== "all") c[k]++;
      }
    }
    return c;
  }, [flatItems]);

  const contentLoading = rpiLoading || seriesLoading || lessonsLoading;

  // ─── render ─────────────────────────────────────────────────────────────────

  if (uuidMode || isLoading) {
    return (
      <DesignLayout>
        <div dir="rtl" style={{ minHeight: "100vh", background: colors.parchment }}>
          <section
            style={{
              background: "linear-gradient(160deg, #FBF6EC 0%, #F5EFE0 60%, #EDE5D0 100%)",
              borderBottom: "1px solid rgba(139,111,71,0.12)",
              padding: "3rem 1.5rem 2.5rem",
            }}
          >
            <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(139,111,71,0.1)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: 200, height: 28, background: "rgba(139,111,71,0.1)", borderRadius: radii.sm, marginBottom: "0.75rem" }} />
                <div style={{ width: 300, height: 16, background: "rgba(139,111,71,0.07)", borderRadius: radii.sm }} />
              </div>
            </div>
          </section>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", color: colors.goldDark }}>
            <Loader2 size={20} className="animate-spin" />
            <span style={{ fontFamily: fonts.body, fontSize: "0.9rem" }}>טוען…</span>
          </div>
        </div>
      </DesignLayout>
    );
  }

  if (!rabbi) {
    return (
      <DesignLayout>
        <div dir="rtl" style={{ minHeight: "100vh", background: colors.parchment, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
          <p style={{ fontFamily: fonts.body, color: colors.textMuted, fontSize: "1rem" }}>הרב לא נמצא</p>
          <Link to="/rabbis" style={{ fontFamily: fonts.body, color: colors.goldDark, fontSize: "0.9rem" }}>חזרה לרשימת הרבנים</Link>
        </div>
      </DesignLayout>
    );
  }

  return (
    <DesignLayout>
      <div dir="rtl" style={{ minHeight: "100vh", background: colors.parchment }}>

        {/* ─── Hero ────────────────────────────────────────────────────────── */}
        <section
          style={{
            background: "linear-gradient(160deg, #FBF6EC 0%, #F5EFE0 60%, #EDE5D0 100%)",
            borderBottom: "1px solid rgba(139,111,71,0.12)",
            padding: "3rem 1.5rem 2.5rem",
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
              <Link
                to="/rabbis"
                style={{ color: colors.textSubtle, textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = colors.goldDark)}
                onMouseLeave={(e) => (e.currentTarget.style.color = colors.textSubtle)}
              >
                רבנים ומרצים
              </Link>
              <ChevronLeft size={12} style={{ transform: "rotate(180deg)" }} />
              <span style={{ color: colors.goldDark, fontWeight: 600 }}>{displayName}</span>
            </nav>

            {/* Avatar + Name row */}
            <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
              {/* Avatar */}
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  flexShrink: 0,
                  overflow: "hidden",
                  border: `3px solid rgba(139,111,71,0.2)`,
                  background: colors.parchmentDark,
                }}
              >
                {rabbi.image_url ? (
                  <img
                    src={rabbi.image_url}
                    alt={rabbi.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: fonts.display,
                      fontSize: "2rem",
                      color: colors.goldDark,
                    }}
                  >
                    {rabbi.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <h1
                  style={{
                    fontFamily: fonts.display,
                    fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
                    color: colors.textDark,
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {displayName}
                </h1>

                {rabbi.specialty && (
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: "0.4rem",
                      fontFamily: fonts.body,
                      fontSize: "0.8rem",
                      color: colors.goldDark,
                      background: `${colors.goldDark}14`,
                      borderRadius: radii.pill,
                      padding: "0.15rem 0.6rem",
                    }}
                  >
                    {rabbi.specialty}
                  </span>
                )}

                {rabbi.bio && (
                  <p
                    style={{
                      marginTop: "0.65rem",
                      marginBottom: 0,
                      fontFamily: fonts.body,
                      fontSize: "0.88rem",
                      color: colors.textMuted,
                      lineHeight: 1.65,
                      maxWidth: 560,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {rabbi.bio}
                  </p>
                )}

                {/* Counts row */}
                {!contentLoading && (
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      marginTop: "0.75rem",
                      fontFamily: fonts.body,
                      fontSize: "0.8rem",
                      color: colors.textSubtle,
                    }}
                  >
                    <span>{flatItems.length} פריטים</span>
                    {flatItems.filter((i) => i.type === "series").length > 0 && (
                      <span>{flatItems.filter((i) => i.type === "series").length} סדרות</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Main content ────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>

          {/* ── Media filter pills ─────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              marginBottom: "1.5rem",
            }}
          >
            {FILTER_PILLS.map(({ key, label }) => {
              const isActive = activeFilter === key;
              const count = key === "all" ? counts.all : counts[key];
              if (key !== "all" && count === 0) return null; // hide empty buckets
              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.82rem",
                    padding: "0.3rem 0.9rem",
                    borderRadius: radii.pill,
                    border: isActive
                      ? `1.5px solid ${colors.goldDark}`
                      : "1.5px solid rgba(139,111,71,0.2)",
                    background: isActive ? colors.goldDark : "transparent",
                    color: isActive ? "#fff" : colors.textMuted,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  {label}
                  {count > 0 && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        background: isActive ? "rgba(255,255,255,0.25)" : "rgba(139,111,71,0.12)",
                        borderRadius: radii.pill,
                        padding: "0.1rem 0.45rem",
                        color: isActive ? "#fff" : colors.goldDark,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Loading ───────────────────────────────────────────────────── */}
          {contentLoading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4rem",
                gap: "0.75rem",
                color: colors.goldDark,
              }}
            >
              <Loader2 size={22} className="animate-spin" />
              <span style={{ fontFamily: fonts.body, fontSize: "0.9rem" }}>טוען תוכן…</span>
            </div>
          )}

          {/* ── Empty state ───────────────────────────────────────────────── */}
          {!contentLoading && filtered.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 1rem",
                fontFamily: fonts.body,
                fontSize: "0.9rem",
                color: colors.textSubtle,
              }}
            >
              {activeFilter !== "all"
                ? "אין פריטים מסוג זה"
                : "אין תוכן זמין כרגע"}
            </div>
          )}

          {/* ── Flat content list ─────────────────────────────────────────── */}
          {!contentLoading && filtered.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {filtered.map((item) =>
                item.type === "series" ? (
                  <SeriesCard key={`series-${item.id}`} item={item} />
                ) : (
                  <LessonRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    onOpen={setOpenLessonId}
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Lesson popup ─────────────────────────────────────────────────────── */}
      <LessonDialog
        lessonId={openLessonId}
        open={openLessonId !== null}
        onOpenChange={(open) => { if (!open) setOpenLessonId(null); }}
      />
    </DesignLayout>
  );
};

export default RabbiPage;
