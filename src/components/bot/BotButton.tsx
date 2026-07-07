// Floating bot button — bottom-LEFT (per Saar 28.5.2026)
// Updated 2026-07-06: pill-shaped launcher with avatar + name + tagline,
// matching the "מיקי" pattern from the Abulafia site (MikiProvider.tsx).
// Closed state = white pill with round avatar (image, falls back to gold
// letter-avatar "בנ"), a live green dot, name "בנצי" + short tagline.
// Open state stays a simple round X button (no change requested there).
// Path in repo: src/components/bot/BotButton.tsx

import { forwardRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOT_CONFIG } from "./botConfig";

const BOT_FONT = '"Ploni", "Ploni DL 1.1", "Paamon", system-ui, sans-serif';

interface Props {
  isOpen: boolean;
  onClick: () => void;
  hasUnread?: boolean;
}

export const BotButton = forwardRef<HTMLButtonElement, Props>(function BotButton(
  { isOpen, onClick, hasUnread = false },
  ref
) {
  const [avatarFailed, setAvatarFailed] = useState(false);

  if (isOpen) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="סגור צ׳אט עם בנצי"
        className={cn(
          // Mobile: lift above the 64px bottom-nav so it never covers the תפריט tab.
          // Desktop (md+): original bottom-left corner.
          "fixed left-4 md:left-6 z-[100]",
          "bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.75rem)] md:bottom-6",
          "flex h-12 w-12 items-center justify-center rounded-full",
          "shadow-lg transition-all duration-200",
          "bg-[#1A2744] text-[#FAF6F0] hover:bg-[#0E1729]",
          "focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C4A265]/40"
        )}
      >
        <X className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      dir="rtl"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label={`פתח צ׳אט עם ${BOT_CONFIG.botName}, המדריך המנווט של אתר בני ציון`}
      style={{ fontFamily: BOT_FONT }}
      className={cn(
        // Mobile: compact round avatar lifted above the 64px bottom-nav (clears the תפריט tab).
        // Desktop (md+): full pill with name + tagline in the bottom-left corner.
        "fixed left-4 md:left-6 z-[100]",
        "bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.75rem)] md:bottom-6",
        "flex items-center gap-0 md:gap-2.5 rounded-full bg-white",
        "p-1 md:pl-3.5 md:pr-2 md:py-2",
        "shadow-lg transition-all duration-200 hover:shadow-xl",
        "border border-[#C4A265]/30 hover:border-[#C4A265]",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C4A265]/40"
      )}
    >
      <span className="relative shrink-0">
        {avatarFailed ? (
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#C4A265] text-[#1A2744] font-bold text-[15px]"
            style={{ border: "2px solid #8B6F47", fontFamily: BOT_FONT }}
            aria-hidden="true"
          >
            בנ
          </span>
        ) : (
          <img
            src={BOT_CONFIG.botAvatar}
            alt=""
            aria-hidden="true"
            className="h-12 w-12 rounded-full object-cover"
            style={{ border: "2px solid #C4A265" }}
            onError={() => setAvatarFailed(true)}
          />
        )}
        <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </span>
      <span className="hidden md:block text-right leading-tight">
        <span className="block font-bold text-[15px] text-[#1A2744]">
          {BOT_CONFIG.botName}
        </span>
        <span className="block text-xs text-[#8B6F47]">
          {BOT_CONFIG.botShortTagline}
        </span>
      </span>
    </button>
  );
});
