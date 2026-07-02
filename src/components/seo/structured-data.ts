/**
 * JSON-LD (schema.org) builders for בני ציון.
 *
 * Pure functions — each returns a plain object ready to hand to
 * `useSEO({ jsonLd })` / `<Seo jsonLd={…} />`. They keep the structured-data
 * shapes in one place so every page emits consistent, valid markup.
 *
 * The static WebSite + Organization blocks live in index.html (served to every
 * crawler even before JS runs); these builders cover the per-page dynamic types
 * (BreadcrumbList, Course, Product, CollectionPage, VideoObject/Article).
 */

const SITE = "https://bneyzion.co.il";
const ORG_NAME = "בני ציון";

/** Absolute-ise a root-relative path for structured data (crawlers want full URLs). */
export const abs = (path: string): string =>
  /^https?:\/\//.test(path) ? path : `${SITE}${path.startsWith("/") ? "" : "/"}${path}`;

export interface Crumb {
  name: string;
  /** Root-relative path, e.g. "/series/123". */
  path: string;
}

/** BreadcrumbList — helps Google render the breadcrumb trail in results. */
export function breadcrumbJsonLd(crumbs: Crumb[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  };
}

/** CollectionPage — for listing pages (category, topic, library, store). */
export function collectionJsonLd(opts: {
  name: string;
  description?: string;
  path: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    url: abs(opts.path),
    inLanguage: "he",
    isPartOf: { "@type": "WebSite", name: ORG_NAME, url: SITE },
  };
}

/** Course — for the weekly-chapter program and paid courses. */
export function courseJsonLd(opts: {
  name: string;
  description?: string;
  path: string;
  image?: string | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    url: abs(opts.path),
    ...(opts.image ? { image: abs(opts.image) } : {}),
    inLanguage: "he",
    provider: {
      "@type": "Organization",
      name: ORG_NAME,
      url: SITE,
    },
  };
}

/** Product — store items, with price + availability for rich results. */
export function productJsonLd(opts: {
  name: string;
  description?: string | null;
  path: string;
  image?: string | null;
  price: number;
  inStock?: boolean;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.image ? { image: abs(opts.image) } : {}),
    url: abs(opts.path),
    brand: { "@type": "Brand", name: ORG_NAME },
    offers: {
      "@type": "Offer",
      price: String(opts.price),
      priceCurrency: "ILS",
      availability:
        opts.inStock === false
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      url: abs(opts.path),
    },
  };
}
