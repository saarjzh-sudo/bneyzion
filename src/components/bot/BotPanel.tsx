// The chat panel — sticky on right, slides in/out, RTL, ~360px wide
// Path in repo: src/components/bot/BotPanel.tsx

import { useEffect, useRef, useState } from "react";
import { Send, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./MessageBubble";
import { OpeningButtons } from "./OpeningButtons";
import { useBotSession } from "./useBotSession";
import { BOT_CONFIG } from "./botConfig";
import type { BotCta, BotPersona } from "./types";

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
    sendMessage,
    resetSession,
    setPersona,
  } = useBotSession();

  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isThinking]);

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
      className={cn(
        "fixed bottom-24 right-6 z-[100] flex flex-col rounded-2xl border border-[#C4A265]/40 bg-[#FAF6F0] shadow-2xl transition-all",
        "w-[360px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-12rem)]",
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
      role="dialog"
      aria-label={BOT_CONFIG.botName}
      aria-hidden={!isOpen}
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-[#1A2744] px-4 py-3 text-[#FAF6F0]">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-[#C4A265] flex items-center justify-center text-[#1A2744] font-bold text-sm">
            בז
          </div>
          <div>
            <p
              className="text-[15px] font-semibold leading-tight"
              style={{ fontFamily: "Paamon, system-ui, sans-serif" }}
            >
              {BOT_CONFIG.botName}
            </p>
            <p className="text-[11px] text-[#C4A265] leading-tight">
              {isThinking ? "מקליד..." : "אתר התנ\"ך של ישראל"}
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
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-white/10"
            aria-label="סגור"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3"
        style={{ direction: "rtl" }}
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
              <div className="flex justify-end mb-3">
                <div className="bg-[#FAF6F0] border border-[#C4A265]/30 rounded-2xl rounded-br-none px-4 py-2.5 shadow-sm">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#8B6F47] animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-[#8B6F47] animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-[#8B6F47] animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            {error && (
              <p className="text-center text-xs text-red-700 my-2">{error}</p>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#C4A265]/30 bg-white px-3 py-2.5 rounded-b-2xl">
        <div className="flex items-center gap-2">
          <input
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
            className="flex-1 rounded-lg border border-[#C4A265]/40 bg-[#FAF6F0] px-3 py-2 text-[15px] text-[#1A2744] outline-none placeholder:text-[#8B6F47]/60 focus:border-[#C4A265]"
            style={{ fontFamily: "Paamon, system-ui, sans-serif" }}
            dir="rtl"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim() || isThinking}
            className="rounded-lg bg-[#C4A265] p-2 text-[#1A2744] transition hover:bg-[#8B6F47] hover:text-[#FAF6F0] disabled:opacity-40"
            aria-label="שלח"
          >
            <Send className="h-5 w-5 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
}
