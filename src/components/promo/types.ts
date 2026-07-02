/**
 * T09 promo system — shared types.
 *
 * Mirrors the `promos` table (supabase/migrations/20260701_promos.sql).
 * Kept as a hand-written interface because `promos` is not yet in the
 * generated Supabase `Database` type (the migration is DO-NOT-APPLY until
 * Saar confirms). Once applied + types regenerated, this can be replaced
 * by `Tables<'promos'>`.
 */

export type PromoType = "banner" | "popup" | "conference";
export type PromoFrequency = "always" | "session" | "once" | "daily";
export type PromoTheme = "gold" | "olive" | "navy";

export interface Promo {
  id: string;
  type: PromoType;
  title: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  audience_tags: string[];
  priority: number;
  frequency: PromoFrequency;
  dismissible: boolean;
  suppress_on_product: boolean;
  suppress_on_learning: boolean;
  theme: PromoTheme;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
