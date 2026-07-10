/**
 * NewsletterPage — /newsletter
 * "הניוזלטר של בני ציון" — ארכיון המיילים התוכניים של הרב יואב אוריאל.
 *
 * נבנה 10.7.2026 (סער) על newsletters.json סטטי; שודרג באותו יום לקריאה
 * מטבלת `newsletters` (מסונכרנת אוטומטית מ-Gmail ע"י scripts/newsletters_sync.py,
 * launchd יומי — 52 גיליונות עם תמונות-הירו מאוחסנות-מחדש). ה-JSON נשאר
 * fallback אם ה-DB ריק/נכשל. הגיליון האחרון מודגש בראש, הארכיון תחתיו.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DesignHeader from "@/components/layout-v2/DesignHeader";
import DesignFooter from "@/components/layout-v2/DesignFooter";
import { useSEO } from "@/hooks/useSEO";
import { hebrewDateLabel } from "@/lib/hebrewDate";
import { supabase } from "@/integrations/supabase/client";
import newsletters from "@/data/newsletters.json";

const GOLD_DARK = "#8B6F47";
const GOLD_LIGHT = "#C4A265";
const PARCHMENT = "#FAF6F0";
const TEXT_DARK = "#2D1F0E";
const TEXT_MUTED = "#6B5C4A";

interface NewsletterIssue {
  id: string;
  subject: string;
  date: string;
  body_text: string;
  links: { label: string; url: string }[];
  image_url?: string | null;
}

const FALLBACK_ISSUES = newsletters as NewsletterIssue[];

function useNewsletterIssues(): NewsletterIssue[] {
  const { data } = useQuery({
    queryKey: ["newsletters"],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("newsletters")
        .select("id, subject, date, body_text, links, image_url")
        .order("date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as NewsletterIssue[];
    },
  });
  return data && data.length > 0 ? data : FALLBACK_ISSUES;
}

function IssueBody({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: "Ploni, sans-serif", fontSize: "1.02rem", lineHeight: 1.85, color: TEXT_DARK }}>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} style={{ margin: "0 0 1em" }}>{para}</p>
      ))}
    </div>
  );
}

function IssueLinks({ links }: { links: NewsletterIssue["links"] }) {
  if (!links?.length) return null;
  return (
    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
      {links.map((l) => (
        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
          style={{ padding: "0.45rem 1.1rem", borderRadius: 999, fontSize: "0.88rem",
                   fontFamily: "Ploni, sans-serif", fontWeight: 600, textDecoration: "none",
                   color: GOLD_DARK, border: `1px solid ${GOLD_LIGHT}66`, background: "#fff" }}>
          {l.label}
        </a>
      ))}
    </div>
  );
}

function ArchiveItem({ issue }: { issue: NewsletterIssue }) {
  const [open, setOpen] = useState(false);
  return (
    <article style={{ background: "#fff", borderRadius: 18, border: `1px solid ${GOLD_LIGHT}33`,
                      boxShadow: "0 2px 14px rgba(139,111,71,0.06)", overflow: "hidden" }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ display: "flex", width: "100%", alignItems: "baseline", justifyContent: "space-between",
                 gap: "1rem", padding: "1.1rem 1.4rem", background: "none", border: "none",
                 cursor: "pointer", textAlign: "right" }}>
        <span style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
                       fontSize: "1.12rem", color: TEXT_DARK, lineHeight: 1.4 }}>
          {issue.subject}
        </span>
        <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.82rem", color: TEXT_MUTED,
                       whiteSpace: "nowrap" }}>
          {hebrewDateLabel(issue.date)}
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 1.4rem 1.3rem" }}>
          {issue.image_url && (
            <img src={issue.image_url} alt="" loading="lazy"
              style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 12,
                       marginBottom: "1rem", border: `1px solid ${GOLD_LIGHT}33` }} />
          )}
          <IssueBody text={issue.body_text} />
          <IssueLinks links={issue.links} />
        </div>
      )}
    </article>
  );
}

export default function NewsletterPage() {
  useSEO({
    title: "הניוזלטר של בני ציון — ארכיון",
    description: "ארכיון מכתבי התוכן של הרב יואב אוריאל — עומק תנ״כי ישירות למייל, גיליון אחר גיליון.",
  });

  const issues = useNewsletterIssues();
  const [latest, ...rest] = issues;

  return (
    <div dir="rtl" style={{ background: PARCHMENT, minHeight: "100vh" }}>
      <DesignHeader />

      {/* Hero — parchment, light, dark readable text */}
      <section style={{ position: "relative", overflow: "hidden", padding: "4.5rem 1.5rem 3rem",
                        textAlign: "center",
                        backgroundImage: `linear-gradient(180deg, rgba(251,246,236,0.55) 0%, rgba(237,229,208,0.8) 100%), url('/family-bible/card-newsletter.jpg')`,
                        backgroundSize: "cover", backgroundPosition: "center 35%" }}>
        <p style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.8rem", letterSpacing: "0.18em",
                    color: GOLD_DARK, fontWeight: 700, marginBottom: "0.7rem" }}>
          ישירות מהמייל של הרב יואב
        </p>
        <h1 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700, margin: 0,
                     fontSize: "clamp(1.9rem, 4.2vw, 2.9rem)", color: "#4A3823",
                     textShadow: "0 1px 12px rgba(255,252,245,0.6)" }}>
          הניוזלטר של בני ציון
        </h1>
        <p style={{ fontFamily: "Ploni, sans-serif", fontSize: "1.05rem", lineHeight: 1.7,
                    color: "rgba(74,56,35,0.85)", maxWidth: 560, margin: "0.9rem auto 0" }}>
          מכתבי עומק תנ״כיים מאת הרב יואב אוריאל — כל הגיליונות, במקום אחד.
        </p>
      </section>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "2.25rem 1.25rem 4rem" }}>
        {/* Latest issue — featured */}
        {latest && (
          <article style={{ background: "#fff", borderRadius: 22, border: `1.5px solid ${GOLD_LIGHT}55`,
                            boxShadow: "0 8px 32px rgba(139,111,71,0.10)", padding: "1.8rem 1.6rem",
                            marginBottom: "2.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.9rem" }}>
              <span style={{ padding: "0.25rem 0.9rem", borderRadius: 999, fontSize: "0.78rem",
                             fontFamily: "Ploni, sans-serif", fontWeight: 700, color: "#fff",
                             background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})` }}>
                הגיליון האחרון
              </span>
              <span style={{ fontFamily: "Ploni, sans-serif", fontSize: "0.85rem", color: TEXT_MUTED }}>
                {hebrewDateLabel(latest.date)}
              </span>
            </div>
            <h2 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
                         fontSize: "1.55rem", color: TEXT_DARK, margin: "0 0 1rem", lineHeight: 1.35 }}>
              {latest.subject}
            </h2>
            {latest.image_url && (
              <img src={latest.image_url} alt="" loading="lazy"
                style={{ width: "100%", maxHeight: 380, objectFit: "cover", borderRadius: 14,
                         marginBottom: "1.1rem", border: `1px solid ${GOLD_LIGHT}44` }} />
            )}
            <IssueBody text={latest.body_text} />
            <IssueLinks links={latest.links} />
          </article>
        )}

        {/* Archive */}
        {rest.length > 0 && (
          <>
            <h3 style={{ fontFamily: "Kedem, Frank Ruhl Libre, serif", fontWeight: 700,
                         fontSize: "1.2rem", color: GOLD_DARK, margin: "0 0 1rem" }}>
              גיליונות קודמים
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              {rest.map((issue) => <ArchiveItem key={issue.id} issue={issue} />)}
            </div>
          </>
        )}
      </main>

      <DesignFooter />
    </div>
  );
}
