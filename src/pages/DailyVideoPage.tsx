/**
 * DailyVideoPage — /daily-video
 * Archive of "קריאת כיוון" daily videos from daily_videos table.
 * Hero in DorHaplaot style. Grid of video cards with inline player/modal.
 * 2026-05-27 sandbox build.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DesignHeader from "@/components/layout-v2/DesignHeader";
import DesignFooter from "@/components/layout-v2/DesignFooter";
import { useSEO } from "@/hooks/useSEO";

// ── design tokens
const GOLD_DARK    = "#8B6F47";
const GOLD_LIGHT   = "#C4A265";
const GOLD_SHIMMER = "#E8D5A0";
const PARCHMENT    = "#FAF6F0";
const TEXT_DARK    = "#2D1F0E";
const TEXT_MUTED   = "#6B5C4A";

interface DailyVideo {
  id: string;
  date: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  topic: string | null;
}

function formatHebrewDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

function VideoModal({ video, onClose }: { video: DailyVideo; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(45,31,14,0.78)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        style={{
          background: PARCHMENT, borderRadius: "1.5rem", maxWidth: 600, width: "100%",
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 32px 80px rgba(45,31,14,0.32)",
          border: `1px solid rgba(196,162,101,0.3)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header — close button top-left */}
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
            {formatHebrewDate(video.date)}
          </span>
        </div>

        <div style={{ padding: "1rem 1.5rem 2rem" }}>
          <h2 style={{
            fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 900,
            fontSize: "1.2rem", color: TEXT_DARK, marginBottom: "0.5rem",
            lineHeight: 1.25,
          }}>
            {video.title}
          </h2>
          {video.topic && (
            <div style={{
              display: "inline-block",
              padding: "0.2rem 0.65rem", borderRadius: "1rem",
              background: `rgba(139,111,71,0.1)`,
              fontFamily: "Ploni, sans-serif", fontSize: "0.72rem", fontWeight: 700,
              color: GOLD_DARK, marginBottom: "1rem",
            }}>
              {video.topic}
            </div>
          )}

          {/* Video player or placeholder */}
          {video.video_url ? (
            <div style={{
              borderRadius: "1rem", overflow: "hidden",
              background: "#000", marginBottom: "1rem",
            }}>
              <video
                src={video.video_url}
                controls
                preload="metadata"
                style={{ width: "100%", display: "block", maxHeight: 360 }}
              />
            </div>
          ) : (
            <div style={{
              borderRadius: "1rem", overflow: "hidden",
              background: "linear-gradient(135deg, rgba(139,111,71,0.1), rgba(196,162,101,0.05))",
              padding: "2.5rem",
              textAlign: "center",
              marginBottom: "1rem",
              border: `1px solid rgba(196,162,101,0.2)`,
            }}>
              <div style={{
                fontFamily: "Kedem, serif", fontSize: "2rem", opacity: 0.3, color: GOLD_DARK,
                marginBottom: "0.5rem",
              }}>
                ▶
              </div>
              <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.9rem", color: TEXT_MUTED }}>
                סרטון בקרוב
              </div>
            </div>
          )}

          {video.description && (
            <div style={{
              fontFamily: "Ploni, sans-serif", fontSize: "0.93rem",
              color: TEXT_DARK, lineHeight: 1.75,
            }}>
              {video.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DailyVideoPage() {
  useSEO({ title: "קריאת כיוון — בני ציון", description: "המצפן היומי שלך בתנ\"ך · 5 דקות תנ\"ך ביום" });
  const [selected, setSelected] = useState<DailyVideo | null>(null);

  const { data: videos = [], isLoading } = useQuery<DailyVideo[]>({
    queryKey: ["daily-videos-page"],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_videos" as any)
        .select("id, date, title, description, video_url, thumbnail_url, topic")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DailyVideo[];
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
        <img
          src="/images/series-middot.webp"
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
          background: "linear-gradient(to bottom, rgba(26,39,68,0.88) 0%, rgba(26,39,68,0.65) 55%, " + PARCHMENT + " 100%)",
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
            קריאת כיוון
          </h1>
          <p style={{
            fontFamily: "Ploni, sans-serif", fontSize: "1.05rem",
            color: "rgba(255,255,255,0.72)", margin: 0, lineHeight: 1.65,
          }}>
            המצפן היומי שלך בתנ"ך · 5 דקות תנ"ך ביום
          </p>
        </div>
      </section>

      {/* Video grid */}
      <section dir="rtl" style={{ padding: "4rem 1.5rem 6rem", maxWidth: 1200, margin: "0 auto" }}>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: TEXT_MUTED, fontFamily: "Ploni, sans-serif" }}>
            טוען סרטונים...
          </div>
        ) : (
          <>
            <style>{`
              .video-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 1.5rem;
              }
              @media (max-width: 600px) {
                .video-grid { grid-template-columns: 1fr 1fr; gap: 0.85rem; }
              }
              @media (max-width: 380px) {
                .video-grid { grid-template-columns: 1fr; }
              }
            `}</style>
            <div className="video-grid">
              {videos.map(video => {
                const hasVideo = !!video.video_url;
                const hasThumbnail = !!video.thumbnail_url;
                return (
                  <div
                    key={video.id}
                    onClick={() => setSelected(video)}
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
                    {/* Thumbnail or placeholder */}
                    <div style={{
                      height: 170, position: "relative", overflow: "hidden",
                      background: hasThumbnail
                        ? "transparent"
                        : `linear-gradient(135deg, rgba(139,111,71,0.12), rgba(196,162,101,0.06))`,
                    }}>
                      {hasThumbnail ? (
                        <img
                          src={video.thumbnail_url!}
                          alt={video.title}
                          loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{
                          height: "100%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexDirection: "column", gap: "0.4rem",
                        }}>
                          <span style={{
                            fontFamily: "Kedem, serif", fontSize: "2rem",
                            opacity: hasVideo ? 0.45 : 0.18, color: GOLD_DARK,
                          }}>
                            ▶
                          </span>
                          {!hasVideo && (
                            <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.75rem", color: TEXT_MUTED, opacity: 0.7 }}>
                              סרטון בקרוב
                            </span>
                          )}
                        </div>
                      )}
                      {/* Play overlay badge */}
                      {hasVideo && (
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "rgba(45,31,14,0.35)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: "50%",
                            background: "rgba(255,255,255,0.9)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "1rem", color: GOLD_DARK,
                          }}>
                            ▶
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div style={{ padding: "0.9rem 1rem 1.1rem" }}>
                      <div style={{
                        fontFamily: "Ploni, sans-serif", fontSize: "0.72rem", fontWeight: 700,
                        color: GOLD_DARK, marginBottom: "0.3rem", letterSpacing: "0.05em",
                      }}>
                        {formatHebrewDate(video.date)}
                        {video.topic && <span style={{ color: TEXT_MUTED, fontWeight: 400, marginInlineStart: "0.4rem" }}>· {video.topic}</span>}
                      </div>
                      <div style={{
                        fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
                        fontSize: "0.93rem", color: TEXT_DARK, lineHeight: 1.35,
                        display: "-webkit-box" as any,
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as any,
                        overflow: "hidden",
                      }}>
                        {video.title}
                      </div>
                      <div style={{
                        fontFamily: "Ploni, sans-serif", fontSize: "0.75rem",
                        color: hasVideo ? GOLD_DARK : TEXT_MUTED,
                        fontWeight: hasVideo ? 600 : 400,
                        marginTop: "0.5rem",
                      }}>
                        {hasVideo ? "לצפייה ←" : "בקרוב"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Modal */}
      {selected && <VideoModal video={selected} onClose={() => setSelected(null)} />}

      <DesignFooter />
    </div>
  );
}
