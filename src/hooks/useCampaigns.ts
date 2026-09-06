/**
 * useCampaigns — רמה 30 (27.7.2026): מנגנון קמפיינים רב-פעמי.
 *
 * טבלאות: `campaigns` + `campaign_tiers` (RLS: ציבור קורא is_active, admin הכל).
 * Views: `campaign_stats` / `campaign_tier_counts` — אגרגטים בלי PII, הכללה של
 * yehoshua_campaign_stats. מפתח הסליקה: campaigns.slug = donations.product =
 * payment_products.id (שורת payment_products מסונכרנת בטריגר DB).
 * טבלאות חדשות שאינן ב-generated types → casts `as never` (כמו useEvents).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignProofStat { val: string; label: string; icon?: string }
export interface CampaignWhyCard { num?: string; title: string; body: string }
export interface CampaignPhase { label: string; sub?: string; done?: boolean; current?: boolean }
export interface CampaignFaqItem { q: string; a: string }
/** קיר-התורמים (3.9) — תורמים אחרונים מהפלטפורמה החיצונית (givechak), מסונכרן ע"י sync-givechak-saadia.py */
export interface CampaignRecentDonor { name: string; amount: number; blessing?: string | null; created?: number }

export interface CampaignRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  goal_amount: number;
  is_active: boolean;
  /** רצועת-קמפיין בראש האתר (25.8, אישור הרב יואב) — קמפיין אחד "מדוגל" מוצג לכל הדפים הציבוריים. */
  show_site_banner: boolean;
  banner_title: string | null;
  hero_eyebrow: string | null;
  hero_title: string | null;
  hero_title_small: string | null;
  hero_subtitle: string | null;
  hero_subtitle_bold: string | null;
  hero_image_url: string | null;
  hero_quote: string | null;
  hero_quote_cite: string | null;
  video_url: string | null;
  video_poster_url: string | null;
  video_title: string | null;
  proof_stats: CampaignProofStat[];
  story_html: string | null;
  story_image_url: string | null;
  why_cards: CampaignWhyCard[];
  author_html: string | null;
  author_name: string | null;
  author_image_url: string | null;
  phases: CampaignPhase[];
  faq: CampaignFaqItem[];
  allow_custom_amount: boolean;
  min_custom_amount: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  /** מועד סיום (26.8, קמפיין סעדיה) — כשעתידי, דף הקמפיין מציג קאונטדאון. null = בלי מועד-סיום (יהושע). */
  ends_at: string | null;
  /** גיוס שבוצע בפלטפורמה חיצונית (givechak וכו') לפני המעבר לאתר — מתווסף לסכום/תומכים המוצגים. */
  external_raised: number;
  external_donors: number;
  external_source: string | null;
  /** קיר-התורמים (3.9) — שמות/סכומים/ברכות שכבר ציבוריים בעמוד givechak. ריק = הסקשן לא מרונדר. */
  external_recent_donors?: CampaignRecentDonor[] | null;
}

export interface CampaignTierRow {
  id: string;
  campaign_id: string;
  tier_key: string;
  price: number;
  name: string;
  headline: string | null;
  badge: string | null;
  note: string | null;
  perks: string[];
  tier_limit: number | null;
  image_url: string | null;
  image_alt: string | null;
  image_badge: string | null;
  highlight: boolean;
  needs_shipping: boolean;
  max_installments: number;
  is_active: boolean;
  sort_order: number;
  /** מכירות בפלטפורמה החיצונית (givechak) — 26.8, לצד הספירה המקומית */
  external_sold?: number | null;
}

export interface CampaignStats {
  slug: string;
  supporters: number;
  raised: number;
  pending_count: number;
}

/* ─── רשימת קמפיינים (אדמין — כולל כבויים, דרך ה-RLS של admin) ─── */
export function useCampaignsAdmin() {
  return useQuery<CampaignRow[]>({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns" as never)
        .select("*")
        .order("sort_order" as never, { ascending: true })
        .order("created_at" as never, { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CampaignRow[];
    },
  });
}

/* ─── מפת סטטיסטיקות לכל הקמפיינים (מה-view האגרגטיבי) ─── */
export function useCampaignStatsMap() {
  return useQuery<Record<string, CampaignStats>>({
    queryKey: ["campaign-stats-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_stats" as never)
        .select("*");
      if (error) throw error;
      const map: Record<string, CampaignStats> = {};
      for (const row of (data ?? []) as unknown as CampaignStats[]) {
        map[row.slug] = { ...row, raised: Number(row.raised) || 0 };
      }
      return map;
    },
  });
}

/* ─── קמפיין בודד + חבילות (ציבורי: RLS מסנן כבויים לבד) ─── */
export function useCampaignBySlug(slug: string | undefined) {
  return useQuery<{ campaign: CampaignRow; tiers: CampaignTierRow[] } | null>({
    queryKey: ["campaign", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data: campaign, error } = await supabase
        .from("campaigns" as never)
        .select("*")
        .eq("slug" as never, slug!)
        .maybeSingle();
      if (error) throw error;
      if (!campaign) return null;
      const c = campaign as unknown as CampaignRow;
      const { data: tiers, error: tErr } = await supabase
        .from("campaign_tiers" as never)
        .select("*")
        .eq("campaign_id" as never, c.id)
        .order("sort_order" as never, { ascending: true });
      if (tErr) throw tErr;
      return {
        campaign: c,
        tiers: ((tiers ?? []) as unknown as CampaignTierRow[]).map((t) => ({
          ...t,
          price: Number(t.price),
          perks: Array.isArray(t.perks) ? t.perks : [],
        })),
      };
    },
  });
}

/* ─── קמפיין "מדוגל" לרצועת-הבאנר בראש האתר (25.8, אישור הרב יואב) ───
 * שאילתה קלה: קמפיין show_site_banner=true AND is_active=true, ה-slug/כותרת/יעד
 * בלבד. הסכום שגויס נמשך בנפרד ע"י useLiveCampaignStats(slug) (realtime+polling,
 * אותו דפוס שכבר קיים בדף הקמפיין עצמו) כדי לא לשכפל לוגיקת-חיות.
 * fail-silent: אין קמפיין מדוגל / אין banner_title → null, הרצועה לא מרונדרת. */
export interface SiteBannerCampaign {
  slug: string;
  banner_title: string;
  goal_amount: number;
  /** גיוס חיצוני (givechak וכו') שנספר לתוך הסכום/האחוז המוצגים ברצועה (26.8). */
  external_raised: number;
  external_donors: number;
  /** מועד סיום — הרצועה מציגה "נותרו X ימים" קטן כשעתידי (26.8). */
  ends_at: string | null;
}

export function useSiteBannerCampaign() {
  return useQuery<SiteBannerCampaign | null>({
    queryKey: ["site-banner-campaign"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns" as never)
        .select("slug, banner_title, goal_amount, external_raised, external_donors, ends_at, show_site_banner, is_active, sort_order")
        .eq("show_site_banner" as never, true)
        .eq("is_active" as never, true)
        .order("sort_order" as never, { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const c = data as unknown as {
        slug: string;
        banner_title: string | null;
        goal_amount: number;
        external_raised: number | null;
        external_donors: number | null;
        ends_at: string | null;
      };
      if (!c.banner_title) return null;
      return {
        slug: c.slug,
        banner_title: c.banner_title,
        goal_amount: Number(c.goal_amount) || 0,
        external_raised: Number(c.external_raised) || 0,
        external_donors: Number(c.external_donors) || 0,
        ends_at: c.ends_at || null,
      };
    },
    staleTime: 1000 * 60 * 5,
    retry: false, // fail-silent: שגיאת-רשת/RLS לא תפיל את הרצועה על שאר האתר
  });
}

/* ─── סטטיסטיקות חיות לקמפיין (realtime + polling — דפוס useTierCounts) ─── */
// 3.9.2026 (סבב העומס): הפולינג עבר ל-react-query. הפס העליון (CampaignBanner,
// בכל דף), הרצועה בעמוד הבית והדף עצמו קראו כל אחד ל-hook הזה בנפרד — שלושה
// setInterval של 30ש' לכל טאב, גם כשהטאב ברקע. עכשיו: queryKey משותף (קריאה
// אחת לכל ה-consumers), 60ש' רק כשהטאב גלוי (refetchIntervalInBackground=false),
// ורענון בחזרה לטאב. ה-realtime על donations נשאר — הוא מבטל את המטמון מיידית
// למי שה-RLS מאפשר לו לראות את השורה (אדמינים).
const LIVE_STATS_POLL_MS = 60_000;

export function useLiveCampaignStats(slug: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["campaign-stats", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_stats" as never)
        .select("*")
        .eq("slug" as never, slug!)
        .maybeSingle();
      if (error) throw error; // שומר על הערך הקודם במטמון במקום לאפס את הפס
      const row = data as unknown as CampaignStats | null;
      return { raised: Number(row?.raised) || 0, supporters: row?.supporters || 0 };
    },
    staleTime: 30_000,
    refetchInterval: LIVE_STATS_POLL_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    if (!slug) return;
    // realtime על donations (ה-view לא תומך realtime ישירות)
    const channel = supabase
      .channel(`campaign-stats-${slug}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "donations", filter: `product=eq.${slug}` },
        () => queryClient.invalidateQueries({ queryKey: ["campaign-stats", slug] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug, queryClient]);

  return {
    raised: query.data?.raised ?? 0,
    supporters: query.data?.supporters ?? 0,
    loading: query.isLoading,
  };
}

/* ─── ספירת מכירות חיה לכל חבילה (remaining = tier_limit - sold) ─── */
const EMPTY_TIER_COUNTS: Record<string, number> = {};

export function useLiveTierCounts(slug: string | undefined): Record<string, number> {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["campaign-tier-counts", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_tier_counts" as never)
        .select("tier_id, sold")
        .eq("slug" as never, slug!);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of (data || []) as unknown as { tier_id: string; sold: number }[]) {
        map[row.tier_id] = row.sold;
      }
      return map;
    },
    staleTime: 30_000,
    refetchInterval: LIVE_STATS_POLL_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    if (!slug) return;
    const channel = supabase
      .channel(`campaign-tier-counts-${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "donations", filter: `product=eq.${slug}` },
        () => queryClient.invalidateQueries({ queryKey: ["campaign-tier-counts", slug] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug, queryClient]);

  return query.data ?? EMPTY_TIER_COUNTS;
}

/* ─── תרומות הקמפיין (אדמין — דרך policy admin_select_donations) ─── */
export interface CampaignDonationRow {
  id: string;
  created_at: string;
  donor_name: string | null;
  donor_email: string | null;
  phone: string | null;
  amount: number;
  payment_status: string | null;
  payment_method: string | null;
  payment_id: string | null;
  asmachta: string | null;
  card_suffix: string | null;
  tier_id: string | null;
  description: string | null;
  invoice_number: string | null;
  invoice_url: string | null;
  shipping_street: string | null;
  shipping_house_number: string | null;
  shipping_city: string | null;
  shipping_zip: string | null;
  shipping_notes: string | null;
}

export function useCampaignDonations(slug: string | undefined) {
  return useQuery<CampaignDonationRow[]>({
    queryKey: ["admin-campaign-donations", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select(
          "id, created_at, donor_name, donor_email, phone, amount, payment_status, payment_method, payment_id, asmachta, card_suffix, tier_id, description, invoice_number, invoice_url, shipping_street, shipping_house_number, shipping_city, shipping_zip, shipping_notes"
        )
        .eq("product", slug!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CampaignDonationRow[];
    },
  });
}

/* ─── מוטציות אדמין ─── */
export function useUpsertCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<CampaignRow> & { id?: string }) => {
      const payload: Record<string, unknown> = { ...row };
      if (row.id) {
        const { id, created_at, updated_at, ...updates } = payload as any;
        const { data, error } = await (supabase
          .from("campaigns" as never)
          .update(updates as never)
          .eq("id" as never, row.id) as any).select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("העדכון לא בוצע — אין הרשאת אדמין (RLS).");
      } else {
        const { error } = await supabase.from("campaigns" as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign"] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase
        .from("campaigns" as never)
        .delete()
        .eq("id" as never, id) as any).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("המחיקה לא בוצעה — אין הרשאת מחיקה (RLS).");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-campaigns"] }),
  });
}

export function useUpsertCampaignTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<CampaignTierRow> & { id?: string }) => {
      const payload: Record<string, unknown> = { ...row };
      if (row.id) {
        const { id, created_at, ...updates } = payload as any;
        const { data, error } = await (supabase
          .from("campaign_tiers" as never)
          .update(updates as never)
          .eq("id" as never, row.id) as any).select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("העדכון לא בוצע — אין הרשאת אדמין (RLS).");
      } else {
        const { error } = await supabase.from("campaign_tiers" as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaign"] }),
  });
}

export function useDeleteCampaignTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase
        .from("campaign_tiers" as never)
        .delete()
        .eq("id" as never, id) as any).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("המחיקה לא בוצעה — אין הרשאת מחיקה (RLS).");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaign"] }),
  });
}
