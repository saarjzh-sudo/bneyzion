/**
 * DailyVersePage — /daily-verse
 * Archive of daily verses from daily_verses table.
 * Hero in DorHaplaot style. Grid of verse cards, modal with full commentary.
 * 2026-05-27 sandbox build.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DesignHeader from "@/components/layout-v2/DesignHeader";
import DesignFooter from "@/components/layout-v2/DesignFooter";
import { useSEO } from "@/hooks/useSEO";
import { hebrewDateLabel, hebrewMonthLabel, hebrewMonthKey } from "@/lib/hebrewDate";
import { WhatsAppButton, DorHaplaotButton } from "@/components/family/BrandButtons";

// ── design tokens (match DesignPreviewHome)
const GOLD_DARK    = "#8B6F47";
const GOLD_LIGHT   = "#C4A265";
const GOLD_SHIMMER = "#E8D5A0";
const PARCHMENT    = "#FAF6F0";
const PARCHMENT_DARK = "#F5F0E8";
const TEXT_DARK    = "#2D1F0E";
const TEXT_MUTED   = "#6B5C4A";
const NAVY_DEEP    = "#1A2744";

// ── Sender / author constants
const RABBI_NAME   = "הרב יואב אוריאל";
const RABBI_AVATAR = "/images/yoav-campaign/yoav-with-shoftim-book.jpg";

interface DailyVerse {
  id: string;
  date: string;
  verse_text: string;
  verse_source: string;
  commentary: string | null;
  image_url: string | null;
  raw_caption: string | null;
}

// 7.7.2026 (סער): תאריך עברי אמיתי (hebcal, מאומת מול hebcal.com) במקום לועזי
function formatHebrewDate(dateStr: string): string {
  return hebrewDateLabel(dateStr);
}

/**
 * formatCommentary — הפירוש כ-HTML מסודר (סער 7.7.2026, "כמו בחדשות התנ״ך"):
 * חותך את הפניות-הוואטסאפ/דור-הפלאות מהטקסט (יש כפתורים), מוריד שורות-קישור,
 * וממיר *הדגשות* ל-<strong> מוזהב. עיצוב-תצוגה בלבד — ה-DB לא משתנה.
 */
function formatCommentary(text: string): string {
  let t = text;
  for (const marker of ["להצטרפות לקבוצ", "לקריאת 'דור", "לקריאת ׳דור", "לקריאת ׳דור", "לקריאת \"דור"]) {
    const i = t.indexOf(marker);
    if (i > -1) t = t.slice(0, i);
  }
  t = t
    .split("\n")
    .filter((ln) => !/^\s*https?:\/\/\S+\s*$/.test(ln))
    .join("\n")
    .trim();
  const esc = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // הדגשה יכולה להימתח על-פני ירידת-שורה (הודעות וואטסאפ); non-greedy כדי לא לבלוע
  // פסקאות. כוכבית בודדת שנותרה (זוג לא-סגור) מוסרת — אסור שתופיע בתצוגה.
  const bolded = esc.replace(/\*([^*]+?)\*/g, "<strong>$1</strong>").replace(/\*/g, "");
  return bolded
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim().replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function VerseModal({ verse, onClose }: { verse: DailyVerse; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(45,31,14,0.72)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        style={{
          background: PARCHMENT, borderRadius: "1.5rem", maxWidth: 560, width: "100%",
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 32px 80px rgba(45,31,14,0.3)",
          border: `1px solid rgba(196,162,101,0.3)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header — close button (top-left per iron rule) */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.1rem 1.25rem 0",
        }}>
          <button
            onClick={onClose}
            aria-label="סגור"
            style={{
              width: 34, height: 34, borderRadius: "50%",
              border: `1px solid rgba(139,111,71,0.2)`, background: "transparent",
              cursor: "pointer", fontSize: "1.1rem", color: TEXT_MUTED,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ×
          </button>
          <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.8rem", color: TEXT_MUTED }}>
            {formatHebrewDate(verse.date)}
          </span>
        </div>

        {/* Image */}
        {verse.image_url && (
          <div style={{ margin: "1rem 1.25rem 0", borderRadius: "1rem", overflow: "hidden", maxHeight: 220 }}>
            <img
              src={verse.image_url}
              alt="פסוק יומי"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        )}

        {/* Content */}
        <div style={{ padding: "1.25rem 1.5rem 2rem" }}>
          {/* Verse */}
          <blockquote style={{
            fontFamily: "Kedem, Frank Ruhl Libre, serif",
            fontStyle: "italic",
            fontSize: "1.15rem",
            color: TEXT_DARK,
            lineHeight: 1.75,
            borderInlineEnd: `3px solid ${GOLD_LIGHT}`,
            paddingInlineEnd: "1rem",
            margin: "0 0 0.5rem",
          }}>
            ״{verse.verse_text}״
          </blockquote>
          {verse.verse_source && (
            <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.8rem", color: TEXT_MUTED, marginBottom: "1.25rem" }}>
              [{verse.verse_source}]
            </div>
          )}

          {/* Commentary — HTML מסודר עם הדגשות מוזהבות (סער 7.7.2026) */}
          {verse.commentary && (
            <div
              className="verse-commentary"
              style={{
                fontFamily: "Ploni, sans-serif", fontSize: "0.93rem",
                color: TEXT_DARK, lineHeight: 1.8,
                background: `rgba(196,162,101,0.07)`,
                borderRadius: "0.85rem",
                padding: "1rem 1.1rem",
              }}
              dangerouslySetInnerHTML={{ __html: formatCommentary(verse.commentary) }}
            />
          )}

          {/* Author row in modal */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.6rem",
            marginTop: "1.25rem",
            paddingTop: "1rem",
            borderTop: `1px solid rgba(139,111,71,0.15)`,
          }}>
            <img
              src={RABBI_AVATAR}
              alt={RABBI_NAME}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                objectFit: "cover", objectPosition: "top",
                border: `2px solid rgba(196,162,101,0.4)`,
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.8rem", fontWeight: 700, color: TEXT_DARK }}>
                {RABBI_NAME}
              </div>
              <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.72rem", color: TEXT_MUTED }}>
                פסוק יומי — בכוח התנ״ך ננצח
              </div>
            </div>
          </div>

          {/* כפתורי-מותג בסיום הפופאפ (סער 7.7.2026): ווטסאפ + דור הפלאות, במקום קישורי-טקסט */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "0.6rem",
            marginTop: "1.1rem",
          }}>
            <WhatsAppButton />
            <DorHaplaotButton />
          </div>
        </div>
      </div>
    </div>
  );
}

// 7.7.2026 (סער): קיבוץ הארכיון לפי חודש עברי (תמוז תשפ"ו), לא לועזי
function groupByMonth(verses: DailyVerse[]): { label: string; verses: DailyVerse[] }[] {
  const map = new Map<number, { label: string; verses: DailyVerse[] }>();
  for (const v of verses) {
    const key = hebrewMonthKey(v.date);
    if (!map.has(key)) map.set(key, { label: hebrewMonthLabel(v.date), verses: [] });
    map.get(key)!.verses.push(v);
  }
  // Sort descending (newest Hebrew month first)
  return Array.from(map.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, g]) => g);
}

export default function DailyVersePage() {
  useSEO({ title: "פסוק יומי — בני ציון", description: "פסוק אחד לכל יום — מאת הרב יואב אוריאל" });
  const [selected, setSelected] = useState<DailyVerse | null>(null);

  const { data: verses = [], isLoading } = useQuery<DailyVerse[]>({
    queryKey: ["daily-verses-page"],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_verses" as any)
        .select("id, date, verse_text, verse_source, commentary, image_url, raw_caption")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DailyVerse[];
    },
  });

  const grouped = groupByMonth(verses);

  return (
    <div style={{ minHeight: "100vh", background: PARCHMENT, fontFamily: "Ploni, sans-serif" }}>
      <DesignHeader />

      {/* Hero */}
      <section style={{
        position: "relative", minHeight: "55vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {/* Background image */}
        <img
          src="/images/series-tanach-victory.webp"
          alt=""
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center",
          }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(26,39,68,0.88) 0%, rgba(26,39,68,0.65) 50%, " + PARCHMENT + " 100%)",
        }} />

        <div dir="rtl" style={{
          position: "relative", zIndex: 1,
          textAlign: "center", padding: "6rem 1.5rem 4rem",
          maxWidth: 680, margin: "0 auto",
        }}>
          <div style={{
            display: "inline-block",
            padding: "0.3rem 0.9rem", borderRadius: "2rem",
            background: "rgba(196,162,101,0.18)", border: "1px solid rgba(196,162,101,0.4)",
            fontFamily: "Ploni, sans-serif", fontSize: "0.78rem", fontWeight: 700,
            color: GOLD_SHIMMER, letterSpacing: "0.08em",
            marginBottom: "1rem",
          }}>
            הרב יואב אוריאל
          </div>
          <h1 style={{
            fontFamily: "Kedem, Frank Ruhl Libre, serif",
            fontWeight: 900,
            fontSize: "clamp(2.4rem, 6vw, 4rem)",
            color: "white",
            margin: "0 0 0.75rem",
            lineHeight: 1.1,
          }}>
            פסוק יומי
          </h1>
          <p style={{
            fontFamily: "Ploni, sans-serif", fontSize: "1.05rem",
            color: "rgba(255,255,255,0.72)", margin: 0, lineHeight: 1.65,
          }}>
            פסוק אחד מרומם לכל יום — ישר מתנ"ך
          </p>
        </div>
      </section>

      {/* Verse grid */}
      <section dir="rtl" style={{ padding: "4rem 1.5rem 6rem", maxWidth: 1200, margin: "0 auto" }}>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: TEXT_MUTED, fontFamily: "Ploni, sans-serif" }}>
            טוען פסוקים...
          </div>
        ) : (
          <>
            {/* ── הפסוק היומי — האחרון, מודגש במסגרת (סער 7.7.2026: בלי תאריך) ── */}
            {verses[0] && (
              <div
                onClick={() => setSelected(verses[0])}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelected(verses[0])}
                style={{
                  marginBottom: "3rem",
                  background: "#fff",
                  border: `2px solid ${GOLD_LIGHT}`,
                  borderRadius: "1.5rem",
                  boxShadow: "0 14px 44px rgba(139,111,71,0.16)",
                  padding: "1.75rem 2rem",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: "absolute", inset: 0,
                    background: "radial-gradient(ellipse at 85% 0%, rgba(232,213,160,0.25), transparent 55%)",
                    pointerEvents: "none",
                  }}
                />
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "0.45rem",
                  background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD_DARK})`,
                  color: "#fff", borderRadius: 999, padding: "0.3rem 0.9rem",
                  fontFamily: "Ploni, sans-serif", fontSize: "0.78rem", fontWeight: 700,
                  marginBottom: "1rem",
                }}>
                  ✨ הפסוק היומי
                </div>
                {/* תמונת הטור — בראש, כמו בחדשות תנ"כיות (יואב 19.7) */}
                {verses[0].image_url && (
                  <div
                    style={{
                      borderRadius: "1rem", overflow: "hidden",
                      marginBottom: "1.25rem", maxHeight: 340,
                      border: "1px solid rgba(139,111,71,0.15)",
                      position: "relative",
                    }}
                  >
                    <img
                      src={verses[0].image_url}
                      alt="הפסוק היומי"
                      style={{ width: "100%", height: "100%", maxHeight: 340, objectFit: "cover", objectPosition: "center 30%", display: "block" }}
                    />
                  </div>
                )}
                <blockquote style={{
                  fontFamily: "Kedem, Frank Ruhl Libre, serif", fontStyle: "italic",
                  fontSize: "clamp(1.15rem, 2.6vw, 1.55rem)", color: TEXT_DARK,
                  lineHeight: 1.7, margin: "0 0 0.5rem",
                }}>
                  ״{verses[0].verse_text}״
                </blockquote>
                {verses[0].verse_source && (
                  <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.85rem", color: GOLD_DARK, fontWeight: 700, marginBottom: "0.75rem" }}>
                    [{verses[0].verse_source}]
                  </div>
                )}
                {verses[0].commentary && (
                  <div
                    className="verse-commentary"
                    style={{
                      fontFamily: "Ploni, sans-serif", fontSize: "0.95rem", color: TEXT_MUTED,
                      lineHeight: 1.8,
                      display: "-webkit-box" as any, WebkitLineClamp: 4, WebkitBoxOrient: "vertical" as any,
                      overflow: "hidden",
                    }}
                    dangerouslySetInnerHTML={{ __html: formatCommentary(verses[0].commentary) }}
                  />
                )}
                <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.8rem", color: GOLD_DARK, fontWeight: 700, marginTop: "0.85rem" }}>
                  לפירוש המלא ←
                </div>
              </div>
            )}

            <style>{`
              .verse-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 1.5rem;
              }
              @media (max-width: 600px) {
                .verse-grid { grid-template-columns: 1fr; }
              }
              .verse-commentary p { margin: 0 0 0.8em; }
              .verse-commentary p:last-child { margin-bottom: 0; }
              .verse-commentary strong { color: ${GOLD_DARK}; font-weight: 700; }
            `}</style>
            {grouped.map(group => (
              <div key={group.label} style={{ marginBottom: "3rem" }}>
                {/* Month header */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "1rem",
                  marginBottom: "1.5rem",
                }}>
                  <h2 style={{
                    fontFamily: "Kedem, Frank Ruhl Libre, serif",
                    fontSize: "1.15rem", fontWeight: 700,
                    color: NAVY_DEEP, margin: 0, whiteSpace: "nowrap",
                  }}>
                    {group.label}
                  </h2>
                  <div style={{ flex: 1, height: 1, background: `rgba(139,111,71,0.2)` }} />
                  <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.72rem", color: TEXT_MUTED, whiteSpace: "nowrap" }}>
                    {group.verses.length} פסוקים
                  </span>
                </div>

                <div className="verse-grid">
              {group.verses.map(verse => (
                <div
                  key={verse.id}
                  onClick={() => setSelected(verse)}
                  style={{
                    borderRadius: "1.25rem",
                    overflow: "hidden",
                    background: "white",
                    border: "1px solid rgba(139,111,71,0.1)",
                    boxShadow: "0 2px 12px rgba(45,31,14,0.05)",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 44px rgba(45,31,14,0.12)";
                    (e.currentTarget as HTMLElement).style.borderColor = GOLD_LIGHT;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(45,31,14,0.05)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,111,71,0.1)";
                  }}
                >
                  {/* Thumbnail */}
                  {verse.image_url ? (
                    <div style={{ height: 160, overflow: "hidden", position: "relative" }}>
                      <img
                        src={verse.image_url}
                        alt="פסוק יומי"
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(to top, rgba(45,31,14,0.45) 0%, transparent 60%)",
                      }} />
                    </div>
                  ) : (
                    <div style={{
                      height: 100,
                      background: `linear-gradient(135deg, rgba(139,111,71,0.12), rgba(196,162,101,0.06))`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontFamily: "Kedem, serif", fontSize: "2.5rem", opacity: 0.18, color: GOLD_DARK }}>ס</span>
                    </div>
                  )}

                  {/* Body */}
                  <div style={{ padding: "1rem 1.1rem 1.25rem" }}>
                    <div style={{
                      fontFamily: "Ploni, sans-serif", fontSize: "0.72rem", fontWeight: 700,
                      color: GOLD_DARK, marginBottom: "0.4rem", letterSpacing: "0.05em",
                    }}>
                      {formatHebrewDate(verse.date)}
                    </div>
                    <div style={{
                      fontFamily: "Kedem, Frank Ruhl Libre, serif",
                      fontStyle: "italic",
                      fontSize: "0.9rem",
                      color: TEXT_DARK,
                      lineHeight: 1.65,
                      display: "-webkit-box" as any,
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical" as any,
                      overflow: "hidden",
                      marginBottom: "0.5rem",
                    }}>
                      ״{verse.verse_text}״
                    </div>
                    {verse.verse_source && (
                      <div style={{
                        fontFamily: "Ploni, sans-serif", fontSize: "0.75rem",
                        color: TEXT_MUTED,
                      }}>
                        [{verse.verse_source}]
                      </div>
                    )}
                    {verse.commentary && (
                      <div style={{
                        fontFamily: "Ploni, sans-serif", fontSize: "0.78rem",
                        color: GOLD_DARK, fontWeight: 600,
                        marginTop: "0.65rem",
                      }}>
                        לפירוש המלא ←
                      </div>
                    )}

                    {/* Author row */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      marginTop: "0.9rem",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid rgba(139,111,71,0.1)",
                    }}>
                      <img
                        src={RABBI_AVATAR}
                        alt={RABBI_NAME}
                        style={{
                          width: 28, height: 28, borderRadius: "50%",
                          objectFit: "cover", objectPosition: "top",
                          border: `1.5px solid rgba(196,162,101,0.35)`,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{
                        fontFamily: "Ploni, sans-serif", fontSize: "0.72rem",
                        color: TEXT_MUTED, fontWeight: 500,
                      }}>
                        {RABBI_NAME}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          ))}
          </>
        )}
      </section>

      {/* Modal */}
      {selected && <VerseModal verse={selected} onClose={() => setSelected(null)} />}

      <DesignFooter />
    </div>
  );
}
