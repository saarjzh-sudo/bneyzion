// Main bot session hook — manages messages, persona, persistence
// Path in repo: src/components/bot/useBotSession.ts

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { BOT_CONFIG } from "./botConfig";
import { sendBotMessage } from "./botApi";
import type { BotMessage, BotPersona, BotResponse } from "./types";

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadHistory(): BotMessage[] {
  try {
    const raw = localStorage.getItem(BOT_CONFIG.storage.history);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(history: BotMessage[]) {
  try {
    // Cap stored history to last 20 messages — economy
    localStorage.setItem(
      BOT_CONFIG.storage.history,
      JSON.stringify(history.slice(-20))
    );
  } catch {
    // Quota exceeded — ignore
  }
}

function loadOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem(BOT_CONFIG.storage.sessionId);
    if (!id) {
      id = newSessionId();
      localStorage.setItem(BOT_CONFIG.storage.sessionId, id);
    }
    return id;
  } catch {
    return newSessionId();
  }
}

export function useBotSession() {
  const [sessionId] = useState(() => loadOrCreateSessionId());
  const [history, setHistory] = useState<BotMessage[]>(loadHistory);
  const [persona, setPersona] = useState<BotPersona | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  // Track latest history in a ref so async calls always read the freshest value
  const historyRef = useRef(history);
  historyRef.current = history;

  // Persist on every change
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const sendMessage = useCallback(
    async (text: string, currentParasha?: string | null) => {
      if (!text.trim() || isThinking) return;

      setError(null);
      setIsThinking(true);

      const userMsg: BotMessage = {
        role: "user",
        content: text,
        ts: Date.now(),
      };

      // Optimistic update
      setHistory((h) => [...h, userMsg]);

      try {
        const response: BotResponse = await sendBotMessage({
          message: text,
          sessionId,
          history: [...historyRef.current, userMsg],
          persona,
          currentRoute: location.pathname,
          currentParasha: currentParasha ?? null,
        });

        const botMsg: BotMessage = {
          role: "model",
          content: response,
          ts: Date.now(),
        };

        setHistory((h) => [...h, botMsg]);

        if (response.persona_guess && !persona) {
          setPersona(response.persona_guess);
        }
      } catch (err) {
        console.error("[bot] send failed:", err);
        setError("נכשל. אפשר לנסות שוב?");
        // Remove the optimistic user message? No — keep it, mark error.
      } finally {
        setIsThinking(false);
      }
    },
    [isThinking, sessionId, persona, location.pathname]
  );

  const resetSession = useCallback(() => {
    setHistory([]);
    setPersona(null);
    try {
      localStorage.removeItem(BOT_CONFIG.storage.history);
    } catch {}
  }, []);

  return {
    sessionId,
    history,
    persona,
    isThinking,
    error,
    sendMessage,
    resetSession,
    setPersona,
  };
}
