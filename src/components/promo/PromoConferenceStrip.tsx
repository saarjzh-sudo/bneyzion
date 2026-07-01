/**
 * PromoConferenceStrip — slim event/conference notice under the header.
 * Non-intrusive (like the banner): allowed on every page. Distinct look:
 * a centered "כנס" pill + date/CTA, so it reads as an event, not an ad.
 */
import { useState } from "react";
import { radii } from "@/lib/designTokens";
import { promoPalette, promoFonts } from "./promoTheme";
import type { Promo } from "./types";

interface Props {
  promo: Promo;
  onDismiss: (promo: Promo) => void;
}

const PromoConferenceStrip = ({ promo, onDismiss }: Props) => {
  const [closing, setClosing] = useState(false);
  const pal = promoPalette[promo.theme];

  if (closing) return null;

  return (
    <aside
      dir="rtl"
      role="region"
      aria-label={promo.title || "הודעת כנס"}
      style={{
        background: pal.surface,
        color: pal.onSurface,
        fontFamily: promoFonts.body,
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          position: "relative",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0.7rem 2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.85rem",
          flexWrap: "wrap",
          textAlign: "center",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.35)",
            padding: "0.15rem 0.7rem",
            borderRadius: radii.pill,
            fontFamily: promoFonts.accent,
            fontSize: "0.85rem",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          כנס
        </span>

        <span style={{ fontSize: "1rem", lineHeight: 1.4 }}>
          {promo.title && <strong style={{ fontWeight: 700 }}>{promo.title}</strong>}
          {promo.title && promo.body ? " · " : ""}
          {promo.body}
        </span>

        {promo.cta_label && promo.cta_url && (
          <a
            href={promo.cta_url}
            style={{
              background: pal.ctaBg,
              color: pal.ctaText,
              padding: "0.35rem 1.1rem",
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
            onClick={() => {
              setClosing(true);
              onDismiss(promo);
            }}
            aria-label="סגירת רצועת הכנס"
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

export default PromoConferenceStrip;
