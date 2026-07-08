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
        style={
          promo.video_url || promo.image_url
            ? {
                // 8.7 (סער): פופאפ-מדיה = התמונה עצמה בדיוק — בלי קלף, בלי שוליים
                position: "relative",
                background: "transparent",
                outline: "none",
                maxWidth: "min(620px, 94vw)",
                fontFamily: promoFonts.body,
              }
            : {
                position: "relative",
                width: "min(440px, 100%)",
                background: colors.parchment,
                color: colors.textDark,
                borderRadius: radii.xl,
                boxShadow: shadows.modal,
                overflow: "hidden",
                outline: "none",
                fontFamily: promoFonts.body,
              }
        }
      >
        {/* 8.7 (סער): פופאפ עם מדיה = "פשוט תמונה לחיצה" — המדיה היא הפופאפ כולו,
            כל התמונה מקושרת ל-cta_url; כפתור-CTA מעל המדיה כשיש cta_label. */}
        {promo.video_url || promo.image_url ? (
          (() => {
            const mediaStyle: React.CSSProperties = {
              maxWidth: "min(620px, 94vw)",
              maxHeight: "82vh",
              width: "auto",
              height: "auto",
              display: "block",
              borderRadius: 18,
              boxShadow: shadows.modal,
            };
            const media = promo.video_url ? (
              <video
                src={promo.video_url}
                poster={promo.image_url ?? undefined}
                autoPlay
                muted
                loop
                playsInline
                style={{ ...mediaStyle, background: "#000", width: "min(420px, 90vw)" }}
              />
            ) : (
              <img src={promo.image_url!} alt={promo.title ?? "פרסום"} style={mediaStyle} />
            );
            const cta = promo.cta_label && promo.cta_url && (
              <span
                style={{
                  position: "absolute",
                  bottom: "1.1rem",
                  insetInline: 0,
                  display: "flex",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    background: "linear-gradient(135deg, #8B6F47, #C4A265)",
                    color: "white",
                    fontFamily: promoFonts.display,
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    padding: "0.65rem 1.9rem",
                    borderRadius: radii.pill,
                    boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
                    border: "1px solid rgba(255,255,255,0.35)",
                  }}
                >
                  {promo.cta_label}
                </span>
              </span>
            );
            const content = (
              <span style={{ position: "relative", display: "block" }}>
                {media}
                {cta}
              </span>
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
                {content}
              </a>
            ) : content;
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
              insetInlineStart: promo.video_url || promo.image_url ? "-0.6rem" : "0.75rem",
              insetBlockStart: promo.video_url || promo.image_url ? "-0.6rem" : "0.75rem",
              width: 38,
              height: 38,
              borderRadius: radii.pill,
              background: "white",
              border: "none",
              color: "#1A2744",
              cursor: "pointer",
              fontSize: "1.5rem",
              fontWeight: 700,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
              zIndex: 2,
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
