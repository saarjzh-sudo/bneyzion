/**
 * PromoBanner — quiet top strip. Allowed on every page (incl. product/learning);
 * it never covers content, so it does not interrupt a purchase or a lesson.
 */
import { useState } from "react";
import { radii } from "@/lib/designTokens";
import { promoPalette, promoFonts } from "./promoTheme";
import type { Promo } from "./types";

interface Props {
  promo: Promo;
  onDismiss: (promo: Promo) => void;
}

const PromoBanner = ({ promo, onDismiss }: Props) => {
  const [closing, setClosing] = useState(false);
  const pal = promoPalette[promo.theme];

  const close = () => {
    setClosing(true);
    onDismiss(promo);
  };

  if (closing) return null;

  return (
    <aside
      dir="rtl"
      role="region"
      aria-label={promo.title || "הודעה"}
      style={{
        background: pal.surface,
        color: pal.onSurface,
        fontFamily: promoFonts.body,
        boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          position: "relative",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0.6rem 2.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.4 }}>
          {promo.title && (
            <strong style={{ fontWeight: 700 }}>{promo.title} </strong>
          )}
          {promo.body}
        </p>

        {promo.cta_label && promo.cta_url && (
          <a
            href={promo.cta_url}
            style={{
              background: pal.ctaBg,
              color: pal.ctaText,
              padding: "0.35rem 1rem",
              borderRadius: radii.pill,
              fontWeight: 700,
              fontSize: "0.9rem",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {promo.cta_label}
          </a>
        )}

        {promo.dismissible && (
          <button
            type="button"
            onClick={close}
            aria-label="סגירת ההודעה"
            style={{
              position: "absolute",
              insetInlineStart: "0.75rem",
              background: "transparent",
              border: "none",
              color: pal.onSurface,
              cursor: "pointer",
              fontSize: "1.25rem",
              lineHeight: 1,
              padding: "0.25rem",
              borderRadius: radii.sm,
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default PromoBanner;
