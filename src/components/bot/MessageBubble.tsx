// Single chat message bubble — RTL, WhatsApp-like, Bnei Zion gold/navy theme
// Path in repo: src/components/bot/MessageBubble.tsx

import { Book, Search, Compass, GraduationCap, Sparkles, Heart, Calendar, Map, Video, HandHeart } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { BotMessage, BotCta, BotIcon } from "./types";

const ICON_MAP: Record<BotIcon, React.ComponentType<{ className?: string }>> = {
  book: Book,
  search: Search,
  compass: Compass,
  graduation: GraduationCap,
  sparkle: Sparkles,
  heart: Heart,
  calendar: Calendar,
  map: Map,
  video: Video,
  donation: HandHeart,
};

interface Props {
  message: BotMessage;
  onCtaClick: (cta: BotCta) => void;
}

export function MessageBubble({ message, onCtaClick }: Props) {
  const isUser = message.role === "user";
  const text = isUser
    ? (message.content as string)
    : ((message.content as { reply_text: string }).reply_text || "");
  const ctas = !isUser
    ? ((message.content as { cta_buttons: BotCta[] }).cta_buttons || [])
    : [];

  return (
    <div
      dir="rtl"
      className={cn(
        "flex w-full mb-3",
        isUser ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm",
          isUser
            ? "bg-[#1A2744] text-[#FAF6F0] rounded-bl-none"
            : "bg-[#FAF6F0] text-[#1A2744] border border-[#C4A265]/30 rounded-br-none"
        )}
        style={{ fontFamily: "Paamon, system-ui, sans-serif" }}
      >
        <p className="text-[15px] leading-relaxed whitespace-pre-line">
          {text}
        </p>

        {ctas.length > 0 && (
          <div className="mt-2.5 flex flex-col gap-1.5">
            {ctas.map((cta, i) => {
              const Icon = cta.icon ? ICON_MAP[cta.icon] : Compass;
              const isInternal = cta.route.startsWith("/");

              const inner = (
                <>
                  <Icon className="h-4 w-4 shrink-0 text-[#8B6F47]" />
                  <span className="flex-1 text-right text-[14px] font-medium">
                    {cta.label}
                  </span>
                  <span className="text-[#8B6F47]">←</span>
                </>
              );

              const cls =
                "flex items-center gap-2 rounded-lg border border-[#C4A265]/40 bg-white/60 px-3 py-2 transition hover:bg-[#C4A265]/15 hover:border-[#C4A265]";

              return isInternal ? (
                <Link
                  key={i}
                  to={cta.route}
                  className={cls}
                  onClick={() => onCtaClick(cta)}
                >
                  {inner}
                </Link>
              ) : (
                <a
                  key={i}
                  href={cta.route}
                  target="_blank"
                  rel="noreferrer"
                  className={cls}
                  onClick={() => onCtaClick(cta)}
                >
                  {inner}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
