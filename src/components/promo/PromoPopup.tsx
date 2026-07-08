/**
 * PromoPopup — modal dialog. This is the intrusive surface, so it is the one
 * suppressed by default on product + learning routes (see PromoProvider).
 *
 * Accessibility: role="dialog" aria-modal, labelled by its title, ESC closes,
 * focus is trapped inside while open and returned to the opener on close,
 * backdrop click closes (when dismissible).
 */
import { useEffect, useRef, useCallback } from "react";
import { colors, radii, shadows } from "@/lib/designTokens";
import { promoPalette, promoFonts } from "./promoTheme";
import type { Promo } from "./types";

interface Props {
  promo: Promo;
  onDismiss: (promo: Promo) => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const PromoPopup = ({ promo, onDismiss }: Props) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const pal = promoPalette[promo.theme];
  const titleId = `promo-title-${promo.id}`;
  const bodyId = `promo-body-${promo.id}`;

  const close = useCallback(() => onDismiss(promo), [onDismiss, promo]);

  // Focus management + ESC + focus-trap
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    // move focus into the dialog (first focusable, else the dialog itself)
    const focusables = node?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (focusables && focusables.length ? focusables[0] : node)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && promo.dismissible) {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = node.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    // lock background scroll while the modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [close, promo.dismissible]);

  return (
    <div
      role="presentation"
      onClick={promo.dismissible ? close : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(26,18,8,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
      }}
    >
      <div
        ref={dialogRef}
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={promo.title ? titleId : undefined}
        aria-describedby={promo.body ? bodyId : undefined}
        aria-label={promo.title ? undefined : "הודעה"}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: promo.video_url || promo.image_url ? "min(560px, 100%)" : "min(440px, 100%)",
          background: colors.parchment,
          color: colors.textDark,
          borderRadius: radii.xl,
          boxShadow: shadows.modal,
          overflow: "hidden",
          outline: "none",
          fontFamily: promoFonts.body,
        }}
      >
        {/* 8.7 (סער): פופאפ עם מדיה = "פשוט תמונה לחיצה" — המדיה היא הפופאפ כולו,
            כל התמונה מקושרת ל-cta_url, בלי כותרת/טקסט/כפתור. */}
        {promo.video_url || promo.image_url ? (
          (() => {
            const media = promo.video_url ? (
              <video
                src={promo.video_url}
                poster={promo.image_url ?? undefined}
                autoPlay
                muted
                loop
                playsInline
                controls
                style={{ width: "100%", maxHeight: "78vh", display: "block", background: "#000" }}
              />
            ) : (
              <img
                src={promo.image_url!}
                alt={promo.title ?? "פרסום"}
                style={{ width: "100%", maxHeight: "78vh", objectFit: "contain", display: "block" }}
              />
            );
            return promo.cta_url ? (
              <a
                href={promo.cta_url}
                target={promo.cta_url.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                aria-label={promo.title ?? "לפרטים"}
                onClick={() => onDismiss(promo)}
                style={{ display: "block", cursor: "pointer" }}
              >
                {media}
              </a>
            ) : media;
          })()
        ) : (
          <>
            {/* פופאפ טקסט (בלי מדיה) — הקלף הישן */}
            <div style={{ height: 4, background: pal.surface }} />
            <div style={{ padding: "1.5rem 1.5rem 1.75rem" }}>
              {promo.title && (
                <h2
                  id={titleId}
                  style={{
                    margin: "0 0 0.6rem",
                    fontFamily: promoFonts.display,
                    fontSize: "1.5rem",
                    lineHeight: 1.3,
                    color: colors.textDark,
                  }}
                >
                  {promo.title}
                </h2>
              )}

              {promo.body && (
                <p
                  id={bodyId}
                  style={{
                    margin: "0 0 1.25rem",
                    fontSize: "1rem",
                    lineHeight: 1.6,
                    color: colors.textMid,
                  }}
                >
                  {promo.body}
                </p>
              )}

              {promo.cta_label && promo.cta_url && (
                <a
                  href={promo.cta_url}
                  onClick={() => onDismiss(promo)}
                  style={{
                    display: "inline-block",
                    background: pal.surface,
                    color: pal.onSurface,
                    padding: "0.7rem 1.6rem",
                    borderRadius: radii.pill,
                    fontWeight: 700,
                    fontSize: "1rem",
                    textDecoration: "none",
                  }}
                >
                  {promo.cta_label}
                </a>
              )}
            </div>
          </>
        )}

        {promo.dismissible && (
          <button
            type="button"
            onClick={close}
            aria-label="סגירת החלון"
            style={{
              position: "absolute",
              insetInlineStart: "0.75rem",
              insetBlockStart: "0.75rem",
              width: 36,
              height: 36,
              borderRadius: radii.pill,
              background: "rgba(255,255,255,0.85)",
              border: `1px solid ${colors.parchmentDeep}`,
              color: colors.textDark,
              cursor: "pointer",
              fontSize: "1.4rem",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PromoPopup;
