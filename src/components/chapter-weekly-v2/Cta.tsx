import { ArrowLeft } from "lucide-react";

import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";
import { PRICE } from "./data";

/**
 * כפתור ההצטרפות של הדף. עוטף את `SubscribeButton` הקיים כדי שהחיווט לצ'קאאוט
 * (Grow + webhook + Smoove) יישאר בדיוק אותו מסלול שנבדק בפרודקשן.
 */

type Tone = "gold" | "teal" | "cream";
type Size = "md" | "lg";

const TONE_CLASS: Record<Tone, string> = {
  gold: "bg-gradient-to-l from-[#8B6F47] via-[#C4A265] to-[#8B6F47] text-[#241708] hover:shadow-[0_10px_36px_rgba(196,162,101,0.5)]",
  teal: "bg-gradient-to-l from-primary via-[#2D7D7D] to-primary text-white hover:shadow-[0_10px_36px_rgba(45,125,125,0.45)]",
  cream: "bg-cream text-[#241708] hover:shadow-[0_10px_36px_rgba(255,255,255,0.28)]",
};

const SIZE_CLASS: Record<Size, string> = {
  md: "px-6 py-3 text-base",
  lg: "px-7 py-4 md:px-10 md:py-5 text-lg md:text-xl",
};

export function Cta({
  children = "מצטרפים לשנת הנביאים",
  tone = "gold",
  size = "lg",
}: {
  children?: React.ReactNode;
  tone?: Tone;
  size?: Size;
}) {
  return (
    <SubscribeButton>
      <button
        type="button"
        className={`inline-flex items-center justify-center gap-3 rounded-xl font-bold transition-all duration-300 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C4A265] ${TONE_CLASS[tone]} ${SIZE_CLASS[size]}`}
      >
        {children}
        <ArrowLeft className="w-5 h-5" aria-hidden="true" />
      </button>
    </SubscribeButton>
  );
}

/** שורת המחיר הקטנה שיושבת מתחת לכפתור. נוסח שיואב אישר בהשקת חגי. */
export function PriceLine({ muted = false }: { muted?: boolean }) {
  return (
    <p className={`text-sm mt-4 ${muted ? "text-foreground/65" : "text-cream/75"}`}>
      החודש הראשון ב־{PRICE.firstMonth} {PRICE.currency} בלבד · אחר כך {PRICE.monthly}{" "}
      {PRICE.currency} לחודש · ביטול בכל עת
    </p>
  );
}
