/**
 * /design-bible-book/:book — Single Bible book browser, redesigned.
 */
import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, BookOpen, ChevronLeft, Play } from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useBibleBook } from "@/hooks/useBible";

const BIBLE_PARTS: { part: string; books: string[] }[] = [
  { part: "תורה", books: ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"] },
  { part: "נביאים", books: ["יהושע", "שופטים", "שמואל", "מלכים", "ישעיהו", "ירמיהו", "יחזקאל", "תרי-עשר"] },
  { part: "כתובים", books: ["תהילים", "משלי", "איוב", "שיר השירים", "רות", "איכה", "קהלת", "אסתר", "דניאל", "עזרא", "נחמיה", "דברי הימים"] },
];

export default function DesignPreviewBibleBook() {
  const { book } = useParams<{ book?: string }>();
  const effectiveBook = book ? decodeURIComponent(book) : "בראשית";
  const { data: lessons = [], isLoading } = useBibleBook(effectiveBook);

  // Group lessons by chapter
  const byChapter = useMemo(() => {
    const m = new Map<number, any[]>();
    for (const l of lessons as any[]) {
      const ch = l.bible_chapter || 0;
      if (!m.has(ch)) m.set(ch, []);
      m.get(ch)!.push(l);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a - b);
  }, [lessons]);

  const totalChapters = byChapter.length;

  return (
    <DesignLayout>
      <DesignPageHero
        variant="mahogany"
        eyebrow="ספרי התנ״ך"
        title={`ספר ${effectiveBook}`}
        subtitle={
          totalChapters
            ? `${(lessons as any[]).length} שיעורים על ${totalChapters} פרקים מתוך ספר ${effectiveBook}`
            : `שיעורים על ספר ${effectiveBook}`
        }
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
          {BIBLE_PARTS.map((bp) => (
            <details key={bp.part} style={{ position: "relative" }}>
              <summary
                style={{
                  cursor: "pointer",
                  listStyle: "none",
                  padding: "0.55rem 1rem",
                  borderRadius: radii.pill,
                  border: "1.5px solid rgba(255,255,255,0.35)",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  fontFamily: fonts.body,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  display: "inline-block",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                {bp.part} ({bp.books.length})
              </summary>
              <div style={{ position: "absolute", top: "calc(100% + 8px)", insetInlineEnd: 0, background: "white", borderRadius: radii.md, padding: "0.5rem", boxShadow: shadows.cardHover, minWidth: 180, zIndex: 10 }}>
                {bp.books.map((b) => (
                  <Link
                    key={b}
                    to={`/design-bible-book/${encodeURIComponent(b)}`}
                    style={{
                      display: "block",
                      padding: "0.45rem 0.75rem",
                      borderRadius: radii.sm,
                      fontFamily: fonts.body,
                      fontSize: "0.85rem",
                      color: b === effectiveBook ? colors.goldDark : colors.textMid,
                      fontWeight: b === effectiveBook ? 700 : 500,
                      textDecoration: "none",
                      background: b === effectiveBook ? "rgba(196,162,101,0.1)" : "transparent",
                    }}
                  >
                    {b}
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </div>
      </DesignPageHero>

      {/* Chapters grid */}
      <section style={{ background: colors.parchment, padding: "4rem 1.5rem 6rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "2rem" }}>
            <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              פרקי הספר
            </div>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.5rem, 3vw, 2.1rem)", color: colors.textDark, margin: 0 }}>
              {totalChapters} פרקים עם תוכן
            </h2>
          </div>

          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
              <Loader2 style={{ width: 28, height: 28, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
              {byChapter.map(([chapter, lessonsInChapter]) => (
                <div
                  key={chapter}
                  style={{
                    background: "white",
                    borderRadius: radii.lg,
                    padding: "1rem 1.1rem",
                    border: `1px solid rgba(139,111,71,0.1)`,
                    boxShadow: shadows.cardSoft,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.85rem",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = shadows.cardHover; e.currentTarget.style.borderColor = colors.goldDark; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = shadows.cardSoft; e.currentTarget.style.borderColor = "rgba(139,111,71,0.1)"; }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: gradients.goldButton, color: "white", fontFamily: fonts.display, fontWeight: 900, fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: shadows.goldGlowSoft }}>
                    {chapter}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.95rem", color: colors.textDark }}>
                      פרק {chapter}
                    </div>
                    <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted }}>
                      {lessonsInChapter.length} שיעורים
                    </div>
                  </div>
                  <ChevronLeft size={16} style={{ color: colors.goldDark, flexShrink: 0 }} />
                </div>
              ))}

              {byChapter.length === 0 && !isLoading && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", fontFamily: fonts.body, color: colors.textMuted }}>
                  <BookOpen style={{ width: 40, height: 40, margin: "0 auto 1rem", opacity: 0.4 }} />
                  עדיין אין שיעורים על ספר {effectiveBook}.
                </div>
              )}
            </div>
          )}

          {/* Show first chapter's lessons inline */}
          {byChapter[0] && (
            <div style={{ marginTop: "3.5rem" }}>
              <div dir="rtl" style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.3rem", color: colors.textDark, margin: 0 }}>
                  {effectiveBook} — פרק {byChapter[0][0]}
                </h3>
              </div>
              <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {byChapter[0][1].slice(0, 5).map((l: any) => (
                  <div key={l.id} style={{ background: "white", borderRadius: radii.md, padding: "0.85rem 1rem", border: `1px solid rgba(139,111,71,0.08)`, display: "flex", alignItems: "center", gap: "0.85rem", cursor: "pointer" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: gradients.goldButton, color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Play size={14} fill="currentColor" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.92rem", color: colors.textDark, marginBottom: "0.15rem" }}>
                        {l.title}
                      </div>
                      <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted }}>
                        {l.rabbis?.name || ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DesignLayout>
  );
}
