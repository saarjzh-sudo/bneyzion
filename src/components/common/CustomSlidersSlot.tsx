/**
 * CustomSlidersSlot — רנדור סליידרי-האדמין של placement נתון (רמה 26ד→27).
 *
 * יואב 13:25: יצירת סליידרים לסדרה/קטגוריה בדף הבית ובאגף המורים (/admin/sliders).
 * יואב 17:04 + הכרעת סער 18:00: עיצובים קבועים לבחירה —
 *   cards   = כרטיסים עם תמונה, בשפת "שיעורים נבחרים" של דף הבית (ברירת-מחדל)
 *   compact = כרטיס טקסט קומפקטי (הגרסה הראשונה)
 */
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ChevronLeft, Headphones, Video, FileDown, FileText } from "lucide-react";
import { colors, fonts, radii, shadows } from "@/lib/designTokens";
import { useContentSliders, useSliderLessons, type ContentSlider, type SliderLessonItem } from "@/hooks/useContentSliders";

/* אותם פולבקים של סליידר דף-הבית — לשיעורים בלי thumbnail */
const FALLBACK_IMAGES = ["/images/lesson-audio.webp", "/images/lesson-video.webp", "/images/lesson-text.webp", "/images/series-middot.webp"];
const lessonImage = (l: SliderLessonItem, i: number) => l.thumbnail_url || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];

// יואב 23.7 21:44: "להורדה" על כרטיס-שיעור קרא כאילו הכרטיס הוא קובץ להורדה —
// התג מציין את סוג המדיה, אז קובץ מוצג לפי הסוג שלו (PDF/קובץ)
const attachLabel = (u: string | null) => (u && u.toLowerCase().includes(".pdf") ? "PDF" : "קובץ");
const mediaOf = (l: SliderLessonItem): [typeof Video, string, string] =>
  l.video_url ? [Video, "וידאו", "צפה"] : l.audio_url ? [Headphones, "שמע", "האזן"] : l.attachment_url ? [FileDown, attachLabel(l.attachment_url), "פתח"] : [FileText, "טקסט", "קרא"];

function MediaBadge({ l, accent }: { l: SliderLessonItem; accent: string }) {
  const [Icon, label] = mediaOf(l);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.18rem 0.6rem", borderRadius: radii.pill, background: `${accent}1A`, color: accent, fontFamily: fonts.body, fontSize: "0.66rem", fontWeight: 700 }}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function SliderHeader({ slider, accent, onNudge }: { slider: ContentSlider; accent: string; onNudge: (dir: number) => void }) {
  return (
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
          <button type="button" onClick={() => onNudge(1)} aria-label="הקודם" style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${accent}55`, background: "white", color: accent, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={16} />
          </button>
          <button type="button" onClick={() => onNudge(-1)} aria-label="הבא" style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${accent}55`, background: "white", color: accent, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={16} />
          </button>
        </div>
        <Link to={`/series/${slider.source_id}`} style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: accent, textDecoration: "none", borderBottom: `1px solid ${accent}`, paddingBottom: 1, whiteSpace: "nowrap" }}>
          הצג הכל ←
        </Link>
      </div>
    </div>
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
      <SliderHeader slider={slider} accent={accent} onNudge={nudge} />

      <div ref={scroller} className="scrollbar-hide" style={{ display: "flex", gap: "1.2rem", overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: "0.4rem" }}>
        {slider.variant === "compact"
          ? lessons.map((l) => (
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
            ))
          : lessons.map((l, i) => {
              const [, mediaLabel, action] = mediaOf(l);
              return (
                <Link
                  key={l.id}
                  to={lessonHref(l)}
                  style={{ scrollSnapAlign: "start", flex: "0 0 auto", width: 264, textDecoration: "none", borderRadius: "1.25rem", overflow: "hidden", border: "1px solid rgba(139,111,71,0.1)", background: "white", boxShadow: "0 2px 12px rgba(45,31,14,0.05)", transition: "all 0.28s ease", display: "block" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)";
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 16px 48px rgba(45,31,14,0.12)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = accent;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 12px rgba(45,31,14,0.05)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(139,111,71,0.1)";
                  }}
                >
                  <div style={{ height: 170, overflow: "hidden", position: "relative", background: colors.parchment }}>
                    <img src={lessonImage(l, i)} alt={l.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)" }} />
                    <span style={{ position: "absolute", top: 10, right: 10, padding: "0.2rem 0.65rem", borderRadius: "0.5rem", background: `linear-gradient(135deg, ${colors.goldDark}, ${colors.goldLight})`, color: "white", fontFamily: fonts.body, fontSize: "0.68rem", fontWeight: 700 }}>
                      {mediaLabel}
                    </span>
                  </div>
                  <div style={{ padding: "1rem 1.1rem 1.25rem" }}>
                    {l.rabbiName && (
                      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: "0.72rem", color: accent, marginBottom: "0.3rem" }}>{l.rabbiName}</div>
                    )}
                    <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.9rem", color: colors.textDark, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "0.5rem", minHeight: "2.6em" }}>
                      {l.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {l.duration ? (
                        <span style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textSubtle }}>{Math.floor(l.duration / 60)} דקות</span>
                      ) : <span />}
                      <span style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: accent, fontWeight: 600 }}>{action} ←</span>
                    </div>
                  </div>
                </Link>
              );
            })}
      </div>
    </section>
  );
}

export default function CustomSlidersSlot({ placement }: { placement: "home" | "teachers" }) {
  const { data: sliders = [] } = useContentSliders(placement);
  if (sliders.length === 0) return null;

  const accent = placement === "teachers" ? colors.oliveMain : colors.goldDark;
  // יואב 23.7 21:44: הקישור /series/:id?lesson= נבלע כשהצומת הוא סקשן —
  // הראוט מפנה ל-/category ומאבד את הפרמטר, והגולש נחת על הקטגוריה במקום
  // על השיעור. דף-השיעור המלא הוא יעד יציב לכל סוגי הצמתים.
  const lessonHref = (l: SliderLessonItem) =>
    placement === "teachers" ? `/teachers/lesson/${l.id}` : `/lessons/${l.id}`;

  return (
    <>
      {sliders.map((s) => (
        <SingleSlider key={s.id} slider={s} accent={accent} lessonHref={lessonHref} />
      ))}
    </>
  );
}
