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

// ── design tokens (match DesignPreviewHome)
const GOLD_DARK    = "#8B6F47";
const GOLD_LIGHT   = "#C4A265";
const GOLD_SHIMMER = "#E8D5A0";
const PARCHMENT    = "#FAF6F0";
const PARCHMENT_DARK = "#F5F0E8";
const TEXT_DARK    = "#2D1F0E";
const TEXT_MUTED   = "#6B5C4A";
const NAVY_DEEP    = "#1A2744";

interface DailyVerse {
  id: string;
  date: string;
  verse_text: string;
  verse_source: string;
  commentary: string | null;
  image_url: string | null;
  raw_caption: string | null;
}

function formatHebrewDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
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

          {/* Commentary */}
          {verse.commentary && (
            <div style={{
              fontFamily: "Ploni, sans-serif", fontSize: "0.93rem",
              color: TEXT_DARK, lineHeight: 1.75,
              background: `rgba(196,162,101,0.07)`,
              borderRadius: "0.85rem",
              padding: "1rem 1.1rem",
            }}>
              {verse.commentary}
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
          src="/images/series-tanach-victory.png"
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
            <style>{`
              .verse-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 1.5rem;
              }
              @media (max-width: 600px) {
                .verse-grid { grid-template-columns: 1fr; }
              }
            `}</style>
            <div className="verse-grid">
              {verses.map(verse => (
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
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Modal */}
      {selected && <VerseModal verse={selected} onClose={() => setSelected(null)} />}

      <DesignFooter />
    </div>
  );
}
