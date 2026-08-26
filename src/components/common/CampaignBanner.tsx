/**
 * CampaignBanner — רצועת קמפיין דקה בראש האתר (25.8, אישור הרב יואב).
 *
 * מקור-דאטה: הקמפיין "מדוגל" יחיד (campaigns.show_site_banner=true AND
 * is_active=true) — useSiteBannerCampaign. הסכום שגויס נמשך חי דרך
 * useLiveCampaignStats (אותו hook שמזין את דף הקמפיין עצמו, realtime+polling).
 *
 * fail-silent: בלי קמפיין מדוגל / בלי banner_title → לא מרונדר כלום.
 * לא fixed — יושבת בזרימה הרגילה מעל ה-header (דוחפת את הדף, לא מכסה תוכן).
 * סגירה (X) נזכרת ב-sessionStorage לפי slug, כדי שקמפיין חדש לא יישאר סגור.
 */
import { Link, useLocation } from "react-router-dom";
import { useSiteBannerCampaign, useLiveCampaignStats } from "@/hooks/useCampaigns";
import { colors, fonts } from "@/lib/designTokens";


/** ימים שלמים שנותרו עד ends_at, null אם כבר עבר. */
function daysUntil(endsAt: string): number | null {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

// אסור להציג: אדמין, דפי-קמפיין עצמם (הבאנר מיותר/מטעה בדף שכבר מציג את הקמפיין
// במלואו), ודפי-שיגור /kenes* — כולל /kenes ו-/kenes-archive שכן עוברים דרך
// Layout.tsx הרגיל (רק kenes-2026-* עצמם בלי Layout כלל). בדיקה כאן, לא רק
// במיקום-הרינדור, כדי לכסות את כל הנתיבים גם אם ייבנה עמוד-kenes עתידי נוסף.
const HIDDEN_ROUTE_PREFIXES = ["/admin"];

export default function CampaignBanner() {
  const { pathname } = useLocation();
  const { data: campaign } = useSiteBannerCampaign();
  const slug = campaign?.slug;
  const { raised } = useLiveCampaignStats(slug);

  if (HIDDEN_ROUTE_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  if (!campaign || !slug) return null;

  const goal = campaign.goal_amount || 0;
  // גיוס כולל = מקומי (חי, useLiveCampaignStats) + חיצוני (givechak וכו', 26.8)
  const totalRaised = raised + (campaign.external_raised || 0);
  const pct = goal > 0 ? Math.min(100, Math.round((totalRaised / goal) * 100)) : 0;
  const daysLeft = campaign.ends_at ? daysUntil(campaign.ends_at) : null;


  return (
    <Link
      to={`/campaign/${slug}`}
      dir="rtl"
      aria-label={`${campaign.banner_title} — ${pct}% מהיעד, מעבר לדף התרומה`}
      className="bz-campaign-banner"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        flexWrap: "wrap",
        textDecoration: "none",
        background: "linear-gradient(90deg, hsl(215 62% 9%), hsl(215 55% 16%) 45%, hsl(215 62% 9%))",
        borderBlockEnd: "2px solid hsl(43 85% 58%)",
        color: "rgba(255,255,255,0.95)",
        padding: "0.62rem 1rem",
        fontFamily: fonts.body,
        position: "relative",
        boxShadow: "0 4px 18px hsl(215 60% 5% / 0.35)",
      }}
    >
      <span className="bz-campaign-banner-title" style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontSize: "0.92rem", fontWeight: 800, textAlign: "center" }}>
        <span aria-hidden style={{ fontSize: "1rem" }}>🕯️</span>
        {campaign.banner_title}
      </span>

      <span className="bz-campaign-banner-progress" style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
        <span
          style={{
            width: 150,
            height: 10,
            borderRadius: 999,
            background: "rgba(255,255,255,0.16)",
            border: "1px solid hsl(43 85% 58% / 0.4)",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              display: "block",
              height: "100%",
              width: `${pct}%`,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${colors.goldDark}, ${colors.goldShimmer})`,
              boxShadow: "0 0 10px hsl(43 90% 60% / 0.7)",
              transition: "width 0.5s ease",
            }}
          />
        </span>
        <span style={{ fontSize: "0.95rem", fontWeight: 900, color: colors.goldShimmer, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
          {pct}%
        </span>
        {daysLeft != null && (
          <span
            style={{
              background: "hsl(4 72% 34%)",
              color: "white",
              fontSize: "0.72rem",
              fontWeight: 800,
              borderRadius: 999,
              padding: "0.22rem 0.65rem",
              whiteSpace: "nowrap",
            }}
          >
            נותרו {daysLeft} ימים
          </span>
        )}
      </span>

      <span
        className="bz-campaign-banner-cta"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          background: `linear-gradient(135deg, hsl(43 90% 64%), ${colors.goldDark})`,
          color: colors.navyDeep,
          borderRadius: 999,
          padding: "0.42rem 1.3rem",
          fontSize: "0.88rem",
          fontWeight: 900,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 14px hsl(38 80% 50% / 0.45)",
        }}
      >
        לתרומה ←
      </span>

      <style>{`
        @media (max-width: 640px) {
          .bz-campaign-banner {
            gap: 0.45rem;
          }
          .bz-campaign-banner-title {
            font-size: 0.8rem;
            width: 100%;
            justify-content: center;
          }
          .bz-campaign-banner-progress span:first-child {
            width: 96px;
          }
          /* בנייד כל הפס קליקבילי — הכפתור מיותר וגם נבלע מתחת להירו של דף הבית */
          .bz-campaign-banner-cta {
            display: none !important;
          }
        }
      `}</style>
    </Link>
  );
}
