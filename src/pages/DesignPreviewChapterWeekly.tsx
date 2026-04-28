/**
 * /design-chapter-weekly — "התכנית השבועית" / Chapter Weekly program, redesigned.
 *
 * The flagship pedagogical program: a chapter from Tanach each week.
 * Pulls real lessons from Supabase that have bible_book + bible_chapter set,
 * groups by book, and presents the program structure visually.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  Users,
  CheckCircle2,
  Play,
  Sparkles,
  Loader2,
  ChevronRight,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import { colors, fonts, gradients, radii, shadows, lessonTypeLabel, formatDuration } from "@/lib/designTokens";
import { supabase } from "@/integrations/supabase/client";

// Hook to fetch lessons that have bible_book set, grouped by book
function useChapterLessons() {
  return useQuery({
    queryKey: ["chapter-weekly-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id,title,bible_book,bible_chapter,duration,source_type,rabbis(name),series_id")
        .not("bible_book", "is", null)
        .eq("status", "published")
        .order("bible_book")
        .order("bible_chapter")
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

// Display order for Bible books (rough Tanach order)
const BIBLE_ORDER = [
  "בראשית", "שמות", "ויקרא", "במדבר", "דברים",
  "יהושע", "שופטים", "שמואל", "מלכים",
  "ישעיהו", "ירמיהו", "יחזקאל",
  "הושע", "יואל", "עמוס", "עובדיה", "יונה", "מיכה", "נחום", "חבקוק", "צפניה", "חגי", "זכריה", "מלאכי",
  "תהילים", "משלי", "איוב",
  "שיר השירים", "רות", "איכה", "קהלת", "אסתר",
  "דניאל", "עזרא", "נחמיה", "דברי הימים",
];

export default function DesignPreviewChapterWeekly() {
  const { data: lessons = [], isLoading } = useChapterLessons();

  // Group lessons by bible_book
  const groups = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const l of lessons as any[]) {
      const book = l.bible_book || "אחר";
      if (!m.has(book)) m.set(book, []);
      m.get(book)!.push(l);
    }
    // Sort entries by Bible order
    const ordered = Array.from(m.entries()).sort(([a], [b]) => {
      const ai = BIBLE_ORDER.indexOf(a);
      const bi = BIBLE_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return ordered;
  }, [lessons]);

  const totalChapters = useMemo(
    () => new Set((lessons as any[]).map((l) => `${l.bible_book}-${l.bible_chapter}`)).size,
    [lessons]
  );

  return (
    <DesignLayout>
      <DesignPageHero
        variant="olive"
        eyebrow="תכנית בני ציון לתנ״ך"
        title="התכנית השבועית"
        subtitle="פרק תנ״ך אחד בשבוע — לימוד שיטתי, עומק וקהילה. כל פרק מקבל ליווי מלא: שיעור, מאמר, חידה, ודיון בקבוצות הלמידה."
      >
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
          <button
            style={{
              padding: "0.85rem 2rem",
              borderRadius: radii.lg,
              border: "none",
              background: gradients.goldButton,
              color: "white",
              fontFamily: fonts.accent,
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
              boxShadow: shadows.goldGlow,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Play style={{ width: 16, height: 16 }} fill="currentColor" />
            הצטרף לתכנית
          </button>
          <button
            style={{
              padding: "0.85rem 1.6rem",
              borderRadius: radii.lg,
              border: "1.5px solid rgba(255,255,255,0.35)",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              color: "white",
              fontFamily: fonts.accent,
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            איך זה עובד?
          </button>
        </div>
      </DesignPageHero>

      {/* Stats strip */}
      <section style={{ background: colors.parchment, padding: "3rem 1.5rem 2rem" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
          dir="rtl"
        >
          <Stat icon={<BookOpen size={24} />} value={(lessons as any[]).length.toLocaleString("he-IL")} label="שיעורי פרק" />
          <Stat icon={<Calendar size={24} />} value={totalChapters.toLocaleString("he-IL")} label="פרקים מכוסים" />
          <Stat icon={<Users size={24} />} value="9,300+" label="לומדים פעילים" />
          <Stat icon={<CheckCircle2 size={24} />} value="6 שנים" label="תכנית מקיפה" />
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: colors.parchmentDark, padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }} dir="rtl">
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.oliveMain,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.4rem",
              }}
            >
              איך זה עובד
            </div>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                color: colors.textDark,
                margin: 0,
              }}
            >
              4 שלבים בכל שבוע
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.25rem",
            }}
          >
            <Step number={1} title="שיעור הפרק" description='וידאו של 30-50 דקות — הרב סוקר את הפרק הראשי בשיטת בית מדרש בני ציון.' />
            <Step number={2} title="מאמר העומק" description='קריאה של 10 דקות — מאמר עם מקורות, פרשנים ושאלות לחידוד.' />
            <Step number={3} title="חידת הפרק" description='שאלה אחת חכמה לכל פרק — מאתגרת, משחקית, מזמינה לדיון.' />
            <Step number={4} title="קבוצת הלמידה" description='קבוצת WhatsApp פעילה לכל לומד — דיונים, שאלות, חברותא וירטואלית.' />
          </div>
        </div>
      </section>

      {/* Books index */}
      <section style={{ background: colors.parchment, padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "2rem" }}>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.goldDark,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.3rem",
              }}
            >
              ספרי התנ״ך בתכנית
            </div>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)",
                color: colors.textDark,
                margin: 0,
              }}
            >
              {groups.length} ספרי תנ״ך עם תוכן זמין
            </h2>
          </div>

          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
              <Loader2 style={{ width: 28, height: 28, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <div
              dir="rtl"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                gap: "1rem",
              }}
            >
              {groups.map(([book, bookLessons]) => {
                const chapters = new Set(bookLessons.map((l: any) => l.bible_chapter)).size;
                return (
                  <Link
                    key={book}
                    to={`/bible/${encodeURIComponent(book)}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div
                      style={{
                        background: "white",
                        borderRadius: radii.lg,
                        padding: "1rem 1.2rem",
                        border: `1px solid rgba(139,111,71,0.1)`,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        borderRight: `4px solid ${colors.goldDark}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateX(-3px)";
                        e.currentTarget.style.boxShadow = "0 6px 18px rgba(45,31,14,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateX(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: fonts.display,
                            fontWeight: 900,
                            fontSize: "1.1rem",
                            color: colors.textDark,
                            marginBottom: "0.2rem",
                          }}
                        >
                          {book}
                        </div>
                        <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted }}>
                          {bookLessons.length} שיעורים · {chapters} פרקים
                        </div>
                      </div>
                      <ChevronRight style={{ width: 18, height: 18, color: colors.goldDark, transform: "rotate(180deg)" }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Sample upcoming weeks */}
      <section style={{ background: colors.parchmentDark, padding: "4rem 1.5rem 6rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "1.75rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Sparkles style={{ width: 20, height: 20, color: colors.goldDark }} />
            <div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: colors.goldDark,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                לדוגמה
              </div>
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: "clamp(1.3rem, 2.4vw, 1.7rem)",
                  color: colors.textDark,
                  margin: 0,
                }}
              >
                שיעורי פרק לדוגמה
              </h2>
            </div>
          </div>

          <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(lessons as any[]).slice(0, 8).map((l) => (
              <div
                key={l.id}
                style={{
                  background: "white",
                  borderRadius: radii.lg,
                  padding: "1rem 1.2rem",
                  border: `1px solid rgba(139,111,71,0.08)`,
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = shadows.cardHover)}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: gradients.goldButton,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontFamily: fonts.display,
                    fontWeight: 800,
                    fontSize: "0.9rem",
                  }}
                >
                  פרק {l.bible_chapter}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      color: colors.textDark,
                      marginBottom: "0.2rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {l.title}
                  </div>
                  <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted }}>
                    {l.bible_book} · {l.rabbis?.name || ""} · {lessonTypeLabel(l.source_type)}
                    {l.duration ? ` · ${formatDuration(l.duration)}` : ""}
                  </div>
                </div>
                <Play style={{ width: 18, height: 18, color: colors.goldDark, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DesignLayout>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: radii.lg,
        padding: "1.25rem 1.4rem",
        border: `1px solid rgba(139,111,71,0.1)`,
        textAlign: "center",
        boxShadow: shadows.cardSoft,
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", color: colors.goldDark, marginBottom: "0.4rem" }}>
        {icon}
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: "1.5rem",
          color: colors.textDark,
          marginBottom: "0.15rem",
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.74rem", color: colors.textMuted, letterSpacing: "0.05em" }}>
        {label}
      </div>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: radii.xl,
        padding: "1.5rem",
        border: `1px solid rgba(139,111,71,0.1)`,
        boxShadow: shadows.cardSoft,
        textAlign: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -16,
          insetInlineStart: "50%",
          transform: "translateX(50%)",
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: gradients.oliveButton,
          color: "white",
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: shadows.oliveGlow,
        }}
      >
        {number}
      </div>
      <h3
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: "1.05rem",
          color: colors.textDark,
          margin: "0.85rem 0 0.5rem",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: "0.85rem",
          lineHeight: 1.65,
          color: colors.textMuted,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}
