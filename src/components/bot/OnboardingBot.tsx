// Top-level bot wrapper — handles open/close + first-visit pop logic
// Path in repo: src/components/bot/OnboardingBot.tsx
// Updated 28.5.2026: fixed hooks-order bug + injected Ploni font + brand "בנצי"
// Updated 2026-06-03: self-computes currentParasha via parashaCalendar so the bot
//   always receives the real parasha without requiring a prop from App.tsx.

import { useEffect, useMemo, useRef, useState } from "react";
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

// Ploni font @font-face — injected once on mount
// Self-hosted from /public/fonts/ (cdnfonts.com 404s since 2026-06-03).
// The files already exist in public/fonts/ and are declared in index.css,
// but index.css @font-face may not be parsed inside the bot's injected <style>.
// Injecting here guarantees Ploni loads in the bot widget even if index.css
// declaration is later moved.
const PLONI_FONT_CSS = `
@font-face {
  font-family: "Ploni";
  src: url("/fonts/ploni-light-aaa.otf") format("opentype");
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Ploni";
  src: url("/fonts/ploni-regular-aaa.otf") format("opentype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Ploni";
  src: url("/fonts/ploni-medium-aaa.otf") format("opentype");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Ploni";
  src: url("/fonts/ploni-bold-aaa.otf") format("opentype");
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
  const [footerVisible, setFooterVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  const isDisabled = disabledOnRoutes.some((r) => location.pathname.startsWith(r));

  // (סער 10.7) בנצי מכסה את הפוטר בנייד — כשהפוטר נראה על המסך, הכפתור מתקפל
  // החוצה (רק כשהצ'אט סגור). IntersectionObserver על כל אלמנטי ה-footer בדף.
  // הדפים נטענים lazy (Suspense) — הפוטר לרוב עוד לא ב-DOM כשה-effect רץ,
  // לכן מנסים שוב במרווחים קצרים עד שהוא מופיע.
  useEffect(() => {
    if (isDisabled) return;
    if (typeof IntersectionObserver === "undefined") return;
    let obs: IntersectionObserver | null = null;
    let retryTimer: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;
    const visible = new Set<Element>();

    const attach = () => {
      const footers = document.querySelectorAll("footer");
      if (!footers.length) return false;
      obs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) visible.add(entry.target);
            else visible.delete(entry.target);
          }
          setFooterVisible(visible.size > 0);
        },
        { threshold: 0.05 }
      );
      footers.forEach((f) => obs!.observe(f));
      return true;
    };

    if (!attach()) {
      retryTimer = setInterval(() => {
        attempts += 1;
        if (attach() || attempts > 25) {
          if (retryTimer) clearInterval(retryTimer);
          retryTimer = null;
        }
      }, 400);
    }

    return () => {
      if (retryTimer) clearInterval(retryTimer);
      obs?.disconnect();
      setFooterVisible(false);
    };
  }, [isDisabled, location.pathname]);

  // Accessibility — return focus to the launcher button when the panel closes.
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      buttonRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

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
      <BotButton
        ref={buttonRef}
        isOpen={isOpen}
        onClick={toggleOpen}
        hasUnread={hasUnread}
        hidden={footerVisible && !isOpen}
      />
      <BotPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentParasha={currentParasha}
      />
    </>
  );
}
