/**
 * CustomSlidersSlot — רנדור סליידרי-האדמין של placement נתון (רמה 26ד).
 *
 * יואב 13:25: יצירת סליידרים לסדרה/קטגוריה בדף הבית ובאגף המורים — מנוהל
 * ב-/admin/sliders. עיצוב: שפת סליידר דף-הבית; באגף המורים פלטת הזית.
 */
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ChevronLeft, Headphones, Video, FileDown, FileText } from "lucide-react";
import { colors, fonts, radii, shadows } from "@/lib/designTokens";
import { useContentSliders, useSliderLessons, type ContentSlider, type SliderLessonItem } from "@/hooks/useContentSliders";

function MediaBadge({ l, accent }: { l: SliderLessonItem; accent: string }) {
  const [Icon, label] = l.video_url
    ? [Video, "וידאו"]
    : l.audio_url
      ? [Headphones, "שמע"]
      : l.attachment_url
        ? [FileDown, "להורדה"]
        : [FileText, "טקסט"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.18rem 0.6rem", borderRadius: radii.pill, background: `${accent}1A`, color: accent, fontFamily: fonts.body, fontSize: "0.66rem", fontWeight: 700 }}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function SingleSlider({ slider, accent, lessonHref }: {
  slider: ContentSlider;
  accent: string;
  lessonHref: (l: SliderLessonItem) => string;
}) {
  const { data: lessons = [] } = useSliderLessons(slider.source_id);
  const scroller = useRef<HTMLDivElement>(null);
  const nudge = (dir: number) => scroller.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  if (lessons.length === 0) return null;

  return (
    <section dir="rtl" style={{ marginBottom: "2.75rem" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.1rem", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          {slider.eyebrow && (
            <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", fontWeight: 700, color: accent, letterSpacing: "0.12em", marginBottom: "0.25rem" }}>
              {slider.eyebrow}
            </div>
          )}
          <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.2rem, 2.4vw, 1.6rem)", color: colors.textDark, margin: 0 }}>
            {slider.title}
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button type="button" onClick={() => nudge(1)} aria-label="הקודם" style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${accent}55`, background: "white", color: accent, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronRight size={16} />
            </button>
            <button type="button" onClick={() => nudge(-1)} aria-label="הבא" style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${accent}55`, background: "white", color: accent, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={16} />
            </button>
          </div>
          <Link to={`/series/${slider.source_id}`} style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: accent, textDecoration: "none", borderBottom: `1px solid ${accent}`, paddingBottom: 1, whiteSpace: "nowrap" }}>
            הצג הכל ←
          </Link>
        </div>
      </div>

      <div ref={scroller} className="scrollbar-hide" style={{ display: "flex", gap: "1.1rem", overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: "0.4rem" }}>
        {lessons.map((l) => (
          <Link
            key={l.id}
            to={lessonHref(l)}
            style={{ scrollSnapAlign: "start", flex: "0 0 auto", width: 236, textDecoration: "none", background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.12)", boxShadow: shadows.cardSoft, padding: "1.1rem 1.2rem 1.15rem", display: "flex", flexDirection: "column", gap: "0.6rem", transition: "transform 0.2s, box-shadow 0.22s" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 14px 36px ${accent}2E`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = shadows.cardSoft;
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
              <MediaBadge l={l} accent={accent} />
              {l.content_type && (
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
              <span style={{ fontFamily: fonts.body, fontSize: "0.72rem", fontWeight: 700, color: accent, whiteSpace: "nowrap" }}>
                לצפייה ←
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function CustomSlidersSlot({ placement }: { placement: "home" | "teachers" }) {
  const { data: sliders = [] } = useContentSliders(placement);
  if (sliders.length === 0) return null;

  const accent = placement === "teachers" ? colors.oliveMain : colors.goldDark;
  const lessonHref = (l: SliderLessonItem) =>
    placement === "teachers"
      ? `/teachers/lesson/${l.id}`
      : `/series/${l.series_id}?lesson=${l.id}`;

  return (
    <>
      {sliders.map((s) => (
        <SingleSlider key={s.id} slider={s} accent={accent} lessonHref={lessonHref} />
      ))}
    </>
  );
}
