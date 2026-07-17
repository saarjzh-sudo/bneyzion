/**
 * BibleIndexPage — /bible
 *
 * Top-level bible navigation index. Entry point for "ניווט לפי ספר ופרק"
 * in the sidebar quick-links (§12 + tree CA1).
 *
 * Lists all 24 books of the Tanakh grouped into Torah / Nevi'im / Ketuvim.
 * Each book links to /bible/:book (BibleBookPage).
 *
 * Layout: DesignLayout (v2 with sidebar). Cream+gold, RTL.
 */

import { Link } from "react-router-dom";
import { BookOpen, ChevronLeft } from "lucide-react";
import DesignLayout from "@/components/layout-v2/DesignLayout";
import { useSEO } from "@/hooks/useSEO";
import { colors, fonts, radii, shadows } from "@/lib/designTokens";

// Canonical 24 books in biblical order
const TANAKH: { section: string; books: string[] }[] = [
  {
    section: "תורה",
    books: ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"],
  },
  {
    section: "נביאים",
    books: [
      "יהושע", "שופטים", "שמואל א", "שמואל ב",
      "מלכים א", "מלכים ב", "ישעיהו", "ירמיהו",
      "יחזקאל", "הושע", "יואל", "עמוס", "עובדיה",
      "יונה", "מיכה", "נחום", "חבקוק", "צפניה",
      "חגי", "זכריה", "מלאכי",
    ],
  },
  {
    section: "כתובים",
    books: [
      "תהילים", "משלי", "איוב", "שיר השירים", "רות",
      "איכה", "קהלת", "אסתר", "דניאל",
      "עזרא", "נחמיה", "דברי הימים א", "דברי הימים ב",
    ],
  },
];

export default function BibleIndexPage() {
  useSEO({
    title: "ניווט לפי ספר ופרק — תנ״ך",
    description: "ניווט בתוכן האתר לפי ספרי התנ״ך — תורה, נביאים, כתובים",
    url: "https://bneyzion.co.il/bible",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "ניווט לפי ספר ופרק — תנ״ך",
      description: "ניווט בתוכן האתר לפי ספרי התנ״ך",
      isPartOf: { "@type": "WebSite", name: "בני ציון", url: "https://bneyzion.co.il" },
    },
  });

  return (
    <DesignLayout>
      {/* ── Hero ── */}
      <div
        dir="rtl"
        style={{
          background: `linear-gradient(160deg, #FBF6EC 0%, #F5EFE0 60%, #EDE5D0 100%)`,
          borderBottom: `1px solid rgba(139,111,71,0.15)`,
          padding: "2.5rem 1.5rem 2rem",
        }}
      >
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <Link
            to="/"
            style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.goldDark, textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            בית
          </Link>
          <ChevronLeft size={12} style={{ color: colors.textSubtle }} />
          <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textSubtle }}>
            ניווט לפי ספר ופרק
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div
            style={{
              width: 44, height: 44,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${colors.goldDark}, ${colors.goldLight})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: shadows.card,
            }}
          >
            <BookOpen size={22} style={{ color: "#fff" }} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: fonts.display,
                fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
                fontWeight: 700,
                color: colors.textDark,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              ניווט לפי ספר ופרק
            </h1>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: "0.9rem",
                color: colors.textMid,
                margin: "0.25rem 0 0",
              }}
            >
              בחר ספר לצפייה בכל הסדרות והשיעורים שלו
            </p>
          </div>
        </div>
      </div>

      {/* ── רשימת הספרים המלאה ──
          רמה 21 (סער 17.7): "נהר התנ״ך" (BibleRiver, האב-טיפוס של הרב יואב מרמה 18)
          הוסר + כותרת-הביניים "כל הספרים" הוסרה — הרשימה המלאה היא הניווט. */}
      <div dir="rtl" style={{ padding: "2rem 1.5rem", maxWidth: 900, margin: "0 auto" }}>
        {TANAKH.map(({ section, books }) => (
          <section key={section} style={{ marginBottom: "2.5rem" }}>
            {/* Section header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
                paddingBottom: "0.5rem",
                borderBottom: `2px solid rgba(139,111,71,0.2)`,
              }}
            >
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: colors.goldDark,
                  margin: 0,
                }}
              >
                {section}
              </h2>
            </div>

            {/* Book cards grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {books.map((book) => (
                <Link
                  key={book}
                  to={`/bible/${encodeURIComponent(book)}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    background: "#fff",
                    border: `1px solid rgba(139,111,71,0.15)`,
                    borderRadius: radii.md,
                    boxShadow: shadows.card,
                    textDecoration: "none",
                    transition: "box-shadow 0.15s, border-color 0.15s, transform 0.1s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = shadows.cardHover;
                    e.currentTarget.style.borderColor = colors.goldDark;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = shadows.card;
                    e.currentTarget.style.borderColor = "rgba(139,111,71,0.15)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: colors.textDark,
                    }}
                  >
                    {book}
                  </span>
                  <ChevronLeft
                    size={14}
                    style={{ color: colors.goldDark, flexShrink: 0, marginInlineStart: "0.25rem" }}
                  />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DesignLayout>
  );
}
