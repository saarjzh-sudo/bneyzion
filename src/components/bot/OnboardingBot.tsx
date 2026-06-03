// Top-level bot wrapper — handles open/close + first-visit pop logic
// Path in repo: src/components/bot/OnboardingBot.tsx
// Updated 28.5.2026: fixed hooks-order bug + injected Ploni font + brand "בנצי"
// Updated 2026-06-03: self-computes currentParasha via parashaCalendar so the bot
//   always receives the real parasha without requiring a prop from App.tsx.

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { getCurrentParasha } from "@/lib/parashaCalendar";
import { BotButton } from "./BotButton";
import { BotPanel } from "./BotPanel";
import { BOT_CONFIG } from "./botConfig";

interface Props {
  /** Optional: pass current parsha name (from parashaCalendar) so bot has fresh context */
  currentParasha?: string | null;
  /** Hide on routes where the bot is not appropriate (e.g. /admin, /design-*) */
  disabledOnRoutes?: string[];
}

// Ploni font @font-face — injected once on mount (clearest Hebrew font)
const PLONI_FONT_CSS = `
@font-face {
  font-family: "Ploni";
  src: url("https://fonts.cdnfonts.com/s/22050/ploni-light-aaa.woff") format("woff");
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Ploni";
  src: url("https://fonts.cdnfonts.com/s/22050/ploni-regular-aaa.woff") format("woff");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Ploni";
  src: url("https://fonts.cdnfonts.com/s/22050/ploni-medium-aaa.woff") format("woff");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Ploni";
  src: url("https://fonts.cdnfonts.com/s/22050/ploni-bold-aaa.woff") format("woff");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
`;

export function OnboardingBot({
  currentParasha: currentParashaProp = null,
  disabledOnRoutes = ["/admin", "/design-"],
}: Props) {
  // ── ALL hooks must be called unconditionally (React rules) ────────────
  const location = useLocation();

  // Self-compute parasha — don't depend on caller to pass it.
  // If a prop is given (e.g. from a page that already computed it) use that;
  // otherwise fall back to dynamic computation from parashaCalendar.ts.
  const currentParasha = useMemo(
    () => currentParashaProp ?? getCurrentParasha(),
    [currentParashaProp]
  );
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const isDisabled = disabledOnRoutes.some((r) => location.pathname.startsWith(r));

  // Inject Ploni @font-face once
  useEffect(() => {
    const id = "bnezi-ploni-fonts";
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = PLONI_FONT_CSS;
    document.head.appendChild(style);
  }, []);

  // First-visit auto-pop after 3s
  useEffect(() => {
    if (isDisabled) return;
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
  }, [isDisabled]);

  // Close on Esc
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Auto-close panel when navigating to a disabled route
  useEffect(() => {
    if (isDisabled && isOpen) setIsOpen(false);
  }, [isDisabled, isOpen]);

  if (isDisabled) return null;

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
