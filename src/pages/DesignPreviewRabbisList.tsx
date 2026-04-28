/**
 * /design-rabbis-list — Directory of all rabbis, redesigned.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, BookOpen } from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { usePublicRabbis } from "@/hooks/useRabbis";

export default function DesignPreviewRabbisList() {
  const { data: rabbis = [], isLoading } = usePublicRabbis();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = [...(rabbis as any[])].filter((r) => r.name);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => (r.name || "").toLowerCase().includes(q));
    }
    return list.sort((a, b) => (b.lesson_count || 0) - (a.lesson_count || 0));
  }, [rabbis, search]);

  const top = filtered.slice(0, 6);
  const rest = filtered.slice(6);

  return (
    <DesignLayout>
      <DesignPageHero
        variant="parchment"
        eyebrow="הצוות הרוחני"
        title="הרבנים והמרצים"
        subtitle={`${(rabbis as any[]).length}+ רבנים, מרצים ומחנכים מהזרם המרכזי בעולם הדתי-לאומי, מלמדים תנ״ך באתר.`}
      >
        <div style={{ position: "relative", maxWidth: 480, margin: "1rem auto 0" }}>
          <Search style={{ position: "absolute", top: "50%", right: 16, transform: "translateY(-50%)", width: 18, height: 18, color: colors.textSubtle }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חפש רב..."
            style={{
              width: "100%",
              padding: "0.85rem 3rem 0.85rem 1.25rem",
              borderRadius: radii.lg,
              border: `1.5px solid ${colors.parchmentDeep}`,
              background: "white",
              fontFamily: fonts.body,
              fontSize: "0.95rem",
              color: colors.textDark,
              outline: "none",
              direction: "rtl",
              boxShadow: shadows.cardSoft,
            }}
          />
        </div>
      </DesignPageHero>

      {/* Top 6 large cards */}
      <section style={{ background: colors.parchment, padding: "3rem 1.5rem 2rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "1.75rem" }}>
            <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              הפעילים ביותר באתר
            </div>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)", color: colors.textDark, margin: 0 }}>
              הרבנים המובילים
            </h2>
          </div>

          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
              <Loader2 style={{ width: 28, height: 28, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {top.map((r) => (
                <RabbiBigCard key={r.id} rabbi={r} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Rest as compact list */}
      {rest.length > 0 && (
        <section style={{ background: colors.parchmentDark, padding: "3rem 1.5rem 6rem" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div dir="rtl" style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.2rem, 2.4vw, 1.6rem)", color: colors.textDark, margin: 0 }}>
                כל הרבנים ({(rabbis as any[]).length})
              </h2>
            </div>
            <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.85rem" }}>
              {rest.map((r) => (
                <RabbiCompactCard key={r.id} rabbi={r} />
              ))}
            </div>
          </div>
        </section>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DesignLayout>
  );
}

function RabbiBigCard({ rabbi }: { rabbi: any }) {
  const initial = (rabbi.name || "").replace(/^הרב /, "")[0] || "ר";
  return (
    <Link to={`/design-rabbi/${rabbi.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: "white",
          borderRadius: radii.xl,
          padding: "1.5rem",
          border: `1px solid rgba(139,111,71,0.1)`,
          boxShadow: shadows.cardSoft,
          cursor: "pointer",
          transition: "all 0.28s",
          textAlign: "center",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = shadows.cardHover;
          e.currentTarget.style.borderColor = colors.goldDark;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = shadows.cardSoft;
          e.currentTarget.style.borderColor = "rgba(139,111,71,0.1)";
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            margin: "0 auto 1rem",
            borderRadius: "50%",
            background: rabbi.image_url ? "transparent" : gradients.goldButton,
            backgroundImage: rabbi.image_url ? `url(${rabbi.image_url})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: `3px solid white`,
            boxShadow: shadows.goldGlowSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: "2rem",
            color: "white",
          }}
        >
          {!rabbi.image_url && initial}
        </div>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.05rem", color: colors.textDark, marginBottom: "0.3rem" }}>
          {rabbi.name}
        </div>
        {rabbi.title && (
          <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted, marginBottom: "0.65rem", minHeight: "1.1em" }}>
            {rabbi.title}
          </div>
        )}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontFamily: fonts.body, fontSize: "0.78rem", color: colors.goldDark, fontWeight: 600 }}>
          <BookOpen size={12} />
          {rabbi.lesson_count || 0} שיעורים
        </div>
      </div>
    </Link>
  );
}

function RabbiCompactCard({ rabbi }: { rabbi: any }) {
  const initial = (rabbi.name || "").replace(/^הרב /, "")[0] || "ר";
  return (
    <Link to={`/design-rabbi/${rabbi.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: "white",
          borderRadius: radii.lg,
          padding: "0.85rem",
          border: `1px solid rgba(139,111,71,0.08)`,
          cursor: "pointer",
          transition: "all 0.2s",
          display: "flex",
          alignItems: "center",
          gap: "0.7rem",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = shadows.cardSoft)}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
      >
        <div
          style={{
            flexShrink: 0,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: rabbi.image_url ? "transparent" : gradients.goldButton,
            backgroundImage: rabbi.image_url ? `url(${rabbi.image_url})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: "0.95rem",
            color: "white",
          }}
        >
          {!rabbi.image_url && initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.85rem", color: colors.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {rabbi.name}
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.goldDark }}>
            {rabbi.lesson_count || 0} שיעורים
          </div>
        </div>
      </div>
    </Link>
  );
}
