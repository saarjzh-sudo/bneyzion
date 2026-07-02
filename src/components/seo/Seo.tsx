import { useSEO, type SEOProps } from "@/hooks/useSEO";

/**
 * <Seo> — the single, central head manager for the whole site.
 *
 * This project has no react-helmet; instead a lightweight effect-based hook
 * (`useSEO`) imperatively syncs <title>, meta, Open-Graph, Twitter-card,
 * canonical and JSON-LD into <head>. <Seo> is the declarative face of that hook
 * so pages can drop a single tag near the top of their JSX:
 *
 *   <Seo title="…" description="…" jsonLd={courseJsonLd(course)} />
 *
 * It renders nothing (side-effect only), so adding it to a page never changes
 * layout or logic — it is purely additive.
 */
export function Seo(props: SEOProps) {
  useSEO(props);
  return null;
}

export default Seo;
export type { SEOProps };
export * from "./structured-data";
