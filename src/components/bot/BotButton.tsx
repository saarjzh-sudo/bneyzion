// Floating bot button — gold circle, bottom-right (RTL = visual right)
// Path in repo: src/components/bot/BotButton.tsx

import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClick: () => void;
  hasUnread?: boolean;
}

export function BotButton({ isOpen, onClick, hasUnread = false }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? "סגור צ׳אט" : "פתח צ׳אט"}
      className={cn(
        "fixed bottom-6 right-6 z-[100]",
        "flex h-14 w-14 items-center justify-center rounded-full",
        "shadow-lg transition-all duration-200",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C4A265]/40",
        isOpen
          ? "bg-[#1A2744] text-[#FAF6F0] hover:bg-[#0E1729]"
          : "bg-[#C4A265] text-[#1A2744] hover:bg-[#8B6F47] hover:text-[#FAF6F0]"
      )}
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <>
          <MessageCircle className="h-6 w-6" />
          {hasUnread && (
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-[#FAF6F0]" />
          )}
        </>
      )}
    </button>
  );
}
