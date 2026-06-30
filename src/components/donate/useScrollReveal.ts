/**
 * useScrollReveal — lightweight IntersectionObserver hook for the donate page.
 *
 * Returns a ref + a `visible` flag that flips to true once the element scrolls
 * into view, then disconnects (one-shot reveal). Respects the user's
 * `prefers-reduced-motion` setting — when reduced motion is requested the
 * element is revealed immediately with no transition.
 *
 * Pattern mirrors the IntersectionObserver reveals used across the redesign
 * (e.g. DesignPreviewYehoshuaCampaign), kept local to the donate components
 * so it stays inside the T05 ownership zone.
 */
import { useEffect, useRef, useState } from "react";

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15
) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honour reduced-motion: show immediately, skip the animation entirely.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold, rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}
