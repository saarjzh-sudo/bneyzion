// Top-level bot wrapper — handles open/close + first-visit pop logic
// Mount once in Layout.tsx (inside <SidebarProvider> or after Footer).
// Path in repo: src/components/bot/OnboardingBot.tsx

import { useEffect, useState } from "react";
import { BotButton } from "./BotButton";
import { BotPanel } from "./BotPanel";
import { BOT_CONFIG } from "./botConfig";

interface Props {
  /** Optional: pass current parsha name (from parashaCalendar) so bot has fresh context */
  currentParasha?: string | null;
  /** Hide on routes where the bot is not appropriate (e.g. /admin, /design-*) */
  disabledOnRoutes?: string[];
}

export function OnboardingBot({
  currentParasha = null,
  disabledOnRoutes = ["/admin", "/design-"],
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Route guard
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;
    if (disabledOnRoutes.some((r) => pathname.startsWith(r))) {
      return null;
    }
  }

  // First-visit auto-pop after 3s
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const shown = localStorage.getItem(BOT_CONFIG.storage.firstVisitShown);
      if (!shown) {
        timer = setTimeout(() => {
          setIsOpen(true);
          setHasUnread(false);
          localStorage.setItem(BOT_CONFIG.storage.firstVisitShown, "1");
        }, BOT_CONFIG.firstVisitDelayMs);
      } else {
        // Returning visitor — show a quiet unread dot once per session
        const dotShown = sessionStorage.getItem("bz_bot_dot_shown");
        if (!dotShown) {
          setHasUnread(true);
          sessionStorage.setItem("bz_bot_dot_shown", "1");
        }
      }
    } catch {
      // localStorage disabled — silently no-op
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Close on Esc
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const toggleOpen = () => {
    setIsOpen((v) => !v);
    setHasUnread(false);
  };

  return (
    <>
      <BotButton isOpen={isOpen} onClick={toggleOpen} hasUnread={hasUnread} />
      <BotPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentParasha={currentParasha}
      />
    </>
  );
}
