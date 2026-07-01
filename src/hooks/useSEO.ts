import { useEffect } from "react";

export interface SEOProps {
  /** Page-specific title. Rendered as `${title} | ${SITE_NAME}`. Omit for the site default. */
  title?: string;
  description?: string;
  /** Absolute or root-relative OG/Twitter image. Falls back to the branded default card. */
  image?: string;
  /** Alt text for the OG image (accessibility + some crawlers). */
  imageAlt?: string;
  /** Canonical URL. Defaults to the current location (query stripped). */
  url?: string;
  type?: string;
  /** When true, adds <meta name="robots" content="noindex,follow"> for private/utility pages. */
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const SITE_NAME = "בני ציון – אתר התנ״ך של ישראל";
const DEFAULT_DESC =
  "פורטל מרכזי ללימוד תנ״ך – שיעורים, סדרות, רבנים ועוד";
/** Branded 1200×630 share card. Lives in /public, so it is stable across builds. */
const DEFAULT_OG_IMAGE = "/og-image.png";

export function useSEO({
  title,
  description,
  image,
  imageAlt,
  url,
  type = "website",
  noindex = false,
  jsonLd,
}: SEOProps) {
  useEffect(() => {
    const origin = window.location.origin;
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const desc = description || DEFAULT_DESC;
    // Resolve the image to an absolute URL — crawlers (Facebook, WhatsApp,
    // Twitter) require absolute og:image URLs.
    const rawImg = image || DEFAULT_OG_IMAGE;
    const img = /^https?:\/\//.test(rawImg) ? rawImg : `${origin}${rawImg}`;
    const pageUrl = url || window.location.href;
    const canonicalHref = pageUrl.split("?")[0].split("#")[0];

    document.title = fullTitle;

    // Tracks nodes we create so we can leave the static index.html tags alone
    // on unmount but still clean up anything we injected.
    const setMeta = (property: string, content: string) => {
      let el =
        document.querySelector(`meta[property="${property}"]`) ||
        document.querySelector(`meta[name="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        if (property.startsWith("og:") || property.startsWith("article:")) {
          el.setAttribute("property", property);
        } else {
          el.setAttribute("name", property);
        }
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Core meta
    setMeta("description", desc);

    // Robots — index by default; noindex for private/utility pages.
    setMeta("robots", noindex ? "noindex,follow" : "index,follow");

    // Open Graph
    setMeta("og:title", fullTitle);
    setMeta("og:description", desc);
    setMeta("og:image", img);
    if (imageAlt) setMeta("og:image:alt", imageAlt);
    setMeta("og:url", pageUrl);
    setMeta("og:type", type);
    setMeta("og:site_name", "בני ציון");
    setMeta("og:locale", "he_IL");

    // Twitter
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", desc);
    setMeta("twitter:image", img);
    if (imageAlt) setMeta("twitter:image:alt", imageAlt);

    // Canonical
    let canonical = document.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalHref);

    // JSON-LD — supports a single object or an array of graph objects. We tag
    // our node so it never collides with the static WebSite/Organization blocks
    // baked into index.html.
    let jsonLdScript = document.querySelector(
      "script[data-seo-jsonld]",
    ) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement("script");
        jsonLdScript.setAttribute("type", "application/ld+json");
        jsonLdScript.setAttribute("data-seo-jsonld", "true");
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = JSON.stringify(jsonLd);
    } else if (jsonLdScript) {
      // No JSON-LD for this page — drop a stale one left by a previous route.
      jsonLdScript.remove();
      jsonLdScript = null;
    }

    return () => {
      document.title = SITE_NAME;
      if (jsonLdScript) jsonLdScript.remove();
    };
  }, [title, description, image, imageAlt, url, type, noindex, jsonLd]);
}
