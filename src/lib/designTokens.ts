/**
 * Design tokens for the Bnei Zion redesign — single source of truth.
 *
 * These tokens are extracted from the production homepage `DesignPreviewHome.tsx`
 * and reused by every sandbox page under `src/components/layout-v2/` and
 * `src/pages/DesignPreview*.tsx`.
 *
 * Once the redesign is approved and rolled out site-wide, these tokens move
 * to Tailwind theme + CSS variables (in tailwind.config.ts and src/index.css).
 * Until then, sandbox files reference this module directly to stay isolated.
 */

// ── Colors ─────────────────────────────────────────────────────────────────
export const colors = {
  // Gold family — signature brand
  goldDark: "#8B6F47",
  goldLight: "#C4A265",
  goldShimmer: "#E8D5A0",
  goldDeep: "#6B4F2A",

  // Parchment / warm cream backgrounds
  parchment: "#FAF6F0",
  parchmentDark: "#F5F0E8",
  parchmentDeep: "#EDE5D6",

  // Text
  textDark: "#2D1F0E",
  textMid: "#3D2A14",
  textMuted: "#6B5C4A",
  textSubtle: "#A69882",

  // Olive (secondary accents — community, signup CTAs)
  oliveDark: "#4A5A2E",
  oliveMain: "#5B6E3A",
  oliveBg: "#F4F5EF",

  // Dark moods
  navyDeep: "#1A2744",
  navyMid: "#243558",
  mahogany: "#422817",

  // Special-purpose
  tealMain: "#2D7D7D",
  israelBlue: "#003F8A",
  israelBlueLight: "#1A5FB4",
} as const;

// ── Fonts ──────────────────────────────────────────────────────────────────
export const fonts = {
  display: 'Kedem, "Frank Ruhl Libre", serif',
  body: "Ploni, sans-serif",
  accent: "Paamon, serif",
  technical: "Mugrabi, sans-serif",
} as const;

// ── Gradients ──────────────────────────────────────────────────────────────
export const gradients = {
  goldButton: `linear-gradient(135deg, ${colors.goldDark}, ${colors.goldLight})`,
  goldText: `linear-gradient(135deg, ${colors.goldShimmer}, ${colors.goldLight}, ${colors.goldDark}, ${colors.goldLight}, ${colors.goldShimmer})`,
  oliveButton: `linear-gradient(135deg, ${colors.oliveDark}, ${colors.oliveMain})`,
  israelButton: `linear-gradient(135deg, ${colors.israelBlue}, ${colors.israelBlueLight})`,

  warmDark: `linear-gradient(180deg, ${colors.textDark}, #1A1208)`,
  parchmentBlend: `linear-gradient(180deg, ${colors.parchment}, ${colors.parchmentDark})`,
  navyHero: `linear-gradient(180deg, ${colors.navyDeep} 0%, #0F1A30 60%, ${colors.navyDeep} 100%)`,
  oliveHero: `linear-gradient(180deg, ${colors.oliveDark} 0%, #2A3416 60%, ${colors.oliveDark} 100%)`,
  mahoganyHero: `linear-gradient(180deg, ${colors.mahogany} 0%, #2D1810 60%, ${colors.mahogany} 100%)`,

  // Subtle radial vignette overlay for hero images
  heroVignette:
    "radial-gradient(ellipse at 50% 45%, transparent 20%, rgba(0,0,0,0.38) 100%)",
  heroDarken:
    "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.55) 100%)",
} as const;

// ── Shadows ────────────────────────────────────────────────────────────────
export const shadows = {
  goldGlow: "0 4px 24px rgba(139,111,71,0.4)",
  goldGlowSoft: "0 2px 12px rgba(139,111,71,0.25)",
  oliveGlow: "0 2px 12px rgba(74,90,46,0.35)",
  israelGlow: "0 4px 20px rgba(0,63,138,0.35)",

  cardSoft: "0 2px 12px rgba(45,31,14,0.05)",
  cardHover: "0 16px 48px rgba(45,31,14,0.12)",
  navScroll: "0 2px 24px rgba(45,31,14,0.07)",

  insetHighlight: "inset 0 1px 0 rgba(255,255,255,0.08)",
} as const;

// ── Radii ──────────────────────────────────────────────────────────────────
export const radii = {
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.25rem",
  pill: "999px",
} as const;

// ── Hero variant presets ───────────────────────────────────────────────────
// Each section/page picks a variant by its emotional family.
// See plan: 7 series families → 4 hero treatments.
export const heroVariants = {
  // Parchment-light: most pages (Series list, About, Contact, Profile)
  parchment: {
    background: gradients.parchmentBlend,
    textColor: colors.textDark,
    subtleColor: colors.textMuted,
    accentColor: colors.goldDark,
    dividerColor: "rgba(196,162,101,0.45)",
    overlay: "none",
  },
  // Mahogany dark: Series detail, Lesson page, Rabbi page (warm storytelling)
  mahogany: {
    background: gradients.mahoganyHero,
    textColor: "#fff",
    subtleColor: "rgba(255,255,255,0.7)",
    accentColor: colors.goldShimmer,
    dividerColor: "rgba(232,213,160,0.35)",
    overlay: gradients.heroVignette,
  },
  // Navy: Memorial, Dor Haplaot (solemn, awe)
  navy: {
    background: gradients.navyHero,
    textColor: "#fff",
    subtleColor: "rgba(255,255,255,0.65)",
    accentColor: colors.goldShimmer,
    dividerColor: "rgba(232,213,160,0.3)",
    overlay: gradients.heroVignette,
  },
  // Olive: Community, Knes (intellectual gathering)
  olive: {
    background: gradients.oliveHero,
    textColor: "#fff",
    subtleColor: "rgba(255,255,255,0.7)",
    accentColor: colors.goldShimmer,
    dividerColor: "rgba(232,213,160,0.3)",
    overlay: gradients.heroVignette,
  },
} as const;

export type HeroVariant = keyof typeof heroVariants;

// ── Series family palette ──────────────────────────────────────────────────
// Maps each of the 7 design families (from plan) to its hero variant +
// signature accent. Used by SeriesList / SeriesPagePublic to color-code
// series cards by their family.
export const seriesFamilies = {
  sacredCanon: {
    label: "קאנון מקודש",
    heroVariant: "mahogany",
    accent: colors.goldDark,
    badgeBg: "rgba(139,111,71,0.12)",
    badgeFg: colors.goldDeep,
  },
  weeklyObservance: {
    label: "מעגל השנה",
    heroVariant: "parchment",
    accent: colors.oliveMain,
    badgeBg: "rgba(91,110,58,0.12)",
    badgeFg: colors.oliveDark,
  },
  miraculous: {
    label: "פלאות",
    heroVariant: "navy",
    accent: colors.goldShimmer,
    badgeBg: "rgba(26,39,68,0.12)",
    badgeFg: colors.navyDeep,
  },
  remembrance: {
    label: "זיכרון ומורשת",
    heroVariant: "navy",
    accent: colors.mahogany,
    badgeBg: "rgba(66,40,23,0.12)",
    badgeFg: colors.mahogany,
  },
  youth: {
    label: "מסע לילדים",
    heroVariant: "parchment",
    accent: colors.tealMain,
    badgeBg: "rgba(45,125,125,0.12)",
    badgeFg: colors.tealMain,
  },
  assembly: {
    label: "כנס וקהילה",
    heroVariant: "olive",
    accent: colors.oliveDark,
    badgeBg: "rgba(74,90,46,0.12)",
    badgeFg: colors.oliveDark,
  },
  reference: {
    label: "כלי עזר",
    heroVariant: "parchment",
    accent: colors.textMuted,
    badgeBg: "rgba(107,92,74,0.10)",
    badgeFg: colors.textMuted,
  },
} as const;

export type SeriesFamily = keyof typeof seriesFamilies;

// ── Auto-categorization helpers ────────────────────────────────────────────
// Map a series title (Hebrew) to the right design family.
// Used until we add a `series.family` column in Supabase.
export function getSeriesFamily(title: string, description?: string | null): SeriesFamily {
  const t = (title || "") + " " + (description || "");
  if (/פלאות|נס\b|ניסי|הצלה|השגחה/u.test(t)) return "miraculous";
  if (/לעילוי|זכר|נשמת|אבל|יזכור|הי״ד/u.test(t)) return "remembrance";
  if (/פרשה|פרשת|מועד|חג\b|ר.ח|זמני\s|שבוע/u.test(t)) return "weeklyObservance";
  if (/ילד|חידה|חידות|נוער|צעיר/u.test(t)) return "youth";
  if (/כנס|קהילת|קהילה|מורים|מלמדים|מדרשת/u.test(t)) return "assembly";
  if (/מפ\b|מפות|טיימליין|דף עבודה|כלי עזר/u.test(t)) return "reference";
  return "sacredCanon";
}

// Map a series title to a placeholder cover image from /public/images/.
// Returns null if no good match — caller should render a gradient fallback.
export function getSeriesCoverImage(title: string): string | null {
  const t = title || "";
  if (/ננצח|תנ.?ך|בכוח|בכח/u.test(t)) return "/images/series-tanach-victory.png";
  if (/לשון|הקודש|דקדוק/u.test(t)) return "/images/series-lashon-hakodesh.png";
  if (/איוב|משלי|כתובים/u.test(t)) return "/images/series-iyov.png";
  if (/מידות|מוסר|אופי/u.test(t)) return "/images/series-middot.png";
  if (/חומש|בראשית|שמות|ויקרא|במדבר|דברים|פרשה|פרשת|מאמר/u.test(t))
    return "/images/series-lashon-hakodesh.png";
  if (/יהושע|שופטים|שמואל|מלכים|נביא|ישעיהו|ירמיהו|יחזקאל/u.test(t))
    return "/images/series-tanach-victory.png";
  return null;
}

// Lesson type → Hebrew label
export function lessonTypeLabel(t: string | null | undefined): string {
  if (t === "video") return "וידאו";
  if (t === "audio") return "אודיו";
  if (t === "text" || t === "pdf") return "טקסט";
  return "שיעור";
}

// Format duration (seconds) → Hebrew label
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} דק׳`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}:${String(m).padStart(2, "0")} שעות` : `${h} שעות`;
}
