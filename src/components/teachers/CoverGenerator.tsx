/**
 * CoverGenerator — admin/creator-only "generate an AI cover" control for a series.
 *
 * Why it exists:
 *   Lesson cards in the Teachers Wing fall back through a trio image chain
 *   (lesson.thumbnail_url → series.image_url → getSeriesCoverImage → default.webp).
 *   Series without an `image_url` therefore show a generic placeholder on every
 *   lesson card. This control lets an admin/creator fill that gap with one click:
 *   it calls the `generate-cover` edge function (Imagen 4 Fast, bucket
 *   bnei-zion-thumbnails, NO TEXT / NO PEOPLE prompt), then persists the returned
 *   public URL onto series.image_url so the whole series gets a real cover.
 *
 * Iron rules honored:
 *   - Role-gated: renders nothing for non-creators (useAuth().isCreator).
 *   - NetSpark-safe: supabase.functions.invoke builds its URL from the runtime
 *     (base64-decoded) client URL — no literal "*.supabase.co" in the bundle.
 *   - No letters in images — enforced inside the edge function prompt.
 *   - RTL, warm-cream + gold/olive design tokens, accessible (aria-live status).
 *
 * Edge function owns image generation + storage; this client owns persistence
 * of series.image_url. If RLS blocks the series UPDATE the flow degrades to a
 * clear Hebrew error (see _DONE.md → "תלות").
 */
import { useState } from "react";
import { ImagePlus, Loader2, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { colors, fonts, radii, shadows } from "@/lib/designTokens";

type Status = "idle" | "loading" | "success" | "error";

interface CoverGeneratorProps {
  seriesId: string;
  title: string;
  currentImageUrl: string | null;
  /** Called with the new public image URL once generated + persisted. */
  onGenerated: (imageUrl: string) => void;
}

export default function CoverGenerator({
  seriesId,
  title,
  currentImageUrl,
  onGenerated,
}: CoverGeneratorProps) {
  const { isCreator } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  // Only admins / creators may spend image-generation budget.
  if (!isCreator) return null;

  const handleGenerate = async () => {
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");

    try {
      const { data, error } = await supabase.functions.invoke("generate-cover", {
        body: { title, series_id: seriesId },
      });

      if (error) {
        let msg = "יצירת הכריכה נכשלה. נסו שוב.";
        try {
          const body = await (error as { context?: { json?: () => Promise<{ error?: string }> } })
            .context?.json?.();
          if (body?.error?.toLowerCase().includes("rate limit")) {
            msg = "הגעתם למכסת היצירה לשעה (5 כריכות). נסו שוב בעוד שעה.";
          } else if (body?.error) {
            msg = body.error;
          }
        } catch {
          /* response already consumed — keep generic message */
        }
        setStatus("error");
        setMessage(msg);
        return;
      }

      const imageUrl = (data as { image_url?: string } | null)?.image_url;
      if (!imageUrl) {
        setStatus("error");
        setMessage("יצירת הכריכה נכשלה. נסו שוב.");
        return;
      }

      // Persist onto the series so every lesson card inherits the cover.
      const { error: upErr } = await supabase
        .from("series")
        .update({ image_url: imageUrl })
        .eq("id", seriesId);

      if (upErr) {
        setStatus("error");
        setMessage("הכריכה נוצרה אך השמירה נכשלה. נסו שוב.");
        return;
      }

      setPreview(imageUrl);
      setStatus("success");
      setMessage("הכריכה נוצרה ונשמרה.");
      onGenerated(imageUrl);
    } catch {
      setStatus("error");
      setMessage("יצירת הכריכה נכשלה. נסו שוב.");
    }
  };

  const isLoading = status === "loading";
  const shownImage = preview || currentImageUrl;

  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        flexWrap: "wrap",
        marginBottom: "1.5rem",
        padding: "0.85rem 1rem",
        background: "rgba(74,90,46,0.06)",
        border: `1px solid rgba(74,90,46,0.18)`,
        borderRadius: radii.lg,
      }}
    >
      {/* Thumbnail preview of the current / freshly-generated cover */}
      {shownImage && (
        <img
          src={shownImage}
          alt={`כריכת הסדרה ${title}`}
          style={{
            width: 64,
            height: 40,
            objectFit: "cover",
            borderRadius: radii.sm,
            flexShrink: 0,
            boxShadow: shadows.cardSoft,
          }}
        />
      )}

      <div style={{ flex: 1, minWidth: 180 }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: "0.85rem",
            color: colors.oliveDark,
          }}
        >
          כריכת AI לסדרה
        </div>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: "0.74rem",
            color: colors.textMuted,
            margin: "0.2rem 0 0",
            lineHeight: 1.55,
          }}
        >
          תופיע בכרטיסי השיעורים שאין להם תמונה משלהם. ללא טקסט וללא דמויות.
        </p>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-label={currentImageUrl ? "צרו כריכת AI חדשה לסדרה" : "צרו כריכת AI לסדרה"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.5rem 1rem",
          borderRadius: radii.md,
          border: "none",
          background: isLoading ? colors.textSubtle : colors.oliveDark,
          color: "white",
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: "0.8rem",
          cursor: isLoading ? "default" : "pointer",
          flexShrink: 0,
          transition: "background 0.2s ease",
        }}
        onMouseEnter={(e) => {
          if (!isLoading) e.currentTarget.style.background = colors.oliveMain;
        }}
        onMouseLeave={(e) => {
          if (!isLoading) e.currentTarget.style.background = colors.oliveDark;
        }}
      >
        {isLoading ? (
          <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <ImagePlus size={15} />
        )}
        {isLoading ? "מייצר כריכה..." : currentImageUrl ? "צרו כריכה חדשה" : "צרו כריכת AI"}
      </button>

      {/* Accessible status line */}
      {message && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            width: "100%",
            fontFamily: fonts.body,
            fontSize: "0.76rem",
            fontWeight: 600,
            color: status === "error" ? "#9B2C2C" : colors.oliveDark,
          }}
        >
          {status === "success" ? (
            <Check size={14} />
          ) : status === "error" ? (
            <AlertCircle size={14} />
          ) : null}
          {message}
        </div>
      )}
    </div>
  );
}
