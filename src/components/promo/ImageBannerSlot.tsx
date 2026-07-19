/**
 * ImageBannerSlot — באנר-תמונה לחיץ (8.7.2026, דיון סער).
 *
 * לא רצועה צפה ולא באנר-צד — תמונה רוחבית שמשולבת בזרימת העמוד:
 *   placement="home"    → דף הבית, מתחת להירו
 *   placement="content" → עמודי התוכן (DesignLayout), מעל הפוטר
 *
 * כל התמונה לחיצה (cta_url). נכס מובייל נפרד כשקיים. נטען עצל.
 * מכבד תזמון (starts_at/ends_at) ו-is_active — נעלם לבד בסוף קמפיין.
 */
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { pageTypeFromPath, useVisitorAudiences, matchesTargeting } from "./targeting";
import type { Promo } from "./types";

function isWithinSchedule(p: Promo, now: Date): boolean {
  if (p.starts_at && new Date(p.starts_at) > now) return false;
  if (p.ends_at && new Date(p.ends_at) < now) return false;
  return true;
}

export type BannerPlacement = "home" | "content" | "store";

/** הבאנר הפעיל למיקום הנתון (או null) — משותף לסלוט ול-DesignLayout,
 *  שצריך לדעת אם יש באנר עליון כדי לבטל את חפיפת-ההירו. */
export function useActiveImageBanner(placement: BannerPlacement): Promo | null {
  const { pathname } = useLocation();
  const visitorAudiences = useVisitorAudiences();
  const { data: rows } = useQuery({
    queryKey: ["image-banner", placement],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Promo[]> => {
      const { data } = await (supabase as any)
        .from("promos")
        .select("*")
        .eq("type", "banner")
        .eq("is_active", true)
        .eq("placement", placement)
        .order("priority", { ascending: false });
      return (data ?? []) as Promo[];
    },
  });

  const now = new Date();
  const pageType = pageTypeFromPath(pathname);
  return (rows ?? []).find(
    (p) =>
      p.image_url &&
      isWithinSchedule(p, now) &&
      matchesTargeting(p, pageType, visitorAudiences),
  ) ?? null;
}

export default function ImageBannerSlot({ placement }: { placement: BannerPlacement }) {
  const banner = useActiveImageBanner(placement);

  if (!banner?.image_url) return null;

  const img = (
    <picture>
      {banner.mobile_image_url && (
        <source media="(max-width: 640px)" srcSet={banner.mobile_image_url} />
      )}
      <img
        src={banner.image_url}
        alt={banner.title ?? "פרסום"}
        loading="lazy"
        style={{
          width: "100%",
          display: "block",
          // יואב 17.7: "באנר עליון, נמוך ורחב" — תמונה בכל יחס נחתכת לרצועה,
          // לא משתלטת על העמוד.
          maxHeight: "clamp(110px, 18vw, 210px)",
          objectFit: "cover",
          borderRadius: 14,
          border: "1px solid rgba(196,162,101,0.4)",
          boxShadow: "0 6px 24px rgba(45,31,14,0.16)",
        }}
      />
    </picture>
  );

  return (
    <div
      data-print-hide
      style={{
        // width:100% — בתוך layout עם flex ההיעדר שלו מכווץ את הבאנר לאפס
        width: "100%",
        maxWidth: 1280,
        boxSizing: "border-box",
        margin: placement === "home" ? "1.5rem auto 0.5rem" : "2.5rem auto 1.5rem",
        padding: "0 1.25rem",
        alignSelf: "center",
      }}
    >
      {banner.cta_url ? (
        <a href={banner.cta_url} target={banner.cta_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" aria-label={banner.title ?? "פרסום"}>
          {img}
        </a>
      ) : (
        img
      )}
    </div>
  );
}
