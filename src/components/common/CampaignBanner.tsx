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
import { X } from "lucide-react";
import { useState } from "react";
import { useSiteBannerCampaign, useLiveCampaignStats } from "@/hooks/useCampaigns";
import { colors, fonts } from "@/lib/designTokens";

const DISMISS_KEY = "bz_campaign_banner_dismissed_slug";

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
const HIDDEN_ROUTE_PREFIXES = ["/admin", "/campaign", "/kenes"];

export default function CampaignBanner() {
  const { pathname } = useLocation();
  const { data: campaign } = useSiteBannerCampaign();
  const slug = campaign?.slug;
  const { raised } = useLiveCampaignStats(slug);
  const [dismissed, setDismissed] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return sessionStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });

  if (HIDDEN_ROUTE_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  if (!campaign || !slug) return null;
  if (dismissed === slug) return null;

  const goal = campaign.goal_amount || 0;
  // גיוס כולל = מקומי (חי, useLiveCampaignStats) + חיצוני (givechak וכו', 26.8)
  const totalRaised = raised + (campaign.external_raised || 0);
  const pct = goal > 0 ? Math.min(100, Math.round((totalRaised / goal) * 100)) : 0;
  const daysLeft = campaign.ends_at ? daysUntil(campaign.ends_at) : null;

  const onClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      sessionStorage.setItem(DISMISS_KEY, slug);
    } catch {
      /* אחסון חסום — פשוט לא נזכר, לא קריטי */
    }
    setDismissed(slug);
  };

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
        gap: "0.9rem",
        flexWrap: "wrap",
        textDecoration: "none",
        background: "linear-gradient(90deg, #0F1A30, #1A2744 45%, #0F1A30)",
        color: "rgba(255,255,255,0.94)",
        padding: "0.55rem 1rem",
        fontFamily: fonts.body,
        position: "relative",
      }}
    >
      <span
        className="bz-campaign-banner-title"
        style={{
          fontSize: "0.85rem",
          fontWeight: 700,
          textAlign: "center",
        }}
      >
        {campaign.banner_title}
      </span>

      <span
        className="bz-campaign-banner-progress"
        style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
      >
        <span
          style={{
            width: 110,
            height: 6,
            borderRadius: 999,
            background: "rgba(255,255,255,0.18)",
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
              transition: "width 0.5s ease",
            }}
          />
        </span>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: colors.goldShimmer, whiteSpace: "nowrap" }}>
          {pct}% מהיעד
        </span>
        {daysLeft != null && (
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap" }}>
            · נותרו {daysLeft} ימים
          </span>
        )}
      </span>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          background: colors.goldShimmer,
          color: colors.navyDeep,
          borderRadius: 999,
          padding: "0.3rem 1rem",
          fontSize: "0.8rem",
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}
      >
        לתרומה
      </span>

      <button
        onClick={onClose}
        aria-label="סגירת הרצועה"
        style={{
          position: "absolute",
          insetInlineEnd: "0.6rem",
          top: "50%",
          transform: "translateY(-50%)",
          background: "rgba(255,255,255,0.1)",
          border: "none",
          borderRadius: "50%",
          width: 24,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.85)",
          cursor: "pointer",
        }}
      >
        <X size={13} />
      </button>

      <style>{`
        @media (max-width: 640px) {
          .bz-campaign-banner {
            padding-inline-end: 2.2rem;
            gap: 0.5rem;
          }
          .bz-campaign-banner-title {
            font-size: 0.76rem;
            width: 100%;
          }
          .bz-campaign-banner-progress span:first-child {
            width: 84px;
          }
        }
      `}</style>
    </Link>
  );
}
