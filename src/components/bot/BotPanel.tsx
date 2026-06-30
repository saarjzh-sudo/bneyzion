// The chat panel — sticky on LEFT (per Saar 28.5.2026), slides in/out, RTL, 320px wide
// Font: Ploni (the clearest Hebrew font, fallback to Paamon)
// Path in repo: src/components/bot/BotPanel.tsx

import { useEffect, useRef, useState } from "react";
import { Send, X, RotateCcw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./MessageBubble";
import { OpeningButtons } from "./OpeningButtons";
import { useBotSession } from "./useBotSession";
import { BOT_CONFIG } from "./botConfig";
import type { BotCta, BotPersona } from "./types";

const BOT_FONT = '"Ploni", "Ploni DL 1.1", "Paamon", system-ui, sans-serif';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentParasha?: string | null;
}

export function BotPanel({ isOpen, onClose, currentParasha }: Props) {
  const {
    history,
    isThinking,
    error,
    isOffline,
    canRetry,
    sendMessage,
    retryLast,
    resetSession,
    setPersona,
  } = useBotSession();

  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isThinking]);

  // Accessibility — move focus to the input when the panel opens, so keyboard
  // and screen-reader users land in the right place.
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [isOpen]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isThinking) return;
    setInputValue("");
    sendMessage(text, currentParasha);
  };

  const handleOpeningSelect = (prompt: string, persona?: BotPersona | null) => {
    if (persona) setPersona(persona);
    sendMessage(prompt, currentParasha);
  };

  const handleCtaClick = (_cta: BotCta) => {
    // Future: log click to bot_sessions via API or set state
    // For now, the <Link> navigation handles routing.
  };

  const showOpeningButtons = history.length === 0;

  return (
    <div
      dir="rtl"
      style={{ fontFamily: BOT_FONT }}
      className={cn(
        "fixed bottom-20 left-6 z-[100] flex flex-col rounded-2xl border border-[#C4A265]/40 bg-[#FAF6F0] shadow-2xl transition-all",
        "w-[320px] max-w-[calc(100vw-2rem)] h-[460px] max-h-[calc(100vh-10rem)]",
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
      role="dialog"
      aria-label={BOT_CONFIG.botName}
      aria-hidden={!isOpen}
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-[#1A2744] px-3 py-2.5 text-[#FAF6F0]">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-full bg-[#C4A265] flex items-center justify-center text-[#1A2744] font-bold text-[13px]"
            style={{ fontFamily: BOT_FONT }}
          >
            בנ
          </div>
          <div>
            <p
              className="text-[14px] font-semibold leading-tight"
              style={{ fontFamily: BOT_FONT }}
            >
              {BOT_CONFIG.botName}
            </p>
            <p
              className="text-[10px] text-[#C4A265] leading-tight"
              style={{ fontFamily: BOT_FONT }}
            >
              {isThinking ? "מקליד..." : BOT_CONFIG.botTagline}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <button
              type="button"
              onClick={resetSession}
              className="rounded p-1 hover:bg-white/10"
              aria-label="התחל שיחה חדשה"
              title="התחל מחדש"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-white/10"
            aria-label="סגור"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2.5 py-2.5"
        style={{ direction: "rtl", fontFamily: BOT_FONT }}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="שיחה עם בנצי"
      >
        {showOpeningButtons ? (
          <OpeningButtons onSelect={handleOpeningSelect} />
        ) : (
          <>
            {history.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                onCtaClick={handleCtaClick}
              />
            ))}
            {isThinking && (
              <div className="flex justify-end mb-2">
                <div
                  className="bg-[#FAF6F0] border border-[#C4A265]/30 rounded-2xl rounded-br-none px-3 py-2 shadow-sm"
                  role="status"
                  aria-label="בנצי מקליד"
                >
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8B6F47] animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8B6F47] animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8B6F47] animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="my-2 flex flex-col items-center gap-1.5" role="alert">
                <p className="text-center text-xs text-red-700">{error}</p>
                {canRetry && (
                  <button
                    type="button"
                    onClick={retryLast}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#C4A265]/50 bg-white px-2.5 py-1 text-[12px] font-medium text-[#1A2744] transition hover:bg-[#C4A265]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A265]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    נסה שוב
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#C4A265]/30 bg-white px-2.5 py-2 rounded-b-2xl">
        {isOffline && (
          <div
            className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-[#FAF6F0] border border-[#C4A265]/30 px-2 py-1 text-[11px] text-[#8B6F47]"
            role="status"
          >
            <WifiOff className="h-3 w-3 shrink-0" />
            אין כרגע חיבור לאינטרנט.
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="כתוב הודעה..."
            disabled={isThinking}
            className="flex-1 rounded-lg border border-[#C4A265]/40 bg-[#FAF6F0] px-2.5 py-1.5 text-[13px] text-[#1A2744] outline-none placeholder:text-[#8B6F47]/60 focus:border-[#C4A265] focus-visible:ring-2 focus-visible:ring-[#C4A265]/40"
            style={{ fontFamily: BOT_FONT }}
            dir="rtl"
            autoComplete="off"
            aria-label="כתוב הודעה לבנצי"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim() || isThinking || isOffline}
            className="rounded-lg bg-[#C4A265] p-1.5 text-[#1A2744] transition hover:bg-[#8B6F47] hover:text-[#FAF6F0] disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A265]/40"
            aria-label="שלח"
          >
            <Send className="h-4 w-4 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
}
