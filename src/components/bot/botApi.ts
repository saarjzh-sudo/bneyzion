// Fetch wrapper for the Bnei Zion navigator bot edge function
// Path in repo: src/components/bot/botApi.ts
//
// v2 (2026-06-30, T02) — client-side reliability rebuild:
//   • AbortController timeout (the edge fn does its own retries → up to ~20s).
//   • Retry-with-backoff on transient failures (timeout / network / 429 / 5xx).
//   • Typed BotError so the hook can show a precise, retryable message instead
//     of crashing or hiding a server error behind a fake "reply".
//   • Response validation — a malformed body is treated as a failure, not a
//     silent broken bubble.
// This is the real fix for "הבוט מתנתק": before, a single network blip or a
// slow edge invocation left the fetch hanging with no recovery.

import { supabase, SUPABASE_URL_RUNTIME, SUPABASE_ANON_KEY_RUNTIME } from "@/integrations/supabase/client";
import type { BotMessage, BotResponse, BotPersona } from "./types";
import { BOT_CONFIG } from "./botConfig";

interface SendOptions {
  message: string;
  sessionId: string;
  history: BotMessage[];
  persona?: BotPersona | null;
  currentRoute?: string | null;
  currentParasha?: string | null;
}

export type BotErrorKind =
  | "offline"      // navigator reports no connection — don't even try
  | "timeout"      // request exceeded REQUEST_TIMEOUT_MS
  | "network"      // fetch rejected (DNS / CORS / dropped connection)
  | "server"       // 429 / 5xx / non-ok after retries
  | "bad_response"; // 2xx but body is missing/malformed

export class BotError extends Error {
  readonly kind: BotErrorKind;
  readonly status?: number;
  constructor(kind: BotErrorKind, message: string, status?: number) {
    super(message);
    this.name = "BotError";
    this.kind = kind;
    this.status = status;
  }
}

// Tuning — the edge function itself retries (timeoutMs 12s × up to 3), so the
// client timeout is deliberately generous and its retries are few.
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 700;

const RETRYABLE: ReadonlySet<BotErrorKind> = new Set(["timeout", "network", "server"]);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** One round-trip. Throws a typed BotError on any failure. */
async function attemptSend(
  endpoint: string,
  anonKey: string,
  authToken: string,
  payload: unknown,
): Promise<BotResponse> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") {
      throw new BotError("timeout", "request timed out");
    }
    throw new BotError("network", "network request failed");
  } finally {
    clearTimeout(timer);
  }

  // Transient server pressure or any non-ok status — retryable upstream.
  if (res.status === 429 || res.status >= 500) {
    throw new BotError("server", `server responded ${res.status}`, res.status);
  }
  if (!res.ok) {
    // 4xx — caller sent something wrong; not worth retrying, but still typed.
    throw new BotError("server", `request rejected ${res.status}`, res.status);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new BotError("bad_response", "response was not valid JSON");
  }
  if (!data || typeof (data as BotResponse).reply_text !== "string") {
    throw new BotError("bad_response", "response missing reply_text");
  }
  return data as BotResponse;
}

export async function sendBotMessage(opts: SendOptions): Promise<BotResponse> {
  const {
    message,
    sessionId,
    history,
    persona = null,
    currentRoute = null,
    currentParasha = null,
  } = opts;

  if (isOffline()) {
    throw new BotError("offline", "browser is offline");
  }

  // SUPABASE_URL_RUNTIME / SUPABASE_ANON_KEY_RUNTIME are base64-decoded at module
  // load time in client.ts — NetSpark-safe, no internal-property hacks.
  const endpoint = `${SUPABASE_URL_RUNTIME}${BOT_CONFIG.edgeFunctionPath}`;
  const anonKey = SUPABASE_ANON_KEY_RUNTIME;

  // Resolve auth once (logged-in users bind their user_id server-side).
  const { data: { session: authSession } } = await supabase.auth.getSession();
  const userId = authSession?.user?.id ?? null;
  const authToken = authSession?.access_token ?? anonKey;

  // The current turn is `message`; `history` carries only PRIOR turns. The edge
  // function appends `message` itself — passing it inside history too would
  // duplicate the question to the model (fixed here vs the v1 client).
  const payload = {
    message,
    session_id: sessionId,
    user_id: userId,
    persona,
    history: history.slice(-10),
    current_route: currentRoute,
    current_parasha: currentParasha,
  };

  let lastErr: BotError = new BotError("network", "no attempt made");
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await attemptSend(endpoint, anonKey, authToken, payload);
    } catch (e) {
      lastErr = e instanceof BotError ? e : new BotError("network", String(e));
      const canRetry = RETRYABLE.has(lastErr.kind) && attempt < MAX_ATTEMPTS - 1;
      if (!canRetry) break;
      await sleep(BASE_BACKOFF_MS * (attempt + 1));
    }
  }
  throw lastErr;
}

/**
 * ביקון קליק-על-קישור — מדווח לאדמין אילו קישורים גולשים באמת לחצו (לא רק קיבלו).
 * fire-and-forget: sendBeacon שורד ניווט (הגולש עוזב לדף שבנצי הפנה אליו).
 * fail-soft לחלוטין — כשל כאן לעולם לא פוגע בחוויית הגולש.
 */
export function reportCtaClick(sessionId: string, link: { label?: string; route?: string; url?: string }): void {
  if (!sessionId || !link) return;
  try {
    const endpoint = `${SUPABASE_URL_RUNTIME}${BOT_CONFIG.edgeFunctionPath}`;
    const payload = JSON.stringify({ event: "cta_click", session_id: sessionId, link });
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: "application/json" }));
      return;
    }
    // fallback — fetch keepalive (עדיין שורד ניווט ברוב הדפדפנים)
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY_RUNTIME },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // מתעלמים — אנליטיקה בלבד
  }
}
