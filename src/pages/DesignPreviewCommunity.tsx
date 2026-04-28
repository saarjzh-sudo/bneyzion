/**
 * /design-community — Community + Courses hub, redesigned.
 */
import { Link } from "react-router-dom";
import { Loader2, Heart, Users, MessageCircle, Crown, Calendar, Award, Sparkles } from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useCommunityCoruses } from "@/hooks/useCommunity";

export default function DesignPreviewCommunity() {
  const { data: courses = [], isLoading } = useCommunityCoruses();

  return (
    <DesignLayout>
      <DesignPageHero
        variant="olive"
        eyebrow="קהילת הלומדים"
        title="לומדים תנ״ך — לא לבד"
        subtitle="קהילת בני ציון מאגדת אלפי לומדים, מורים ורבנים סביב לימוד תנ״ך מתמיד. הצטרפו לקבוצות לימוד, קורסי עומק ואירועים — כולם בהובלת הזרם הדתי-לאומי."
      >
        <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button style={{ padding: "0.85rem 2rem", borderRadius: radii.lg, border: "none", background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "1rem", cursor: "pointer", boxShadow: shadows.goldGlow, display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <Heart size={16} fill="currentColor" /> הצטרף לקהילה — חינם
          </button>
          <button style={{ padding: "0.85rem 1.6rem", borderRadius: radii.lg, border: "1.5px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", color: "white", fontFamily: fonts.accent, fontSize: "0.95rem", fontWeight: 700, cursor: "pointer" }}>
            ראה את הקהילה
          </button>
        </div>
      </DesignPageHero>

      {/* Community stats strip */}
      <section style={{ background: colors.parchment, padding: "3rem 1.5rem 1rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }} dir="rtl">
          <Stat icon={<Users size={22} />} value="9,300+" label="חברי קהילה" />
          <Stat icon={<MessageCircle size={22} />} value="28" label="קבוצות פעילות" />
          <Stat icon={<Calendar size={22} />} value="6 שנים" label="פעילות" />
          <Stat icon={<Award size={22} />} value="12,000+" label="שיעורים נצפו" />
        </div>
      </section>

      {/* Membership tiers */}
      <section style={{ background: colors.parchment, padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }} dir="rtl">
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <Sparkles style={{ width: 28, height: 28, color: colors.goldDark, margin: "0 auto 0.5rem" }} />
            <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              מסלולי חברות
            </div>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.5rem, 3vw, 2.1rem)", color: colors.textDark, margin: 0 }}>
              בחר את המסלול שמתאים לך
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
            <Tier title="חינם" subtitle="פתוח לכולם" price="0₪" period="" features={["גישה מלאה לכל השיעורים", "כל הסדרות", "פרשת השבוע", "קהילת WhatsApp"]} />
            <Tier title="חבר קהילה" subtitle="לתומכי האתר" price="36₪" period="לחודש" features={["כל הקודם", "תרומה לאתר", "תג חבר קהילה", "גישה מוקדמת לשיעורים"]} highlighted />
            <Tier title="מנוי שנתי" subtitle="הקופה הכי משתלמת" price="360₪" period="לשנה" features={["כל הקודם", "10% הנחה בחנות", "כל הקורסים הדיגיטליים", "ספר מתנה לבחירה"]} />
          </div>
        </div>
      </section>

      {/* Active courses */}
      <section style={{ background: colors.oliveBg, padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div dir="rtl" style={{ marginBottom: "1.75rem" }}>
            <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.oliveMain, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              {(courses as any[]).length} קורסים פעילים
            </div>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)", color: colors.textDark, margin: 0 }}>
              קורסים מקיפים בקהילה
            </h2>
          </div>

          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
              <Loader2 style={{ width: 24, height: 24, color: colors.oliveMain, animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
              {(courses as any[]).slice(0, 6).map((c) => (
                <Link key={c.id} to={`/design-series-page`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ background: "white", borderRadius: radii.xl, padding: "1.5rem", border: `1px solid rgba(91,110,58,0.12)`, boxShadow: shadows.cardSoft, cursor: "pointer", transition: "all 0.28s", borderRight: `4px solid ${colors.oliveMain}` }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = shadows.cardHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = shadows.cardSoft; }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.25rem 0.6rem", borderRadius: radii.sm, background: "rgba(91,110,58,0.12)", color: colors.oliveDark, fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.85rem" }}>
                      <Crown size={11} />
                      קורס קהילה
                    </div>
                    <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: colors.textDark, margin: "0 0 0.5rem", lineHeight: 1.35 }}>
                      {c.title || c.name}
                    </h3>
                    {(c.description || c.subtitle) && (
                      <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", lineHeight: 1.65, color: colors.textMuted, margin: "0 0 1rem", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {c.description || c.subtitle}
                      </p>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.85rem", borderTop: `1px solid rgba(139,111,71,0.08)` }}>
                      <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textMuted }}>
                        ראה פרטים
                      </span>
                      <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "0.95rem", color: colors.oliveDark }}>
                        {c.price_ils > 0 ? `${c.price_ils}₪` : c.price > 0 ? `${c.price}₪` : "חינם"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* WhatsApp groups */}
      <section style={{ background: gradients.warmDark, padding: "4rem 1.5rem", color: "white" }} dir="rtl">
        <div style={{ maxWidth: 880, margin: "0 auto", textAlign: "center" }}>
          <MessageCircle style={{ width: 36, height: 36, color: colors.goldShimmer, margin: "0 auto 1rem" }} />
          <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.goldShimmer, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            28 קבוצות WhatsApp
          </div>
          <h2 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "clamp(1.5rem, 3vw, 2.1rem)", margin: "0 0 1rem", fontStyle: "italic" }}>
            הקהילה שלך מחכה לך
          </h2>
          <p style={{ fontFamily: fonts.body, fontSize: "1rem", lineHeight: 1.85, color: "rgba(255,255,255,0.7)", marginBottom: "2rem" }}>
            בני ציון מפעילה 28 קבוצות WhatsApp פעילות — לפי נושא, לפי גיל, לפי גזרה. דיונים פעילים, חברותא וירטואלית, ושאלות לרבני האתר.
          </p>
          <button style={{ padding: "0.85rem 2rem", borderRadius: radii.lg, border: "none", background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "1rem", cursor: "pointer", boxShadow: shadows.goldGlow }}>
            הצטרף לקבוצה
          </button>
        </div>
      </section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DesignLayout>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ background: "white", borderRadius: radii.lg, padding: "1.1rem 1.25rem", border: `1px solid rgba(139,111,71,0.1)`, textAlign: "center", boxShadow: shadows.cardSoft }}>
      <div style={{ display: "flex", justifyContent: "center", color: colors.goldDark, marginBottom: "0.4rem" }}>{icon}</div>
      <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.4rem", color: colors.textDark, marginBottom: "0.1rem" }}>{value}</div>
      <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>{label}</div>
    </div>
  );
}

function Tier({ title, subtitle, price, period, features, highlighted = false }: { title: string; subtitle: string; price: string; period: string; features: string[]; highlighted?: boolean }) {
  return (
    <div style={{ background: highlighted ? "white" : colors.parchmentDark, borderRadius: radii.xl, padding: "2rem 1.5rem", border: highlighted ? `2px solid ${colors.goldDark}` : `1px solid rgba(139,111,71,0.12)`, boxShadow: highlighted ? "0 8px 24px rgba(139,111,71,0.18), 0 0 0 4px rgba(196,162,101,0.1)" : shadows.cardSoft, position: "relative", textAlign: "center" }}>
      {highlighted && (
        <div style={{ position: "absolute", top: -12, insetInlineStart: "50%", transform: "translateX(50%)", padding: "0.3rem 0.85rem", borderRadius: radii.pill, background: gradients.goldButton, color: "white", fontFamily: fonts.body, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", boxShadow: shadows.goldGlow, whiteSpace: "nowrap" }}>
          ⭐ הכי פופולרי
        </div>
      )}
      <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.3rem", color: colors.textDark, margin: "0 0 0.3rem" }}>
        {title}
      </h3>
      <div style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textMuted, marginBottom: "1rem" }}>
        {subtitle}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "0.4rem", marginBottom: "1.25rem" }}>
        <span style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "2.4rem", color: colors.goldDark }}>
          {price}
        </span>
        {period && <span style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted }}>{period}</span>}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", textAlign: "right" }}>
        {features.map((f) => (
          <li key={f} style={{ fontFamily: fonts.body, fontSize: "0.88rem", color: colors.textMid, padding: "0.4rem 0", borderBottom: `1px solid rgba(139,111,71,0.05)`, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: colors.goldDark }}>✓</span> {f}
          </li>
        ))}
      </ul>
      <button style={{ width: "100%", padding: "0.85rem 1.5rem", borderRadius: radii.lg, border: highlighted ? "none" : `1.5px solid ${colors.goldDark}`, background: highlighted ? gradients.goldButton : "transparent", color: highlighted ? "white" : colors.goldDark, fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", boxShadow: highlighted ? shadows.goldGlow : "none" }}>
        בחר מסלול זה
      </button>
    </div>
  );
}
