// 5 opening buttons shown on first interaction (post-Yoav iron rule)
// Font: Ploni (per Saar 28.5.2026)
// Path in repo: src/components/bot/OpeningButtons.tsx

import { useState } from "react";
import { Book, Search, Compass, GraduationCap, Sparkles } from "lucide-react";
import type { OpeningButton, BotPersona } from "./types";
import { OPENING_BUTTONS, BOT_CONFIG } from "./botConfig";

const BOT_FONT = '"Ploni", "Ploni DL 1.1", "Paamon", system-ui, sans-serif';

const ICON_MAP = {
  book: Book,
  search: Search,
  compass: Compass,
  graduation: GraduationCap,
  sparkle: Sparkles,
} as const;

interface Props {
  onSelect: (prompt: string, persona?: BotPersona | null) => void;
}

export function OpeningButtons({ onSelect }: Props) {
  const [followUpFor, setFollowUpFor] = useState<OpeningButton | null>(null);

  if (followUpFor && followUpFor.followUp) {
    return (
      <div dir="rtl" className="flex flex-col gap-1.5" style={{ fontFamily: BOT_FONT }}>
        <p
          className="text-[13px] text-[#1A2744] mb-0.5"
          style={{ fontFamily: BOT_FONT }}
        >
          {followUpFor.followUp.question}
        </p>
        {followUpFor.followUp.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              onSelect(opt.nextPrompt, opt.persona);
              setFollowUpFor(null);
            }}
            className="flex items-center gap-2 rounded-lg border border-[#C4A265]/40 bg-[#FAF6F0] px-2.5 py-2 text-right transition hover:bg-[#C4A265]/15 hover:border-[#C4A265]"
            style={{ fontFamily: BOT_FONT }}
          >
            <span className="flex-1 text-[12px] font-medium text-[#1A2744]">
              {opt.label}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setFollowUpFor(null)}
          className="mt-0.5 text-[11px] text-[#8B6F47] hover:underline self-start"
          style={{ fontFamily: BOT_FONT }}
        >
          חזרה לתפריט הראשי
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex flex-col gap-1.5" style={{ fontFamily: BOT_FONT }}>
      <p
        className="text-[13px] text-[#1A2744] mb-0.5"
        style={{ fontFamily: BOT_FONT }}
      >
        {BOT_CONFIG.welcomeMessage}
      </p>
      {OPENING_BUTTONS.map((btn) => {
        const Icon = ICON_MAP[btn.icon as keyof typeof ICON_MAP] ?? Compass;
        return (
          <button
            key={btn.id}
            type="button"
            onClick={() => {
              if (btn.followUp) {
                setFollowUpFor(btn);
                return;
              }
              if (btn.prompt) onSelect(btn.prompt);
            }}
            className="flex items-center gap-2 rounded-lg border border-[#C4A265]/40 bg-[#FAF6F0] px-2.5 py-2 text-right transition hover:bg-[#C4A265]/15 hover:border-[#C4A265]"
            style={{ fontFamily: BOT_FONT }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-[#8B6F47]" />
            <span className="flex-1 text-[12px] font-medium text-[#1A2744]">
              {btn.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
