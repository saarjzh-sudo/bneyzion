/**
 * HomeCampaignStrip — סקשן קמפיין בולט בדף הבית (26.8ב, בקשת סער:
 * "ההפניה בדף הבית לא מספיק משמעותית ויפה").
 *
 * ניזון מאותו קמפיין "מדוגל" של הפס העליון (useSiteBannerCampaign) —
 * בלי קמפיין מדוגל לא מרונדר כלום. רקע: אקוורל "השלמת הבניין" (Nano Banana Pro).
 */
import { Link } from "react-router-dom";
import { useSiteBannerCampaign, useLiveCampaignStats } from "@/hooks/useCampaigns";

const BG =
  "https://pzvmwfexeiruelwiujxn.supabase.co/storage/v1/object/public/lesson-files/saadia-campaign/dedication-bg.png";
const GOLD_GRAD = "linear-gradient(135deg, hsl(43 90% 62%), hsl(38 78% 48%))";

function daysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return null;
  return Math.ceil(diff / 86_400_000);
}

export default function HomeCampaignStrip() {
  const { data: campaign } = useSiteBannerCampaign();
  const { raised } = useLiveCampaignStats(campaign?.slug);
  if (!campaign) return null;

  const totalRaised = raised + (campaign.external_raised || 0);
  const goal = Number(campaign.goal_amount) || 0;
  const pct = goal > 0 ? Math.min(100, Math.round((totalRaised / goal) * 100)) : 0;
  const days = daysLeft(campaign.ends_at);

  return (
    <section dir="rtl" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <img src={BG} alt="" aria-hidden style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, hsl(215 55% 10% / 0.94), hsl(215 55% 12% / 0.78) 55%, hsl(215 55% 10% / 0.55))" }} />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(36px, 5vw, 56px) 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 14,
        }}
      >
        {days != null && (
          <div style={{ background: "hsl(4 72% 34%)", color: "white", fontWeight: 900, fontSize: 13, borderRadius: 99, padding: "5px 16px", boxShadow: "0 4px 14px hsl(4 60% 20% / 0.5)" }}>
            ⏳ נותרו {days} ימים לסיום הקמפיין
          </div>
        )}
        <h2 style={{ margin: 0, color: "white", fontWeight: 900, fontSize: "clamp(22px, 3.4vw, 36px)", lineHeight: 1.2, textShadow: "0 2px 16px hsl(215 55% 5% / 0.6)" }}>
          {campaign.banner_title}
        </h2>
        <div style={{ color: "hsl(215 10% 84%)", fontSize: "clamp(15px, 2vw, 19px)", fontWeight: 600 }}>
          הושגו <span style={{ color: "hsl(43 90% 68%)", fontWeight: 900, fontSize: "1.35em", fontVariantNumeric: "tabular-nums" }}>₪{totalRaised.toLocaleString()}</span>{" "}
          מתוך יעד ₪{goal.toLocaleString()}
        </div>

        <div style={{ width: "min(560px, 100%)", position: "relative", padding: "6px 0" }}>
          <div style={{ height: 14, background: "hsl(215 25% 88% / 0.22)", borderRadius: 99, overflow: "hidden", border: "1px solid hsl(38 75% 55% / 0.35)" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: GOLD_GRAD, borderRadius: 99, boxShadow: "0 0 14px hsl(43 90% 60% / 0.55)" }} />
          </div>
          <div style={{ marginBlockStart: 6, color: "hsl(43 90% 70%)", fontWeight: 900, fontSize: 15 }}>{pct}% מהיעד</div>
        </div>

        <Link
          to={`/campaign/${campaign.slug}`}
          style={{
            display: "inline-block",
            padding: "15px 44px",
            background: GOLD_GRAD,
            color: "hsl(215 55% 12%)",
            borderRadius: 99,
            fontWeight: 900,
            fontSize: "clamp(15px, 2vw, 18px)",
            textDecoration: "none",
            boxShadow: "0 10px 30px hsl(38 80% 50% / 0.4)",
            whiteSpace: "nowrap",
          }}
        >
          משלימים את הבניין — לתרומה ←
        </Link>
      </div>
    </section>
  );
}
