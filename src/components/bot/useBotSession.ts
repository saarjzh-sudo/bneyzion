// Main bot session hook — manages messages, persona, persistence
// Path in repo: src/components/bot/useBotSession.ts
//
// v2 (2026-06-30, T02) — resilience:
//   • Online/offline awareness (navigator + online/offline events).
//   • Per-kind error messages + a retryLast() that re-sends WITHOUT duplicating
//     the user's bubble (the failed turn's user message stays in place).
//   • Soft client rate-limit (min gap between sends) + the existing in-flight
//     guard — keeps a jittery user (or a stuck enter key) from hammering the fn.
//   • History persisted to localStorage (survives reloads / tab switches).

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { BOT_CONFIG } from "./botConfig";
import { sendBotMessage, BotError, type BotErrorKind } from "./botApi";
import type { BotMessage, BotPersona, BotResponse } from "./types";

// Minimum gap between two user sends (ms). The in-flight guard already blocks
// concurrent sends; this stops rapid-fire taps the instant a reply lands.
const MIN_SEND_GAP_MS = 1200;

const ERROR_MESSAGES: Record<BotErrorKind, string> = {
  offline: "אין כרגע חיבור לאינטרנט. בדוק את הרשת ונסה שוב.",
  timeout: "לקח קצת יותר מדי זמן. אפשר לנסות שוב.",
  network: "בעיית רשת רגעית. אפשר לנסות שוב.",
  server: "השרת עמוס כרגע. נסה שוב בעוד רגע.",
  bad_response: "קיבלתי תשובה לא ברורה. נסה שוב.",
};

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

interface FailedTurn {
  text: string;
  parasha: string | null;
  prior: BotMessage[]; // history snapshot BEFORE the failed user message
}

export function useBotSession() {
  const [sessionId] = useState(() => loadOrCreateSessionId());
  const [history, setHistory] = useState<BotMessage[]>(loadHistory);
  const [persona, setPersona] = useState<BotPersona | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(
    () => typeof navigator !== "undefined" && navigator.onLine === false
  );
  const location = useLocation();

  // Track latest history in a ref so async calls always read the freshest value
  const historyRef = useRef(history);
  historyRef.current = history;

  // Remember the last failed turn so the user can retry it
  const [failed, setFailed] = useState<FailedTurn | null>(null);
  const lastSendRef = useRef<number>(0);

  // Persist on every change
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  // Online / offline awareness — clears the error banner the moment we reconnect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const goOnline = () => {
      setIsOffline(false);
      setError((e) => (e === ERROR_MESSAGES.offline ? null : e));
    };
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // The single send path. `prior` is the history BEFORE this turn's user message;
  // when appendUser is true we add the user bubble, when false (retry) it already
  // exists from the failed attempt.
  const deliver = useCallback(
    async (
      text: string,
      parasha: string | null,
      prior: BotMessage[],
      appendUser: boolean
    ) => {
      setError(null);
      setIsThinking(true);

      if (appendUser) {
        const userMsg: BotMessage = { role: "user", content: text, ts: Date.now() };
        setHistory([...prior, userMsg]);
      }

      try {
        const response: BotResponse = await sendBotMessage({
          message: text,
          sessionId,
          history: prior, // prior turns only — edge fn appends `message` itself
          persona,
          currentRoute: location.pathname,
          currentParasha: parasha,
        });

        const botMsg: BotMessage = { role: "model", content: response, ts: Date.now() };
        setHistory((h) => [...h, botMsg]);
        setFailed(null);

        if (response.persona_guess && !persona) {
          setPersona(response.persona_guess);
        }
      } catch (err) {
        const kind: BotErrorKind = err instanceof BotError ? err.kind : "network";
        if (kind === "offline") setIsOffline(true);
        console.warn("[bot] send failed:", kind, err);
        setError(ERROR_MESSAGES[kind]);
        // Keep the user bubble; stash the turn so retryLast() can resend it.
        setFailed({ text, parasha, prior });
      } finally {
        setIsThinking(false);
      }
    },
    [sessionId, persona, location.pathname]
  );

  const sendMessage = useCallback(
    (text: string, currentParasha?: string | null) => {
      const t = text.trim();
      if (!t || isThinking) return;
      const now = Date.now();
      if (now - lastSendRef.current < MIN_SEND_GAP_MS) return; // soft rate-limit
      lastSendRef.current = now;
      deliver(t, currentParasha ?? null, historyRef.current, true);
    },
    [isThinking, deliver]
  );

  const retryLast = useCallback(() => {
    if (!failed || isThinking) return;
    lastSendRef.current = Date.now();
    deliver(failed.text, failed.parasha, failed.prior, false);
  }, [failed, isThinking, deliver]);

  const resetSession = useCallback(() => {
    setHistory([]);
    setPersona(null);
    setError(null);
    setFailed(null);
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
    isOffline,
    canRetry: failed !== null && !isThinking,
    sendMessage,
    retryLast,
    resetSession,
    setPersona,
  };
}
