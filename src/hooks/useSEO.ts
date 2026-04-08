import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = "בני ציון – אתר התנ״ך של ישראל";
const DEFAULT_DESC = "פורטל מרכזי ללימוד תנ״ך – שיעורים, סדרות, רבנים ועוד";

export function useSEO({ title, description, image, url, type = "website", jsonLd }: SEOProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const desc = description || DEFAULT_DESC;
    const img = image || `${window.location.origin}/lovable-uploads/logo-bney-zion.png`;
    const pageUrl = url || window.location.href;

    document.title = fullTitle;

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
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

    // Open Graph
    setMeta("og:title", fullTitle);
    setMeta("og:description", desc);
    setMeta("og:image", img);
    setMeta("og:url", pageUrl);
    setMeta("og:type", type);
    setMeta("og:site_name", "בני ציון");
    setMeta("og:locale", "he_IL");

    // Twitter
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", desc);
    setMeta("twitter:image", img);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", pageUrl.split("?")[0]);

    // JSON-LD
    let jsonLdScript = document.querySelector('script[data-seo-jsonld]') as HTMLScriptElement | null;
    if (jsonLd) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement("script");
        jsonLdScript.setAttribute("type", "application/ld+json");
        jsonLdScript.setAttribute("data-seo-jsonld", "true");
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      document.title = SITE_NAME;
      if (jsonLdScript) jsonLdScript.remove();
    };
  }, [title, description, image, url, type, jsonLd]);
}
