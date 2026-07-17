/**
 * SourcesCollectionPage — תצוגת "כרטיסיות מקור נפתחות" (רמה 20, הרב יואב 17.7).
 *
 * שני הפרויקטים "למה ללמוד תנ״ך? — מקורות" ו"הדרכות חכמים איך ללמוד תנ״ך"
 * הם אוסף של מקורות קצרים (ציטוט אחד לכרטיס: כותרת + מקור + לשון-המקור),
 * לא סדרת-שיעורים. באתר הישן הם הוצגו ככרטיסיות נפתחות מקובצות לפי אסכולה
 * (מדברי חז״ל / הראשונים / האחרונים / החסידות). כאן משחזרים בדיוק את החוויה
 * הזו — בשפה הבהירה של "תנ״ך למשפחה", לא בתבנית סדרה רגילה.
 *
 * מבנה DB: סדרת-אב → תתי-סדרות (אסכולות) → "שיעורים" שכל אחד = כרטיס מקור
 * (lesson.content = HTML עם <h3> מקור + <p> ציטוט; בלי מדיה).
 */
import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ScrollText, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DesignHeader from "@/components/layout-v2/DesignHeader";
import DesignFooter from "@/components/layout-v2/DesignFooter";
import { useSEO } from "@/hooks/useSEO";
import { sanitizeHtml } from "@/lib/sanitize";

const PARCHMENT = "#FAF6F0";
const PARCHMENT_DARK = "#F5F0E8";
const TEXT_DARK = "#2D1F0E";
const TEXT_MUTED = "#6B5C4A";
const GOLD_DARK = "#8B6F47";
const GOLD_LIGHT = "#C4A265";

// רק שני האוספים האלה משתמשים בתצוגה הזו (אבטחה: לא כל סדרה נפתחת כאן).
const COLLECTIONS: Record<string, { eyebrow: string }> = {
  "68582fdf-9d89-4327-9d50-a87147604103": { eyebrow: "אוסף מקורות" },
  "a8e770fd-6967-4628-893c-342f7a817feb": { eyebrow: "הדרכות ללימוד" },
};

interface SourceCard {
  id: string;
  title: string;
  content: string | null;
}
interface Category {
  id: string;
  title: string;
  cards: SourceCard[];
}

function useCollection(seriesId: string) {
  return useQuery({
    queryKey: ["sources-collection", seriesId],
    queryFn: async () => {
      const { data: parent } = await supabase
        .from("series")
        .select("id, title, description")
        .eq("id", seriesId)
        .single();

      const { data: children } = await supabase
        .from("series")
        .select("id, title, sort_order, status")
        .eq("parent_id", seriesId)
        .order("sort_order", { ascending: true, nullsFirst: false });

      // "כל ה..." (draft) = תת-סדרת-אב שאין להציג ככרטיסייה
      const cats = (children || []).filter(
        (c) => c.status !== "draft" && !/^כל /.test(c.title || "")
      );

      const categories: Category[] = [];
      for (const cat of cats) {
        const { data: lessons } = await supabase
          .from("lessons")
          .select("id, title, content, sort_order")
          .eq("series_id", cat.id)
          .eq("status", "published")
          .order("sort_order", { ascending: true, nullsFirst: false });
        const cards = (lessons || []).filter((l) => (l.content || "").trim());
        if (cards.length) categories.push({ id: cat.id, title: cat.title, cards });
      }
      return { parent, categories };
    },
    staleTime: 1000 * 60 * 10,
  });
}

function SourceCardItem({ card }: { card: SourceCard }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: "white",
        border: `1px solid ${open ? "rgba(196,162,101,0.55)" : "rgba(139,111,71,0.14)"}`,
        borderRadius: "1rem",
        overflow: "hidden",
        boxShadow: open ? "0 6px 24px rgba(45,31,14,0.09)" : "0 2px 10px rgba(45,31,14,0.05)",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="source-card-toggle"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          padding: "1.05rem 1.25rem",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "right",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
          <ScrollText size={17} style={{ color: GOLD_LIGHT, flexShrink: 0 }} />
          <span
            className="source-card-title"
            style={{
              fontFamily: "Kedem, Frank Ruhl Libre, serif",
              fontWeight: 700,
              fontSize: "1.02rem",
              color: TEXT_DARK,
              lineHeight: 1.4,
            }}
          >
            {card.title}
          </span>
        </span>
        <ChevronDown
          size={18}
          style={{
            color: GOLD_DARK,
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.25s",
          }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="source-card-body"
              style={{
                padding: "0 1.35rem 1.3rem",
                borderTop: "1px solid rgba(139,111,71,0.1)",
                marginTop: "-0.1rem",
                paddingTop: "1rem",
                fontFamily: "Ploni, sans-serif",
                fontSize: "1rem",
                lineHeight: 1.9,
                color: TEXT_MUTED,
              }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(card.content || "") }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SourcesCollectionPage() {
  const { seriesId = "" } = useParams();
  const meta = COLLECTIONS[seriesId];
  const { data, isLoading } = useCollection(seriesId);
  useSEO({
    title: data?.parent ? `${data.parent.title} — בני ציון` : "מקורות — בני ציון",
    description: data?.parent?.description || "אוסף מקורות מדברי חכמינו",
  });

  // רק שני האוספים המיועדים; כל סדרה אחרת נשארת בתצוגת-הסדרה הרגילה.
  if (!meta) return <Navigate to={`/series/${seriesId}`} replace />;

  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: PARCHMENT }}>
      <DesignHeader transparentOnTop={false} />

      {/* Hero — light parchment, matching תנ״ך למשפחה */}
      <section
        style={{
          background: `linear-gradient(180deg, ${PARCHMENT_DARK} 0%, ${PARCHMENT} 100%)`,
          borderBottom: "1px solid rgba(139,111,71,0.12)",
          padding: "3.5rem 1.5rem 2.75rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "Ploni, sans-serif",
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: GOLD_DARK,
              textTransform: "uppercase",
              marginBottom: "0.9rem",
            }}
          >
            <BookOpen size={15} />
            {meta.eyebrow}
          </div>
          <h1
            style={{
              fontFamily: "Kedem, Frank Ruhl Libre, serif",
              fontWeight: 900,
              fontSize: "clamp(1.9rem, 4vw, 2.9rem)",
              color: TEXT_DARK,
              margin: "0 0 0.75rem",
              lineHeight: 1.2,
            }}
          >
            {data?.parent?.title || "מקורות"}
          </h1>
          {data?.parent?.description && (
            <p
              style={{
                fontFamily: "Ploni, sans-serif",
                fontSize: "1.02rem",
                lineHeight: 1.75,
                color: TEXT_MUTED,
                margin: 0,
              }}
            >
              {data.parent.description}
            </p>
          )}
        </div>
      </section>

      <main style={{ flex: 1, padding: "3rem 1.5rem 4.5rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {isLoading && (
            <p style={{ textAlign: "center", color: TEXT_MUTED, fontFamily: "Ploni, sans-serif" }}>טוען מקורות…</p>
          )}
          {data?.categories.map((cat, ci) => (
            <section key={cat.id} style={{ marginBottom: ci < data.categories.length - 1 ? "3.25rem" : 0 }}>
              {/* Category heading — flexWrap: כותרת ארוכה בנייד שוברת שורה ולא גולשת */}
              <div
                className="sources-cat-head"
                style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.4rem", flexWrap: "wrap" }}
              >
                <h2
                  style={{
                    fontFamily: "Kedem, Frank Ruhl Libre, serif",
                    fontWeight: 900,
                    fontSize: "clamp(1.35rem, 2.6vw, 1.8rem)",
                    color: TEXT_DARK,
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {cat.title}
                </h2>
                <span style={{ flex: 1, height: 1, background: "rgba(139,111,71,0.22)" }} />
                <span
                  style={{
                    fontFamily: "Ploni, sans-serif",
                    fontSize: "0.8rem",
                    color: GOLD_DARK,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.cards.length} מקורות
                </span>
              </div>
              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {cat.cards.map((card, i) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.2) }}
                  >
                    <SourceCardItem card={card} />
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
          {!isLoading && data?.categories.length === 0 && (
            <p style={{ textAlign: "center", color: TEXT_MUTED, fontFamily: "Ploni, sans-serif" }}>
              אין מקורות להצגה כרגע.
            </p>
          )}
        </div>
      </main>

      <DesignFooter />
      {/* המקור מודגש (ה-<h3> של הציטוט) בגוף הכרטיס + התאמות נייד */}
      <style>{`
        .source-card-body h3 { font-family: Kedem, "Frank Ruhl Libre", serif; font-weight: 700;
          font-size: 0.95rem; color: ${GOLD_DARK}; margin: 0 0 0.5rem; }
        .source-card-body p { margin: 0 0 0.75rem; }
        .source-card-body p:last-child { margin-bottom: 0; }
        @media (max-width: 640px) {
          .source-card-toggle { padding: 0.85rem 0.95rem !important; }
          .source-card-title { font-size: 0.95rem !important; }
          .source-card-body { padding: 0 1rem 1.1rem !important; font-size: 0.94rem !important; }
          .sources-cat-head { gap: 0.55rem !important; margin-bottom: 1.1rem !important; }
        }
      `}</style>
    </div>
  );
}
