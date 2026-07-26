import { useEffect, useRef, useState, CSSProperties } from "react";

/**
 * LazyHeroVideo — a poster-first, lazily-loaded background video for hero blocks.
 *
 * Why (T11 perf): the hero video used to be a 9.4MB mp4 that autoplayed and
 * downloaded eagerly on first paint, blocking the desktop from feeling smooth.
 * This component:
 *   1. Paints the poster image instantly (cheap, decodes async).
 *   2. Defers the <video> element — sets its src only after the browser is idle
 *      AND the hero is actually in view (IntersectionObserver). preload="none"
 *      so nothing is fetched until we opt in.
 *   3. Skips the video entirely on reduced-motion or Save-Data / very slow
 *      connections — the poster alone is shown. Accessible + battery-friendly.
 *
 * The consumer supplies the overlays/content as children; this renders only the
 * media layers, filling a `position: relative` parent.
 */

interface LazyHeroVideoProps {
  /** Optimised, muted, loop-friendly mp4 (served from /public). */
  videoSrc: string;
  /** Poster image shown immediately and as the video fallback. */
  poster: string;
  /** Describes the poster for screen readers (the video is decorative). */
  posterAlt: string;
  /** Extra classes on the fill wrapper. */
  className?: string;
  /** Inline styles on the fill wrapper. */
  style?: CSSProperties;
  /** Styles applied to BOTH poster and video (object-position, filter, transform…). */
  mediaStyle?: CSSProperties;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function saveDataOrSlow(): boolean {
  if (typeof navigator === "undefined") return false;
  // Non-standard but widely supported on Chromium/Android.
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  return conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
}

const LazyHeroVideo = ({ videoSrc, poster, posterAlt, className, style, mediaStyle }: LazyHeroVideoProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    // Never load the heavy video when the user opted out of motion/data.
    if (prefersReducedMotion() || saveDataOrSlow()) return;

    const el = wrapperRef.current;
    if (!el) return;

    let idleId: number | undefined;
    const win = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const load = () => {
      const run = () => setShowVideo(true);
      if (win.requestIdleCallback) idleId = win.requestIdleCallback(run, { timeout: 2000 });
      else idleId = window.setTimeout(run, 200);
    };

    // Only fetch the video once the hero is actually near the viewport.
    if (typeof IntersectionObserver === "undefined") {
      load();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          load();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);

    // יואב 26.7 (רמה 29ב, "קרה משהו לאנימציה"): בדפדפנים עם סינון-תוכן
    // ה-IntersectionObserver לפעמים לא יורה בכלל (אומת: observer על אלמנט
    // גלוי בטאב חי לא קיבל callback) — והווידאו לא עולה לעולם. ההירו ממילא
    // בראש הדף, אז אחרי 4 שניות טוענים אותו בכל מקרה. ה-poster כבר על המסך,
    // כך שאין פגיעה בביצועי הצביעה הראשונה.
    const fallbackId = window.setTimeout(load, 4000);

    return () => {
      io.disconnect();
      window.clearTimeout(fallbackId);
      if (idleId !== undefined) {
        if (win.cancelIdleCallback) win.cancelIdleCallback(idleId);
        else window.clearTimeout(idleId);
      }
    };
  }, []);

  const fill: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };

  return (
    <div ref={wrapperRef} className={className} style={{ position: "absolute", inset: 0, ...style }} aria-hidden="true">
      <img
        src={poster}
        alt={posterAlt}
        decoding="async"
        // React 18 לא מכיר fetchPriority (camelCase) — מוזרם lowercase ישירות ל-DOM
        {...({ fetchpriority: "high" } as Record<string, string>)}
        style={{ ...fill, ...mediaStyle }}
      />
      {showVideo && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={poster}
          src={videoSrc}
          onCanPlay={() => setVideoReady(true)}
          style={{
            ...fill,
            ...mediaStyle,
            opacity: videoReady ? 1 : 0,
            transition: "opacity 700ms ease",
          }}
        />
      )}
    </div>
  );
};

export default LazyHeroVideo;
