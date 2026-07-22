/**
 * TeacherContentSlider — סליידר תכנים לאגף המורים (יואב 22.7, אישור-היקף סער).
 *
 * "להוסיף שם סליידרים, להוריד את הכפתורים שנמצאים בלב העמוד" — במקום שלושת
 * כפתורי-הקיצור, עמוד האגף מציג תוכן אמיתי בסליידרים בשפת דף-הבית
 * (SelectedLessonsSlider), בפלטת הזית של האגף.
 *
 * שימוש: <TeacherContentSlider title="דפי עבודה" contentType="דפי עבודה" ... />
 * בלי contentType — השיעורים האחרונים מכל הסוגים (מגוּונים, עד 2 לכל סדרה).
 */
import { useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft, Headphones, Video, FileDown, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { colors, fonts, radii, shadows } from "@/lib/designTokens";

interface SliderLesson {
  id: string;
  title: string;
  content_type: string | null;
  video_url: string | null;
  audio_url: string | null;
  attachment_url: string | null;
  series_id: string | null;
  rabbiName: string | null;
}

function useTeacherSliderLessons(contentType?: string) {
  return useQuery<SliderLesson[]>({
    queryKey: ["teacher-slider-lessons", contentType ?? "latest"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      let q = (supabase as any)
        .from("lessons")
        .select("id, title, content_type, video_url, audio_url, attachment_url, series_id, rabbis!lessons_rabbi_id_fkey(name)")
        .contains("audience_tags", ["teachers"])
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(40);
      if (contentType) q = q.eq("content_type", contentType);
      const { data, error } = await q;
      if (error) throw error;
      // גיוון: עד 2 שיעורים מאותה סדרה (אותו כלל כמו סליידר דף-הבית)
      const perSeries: Record<string, number> = {};
      const out: SliderLesson[] = [];
      for (const l of (data ?? []) as any[]) {
        const key = l.series_id || l.id;
        perSeries[key] = (perSeries[key] || 0) + 1;
        if (perSeries[key] <= 2) {
          out.push({ ...l, rabbiName: l.rabbis?.name ?? null });
        }
        if (out.length >= 12) break;
      }
      return out;
    },
  });
}

function MediaBadge({ l }: { l: SliderLesson }) {
  const [Icon, label] = l.video_url
    ? [Video, "וידאו"]
    : l.audio_url
      ? [Headphones, "שמע"]
      : l.attachment_url
        ? [FileDown, "להורדה"]
        : [FileText, "טקסט"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.18rem 0.6rem", borderRadius: radii.pill, background: "rgba(74,90,46,0.1)", color: colors.oliveDark, fontFamily: fonts.body, fontSize: "0.66rem", fontWeight: 700 }}>
      <Icon size={11} />
      {label}
    </span>
  );
}

export default function TeacherContentSlider({
  eyebrow,
  title,
  contentType,
  viewAllTo,
  viewAllLabel = "הצג הכל",
}: {
  eyebrow: string;
  title: string;
  /** ריק = השיעורים האחרונים מכל הסוגים */
  contentType?: string;
  viewAllTo?: string;
  viewAllLabel?: string;
}) {
  const { data: lessons = [] } = useTeacherSliderLessons(contentType);
  const scroller = useRef<HTMLDivElement>(null);
  const nudge = (dir: number) => scroller.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  if (lessons.length === 0) return null;

  return (
    <section dir="rtl" style={{ marginBottom: "2.75rem" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.1rem", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", fontWeight: 700, color: colors.oliveMain, letterSpacing: "0.12em", marginBottom: "0.25rem" }}>
            {eyebrow}
          </div>
          <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.2rem, 2.4vw, 1.6rem)", color: colors.textDark, margin: 0 }}>
            {title}
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button type="button" onClick={() => nudge(1)} aria-label="הקודם" style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${colors.oliveMain}55`, background: "white", color: colors.oliveMain, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronRight size={16} />
            </button>
            <button type="button" onClick={() => nudge(-1)} aria-label="הבא" style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${colors.oliveMain}55`, background: "white", color: colors.oliveMain, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={16} />
            </button>
          </div>
          {viewAllTo && (
            <Link to={viewAllTo} style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.oliveMain, textDecoration: "none", borderBottom: `1px solid ${colors.oliveMain}`, paddingBottom: 1, whiteSpace: "nowrap" }}>
              {viewAllLabel} ←
            </Link>
          )}
        </div>
      </div>

      <div ref={scroller} className="scrollbar-hide" style={{ display: "flex", gap: "1.1rem", overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: "0.4rem" }}>
        {lessons.map((l) => (
          <Link
            key={l.id}
            to={`/teachers/lesson/${l.id}`}
            style={{ scrollSnapAlign: "start", flex: "0 0 auto", width: 236, textDecoration: "none", background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.12)", boxShadow: shadows.cardSoft, padding: "1.1rem 1.2rem 1.15rem", display: "flex", flexDirection: "column", gap: "0.6rem", transition: "transform 0.2s, box-shadow 0.22s" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 14px 36px rgba(74,90,46,0.18)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = shadows.cardSoft;
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
              <MediaBadge l={l} />
              {!contentType && l.content_type && (
                <span style={{ fontFamily: fonts.body, fontSize: "0.64rem", color: colors.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {l.content_type}
                </span>
              )}
            </div>
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.92rem", color: colors.textDark, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "3.9em" }}>
              {l.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
              <span style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>
                {l.rabbiName ?? ""}
              </span>
              <span style={{ fontFamily: fonts.body, fontSize: "0.72rem", fontWeight: 700, color: colors.oliveMain, whiteSpace: "nowrap" }}>
                לצפייה ←
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
